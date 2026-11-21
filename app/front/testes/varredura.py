"""Sem rolagem horizontal de 360 a 1920 px em todas as telas de todos os perfis, sem erros de console."""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from playwright.sync_api import sync_playwright
from comum import servidor, navegador, entrar, ir

ROTAS = {'colaborador': ['checkin', 'historico'], 'gestor': ['painel', 'alertas', 'metas', 'metas-nova', 'progresso', 'relatorios'],
         'rh': ['painel', 'alertas', 'cadastro', 'formulario', 'parametros', 'relatorios'], 'diretoria': ['relatorios'], 'administracao': ['cadastro', 'perfis', 'log']}
LARGURAS = [360, 768, 1280, 1920]
problemas = []
S = servidor(8773); S2 = servidor(8774, JANELA='encerrada')
try:
    with sync_playwright() as p:
        b = navegador(p)
        for perfil, rotas in ROTAS.items():
            for w in LARGURAS:
                c = b.new_context(viewport={'width': w, 'height': 900}); pg = c.new_page(); erros = []
                pg.on('pageerror', lambda e: erros.append(str(e)))
                pg.on('console', lambda m: erros.append(m.text) if m.type == 'error' and not any(c in m.text for c in ('401', '404', '409')) else None)
                entrar(pg, 'http://127.0.0.1:8773', perfil); pg.wait_for_selector('nav')
                for rt in rotas + ['rota-inexistente']:
                    ir(pg, rt, 400)
                    sw = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
                    if sw > 0: problemas.append(f'ROLAGEM {perfil} {w}px #{rt}: +{sw}px')
                    if not pg.evaluate("document.querySelector('h1')?.textContent"): problemas.append(f'SEM H1 {perfil} #{rt}')
                    if w in (360, 1280) and perfil in ('colaborador', 'gestor', 'rh', 'administracao'):
                        pg.screenshot(path=f'/tmp/shots-front/{perfil}_{rt}_{w}.png', full_page=True)
                if erros: problemas.append(f'CONSOLE {perfil} {w}px: {erros[:3]}')
                c.close()
        for w in LARGURAS:  # TL-01 e TL-04
            c = b.new_context(viewport={'width': w, 'height': 900}); pg = c.new_page(); pg.goto('http://127.0.0.1:8773/#entrar'); pg.wait_for_selector('form')
            if pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") > 0: problemas.append(f'ROLAGEM TL-01 {w}px')
            entrar(pg, 'http://127.0.0.1:8774', 'colaborador'); pg.wait_for_function("document.querySelector('h1')?.textContent.includes('encerrada')")
            if pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") > 0: problemas.append(f'ROLAGEM TL-04 {w}px')
            c.close()
        b.close()
finally:
    S.kill(); S2.kill()
print('\n'.join(problemas) if problemas else 'SEM PROBLEMAS'); sys.exit(1 if problemas else 0)
