"""Apoio dos testes: sobe dev/servidor.mjs, loga pelo formulário real e cria páginas do Chrome."""
import os, subprocess, sys, time, pathlib, urllib.request, shutil
from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent
os.makedirs('/tmp/shots-front', exist_ok=True)
SENHA = 'senha-dev-123'
EMAIL = {'colaborador': 'ana.souza@empresa.com.br', 'gestor': 'rafael.torres@empresa.com.br', 'rh': 'marina.costa@empresa.com.br',
         'diretoria': 'helena.martins@empresa.com.br', 'administracao': 'sergio.dias@empresa.com.br'}

def servidor(porta, **env):
    p = subprocess.Popen(['node', str(RAIZ / 'dev' / 'servidor.mjs')], env={**os.environ, 'PORTA': str(porta), **env},
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try:
            urllib.request.urlopen(f'http://127.0.0.1:{porta}/', timeout=1); return p
        except Exception: time.sleep(0.1)
    p.kill(); raise RuntimeError('servidor não subiu')

def navegador(p):
    return p.chromium.launch(executable_path=os.environ.get('CHROME_PATH'), args=['--no-sandbox'])

def entrar(pg, base, perfil, senha=SENHA, email=None):
    pg.goto(base + '/#entrar')
    pg.get_by_label('E-mail corporativo').fill(email or EMAIL[perfil])
    pg.get_by_label('Senha').fill(senha)
    pg.get_by_role('button', name='Entrar').click()

def ir(pg, rota, espera=350):
    pg.evaluate(f"location.hash = '#{rota}'"); pg.wait_for_timeout(espera)

class Resultado:
    def __init__(self): self.linhas = []
    def ok(self, nome, cond, extra=''): self.linhas.append(('OK   ' if cond else 'FALHA ') + nome + (f' {extra}' if extra and not cond else ''))
    def fim(self):
        print('\n'.join(self.linhas)); falhas = sum(1 for l in self.linhas if l.startswith('FALHA')); print(f'\nFALHAS: {falhas}'); return falhas
