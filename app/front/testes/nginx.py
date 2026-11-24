"""Verificação contra um Nginx real servindo o build (item 2.7) com a API atrás de /api.

Não sobe servidores: aponte BASE para o Nginx já no ar (ver dev/nginx-exemplo.conf).
Checa, em todas as telas de todos os perfis: carga sem erro de console (inclui violação de CSP),
WCAG 2.1 A/AA pelo axe-core (se AXE apontar para axe.min.js), uso só por teclado no login e no
check-in, e grava a árvore de acessibilidade de cada tela (o que um leitor de tela recebe) em
/tmp/shots-front/arvore-*.txt para leitura humana.

    BASE=https://127.0.0.1:8443 AXE=/caminho/axe.min.js CHROME_PATH=... python3 testes/nginx.py
"""
import os, re, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from playwright.sync_api import sync_playwright
from comum import navegador, EMAIL, SENHA, ir, Resultado

BASE = os.environ.get('BASE', 'https://127.0.0.1:8443')
AXE = os.environ.get('AXE')
ROTAS = {'colaborador': ['checkin', 'historico'], 'gestor': ['painel', 'alerta?id=2', 'metas', 'metas-nova', 'validar?id=1', 'relatorios'],
         'rh': ['painel', 'alerta?id=1', 'cadastro', 'formulario', 'parametros', 'relatorios'], 'diretoria': ['relatorios'],
         'administracao': ['cadastro', 'perfis', 'log']}
r = Resultado()

def axe(pg):
    if not AXE: return None
    # evaluate roda pelo protocolo do navegador, fora da CSP da página (add_script_tag seria bloqueado, como deve).
    if not pg.evaluate("!!window.axe"): pg.evaluate(open(AXE, encoding='utf-8').read())
    res = pg.evaluate("axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa']}})")
    return [f"{v['id']} ({v['impact']}): {len(v['nodes'])}x {v['nodes'][0]['target']}" for v in res['violations']]

with sync_playwright() as p:
    b = navegador(p)
    def novo():
        c = b.new_context(ignore_https_errors=True, viewport={'width': 1280, 'height': 900}); pg = c.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.on('console', lambda m: erros.append(m.text) if m.type == 'error' and not any(s in m.text for s in ('401', '404', '409', '422', '429')) else None)
        return pg, erros

    # Login só com teclado
    pg, e = novo(); pg.goto(BASE + '/#entrar'); pg.wait_for_selector('form')
    pg.keyboard.press('Tab')
    for _ in range(10):
        if pg.evaluate("document.activeElement.name") == 'email': break
        pg.keyboard.press('Tab')
    pg.keyboard.type(EMAIL['colaborador']); pg.keyboard.press('Tab'); pg.keyboard.type(SENHA); pg.keyboard.press('Enter')
    pg.wait_for_selector('nav', timeout=5000)
    r.ok('Nginx: login só com teclado', True)
    r.ok('Nginx: cookie de sessão HttpOnly pelo proxy', any(c['name'] == 'sid' and c['httpOnly'] for c in pg.context.cookies()))
    # Check-in só com teclado: escolher humor e carga com setas e enviar com Enter
    pg.locator('input[name=humor]').first.focus(); pg.keyboard.press('ArrowRight'); pg.keyboard.press('ArrowRight'); pg.keyboard.press('ArrowRight')
    pg.locator('input[name=carga]').first.focus(); pg.keyboard.press('ArrowRight')
    pg.get_by_role('button', name=re.compile('(Enviar|Atualizar) check-in')).focus(); pg.keyboard.press('Enter')
    pg.wait_for_selector('text=Check-in enviado', timeout=5000)
    r.ok('Nginx: check-in enviado só com teclado', True)
    r.ok('Nginx: sem erro de console nem violação de CSP (colaborador)', not e, e)

    for perfil, rotas in ROTAS.items():
        pg, e = novo(); pg.goto(BASE + '/#entrar')
        pg.get_by_label('E-mail corporativo').fill(EMAIL[perfil]); pg.get_by_label('Senha').fill(SENHA)
        pg.get_by_role('button', name='Entrar').click(); pg.wait_for_selector('nav', timeout=5000)
        for rt in rotas + ['rota-inexistente']:
            ir(pg, rt, 600)
            tl = pg.evaluate("document.querySelector('main')?.dataset.tela")
            if rt != 'rota-inexistente': r.ok(f'Nginx {perfil} #{rt}: carrega a tela ({tl})', tl and tl != 'TL-17')
            v = axe(pg)
            if v is not None: r.ok(f'axe WCAG 2.1 AA {perfil} #{rt}', not v, v)
            nome = f"/tmp/shots-front/arvore-{perfil}-{rt.replace('?', '_').replace('=', '')}.txt"
            open(nome, 'w').write(pg.locator('body').aria_snapshot())
        r.ok(f'Nginx {perfil}: sem erro de console nem violação de CSP', not e, e)
    # Tela de login e TL-17 sem sessão
    pg, e = novo(); pg.goto(BASE + '/#entrar'); pg.wait_for_selector('form')
    v = axe(pg)
    if v is not None: r.ok('axe WCAG 2.1 AA TL-01', not v, v)
    b.close()
sys.exit(1 if r.fim() else 0)
