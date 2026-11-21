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
| `js/app.js` | casca, roteador com guarda de perfil, menu por perfil |
| `js/api.js` | cliente da API (fetch, mesma origem) e escolha mock ou real |
| `js/mock.js` | servidor fictício; removido do build |
| `js/dom.js` | criação de DOM sem `innerHTML`, campos, avisos, tabela responsiva, diálogo |
| `js/screens/` | TL-01 e TL-17 (`acesso`), TL-02 a TL-05 (`colaborador`), TL-06 a TL-10 (`gestao`), TL-11 a TL-16 (`rh-admin`) |

## Decisões e limites

- A guarda de perfil no cliente é só navegação. A autorização é do servidor (DA11): recurso de outro perfil responde 404 e a tela vai para TL-17.
- Nenhum dado vindo da API entra como HTML. Largura de barras usa a API de estilo do DOM, então o Nginx pode aplicar CSP sem `unsafe-inline` em `style-src`.
- As rotas da API em `js/api.js` são suposições. O contrato v2.0 (item 3.10) ainda não existe. Ajustar tudo em `js/api.js` quando for publicado.
- O cabeçalho `X-Requested-With` é enviado em toda requisição. A proteção CSRF do item 3.11 pode exigir token; definir com o back-end.
- Os efeitos de servidor mostrados nos estados (revogação de sessão em TL-11 e TL-15, registro de 404 em TL-16) são simulados no mock.
- TL-03 é o mesmo formulário de TL-02 dentro de um quadro de 360 px. Em celular real, TL-02 já usa esse layout.
- O estado vazio de TL-08 e a janela do UC02 ext. 1a precisam ser conferidos na ficha do caso de uso.
