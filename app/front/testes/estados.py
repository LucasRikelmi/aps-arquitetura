import os; os.makedirs("/tmp/shots-front", exist_ok=True)
import sys, subprocess, time
from playwright.sync_api import sync_playwright
import pathlib
ROOT = str(pathlib.Path(__file__).resolve().parent.parent)
srv=subprocess.Popen([sys.executable,'-m','http.server','8766','--bind','127.0.0.1','-d',ROOT],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
U='http://127.0.0.1:8766/index.html'
res=[]
def ok(nome,cond,extra=''):
    res.append(('OK  ' if cond else 'FALHA')+' '+nome+(' '+str(extra) if (extra and not cond) else ''))
def entrar(pg,perfil):
    pg.goto(U+'#/entrar'); pg.get_by_role('button',name=perfil,exact=True).click(); pg.wait_for_selector('nav')
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH'), args=['--no-sandbox'])
    def novo(w=1280):
        c=b.new_context(viewport={'width':w,'height':900}); pg=c.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
        return pg,errs
    # TL-01 e estado erro
    pg,e=novo(); pg.goto(U+'#/entrar')
    pg.get_by_role('button',name='Simular credencial inválida').click(); pg.wait_for_selector('[role=alert]')
    ok('TL-01 erro: mensagem única', 'E-mail ou senha incorretos.' in pg.inner_text('[role=alert]'))
    ok('TL-01 erro: foco no alerta', pg.evaluate("document.activeElement.getAttribute('role')")=='alert')
    ok('TL-01 sem texto "null"/"false" solto', 'null' not in pg.inner_text('body') and 'false' not in pg.inner_text('body'))
    pg.screenshot(path='/tmp/shots-front/estado_TL01_erro.png',full_page=True)
    ok('TL-01 erros de console',not e,e)
    # TL-02 erro e enviado
    pg,e=novo(); entrar(pg,'Colaborador')
    pg.get_by_role('button',name='Enviar check-in').click(); pg.wait_for_selector('[role=alert]')
    ok('TL-02 erro: lista campos faltantes','pergunta 1' in pg.inner_text('[role=alert]') and 'pergunta 2' in pg.inner_text('[role=alert]'))
    pg.screenshot(path='/tmp/shots-front/estado_TL02_erro.png',full_page=True)
    pg.get_by_label('4 Bem').check() if pg.get_by_label('4 Bem').count() else pg.locator('label',has_text='Bem').first.click()
    pg.locator('label',has_text='Normal').click()
    pg.get_by_role('button',name='Enviar check-in').click(); pg.wait_for_selector('text=Check-in enviado')
    ok('TL-02 enviado','Check-in enviado' in pg.inner_text('main'))
    pg.screenshot(path='/tmp/shots-front/estado_TL02_enviado.png',full_page=True)
    pg.get_by_role('button',name='Editar resposta').click(); ok('TL-02 editar na janela', pg.get_by_role('button',name='Atualizar check-in').count()==1)
    # guarda de perfil -> 404
    pg.goto(U+'#/painel'); pg.wait_for_selector('h1')
    ok('Guarda: colaborador em #/painel cai em TL-17', 'Recurso inexistente' in pg.inner_text('h1'))
    pg.goto(U+'#/rota-que-nao-existe'); pg.wait_for_selector('h1'); ok('Rota inexistente cai em TL-17','Recurso inexistente' in pg.inner_text('h1'))
    pg.screenshot(path='/tmp/shots-front/estado_TL17.png',full_page=True)
    ok('Colaborador erros de console',not e,e)
    # TL-04
    pg,e=novo(); pg.goto(U+'?mock=encerrada#/entrar'); pg.get_by_role('button',name='Colaborador',exact=True).click(); pg.wait_for_selector('nav')
    pg.wait_for_function("document.querySelector('h1')?.textContent.includes('encerrada')",timeout=4000)
    ok('TL-04 janela encerrada','encerrada' in pg.inner_text('h1'))
    pg.screenshot(path='/tmp/shots-front/estado_TL04.png',full_page=True)
    # TL-03
    pg,e=novo(); entrar(pg,'Colaborador'); pg.goto(U+'#/checkin-celular'); pg.wait_for_selector('.quadro-celular')
    ok('TL-03 quadro de celular',pg.locator('.quadro-celular').count()==1)
    # Gestor: TL-07 tratado, TL-09 erro/salvo
    pg,e=novo(); entrar(pg,'Gestor'); pg.goto(U+'#/alertas'); pg.wait_for_selector('.item-alerta')
    pg.locator('.item-alerta').first.click(); pg.get_by_label('Ação realizada').select_option('Conversa individual'); pg.get_by_role('button',name='Registrar tratamento').click()
    pg.wait_for_selector('text=Alerta tratado'); ok('TL-07 tratado',True)
    pg.screenshot(path='/tmp/shots-front/estado_TL07_tratado.png',full_page=True)
    pg.goto(U+'#/metas/nova'); pg.wait_for_selector('form')
    pg.get_by_label('Meta').first.fill('Nova meta'); pg.get_by_label('Responsável').select_option('Ana Souza'); pg.get_by_label('Início').fill('2026-12-10'); pg.get_by_label('Prazo').fill('2026-12-01'); pg.get_by_label('Indicador').fill('x')
    pg.get_by_role('button',name='Salvar meta').click(); pg.wait_for_selector('.msg-erro')
    ok('TL-09 erro: prazo antes do início','anterior ao início' in pg.inner_text('form'))
    pg.screenshot(path='/tmp/shots-front/estado_TL09_erro.png',full_page=True)
    pg.get_by_label('Prazo').fill('2026-12-31'); pg.get_by_role('button',name='Salvar meta').click(); pg.wait_for_selector('text=Meta salva'); ok('TL-09 salvo',True)
    ok('Gestor erros de console',not e,e)
    # RH/Admin: TL-11 duplicado e desligado, TL-15 mudança, 404 de recurso de terceiro
    pg,e=novo(); entrar(pg,'Administração'); pg.goto(U+'#/cadastro'); pg.wait_for_selector('form')
    pg.get_by_label('Nome').fill('Teste'); pg.get_by_label('E-mail corporativo').fill('ana.souza@empresa.com.br'); pg.get_by_label('Cargo').fill('x'); pg.get_by_label('Departamento').fill('y')
    pg.get_by_role('button',name='Cadastrar').click(); pg.wait_for_selector('text=já está cadastrado'); ok('TL-11 e-mail duplicado',True)
    pg.screenshot(path='/tmp/shots-front/estado_TL11_duplicado.png',full_page=True)
    pg.get_by_role('button',name='Desligar Bruno Matos').click(); pg.get_by_role('dialog').get_by_role('button',name='Desligar').click(); pg.wait_for_selector('text=perdeu o acesso'); ok('TL-11 desligado',True)
    pg.goto(U+'#/perfis'); pg.wait_for_selector('select')
    pg.get_by_label('Novo perfil de Ana Souza').select_option('gestor'); pg.get_by_role('dialog').get_by_role('button',name='Mudar perfil').click(); pg.wait_for_selector('text=Perfil alterado'); ok('TL-15 mudança',True)
    pg.screenshot(path='/tmp/shots-front/estado_TL15_mudanca.png',full_page=True)
    ok('Admin erros de console',not e,e)
    # Acessibilidade básica em todas as telas de um perfil
    for perfil,rotas in {'Colaborador':['checkin','historico'],'Gestor':['painel','alertas','metas','metas/nova','progresso','relatorios'],'RH':['cadastro','formulario','parametros'],'Administração':['perfis','log']}.items():
        pg,e=novo(); entrar(pg,perfil)
        for r in rotas:
            pg.evaluate(f"location.hash='#/{r}'"); pg.wait_for_timeout(400)
            sem=pg.evaluate("""[...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(el=>!(el.labels&&el.labels.length)&&!el.getAttribute('aria-label')).map(el=>el.name||el.type)""")
            ok(f'A11y rótulos {perfil} #{r}',not sem,sem)
            foco=pg.evaluate("document.activeElement.id")
            ok(f'A11y foco no conteúdo {perfil} #{r}',foco=='conteudo',foco)
            ok(f'A11y um único h1 {perfil} #{r}',pg.locator('h1').count()==1,pg.locator('h1').count())
            ok(f'A11y lang e landmarks {perfil} #{r}',pg.evaluate("document.documentElement.lang=='pt-BR' && !!document.querySelector('main') && !!document.querySelector('nav')"))
    b.close()
srv.terminate(); print('\n'.join(res)); print('\nFALHAS:',sum(1 for r in res if r.startswith('FALHA')))
