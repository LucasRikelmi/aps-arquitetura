# Lista C — Cadastro organizacional (RF02, HU-03.C01–C07, UC07)

Autora: Kamilly | Revisor: André | Entrega prevista: domingo, 22/11/2026.

Esta versão é uma evolução do projeto integrado das Listas A/B/C. Instale as dependências, configure `.env` e execute as migrações `schema.sql`, `002` até `009` e por último `010_cadastro_organizacional.sql`.

```bash
npm install
npm run db:init
npm run db:sessions
npm run db:authorization
npm run db:checkin
npm run db:metas
npm run db:progresso
npm run db:painel
npm run db:alertas
npm run db:acoes
npm run db:organizacao
npm test
npm start
```

O comando `psql` deve estar instalado e `DATABASE_URL` deve estar disponível no ambiente do processo. No Linux, por exemplo: `export DATABASE_URL='postgresql://usuario:senha@localhost:5432/aps_auth'`. Aplique as migrações em uma **base de homologação**, não em produção.

## Endpoints

Todas as rotas exigem sessão válida da Lista C (`__Host-benigno_session`, em HTTPS de produção). Rotas de escrita do RH exigem perfil `RH` e, quando `PUBLIC_ORIGIN` estiver definido, cabeçalho `Origin` correspondente. O cliente deve enviar cookies com `credentials: 'include'`.

| Método | Rota | Acesso |
| --- | --- | --- |
| GET | `/api/organizacao/me` | titular |
| GET | `/api/organizacao/pessoas/:id` | próprio, RH, gestor de equipe vigente |
| GET | `/api/organizacao/equipe` | gestor, sua equipe ou cobertura |
| POST | `/api/rh/organizacao/departamentos` | RH |
| POST | `/api/rh/organizacao/cargos` | RH |
| POST | `/api/rh/organizacao/pessoas` | RH |
| PATCH | `/api/rh/organizacao/pessoas/:id` | RH |
| POST | `/api/rh/organizacao/lotacoes` | RH |
| POST | `/api/rh/organizacao/afastamentos` | RH |
| POST | `/api/rh/organizacao/substituicoes` | RH |
| POST | `/api/rh/organizacao/pessoas/:id/desligamento` | RH |
| POST | `/api/rh/organizacao/sincronizar-folha` | RH, importação provisória |

Exemplo: criar departamento e cargo antes de cadastrar colaboradores.

```json
{"nome":"Desenvolvimento"}
```

```json
{"nome":"Analista de Sistemas"}
```

Exemplo: cadastrar pessoa (campos do vínculo são opcionais; se usados, informar o conjunto completo).

```json
{
  "nome":"Pessoa Exemplo",
  "email":"pessoa@empresa.com",
  "departamento_id":"UUID_DO_DEPARTAMENTO",
  "cargo_id":"UUID_DO_CARGO",
  "gestor_id":"UUID_DO_GESTOR",
  "inicio":"2026-11-23"
}
```

Exemplo: registrar substituição do gestor (intervalo inclusivo em data civil).

```json
{
  "gestor_id":"UUID_DO_GESTOR",
  "substituto_id":"UUID_DO_SUBSTITUTO",
  "inicio":"2026-11-23",
  "fim":"2026-11-27"
}
```

Exemplo: férias ou afastamento.

```json
{"usuario_id":"UUID_DO_COLABORADOR","tipo":"ferias","inicio":"2026-11-23","fim":"2026-11-27"}
```

Desligamento:

```json
{"data":"2026-11-23"}
```

Exemplo da importação de homologação (não há conector automático com ERP/folha):

```json
{"registros":[{"email":"pessoa@empresa.com","nome":"Pessoa Exemplo","situacao":"ativo","departamento_id":"UUID_DO_DEPARTAMENTO","cargo_id":"UUID_DO_CARGO"}]}
```

## Critérios e rastreabilidade

| Critério | Implementação |
| --- | --- |
| HU-03.C01 | inclusão de pessoa e lotação com vínculo ao gestor; visível no GET `/equipe` |
| HU-03.C02 | login normalizado e UNIQUE, com resposta 409 para e-mail duplicado |
| HU-03.C03 | importações da folha são marcadas como origem_folha; edição de nome/e-mail por RH bloqueada; faltam conector e contrato definitivos |
| HU-03.C04 | registro de férias/afastamento com início e fim; processamento por alertas/lembretes depende da compatibilização de repositórios |
| HU-03.C05 | leitura integral apenas do próprio cadastro; sem acesso a terceiros |
| HU-03.C06 | consulta de equipe limitada a vínculo vigente ou substituição; CPF, nascimento e endereço omitidos |
| HU-03.C07 | substituição com início e fim e cobertura da equipe restrita ao intervalo |

O UC07 define RH/Administracao na manutenção, com colaborador em leitura própria e gestor em leitura de dados organizacionais. A presente versão mantém **escrita restrita a RH**; a Administração apenas possui recursos de perfis do módulo anterior. Alterar essa política requer revisão de autorização com a equipe.

## Notas de arquitetura e limites

- O cadastro cria uma conta `usuario` com hash Argon2id aleatório *sem senha conhecida*. Não há senha padrão, link de ativação, redefinição ou envio de e-mail automático nesta entrega. Para uso real, implementar fluxo seguro de primeiro acesso.
- Cadastro e alterações transacionais são escritos no PostgreSQL. Alterações de lotação preservam histórico e atualizam vínculos de escopo simples. Validação de mudanças retroativas e sobreposições complexas, bem como ciclos hierárquicos e exclusões lógicas de cargos/departamentos, exigem regras adicionais antes de produção.
- A importação de folha é um **endpoint de demonstração**. Não conecta a ERP real. A reativação de conta após desligamento exige reatribuição de perfil e revalidação de acesso; não é uma liberação automática de sessão.
- O desligamento invalida sessões na mesma transação e marca usuário como inativo. Redistribuição/cancelamento de metas em andamento, substituições e designações ligadas à hierarquia precisam ser concluídas nos módulos respectivos antes de homologar a HU-03.C07 por inteiro.
- Afastamentos passam a ficar registrados em `afastamento`; a rotina anterior de alertas deve ser adaptada para consumir essa tabela sem duplicar fontes de ausência.
- Operações de cadastro e alterações produzem `evento_organizacional`; não gravar CPF, data de nascimento ou endereço na trilha.
- Antes de produção, exigir controle de privilégio SQL por papel, LGPD/retenção, auditoria protegida, proteção CSRF completa, testes integrados e concorrência de períodos. Os testes incluídos são **unitários e não validam um servidor PostgreSQL real**.
