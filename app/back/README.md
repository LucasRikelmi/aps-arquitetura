> **Novo módulo — Lista C, cadastro organizacional:** consulte [README_CADASTRO_ORGANIZACIONAL.md](README_CADASTRO_ORGANIZACIONAL.md). Nova migração: `npm run db:organizacao`.

> **Nova entrega:** tratamento de alertas e ações RF15/UC04/UC15 em `README_ACOES_ALERTAS.md`. Aplicar `npm run db:acoes` após `npm run db:alertas`.

> **Nova entrega — Lista B / Painel da equipe:** consulte [README_PAINEL.md](README_PAINEL.md) para instalação, rotas, testes, rastreabilidade e pendências.

# Atualização: Lista B — Metas

Leia **README_METAS.md** para os endpoints, regras, comandos e limitações de RF03/UC02.

# Lista B — Check-in semanal (RF01 / UC01)

**Autora:** Kamilly · **Revisor:** André · **Entrega informada:** domingo 22/11/2026

Esta versão **inclui Listas A, B (autorização), C e o novo check-in**.

## Contrato do check-in

- `GET /api/checkins/atual`: semana vigente e check-in do usuário da sessão (ou `null`).
- `PUT /api/checkins/atual`: cria ou edita o check-in da semana.
- `GET /api/checkins/:ano/:semana`: consulta registro próprio por ano/semana ISO.
- `PUT /api/checkins/:ano/:semana`: edita registro próprio na janela ou após reabertura.
- `POST /api/rh/checkins/:userId/:ano/:semana/reabrir`: operação administrativa do RH sem tela; requer sessão RH e cabeçalho `Origin`. Reabertura e log na **mesma transação**.

Exemplo de corpo de PUT:

```json
{ "humor": 4, "carga": "Normal", "comentario": "Semana produtiva", "progressos": [] }
```

`progressos` é lista opcional `{ "meta_id": "UUID", "progresso": 0..100 }`; quando não há meta, enviar `[]`, sem inventar percentual. **Integração com as metas oficiais não foi implementada**, portanto nesta versão os identificadores são aceitos por formato, mas ainda não são confrontados com a tabela definitiva de metas.

## Regras

1. Semana ISO 8601 (segunda-feira, ano ISO e semana 1–53), inclusive virada de ano. `UNIQUE(usuario_id,ano_iso,semana_iso)` garante 1 registro mesmo com concorrência.
2. Janela: **segunda 08:00 a sexta 18:00**, horário `America/Sao_Paulo` (sexta 18h excluída).
3. Durante a janela, `PUT` faz UPSERT (edita o mesmo registro, nunca duplica). Após fechar, retorna `409` até uma reabertura explícita.
4. O RH reabre uma semana encerrada para um usuário específico. A autorização é **de uso único**, consumida em uma operação de gravação; histórico de reaberturas preservado. Esta é uma escolha operacional da implementação, não um prazo detalhado pela ERS.
5. Apenas usuário autenticado com perfil Colaborador grava o seu próprio check-in; o RH não edita em nome dele.
6. A reabertura registra autor, data e evento `reabertura` no log em uma transação.

**Rastreabilidade:** RF01 e UC01 (alternativas 2a, 2b, 2c). O texto recebido indica RB-08, mas **na ERS v1.3 a RB-08 refere-se a lembretes**, não à unicidade do check-in. A ausência de metas prevista em 2c é contemplada por `progressos: []`.

## Instalação

```bash
npm install
# configurar .env usando .env.example e criar o banco definido em DATABASE_URL
npm run db:init
npm run db:sessions
npm run db:authorization
npm run db:checkin
npm test
npm start
```

Não há interface gráfica de reabertura. Em produção defina `PUBLIC_ORIGIN` para a origem exata do front-end. Exemplo com sessão RH já obtida (o cookie de sessão é enviado pelo navegador ou cliente HTTP):

```bash
curl -X POST http://127.0.0.1:3000/api/rh/checkins/UUID_DO_USUARIO/2026/47/reabrir -H 'Origin: http://localhost:3000' -H 'Cookie: __Host-benigno_session=SEU_TOKEN'
```

## Pendências para uso real

- Testar ponta a ponta com PostgreSQL e Nginx, incluindo concorrência e configuração HTTPS.
- Integrar `checkin_progresso` ao modelo real de metas, validação e alertas; não criar metas artificiais.
- Verificar rotinas de anonimização/retenção LGPD, proteção CSRF mais robusta (token anti-CSRF além da validação da origem) e auditoria durável dos demais fluxos.
- O projeto anterior contém estruturas demonstrativas (`checkin_exemplo`) que permanecem independentes deste novo `checkin_semanal`; migrar/remover na integração final.

---

# Benigno Soluções — Entrega integrada das Listas A, B e C

**Lista B — Controle de acesso e auditoria**  
Autora: Kamilly | Revisor: André | Entrega informada: domingo, 22/11/2026

## Fonte e abrangência

Implementação baseada na documentação definitiva da Benigno Soluções v3: **ERS RF09 (p. 59), RNF01 frentes (a)–(c) (p. 64), RB-07 (p. 68), HU-09.C01–C10 (p. 74) e UC09 (pp. 88–89)**. Inclui extensões de HU-09.C11–C12 como exemplo: papéis cumulativos sem herança e designação expressa para metas/PDI. Contém **todo o código das Listas A e C**, sem a necessidade de mesclar projetos.

O conteúdo é um **módulo de back-end executável e demonstrativo**, não a implementação integral do software de RH. As tabelas `checkin_exemplo`, `recurso_designavel_exemplo` e `vinculo_gestor` devem ser mapeadas às entidades definitivas do modelo ER, evitando bancos paralelos em produção. A implementação não cria formulários completos, painel da Diretoria, exportação de PDF/CSV, workflows de RH ou uma interface web.

### Matriz de critérios implementada

| Critério | Implementação demonstrativa |
|---|---|
| HU-09.C01 | Colaborador não acessa dados de terceiros; 404 indistinguível de recurso inexistente. |
| HU-09.C02 | Gestor tem escopo limitado à equipe vigente; meta/PDI isolado só mediante designação expressa. |
| HU-09.C03 | Administração não recebe permissão automática a check-ins. |
| HU-09.C04 e C05 | Mantidos da Lista C: mudança de perfil revoga sessões e desligamento bloqueia acesso. |
| HU-09.C06 | Loga consultas e exportações demonstrativas com ator, perfis, recurso, ação, resultado e horário no PostgreSQL. |
| HU-09.C07 | Loga tentativas negadas. |
| HU-09.C08 | Gravação assíncrona, com fila em memória limitada e indicador de perda; **não garante durabilidade em falhas**. |
| HU-09.C09 | Apenas Administração acessa `GET /api/admin/logs`. |
| HU-09.C10 | Nenhuma rota de edição/exclusão dos logs. Restringir também privilégios do papel SQL em produção. |
| UC09 | Consulta administrativa paginada de logs ainda retidos (seis meses), sem dados individuais de bem-estar. |

## Organização

- `database/schema.sql`: tabela `usuario` da Lista A.
- `database/002_sessions.sql`: sessões e perfis da Lista C.
- `database/003_authorization.sql`: escopo, designações, check-ins demonstrativos e `log_acesso`.
- `src/services/AuthorizationPolicy.js`: regra *deny by default* por perfil, propriedade e escopo.
- `src/repositories/PgAuthorizationRepository.js`: consulta de escopo no PostgreSQL com parâmetros `$1...$n` e vigência temporal.
- `src/middleware/authorize.js`: validação de autorização e resposta genérica 404.
- `src/repositories/PgAuditRepository.js`, `src/services/AuditService.js`: armazenamento e consulta assíncrona de auditoria.
- `src/routes/accessRoutes.js`: recursos de demonstração e consulta de logs.
- `tests/authorization.test.js`: testes unitários das regras da Lista B.

## Preparação e execução

Requer Node.js >= 20, npm, PostgreSQL e `psql` disponível no PATH.

```bash
npm install
# Windows: copy .env.example .env
# Linux/macOS: cp .env.example .env
```

Edite `.env`, incluindo `DATABASE_URL` apontando para um banco PostgreSQL criado previamente.

```bash
npm run db:init
npm run db:sessions
npm run db:authorization
npm run user:create -- kamilly@exemplo.com "SenhaApenasDeTeste2026!"
npm run profile:change -- kamilly@exemplo.com Colaborador
npm test
npm start
```

A rota de login da Lista A continua em `POST http://127.0.0.1:3000/api/auth/login`, com body:

```json
{"login":"kamilly@exemplo.com","senha":"SenhaApenasDeTeste2026!"}
```

A sessão é emitida em cookie (Lista C). Utilize cliente HTTP que preserve cookies.

### Endpoints da Lista B

| Método / endpoint | Quem pode acessar | Resultado |
|---|---|---|
| `GET /api/pessoas/:userId/checkins` | Próprio colaborador, RH ou gestor vigente da equipe | Lista demonstrativa de check-ins, ou 404. |
| `GET /api/pessoas/:userId/checkins/export` | Mesma autorização da consulta | JSON demonstrativo e log com ação `exportacao`, **não** um arquivo real. |
| `GET /api/pessoas/:userId/meta/:resourceId` | Próprio, RH, gestor da equipe ou gestor designado para aquele recurso | Objeto de meta demonstrativo, ou 404. |
| `GET /api/pessoas/:userId/pdi/:resourceId` | Próprio, RH, gestor da equipe ou gestor designado | Objeto PDI demonstrativo, ou 404. |
| `GET /api/admin/logs?limit=50&before=123` | Administração | Log em ordem decrescente, até 100 registros por página. |

`GET /api/auth/me` e `POST /api/auth/logout` permanecem disponíveis conforme Lista C.

Para testar dados próprios, obtenha o UUID do usuário no PostgreSQL, por exemplo:

```sql
SELECT id, login FROM usuario;
```

Depois, usando sessão do usuário:

```bash
curl -b cookies.txt http://127.0.0.1:3000/api/pessoas/UUID_DO_USUARIO/checkins
```

A tabela `checkin_exemplo` nasce vazia. O resultado `200` com `checkins: []` é esperado até que registros de exemplo sejam inseridos. Consultar dados de outro usuário sem permissão retorna `404` com `{ "erro": "recurso não encontrado" }`, independentemente de o UUID existir ou não. O exemplo de exportação somente classifica a ação como `exportacao`; a exportação real depende do módulo de relatórios.

### Privilégios e auditoria em produção

A aplicação grava registros em `log_acesso` com `INSERT` e recupera via `SELECT`. Para efetivar a regra de **não alteração/não exclusão** também contra SQL direto, o usuário PostgreSQL da aplicação deve ter somente `SELECT`/`INSERT` na tabela e acesso à sequência identity, nunca `UPDATE`, `DELETE` ou `TRUNCATE`. Administradores do banco ainda podem alterar o banco; para imutabilidade forte usar logs externos e políticas de preservação/WORM.

A fila assíncrona atual não bloqueia requisições durante a gravação, mas é **volátil**, pode perder registros em crash, esgotamento da fila ou indisponibilidade do PostgreSQL, e não cumpre durabilidade estrita. Para uso real com dados pessoais, trocar por *outbox* transacional durável ou broker com confirmação e política de reprocessamento; supervisionar `dropped` e falhas de persistência, definir retenção/expurgo de 6 meses com operação privilegiada distinta, e testar funcionamento sob carga. **Não considerar a auditoria pronta para produção antes disso.**

Evite registrar senha, cookies, hash, CPF ou respostas de check-in. Os logs contêm metadados de ação/autor/recurso, não valores sensíveis. Ajustes de atribuição e designação devem ser feitos em transações auditadas, com autor e vigência, por serviço administrativo autenticado e autorizado; não foram criados endpoints administrativos de cadastro para não ampliar o escopo.

## Testes e estado da entrega

```bash
npm test
```

Foram executados **26 testes de unidade no ambiente de geração**: 8 da Lista A, 10 da Lista B e 8 da Lista C; todos aprovados. Testes de integração com PostgreSQL real, carga, expiração real, cookie no navegador, autorização concorrente e implantação Nginx **ainda pendentes**.

## Encaminhamento para GitHub

Criar uma branch própria da Lista B, adicionar o projeto, executar `npm test`, validar os cenários reais de banco e abrir PR para revisão do André. Confirmar no PR que o módulo possui dados de demonstração e registrar os pontos pendentes antes de marcar produção/conclusão final.


## Modulo adicional: progresso e validação
Ver [README_PROGRESSO.md](README_PROGRESSO.md). Rode também `npm run db:progresso` após `db:metas`.

## Lista B — Alertas e lembretes (RF07/RF12)

A entrega atual inclui as listas anteriores e o módulo de alertas e lembretes. Leia **README_ALERTAS_LEMBRETES.md** para requisitos, endpoints, migração `008_alertas_lembretes.sql`, comandos de cron, SMTP e limitações de integração.


## Contrato de API 2.0 (Lista C)

Ver [README_CONTRATO_API_V2.md](README_CONTRATO_API_V2.md) e [docs/CONTRATO_API_V2.md](docs/CONTRATO_API_V2.md). A versão é documento de interface; RFD03 exige 503 na indisponibilidade do repositório, não 401.


## Lista C — Infraestrutura Nginx e systemd

Consultar [README_INFRA_NGINX_SYSTEMD.md](README_INFRA_NGINX_SYSTEMD.md). A configuração é de referência e requer certificado, DNS e homologação no servidor de destino.


## Evidências da apresentação 25/11
Consulte [`README_EVIDENCIAS_25_11.md`](README_EVIDENCIAS_25_11.md) e execute `python3 scripts/coletar_evidencias.py` contra homologação autorizada.
