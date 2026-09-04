[Português (Brasil)](README.md) · [**English**](README.en.md)

<div align="center">

# Orbit

### Everything that matters, in a single orbit.

Tasks · Habits · Finances · Notes & Journal · Focus Garden · Workouts

**A personal hub for everyday life, built as a full-stack portfolio project.**

[**Try the demo →**](https://orbit-huguenin.onrender.com/demo) · [API documentation](https://orbit-huguenin.onrender.com/api/docs) · [Run with Docker](#run-with-docker) · [Gallery](#gallery)

**React 19 · TypeScript · FastAPI · PostgreSQL 18 · Docker**

Available in **Português, English, and Deutsch**. Works on desktop and mobile.

</div>

![Orbit dashboard with a financial summary, habits, tasks, and today's workout](docs/screenshots/showcase/02-dashboard.png)

## About the project

Orbit brings together activities that usually live in separate apps: organizing work, building habits, tracking expenses, keeping a journal, staying focused, and logging workouts. The goal is to create an application that is enjoyable to use every day while demonstrating end-to-end product development.

The project includes a responsive interface, a typed API, business rules, real persistence, authentication, tests, and Docker operations. The demo is interactive: buttons perform real operations, and changes are saved in PostgreSQL.

**One application, one URL, and one database.** Personal accounts and demos share the same installation, with data separated by owner. The core runs locally without external service accounts or an AI API key. The published installation uses Render and Neon; Telegram integration is optional.

### Explore this README

- [Try it in five minutes](#try-it-in-five-minutes)
- [Screenshot gallery](#gallery)
- [Features](#features)
- [Engineering decisions](#engineering-decisions)
- [Architecture and technology](#architecture-and-technology)
- [How the demo works](#how-the-demo-works)
- [Run with Docker](#run-with-docker)
- [Local development](#local-development)
- [Configuration and deployment](#configuration-and-deployment)
- [Testing and quality](#testing-and-quality)
- [Operations and backups](#operations-and-backups)
- [Repository structure](#repository-structure)
- [Documentation and current limitations](#documentation-and-current-limitations)

## Try it in five minutes

Open the [online demo](https://orbit-huguenin.onrender.com/demo) and click **Experimentar demonstração** (Try the demo). No account registration, email address, or shared public password is required. Use the language selector to switch to English or German; the screenshots below show the Portuguese interface.

1. **Dashboard:** review tasks, habits, finances, and the suggested workout.
2. **Tasks and habits:** complete a task or record how many glasses of water you drank. Reload the page to check persistence.
3. **Finances:** explore expenses, installment purchases, and card statements. Create a fictional transaction.
4. **Notes & Journal (Notas & Diário):** browse the folders and read Spider-Man's journal or an imaginary recruiter's entry. Try the editor's formatting tools.
5. **Focus Garden (Jardim de Foco):** explore the ten sample trees. Start a one-minute focus session, navigate to another page, and return to watch it finish.
6. **Workouts (Treinos):** resume the prepared session, log a set, and browse the history.
7. **Preferences:** switch languages using the selector next to your profile. In Settings (Configurações), you can reset your own demo.

> The demo hosting service may need to wake up after inactivity. The first visit can take a little longer; the fictional data comes from a prepared dataset. Demo sessions expire after 24 hours.

## Gallery

**Actual application screenshots, captured on September 4, 2026.** All displayed records are fictional. Click the images to enlarge them. The gallery was captured through the application interface, without replacing screens with mockups. These screenshots use Portuguese; English and German are also available in the app.

### Sign-in and your day at a glance

The same entry point offers personal access and an isolated demo. The dashboard brings together key indicators and shortcuts.

![Sign-in screen with personal login, language selection, and demo access](docs/screenshots/showcase/01-login.png)

### Tasks and habits

Lists, priorities, and deadlines help organize work. The habit calendar shows frequency, check-ins, and consistency.

![Task management with lists, filters, priorities, and dates](docs/screenshots/showcase/03-tasks.png)

![Habits with a consistency calendar and quantity tracking](docs/screenshots/showcase/04-habits.png)

### Finances, cards, and statements

A consolidated view of accounts, income, and expenses, with purchase and payment details.

![Financial dashboard with a consolidated balance, charts, and transactions](docs/screenshots/showcase/05-finance.png)

<details>
<summary><strong>View statement details and the credit card purchase form</strong></summary>

![Card statement details with installments and payment recording](docs/screenshots/showcase/06-invoice.png)

![Credit card purchase form with amount, category, and installment options](docs/screenshots/showcase/07-credit-purchase.png)

</details>

### Notes & Journal

Colored folders, dated entries, and a rich text editor in one place. The demo includes Work (Trabalho), Life (Vida), Groceries (Mercado), Relationship (Relacionamento), and Travel (Viagens).

![Notes and journal with organized folders, an entry list, and a rich text editor](docs/screenshots/showcase/10-journal.png)

### Focus Garden

Focused time becomes a garden. Each completed focus session earns a tree; tree designs are drawn randomly without repeats within each cycle.

![Focus Garden with a Pomodoro timer and ten collectible tree designs](docs/screenshots/showcase/11-focus.png)

<details>
<summary><strong>View a focus session in progress</strong></summary>

![Active focus timer with the tree's growth stage and session controls](docs/screenshots/showcase/12-focus-active.png)

</details>

### Workouts

Reusable routines and set logging during each session, with a history to track progress.

![Workout area with an active session, routines, and history](docs/screenshots/showcase/08-workouts.png)

<details>
<summary><strong>View set logging during a workout</strong></summary>

![Active workout with exercise, weight, repetitions, and session controls](docs/screenshots/showcase/09-workout-session.png)

</details>

### Settings and Telegram

Language, time zone, and unit preferences, plus access to the voice integration. Telegram capture is explicitly simulated in the demo.

<details>
<summary><strong>View settings and the integration demo</strong></summary>

![Profile, language, time zone, session, and demo settings](docs/screenshots/showcase/13-settings.png)

![Telegram integration interface in simulated demo mode](docs/screenshots/showcase/14-telegram.png)

</details>

### On mobile

Bottom navigation and adapted layouts make it easy to check records, write, and follow focus sessions on small screens.

<p align="center">
  <img src="docs/screenshots/showcase/15-mobile-dashboard.png" width="270" alt="Orbit dashboard on mobile">
  <img src="docs/screenshots/showcase/16-mobile-tasks.png" width="270" alt="Task list on mobile">
  <img src="docs/screenshots/showcase/17-mobile-habits.png" width="270" alt="Habits and check-ins on mobile">
</p>
<p align="center">
  <img src="docs/screenshots/showcase/18-mobile-focus.png" width="270" alt="Pomodoro timer with a growing tree on mobile">
  <img src="docs/screenshots/showcase/19-mobile-notes.png" width="270" alt="Journal editor on mobile">
</p>

[How to update the screenshots](docs/screenshots/README.md).

## Features

| Area | What you can do |
|---|---|
| **Dashboard** | View account indicators, upcoming commitments, habits, and workouts; use quick actions and global search across indexed modules. |
| **Tasks** | Create lists and set status, deadlines, and priorities; use tags and checklists; filter, archive, and restore tasks. |
| **Habits** | Set frequency and goals; record quantities and notes; view the calendar, adherence, and streaks. |
| **Accounts and transactions** | Create accounts and categories; record income, expenses, and planned transactions; transfer funds between accounts. |
| **Cards** | Record purchases and installments; track statement closing dates, due dates, and statements; make partial payments, cancellations, and refunds. |
| **Recurring transactions** | Generate daily, weekly, monthly, or yearly occurrences while preserving each occurrence's identity and payment history. |
| **Notes & Journal** | Organize single-level folders; associate notes with dates; favorite, search, move to trash, and restore notes. |
| **Rich text editor** | Use bold, italics, headings, font sizes and colors, highlighting, lists, checklists, quotes, code, and links, with autosave. |
| **Focus Garden** | Set a focus duration of 1–180 minutes, pause, resume, and take breaks; watch four growth stages and collect ten tree designs. |
| **Workouts** | Build routines and exercises; start/resume sessions; log weight, repetitions, and RPE/RIR; review volume, history, and personal records. |
| **Optional Telegram** | Send an expense as a voice message to the bot linked to your account; clarify missing details by text; receive confirmation of the recorded expense. |
| **Preferences** | Switch between pt-BR, en-US, and de-DE; configure time zone and weight units; sign out and reset your own demo. |

### Details that improve everyday use

- **Credit card purchases count as expenses.** They are labeled as credit; paying the statement does not count the same purchase as another expense.
- **A note can be both a journal entry and part of a folder.** Organizing by subject does not prevent organizing by date.
- **Typing does not require saving every keystroke.** The editor keeps typing local and batches writes after 800 ms, with a save status indicator.
- **Focus sessions follow you across pages.** The timer uses the server deadline and recovers the session after a reload or a return to the app.
- **Random draws remember previous results.** The ten designs do not repeat within a cycle. The next cycle also avoids immediately repeating the last tree; resetting the draw preserves the garden.
- **Language changes preserve your records.** Labels, dates, and numbers follow your preference; user-written text stays unchanged, and the currency remains BRL.

## Engineering decisions

| Problem | Implemented solution | Explore |
|---|---|---|
| Demonstrate a product without exposing personal data | A separate owner per visitor, temporary tokens, owner-scoped queries, and relationships protected by composite keys. | [Identity and isolation](docs/architecture.md) |
| Open the demo without running hundreds of record-creation commands | A versioned fictional snapshot, batch copying, fresh IDs, and dates shifted to the time of entry. | [Demo dataset](docs/demo.md) |
| Avoid losing cents when splitting installments | Integer amounts in cents and an allocation that preserves the exact original total. | [Financial domain](backend/app/domain.py) |
| Avoid duplicate transactions on retries | Idempotency keys for sensitive operations, transactions, and concurrency control per owner. | [HTTP contracts](backend/API.md) |
| Avoid overwriting a more recent edit | Optimistic versioning and conflict responses; serialized writes in the notes editor. | [Notes](docs/notes.md) |
| Preserve old workouts after a routine is edited | Each session stores an independent snapshot of its exercises and sets. | [Workouts](backend/app/workouts.py) |
| Recover the Pomodoro timer without writing every second | A UTC deadline on the server, persisted state, and reconciliation when returning to the app. | [Focus](docs/focus.md) |
| Award exactly one tree per completion | The tree is the completed session itself, with a transaction and a constraint allowing only one active session per owner. | [Collection](docs/tree-collection.md) |
| Process voice messages without separate queue infrastructure | A PostgreSQL inbox/outbox and a worker embedded in the existing service. | [Telegram decision](docs/decisions/003-telegram-gemini.md) |
| Reduce frontend/backend drift | Versioned OpenAPI and TypeScript types generated from the contract. | [Schema](backend/openapi.json) |

### Identity and data protection

Personal accounts use email and password authentication, scrypt hashing, revocable sessions in HttpOnly cookies, CSRF protection, and persisted login attempt limits. Account creation and password recovery are administrator operations performed through the CLI; there is no public registration or user CRUD interface.

In combined mode, a demo token takes precedence over a personal session cookie. An expired or invalid token does not fall back to personal account access. The frontend keeps access intent separate per tab and clears cached data when switching identity.

Isolation is enforced by the API and database relationships; it does not use physically separate databases or PostgreSQL RLS. OIDC remains available as an optional integration, without requiring Auth0 for the default flow.

## Architecture and technology

Orbit is a **modular monolith**. The API centralizes business rules, PostgreSQL stores state, and the interface consumes typed HTTP contracts. In deployment, the compiled SPA and API are served from the same origin inside one Docker image.

```mermaid
flowchart TB
    Visitor[Demo visitor] --> Web
    Owner[Personal user] --> Web
    Web[React + TypeScript · desktop and mobile] -->|HTTPS / REST| API
    subgraph Docker[One Docker image]
        API[FastAPI · authentication and business rules]
        SPA[Compiled SPA files]
        Worker[Optional Telegram worker]
        API --- SPA
        API --- Worker
    end
    API --> DB[(PostgreSQL · data scoped by owner)]
    Worker --> DB
    Bot[Telegram bot] -->|Webhook| API
    Worker -->|Voice interpretation| Gemini[Optional Gemini API]
    Maintenance[CLI · migrations · backup] --> DB
```

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 7, TanStack Query, React Router, and React Hook Form. |
| **Interface** | Radix UI, Lucide, Recharts, locally hosted Geist and JetBrains Mono fonts; custom components and tokens. |
| **Rich text** | Tiptap OSS, a validated JSON document, lists/checklists, and formatting extensions. |
| **Backend** | FastAPI, Pydantic, SQLAlchemy 2, psycopg 3, and Alembic. |
| **Database** | PostgreSQL 18, typed relational columns, constraints, and JSONB for suitable nested structures. |
| **Runtime** | Python 3.14 in Docker; backend compatible with Python 3.12+. Node 24 for the frontend build stage. |
| **Testing** | pytest with real PostgreSQL, Vitest/Testing Library, and Playwright for desktop/mobile; Ruff, mypy, and TypeScript. |
| **Delivery** | Multi-stage Docker build, a non-root process, Compose with a persistent database, and a migration step. |
| **Operations** | Health checks, structured logs, request IDs, backup scripts, and restore testing. |
| **Infrastructure** | Render + Neon for the published installation; a separate Terraform lab for EC2/SSM. |

Running the product does not require Kubernetes, Redis, or a collection of microservices. AI integration is outside the required path for the core modules.

### Visual system

The visual design is based on 19 Stitch reference screens, with a dark theme, teal accents, and a consistent typographic hierarchy. The [design.json](docs/design/design.json) documents tokens, components, and recipes for new screens. Extensions such as the editor and garden are recorded in the visual decisions.

Select controls use a shared component with keyboard navigation. Notes and larger modules are loaded by route; trees are local SVGs, without runtime image generation. Garden animations respect the reduced-motion preference.

## How the demo works

```mermaid
sequenceDiagram
    actor V as Visitor
    participant A as Orbit
    participant P as PostgreSQL
    V->>A: Try the demo
    A->>P: Create a temporary owner
    A->>P: Copy the fictional dataset in batches
    Note over A,P: Fresh IDs, current dates, and 24-hour expiration
    A-->>V: Token for the visitor's own demo
    V->>A: Browse, edit, and explore
    A->>P: Operations scoped to this owner only
    V->>A: Reset the demo
    A->>P: Restore examples for this visitor only
```

The [versioned fixture](backend/app/fixtures/demo-base.json) contains **201 prepared records**, including domain and audit data. It includes tasks, habits, finances, workouts, eight fictional notes, and ten completed trees. Trees appear in a random order on each entry or reset.

Each visitor has their own records. Changes persist in the database for the session's lifetime and do not alter the base dataset for future visitors. Access is denied after expiration; expired data is cleaned up on subsequent demo entries. There is no shared public account or required cron job to restore examples.

## Run with Docker

**Prerequisite:** Docker with the Docker Compose plugin. The core does not require Node/Python installed on your machine or external service accounts.

```sh
git clone https://github.com/Hugueninfer/orbit.git
cd orbit
cp .env.example .env
docker compose up -d --build --wait
```

Open [localhost:8080](http://localhost:8080) and choose **Experimentar demonstração** (Try the demo).

Compose starts PostgreSQL, waits for the database to become healthy, applies migrations, and starts the application. Data is stored in a persistent volume. The local configuration publishes the port only on the loopback interface.

### Create your personal account

Review the `.env` values before using real data; this file must stay out of Git. With the installation running:

```sh
docker compose exec app python -m app.accounts create you@example.com
```

The CLI prompts for the password without displaying it. Then sign in with your email and password on the same entry screen. Personal accounts do not have the demo expiration.

### Everyday commands

```sh
# Follow application logs
docker compose logs -f app

# Stop services while preserving the database volume
docker compose stop

# Start again
docker compose up -d --wait
```

`docker compose down -v` removes the database volume. Do not use this command if you want to preserve your records.

## Local development

Use **Node 24**, **uv**, **Python 3.12+**, and a PostgreSQL database dedicated to development. Docker uses Python 3.14, which is also the CI target version.

### Database and API

To run the API outside Docker, prepare a PostgreSQL instance reachable from the host, such as the disposable container in the [testing section](#run-backend-tests). The database in the full Compose stack does not expose a port to the host. Once the database is available:

```sh
cd backend
uv sync --frozen
```

Configure the connection and start the API:

```sh
export APP_MODE=combined
export DATABASE_URL='postgresql+psycopg://orbit:orbit-test@localhost:55432/orbit_test'
export SESSION_COOKIE_SECURE=false
export ALLOWED_ORIGINS='http://localhost:5173'
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The URL above is strictly a local example with fictional credentials. Never point tests at a personal or production database.

### Frontend

In another terminal:

```sh
cd web
npm ci
npm run dev
```

Open [localhost:5173](http://localhost:5173). Vite proxies `/api` to `127.0.0.1:8000`. To create a user in this local database, run `uv run python -m app.accounts create you@example.com` in the `backend` directory with the same environment variables.

### Contracts and translations

- Swagger: [Published API](https://orbit-huguenin.onrender.com/api/docs) or `/api/docs` on your local installation.
- OpenAPI: `/api/v1/openapi.json`; versioned copy in `backend/openapi.json`.
- After changing the contract, run `./scripts/generate-api.sh` with development dependencies installed.
- New interface text uses `web/src/i18n.ts` and the catalogs in `web/src/locales/`.
- Preserve domain values and user content when translating. Monetary inputs use the utilities in `web/src/format.ts`.

## Configuration and deployment

### Main environment variables

| Variable | Purpose |
|---|---|
| `APP_MODE` | `combined` for personal accounts and demos in the same installation. `personal` and `demo` remain available. |
| `DATABASE_URL` | PostgreSQL connection in `postgresql+psycopg://...` format. Compose builds it from the database configuration. |
| `POSTGRES_PASSWORD` | Password for the local PostgreSQL instance used by Compose; does not replace `DATABASE_URL` on Render. |
| `SESSION_COOKIE_SECURE` | `false` only for local HTTP development; `true` for HTTPS deployment. |
| `ALLOWED_ORIGINS` | Frontend origin, including protocol and port when applicable. In deployment, use the service's actual HTTPS URL. |
| `PORT` | HTTP port, locally `8080` by default; the platform may supply it. |
| `OIDC_AUTHORITY` | Empty for local password login. Other OIDC fields are only needed when choosing an external provider. |
| `TELEGRAM_WORKER_ENABLED` | Enables the optional bot worker; defaults to `false` in the local example. |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` | Private bot configuration, backend only. |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional configuration for interpreting voice messages; see the Telegram guide. |

See [.env.example](.env.example) for the reference configuration. Secrets and private environment files must not be committed.

### Online deployment

The installation shown in this README is available at [orbit-huguenin.onrender.com](https://orbit-huguenin.onrender.com), with Render building the Dockerfile and Neon providing persistence.

The adopted workflow is:

1. Make the code available on GitHub.
2. Prepare a PostgreSQL database and configure the private connection.
3. Build the image, apply migrations, and create the personal account through the CLI.
4. Create a Docker Web Service on Render pointing to the repository.
5. Set `APP_MODE=combined`, `DATABASE_URL`, `SESSION_COOKIE_SECURE=true`, and `ALLOWED_ORIGINS`.
6. Deploy and verify `/api/v1/health`, login, and the demo.

**Operational walkthrough:** [Deploy directly from GitHub to Render](infra/render/DEPLOY-PT-BR.md) (in Portuguese).

Manual deployment does not require a release, GHCR, or GitHub Actions approval. CI is an independent check. Updates involving database changes follow **backup → migration → deploy → validation**; automatic deployment remains disabled in the adopted workflow.

The core can run without paid services. Availability, suspension, and external hosting quotas depend on provider plans; continuously available free hosting is not guaranteed.

### Telegram voice messages — optional

After configuring the bot, link it from your personal account and send a voice message, for example: “Gastei 35 reais no almoço, pela conta Nubank” (“I spent 35 reais on lunch, from my Nubank account”). The bot interprets the details with Gemini and asks for missing information before recording the expense.

When the payment method is omitted, the default is **credit**. A single active card can be selected automatically; multiple cards require clarification. The demo is simulated and does not send real voice messages to the provider.

Credentials, webhooks, processing limits, and failure handling are covered in [docs/telegram.md](docs/telegram.md). The core works without this integration. Gemini usage is subject to the provider's quotas and terms; review those terms before sending personal content.

### AWS as a lab

The [infra/aws](infra/aws/README.md) directory contains a Terraform lab with EC2 and SSM access. It lets you study how to operate the same container in another environment. **It is not the infrastructure behind the published demo and does not run automatically.** AWS resources may incur charges; the lab is separate from the required path to use Orbit.

## Testing and quality

Validation combines pure domain rules, integration with real PostgreSQL, components, and browser journeys. Cases cover account isolation, concurrency, idempotency, dates, amounts, persistence, and state recovery.

| Layer | Example scenarios |
|---|---|
| **Backend** | Access to another owner's IDs, session validity, exact installment totals, partial payments, recurring transactions, habits by date, and workout snapshots. |
| **Notes** | Rich document validation, folders, autosave, conflicts, draft preservation, and trash. |
| **Focus** | Exactly-once completion, pause/resume, recovery, cancellation, the ten-tree cycle, and isolation of random draws. |
| **Frontend** | Monetary formatting by language, forms, select controls, login, settings, and the focus clock. |
| **Browser** | Desktop and mobile use, persistence after reload, navigation, modals, and failure states. |
| **Delivery** | Docker build, migrations, generated types, and dependency audits. |

### Run backend tests

Create a **disposable** database, separate from any installation containing personal data:

```sh
docker run -d --name orbit-tests \
  -e POSTGRES_USER=orbit \
  -e POSTGRES_PASSWORD=orbit-test \
  -e POSTGRES_DB=orbit_test \
  -p 127.0.0.1:55432:5432 \
  postgres:18-bookworm

# Wait for the database to accept connections; repeat until successful.
docker exec orbit-tests pg_isready -U orbit -d orbit_test
```

Then:

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

Do not run the suite while using the same instance as an interactive development demo. Tests create and remove fictional owners.

### Run frontend tests

```sh
cd web
npm ci
npm run typecheck
npm test
npm run build
```

### Browser journeys

With a **local, disposable** installation of the application running:

```sh
cd web
npx playwright install chromium
ORBIT_BASE_URL=http://127.0.0.1:8080 npx playwright test core.spec.ts notes.spec.ts focus.spec.ts
```

The full suite also includes personal login. It requires the fictional account prepared as described in the [CI workflow](.github/workflows/ci.yml); do not use personal credentials for these tests.

The [verification workflow](.github/workflows/ci.yml) combines tests, static analysis, audits, and contract checks. See the [validation evidence](docs/validation.md) and module guides as well; historical test counts do not replace running checks on the commit you are evaluating.

## Operations and backups

| Resource | Purpose |
|---|---|
| `/health/live` | Check whether the application process is alive in the Docker runtime. |
| `/api/v1/health` | Check API availability and database connectivity. |
| Structured logs and request IDs | Track requests and correlate failures. |
| Alembic | Version and apply schema changes. |
| Backup scripts | Export the database and validate a separate restore. |

For the standard local Compose installation, from the repository root:

```sh
mkdir -p backups
bash scripts/backup.sh orbit .env backups/orbit-local.dump
bash scripts/restore-check.sh orbit .env backups/orbit-local.dump
```

Choose a new filename for each backup. The restore check uses a separate temporary database and removes it when finished; it does not overwrite the active database. Keep backups out of Git.

On Neon, use a **direct connection** for `pg_dump` and Alembic; reserve the pooled connection for the application. Remote procedures are documented in the [Render guide](infra/render/DEPLOY-PT-BR.md) and [runbook](docs/runbook.md).

## Repository structure

```text
orbit/
├── backend/
│   ├── app/                 # API, identity, module rules, and services
│   │   └── fixtures/        # Versioned fictional demo dataset
│   ├── migrations/          # Alembic history
│   ├── tests/               # Domain and PostgreSQL integration
│   ├── API.md               # HTTP contracts and rules
│   └── openapi.json         # Generated, versioned schema
├── web/
│   ├── src/
│   │   ├── components/      # Shared UI, editor, and garden
│   │   ├── pages/           # Module screens
│   │   ├── locales/         # Translation catalogs
│   │   └── generated/       # Types derived from OpenAPI
│   ├── e2e/                 # Playwright journeys
│   └── scripts/             # README gallery capture
├── docs/
│   ├── design/              # Tokens, Stitch references, and visual recipes
│   ├── decisions/           # Product and architecture decisions
│   └── screenshots/         # Actual desktop and mobile screenshots
├── infra/
│   ├── render/              # Docker deployment directly from the repository
│   ├── aws/                 # Terraform EC2/SSM lab
│   └── keycloak/            # Optional local OIDC provider
├── scripts/                 # Migrations, accounts, backups, contracts, and audits
├── Dockerfile               # Multi-stage build and non-root runtime
├── compose.yaml             # Application, migrations, and local PostgreSQL
├── render.yaml              # Hosting blueprint
└── .env.example             # Configuration without real credentials
```

## Documentation and current limitations

The linked project guides are primarily in Portuguese.

| Document | Contents |
|---|---|
| [Functional specification](docs/specification.md) | Product functionality and consolidated scope. |
| [Architecture](docs/architecture.md) | Module boundaries, isolation, and invariants. |
| [API contracts](backend/API.md) | Endpoints, commands, and HTTP rules. |
| [Product decisions](docs/decisions/001-product-rulings.md) | Business interpretations and explicit choices. |
| [Visual system](docs/design/LEIA-ME.md) | Screen references, tokens, and design application. |
| [Demo](docs/demo.md) | Snapshot, batch copying, expiration, and example updates. |
| [Notes & Journal](docs/notes.md) | Rich text editor, autosave, limits, and draft protection. |
| [Focus Garden](docs/focus.md) | Timer, completion, and session recovery. |
| [Tree collection](docs/tree-collection.md) | Ten designs, draws without repeats, and cycle resets. |
| [Telegram](docs/telegram.md) | Linking, voice messages, configuration, and operations. |
| [Render deployment](infra/render/DEPLOY-PT-BR.md) | Deployment, variables, migrations, and maintenance. |
| [Runbook](docs/runbook.md) | Operations, access, and recovery. |

The current scope is a personal web application. It does not include bank synchronization, team collaboration, note attachments, a native mobile app, or full offline synchronization. The timer tracks elapsed time; it does not monitor attention or block other applications. Monetary amounts are displayed in BRL, even when switching languages.

The project preserves the original specification and visual references, with documented additions for real-world use: local login, isolated demos, rich notes, and the focus garden.

---

<div align="center">

**Orbit · Your space. Your pace. Your orbit.**

[Try the product](https://orbit-huguenin.onrender.com/demo) · [GitHub profile](https://github.com/Hugueninfer) · [Back to top](#orbit)

</div>
