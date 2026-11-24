-- RF02 / HU-03 / UC07. Executar depois de 001-009.
-- Credenciais permanecem em usuario; dados pessoais em cadastro_pessoa.
CREATE TABLE IF NOT EXISTS departamento (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nome TEXT NOT NULL UNIQUE CHECK(length(btrim(nome)) BETWEEN 2 AND 150),
 superior_id UUID REFERENCES departamento(id), ativo BOOLEAN NOT NULL DEFAULT TRUE,
 CHECK(superior_id IS NULL OR id <> superior_id)
);
CREATE TABLE IF NOT EXISTS cargo (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nome TEXT NOT NULL UNIQUE CHECK(length(btrim(nome)) BETWEEN 2 AND 150), ativo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS cadastro_pessoa (
 usuario_id UUID PRIMARY KEY REFERENCES usuario(id), nome TEXT NOT NULL CHECK(length(btrim(nome)) BETWEEN 2 AND 180),
 cpf TEXT, nascimento DATE, endereco TEXT, telefone TEXT,
 origem_folha BOOLEAN NOT NULL DEFAULT FALSE, criado_em TIMESTAMPTZ NOT NULL DEFAULT now(), atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Lotação por período: histórico preservado. Um vínculo aberto por usuário.
CREATE TABLE IF NOT EXISTS lotacao (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), usuario_id UUID NOT NULL REFERENCES usuario(id),
 departamento_id UUID NOT NULL REFERENCES departamento(id), cargo_id UUID NOT NULL REFERENCES cargo(id),
 gestor_id UUID REFERENCES usuario(id), inicio DATE NOT NULL, fim DATE,
 CHECK(fim IS NULL OR fim >= inicio), CHECK(gestor_id IS NULL OR gestor_id <> usuario_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lotacao_aberta ON lotacao(usuario_id) WHERE fim IS NULL;
CREATE INDEX IF NOT EXISTS ix_lotacao_gestor ON lotacao(gestor_id,inicio,fim);
CREATE TABLE IF NOT EXISTS afastamento (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), usuario_id UUID NOT NULL REFERENCES usuario(id),
 tipo TEXT NOT NULL CHECK(tipo IN ('afastamento','ferias')), inicio DATE NOT NULL, fim DATE NOT NULL,
 registrado_por UUID NOT NULL REFERENCES usuario(id), registrado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(fim >= inicio)
);
CREATE INDEX IF NOT EXISTS ix_afastamento_usuario ON afastamento(usuario_id,inicio,fim);
CREATE TABLE IF NOT EXISTS substituicao_gestor (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), gestor_id UUID NOT NULL REFERENCES usuario(id),
 substituto_id UUID NOT NULL REFERENCES usuario(id), inicio DATE NOT NULL, fim DATE NOT NULL,
 registrado_por UUID NOT NULL REFERENCES usuario(id), registrado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(gestor_id <> substituto_id), CHECK(fim >= inicio)
);
CREATE INDEX IF NOT EXISTS ix_substituicao_periodo ON substituicao_gestor(gestor_id,inicio,fim);
CREATE TABLE IF NOT EXISTS evento_organizacional (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, ocorrido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
 autor_id UUID REFERENCES usuario(id), alvo_id UUID REFERENCES usuario(id),
 operacao TEXT NOT NULL, detalhe JSONB NOT NULL DEFAULT '{}'::jsonb
);
-- Dados pessoais exigem privilégios mínimos no papel do banco utilizado pela aplicação.
