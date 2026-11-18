# aps-arquitetura
APS - Arquitetura Web (SoftwareWeb.log)

O fluxo original está no [CONTRIBUTING.md](CONTRIBUTING.md). Este README registra a reorganização de 17/11/2026. Até a entrega, ela vale no lugar das atribuições e da regra de revisão do CONTRIBUTING.

## Links

- Quadro Kanban: https://github.com/users/LucasRikelmi/projects/1
- Issues: https://github.com/LucasRikelmi/aps-arquitetura/issues
- Pull requests: https://github.com/LucasRikelmi/aps-arquitetura/pulls

## Reorganização de 17/11/2026

Com o prazo próximo, redistribuí as tarefas para fechar o documento a tempo. Anunciei a mudança no grupo em 16/11, às 21h, e ela foi registrada aqui em 17/11. A entrega e a apresentação são em 18/11.

### Como era

- A WBS de 07/11 (`aps/wbs-atribuicao.md`) dava a cada membro de 5 a 6 itens como autor e 5 como revisor, com revisão cruzada entre as Seções 1 e 2.
- Cada PR precisava da aprovação do revisor do item, e o próprio autor fazia o merge.
- G3 e G4 eram em rodízio, e o G9 era de todos.

### Como fica

- Revisão: eu reviso todos os PRs e faço todos os merges. O `.github/CODEOWNERS` me coloca como revisor de qualquer PR.
- Prazos: PR aberto até 18h de 17/11. Revisão e merge até 23h.
- Ajustes: peço as mudanças por sugestão no próprio PR, e o autor aplica na mesma branch.
- Uso de IA: cada item registra no fim do arquivo, sob `## Uso de IA`, a ferramenta, a URL, a data e o prompt literal. A Grazieli junta tudo no Apêndice I (G5) em 18/11.
- Arquivos: cada item fica em `aps/secoes/<id>.md`, e as figuras entram no PR do item, em `aps/diagramas/`.
- Itens coletivos: G3, G4 e G6 ficam comigo. O G9 (slides) fica com a Grazieli, e todos apresentam.

Sobre a regra 7 do enunciado: ela pede que cada membro seja autor e revisor de algum item, com autor diferente do revisor. Com revisor único, nem todos terão revisão registrada, e nos meus itens autor e revisor são a mesma pessoa. Optamos por isso para cumprir o prazo, cientes do ponto.

### Quem faz o quê

| Membro | Issues |
|---|---|
| Lucas | #1 G1 Infraestrutura, #2 G2 Premissas, #3 G3 Registros, #4 G4 Monitoramento, #6 G6 Referências, #7 G7 Integração, #8 G8 PDF final, #16 1.7 Ciclo completo |
| Grazieli | #10 1.1 Visão geral e pilha, #14 1.5 Servidor de aplicação, #21 2.5 Contrato da API, #5 G5 Registro de IA, #9 G9 Apresentação |
| Kamilly | #11 1.2 Browser, #12 1.3 Rede, #13 1.4 Servidor web, #15 1.6 SGBD, #20 2.4 Componentes, #22 2.6 Modelo de dados |
| André | #17 2.1 Requisitos, #18 2.2 Decisões arquiteturais, #19 2.3 Contexto, #23 2.7 Desenho detalhado, #24 2.8 Segurança e erros |

### Definições comuns

| Tema | Definição |
|---|---|
| Pilha | Nginx (servidor web e proxy reverso), Node.js com Express, PostgreSQL; cliente em HTML e JavaScript (item 1.1). |
| Versão do HTTP | HTTP/1.1 sobre TLS 1.3; HTTP/2 não é habilitado. |
| Endpoint de login | `POST /api/auth/login`, corpo JSON (DA02 e 2.5). |
| Limite de taxa | Aplicado no Nginx ao endpoint de login, por IP (RNF05); resposta 429. |
| Limite de corpo | Aplicado no Nginx; resposta 413. O 2.5 lista os códigos 200, 400, 401, 413 e 429. |
| Figura 1 | O SVG de `aps/diagramas/fig01-implantacao.svg`. |
| Fontes | Citadas no corpo do item em que a ideia aparece, e listadas em ABNT com data de acesso (regra 6). |

### Responsáveis por issue

| Issue | Item | Antes (autor / revisor) | Depois (autor / revisor) | O item deve cobrir |
|---|---|---|---|---|
| #1 | G1 Infraestrutura | Kamilly / Grazieli | Lucas / Lucas | Repositório, quadro e convite da docente |
| #2 | G2 Pergunta à docente | André / – | Lucas / Lucas | Registro das premissas adotadas |
| #3 | G3 Atas e registros | rodízio | Lucas / Lucas | Atas e registros de comunicação (Apêndice II) |
| #4 | G4 Monitoramento | rodízio | Lucas / Lucas | Acompanhamento dos prazos nas issues |
| #5 | G5 Registro de IA | Kamilly / Lucas | Grazieli / Lucas | Apêndice I a partir das seções "Uso de IA" e dos prompts do esboço |
| #6 | G6 Referências | André / Grazieli | Lucas / Lucas | Lista consolidada em ABNT |
| #7 | G7 Integração | Grazieli / Kamilly | Lucas / Lucas | Consistência entre itens, feita na revisão de cada PR e numa leitura final |
| #8 | G8 PDF final | Lucas / André | Lucas / Lucas | PDF com sumário, autores e figuras |
| #9 | G9 Apresentação | todos | Grazieli (slides) / Lucas; todos apresentam | Slides e divisão de fala |
| #10 | 1.1 Visão geral e pilha | Grazieli / André | Grazieli / André | Concluído |
| #11 | 1.2 Browser | Kamilly / Lucas | Kamilly / Lucas | Requisição de login gerada pelo browser (`fetch`, JSON, cabeçalhos em HTTP/1.1) e tratamento das respostas |
| #12 | 1.3 Rede | Kamilly / Lucas | Kamilly / Lucas | Resolução DNS, handshake TCP, handshake TLS 1.3 e certificado; por que HTTPS é obrigatório |
| #13 | 1.4 Servidor web | Kamilly / Lucas | Kamilly / Lucas | Configuração com o endpoint de login, cabeçalhos de proxy, limites de corpo e de taxa |
| #14 | 1.5 Servidor de aplicação | Grazieli / André | Grazieli / Lucas | A partir do esboço |
| #15 | 1.6 SGBD | Kamilly / André | Kamilly / Lucas | A partir do esboço |
| #16 | 1.7 Ciclo completo | Grazieli / André | Lucas / Lucas | A partir do esboço e da Figura 2 |
| #17 | 2.1 Requisitos | André / Grazieli | André / Lucas | A partir do esboço; valor do RNF05 |
| #18 | 2.2 Decisões arquiteturais | André / Kamilly | André / Lucas | A partir do esboço |
| #19 | 2.3 Contexto | André / Lucas | André / Lucas | A partir do esboço |
| #20 | 2.4 Componentes | Lucas / Grazieli | Kamilly / Lucas | A partir do esboço e da Figura 4 |
| #21 | 2.5 Contrato da API | Lucas / Kamilly | Grazieli / Lucas | A partir do esboço; códigos 413 e 429 |
| #22 | 2.6 Modelo de dados | Lucas / Kamilly | Kamilly / Lucas | A partir do esboço e da Figura 5 |
| #23 | 2.7 Desenho detalhado | Lucas / Kamilly | André / Lucas | A partir do esboço e das Figuras 6 a 9 |
| #24 | 2.8 Segurança e erros | André / Grazieli | André / Lucas | A partir do esboço |

### Responsáveis por tipo de trabalho

| Tipo de trabalho | Itens | Antes | Depois |
|---|---|---|---|
| Infraestrutura da equipe | G1 (repositório, Kanban, issues, templates), esboço e Figuras 1 a 9 | Kamilly | Lucas |
| Documentação, Seção 1 (ambiente operacional) | 1.1 a 1.7 | Grazieli (1.1, 1.5, 1.7), Kamilly (1.2, 1.3, 1.4, 1.6) | Grazieli (1.1, 1.5), Kamilly (1.2, 1.3, 1.4, 1.6), Lucas (1.7) |
| Documentação, Seção 2 (projeto da aplicação) | 2.1 a 2.8 | André (2.1, 2.2, 2.3, 2.8), Lucas (2.4 a 2.7) | André (2.1, 2.2, 2.3, 2.7, 2.8), Kamilly (2.4, 2.6), Grazieli (2.5) |
| Gestão | G2, G3, G4 | André (G2), rodízio (G3, G4) | Lucas |
| Revisão | Todos os PRs | Revisor cruzado por item | Lucas (revisor único) |
| Registro de IA e referências | G5, G6 | Kamilly (G5), André (G6) | Grazieli (G5), Lucas (G6) |
| Integração e PDF | G7, G8 | Grazieli (G7), Lucas (G8) | Lucas |
| Apresentação | G9 | Todos | Grazieli (slides); todos apresentam |

### Totais por pessoa

Estimativa em horas pela escala da WBS (P = 1 a 2 h, M = 3 a 4 h, G = 5 a 8 h). Soma o que já foi feito e o que falta.

| Pessoa | Antes (WBS) | Depois (total estimado) |
|---|---|---|
| Lucas | ~16 h | 29–42 h |
| Kamilly | ~16 h | 19–27 h |
| André | ~16 h | 18–25 h |
| Grazieli | ~20 h | 18–22 h |

### Dependências

Como cada item tem o seu arquivo, não há conflito de merge. A dependência é de conteúdo: o item da direita usa os termos, os valores e as remissões do item da esquerda.

| Item | Depende de | Precisa estar coerente com | Bloqueia |
|---|---|---|---|
| PR #25 (esboço e figuras) | – | – | Todos (é a base de texto e figuras) |
| 1.1 | – | – | 1.2 a 1.7 (pilha) |
| 1.2 Browser | 1.1 | 2.5 (requisição e respostas) | 1.7 |
| 1.3 Rede | 1.1 | 1.4 (TLS 1.3, porta 443) | 1.7 |
| 1.4 Servidor web | 1.1 | 2.1 (valor do RNF05), 2.5 (endpoint, 413, 429) | 1.7, 2.8 |
| 1.5 Servidor de aplicação | 1.1 | 2.4 (componentes), 2.5 (rotas) | 1.7 |
| 1.6 SGBD | 1.1 | 2.6 (tabela e consultas) | 1.7 |
| 1.7 Ciclo completo | 1.2 a 1.6 | Figura 2 | G7 |
| 2.1 Requisitos | G2 (premissas) | 1.4 (RNF05) | 2.2, 2.3, 2.5 |
| 2.2 Decisões arquiteturais | 2.1 | 1.1 | 2.4, 2.6 |
| 2.3 Contexto | 2.1 | – | G7 |
| 2.4 Componentes | 2.2 | 1.5 | 2.7 |
| 2.5 Contrato da API | 2.1 | 1.2, 1.4 | 2.7 |
| 2.6 Modelo de dados | 2.2 | 1.6 | 2.7 |
| 2.7 Desenho detalhado | 2.4, 2.5, 2.6 | Figuras 6 a 9 | 2.8 |
| 2.8 Segurança e erros | 2.4 a 2.7, 1.4 | – | G7 |
| G5 Registro de IA | Seções "Uso de IA" de todos os itens | – | G8 |
| G6 Referências | 1.x e 2.x mesclados | – | G8 |
| G7 Integração | Todos os itens | – | G8, G9 |
| G8 PDF final | G5, G6, G7 | – | Entrega |
| G9 Apresentação | G7 | – | Apresentação |

### Prazos

| Pessoa | Entrega | Prazo |
|---|---|---|
| Lucas | Mesclar o #25; convite da docente; G2 | 17/11, 12h |
| Kamilly | PRs de 1.2, 1.3 e 1.4 | 17/11, 12h |
| Lucas | PR do 1.7 | 17/11, 15h |
| Kamilly | PRs de 1.6, 2.4 e 2.6; ajustes de 1.2 a 1.4 | 17/11, 18h |
| Grazieli | PRs de 1.5 e 2.5 | 17/11, 18h |
| André | PRs de 2.1, 2.2, 2.3, 2.7 e 2.8 | 17/11, 18h |
| Lucas | Revisão e merge de todos os PRs | 17/11, 23h |
| Lucas | G3, G6 e leitura final do G7 | 18/11, 7h |
| Grazieli | G5 (registro de IA) | 18/11, 7h |
| Lucas | G8 (PDF final) | 18/11, 9h |
| Grazieli | G9 (slides e divisão de fala) | 18/11, 10h |

Se o PR do 2.7 não for aberto até 18h, a Grazieli fica com as sequências (Figuras 8 e 9).

### Ordem de merge

1. PR #25 (esboço e Figuras 2 a 9).
2. Seção 1: 1.2, 1.3, 1.4, 1.5 e 1.6. O 1.7 pode entrar antes, porque parte do esboço.
3. Seção 2: 2.1 → 2.2 → 2.3, 2.4, 2.5, 2.6 → 2.7 → 2.8.
4. G5 e G6 → G7 → G8 (PDF).

## Passo a passo para commitar e abrir o PR

Um PR por item. O exemplo usa o 1.2 (issue #11). Para os outros, troque o número, o nome e a issue.

### Pelo navegador

1. Na página do repositório, clique no seletor de branch (mostra `main`), digite `item/1-2-browser` e clique em *Create branch item/1-2-browser from main*.
2. Na branch nova, entre em `aps/secoes/`, clique em *Add file → Create new file* e dê o nome `1.2.md`. Cole o texto do item.
3. No fim do mesmo arquivo, crie o título `## Uso de IA` e informe a ferramenta (por exemplo, OpenAI, ChatGPT), a URL (chatgpt.com), a data de uso e o prompt literal. Se não usou IA, escreva "Não foi usada IA".
4. Em *Commit changes*, escreva `[1.2] descreve o browser` e mantenha *Commit directly to the item/1-2-browser branch*.
5. Se houver figuras, envie em `aps/diagramas/` por *Add file → Upload files* na mesma branch e cite a figura no texto ("Figura N").
6. Clique em *Compare & pull request*. Base: `main`. Título: `[1.2] Browser`. No corpo (o template já vem), escreva `Closes #11`. Eu entro como revisor automaticamente, pelo CODEOWNERS. Clique em *Create pull request* e mova a issue para "Em revisão" no quadro.
7. Para cada sugestão, clique em *Commit suggestion*. Para ajustes maiores, edite o arquivo na mesma branch (lápis em *Files changed*). Responda "feito" no comentário e clique em *Re-request review*.
8. Eu aprovo e faço o merge. A issue fecha sozinha.

### Pelo terminal (opcional)

```bash
git checkout main && git pull
git checkout -b item/1-2-browser
# crie ou edite aps/secoes/1.2.md, com "## Uso de IA" no fim
git add aps/secoes/1.2.md
git commit -m "[1.2] descreve o browser"
git push -u origin item/1-2-browser
```

Depois, abra o PR pelo link que aparece no `git push` e siga os passos 6 a 8.

### Nomes de branch e arquivo

| Item | Branch | Arquivo | Issue |
|---|---|---|---|
| 1.2 | `item/1-2-browser` | `aps/secoes/1.2.md` | #11 |
| 1.3 | `item/1-3-rede` | `aps/secoes/1.3.md` | #12 |
| 1.4 | `item/1-4-servidor-web` | `aps/secoes/1.4.md` | #13 |
| 1.5 | `item/1-5-servidor-aplicacao` | `aps/secoes/1.5.md` | #14 |
| 1.6 | `item/1-6-sgbd` | `aps/secoes/1.6.md` | #15 |
| 1.7 | `item/1-7-ciclo-completo` | `aps/secoes/1.7.md` | #16 |
| 2.1 | `item/2-1-requisitos` | `aps/secoes/2.1.md` | #17 |
| 2.2 | `item/2-2-decisoes` | `aps/secoes/2.2.md` | #18 |
| 2.3 | `item/2-3-contexto` | `aps/secoes/2.3.md` | #19 |
| 2.4 | `item/2-4-componentes` | `aps/secoes/2.4.md` | #20 |
| 2.5 | `item/2-5-contrato-api` | `aps/secoes/2.5.md` | #21 |
| 2.6 | `item/2-6-modelo-dados` | `aps/secoes/2.6.md` | #22 |
| 2.7 | `item/2-7-desenho-detalhado` | `aps/secoes/2.7.md` | #23 |
| 2.8 | `item/2-8-seguranca` | `aps/secoes/2.8.md` | #24 |
