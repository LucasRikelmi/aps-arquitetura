# Documento final (G8)

O PDF de entrega é gerado a partir dos `.md` dos itens, sem copiar texto à mão.

| Arquivo | Papel |
|---|---|
| `estrutura.yaml` | Ordem das partes, títulos, autoria e revisão de cada item, capa e cabeçalho. Única fonte do quadro de autoria (Apêndice III). |
| `pdf.css` | Formatação (critérios 9.4 e 9.5): A4, Times/Liberation Serif 12 pt, justificado, espaçamento 1,5, cabeçalho e número de página. |
| `gerar_pdf.py` | Monta o documento, verifica pendências e imprime o PDF. |
| `esboco-aps.md`, `esboco.css`, `esboco-aps.pdf` | Esboço original (G1). Não entram no PDF final. |

## Ordem do documento

1. Capa: instituição, autores em ordem alfabética (regra 4), título, cidade e ano.
2. Folha de rosto: autores, título, natureza do trabalho, docente, cidade e ano.
3. Sumário com páginas.
4. Seção 1, itens 1.1 a 1.7; Seção 2, itens 2.1 a 2.8 (regra 5). Cada item abre com "Autor(a) · Revisor(a)".
5. Referências: `aps/referencias.md` (G6), depois da última seção e antes dos apêndices (regra 6).
6. Apêndice I, prompts de IA: `aps/apendices/apendice-I.md` (G5, regra 8).
7. Apêndice II, registros da equipe: `aps/gestao/G3.md` (G3).
8. Apêndice III, autoria e revisão: Quadro 1, gerado de `estrutura.yaml` (regra 7).

Formatação no padrão da NBR 14724, conferida contra o modelo da equipe: margens de 3 cm (superior e esquerda) e 2 cm (inferior e direita), fonte 12, entrelinha de 1,5 linha, recuo de 1,25 cm na primeira linha, sem linha em branco entre parágrafos, título de figura e tabela acima e fonte abaixo. A capa não é contada; a folha de rosto é a página 1; o número aparece no canto superior direito a partir da parte textual, junto do cabeçalho com instituição, disciplina, tarefa e autores (regra 4 do enunciado).

## O que o script faz com cada `.md`

- Troca o título do arquivo pelo título de `estrutura.yaml` (`## 1.2 Cliente: browser`). A primeira linha é removida se for `# ...` ou se começar pelo id do item.
- Troca a linha `Autor(a): … · Revisor(a): …` do arquivo pela de `estrutura.yaml` e avisa se o autor divergir.
- Desce um nível os títulos internos (`##` vira `###`).
- Resolve o caminho das figuras (`../diagramas/...`). A legenda é o parágrafo `Figura N – ... Fonte: ...` logo abaixo da imagem. Se ele faltar, usa o texto alternativo e avisa.
- Formata como legenda os parágrafos que começam por `Figura N –`, `Tabela N –` ou `Quadro N –`.
- Opcional (`fontes_dos_itens_em_linha` em `estrutura.yaml`): troca a lista `## Fontes` do item por uma linha de chamadas autor-data, por exemplo "(NGINX, [20--]a, [20--]b; OWASP, [20--]c)". A descrição completa fica só nas Referências.
- Opcional (`remover_uso_ia_dos_itens` em `estrutura.yaml`): omite as seções `## Uso de IA` dos itens, já consolidadas no Apêndice I.

O texto dos itens não é alterado no repositório.

## Verificações

Aviso no modo rascunho e bloqueio no modo `--final`:

- arquivo de item ausente na branch;
- figura com caminho quebrado (erro nos dois modos);
- pendências entre colchetes (`[ ]`, `[data]`, `[conferir ...]`, `[SOBRENOME]`, frases de instrução do esboço) e marcadores `ESBOÇO`, `TODO`;
- figura sem legenda; numeração de figuras e tabelas repetida, fora de ordem ou misturando `Tabela 1` com `Tabela 1.7`;
- autoria no arquivo diferente da estrutura.

Autor = revisor aparece como nota e não bloqueia (ressalva da regra 7 no README da raiz).

## Como gerar

Pelo GitHub (sem instalar nada): aba **Actions → PDF da APS → Run workflow**. O PDF fica em *Artifacts* da execução. O workflow também roda em cada PR que mexe em `aps/` e em cada push na `main`, gerando prévia.

Localmente, na raiz do repositório:

```bash
pip install playwright pypdf pyyaml
python3 -m playwright install chromium     # ou: export CHROME_PATH=/caminho/do/chrome
# pandoc >= 2.11 no PATH

python3 aps/documento/gerar_pdf.py              # rascunho, com avisos
python3 aps/documento/gerar_pdf.py --so-verificar
python3 aps/documento/gerar_pdf.py --final      # entrega: falha se houver pendência
```

Saída: `dist/APS-autenticacao-web.pdf` (fora do Git). O Markdown montado fica em `dist/build/documento.md` para conferência.
