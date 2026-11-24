-- Executar conectado ao banco aps_auth com usuario que tenha direito DDL.
-- gen_random_uuid() é nativo em versões modernas do PostgreSQL.
CREATE TABLE IF NOT EXISTS usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    login VARCHAR(254) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    CONSTRAINT usuario_login_normalizado CHECK (login = lower(btrim(login)) AND login <> '')
);
