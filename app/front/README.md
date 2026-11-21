# Front-end (M2) — RH Soluções

HTML, CSS e JavaScript sem framework (DA13), módulos ES, roteador por hash e sessão por cookie na mesma origem. Cobre os itens 2.1 a 2.4 e 2.7 do plano. Os itens 2.5 e 2.6 estão em `docs/secoes/`.

## Desenvolvimento

```
cd app/front
node dev/servidor.mjs        # PORTA (8080), HOST (127.0.0.1), JANELA=encerrada
# abrir http://127.0.0.1:8080/
```

`dev/servidor.mjs` serve os estáticos e uma API local que segue as rotas de `js/api.js`, só para desenvolver e testar enquanto o back-end (M3) não entrega. O cliente é o mesmo de produção: login real pelo formulário, sessão por cookie HttpOnly, 401/404/409 vindos do servidor. Senha de desenvolvimento: `senha-dev-123`, com ana.souza (colaborador), carlos.lima (gestor), paula.reis (rh), helena.prado (diretoria) e admin (administracao), todos `@empresa.com.br`. O diretório `dev/` não entra no build.

## Build dos estáticos (item 2.7)

```
FRONT_DIST=<diretório de estáticos do Nginx> node build.mjs
```

O destino é o diretório congelado em K8. O valor de K8 ainda não foi informado ao M2; sem `FRONT_DIST` o build vai para `app/front/dist`. A saída não contém `dev/` nem `testes/`, e `config.js` sai só com `API_BASE`. `API_BASE` (padrão `/api`) também pode ser definido na chamada.

## Testes

```
CHROME_PATH=/usr/bin/google-chrome python3 -I testes/estados.py     # login real, 9 estados, 404 do servidor, sessão expirada, rótulos, foco, h1 único
CHROME_PATH=/usr/bin/google-chrome python3 -I testes/varredura.py   # sem rolagem horizontal em 360, 768, 1280 e 1920 px; erros de console
```

Sobem `dev/servidor.mjs` sozinhos. Exigem Node, Python com Playwright e um Chrome. Verificam estrutura e comportamento. Não substituem teste com leitor de tela.

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `js/app.js` | casca, sessão e roteador por hash; 401 volta ao login, 404 vai a TL-17 |
| `js/rotas.js` | tabela de rotas (TL ↔ UC ↔ RF) e menu por perfil |
| `js/api.js`, `js/errors.js` | cliente da API (fetch, mesma origem, cookie de sessão) |
| `dev/servidor.mjs` | servidor local de desenvolvimento e teste; fora do build |
| `js/dominio.js` | constantes e formatadores compartilhados (perfis, humor, carga, datas, e-mail) |
| `js/dom.js` | primitivos: `h`, `campo`, `grupoRadio`, `botao`, `aviso`, `tabela`, `confirmar`, `focarAviso` |
| `js/componentes/` | `barra-progresso`, `dialogo-valor`, `formulario-checkin` |
| `js/screens/` | um arquivo por tela: `tl01-entrar.js` até `tl17-nao-encontrado.js` |

## Valores padrão assumidos (para as issues de integração)

| Dependência | Valor assumido | Onde trocar | Dono da definição |
| --- | --- | --- | --- |
| K8: diretório de estáticos | `app/front/dist` | variável `FRONT_DIST` do `build.mjs` | M3, item 3.12 |
| Prefixo da API | `/api`, mesma origem | `API_BASE` (variável do build, ou `config.js` em desenvolvimento) | M3, item 3.10 |
| Rotas e corpos da API v2.0 | as de `js/api.js` | só `js/api.js` | M3, item 3.10 |
| Proteção CSRF | cabeçalho `X-Requested-With: fetch`, sem token | `chamar()` em `js/api.js` | M3, item 3.11 |
| Respostas de erro | JSON com `mensagem`; 401 volta ao login, 404 vai a TL-17 | `chamar()` e `js/app.js` | M3, itens 3.2 e 3.12 |
| Massa de dados | a de `dev/servidor.mjs`, só desenvolvimento | `dev/servidor.mjs` | M1, item 1.2 |

## Decisões e limites

- O menu por perfil é só navegação. A autorização é do servidor (DA11): recurso de outro perfil responde 404 e a tela vai para TL-17.
- Nenhum dado vindo da API entra como HTML. Largura de barras usa a API de estilo do DOM, então o Nginx pode aplicar CSP sem `unsafe-inline` em `style-src`.
- As rotas da API em `js/api.js` são suposições. O contrato v2.0 (item 3.10) ainda não existe. Ajustar tudo em `js/api.js` quando for publicado.
- O cabeçalho `X-Requested-With` é enviado em toda requisição. A proteção CSRF do item 3.11 pode exigir token; definir com o back-end.
- Revogação de sessão (TL-11, TL-15) e registro de 404 (TL-16) são comportamentos do servidor; `dev/servidor.mjs` os reproduz para teste e o back-end real precisa implementá-los.
- TL-03 é o mesmo formulário de TL-02 em layout responsivo; não há rota separada.
- O estado vazio de TL-08 e a janela do UC02 ext. 1a precisam ser conferidos na ficha do caso de uso.
