# Lista B — Painel de indicadores (RF05, RF06, RF08, RB-02, RB-06, UC03)

**Autora:** Kamilly  
**Revisor:** André  
**Entrega prevista:** domingo, 22/11/2026.

## O que foi implementado

- `GET /api/painel/equipe`: apresenta pessoas da equipe vigente do gestor, incluindo cobertura temporária, ou todas as pessoas para perfil RH vigente. Exige cookie de sessão.
- `GET /api/painel/equipe/:usuarioId`: série semanal individual **somente para gestor com vínculo/cobertura ativa ou RH**; recurso não autorizado retorna **404** e registra negativa. Designação de metas/PDI de diretor **não** concede acesso ao painel individual.
- Série com `semana_inicio`, ano/semana ISO, humor 1–5, carga Leve/Normal/Pesada, progresso percentual, origem do percentual e status `respondida`/`sem_dado`.
- Progresso usa a última validação **da revisão atual** do autorrelato; sem validação, o autorrelato permanece identificado. Média simples entre metas com progresso, uma estratégia técnica provisória (a ERS não especifica ponderação por meta).
- Carga Pesada recorrente = 3 ou mais semanas marcadas Pesada nas últimas 8 **semanas corridas**. Sem resposta não conta, não interrompe e **não estende** a janela. Esse indicador **não** dispara alerta.
- Persistência em `painel_semana_usuario`; reconstrução diária por `npm run painel:refresh` (padrão: últimas 26 semanas) e lista de alterações pendentes por gatilhos SQL. Nenhum cálculo integral do histórico no endpoint.
- Auditoria de leitura e de negativas, com o mesmo `AuditService` das listas anteriores.
- Estruturas mínimas `departamento_painel`/`lotacao_painel` preparadas para integração ao cadastro organizacional definitivo. Por segurança, quando há grupo menor que cinco pessoas, ou pessoas sem lotação, **todos** os totais departamentais são suprimidos neste protótipo para evitar inferência por subtração. Não é uma implementação completa dos relatórios agregados do RF13.

## Pontos ainda não implementados / dependências

1. **RF07, alertas:** esta lista não gera nem persiste alertas. A API retorna `alertas: []` e `alertas_status: 'pendente_integracao_RF07'`. Isso **não** significa que não existem alertas; significa que não há integração com a fonte oficial.
2. **Histórico de lotações:** as tabelas mínimas foram criadas, mas a carga a partir do modelo ER definitivo e a atribuição histórica de departamentos precisam ser integradas. Os acessos de gestores são avaliados em **vínculo atual**, como pede o UC03.
3. **Atualização:** os gatilhos assinalam mudanças após check-in, mudança de progresso ou validação. A rotina de agregação deve rodar diariamente e, se necessário, após eventos relevantes. Até a execução, pode haver desatualização; o endpoint avisa isso. Alterações de limiar da RB-02 são aplicadas imediatamente ao **indicador** em memória, configurável no construtor (padrão 3), mas o cadastro de limites do sistema completo não foi integrado.
4. **Segurança operacional:** o serviço de auditoria herdado usa fila em memória e pode perder registros em falhas; em produção, substituir por outbox transacional/filas duráveis e aplicar o princípio do menor privilégio no banco.
5. **Homologação:** os testes unitários foram executados. Testes de integração PostgreSQL, carga, permissão real e APIs autenticadas ainda precisam ser realizados.

## Instalação do banco

Depois das migrações já existentes (`schema.sql`, `002_sessions.sql` até `006_progresso.sql`):

```bash
npm install
npm run db:painel
npm run painel:refresh
npm test
npm start
```

Agende a atualização, por exemplo com cron **diário** no fuso correto. Exemplo de execução diária às 07:00 no servidor (ajuste caminho, conta e timezone):

```cron
TZ=America/Sao_Paulo
0 7 * * * cd /caminho/do/projeto && /usr/bin/npm run painel:refresh >> /var/log/benigno-painel.log 2>&1
```

Execute `npm run painel:refresh` **antes** da primeira consulta, pois a migração não preenche os agregados. Se a aplicação não possuir dados de colaboradores, o resultado estará vazio. Não insira credenciais reais no repositório.

## Exemplo de chamada

```http
GET /api/painel/equipe HTTP/1.1
Cookie: benigno_session=<token-da-sessao>
```

A rota individual aceita UUID do colaborador e exige vínculo de equipe ou RH. Não transmite credenciais na URL.

## Rastreabilidade

| Origem | Implementação |
|---|---|
| RF05 | Humor por pessoa e semana, escala 1 a 5, sem inferir ausência como zero |
| RF06 / RB-02 | Carga e indicador pesado recorrente sobre 8 semanas corridas |
| RF08 | Humor, carga e progresso combinados na API; fonte de alertas ainda pendente |
| RB-06 | Gestor: equipe atual; RH: todos; Administração isolada: sem acesso; substituto: cobertura vigente |
| UC03 alternativas 1a/2a/3a/4a/5a | RH, 404 fora de escopo, semanas sem dado, origem do progresso e carga sem resposta |

**Nota:** esta entrega é um *back-end* de indicadores. Não contém interface gráfica do painel, nem integração do módulo completo de alertas ou relatórios. Os retornos departamentais atuais são apenas contagens protegidas; indicadores históricos departamentais dependem do modelo definitivo de lotação.
