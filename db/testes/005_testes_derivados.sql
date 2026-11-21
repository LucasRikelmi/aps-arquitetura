-- =====================================================================
-- 005_testes_derivados.sql
-- RH Soluções · Marco 05 · M1: views derivadas, auditoria e RI12 diferida (006)
--
-- Execução: psql -v ON_ERROR_STOP=1 -U postgres -d rh_db -f db/testes/005_testes_derivados.sql
-- Tudo termina em ROLLBACK.
-- =====================================================================

BEGIN;
SET search_path TO rh, public;

-- 1) Views derivadas
DO $$ DECLARE n bigint; BEGIN
  SELECT count(*) INTO n FROM v_usuario_derivado WHERE situacao = 'ativo';
  IF n <> 50 THEN RAISE EXCEPTION 'FALHA [/situação/ usuário]: esperado 50 ativos, obtido %', n; END IF;
  RAISE NOTICE 'PASS [/situação/ de USUÁRIO: 50 ativos]';

  SELECT count(*) INTO n FROM v_meta_perc_atual WHERE perc_atual IS NULL;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA [/perc_atual/]: % metas sem valor', n; END IF;
  RAISE NOTICE 'PASS [/perc_atual/ calculado para todas as metas com progresso]';

  SELECT count(*) INTO n FROM v_meta_perc_atual WHERE origem NOT IN ('validado', 'autorrelato');
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA [origem]: % metas sem origem rotulada', n; END IF;
  RAISE NOTICE 'PASS [origem do /perc_atual/ rotulada]';
END $$;

-- Desligado aparece como inativo com tempo de casa até o desligamento.
UPDATE usuario SET data_desligamento = DATE '2026-06-30' WHERE matricula = 'M020';
DO $$ DECLARE s text; BEGIN
  SELECT situacao INTO s FROM v_usuario_derivado WHERE matricula = 'M020';
  IF s <> 'inativo' THEN RAISE EXCEPTION 'FALHA [/situação/ desligado]: %', s; END IF;
  RAISE NOTICE 'PASS [/situação/ = inativo após desligamento]';
END $$;

-- 2) Auditoria: violação plantada com gatilhos desligados é detectada.
SET LOCAL session_replication_role = replica;
-- O seed já tem progresso em todos os check-ins: a violação é plantada num existente.
UPDATE progresso_meta p
   SET matricula_validador = 'M013', data_validacao = now(), perc_validado = 60
  FROM checkin c JOIN meta m ON m.matricula_responsavel = c.matricula
 WHERE p.cod_checkin = c.cod_checkin AND p.cod_meta = m.cod_meta
   AND c.matricula = 'M012' AND c.ano = 2026 AND c.semana = 42;
SET LOCAL session_replication_role = origin;

DO $$ DECLARE n bigint; r text; BEGIN
  SELECT count(*) INTO n FROM auditoria_regras() WHERE regra = 'RI10';
  IF n < 1 THEN RAISE EXCEPTION 'FALHA [auditoria RI10]: violação plantada não foi detectada'; END IF;
  RAISE NOTICE 'PASS [auditoria detecta validador sem autoridade: % linha(s)]', n;
END $$;

-- 3) RI12 diferida: forçar a checagem imediata e tentar um alerta de humor sem meta.
SET CONSTRAINTS alerta_humor_completo IMMEDIATE;
DO $$ BEGIN
  BEGIN
    INSERT INTO alerta (matricula_colaborador, tipo, janela_ref, regra_disparada)
      VALUES ('M013', 'humor baixo com meta atrasada', '2099-W02', 'teste');
    RAISE EXCEPTION 'FALHA [RI12 humor sem meta]: aceitou alerta de humor sem check-in nem meta';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'RI12:%' THEN
      RAISE NOTICE 'PASS [RI12 humor baixo exige check-in e meta]';
    ELSE
      RAISE;
    END IF;
  END;
END $$;

-- 4) Situação do alerta: encerrado tem prioridade.
INSERT INTO alerta (matricula_colaborador, tipo, janela_ref, regra_disparada, data_encerramento)
  VALUES ('M013', 'sem resposta', '2099-W03', 'teste', now());
DO $$ DECLARE s text; BEGIN
  SELECT v.situacao INTO s FROM v_alerta_situacao v JOIN alerta a ON a.cod_alerta = v.cod_alerta
   WHERE a.janela_ref = '2099-W03';
  IF s <> 'encerrado' THEN RAISE EXCEPTION 'FALHA [/situação/ alerta]: %', s; END IF;
  RAISE NOTICE 'PASS [/situação/ de ALERTA = encerrado]';
END $$;

ROLLBACK;
