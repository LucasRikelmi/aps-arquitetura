BEGIN;
ALTER TABLE cadastro_pessoa ADD COLUMN IF NOT EXISTS matricula VARCHAR(40);
ALTER TABLE cadastro_pessoa ADD COLUMN IF NOT EXISTS admissao DATE;
ALTER TABLE cadastro_pessoa ADD COLUMN IF NOT EXISTS contrato VARCHAR(30);
CREATE UNIQUE INDEX IF NOT EXISTS ux_cadastro_pessoa_matricula ON cadastro_pessoa(matricula) WHERE matricula IS NOT NULL;
COMMIT;
