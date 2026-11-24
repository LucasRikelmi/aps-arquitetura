-- RF04 / RB-01 / HU-05 C01..C07 / UC06
-- Executar depois das migracoes 001..005. Mantem historico e autorrelato imutavel pela validacao.
ALTER TABLE checkin_progresso ADD COLUMN IF NOT EXISTS revisao INTEGER NOT NULL DEFAULT 1 CHECK (revisao>=1);
-- Integridade futura: vincular progressos a metas validas da mesma pessoa na transacao.
CREATE TABLE IF NOT EXISTS validacao_progresso (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 checkin_id UUID NOT NULL REFERENCES checkin_semanal(id),
 meta_id UUID NOT NULL REFERENCES meta(id),
 revisao_autorrelato INTEGER NOT NULL CHECK(revisao_autorrelato>=1),
 autorrelato_no_momento SMALLINT NOT NULL CHECK(autorrelato_no_momento BETWEEN 0 AND 100),
 valor_validado SMALLINT NOT NULL CHECK(valor_validado BETWEEN 0 AND 100),
 avaliacao_qualitativa TEXT NOT NULL CHECK(length(trim(avaliacao_qualitativa)) BETWEEN 1 AND 1000),
 validador_id UUID NOT NULL REFERENCES usuario(id),
 criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS ix_validacao_progresso_atual ON validacao_progresso(checkin_id, meta_id, revisao_autorrelato, criado_em DESC, id DESC);
-- Cobertura por substituto temporario, limitada a equipe/periodo expressos.
CREATE TABLE IF NOT EXISTS cobertura_gestor (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 gestor_titular_id UUID NOT NULL REFERENCES usuario(id),
 gestor_substituto_id UUID NOT NULL REFERENCES usuario(id),
 colaborador_id UUID NOT NULL REFERENCES usuario(id),
 inicio_em TIMESTAMPTZ NOT NULL,
 fim_em TIMESTAMPTZ NOT NULL,
 registrado_por UUID NOT NULL REFERENCES usuario(id),
 CHECK(gestor_titular_id <> gestor_substituto_id AND gestor_substituto_id <> colaborador_id AND inicio_em < fim_em)
);
CREATE INDEX IF NOT EXISTS ix_cobertura_gestor_ativa ON cobertura_gestor(gestor_substituto_id,colaborador_id,inicio_em,fim_em);
-- Somente insercoes no historico: REVOKE UPDATE/DELETE/TRUNCATE do papel de aplicacao na implantacao.
-- Auditoria de validacao: registro transacional no log_acesso, sem apagar historico anterior.
ALTER TABLE log_acesso DROP CONSTRAINT IF EXISTS log_acesso_acao_check;
ALTER TABLE log_acesso ADD CONSTRAINT log_acesso_acao_check
  CHECK(acao IN ('consulta','exportacao','negativa','consulta_log','reabertura','validacao_progresso'));
