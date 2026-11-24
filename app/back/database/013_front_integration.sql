-- M3 - Persistencia de formulario e parametros; aplicar apos 010.
BEGIN;
CREATE TABLE IF NOT EXISTS pergunta_checkin (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 texto VARCHAR(500) NOT NULL CHECK (length(btrim(texto)) >= 1),
 tipo VARCHAR(30) NOT NULL CHECK(tipo IN ('Texto','Opção')),
 resposta VARCHAR(30) NOT NULL CHECK(resposta IN ('opcional','obrigatória')),
 ativa BOOLEAN NOT NULL DEFAULT TRUE,
 respostas INTEGER NOT NULL DEFAULT 0 CHECK(respostas>=0),
 substitui_id BIGINT REFERENCES pergunta_checkin(id),
 criada_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS parametros_checkin (
 id SMALLINT PRIMARY KEY DEFAULT 1 CHECK(id=1),
 dados JSONB NOT NULL CHECK(jsonb_typeof(dados)='object'),
 atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO parametros_checkin(id,dados) VALUES(1, '{
  "textoVisibilidade":"Seu gestor direto e o RH veem suas respostas individuais. A Diretoria vê apenas médias por departamento, sem identificar ninguém.",
  "abre":"Segunda, 08:00", "fecha":"Sexta, 18:00", "fuso":"America/Sao_Paulo",
  "humorAte":2, "semanasSemResposta":3, "cargaPesadaSemanas":3,
  "metaRiscoProgresso":50, "retencaoLog":"6 meses",
  "retencaoCheckins":"24 meses (anonimização); desligado: 90 dias"
}'::jsonb) ON CONFLICT(id) DO NOTHING;
COMMIT;
