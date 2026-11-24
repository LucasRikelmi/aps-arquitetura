-- Lista B - check-in identificável por ano/semana ISO.
-- Execute apos 001, 002 e 003. Não confundir com checkin_exemplo da Lista B anterior.
CREATE TABLE IF NOT EXISTS checkin_semanal (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 usuario_id UUID NOT NULL REFERENCES usuario(id),
 ano_iso SMALLINT NOT NULL CHECK(ano_iso BETWEEN 2000 AND 2200),
 semana_iso SMALLINT NOT NULL CHECK(semana_iso BETWEEN 1 AND 53),
 semana_inicio DATE NOT NULL,
 humor SMALLINT NOT NULL CHECK(humor BETWEEN 1 AND 5),
 carga TEXT NOT NULL CHECK(carga IN ('Leve','Normal','Pesada')),
 comentario TEXT CHECK(comentario IS NULL OR length(comentario)<=2000),
 criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
 atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(usuario_id, ano_iso, semana_iso),
 UNIQUE(usuario_id, semana_inicio)
);
CREATE INDEX IF NOT EXISTS ix_checkin_semanal_usuario ON checkin_semanal(usuario_id, semana_inicio DESC);

-- Progresso é por meta e opcional quando não há metas atribuídas.
-- A tabela de metas do sistema completo será integrada futuramente.
CREATE TABLE IF NOT EXISTS checkin_progresso (
 checkin_id UUID NOT NULL REFERENCES checkin_semanal(id) ON DELETE CASCADE,
 meta_id UUID NOT NULL,
 progresso SMALLINT NOT NULL CHECK(progresso BETWEEN 0 AND 100),
 origem TEXT NOT NULL DEFAULT 'autorrelato' CHECK(origem='autorrelato'),
 PRIMARY KEY(checkin_id, meta_id)
);

-- RH reabre uma semana fechada para uma pessoa específica. Histórico preservado.
CREATE TABLE IF NOT EXISTS reabertura_checkin (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 usuario_id UUID NOT NULL REFERENCES usuario(id),
 ano_iso SMALLINT NOT NULL,
 semana_iso SMALLINT NOT NULL,
 semana_inicio DATE NOT NULL,
 autor_rh_id UUID NOT NULL REFERENCES usuario(id),
 aberta_em TIMESTAMPTZ NOT NULL DEFAULT now(),
 consumida_em TIMESTAMPTZ,
 UNIQUE(usuario_id, ano_iso, semana_iso, aberta_em)
);
CREATE INDEX IF NOT EXISTS ix_reabertura_lookup ON reabertura_checkin(usuario_id,ano_iso,semana_iso,aberta_em DESC) WHERE consumida_em IS NULL;

-- Esta ação integra o domínio de log sem substituir o armazenamento de histórico.
ALTER TABLE log_acesso DROP CONSTRAINT IF EXISTS log_acesso_acao_check;
ALTER TABLE log_acesso ADD CONSTRAINT log_acesso_acao_check
CHECK (acao IN ('consulta','exportacao','negativa','consulta_log','reabertura'));
