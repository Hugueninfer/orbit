[**Português (Brasil)**](README.md) · [English](README.en.md)

<div align="center">

# Orbit

### Tudo o que importa, em uma única órbita.

Tarefas · Hábitos · Finanças · Notas & Diário · Jardim de Foco · Treinos

**Uma central pessoal para o dia a dia, construída como um projeto full stack de portfólio.**

[**Experimentar demonstração →**](https://orbit-x1i7.onrender.com/demo) · [Documentação da API](https://orbit-x1i7.onrender.com/api/docs) · [Rodar com Docker](#rodar-com-docker) · [Galeria](#galeria)

**React 19 · TypeScript · FastAPI · PostgreSQL 18 · Docker**

Interface em **Português, English e Deutsch**. Acesso pelo computador e pelo celular.

</div>

![Dashboard do Orbit com resumo financeiro, hábitos, tarefas e treino do dia](docs/screenshots/showcase/02-dashboard.png)

## Sobre o projeto

O Orbit reúne atividades que normalmente ficam espalhadas entre vários aplicativos: organizar entregas, manter hábitos, acompanhar gastos, escrever um diário, concentrar-se e registrar treinos. O objetivo é ter uma aplicação agradável para usar todos os dias e, ao mesmo tempo, demonstrar desenvolvimento de produto de ponta a ponta.

O projeto inclui interface responsiva, API tipada, regras de negócio, persistência real, autenticação, testes e operação com Docker. A demonstração é interativa: os botões executam operações e as alterações são salvas no PostgreSQL.

**Uma aplicação, uma URL e um banco.** Contas pessoais e demonstrações usam a mesma instalação, com dados separados por proprietário. O núcleo roda localmente sem contas em serviços externos e sem chave de inteligência artificial. A publicação atual usa Render e Neon; a integração com Telegram é opcional.

### Navegue pelo README

- [Experimentar em cinco minutos](#experimentar-em-cinco-minutos)
- [Galeria de telas](#galeria)
- [Funcionalidades](#funcionalidades)
- [Decisões de engenharia](#decisões-de-engenharia)
- [Arquitetura e tecnologias](#arquitetura-e-tecnologias)
- [Como a demonstração funciona](#como-a-demonstração-funciona)
- [Rodar com Docker](#rodar-com-docker)
- [Desenvolvimento local](#desenvolvimento-local)
- [Configuração e deploy](#configuração-e-deploy)
- [Testes e qualidade](#testes-e-qualidade)
- [Operação e backups](#operação-e-backups)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Documentação e limites atuais](#documentação-e-limites-atuais)

## Experimentar em cinco minutos

Abra a [demonstração online](https://orbit-x1i7.onrender.com/demo) e clique em **Experimentar demonstração**. Não é necessário cadastrar uma conta, informar um e-mail ou usar uma senha pública.

1. **Dashboard:** confira tarefas, hábitos, finanças e o treino sugerido.
2. **Tarefas e hábitos:** conclua uma tarefa ou registre quantos copos de água bebeu. Recarregue para conferir a persistência.
3. **Finanças:** explore as despesas, compras parceladas e faturas. Crie um lançamento fictício.
4. **Notas & Diário:** abra as pastas e leia o diário do Homem-Aranha ou o registro de um recrutador imaginário. Experimente a formatação do editor.
5. **Jardim de Foco:** observe as dez árvores de exemplo. Inicie um foco de um minuto, navegue por outra tela e volte para acompanhar a conclusão.
6. **Treinos:** retome a sessão preparada, registre uma série e consulte o histórico.
7. **Preferências:** troque o idioma no seletor ao lado do perfil. Em Configurações, é possível reiniciar somente a sua demonstração.

> A hospedagem de demonstração pode precisar despertar após inatividade. A primeira abertura pode demorar; os dados fictícios já vêm de uma base preparada. A sessão demo expira após 24 horas.

## Galeria

**Prints reais da aplicação, capturados em 4 de setembro de 2026.** Todos os registros exibidos são fictícios. Clique nas imagens para ampliar. A galeria foi gerada pela própria interface, sem substituir telas por mockups.

### Entrada e visão do dia

A mesma entrada oferece acesso pessoal e uma demonstração isolada. O dashboard concentra os principais indicadores e atalhos.

![Tela de entrada com login pessoal, seleção de idioma e acesso à demonstração](docs/screenshots/showcase/01-login.png)

### Tarefas e hábitos

Listas, prioridades e prazos ajudam a organizar o trabalho. O calendário de hábitos mostra frequência, check-ins e consistência.

![Gestão de tarefas com listas, filtros, prioridades e datas](docs/screenshots/showcase/03-tasks.png)

![Hábitos com calendário de consistência e registro de quantidade](docs/screenshots/showcase/04-habits.png)

### Finanças, cartões e faturas

Uma visão consolidada para contas, entradas e saídas, com detalhamento de compras e pagamentos.

![Painel financeiro com saldo consolidado, gráficos e transações](docs/screenshots/showcase/05-finance.png)

<details>
<summary><strong>Ver detalhes de fatura e formulário de compra no crédito</strong></summary>

![Detalhamento de fatura com parcelas e registro de pagamento](docs/screenshots/showcase/06-invoice.png)

![Formulário de compra no cartão com valor, categoria e parcelamento](docs/screenshots/showcase/07-credit-purchase.png)

</details>

### Notas & Diário

Pastas coloridas, registros por data e um editor rico no mesmo espaço. O conteúdo da demo inclui Trabalho, Vida, Mercado, Relacionamento e Viagens.

![Notas e diário com pastas organizadas, lista de registros e editor de texto rico](docs/screenshots/showcase/10-journal.png)

### Jardim de Foco

O tempo de concentração vira um jardim. Cada foco concluído rende uma árvore; os modelos são sorteados sem repetição dentro do ciclo.

![Jardim de Foco com Pomodoro e dez modelos de árvores colecionáveis](docs/screenshots/showcase/11-focus.png)

<details>
<summary><strong>Ver uma sessão de foco em andamento</strong></summary>

![Cronômetro de foco em andamento com estágio de crescimento da árvore e controles](docs/screenshots/showcase/12-focus-active.png)

</details>

### Treinos

Rotinas reutilizáveis e registro de séries durante a sessão, com histórico para acompanhar evolução.

![Área de treinos com sessão em andamento, rotinas e histórico](docs/screenshots/showcase/08-workouts.png)

<details>
<summary><strong>Ver registro de séries durante o treino</strong></summary>

![Treino em andamento com exercício, carga, repetições e controles de sessão](docs/screenshots/showcase/09-workout-session.png)

</details>

### Configurações e Telegram

Preferências de idioma, fuso horário e unidades, além do acesso à integração de áudio. Na demonstração, a captura pelo Telegram é explicitamente simulada.

<details>
<summary><strong>Ver configurações e demonstração da integração</strong></summary>

![Configurações de perfil, idioma, fuso horário, sessão e demonstração](docs/screenshots/showcase/13-settings.png)

![Interface da integração Telegram em modo de demonstração simulada](docs/screenshots/showcase/14-telegram.png)

</details>

### No celular

Navegação inferior e layouts adaptados para consultar dados, escrever e acompanhar o foco em telas pequenas.

<p align="center">
  <img src="docs/screenshots/showcase/15-mobile-dashboard.png" width="270" alt="Dashboard do Orbit no celular">
  <img src="docs/screenshots/showcase/16-mobile-tasks.png" width="270" alt="Lista de tarefas no celular">
  <img src="docs/screenshots/showcase/17-mobile-habits.png" width="270" alt="Hábitos e check-ins no celular">
</p>
<p align="center">
  <img src="docs/screenshots/showcase/18-mobile-focus.png" width="270" alt="Pomodoro com árvore em crescimento no celular">
  <img src="docs/screenshots/showcase/19-mobile-notes.png" width="270" alt="Editor de diário no celular">
</p>

[Como atualizar os prints](docs/screenshots/README.md).

## Funcionalidades

| Área | O que é possível fazer |
|---|---|
| **Dashboard** | Consultar indicadores da conta, próximos compromissos, hábitos e treino; usar ações rápidas e busca geral dos módulos indexados. |
| **Tarefas** | Criar listas, definir status, prazo e prioridade; usar tags e checklists; filtrar, arquivar e restaurar tarefas. |
| **Hábitos** | Definir frequência e metas; registrar quantidades e observações; consultar calendário, aderência e sequências. |
| **Contas e transações** | Cadastrar contas e categorias; registrar receitas, despesas e lançamentos previstos; transferir entre contas. |
| **Cartões** | Registrar compras e parcelas; acompanhar fechamento, vencimento e faturas; fazer pagamentos parciais, cancelamentos e estornos. |
| **Recorrências** | Gerar ocorrências diárias, semanais, mensais ou anuais, preservando a identidade e o histórico de cada vencimento. |
| **Notas & Diário** | Organizar pastas de um nível; associar notas a datas; favoritar, buscar, mover para lixeira e restaurar. |
| **Editor rico** | Usar negrito, itálico, títulos, tamanhos e cores, realce, listas, checklists, citações, código e links, com salvamento automático. |
| **Jardim de Foco** | Definir foco de 1–180 minutos, pausar, retomar e fazer intervalos; acompanhar quatro estágios de crescimento e colecionar dez modelos de árvores. |
| **Treinos** | Montar rotinas e exercícios; iniciar/retomar sessões; registrar carga, repetições e RPE/RIR; consultar volume, histórico e recordes. |
| **Telegram opcional** | Enviar uma despesa por áudio ao bot vinculado à conta; esclarecer dados faltantes por texto; receber confirmação do lançamento. |
| **Preferências** | Alternar entre pt-BR, en-US e de-DE; configurar fuso e unidade de peso; sair da conta e reiniciar a própria demo. |

### Detalhes que fazem diferença no uso

- **Compras no crédito são despesas.** Aparecem identificadas como crédito; pagar a fatura não conta como uma nova despesa sobre a mesma compra.
- **Uma nota pode ser diário e pertencer a uma pasta.** A organização por assunto não impede o registro por data.
- **Escrever não depende de salvar a cada tecla.** O editor mantém a digitação local e agrupa gravações após 800 ms, com indicação do estado de salvamento.
- **O foco acompanha a navegação.** O cronômetro usa o prazo do servidor e recupera a sessão depois de recarregar ou retornar ao aplicativo.
- **Sorteio com memória.** Os dez modelos não se repetem no ciclo. O próximo ciclo também evita repetir imediatamente a última árvore; reiniciar o sorteio preserva o jardim.
- **Idiomas sem alterar seus registros.** Rótulos, datas e números seguem a preferência; textos escritos pelo usuário são preservados e a moeda continua BRL.

## Decisões de engenharia

| Problema | Solução implementada | Onde explorar |
|---|---|---|
| Demonstrar um produto sem expor dados pessoais | Proprietário separado por visitante, token temporário, consultas com escopo de dono e relações protegidas por chaves compostas. | [Identidade e isolamento](docs/architecture.md) |
| Abrir a demo sem executar centenas de comandos de cadastro | Snapshot fictício versionado, cópia em lotes, novos IDs e datas ajustadas para o momento da entrada. | [Base da demo](docs/demo.md) |
| Evitar centavos perdidos em parcelas | Valores inteiros em centavos e distribuição que preserva exatamente a soma original. | [Domínio financeiro](backend/app/domain.py) |
| Evitar lançamentos duplicados em novas tentativas | Chaves de idempotência nas operações sensíveis, transações e controle de concorrência por proprietário. | [Contratos HTTP](backend/API.md) |
| Não sobrescrever uma edição mais recente | Versões otimistas e respostas de conflito; gravações serializadas no editor de notas. | [Notas](docs/notes.md) |
| Preservar treinos antigos após editar uma rotina | Cada sessão guarda um snapshot independente dos exercícios e séries. | [Treinos](backend/app/workouts.py) |
| Recuperar o Pomodoro sem gravar a cada segundo | Prazo UTC no servidor, estado persistido e reconciliação ao voltar ao aplicativo. | [Foco](docs/focus.md) |
| Conceder uma única árvore por conclusão | A árvore é a própria sessão concluída, com transação e restrição de uma sessão ativa por proprietário. | [Coleção](docs/tree-collection.md) |
| Processar áudio sem exigir outra infraestrutura de filas | Inbox/outbox no PostgreSQL e worker embutido no serviço existente. | [Decisão Telegram](docs/decisions/003-telegram-gemini.md) |
| Reduzir divergências entre frontend e backend | OpenAPI versionado e tipos TypeScript gerados a partir do contrato. | [Schema](backend/openapi.json) |

### Identidade e proteção dos dados

A conta pessoal usa e-mail e senha, hash scrypt, sessão revogável em cookie HttpOnly, proteção CSRF e limites persistidos de tentativas de login. Criação de conta e recuperação de senha são operações do administrador via CLI; não há cadastro público ou tela de CRUD de usuários.

No modo combinado, um token de demonstração tem prioridade sobre o cookie pessoal. Um token expirado ou inválido não dá acesso à conta pessoal como alternativa. O frontend separa a intenção de acesso por aba e limpa os dados em cache ao trocar de identidade.

O isolamento é aplicado pela API e pelas relações do banco; não se trata de bancos físicos separados nem de uma implementação de PostgreSQL RLS. OIDC permanece disponível como integração opcional, sem exigir Auth0 para o fluxo padrão.

## Arquitetura e tecnologias

O Orbit é um **monólito modular**. A API centraliza as regras de negócio, o PostgreSQL mantém o estado e a interface consome contratos HTTP tipados. No deploy, a SPA compilada e a API são servidas pela mesma origem dentro de uma imagem Docker.

```mermaid
flowchart TB
    Visitor[Visitante da demo] --> Web
    Owner[Usuário pessoal] --> Web
    Web[React + TypeScript · desktop e celular] -->|HTTPS / REST| API
    subgraph Docker[Uma imagem Docker]
        API[FastAPI · autenticação e regras de negócio]
        SPA[Arquivos da SPA compilada]
        Worker[Worker Telegram opcional]
        API --- SPA
        API --- Worker
    end
    API --> DB[(PostgreSQL · dados por proprietário)]
    Worker --> DB
    Bot[Bot Telegram] -->|Webhook| API
    Worker -->|Interpretação de áudio| Gemini[Gemini API opcional]
    Maintenance[CLI · migrações · backup] --> DB
```

| Camada | Tecnologias |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 7, TanStack Query, React Router e React Hook Form. |
| **Interface** | Radix UI, Lucide, Recharts, fontes locais Geist e JetBrains Mono; componentes e tokens próprios. |
| **Texto rico** | Tiptap OSS, documento JSON validado, listas/checklists e extensões de formatação. |
| **Backend** | FastAPI, Pydantic, SQLAlchemy 2, psycopg 3 e Alembic. |
| **Banco** | PostgreSQL 18, colunas relacionais tipadas, constraints e JSONB para estruturas aninhadas apropriadas. |
| **Runtime** | Python 3.14 no Docker; backend compatível com Python 3.12+. Node 24 na etapa de build do frontend. |
| **Testes** | pytest com PostgreSQL real, Vitest/Testing Library e Playwright desktop/mobile; Ruff, mypy e TypeScript. |
| **Entrega** | Docker multi-stage, processo sem root, Compose com banco persistente e etapa de migração. |
| **Operação** | Health checks, logs estruturados, IDs de requisição, scripts de backup e teste de restauração. |
| **Infraestrutura** | Render + Neon na instalação publicada; laboratório Terraform para EC2/SSM disponível separadamente. |

Não é necessário operar Kubernetes, Redis ou um conjunto de microsserviços para executar o produto. A integração de inteligência artificial fica fora do caminho obrigatório dos módulos principais.

### Sistema visual

O visual parte das 19 telas de referência do Stitch, com tema escuro, acentos em verde-água e hierarquia tipográfica consistente. O [design.json](docs/design/design.json) documenta tokens, componentes e receitas para novas telas. Extensões como o editor e o jardim estão registradas nas decisões visuais.

Os seletores usam um componente compartilhado com navegação por teclado. Notas e módulos maiores são carregados por rota; as árvores são SVGs locais, sem geração de imagens em tempo de execução. Animações do jardim respeitam a preferência por movimento reduzido.

## Como a demonstração funciona

```mermaid
sequenceDiagram
    actor V as Visitante
    participant A as Orbit
    participant P as PostgreSQL
    V->>A: Experimentar demonstração
    A->>P: Criar proprietário temporário
    A->>P: Copiar base fictícia em lotes
    Note over A,P: IDs novos, datas atuais e expiração de 24h
    A-->>V: Token da própria demonstração
    V->>A: Consultar, editar e experimentar
    A->>P: Operações somente desse proprietário
    V->>A: Reiniciar demonstração
    A->>P: Restaurar exemplos somente desse visitante
```

A [fixture versionada](backend/app/fixtures/demo-base.json) contém **201 registros preparados**, incluindo dados de domínio e auditoria. Ela reúne tarefas, hábitos, finanças, treinos, oito notas fictícias e dez árvores concluídas. As árvores aparecem em ordem aleatória a cada entrada ou reset.

Cada visitante tem seus próprios registros. As mudanças persistem no banco durante a validade da sessão e não alteram a base dos próximos visitantes. Ao expirar, o acesso é recusado; a limpeza dos dados expirados acontece em entradas posteriores na demo. Não há uma conta pública compartilhada nem um cron obrigatório para restaurar exemplos.

## Rodar com Docker

**Pré-requisito:** Docker com o plugin Docker Compose. Para o núcleo, não é necessário instalar Node/Python na máquina nem criar contas em serviços externos.

```sh
git clone https://github.com/Hugueninfer/orbit.git
cd orbit
cp .env.example .env
docker compose up -d --build --wait
```

Abra [localhost:8080](http://localhost:8080) e escolha **Experimentar demonstração**.

O Compose inicia o PostgreSQL, aguarda o banco ficar saudável, aplica as migrações e sobe a aplicação. Os dados ficam em um volume persistente. A configuração local publica a porta somente na interface de loopback.

### Criar sua conta pessoal

Revise os valores do `.env` antes de usar dados reais; ele deve permanecer fora do Git. Na instalação em execução:

```sh
docker compose exec app python -m app.accounts create voce@example.com
```

A CLI solicita a senha sem exibi-la. Depois, entre com e-mail e senha pela mesma tela. A conta pessoal não recebe a expiração da demonstração.

### Comandos do dia a dia

```sh
# Acompanhar os logs da aplicação
docker compose logs -f app

# Parar os serviços mantendo o volume do banco
docker compose stop

# Iniciar novamente
docker compose up -d --wait
```

`docker compose down -v` remove o volume do banco. Não use esse comando se quiser preservar seus registros.

## Desenvolvimento local

Use **Node 24**, **uv**, **Python 3.12+** e um PostgreSQL exclusivo para desenvolvimento. Docker utiliza Python 3.14, a mesma versão alvo do CI.

### Banco e API

Para executar a API fora do Docker, prepare uma instância PostgreSQL acessível pelo host, como o container descartável mostrado na [seção de testes](#executar-testes-do-backend). O banco do Compose completo não expõe porta para o host. Com o banco disponível:

```sh
cd backend
uv sync --frozen
```

Configure a conexão e inicie a API:

```sh
export APP_MODE=combined
export DATABASE_URL='postgresql+psycopg://orbit:orbit-test@localhost:55432/orbit_test'
export SESSION_COOKIE_SECURE=false
export ALLOWED_ORIGINS='http://localhost:5173'
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

A URL acima é exclusivamente um exemplo local com credenciais fictícias. Nunca aponte testes para o banco pessoal ou de produção.

### Frontend

Em outro terminal:

```sh
cd web
npm ci
npm run dev
```

Abra [localhost:5173](http://localhost:5173). O Vite encaminha `/api` para `127.0.0.1:8000`. Para criar um usuário nesse banco local, execute `uv run python -m app.accounts create voce@example.com` no diretório `backend`, com as mesmas variáveis de ambiente.

### Contratos e traduções

- Swagger: [API publicada](https://orbit-x1i7.onrender.com/api/docs) ou `/api/docs` na instalação local.
- OpenAPI: `/api/v1/openapi.json`; cópia versionada em `backend/openapi.json`.
- Após alterar o contrato, execute `./scripts/generate-api.sh` com as dependências de desenvolvimento instaladas.
- Novos textos da interface usam `web/src/i18n.ts` e os catálogos em `web/src/locales/`.
- Preserve valores de domínio e conteúdo do usuário ao traduzir. Entradas monetárias usam os utilitários de `web/src/format.ts`.

## Configuração e deploy

### Variáveis principais

| Variável | Uso |
|---|---|
| `APP_MODE` | `combined` para conta pessoal e demos na mesma instalação. `personal` e `demo` continuam disponíveis. |
| `DATABASE_URL` | Conexão PostgreSQL no formato `postgresql+psycopg://...`. O Compose a monta a partir da configuração do banco. |
| `POSTGRES_PASSWORD` | Senha do PostgreSQL local usado pelo Compose; não substitui `DATABASE_URL` no Render. |
| `SESSION_COOKIE_SECURE` | `false` somente no desenvolvimento HTTP local; `true` no deploy HTTPS. |
| `ALLOWED_ORIGINS` | Origem do frontend, incluindo protocolo e porta quando aplicável. No deploy, a URL HTTPS real do serviço. |
| `PORT` | Porta HTTP, padrão local `8080`; a plataforma pode fornecê-la. |
| `OIDC_AUTHORITY` | Vazio para login local com senha. Os demais campos OIDC só são necessários ao optar por um provedor externo. |
| `TELEGRAM_WORKER_ENABLED` | Ativa o worker opcional do bot; padrão `false` no exemplo local. |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` | Configuração privada do bot, somente no backend. |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Configuração opcional para interpretar os áudios; veja o guia Telegram. |

Consulte [.env.example](.env.example) para a configuração de referência. Segredos e arquivos privados de ambiente não devem ser versionados.

### Publicação online

A instalação demonstrada neste README está em [orbit-x1i7.onrender.com](https://orbit-x1i7.onrender.com), com build do Dockerfile pelo Render e persistência no Neon.

O caminho adotado é:

1. Disponibilizar o código no GitHub.
2. Preparar um banco PostgreSQL e configurar a conexão privada.
3. Construir a imagem, aplicar migrações e criar a conta pessoal via CLI.
4. Criar um Web Service Docker no Render apontando para o repositório.
5. Definir `APP_MODE=combined`, `DATABASE_URL`, `SESSION_COOKIE_SECURE=true` e `ALLOWED_ORIGINS`.
6. Publicar e verificar `/api/v1/health`, login e demonstração.

**Passo a passo operacional:** [Deploy direto do GitHub para o Render](infra/render/DEPLOY-PT-BR.md).

O deploy manual não exige release, GHCR ou aprovação de GitHub Actions. O CI é uma verificação independente. Atualizações com alterações de banco seguem a ordem **backup → migração → deploy → validação**; o deploy automático permanece desativado no fluxo adotado.

O núcleo é executável sem serviços pagos. Disponibilidade, suspensão e cotas da hospedagem externa dependem dos planos dos provedores; não há garantia de serviço gratuito continuamente ativo.

### Telegram por áudio — opcional

Após configurar o bot, vincule-o pela conta pessoal e envie uma mensagem de voz, por exemplo: “Gastei 35 reais no almoço, pela conta Nubank”. O bot interpreta os dados com Gemini e pergunta pelo que faltar antes de registrar.

Quando a forma de pagamento não é informada, o padrão é **crédito**. Um único cartão ativo pode ser escolhido automaticamente; mais de um exige esclarecimento. A demo usa simulação e não envia áudios reais ao provedor.

Credenciais, webhook, limites de processamento e tratamento de falhas estão em [docs/telegram.md](docs/telegram.md). O núcleo funciona sem essa integração. O uso de Gemini está sujeito às cotas e condições do provedor; consulte os termos antes de enviar conteúdo pessoal.

### AWS como laboratório

O diretório [infra/aws](infra/aws/README.md) contém um laboratório Terraform com EC2 e acesso por SSM. Ele permite estudar a operação do mesmo container em outro ambiente. **Não é a infraestrutura da demonstração publicada e não é executado automaticamente.** Recursos AWS podem gerar cobrança; o laboratório é separado do caminho necessário para usar o Orbit.

## Testes e qualidade

A validação combina regras puras de domínio, integração com PostgreSQL real, componentes e jornadas de navegador. Os casos cobrem isolamento entre contas, concorrência, idempotência, datas, valores, persistência e recuperação de estado.

| Camada | Exemplos de cenários |
|---|---|
| **Backend** | Acesso a IDs de outro proprietário, validade de sessão, parcelas exatas, pagamento parcial, recorrências, hábitos por data e snapshots de treino. |
| **Notas** | Validação do documento rico, pastas, autosave, conflitos, preservação de rascunhos e lixeira. |
| **Foco** | Conclusão única, pausa/retomada, recuperação, cancelamento, ciclo das dez árvores e isolamento do sorteio. |
| **Frontend** | Formatação monetária por idioma, formulários, seletores, login, configurações e relógio do foco. |
| **Navegador** | Uso em desktop e mobile, persistência após reload, navegação, modais e estados de falha. |
| **Entrega** | Build Docker, migrações, tipos gerados e auditoria de dependências. |

### Executar testes do backend

Crie um banco **descartável**, separado de qualquer instalação com dados pessoais:

```sh
docker run -d --name orbit-tests \
  -e POSTGRES_USER=orbit \
  -e POSTGRES_PASSWORD=orbit-test \
  -e POSTGRES_DB=orbit_test \
  -p 127.0.0.1:55432:5432 \
  postgres:18-bookworm

# Aguarde o banco aceitar conexões; repita até retornar sucesso.
docker exec orbit-tests pg_isready -U orbit -d orbit_test
```

Em seguida:

```sh
cd backend
uv sync --frozen
export APP_MODE=demo
export DATABASE_URL='postgresql+psycopg://orbit:orbit-test@localhost:55432/orbit_test'
uv run alembic upgrade head
uv run pytest -q
uv run ruff check app tests
uv run mypy app
```

Não execute a suíte enquanto estiver usando essa mesma instância como demo interativa de desenvolvimento. Os testes criam e removem proprietários fictícios.

### Executar testes do frontend

```sh
cd web
npm ci
npm run typecheck
npm test
npm run build
```

### Jornadas de navegador

Com uma instalação **local e descartável** do aplicativo em execução:

```sh
cd web
npx playwright install chromium
ORBIT_BASE_URL=http://127.0.0.1:8080 npx playwright test core.spec.ts notes.spec.ts focus.spec.ts
```

A suíte completa também inclui login pessoal. Ela exige a conta fictícia preparada conforme o [workflow de CI](.github/workflows/ci.yml); não use credenciais pessoais para esses testes.

O [workflow de verificação](.github/workflows/ci.yml) reúne testes, análise estática, auditorias e verificação de contratos. Consulte também as [evidências de validação](docs/validation.md) e os guias dos módulos; números históricos de testes não substituem a execução no commit que você está avaliando.

## Operação e backups

| Recurso | Finalidade |
|---|---|
| `/health/live` | Verificar se o processo da aplicação está ativo no runtime Docker. |
| `/api/v1/health` | Verificar disponibilidade da API e conexão com o banco. |
| Logs estruturados e request IDs | Acompanhar requisições e correlacionar falhas. |
| Alembic | Versionar e aplicar mudanças no schema. |
| Scripts de backup | Exportar o banco e validar uma restauração separada. |

Para a instalação local padrão do Compose, na raiz do repositório:

```sh
mkdir -p backups
bash scripts/backup.sh orbit .env backups/orbit-local.dump
bash scripts/restore-check.sh orbit .env backups/orbit-local.dump
```

Escolha um novo nome de arquivo a cada backup. O teste de restauração usa um banco temporário separado e o remove ao terminar; não restaura por cima do banco ativo. Mantenha backups fora do Git.

No Neon, use **conexão direta** para `pg_dump` e Alembic; a conexão com pooler fica reservada ao aplicativo. Procedimentos remotos estão no [guia Render](infra/render/DEPLOY-PT-BR.md) e no [runbook](docs/runbook.md).

## Estrutura do repositório

```text
orbit/
├── backend/
│   ├── app/                 # API, identidade, regras e serviços dos módulos
│   │   └── fixtures/        # Base fictícia versionada da demonstração
│   ├── migrations/          # Histórico Alembic
│   ├── tests/               # Domínio e integração com PostgreSQL
│   ├── API.md               # Contratos e regras HTTP
│   └── openapi.json         # Schema gerado e versionado
├── web/
│   ├── src/
│   │   ├── components/      # UI compartilhada, editor e jardim
│   │   ├── pages/           # Telas dos módulos
│   │   ├── locales/         # Catálogos de tradução
│   │   └── generated/       # Tipos derivados do OpenAPI
│   ├── e2e/                 # Jornadas Playwright
│   └── scripts/             # Captura da galeria do README
├── docs/
│   ├── design/              # Tokens, referências Stitch e receitas visuais
│   ├── decisions/           # Decisões de produto e arquitetura
│   └── screenshots/         # Prints reais de desktop e celular
├── infra/
│   ├── render/              # Deploy Docker direto do repositório
│   ├── aws/                 # Laboratório Terraform EC2/SSM
│   └── keycloak/            # Provedor OIDC local opcional
├── scripts/                 # Migração, contas, backup, contratos e auditoria
├── Dockerfile               # Build multi-stage e runtime sem root
├── compose.yaml             # Aplicação, migrações e PostgreSQL local
├── render.yaml              # Blueprint de hospedagem
└── .env.example             # Configuração sem credenciais reais
```

## Documentação e limites atuais

| Documento | Conteúdo |
|---|---|
| [Especificação funcional](docs/specification.md) | Base funcional do produto e escopo consolidado. |
| [Arquitetura](docs/architecture.md) | Fronteiras dos módulos, isolamento e invariantes. |
| [Contratos da API](backend/API.md) | Endpoints, comandos e regras HTTP. |
| [Decisões de produto](docs/decisions/001-product-rulings.md) | Interpretações de negócio e escolhas explícitas. |
| [Sistema visual](docs/design/LEIA-ME.md) | Referências das telas, tokens e aplicação do design. |
| [Demo](docs/demo.md) | Snapshot, cópia em lotes, expiração e atualização de exemplos. |
| [Notas & Diário](docs/notes.md) | Editor rico, autosave, limites e proteção de rascunhos. |
| [Jardim de Foco](docs/focus.md) | Cronômetro, conclusão e recuperação de sessão. |
| [Coleção de árvores](docs/tree-collection.md) | Dez modelos, sorteio sem repetição e reinício de ciclo. |
| [Telegram](docs/telegram.md) | Vinculação, áudio, configuração e operação. |
| [Deploy Render](infra/render/DEPLOY-PT-BR.md) | Publicação, variáveis, migrações e manutenção. |
| [Runbook](docs/runbook.md) | Operação, acesso e recuperação. |

O escopo atual é uma aplicação web pessoal. Não inclui sincronização bancária, colaboração em equipe, anexos de notas, aplicativo mobile nativo ou sincronização offline completa. O cronômetro acompanha tempo decorrido; não monitora atenção nem bloqueia outros aplicativos. As moedas são exibidas em BRL, mesmo ao trocar o idioma.

O projeto preserva a especificação e as referências visuais originais, com evoluções documentadas para uso real: login local, demo isolada, notas ricas e jardim de foco.

---

<div align="center">

**Orbit · Seu espaço. Seu ritmo. Sua órbita.**

[Experimentar o produto](https://orbit-x1i7.onrender.com/demo) · [Perfil no GitHub](https://github.com/Hugueninfer) · [Voltar ao início](#orbit)

</div>
