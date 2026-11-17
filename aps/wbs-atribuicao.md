# APS – Quebra de escopo e tarefas para atribuição

**Prazo final:** 17/11 (PDF fechado). Entrega e apresentação em 18–19/11.
**Regras de atribuição:** autor ≠ revisor no mesmo item; todo membro precisa ser autor de ≥1 item e revisor de ≥1 item; registrar cada atribuição numa issue do GitHub (é evidência para a nota individual).

Esforço: P ≈ 1–2 h · M ≈ 3–4 h · G ≈ 5–8 h. "Dep." = depende de.

## Pacote 0 – Gestão e transversais (começa hoje, 06/11)

| Id | Atividade | Escopo / tarefas | Saída | Esf. | Prazo | Dep. |
|---|---|---|---|---|---|---|
| G1 | Infraestrutura da equipe | Criar repo GitHub, quadro Kanban (Projects), uma issue por item desta lista; convidar a docente no GitHub e no Discord; subir `aps/` (esboço + diagramas). | Repo + Kanban + Discord | P | 07/11 | – |
| G2 | Pergunta formal à docente | Perguntar: (a) objeto de retorno é só identidade ou token/sessão? (b) pode fixar pilha concreta? (c) formato de citação de IA quando o prompt inclui o PDF do enunciado. Registrar resposta. | Mensagem + resposta arquivada | P | 07/11 | G1 |
| G3 | Atas e registros | Ata curta de cada reunião síncrona (data, presentes, decisões, pendências, responsável); exportar trechos do Discord. Inclui reconstruir o que houve desde 22/10. Rotativo. | Apêndice II | P/semana | contínuo | G1 |
| G4 | Monitoramento de compromissos | Revisão do Kanban 2×/semana; registrar atrasos com data (exigido no Apêndice B). | Comentários nas issues | P | contínuo | G1 |
| G5 | Registro de uso de IA | Coletar de todos os membros os prompts usados, literalmente, com data e ferramenta; montar Apêndice I e entradas na bibliografia. | Apêndice I + referências IA | M | 15/11 | todos |
| G6 | Referências | Conferir cada referência (edição, ano, URL, data de acesso), padronizar ABNT, garantir que toda referência listada é citada no texto e vice-versa. | Lista de referências | M | 15/11 | itens 1.x, 2.x |
| G7 | Integração e consistência | Ler o documento inteiro: termos iguais nas duas seções, mesma pilha, numeração de figuras/tabelas, links internos, sem redundância entre 1.7 e 1.2–1.6. | Documento integrado | G | 16/11 | todos os itens |
| G8 | Formatação e PDF final | Template (fonte, justificado, espaçamento, sumário, cabeçalho com autores A–Z), legendas e fonte das figuras, exportar PDF. | PDF final | M | 17/11 | G7 |
| G9 | Apresentação | Slides + divisão de fala (todos falam). | Slides | M | 17/11 | G7 |

## Pacote 1 – Seção 1: Ambiente operacional Web

Decidir a pilha (item 1.1) **antes** de qualquer outro item das Seções 1 e 2.

| Id | Item | Escopo / tarefas | Saída | Esf. | Prazo | Dep. |
|---|---|---|---|---|---|---|
| 1.1 | Visão geral e pilha | Justificar a pilha (Nginx, Node/Express, PostgreSQL ou outra); papel de cada software de apoio; ajustar Figura 1. | Texto + Fig. 1 | M | 08/11 | G2 |
| 1.2 | Browser | Como o browser é acionado (URL, HTML, DOM, JS, `fetch`); estrutura da requisição HTTP gerada; tratamento da resposta; CORS e cookies só se usados. | Texto | M | 11/11 | 1.1 |
| 1.3 | Rede: DNS, TCP, TLS | Resolução DNS, handshake TCP, handshake TLS 1.3 e certificado; por que HTTPS é obrigatório aqui. | Texto | M | 11/11 | 1.1 |
| 1.4 | Servidor web | Processo master/workers, escuta na 443, terminação TLS, arquivos estáticos, `proxy_pass`, limites (tamanho, taxa → 429). Trecho de config ilustrativo. | Texto + config | M | 11/11 | 1.1 |
| 1.5 | Servidor de aplicação | Como é iniciado; como recebe a requisição do proxy; event loop; middlewares; roteamento; objeto de resposta; custo de CPU do hash. | Texto | G | 11/11 | 1.1 |
| 1.6 | SGBD | Pool de conexões, consulta parametrizada, resultado retornado ao driver. | Texto | P | 11/11 | 1.1 |
| 1.7 | Ciclo completo | Narrar os passos numerados da Figura 2 referenciando 1.2–1.6 sem repetir conteúdo. | Texto + Fig. 2 | M | 12/11 | 1.2–1.6 |

## Pacote 2 – Seção 2: Projeto da aplicação de autenticação

| Id | Item | Escopo / tarefas | Saída | Esf. | Prazo | Dep. |
|---|---|---|---|---|---|---|
| 2.1 | Requisitos e escopo | RF01–RF06 rastreados ao Apêndice A; RNF01–RNF05 com justificativa e fonte; lista "fora do escopo"; incorporar resposta da docente (G2). | Tabelas 2 e 3 | M | 09/11 | G2 |
| 2.2 | Decisões arquiteturais | Revisar DA01–DA05; para cada uma, alternativa descartada e motivo com referência. | Tabela 4 | M | 10/11 | 2.1 |
| 2.3 | Contexto | Fronteiras do sistema e atores; Figura 3. | Texto + Fig. 3 | P | 10/11 | 2.1 |
| 2.4 | Componentes | Responsabilidade e camada de cada componente; Figura 4 e Tabela 5; coerência com 1.5. | Texto + Fig. 4 | M | 11/11 | 2.2 |
| 2.5 | Contrato da API | Endpoint, payload, limites de tamanho, códigos 200/400/401/429, corpos de erro. | Tabela 6 | P | 11/11 | 2.1 |
| 2.6 | Modelo de dados | Tabela `usuario`, unicidade e normalização do login, formato do hash; Figura 5. | Texto + Fig. 5 | P | 11/11 | 2.2 |
| 2.7 | Desenho detalhado | Diagrama de classes, fluxo de decisão e sequências sucesso/falha (Figs. 6–9); explicar cada figura e quais RF/RNF atende. Item mais pesado: pode ser dividido em 2.7a (classes + decisão) e 2.7b (sequências). | Texto + Figs. 6–9 | G | 12/11 | 2.4, 2.5, 2.6 |
| 2.8 | Segurança e erros | Tabela de ameaças × mitigações, cada linha apontando o item onde a mitigação aparece; política de logs. | Tabela 7 | M | 12/11 | 2.4–2.7 |

## Janela de revisão

| Período | Atividade |
|---|---|
| 13–14/11 | Revisão cruzada de todos os itens, com comentários registrados em PR ou issue no GitHub. |
| 15/11 | Autores incorporam as correções; revisor dá o aceite na issue. |
| 16–17/11 | G6, G7, G8, G9. |

## Sugestão de distribuição (ajuste ao tamanho da equipe)

Com **4 membros (A, B, C, D)**, a carga fica equilibrada assim:

| Membro | Autor de | Revisor de |
|---|---|---|
| A | 1.1, 1.5, 1.7, G7 | 2.1, 2.4, 2.8 |
| B | 1.2, 1.3, 1.4, 1.6, G5 | 2.2, 2.5, 2.6, 2.7 |
| C | 2.1, 2.2, 2.3, 2.8, G6 | 1.1, 1.5, 1.6, 1.7 |
| D | 2.4, 2.5, 2.6, 2.7, G8 | 1.2, 1.3, 1.4 |

Rotativos: G1 (quem tiver mais tempo esta semana), G3 e G4 (rodízio semanal), G9 (todos).
O cruzamento entre seções (quem escreve na Seção 1 revisa a Seção 2) é intencional: força cada pessoa a conhecer o documento inteiro, o que melhora a consistência e prepara todos para a apresentação.

## Resumo por membro (equipe de 4)

| Membro | Perfil | Autor de | Revisor de | Extras | Carga estimada |
|---|---|---|---|---|---|
| A | Núcleo da Seção 1 e integração | 1.1, 1.5, 1.7, G7 | 2.1, 2.4, 2.8 | – | ~20 h (pessoa com mais disponibilidade) |
| B | Infra Web e registro de IA | 1.2, 1.3, 1.4, 1.6, G5 | 2.2, 2.5, 2.6, 2.7 | G1 | ~16 h |
| C | Requisitos e segurança | 2.1, 2.2, 2.3, 2.8, G6 | 1.1, 1.5, 1.6, 1.7 | G2 | ~16 h |
| D | Desenho detalhado e formatação | 2.4, 2.5, 2.6, 2.7, G8 | 1.2, 1.3, 1.4 | – | ~16 h |

Todos: G3 e G4 em rodízio semanal; G9 (apresentação).
