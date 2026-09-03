# Orbit — Referência visual preservada

O pacote enviado foi adotado como referência visual para o Orbit: 19 telas, 19 HTMLs e dois documentos de design. Os 40 arquivos originais estão em `references/stitch_original`, preservados sem modificações. `source-manifest.json` registra tamanho e SHA-256 de cada arquivo; o ZIP contém uma cópia portátil dos originais.

## Arquivo principal

`design.json` reúne paletas, tipografia, espaçamentos, raios, bordas, efeitos, navegação, layouts, componentes, gráficos, estados, catálogo das telas e receitas para novas páginas. Cada tela aponta para sua imagem, HTML e extração técnica em `analysis/`.

Para as telas existentes, copiar a imagem correspondente e usar seu HTML para recuperar classes e conteúdo fora do recorte. Para telas novas, escolher a tela irmã e a receita mais próximas. O JSON distingue valores extraídos de regras derivadas; não substitui as imagens como referência exata.

## Telas analisadas

| Tela | Referência |
|---|---|
| Estados vazios | `orbit_cat_logo_de_estados_vazios_empty_states` |
| Configurações e perfil | `orbit_configura_es_perfil` |
| Dashboard — desktop | `orbit_dashboard_vis_o_geral` |
| Dashboard — mobile | `orbit_dashboard_vis_o_geral_mobile` |
| Erros e recuperação | `orbit_estados_de_erro_404_recupera_o_de_falhas` |
| Finanças com drawer — desktop | `orbit_finan_as_transa_es` |
| Finanças — mobile | `orbit_finan_as_transa_es_mobile` |
| Hábitos — desktop | `orbit_h_bitos_consist_ncia` |
| Hábitos — mobile | `orbit_h_bitos_consist_ncia_mobile` |
| Integração Telegram | `orbit_integra_o_telegram_udio_finan_as` |
| Login em dois painéis | `orbit_login_split_panel` |
| Nova tarefa — mobile | `orbit_nova_tarefa_drawer_mobile` |
| Nova transação — mobile | `orbit_nova_transa_o_drawer_mobile` |
| Novo hábito — mobile | `orbit_novo_h_bito_drawer_mobile` |
| Novo treino — mobile | `orbit_novo_treino_drawer_mobile` |
| Tarefas — mobile | `orbit_tarefas_backlog_mobile` |
| Tarefas com drawer — desktop | `orbit_tarefas_drawer` |
| Treino em andamento — mobile | `orbit_treino_em_andamento_mobile` |
| Treinos e rotinas — desktop | `orbit_treinos_rotinas` |

## Decisões visuais consolidadas

- Dark como base visual, azul-marinho em camadas, azul/lilás para ações e turquesa para atividade e conclusão.
- Geist para leitura/títulos; JetBrains Mono para labels técnicos, valores, atalhos e metadados conforme a referência.
- Sidebar desktop de 256px nos HTMLs e topbar de 64px; mobile com cinco itens inferiores e conteúdo em coluna.
- Cards de 12/16/18px conforme a tela; drawer direito de tarefas de 480px, financeiro de 440px; bottom sheets com canto superior de 28px.
- Gráficos discretos, anéis de progresso, calendários/heatmaps e brilhos pontuais.
- Formulários mobile com cabeçalho, corpo rolável e CTA persistente; não achatar a hierarquia em formulários genéricos.

## Diferenças registradas

O texto do DESIGN.md declara cores e raios diferentes dos tokens usados pelos HTMLs. As duas paletas foram mantidas, com precedência explícita da tela e de seu CSS. A largura em pixels dos PNGs não prova o viewport original: várias telas longas foram reduzidas na exportação.

Os mockups trazem conteúdo que ultrapassa a especificação funcional v1.1: Open Finance, IA em outros módulos, sensores/biometria, recursos offline, armazenamento local como fonte de verdade, passkeys e variantes de processamento Telegram. Aprovar o design não transforma automaticamente esses exemplos em requisitos implementáveis. Os originais foram preservados integralmente, e os conflitos ficaram registrados em `content_and_scope.conflicts`.

Dark passa a ser a referência visual escolhida pelo usuário. Funcionalidades, segurança, regras financeiras e arquitetura continuam seguindo a v1.1 e futuras decisões explícitas. Não foram removidos componentes dos originais nem tomadas decisões de escopo silenciosas.

## Telas futuras

Não há referências dedicadas para todos os detalhes de fatura/pagamento, CRUD de contas/categorias/recorrências, histórico detalhado de treino, dashboard mensal, versões mobile de configurações/Telegram e estados de carregamento. O JSON fornece receitas derivadas para essas lacunas; elas ainda exigirão adaptação e validação quando forem desenvolvidas.

## Como reutilizar

“Use o `design.json` do Orbit e as referências originais. Para telas existentes, reproduza a tela correspondente. Para esta nova funcionalidade, aplique a receita mais próxima, reutilize seus componentes e respeite a especificação v1.1. Identifique qualquer divergência necessária.”

Os HTMLs são protótipos estáticos com scripts demonstrativos e dependências externas. A análise não executou seus scripts nem implantou uma aplicação. As fontes, o CDN e um avatar remoto não são distribuídos como binários no pacote; as imagens permanecem a referência visual estável.
