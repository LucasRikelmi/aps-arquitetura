# Lista C — Implantação Nginx e Node.js sob systemd

**Autora:** Kamilly · **Revisora:** Grazieli · **Prazo da issue:** antecipação para sábado, 21/11/2026 (o campo original marca domingo 22/11/2026).

## Escopo

- HTTPS na porta 443, TLS 1.3 e certificado configurado pelo administrador.
- HTTP/2 externo, habilitado por `http2 on` (requer Nginx >= 1.25.1). **É alteração de projeto**, pois a APS-WEB, item 1.1, especificava HTTP/1.1 sem HTTP/2.
- Conteúdo estático em `/`, proxy somente em `/api/`, por loopback `127.0.0.1:3000`.
- Limite 1 KiB e rate limit 10/min/IP (rajada 10) somente no login. O limite por conta existente é aplicado na aplicação + PostgreSQL.
- Nginx gera JSON para 413/429 e erros de proxy 502/504; 500/503 gerados pelo aplicativo são preservados, sem convertê-los em 401.
- Cache longo somente para ativos com hash no nome; HTML revalidável; API sem cache.
- systemd inicia, supervisiona, reinicia em falhas e encerra a API com SIGTERM.

## Arquivos de implantação

- `deploy/nginx/benigno.conf` — virtual host.
- `deploy/nginx/benigno-proxy.conf` — cabeçalhos e tempos de proxy.
- `deploy/systemd/benigno-api.service` — unidade do systemd.
- `public/index.html` — página estática provisória, não é a interface final.
- `scripts/validate-infra.sh` — inspeção sintática e de roteamento.

## Implantação sugerida no Ubuntu/Linux

1. Provisionar PostgreSQL, usuário e banco; aplicar as migrações descritas no README principal. Instalar Node.js suportado e Nginx >= 1.25.1. O exemplo de unidade usa `/usr/bin/node`; ajuste para o caminho real obtido com `command -v node`.
2. Criar usuário de serviço não privilegiado: `sudo useradd --system --home /opt/benigno --shell /usr/sbin/nologin benigno`.
3. Copiar o projeto para `/opt/benigno/app`; instalar dependências com `npm install --omit=dev` (ou `npm ci --omit=dev` após gerar o lockfile). Configurar `/opt/benigno/app/.env` com `DATABASE_URL`, `PUBLIC_ORIGIN=https://DOMINIO`, `CSRF_SECRET`, `LOGIN_RATE_SECRET` e parâmetros de sessão; arquivo `chmod 600` de propriedade de `benigno`. Não colocar segredos no Git.
4. Publicar o front-end, quando existir, em `/var/www/benigno/public`. A página incluída no pacote é apenas um marcador.
5. Emitir/instalar certificado e chave privados para o domínio real; trocar `EXEMPLO.DOMINIO.BR` nas configurações, usar certificados válidos. **Não habilitar HSTS até validar HTTPS**; se necessário, remover a diretiva HSTS durante homologação.
6. Instalar `benigno-proxy.conf` em `/etc/nginx/snippets/benigno-proxy.conf` e `benigno.conf` em `/etc/nginx/conf.d/benigno.conf` (desde que conf.d esteja incluído dentro de `http {}`). Verificar com `sudo nginx -t`; `sudo systemctl reload nginx`.
7. Instalar o unit file em `/etc/systemd/system/benigno-api.service`, ajustar caminhos e permissões; executar `sudo systemctl daemon-reload && sudo systemctl enable --now benigno-api`.
8. Validar `sudo systemctl status benigno-api`, `journalctl -u benigno-api -n 100 --no-pager`, `ss -lntp | grep 3000` (deve ser 127.0.0.1), `curl -I --http2 https://DOMINIO/` e `curl -i https://DOMINIO/api/auth/me` (sem sessão deve responder 401).

## Testes obrigatórios de homologação

- `nginx -t` e `systemd-analyze verify /etc/systemd/system/benigno-api.service`.
- Validar certificado público e TLS 1.3 com `openssl s_client -connect DOMINIO:443 -servername DOMINIO -tls1_3`.
- Comprovar HTTP/2 com `curl -I --http2 https://DOMINIO/` e inspecionar o protocolo (`curl -w '%{http_version}'`).
- Verificar `GET /` (200 HTML), asset existente (cache) e asset inexistente (404).
- Enviar JSON de login > 1 KiB → 413 JSON; aplicar tentativas por IP → 429 JSON.
- Desligar a API e confirmar 502 JSON; interromper PostgreSQL e confirmar **503 do back-end**, nunca 401, enquanto a API estiver ativa.
- Testar login, CSRF, sessão e logout com navegadores e integração real.
- Conferir status e restart automático com `systemctl`, logs no journal.

## Decisões e ressalvas

- A APS-WEB 1.4/1.5 documenta proxy, TLS 1.3, respostas 413/429 e Node somente no loopback. HTTP/2 e política de cache foram acrescentados por esta demanda.
- O texto de **DA14, DA16 e K8 não consta nos arquivos de referência disponíveis**; rastreabilidade permanece pendente. Não foram atribuídos requisitos imaginados a esses identificadores.
- Não foi implantado servidor público nem certificado real. O pacote constitui configuração de referência e código, não evidência de homologação da infraestrutura.
