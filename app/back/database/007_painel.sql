-- RF05 RF06 RF08 / RB-02 RB-06 / UC03. Aplicar depois de 001..006.
-- A tabela derivada nao substitui os registros originais.
CREATE TABLE IF NOT EXISTS painel_semana_usuario (
  usuario_id UUID NOT NULL REFERENCES usuario(id),
  semana_inicio DATE NOT NULL,
  ano_iso SMALLINT NOT NULL,
  semana_iso SMALLINT NOT NULL,
  respondeu BOOLEAN NOT NULL,
  humor SMALLINT,
  carga TEXT,
  progresso_percentual NUMERIC(6,2),
  origem_progresso TEXT CHECK (origem_progresso IN ('validado','autorrelato','misto') OR origem_progresso IS NULL),
  metas_com_progresso INTEGER NOT NULL DEFAULT 0,
  metas_validadas INTEGER NOT NULL DEFAULT 0,
  calculado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(usuario_id,semana_inicio),
  CHECK ((respondeu AND humor BETWEEN 1 AND 5 AND carga IN ('Leve','Normal','Pesada'))
      OR (NOT respondeu AND humor IS NULL AND carga IS NULL AND progresso_percentual IS NULL))
);
CREATE INDEX IF NOT EXISTS ix_painel_semana ON painel_semana_usuario(semana_inicio DESC,usuario_id);

-- Semanas sujas podem ser observadas pelo operador antes do proximo processamento.
CREATE TABLE IF NOT EXISTS painel_semana_pendente (
 usuario_id UUID NOT NULL REFERENCES usuario(id),
 semana_inicio DATE NOT NULL,
 alterado_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(usuario_id,semana_inicio)
);
CREATE OR REPLACE FUNCTION painel_marcar_pendente() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_usuario UUID; v_semana DATE;
BEGIN
 IF TG_TABLE_NAME = 'checkin_semanal' THEN
   v_usuario := COALESCE(NEW.usuario_id,OLD.usuario_id);
   v_semana := COALESCE(NEW.semana_inicio,OLD.semana_inicio);
 ELSIF TG_TABLE_NAME = 'checkin_progresso' THEN
   SELECT usuario_id,semana_inicio INTO v_usuario,v_semana FROM checkin_semanal
     WHERE id=COALESCE(NEW.checkin_id,OLD.checkin_id);
 ELSIF TG_TABLE_NAME = 'validacao_progresso' THEN
   SELECT usuario_id,semana_inicio INTO v_usuario,v_semana FROM checkin_semanal
     WHERE id=NEW.checkin_id;
 END IF;
 IF v_usuario IS NOT NULL THEN
   INSERT INTO painel_semana_pendente(usuario_id,semana_inicio) VALUES(v_usuario,v_semana)
   ON CONFLICT(usuario_id,semana_inicio) DO UPDATE SET alterado_em=clock_timestamp();
 END IF;
 RETURN COALESCE(NEW,OLD);
END $$;
DROP TRIGGER IF EXISTS trg_painel_checkin ON checkin_semanal;
CREATE TRIGGER trg_painel_checkin AFTER INSERT OR UPDATE OR DELETE ON checkin_semanal
 FOR EACH ROW EXECUTE FUNCTION painel_marcar_pendente();
DROP TRIGGER IF EXISTS trg_painel_progresso ON checkin_progresso;
CREATE TRIGGER trg_painel_progresso AFTER INSERT OR UPDATE OR DELETE ON checkin_progresso
 FOR EACH ROW EXECUTE FUNCTION painel_marcar_pendente();
DROP TRIGGER IF EXISTS trg_painel_validacao ON validacao_progresso;
CREATE TRIGGER trg_painel_validacao AFTER INSERT ON validacao_progresso
 FOR EACH ROW EXECUTE FUNCTION painel_marcar_pendente();

-- Lotacao minima para agrupar departamentos: integrar ao cadastro organizacional definitivo.
CREATE TABLE IF NOT EXISTS departamento_painel (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 nome TEXT NOT NULL UNIQUE CHECK(length(trim(nome))>0)
);
CREATE TABLE IF NOT EXISTS lotacao_painel (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 usuario_id UUID NOT NULL REFERENCES usuario(id),
 departamento_id UUID NOT NULL REFERENCES departamento_painel(id),
 inicio_em TIMESTAMPTZ NOT NULL,
 fim_em TIMESTAMPTZ,
 CHECK(fim_em IS NULL OR fim_em>inicio_em)
);
CREATE INDEX IF NOT EXISTS ix_lotacao_painel ON lotacao_painel(usuario_id,inicio_em,fim_em);
-- Nenhum alerta e gerado aqui: integracao com RF07 depende da futura tabela oficial de alertas.
