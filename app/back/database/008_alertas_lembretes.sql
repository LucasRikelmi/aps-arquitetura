-- RF07, RF12, RB03..05, RB08. Rodar apos 001..007.
-- Data de entrada no acompanhamento: evitar alertas de ausência antes da adesão.
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS acompanhamento_inicio DATE NOT NULL DEFAULT CURRENT_DATE;
CREATE TABLE IF NOT EXISTS afastamento_semana (
 usuario_id UUID NOT NULL REFERENCES usuario(id), semana_inicio DATE NOT NULL,
 registrado_por UUID REFERENCES usuario(id), criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(usuario_id,semana_inicio)
);
CREATE TABLE IF NOT EXISTS alerta (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 colaborador_id UUID NOT NULL REFERENCES usuario(id),
 tipo TEXT NOT NULL CHECK(tipo IN ('humor_meta_atrasada','meta_vencida','meta_em_risco','sem_checkin')),
 objeto_id UUID, semana_inicio DATE NOT NULL,
 situacao TEXT NOT NULL DEFAULT 'aberto' CHECK(situacao IN ('aberto','tratado','encerrado')),
 criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 tratado_em TIMESTAMPTZ, encerrado_em TIMESTAMPTZ,
 UNIQUE(colaborador_id,tipo,semana_inicio,objeto_id)
);
-- PostgreSQL UNIQUE normal permite NULL; segunda chave para ausencia.
CREATE UNIQUE INDEX IF NOT EXISTS ux_alerta_ausencia ON alerta(colaborador_id,tipo,semana_inicio) WHERE objeto_id IS NULL;
CREATE INDEX IF NOT EXISTS ix_alerta_colaborador ON alerta(colaborador_id,situacao,criado_em DESC);
CREATE TABLE IF NOT EXISTS alerta_destinatario (
 alerta_id UUID NOT NULL REFERENCES alerta(id), usuario_id UUID NOT NULL REFERENCES usuario(id),
 papel TEXT NOT NULL CHECK(papel IN ('dono','observador')),
 atribuido_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(alerta_id,usuario_id)
);
-- Ocorrencias e transicoes, nunca apagar nem reabrir tratados automaticamente.
CREATE TABLE IF NOT EXISTS alerta_evento (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 alerta_id UUID NOT NULL REFERENCES alerta(id), evento TEXT NOT NULL,
 ator_id UUID REFERENCES usuario(id), ocorrido_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 detalhes JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS notificacao_saida (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 chave TEXT NOT NULL UNIQUE,
 destinatario_id UUID NOT NULL REFERENCES usuario(id),
 canal TEXT NOT NULL DEFAULT 'email' CHECK(canal='email'),
 tipo TEXT NOT NULL CHECK(tipo IN ('lembrete','resumo_alertas','participacao')),
 assunto TEXT NOT NULL, corpo TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente','enviando','enviado','falhou')),
 tentativas INTEGER NOT NULL DEFAULT 0, tentativa_em TIMESTAMPTZ,
 criado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 enviado_em TIMESTAMPTZ, ultimo_erro TEXT
);
CREATE INDEX IF NOT EXISTS ix_notificacao_pendente ON notificacao_saida(status,criado_em);
CREATE TABLE IF NOT EXISTS job_execucao (
 chave TEXT PRIMARY KEY, concluido_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
-- O envio e efetuado por processo externo com SMTP configurado, nunca em uma requisicao de consulta.
