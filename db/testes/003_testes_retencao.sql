-- =====================================================================
-- 003_testes_retencao.sql
-- RH Soluções · Marco 05 · M1, item 1.7 (rotinas da RB-11)
--
-- Usa datas de referência futuras, para que a retenção aconteça no teste.
-- Tudo termina em ROLLBACK.
-- Execução: psql -v ON_ERROR_STOP=1 -U postgres -d rh_db -f db/testes/003_testes_retencao.sql
-- =====================================================================

BEGIN;
SET search_path TO rh, public;

-- Antes: nada anonimizado.
DO $$ DECLARE n bigint; BEGIN
  SELECT count(*) INTO n FROM rh.checkin WHERE anonimizado;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA [pré-condição]: já há % check-ins anonimizados', n; END IF;
  RAISE NOTICE 'PASS [pré-condição: nenhum check-in anonimizado]';
END $$;

-- ---------------------------------------------------------------------
-- RI47: check-ins com mais de 24 meses. Referência em 2029-01-01: tudo do seed
-- (2025-11 a 2026-11) passa de 24 meses.
-- ---------------------------------------------------------------------
DO $$ DECLARE r text; n bigint; BEGIN
  r := retencao_anonimizar_checkins(TIMESTAMPTZ '2029-01-01 00:00:00-03');
  RAISE NOTICE 'retencao_anonimizar_checkins: %', r;

  SELECT count(*) INTO n FROM rh.checkin WHERE anonimizado;
  IF n <> 2600 THEN RAISE EXCEPTION 'FALHA [RI47 check-ins anonimizados]: esperado 2600, obtido %', n; END IF;
  RAISE NOTICE 'PASS [RI47 2600 check-ins anonimizados]';

  SELECT count(*) INTO n FROM rh.checkin WHERE anonimizado AND (matricula IS NOT NULL OR coorte_departamento IS NULL);
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA [RI47 vínculo removido]: % linhas ainda ligadas ao usuário ou sem coorte', n; END IF;
  RAISE NOTICE 'PASS [RI47 vínculo removido e coorte preenchida]';

  SELECT count(*) INTO n FROM rh.progresso_meta;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA [RI47 progresso]: % progressos restantes', n; END IF;
  RAISE NOTICE 'PASS [RI47 PROGRESSO_META dos anonimizados excluído]';

  SELECT count(*) INTO n FROM rh.alerta WHERE matricula_colaborador IS NOT NULL;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA [RI47 alertas]: % alertas ainda ligados', n; END IF;
  RAISE NOTICE 'PASS [RI47 alertas antigos desvinculados]';
END $$;

-- Segunda execução não altera nada (idempotente).
DO $$ DECLARE r text; BEGIN
  r := retencao_anonimizar_checkins(TIMESTAMPTZ '2029-01-01 00:00:00-03');
  IF r <> 'checkins=0 progressos_apagados=0 alertas=0 acoes=0' THEN
    RAISE EXCEPTION 'FALHA [idempotência]: %', r;
  END IF;
  RAISE NOTICE 'PASS [retenção idempotente]';
END $$;

-- ---------------------------------------------------------------------
-- RI47 (desligado há 90 dias): marca M012 como desligado em 2026-01-01.
-- Com referência em 2026-06-01, o limite é 2026-03-03: M012 entra.
-- ---------------------------------------------------------------------
UPDATE rh.usuario SET data_desligamento = DATE '2026-01-01' WHERE matricula = 'M012';

DO $$ DECLARE r text; n bigint; BEGIN
  r := retencao_anonimizar_desligados(TIMESTAMPTZ '2026-06-01 00:00:00-03');
  RAISE NOTICE 'retencao_anonimizar_desligados: %', r;

  SELECT count(*) INTO n FROM rh.checkin WHERE matricula = 'M012';
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA [RI47 desligado]: % check-ins de M012 ainda ligados', n; END IF;
  RAISE NOTICE 'PASS [RI47 desligado há 90 dias: check-ins desvinculados]';

  SELECT count(*) INTO n FROM rh.usuario WHERE matricula = 'M012';
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA [RI36 preservação]: cadastro de M012 foi removido'; END IF;
  RAISE NOTICE 'PASS [cadastro do desligado preservado]';
END $$;

-- ---------------------------------------------------------------------
-- RI48: expurgo do log com mais de 6 meses.
-- ---------------------------------------------------------------------
INSERT INTO rh.log_acesso (data_hora, matricula_ator, perfil, recurso, acao, resultado)
  VALUES (TIMESTAMPTZ '2025-01-01 10:00-03', 'M002', 'Gestor', 'painel', 'consulta', 'permitido');

DO $$ DECLARE r text; n bigint; BEGIN
  r := retencao_expurgar_log(TIMESTAMPTZ '2026-06-01 00:00:00-03');
  RAISE NOTICE 'retencao_expurgar_log: %', r;

  SELECT count(*) INTO n FROM rh.log_acesso WHERE data_hora < TIMESTAMPTZ '2025-12-01';
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA [RI48 expurgo]: % linhas antigas restantes', n; END IF;
  RAISE NOTICE 'PASS [RI48 log antigo expurgado]';
END $$;

-- Cada rotina grava sua execução (DA12).
DO $$ DECLARE n bigint; BEGIN
  SELECT count(*) INTO n FROM rh.execucao_agendador
   WHERE tarefa LIKE 'retencao_%' AND situacao = 'ok';
  -- 4 execuções neste arquivo: check-ins (2, incluindo a de idempotência),
  -- desligados (1) e expurgo de log (1).
  IF n <> 4 THEN RAISE EXCEPTION 'FALHA [DA12 execuções]: esperado 4, obtido %', n; END IF;
  RAISE NOTICE 'PASS [DA12 execuções registradas: %]', n;
END $$;

ROLLBACK;
