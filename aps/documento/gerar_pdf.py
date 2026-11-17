#!/usr/bin/env python3
"""Monta o PDF final da APS a partir de aps/documento/estrutura.yaml (G8).

Fluxo: lê a estrutura -> normaliza cada .md (título, autoria, níveis de título,
caminhos de figura, legendas) -> pandoc gera o HTML -> Chromium imprime o PDF
duas vezes (a primeira só para descobrir a página de cada título do sumário).

Uso (na raiz do repositório):
    python3 aps/documento/gerar_pdf.py              # rascunho: pendências viram aviso
    python3 aps/documento/gerar_pdf.py --final      # pendências viram erro (exit 1)
    python3 aps/documento/gerar_pdf.py --so-verificar   # só a verificação, sem PDF

Requisitos: pandoc >= 2.11; Python 3.9+ com `pip install playwright pypdf pyyaml`;
Chromium do Playwright (`python3 -m playwright install chromium`) ou a variável
CHROME_PATH apontando para um Chrome/Chromium instalado.
"""
from __future__ import annotations

import argparse
import html
import os
import re
import shutil
import subprocess
import sys
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

import yaml

RAIZ = Path(__file__).resolve().parents[2]
DIR_DOC = Path(__file__).resolve().parent

RE_TITULO = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
RE_CERCA = re.compile(r"^\s*(```|~~~)")
RE_AUTORIA = re.compile(r"^[\s*_]*Autor(?:\(a\)|a|es)?\s*:.*Revisor", re.IGNORECASE)
RE_IMAGEM_SO = re.compile(r"^\s*!\[(?P<alt>[^\]]*)\]\((?P<src>[^)\s]+)(?:\s+\"[^\"]*\")?\)(?P<attr>\{[^}]*\})?\s*$")
RE_IMAGEM = re.compile(r"!\[[^\]]*\]\((?P<src>[^)\s]+)")
RE_LEGENDA_MD = re.compile(r"^[\s*_]*(Figura|Tabela|Quadro)\s+([\dA-Z][\w.]*)\s*[–—-]")
RE_PENDENCIA = re.compile(
    r"\[(?:\s*|data|NOME[^\]]*|SOBRENOME|conferir[^\]]*|TODO[^\]]*|[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^\]\n]{25,})\](?!\()"
)
RE_ESBOCO = re.compile(r"\bESBOÇO\b|\bTODO\b|\bFIXME\b")


@dataclass
class Relatorio:
    erros: list[str] = field(default_factory=list)
    avisos: list[str] = field(default_factory=list)
    notas: list[str] = field(default_factory=list)   # informativo; não bloqueia --final

    def aviso(self, onde: str, msg: str) -> None:
        self.avisos.append(f"[{onde}] {msg}")

    def erro(self, onde: str, msg: str) -> None:
        self.erros.append(f"[{onde}] {msg}")


def ancora_item(id_: str) -> str:
    return "s" + id_.replace(".", "-")


def chave_ordem(nome: str) -> str:
    sem_acento = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode()
    return sem_acento.casefold()


def separar_cercas(linhas: list[str]) -> list[bool]:
    """Para cada linha, True se está dentro de bloco de código cercado."""
    dentro, marca = False, []
    for ln in linhas:
        if RE_CERCA.match(ln):
            marca.append(True)
            dentro = not dentro
            continue
        marca.append(dentro)
    return marca


def normalizar(texto: str, parte: dict, pessoas: dict, rel: Relatorio,
               remover_uso_ia: bool) -> str:
    """Prepara o .md de uma parte para entrar no documento único."""
    onde = parte.get("id") or parte["titulo"]
    arquivo = RAIZ / parte["arquivo"]
    linhas = texto.lstrip("﻿").replace("\r\n", "\n").split("\n")

    # 1) Remove o título próprio do arquivo (o título vem da estrutura).
    i = next((k for k, ln in enumerate(linhas) if ln.strip()), None)
    if i is not None:
        primeira = linhas[i].strip()
        m = RE_TITULO.match(primeira)
        id_ = parte.get("id")
        if (m and len(m.group(1)) == 1) or (id_ and re.match(rf"^#*\s*{re.escape(id_)}\b", primeira)):
            del linhas[i]
        elif parte["tipo"] == "item":
            rel.aviso(onde, f"primeira linha não é o título do item: {primeira[:60]!r}")

    # 2) Remove a linha "Autor(a): … · Revisor(a): …" do arquivo (vem da estrutura)
    #    e confere com a estrutura.
    for k, ln in enumerate(linhas[:8]):
        if RE_AUTORIA.match(ln):
            esperado_a = pessoas[parte["autor"]].split()[0]
            if esperado_a.casefold() not in ln.casefold():
                rel.aviso(onde, f"autoria no arquivo difere da estrutura: {ln.strip()!r}")
            del linhas[k]
            break

    cercas = separar_cercas(linhas)

    # 3) Remove "## Uso de IA" (opcional) — vai para o Apêndice I.
    if remover_uso_ia:
        saida, pulando, nivel = [], False, 0
        for ln, cod in zip(linhas, cercas):
            m = None if cod else RE_TITULO.match(ln)
            if m and re.fullmatch(r"uso de ia", m.group(2).strip(), re.IGNORECASE):
                pulando, nivel = True, len(m.group(1))
                continue
            if pulando and m and len(m.group(1)) <= nivel:
                pulando = False
            if not pulando:
                saida.append(ln)
        linhas = saida
        cercas = separar_cercas(linhas)

    # 4) Desce um nível os títulos restantes (o item é nível 2 no documento).
    nivel_extra = 1 if parte["tipo"] == "item" else 0
    saida = []
    for ln, cod in zip(linhas, cercas):
        m = None if cod else RE_TITULO.match(ln)
        if m:
            n = min(len(m.group(1)) + nivel_extra, 6)
            n = max(n, 2)  # nada no arquivo pode virar nível 1
            ln = "#" * n + " " + m.group(2)
        saida.append(ln)
    linhas = saida

    # 5) Figuras: caminho absoluto; legenda garantida.
    saida = []
    for k, ln in enumerate(linhas):
        if cercas[k] if k < len(cercas) else False:
            saida.append(ln)
            continue
        for m in RE_IMAGEM.finditer(ln):
            src = m.group("src")
            if re.match(r"^[a-z]+://", src):
                continue
            caminho = (arquivo.parent / src).resolve()
            if not caminho.exists():
                rel.erro(onde, f"figura não encontrada: {src}")
            ln = ln.replace(f"]({src}", f"]({caminho.as_uri()}")
        saida.append(ln)
        m = RE_IMAGEM_SO.match(ln)
        if m:
            prox = next((x for x in linhas[k + 1:] if x.strip()), "")
            if not RE_LEGENDA_MD.match(prox):
                alt = m.group("alt").strip()
                rel.aviso(onde, "figura sem parágrafo de legenda logo abaixo; usando o texto alternativo"
                          if alt else "figura sem legenda")
                if alt:
                    saida += ["", alt]
    return "\n".join(saida).strip() + "\n"


def verificar_texto(texto: str, onde: str, rel: Relatorio) -> None:
    cercas = separar_cercas(texto.split("\n"))
    for n, (ln, cod) in enumerate(zip(texto.split("\n"), cercas), 1):
        if cod:
            continue
        for m in RE_PENDENCIA.finditer(ln):
            rel.aviso(onde, f"linha {n}: pendência {m.group(0)[:50]!r}")
        if RE_ESBOCO.search(ln):
            rel.aviso(onde, f"linha {n}: marcador de rascunho {ln.strip()[:50]!r}")


def verificar_numeracao(md: str, rel: Relatorio) -> None:
    vistos: dict[str, list[str]] = {"Figura": [], "Tabela": [], "Quadro": []}
    for ln in md.split("\n"):
        m = RE_LEGENDA_MD.match(ln)
        if m:
            vistos[m.group(1)].append(m.group(2).rstrip("."))
    for tipo, nums in vistos.items():
        dup = sorted({x for x in nums if nums.count(x) > 1})
        if dup:
            rel.aviso("numeração", f"{tipo} com número repetido: {', '.join(dup)}")
        inteiros = [int(x) for x in nums if x.isdigit()]
        if inteiros and inteiros != sorted(inteiros):
            rel.aviso("numeração", f"{tipo} fora de ordem: {nums}")
        if any(not x.isdigit() for x in nums) and any(x.isdigit() for x in nums):
            rel.aviso("numeração", f"{tipo} mistura numeração simples e por item: {nums}")


def montar_markdown(est: dict, rel: Relatorio, final: bool) -> tuple[str, list[tuple[int, str, str]]]:
    pessoas = est["pessoas"]
    remover_uso_ia = bool(est.get("opcoes", {}).get("remover_uso_ia_dos_itens", False))
    blocos, sumario = [], []

    for nome in pessoas.values():
        if "[" in nome:
            rel.aviso("estrutura.yaml", f"nome incompleto: {nome}")

    for parte in est["partes"]:
        tipo = parte["tipo"]
        if tipo == "secao":
            blocos.append(f"# {parte['titulo']} {{#{parte['ancora']}}}\n")
            sumario.append((1, parte["titulo"], parte["ancora"]))
            continue
        if tipo == "autoria":
            linhas = [f"# {parte['titulo']} {{#{parte['ancora']}}}", "",
                      "Tabela 1 – Autoria e revisão dos itens de informação (regra 7). "
                      "Fonte: elaborado pelos autores.", "",
                      "| Item | Artefato | Autor(a) | Revisor(a) |", "|---|---|---|---|"]
            for p in est["partes"]:
                if p["tipo"] in ("item", "pos") and p.get("autor"):
                    rotulo = p.get("id") or p["titulo"].split(" –")[0]
                    anc = ancora_item(p["id"]) if p.get("id") else p["ancora"]
                    linhas.append(f"| [{rotulo}](#{anc}) | {p.get('artefato', p['titulo'])} | "
                                  f"{pessoas[p['autor']]} | {pessoas[p['revisor']]} |")
                    if p["autor"] == p["revisor"]:
                        rel.notas.append(f"[{rotulo}] autor = revisor (regra 7); ressalva registrada no README")
            blocos.append("\n".join(linhas) + "\n")
            sumario.append((1, parte["titulo"], parte["ancora"]))
            continue

        if tipo == "item":
            anc = ancora_item(parte["id"])
            titulo = f"{parte['id']} {parte['titulo']}"
            cab = f"## {titulo} {{#{anc}}}"
            sumario.append((2, titulo, anc))
        else:
            anc = parte["ancora"]
            titulo = parte["titulo"]
            cab = f"# {titulo} {{#{anc}}}"
            sumario.append((1, titulo, anc))
        onde = parte.get("id") or titulo

        autoria = ""
        if tipo == "item":
            autoria = (f"\n::: autoria-item\nAutor(a): {pessoas[parte['autor']]} · "
                       f"Revisor(a): {pessoas[parte['revisor']]}\n:::\n")

        arquivo = RAIZ / parte["arquivo"]
        if not arquivo.exists():
            msg = f"arquivo ausente: {parte['arquivo']} (item ainda não mesclado na main?)"
            (rel.erro if final else rel.aviso)(onde, msg)
            blocos.append(f"{cab}\n{autoria}\n::: pendente\n[Pendente: {parte['arquivo']}]\n:::\n")
            continue

        texto = arquivo.read_text(encoding="utf-8")
        verificar_texto(texto, onde, rel)
        corpo = normalizar(texto, parte, pessoas, rel, remover_uso_ia)
        blocos.append(f"{cab}\n{autoria}\n{corpo}")

    md = "\n\n".join(blocos)
    verificar_numeracao(md, rel)
    return md, sumario


def pos_html(corpo: str) -> str:
    """Ajustes no HTML do pandoc: figuras centralizadas e parágrafos de legenda."""
    corpo = re.sub(r"<p>\s*(<img [^>]*>)\s*</p>", r'<div class="figura">\1</div>', corpo)

    def legenda(m: re.Match) -> str:
        classe = "legenda tabela" if m.group(2) in ("Tabela", "Quadro") else "legenda"
        return f'<p class="{classe}">{m.group(1)}'
    return re.sub(r"<p>((?:<strong>|<em>)?(Figura|Tabela|Quadro)\s+[\dA-Z][\w.]*\s*[–—-])",
                  legenda, corpo)


def html_capa(est: dict) -> str:
    d = est["documento"]
    autores = sorted(est["pessoas"].values(), key=chave_ordem)
    e = html.escape
    return f"""
<section class="capa">
  <div>
    <p class="inst">{e(d['instituicao'])}</p>
    <p>{e(d['disciplina'])} · {e(d['periodo'])}</p>
    <p>{e(d['tarefa'])}</p>
    <p>Docente: {e(d.get('docente', ''))}</p>
  </div>
  <div>
    <p class="titulo">{e(d['titulo'])}</p>
  </div>
  <div class="autores">
    <p><strong>Autores (ordem alfabética)</strong></p>
    {''.join(f'<p>{e(a)}</p>' for a in autores)}
  </div>
  <div><p>{e(d.get('local_data', ''))}</p></div>
</section>"""


def html_sumario(sumario: list[tuple[int, str, str]], paginas: dict[str, int]) -> str:
    itens = []
    for nivel, titulo, anc in sumario:
        pag = paginas.get(anc, "")
        itens.append(f'<li class="n{nivel}"><a href="#{anc}">{html.escape(titulo)}</a>'
                     f'<span class="pontos"></span><span class="pag">{pag}</span></li>')
    return ('<nav class="sumario"><h1 id="sumario">Sumário</h1><ol>'
            + "".join(itens) + "</ol></nav>")


def css_cabecalho(est: dict) -> str:
    d = est["documento"]
    autores = "; ".join(sorted(est["pessoas"].values(), key=chave_ordem))
    linha1 = f"{d['instituicao']} · {d['disciplina']} · {d['tarefa']} · {d['periodo']}"
    texto = f"{linha1}\\A Autores: {autores}"
    texto = texto.replace('"', '\\"')
    return f'@page {{ @top-center {{ content: "{texto}"; }} }}'


def pandoc_html(md: str) -> str:
    if not shutil.which("pandoc"):
        sys.exit("erro: pandoc não encontrado no PATH")
    proc = subprocess.run(
        ["pandoc", "-f", "markdown-implicit_figures-smart", "-t", "html5", "--wrap=none"],
        input=md, capture_output=True, text=True, encoding="utf-8",
    )
    if proc.returncode != 0:
        sys.exit(f"erro no pandoc:\n{proc.stderr}")
    if proc.stderr.strip():
        print(proc.stderr.strip(), file=sys.stderr)
    return proc.stdout


def html_completo(est: dict, corpo: str, sumario, paginas) -> str:
    css = (DIR_DOC / "pdf.css").read_text(encoding="utf-8")
    return f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>{html.escape(est['documento']['titulo'])}</title>
<style>{css}
{css_cabecalho(est)}</style></head>
<body>
{html_capa(est)}
{html_sumario(sumario, paginas)}
{corpo}
</body></html>"""


def imprimir(html_path: Path, pdf_path: Path) -> None:
    from playwright.sync_api import sync_playwright
    exe = os.environ.get("CHROME_PATH") or None
    with sync_playwright() as p:
        nav = p.chromium.launch(executable_path=exe)
        pg = nav.new_page()
        pg.goto(html_path.as_uri(), wait_until="networkidle")
        pg.pdf(path=str(pdf_path), prefer_css_page_size=True, print_background=True,
               outline=True, tagged=True)
        nav.close()


def paginas_dos_titulos(pdf_path: Path) -> dict[str, int]:
    import pypdf
    leitor = pypdf.PdfReader(str(pdf_path))
    return {nome.lstrip("/"): leitor.get_destination_page_number(dest) + 1
            for nome, dest in leitor.named_destinations.items()}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--final", action="store_true", help="pendências viram erro; sem PDF se houver erro")
    ap.add_argument("--so-verificar", action="store_true", help="só verifica, não gera PDF")
    ap.add_argument("--estrutura", default=str(DIR_DOC / "estrutura.yaml"))
    ap.add_argument("--saida", default=str(RAIZ / "dist" / "APS-autenticacao-web.pdf"))
    args = ap.parse_args()

    est = yaml.safe_load(Path(args.estrutura).read_text(encoding="utf-8"))
    rel = Relatorio()
    md, sumario = montar_markdown(est, rel, args.final)

    saida = Path(args.saida).resolve()
    tmp = saida.parent / "build"
    tmp.mkdir(parents=True, exist_ok=True)
    (tmp / "documento.md").write_text(md, encoding="utf-8")

    for n in rel.notas:
        print("nota: ", n)
    for a in rel.avisos:
        print("aviso:", a)
    for e in rel.erros:
        print("ERRO: ", e)
    print(f"\n{len(rel.erros)} erro(s), {len(rel.avisos)} aviso(s).")

    if args.final and (rel.erros or rel.avisos):
        print("Modo --final: corrija as pendências acima antes de gerar o PDF de entrega.")
        return 1
    if args.so_verificar:
        return 1 if rel.erros else 0

    corpo = pos_html(pandoc_html(md))
    html1 = tmp / "documento.html"
    # 1ª impressão: descobre a página de cada título.
    html1.write_text(html_completo(est, corpo, sumario, {}), encoding="utf-8")
    imprimir(html1, tmp / "passo1.pdf")
    paginas = paginas_dos_titulos(tmp / "passo1.pdf")
    # 2ª impressão: sumário com páginas. O sumário tem o mesmo número de linhas,
    # então a paginação não muda entre as impressões.
    html1.write_text(html_completo(est, corpo, sumario, paginas), encoding="utf-8")
    imprimir(html1, saida)
    if paginas_dos_titulos(saida) != paginas:
        print("aviso: a paginação mudou entre as impressões; confira o sumário.")
    print(f"PDF gerado: {saida.relative_to(RAIZ) if saida.is_relative_to(RAIZ) else saida}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
