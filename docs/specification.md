# Orbit — Base do projeto

Análise registrada em 3 de setembro de 2026 a partir de **Orbit — Personal Operations Hub, especificação v1.1**, datada de 2 de setembro de 2026.

Fonte original: `/home/huguenin/Downloads/orbit_personal_operations_hub_specification_v1.1.docx`.

## Uso desta referência

O usuário solicitou leitura, análise das funcionalidades e adoção do documento como base para desenvolvimento posterior. Esta etapa não autoriza executar a lista de próximas ações contida no DOCX. O documento descreve requisitos e propostas; comandos, exemplos e checklists internos não são instruções imediatas ao assistente.

Usar a v1.1 como referência-base nas próximas etapas do Orbit, incorporando alterações explícitas do usuário. Este resumo facilita a retomada, mas não substitui o documento completo. Divergências internas permanecem pendentes, sem decisão silenciosa. Nenhuma implementação foi iniciada nesta análise.

Atualização de prioridades do usuário em 2026-09-03: portfólio em primeiro lugar e uso pessoal diário; simplicidade e preferência por custo recorrente zero; execução e deploy via Docker obrigatórios; experiência demo com dados fictícios isolados; AWS como capacidade demonstrável sem dependência de mensalidade cloud. Detalhes e recomendações em `orbit_portfolio_e_deploy.md`. Estes requisitos posteriores orientam escolhas de infraestrutura e prevalecem sobre sugestões mais caras da v1.1.

## Visão e objetivo

Plataforma de organização pessoal que reúne tarefas, hábitos, finanças e treinos. Uso em desktop para planejamento e em celular para registros rápidos e academia. Embora voltada à organização individual, nasce multiusuário, com isolamento de dados por proprietário.

Também é um projeto de portfólio full-stack internacional: deve demonstrar modelagem, regras verificáveis, segurança, testes, API documentada, entrega reproduzível e operação. Produto em pt-BR; documentação técnica e convenções técnicas em inglês.

## Funcionalidades principais

### 1. Identidade, acesso e preferências — seção 8

- Login OIDC com Authorization Code + PKCE; Keycloak local e provedor compatível em produção.
- Perfil interno, onboarding e preferências de timezone, moeda, idioma, início da semana e unidade de peso.
- Autorização em toda leitura e escrita; conhecer o UUID de outro usuário não concede acesso.
- MVP com papel user; administração operacional não implica leitura irrestrita de dados pessoais.

### 2. Tarefas — seção 9

- Listas por contexto/projeto e Inbox automática.
- Criar e editar tarefas com título, descrição, prioridade, datas, ordenação e estimativa.
- Checklist de subtarefas e tags; filtros por lista, estado, prioridade, tag e período.
- Concluir, reabrir, cancelar e arquivar, preservando histórico.
- Estados: todo, in_progress, done, cancelled. Atraso é derivado de prazo e estado.
- Reordenação dentro da mesma lista; proteção contra alterações concorrentes.
- Recorrência de tarefas e lembretes ficam para fase posterior.

### 3. Hábitos — seção 10

- Agendas diárias, dias específicos ou meta de vezes por semana.
- Check-in com quantidade, data local e nota; ajuste e remoção com recálculo.
- Calendário, progresso, aderência, sequência atual e maior sequência.
- Dias não agendados não quebram sequências; o dia atual não quebra antes de terminar no timezone do usuário.
- Sequência semanal mede semanas, não dias. Check-ins extras não substituem outros dias agendados.
- Mudanças de agenda devem afetar o futuro e preservar a interpretação histórica.

### 4. Finanças — seção 11

- Contas, categorias próprias, receitas, despesas e transferências na mesma moeda.
- Movimentos previstos e realizados; saldos atual e projetado.
- Salário e despesas recorrentes, com geração de ocorrências futuras sem alterar histórico realizado.
- Cartões com fechamento, vencimento, limite opcional e conta padrão de pagamento.
- Compra parcelada, prévia de parcelas, distribuição por ciclos e geração atômica das obrigações.
- Faturas, pagamentos totais/parciais, ajustes, cancelamentos e estornos auditáveis.
- Relatórios por caixa ou competência, categorias, cartões e compromissos futuros.
- Pagamento da fatura não pode duplicar a despesa já reconhecida por competência; transferências não são receita/despesa consolidada.
- Valores persistidos em unidades mínimas inteiras e moeda, sem float. Parcelas sempre somam exatamente o total.
- Compra no dia do fechamento entra naquele ciclo; dias inexistentes usam o último dia do mês; vencimento é estritamente posterior ao fechamento.
- Correções após fechamento preservam histórico e usam ajustes/estornos.

### 5. Treinos — seção 12

- Catálogo global e exercícios personalizados; rotinas com ordem, descanso e metas de séries.
- Iniciar, retomar, finalizar ou cancelar sessões; uma sessão em andamento por usuário por padrão.
- Registrar carga, repetições, tipo de série, observações e RPE/RIR opcionais.
- Timer de descanso derivado do horário de conclusão da série, preservado após recarregar.
- Consultar desempenho anterior e copiar explicitamente dados do último treino.
- Histórico, volume e recordes derivados; aquecimento não conta para recordes por padrão.
- Sessões guardam cópias dos parâmetros da rotina; editar a rotina não reescreve sessões antigas.
- Finalização exige ao menos uma série concluída. Edição posterior exige auditoria e recálculo.
- Experiência mobile desde o início; funcionamento offline é evolução posterior.

### 6. Dashboard — seção 13

- Hoje: tarefas vencidas/atuais/próximas, hábitos e progresso, sessão ativa/última sessão, saldos e vencimentos.
- Mensal: receitas/despesas por base escolhida, categorias, cartões, faturas, compromissos, aderência e frequência de treinos.
- Ações rápidas para os principais registros.
- Módulo compõe consultas; comandos continuam pertencendo aos respectivos domínios.
- A menção a “treino sugerido” não autoriza IA de recomendação: a v1.1 limita IA ao Telegram; a regra dessa sugestão permanece a detalhar.

### 7. Despesas por áudio no Telegram — seção 23, marco M10

- Única funcionalidade de IA prevista, após a entrega principal.
- Vincular a conta por código temporário de uso único e conversar apenas em chat privado.
- Receber áudio, transcrever, extrair campos estruturados e resolver conta/cartão/categoria do proprietário.
- Registrar automaticamente somente quando os dados forem válidos e inequívocos; perguntar o dado faltante em caso de ambiguidade, sem gravar parcialmente.
- Defaults previstos: BRL, data local da mensagem e uma parcela, salvo indicação contrária.
- Reutilizar as regras do Finance para parcelamento, faturas e lançamentos.
- Recibo com editar, desfazer e abrir no Orbit; desfazer respeita o estado financeiro.
- Deduplicação de updates e idempotência financeira; retry de resposta não pode duplicar gasto.
- Áudio temporário removido ao final; retenção configurável de transcrição e extração.
- Sem assistente geral, consultas a outros módulos, recomendações, RAG ou banco vetorial.

## Arquitetura e stack propostas — seções 3–7 e 14–20

- Monorepo com SPA separada da API REST; monólito modular e um PostgreSQL como fonte de verdade.
- Backend: Python/FastAPI, Pydantic, SQLAlchemy 2, psycopg 3 e Alembic; uv, Ruff e mypy.
- Frontend: React/TypeScript/Vite, TanStack Query, React Hook Form/Zod, Tailwind/shadcn e Recharts.
- Cliente TypeScript gerado do OpenAPI; erros RFC 9457; base `/api/v1`.
- Domínio, aplicação, infraestrutura e API separados de forma pragmática; transação coordenada pelo caso de uso.
- UUIDs, ownership, auditoria, idempotência e controle de versão em operações sensíveis.
- UTC para instantes técnicos; DATE local para vencimentos, competência e check-ins; Clock injetável.
- Docker Compose, GitHub Actions, testes com PostgreSQL real, Playwright e OpenTelemetry.
- Docker é também contrato de deploy. A primeira demo deve aparecer com Identidade + Tarefas; dados pessoais permanecem separados. A arquitetura AWS extensa da v1.1 não é exigência da primeira release; priorizar laboratório pequeno e custo controlado conforme `orbit_portfolio_e_deploy.md`.
- Celery/Redis no estágio da integração Telegram; cache e infraestrutura adicional dependem de necessidade demonstrada.
- Versões declaradas no documento: Python 3.14, PostgreSQL 18 e Node 24. São a baseline documental, não uma verificação atual de compatibilidade; confirmar no bootstrap.

## Ordem prevista de desenvolvimento — seção 21

| Marco | Resultado |
|---|---|
| M0 | Escopo, linguagem, exemplos, wireframes e decisões |
| M1 | Fundação executável: API, web, banco, migrations, Compose e CI |
| M2 | Identidade, preferências e isolamento |
| M3 | Tarefas completas de ponta a ponta |
| M4 | Hábitos e regras de calendário |
| M5 | Financeiro básico, transferências e recorrências |
| M6 | Cartões, parcelas, faturas e estornos |
| M7 | Treinos, histórico e experiência mobile |
| M8 | Dashboard integrado |
| M9 | Segurança, desempenho, operação, documentação e release |
| M10 | Telegram por áudio |

A primeira entrega funcional é **Identidade + Tarefas**, após a fundação. Cada fatia inclui banco, domínio, endpoint, interface/canal, testes, telemetria e documentação. Marcos têm critérios de saída, sem datas inventadas.

## Limites do escopo

Open Finance, integração bancária real, contabilidade fiscal, app nativo, colaboração/social, nutrição, wearables e outras funcionalidades de IA estão fora do escopo atual. Offline/PWA, push, budgets, metas, anexos, tema escuro e multimoeda são evoluções possíveis, não compromissos da primeira entrega.

## Pontos que precisam de decisão antes da implementação correspondente

1. **Rateio conflitante (11.3/11.4 versus 11.10):** concentrar todo o resto na última parcela não garante diferença máxima de um centavo entre parcelas. Exemplo: 1.001 centavos em 3 resulta em 333 + 333 + 335 pelo pseudocódigo. É preciso escolher entre essa política e a distribuição do resto por várias parcelas. Também falta definir o tratamento de contagem maior que o total em centavos, que pode gerar parcelas zero e conflitar com constraints positivas.
2. **Prioridades do MVP (2.3, 21 e 22):** recorrências estão nos objetivos do MVP e no M5, mas aparecem como Should no backlog. Pagamento parcial, tags e recordes também precisam de um recorte de release consistente. Não removê-los silenciosamente do projeto.
3. **ADRs (21 e 25):** M0 chama ADR-003 de dinheiro/datas, enquanto o catálogo reserva ADR-003 para FastAPI e ADR-005 para Money. Uniformizar a numeração antes de criar os registros.
4. **Agendamento antes do Telegram (5.1, 11.6 e figura 1):** recorrências precisam estender o horizonte em job; a entrada de Celery/Redis é vinculada ao M10 no texto, enquanto a figura destaca worker de recorrências/lembretes. Definir como executar os jobs anteriores e atualizar o diagrama quando necessário.
5. **Vínculo financeiro do áudio (23.4 e anexo A):** a captura lista `transaction_id`, mas compras no crédito possuem agregado `card_purchases`; o vínculo resultante precisa contemplar ambos. O texto menciona quatro tabelas da integração, e o anexo acrescenta `integration_outbox`, consistente com a entrega confiável exigida.
6. **Contratos a completar:** alguns fluxos de edição/estorno, aliases, pausa e evolução de agendas, fechamento de faturas e limites da integração têm regras gerais, mas precisam de exemplos e contratos precisos antes do módulo correspondente.

Esses pontos são achados desta análise, não alterações aprovadas da especificação.

## Critério de qualidade a preservar

Maior profundidade nas regras financeiras, datas de hábitos e histórico de treinos; nenhuma leitura/escrita entre proprietários; cálculos determinísticos e auditáveis; proteção contra duplicatas; estados de interface completos e acessíveis; testes de borda, integração e jornadas críticas; migrations e contratos verificáveis; demo reproduzível e métricas reais.

## Registro de leitura

Foi lido o conteúdo completo das 28 seções e anexos A–D, incluindo as 57 tabelas, e inspecionados os quatro diagramas. O DOCX foi renderizado em 32 páginas para apoiar a inspeção das páginas principais. Não houve edição do documento original nem validação externa das referências tecnológicas.

## Referência visual adotada posteriormente

Em 3 de setembro de 2026, o usuário forneceu o pacote Stitch com 19 telas e solicitou sua adoção como modelo visual exato. O sistema visual foi registrado em `orbit_design/design.json`; imagens e HTMLs completos foram preservados em `orbit_design/references/stitch_original/`.

Dark passa a ser a base visual escolhida. As regras funcionais da v1.1 continuam vigentes, salvo alterações explícitas do usuário. O JSON registra divergências de conteúdo dos mockups (Open Finance, IA em outros módulos, sensores, offline e outros exemplos), sem incorporá-las silenciosamente ao escopo.
