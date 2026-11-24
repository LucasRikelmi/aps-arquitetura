"""Fluxos reais contra dev/servidor.mjs: login (401 e 429), os 9 estados, TL-07, autorização 404, sessão expirada, a11y básica.

    CHROME_PATH=/opt/pw-browsers/chromium python3 testes/estados.py
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from playwright.sync_api import sync_playwright
from comum import servidor, navegador, entrar, ir, Resultado

r = Resultado()
S1 = servidor(8771); S2 = servidor(8772, JANELA='encerrada'); S3 = servidor(8775, LIMITE_LOGIN='2', BLOQUEIO_S='120')
B1, B2, B3 = 'http://127.0.0.1:8771', 'http://127.0.0.1:8772', 'http://127.0.0.1:8775'
CONSOLE_ESPERADO = ('401', '404', '409', '422', '429')
try:
    with sync_playwright() as p:
        b = navegador(p)
        def novo(w=1280):
            c = b.new_context(viewport={'width': w, 'height': 900}); pg = c.new_page(); erros = []
            pg.on('pageerror', lambda e: erros.append(str(e)))
            pg.on('console', lambda m: erros.append(m.text) if m.type == 'error' and not any(s in m.text for s in CONSOLE_ESPERADO) else None)
            return pg, erros
        def foco_ok(pg): return pg.evaluate("document.activeElement!==document.body")
        def tela(pg, tl): return pg.locator(f'main[data-tela="{tl}"]').count() == 1

        # ---- TL-01 e estado "TL-01 erro" ----
        pg, e = novo(); entrar(pg, B1, 'colaborador', senha='errada'); pg.wait_for_selector('[role=alert]')
        r.ok('TL-01 erro: mensagem única', 'E-mail ou senha incorretos.' in pg.inner_text('[role=alert]'))
        pg.get_by_label('E-mail corporativo').fill('quem.nao.existe@empresa.com.br'); pg.get_by_label('Senha').fill('qualquer'); pg.get_by_role('button', name='Entrar').click(); pg.wait_for_timeout(400)
        r.ok('TL-01 erro: usuário inexistente dá a mesma mensagem', 'E-mail ou senha incorretos.' in pg.inner_text('[role=alert]'))
        r.ok('TL-01 erro: foco no alerta', foco_ok(pg))
        r.ok('TL-01 sem campos preenchidos de fábrica', pg.get_by_label('Senha').input_value() == '')
        pg.screenshot(path='/tmp/shots-front/estado_TL01_erro.png', full_page=True)
        entrar(pg, B1, 'colaborador'); pg.wait_for_selector('nav')
        r.ok('Login: cookie de sessão HttpOnly SameSite=Strict', any(c['name'] == 'sid' and c['httpOnly'] and c['sameSite'] == 'Strict' for c in pg.context.cookies()))
        r.ok('Login: sessão não fica acessível ao JavaScript', 'sid' not in pg.evaluate("document.cookie"))

        # ---- TL-01: 429 com Retry-After (servidor com LIMITE_LOGIN=2, BLOQUEIO_S=120) ----
        pq, eq = novo()
        for _ in range(2): entrar(pq, B3, 'colaborador', senha='errada'); pq.wait_for_timeout(300)
        entrar(pq, B3, 'colaborador'); pq.wait_for_timeout(400)
        txt = pq.inner_text('[role=alert]') if pq.locator('[role=alert]').count() else ''
        r.ok('TL-01 429: prazo vem do Retry-After (2 minutos)', 'Tente de novo em 2 minutos' in txt, txt)
        r.ok('TL-01 429: sem "15 minutos" fixo', '15 minutos' not in txt)
        r.ok('TL-01 429: senha certa também bloqueada durante o prazo', tela(pq, 'TL-01'))

        # ---- TL-02 erro / enviado / reabrir ----
        pg.get_by_role('button', name='Enviar check-in').click(); pg.wait_for_selector('[role=alert]')
        alerta = pg.inner_text('[role=alert]')
        r.ok('TL-02 erro: lista campos faltantes', 'pergunta 1' in alerta and 'pergunta 2' in alerta, alerta)
        pg.screenshot(path='/tmp/shots-front/estado_TL02_erro.png', full_page=True)
        pg.locator('input[name=humor][value="4"]').check(force=True); pg.locator('input[name=carga][value="Normal"]').check(force=True)
        pg.get_by_role('button', name='Enviar check-in').click(); pg.wait_for_selector('text=Check-in enviado')
        r.ok('TL-02 enviado: foco no aviso', foco_ok(pg))
        pg.screenshot(path='/tmp/shots-front/estado_TL02_enviado.png', full_page=True)
        ir(pg, 'historico'); ir(pg, 'checkin'); pg.wait_for_selector('h1')
        r.ok('TL-02 reabrir mostra a resposta salva', pg.locator('input[name=humor][value="4"]').is_checked())

        # ---- autorização decidida pelo servidor: 404 ----
        ir(pg, 'painel', 600); r.ok('Colaborador em #painel: servidor nega, tela TL-17', tela(pg, 'TL-17'))
        ir(pg, 'rota-que-nao-existe'); r.ok('Rota inexistente cai em TL-17', tela(pg, 'TL-17'))
        r.ok('TL-17 nunca diz "sem permissão"', 'permiss' not in pg.inner_text('main').lower())

        # ---- sessão expirada no meio do uso ----
        pg.evaluate("fetch('/api/auth/logout',{method:'POST',headers:{'X-Requested-With':'fetch'}})"); pg.wait_for_timeout(300)
        ir(pg, 'historico', 700)
        r.ok('Sessão expirada: volta ao login com aviso', tela(pg, 'TL-01') and 'Sessão encerrada' in pg.inner_text('main'))
        r.ok('Colaborador sem erros de console', not e, e)

        # ---- TL-04: janela encerrada decidida pelo servidor ----
        pg, e = novo(); entrar(pg, B2, 'colaborador'); pg.wait_for_timeout(800)
        r.ok('TL-04 janela encerrada (servidor)', tela(pg, 'TL-04'))
        pg2, _ = novo(); entrar(pg2, B1, 'colaborador'); pg2.wait_for_selector('nav'); ir(pg2, 'checkin-encerrado', 600)
        r.ok('TL-04 com janela aberta volta ao check-in', tela(pg2, 'TL-02'))

        # ---- TL-03: mesmo layout em 360 px ----
        pg3, _ = novo(360); entrar(pg3, B1, 'colaborador'); pg3.wait_for_selector('h1')
        r.ok('TL-03 check-in em 360 px sem rolagem horizontal', pg3.evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth"))

        # ---- RH em TL-07: só observa ----
        pr, er = novo(); entrar(pr, B1, 'rh'); pr.wait_for_selector('nav'); ir(pr, 'alerta?id=1', 600)
        r.ok('TL-07 RH: sem formulário de ação', tela(pr, 'TL-07') and pr.locator('form').count() == 0)
        r.ok('RH sem erros de console', not er, er)

        # ---- Gestor: TL-07 (erro de validação e tratado), TL-09, TL-10 ----
        pg, e = novo(); entrar(pg, B1, 'gestor'); pg.wait_for_selector('nav')
        ir(pg, 'alerta?id=1', 600)
        pg.get_by_role('button', name='Registrar ação e marcar como tratado').click(); pg.wait_for_selector('[role=alert]')
        form = pg.inner_text('form')
        r.ok('TL-07 erro: descrição vazia, um só texto', form.count('Informe o que foi feito.') >= 1 and 'Descreva' not in form, form)
        pg.get_by_label('O que foi feito').fill('Conversa 1:1 e ajuste de prazo.')
        pg.get_by_role('button', name='Registrar ação e marcar como tratado').click(); pg.wait_for_selector('text=Alerta tratado')
        r.ok('TL-07 tratado: foco não fica no body', foco_ok(pg))
        r.ok('TL-07 tratado: selo do topo atualizado', pg.locator('.cab-semana').inner_text().find('Tratado') >= 0)
        pg.screenshot(path='/tmp/shots-front/estado_TL07_tratado.png', full_page=True)
        ir(pg, 'painel'); ir(pg, 'alerta?id=1', 600)
        r.ok('TL-07 reaberto depois de tratado mostra tratado sem formulário', pg.locator('form').count() == 0 and 'Alerta tratado' in pg.inner_text('main'))

        ir(pg, 'metas-nova', 500); pg.wait_for_selector('form')
        pg.get_by_label('Título da meta').fill('Nova meta'); pg.get_by_label('Responsável').select_option(index=1)
        pg.get_by_label('Indicador de acompanhamento').fill('x'); pg.get_by_label('Data de início').fill('2026-12-10'); pg.get_by_label('Prazo').fill('2026-12-01')
        pg.get_by_role('button', name='Salvar meta').click(); pg.wait_for_selector('[role=alert]')
        r.ok('TL-09 erro: prazo antes do início', 'anterior ao início' in pg.inner_text('form'))
        pg.screenshot(path='/tmp/shots-front/estado_TL09_erro.png', full_page=True)
        pg.get_by_label('Prazo').fill('2026-12-31'); pg.get_by_role('button', name='Salvar meta').click(); pg.wait_for_selector('text=Meta salva')
        r.ok('TL-09 salvo', True)
        ir(pg, 'metas', 500); r.ok('TL-09 meta aparece na lista (persistida)', 'Nova meta' in pg.inner_text('main'))
        r.ok('Gestor sem erros de console', not e, e)

        # ---- RH / Administração: TL-11 duplicado e desligado, TL-15 mudança ----
        pg, e = novo(); entrar(pg, B1, 'administracao'); pg.wait_for_selector('nav'); ir(pg, 'cadastro', 600)
        pg.get_by_label('Matrícula').fill('9999'); pg.get_by_label('Nome completo').fill('Teste'); pg.get_by_label('E-mail corporativo').fill('ana.souza@empresa.com.br')
        pg.get_by_label('Cargo').select_option(index=1); pg.get_by_label('Departamento').select_option(index=1); pg.get_by_label('Data de admissão').fill('2026-11-01')
        pg.get_by_role('button', name='Salvar cadastro').click(); pg.wait_for_timeout(600)
        r.ok('TL-11 e-mail duplicado (409 do servidor)', 'já' in pg.inner_text('form').lower() and 'cadastrado' in pg.inner_text('form').lower())
        pg.screenshot(path='/tmp/shots-front/estado_TL11_duplicado.png', full_page=True)
        pb, _ = novo(); entrar(pb, B1, 'colaborador', email='bruno.lima@empresa.com.br'); pb.wait_for_selector('nav')
        pg.get_by_role('button', name='Desligar Bruno Lima').click(); pg.get_by_role('dialog').get_by_role('button', name='Desligar').click(); pg.wait_for_selector('text=Pessoa desligada')
        r.ok('TL-11 desligado: foco não fica no body', foco_ok(pg))
        ir(pb, 'historico', 700); r.ok('Desligamento revoga a sessão aberta (DA09)', tela(pb, 'TL-01'))
        entrar(pb, B1, 'colaborador', email='bruno.lima@empresa.com.br'); pb.wait_for_selector('[role=alert]')
        r.ok('Pessoa desligada não entra de novo, mesma mensagem', 'E-mail ou senha incorretos.' in pb.inner_text('[role=alert]'))
        ir(pg, 'perfis', 600)
        pg.get_by_label('RH: Diego Rocha').check(); pg.get_by_role('dialog').get_by_role('button', name='Atribuir').click(); pg.wait_for_selector('text=Perfil alterado')
        r.ok('TL-15 mudança: foco não fica no body', foco_ok(pg))
        pg.screenshot(path='/tmp/shots-front/estado_TL15_mudanca.png', full_page=True)
        r.ok('Administração sem erros de console', not e, e)

        # ---- acessibilidade básica em todas as telas de cada perfil ----
        rotas = {'colaborador': ['checkin', 'historico'], 'gestor': ['painel', 'alerta?id=2', 'metas', 'metas-nova', 'validar?id=1', 'relatorios'],
                 'rh': ['painel', 'cadastro', 'formulario', 'parametros', 'relatorios'], 'administracao': ['cadastro', 'perfis', 'log'], 'diretoria': ['relatorios']}
        for perfil, lst in rotas.items():
            pg, e = novo(); entrar(pg, B1, perfil); pg.wait_for_selector('nav', timeout=4000)
            for rt in lst:
                ir(pg, rt, 500)
                sem = pg.evaluate("[...document.querySelectorAll('main input:not([type=hidden]),main select,main textarea')].filter(el=>!(el.labels&&el.labels.length)&&!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby')).map(el=>el.name||el.type)")
                r.ok(f'A11y rótulos {perfil} #{rt}', not sem, sem)
                r.ok(f'A11y um único h1 {perfil} #{rt}', pg.locator('h1').count() == 1)
                r.ok(f'A11y idioma e landmarks {perfil} #{rt}', pg.evaluate("document.documentElement.lang=='pt-BR' && !!document.querySelector('main') && !!document.querySelector('nav')"))
                r.ok(f'Não cai em TL-17 {perfil} #{rt}', not tela(pg, 'TL-17'))
            r.ok(f'{perfil} sem erros de console nas telas', not e, e)
        b.close()
finally:
    S1.kill(); S2.kill(); S3.kill()
sys.exit(1 if r.fim() else 0)
