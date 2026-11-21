-- =====================================================================
-- 003_regras_semanticas.sql
-- RH Soluções · Marco 05 · M1 (gatilhos das restrições semânticas e de acesso)
--
-- Cobre: RI09, RI10, RI11, RI12, RI13, RI14, RI15 (função), RI18, RI20, RI29, RI42.
-- Pré-requisito: 001_ddl_recorte.sql. Deve rodar ANTES do 002 (seed), porque o
-- seed usa chefia_imediata para definir os donos dos alertas.
-- Ordem completa: 001 -> 003 -> 002 -> 004 -> 005 -> testes.
-- Execução: psql -v ON_ERROR_STOP=1 -U postgres -d rh_db -f db/003_regras_semanticas.sql
--
-- Erros levantados começam com o identificador da regra (ex.: "RI10: ...").
-- Limite: os gatilhos validam a entrada no momento da gravação. Eles não
-- reavaliam linhas antigas quando uma lotação, gerência ou cobertura muda.
-- Essa reavaliação é tratada pela aplicação (ver docs/regras-semanticas.md).
-- =====================================================================

SET search_path TO rh, public;

-- ---------------------------------------------------------------------
-- RI15: chefia imediata derivada, numa data.
-- Sobe pela hierarquia enquanto o departamento não tiver gestor vigente que
-- não seja o próprio usuário, ou enquanto o gestor vigente estiver afastado
-- sem substituto. Retorna NULL quando não há chefia (diretor sem chefia, RI42).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION chefia_imediata(p_matricula text, p_data date)
RETURNS text
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_dep     text;
  v_gestor  text;
  v_sub     text;
BEGIN
  SELECT l.cod_departamento INTO v_dep
    FROM lotacao l
   WHERE l.matricula = p_matricula
     AND p_data >= l.data_inicio
     AND (l.data_fim IS NULL OR p_data <= l.data_fim);

  WHILE v_dep IS NOT NULL LOOP
    SELECT g.matricula_gestor INTO v_gestor
      FROM gerencia g
     WHERE g.cod_departamento = v_dep
       AND p_data >= g.data_inicio
       AND (g.data_fim IS NULL OR p_data <= g.data_fim);

    IF v_gestor IS NOT NULL AND v_gestor <> p_matricula THEN
      IF NOT EXISTS (
        SELECT 1 FROM afastamento a
         WHERE a.matricula = v_gestor
           AND p_data >= a.data_inicio
           AND (a.data_fim IS NULL OR p_data <= a.data_fim)
      ) THEN
        RETURN v_gestor;                       -- RI15 (3): gestor vigente e presente
      END IF;

      SELECT c.matricula_substituto INTO v_sub
        FROM cobertura c
       WHERE c.matricula_afastado = v_gestor
         AND c.cod_departamento = v_dep
         AND p_data >= c.data_inicio
         AND (c.data_fim IS NULL OR p_data <= c.data_fim)
         AND c.matricula_substituto <> p_matricula
       LIMIT 1;

      IF v_sub IS NOT NULL THEN
        RETURN v_sub;                          -- RI15 (4): substituto vigente
      END IF;
    END IF;

    SELECT d.superior_cod INTO v_dep           -- RI15 (2): sobe ao superior
      FROM departamento d
     WHERE d.cod_departamento = v_dep;
  END LOOP;

  RETURN NULL;                                 -- sem chefia: diretor sem chefia imediata
END $$;

-- Verdadeiro se o usuário é titular de departamento sem superior (RI42).
CREATE OR REPLACE FUNCTION e_diretor_sem_chefia(p_matricula text, p_data date)
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1
      FROM gerencia g
      JOIN departamento d ON d.cod_departamento = g.cod_departamento
     WHERE g.matricula_gestor = p_matricula
       AND d.superior_cod IS NULL
       AND p_data >= g.data_inicio
       AND (g.data_fim IS NULL OR p_data <= g.data_fim)
  ) AND chefia_imediata(p_matricula, p_data) IS NULL
$$;

-- Perfil vigente (RI43). p_perfil: 1 Colaborador, 2 Gestor, 3 RH, 4 Diretoria, 5 Administração.
CREATE OR REPLACE FUNCTION tem_perfil(p_matricula text, p_perfil integer, p_data date)
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM atribuicao_perfil a
     WHERE a.matricula = p_matricula
       AND a.cod_perfil = p_perfil
       AND p_data >= a.data_inicio
       AND (a.data_fim IS NULL OR p_data <= a.data_fim)
  )
$$;

-- Pode o gestor atuar sobre o colaborador numa finalidade (metas ou PDI)?
-- Regra: é a chefia imediata vigente (inclui substituto em cobertura, RI20);
-- se não há chefia (diretor sem chefia), vale a designação vigente (RI42, RI19).
-- Nunca o próprio colaborador (RI10, RI11).
CREATE OR REPLACE FUNCTION pode_agir_como_gestor(
  p_gestor text, p_colab text, p_data date, p_finalidade text)
RETURNS boolean
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_chefia text;
BEGIN
  IF p_gestor = p_colab THEN RETURN false; END IF;
  IF NOT tem_perfil(p_gestor, 2, p_data) THEN RETURN false; END IF;   -- RI43

  v_chefia := chefia_imediata(p_colab, p_data);
  IF v_chefia IS NOT NULL THEN
    RETURN v_chefia = p_gestor;
  END IF;

  RETURN EXISTS (                                                     -- RI42, RI19
    SELECT 1 FROM designacao d
     WHERE d.matricula_gestor = p_gestor
       AND d.matricula_beneficiario = p_colab
       AND d.finalidade = p_finalidade
       AND p_data >= d.data_inicio
       AND (d.data_fim IS NULL OR p_data <= d.data_fim)
  );
END $$;

-- ---------------------------------------------------------------------
-- RI11: quem cadastra a meta. Na data do cadastro (hoje).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_meta_cadastro() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- Exceção RI42 (decisão de 20/11): o diretor sem chefia que é o único gestor
  -- vigente do sistema cadastra a própria meta.
  IF NEW.matricula_cadastrante = NEW.matricula_responsavel THEN
    IF e_diretor_sem_chefia(NEW.matricula_responsavel, CURRENT_DATE)
       AND NOT EXISTS (
         SELECT 1 FROM atribuicao_perfil a
          WHERE a.cod_perfil = 2
            AND a.matricula <> NEW.matricula_responsavel
            AND CURRENT_DATE >= a.data_inicio
            AND (a.data_fim IS NULL OR CURRENT_DATE <= a.data_fim)) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'RI11: % não pode cadastrar a própria meta', NEW.matricula_responsavel;
  END IF;

  IF NOT pode_agir_como_gestor(NEW.matricula_cadastrante, NEW.matricula_responsavel,
                               CURRENT_DATE, 'metas') THEN
    RAISE EXCEPTION 'RI11: % não pode cadastrar meta para % (não é chefia, substituto ou designado de metas)',
      NEW.matricula_cadastrante, NEW.matricula_responsavel;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER meta_cadastro BEFORE INSERT ON meta
  FOR EACH ROW EXECUTE FUNCTION trg_meta_cadastro();

-- ---------------------------------------------------------------------
-- RI09: check-in só informa metas do próprio autor e em andamento.
-- RI10: validador é quem tem autoridade na data da validação, nunca o responsável.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_progresso_valida() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_resp   text;
  v_sit    text;
  v_autor  text;
BEGIN
  SELECT m.matricula_responsavel, m.situacao INTO v_resp, v_sit
    FROM meta m WHERE m.cod_meta = NEW.cod_meta;
  SELECT c.matricula INTO v_autor FROM checkin c WHERE c.cod_checkin = NEW.cod_checkin;

  IF v_resp IS DISTINCT FROM v_autor THEN                            -- RI09
    RAISE EXCEPTION 'RI09: check-in % informa meta % que não é do próprio autor',
      NEW.cod_checkin, NEW.cod_meta;
  END IF;
  IF v_sit <> 'em andamento' THEN                                    -- RI09
    RAISE EXCEPTION 'RI09: meta % não está em andamento (situação %)', NEW.cod_meta, v_sit;
  END IF;

  IF NEW.matricula_validador IS NOT NULL THEN                        -- RI10
    IF NOT pode_agir_como_gestor(NEW.matricula_validador, v_resp,
                                 COALESCE(NEW.data_validacao, now())::date, 'metas') THEN
      RAISE EXCEPTION 'RI10: % não pode validar progresso de % (não é chefia vigente nem designado)',
        NEW.matricula_validador, v_resp;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER progresso_valida BEFORE INSERT OR UPDATE ON progresso_meta
  FOR EACH ROW EXECUTE FUNCTION trg_progresso_valida();

-- ---------------------------------------------------------------------
-- RI12: check-in e meta de um alerta são do mesmo colaborador do alerta.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_alerta_checkin_mesmo_colab() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE v_colab text; v_autor text;
BEGIN
  SELECT a.matricula_colaborador INTO v_colab FROM alerta a WHERE a.cod_alerta = NEW.cod_alerta;
  SELECT c.matricula INTO v_autor FROM checkin c WHERE c.cod_checkin = NEW.cod_checkin;
  IF v_colab IS DISTINCT FROM v_autor THEN
    RAISE EXCEPTION 'RI12: alerta % se baseia em check-in de outro usuário', NEW.cod_alerta;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER alerta_checkin_mesmo_colab BEFORE INSERT ON alerta_checkin
  FOR EACH ROW EXECUTE FUNCTION trg_alerta_checkin_mesmo_colab();

CREATE OR REPLACE FUNCTION trg_alerta_meta_mesmo_colab() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE v_colab text; v_resp text;
BEGIN
  SELECT a.matricula_colaborador INTO v_colab FROM alerta a WHERE a.cod_alerta = NEW.cod_alerta;
  SELECT m.matricula_responsavel INTO v_resp FROM meta m WHERE m.cod_meta = NEW.cod_meta;
  IF v_colab IS DISTINCT FROM v_resp THEN
    RAISE EXCEPTION 'RI12: alerta % envolve meta de outro usuário', NEW.cod_alerta;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER alerta_meta_mesmo_colab BEFORE INSERT ON alerta_meta
  FOR EACH ROW EXECUTE FUNCTION trg_alerta_meta_mesmo_colab();

-- RI12 (meta do alerta de meta vencida e em risco): a coluna cod_meta_envolvida
-- também precisa pertencer ao colaborador.
CREATE OR REPLACE FUNCTION trg_alerta_meta_coluna() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE v_resp text;
BEGIN
  IF NEW.cod_meta_envolvida IS NOT NULL THEN
    SELECT m.matricula_responsavel INTO v_resp FROM meta m WHERE m.cod_meta = NEW.cod_meta_envolvida;
    IF v_resp IS DISTINCT FROM NEW.matricula_colaborador THEN
      RAISE EXCEPTION 'RI12: meta % do alerta não pertence ao colaborador', NEW.cod_meta_envolvida;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER alerta_meta_coluna BEFORE INSERT OR UPDATE OF cod_meta_envolvida ON alerta
  FOR EACH ROW EXECUTE FUNCTION trg_alerta_meta_coluna();

-- ---------------------------------------------------------------------
-- RI13: dono é a chefia imediata vigente do colaborador (inclui substituto e
-- chefia superior em departamento vago). Para diretor sem chefia, o dono é um
-- profissional de RH designado, diferente do alvo. O alvo nunca é destinatário.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_destinatario_regra() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_colab text;
  v_data  date;
  v_chefia text;
BEGIN
  SELECT a.matricula_colaborador, a.data_geracao::date INTO v_colab, v_data
    FROM alerta a WHERE a.cod_alerta = NEW.cod_alerta;

  IF v_colab IS NULL THEN RETURN NEW; END IF;          -- alerta anonimizado: sem regra de dono
  IF NEW.matricula = v_colab THEN
    RAISE EXCEPTION 'RI13: o alvo do alerta % não pode ser destinatário', NEW.cod_alerta;
  END IF;

  IF NEW.papel = 'dono' THEN
    v_chefia := chefia_imediata(v_colab, COALESCE(NEW.data_inicio::date, v_data));
    IF v_chefia IS NOT NULL THEN
      IF NEW.matricula <> v_chefia THEN
        RAISE EXCEPTION 'RI13: dono do alerta % deve ser a chefia imediata (%)', NEW.cod_alerta, v_chefia;
      END IF;
    ELSE
      IF NOT EXISTS (SELECT 1 FROM rh WHERE matricula = NEW.matricula) THEN
        RAISE EXCEPTION 'RI13: sem chefia, o dono do alerta % deve ser RH designado', NEW.cod_alerta;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER destinatario_regra BEFORE INSERT ON destinatario_alerta
  FOR EACH ROW EXECUTE FUNCTION trg_destinatario_regra();

-- ---------------------------------------------------------------------
-- RI14: ação tem um autor com escopo sobre o colaborador. Se trata alerta, o
-- autor é o dono vigente dele. A meta ajustada é do mesmo colaborador. Nunca
-- o próprio colaborador.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_acao_regra() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_colab_alerta text;
  v_dono         text;
  v_resp_meta    text;
  v_autor        text;
BEGIN
  v_autor := COALESCE(NEW.matricula_gestor, NEW.matricula_rh);

  IF NEW.matricula_colaborador IS NOT NULL AND NEW.matricula_colaborador = v_autor THEN
    RAISE EXCEPTION 'RI14: o autor da ação não pode ser o próprio colaborador';
  END IF;

  IF NEW.matricula_gestor IS NOT NULL AND NEW.matricula_colaborador IS NOT NULL THEN
    IF NOT pode_agir_como_gestor(NEW.matricula_gestor, NEW.matricula_colaborador,
                                 NEW.data_registro::date, 'metas')
       AND chefia_imediata(NEW.matricula_colaborador, NEW.data_registro::date)
           IS DISTINCT FROM NEW.matricula_gestor THEN
      RAISE EXCEPTION 'RI14: gestor % não tem escopo sobre %', NEW.matricula_gestor, NEW.matricula_colaborador;
    END IF;
  END IF;

  IF NEW.cod_alerta IS NOT NULL THEN
    SELECT a.matricula_colaborador INTO v_colab_alerta FROM alerta a WHERE a.cod_alerta = NEW.cod_alerta;
    IF v_colab_alerta IS DISTINCT FROM NEW.matricula_colaborador THEN
      RAISE EXCEPTION 'RI14: a ação e o alerta % são de colaboradores diferentes', NEW.cod_alerta;
    END IF;
    SELECT d.matricula INTO v_dono FROM destinatario_alerta d
     WHERE d.cod_alerta = NEW.cod_alerta AND d.papel = 'dono' AND d.data_fim IS NULL;
    IF v_dono IS DISTINCT FROM v_autor THEN
      RAISE EXCEPTION 'RI14: só o dono vigente (%) trata o alerta %', v_dono, NEW.cod_alerta;
    END IF;
  END IF;

  IF NEW.cod_meta IS NOT NULL THEN
    SELECT m.matricula_responsavel INTO v_resp_meta FROM meta m WHERE m.cod_meta = NEW.cod_meta;
    IF v_resp_meta IS DISTINCT FROM NEW.matricula_colaborador THEN
      RAISE EXCEPTION 'RI14: a meta ajustada não é do colaborador da ação';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER acao_regra BEFORE INSERT OR UPDATE ON acao_acompanhamento
  FOR EACH ROW EXECUTE FUNCTION trg_acao_regra();

-- ---------------------------------------------------------------------
-- RI18: substituto é gestor com perfil Gestor vigente, diferente do afastado,
-- e sem afastamento que se sobreponha ao período da cobertura.
-- RI29: o período da cobertura fica dentro do afastamento e da gerência vigente
-- do afastado naquele departamento. (Contenção verificada num único período.)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_cobertura_regra() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_fim date := COALESCE(NEW.data_fim, date 'infinity');
BEGIN
  IF NOT tem_perfil(NEW.matricula_substituto, 2, NEW.data_inicio) THEN       -- RI18
    RAISE EXCEPTION 'RI18: substituto % não tem perfil Gestor vigente', NEW.matricula_substituto;
  END IF;

  IF EXISTS (                                                                  -- RI18
    SELECT 1 FROM afastamento a
     WHERE a.matricula = NEW.matricula_substituto
       AND daterange(a.data_inicio, COALESCE(a.data_fim, date 'infinity'), '[]')
           && daterange(NEW.data_inicio, v_fim, '[]')
  ) THEN
    RAISE EXCEPTION 'RI18: substituto % está afastado no período da cobertura', NEW.matricula_substituto;
  END IF;

  IF NOT EXISTS (                                                              -- RI29
    SELECT 1 FROM afastamento a
     WHERE a.matricula = NEW.matricula_afastado
       AND a.data_inicio = NEW.data_inicio_afastamento
       AND a.data_inicio <= NEW.data_inicio
       AND COALESCE(a.data_fim, date 'infinity') >= v_fim
  ) THEN
    RAISE EXCEPTION 'RI29: cobertura fora do período do afastamento de %', NEW.matricula_afastado;
  END IF;

  IF NOT EXISTS (                                                              -- RI29
    SELECT 1 FROM gerencia g
     WHERE g.cod_departamento = NEW.cod_departamento
       AND g.matricula_gestor = NEW.matricula_afastado
       AND g.data_inicio <= NEW.data_inicio
       AND COALESCE(g.data_fim, date 'infinity') >= v_fim
  ) THEN
    RAISE EXCEPTION 'RI29: % não gerencia % no período da cobertura', NEW.matricula_afastado, NEW.cod_departamento;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER cobertura_regra BEFORE INSERT OR UPDATE ON cobertura
  FOR EACH ROW EXECUTE FUNCTION trg_cobertura_regra();

-- ---------------------------------------------------------------------
-- RI42 e RI19: designação só para diretor sem chefia imediata (titular de
-- departamento sem superior), com gestor que tenha perfil Gestor vigente.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_designacao_regra() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT e_diretor_sem_chefia(NEW.matricula_beneficiario, NEW.data_inicio) THEN
    RAISE EXCEPTION 'RI42: % não é diretor sem chefia imediata na data da designação', NEW.matricula_beneficiario;
  END IF;
  IF NOT tem_perfil(NEW.matricula_gestor, 2, NEW.data_inicio) THEN
    RAISE EXCEPTION 'RI19: gestor designado % não tem perfil Gestor vigente', NEW.matricula_gestor;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER designacao_regra BEFORE INSERT OR UPDATE ON designacao
  FOR EACH ROW EXECUTE FUNCTION trg_designacao_regra();

-- Fim das regras semânticas. Funções auxiliares: chefia_imediata, e_diretor_sem_chefia,
-- tem_perfil, pode_agir_como_gestor.
