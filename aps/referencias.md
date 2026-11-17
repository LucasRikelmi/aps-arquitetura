# Referências

Autor(a): Lucas · Revisor(a): Lucas

Lista consolidada em ABNT (regra 6). Só entram na lista final as referências citadas no corpo de algum item; o ponto de citação fica anotado ao lado de cada uma, para conferência no G7. Na versão final (G8), a lista sai em ordem alfabética, sem a coluna "Citada em".

## Como citar no corpo do item

- Chamada no texto pelo sistema autor-data, como no item 1.1: (NGINX, [20--]), (FIELDING; NOTTINGHAM; RESCHKE, 2022).
- Página sem data de publicação: `[20--]`. Norma viva, como o Fetch Standard: data de atualização exibida na página no dia do acesso.
- Toda referência on-line leva "Disponível em:" e "Acesso em:" com a data em que o autor consultou a página.
- Quem citar uma referência da Parte B a move para a Parte A no PR do próprio item e preenche a data de acesso.

## Parte A – Citadas em itens já mesclados

| Referência | Citada em |
|---|---|
| EXPRESS. *Using middleware*. [20--]. Disponível em: https://expressjs.com/en/guide/using-middleware.html. Acesso em: 10 nov. 2026. | 1.1 |
| NGINX. *Module ngx_http_proxy_module*. [20--]. Disponível em: https://nginx.org/en/docs/http/ngx_http_proxy_module.html. Acesso em: 10 nov. 2026. | 1.1 |
| NODE.JS. *Don't Block the Event Loop (or the Worker Pool)*. [20--]. Disponível em: https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop. Acesso em: 10 nov. 2026. | 1.1 |
| POSTGRESQL GLOBAL DEVELOPMENT GROUP. *PostgreSQL Documentation*. [20--]. Disponível em: https://www.postgresql.org/docs/. Acesso em: 10 nov. 2026. | 1.1 |

## Parte B – Candidatas, previstas no esboço e nos rascunhos

Título, autoria e data conferidos na página oficial em 17/11/2026. A coluna "Item previsto" vem do esboço; a referência só entra na Parte A quando o item a citar.

| Referência | Item previsto |
|---|---|
| FIELDING, R.; NOTTINGHAM, M.; RESCHKE, J. (ed.). *HTTP Semantics*. RFC 9110. [S. l.]: IETF, jun. 2022. Disponível em: https://www.rfc-editor.org/rfc/rfc9110. Acesso em: [data]. | 1.2, 2.5 |
| WHATWG. *Fetch Standard*. Living Standard. Disponível em: https://fetch.spec.whatwg.org/. Acesso em: [data]. | 1.2 |
| MOCKAPETRIS, P. *Domain names: concepts and facilities*. RFC 1034. [S. l.]: IETF, nov. 1987. Disponível em: https://www.rfc-editor.org/rfc/rfc1034. Acesso em: [data]. | 1.3 |
| EDDY, W. (ed.). *Transmission Control Protocol (TCP)*. RFC 9293. [S. l.]: IETF, ago. 2022. Disponível em: https://www.rfc-editor.org/rfc/rfc9293. Acesso em: [data]. | 1.3 |
| RESCORLA, E. *The Transport Layer Security (TLS) Protocol Version 1.3*. RFC 9846. [S. l.]: IETF, jul. 2026. Disponível em: https://www.rfc-editor.org/rfc/rfc9846. Acesso em: [data]. | 1.3, 1.4, 2.8 |
| NGINX. *Module ngx_http_limit_req_module*. [20--]. Disponível em: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html. Acesso em: [data]. | 1.4 |
| NGINX. *Module ngx_http_core_module*. [20--]. Disponível em: https://nginx.org/en/docs/http/ngx_http_core_module.html. Acesso em: [data]. | 1.4 |
| NGINX. *Configuring HTTPS servers*. [20--]. Disponível em: https://nginx.org/en/docs/http/configuring_https_servers.html. Acesso em: [data]. | 1.4 |
| BIRYUKOV, A.; DINU, D.; KHOVRATOVICH, D.; JOSEFSSON, S. *Argon2 Memory-Hard Function for Password Hashing and Proof-of-Work Applications*. RFC 9106. [S. l.]: IETF, set. 2021. Disponível em: https://www.rfc-editor.org/rfc/rfc9106. Acesso em: [data]. | 2.2, 2.6, 2.7 |
| OWASP. *Password Storage Cheat Sheet*. [20--]. Disponível em: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html. Acesso em: [data]. | 2.1, 2.2, 2.8 |
| OWASP. *Authentication Cheat Sheet*. [20--]. Disponível em: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html. Acesso em: [data]. | 2.1, 2.8 |
| ISO/IEC/IEEE. *42010:2022 – Software, systems and enterprise — Architecture description*. 2. ed. Genebra: ISO/IEC; IEEE, 2022. 62 p. Disponível em: https://www.iso.org/standard/74393.html. Acesso em: 17 nov. 2026. | 2.2 (citada no PR #45; passa à Parte A no merge) |

### Observações da conferência

- **ISO/IEC/IEEE 42010: edição de 2022.** O esboço usa o título da edição de 2011 (*Systems and software engineering – Architecture description*), que a página da ISO marca como retirada. A edição vigente é a 42010:2022 (2. ed., nov. 2022, 62 p.), com o título *Software, systems and enterprise — Architecture description*. A entrada segue a forma usada no item 2.2. As cláusulas 5.2.12 e 6.10 citadas no 2.2 não foram conferidas aqui, porque a página pública da ISO não traz o sumário.

- **TLS 1.3: RFC 9846 no lugar da RFC 8446.** O esboço cita a RFC 8446 (2018). A página da RFC 8446 no RFC Editor informa que ela foi tornada obsoleta pela RFC 9846 (jul. 2026), que mantém o mesmo protocolo (TLS 1.3, mesmo número de versão, compatível com a anterior). Recomenda-se citar a RFC 9846 nos itens 1.3, 1.4 e 2.8. Se um item já tiver citado a 8446, basta indicar "RFC 8446, tornada obsoleta pela RFC 9846".
- **Nginx e TLS 1.3.** A página *Configuring HTTPS servers* informa que, a partir da versão 1.27.3, o padrão do Nginx é `ssl_protocols TLSv1.2 TLSv1.3`. Como a pilha adota só TLS 1.3, o item 1.4 deve configurar `ssl_protocols TLSv1.3` explicitamente.
- **Limite de taxa: 429 não é o padrão.** A página do `ngx_http_limit_req_module` informa que `limit_req_status` responde 503 por padrão. Para manter o 429 das definições comuns, o item 1.4 deve configurar `limit_req_status 429`.
- **Limite de corpo.** A página do `ngx_http_core_module` confirma que `client_max_body_size` responde 413 e que o padrão é 1 MB.

## Lacunas

Referências que aparecem no esboço mas não entram na lista até que um item as cite e alguém confirme a edição. A ISO/IEC/IEEE 42010 saiu desta tabela: a edição de 2011, citada no esboço, está retirada (página da ISO), e a vigente, de 2022, entrou na Parte B.

| Referência no esboço | Situação |
|---|---|
| NIST SP 800-63B (*Digital Identity Guidelines – Authentication and Lifecycle Management*) | Existe a revisão 4 publicada em https://pages.nist.gov/800-63-4/sp800-63b.html, mas a página consultada não informa autores nem data formal de publicação. Falta confirmar os dados no registro oficial do NIST (DOI) antes de citar. |
| ISO/IEC/IEEE 12207:2026 (*Software life cycle processes*) | Edição de 2026 não confirmada. Não citar até conferir no catálogo da ISO. |

Nenhum item mesclado cita essas duas normas até 17/11. Se nenhum item as citar, saem da lista final.

## Parte C – Uso de IA

As entradas de IA (regra 8) seguem o modelo abaixo e são montadas no G5 a partir das seções "Uso de IA" de cada item, com a questão remetendo ao Apêndice I.

ORGANIZAÇÃO. *Ferramenta*. Assistente de IA. Disponível em: URL. Acesso em: data. Questão: Apêndice I, Seção I.N.

Entrada já prevista no esboço: ANTHROPIC. *Claude*. Assistente de IA. Disponível em: claude.ai. Acesso em: 5 nov. 2026. Questão: Apêndice I, Seção I.1.

## Uso de IA

Ferramenta: Claude Code (Anthropic). Disponível em: claude.ai/code. Data: 17/11/2026.

Prompt (versão inicial): "Vamos começar pelos itens sob minha responsabilidade. Antes, levante o que falta: o que está pendente entre os itens já iniciados e o que ainda não foi iniciado."

Prompt (revisão): "Considere apenas os itens de minha autoria, sem a revisão, que será feita com a equipe. Monte uma tabela e trate cada issue separadamente, registrando o texto em comentário na própria issue e abrindo os PRs quando necessário."

Uso: lista montada pela ferramenta a partir do item 1.1, da lista de referências do esboço e dos rascunhos anexados às issues. Na revisão, a ferramenta conferiu título, autoria e data de cada referência da Parte B na página oficial e registrou as observações e lacunas acima.
