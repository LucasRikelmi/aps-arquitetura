# Contrato da API — Versão 2.0

**Projeto:** Benigno Soluções / RH Soluções  
**Tipo do artefato:** item de informação — contrato de interface  
**Autora:** Kamilly  
**Revisora:** Grazieli  
**Entrega prevista:** domingo, 22/11/2026  
**Estado:** proposta para revisão, não homologada em produção

## 1. Finalidade e origem

Esta versão evolui o contrato de autenticação v1.0 do **APS-WEB, item 2.5**, e atende ao **RFD03, item 2.1**: ausência de resposta do repositório é falha de infraestrutura e nunca prova de que as credenciais são inválidas. O contrato v2.0 acrescenta os mecanismos de sessão que a Benigno exige e respeita a interface da **ERS, seção 4**. A APS em si **não emite sessão** (DA05), enquanto a Benigno precisa manter autenticação entre requisições; essa é uma alteração deliberada e não uma afirmação de que a APS já previa cookies.

O arquivo `openapi.yaml` é a especificação legível por ferramentas. Este contrato cobre a interface pública de autenticação e sessão, **não todo o catálogo de endpoints de gestão de pessoas**.

## 2. Ambiente, transporte e representação

- API REST sobre HTTPS; `Content-Type: application/json` nos corpos JSON; nenhuma credencial em URL.
- APS-WEB v1.0 fixa HTTP/1.1 e TLS 1.3. A ERS da Benigno admite TLS 1.2 ou superior. **Decisão pendente para unificação documental:** este projeto adota TLS 1.3 no Nginx conforme APS; uma ampliação para 1.2 exige revisão de segurança e configuração.
- A borda Nginx impõe **1 KiB** de corpo de login, respondendo **413**; aplica limite por IP com **429**. Os valores originais da APS são 10 req/min/IP e rajada de 10, **sujeitos a recalibração** no ambiente corporativo compartilhado.
- JSON de erro sempre no formato `{ "erro": "mensagem fixa" }`, sem consulta SQL, stack trace, senha ou hash. Respostas 204 não têm corpo.

## 3. Endpoint de autenticação — POST /api/auth/login

### Requisição

```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json

{"login":"maria@exemplo.com.br","senha":"senha-informada"}
```

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `login` | string | Sim | 1–254 caracteres; remover espaços nas extremidades e converter para minúsculas antes da consulta |
| `senha` | string | Sim | 1–128 caracteres; valor não registrado em logs |

O Express valida sintaxe, tipo e limites antes de consultar o repositório ou executar Argon2id. O PostgreSQL é consultado por SQL parametrizado via pool. Para login inexistente, Argon2id verifica um hash fictício com parâmetros equivalentes ao de um usuário existente.

### Respostas

| HTTP | Condição | Corpo JSON | Responsável |
|---|---|---|---|
| **200 OK** | Credenciais válidas e sessão criada | `{"id":"UUID","login":"maria@exemplo.com.br"}` | Express, `Set-Cookie` de sessão |
| **400 Bad Request** | JSON inválido, Content-Type não JSON, campo ausente/tipo/limite | `{"erro":"requisição inválida"}` | Express |
| **401 Unauthorized** | Login inexistente ou senha incorreta, ou conta sem acesso ativo | `{"erro":"credenciais inválidas"}` | Express |
| **413 Content Too Large** | Corpo acima de 1 KiB | `{"erro":"Requisicao muito grande."}` | Nginx |
| **429 Too Many Requests** | Limite de taxa excedido | `{"erro":"Muitas requisicoes. Tente novamente mais tarde."}` | Nginx |
| **500 Internal Server Error** | Falha inesperada de aplicação | `{"erro":"erro interno"}` | Middleware Express |
| **503 Service Unavailable** | PostgreSQL/repositório indisponível | `{"erro":"serviço indisponível"}` | Middleware Express |

**Invariante RFD03:** uma exceção de `pool.query()`, timeout, conexão recusada ou indisponibilidade de infraestrutura **não** pode ser convertida em `null` (usuário inexistente), nem em **401**. Falhas reconhecidas de disponibilidade produzem 503; falhas inesperadas, 500. O sistema não deve expor ao cliente qual componente falhou. Um 401 só pode ser emitido após a consulta e a verificação de credenciais serem concluídas normalmente (ou se a conta estiver explicitamente inativa após validação do estado).

**v2.0:** em sucesso, `Set-Cookie` contém um identificador aleatório e opaco de sessão, com `HttpOnly`, `SameSite=Lax` e `Secure` no ambiente HTTPS; no PostgreSQL fica apenas o hash do token. A resposta JSON continua contendo somente `id` e `login`, sem token, hash de senha ou perfis.

## 4. Endpoints de sessão (acréscimos da versão 2.0)

### GET /api/auth/me

- **200 OK:** sessão válida; resposta `{ "id": "UUID", "login": "...", "perfis": ["Colaborador"] }`. Os perfis devem refletir as permissões vigentes.
- **401 Unauthorized:** cookie ausente, sessão expirada, revogada ou usuário inativo: `{ "erro": "não autenticado" }` (verificar alinhamento da mensagem exata com middleware de sessão).
- **500/503:** falha inesperada ou banco de sessões indisponível, respectivamente; nunca mascarar infraestrutura como credencial inválida.

### POST /api/auth/logout

- **204 No Content:** revoga a sessão atual no servidor e limpa o cookie, sem corpo.
- **401 Unauthorized:** sessão ausente/inválida.
- **403 Forbidden:** origem não permitida pela proteção CSRF; corpo `{ "erro": "origem inválida" }` no projeto atual.
- **500/503:** erro interno ou serviço indisponível, respectivamente.

A validação de `Origin` usa a origem pública configurada; é necessário configurar `PUBLIC_ORIGIN` em produção e confirmar o fluxo de CSRF na homologação. Alterações de perfil e desligamentos exigem invalidação da sessão conforme RF09 da ERS (tratado no módulo de sessão, não criado pelo contrato).

## 5. Distinção obrigatória entre 401, 500 e 503

| Evento simulado | Resposta exigida | Justificativa |
|---|---|---|
| Usuário não encontrado (consulta executada com êxito) | 401, mensagem fixa | Negativa apurada |
| Usuário encontrado, senha incorreta | 401, mesma mensagem | Anti-enumeração |
| PostgreSQL fora do ar, pool sem conexão, timeout de conexão | 503, mensagem fixa | Não há decisão de autenticação |
| Erro inesperado no código ou falha não classificada | 500, mensagem fixa | Falha de processamento |

**Nunca** usar `catch (...) { return 401; }` para falhas internas. Logs técnicos devem registrar somente identificadores operacionais seguros, sem senha, hash, tokens ou SQL com parâmetros sensíveis. Para 503, aplicar monitoramento, alertas e recuperação sem revelar detalhes no JSON.

## 6. Compatibilidade e versionamento

A versão 1.0 da APS devolvia apenas identidade e **não criava sessão**. A versão 2.0 da Benigno adiciona cookie, endpoints de sessão e manutenção de estado — mudança explícita no contrato, com impacto em frontend, segurança, testes e documentação. Os códigos e mensagens de erro de login são preservados. A API continua usando `/api/auth/login` sem prefixo `/v2` por decisão desta proposta; clientes devem ser atualizados de forma coordenada antes da implantação, e a quebra de compatibilidade deve ser aprovada na revisão.

O desvio de 401 sem `WWW-Authenticate` registrado no item 2.5 da APS permanece documentado como escolha do contrato JSON, a ser revisado caso se adote esquema HTTP de autenticação padronizado.

## 7. Matriz de rastreabilidade

| Elemento | Origem | Evidência / verificação |
|---|---|---|
| Login JSON e contrato HTTP | APS-WEB 2.5 | OpenAPI `POST /api/auth/login` |
| Validação de formato e limites | APS RFD01/RFD02 | HTTP 400 e 413 |
| Resposta genérica e tempo comparável | APS RF04/RF06, RNF03, DA08 | Casos 401 em testes |
| Parametrização e conexão ao banco | APS 1.6, RNF04 | Repositório SQL e testes |
| Falha de repositório não é 401 | **APS RFD03** | Testes 503 e 500 |
| Sessão e revogação | ERS RF09, seção 4; adaptação Benigno | `Set-Cookie`, `/me`, `/logout` |
| Resposta ao navegador | ERS seção 4 | HTTPS/JSON e mapeamento de códigos |

## 8. Critérios de aceite para revisão

1. Login válido devolve 200 e corpo `{id, login}`, com cookie de sessão seguro em HTTPS.
2. Usuário inexistente e senha errada retornam o mesmo 401 e corpo; ambas realizam verificação Argon2id.
3. PostgreSQL indisponível retorna 503, sem 401.
4. Falha inesperada retorna 500, sem revelar stack trace ou dados de credenciais.
5. Corpo e taxa excedidos retornam 413 e 429 em JSON na configuração real do Nginx.
6. `GET /me` exige sessão válida; `POST /logout` revoga a sessão e elimina o cookie.
7. Revisão confirma TLS, política de sessão/CSRF e pontos de compatibilidade do contrato v2.0.

## 9. Escopo do teste executado

Este item de informação pode ser verificado por testes automatizados de regressão das regras do tratamento de erros no Node.js. **A conformidade operacional exige testes integrados** com PostgreSQL desligado, pool saturado, Nginx e navegador HTTPS. Nenhuma medição real de equivalência temporal foi realizada neste documento.

## 10. Fontes documentais

1. **APS-WEB — Projeto de software web para autenticação de usuários**, 18/11/2026, item 2.5 (contrato v1.0), item 2.1 (RFD03), item 1.6 e item 2.8.
2. **Benigno Soluções — Documentação definitiva v3**, ERS seção 4 (interfaces externas: API e servidor), RF09 e requisitos de segurança.
3. **Análise cruzada APS × Benigno Soluções**, 18/11/2026, especialmente a distinção de escopo de sessão.

**Nota de revisão:** o texto da seção 4 da ERS está incorporado aqui apenas nos pontos verificáveis da documentação acessível. Os detalhes concretos de `/me`, `/logout`, cookie e 403 representam o comportamento do **código integrado atualmente entregue**, não um texto literal da ERS.
