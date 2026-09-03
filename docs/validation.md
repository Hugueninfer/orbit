# Validation evidence

Recorded during development on 2026-09-03. This is actual local evidence, not a claim of a public production deployment. Earlier milestones below are historical snapshots; later sections supersede their architecture and account status.

| Check | Evidence / current outcome |
|---|---|
| Backend domain/integration | 53 passed in the actual Python3.14 runtime container against PostgreSQL18, 36.91s, after independent review fixes (7a14c72) |
| Python lint/types | Ruff clean, mypy no issues in 22 source modules |
| Database migrations | Fresh upgrade / downgrade / upgrade and Alembic drift check passed in isolated test database |
| Frontend | TypeScript production build passed; 6 focused Vitest tests passed |
| End-to-end | 8 passed against the Docker app, 47.9s, across desktop/mobile. Includes reload persistence, draft preservation/RPE, card edit/partial payment, initial recurrence generation, partial habit history and explicit failure states |
| Docker | Node24 multi-stage build, Python3.14 runtime and PostgreSQL18; app/db healthy, separate migration service exits0 |
| Personal identity | Actual browser Authorization Code + S256 PKCE through local Keycloak26.3.3, return to authenticated personal dashboard; separate database and demo authentication rejected (404); personal task survives reload; iframe silent renewal without refresh token succeeded, extending expiry by approximately 300s |
| Backup | Personal-project custom-format pg_dump restored to new isolated DB; revision4b90d2a724f1 and one personal test owner verified; temporary restore DB removed. Explicit project/env required, output mode600 and overwrite refusal verified |
| Terraform | fmt, init (AWS6.62.0) and validate passed using Terraform1.13.1; never applied |
| Resource observation | After core E2E, demo app ~94MiB RAM, DB ~68MiB; image ~435MB uncompressed. One local idle sample, not load-test sizing |
| External hosting | No public URL deployed by this work; user has since created provider accounts and Neon projects |

Meaningful failures fixed during integration: API calendar queries must stop at today's local date instead of month end; missing Python module import path in production wrapper; generated response optional schedule fields normalized by the frontend. These were reproduced by real browser/container checks rather than hidden with mock responses.

Known tool/dependency noise: test transport Starlette/httpx/anyio deprecations and Playwright terminal color environment warnings. No assertion failures are accepted as a release pass. Independent backend, frontend and operations re-reviews are approved with no outstanding Critical/Important findings in their reviewed scope. Reports are in docs/reviews; intermediate findings remain as an audit trail.

The optional Telegram adapter is not a verified live integration; conversations, receipt actions and full provider operation remain incomplete as described in backend documentation. No paid AI or AWS execution was used.

Production Python dependencies were audited from the frozen runtime lock export with pip-audit: no known vulnerabilities. Frontend production npm audit also passed. The obsolete pip bundled only in the native bootstrap environment was excluded by auditing the actual deployed dependency set, not by suppressing findings.


The final mobile regression exposed a real 405px content width in a 390px viewport. Constraining the grid's minimum column width restored correct touch coordinates; assertions now compare scroll width against `documentElement.clientWidth` rather than the browser's overflow-inflated `innerWidth`. Final UI checks passed without forced clicks. Chart rendering is deterministic and financial fetch errors do not masquerade as zeros.

Final mobile header smoke (after visual polish):390px document/content width, quick-action button fully inside header; drawer opens and closes by Escape. Final runtime backend source hashes match all22 source modules. Demo and personal containers remain isolated and healthy. Development servers and disposable test PostgreSQL were stopped after verification.

## Login local sem Auth0 — 2026-09-03

A suíte existente passou com 62 testes antes do último ajuste de revisão; após esse ajuste os 10 testes específicos de login passaram (incluindo o novo caso de espaços na senha). Ruff e mypy passaram em 23 módulos. Os 12 testes Playwright de demo e pessoal passaram em desktop/mobile contra a imagem Docker final `8edc6d008516`. A CLI foi exercitada em terminal com entrada de senha oculta e criou somente `browser@example.com` em banco de teste separado. Alembic upgrade foi aplicado em banco novo e `alembic check` não detectou drift. A revisão independente encerrou seus dois achados; veja `reviews/local-auth.md`.

A configuração de CI agora seleciona Python 3.14 estável pelo setup-python. A tabela de downloads do uv 0.8.15 oferece 3.14.0rc2, enquanto o Docker usa 3.14.7; a execução remota [33811651796](https://github.com/Hugueninfer/orbit/actions/runs/33811651796) concluiu com sucesso para o commit `68aeafa`, incluindo os testes e auditorias.


## Instalação unificada — 2026-09-03

Imagem local final `3cb2ace4383f` construída pelo Dockerfile, com Python 3.14 e SPA compilada. **74 testes backend passaram dentro dessa imagem contra PostgreSQL real** (121,95s); Ruff e mypy passaram sobre o mesmo código (23 módulos); `alembic check` não detectou alterações de schema. **13 testes Vitest** e typecheck/build passaram. **14 jornadas Playwright passaram** (1,7min), em desktop/mobile, contra uma única instalação `APP_MODE=combined` e um único banco contendo conta pessoal fictícia e demos.

As novas verificações cobrem cookie pessoal junto a bearer demo, bearer inválido/expirado sem fallback, leitura entre proprietários, reset/limpeza/cotas sem afetar dados pessoais, logout independente e bloqueio de Telegram real para demos. O navegador exercitou `/demo` em outra aba com cookie pessoal existente, reset, logout, expiração local e token rejeitado pelo servidor; a aba pessoal continuou com o mesmo proprietário. Os cenários anteriores de tarefas, hábitos, finanças e treinos também passaram nessa instalação.

A [revisão independente](reviews/unified-installation.md) não encontrou problemas de severidade alta/média. A entrada foi inspecionada visualmente em [1440px](screenshots/login-unified-desktop.png) e [390px](screenshots/login-unified-mobile.png), sem overflow horizontal. Não houve alteração de schema nesta entrega, nem fusão/exclusão de bancos existentes. Nenhuma conta pessoal real ou senha padrão foi criada. Publicação online continua dependente das etapas do [guia Render](../infra/render/DEPLOY-PT-BR.md).
