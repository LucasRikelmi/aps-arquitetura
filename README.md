# aps-arquitetura
APS - Arquitetura Web (SoftwareWeb.log)

Fluxo de trabalho: [CONTRIBUTING.md](CONTRIBUTING.md).

## Redistribuição de tarefas (17/11/2026)

A distribuição original é a da WBS de 07/11 (`aps/wbs-atribuicao.md`, PR #25). Em 17/11, data prevista para o PDF fechado, só o item 1.1 estava na `main`. A redistribuição abaixo foi decidida pelo Lucas (gestão), anunciada à equipe em 16/11 às 21h e ajustada em 17/11. Apresentação: 18/11.

Regras de revisão a partir de 17/11:

- Cada item dos demais membros tem um revisor primário (outro membro). O revisor primário tem 3 h para revisar.
- O Lucas é o revisor geral: faz a segunda revisão (consistência) e o merge de todos os itens, em até 2 h após a aprovação primária. Se passar desse prazo, a aprovação primária basta e qualquer membro faz o merge, registrando na issue.
- O Lucas não tem revisor acima dele, inclusive nos próprios itens (decisão do Lucas em 17/11).
- Rascunho entra por PR, não por anexo em issue. Figuras entram no PR do item, em `aps/diagramas/`.

> **Ressalva registrada:** a regra 7 do enunciado diz que a mesma pessoa não pode ser autora e revisora do mesmo item. Nos itens em que o Lucas é autor (G1, G2, G4, G7, G8, 1.7, 2.6, 2.7), a tabela de autor e revisor do documento mostrará autor = revisor, o que pode ser apontado no critério de conformidade com as regras. O GitHub também não permite que o autor aprove o próprio PR; esses merges ficam sem aprovação registrada.

### Por issue: antes e depois

| Issue | Item | Antes (autor / revisor) | Depois (autor / revisor) | Estado em 17/11 |
|---|---|---|---|---|
| #1 | G1 Infraestrutura | Kamilly / Grazieli | Lucas / Lucas* | Praticamente feito pelo Lucas; falta confirmar o convite da docente |
| #2 | G2 Pergunta à docente | André / – | Lucas / Lucas* | Sem registro; fechar registrando as premissas adotadas |
| #3 | G3 Atas e registros | rodízio | André / Lucas | Sem registro; reconstruir a partir do Discord (Apêndice II) |
| #4 | G4 Monitoramento | rodízio | Lucas / Lucas* | Sem registro |
| #5 | G5 Registro de IA | Kamilly / Lucas | Grazieli / Lucas | Prompts só no PR #26 e no fim dos rascunhos de 1.2 a 1.4; inclui os prompts do esboço |
| #6 | G6 Referências | André / Grazieli | André / Grazieli | Não iniciado |
| #7 | G7 Integração | Grazieli / Kamilly | Lucas / Lucas* | Feito item a item na revisão geral + leitura final |
| #8 | G8 PDF final | Lucas / André | Lucas / Lucas* | Não iniciado |
| #9 | G9 Apresentação | todos | Grazieli (dona dos slides) / Lucas; todos apresentam | Não iniciado |
| #10 | 1.1 Visão geral e pilha | Grazieli / André | Grazieli / André | Na `main` (PR #26) |
| #11 | 1.2 Browser | Kamilly / Lucas | Kamilly / Lucas | Rascunho anexado na issue; precisa de ajustes de escopo antes do PR |
| #12 | 1.3 Rede | Kamilly / Lucas | Kamilly / Lucas | Rascunho anexado na issue; precisa de ajustes de escopo antes do PR |
| #13 | 1.4 Servidor web | Kamilly / Lucas | Kamilly / Lucas | Rascunho anexado na issue; quase pronto, com ajustes pontuais na configuração |
| #14 | 1.5 Servidor de aplicação | Grazieli / André | Grazieli / André | Só esboço |
| #15 | 1.6 SGBD | Kamilly / André | Kamilly / André | Só esboço |
| #16 | 1.7 Ciclo completo | Grazieli / André | Lucas / Lucas* | Só esboço |
| #17 | 2.1 Requisitos | André / Grazieli | André / Grazieli | Só esboço |
| #18 | 2.2 Decisões arquiteturais | André / Kamilly | André / Kamilly | Só esboço |
| #19 | 2.3 Contexto | André / Lucas | André / Lucas | Só esboço |
| #20 | 2.4 Componentes | Lucas / Grazieli | Kamilly / Grazieli | Só esboço |
| #21 | 2.5 Contrato da API | Lucas / Kamilly | Grazieli / Kamilly | Só esboço |
| #22 | 2.6 Modelo de dados | Lucas / Kamilly | Lucas / Lucas* | Só esboço |
| #23 | 2.7 Desenho detalhado | Lucas / Kamilly | Lucas / Lucas* | Só esboço; plano B: se não houver PR até 18h, Grazieli assume as sequências (Figs. 8 e 9) |
| #24 | 2.8 Segurança e erros | André / Grazieli | André / Grazieli | Só esboço |

\* Autor = revisor; ver a ressalva acima. Em todos os demais itens, o Lucas é também o revisor geral.

### Por membro: antes e depois

Horas estimadas com a escala da WBS (P ≈ 1–2 h, M ≈ 3–4 h, G ≈ 5–8 h). "Já entregue" conta só o que está no GitHub ou foi anexado às issues.

| Membro | Antes: autor de | Antes: carga (WBS) | Depois: autor de | Depois: revisor primário de | Já entregue | Restante | Total |
|---|---|---|---|---|---|---|---|
| Grazieli | 1.1, 1.5, 1.7, G7 | ~20 h | 1.1 (feito), 1.5, 2.5, G5, G9 (slides) | 2.1, 2.4, 2.8, G6 | ~7 h (1.1 mesclado, 2 rodadas de correção) | 13–18 h | 20–25 h |
| Kamilly | G1, 1.2, 1.3, 1.4, 1.6, G5 | ~16 h | 1.2, 1.3, 1.4, 1.6, 2.4 | 2.2, 2.5 | ~9–12 h (rascunhos de 1.2 a 1.4) | 10–14 h | 19–26 h |
| André | G2, 2.1, 2.2, 2.3, 2.8, G6 | ~16 h | 2.1, 2.2, 2.3, 2.8, G3, G6 | 1.5, 1.6 | ~5–6 h (revisão do 1.1, issues #27 a #29) | 14–20 h | 19–26 h |
| Lucas | 2.4, 2.5, 2.6, 2.7, G8 | ~16 h | G1, G2, G4, G7, G8, 1.7, 2.6, 2.7 | 1.2, 1.3, 1.4, 2.3, G3, G5, G9 + revisão geral de todos | ~8–10 h (G1, esboço, 9 figuras, WBS, manual) | 17–23 h | 25–33 h |

### Ordem de merge

1. PR #25 (esboço e Figuras 2 a 9; sem a Figura 1 duplicada).
2. Seção 1: 1.2, 1.3, 1.4, 1.5, 1.6 em paralelo; 1.7 pode entrar antes, escrito a partir do esboço.
3. Seção 2: 2.1 → 2.2 → 2.3, 2.4, 2.5, 2.6 → 2.7 → 2.8.
4. G5 e G6 → G7 → G8 (PDF).
