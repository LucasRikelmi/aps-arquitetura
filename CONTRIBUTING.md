# Fluxo de trabalho da APS

1. Pegue sua issue no Kanban e mova para **Em escrita**.
2. Crie a branch a partir da `main`: `item/<id>-<slug>` (ex.: `item/1-3-dns-tcp-tls`).
3. Escreva **apenas** no arquivo do seu item: `aps/secoes/<id>.md` (ex.: `aps/secoes/1.3.md`).
   Um arquivo por item evita conflito de merge entre quatro pessoas editando o mesmo documento.
4. Commits: `[<id>] verbo + o quê` (ex.: `[1.3] descreve handshake TLS 1.3`).
5. Abra o PR (o template já vem preenchido), escreva `Closes #<n>` e marque o revisor do item. Mova a issue para **Em revisão**.
6. O revisor comenta no PR e aprova. Só então clique em *Merge pull request* (merge commit; mantém seus commits no histórico). A issue fecha sozinha e vai para **Concluído**.
7. Uso de IA: cole o prompt literal no PR ou na issue G5 no mesmo dia.

A `main` é protegida: sem push direto, merge só com 1 aprovação.
Manual completo com fluxograma: [`docs/manual-fluxo-github.pdf`](docs/manual-fluxo-github.pdf).
O G7/G8 monta o PDF final concatenando `aps/secoes/*.md` na ordem do sumário.
