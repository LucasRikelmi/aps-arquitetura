# Lista B — Tratamento de alertas e ações de acompanhamento

Autora: Kamilly · Revisora: Grazieli · Entrega prevista no enunciado: domingo, 22/11/2026.

## Rastreabilidade

ERS v1.3 RF07, RF15, HU-08.C07 a C11, HU-13.C01 a C05; UC04 expandido (páginas 86–87 do PDF) e UC15 no catálogo (página 82).

- **UC04**: consulta do alerta não muda estado; somente **ação registrada** por dono autorizado muda alerta aberto para tratado. RH observador não trata em nome do gestor. Diretor sem chefia: RH designado como dono excepcional, diferente do alvo. Substituto vigente assume alertas abertos na cobertura. Alerta previamente tratado continua tratado, mesmo quando recebe nova ação; histórico preservado.
- **UC15**: registro autônomo de ação de acompanhamento, mesmo sem alerta; inclui autor, colaborador, tipo, descrição e data de revisão opcional.
- **HU-13**: data de revisão gera lembrete no dia; RH autorizado vê ações; colaborador não vê ações registradas sobre si.

## Arquivos adicionados

- `database/009_acoes_acompanhamento.sql`: tabela persistente e expansão do tipo de notificação.
- `src/services/AcaoPolicy.js`, `src/services/AcaoService.js`: validações e regras.
- `src/repositories/PgAcaoRepository.js`: autorização vigente, transação e histórico.
- `src/routes/acaoRoutes.js`: endpoints autenticados.
- `scripts/run-revisoes.js`: enfileira lembretes da data de revisão.
- `tests/acoes.test.js`: testes unitários.

## Rotas

`POST /api/acoes`: `{"colaborador_id":"UUID","alerta_id":"UUID ou null","tipo":"apoio","descricao":"Ação registrada","data_revisao":"2026-12-02"}`. Com alerta, somente dono autorizado pode registrar tratamento. Sem alerta, gestor dentro do escopo ou RH pode registrar acompanhamento. O servidor define `autor_id` e `criada_em`; parâmetros de identidade não são aceitos do cliente. Retorna 201 ou 404 para acesso negado.

`GET /api/colaboradores/:id/acoes`: histórico autorizado de acompanhamento, sem permissão ao próprio colaborador.

`GET /api/alertas/:id/acoes`: histórico de ações do alerta visível apenas para destinatário ainda autorizado.

`POST /api/alertas/:id/tratar` foi removida: a transição sem ação violava a UC04. O registro de uma ação em `POST /api/acoes` trata o alerta aberto atomicamente. `/api/alertas/:id/encerrar` continua reservada ao dono.

## Instalação

Aplicar todas as migrações 001 a 008 no banco PostgreSQL e depois:

```sh
npm install
npm run db:acoes
npm test
npm start
```

Revisões: `npm run revisoes:daily` (agendar uma vez por dia no fuso `America/Sao_Paulo`, antes de `npm run emails:send`). O envio exige SMTP configurado e depende do worker existente da Lista B. A mensagem **não** contém descrição da ação, nome ou dados de bem-estar.

## Segurança, alcance e pendências

- Persistência e mudança de status são executadas em uma transação com `FOR UPDATE` sobre o alerta.
- Somente o papel `dono` atual, combinado à relação de escopo vigente, permite tratar. RH observador só consulta.
- Histórico é append-only pela API; para garantia integral, restringir `UPDATE`/`DELETE` da tabela ao usuário do banco.
- Um lembrete de revisão é dirigido ao **autor da ação**, se ainda ativo e autorizado ao colaborador no momento do job; designações e alterações podem exigir outro responsável e devem ser conciliadas no cadastro organizacional definitivo.
- O repositório de origem já tinha fila assíncrona em memória para parte da auditoria; não se deve considerar tal mecanismo durável em produção.
- O modelo ER definitivo, notificações por substituição e integrações com dados organizacionais reais requerem homologação. Não foram executados testes integrados com PostgreSQL ou envio SMTP real nesta etapa.
