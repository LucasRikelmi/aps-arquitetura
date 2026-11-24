# Lista B — RF07/RF12: alertas e lembretes

Autora: Kamilly. Revisora: Grazieli. Prazo do enunciado: 22/11/2026.

## Fonte e delimitação

ERS 1.3 da Benigno Soluções: RF07 (páginas 57–58), RF12 (p. 60), RB-03..05 e RB-08 (p. 68), Seção 2.5 (p. 54), Anexo B (p. 79). O documento **DA12** e o Marco 05 não foram disponibilizados no conjunto recebido; verificar a redação antes do aceite. Esta é uma implementação acadêmica do serviço de alertas/reminders, não um serviço de e-mail homologado.

## O que funciona

- **Quatro e apenas quatro condições de alerta:** humor <=2 e meta atrasada na mesma semana do check-in; meta vencida incompleta; meta ainda não vencida com pelo menos 75% do prazo e progresso <50%; três semanas consecutivas sem check-in, desconsiderando semanas de afastamento.
- Humor combinado com atraso é avaliado após salvar o check-in (reconciliação assíncrona) e novamente na rotina diária. A reconciliação após salvamento registra falha no servidor, sem desfazer um check-in confirmado; o job diário recupera falhas.
- **Deduplicação** transacional por condição e meta, sem criar repetição enquanto o alerta continuar aberto; alertas tratados ou encerrados permanecem no histórico.
- **Papéis:** gestor vigente ou substituto como dono; RH como observador. Para diretor sem chefia, gestor expressamente designado pelo RH. A rotina reconcilia destinatários de alertas abertos sem alterar eventos antigos. Quando não existe gestor, o RH observa e a definição do gestor de departamento superior depende da integração com a hierarquia definitiva.
- **E-mail:** lembretes apenas para check-in pendente, não afastado, quinta 10h e sexta 15h, no horário de São Paulo. Segunda 08h gera um resumo de participação da semana anterior a RH e Diretoria, excluindo afastamentos do denominador e suprimindo recortes inferiores a 5 pessoas. Também é produzido resumo diário com total de alertas abertos, sem expor humor, carga ou comentários.
- **Entrega confiável:** tabela `notificacao_saida` com chave única por destinatário/slot/semana, tentativas e reprocessamento; SMTP somente no processo de envio, desacoplado da geração.
- **Rotas:** `GET /api/alertas` exibe somente alertas atribuídos ao usuário da sessão; `POST /api/alertas/:id/tratar` e `/encerrar` só para o dono, protegidas por origem configurada.

## Instalação a partir de uma base vazia

1. Instale Node.js >=20, PostgreSQL moderno e `psql`.
2. Copie `.env.example` para `.env` e ajuste `DATABASE_URL`, `PUBLIC_ORIGIN` (para HTTPS de produção) e demais opções.
3. Execute `npm install`.
4. Execute, nessa ordem:

```sh
npm run db:init
npm run db:sessions
npm run db:authorization
npm run db:checkin
npm run db:metas
npm run db:progresso
npm run db:painel
npm run db:alertas
npm test
npm start
```

**Importante:** importe os registros de RH, as lotações, as coberturas de gestores e períodos de afastamento nos cadastros correspondentes. O campo `usuario.acompanhamento_inicio` deve representar a data de entrada no acompanhamento de cada colaborador; seu padrão é a data da migração e impede alerta retroativo indevido. A ausência de registros de afastamento é interpretada como ausência de afastamento, não como férias reconhecidas automaticamente.

## Agendamento com fuso `America/Sao_Paulo`

Exemplo para Linux com `cron` e `CRON_TZ=America/Sao_Paulo` (ajuste caminho de instalação):

```cron
CRON_TZ=America/Sao_Paulo
0 7 * * * cd /srv/benigno && /usr/bin/npm run alertas:daily
0 10 * * 4 cd /srv/benigno && /usr/bin/npm run lembretes:run
0 15 * * 5 cd /srv/benigno && /usr/bin/npm run lembretes:run
0 8 * * 1 cd /srv/benigno && /usr/bin/npm run lembretes:run
*/5 * * * * cd /srv/benigno && /usr/bin/npm run emails:send
```

**Observação sobre cron:** o fuso utilizado pelo processo pode depender do cron da distribuição. Em produção, configure o serviço para o fuso correto e valide os horários agendados em São Paulo. O código só aceita os slots exatos do horário local e os reprocessamentos não duplicam chave de mensagem. Para testar fora do horário, em ambiente não produtivo: `npm run lembretes:run -- quinta_10` (jamais utilizar a flag em produção).

### Configuração SMTP

Adicione ao `.env`:

```dotenv
SMTP_HOST=smtp.exemplo.com
SMTP_PORT=587
SMTP_USER=usuario
SMTP_PASSWORD=segredo
SMTP_FROM=no-reply@exemplo.com
```

Portas 587 utilizam STARTTLS quando oferecido pelo servidor; 465 usa TLS implícito. Em produção, utilize serviço SMTP confiável, segredos por gerenciador de secrets, SPF/DKIM/DMARC e limites de envio. **Nenhum e-mail real foi enviado nesta entrega.**

## Testes e limitações

Execute `npm test` para as regras puras e testes existentes. Sem um PostgreSQL acessível e um SMTP de testes, não foi executada homologação de integração. As integrações com registros oficiais de afastamento, hierarquia completa de departamentos, agregados definitivos de participação e painel visual dependem dos outros módulos. A contabilização por departamentos segue a política RB-09 e exige modelo organizacional completo; o relatório atual traz apenas a participação global, com mínimo de 5.

Não execute o schema completo diretamente em produção sem revisão das permissões da conta do banco. É recomendável proibir `DELETE/UPDATE` de `alerta_evento` e impedir que a conta de leitura de logs edite os eventos.
