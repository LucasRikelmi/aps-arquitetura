# Gatilhos das regras semânticas e de acesso

**Arquivo:** `db/003_regras_semanticas.sql` · **Testes:** `db/testes/002_testes_semanticas.sql`

**Normas de referência:** ISO/IEC 25010, característica de integridade e de segurança (controle de acesso). ISO/IEC 42010, para a descrição de onde cada regra vive (banco ou aplicação). Referência de estrutura, não certificação.

**Princípio:** o DDL cobre domínio, unicidade e datas. Estas regras dependem de relações entre tabelas e de datas, então ficam em gatilhos e funções. Os erros começam com o código da regra, por exemplo `RI10: ...`.

## Funções auxiliares

| Função | Regra | O que calcula |
|---|---|---|
| `chefia_imediata(matricula, data)` | RI15, RI20 | Chefia derivada numa data. Sobe pela hierarquia enquanto o departamento não tiver gestor vigente que não seja o próprio usuário, ou enquanto o gestor estiver afastado sem substituto. Retorna NULL para diretor sem chefia. |
| `e_diretor_sem_chefia(matricula, data)` | RI42 | Titular de departamento sem superior, sem chefia imediata. |
| `tem_perfil(matricula, perfil, data)` | RI43 | Perfil vigente. |
| `pode_agir_como_gestor(gestor, colaborador, data, finalidade)` | RI10, RI11 | Chefia vigente (inclui substituto, RI20). Sem chefia, vale designação vigente (RI42, RI19). Nunca o próprio colaborador. |

## Gatilhos

| Regra | Tabela | Verifica | Teste |
|---|---|---|---|
| RI09 | `progresso_meta` | Check-in informa só meta do próprio autor e em andamento | PASS (rejeitado) |
| RI10 | `progresso_meta` | Validador é a autoridade na data da validação. Nunca o responsável. | PASS (substituto aceito; titular em cobertura rejeitado; sem relação rejeitado) |
| RI11 | `meta` | Cadastrante é a autoridade na data de hoje. Nunca o responsável. | PASS (chefia aceita; colega e próprio responsável rejeitados) |
| RI12 | `alerta_checkin`, `alerta_meta`, `alerta` | Check-in e meta do alerta são do mesmo colaborador | PASS (check-in de outro rejeitado) |
| RI13 | `destinatario_alerta` | Dono é a chefia vigente, ou RH designado sem chefia. O alvo nunca é destinatário. | PASS (chefia aceita; outra pessoa rejeitada; alvo rejeitado) |
| RI14 | `acao_acompanhamento` | Autor com escopo. Se trata alerta, é o dono vigente. Meta do mesmo colaborador. | PASS (dono aceito; outro gestor rejeitado) |
| RI18 | `cobertura` | Substituto com perfil Gestor e sem afastamento no período | PASS (afastado rejeitado) |
| RI20 | via `chefia_imediata` | Substituto atua só no departamento e no período da cobertura | PASS (coberto pela RI15) |
| RI29 | `cobertura` | Período da cobertura dentro do afastamento e da gerência | PASS (fora do afastamento rejeitado) |
| RI42 | `designacao` | Beneficiário é diretor sem chefia imediata. Gestor designado tem perfil Gestor. | PASS (diretor aceito; quem tem chefia rejeitado) |

## Complementos aplicados (20/11/2026)

- **Linhas já gravadas:** `auditoria_regras()` (arquivo 006) revisa os dados contra RI09 a RI14 e RI29. Retorna uma linha por violação. Vazio significa conforme. Testada com uma violação plantada.
- **RI11 e RI42, exceção do diretor único:** o único gestor vigente, sendo diretor sem chefia, pode cadastrar a própria meta. Nos demais casos, a autocadastro continua rejeitado.
- **RI12 para humor baixo:** checagem diferida, no COMMIT. Um alerta de humor baixo precisa de ao menos um check-in e uma meta.

## Limitações

1. **Validação na gravação.** Os gatilhos validam o que é gravado. A auditoria cobre o que já existe, mas precisa ser rodada. Ver o manual de revisão.
2. **RI29 em um período.** A contenção da cobertura é verificada contra um único período de afastamento e um único período de gerência. Se houver vários períodos encadeados, a verificação rejeita o caso, e a regra deve ser revista.
3. **RI14 com gestor sem chefia.** O escopo do gestor vem da chefia calculada ou da designação. Sem chefia e sem designação, é rejeitado, o que segue a RI42.
