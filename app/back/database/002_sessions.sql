-- Executar APOS database/schema.sql; segura para execucoes repetidas.
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS sessao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  auth_version INTEGER NOT NULL,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultima_atividade TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em TIMESTAMPTZ NOT NULL,
  revogada_em TIMESTAMPTZ,
  CONSTRAINT sessao_expira_apos_criacao CHECK (expira_em > criada_em)
);
CREATE INDEX IF NOT EXISTS ix_sessao_usuario_ativa ON sessao(usuario_id) WHERE revogada_em IS NULL;
CREATE INDEX IF NOT EXISTS ix_sessao_expiracao ON sessao(expira_em);
CREATE TABLE IF NOT EXISTS atribuicao_perfil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  perfil TEXT NOT NULL CHECK (perfil IN ('Colaborador','Gestor','RH','Diretoria','Administracao')),
  inicio_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  fim_em TIMESTAMPTZ,
  CONSTRAINT perfil_periodo CHECK (fim_em IS NULL OR fim_em > inicio_em)
);
CREATE INDEX IF NOT EXISTS ix_perfil_usuario_vigente ON atribuicao_perfil(usuario_id, inicio_em, fim_em);
-- Politica: alteracoes de perfil APENAS via scripts/change-profile.js, em transacao.
-- Rotinas externas devem executar invalidacao das sessoes na mesma transacao da mudanca.
