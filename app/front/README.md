# Front-end (M2) — RH Soluções

HTML, CSS e JavaScript sem framework (DA13), módulos ES, roteador por hash e sessão por cookie na mesma origem. Cobre os itens 2.1 a 2.4 e 2.7 do plano. Os itens 2.5 e 2.6 estão em `docs/secoes/`.

## Rodar em modo demonstração (mock)

```
cd app/front
python3 -m http.server 8080
# abrir http://localhost:8080/
```

`config.js` traz `USE_MOCK: true`: dados fictícios em memória, sem servidor de aplicação. A tela de entrada mostra atalhos para os cinco perfis. `?mock=encerrada` na URL simula janela de check-in encerrada (TL-04).

## Build dos estáticos (item 2.7)

```
FRONT_DIST=<diretório de estáticos do Nginx> node build.mjs
```

O destino é o diretório congelado em K8. O valor de K8 ainda não foi informado ao M2; sem `FRONT_DIST` o build vai para `app/front/dist`. A saída não contém `mock.js`, atalhos de demonstração nem selo de rastreabilidade, e `config.js` sai com `USE_MOCK: false`. `API_BASE` (padrão `/api`) também pode ser definido na chamada.

## Testes

```
CHROME_PATH=/usr/bin/google-chrome python3 -I testes/estados.py     # 9 estados, guarda de perfil, rótulos, foco, h1 único
CHROME_PATH=/usr/bin/google-chrome python3 -I testes/varredura.py   # sem rolagem horizontal em 360, 768, 1280 e 1920 px; erros de console
```

Exigem Python com Playwright e um Chrome. Verificam estrutura e comportamento. Não substituem teste com leitor de tela.

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `js/app.js` | casca, sessão e roteador por hash com guarda de perfil |
| `js/rotas.js` | tabela de rotas (TL ↔ UC ↔ RF), perfis autorizados e menu por perfil |
| `js/api.js`, `js/errors.js` | cliente da API (fetch, mesma origem) e escolha entre mock e real |
| `js/mock.js` | servidor fictício; removido do build |
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
| Massa de dados | a de `js/mock.js` | `js/mock.js`, só demonstração | M1, item 1.2 |

## Decisões e limites

- A guarda de perfil no cliente é só navegação. A autorização é do servidor (DA11): recurso de outro perfil responde 404 e a tela vai para TL-17.
- Nenhum dado vindo da API entra como HTML. Largura de barras usa a API de estilo do DOM, então o Nginx pode aplicar CSP sem `unsafe-inline` em `style-src`.
- As rotas da API em `js/api.js` são suposições. O contrato v2.0 (item 3.10) ainda não existe. Ajustar tudo em `js/api.js` quando for publicado.
- O cabeçalho `X-Requested-With` é enviado em toda requisição. A proteção CSRF do item 3.11 pode exigir token; definir com o back-end.
- Os efeitos de servidor mostrados nos estados (revogação de sessão em TL-11 e TL-15, registro de 404 em TL-16) são simulados no mock.
- TL-03 é o mesmo formulário de TL-02 dentro de um quadro de 360 px. Em celular real, TL-02 já usa esse layout.
- O estado vazio de TL-08 e a janela do UC02 ext. 1a precisam ser conferidos na ficha do caso de uso.
