-- Lista B / RF03 UC02. Executar apos 001..004.
CREATE TABLE IF NOT EXISTS meta (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 responsavel_id UUID NOT NULL REFERENCES usuario(id),
 cadastrada_por UUID NOT NULL REFERENCES usuario(id),
 titulo TEXT NOT NULL CHECK (length(trim(titulo)) BETWEEN 1 AND 200),
 descricao TEXT,
 inicio DATE NOT NULL,
 prazo DATE NOT NULL,
 indicador TEXT NOT NULL CHECK (length(trim(indicador)) BETWEEN 1 AND 300),
 criada_em TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK (inicio <= prazo)
);
CREATE INDEX IF NOT EXISTS ix_meta_responsavel ON meta(responsavel_id,prazo DESC);
-- Excecao de diretor sem chefia imediata: RH registra gestor especificamente designado.
CREATE TABLE IF NOT EXISTS designacao_meta_diretor (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 diretor_id UUID NOT NULL REFERENCES usuario(id),
 gestor_id UUID NOT NULL REFERENCES usuario(id),
 designado_por UUID NOT NULL REFERENCES usuario(id),
 inicio_em TIMESTAMPTZ NOT NULL DEFAULT now(),
 fim_em TIMESTAMPTZ NOT NULL,
 CHECK (fim_em > inicio_em)
);
CREATE INDEX IF NOT EXISTS ix_meta_designacao_diretor ON designacao_meta_diretor(diretor_id,gestor_id,inicio_em,fim_em);
-- Preservar historico das designacoes: desativar por fim_em, nao apagar.
