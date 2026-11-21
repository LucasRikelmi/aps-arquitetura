-- =====================================================================
-- 006_derivados_auditoria.sql
-- RH Soluções · Marco 05 · M1: pendências da revisão de 20/11
--
-- 1. Views das colunas derivadas do modelo (entre barras no DER):
--      v_usuario_derivado   /situação/, /tempo_de_casa/        (USUÁRIO)
--      v_meta_perc_atual    /perc_atual/ com origem rotulada   (META, RI49)
--      v_alerta_situacao    /situação/                         (ALERTA, RI13)
-- 2. auditoria_regras(): revisa linhas JÁ gravadas contra as regras semânticas.
--    Os gatilhos só validam o que é gravado; a auditoria cobre o resto.
-- 3. Checagem diferida de RI12: alerta de humor baixo precisa de check-in e meta.
--
-- Pré-requisito: 001, 003, 002, 005. Ordem: 001 -> 003 -> 002 -> 004 -> 005 -> 006.
-- =====================================================================

SET search_path TO rh, public;

-- ---------------------------------------------------------------------
-- 1. Views derivadas
-- ---------------------------------------------------------------------

-- /situação/: inativo se há data_desligamento, senão ativo.
-- /tempo_de_casa/: anos completos entre a admissão e hoje (ou o desligamento).
CREATE OR REPLACE VIEW v_usuario_derivado AS
SELECT u.matricula,
       CASE WHEN u.data_desligamento IS NULL THEN 'ativo' ELSE 'inativo' END AS situacao,
       date_part('year', age(COALESCE(u.data_desligamento, CURRENT_DATE), u.data_admissao))::int
         AS tempo_de_casa_anos
  FROM usuario u;

-- /perc_atual/ (RI49): perc_validado do progresso validado mais recente. Sem validação,
-- perc_informado mais recente. A origem diz de onde veio o valor.
CREATE OR REPLACE VIEW v_meta_perc_atual AS
SELECT m.cod_meta,
       COALESCE(v.perc_validado, v.perc_informado) AS perc_atual,
       CASE WHEN v.perc_validado IS NOT NULL THEN 'validado'
            WHEN v.perc_informado IS NOT NULL THEN 'autorrelato'
       END AS origem
  FROM meta m
  LEFT JOIN LATERAL (
    SELECT p.perc_validado, p.perc_informado
      FROM progresso_meta p
      JOIN checkin c ON c.cod_checkin = p.cod_checkin
     WHERE p.cod_meta = m.cod_meta
     ORDER BY (p.perc_validado IS NOT NULL) DESC, c.data_envio DESC
     LIMIT 1
  ) v ON true;

-- /situação/ do alerta (RI13): encerrado se tem data de encerramento;
-- tratado se o dono vigente tratou; senão aberto.
CREATE OR REPLACE VIEW v_alerta_situacao AS
SELECT a.cod_alerta,
       CASE WHEN a.data_encerramento IS NOT NULL THEN 'encerrado'
            WHEN EXISTS (SELECT 1 FROM destinatario_alerta d
                          WHERE d.cod_alerta = a.cod_alerta
                            AND d.papel = 'dono' AND d.data_fim IS NULL
                            AND d.estado = 'tratado') THEN 'tratado'
            ELSE 'aberto'
       END AS situacao
  FROM alerta a;

-- ---------------------------------------------------------------------
-- 2. Auditoria das regras sobre dados já gravados.
-- Retorna uma linha por violação. Vazio = nenhuma violação.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auditoria_regras()
RETURNS TABLE (regra text, tabela text, chave text, detalhe text)
LANGUAGE sql STABLE SET search_path = rh, public AS $$
  -- RI09: progresso só de meta do próprio autor do check-in
  SELECT 'RI09'::text, 'progresso_meta'::text, p.cod_checkin || '/' || p.cod_meta,
         'meta de ' || m.matricula_responsavel || ' informada por check-in de ' || c.matricula
    FROM progresso_meta p
    JOIN checkin c ON c.cod_checkin = p.cod_checkin
    JOIN meta m ON m.cod_meta = p.cod_meta
   WHERE c.matricula IS DISTINCT FROM m.matricula_responsavel

  UNION ALL
  -- RI10: validador com autoridade na data da validação
  SELECT 'RI10', 'progresso_meta', p.cod_checkin || '/' || p.cod_meta,
         'validador ' || p.matricula_validador || ' sem autoridade em ' || p.data_validacao::date
    FROM progresso_meta p
    JOIN meta m ON m.cod_meta = p.cod_meta
   WHERE p.matricula_validador IS NOT NULL
     AND NOT pode_agir_como_gestor(p.matricula_validador, m.matricula_responsavel,
                                   p.data_validacao::date, 'metas')

  UNION ALL
  -- RI11: cadastrante com autoridade na data do cadastro (diretor único, RI42, à parte)
  SELECT 'RI11', 'meta', m.cod_meta::text,
         'cadastrante ' || m.matricula_cadastrante || ' sem autoridade em ' || m.data_criacao::date
    FROM meta m
   WHERE m.matricula_cadastrante <> m.matricula_responsavel
     AND NOT pode_agir_como_gestor(m.matricula_cadastrante, m.matricula_responsavel,
                                   m.data_criacao::date, 'metas')

  UNION ALL
  -- RI12: check-in do alerta é do colaborador do alerta
  SELECT 'RI12', 'alerta_checkin', ac.cod_alerta || '/' || ac.cod_checkin,
         'check-in de ' || c.matricula || ' em alerta de ' || a.matricula_colaborador
    FROM alerta_checkin ac
    JOIN alerta a ON a.cod_alerta = ac.cod_alerta
    JOIN checkin c ON c.cod_checkin = ac.cod_checkin
   WHERE a.matricula_colaborador IS NOT NULL
     AND c.matricula IS DISTINCT FROM a.matricula_colaborador

  UNION ALL
  -- RI13: dono é a chefia calculada na data do alerta; sem chefia, RH
  SELECT 'RI13', 'destinatario_alerta', d.cod_destinatario::text,
         'dono ' || d.matricula || ' não é a chefia calculada (' ||
         COALESCE(chefia_imediata(a.matricula_colaborador, a.data_geracao::date), 'RH') || ')'
    FROM destinatario_alerta d
    JOIN alerta a ON a.cod_alerta = d.cod_alerta
   WHERE d.papel = 'dono'
     AND a.matricula_colaborador IS NOT NULL
     AND CASE
           WHEN chefia_imediata(a.matricula_colaborador, a.data_geracao::date) IS NULL
             THEN d.matricula NOT IN (SELECT r.matricula FROM rh r)
           ELSE d.matricula <> chefia_imediata(a.matricula_colaborador, a.data_geracao::date)
         END

  UNION ALL
  -- RI14: ação que trata alerta é do dono vigente
  SELECT 'RI14', 'acao_acompanhamento', x.cod_acao::text,
         'autor ' || COALESCE(x.matricula_gestor, x.matricula_rh) || ' não é o dono vigente do alerta'
    FROM acao_acompanhamento x
    JOIN destinatario_alerta d ON d.cod_alerta = x.cod_alerta
   WHERE x.cod_alerta IS NOT NULL
     AND d.papel = 'dono' AND d.data_fim IS NULL
     AND d.matricula IS DISTINCT FROM COALESCE(x.matricula_gestor, x.matricula_rh)

  UNION ALL
  -- RI29: cobertura dentro do afastamento
  SELECT 'RI29', 'cobertura', cb.matricula_afastado || '/' || cb.cod_departamento || '/' || cb.data_inicio,
         'cobertura fora do afastamento de ' || cb.matricula_afastado
    FROM cobertura cb
   WHERE NOT EXISTS (
     SELECT 1 FROM afastamento a
      WHERE a.matricula = cb.matricula_afastado
        AND a.data_inicio = cb.data_inicio_afastamento
        AND a.data_inicio <= cb.data_inicio
        AND COALESCE(a.data_fim, date 'infinity') >= COALESCE(cb.data_fim, date 'infinity'))
$$;

-- ---------------------------------------------------------------------
-- 3. RI12 para humor baixo: checagem diferida, no fim da transação.
-- Os vínculos (alerta_checkin, alerta_meta) são inseridos depois do alerta,
-- por isso a verificação só acontece no COMMIT.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_alerta_humor_completo() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tipo = 'humor baixo com meta atrasada' THEN
    IF NOT EXISTS (SELECT 1 FROM alerta_checkin WHERE cod_alerta = NEW.cod_alerta)
       OR NOT EXISTS (SELECT 1 FROM alerta_meta WHERE cod_alerta = NEW.cod_alerta) THEN
      RAISE EXCEPTION 'RI12: alerta % de humor baixo precisa de ao menos um check-in e uma meta', NEW.cod_alerta;
    END IF;
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER alerta_humor_completo
  AFTER INSERT ON alerta
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_alerta_humor_completo();

-- Permissões de leitura das views e da auditoria para a aplicação e para manutenção.
GRANT SELECT ON v_usuario_derivado, v_meta_perc_atual, v_alerta_situacao TO rh_app;
GRANT EXECUTE ON FUNCTION auditoria_regras() TO rh_app, rh_manutencao;

-- A aplicação e a manutenção enxergam o schema rh sem precisar de SET search_path.
ALTER ROLE rh_app SET search_path TO rh, public;
ALTER ROLE rh_manutencao SET search_path TO rh, public;

-- Fim do 006.
