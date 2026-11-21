-- =====================================================================
-- 005_agregados_invalidacao.sql
-- RH Soluções · Marco 05 · M1, item 1.8 (agregado semanal com invalidação por evento)
--
-- Regra: RI49. AGREGADO_SEMANAL é marcado como pendente (recalculo_pendente = true)
-- quando muda algo que o alimenta: check-in (envio, edição, reabertura, anonimização),
-- progresso validado, lotação, alerta encerrado e parâmetro (limiar).
-- A rotina diária recalcula só as semanas marcadas. A reconstrução integral é sob demanda.
--
-- Exceção aprovada ao RNF04: o agregado é persistido e derivado.
-- Pré-requisito: 001 e 002 aplicados. Ordem: 001 -> 003 -> 002 -> 004 -> 005.
-- Instalar depois do seed: os gatilhos não devem disparar durante a carga inicial.
-- =====================================================================

SET search_path TO rh, public;

-- ---------------------------------------------------------------------
-- Departamento de um check-in: a coorte, se anonimizado (RI47), ou a lotação
-- vigente na data do envio.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION checkin_departamento(c checkin)
RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    c.coorte_departamento,
    (SELECT l.cod_departamento FROM lotacao l
      WHERE l.matricula = c.matricula
        AND c.data_envio::date >= l.data_inicio
        AND (l.data_fim IS NULL OR c.data_envio::date <= l.data_fim)
      LIMIT 1))
$$;

-- Início (segunda-feira) de uma semana ISO.
CREATE OR REPLACE FUNCTION semana_iso_inicio(p_ano smallint, p_semana smallint)
RETURNS date
LANGUAGE sql IMMUTABLE AS $$
  SELECT (make_date(p_ano, 1, 4)
          - ((extract(isodow FROM make_date(p_ano, 1, 4))::int - 1) * interval '1 day'))::date
         + ((p_semana - 1) * 7)
$$;

-- Marca uma semana de um departamento como pendente. Cria a linha se não existir.
CREATE OR REPLACE FUNCTION agregado_marcar(p_dep text, p_ano smallint, p_semana smallint)
RETURNS void
LANGUAGE sql AS $$
  INSERT INTO agregado_semanal (cod_departamento, ano, semana, recalculo_pendente)
  VALUES (p_dep, p_ano, p_semana, true)
  ON CONFLICT (cod_departamento, ano, semana)
  DO UPDATE SET recalculo_pendente = true
$$;

-- Marca todas as semanas de check-ins do usuário que caem no período de uma lotação.
CREATE OR REPLACE FUNCTION agregado_marcar_periodo(
  p_matricula text, p_dep text, p_inicio date, p_fim date)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  IF p_dep IS NULL THEN RETURN; END IF;
  FOR r IN
    SELECT DISTINCT c.ano, c.semana
      FROM checkin c
     WHERE c.matricula = p_matricula
       AND c.data_envio::date >= p_inicio
       AND (p_fim IS NULL OR c.data_envio::date <= p_fim)
  LOOP
    PERFORM agregado_marcar(p_dep, r.ano, r.semana);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- Gatilhos de invalidação
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_checkin_invalida() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE v_dep text;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_dep := checkin_departamento(OLD);
    IF v_dep IS NOT NULL THEN PERFORM agregado_marcar(v_dep, OLD.ano, OLD.semana); END IF;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_dep := checkin_departamento(NEW);
    IF v_dep IS NOT NULL THEN PERFORM agregado_marcar(v_dep, NEW.ano, NEW.semana); END IF;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER checkin_invalida AFTER INSERT OR UPDATE OR DELETE ON checkin
  FOR EACH ROW EXECUTE FUNCTION trg_checkin_invalida();

CREATE OR REPLACE FUNCTION trg_progresso_invalida() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE r checkin; v_dep text;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT * INTO r FROM checkin WHERE cod_checkin = OLD.cod_checkin;
    IF FOUND THEN
      v_dep := checkin_departamento(r);
      PERFORM agregado_marcar(v_dep, r.ano, r.semana);
    END IF;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT * INTO r FROM checkin WHERE cod_checkin = NEW.cod_checkin;
    IF FOUND THEN
      v_dep := checkin_departamento(r);
      PERFORM agregado_marcar(v_dep, r.ano, r.semana);
    END IF;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER progresso_invalida AFTER INSERT OR UPDATE OR DELETE ON progresso_meta
  FOR EACH ROW EXECUTE FUNCTION trg_progresso_invalida();

CREATE OR REPLACE FUNCTION trg_lotacao_invalida() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM agregado_marcar_periodo(OLD.matricula, OLD.cod_departamento, OLD.data_inicio, OLD.data_fim);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM agregado_marcar_periodo(NEW.matricula, NEW.cod_departamento, NEW.data_inicio, NEW.data_fim);
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER lotacao_invalida AFTER INSERT OR UPDATE OR DELETE ON lotacao
  FOR EACH ROW EXECUTE FUNCTION trg_lotacao_invalida();

-- Alerta encerrado muda o número de alertas abertos da semana.
CREATE OR REPLACE FUNCTION trg_alerta_invalida() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM agregado_marcar(checkin_departamento(c), c.ano, c.semana)
     FROM alerta_checkin ac
     JOIN checkin c ON c.cod_checkin = ac.cod_checkin
    WHERE ac.cod_alerta = NEW.cod_alerta;
  RETURN NULL;
END $$;

CREATE TRIGGER alerta_invalida AFTER UPDATE OF data_encerramento ON alerta
  FOR EACH ROW EXECUTE FUNCTION trg_alerta_invalida();

-- Alerta criado ou desligado de um check-in também muda o número de alertas abertos.
CREATE OR REPLACE FUNCTION trg_alerta_checkin_invalida() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE r checkin;
BEGIN
  SELECT * INTO r FROM checkin
   WHERE cod_checkin = COALESCE(NEW.cod_checkin, OLD.cod_checkin);
  IF FOUND THEN
    PERFORM agregado_marcar(checkin_departamento(r), r.ano, r.semana);
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER alerta_checkin_invalida AFTER INSERT OR DELETE ON alerta_checkin
  FOR EACH ROW EXECUTE FUNCTION trg_alerta_checkin_invalida();

-- Mudança de parâmetro (limiar) invalida todos os agregados (RI49, RI45).
CREATE OR REPLACE FUNCTION trg_parametro_invalida() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE agregado_semanal SET recalculo_pendente = true;
  RETURN NULL;
END $$;

CREATE TRIGGER parametro_invalida AFTER INSERT ON alteracao_parametro
  FOR EACH ROW EXECUTE FUNCTION trg_parametro_invalida();

-- ---------------------------------------------------------------------
-- Recálculo de uma semana de um departamento.
-- Elegíveis: usuários lotados no departamento na segunda-feira da semana.
-- Respostas: check-ins da semana cujo departamento é esse.
-- Cada consulta usa a subconsulta k (check-ins da semana no departamento).
-- Sem tabela temporária: a versão anterior criava uma a cada chamada.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agregado_recalcular(p_dep text, p_ano smallint, p_semana smallint)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_seg        date := semana_iso_inicio(p_ano, p_semana);
  v_elegiveis  integer;
  v_resp       integer;
  v_humor      numeric;
  v_pesada     numeric;
  v_prog       numeric;
  v_alertas    integer;
BEGIN
  SELECT count(*) INTO v_elegiveis
    FROM lotacao l
   WHERE l.cod_departamento = p_dep
     AND v_seg >= l.data_inicio
     AND (l.data_fim IS NULL OR v_seg <= l.data_fim);

  SELECT count(*), avg(k.humor),
         100.0 * count(*) FILTER (WHERE k.carga = 'Pesada') / nullif(count(*), 0)
    INTO v_resp, v_humor, v_pesada
    FROM (SELECT c.cod_checkin, c.humor, c.carga, checkin_departamento(c) AS dep
            FROM checkin c
           WHERE c.ano = p_ano AND c.semana = p_semana) k
   WHERE k.dep = p_dep;

  SELECT avg(COALESCE(p.perc_validado, p.perc_informado))
    INTO v_prog
    FROM progresso_meta p
    JOIN (SELECT c.cod_checkin, checkin_departamento(c) AS dep
            FROM checkin c
           WHERE c.ano = p_ano AND c.semana = p_semana) k
      ON k.cod_checkin = p.cod_checkin
   WHERE k.dep = p_dep;

  SELECT count(DISTINCT a.cod_alerta)
    INTO v_alertas
    FROM alerta_checkin ac
    JOIN (SELECT c.cod_checkin, checkin_departamento(c) AS dep
            FROM checkin c
           WHERE c.ano = p_ano AND c.semana = p_semana) k
      ON k.cod_checkin = ac.cod_checkin
    JOIN alerta a ON a.cod_alerta = ac.cod_alerta
   WHERE k.dep = p_dep AND a.data_encerramento IS NULL;

  INSERT INTO agregado_semanal (cod_departamento, ano, semana, humor_medio, perc_carga_pesada,
                                progresso_medio, respostas, elegiveis, alertas_abertos,
                                recalculo_pendente, data_calculo)
  VALUES (p_dep, p_ano, p_semana, round(v_humor, 2), round(v_pesada, 2), round(v_prog, 2),
          v_resp, v_elegiveis, COALESCE(v_alertas, 0), false, now())
  ON CONFLICT (cod_departamento, ano, semana) DO UPDATE SET
    humor_medio        = EXCLUDED.humor_medio,
    perc_carga_pesada  = EXCLUDED.perc_carga_pesada,
    progresso_medio    = EXCLUDED.progresso_medio,
    respostas          = EXCLUDED.respostas,
    elegiveis          = EXCLUDED.elegiveis,
    alertas_abertos    = EXCLUDED.alertas_abertos,
    recalculo_pendente = false,
    data_calculo       = now();
END $$;

-- Rotina diária: recalcula só as semanas marcadas.
CREATE OR REPLACE FUNCTION agregado_recalcular_pendentes()
RETURNS text
LANGUAGE plpgsql AS $$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN SELECT cod_departamento, ano, semana
             FROM agregado_semanal WHERE recalculo_pendente
  LOOP
    PERFORM agregado_recalcular(r.cod_departamento, r.ano, r.semana);
    n := n + 1;
  END LOOP;

  INSERT INTO execucao_agendador (tarefa, terminada_em, situacao)
    VALUES ('agregado_recalcular_pendentes', clock_timestamp(), 'ok');

  RETURN format('semanas_recalculadas=%s', n);
END $$;

-- Reconstrução integral, sob demanda (RI49): marca tudo e recalcula.
CREATE OR REPLACE FUNCTION agregado_reconstruir()
RETURNS text
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE agregado_semanal SET recalculo_pendente = true;
  RETURN agregado_recalcular_pendentes();
END $$;

-- Fim do item 1.8.
