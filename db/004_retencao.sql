-- =====================================================================
-- 004_retencao.sql
-- RH Soluções · Marco 05 · M1, item 1.7 (rotinas da RB-11)
--
-- Rotinas (todas executadas pelo papel rh_manutencao, via SECURITY DEFINER):
--   retencao_anonimizar_checkins(ref)    RI47: check-in individual com mais de 24 meses
--   retencao_anonimizar_desligados(ref)  RI47 e RI36: desligado há mais de 90 dias
--   retencao_expurgar_log(ref)           RI48: log de acesso com mais de 6 meses
--
-- Decisão de 20/11/2026 para o desligado: o cadastro é anonimizado (nome, CPF,
-- e-mail, telefones, endereço, data de nascimento e id_externo). Matrícula, lotação
-- e histórico organizacional são mantidos. A credencial é apagada e as sessões são revogadas.
--
-- Cada rotina grava uma linha em execucao_agendador (DA12).
-- Pré-requisito: 001 aplicado. Ordem: 001 -> 003 -> 002 -> 004 -> 005 -> 006.
-- =====================================================================

SET search_path TO rh, public;

-- Papel de manutenção. Sem login.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rh_manutencao') THEN
    CREATE ROLE rh_manutencao NOLOGIN;
  END IF;
END $$;

-- Desligado precisa de cadastro anonimizável: data de nascimento passa a aceitar NULL.
ALTER TABLE usuario ALTER COLUMN data_nascimento DROP NOT NULL;

GRANT USAGE ON SCHEMA rh TO rh_manutencao;
GRANT SELECT ON ALL TABLES IN SCHEMA rh TO rh_manutencao;
GRANT UPDATE ON checkin, alerta, acao_acompanhamento, usuario, sessao TO rh_manutencao;
GRANT DELETE ON progresso_meta, log_acesso, credencial TO rh_manutencao;
GRANT INSERT ON execucao_agendador TO rh_manutencao;
-- Anonimizar check-ins dispara a invalidação dos agregados (005), que grava em agregado_semanal.
GRANT INSERT, UPDATE ON agregado_semanal TO rh_manutencao;
GRANT USAGE, SELECT ON SEQUENCE execucao_agendador_cod_execucao_seq TO rh_manutencao;

-- ---------------------------------------------------------------------
-- RI47: anonimiza check-ins com mais de 24 meses.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION retencao_anonimizar_checkins(p_ref timestamptz DEFAULT now())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = rh, public AS $$
DECLARE
  v_limite  timestamptz := p_ref - interval '24 months';
  v_chk     integer;
  v_prog    integer;
  v_alerta  integer;
  v_acao    integer;
BEGIN
  DELETE FROM progresso_meta p
   USING checkin c
   WHERE p.cod_checkin = c.cod_checkin
     AND c.anonimizado = false
     AND c.data_envio < v_limite;
  GET DIAGNOSTICS v_prog = ROW_COUNT;

  UPDATE checkin c
     SET coorte_departamento = (
           SELECT l.cod_departamento FROM lotacao l
            WHERE l.matricula = c.matricula
              AND c.data_envio::date >= l.data_inicio
              AND (l.data_fim IS NULL OR c.data_envio::date <= l.data_fim)
            LIMIT 1),
         matricula = NULL,
         anonimizado = true
   WHERE c.anonimizado = false
     AND c.data_envio < v_limite;
  GET DIAGNOSTICS v_chk = ROW_COUNT;

  UPDATE alerta a SET matricula_colaborador = NULL
   WHERE a.matricula_colaborador IS NOT NULL AND a.data_geracao < v_limite;
  GET DIAGNOSTICS v_alerta = ROW_COUNT;

  UPDATE acao_acompanhamento x SET matricula_colaborador = NULL
   WHERE x.matricula_colaborador IS NOT NULL AND x.data_registro < v_limite;
  GET DIAGNOSTICS v_acao = ROW_COUNT;

  INSERT INTO execucao_agendador (tarefa, terminada_em, situacao)
    VALUES ('retencao_anonimizar_checkins', clock_timestamp(), 'ok');

  RETURN format('checkins=%s progressos_apagados=%s alertas=%s acoes=%s',
                v_chk, v_prog, v_alerta, v_acao);
END $$;

-- ---------------------------------------------------------------------
-- RI47 e RI36: desligado há mais de 90 dias.
-- Vínculos de check-in, alerta e ação são removidos. Dados pessoais do cadastro
-- são anonimizados. Credencial apagada. Sessões revogadas.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION retencao_anonimizar_desligados(p_ref timestamptz DEFAULT now())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = rh, public AS $$
DECLARE
  v_limite  date := (p_ref - interval '90 days')::date;
  v_chk     integer;
  v_prog    integer;
  v_alerta  integer;
  v_acao    integer;
  v_cred    integer;
  v_sess    integer;
  v_cad     integer;
BEGIN
  DELETE FROM progresso_meta p
   USING checkin c, usuario u
   WHERE p.cod_checkin = c.cod_checkin
     AND c.matricula = u.matricula
     AND u.data_desligamento IS NOT NULL
     AND u.data_desligamento < v_limite;
  GET DIAGNOSTICS v_prog = ROW_COUNT;

  UPDATE checkin c
     SET coorte_departamento = (
           SELECT l.cod_departamento FROM lotacao l
            WHERE l.matricula = c.matricula
              AND c.data_envio::date >= l.data_inicio
              AND (l.data_fim IS NULL OR c.data_envio::date <= l.data_fim)
            LIMIT 1),
         matricula = NULL,
         anonimizado = true
    FROM usuario u
   WHERE c.matricula = u.matricula
     AND u.data_desligamento IS NOT NULL
     AND u.data_desligamento < v_limite;
  GET DIAGNOSTICS v_chk = ROW_COUNT;

  UPDATE alerta a SET matricula_colaborador = NULL
    FROM usuario u
   WHERE a.matricula_colaborador = u.matricula
     AND u.data_desligamento IS NOT NULL
     AND u.data_desligamento < v_limite;
  GET DIAGNOSTICS v_alerta = ROW_COUNT;

  UPDATE acao_acompanhamento x SET matricula_colaborador = NULL
    FROM usuario u
   WHERE x.matricula_colaborador = u.matricula
     AND u.data_desligamento IS NOT NULL
     AND u.data_desligamento < v_limite;
  GET DIAGNOSTICS v_acao = ROW_COUNT;

  -- Credencial apagada: o desligado não autentica mais.
  DELETE FROM credencial c
   USING usuario u
   WHERE c.matricula = u.matricula
     AND u.data_desligamento IS NOT NULL
     AND u.data_desligamento < v_limite;
  GET DIAGNOSTICS v_cred = ROW_COUNT;

  -- Sessões revogadas (DA09, RI36).
  UPDATE sessao s SET revogada_em = now(), motivo_revogacao = 'desligamento'
    FROM usuario u
   WHERE s.matricula = u.matricula
     AND s.revogada_em IS NULL
     AND u.data_desligamento IS NOT NULL
     AND u.data_desligamento < v_limite;
  GET DIAGNOSTICS v_sess = ROW_COUNT;

  -- Cadastro anonimizado. Matrícula, lotação e datas organizacionais ficam.
  UPDATE usuario u
     SET nome = 'ANONIMIZADO',
         cpf = '00000000000',
         email = 'anonimizado.' || u.matricula || '@invalido',
         telefones = '{}',
         logradouro = NULL, numero = NULL, cidade = NULL, uf = NULL, cep = NULL,
         data_nascimento = NULL,
         id_externo = NULL
   WHERE u.data_desligamento IS NOT NULL
     AND u.data_desligamento < v_limite
     AND u.nome <> 'ANONIMIZADO';
  GET DIAGNOSTICS v_cad = ROW_COUNT;

  INSERT INTO execucao_agendador (tarefa, terminada_em, situacao)
    VALUES ('retencao_anonimizar_desligados', clock_timestamp(), 'ok');

  RETURN format('checkins=%s progressos_apagados=%s alertas=%s acoes=%s credenciais=%s sessoes=%s cadastros=%s',
                v_chk, v_prog, v_alerta, v_acao, v_cred, v_sess, v_cad);
END $$;

-- ---------------------------------------------------------------------
-- RI48: expurgo do log com mais de 6 meses.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION retencao_expurgar_log(p_ref timestamptz DEFAULT now())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = rh, public AS $$
DECLARE
  v_limite timestamptz := p_ref - interval '6 months';
  v_linhas integer;
BEGIN
  DELETE FROM log_acesso WHERE data_hora < v_limite;
  GET DIAGNOSTICS v_linhas = ROW_COUNT;

  INSERT INTO execucao_agendador (tarefa, terminada_em, situacao)
    VALUES ('retencao_expurgar_log', clock_timestamp(), 'ok');

  RETURN format('log_apagado=%s', v_linhas);
END $$;

-- Papel de execução: as funções pertencem a rh_manutencao. Só o superusuário
-- (que roda o agendador) pode executá-las. A aplicação (rh_app) não.
ALTER FUNCTION retencao_anonimizar_checkins(timestamptz) OWNER TO rh_manutencao;
ALTER FUNCTION retencao_anonimizar_desligados(timestamptz) OWNER TO rh_manutencao;
ALTER FUNCTION retencao_expurgar_log(timestamptz) OWNER TO rh_manutencao;
REVOKE EXECUTE ON FUNCTION retencao_anonimizar_checkins(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION retencao_anonimizar_desligados(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION retencao_expurgar_log(timestamptz) FROM PUBLIC;

-- Fim da retenção 1.7.
