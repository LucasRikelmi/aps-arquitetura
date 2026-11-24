# Revisao M3 - compatibilizacao com o front do Lucas

**Status:** patch de integracao para testes, NAO homologado e NAO pronto para merge.

## Mudancas implementadas

- `POST /api/auth/login` usa `email/senha`, Argon2id (servico preexistente), cookie existente, resposta `nome/perfil`.
- `GET /api/auth/sessao` retorna `nome/perfil`; prioridade dos perfis segue `front/dev/servidor.mjs`.
- Sem duplicacao de dados: `usuario.login` corresponde ao email; `cadastro_pessoa.nome` guarda o nome.
- CSRF com `X-Requested-With: fetch`, `Origin` e `Sec-Fetch-Site` (Nginx mesma origem; sem CORS).
- Rate limit por endereco de origem com chave HMAC, `Retry-After` computado, zerado apos sucesso.
- As respostas de erro tratadas nos roteadores usam `mensagem`.
- Rotas adicionadas/adequadas: `checkins/historico`, `painel`, `alertas/:id`, `alertas/:id/tratamento`, `equipe`, `metas/:id/validacao`, `pessoas` (GET/POST), `pessoas/:id/perfis`, `pessoas/:id/desligamento`, `afastamentos`, `formulario-checkin` (consultar/criar/alterar/inativar), `parametros` (GET/PUT), `relatorios/agregados`, `sincronizacao-folha`, `log-acesso`.
- Persistencia nova e alteracoes dos esquemas: 013-017, incluindo tratamento de alerta, pergunta e parametros, campos do checkin, metas e cadastro.
- `GET/PUT /checkins/atual` e `GET/POST /metas` receberam adaptadores para o formato do front, ainda sem homologacao.
- `docs/openapi.yaml` lista rotas do front e marca respostas ainda parciais.
- Nginx de exemplo: payloads JSON de erro com `mensagem` e `Retry-After` de fallback no 429 gerado pelo proxy.

## Pendencias importantes (nao omitir na entrega)

1. **Homologacao funcional:** os formatos dos payloads de `painel`, `alertas`, `metas`/`validacao`, `log-acesso`, relatorios e alguns cadastros ainda divergem do servidor ficticio do Lucas. Os aliases de rotas nao bastam.
2. **Banco real:** nao foi possivel aplicar ou testar migracoes 013-017 em PostgreSQL; revisar integridade, privilegios, indice de matricula, dados legados e transacoes.
3. **Autorizacao:** perfis expostos foram normalizados; politicas internas ainda utilizam valores legados em maiusculas (`RH`, `Gestor` etc.). Uma migracao total exige revisar todos os modulos e tests.
4. **Testes:** testes legados ainda consideram contrato antigo; atualizar a suite e executar os testes do front (`front/testes/estados.py`) apontando ao backend real.
5. **Seguranca/apresentacao:** medir latencia Argon2id real sob concorrencia, demonstrar 401/413/429/404 com log; validar resposta 429 e limites do proxy.
6. **Nginx:** HTTP/2 e cache constam no modelo, mas configurar dominio real, paths para build, TLS e executar `nginx -t`; o arquivo nao esta pronto para ser ativado em qualquer servidor.
7. **OpenAPI:** o inventario das rotas foi expandido, mas schemas exatos de request/response ainda requerem finalizacao.
8. **PR:** nenhum commit, push ou PR foi feito. Fazer apenas depois de validacao.

## Migracoes

- `schema.sql`, `002_sessions.sql` ate `011_seguranca_login.sql`: seguir README original / ordem de dependencias.
- `012_integracao_front.sql`: verifica pre-requisitos; nao duplica `usuario.email`/`usuario.nome`.
- `013_front_integration.sql`: formulario e parametros.
- `014_tratamento_alerta.sql`: descricao de tratamento.
- `015_checkin_front.sql`: `obstaculo`.
- `016_meta_front.sql`: unidade e valor-alvo.
- `017_cadastro_front.sql`: matricula, admissao e contrato.

**Nunca aplicar migracoes diretamente em producao sem backup, ambiente de testes e revisao das constraints.**

## Execucao de validacao limitada realizada neste pacote

- Todos os arquivos JavaScript em `back/src` foram validados por `node --check`.
- `node --test tests/integracao-m3-nucleo.test.js`: 5 testes passaram, zero falhas.
- Nao foram executados testes que dependem de `express`, `argon2` e PostgreSQL, pois essas dependencias/servicos nao estavam disponiveis neste ambiente.
