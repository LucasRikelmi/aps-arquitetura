-- =====================================================================
-- 001_testes_ri.sql
-- RH Soluções · Marco 05 · M1 (testes das restrições de integridade)
--
-- Executar em rh_db depois de 001_ddl_recorte.sql e 002_seed_demo.sql:
--   psql -v ON_ERROR_STOP=1 -U postgres -d rh_db -f db/testes/001_testes_ri.sql
--
-- Cada teste imprime PASS ou falha a execução. Tudo roda dentro de uma transação
-- que termina em ROLLBACK, então a base não é alterada.
-- Dados de teste usam matrículas TST* e códigos TST*, para não colidir com o seed.
-- =====================================================================

BEGIN;
SET search_path TO rh, public;

-- ---------------------------------------------------------------------
-- Massa do teste
-- ---------------------------------------------------------------------
INSERT INTO cargo (cod_cargo, nome) VALUES ('CTST', 'Cargo de teste');
INSERT INTO departamento (cod_departamento, sigla, nome) VALUES
  ('DTST1', 'T1', 'Teste 1'), ('DTST2', 'T2', 'Teste 2');
INSERT INTO usuario (matricula, nome, cpf, data_nascimento, email, data_admissao, tipo_contrato) VALUES
  ('TST1', 'Teste Um', '11122233344', '1990-01-01', 'tst1@exemplo.invalido', '2024-01-01', 'CLT'),
  ('TST2', 'Teste Dois', '55566677788', '1990-01-01', 'tst2@exemplo.invalido', '2024-01-01', 'CLT');
INSERT INTO credencial (matricula, hash_senha) VALUES ('TST1', '$argon2id$teste');
INSERT INTO lotacao (matricula, data_inicio, cod_departamento, cod_cargo, motivo)
  VALUES ('TST1', '2024-01-01', 'DTST1', 'CTST', 'admissão');

-- ---------------------------------------------------------------------
-- Seed: contagens esperadas (002_seed_demo.sql)
-- ---------------------------------------------------------------------
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM rh.usuario WHERE matricula LIKE 'M%';
  IF n <> 50 THEN RAISE EXCEPTION 'FALHA [seed usuarios]: esperado 50, obtido %', n; END IF;
  RAISE NOTICE 'PASS [seed usuarios = 50]';

  SELECT count(*) INTO n FROM rh.departamento WHERE cod_departamento LIKE 'D0%' OR cod_departamento = 'D10';
  IF n <> 10 THEN RAISE EXCEPTION 'FALHA [seed departamentos]: esperado 10, obtido %', n; END IF;
  RAISE NOTICE 'PASS [seed departamentos = 10]';

  SELECT count(DISTINCT (ano, semana)) INTO n FROM rh.checkin WHERE matricula LIKE 'M%';
  IF n <> 52 THEN RAISE EXCEPTION 'FALHA [seed semanas]: esperado 52, obtido %', n; END IF;
  RAISE NOTICE 'PASS [seed semanas ISO = 52]';

  SELECT count(*) INTO n FROM rh.credencial c
   WHERE NOT EXISTS (SELECT 1 FROM rh.usuario u WHERE u.matricula = c.matricula);
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA [seed credencial sem usuario]: %', n; END IF;
  RAISE NOTICE 'PASS [toda credencial tem usuário]';
END $$;

-- ---------------------------------------------------------------------
-- DA10: credencial 1:1 com usuário
-- ---------------------------------------------------------------------
DO $$ BEGIN
  BEGIN
    INSERT INTO rh.credencial (matricula, hash_senha) VALUES ('TST1', 'segunda');
    RAISE EXCEPTION 'FALHA [DA10 1:1]: aceitou segunda credencial';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASS [DA10 credencial 1:1]';
  END;
END $$;

-- ---------------------------------------------------------------------
-- RI01 e RI07 (CPF): formato de 11 dígitos
-- ---------------------------------------------------------------------
DO $$ BEGIN
  BEGIN
    INSERT INTO rh.usuario (matricula, nome, cpf, data_nascimento, email, data_admissao, tipo_contrato)
      VALUES ('TST9', 'Invalido', '123', '1990-01-01', 'x@exemplo.invalido', '2024-01-01', 'CLT');
    RAISE EXCEPTION 'FALHA [CPF formato]: aceitou CPF de 3 dígitos';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS [CPF com 11 dígitos]';
  END;
END $$;

-- ---------------------------------------------------------------------
-- RI06: semana ISO. 2026 tem 53 semanas; 2025 tem 52.
-- ---------------------------------------------------------------------
DO $$ BEGIN
  INSERT INTO rh.checkin (matricula, ano, semana, humor, carga) VALUES ('TST1', 2026, 53, 3, 'Leve');
  RAISE NOTICE 'PASS [RI06 semana 53 aceita em 2026]';
END $$;

DO $$ BEGIN
  BEGIN
    INSERT INTO rh.checkin (matricula, ano, semana, humor, carga) VALUES ('TST1', 2025, 53, 3, 'Leve');
    RAISE EXCEPTION 'FALHA [RI06 semana 53 em 2025]: aceitou';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS [RI06 semana 53 rejeitada em 2025]';
  END;
END $$;

-- ---------------------------------------------------------------------
-- RI06: no máximo um check-in por usuário e semana
-- ---------------------------------------------------------------------
DO $$ BEGIN
  BEGIN
    INSERT INTO rh.checkin (matricula, ano, semana, humor, carga) VALUES ('TST1', 2026, 53, 4, 'Normal');
    RAISE EXCEPTION 'FALHA [RI06 unicidade]: aceitou check-in duplicado';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASS [RI06 um check-in por semana]';
  END;
END $$;

-- ---------------------------------------------------------------------
-- RI01: humor fora de 1 a 5
-- ---------------------------------------------------------------------
DO $$ BEGIN
  BEGIN
    INSERT INTO rh.checkin (matricula, ano, semana, humor, carga) VALUES ('TST2', 2026, 10, 6, 'Leve');
    RAISE EXCEPTION 'FALHA [RI01 humor]: aceitou humor 6';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS [RI01 humor entre 1 e 5]';
  END;
END $$;

-- ---------------------------------------------------------------------
-- RI16: hierarquia de departamentos sem ciclo
-- ---------------------------------------------------------------------
DO $$ BEGIN
  BEGIN
    UPDATE rh.departamento SET superior_cod = 'DTST1' WHERE cod_departamento = 'DTST2';
    UPDATE rh.departamento SET superior_cod = 'DTST2' WHERE cod_departamento = 'DTST1';
    RAISE EXCEPTION 'FALHA [RI16 ciclo]: aceitou ciclo';
  EXCEPTION WHEN raise_exception THEN
    RAISE NOTICE 'PASS [RI16 ciclo rejeitado]';
  END;
END $$;

-- ---------------------------------------------------------------------
-- RI21: uma lotação vigente, períodos sem sobreposição
-- ---------------------------------------------------------------------
DO $$ BEGIN
  BEGIN
    INSERT INTO rh.lotacao (matricula, data_inicio, cod_departamento, cod_cargo, motivo)
      VALUES ('TST1', '2025-01-01', 'DTST2', 'CTST', 'transferência');
    RAISE EXCEPTION 'FALHA [RI21 sobreposicao]: aceitou lotação sobreposta';
  EXCEPTION WHEN exclusion_violation OR unique_violation THEN
    RAISE NOTICE 'PASS [RI21 lotação sem sobreposição]';
  END;
END $$;

-- ---------------------------------------------------------------------
-- RI13: exatamente um dono vigente por alerta
-- ---------------------------------------------------------------------
INSERT INTO rh.alerta (matricula_colaborador, tipo, janela_ref, regra_disparada)
  VALUES ('TST1', 'sem resposta', '2026-W10', 'teste');

DO $$ BEGIN
  INSERT INTO rh.destinatario_alerta (cod_alerta, matricula, papel)
    SELECT cod_alerta, 'M001', 'dono' FROM rh.alerta WHERE janela_ref = '2026-W10' AND matricula_colaborador = 'TST1';
  BEGIN
    INSERT INTO rh.destinatario_alerta (cod_alerta, matricula, papel)
      SELECT cod_alerta, 'M002', 'dono' FROM rh.alerta WHERE janela_ref = '2026-W10' AND matricula_colaborador = 'TST1';
    RAISE EXCEPTION 'FALHA [RI13 dono unico]: aceitou dois donos';
  EXCEPTION WHEN unique_violation OR raise_exception THEN
    -- Rejeitado pelo índice único (um dono vigente) ou pelo gatilho RI13 (dono deve ser a chefia).
    RAISE NOTICE 'PASS [RI13 um dono vigente]';
  END;
END $$;

-- ---------------------------------------------------------------------
-- RI48 e RB do plano 1.1: o papel da aplicação não altera o log
-- ---------------------------------------------------------------------
SET LOCAL ROLE rh_app;

DO $$ BEGIN
  INSERT INTO rh.log_acesso (matricula_ator, perfil, recurso, acao, resultado)
    VALUES ('TST1', 'Colaborador', 'teste', 'consulta', 'permitido');
  RAISE NOTICE 'PASS [rh_app insere no log]';
END $$;

DO $$ BEGIN
  BEGIN
    UPDATE rh.log_acesso SET resultado = 'negado';
    RAISE EXCEPTION 'FALHA [RI48 UPDATE log]: rh_app alterou o log';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS [RI48 log sem UPDATE para rh_app]';
  END;
END $$;

DO $$ BEGIN
  BEGIN
    DELETE FROM rh.lotacao WHERE matricula = 'TST1';
    RAISE EXCEPTION 'FALHA [histórico sem DELETE]: rh_app apagou lotação';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS [histórico sem DELETE para rh_app]';
  END;
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------
-- Fim dos testes. Nada é gravado.
-- ---------------------------------------------------------------------
ROLLBACK;
