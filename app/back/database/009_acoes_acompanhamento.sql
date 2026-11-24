-- RF07, RF15, HU-08.C07-C11, HU-13, UC04, UC15.
-- Aplicar depois de 008_alertas_lembretes.sql.
CREATE TABLE IF NOT EXISTS acao_acompanhamento (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 alerta_id UUID REFERENCES alerta(id) ON DELETE RESTRICT,
 colaborador_id UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
 autor_id UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
 tipo TEXT NOT NULL CHECK (tipo IN ('apoio','redistribuicao','ajuste_prazo','revisao','outro')),
 descricao TEXT NOT NULL CHECK (length(btrim(descricao)) BETWEEN 1 AND 4000),
 data_revisao DATE,
 criada_em TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 CHECK (autor_id <> colaborador_id)
);
CREATE INDEX IF NOT EXISTS ix_acao_colaborador_criada ON acao_acompanhamento(colaborador_id,criada_em DESC);
CREATE INDEX IF NOT EXISTS ix_acao_alerta ON acao_acompanhamento(alerta_id,criada_em DESC);
CREATE INDEX IF NOT EXISTS ix_acao_revisao ON acao_acompanhamento(data_revisao) WHERE data_revisao IS NOT NULL;
-- O lembrete de revisao tem chave por acao+gestor+data e nao inclui descricao ou bem-estar.
ALTER TABLE notificacao_saida DROP CONSTRAINT IF EXISTS notificacao_saida_tipo_check;
ALTER TABLE notificacao_saida ADD CONSTRAINT notificacao_saida_tipo_check CHECK(tipo IN ('lembrete','resumo_alertas','participacao','revisao_acao'));
-- Protecao em camadas: nunca usar UPDATE/DELETE nos registros de acao pela aplicacao.
