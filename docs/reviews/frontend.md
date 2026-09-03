# Task 2 independent frontend review

**Current verdict after scoped re-review: approved at source-review level. All eight Important findings and the actionable Minor timer defect are addressed; no confirmed remaining blocker in the reviewed fixes. Final integrated E2E and live-provider renewal verification remain owned by root. The initial findings below are retained as review history.**

Reviewed 2026-09-03, current working tree (with concurrent root fixes). Read-only source review of `web/src/**`, the implementation plan, specification, design scope/recipes and deviation record, and relevant API/schema/library contracts. No browser interaction, broad test rerun, implementation edits or commits. Known transitional recurrence typing and backend purchase/recurrence/habit/quota findings were excluded.

## Critical

None found within this review's scope.

## Important

### I1 — Habit calendar browsing can overwrite an existing check-in

- Original references: `web/src/pages/Habits.tsx:60-76`, `:84-105`, `:112-115`.
- Reproduce: record today's quantity-1 check-in with a note; press the matrix's previous-month arrow; the selected check-in date remains today while the only statistics query now covers last month. Today's completed check disappears. Press its unchecked button: `entry` is undefined, so PUT sends `{quantity:1,note:""}` to today's existing record and erases its note. Loading/error periods present the same unsafe missing-entry interpretation.
- Fix: keep selected date and queried period consistent, and disable mutation while the selected day's state is unavailable. Unknown state must not mean no existing record.
- Root was notified and has already changed month navigation to select a date in that month. Verification of the full loading/error guard is left to the root's final checks.

### I2 — Editing a partial habit entry clears its saved values

- Reference: `web/src/pages/Habits.tsx:84-99`.
- Reproduce: save quantity 500 against a daily target of 2000 with a note. Reopen the check-in. Because `entry.completed` is false, the editor initializes quantity to 2000 and note to an empty string. Saving silently replaces the existing partial measurement and deletes its note.
- Fix: initialize from any existing check-in, including incomplete entries; use the target default only when no record exists.

### I3 — Finance query failures masquerade as zero balances and no commitments

- Original references: `web/src/pages/Finance.tsx:142-145`, `:186-212`, `:240-264`.
- Reproduce: allow `/accounts` to load but fail `/transactions`, `/finance/report`, or `/invoices`. Only account errors were checked. Failed transactions appeared empty, failed reports displayed R$0,00, and failed invoices made cards say “Sem pendências.” These are materially incorrect financial states, without a retry affordance.
- Fix: render appropriate loading/error states for required financial queries; never convert unavailable data to valid financial totals.
- Root was notified. A current-source reread confirms the central required-query loading/error guard has been added. Runtime verification remains with root.

### I4 — Invoice payments ignore the saved default payment account

- Original references: `web/src/pages/Finance.tsx:687-697`, `:774`; saved preference is created at `web/src/pages/FinanceEditor.tsx:441`; requirement `docs/specification.md:54`.
- Reproduce: create accounts A and B; create a card with B as its payment account; open its invoice. The payment form defaults to A solely because it is `accounts[0]`. Confirming posts the payment against A despite the saved card preference.
- Fix: pass the selected card's `payment_account_id` into the drawer, falling back only when absent/unavailable.
- Root was notified. A current-source reread confirms the preferred account is passed and used. Runtime verification remains with root.

### I5 — Personal OIDC silent renewal is broken without a refresh token

- References: `web/src/App.tsx:66-74`, `web/src/api.ts:64-78`, `infra/serve.py:35-40`.
- Contract evidence: installed `oidc-client-ts/dist/esm/oidc-client-ts.js:2473` defaults `silent_redirect_uri` to `redirect_uri`; `:3106-3147` uses an iframe when no refresh token is available; `:3175-3202` dispatches `si:s` to `signinSilentCallback`, which notifies the parent.
- Reproduce with a compatible provider that returns an access token but no refresh token (the app requests only `openid profile email`): initial interactive login succeeds. Automatic renewal navigates a hidden iframe to `/auth/callback`, but that response is blocked by `X-Frame-Options: DENY` / `frame-ancestors 'none'`. Even if framing were allowed, App always runs `signinRedirectCallback`, consumes the response inside the iframe and never completes the parent's silent-renew handshake. The active app ultimately returns to login when its access token expires, losing unsaved work.
- Fix: implement and allow a narrowly scoped same-origin silent callback with the correct callback dispatcher, or explicitly require/configure refresh-token renewal and verify that contract. Preserve the general anti-framing policy.

### I6 — Changing workout exercises silently discards entered series values

- References: `web/src/pages/WorkoutSession.tsx:133-144`, `:235-255`, `:376-389`.
- Reproduce: on exercise 1, type a new load/repetition count without pressing the check/save button, press Próximo, then Anterior. Only the current exercise's SetRow components are rendered, so navigation unmounts their local draft state and reloads server values. The changed entries are lost without warning. Normal exercise navigation is also available while a save is pending.
- Fix: keep drafts keyed by session/set above the conditional exercise view, or save an uncompleted draft / explicitly resolve unsaved changes before navigation. Do not equate a draft save with completion of the set.

### I7 — Series edits erase existing RPE/RIR, and cannot enter these M7 fields

- Reference: `web/src/pages/WorkoutSession.tsx:390-403`; API `backend/API.md:45-46`; `backend/app/schemas.py:202-210`; `backend/app/workouts.py:152-155`; requirement `docs/specification.md:67`.
- Reproduce: a session set has `rpe:8` / `rir:2` recorded through the supported API. Change only its load in the frontend and save. The PUT omits RPE/RIR, whose schema defaults are null; the backend updates the full payload and deletes both measurements. There are also no inputs for either field in the frontend's series editor.
- Fix: preserve/send existing values on every PUT and expose the optional effort measurements in the series editor. This is a frontend contract issue, not the excluded backend findings.

### I8 — Account creation rejects valid zero and negative opening balances

- References: `web/src/pages/FinanceEditor.tsx:429`, `web/src/format.ts:1-13`; allowed contract `backend/app/schemas.py:96`.
- Reproduce: enter `0` or `-100,00` as an opening balance. Both are rejected by the transaction-only positive-money parser; only leaving the field blank permits zero, and an overdraft/debt opening balance cannot be represented at all. This prevents accurate initial balances for ordinary personal accounts.
- Fix: use signed/zero-capable minor-unit parsing for opening balances while retaining positive-only validation for transaction amounts.

## Minor

### M1 — Rest timer extension stops working after a sufficiently old deadline

- References: `web/src/pages/WorkoutSession.tsx:56-61`, `:184-193`.
- When the stored `rest_until` is more than 30 seconds in the past, pressing +30s still shows 00:00: the extension is added to the negative elapsed deadline before clamping. After several minutes the user must click repeatedly before any time appears. The button should extend from `max(now, effectiveDeadline)` so one click adds the advertised duration.
- Local rest adjustments also vanish on remount/reload; if those controls are intended as persisted timer changes, they require a stored deadline rather than component-only offsets.

## Focused verification evidence and limits

- Ran a read-only Node utility against actual `format.ts` transpiled in memory: `parseMoney('0')` -> “O valor deve ser maior que zero”; `parseMoney('-100,00')` -> invalid-format error; positive `100,00` -> 10000.
- Ran installed OIDC library's actual `UserManager.prototype.signinCallback` against a mocked `si:s` response: it dispatches only `signinSilentCallback`, confirming the required distinction from App's current redirect-only handler.
- Other reproduction steps above are deterministic source-path analyses; no claim that these journeys were browser-executed. Root owns integrated E2E after the backend fixes. The three already-addressed issues remain documented as findings observed before the concurrent fix, not as confirmed remaining defects.


## Scoped corrective re-review — 2026-09-03

Re-read the actual current implementations after root's fixes. No browser, broad test rerun, or implementation edit was performed.

| Finding | Current source verdict | Evidence |
|---|---|---|
| I1 | Addressed | Month navigation updates selected date; check-in controls are disabled while their statistics fetch is pending or data is absent. |
| I2 | Addressed | Any existing entry with quantity > 0 initializes both quantity and saved note, including partial entries. |
| I3 | Addressed | Required finance queries have explicit loading/error handling. Initial missing-data failure blocks financial totals; background failure with cached data shows an outdated-data error banner while keeping editors mounted. |
| I4 | Addressed | InvoiceDrawer receives card.payment_account_id and selects the matching account before fallback. |
| I5 | Addressed in source | Dedicated silent_redirect_uri and /auth/silent-callback call signinSilentCallback exactly once; realm includes local callback URLs; parent frame-src includes self; only the callback receives SAMEORIGIN / frame-ancestors self. Expiry clears token and query cache. |
| I6 | Addressed | Drafts are held above the conditional exercise view, restored by set ID, and cleared only after a successful save or explicit per-set discard. Previous/next are disabled during pending saves. Finish/copy are disabled for unsaved drafts, and discard restores server values without completing the set. |
| I7 | Addressed | RPE and RIR have optional inputs, survive draft navigation, and are explicitly included in every series PUT. |
| I8 | Addressed | Account opening_balance uses signed/zero-capable parseBalance; ordinary expenses retain positive-only parseMoney. The focused unit case covers zero, negative opening balance, and rejection of negative expenses. |
| M1 | Actionable defect addressed | Timer controls now derive a new deadline from clamped remaining time, so +30 works after expiry. The persisted server-derived rest deadline remains the reload baseline; local ad-hoc overrides remain transient. |

Three follow-on issues found during re-review were fixed and reread: allowing the own HTTP callback in parent frame-src, permitting explicit draft discard without recording an unperformed set, and avoiding editor unmount on cached finance background-query errors.

Source inspection of the new E2E scenarios confirms assertions for exercise navigation drafts, optional RPE persistence, explicit draft discard, partial habit notes/month navigation, and financial fetch errors. The reviewer flagged a vacuous assertion using the nonexistent label SALDO DISPONÍVEL; the root should use the actual SALDO CONSOLIDADO label. Test execution/results are not claimed by this report.

The OIDC code now follows the installed library's silent-callback handshake. This review does not establish that a particular external provider permits iframe renewal or supplies a refresh token; provider-specific runtime verification remains necessary before claiming that integration works.
