# Lista B — Progresso e validação (RF04 / RB-01 / HU-05.C01–C07 / UC06)
**Autora:** Kamilly · **Revisor:** André · **Prazo informado:** domingo 22/11/2026.

Esta entrega inclui todas as anteriores (autenticação, sessão, autorização, check-in, cadastro de metas) e adiciona validação de progresso.

## Instalar
Copie `.env.example` para `.env`, configure `DATABASE_URL`, `PUBLIC_ORIGIN`, rode `npm install` e, em banco vazio, execute sequencialmente:

```bash
npm run db:init
npm run db:sessions
npm run db:authorization
npm run db:checkin
npm run db:metas
npm run db:progresso
npm test
npm start
```

O check-in existente (`PUT /api/checkins/atual`) aceita `progressos: [{"meta_id":"UUID","progresso":40}]`, agora exigindo que cada meta pertença ao colaborador, e preserva a revisão do autorrelato. Alterar o autorrelato incrementa a revisão; a validação antiga continua no histórico mas deixa de valer para o indicador, até nova validação.

## API de validação
`POST /api/metas/:metaId/progresso/validacoes`, cookie de sessão e origem correta:

```json
{"checkin_id":"UUID_DO_CHECKIN","valor_validado":45,"avaliacao_qualitativa":"Meta em andamento; prazo revisado em conversa"}
```

Somente gestor responsável com equipe vigente, **substituto vigente** ou gestor expressamente designado ao diretor pode validar, e nunca o próprio progresso. Resposta 201 preserva autorrelato e a validação, com valor efetivo calculado. Operação em transação PostgreSQL, incluindo auditoria no `log_acesso`.

`GET /api/metas/:metaId/checkins/:checkinId/progresso`: retorna `autorrelato`, `valor_validado`, `avaliacao_qualitativa`, `origem` e `valor_utilizado`. Para gestor/RH autorizado inclui histórico. Perfil administrativo sozinho não acessa.

## Rastreabilidade
- **C01/C02**: valor original e avaliação qualitativa permanecem separados.
- **C03**: sem validação, indicador recorre ao autorrelato e apresenta rótulo `origem=autorrelato`.
- **C04**: novo valor validado passa a prevalecer nas próximas leituras e projeções do agregado, sem apagar o anterior.
- **C05**: gestor autorizado valida percentual de 0 a 100.
- **C06**: progresso de diretor sem chefia é validado somente por outro gestor designado; sem designação, permanece autorrelato.
- **C07**: substituto dentro da cobertura vigente pode validar, sem validar a si próprio.
- **RB-01**: valor validado prevalece; ausente ou obsoleto pela edição do autorrelato, usa-se autorrelato rotulado.
- **UC06**: serviço de validação/ajuste e consulta, sob escopo autorizado.

## Pendências e limitações
- Integração com agregadores RF08/alertas RF07 ainda depende do módulo de indicadores. O endpoint fornece `valor_utilizado` e `origem` para o consumidor usar; **não** afirma recálculo de painel inexistente.
- `cobertura_gestor` é estrutura simplificada criada nesta entrega, exigindo homologação contra o cadastro de substituição oficial. Cadastro das coberturas é feito administrativamente, não há rota pública de inclusão.
- Integrar com modelo ER definitivo de meta e check-in e fazer testes de integração no PostgreSQL (incluindo concorrência, bloqueios e histórico); testes fornecidos são unitários.
- Validação do escopo é repetida na transação para impedir TOCTOU comum, mas em produção é necessário rever isolamento transacional e mudanças concorrentes de atribuições; endurecer CSRF (token), retenção de logs, indexação e papéis SQL.
- Não foram implementadas telas nem cálculo de indicadores agregados, pois estão fora deste item de entrega.
