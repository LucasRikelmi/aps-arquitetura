# Apêndice I – Prompts submetidos à IA

Registro do uso de IA por item de informação, conforme a regra 8. A fonte de cada registro é o número do item e o seu autor. Cada registro recebe um número de seção (I.N), citado pelas entradas bibliográficas das ferramentas na lista de referências. Os campos **Ferramenta** e **Data de uso** reproduzem o que consta no arquivo do item em `aps/secoes/`; nenhum foi preenchido por inferência.

## Registro anterior aos itens

### I.1 Esboço do documento, repositório e quadro Kanban — Lucas

**Ferramenta:** Claude (Anthropic). Disponível em: claude.ai

**Data de uso:** 5 e 7 nov. 2026

**Prompts literais submetidos:**

1. "pode montar os artefatos e um esboço do documento" (com o PDF de definição da APS anexado)
2. "É exigido commits no repositório?"
3. "Ou pode ser as issues mesmo?"
4. "Como organizar o projeto do kanban pra permitir os commits e prs?"

**Resumo do Uso:** no prompt 1, a ferramenta produziu o esboço do documento (`esboco-aps.pdf`, 17 páginas) e nove diagramas em PNG e Mermaid, a partir do enunciado. O texto do esboço foi rascunhado pela ferramenta e serviu de ponto de partida para os itens, com a indicação de que a equipe deveria reescrevê-lo, revisá-lo e citar o uso. É o uso a que remete a entrada bibliográfica prevista no esboço, com acesso em 5 nov. 2026. Nos prompts 2 a 4, a ferramenta indicou que os artefatos precisam estar versionados no GitHub e recomendou que cada autor faça commit do próprio item, com revisão por pull request. Para o G1, sugeriu a proteção da `main` com uma aprovação obrigatória, uma issue por atividade da WBS, um quadro no GitHub Projects com as colunas Backlog, Em escrita, Em revisão e Concluído e movimentação automática, e o fluxo por item com branch própria, pull request com `Closes #N` e revisor designado.

**Observação:** os commits de 7 nov. 2026 que subiram ao repositório o esboço, os diagramas, a WBS, o template de issue e o manual do fluxo, registrados no histórico com autoria da ferramenta, pertencem a este mesmo uso.

## Itens da Seção 1

### I.2 Item 1.1 — Grazieli

**Ferramenta:** Claude Code (Anthropic). Disponível em: claude.ai/code

**Data de uso:** 17/11/2026

**Prompts literais submetidos para a elaboração deste item:**

1. "Resolva as três sub-issues do item 1.1: a versão do HTTP na conexão externa, a escolha da Figura 1 e os ajustes de redação apontados na revisão."

**Resumo do Uso:** empregada na revisão do item, para aplicar as sub-issues #27 (ajustes de redação apontados pelo revisor) e #29 (versão do HTTP na conexão externa). O prompt menciona também a escolha da Figura 1, objeto da sub-issue #28, que o registro do item não cita. O conteúdo foi conferido e assumido pela autora.

### I.3 Item 1.2 — Kamilly

**Ferramenta:** ChatGPT, da OpenAI. URL: https://chatgpt.com

**Data de uso:** 17/11/2026

**Prompts literais submetidos para a elaboração deste item:**

1. "CHATGPT - IA) PROMT: o que achou Os navegadores rodam encima da arquitetura cliente-servidor web. […]" — segue, no mesmo prompt, o texto-base redigido pela autora, com a conexão de internet, TCP/IP, DNS, HTTP, arquivos componentes e os quatro passos da requisição. Transcrição integral no bloco de código de `aps/secoes/1.2.md`.

**Resumo do Uso:** a ferramenta foi empregada para apreciar o texto-base redigido pela autora sobre o papel do navegador na arquitetura cliente-servidor. O prompt submete o texto inteiro e solicita avaliação. O retorno foi incorporado à redação do item.

### I.4 Item 1.3 — Kamilly

**Ferramenta:** ChatGPT, da OpenAI. URL: https://chatgpt.com

**Data de uso:** 17/11/2026

**Prompts literais submetidos para a elaboração deste item:**

1. "CHATPG - IA) PROMT: o que acha que precisa melhorar dessa parte O que é DNS? […]" — segue o texto-base da autora sobre DNS, IP e TCP, TLS e HTTPS. Transcrição integral em `aps/secoes/1.3.md`.

**Resumo do Uso:** a ferramenta foi empregada para indicar pontos de melhoria no texto-base redigido pela autora sobre os protocolos da camada de rede e de transporte e sobre o TLS. O retorno foi incorporado à redação do item.

### I.5 Item 1.4 — Kamilly

**Ferramenta:** ChatGPT, da OpenAI. URL: https://chatgpt.com

**Data de uso:** 17/11/2026

**Prompts literais submetidos para a elaboração deste item:**

1. "CHATPGT - AI) Melhore esse texto para mim? # 1.4 — Servidor Web (Nginx) O que é Nginx? […]" — segue o texto-base da autora cobrindo processos master e workers, porta 443, terminação TLS, arquivos estáticos, `proxy_pass`, `client_max_body_size`, `ngx_http_limit_req_module` e exemplo de configuração. Transcrição integral em `aps/secoes/1.4.md`.

**Resumo do Uso:** a ferramenta foi empregada para melhorar a redação do texto-base da autora sobre o servidor web. O retorno foi incorporado ao item, cujo limite de taxa foi depois ajustado ao RNF05 pelo PR #49.

### I.6 Item 1.5 — Grazieli

**Ferramenta:** Claude (Anthropic). Disponível em: https://claude.ai

**Data de uso:** 17/11/2026

**Prompts literais submetidos para a elaboração deste item:**

1. "revise a seguinte anotação: 1.5. Servidor de Aplicação […]" (com a anotação própria da autora sobre servidor de aplicação, características e Node.js/Express)
2. "descreva o pipeline de um middleware"
3. "atende corretamente? 1.5. Servidor de aplicação […]" (com a versão reescrita e os requisitos do esboço)
4. "1.5. Servidor de aplicação Autor(a): [ ] · Revisor(a): [ ] […]" (com a versão em citações numéricas e as oito referências)
5. "Segue a versão com os nomes informados e as citações por autor e data sem numeração das chamadas ou das referências […]"
6. "Realize os ultimos ajustes"
7. `retire as marcações das referencias do texto \ exemplo: "(Express, [20--]d)."`

Os prompts 1, 3, 4 e 5 trazem o item colado na íntegra; transcrição em `aps/secoes/1.5.md`.

**Resumo do Uso:** a ferramenta foi empregada em sete rodadas, da revisão da anotação própria da autora até o fechamento do item. O prompt 2 pediu a descrição do pipeline de middleware. Os prompts 3 a 5 reapresentaram o item para validação contra os requisitos do esboço, com a conferência das fontes oficiais do Node.js, do Express e do pacote `node-argon2`. Os prompts 6 e 7 trataram da forma das citações. O conteúdo foi conferido e assumido pela autora.

### I.7 Item 1.6 — Kamilly

**Ferramenta:** ChatGPT, da OpenAI. URL: https://chatgpt.com

**Data de uso:** 17/11/2026

**Prompts literais submetidos para a elaboração deste item:**

1. "CHATGPT - IA) PROMT O que acha que precisa melhorar para atender esses requisitos do item 1.6 1.6 — Sistema Gerenciador de Banco de Dados (SGBD) […]" — segue o texto-base da autora sobre SGBD, pool de conexões, consulta parametrizada com marcadores `$1`, e retorno ao driver com `rows`, `fields` e `rowCount`. Transcrição integral em `aps/secoes/1.6.md`.

**Resumo do Uso:** a ferramenta foi empregada para indicar pontos de melhoria no texto-base da autora contra o escopo do item (pool de conexões, consulta parametrizada e resultado retornado ao driver). O retorno foi incorporado ao item mesclado pelo PR #42.

### I.8 Item 1.7 — Lucas

**Ferramenta:** Claude Code (Anthropic). Disponível em: claude.ai/code

**Data de uso:** 17/11/2026

**Prompts literais submetidos para a elaboração deste item:**

1. "Vamos começar pelos itens sob minha responsabilidade. Antes, levante o que falta: o que está pendente entre os itens já iniciados e o que ainda não foi iniciado."
2. "Vamos concluir o item 1.7 (PR #34)." (revisão)

**Resumo do Uso:** texto redigido pela ferramenta a partir do esboço do documento (item 1.7) e da Figura 2, e ajustado depois aos itens 1.2, 1.3, 1.4 e 1.6 já mesclados, para revisão do autor.

## Itens da Seção 2

### I.9 Item 2.1 — André

**Ferramenta:** Claude, assistente de IA da Anthropic. URL: https://claude.ai

**Data de uso:** 17 nov. 2026

**Prompts literais submetidos para a elaboração deste item:**

1. "Vamos começar o 2.1. Deixa eu pegar os contextos aqui"
2. "O que fizeram até agora. Vamos começar minha parte no 2.1" (com os itens 1.2, 1.3 e 1.6, escritos por outros membros da equipe, anexados)
3. "Verifique agora possíveis erros que isso possa ter. […] Vamos verificar em relação a esse viés. Esses requisitos em si, né? É bom colocar requisitos externos, né? Que não necessariamente são solicitados, mas são necessários, entende? […] E ver a validade desses requisitos. Realmente, algum deles não pode gerar mais requisitos? Uma questão, o trabalho é obrigatório ter essa quantidade de requisitos ou posso pegar mais? Pelo que eu vi que é definição de requisitos, eu tenho que definir esses requisitos." (transcrição de ditado por voz)
4. "Algum outro adendo sobre o arquivo?"
5. "Me explique melhor sobre o fora do escopo"
6. "Coloque no escopo a questão do token"
7. "Antes de finalizar a 2.7. Vamos fazer os ajustes nas anteriores:" (com as capturas da revisão do pull request)

Material anexado anteriormente na mesma sessão: enunciado da APS, documento de quebra de escopo e atribuição da equipe e esboço do documento.

**Resumo do Uso:** a ferramenta foi empregada na redação do item a partir do Apêndice A do enunciado, do esboço e das definições comuns acordadas pela equipe em 17/11. Partiram de questionamento ou decisão do autor: a separação entre requisitos declarados (RF) e derivados (RFD), a seção de premissas e dependências externas, a verificação que identificou a inversão entre HTTP e TLS no RNF01, a ausência de fonte no RNF06 e o uso indevido da NIST SP 800-63B no RNF05, a delimitação do objeto de retorno e a manutenção da premissa P02 como dependência externa. Os parâmetros do Argon2id e o limite de falhas consecutivas foram verificados nas fontes antes da incorporação. Conteúdo conferido e assumido pelo autor.

### I.10 Item 2.2 — André

**Ferramenta:** Claude, assistente de IA da Anthropic. URL: https://claude.ai

**Data de uso:** 17 nov. 2026

**Prompts literais submetidos para a elaboração deste item:**

1. "Vamos para o 2.2? Ou falta algo?"
2. "Vamos para o 2.2. Me dê uma revisão sobre ele e o que deve ter feito de acordo com a documentação oficial"
3. "Me explique do inicio como funciona a 2.2 e todo seu papel, me dê um auxilio."
4. "Não tome decisões sem minha permissão. Por que definiu a arquitetura sozinho? Vamos montar do 0 e me diga pontos a serem considerados com base em nosso escopo e atividades de outros colegas."
5. "Confesso que estou perdido e tendo dificuldade de entender cada um desses pontos, explique de uma forma mais didática […]"
6. "vamos abrir a norma e entender e conferir" (entre as respostas a quatro perguntas de múltipla escolha, nas quais o autor decidiu registrar oito decisões em vez de cinco, adotar quatro camadas na DA01 e manter as interfaces da DA03)

Material anexado anteriormente na mesma sessão: enunciado da APS, documento de quebra de escopo e atribuição, esboço do documento e o item 2.1 já elaborado.

**Resumo do Uso:** a ferramenta foi empregada na redação do registro de decisões a partir do registro preliminar do esboço (DA01 a DA05) e dos requisitos definidos em 2.1. Partiram de observação do autor: a coluna de consequência aceita, a resolução da tensão entre DA01 e DA03, a realocação da DA06 para o registro de decisões, a coluna de referência e a correção de duas afirmações sem fonte, e a interrupção do trabalho por decisões promovidas sem consulta. Por determinação do autor, a edição vigente da ISO/IEC/IEEE 42010 foi conferida antes da citação: confirmou-se a retirada da edição de 2011, a vigência da de 2022, a mudança de título e as cláusulas 5.2.12 e 6.10; o texto integral é de acesso pago e a citação limita-se ao verificado. Conteúdo conferido e assumido pelo autor.

### I.11 Item 2.3 — André

**Ferramenta:** Claude, assistente de IA da Anthropic. URL: https://claude.ai

**Data de uso:** 17 nov. 2026

**Prompts literais submetidos para a elaboração deste item:**

1. "vamos para os próximos itens?"
2. "Terminamos o 2.1 e 2.2"
3. "É dentro" (resposta à consulta sobre a posição do servidor web na fronteira do sistema)
4. "Antes de finalizar a 2.7. Vamos fazer os ajustes nas anteriores:" (com as capturas da revisão do PR pelo revisor do item)

Material anexado anteriormente na mesma sessão: enunciado da APS, documento de quebra de escopo e atribuição, esboço do documento e os itens 2.1 e 2.2 já elaborados.

**Resumo do Uso:** a ferramenta foi empregada na redação do item a partir do escopo definido em 2.1 e das decisões registradas em 2.2. A definição estruturante partiu do autor: a ferramenta apresentou as duas soluções defensáveis para a posição do servidor web e o autor decidiu mantê-lo dentro da fronteira, porque o 2.1 lhe atribui o RNF05 e o RNF06 e uma restrição aplicada por elemento externo seria premissa sobre o ambiente, não restrição do sistema. Decorrem dessa decisão a composição da seção de fronteira, a exclusão do servidor web dos atores externos e o número de travessias. Da revisão resultaram a inserção da Figura 3 com legenda e fonte, a correção de duas para três travessias e a numeração da tabela.

### I.12 Item 2.4 — Kamilly

**Ferramenta:** ChatGPT, da OpenAI. URL: https://chatgpt.com

**Data de uso:** 17 nov. 2026

**Prompts literais submetidos para a elaboração deste item:**

1. "Faça as alterações necessárias no item 2.4: troque PostgreSQLUserRepository por PgUserRepository, inclua o AuthController na camada de apresentação, insira a Figura 4 pelo caminho informado, acrescente a fonte abaixo da tabela e padronize as fontes."

Material fornecido como referência: item 2.2 (decisões arquiteturais), Figura 4 e orientações de revisão do item 2.4.

**Resumo do Uso:** a ferramenta foi empregada na aplicação dos ajustes apontados na revisão do item: nomenclatura do repositório alinhada à DA03, inclusão do `AuthController` na camada de apresentação, inserção da Figura 4, fonte abaixo da Tabela 5 e padronização do formato das fontes.

### I.13 Item 2.5 — Grazieli

**Ferramenta:** Claude Code (Anthropic). Disponível em: claude.ai/code

**Data de uso:** 18/11/2026

**Prompts literais submetidos para a elaboração deste item:**

1. "sobre o item 2.5, verifique se a descrição da api foi feita de forma adequada e indique os pontos que estão incorretos" (com o item 2.5 e o documento consolidado anexados)
2. "valide também com o esboço" (com o esboço da APS anexado)
3. "sim, redija a versão corrigida do 2.5" (revisão)
4. "configurar texto commit no github, use como padrão" (formatação, com o item 1.7 em Markdown como modelo)
5. "tire o que é referente a 2.7" (ajuste)
6. "adicione o que for de 2.5 para trás como ref" (ajuste)

**Resumo do Uso:** a ferramenta foi empregada na verificação do contrato da API contra o esboço e o documento consolidado e na redação da versão corrigida. Em resposta a quatro perguntas de múltipla escolha, o autor decidiu: adotar no 429 o corpo já configurado no item 1.4; definir corpo JSON para o 413, com o ajuste correspondente no 1.4; fixar em 128 caracteres o comprimento máximo da senha; e manter o 401 sem o cabeçalho `WWW-Authenticate`, registrando o desvio da RFC 9110. O autor determinou também que o item remeta apenas aos itens anteriores a ele. Partiram da ferramenta, sem pergunta específica: o 503 para indisponibilidade do repositório e o 500 para as demais falhas, a numeração da versão como 1.0 e o tratamento de Content-Type incorreto como 400. As fontes citadas foram conferidas nas páginas oficiais em 18/11/2026.

### I.14 Item 2.6 — Kamilly

**Ferramenta:** ChatGPT, da OpenAI. URL: https://chatgpt.com

**Data de uso:** 17 nov. 2026

**Prompts literais submetidos para a elaboração deste item:**

1. "Lembra sobre o uqe estavamos falando? melhore o texto com base naquele texto que te pedi para ver se atendia os requisitos e se estava bom (2.4). Agora verificar se esta bom e atende os requisitoos do 2.6. nao inventa bobeira."

Material fornecido como referência: item 2.2 (decisões arquiteturais) e documento de atribuições reorganizadas da APS.

**Resumo do Uso:** a ferramenta foi empregada na primeira versão do item e, na revisão, no alinhamento dos tipos dos campos à Figura 5, na aplicação da premissa P02 do item 2.1 para a normalização do login, na inserção da imagem com legenda, na fonte abaixo da tabela e na padronização das seções de fontes, autoria e uso de IA.

### I.15 Item 2.7 — André

**Ferramenta:** Claude, assistente de IA da Anthropic. URL: https://claude.ai

**Data de uso:** 17 nov. 2026

**Prompts literais submetidos para a elaboração deste item:**

1. "Vamos voltar para o 2.7"
2. Respostas a três perguntas de múltipla escolha, nas quais o autor decidiu dividir o item em 2.7a e 2.7b, manter a Figura 7 sem o caminho de indisponibilidade do repositório e não manifestar preferência quanto à representação do hash fictício na Figura 9
3. Envio das Figuras 6, 7, 8 e 9 do repositório, sem texto acompanhante
4. "Antes de finalizar a 2.7. Vamos fazer os ajustes nas anteriores:" (com as capturas da revisão dos itens anteriores)
5. "Tem que colocar o link das figuras."
6. "Vamos reunir o 2.7 em um arquivo, por favor"

Material anexado anteriormente na mesma sessão: enunciado da APS, documento de quebra de escopo e atribuição, esboço do documento e os itens 2.1, 2.2 e 2.3 já elaborados.

**Resumo do Uso:** a ferramenta foi empregada na redação do texto explicativo a partir das figuras já existentes no repositório, produzidas pela equipe, e dos requisitos e decisões definidos em 2.1 e 2.2. As figuras não foram criadas nem alteradas. Partiram de decisão do autor: o formato do item, dividido e depois reunido em arquivo único para manter a convenção de um arquivo por item da WBS; o recorte da Figura 7, sem o caminho de indisponibilidade; e a declaração expressa da ausência do servidor web nas Figuras 8 e 9, identificada pela ferramenta, para que a omissão conste como escolha de nível de detalhe e não como divergência entre figuras. Conteúdo conferido e assumido pelo autor.

### I.16 Item 2.8 — André

**Ferramenta:** Claude, assistente de IA da Anthropic. URL: https://claude.ai

**Data de uso:** 17 nov. 2026

**Prompts literais submetidos para a elaboração deste item:**

1. "vamos para 2.8"
2. "e 2.8 está ok?"
3. Pedidos sucessivos de nova verificação, submetidos literalmente como: "revise novamente"; "Revise pela terceira vez"; "faça pela 4 vez"; "revise novamente"; "novamente"; "dnv"; "vamos novamente"; "Novamente"

Material anexado anteriormente na mesma sessão: enunciado da APS, documento de quebra de escopo e atribuição, esboço do documento e os itens 2.1, 2.2, 2.3 e 2.7 já elaborados.

**Resumo do Uso:** a ferramenta foi empregada na redação deste item a partir da tabela preliminar de ameaças constante do esboço da APS e dos requisitos, decisões e figuras definidos nos itens anteriores.

A tabela do esboço trazia seis linhas. As cinco acrescentadas decorrem de requisitos e decisões definidos durante a elaboração dos itens 2.1 e 2.2, que o esboço não cobria: a quebra do hash por força bruta sobre banco vazado, a enumeração pelo tempo de resposta como ameaça distinta da enumeração pela resposta, a negação de serviço pelo custo do hash, a negação de serviço por corpo grande e a exposição de detalhe interno em mensagem de erro.

A seção de riscos residuais decorre da orientação do autor, registrada no item 2.1, de que condições não cobertas pela solução devem constar do documento em vez de permanecerem implícitas.

O autor determinou sucessivas rodadas de verificação do item, das quais resultaram as correções abaixo.

- Inclusão das citações das fontes no corpo, que constavam da lista sem citação no texto.
- Retirada da afirmação de que a segurança de infraestrutura constaria das premissas do item 2.1, o que não ocorre.
- Realocação da citação sobre mensagens de erro para o parágrafo que ela sustenta.
- Condicionamento da afirmação sobre dado pessoal à legislação aplicável.
- Inclusão da classe do erro entre os campos registrados, sem a qual a política de registro não sustentava o diagnóstico prometido no tratamento de erros.
- Separação entre o registro feito pelo servidor web e o feito pelo servidor de aplicação, que se contradiziam quanto ao endereço de origem.
- Correção da mitigação de negação de serviço, que atribuía ao limite de comprimento dos campos um efeito que ele não produz, dado que o custo do Argon2id decorre dos parâmetros e não do tamanho da entrada.
- Retirada, da seção de riscos residuais, de uma lacuna de documentação que não constitui risco de segurança e já estava declarada no item 2.7.
- Declaração do trânsito da senha em texto claro no salto interno, que a tabela de ameaças não registrava.
- Correção da remissão que atribuía à DA01 o registro da hipótese de implantação em hosts distintos, que consta do item 1.1.

O conteúdo foi conferido e assumido pelo autor.

## Itens de gestão

### I.17 Itens G1 e G2 — Lucas

**Ferramenta:** Claude Code (Anthropic). Disponível em: claude.ai/code

**Data de uso:** 17/11/2026

**Prompts literais submetidos para a elaboração destes itens:**

1. "Vamos começar pelos itens sob minha responsabilidade. Antes, levante o que falta: o que está pendente entre os itens já iniciados e o que ainda não foi iniciado."

**Resumo do Uso:** levantamento das pendências dos itens já iniciados e dos ainda não iniciados, a partir do qual foram redigidos o registro de infraestrutura da equipe (G1) e as premissas adotadas (G2), para revisão do autor. A montagem do repositório e do quadro Kanban, em 5 e 7 nov. 2026, consta do registro I.1.

### I.18 Itens G3 e G4 — Lucas

**Ferramenta:** Claude (Anthropic). Disponível em: claude.ai

**Data de uso:** 17/11/2026

**Prompts literais submetidos para a elaboração destes itens:**

1. "A partir da exportação das conversas do grupo de WhatsApp da equipe, elaborar os registros de comunicação (G3) e o monitoramento de compromissos (G4)."

**Resumo do Uso:** organização do registro a partir das conversas, para revisão do autor.
