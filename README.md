# aps-arquitetura
APS - Arquitetura Web (SoftwareWeb.log)

Fluxo de trabalho original: [CONTRIBUTING.md](CONTRIBUTING.md). Este README registra a reorganização de 17/11/2026, que substitui as atribuições e a regra de revisão do CONTRIBUTING até a entrega.

## Reorganização de 17/11/2026

Em 17/11, data prevista na WBS para o PDF fechado, só o item 1.1 estava na `main`. A reorganização abaixo foi decidida pelo Lucas (gestão), anunciada à equipe em 16/11 às 21h e consolidada em 17/11. Entrega e apresentação: 18/11.

### Como era

- WBS de 07/11 (`aps/wbs-atribuicao.md`): cada membro autor de 5 a 6 itens e revisor de 5 itens, com revisão cruzada entre as Seções 1 e 2.
- Cada PR precisava da aprovação do revisor do item; o autor fazia o merge.
- Itens coletivos: G3 e G4 em rodízio, G9 com todos.

### Como passa a ser

- **Lucas é o revisor único:** revisa todos os PRs, inclusive os próprios, e faz todos os merges.
- **Prazos de revisão:** PR aberto até 18h de 17/11; revisão e merge até 23h.
- **Ajustes:** o Lucas pede mudanças com sugestões pontuais no PR, e o autor aplica na mesma branch. Assim o texto continua do autor e o retrabalho não migra para o revisor.
- **Registro de IA no fim:** cada PR move os prompts usados para `aps/ia/<id>.md` (ferramenta, URL, data e prompt literal), em vez de deixá-los no texto ou apagá-los. A Grazieli consolida o Apêndice I (G5) em 18/11.
- **Texto em `.md`:** cada item fica em `aps/secoes/<id>.md`. Texto puro facilita revisar linha a linha e comparar versões.
- **Figuras:** entram no PR do item, em `aps/diagramas/`.
- **Itens coletivos:** G3, G4 e G6 com o Lucas; G9 (slides) com a Grazieli; todos apresentam.

### Pontos já esclarecidos

| Ponto | Situação |
|---|---|
| Revisor único e regra 7 | A regra 7 exige que cada membro seja autor **e revisor** de algum item, e que autor ≠ revisor. Com revisor único, Grazieli e Kamilly ficam sem revisão registrada (o André tem a do 1.1), e os itens do Lucas (G1, G2, G3, G4, G6, G7, G8, 1.7) ficam com autor = revisor. Decisão mantida pelo Lucas, com esta ressalva registrada. |
| Merge dos PRs do Lucas | O GitHub não deixa o autor aprovar o próprio PR. Com a proteção da `main` ativa, esses merges saem pelo bypass de administrador, sem aprovação registrada. |
| Figura 1 duplicada (#28) | Vale o SVG do 1.1 que já está na `main`. Os arquivos `fig01-implantacao.mmd/.png` saem do PR #25 antes do merge. |
| Branch de revert do 1.1 | Existe sem PR; o 1.1 continua na `main`. A branch deve ser apagada. |
| Versão do HTTP (#29) | HTTP/1.1 sobre TLS 1.3; HTTP/2 não é habilitado. Afeta 1.2, 1.3, 1.4 e 1.7. |
| Endpoint de login | `POST /api/auth/login` (DA02 e 2.5). O rascunho do 1.4 usa `/api/login` e precisa ser corrigido, senão o limite de taxa (RNF05) não se aplica. |
| Códigos de erro | O 2.5 precisa listar o 413 (corpo acima do limite, devolvido pelo Nginx) e definir se o 429 sai em JSON (`error_page` no 1.4) ou como página do Nginx. |
| Rascunhos de 1.2 e 1.3 | Bons como base, mas genéricos: precisam ser ligados à aplicação de login e cobrir o escopo das issues. Detalhes no guia da Kamilly. |
| Prompts colados nos rascunhos | Saem do texto e vão para `aps/ia/`. As fontes em que os textos se baseiam (MDN no 1.2, Cloudflare no 1.3) precisam ser citadas no corpo. |

### Responsável por issue: antes e depois

| Issue | Item | Antes (autor / revisor) | Depois (autor / revisor) | Estado em 17/11 |
|---|---|---|---|---|
| #1 | G1 Infraestrutura | Kamilly / Grazieli | Lucas / Lucas | Praticamente feito pelo Lucas; falta confirmar o convite da docente |
| #2 | G2 Pergunta à docente | André / – | Lucas / Lucas | Fechar registrando as premissas adotadas |
| #3 | G3 Atas e registros | rodízio | Lucas / Lucas | Sem registro; reconstruir a partir do Discord (Apêndice II) |
| #4 | G4 Monitoramento | rodízio | Lucas / Lucas | Sem registro |
| #5 | G5 Registro de IA | Kamilly / Lucas | Grazieli / Lucas | No fim, a partir de `aps/ia/` e dos prompts do esboço |
| #6 | G6 Referências | André / Grazieli | Lucas / Lucas | Não iniciado |
| #7 | G7 Integração | Grazieli / Kamilly | Lucas / Lucas | Feito na revisão de cada PR + leitura final |
| #8 | G8 PDF final | Lucas / André | Lucas / Lucas | Não iniciado |
| #9 | G9 Apresentação | todos | Grazieli (slides) / Lucas; todos apresentam | Não iniciado |
| #10 | 1.1 Visão geral e pilha | Grazieli / André | Grazieli / André | Na `main` (PR #26) |
| #11 | 1.2 Browser | Kamilly / Lucas | Kamilly / Lucas | Rascunho na issue; ligar à aplicação de login |
| #12 | 1.3 Rede | Kamilly / Lucas | Kamilly / Lucas | Rascunho na issue; faltam os passos dos handshakes TCP e TLS 1.3 |
| #13 | 1.4 Servidor web | Kamilly / Lucas | Kamilly / Lucas | Rascunho na issue; corrigir endpoint, limite de corpo e cabeçalhos de proxy |
| #14 | 1.5 Servidor de aplicação | Grazieli / André | Grazieli / Lucas | Só esboço |
| #15 | 1.6 SGBD | Kamilly / André | Kamilly / Lucas | Só esboço |
| #16 | 1.7 Ciclo completo | Grazieli / André | Lucas / Lucas | Só esboço |
| #17 | 2.1 Requisitos | André / Grazieli | André / Lucas | Só esboço |
| #18 | 2.2 Decisões arquiteturais | André / Kamilly | André / Lucas | Só esboço |
| #19 | 2.3 Contexto | André / Lucas | André / Lucas | Só esboço |
| #20 | 2.4 Componentes | Lucas / Grazieli | Kamilly / Lucas | Só esboço |
| #21 | 2.5 Contrato da API | Lucas / Kamilly | Grazieli / Lucas | Só esboço |
| #22 | 2.6 Modelo de dados | Lucas / Kamilly | Kamilly / Lucas | Só esboço (Figura 5 no PR #25); coerente com o 1.6 |
| #23 | 2.7 Desenho detalhado | Lucas / Kamilly | André / Lucas | Só esboço (Figuras 6 a 9 no PR #25); plano B: se não houver PR até 18h, Grazieli assume as sequências (Figs. 8 e 9) |
| #24 | 2.8 Segurança e erros | André / Grazieli | André / Lucas | Só esboço |

### Responsável por tipo de trabalho: antes e depois

| Tipo de trabalho | Itens | Antes | Depois |
|---|---|---|---|
| Infraestrutura da equipe | G1 (repositório, Kanban, issues, templates), esboço e Figuras 1 a 9 | Kamilly | Lucas (já entregue) |
| Documentação, Seção 1 (ambiente operacional) | 1.1 a 1.7 | Grazieli (1.1, 1.5, 1.7), Kamilly (1.2, 1.3, 1.4, 1.6) | Grazieli (1.1, 1.5), Kamilly (1.2, 1.3, 1.4, 1.6), Lucas (1.7) |
| Documentação, Seção 2 (projeto da aplicação) | 2.1 a 2.8 | André (2.1, 2.2, 2.3, 2.8), Lucas (2.4 a 2.7) | André (2.1, 2.2, 2.3, 2.7, 2.8), Kamilly (2.4, 2.6), Grazieli (2.5) |
| Gestão | G2, G3, G4 | André (G2), rodízio (G3, G4) | Lucas |
| Revisão | Todos os PRs | Revisor cruzado por item | Lucas (revisor único) |
| Registro de IA e referências | G5, G6 | Kamilly (G5), André (G6) | Grazieli (G5), Lucas (G6) |
| Integração e PDF | G7, G8 | Grazieli (G7), Lucas (G8) | Lucas |
| Apresentação | G9 | Todos | Grazieli (slides); todos apresentam |

### Totais por pessoa

Horas estimadas com a escala da WBS (P ≈ 1–2 h, M ≈ 3–4 h, G ≈ 5–8 h). "Já entregue" conta só o que está no GitHub ou foi anexado às issues. A revisão única custa ao Lucas de 30 a 60 min por PR, para cerca de 13 PRs dos outros. O 2.7 custa ao André de 4 a 6 h, mais do que custaria ao Lucas, porque parte de figuras que não são dele.

| Pessoa | Antes (WBS) | Já entregue | Restante | Total |
|---|---|---|---|---|
| Lucas | ~16 h | ~8–10 h (G1, esboço, 9 figuras, WBS, manual) | 21–32 h | 29–42 h |
| Kamilly | ~16 h | ~9–12 h (rascunhos de 1.2 a 1.4) | 10–15 h | 19–27 h |
| André | ~16 h | ~5–6 h (revisão do 1.1, issues #27 a #29) | 13–19 h | 18–25 h |
| Grazieli | ~20 h | ~7 h (1.1 mesclado, 2 rodadas de correção) | 11–15 h | 18–22 h |

### Dependências

Um arquivo por item, então não há conflito de merge. As dependências são de conteúdo: o item da direita precisa usar os termos, valores e remissões do item da esquerda.

| Item | Depende de | Precisa estar coerente com | Bloqueia |
|---|---|---|---|
| PR #25 (esboço e figuras) | – | – | Todos (é a base de texto e figuras) |
| 1.1 | – | – | 1.2 a 1.7 (pilha) |
| 1.2 Browser | 1.1 | 2.5 (requisição e respostas), #29 (HTTP/1.1) | 1.7 |
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
| G5 Registro de IA | `aps/ia/` de todos os PRs | – | G8 |
| G6 Referências | 1.x e 2.x mesclados | – | G8 |
| G7 Integração | Todos os itens | – | G8, G9 |
| G8 PDF final | G5, G6, G7 | – | Entrega |
| G9 Apresentação | G7 | – | Apresentação |

### Prazos

| Pessoa | Entrega | Prazo |
|---|---|---|
| Lucas | Ajustar e mesclar o #25; confirmar convite da docente; fechar G2 | 17/11, 12h |
| Kamilly | PRs de 1.2, 1.3 e 1.4 (um por item) | 17/11, 12h |
| Lucas | PR do 1.7 | 17/11, 15h |
| Kamilly | Ajustes de 1.2 a 1.4; PRs de 1.6, 2.4 e 2.6 | 17/11, 18h |
| Grazieli | PRs de 1.5 e 2.5 | 17/11, 18h |
| André | PRs de 2.1, 2.2, 2.3, 2.7 e 2.8 | 17/11, 18h |
| Lucas | Revisão e merge de todos os PRs | 17/11, 23h |
| Lucas | G3, G6 e leitura final do G7 | 18/11, 7h |
| Grazieli | G5 (registro de IA) | 18/11, 7h |
| Lucas | G8 (PDF final) | 18/11, 9h |
| Grazieli | G9 (slides e divisão de fala) | 18/11, 10h |

### Ordem de merge

1. PR #25 (esboço e Figuras 2 a 9, sem a Figura 1 duplicada).
2. Seção 1: 1.2, 1.3, 1.4, 1.5, 1.6; o 1.7 pode entrar antes, escrito a partir do esboço.
3. Seção 2: 2.1 → 2.2 → 2.3, 2.4, 2.5, 2.6 → 2.7 → 2.8.
4. G5 e G6 → G7 → G8 (PDF).

## Passo a passo do PR (pelo navegador)

Um PR por item. Exemplo com o 1.2; troque o número e o nome nos outros.

1. **Criar a branch.** Na página do repositório, clique no seletor de branch (canto superior esquerdo, mostra `main`), digite `item/1-2-browser` e clique em *Create branch item/1-2-browser from main*.
2. **Criar o arquivo do item.** Ainda na branch nova, entre em `aps/secoes/`, clique em *Add file → Create new file* e dê o nome `1.2.md`. Cole o texto **sem** o prompt de IA no fim. Em *Commit changes*, escreva `[1.2] descreve o browser` e mantenha *Commit directly to the item/1-2-browser branch*.
3. **Mover os prompts.** Na mesma branch, crie `aps/ia/1.2.md` com: ferramenta (por exemplo, OpenAI, ChatGPT), URL (chatgpt.com), data de uso e o prompt literal. Commit: `[1.2] registra prompts de IA`.
4. **Figuras, se houver.** Entre em `aps/diagramas/`, clique em *Add file → Upload files*, envie a imagem e faça o commit na mesma branch. Cite a figura no texto ("Figura N").
5. **Abrir o PR.** Clique em *Compare & pull request* (ou em *Pull requests → New pull request*, base `main`, compare `item/1-2-browser`). Título: `[1.2] Browser`. No corpo (o template já vem), escreva `Closes #11`. Em *Reviewers*, selecione `LucasRikelmi`. Clique em *Create pull request* e mova a issue para **Em revisão** no quadro.
6. **Responder à revisão.** Se o Lucas pedir mudanças com sugestão, clique em *Commit suggestion* no próprio comentário. Se for um ajuste maior, edite o arquivo na mesma branch (ícone de lápis em *Files changed*). Responda "feito" em cada comentário e clique em *Re-request review*.
7. **Merge.** O Lucas aprova e clica em *Merge pull request* (merge commit, que preserva os commits do autor). A issue fecha sozinha.
