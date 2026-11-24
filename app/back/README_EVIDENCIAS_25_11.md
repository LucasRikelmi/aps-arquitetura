# Lista A — Evidências da apresentação de 25/11/2026

**Autora:** Kamilly  
**Revisora:** Grazieli  
**Origem:** APS-WEB RNF03, RNF05, RNF06, item 2.8; ERS HU-09.C01/C07; Marco 05 tópico 9 (referência externa não anexada).

## O que é e o que não é evidência

O pacote contém o projeto integrado e o coletor de evidências em `scripts/coletar_evidencias.py`. **Não existem resultados end-to-end de homologação incluídos ou inventados.** Os arquivos em `reports/evidencias-25-11/` serão criados somente quando os cenários forem executados contra Nginx + aplicação + PostgreSQL configurados.

## Pré-requisitos

1. Subir a aplicação com migrações aplicadas e contas de homologação previamente criadas.
2. Configurar um domínio HTTPS **exclusivo de homologação**, com Nginx TLS 1.3 e proxy para Node loopback.
3. Garantir que o usuário comum não tenha acesso ao UUID de terceiro escolhido, e que exista um administrador com permissão de consulta de logs.
4. Executar os testes **apenas** em ambiente autorizado; teste de taxa pode resultar em bloqueio temporário para os usuários no mesmo IP.

## Execução (PowerShell)

```powershell
$env:EVID_HOMOLOGACAO = "SIM"
$env:EVID_BASE_URL = "https://homologacao.exemplo.com"
$env:EVID_LOGIN_EXISTENTE = "usuario-de-teste@exemplo.com"
$env:EVID_LOGIN_INEXISTENTE = "nao-existe-evidencia-2511@example.invalid"
$env:EVID_SENHA_ERRADA = "senha-intencionalmente-errada"
python scripts/coletar_evidencias.py equivalencia
python scripts/coletar_evidencias.py corpo

$env:EVID_USUARIO_COMUM = "colaborador@exemplo.com"
$env:EVID_SENHA_COMUM = "<senha-local>"
$env:EVID_USUARIO_ADMIN = "administrador@exemplo.com"
$env:EVID_SENHA_ADMIN = "<senha-local>"
$env:EVID_UUID_TERCEIRO = "<uuid-de-um-terceiro-fora-do-escopo>"
python scripts/coletar_evidencias.py acesso
python scripts/coletar_evidencias.py taxa
```

Para Linux: use `export VARIAVEL=valor` em vez de `$env:`. Não envie as senhas para o GitHub. Use contas fictícias de homologação.

## Resultados esperados / critérios de aceite

| Caso | O que deve aparecer | Arquivo produzido |
|---|---|---|
| 01 RNF03 | HTTP 401 idêntico para usuário inexistente e senha incorreta. Mediana e p95 de tempo por caminho. A latência **não** é declarada equivalente por uma amostra pequena; precisa de ensaio representativo, sem rate limiting ou diferenças de infraestrutura | `01_equivalencia.json` |
| 02 RNF06 | Corpo > 1024 bytes, HTTP 413 com JSON `erro` | `02_corpo_413.json` |
| 03 RNF05 | Requisições em sequência até observar HTTP 429 com JSON, por IP, sem exceder 30 envios | `03_taxa_429.json` |
| 04 HU-09 | Acesso negado com 404 e evento `negativa/negado` no `log_acesso` consultado por administrador | `04_acesso_404_log.json` |

**Limitações importantes:** o script de 404 filtra o log por alvo; para estabelecer vínculo inequívoco com a requisição, use banco limpo ou correlacione adicionalmente ator, timestamp e ID do evento. A fila `AuditService` é assíncrona em memória, e pode perder registros numa queda: não afirmar persistência garantida antes de evoluir para outbox transacional. O teste de HTTP 429 deve ser realizado por último devido ao limite por IP. A taxa do Nginx usada na APS é 10/min + burst 10; os valores devem ser verificados na instalação final.

## Como apresentar em 25/11

1. Exiba o fluxo `AuthenticationService` que executa Argon2id com hash fictício mesmo quando a conta não existe; depois mostre `01_equivalencia.json` com status/corpo e tempos reais.
2. Exiba `location = /api/auth/login` no Nginx com `client_max_body_size 1k`, depois `02_corpo_413.json`.
3. Exiba `limit_req` e `limit_req_status 429`; mostre `03_taxa_429.json`.
4. Faça login com um usuário sem escopo para o terceiro; mostre `04_acesso_404_log.json` e consulte o evento de negativa no banco (apenas com acesso autorizado):

```sql
SELECT id, ocorrido_em, recurso, acao, resultado, alvo_id
FROM log_acesso
WHERE acao = 'negativa' AND resultado = 'negado'
ORDER BY id DESC
LIMIT 20;
```

Grave capturas de tela do terminal e dos registros, sem mostrar senhas, tokens de sessão, cookies ou dados pessoais dos colaboradores. Registre data, hora, ambiente, hash do commit e versão do Nginx/Node.

## Estados

- **Preparado:** scripts de evidência e documentação.
- **Pendente:** executar os quatro cenários no ambiente completo e anexar os JSONs/resultados ao PR.
- **Atenção:** apresentar apenas status realmente observados e demonstrados.
