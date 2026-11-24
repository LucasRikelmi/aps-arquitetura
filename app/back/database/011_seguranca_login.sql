-- Controle transacional por chave HMAC, sem armazenamento do login em texto claro.
CREATE TABLE IF NOT EXISTS login_rate_window (
  login_key CHAR(64) PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts >= 0)
);
CREATE INDEX IF NOT EXISTS idx_login_rate_window_start ON login_rate_window(window_start);
-- Agendar limpeza fora do pico de uso (ex: diariamente):
-- DELETE FROM login_rate_window WHERE window_start < now() - INTERVAL '2 days';
