# Lista C — Contrato da API v2.0

**Autora:** Kamilly · **Revisora:** Grazieli · **Entrega prevista:** 22/11/2026.

- Especificação narrativa: [`docs/CONTRATO_API_V2.md`](docs/CONTRATO_API_V2.md)
- Especificação OpenAPI 3.1: [`docs/openapi.yaml`](docs/openapi.yaml)
- Testes de regressão: `tests/contrato-api-v2.test.js`

## Ponto crítico

**503** = indisponibilidade do PostgreSQL/repositório; **500** = falha inesperada; **401** = credenciais inválidas depois de verificar normalmente. Nunca transformar indisponibilidade em 401.

## Compatibilidade

A APS v1.0 não criava sessão; o projeto Benigno cria. O contrato 2.0 documenta explicitamente essa extensão. Os demais endpoints de negócio já existentes no projeto não são objeto deste contrato.

## Testar

`npm install && npm test`

A suíte verifica parte da semântica, mas ainda faltam testes integrados com o banco indisponível e Nginx.
