BEGIN;
CREATE TABLE IF NOT EXISTS alerta_tratamento (
 alerta_id UUID PRIMARY KEY REFERENCES alerta(id),
 autor_id UUID NOT NULL REFERENCES usuario(id),
 tipo TEXT NOT NULL,
 revisao TEXT,
 descricao TEXT NOT NULL CHECK(length(btrim(descricao)) BETWEEN 1 AND 4000),
 criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMIT;
