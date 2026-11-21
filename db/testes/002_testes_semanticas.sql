-- =====================================================================
-- 002_testes_semanticas.sql
-- RH Soluções · Marco 05 · M1, gatilhos das regras semânticas (003)
--
-- Usa a massa do seed (002). Cada bloco testa uma regra: o caso que deve
-- passar e o caso que deve ser rejeitado. Tudo termina em ROLLBACK.
-- Execução: psql -v ON_ERROR_STOP=1 -U postgres -d rh_db -f db/testes/002_testes_semanticas.sql
-- =====================================================================

BEGIN;
SET search_path TO rh, public;

-- Helper de asserção: exige que o bloco falhe com a mensagem de regra esperada.
CREATE OR REPLACE FUNCTION pg_temp.deve_rejeitar(p_nome text, p_sql text, p_regra text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
  RAISE EXCEPTION 'FALHA [%]: era para rejeitar e aceitou', p_nome;
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM LIKE p_regra || '%' THEN
    RAISE NOTICE 'PASS [%] rejeitado: %', p_nome, SQLERRM;
  ELSIF SQLERRM LIKE 'FALHA [%' THEN
    RAISE;
  ELSE
    RAISE EXCEPTION 'FALHA [%]: rejeitou por outro motivo: %', p_nome, SQLERRM;
  END IF;
WHEN OTHERS THEN
  RAISE EXCEPTION 'FALHA [%]: erro inesperado: %', p_nome, SQLERRM;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.deve_aceitar(p_nome text, p_sql text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
  RAISE NOTICE 'PASS [%] aceito', p_nome;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'FALHA [%]: era para aceitar: %', p_nome, SQLERRM;
END $$;

-- ---------------------------------------------------------------------
-- RI15: chefia imediata derivada (casos do documento, seção 3.3, adaptados ao seed)
-- ---------------------------------------------------------------------
DO $$ BEGIN
  IF chefia_imediata('M012', DATE '2026-10-01') IS DISTINCT FROM 'M002' THEN
    RAISE EXCEPTION 'FALHA [RI15 chefia normal]: esperado M002';
  END IF;
  RAISE NOTICE 'PASS [RI15 chefia = gestor vigente do departamento]';

  IF chefia_imediata('M012', DATE '2026-09-05') IS DISTINCT FROM 'M003' THEN
    RAISE EXCEPTION 'FALHA [RI15 cobertura]: esperado substituto M003 durante férias de M002';
  END IF;
  RAISE NOTICE 'PASS [RI15 substituto em cobertura]';

  IF chefia_imediata('M002', DATE '2026-10-01') IS NOT NULL THEN
    RAISE EXCEPTION 'FALHA [RI15 diretor sem chefia]: M002 é titular de departamento sem superior';
  END IF;
  RAISE NOTICE 'PASS [RI15 diretor sem chefia imediata = NULL]';
END $$;

-- ---------------------------------------------------------------------
-- RI11: quem cadastra meta
-- ---------------------------------------------------------------------
SELECT pg_temp.deve_aceitar('RI11 chefia cadastra meta',
  $$INSERT INTO meta (matricula_responsavel, matricula_cadastrante, titulo, indicador, data_inicio, prazo)
    VALUES ('M012', 'M002', 'Teste', 'x', CURRENT_DATE, CURRENT_DATE + 30)$$);

SELECT pg_temp.deve_rejeitar('RI11 colega cadastra meta',
  $$INSERT INTO meta (matricula_responsavel, matricula_cadastrante, titulo, indicador, data_inicio, prazo)
    VALUES ('M012', 'M013', 'Teste', 'x', CURRENT_DATE, CURRENT_DATE + 30)$$, 'RI11');

SELECT pg_temp.deve_rejeitar('RI11 responsável cadastra a própria meta',
  $$INSERT INTO meta (matricula_responsavel, matricula_cadastrante, titulo, indicador, data_inicio, prazo)
    VALUES ('M002', 'M002', 'Teste', 'x', CURRENT_DATE, CURRENT_DATE + 30)$$, 'RI11');

-- ---------------------------------------------------------------------
-- RI09 e RI10: progresso informado e validado
-- ---------------------------------------------------------------------
SELECT pg_temp.deve_rejeitar('RI09 check-in informa meta de outro',
  $$INSERT INTO progresso_meta (cod_checkin, cod_meta, perc_informado)
    SELECT c.cod_checkin, m.cod_meta, 10 FROM checkin c, meta m
     WHERE c.matricula = 'M012' AND c.ano = 2026 AND c.semana = 30 AND m.matricula_responsavel = 'M013'
       AND NOT EXISTS (SELECT 1 FROM progresso_meta p WHERE p.cod_checkin = c.cod_checkin AND p.cod_meta = m.cod_meta)$$,
  'RI09');

-- Semana 36 de 2026 (setembro) cai no afastamento de M002: validador é M003.
SELECT pg_temp.deve_aceitar('RI10 substituto valida na cobertura',
  $$UPDATE progresso_meta p SET matricula_validador = 'M003', data_validacao = DATE '2026-09-05' + interval '1 day'
     FROM checkin c JOIN meta m ON m.matricula_responsavel = c.matricula
     WHERE p.cod_checkin = c.cod_checkin AND p.cod_meta = m.cod_meta
       AND c.matricula = 'M012' AND c.ano = 2026 AND c.semana = 36$$);

SELECT pg_temp.deve_rejeitar('RI10 titular valida durante cobertura',
  $$UPDATE progresso_meta p SET matricula_validador = 'M002', data_validacao = DATE '2026-09-05' + interval '1 day'
     FROM checkin c JOIN meta m ON m.matricula_responsavel = c.matricula
     WHERE p.cod_checkin = c.cod_checkin AND p.cod_meta = m.cod_meta
       AND c.matricula = 'M012' AND c.ano = 2026 AND c.semana = 36$$, 'RI10');

SELECT pg_temp.deve_rejeitar('RI10 gestor sem relação valida',
  $$UPDATE progresso_meta p SET matricula_validador = 'M004', data_validacao = DATE '2026-10-01'
     FROM checkin c JOIN meta m ON m.matricula_responsavel = c.matricula
     WHERE p.cod_checkin = c.cod_checkin AND p.cod_meta = m.cod_meta
       AND c.matricula = 'M012' AND c.ano = 2026 AND c.semana = 40$$, 'RI10');

-- ---------------------------------------------------------------------
-- RI12: alerta se baseia em check-in do próprio colaborador
-- ---------------------------------------------------------------------
INSERT INTO alerta (matricula_colaborador, tipo, janela_ref, regra_disparada)
  VALUES ('M012', 'sem resposta', '2099-W01', 'teste');

SELECT pg_temp.deve_rejeitar('RI12 check-in de outro usuário',
  $$INSERT INTO alerta_checkin (cod_alerta, cod_checkin)
    SELECT a.cod_alerta, c.cod_checkin FROM alerta a, checkin c
     WHERE a.janela_ref = '2099-W01' AND c.matricula = 'M013' AND c.ano = 2026 AND c.semana = 20$$, 'RI12');

-- ---------------------------------------------------------------------
-- RI13: dono do alerta é a chefia vigente; o alvo não é destinatário
-- ---------------------------------------------------------------------
SELECT pg_temp.deve_aceitar('RI13 dono = chefia vigente',
  $$INSERT INTO destinatario_alerta (cod_alerta, matricula, papel)
    SELECT cod_alerta, 'M002', 'dono' FROM alerta WHERE janela_ref = '2099-W01' AND matricula_colaborador = 'M012'$$);

SELECT pg_temp.deve_rejeitar('RI13 dono diferente da chefia',
  $$INSERT INTO destinatario_alerta (cod_alerta, matricula, papel)
    SELECT cod_alerta, 'M003', 'observador' FROM alerta WHERE janela_ref = '2099-W01' AND matricula_colaborador = 'M012'
    UNION ALL
    SELECT cod_alerta, 'M004', 'dono' FROM alerta WHERE janela_ref = '2099-W01' AND matricula_colaborador = 'M012'$$, 'RI13');

SELECT pg_temp.deve_rejeitar('RI13 alvo como destinatário',
  $$INSERT INTO destinatario_alerta (cod_alerta, matricula, papel)
    SELECT cod_alerta, 'M012', 'observador' FROM alerta WHERE janela_ref = '2099-W01' AND matricula_colaborador = 'M012'$$, 'RI13');

-- ---------------------------------------------------------------------
-- RI14: ação tratando alerta só pelo dono vigente (M002)
-- ---------------------------------------------------------------------
SELECT pg_temp.deve_aceitar('RI14 dono trata o alerta',
  $$INSERT INTO acao_acompanhamento (matricula_colaborador, cod_alerta, matricula_gestor, tipo, descricao)
    SELECT 'M012', cod_alerta, 'M002', 'conversa individual', 'teste' FROM alerta
     WHERE janela_ref = '2099-W01' AND matricula_colaborador = 'M012'$$);

SELECT pg_temp.deve_rejeitar('RI14 outro gestor trata o alerta',
  $$INSERT INTO acao_acompanhamento (matricula_colaborador, cod_alerta, matricula_rh, tipo, descricao)
    SELECT 'M012', cod_alerta, 'M001', 'orientação', 'teste' FROM alerta
     WHERE janela_ref = '2099-W01' AND matricula_colaborador = 'M012'$$, 'RI14');

-- ---------------------------------------------------------------------
-- RI18 e RI29: cobertura
-- ---------------------------------------------------------------------
SELECT pg_temp.deve_rejeitar('RI29 cobertura fora do afastamento',
  $$INSERT INTO cobertura (matricula_afastado, data_inicio_afastamento, cod_departamento,
                           data_inicio, data_fim, matricula_substituto)
    VALUES ('M002', DATE '2026-09-01', 'D01', DATE '2026-08-01', DATE '2026-08-10', 'M003')$$, 'RI29');

INSERT INTO afastamento (matricula, data_inicio, tipo, data_fim)
  VALUES ('M004', DATE '2026-09-01', 'férias', DATE '2026-09-30');

SELECT pg_temp.deve_rejeitar('RI18 substituto afastado no período',
  $$INSERT INTO cobertura (matricula_afastado, data_inicio_afastamento, cod_departamento,
                           data_inicio, data_fim, matricula_substituto)
    VALUES ('M002', DATE '2026-09-01', 'D01', DATE '2026-09-05', DATE '2026-09-10', 'M004')$$, 'RI18');

-- ---------------------------------------------------------------------
-- RI42 e RI19: designação só para diretor sem chefia imediata
-- ---------------------------------------------------------------------
SELECT pg_temp.deve_aceitar('RI42 designação para diretor sem chefia',
  $$INSERT INTO designacao (matricula_gestor, matricula_beneficiario, matricula_rh, finalidade, data_inicio)
    VALUES ('M005', 'M002', 'M001', 'metas', DATE '2026-10-01')$$);

SELECT pg_temp.deve_rejeitar('RI42 designação para quem tem chefia',
  $$INSERT INTO designacao (matricula_gestor, matricula_beneficiario, matricula_rh, finalidade, data_inicio)
    VALUES ('M005', 'M012', 'M001', 'metas', DATE '2026-10-01')$$, 'RI42');

ROLLBACK;
