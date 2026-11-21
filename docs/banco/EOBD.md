# EOBD — Esquema Físico do Banco de Dados (schema `rh`)

Gerado a partir do catálogo do PostgreSQL 17 (`rh_db`), depois de aplicar `db/001_ddl_recorte.sql` e `db/002_seed_demo.sql`. Não é escrito à mão: para atualizar, rodar de novo o script de geração.

Tabelas: 28. Colunas: 186. Restrições: 153. Índices não primários: 20.

## Tabelas e colunas

### `acao_acompanhamento`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `cod_acao` | bigint | não | `nextval('rh.acao_acompanhamento_cod_acao_seq'::regclass)` |
| 2 | `matricula_colaborador` | text | sim |  |
| 3 | `cod_alerta` | bigint | sim |  |
| 4 | `cod_meta` | bigint | sim |  |
| 5 | `matricula_gestor` | text | sim |  |
| 6 | `matricula_rh` | text | sim |  |
| 7 | `tipo` | text | não |  |
| 8 | `descricao` | text | não |  |
| 9 | `data_registro` | timestamp with time zone | não | `now()` |
| 10 | `data_revisao` | timestamp with time zone | sim |  |

### `afastamento`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `matricula` | text | não |  |
| 2 | `data_inicio` | date | não |  |
| 3 | `tipo` | text | não |  |
| 4 | `data_fim` | date | sim |  |

### `agregado_semanal`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `cod_departamento` | text | não |  |
| 2 | `ano` | smallint | não |  |
| 3 | `semana` | smallint | não |  |
| 4 | `humor_medio` | numeric(3,2) | sim |  |
| 5 | `perc_carga_pesada` | numeric(5,2) | sim |  |
| 6 | `progresso_medio` | numeric(5,2) | sim |  |
| 7 | `respostas` | integer | não | `0` |
| 8 | `elegiveis` | integer | não | `0` |
| 9 | `participacao` | numeric(6,5) | sim |  |
| 10 | `alertas_abertos` | integer | não | `0` |
| 11 | `recalculo_pendente` | boolean | não | `false` |
| 12 | `data_calculo` | timestamp with time zone | sim |  |

### `alerta`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `cod_alerta` | bigint | não | `nextval('rh.alerta_cod_alerta_seq'::regclass)` |
| 2 | `matricula_colaborador` | text | sim |  |
| 3 | `tipo` | text | não |  |
| 4 | `cod_meta_envolvida` | bigint | sim |  |
| 5 | `janela_ref` | text | não |  |
| 6 | `descricao` | text | sim |  |
| 7 | `regra_disparada` | text | não |  |
| 8 | `valores_geradores` | jsonb | não | `'{}'::jsonb` |
| 9 | `limiar_aplicado` | jsonb | não | `'{}'::jsonb` |
| 10 | `data_geracao` | timestamp with time zone | não | `now()` |
| 11 | `data_encerramento` | timestamp with time zone | sim |  |

### `alerta_checkin`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `cod_alerta` | bigint | não |  |
| 2 | `cod_checkin` | bigint | não |  |

### `alerta_meta`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `cod_alerta` | bigint | não |  |
| 2 | `cod_meta` | bigint | não |  |

### `alteracao_parametro`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `cod_parametro` | text | não |  |
| 2 | `data_hora` | timestamp with time zone | não | `now()` |
| 3 | `matricula_rh` | text | não |  |
| 4 | `valor_anterior` | text | sim |  |
| 5 | `valor_novo` | text | não |  |

### `atribuicao_perfil`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `cod_atribuicao` | bigint | não | `nextval('rh.atribuicao_perfil_cod_atribuicao_seq'::regclass)` |
| 2 | `matricula` | text | não |  |
| 3 | `cod_perfil` | smallint | não |  |
| 4 | `matricula_autor` | text | não |  |
| 5 | `data_inicio` | date | não |  |
| 6 | `data_fim` | date | sim |  |

### `cargo`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `cod_cargo` | text | não |  |
| 2 | `nome` | text | não |  |
| 3 | `descricao` | text | sim |  |
| 4 | `id_externo` | text | sim |  |

### `checkin`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `cod_checkin` | bigint | não | `nextval('rh.checkin_cod_checkin_seq'::regclass)` |
| 2 | `matricula` | text | sim |  |
| 3 | `coorte_departamento` | text | sim |  |
| 4 | `ano` | smallint | não |  |
| 5 | `semana` | smallint | não |  |
| 6 | `humor` | smallint | não |  |
| 7 | `carga` | text | não |  |
| 8 | `comentario` | text | sim |  |
| 9 | `data_envio` | timestamp with time zone | não | `now()` |
| 10 | `data_alteracao` | timestamp with time zone | sim |  |
| 11 | `data_reabertura` | timestamp with time zone | sim |  |
| 12 | `prazo_reabertura` | timestamp with time zone | sim |  |
| 13 | `anonimizado` | boolean | não | `false` |

### `cobertura`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `matricula_afastado` | text | não |  |
| 2 | `data_inicio_afastamento` | date | não |  |
| 3 | `cod_departamento` | text | não |  |
| 4 | `data_inicio` | date | não |  |
| 5 | `data_fim` | date | sim |  |
| 6 | `matricula_substituto` | text | não |  |

### `credencial`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `matricula` | text | não |  |
| 2 | `hash_senha` | text | não |  |
| 3 | `algoritmo` | text | não | `'argon2id'::text` |
| 4 | `trocada_em` | timestamp with time zone | não | `now()` |

### `departamento`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `cod_departamento` | text | não |  |
| 2 | `sigla` | text | não |  |
| 3 | `nome` | text | não |  |
| 4 | `situacao` | text | não | `'ativo'::text` |
| 5 | `superior_cod` | text | sim |  |
| 6 | `id_externo` | text | sim |  |

### `designacao`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `cod_designacao` | bigint | não | `nextval('rh.designacao_cod_designacao_seq'::regclass)` |
| 2 | `matricula_gestor` | text | não |  |
| 3 | `matricula_beneficiario` | text | não |  |
| 4 | `matricula_rh` | text | não |  |
| 5 | `finalidade` | text | não |  |
| 6 | `data_inicio` | date | não |  |
| 7 | `data_fim` | date | sim |  |

### `destinatario_alerta`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `cod_destinatario` | bigint | não | `nextval('rh.destinatario_alerta_cod_destinatario_seq'::regclass)` |
| 2 | `cod_alerta` | bigint | não |  |
| 3 | `matricula` | text | não |  |
| 4 | `papel` | text | não |  |
| 5 | `estado` | text | não | `'aberto'::text` |
| 6 | `data_inicio` | timestamp with time zone | não | `now()` |
| 7 | `data_fim` | timestamp with time zone | sim |  |

### `execucao_agendador`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `cod_execucao` | bigint | não | `nextval('rh.execucao_agendador_cod_execucao_seq'::regclass)` |
| 2 | `tarefa` | text | não |  |
| 3 | `iniciada_em` | timestamp with time zone | não | `now()` |
| 4 | `terminada_em` | timestamp with time zone | sim |  |
| 5 | `situacao` | text | não | `'em execução'::text` |

### `gerencia`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `cod_departamento` | text | não |  |
| 2 | `data_inicio` | date | não |  |
| 3 | `data_fim` | date | sim |  |
| 4 | `matricula_gestor` | text | não |  |

### `gestor`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `matricula` | text | não |  |

### `log_acesso`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `cod_evento` | bigint | não | `nextval('rh.log_acesso_cod_evento_seq'::regclass)` |
| 2 | `data_hora` | timestamp with time zone | não | `now()` |
| 3 | `matricula_ator` | text | não |  |
| 4 | `matricula_titular` | text | sim |  |
| 5 | `perfil` | text | não |  |
| 6 | `recurso` | text | não |  |
| 7 | `acao` | text | não |  |
| 8 | `resultado` | text | não |  |

### `lotacao`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `matricula` | text | não |  |
| 2 | `data_inicio` | date | não |  |
| 3 | `data_fim` | date | sim |  |
| 4 | `cod_departamento` | text | não |  |
| 5 | `cod_cargo` | text | não |  |
| 6 | `motivo` | text | sim |  |

### `meta`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `cod_meta` | bigint | não | `nextval('rh.meta_cod_meta_seq'::regclass)` |
| 2 | `matricula_responsavel` | text | não |  |
| 3 | `matricula_cadastrante` | text | não |  |
| 4 | `titulo` | text | não |  |
| 5 | `descricao` | text | sim |  |
| 6 | `indicador` | text | não |  |
| 7 | `valor_alvo` | numeric | sim |  |
| 8 | `unidade_medida` | text | sim |  |
| 9 | `data_criacao` | timestamp with time zone | não | `now()` |
| 10 | `data_inicio` | date | não |  |
| 11 | `prazo` | date | não |  |
| 12 | `data_conclusao` | date | sim |  |
| 13 | `situacao` | text | não | `'em andamento'::text` |

### `notificacao`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `cod_notificacao` | bigint | não | `nextval('rh.notificacao_cod_notificacao_seq'::regclass)` |
| 2 | `matricula` | text | não |  |
| 3 | `tipo` | text | não |  |
| 4 | `canal` | text | não |  |
| 5 | `mensagem` | text | sim |  |
| 6 | `semana_ref` | text | sim |  |
| 7 | `horario_programado` | timestamp with time zone | sim |  |
| 8 | `cod_alerta` | bigint | sim |  |
| 9 | `cod_acao` | bigint | sim |  |
| 10 | `data_envio` | timestamp with time zone | sim |  |
| 11 | `data_leitura` | timestamp with time zone | sim |  |
| 12 | `situacao` | text | não | `'pendente'::text` |

### `parametro_sistema`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `cod_parametro` | text | não |  |
| 2 | `descricao` | text | não |  |
| 3 | `valor` | text | não |  |
| 4 | `unidade` | text | sim |  |

### `perfil`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `cod_perfil` | smallint | não |  |
| 2 | `nome` | text | não |  |

### `progresso_meta`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `cod_checkin` | bigint | não |  |
| 2 | `cod_meta` | bigint | não |  |
| 3 | `perc_informado` | numeric(5,2) | não |  |
| 4 | `perc_validado` | numeric(5,2) | sim |  |
| 5 | `aval_qualitativa` | text | sim |  |
| 6 | `comentario_gestor` | text | sim |  |
| 7 | `matricula_validador` | text | sim |  |
| 8 | `data_validacao` | timestamp with time zone | sim |  |

### `rh`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `matricula` | text | não |  |

### `sessao`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `sessao_id` | uuid | não | `gen_random_uuid()` |
| 2 | `segredo_hash` | text | não |  |
| 3 | `matricula` | text | não |  |
| 4 | `criada_em` | timestamp with time zone | não | `now()` |
| 5 | `ultima_atividade` | timestamp with time zone | não | `now()` |
| 6 | `expira_em` | timestamp with time zone | não |  |
| 7 | `revogada_em` | timestamp with time zone | sim |  |
| 8 | `motivo_revogacao` | text | sim |  |

### `usuario`

| # | Coluna | Tipo | Aceita nulo | Padrão |
|---|---|---|---|---|
| 1 | `matricula` | text | não |  |
| 2 | `nome` | text | não |  |
| 3 | `cpf` | text | não |  |
| 4 | `data_nascimento` | date | não |  |
| 5 | `email` | text | não |  |
| 6 | `telefones` | text[] | não | `'{}'::text[]` |
| 7 | `logradouro` | text | sim |  |
| 8 | `numero` | text | sim |  |
| 9 | `cidade` | text | sim |  |
| 10 | `uf` | character(2) | sim |  |
| 11 | `cep` | character(8) | sim |  |
| 12 | `data_admissao` | date | não |  |
| 13 | `data_desligamento` | date | sim |  |
| 14 | `tipo_contrato` | text | não |  |
| 15 | `id_externo` | text | sim |  |

## Restrições

| Tabela | Nome | Tipo | Definição |
|---|---|---|---|
| `rh.acao_acompanhamento` | `acao_acompanhamento_check` | verificação (CHECK) | `CHECK (((matricula_gestor IS NULL) <> (matricula_rh IS NULL)))` |
| `rh.acao_acompanhamento` | `acao_acompanhamento_check1` | verificação (CHECK) | `CHECK (((data_revisao IS NULL) OR (data_revisao >= data_registro)))` |
| `rh.acao_acompanhamento` | `acao_acompanhamento_cod_alerta_fkey` | chave estrangeira | `FOREIGN KEY (cod_alerta) REFERENCES rh.alerta(cod_alerta)` |
| `rh.acao_acompanhamento` | `acao_acompanhamento_cod_meta_fkey` | chave estrangeira | `FOREIGN KEY (cod_meta) REFERENCES rh.meta(cod_meta)` |
| `rh.acao_acompanhamento` | `acao_acompanhamento_matricula_colaborador_fkey` | chave estrangeira | `FOREIGN KEY (matricula_colaborador) REFERENCES rh.usuario(matricula)` |
| `rh.acao_acompanhamento` | `acao_acompanhamento_matricula_gestor_fkey` | chave estrangeira | `FOREIGN KEY (matricula_gestor) REFERENCES rh.gestor(matricula)` |
| `rh.acao_acompanhamento` | `acao_acompanhamento_matricula_rh_fkey` | chave estrangeira | `FOREIGN KEY (matricula_rh) REFERENCES rh.rh(matricula)` |
| `rh.acao_acompanhamento` | `acao_acompanhamento_pkey` | chave primária | `PRIMARY KEY (cod_acao)` |
| `rh.acao_acompanhamento` | `acao_acompanhamento_tipo_check` | verificação (CHECK) | `CHECK ((tipo = ANY (ARRAY['conversa individual'::text, 'orientação'::text, 'apoio ou recurso'::text, 'redistribuição de tarefas'::text, 'ajuste de prazo da meta'::text, 'revisão posterior'::text])))` |
| `rh.afastamento` | `afastamento_check` | verificação (CHECK) | `CHECK (((data_fim IS NULL) OR (data_fim >= data_inicio)))` |
| `rh.afastamento` | `afastamento_matricula_fkey` | chave estrangeira | `FOREIGN KEY (matricula) REFERENCES rh.usuario(matricula)` |
| `rh.afastamento` | `afastamento_pkey` | chave primária | `PRIMARY KEY (matricula, data_inicio)` |
| `rh.afastamento` | `afastamento_sem_sobreposicao` | exclusão (EXCLUDE) | `EXCLUDE USING gist (matricula WITH =, daterange(data_inicio, data_fim, '[]'::text) WITH &&)` |
| `rh.afastamento` | `afastamento_tipo_check` | verificação (CHECK) | `CHECK ((tipo = ANY (ARRAY['férias'::text, 'licença'::text, 'outro'::text])))` |
| `rh.agregado_semanal` | `agregado_semanal_alertas_abertos_check` | verificação (CHECK) | `CHECK ((alertas_abertos >= 0))` |
| `rh.agregado_semanal` | `agregado_semanal_ano_check` | verificação (CHECK) | `CHECK (((ano >= 2000) AND (ano <= 2100)))` |
| `rh.agregado_semanal` | `agregado_semanal_check` | verificação (CHECK) | `CHECK ((semana <= rh.semanas_iso((ano)::integer)))` |
| `rh.agregado_semanal` | `agregado_semanal_check1` | verificação (CHECK) | `CHECK ((respostas <= elegiveis))` |
| `rh.agregado_semanal` | `agregado_semanal_cod_departamento_fkey` | chave estrangeira | `FOREIGN KEY (cod_departamento) REFERENCES rh.departamento(cod_departamento)` |
| `rh.agregado_semanal` | `agregado_semanal_elegiveis_check` | verificação (CHECK) | `CHECK ((elegiveis >= 0))` |
| `rh.agregado_semanal` | `agregado_semanal_pkey` | chave primária | `PRIMARY KEY (cod_departamento, ano, semana)` |
| `rh.agregado_semanal` | `agregado_semanal_respostas_check` | verificação (CHECK) | `CHECK ((respostas >= 0))` |
| `rh.agregado_semanal` | `agregado_semanal_semana_check` | verificação (CHECK) | `CHECK (((semana >= 1) AND (semana <= 53)))` |
| `rh.alerta` | `alerta_check` | verificação (CHECK) | `CHECK (((tipo <> 'sem resposta'::text) OR (cod_meta_envolvida IS NULL)))` |
| `rh.alerta` | `alerta_check1` | verificação (CHECK) | `CHECK (((tipo <> ALL (ARRAY['meta vencida'::text, 'meta em risco'::text])) OR (cod_meta_envolvida IS NOT NULL)))` |
| `rh.alerta` | `alerta_check2` | verificação (CHECK) | `CHECK (((data_encerramento IS NULL) OR (data_encerramento >= data_geracao)))` |
| `rh.alerta` | `alerta_cod_meta_envolvida_fkey` | chave estrangeira | `FOREIGN KEY (cod_meta_envolvida) REFERENCES rh.meta(cod_meta)` |
| `rh.alerta` | `alerta_janela_ref_check` | verificação (CHECK) | `CHECK ((janela_ref ~ '^[0-9]{4}-W[0-9]{2}$'::text))` |
| `rh.alerta` | `alerta_matricula_colaborador_fkey` | chave estrangeira | `FOREIGN KEY (matricula_colaborador) REFERENCES rh.usuario(matricula)` |
| `rh.alerta` | `alerta_pkey` | chave primária | `PRIMARY KEY (cod_alerta)` |
| `rh.alerta` | `alerta_tipo_check` | verificação (CHECK) | `CHECK ((tipo = ANY (ARRAY['humor baixo com meta atrasada'::text, 'meta vencida'::text, 'meta em risco'::text, 'sem resposta'::text])))` |
| `rh.alerta_checkin` | `alerta_checkin_cod_alerta_fkey` | chave estrangeira | `FOREIGN KEY (cod_alerta) REFERENCES rh.alerta(cod_alerta)` |
| `rh.alerta_checkin` | `alerta_checkin_cod_checkin_fkey` | chave estrangeira | `FOREIGN KEY (cod_checkin) REFERENCES rh.checkin(cod_checkin)` |
| `rh.alerta_checkin` | `alerta_checkin_pkey` | chave primária | `PRIMARY KEY (cod_alerta, cod_checkin)` |
| `rh.alerta_meta` | `alerta_meta_cod_alerta_fkey` | chave estrangeira | `FOREIGN KEY (cod_alerta) REFERENCES rh.alerta(cod_alerta)` |
| `rh.alerta_meta` | `alerta_meta_cod_meta_fkey` | chave estrangeira | `FOREIGN KEY (cod_meta) REFERENCES rh.meta(cod_meta)` |
| `rh.alerta_meta` | `alerta_meta_pkey` | chave primária | `PRIMARY KEY (cod_alerta, cod_meta)` |
| `rh.alteracao_parametro` | `alteracao_parametro_cod_parametro_fkey` | chave estrangeira | `FOREIGN KEY (cod_parametro) REFERENCES rh.parametro_sistema(cod_parametro)` |
| `rh.alteracao_parametro` | `alteracao_parametro_matricula_rh_fkey` | chave estrangeira | `FOREIGN KEY (matricula_rh) REFERENCES rh.rh(matricula)` |
| `rh.alteracao_parametro` | `alteracao_parametro_pkey` | chave primária | `PRIMARY KEY (cod_parametro, data_hora)` |
| `rh.atribuicao_perfil` | `atribuicao_perfil_check` | verificação (CHECK) | `CHECK (((data_fim IS NULL) OR (data_fim >= data_inicio)))` |
| `rh.atribuicao_perfil` | `atribuicao_perfil_cod_perfil_fkey` | chave estrangeira | `FOREIGN KEY (cod_perfil) REFERENCES rh.perfil(cod_perfil)` |
| `rh.atribuicao_perfil` | `atribuicao_perfil_matricula_autor_fkey` | chave estrangeira | `FOREIGN KEY (matricula_autor) REFERENCES rh.usuario(matricula)` |
| `rh.atribuicao_perfil` | `atribuicao_perfil_matricula_fkey` | chave estrangeira | `FOREIGN KEY (matricula) REFERENCES rh.usuario(matricula)` |
| `rh.atribuicao_perfil` | `atribuicao_perfil_pkey` | chave primária | `PRIMARY KEY (cod_atribuicao)` |
| `rh.atribuicao_perfil` | `atribuicao_sem_sobreposicao` | exclusão (EXCLUDE) | `EXCLUDE USING gist (matricula WITH =, cod_perfil WITH =, daterange(data_inicio, data_fim, '[]'::text) WITH &&)` |
| `rh.cargo` | `cargo_id_externo_key` | único | `UNIQUE (id_externo)` |
| `rh.cargo` | `cargo_pkey` | chave primária | `PRIMARY KEY (cod_cargo)` |
| `rh.checkin` | `checkin_ano_check` | verificação (CHECK) | `CHECK (((ano >= 2000) AND (ano <= 2100)))` |
| `rh.checkin` | `checkin_carga_check` | verificação (CHECK) | `CHECK ((carga = ANY (ARRAY['Leve'::text, 'Normal'::text, 'Pesada'::text])))` |
| `rh.checkin` | `checkin_check` | verificação (CHECK) | `CHECK ((semana <= rh.semanas_iso((ano)::integer)))` |
| `rh.checkin` | `checkin_check1` | verificação (CHECK) | `CHECK ((anonimizado = (matricula IS NULL)))` |
| `rh.checkin` | `checkin_check2` | verificação (CHECK) | `CHECK (((prazo_reabertura IS NULL) OR (data_reabertura IS NULL) OR (prazo_reabertura >= data_reabertura)))` |
| `rh.checkin` | `checkin_coorte_departamento_fkey` | chave estrangeira | `FOREIGN KEY (coorte_departamento) REFERENCES rh.departamento(cod_departamento)` |
| `rh.checkin` | `checkin_humor_check` | verificação (CHECK) | `CHECK (((humor >= 1) AND (humor <= 5)))` |
| `rh.checkin` | `checkin_matricula_fkey` | chave estrangeira | `FOREIGN KEY (matricula) REFERENCES rh.usuario(matricula)` |
| `rh.checkin` | `checkin_pkey` | chave primária | `PRIMARY KEY (cod_checkin)` |
| `rh.checkin` | `checkin_semana_check` | verificação (CHECK) | `CHECK (((semana >= 1) AND (semana <= 53)))` |
| `rh.checkin` | `checkin_semana_unica` | único | `UNIQUE (matricula, ano, semana)` |
| `rh.cobertura` | `cobertura_check` | verificação (CHECK) | `CHECK (((data_fim IS NULL) OR (data_fim >= data_inicio)))` |
| `rh.cobertura` | `cobertura_check1` | verificação (CHECK) | `CHECK ((matricula_substituto <> matricula_afastado))` |
| `rh.cobertura` | `cobertura_cod_departamento_fkey` | chave estrangeira | `FOREIGN KEY (cod_departamento) REFERENCES rh.departamento(cod_departamento)` |
| `rh.cobertura` | `cobertura_matricula_afastado_data_inicio_afastamento_fkey` | chave estrangeira | `FOREIGN KEY (matricula_afastado, data_inicio_afastamento) REFERENCES rh.afastamento(matricula, data_inicio)` |
| `rh.cobertura` | `cobertura_matricula_afastado_fkey` | chave estrangeira | `FOREIGN KEY (matricula_afastado) REFERENCES rh.gestor(matricula)` |
| `rh.cobertura` | `cobertura_matricula_substituto_fkey` | chave estrangeira | `FOREIGN KEY (matricula_substituto) REFERENCES rh.gestor(matricula)` |
| `rh.cobertura` | `cobertura_pkey` | chave primária | `PRIMARY KEY (matricula_afastado, data_inicio_afastamento, cod_departamento, data_inicio)` |
| `rh.cobertura` | `cobertura_sem_sobreposicao` | exclusão (EXCLUDE) | `EXCLUDE USING gist (matricula_afastado WITH =, data_inicio_afastamento WITH =, cod_departamento WITH =, daterange(data_inicio, data_fim, '[]'::text) WITH &&)` |
| `rh.credencial` | `credencial_algoritmo_check` | verificação (CHECK) | `CHECK ((algoritmo = 'argon2id'::text))` |
| `rh.credencial` | `credencial_matricula_fkey` | chave estrangeira | `FOREIGN KEY (matricula) REFERENCES rh.usuario(matricula) ON DELETE RESTRICT` |
| `rh.credencial` | `credencial_pkey` | chave primária | `PRIMARY KEY (matricula)` |
| `rh.departamento` | `departamento_check` | verificação (CHECK) | `CHECK (((superior_cod IS NULL) OR (superior_cod <> cod_departamento)))` |
| `rh.departamento` | `departamento_id_externo_key` | único | `UNIQUE (id_externo)` |
| `rh.departamento` | `departamento_pkey` | chave primária | `PRIMARY KEY (cod_departamento)` |
| `rh.departamento` | `departamento_situacao_check` | verificação (CHECK) | `CHECK ((situacao = ANY (ARRAY['ativo'::text, 'inativo'::text])))` |
| `rh.departamento` | `departamento_superior_cod_fkey` | chave estrangeira | `FOREIGN KEY (superior_cod) REFERENCES rh.departamento(cod_departamento)` |
| `rh.designacao` | `designacao_check` | verificação (CHECK) | `CHECK (((data_fim IS NULL) OR (data_fim >= data_inicio)))` |
| `rh.designacao` | `designacao_check1` | verificação (CHECK) | `CHECK ((matricula_gestor <> matricula_beneficiario))` |
| `rh.designacao` | `designacao_finalidade_check` | verificação (CHECK) | `CHECK ((finalidade = ANY (ARRAY['metas'::text, 'PDI'::text])))` |
| `rh.designacao` | `designacao_matricula_beneficiario_fkey` | chave estrangeira | `FOREIGN KEY (matricula_beneficiario) REFERENCES rh.usuario(matricula)` |
| `rh.designacao` | `designacao_matricula_gestor_fkey` | chave estrangeira | `FOREIGN KEY (matricula_gestor) REFERENCES rh.gestor(matricula)` |
| `rh.designacao` | `designacao_matricula_rh_fkey` | chave estrangeira | `FOREIGN KEY (matricula_rh) REFERENCES rh.rh(matricula)` |
| `rh.designacao` | `designacao_pkey` | chave primária | `PRIMARY KEY (cod_designacao)` |
| `rh.designacao` | `designacao_sem_sobreposicao` | exclusão (EXCLUDE) | `EXCLUDE USING gist (matricula_beneficiario WITH =, finalidade WITH =, daterange(data_inicio, data_fim, '[]'::text) WITH &&)` |
| `rh.destinatario_alerta` | `destinatario_alerta_check` | verificação (CHECK) | `CHECK (((data_fim IS NULL) OR (data_fim >= data_inicio)))` |
| `rh.destinatario_alerta` | `destinatario_alerta_check1` | verificação (CHECK) | `CHECK (((papel = 'dono'::text) OR (estado = 'aberto'::text)))` |
| `rh.destinatario_alerta` | `destinatario_alerta_cod_alerta_fkey` | chave estrangeira | `FOREIGN KEY (cod_alerta) REFERENCES rh.alerta(cod_alerta)` |
| `rh.destinatario_alerta` | `destinatario_alerta_estado_check` | verificação (CHECK) | `CHECK ((estado = ANY (ARRAY['aberto'::text, 'tratado'::text])))` |
| `rh.destinatario_alerta` | `destinatario_alerta_matricula_fkey` | chave estrangeira | `FOREIGN KEY (matricula) REFERENCES rh.usuario(matricula)` |
| `rh.destinatario_alerta` | `destinatario_alerta_papel_check` | verificação (CHECK) | `CHECK ((papel = ANY (ARRAY['dono'::text, 'observador'::text])))` |
| `rh.destinatario_alerta` | `destinatario_alerta_pkey` | chave primária | `PRIMARY KEY (cod_destinatario)` |
| `rh.execucao_agendador` | `execucao_agendador_check` | verificação (CHECK) | `CHECK (((terminada_em IS NULL) OR (terminada_em >= iniciada_em)))` |
| `rh.execucao_agendador` | `execucao_agendador_pkey` | chave primária | `PRIMARY KEY (cod_execucao)` |
| `rh.execucao_agendador` | `execucao_agendador_situacao_check` | verificação (CHECK) | `CHECK ((situacao = ANY (ARRAY['em execução'::text, 'ok'::text, 'falhou'::text])))` |
| `rh.gerencia` | `gerencia_check` | verificação (CHECK) | `CHECK (((data_fim IS NULL) OR (data_fim >= data_inicio)))` |
| `rh.gerencia` | `gerencia_cod_departamento_fkey` | chave estrangeira | `FOREIGN KEY (cod_departamento) REFERENCES rh.departamento(cod_departamento)` |
| `rh.gerencia` | `gerencia_matricula_gestor_fkey` | chave estrangeira | `FOREIGN KEY (matricula_gestor) REFERENCES rh.gestor(matricula)` |
| `rh.gerencia` | `gerencia_pkey` | chave primária | `PRIMARY KEY (cod_departamento, data_inicio)` |
| `rh.gerencia` | `gerencia_sem_sobreposicao` | exclusão (EXCLUDE) | `EXCLUDE USING gist (cod_departamento WITH =, daterange(data_inicio, data_fim, '[]'::text) WITH &&)` |
| `rh.gestor` | `gestor_matricula_fkey` | chave estrangeira | `FOREIGN KEY (matricula) REFERENCES rh.usuario(matricula)` |
| `rh.gestor` | `gestor_pkey` | chave primária | `PRIMARY KEY (matricula)` |
| `rh.log_acesso` | `log_acesso_acao_check` | verificação (CHECK) | `CHECK ((acao = ANY (ARRAY['consulta'::text, 'exportação'::text, 'alteração de perfil'::text, 'reabertura'::text])))` |
| `rh.log_acesso` | `log_acesso_matricula_ator_fkey` | chave estrangeira | `FOREIGN KEY (matricula_ator) REFERENCES rh.usuario(matricula)` |
| `rh.log_acesso` | `log_acesso_matricula_titular_fkey` | chave estrangeira | `FOREIGN KEY (matricula_titular) REFERENCES rh.usuario(matricula)` |
| `rh.log_acesso` | `log_acesso_pkey` | chave primária | `PRIMARY KEY (cod_evento)` |
| `rh.log_acesso` | `log_acesso_resultado_check` | verificação (CHECK) | `CHECK ((resultado = ANY (ARRAY['permitido'::text, 'negado'::text])))` |
| `rh.lotacao` | `lotacao_check` | verificação (CHECK) | `CHECK (((data_fim IS NULL) OR (data_fim >= data_inicio)))` |
| `rh.lotacao` | `lotacao_cod_cargo_fkey` | chave estrangeira | `FOREIGN KEY (cod_cargo) REFERENCES rh.cargo(cod_cargo)` |
| `rh.lotacao` | `lotacao_cod_departamento_fkey` | chave estrangeira | `FOREIGN KEY (cod_departamento) REFERENCES rh.departamento(cod_departamento)` |
| `rh.lotacao` | `lotacao_matricula_fkey` | chave estrangeira | `FOREIGN KEY (matricula) REFERENCES rh.usuario(matricula)` |
| `rh.lotacao` | `lotacao_motivo_check` | verificação (CHECK) | `CHECK ((motivo = ANY (ARRAY['admissão'::text, 'transferência'::text, 'promoção'::text, 'sincronização ERP'::text])))` |
| `rh.lotacao` | `lotacao_pkey` | chave primária | `PRIMARY KEY (matricula, data_inicio)` |
| `rh.lotacao` | `lotacao_sem_sobreposicao` | exclusão (EXCLUDE) | `EXCLUDE USING gist (matricula WITH =, daterange(data_inicio, data_fim, '[]'::text) WITH &&)` |
| `rh.meta` | `meta_check` | verificação (CHECK) | `CHECK ((data_inicio <= prazo))` |
| `rh.meta` | `meta_check1` | verificação (CHECK) | `CHECK (((data_conclusao IS NULL) OR (data_conclusao >= (data_criacao)::date)))` |
| `rh.meta` | `meta_matricula_cadastrante_fkey` | chave estrangeira | `FOREIGN KEY (matricula_cadastrante) REFERENCES rh.gestor(matricula)` |
| `rh.meta` | `meta_matricula_responsavel_fkey` | chave estrangeira | `FOREIGN KEY (matricula_responsavel) REFERENCES rh.usuario(matricula)` |
| `rh.meta` | `meta_pkey` | chave primária | `PRIMARY KEY (cod_meta)` |
| `rh.meta` | `meta_situacao_check` | verificação (CHECK) | `CHECK ((situacao = ANY (ARRAY['em andamento'::text, 'concluída'::text, 'cancelada'::text])))` |
| `rh.notificacao` | `notificacao_canal_check` | verificação (CHECK) | `CHECK ((canal = ANY (ARRAY['sistema'::text, 'e-mail'::text])))` |
| `rh.notificacao` | `notificacao_check` | verificação (CHECK) | `CHECK (((tipo <> 'lembrete de check-in'::text) OR ((semana_ref IS NOT NULL) AND (horario_programado IS NOT NULL))))` |
| `rh.notificacao` | `notificacao_check1` | verificação (CHECK) | `CHECK (((data_leitura IS NULL) OR (data_envio IS NOT NULL)))` |
| `rh.notificacao` | `notificacao_cod_acao_fkey` | chave estrangeira | `FOREIGN KEY (cod_acao) REFERENCES rh.acao_acompanhamento(cod_acao)` |
| `rh.notificacao` | `notificacao_cod_alerta_fkey` | chave estrangeira | `FOREIGN KEY (cod_alerta) REFERENCES rh.alerta(cod_alerta)` |
| `rh.notificacao` | `notificacao_matricula_fkey` | chave estrangeira | `FOREIGN KEY (matricula) REFERENCES rh.usuario(matricula)` |
| `rh.notificacao` | `notificacao_pkey` | chave primária | `PRIMARY KEY (cod_notificacao)` |
| `rh.notificacao` | `notificacao_semana_ref_check` | verificação (CHECK) | `CHECK (((semana_ref IS NULL) OR (semana_ref ~ '^[0-9]{4}-W[0-9]{2}$'::text)))` |
| `rh.notificacao` | `notificacao_situacao_check` | verificação (CHECK) | `CHECK ((situacao = ANY (ARRAY['pendente'::text, 'enviada'::text, 'falhou'::text])))` |
| `rh.notificacao` | `notificacao_tipo_check` | verificação (CHECK) | `CHECK ((tipo = ANY (ARRAY['lembrete de check-in'::text, 'alerta'::text, 'resumo diário'::text, 'lembrete de revisão'::text, 'aviso operacional'::text])))` |
| `rh.parametro_sistema` | `parametro_sistema_pkey` | chave primária | `PRIMARY KEY (cod_parametro)` |
| `rh.perfil` | `perfil_nome_check` | verificação (CHECK) | `CHECK ((nome = ANY (ARRAY['Colaborador'::text, 'Gestor'::text, 'RH'::text, 'Diretoria'::text, 'Administração'::text])))` |
| `rh.perfil` | `perfil_nome_key` | único | `UNIQUE (nome)` |
| `rh.perfil` | `perfil_pkey` | chave primária | `PRIMARY KEY (cod_perfil)` |
| `rh.progresso_meta` | `progresso_meta_check` | verificação (CHECK) | `CHECK (((perc_validado IS NULL) = (matricula_validador IS NULL)))` |
| `rh.progresso_meta` | `progresso_meta_check1` | verificação (CHECK) | `CHECK (((data_validacao IS NULL) = (matricula_validador IS NULL)))` |
| `rh.progresso_meta` | `progresso_meta_cod_checkin_fkey` | chave estrangeira | `FOREIGN KEY (cod_checkin) REFERENCES rh.checkin(cod_checkin)` |
| `rh.progresso_meta` | `progresso_meta_cod_meta_fkey` | chave estrangeira | `FOREIGN KEY (cod_meta) REFERENCES rh.meta(cod_meta)` |
| `rh.progresso_meta` | `progresso_meta_matricula_validador_fkey` | chave estrangeira | `FOREIGN KEY (matricula_validador) REFERENCES rh.gestor(matricula)` |
| `rh.progresso_meta` | `progresso_meta_perc_informado_check` | verificação (CHECK) | `CHECK (((perc_informado >= (0)::numeric) AND (perc_informado <= (100)::numeric)))` |
| `rh.progresso_meta` | `progresso_meta_perc_validado_check` | verificação (CHECK) | `CHECK (((perc_validado >= (0)::numeric) AND (perc_validado <= (100)::numeric)))` |
| `rh.progresso_meta` | `progresso_meta_pkey` | chave primária | `PRIMARY KEY (cod_checkin, cod_meta)` |
| `rh.rh` | `rh_matricula_fkey` | chave estrangeira | `FOREIGN KEY (matricula) REFERENCES rh.usuario(matricula)` |
| `rh.rh` | `rh_pkey` | chave primária | `PRIMARY KEY (matricula)` |
| `rh.sessao` | `sessao_check` | verificação (CHECK) | `CHECK ((expira_em > criada_em))` |
| `rh.sessao` | `sessao_check1` | verificação (CHECK) | `CHECK (((revogada_em IS NULL) = (motivo_revogacao IS NULL)))` |
| `rh.sessao` | `sessao_matricula_fkey` | chave estrangeira | `FOREIGN KEY (matricula) REFERENCES rh.usuario(matricula)` |
| `rh.sessao` | `sessao_motivo_revogacao_check` | verificação (CHECK) | `CHECK ((motivo_revogacao = ANY (ARRAY['logout'::text, 'mudança de perfil'::text, 'desligamento'::text])))` |
| `rh.sessao` | `sessao_pkey` | chave primária | `PRIMARY KEY (sessao_id)` |
| `rh.sessao` | `sessao_segredo_hash_check` | verificação (CHECK) | `CHECK ((segredo_hash ~~ '$argon2id$%'::text))` |
| `rh.usuario` | `usuario_cep_check` | verificação (CHECK) | `CHECK (((cep IS NULL) OR (cep ~ '^[0-9]{8}$'::text)))` |
| `rh.usuario` | `usuario_check` | verificação (CHECK) | `CHECK (((data_desligamento IS NULL) OR (data_desligamento >= data_admissao)))` |
| `rh.usuario` | `usuario_cpf_check` | verificação (CHECK) | `CHECK ((cpf ~ '^[0-9]{11}$'::text))` |
| `rh.usuario` | `usuario_pkey` | chave primária | `PRIMARY KEY (matricula)` |
| `rh.usuario` | `usuario_tipo_contrato_check` | verificação (CHECK) | `CHECK ((tipo_contrato = ANY (ARRAY['CLT'::text, 'estágio'::text, 'PJ'::text, 'temporário'::text])))` |

## Índices (não primários)

| Tabela | Índice | Definição |
|---|---|---|
| `rh.afastamento` | `rh.afastamento_sem_sobreposicao` | `CREATE INDEX afastamento_sem_sobreposicao ON rh.afastamento USING gist (matricula, daterange(data_inicio, data_fim, '[]'::text))` |
| `rh.alerta` | `rh.alerta_chave` | `CREATE UNIQUE INDEX alerta_chave ON rh.alerta USING btree (matricula_colaborador, tipo, janela_ref, COALESCE(cod_meta_envolvida, (0)::bigint))` |
| `rh.atribuicao_perfil` | `rh.atribuicao_sem_sobreposicao` | `CREATE INDEX atribuicao_sem_sobreposicao ON rh.atribuicao_perfil USING gist (matricula, cod_perfil, daterange(data_inicio, data_fim, '[]'::text))` |
| `rh.cargo` | `rh.cargo_id_externo_key` | `CREATE UNIQUE INDEX cargo_id_externo_key ON rh.cargo USING btree (id_externo)` |
| `rh.checkin` | `rh.checkin_semana_unica` | `CREATE UNIQUE INDEX checkin_semana_unica ON rh.checkin USING btree (matricula, ano, semana)` |
| `rh.cobertura` | `rh.cobertura_sem_sobreposicao` | `CREATE INDEX cobertura_sem_sobreposicao ON rh.cobertura USING gist (matricula_afastado, data_inicio_afastamento, cod_departamento, daterange(data_inicio, data_fim, '[]'::text))` |
| `rh.departamento` | `rh.departamento_id_externo_key` | `CREATE UNIQUE INDEX departamento_id_externo_key ON rh.departamento USING btree (id_externo)` |
| `rh.designacao` | `rh.designacao_sem_sobreposicao` | `CREATE INDEX designacao_sem_sobreposicao ON rh.designacao USING gist (matricula_beneficiario, finalidade, daterange(data_inicio, data_fim, '[]'::text))` |
| `rh.destinatario_alerta` | `rh.destinatario_dono_vigente` | `CREATE UNIQUE INDEX destinatario_dono_vigente ON rh.destinatario_alerta USING btree (cod_alerta) WHERE ((papel = 'dono'::text) AND (data_fim IS NULL))` |
| `rh.destinatario_alerta` | `rh.destinatario_vigente_unico` | `CREATE UNIQUE INDEX destinatario_vigente_unico ON rh.destinatario_alerta USING btree (cod_alerta, matricula) WHERE (data_fim IS NULL)` |
| `rh.gerencia` | `rh.gerencia_sem_sobreposicao` | `CREATE INDEX gerencia_sem_sobreposicao ON rh.gerencia USING gist (cod_departamento, daterange(data_inicio, data_fim, '[]'::text))` |
| `rh.gerencia` | `rh.gerencia_um_vigente` | `CREATE UNIQUE INDEX gerencia_um_vigente ON rh.gerencia USING btree (cod_departamento) WHERE (data_fim IS NULL)` |
| `rh.lotacao` | `rh.lotacao_sem_sobreposicao` | `CREATE INDEX lotacao_sem_sobreposicao ON rh.lotacao USING gist (matricula, daterange(data_inicio, data_fim, '[]'::text))` |
| `rh.lotacao` | `rh.lotacao_uma_vigente` | `CREATE UNIQUE INDEX lotacao_uma_vigente ON rh.lotacao USING btree (matricula) WHERE (data_fim IS NULL)` |
| `rh.notificacao` | `rh.notificacao_lembrete_unico` | `CREATE UNIQUE INDEX notificacao_lembrete_unico ON rh.notificacao USING btree (matricula, semana_ref, horario_programado) WHERE (tipo = 'lembrete de check-in'::text)` |
| `rh.perfil` | `rh.perfil_nome_key` | `CREATE UNIQUE INDEX perfil_nome_key ON rh.perfil USING btree (nome)` |
| `rh.sessao` | `rh.sessao_ativa_por_usuario` | `CREATE INDEX sessao_ativa_por_usuario ON rh.sessao USING btree (matricula) WHERE (revogada_em IS NULL)` |
| `rh.usuario` | `rh.usuario_cpf_ativo` | `CREATE UNIQUE INDEX usuario_cpf_ativo ON rh.usuario USING btree (cpf) WHERE (data_desligamento IS NULL)` |
| `rh.usuario` | `rh.usuario_email_ativo` | `CREATE UNIQUE INDEX usuario_email_ativo ON rh.usuario USING btree (lower(email)) WHERE (data_desligamento IS NULL)` |
| `rh.usuario` | `rh.usuario_externo_ativo` | `CREATE UNIQUE INDEX usuario_externo_ativo ON rh.usuario USING btree (id_externo) WHERE ((data_desligamento IS NULL) AND (id_externo IS NOT NULL))` |
