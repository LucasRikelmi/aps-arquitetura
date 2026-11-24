# Entrega Lista B — Cadastro e consulta de metas (RF03 / HU-04.C01–C06 / UC02)
**Autora:** Kamilly · **Revisor:** André · **Prazo informado:** domingo 22/11/2026.

Este ZIP inclui **todo o projeto anterior** (Listas A, B de autorização, C e check-in) e acrescenta o módulo de metas.

## Preparação
1. `npm install`, copiar `.env.example` para `.env`, configurar `DATABASE_URL` e `PUBLIC_ORIGIN`.
2. Executar na ordem `npm run db:init`, `npm run db:sessions`, `npm run db:authorization`, `npm run db:checkin`, `npm run db:metas`.
3. `npm test` e `npm start`.

## Endpoints (todos exigem sessão ativa)
- `POST /api/metas`: cadastra meta; somente gestor habilitado no escopo do responsável.
- `GET /api/metas`: lista metas no escopo vigente do gestor, limitadas a 200 por chamada.
- `GET /api/metas/:id`: consulta meta se própria, RH ou gestor autorizado. Sem autorização: mesmo HTTP 404 de recurso ausente.
- `POST /api/rh/metas/designacoes`: RH registra exceção para diretor sem chefia imediata. Requer `diretor_id`, `gestor_id`, `fim_em` ISO 8601 futuro.

Exemplo `POST /api/metas`:
```json
{"responsavel_id":"UUID_DO_COLABORADOR","titulo":"Entregas no prazo","inicio":"2026-11-23","prazo":"2026-12-31","indicador":"Percentual de entregas concluídas dentro do prazo","descricao":"Objetivo da equipe"}
```
Todos POSTs exigem origem correta quando `PUBLIC_ORIGIN` está configurado. Em produção, configure origem HTTPS exata e implemente proteção CSRF com token além da checagem de Origin antes de disponibilizar externamente.

## Rastreabilidade
- **C01:** campos responsável, início, prazo, indicador obrigatórios; título é obrigatório para identificação.
- **C02:** consulta apresenta início, prazo e indicador.
- **C03:** listagem do gestor limitada à equipe vigente ou às metas de diretor sob designação registrada.
- **C04:** início posterior ao prazo impede gravação, inclusive no CHECK SQL.
- **C05:** diretor sem chefia imediata tem designação temporal cadastrada pelo RH para gestor específico.
- **C06:** único gestor habilitado sem chefia pode cadastrar meta própria, **sem qualquer validação de progresso**.
- **UC02:** criação e consulta, sem implementar edição, exclusão, avaliação formal ou validação de progresso.

## Decisões e limites da entrega
- Para a exceção de diretor sem chefia imediata, utiliza-se a tabela `designacao_meta_diretor` com ator RH e vigência. A identificação de diretor é assumida pelos registros organizacionais administrados externamente, pois não existe uma entidade definitiva de diretor no back-end de demonstração. Para homologação, conferir essa atribuição com o cadastro organizacional final.
- A condição de **único gestor habilitado** é operacionalizada pela contagem de perfis `Gestor` ativos e pela ausência de vínculo de chefia. Revalidar contra a regra organizacional oficial antes de produção.
- O projeto mantém tabelas exemplificativas dos módulos anteriores. O módulo `meta` novo **não substitui automaticamente** `recurso_designavel_exemplo` nem vincula `checkin_progresso` a metas definitivas. A integração com progresso e alertas é pendente.
- Auditoria das consultas/cadastro de metas deve ser integrada de forma durável antes da produção; a designação excepcional é gravada com evento de log na mesma transação, usando evento `consulta` por compatibilidade com o catálogo anterior. Criar ação `designacao` no modelo definitivo.
- Os testes unitários validam políticas e casos funcionais; ainda faltam integração PostgreSQL real, concorrência, endpoints com sessão e autorização e homologação com dados organizacionais reais.
- **Segurança:** não habilitar em produção antes da revisão de política de diretoria, CSRF, durabilidade de auditoria e escopo organizacional.
