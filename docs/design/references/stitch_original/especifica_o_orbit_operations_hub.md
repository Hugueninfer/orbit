# Orbit — Personal Operations Hub
## Especificação e Arquitetura do Produto

### 1. Visão Geral e Posicionamento
- **Nome:** Orbit — Personal Operations Hub
- **Conceito:** Central pessoal unificada e autenticada para tarefas, hábitos, finanças e treinos.
- **Tom & Estilo:** Premium, moderno, focado em alta engenharia, estritamente dark mode, linguagem orbital sutil (círculos concêntricos, nós, trajetórias).
- **Idioma:** Português do Brasil (pt-BR).

### 2. Paleta de Cores e Tokens Visuais
- **Fundo Principal:** #07111F (azul-marinho quase preto)
- **Fundo Secundário:** #0B1728
- **Superfícies & Cards:** #101D31
- **Superfície Elevada:** #15243A
- **Bordas:** #253653
- **Azul Principal (Brand/Acento):** #7692FF
- **Azul Intenso:** #5575F6
- **Turquesa de Apoio:** #2DD4BF
- **Texto Principal:** #EEF4FF
- **Texto Secundário:** #94A3B8
- **Estados:** Sucesso (#34D399), Atenção (#FBBF24), Erro (#FB7185)
- **Grid & Forma:** Grid 8px, cards r=16-20px, botões r=10-12px.

### 3. Estrutura de Navegação & Shell
- **Sidebar Fixa (Desktop):**
  - Topo: Logotipo textual "Orbit" + símbolo orbital circular.
  - Navegação Principal: Visão Geral, Tarefas, Hábitos, Finanças, Treinos.
  - Rodapé da Sidebar: Integrações (Telegram áudio), Configurações, Perfil do Usuário.
- **Topbar:** Título da página, data/contexto, busca contextual, notificações, avatar, ação rápida contextual.
- **Mobile:** Barra inferior de navegação ou drawer colapsável; ações no alcance do polegar.

### 4. Módulos e Escopo de Telas
1. **Autenticação:**
   - Login Split Panel (painel visual orbital à esquerda, formulário à direita).
   - Recuperação de senha e estados de sessão.
2. **Dashboard (Visão Geral):**
   - Resumo diário, tarefas críticas, hábitos do dia, saúde financeira mensal, próximo treino, tendências e atalhos rápidos.
3. **Tarefas:**
   - Listas por abas (Hoje, Próximas, Todas, Concluídas), filtros, agrupamento, drawer lateral de criação/edição.
4. **Hábitos:**
   - Check-in diário com indicador circular, streaks, mapa de calor/calendário de consistência mensal, drawer de criação de hábito.
5. **Finanças:**
   - Saldos, fluxo de receitas vs. despesas, cartões de crédito visuais (com limites e faturas), compras parceladas, drawer de nova transação.
6. **Treinos:**
   - Rotinas (Upper/Lower/Full Body), biblioteca de exercícios, histórico e modo "Treino em Andamento" (mobile-first com cronômetro circular de descanso).
7. **Integração Telegram:**
   - Setup e vinculação para transcrição/interpretação de despesas por áudio.
8. **Configurações & Estados Globais:**
   - Perfil, preferências, estados de erro, vazio e loading.
