import os; os.makedirs("/tmp/shots-front", exist_ok=True)
import sys, json, subprocess, time, os
from playwright.sync_api import sync_playwright

import pathlib
ROOT = str(pathlib.Path(__file__).resolve().parent.parent)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8765', '--bind', '127.0.0.1', '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
URL = 'http://127.0.0.1:8765/index.html'
PERFIS = {
 'colaborador': ['checkin','checkin-celular','checkin-encerrado','historico','painel'],
 'gestor': ['painel','alertas','metas','metas/nova','progresso','relatorios','cadastro'],
 'rh': ['painel','alertas','cadastro','formulario','parametros','relatorios','perfis'],
 'diretoria': ['relatorios','painel'],
 'administracao': ['cadastro','perfis','log','relatorios'],
}
LARGURAS = [360, 768, 1280, 1920]
problemas = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME_PATH'), args=['--no-sandbox'])
    for perfil, rotas in PERFIS.items():
        for w in LARGURAS:
            ctx = b.new_context(viewport={'width': w, 'height': 900})
            pg = ctx.new_page()
            erros = []
            pg.on('console', lambda m: erros.append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: erros.append(str(e)))
            pg.goto(URL + '#/entrar')
            pg.get_by_role('button', name={'colaborador':'Colaborador','gestor':'Gestor','rh':'RH','diretoria':'Diretoria','administracao':'Administração'}[perfil], exact=True).click()
            pg.wait_for_selector('h1')
            for r in rotas:
                pg.evaluate(f"location.hash = '#/{r}'")
                pg.wait_for_timeout(450)
                h1 = pg.evaluate("document.querySelector('h1')?.textContent || ''")
                sw = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
                if sw > 0: problemas.append(f'OVERFLOW {perfil} {w}px #{r}: +{sw}px')
                if not h1: problemas.append(f'SEM H1 {perfil} #{r}')
                if w in (360, 1280) and perfil in ('colaborador','gestor','rh','administracao'):
                    pg.screenshot(path=f'/tmp/shots-front/{perfil}_{r.replace("/","-")}_{w}.png', full_page=True)
            if erros: problemas.append(f'CONSOLE {perfil} {w}px: {erros[:3]}')
            ctx.close()
    b.close()
srv.terminate()
print('\n'.join(problemas) if problemas else 'SEM PROBLEMAS')
