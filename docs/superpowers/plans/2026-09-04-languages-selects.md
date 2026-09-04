# Languages and Selects Implementation Plan

> For agentic workers: use subagent-driven-development. Work in the shared isolated worktree, only edit owned files. Do not spawn further agents. No secrets or personal data. Root owns commits and deploy.

**Goal:** Complete PT/EN/DE interface and uniform accessible selectors.
**Architecture:** Small typed locale store with useSyncExternalStore, explicit translation calls, dictionaries grouped by module, Intl formatting. Shared Select adapter backed by Radix. Existing profile locale persists to PostgreSQL.
**Tech Stack:** React19, TypeScript, FastAPI, PostgreSQL, Docker.
**Spec:** docs/superpowers/specs/2026-09-04-languages-selects.md

## Global Constraints
- Preserve Stitch components/tokens and all existing functional rules and data.
- Never translate user data or business enum values; translate display text only.
- Dictionary entries use Portuguese source as key; values `{en: string, de: string}`; interpolation `{{name}}`.
- Import `useT`, `t`, `getLocale`, `setLocale`, `useLocale` from src/i18n.ts. In React functions use `const t=useT()` for live updates. Global t only for non-render handlers/helpers. `type Locale='pt-BR'|'en-US'|'de-DE'`. `useT(): (key:string, values?:Record<string,string|number>)=>string`.
- Each translator owns a dictionary file exporting named `operationsMessages` or `routinesMessages`, typed `Record<string,{en:string;de:string}>`. Root composes them with coreMessages. Include static map labels, dynamic templates and aria labels. Existing date utilities will use current locale; replace direct hardcoded pt-BR Intl locale with getLocale().
- Select contract: `import { Select } from '../components/Select'`; accepts current React select attributes and children `<option value=...>label</option>`; `onChange` supports `event.target.value`. Root converts remaining selects globally after agents finish. Translators may convert in owned files once component exists, but never edit shared Select or styles.

### Task 1: shared locale/profile integration (root)
Files: src/i18n.ts, src/locales/core.ts, App.tsx, Login.tsx, Settings.tsx, components/ui.tsx, format.ts, api.ts, backend/app/schemas.py, generated API, tests.
- [x] Add locale store tests: setLocale('de-DE') updates document.lang and storage, useT subscribers rerender; unsupported saved locale falls back pt-BR; placeholders preserve user text.
- [x] Implement typed store and dictionaries, restore profile once per owner, persist Settings selection, login picker. Localize all owned UI without changing route/schema field names.
- [x] Adapt money parsing for English dot decimal, Portuguese/German comma decimal; tests retain centavos and reject mixed/ambiguous formats. Display Intl formatting uses active locale.
- [x] Add de-DE profile schema and regression /me save/restore test; regenerate API. Run focused tests.

### Task 2: operation screens (translation agent)
Own only pages/Finance.tsx, FinanceEditor.tsx, Dashboard.tsx, Tasks.tsx and locales/operations.ts.
- [x] Read corresponding design catalog/HTML and existing screens. Translate every app-owned rendered string including constants, placeholders, errors/toasts, aria labels and interpolation. English and German natural concise text; never translate stored names/descriptions or enum values.
- [x] Example: `t('Excluir {{name}}', {name: record.name})` and dictionary key with both language values. Functions using render translations subscribe with useT. Static map values translate at render time, not module initialization.
- [x] Convert selects using shared adapter contract when ready. Confirm dates/number display locale; preserve ISO values sent to API.
- [x] Run typecheck and report missing cross-task dependencies separately. Write report in work/reports/operations.md with files, checks and any remaining issues. No commits.

### Task 3: routine screens (translation agent)
Own only pages/Habits.tsx, Workouts.tsx, WorkoutSession.tsx and locales/routines.ts.
- [x] Same full localization and Select contracts as Task2; preserve workout load units, timers, habit civil dates and user data.
- [x] Translate dynamic counts/weekdays, muscle-group enums for display, empty states, toasts, accessible labels, completion dialogs; preserve user exercise/routine names.
- [x] Test/typecheck owned modules and record work/reports/routines.md. No commits.

### Task 4: consistent select component (UI agent)
Own only components/Select.tsx, components/Select.test.tsx, styles.css and package.json/package-lock.json. Do not edit ui.tsx or pages.
- [x] Read design tokens/reference settings/finance HTML; inspect current select usage and Field wrapping label.
- [x] Tests first: controlled value including empty option, labels, disabled, keyboard selection and Escape; required form field support; selection in drawer leaves dialog usable.
- [x] Implement shared React select-compatible adapter using Radix Select; install dependency from npm. Preserve numeric/string value handling and callbacks; no fake UI or native popup. Dropdown above drawers, viewport constrained, touch friendly. Use .orbit-select-* scoped styles.
- [x] Run focused tests; document semantics, validation and style verification in work/reports/select.md. No commits.

### Task 5: integrate, review and deploy (root + independent reviewer)
- [x] Confirm zero remaining native select tags in pages. Coverage audit all UI-owned literals and dictionary keys in EN/DE. Run frontend tests/typecheck/build and backend affected tests, Docker build.
- [x] Browser QA PT/EN/DE navigation, settings persistence, forms and select popup (desktop/mobile); no production financial writes. Independent whole-change review; fix real regressions and re-review.
- [x] Commit and fast-forward main, push and deploy Docker on Render. Verify active assets and health, update docs/archive and communicate result.

Deployed code: 6cfddc7; Render dep-dadckupt0dsc73d206t0 Live. Production bundle index-BhkfJfZS.js matches local Docker image, health/database OK. Three language options verified in the online login selector.
