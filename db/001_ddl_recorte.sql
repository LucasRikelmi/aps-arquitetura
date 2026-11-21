-- =====================================================================
-- 001_ddl_recorte.sql
-- RH Soluções · Marco 05 · M1, item 1.1 (K4, DA10)
-- Recorte: acesso, check-in, metas, painel com alertas e cadastro.
-- Alvo: PostgreSQL 17, base vazia, executado por superusuário.
--   psql -v ON_ERROR_STOP=1 -U postgres -d <base> -f 001_ddl_recorte.sql
--
-- Convenções
--   * Nomes do modelo (Modelo ER, versão final 10/11/2026) sem acento, em snake_case.
--   * Restrições de domínio, unicidade e temporais estão aqui (CHECK, UNIQUE,
--     EXCLUDE). Restrições semânticas e de acesso estão marcadas como
--     "APLICAÇÃO" e precisam de gatilho ou de código, não de DDL.
--   * Fora deste arquivo, por estarem fora do recorte (Should/Could): PDI,
--     pesquisa de clima, pergunta complementar, pendência de conciliação,
--     compartilhamento de ação (RF16) e canais Slack/Teams (RF19).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE SCHEMA IF NOT EXISTS rh;
SET search_path TO rh, public;

-- ---------------------------------------------------------------------
-- Funções auxiliares
-- ---------------------------------------------------------------------

-- Número de semanas ISO do ano (52 ou 53). Usada na RI06.
CREATE OR REPLACE FUNCTION semanas_iso(p_ano int) RETURNS int
LANGUAGE sql IMMUTABLE AS $$
  SELECT extract(week FROM make_date(p_ano, 12, 28))::int
$$;

-- ---------------------------------------------------------------------
-- Perfis de acesso (RF09, RI05)
-- ---------------------------------------------------------------------
CREATE TABLE perfil (
  cod_perfil smallint PRIMARY KEY,
  nome       text NOT NULL UNIQUE
             CHECK (nome IN ('Colaborador', 'Gestor', 'RH', 'Diretoria', 'Administração'))
);

INSERT INTO perfil (cod_perfil, nome) VALUES
  (1, 'Colaborador'), (2, 'Gestor'), (3, 'RH'), (4, 'Diretoria'), (5, 'Administração');

-- ---------------------------------------------------------------------
-- Cadastro organizacional (RF02, RF20)
-- ---------------------------------------------------------------------
CREATE TABLE cargo (
  cod_cargo    text PRIMARY KEY,
  nome         text NOT NULL,
  descricao    text,
  id_externo   text UNIQUE
);

CREATE TABLE departamento (
  cod_departamento text PRIMARY KEY,
  sigla            text NOT NULL,
  nome             text NOT NULL,
  situacao         text NOT NULL DEFAULT 'ativo' CHECK (situacao IN ('ativo', 'inativo')),
  -- subordina: 0..1 superior, 0..N subordinados (RI16 garantida pelo gatilho abaixo)
  superior_cod     text REFERENCES departamento (cod_departamento),
  id_externo       text UNIQUE,
  CHECK (superior_cod IS NULL OR superior_cod <> cod_departamento)
);

CREATE OR REPLACE FUNCTION trg_departamento_aciclico() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.superior_cod IS NOT NULL AND EXISTS (
    WITH RECURSIVE ancestrais(cod) AS (
      SELECT NEW.superior_cod
      UNION
      SELECT d.superior_cod
        FROM departamento d
        JOIN ancestrais a ON d.cod_departamento = a.cod
       WHERE d.superior_cod IS NOT NULL
    )
    SELECT 1 FROM ancestrais WHERE cod = NEW.cod_departamento
  ) THEN
    RAISE EXCEPTION 'RI16: hierarquia de departamentos não pode ter ciclo (%)', NEW.cod_departamento;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER departamento_aciclico
  BEFORE INSERT OR UPDATE OF superior_cod ON departamento
  FOR EACH ROW EXECUTE FUNCTION trg_departamento_aciclico();

-- Usuário: superclasse de GESTOR e RH (RF02, RF09, RF20). Atributo multivalorado
-- {telefone} em array, endereço composto em colunas.
CREATE TABLE usuario (
  matricula        text PRIMARY KEY,
  nome             text NOT NULL,
  cpf              text NOT NULL CHECK (cpf ~ '^[0-9]{11}$'),       -- ver questão em aberto: cifragem
  data_nascimento  date NOT NULL,
  email            text NOT NULL,
  telefones        text[] NOT NULL DEFAULT '{}',
  logradouro       text,
  numero           text,
  cidade           text,
  uf               char(2),
  cep              char(8) CHECK (cep IS NULL OR cep ~ '^[0-9]{8}$'),
  data_admissao    date NOT NULL,
  data_desligamento date,
  tipo_contrato    text NOT NULL CHECK (tipo_contrato IN ('CLT', 'estágio', 'PJ', 'temporário')),
  id_externo       text,
  CHECK (data_desligamento IS NULL OR data_desligamento >= data_admissao)
);

-- RI07: unicidade entre usuários ativos (recontratação repete id_externo).
CREATE UNIQUE INDEX usuario_cpf_ativo     ON usuario (cpf)            WHERE data_desligamento IS NULL;
CREATE UNIQUE INDEX usuario_email_ativo   ON usuario (lower(email))   WHERE data_desligamento IS NULL;
CREATE UNIQUE INDEX usuario_externo_ativo ON usuario (id_externo)     WHERE data_desligamento IS NULL AND id_externo IS NOT NULL;

-- CREDENCIAL 1:1 com USUÁRIO (K4, DA10). A chave primária da credencial é a
-- própria matrícula do usuário: no máximo uma credencial por usuário e no
-- máximo um usuário por credencial. O hash fica aqui e não em USUÁRIO, para
-- que o cadastro lido por Gestor e Administração não o contenha.
CREATE TABLE credencial (
  matricula   text PRIMARY KEY REFERENCES usuario (matricula) ON DELETE RESTRICT,
  hash_senha  text NOT NULL,                               -- PHC string do Argon2id
  algoritmo   text NOT NULL DEFAULT 'argon2id' CHECK (algoritmo = 'argon2id'),
  trocada_em  timestamptz NOT NULL DEFAULT now()
);

-- Subclasses de USUÁRIO, especialização parcial e sobreposta (RI08).
CREATE TABLE gestor (
  matricula text PRIMARY KEY REFERENCES usuario (matricula)
);

CREATE TABLE rh (
  matricula text PRIMARY KEY REFERENCES usuario (matricula)
);

-- LOTAÇÃO: entidade fraca de USUÁRIO, identificada por matrícula + data_início.
-- Uma vigente por usuário (RI21), períodos sem sobreposição.
CREATE TABLE lotacao (
  matricula        text NOT NULL REFERENCES usuario (matricula),
  data_inicio      date NOT NULL,
  data_fim         date,
  cod_departamento text NOT NULL REFERENCES departamento (cod_departamento),
  cod_cargo        text NOT NULL REFERENCES cargo (cod_cargo),
  motivo           text CHECK (motivo IN ('admissão', 'transferência', 'promoção', 'sincronização ERP')),
  PRIMARY KEY (matricula, data_inicio),
  CHECK (data_fim IS NULL OR data_fim >= data_inicio),
  CONSTRAINT lotacao_sem_sobreposicao
    EXCLUDE USING gist (matricula WITH =, daterange(data_inicio, data_fim, '[]') WITH &&)
);
CREATE UNIQUE INDEX lotacao_uma_vigente ON lotacao (matricula) WHERE data_fim IS NULL;

-- AFASTAMENTO: entidade fraca de USUÁRIO, identificada por matrícula + data_início (RI27).
CREATE TABLE afastamento (
  matricula   text NOT NULL REFERENCES usuario (matricula),
  data_inicio date NOT NULL,
  tipo        text NOT NULL CHECK (tipo IN ('férias', 'licença', 'outro')),
  data_fim    date,
  PRIMARY KEY (matricula, data_inicio),
  CHECK (data_fim IS NULL OR data_fim >= data_inicio),
  CONSTRAINT afastamento_sem_sobreposicao
    EXCLUDE USING gist (matricula WITH =, daterange(data_inicio, data_fim, '[]') WITH &&)
);

-- gerencia: GESTOR gerencia DEPARTAMENTO com {período}. No máximo um gestor
-- vigente por departamento (RI21), por isso o período é do departamento.
CREATE TABLE gerencia (
  cod_departamento text NOT NULL REFERENCES departamento (cod_departamento),
  data_inicio      date NOT NULL,
  data_fim         date,
  matricula_gestor text NOT NULL REFERENCES gestor (matricula),
  PRIMARY KEY (cod_departamento, data_inicio),
  CHECK (data_fim IS NULL OR data_fim >= data_inicio),
  CONSTRAINT gerencia_sem_sobreposicao
    EXCLUDE USING gist (cod_departamento WITH =, daterange(data_inicio, data_fim, '[]') WITH &&)
);
CREATE UNIQUE INDEX gerencia_um_vigente ON gerencia (cod_departamento) WHERE data_fim IS NULL;

-- cobre (ternário): AFASTAMENTO × GESTOR substituto × DEPARTAMENTO, com {período} (RI18, RI29).
CREATE TABLE cobertura (
  matricula_afastado        text NOT NULL,
  data_inicio_afastamento   date NOT NULL,
  cod_departamento          text NOT NULL REFERENCES departamento (cod_departamento),
  data_inicio               date NOT NULL,
  data_fim                  date,
  matricula_substituto      text NOT NULL REFERENCES gestor (matricula),
  PRIMARY KEY (matricula_afastado, data_inicio_afastamento, cod_departamento, data_inicio),
  FOREIGN KEY (matricula_afastado, data_inicio_afastamento)
    REFERENCES afastamento (matricula, data_inicio),
  FOREIGN KEY (matricula_afastado) REFERENCES gestor (matricula),
  CHECK (data_fim IS NULL OR data_fim >= data_inicio),
  CHECK (matricula_substituto <> matricula_afastado),
  CONSTRAINT cobertura_sem_sobreposicao
    EXCLUDE USING gist (
      matricula_afastado WITH =,
      data_inicio_afastamento WITH =,
      cod_departamento WITH =,
      daterange(data_inicio, data_fim, '[]') WITH &&
    )
);
-- APLICAÇÃO (gatilho): cada {período} de cobertura contido no afastamento e na
-- gerência vigente do afastado naquele departamento (RI29).
-- APLICAÇÃO: substituto é GESTOR com perfil vigente e sem afastamento sobreposto (RI18).

-- ---------------------------------------------------------------------
-- Perfis e designações
-- ---------------------------------------------------------------------
-- ATRIBUIÇÃO_PERFIL: concessão datada, com autor (RI43).
CREATE TABLE atribuicao_perfil (
  cod_atribuicao    bigserial PRIMARY KEY,
  matricula         text NOT NULL REFERENCES usuario (matricula),
  cod_perfil        smallint NOT NULL REFERENCES perfil (cod_perfil),
  matricula_autor   text NOT NULL REFERENCES usuario (matricula),
  data_inicio       date NOT NULL,
  data_fim          date,
  CHECK (data_fim IS NULL OR data_fim >= data_inicio),
  CONSTRAINT atribuicao_sem_sobreposicao
    EXCLUDE USING gist (matricula WITH =, cod_perfil WITH =, daterange(data_inicio, data_fim, '[]') WITH &&)
);
-- APLICAÇÃO: o autor tem perfil Administração vigente (RI43).

-- DESIGNAÇÃO: RH dá a um gestor escopo sobre metas ou PDI de um diretor sem chefia (RI19, RI42).
CREATE TABLE designacao (
  cod_designacao          bigserial PRIMARY KEY,
  matricula_gestor        text NOT NULL REFERENCES gestor (matricula),
  matricula_beneficiario  text NOT NULL REFERENCES usuario (matricula),
  matricula_rh            text NOT NULL REFERENCES rh (matricula),
  finalidade              text NOT NULL CHECK (finalidade IN ('metas', 'PDI')),
  data_inicio             date NOT NULL,
  data_fim                date,
  CHECK (data_fim IS NULL OR data_fim >= data_inicio),
  CHECK (matricula_gestor <> matricula_beneficiario),
  CONSTRAINT designacao_sem_sobreposicao
    EXCLUDE USING gist (
      matricula_beneficiario WITH =,
      finalidade WITH =,
      daterange(data_inicio, data_fim, '[]') WITH &&
    )
);

-- ---------------------------------------------------------------------
-- Sessão no servidor (DA09). Revogação imediata no desligamento e na troca de perfil.
-- ---------------------------------------------------------------------
-- Cookie de sessão = sessao_id || '.' || segredo (32 bytes aleatórios, base64url).
-- O banco guarda o sessao_id em claro, para localizar a linha, e o segredo
-- apenas em Argon2id. Um hash Argon2 não serve como chave de busca (tem sal),
-- por isso a busca é pelo id e a verificação é pelo segredo.
CREATE TABLE sessao (
  sessao_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segredo_hash     text NOT NULL CHECK (segredo_hash LIKE '$argon2id$%'),
  matricula        text NOT NULL REFERENCES usuario (matricula),
  criada_em        timestamptz NOT NULL DEFAULT now(),
  ultima_atividade timestamptz NOT NULL DEFAULT now(),
  expira_em        timestamptz NOT NULL,
  revogada_em      timestamptz,
  motivo_revogacao text CHECK (motivo_revogacao IN ('logout', 'mudança de perfil', 'desligamento')),
  CHECK (expira_em > criada_em),
  CHECK ((revogada_em IS NULL) = (motivo_revogacao IS NULL))
);
CREATE INDEX sessao_ativa_por_usuario ON sessao (matricula) WHERE revogada_em IS NULL;

-- ---------------------------------------------------------------------
-- Metas (RF03, RF04)
-- ---------------------------------------------------------------------
CREATE TABLE meta (
  cod_meta               bigserial PRIMARY KEY,
  matricula_responsavel  text NOT NULL REFERENCES usuario (matricula),     -- 1,1 (RI50)
  matricula_cadastrante  text NOT NULL REFERENCES gestor (matricula),       -- RI11
  titulo                 text NOT NULL,
  descricao              text,
  indicador              text NOT NULL,                                     -- RI50
  valor_alvo             numeric,
  unidade_medida         text,
  data_criacao           timestamptz NOT NULL DEFAULT now(),
  data_inicio            date NOT NULL,                                     -- RI50
  prazo                  date NOT NULL,                                     -- RI50
  data_conclusao         date,
  situacao               text NOT NULL DEFAULT 'em andamento'
                         CHECK (situacao IN ('em andamento', 'concluída', 'cancelada')),
  CHECK (data_inicio <= prazo),                                             -- RI26
  CHECK (data_conclusao IS NULL OR data_conclusao >= data_criacao::date)    -- RI26
);
-- APLICAÇÃO: o cadastrante é a chefia vigente do responsável, substituto vigente
-- ou gestor com DESIGNAÇÃO de metas; nunca o próprio responsável (RI11, RI42).

-- ---------------------------------------------------------------------
-- Check-in (RF01, RF05, RF06)
-- ---------------------------------------------------------------------
CREATE TABLE checkin (
  cod_checkin        bigserial PRIMARY KEY,
  matricula          text REFERENCES usuario (matricula),          -- NULL após anonimização (RI47)
  coorte_departamento text REFERENCES departamento (cod_departamento), -- preenchido na anonimização (RI47)
  ano                smallint NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
  semana             smallint NOT NULL CHECK (semana BETWEEN 1 AND 53),
  humor              smallint NOT NULL CHECK (humor BETWEEN 1 AND 5),   -- RI01
  carga              text NOT NULL CHECK (carga IN ('Leve', 'Normal', 'Pesada')),  -- RI01
  comentario         text,
  data_envio         timestamptz NOT NULL DEFAULT now(),
  data_alteracao     timestamptz,
  data_reabertura    timestamptz,
  prazo_reabertura   timestamptz,
  anonimizado        boolean NOT NULL DEFAULT false,
  CONSTRAINT checkin_semana_unica UNIQUE (matricula, ano, semana),     -- RI06
  CHECK (semana <= semanas_iso(ano)),                                 -- RI06: semana 53 só quando o ano tem
  CHECK (anonimizado = (matricula IS NULL)),                          -- RI47
  CHECK (prazo_reabertura IS NULL OR data_reabertura IS NULL
         OR prazo_reabertura >= data_reabertura)                       -- RI26
);
-- APLICAÇÃO: janela segunda 08:00 a sexta 18:00 America/Sao_Paulo, e reabertura só pelo RH (RI22).

-- PROGRESSO_META: agregação de informa (CHECK_IN × META), validado por GESTOR (RF04, RI49).
CREATE TABLE progresso_meta (
  cod_checkin        bigint NOT NULL REFERENCES checkin (cod_checkin),
  cod_meta           bigint NOT NULL REFERENCES meta (cod_meta),
  perc_informado     numeric(5, 2) NOT NULL CHECK (perc_informado BETWEEN 0 AND 100),
  perc_validado      numeric(5, 2) CHECK (perc_validado BETWEEN 0 AND 100),
  aval_qualitativa   text,
  comentario_gestor  text,
  matricula_validador text REFERENCES gestor (matricula),
  data_validacao     timestamptz,
  PRIMARY KEY (cod_checkin, cod_meta),
  CHECK ((perc_validado IS NULL) = (matricula_validador IS NULL)),
  CHECK ((data_validacao IS NULL) = (matricula_validador IS NULL))
);
-- APLICAÇÃO: check-in só informa metas do próprio autor e em andamento (RI09);
-- o validador não é o responsável (RI10).

-- ---------------------------------------------------------------------
-- Alertas e destinatários (RF07)
-- ---------------------------------------------------------------------
CREATE TABLE alerta (
  cod_alerta          bigserial PRIMARY KEY,
  matricula_colaborador text REFERENCES usuario (matricula),          -- NULL após anonimização (RI47)
  tipo                text NOT NULL CHECK (tipo IN (
                        'humor baixo com meta atrasada', 'meta vencida', 'meta em risco', 'sem resposta')),  -- RI02
  cod_meta_envolvida  bigint REFERENCES meta (cod_meta),               -- exatamente uma meta para vencida e em risco (RI12)
  janela_ref          text NOT NULL CHECK (janela_ref ~ '^[0-9]{4}-W[0-9]{2}$'),
  descricao           text,
  regra_disparada     text NOT NULL,
  valores_geradores   jsonb NOT NULL DEFAULT '{}'::jsonb,
  limiar_aplicado     jsonb NOT NULL DEFAULT '{}'::jsonb,                -- RI24: limiar não é recalculado
  data_geracao        timestamptz NOT NULL DEFAULT now(),
  data_encerramento   timestamptz,
  CHECK (tipo <> 'sem resposta' OR cod_meta_envolvida IS NULL),        -- RI12
  CHECK (tipo NOT IN ('meta vencida', 'meta em risco') OR cod_meta_envolvida IS NOT NULL),  -- RI12
  CHECK (data_encerramento IS NULL OR data_encerramento >= data_geracao)  -- RI26
);
-- RI24: uma só ocorrência por chave (colaborador, tipo, janela, meta).
CREATE UNIQUE INDEX alerta_chave ON alerta
  (matricula_colaborador, tipo, janela_ref, COALESCE(cod_meta_envolvida, 0));

-- Vínculos N:N de ALERTA (baseia-se, envolve). Humor baixo com meta atrasada
-- exige ao menos um check-in e ao menos uma meta (RI12): regra de aplicação.
CREATE TABLE alerta_checkin (
  cod_alerta  bigint NOT NULL REFERENCES alerta (cod_alerta),
  cod_checkin bigint NOT NULL REFERENCES checkin (cod_checkin),
  PRIMARY KEY (cod_alerta, cod_checkin)
);

CREATE TABLE alerta_meta (
  cod_alerta bigint NOT NULL REFERENCES alerta (cod_alerta),
  cod_meta   bigint NOT NULL REFERENCES meta (cod_meta),
  PRIMARY KEY (cod_alerta, cod_meta)
);

-- DESTINATÁRIO_ALERTA: dono e observador, com vigência (RI13).
CREATE TABLE destinatario_alerta (
  cod_destinatario bigserial PRIMARY KEY,
  cod_alerta       bigint NOT NULL REFERENCES alerta (cod_alerta),
  matricula        text NOT NULL REFERENCES usuario (matricula),
  papel            text NOT NULL CHECK (papel IN ('dono', 'observador')),
  estado           text NOT NULL DEFAULT 'aberto' CHECK (estado IN ('aberto', 'tratado')),
  data_inicio      timestamptz NOT NULL DEFAULT now(),
  data_fim         timestamptz,
  CHECK (data_fim IS NULL OR data_fim >= data_inicio),
  CHECK (papel = 'dono' OR estado = 'aberto')
);
-- RI13: exatamente um dono vigente por alerta.
CREATE UNIQUE INDEX destinatario_dono_vigente ON destinatario_alerta (cod_alerta)
  WHERE papel = 'dono' AND data_fim IS NULL;
-- Um mesmo usuário não aparece duas vezes ao mesmo tempo no mesmo alerta.
CREATE UNIQUE INDEX destinatario_vigente_unico ON destinatario_alerta (cod_alerta, matricula)
  WHERE data_fim IS NULL;
-- APLICAÇÃO: o alvo nunca é destinatário; só o dono vigente trata (RI13).

-- ---------------------------------------------------------------------
-- Ações de acompanhamento (RF15). Compartilhamento (RF16) fica fora do recorte.
-- ---------------------------------------------------------------------
CREATE TABLE acao_acompanhamento (
  cod_acao              bigserial PRIMARY KEY,
  matricula_colaborador text REFERENCES usuario (matricula),           -- NULL após anonimização (RI47)
  cod_alerta            bigint REFERENCES alerta (cod_alerta),         -- trata no máximo um alerta
  cod_meta              bigint REFERENCES meta (cod_meta),             -- ajusta no máximo uma meta
  matricula_gestor      text REFERENCES gestor (matricula),            -- registra
  matricula_rh          text REFERENCES rh (matricula),                -- lança
  tipo                  text NOT NULL CHECK (tipo IN (
                          'conversa individual', 'orientação', 'apoio ou recurso',
                          'redistribuição de tarefas', 'ajuste de prazo da meta', 'revisão posterior')),  -- RI03
  descricao             text NOT NULL,
  data_registro         timestamptz NOT NULL DEFAULT now(),
  data_revisao          timestamptz,
  CHECK ((matricula_gestor IS NULL) <> (matricula_rh IS NULL)),       -- exatamente um autor (RI14)
  CHECK (data_revisao IS NULL OR data_revisao >= data_registro)       -- RI26
);
-- APLICAÇÃO: se trata alerta, o autor é o dono vigente; a ação é sobre o mesmo colaborador (RI14).

-- ---------------------------------------------------------------------
-- Notificações (RF12). Lembretes de check-in têm uma entrega por (usuário, semana, horário) (RI38).
-- ---------------------------------------------------------------------
CREATE TABLE notificacao (
  cod_notificacao    bigserial PRIMARY KEY,
  matricula          text NOT NULL REFERENCES usuario (matricula),
  tipo               text NOT NULL CHECK (tipo IN (
                       'lembrete de check-in', 'alerta', 'resumo diário',
                       'lembrete de revisão', 'aviso operacional')),
  canal              text NOT NULL CHECK (canal IN ('sistema', 'e-mail')),  -- Slack/Teams fora do recorte (RF19)
  mensagem           text,
  semana_ref         text CHECK (semana_ref IS NULL OR semana_ref ~ '^[0-9]{4}-W[0-9]{2}$'),
  horario_programado timestamptz,
  cod_alerta         bigint REFERENCES alerta (cod_alerta),
  cod_acao           bigint REFERENCES acao_acompanhamento (cod_acao),
  data_envio         timestamptz,
  data_leitura       timestamptz,
  situacao           text NOT NULL DEFAULT 'pendente' CHECK (situacao IN ('pendente', 'enviada', 'falhou')),
  CHECK (tipo <> 'lembrete de check-in' OR (semana_ref IS NOT NULL AND horario_programado IS NOT NULL)),
  CHECK (data_leitura IS NULL OR data_envio IS NOT NULL)
);
CREATE UNIQUE INDEX notificacao_lembrete_unico ON notificacao (matricula, semana_ref, horario_programado)
  WHERE tipo = 'lembrete de check-in';

-- ---------------------------------------------------------------------
-- Agregado semanal por departamento (RF08, RNF04, RI49). Derivado e persistido.
-- ---------------------------------------------------------------------
CREATE TABLE agregado_semanal (
  cod_departamento  text NOT NULL REFERENCES departamento (cod_departamento),
  ano               smallint NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
  semana            smallint NOT NULL CHECK (semana BETWEEN 1 AND 53),
  humor_medio       numeric(3, 2),
  perc_carga_pesada numeric(5, 2),
  progresso_medio   numeric(5, 2),
  respostas         integer NOT NULL DEFAULT 0 CHECK (respostas >= 0),
  elegiveis         integer NOT NULL DEFAULT 0 CHECK (elegiveis >= 0),
  participacao      numeric(6, 5) GENERATED ALWAYS AS (
                      CASE WHEN elegiveis > 0 THEN respostas::numeric / elegiveis END) STORED,
  alertas_abertos   integer NOT NULL DEFAULT 0 CHECK (alertas_abertos >= 0),
  recalculo_pendente boolean NOT NULL DEFAULT false,
  data_calculo      timestamptz,
  PRIMARY KEY (cod_departamento, ano, semana),
  CHECK (semana <= semanas_iso(ano)),
  CHECK (respostas <= elegiveis)   -- garante /participação/ entre 0 e 1 (numeric(6,5))
);
-- APLICAÇÃO (RI34): recortes exibidos exigem mínimo de 5 respostas; regra de exibição, não de tabela.

-- ---------------------------------------------------------------------
-- Auditoria, parâmetros e agendador
-- ---------------------------------------------------------------------
-- LOG_ACESSO: append-only. A aplicação não atualiza nem apaga (RI48).
CREATE TABLE log_acesso (
  cod_evento        bigserial PRIMARY KEY,
  data_hora         timestamptz NOT NULL DEFAULT now(),
  matricula_ator    text NOT NULL REFERENCES usuario (matricula),
  matricula_titular text REFERENCES usuario (matricula),   -- base do extrato do titular (RNF01)
  perfil            text NOT NULL,
  recurso           text NOT NULL,
  acao              text NOT NULL CHECK (acao IN ('consulta', 'exportação', 'alteração de perfil', 'reabertura')),
  resultado         text NOT NULL CHECK (resultado IN ('permitido', 'negado'))
);

CREATE TABLE parametro_sistema (
  cod_parametro text PRIMARY KEY,
  descricao     text NOT NULL,
  valor         text NOT NULL,
  unidade       text
);

-- ALTERAÇÃO_PARÂMETRO: histórico com autor RH, data e valores antes e depois (RI45).
CREATE TABLE alteracao_parametro (
  cod_parametro text NOT NULL REFERENCES parametro_sistema (cod_parametro),
  data_hora     timestamptz NOT NULL DEFAULT now(),
  matricula_rh  text NOT NULL REFERENCES rh (matricula),
  valor_anterior text,
  valor_novo    text NOT NULL,
  PRIMARY KEY (cod_parametro, data_hora)
);

-- Registro de execução do agendador (DA12): alerta ao RH após três falhas seguidas.
CREATE TABLE execucao_agendador (
  cod_execucao bigserial PRIMARY KEY,
  tarefa       text NOT NULL,
  iniciada_em  timestamptz NOT NULL DEFAULT now(),
  terminada_em timestamptz,
  situacao     text NOT NULL DEFAULT 'em execução' CHECK (situacao IN ('em execução', 'ok', 'falhou')),
  CHECK (terminada_em IS NULL OR terminada_em >= iniciada_em)
);

-- ---------------------------------------------------------------------
-- Permissões do usuário de aplicação (plano 1.1: revogar DELETE nos históricos)
-- A criação do LOGIN e da senha fica fora deste arquivo.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rh_app') THEN
    CREATE ROLE rh_app NOLOGIN;
  END IF;
END $$;

GRANT USAGE ON SCHEMA rh TO rh_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA rh TO rh_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA rh TO rh_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA rh TO rh_app;

-- Históricos: sem DELETE para a aplicação.
REVOKE DELETE ON lotacao, afastamento, gerencia, cobertura, atribuicao_perfil,
                 designacao, alteracao_parametro, destinatario_alerta, alerta,
                 checkin, progresso_meta, meta FROM rh_app;
-- Log: sem UPDATE nem DELETE. O expurgo de 6 meses (RB-11, RI48) roda com outro papel (item 1.7).
REVOKE UPDATE, DELETE ON log_acesso FROM rh_app;
REVOKE UPDATE, DELETE ON alteracao_parametro FROM rh_app;

-- ---------------------------------------------------------------------
-- Índices nas chaves estrangeiras e nas colunas de consulta frequente.
-- Sem eles, DELETE/UPDATE nas tabelas pai e os JOINs fazem varredura completa.
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_departamento_superior   ON departamento (superior_cod);
CREATE INDEX IF NOT EXISTS idx_lotacao_departamento    ON lotacao (cod_departamento);
CREATE INDEX IF NOT EXISTS idx_lotacao_cargo           ON lotacao (cod_cargo);
CREATE INDEX IF NOT EXISTS idx_gerencia_gestor         ON gerencia (matricula_gestor);
CREATE INDEX IF NOT EXISTS idx_cobertura_departamento  ON cobertura (cod_departamento);
CREATE INDEX IF NOT EXISTS idx_cobertura_substituto    ON cobertura (matricula_substituto);
CREATE INDEX IF NOT EXISTS idx_atribuicao_perfil       ON atribuicao_perfil (cod_perfil);
CREATE INDEX IF NOT EXISTS idx_atribuicao_autor        ON atribuicao_perfil (matricula_autor);
CREATE INDEX IF NOT EXISTS idx_designacao_gestor       ON designacao (matricula_gestor);
CREATE INDEX IF NOT EXISTS idx_designacao_rh           ON designacao (matricula_rh);
CREATE INDEX IF NOT EXISTS idx_meta_responsavel        ON meta (matricula_responsavel);
CREATE INDEX IF NOT EXISTS idx_meta_cadastrante        ON meta (matricula_cadastrante);
CREATE INDEX IF NOT EXISTS idx_checkin_coorte          ON checkin (coorte_departamento);
CREATE INDEX IF NOT EXISTS idx_checkin_ano_semana      ON checkin (ano, semana);
CREATE INDEX IF NOT EXISTS idx_progresso_meta          ON progresso_meta (cod_meta);
CREATE INDEX IF NOT EXISTS idx_progresso_validador     ON progresso_meta (matricula_validador);
CREATE INDEX IF NOT EXISTS idx_alerta_meta_envolvida   ON alerta (cod_meta_envolvida);
CREATE INDEX IF NOT EXISTS idx_alerta_checkin_checkin  ON alerta_checkin (cod_checkin);
CREATE INDEX IF NOT EXISTS idx_alerta_meta_meta        ON alerta_meta (cod_meta);
CREATE INDEX IF NOT EXISTS idx_destinatario_matricula  ON destinatario_alerta (matricula);
CREATE INDEX IF NOT EXISTS idx_acao_colaborador        ON acao_acompanhamento (matricula_colaborador);
CREATE INDEX IF NOT EXISTS idx_acao_alerta             ON acao_acompanhamento (cod_alerta);
CREATE INDEX IF NOT EXISTS idx_acao_meta               ON acao_acompanhamento (cod_meta);
CREATE INDEX IF NOT EXISTS idx_acao_gestor             ON acao_acompanhamento (matricula_gestor);
CREATE INDEX IF NOT EXISTS idx_acao_rh                 ON acao_acompanhamento (matricula_rh);
CREATE INDEX IF NOT EXISTS idx_notificacao_alerta      ON notificacao (cod_alerta);
CREATE INDEX IF NOT EXISTS idx_notificacao_acao        ON notificacao (cod_acao);
CREATE INDEX IF NOT EXISTS idx_log_ator                ON log_acesso (matricula_ator);
CREATE INDEX IF NOT EXISTS idx_log_titular             ON log_acesso (matricula_titular);
CREATE INDEX IF NOT EXISTS idx_log_data_hora           ON log_acesso (data_hora);
CREATE INDEX IF NOT EXISTS idx_alteracao_rh            ON alteracao_parametro (matricula_rh);

-- Fim do recorte 001.
