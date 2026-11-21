-- =====================================================================
-- 004_testes_agregados.sql
-- RH Soluções · Marco 05 · M1, item 1.8 (agregados com invalidação, RI49)
--
-- Verifica: invalidação por evento, recálculo das semanas marcadas e
-- reconstrução integral. Tudo termina em ROLLBACK.
-- Execução: psql -v ON_ERROR_STOP=1 -U postgres -d rh_db -f db/testes/004_testes_agregados.sql
-- =====================================================================

BEGIN;
SET search_path TO rh, public;

-- Pré-condição: a base está limpa de pendências.
DO $$ DECLARE n bigint; BEGIN
  SELECT count(*) INTO n FROM rh.agregado_semanal WHERE recalculo_pendente;
  IF n <> 0 THEN
    PERFORM agregado_recalcular_pendentes();
  END IF;
  RAISE NOTICE 'PASS [pré-condição: sem pendências]';
END $$;

-- 1) Mudança de check-in invalida só a semana e o departamento dele.
UPDATE rh.checkin SET humor = CASE WHEN humor = 5 THEN 1 ELSE 5 END
 WHERE cod_checkin = (SELECT cod_checkin FROM rh.checkin
                       WHERE matricula = 'M012' AND ano = 2026 AND semana = 40);

DO $$ DECLARE n bigint; BEGIN
  SELECT count(*) INTO n FROM rh.agregado_semanal WHERE recalculo_pendente;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA [RI49 invalidação por check-in]: % semanas pendentes, esperado 1', n; END IF;
  RAISE NOTICE 'PASS [RI49 check-in invalida uma semana de um departamento]';
END $$;

-- 2) Recalcular: o agregado passa a bater com a consulta direta.
DO $$ DECLARE r text; a numeric; b numeric; BEGIN
  r := agregado_recalcular_pendentes();
  RAISE NOTICE 'agregado_recalcular_pendentes: %', r;

  SELECT humor_medio INTO a FROM rh.agregado_semanal
   WHERE cod_departamento = 'D01' AND ano = 2026 AND semana = 40;
  SELECT round(avg(c.humor), 2) INTO b FROM rh.checkin c
   WHERE c.ano = 2026 AND c.semana = 40 AND checkin_departamento(c) = 'D01';
  IF a IS DISTINCT FROM b THEN
    RAISE EXCEPTION 'FALHA [RI49 recálculo]: agregado %, consulta direta %', a, b;
  END IF;
  RAISE NOTICE 'PASS [RI49 recálculo bate com a consulta direta]';
END $$;

-- 3) Progresso validado invalida a semana do check-in.
UPDATE rh.progresso_meta p SET perc_validado = 77
  FROM rh.checkin c
 WHERE p.cod_checkin = c.cod_checkin AND c.matricula = 'M012' AND c.ano = 2026 AND c.semana = 30
   AND p.perc_validado IS NOT NULL;

DO $$ DECLARE n bigint; BEGIN
  SELECT count(*) INTO n FROM rh.agregado_semanal WHERE recalculo_pendente;
  IF n < 1 THEN
    RAISE EXCEPTION 'FALHA [RI49 progresso]: nenhuma semana marcada';
  END IF;
  RAISE NOTICE 'PASS [RI49 progresso invalida semana: % marcadas]', n;
  PERFORM agregado_recalcular_pendentes();
END $$;

-- 4) Mudança de parâmetro (limiar) invalida todos os agregados.
INSERT INTO rh.alteracao_parametro (cod_parametro, matricula_rh, valor_anterior, valor_novo)
  VALUES ('alerta.humor_baixo_max', 'M001', '2', '3');

DO $$ DECLARE n bigint; t bigint; BEGIN
  SELECT count(*) INTO n FROM rh.agregado_semanal WHERE recalculo_pendente;
  SELECT count(*) INTO t FROM rh.agregado_semanal;
  IF n <> t THEN RAISE EXCEPTION 'FALHA [RI49 parâmetro]: % de % marcados', n, t; END IF;
  RAISE NOTICE 'PASS [RI49 parâmetro invalida todos os agregados: % semanas]', n;
  PERFORM agregado_recalcular_pendentes();
END $$;

-- 5) Reconstrução integral: a soma de respostas é o total de check-ins.
DO $$ DECLARE r text; s bigint; t bigint; BEGIN
  r := agregado_reconstruir();
  RAISE NOTICE 'agregado_reconstruir: %', r;

  SELECT COALESCE(sum(respostas), 0) INTO s FROM rh.agregado_semanal;
  SELECT count(*) INTO t FROM rh.checkin;
  IF s <> t THEN RAISE EXCEPTION 'FALHA [RI49 reconstrução]: respostas %, check-ins %', s, t; END IF;
  RAISE NOTICE 'PASS [RI49 reconstrução integral: % respostas = % check-ins]', s, t;
END $$;

-- 6) Respostas nunca passam de elegíveis (restrição do DDL, reconferida após recálculo).
DO $$ DECLARE n bigint; BEGIN
  SELECT count(*) INTO n FROM rh.agregado_semanal WHERE respostas > elegiveis;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA [participação]: % semanas com respostas > elegíveis', n; END IF;
  RAISE NOTICE 'PASS [respostas <= elegíveis em todas as semanas]';
END $$;

ROLLBACK;
