# Final backend review verdict — 7a14c72

**Approved for the reviewed backend and shared API contract scope. No unresolved Critical or Important findings remain.** The six original findings and the subsequent R1 recurrence continuation are resolved. Earlier verdicts below are historical records and are superseded by this section.

The final correction separates two policies in `backend/app/recurrences.py`: reconciliation uses the current/past due-date boundary to preserve history and cancel superseded future rows; generation uses occupied immutable scheduled-date cycles for all non-superseded planned, posted, and explicitly user-cancelled occurrences. Generation does not inspect editable transaction dates. It updates the occupancy set as new occurrences are created. This closes both the original retained-current-cycle duplication and the later manual-rescheduling variant without blocking independent future cycles.

**Independent final focused verification:**

`APP_MODE=demo DATABASE_URL=postgresql+psycopg://orbit:orbit-test@localhost:55432/orbit_test backend/.venv/bin/pytest backend/tests/test_review_regressions.py -q -k 'moving_retained_bill_after_rule_edit or schedule_edit_preserves_retained_planned_current_cycle'`

Result: **4 passed, 21 deselected, 2 existing dependency deprecation warnings in 2.75s**. These cover edits on the original due date and after it is overdue; retaining persisted original identity/fields; moving the retained bill within September and into November; two repeated zero-creation generations; and normal replacement of independent October/November cycles. No broad suite or migration rerun was performed by this reviewer. Parent/implementer additionally report 53 full PostgreSQL tests passing and clean Ruff/mypy.

The changed shared contracts remain consistent with the reviewed implementations: recurrence scheduling/end dates and atomic initial horizon; idempotent recurrence creation and purchase edits; immutable transaction occurrence identity; effective historical habit targets; and bounded demo persistence. No schema/OpenAPI change was required for the last recurrence correction. No code/git mutations or descendant agents were used; this report is the only review artifact modified.

This approval is limited to the backend implementation and contracts reviewed through `7a14c72`. Root-owned final Python 3.14/container/browser/mobile checks remain separate release evidence. Optional M10 is still an explicitly partial adapter, not live-provider validation. The known migration refusal on conflicting legacy recurrence identity is documented and deliberately avoids deleting financial history.

---

# Latest scoped rereview — d57b122

**Current verdict: changes required; R1 remains open under an allowed rescheduling sequence.** The exact today/overdue reproduction is fixed, and both new regressions cover that boundary. The protection is still computed from the mutable transaction date (`backend/app/recurrences.py:23–29`), so it can disappear after a normal due-date edit. This continues the original immutable occurrence/idempotency requirement rather than expanding scope.

**Reproduction independently confirmed against dedicated PostgreSQL via authenticated HTTP:** on September 3 create monthly day3 bill (1,200, end October31), PATCH rule day_of_month=5 (September3 is correctly retained), PATCH retained September3 transaction date to September10, then POST `/recurrences/generate` through October31. Result `created: 1`, with `[('2026-09-03', '2026-09-10', 'planned', 1200), ('2026-09-05', '2026-09-05', 'planned', 1200)]` (scheduled_date, actual date, status, amount) for September. The allowed manual date edit releases protection and doubles the logical cycle again.

Keep occupancy independent of mutable due date during extension. For example, extension can treat every non-superseded planned occurrence as occupying its immutable scheduled-date bucket, while reconciliation retains its separate current/past rule to decide which planned rows to cancel and replace before extension. Verify this sequence and unchanged subsequent generation; preserve legitimate future cycle replacement. The single dedicated test user was removed in finally; no full suites, migrations, or source edits were performed by this reviewer.

All previously approved fix areas and shared-contract assessment remain unchanged. Backend approval is withheld only for this demonstrated R1 continuation. Parent/worker report 51 passing tests and clean Ruff/mypy; those do not currently exercise rescheduling after rule reconciliation.

---

# Task 1 independent backend rereview — e7929e2

**Current verdict: changes required for one remaining Important recurrence defect.** No Critical finding established. The original six findings below are retained as historical context; all six have corresponding implementation changes in `e7929e2`, but recurrence reconciliation still has the concrete boundary defect described here.

## Important R1 — Schedule edits duplicate a retained current/past planned cycle

**References:** `backend/app/recurrences.py:23–29` (`protected_cycles`), `backend/app/recurrences.py:124–128` (reconciliation skips current/past actual dates), `backend/app/recurrences.py:73–76` (extension admits an unprotected replacement).

With the injected local date September 3, create a monthly 1,200 bill starting September 3, day_of_month=3, end_date October 31. Its initial horizon correctly creates September 3 and October 3 planned obligations. PATCH day_of_month to 5. The reconciler deliberately retains September 3 because its date is today, but `protected_cycles` protects only posted and explicitly user-cancelled occurrences. Extension consequently creates a second September bill on September 5. Both remain planned and count in projected balance. The same issue applies to overdue planned rows retained by the future-only policy.

**Independent focused HTTP/PostgreSQL evidence at e7929e2:** `[('2026-09-03', 'planned', 1200), ('2026-09-05', 'planned', 1200), ('2026-10-05', 'planned', 1200), ('2026-10-03', 'cancelled', 1200)]`. One test-only empty tenant was inserted in dedicated `orbit_test` on port 55432, normal authenticated API requests exercised creation/PATCH/list, and that tenant was removed in `finally`. No broad suite was rerun.

Protect the frequency buckets of every current/past planned occurrence that reconciliation intentionally preserves, using the immutable scheduled date for bucket identity. Ensure the exclusion persists on later horizon extension, rather than only during the PATCH. Add regressions for today and overdue planned obligations plus repeat generation; future-only replacements should still work.

## Fix assessment and shared contract assessment

- **Original 1:** immutable scheduled_date, composite SQL uniqueness, consistency CHECK and UPDATE trigger now prevent rescheduled transaction dates from freeing occurrence identity. The original exact duplicate-regeneration case is covered by new targeted regression tests.
- **Original 2:** profile currency guard now covers cards and other currency-bearing records, including a card-only profile.
- **Original 3:** full daily/weekly/monthly/yearly frequency, interval, inclusive end_date, initial atomic horizon, rule edit reconciliation, pause/resume and posted-cycle protection are present. R1 above prevents closing this finding completely.
- **Original 4:** habit schedule versions now retain effective targets; stats use each date's target and migration backfills legacy targets. The contract explicitly distinguishes configured next target from calendar-day target.
- **Original 5:** the persistent monotonic before_flush quota includes profile/domain/audit/idempotency/inbox/outbox writes, atomically reserves budget, and resets only with scoped demo reset. A separate bounded unlinked Telegram queue closes the unowned inbox path. Function-scoped database dependencies finish commit/rollback before sending responses, including quota failures.
- **Original 6:** versioned/idempotent purchase PATCH preserves aggregate identity, validates old/new cycles as open and unpaid, regenerates installments atomically, and retains before/after audit. Failure and closed/paid guards have focused coverage.
- OpenAPI DTO changes and API.md agree on recurrence scheduling fields, immutable transaction occurrence fields, POST recurrence idempotency, and purchase PATCH. Controller confirms UI uses the new recurrence fields/idempotency and calendar-day targets; frontend runtime validation remains controller-owned.
- The migration intentionally fails on legacy conflicting logical occurrence identities instead of deleting financial records. Its downgrade limitation is documented. Parent/implementer report 49 passing tests, clean Ruff/mypy, and migration backfill/down/up/no-drift evidence; these are reported evidence, not suites rerun by this reviewer.
- No other actionable Critical/Important issue was identified in the scoped fix review. Backend release approval remains withheld only for R1 in this review. Optional M10 retains its explicit partial status; this does not validate real Telegram/provider calls, deployment, or browser/mobile behavior.

---

# Historical first review — 002cc18

# Task 1 independent backend review

Verdict: **changes required before claiming complete M1–M9 delivery**. No Critical finding established; six Important findings below. This is a read-only review of backend commit `002cc18` relative to `7312f8d`, using the focused backend diff, Task 1 brief/report, consolidated specification, decision 001, and the controller-provided original v1.1 extraction (§10 and §11.5–11.7). No frontend assessment and no claim about live provider validation.

## Important 1 — Rescheduling a recurrence occurrence creates a duplicate obligation

**References:** `backend/app/finance.py:129–148`; `backend/app/schemas.py:245`; `backend/app/models.py` Transaction unique `(owner_id, recurrence_id, date)`.

The generation identity is the transaction's editable `date`. Create a monthly rule on 2026-09-03 for 1,200, generate through September, PATCH its planned occurrence date to September 4, then generate through the same horizon again. Both API calls succeed, and generation returns `created: 1`; the ledger now has September 3 and September 4 obligations of 1,200 for one cycle. The duplicate also survives if the rescheduled occurrence is posted. This violates the explicit idempotent occurrence-generation requirement and doubles projected expense.

Use an immutable occurrence identifier/scheduled date separate from the editable transaction date, protected by a corresponding SQL unique constraint. Add a focused reschedule-and-regenerate regression.

**Evidence:** reproduced against dedicated `orbit_test` PostgreSQL via HTTP; exact output: first generation `{'created': 1}`, repeated generation `{'created': 1}`, rows `[('2026-09-04', 1200), ('2026-09-03', 1200)]`.

## Important 2 — Card-only profiles bypass the single-currency invariant

**Reference:** `backend/app/identity.py:210–214`.

Currency changes are blocked only when an account exists. A newly provisioned personal user can create a BRL card without a payment account and a BRL purchase, switch their profile to USD, and create a USD account/expense. The existing card debt is retained and `finance/report?basis=accrual` silently sums both currencies. New personal accounts start without financial accounts, so this is an ordinary supported sequence, not a direct-database corruption scenario.

Reject currency changes after any currency-bearing financial aggregate exists, including cards, or implement an explicit migration policy that cannot mix existing obligations. Keeping the current one-currency policy requires the former guard.

**Evidence:** isolated HTTP repro created BRL purchase 10,000 and USD expense 500; report returned `expenses: 10500`, `net: -10500` without currency separation.

## Important 3 — Recurrence creation and editing omit the required lifecycle

**References:** `backend/app/resources.py:114–117`, `backend/app/resources.py:171`; `backend/app/schemas.py:124–133,246`; `backend/app/finance.py:139–164`.

Original v1.1 §11.6 requires frequency, interval, optional end date; initial planned-horizon generation when the rule is created; and rule edits applying to future planned occurrences while posted history remains unchanged. The current implementation is monthly/day-of-month only, POST creates only the template, and PATCH changes only the template even when future planned rows already exist. Creating a 1,200 recurring bill therefore contributes nothing to projected balance until a second command; editing its template to 2,400 leaves already-generated future bills at 1,200.

Implement creation plus initial horizon atomically; model frequency/interval/end date and enforce them in the extension job; apply documented future-only edits to planned occurrences without changing posted history. Preserve separate immutable occurrence identity as described in finding 1. This is a concrete M5 scope gap, not a request for expanded recurrence features beyond the baseline.

**Evidence:** HTTP repro printed zero transactions immediately after recurrence creation; after generating September/October and changing amount to 2,400, both rows remained `[('2026-09-03', 1200), ('2026-10-03', 1200)]`.

## Important 4 — Changing a habit quantity target rewrites historical completion

**References:** `backend/app/resources.py:165–171`; `backend/app/habits.py:25–38`.

Only schedule changes receive effective dates; `target_quantity` is overwritten and the new value is applied to every historical check-in. Create target 1, complete September 3 with quantity 1, then on September 4 PATCH target to 2. September 3 becomes incomplete and the best streak drops from 1 to 0 without editing that check-in. A routine goal adjustment destroys previously earned completion. This conflicts with the historical interpretation requirement for habit rule changes (v1.1 §10.4 says changes affecting the schedule edit the future only).

Include completion targets in effective-dated habit rules and evaluate each date against its original target; future changes should not silently reinterpret prior quantities. If retroactive target edits are intended, they require an explicit product ruling and a distinct correction operation rather than the normal edit path.

**Evidence:** HTTP repro with injected clock returned prior `best_streak: 1`, after patch `best_streak: 0`, and prior day's `completed: false`. No historical check-in was modified.

## Important 5 — Demo data cap does not bound audit/integration growth

**References:** `backend/app/store.py:51–68,81–88`; `backend/app/integrations.py:141–166`.

The 5,000-row cap counts only `MODELS` inside `add()`. Every PATCH appends an Audit row through an uncapped path, including no-op patches; it is possible to generate unlimited persisted rows while maintaining a fixed aggregate count. The fixture simulation's clarification branch similarly adds Inbox/Outbox rows without an aggregate addition. Large routine/session edits retain full before/after snapshots, making repeated updates particularly expensive. This defeats the brief's required demo data bounds and leaves the public demo database vulnerable to disk growth by an authenticated demo visitor; token expiry is not an in-session write bound.

Enforce an overall demo persisted-data/write budget covering audit/idempotency/inbox/outbox, or another bounded retention/rate policy that preserves the necessary audit history until tenant expiry. Include repeated updates and clarification simulations in the regression, not only aggregate creation.

**Evidence:** setting the process-local demo cap to 1 after creating a test tenant's records did not prevent any of five account PATCHes; each succeeded and increased persisted audit rows. Static inspection establishes there is no audit quota check and no bound on the loop. The settings override existed only in the short-lived repro process.

## Important 6 — Pre-close card purchase editing is missing from the baseline

**References:** `backend/app/finance.py:239–267,398–463`; `backend/app/schemas.py:153–156`.

Original v1.1 §11.5 explicitly allows editing purchases with no closed cycle and requires atomic regeneration of the future installment plan. The API exposes create/detail/cancel/refund but no purchase edit command. A user who mistypes an amount, date, or installment count in an open unpaid cycle must cancel and create a distinct purchase, losing continuity of the purchase aggregate. The narrowed API contract does not itself approve dropping this baseline M6 capability.

Add a versioned/idempotent open-unpaid purchase edit that atomically regenerates affected future installments while retaining an audit trail; reject monetary/date/count changes once any installment has closed or been paid. The same rules already used for cancellation provide relevant boundaries. This is an identified specification gap; no network reproduction is needed because no edit route/model exists in the reviewed contract or implementation.

## Review confidence and limits

- Owner-scoped reads, composite owner foreign keys for relational references, owner write locks, request fingerprints, positive integer monetary inputs, exact installment allocation, original closed-installment preservation during refund, and warmup PR exclusion are present. No cross-tenant access bypass was identified in the reviewed paths.
- Focused HTTP repros ran only against the dedicated `orbit_test` database on port 55432. Each inserted isolated test user/token directly to represent a fresh empty financial profile, exercised normal authenticated HTTP commands, and deleted only that user's records in a finally block. No production/personal database was touched.
- No whole-suite rerun, migration rerun, file/code mutation, git action, or descendant agent was used. The report is the only saved review artifact. The first goal-history repro stopped at an expired test token after the injected clock advanced; a second isolated repro with sufficient test-token lifetime confirmed the behavior.
- Optional M10 limitations are explicitly disclosed by the worker; missing live credentials, clarification workflows, and receipt callbacks are not presented here as newly discovered core release blockers. Root-owned operation/container/mobile checks remain the controller's responsibility.
