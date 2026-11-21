-- =====================================================================
-- 002_seed_demo.sql
-- RH Soluções · Marco 05 · M1, item 1.2 (massa reduzida de homologação)
--
-- Escopo: 50 usuários, 10 departamentos, 52 semanas ISO de check-in.
-- Janela: 2025-W47 a 2026-W46 (semanas fechadas). 2026-W47 fica aberta.
-- Senha de todos os usuários de demonstração: Demo@2026
--
-- Pré-requisito: 001_ddl_recorte.sql aplicado em base vazia do schema rh.
-- Execução: psql -v ON_ERROR_STOP=1 -U postgres -d rh_db -f 002_seed_demo.sql
-- Determinístico: setseed fixo, então rodar de novo gera a mesma massa.
-- =====================================================================

SET search_path TO rh, public;
SELECT setseed(0.42);

-- ---------------------------------------------------------------------
-- Cargos e departamentos
-- Três raízes (D01, D02, D08): sem superior, são diretores sem chefia (RI42).
-- ---------------------------------------------------------------------
INSERT INTO cargo (cod_cargo, nome, descricao) VALUES
  ('C1', 'Assistente', 'Cargo de entrada'),
  ('C2', 'Analista', 'Cargo pleno'),
  ('C3', 'Coordenador', 'Cargo de liderança de equipe'),
  ('C4', 'Especialista', 'Cargo técnico sênior');

INSERT INTO departamento (cod_departamento, sigla, nome, superior_cod) VALUES
  ('D01', 'OPE', 'Operações', NULL),
  ('D02', 'TEC', 'Tecnologia', NULL),
  ('D03', 'FIN', 'Financeiro', 'D01'),
  ('D04', 'ATE', 'Atendimento', 'D01'),
  ('D05', 'INF', 'Infraestrutura', 'D02'),
  ('D06', 'DEV', 'Desenvolvimento', 'D02'),
  ('D07', 'SUP', 'Suporte', 'D04'),
  ('D08', 'COM', 'Comercial', NULL),
  ('D09', 'MKT', 'Marketing', 'D08'),
  ('D10', 'RHI', 'RH interno', 'D08');

-- ---------------------------------------------------------------------
-- Usuários: M001 = RH e Administração; M002 a M011 = gestores de D01 a D10;
-- M012 a M050 = colaboradores.
-- ---------------------------------------------------------------------
CREATE TEMP TABLE seed_usuario AS
SELECT
  n,
  'M' || lpad(n::text, 3, '0')                                        AS matricula,
  (ARRAY['Ana','Bruno','Carla','Diego','Elisa','Felipe','Gabi','Hugo','Ivo','Joana',
         'Kleber','Lia','Marcos','Nina','Otávio','Paula','Rafael','Sara','Tiago','Vera'])[(n % 20) + 1]
    || ' ' ||
  (ARRAY['Souza','Lima','Pereira','Costa','Ferreira','Alves','Rocha','Dias','Melo','Barros'])[(n % 10) + 1]
                                                                       AS nome,
  lpad((10000000000 + n)::text, 11, '0')                              AS cpf,
  date '1985-01-01' + (n * 37)                                        AS data_nascimento,
  date '2024-03-01' + (n * 3)                                         AS data_admissao,
  CASE WHEN n = 1 THEN 'D10'
       WHEN n <= 11 THEN 'D' || lpad((n - 1)::text, 2, '0')
       ELSE 'D' || lpad((((n - 12) % 10) + 1)::text, 2, '0') END      AS cod_departamento,
  'C' || ((n % 4) + 1)                                                AS cod_cargo,
  -- Gestor do departamento de cada colaborador (M002..M011 gerem D01..D10).
  -- Para M001 (RH, em D10) é M011. Para os gestores (n = 2..11) fica NULL.
  CASE WHEN n = 1 THEN 'M011'
       WHEN n <= 11 THEN NULL
       ELSE 'M' || lpad((((n - 12) % 10) + 2)::text, 3, '0') END      AS matricula_gestor
FROM generate_series(1, 50) AS n;

INSERT INTO usuario (matricula, nome, cpf, data_nascimento, email, telefones,
                     cidade, uf, data_admissao, tipo_contrato)
SELECT matricula, nome, cpf, data_nascimento,
       lower(replace(nome, ' ', '.')) || '.' || n || '@exemplo.invalido',
       ARRAY['(62) 9' || lpad((n * 7 % 10000)::text, 4, '0') || '-' || lpad((n * 13 % 10000)::text, 4, '0')],
       'Goiânia', 'GO', data_admissao,
       CASE WHEN n % 5 = 0 THEN 'estágio' ELSE 'CLT' END
FROM seed_usuario;

-- Credenciais: uma por usuário, 1:1 (DA10). Hash Argon2id de Demo@2026.
INSERT INTO credencial (matricula, hash_senha)
SELECT matricula,
       '$argon2id$v=19$m=65536,t=3,p=4$S7Fs8dqJ6Q8FEHKLpnEcTQ$SncE+oX/lW1GI2YIhXuQdoCsxPslQ8LbYB23NiTtEeY'
FROM seed_usuario;

INSERT INTO rh (matricula) VALUES ('M001');
INSERT INTO gestor (matricula)
SELECT matricula FROM seed_usuario WHERE n BETWEEN 2 AND 11;

-- Lotação vigente desde a admissão.
INSERT INTO lotacao (matricula, data_inicio, data_fim, cod_departamento, cod_cargo, motivo)
SELECT u.matricula, u.data_admissao, NULL, u.cod_departamento, u.cod_cargo, 'admissão'
FROM seed_usuario u;

-- Gerência vigente: um gestor por departamento, desde 2024-01-01.
INSERT INTO gerencia (cod_departamento, data_inicio, data_fim, matricula_gestor)
SELECT 'D' || lpad((n - 1)::text, 2, '0'), date '2024-01-01', NULL, 'M' || lpad(n::text, 3, '0')
FROM generate_series(2, 11) AS n;

-- Perfis vigentes: colaborador (1) para todos; gestor (2) para M002..M011;
-- RH (3) e Administração (5) para M001. Autor: M001.
INSERT INTO atribuicao_perfil (matricula, cod_perfil, matricula_autor, data_inicio)
SELECT matricula, 1, 'M001', date '2024-01-01' FROM seed_usuario;
INSERT INTO atribuicao_perfil (matricula, cod_perfil, matricula_autor, data_inicio)
SELECT matricula, 2, 'M001', date '2024-01-01' FROM seed_usuario WHERE n BETWEEN 2 AND 11;
INSERT INTO atribuicao_perfil (matricula, cod_perfil, matricula_autor, data_inicio)
VALUES ('M001', 3, 'M001', date '2024-01-01'), ('M001', 5, 'M001', date '2024-01-01');

-- Afastamento de férias do gestor de D01 (M002), coberto por M003 (gestor de D02).
-- Vem depois dos perfis: a RI18 exige perfil Gestor vigente do substituto.
INSERT INTO afastamento (matricula, data_inicio, tipo, data_fim)
VALUES ('M002', date '2026-09-01', 'férias', date '2026-09-15');
INSERT INTO cobertura (matricula_afastado, data_inicio_afastamento, cod_departamento,
                       data_inicio, data_fim, matricula_substituto)
VALUES ('M002', date '2026-09-01', 'D01', date '2026-09-01', date '2026-09-15', 'M003');

-- Parâmetros (RI45). Valores iniciais de referência.
INSERT INTO parametro_sistema (cod_parametro, descricao, valor, unidade) VALUES
  ('alerta.humor_baixo_max',          'Humor máximo que dispara alerta com meta atrasada', '2', 'escala 1-5'),
  ('alerta.meta_atrasada_progresso',  'Progresso abaixo do qual a meta atrasada alerta', '50', '%'),
  ('alerta.meta_em_risco_prazo',      'Prazo decorrido a partir do qual a meta está em risco', '75', '%'),
  ('alerta.sem_resposta_semanas',     'Semanas ISO seguidas sem check-in para alertar', '3', 'semanas'),
  ('carga.pesada_ocorrencias',        'Ocorrências de carga Pesada na janela', '3', 'ocorrências'),
  ('carga.pesada_janela_semanas',     'Janela corrida de semanas para carga Pesada', '8', 'semanas'),
  ('checkin.janela',                  'Janela de envio do check-in', 'seg 08:00 a sex 18:00', 'America/Sao_Paulo'),
  ('lembrete.horarios',               'Horários dos lembretes de check-in', 'qui 10:00; sex 15:00', 'America/Sao_Paulo'),
  ('pesquisa.minimo_respostas',       'Mínimo de respostas em recorte exibido', '5', 'respostas'),
  ('retencao.checkin_meses',          'Meses até anonimizar check-in', '24', 'meses'),
  ('retencao.desligado_dias',         'Dias até anonimizar dados de desligado', '90', 'dias'),
  ('retencao.log_meses',              'Meses até expurgar log de acesso', '6', 'meses');

-- ---------------------------------------------------------------------
-- Metas: uma por colaborador, cadastrada pelo gestor do departamento.
-- ---------------------------------------------------------------------
INSERT INTO meta (matricula_responsavel, matricula_cadastrante, titulo, descricao,
                  indicador, valor_alvo, unidade_medida, data_inicio, prazo)
SELECT matricula, matricula_gestor,
       'Meta de entregas do trimestre',
       'Meta de demonstração gerada pelo seed',
       'Entregas concluídas', 10, 'entregas',
       date '2025-11-17', date '2026-12-31'
FROM seed_usuario
WHERE n >= 12;

-- ---------------------------------------------------------------------
-- Semanas ISO: 2025-W47 a 2026-W46, 52 semanas.
-- 2025 tem 52 semanas e a janela cruza a virada do ano de propósito.
-- ---------------------------------------------------------------------
CREATE TEMP TABLE seed_semana AS
SELECT d::date                             AS inicio,
       extract(isoyear FROM d)::smallint   AS ano,
       extract(week FROM d)::smallint      AS semana
FROM generate_series(date '2025-11-17', date '2026-11-09', interval '7 days') AS d;

-- Check-in de todos os usuários em todas as semanas. Envio na sexta às 16h.
INSERT INTO checkin (matricula, ano, semana, humor, carga, data_envio)
SELECT u.matricula, s.ano, s.semana,
       (floor(random() * 5) + 1)::smallint,
       (ARRAY['Leve', 'Normal', 'Pesada'])[floor(random() * 3) + 1],
       s.inicio + interval '4 days 16 hours'
FROM seed_usuario u
CROSS JOIN seed_semana s;

-- Progresso de meta em cada check-in do colaborador. Metade das semanas validada.
INSERT INTO progresso_meta (cod_checkin, cod_meta, perc_informado, perc_validado,
                            matricula_validador, data_validacao)
SELECT c.cod_checkin, m.cod_meta,
       round((random() * 100)::numeric, 2),
       CASE WHEN c.semana % 2 = 0 THEN round((random() * 100)::numeric, 2) END,
       -- Validador = chefia vigente na data da validação (RI10). Nas semanas do
       -- afastamento de M002, o validador é o substituto M003.
       CASE WHEN c.semana % 2 = 0
            THEN chefia_imediata(m.matricula_responsavel, (c.data_envio + interval '1 day')::date) END,
       CASE WHEN c.semana % 2 = 0 THEN c.data_envio + interval '1 day' END
FROM checkin c
JOIN meta m ON m.matricula_responsavel = c.matricula;

-- ---------------------------------------------------------------------
-- Alertas: check-ins com humor 1 e carga Pesada geram alerta de humor baixo.
-- A regra exata da RI02 exige meta atrasada, o que o seed não calcula. O campo
-- regra_disparada deixa isso explícito.
-- ---------------------------------------------------------------------
-- Alertas, vínculos e destinatários são gravados numa só transação. A checagem
-- de RI12 (humor baixo precisa de check-in e meta) é diferida para o COMMIT.
BEGIN;

INSERT INTO alerta (matricula_colaborador, tipo, janela_ref, descricao, regra_disparada,
                    valores_geradores, limiar_aplicado, data_geracao)
SELECT c.matricula,
       'humor baixo com meta atrasada',
       c.ano::text || '-W' || lpad(c.semana::text, 2, '0'),
       'Alerta gerado pelo seed',
       'seed: humor 1 com carga Pesada (RI02 não calculada)',
       jsonb_build_object('humor', c.humor, 'carga', c.carga),
       '{"humor_max": 2}'::jsonb,
       c.data_envio
FROM checkin c
WHERE c.humor = 1 AND c.carga = 'Pesada'
  -- Só colaboradores com meta geram alerta de humor baixo, porque a RI12 exige meta.
  -- O RH (M001) não gera alerta: sem outro RH designado, não há dono possível (RI13).
  AND c.matricula IN (SELECT matricula_responsavel FROM meta);

INSERT INTO alerta_checkin (cod_alerta, cod_checkin)
SELECT a.cod_alerta, c.cod_checkin
FROM alerta a
JOIN checkin c
  ON c.matricula = a.matricula_colaborador
 AND a.janela_ref = c.ano::text || '-W' || lpad(c.semana::text, 2, '0');

INSERT INTO alerta_meta (cod_alerta, cod_meta)
SELECT a.cod_alerta, m.cod_meta
FROM alerta a
JOIN meta m ON m.matricula_responsavel = a.matricula_colaborador
WHERE a.tipo = 'humor baixo com meta atrasada';

-- Dono: chefia imediata do colaborador. Sem chefia (gestores e RH, RI42),
-- o dono é o profissional de RH designado, M001 (RI13, item b).
-- Observador: M001 sempre que não for o dono, para não repetir a mesma pessoa.
-- O dono é a chefia calculada pela RI15 (chefia_imediata), que pode ser um
-- substituto ou o gestor de um departamento superior. Sem chefia, vale o RH (M001).
-- Requer 003_regras_semanticas.sql aplicado antes deste bloco.
INSERT INTO destinatario_alerta (cod_alerta, matricula, papel, estado, data_inicio)
SELECT a.cod_alerta,
       COALESCE(chefia_imediata(a.matricula_colaborador, a.data_geracao::date), 'M001'),
       'dono', 'aberto', a.data_geracao
FROM alerta a;

INSERT INTO destinatario_alerta (cod_alerta, matricula, papel, estado, data_inicio)
SELECT a.cod_alerta, 'M001', 'observador', 'aberto', a.data_geracao
FROM alerta a
WHERE COALESCE(chefia_imediata(a.matricula_colaborador, a.data_geracao::date), 'M001') <> 'M001';

-- ---------------------------------------------------------------------
COMMIT;

-- Agregado semanal por departamento (RF08, RI49). Calculado a partir dos check-ins.
-- ---------------------------------------------------------------------
INSERT INTO agregado_semanal (cod_departamento, ano, semana, humor_medio, perc_carga_pesada,
                              progresso_medio, respostas, elegiveis, alertas_abertos,
                              recalculo_pendente, data_calculo)
SELECT u.cod_departamento,
       s.ano,
       s.semana,
       round(avg(c.humor)::numeric, 2),
       round(100.0 * count(c.cod_checkin) FILTER (WHERE c.carga = 'Pesada')
             / nullif(count(c.cod_checkin), 0), 2),
       round(avg(COALESCE(p.perc_validado, p.perc_informado))::numeric, 2),
       count(c.cod_checkin)::int,
       count(DISTINCT u.matricula)::int,
       count(a.cod_alerta)::int,
       false,
       now()
FROM seed_usuario u
CROSS JOIN seed_semana s
LEFT JOIN checkin c
  ON c.matricula = u.matricula AND c.ano = s.ano AND c.semana = s.semana
LEFT JOIN progresso_meta p
  ON p.cod_checkin = c.cod_checkin
LEFT JOIN alerta a
  ON a.matricula_colaborador = c.matricula
 AND a.janela_ref = c.ano::text || '-W' || lpad(c.semana::text, 2, '0')
 AND a.data_encerramento IS NULL
GROUP BY u.cod_departamento, s.ano, s.semana;

-- Log de acesso de exemplo: uma tentativa negada e um acesso permitido.
INSERT INTO log_acesso (matricula_ator, matricula_titular, perfil, recurso, acao, resultado) VALUES
  ('M012', 'M013', 'Colaborador', 'checkin', 'consulta', 'negado'),
  ('M002', 'M012', 'Gestor', 'painel', 'consulta', 'permitido');

DROP TABLE seed_semana;
DROP TABLE seed_usuario;

-- Fim do seed 002.
