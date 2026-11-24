-- Lista B: estruturas MINIMAS de integracao com ERS RF09. Executar depois de 001/002.
-- Na integracao com modelo ER final, mapear lotacoes, dados e designacoes existentes.
CREATE TABLE IF NOT EXISTS vinculo_gestor (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 gestor_id UUID NOT NULL REFERENCES usuario(id),
 colaborador_id UUID NOT NULL REFERENCES usuario(id),
 inicio_em TIMESTAMPTZ NOT NULL DEFAULT now(),
 fim_em TIMESTAMPTZ,
 CHECK (gestor_id <> colaborador_id), CHECK (fim_em IS NULL OR fim_em > inicio_em)
);
CREATE INDEX IF NOT EXISTS ix_vinculo_gestor_escopo ON vinculo_gestor(gestor_id, colaborador_id, inicio_em, fim_em);
-- Designacao expressa e temporal: acesso estritamente ao recurso designado, nunca ao usuario inteiro.
CREATE TABLE IF NOT EXISTS designacao_recurso (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 gestor_id UUID NOT NULL REFERENCES usuario(id),
 beneficiario_id UUID NOT NULL REFERENCES usuario(id),
 recurso_tipo TEXT NOT NULL CHECK(recurso_tipo IN ('meta','pdi')),
 recurso_id UUID NOT NULL,
 finalidade TEXT NOT NULL CHECK(length(trim(finalidade))>0),
 autor_id UUID NOT NULL REFERENCES usuario(id),
 inicio_em TIMESTAMPTZ NOT NULL DEFAULT now(),
 fim_em TIMESTAMPTZ NOT NULL,
 CHECK(fim_em>inicio_em)
);
CREATE INDEX IF NOT EXISTS ix_designacao_vigente ON designacao_recurso(gestor_id, beneficiario_id, recurso_tipo, recurso_id, inicio_em, fim_em);
-- Modelo reduzido de check-in exclusivamente para teste da politica de acesso.
CREATE TABLE IF NOT EXISTS checkin_exemplo (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 usuario_id UUID NOT NULL REFERENCES usuario(id),
 semana DATE NOT NULL,
 humor SMALLINT NOT NULL CHECK(humor BETWEEN 1 AND 5),
 carga TEXT NOT NULL CHECK(carga IN ('Leve','Normal','Pesada')),
 progresso SMALLINT NOT NULL CHECK(progresso BETWEEN 0 AND 100),
 UNIQUE(usuario_id,semana)
);
CREATE INDEX IF NOT EXISTS ix_checkin_exemplo_usuario ON checkin_exemplo(usuario_id, semana DESC);
-- Registro de acesso SEM senha, hash, cookie, CPF ou dados de bem-estar.
CREATE TABLE IF NOT EXISTS log_acesso (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 ocorrido_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 ator_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
 perfis TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
 recurso TEXT NOT NULL,
 acao TEXT NOT NULL CHECK(acao IN ('consulta','exportacao','negativa','consulta_log')),
 resultado TEXT NOT NULL CHECK(resultado IN ('permitido','negado','erro')),
 alvo_id UUID,
 correlacao_id UUID NOT NULL,
 CHECK(length(recurso) BETWEEN 1 AND 80)
);
CREATE INDEX IF NOT EXISTS ix_log_acesso_data ON log_acesso(ocorrido_em DESC,id DESC);
-- Nunca oferecer rota UPDATE ou DELETE de log. Conta SQL da aplicacao deve receber apenas SELECT/INSERT.
-- Para proteger tambem contra conexao SQL direta, usar papel sem UPDATE/DELETE/TRUNCATE,
-- permissao restrita de manutencao de retencao e trilha externa de auditoria.
-- Recursos individuais demonstrativos para designação expressa de metas/PDI.
CREATE TABLE IF NOT EXISTS recurso_designavel_exemplo (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 usuario_id UUID NOT NULL REFERENCES usuario(id),
 tipo TEXT NOT NULL CHECK(tipo IN ('meta','pdi')),
 titulo TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_recurso_designavel_exemplo ON recurso_designavel_exemplo(usuario_id,tipo);
