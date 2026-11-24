# Lista A — Correções herdadas APS-WEB (22/11/2026)

**Autora:** Kamilly · **Revisora:** Grazieli

**Origem:** APS-WEB, itens 1.4 (client_max_body_size e limit_req), 1.5 (Argon2id em operação assíncrona), 2.8 (riscos residuais). A meta operacional do item 4.6 deve ser fixada somente a partir de medição representativa.

## Alterações

1. **Limite de corpo no local certo:** `nginx/aps-auth.conf.example` aplica `client_max_body_size 1k` na `location = /api/auth/login`. As outras rotas usam limite de 100 KiB; Express aplica o mesmo critério.
2. **Proteção por IP e login:** Nginx mantém limite por IP (taxa média 10r/m e burst 10, ajustar após medição para usuários sob NAT). PostgreSQL implementa contador atômico por login normalizado, indexado por HMAC SHA-256 com segredo do servidor; padrão 10 tentativas por minuto por login, inclusive logins inexistentes. Requisições excedentes: 429 genérico. Indisponibilidade do banco: 503, nunca 401. O rate limit por login não substitui o limite por IP, nem defesa contra abuso distribuído por credenciais distintas.
3. **Proteção CSRF:** operações de escrita sob `/api/` (exceto login) exigem `X-CSRF-Token`, derivado por HMAC do token da sessão. Buscar o token após autenticação com `GET /api/auth/csrf` (cookie de sessão enviado automaticamente pelo navegador). Reutilizar no cabeçalho de POST/PATCH/PUT/DELETE. Também há validação de `Origin`, quando presente, e rejeição de `Sec-Fetch-Site: cross-site`. O login bloqueia origem cruzada quando identificável. Cookies continuam `HttpOnly`, `SameSite=Lax`, com `Secure` em produção.
4. **Argon2id sob concorrência:** `scripts/benchmark-argon2.js` mede `argon2.verify()` a 1, 2, 4 e 8 verificações concorrentes (p50/p95/p99, throughput) com 19 MiB, 2 iterações e paralelismo 1. `scripts/benchmark-login-http.js` mede o fluxo HTTPS completo em homologação, também com 1/2/4/8 clientes simultâneos. A meta de latência deve sair do segundo teste, e não do primeiro isoladamente.

## Implantação

```bash
npm install
npm run db:security
npm test
npm start
```

Configure `.env` com `DATABASE_URL`, `PUBLIC_ORIGIN`, `CSRF_SECRET` e `LOGIN_RATE_SECRET` **independentes e aleatórios**, cada segredo com ao menos 32 bytes. Execute todas as migrações anteriores nas instalações novas. Não usar os valores de desenvolvimento em produção. Instalar Nginx conforme contexto `http` indicado no arquivo. Os limites por IP devem ser ajustados ao cenário real de NAT corporativo.

## Exemplo do cliente browser

```js
const csrfResponse=await fetch('/api/auth/csrf',{credentials:'same-origin'});
const {csrfToken}=await csrfResponse.json();
await fetch('/api/metas',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken},body:JSON.stringify({/* dados da meta */})});
```

O token muda quando a sessão muda. Após logout/relogin, obter novo token.

## Medição para definição da meta do item 4.6

**Pré-condições:** PostgreSQL/Nginx ativos; TLS válido; hardware e quantidade de workers documentados; limites de taxa dimensionados exclusivamente para o teste controlado; sem tráfego externo; dados sintéticos; coletar CPU, RSS, memória do pool Argon2id e tempos de banco. Os testes HTTP utilizam logins inexistentes distintos para forçar `argon2.verify` em hash fictício sem mascarar o limite de tentativas por login. Se houver respostas 429/5xx, a amostra não é válida para propor meta de sucesso.

```bash
npm run bench:argon2
BENCH_URL=https://homolog.exemplo.com/api/auth/login BENCH_CONFIRM_HOMOLOG=SIM BENCH_OPS=30 npm run bench:login
```

Relatórios JSON são gravados em `reports/` e não devem conter senhas. Comparar a curva p95 com o nível de concorrência representativo do ambiente. **Meta a registrar no item 4.6:** `p95 do login HTTPS <= valor mensurado e aprovado para N acessos concorrentes, medido em ambiente de referência, sem respostas de erro inesperadas`. Registrar o valor numérico só depois do ensaio e da aprovação da revisora. Não é tecnicamente correto inventar um limite de milissegundos antes de executar o teste.

## Estado de validação

- Testes unitários locais sem dependências externas: `tests/seguranca-login.test.js` aprovados (9/9).
- **Não foi possível executar** a suíte completa, os benchmarks Argon2id e o teste HTTP: `npm install --offline` não encontrou a dependência `argon2` no cache; não há PostgreSQL/Nginx de homologação configurados nesta sessão.
- Pendente: testes integrados, validação de limites de taxa em NAT, comparação de latências reais (inclusive diferenças sistemáticas de tempo entre usuário existente e inexistente), teste de CSRF no navegador e definição quantitativa da meta no item 4.6.
