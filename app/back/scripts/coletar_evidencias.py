#!/usr/bin/env python3
"""Evidencias APS/Benigno: somente homologacao autorizada.
Uso: python3 scripts/coletar_evidencias.py <equivalencia|corpo|taxa|acesso|todos>
Acesso requer usuario comum, usuario administrador e UUID de terceiro.
Credenciais sao lidas exclusivamente de variaveis de ambiente.
"""
import os, sys, json, ssl, time, math, statistics, pathlib, datetime, urllib.request, urllib.error, urllib.parse, http.cookiejar, uuid, random

BASE=os.environ.get('EVID_BASE_URL','').rstrip('/')
if not BASE.startswith('https://'):
    raise SystemExit('EVID_BASE_URL deve comecar com https:// (homologacao autorizada).')
if os.environ.get('EVID_HOMOLOGACAO') != 'SIM':
    raise SystemExit('Defina EVID_HOMOLOGACAO=SIM para confirmar que o alvo e homologacao autorizada.')
OUTPUT=pathlib.Path(os.environ.get('EVID_DIR','reports/evidencias-25-11'))
OUTPUT.mkdir(parents=True,exist_ok=True)
URL=BASE+'/api/auth/login'
INVALID_LOGIN=os.environ.get('EVID_LOGIN_INEXISTENTE','nao-existe-evidencia-2511@example.invalid')
KNOWN_LOGIN=os.environ.get('EVID_LOGIN_EXISTENTE','')
WRONG_PASS=os.environ.get('EVID_SENHA_ERRADA','SenhaErradaPropositalDaApresentacao!')
N=int(os.environ.get('EVID_AMOSTRAS','6'))
if not 3<=N<=12:raise SystemExit('EVID_AMOSTRAS precisa estar entre 3 e 12')
PAUSE=float(os.environ.get('EVID_PAUSA_S','7'))
if PAUSE<0:raise SystemExit('EVID_PAUSA_S nao pode ser negativo')

class Client:
    def __init__(self):
        self.jar=http.cookiejar.CookieJar()
        self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
    def request(self,method,path,body=None,headers=None):
        url=BASE+path
        data=(json.dumps(body,ensure_ascii=False).encode() if body is not None else None)
        h={'Accept':'application/json','Origin':BASE}
        if data is not None:h['Content-Type']='application/json'
        if headers:h.update(headers)
        req=urllib.request.Request(url,data=data,headers=h,method=method)
        before=time.perf_counter_ns()
        try:
            with self.opener.open(req,timeout=25) as resp:
                status=resp.status;content=resp.read(4096)
        except urllib.error.HTTPError as e:
            status=e.code; content=e.read(4096)
        elapsed=(time.perf_counter_ns()-before)/1e6
        try:result=json.loads(content.decode())
        except (ValueError,UnicodeError):result={'raw_response':'NAO_JSON'}
        return {'http':status,'body':result,'latencia_ms':round(elapsed,3)}

def save(name,result):
    filename=OUTPUT/(name+'.json')
    payload={'data_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
             'alvo_origem':BASE,'cenario':name,'resultado':result}
    filename.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'{name}: {"APROVADO" if result.get("aprovado") else "NAO COMPROVADO"} -> {filename}')
    return payload

def percentile(values,p):
    vals=sorted(values)
    k=max(0,math.ceil(len(vals)*p/100)-1)
    return round(vals[k],3)

def equivalencia():
    if not KNOWN_LOGIN: return save('01_equivalencia',{'aprovado':False,'motivo':'Defina EVID_LOGIN_EXISTENTE: conta real de homologacao (senha propositadamente errada).'})
    cases=[('inexistente',INVALID_LOGIN),('senha_incorreta',KNOWN_LOGIN)]*N
    random.Random(2511).shuffle(cases)
    by={'inexistente':[],'senha_incorreta':[]};responses=[]
    c=Client()
    for i,(kind,login) in enumerate(cases):
        if i:time.sleep(PAUSE)
        r=c.request('POST','/api/auth/login',{'login':login,'senha':WRONG_PASS})
        by[kind].append(r['latencia_ms'])
        responses.append({'cenario':kind,'http':r['http'],'body':r['body'],'latencia_ms':r['latencia_ms']})
    identical=(len({json.dumps({'http':x['http'],'body':x['body']},ensure_ascii=False,sort_keys=True) for x in responses})==1)
    all401=all(x['http']==401 for x in responses)
    a=statistics.median(by['inexistente']);b=statistics.median(by['senha_incorreta'])
    ratio=max(a,b)/max(min(a,b),.001)
    # Nao declarar equivalencia temporal so com uma amostra pequena: relatorio apresenta dados, sem limiar arbitrario.
    return save('01_equivalencia',{'aprovado':identical and all401,'mesmo_status_e_corpo':identical and all401,
       'equivalencia_temporal_conclusiva':False,'nota':'Avaliacao estatistica da latencia requer amostragem representativa e controle de carga; estas medidas sao exploratorias.',
       'mediana_inexistente_ms':round(a,3),'mediana_senha_incorreta_ms':round(b,3),'razao_mediana_maior_menor':round(ratio,3),
       'amostras_por_caminho':N,'p95_inexistente_ms':percentile(by['inexistente'],95),'p95_senha_incorreta_ms':percentile(by['senha_incorreta'],95),
       'respostas':responses})

def corpo():
    # Apenas logins ficticios de teste, sem credenciais reais.
    huge={'login':'amostra-corpo@example.invalid','senha':'X'*1800}
    r=Client().request('POST','/api/auth/login',huge)
    return save('02_corpo_413',{'aprovado':r['http']==413 and isinstance(r['body'],dict) and 'erro' in r['body'],
        'tamanho_json_bytes':len(json.dumps(huge).encode()),'http':r['http'],'body':r['body'],
        'nota':'Comprova a resposta via endereco publico do Nginx; confirmar config do location de login.'})

def taxa():
    # Taxa da APS = 10/min por IP com burst 10. Total limitado e sequencial.
    count=int(os.environ.get('EVID_TAXA_REQUISICOES','24'))
    if count<21 or count>30:raise SystemExit('EVID_TAXA_REQUISICOES entre 21 e 30')
    c=Client();observed=[]
    for i in range(count):
        # Login diferente para evidenciar o limite por IP, sem exaurir o limite por conta.
        r=c.request('POST','/api/auth/login',{'login':f'taxa-evid-{i}-{uuid.uuid4().hex[:6]}@example.invalid','senha':'SenhaInvalidaTeste'})
        observed.append({'seq':i+1,'http':r['http'],'body':r['body'],'latencia_ms':r['latencia_ms']})
        if r['http']==429:break
    got=any(x['http']==429 and isinstance(x['body'],dict) and 'erro' in x['body'] for x in observed)
    return save('03_taxa_429',{'aprovado':got,'total_enviadas':len(observed),'contagem_http':{str(k):sum(x['http']==k for x in observed) for k in set(x['http'] for x in observed)},
       'respostas':observed,'observacao':'Rodar por ultimo; esperar janela de rate limit expirar antes de repetir.'})

def acesso():
    user=os.environ.get('EVID_USUARIO_COMUM',''); pwd=os.environ.get('EVID_SENHA_COMUM','')
    admin=os.environ.get('EVID_USUARIO_ADMIN',''); apwd=os.environ.get('EVID_SENHA_ADMIN','')
    target=os.environ.get('EVID_UUID_TERCEIRO','')
    if not all((user,pwd,admin,apwd,target)):
        return save('04_acesso_404_log',{'aprovado':False,'motivo':'Defina EVID_USUARIO_COMUM/EVID_SENHA_COMUM/EVID_USUARIO_ADMIN/EVID_SENHA_ADMIN/EVID_UUID_TERCEIRO.'})
    try:uuid.UUID(target)
    except ValueError:return save('04_acesso_404_log',{'aprovado':False,'motivo':'EVID_UUID_TERCEIRO invalido.'})
    normal=Client();adm=Client()
    auth1=normal.request('POST','/api/auth/login',{'login':user,'senha':pwd})
    if auth1['http']!=200:return save('04_acesso_404_log',{'aprovado':False,'motivo':'Login do usuario comum falhou; confira ambiente e rate limiting.','http':auth1['http']})
    denied=normal.request('GET',f'/api/pessoas/{target}/checkins')
    auth2=adm.request('POST','/api/auth/login',{'login':admin,'senha':apwd})
    if auth2['http']!=200:return save('04_acesso_404_log',{'aprovado':False,'motivo':'Login administrativo falhou.','http_negativa':denied['http'],'http_admin':auth2['http']})
    # Fila de auditoria e assincrona: aguardar gravacao sem assumir sucesso.
    records=[]
    for _ in range(10):
        logs=adm.request('GET','/api/admin/logs?limit=100')
        if logs['http']!=200:break
        records=[x for x in logs['body'].get('logs',[]) if x.get('acao')=='negativa' and x.get('resultado')=='negado' and x.get('alvo_id')==target]
        if records:break
        time.sleep(1)
    # Ocultar identificadores pessoais no arquivo publico, registrar apenas campos minimos + id do log.
    matches=[{'id':x.get('id'),'ocorrido_em':x.get('ocorrido_em'),'recurso':x.get('recurso'),'acao':x.get('acao'),'resultado':x.get('resultado')} for x in records[:3]]
    return save('04_acesso_404_log',{'aprovado':denied['http']==404 and bool(records),
       'resposta_http':denied['http'],'resposta_json':denied['body'],'log_negativa_encontrado':bool(records),'registros_log':matches,
       'nota':'Registro so e evidencia de auditoria se for correlacionado com esta tentativa; usar ambiente sem registros anteriores do mesmo alvo ou comparar timestamp e ator.'})

SCENARIOS={'equivalencia':equivalencia,'corpo':corpo,'taxa':taxa,'acesso':acesso}
if __name__=='__main__':
    cmd=sys.argv[1] if len(sys.argv)>1 else ''
    if cmd not in (*SCENARIOS,'todos'):
        raise SystemExit('Uso: python3 scripts/coletar_evidencias.py equivalencia|corpo|taxa|acesso|todos')
    ordered=['equivalencia','corpo','acesso','taxa'] if cmd=='todos' else [cmd]
    results=[SCENARIOS[k]() for k in ordered]
    summary={'data_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
             'cenarios':[{'nome':x['cenario'],'aprovado':x['resultado'].get('aprovado',False)} for x in results],
             'observacao':'Resultados dependem do ambiente, da configuracao, do rate limit e das contas usadas.'}
    (OUTPUT/'resumo.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    if not all(x['resultado'].get('aprovado') for x in results):sys.exit(2)
