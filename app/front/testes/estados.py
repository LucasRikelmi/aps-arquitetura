"""Fluxos reais contra dev/servidor.mjs: login, os 9 estados, autorização 404, sessão expirada, acessibilidade básica."""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from playwright.sync_api import sync_playwright
from comum import servidor, navegador, entrar, ir, Resultado

r = Resultado()
S1 = servidor(8771); S2 = servidor(8772, JANELA='encerrada')
B1, B2 = 'http://127.0.0.1:8771', 'http://127.0.0.1:8772'
try:
    with sync_playwright() as p:
        b = navegador(p)
        def novo(w=1280):
            c = b.new_context(viewport={'width': w, 'height': 900}); pg = c.new_page(); erros = []
            pg.on('pageerror', lambda e: erros.append(str(e)))
            pg.on('console', lambda m: erros.append(m.text) if m.type == 'error' and '401' not in m.text and '404' not in m.text and '409' not in m.text else None)
            return pg, erros
        def foco_ok(pg): return pg.evaluate("document.activeElement!==document.body")

        # ---- TL-01 e estado erro ----
        pg, e = novo(); entrar(pg, B1, 'colaborador', senha='errada'); pg.wait_for_selector('[role=alert]')
        r.ok('TL-01 erro: mensagem única', 'E-mail ou senha incorretos.' in pg.inner_text('[role=alert]'))
        pg.get_by_label('E-mail corporativo').fill('quem.nao.existe@empresa.com.br'); pg.get_by_label('Senha').fill('qualquer'); pg.get_by_role('button', name='Entrar').click(); pg.wait_for_timeout(400)
        r.ok('TL-01 erro: usuário inexistente dá a mesma mensagem', 'E-mail ou senha incorretos.' in pg.inner_text('[role=alert]'))
        r.ok('TL-01 erro: foco no alerta', pg.evaluate("document.activeElement.getAttribute('role')")=='alert')
        r.ok('TL-01 sem texto "null"/"false" solto', 'null' not in pg.inner_text('body') and 'false' not in pg.inner_text('body'))
        r.ok('TL-01 sem atalhos nem textos de protótipo', not any(t in pg.inner_text('body').lower() for t in ('protótipo', 'atalhos', 'demo')))
        r.ok('TL-01 sem campos preenchidos de fábrica', pg.get_by_label('Senha').input_value() == '')
        pg.screenshot(path='/tmp/shots-front/estado_TL01_erro.png', full_page=True)
        entrar(pg, B1, 'colaborador'); pg.wait_for_selector('nav')
        r.ok('Login: cookie de sessão HttpOnly', any(c['name']=='sid' and c['httpOnly'] and c['sameSite']=='Strict' for c in pg.context.cookies()))
        r.ok('Login: sessão não fica acessível ao JavaScript', 'sid' not in pg.evaluate("document.cookie"))
        r.ok('TL-01 erros de console', not e, e)

        # ---- TL-02 erro / enviado / editar ----
        pg.get_by_role('button', name='Enviar check-in').click(); pg.wait_for_selector('[role=alert]')
        r.ok('TL-02 erro: lista campos faltantes', 'pergunta 1' in pg.inner_text('[role=alert]') and 'pergunta 2' in pg.inner_text('[role=alert]'))
        pg.screenshot(path='/tmp/shots-front/estado_TL02_erro.png', full_page=True)
        pg.locator('label', has_text='Bem').first.click(); pg.locator('label', has_text='Normal').click()
        pg.get_by_role('button', name='Enviar check-in').click(); pg.wait_for_selector('text=Check-in enviado')
        r.ok('TL-02 enviado (persistido no servidor)', True); r.ok('TL-02 enviado: foco no aviso', foco_ok(pg))
        pg.screenshot(path='/tmp/shots-front/estado_TL02_enviado.png', full_page=True)
        ir(pg, 'historico'); ir(pg, 'checkin'); pg.wait_for_selector('h1')
        r.ok('TL-02 reabrir mostra a resposta salva', pg.locator('input[name=humor][value="4"]').is_checked() and pg.get_by_role('button', name='Atualizar check-in').count()==1)

        # ---- autorização decidida pelo servidor: 404 e registro ----
        ir(pg, 'painel'); pg.wait_for_selector('h1')
        r.ok('Colaborador em #painel: servidor nega, tela mostra TL-17', 'Recurso inexistente' in pg.inner_text('h1') and pg.locator('main[data-tela="TL-17"]').count()==1)
        ir(pg, 'rota-que-nao-existe'); r.ok('Rota inexistente cai em TL-17', 'Recurso inexistente' in pg.inner_text('h1'))
        pg.screenshot(path='/tmp/shots-front/estado_TL17.png', full_page=True)

        # ---- sessão expirada no meio do uso ----
        pg.evaluate("fetch('/api/auth/logout',{method:'POST',headers:{'X-Requested-With':'fetch'}})"); pg.wait_for_timeout(300)
        ir(pg, 'historico', 700)
        r.ok('Sessão expirada: volta ao login com aviso', pg.locator('main[data-tela="TL-01"]').count()==1 and 'Sessão encerrada' in pg.inner_text('main'))
        r.ok('Colaborador erros de console', not e, e)

        # ---- TL-04: janela encerrada decidida pelo servidor ----
        pg, e = novo(); entrar(pg, B2, 'colaborador'); pg.wait_for_selector('h1')
        pg.wait_for_function("document.querySelector('h1')?.textContent.includes('encerrada')", timeout=4000)
        r.ok('TL-04 janela encerrada (servidor)', pg.locator('main[data-tela="TL-04"]').count()==1)
        pg.screenshot(path='/tmp/shots-front/estado_TL04.png', full_page=True)
        pg2, e2 = novo(); entrar(pg2, B1, 'colaborador'); pg2.wait_for_selector('nav'); ir(pg2, 'checkin-encerrado', 600)
        r.ok('TL-04 com janela aberta volta ao check-in', pg2.locator('main[data-tela="TL-02"]').count()==1)

        # ---- TL-03: mesmo layout, em 360 px ----
        pg3, e3 = novo(360); entrar(pg3, B1, 'colaborador'); pg3.wait_for_selector('h1')
        r.ok('TL-03 check-in em 360 px sem rolagem horizontal', pg3.evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth"))
        pg3.screenshot(path='/tmp/shots-front/estado_TL03_360.png', full_page=True)

        # ---- Gestor: TL-07, TL-09, TL-10 ----
        pg, e = novo(); entrar(pg, B1, 'gestor'); pg.wait_for_selector('nav')
        ir(pg, 'alertas'); pg.wait_for_selector('.item-alerta')
        pg.locator('.item-alerta').first.click(); pg.get_by_label('Ação realizada').select_option('Conversa individual'); pg.get_by_role('button', name='Registrar tratamento').click()
        pg.wait_for_selector('text=Alerta tratado'); r.ok('TL-07 tratado', True); r.ok('TL-07 foco após ação não fica no body', foco_ok(pg))
        pg.screenshot(path='/tmp/shots-front/estado_TL07_tratado.png', full_page=True)
        ir(pg, 'metas-nova'); pg.wait_for_selector('form')
        pg.get_by_label('Meta').first.fill('Nova meta'); pg.get_by_label('Responsável').select_option('Ana Souza'); pg.get_by_label('Início').fill('2026-12-10'); pg.get_by_label('Prazo').fill('2026-12-01'); pg.get_by_label('Indicador').fill('x')
        pg.get_by_role('button', name='Salvar meta').click(); pg.wait_for_selector('.msg-erro')
        r.ok('TL-09 erro: prazo antes do início', 'anterior ao início' in pg.inner_text('form'))
        pg.screenshot(path='/tmp/shots-front/estado_TL09_erro.png', full_page=True)
        pg.get_by_label('Prazo').fill('2026-12-31'); pg.get_by_role('button', name='Salvar meta').click(); pg.wait_for_selector('text=Meta salva'); r.ok('TL-09 salvo', True)
        ir(pg, 'metas'); pg.wait_for_selector('table'); r.ok('TL-09 meta aparece na lista (persistida)', 'Nova meta' in pg.inner_text('main'))
        ir(pg, 'progresso'); pg.wait_for_selector('table')
        pg.get_by_role('button', name='Ajustar progresso de Ana Souza').click(); pg.wait_for_selector('dialog[open]')
        r.ok('TL-10 diálogo com rótulo e foco no campo', pg.evaluate("document.activeElement.tagName=='INPUT' && document.activeElement.labels.length==1"))
        pg.get_by_label('Novo progresso (%)').fill('150'); pg.get_by_role('button', name='Salvar ajuste').click(); pg.wait_for_selector('.msg-erro')
        r.ok('TL-10 valor fora da faixa rejeitado', pg.locator('dialog[open]').count()==1)
        pg.get_by_label('Novo progresso (%)').fill('70'); pg.get_by_role('button', name='Salvar ajuste').click(); pg.wait_for_selector('td:has-text("ajustado pelo gestor")')
        r.ok('TL-10 ajuste aplicado, origem rotulada', '70%' in pg.inner_text('main') and pg.locator('dialog[open]').count()==0)
        r.ok('TL-10 foco no aviso de resultado', pg.evaluate("document.activeElement.getAttribute('role')=='status'"))
        r.ok('Gestor erros de console', not e, e)

        # ---- Administração: TL-11, TL-15, TL-16 ----
        pg, e = novo(); entrar(pg, B1, 'administracao'); pg.wait_for_selector('nav'); ir(pg, 'cadastro'); pg.wait_for_selector('form')
        pg.get_by_label('Nome').fill('Teste'); pg.get_by_label('E-mail corporativo').fill('ana.souza@empresa.com.br'); pg.get_by_label('Cargo').fill('x'); pg.get_by_label('Departamento').fill('y')
        pg.get_by_role('button', name='Cadastrar').click(); pg.wait_for_selector('text=já está cadastrado'); r.ok('TL-11 e-mail duplicado (409 do servidor)', True)
        pg.screenshot(path='/tmp/shots-front/estado_TL11_duplicado.png', full_page=True)
        # Bruno entra em outra aba para provar a revogação imediata ao desligar
        pb, eb = novo(); pb.goto(B1 + '/#entrar'); pb.get_by_label('E-mail corporativo').fill('bruno.matos@empresa.com.br'); pb.get_by_label('Senha').fill('senha-dev-123'); pb.get_by_role('button', name='Entrar').click(); pb.wait_for_selector('nav')
        pg.get_by_role('button', name='Desligar Bruno Matos').click(); pg.get_by_role('dialog').get_by_role('button', name='Desligar').click(); pg.wait_for_selector('text=perdeu o acesso')
        r.ok('TL-11 desligado', True); r.ok('TL-11 foco após ação não fica no body', foco_ok(pg))
        ir(pb, 'historico', 700)
        r.ok('Desligamento revoga a sessão da pessoa na hora (DA09)', pb.locator('main[data-tela="TL-01"]').count()==1)
        entrar(pb, B1, 'colaborador', email='bruno.matos@empresa.com.br'); pb.wait_for_selector('[role=alert]')
        r.ok('Pessoa desligada não consegue entrar de novo', 'E-mail ou senha incorretos.' in pb.inner_text('[role=alert]'))
        ir(pg, 'perfis'); pg.wait_for_selector('select')
        pg.get_by_label('Novo perfil de Carlos Lima').select_option('rh'); pg.get_by_role('dialog').get_by_role('button', name='Mudar perfil').click(); pg.wait_for_selector('text=Perfil alterado')
        r.ok('TL-15 mudança', True); r.ok('TL-15 foco após ação não fica no body', foco_ok(pg))
        pg.screenshot(path='/tmp/shots-front/estado_TL15_mudanca.png', full_page=True)
        ir(pg, 'log'); pg.wait_for_selector('table')
        r.ok('TL-16 registra o 404 de recurso de terceiro (RB-07)', 'negado (404)' in pg.inner_text('main'))
        r.ok('Admin erros de console', not e, e)

        # ---- acessibilidade básica em todas as telas de cada perfil ----
        rotas = {'rh': ['painel','alertas','cadastro','formulario','parametros','relatorios'], 'colaborador': ['checkin','historico'],
                 'gestor': ['painel','alertas','metas','metas-nova','progresso','relatorios'], 'administracao': ['cadastro','perfis','log'], 'diretoria': ['relatorios']}
        for perfil, lst in rotas.items():
            pg, e = novo(); entrar(pg, B1, perfil); pg.wait_for_selector('nav', timeout=4000)
            for rt in lst:
                ir(pg, rt, 450)
                sem = pg.evaluate("[...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(el=>!(el.labels&&el.labels.length)&&!el.getAttribute('aria-label')).map(el=>el.name||el.type)")
                r.ok(f'A11y rótulos {perfil} #{rt}', not sem, sem)
                r.ok(f'A11y foco no conteúdo {perfil} #{rt}', pg.evaluate("document.activeElement.id")=='conteudo')
                r.ok(f'A11y um único h1 {perfil} #{rt}', pg.locator('h1').count()==1)
                r.ok(f'A11y idioma e landmarks {perfil} #{rt}', pg.evaluate("document.documentElement.lang=='pt-BR' && !!document.querySelector('main') && !!document.querySelector('nav')"))
        b.close()
finally:
    S1.kill(); S2.kill()
sys.exit(1 if r.fim() else 0)
