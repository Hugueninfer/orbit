# Orbit: three languages and consistent selects

Approved user request: provide Portuguese, English and German and make every select follow Orbit's design. UI locale values: pt-BR, en-US, de-DE; keep BRL currency, data storage, owner isolation, routes and financial rules unchanged. Translate app-owned navigation, labels, help, empty states, validation, actions, notifications and accessible labels; do not translate user-authored names/descriptions. Format display dates/numbers and parse money according to selected locale. Default Portuguese; store choice locally for login and in /me profile for signed-in users. Language switch in Settings previews immediately and Save persists to account; profile locale restored after authentication. Login also offers language selection. Changing UI locale must not remount forms or lose unsaved user input.

All native selects become one styled accessible component: dark Orbit surfaces, subtle border, teal/violet focus, rounded popup, selected checkmark, keyboard arrows/Home/End/typeahead/Enter/Escape, touch, disabled/required support, accessible field labels, forms and drawer compatibility. Use established Radix primitives if useful. Empty choice must keep value=''; support existing option children/onChange value handlers. Reuse design tokens; no native unstyled popup left in app source.

No paid service. Docker deployment on Render directly from main, independent from Actions. Existing credit-default expense behavior must remain. Test switching/persistence, locale parsers, menu keyboard behavior and module translations in browser including mobile width. Update OpenAPI for de-DE. Verify actual deployed assets, not only Render status.

## Verification (2026-09-04)

- Frontend: 30 tests covering locale switching, unsaved settings, monetary parsing and English edit payloads, German/English muscle-group invariants, native required/FormData behavior, keyboard controls and a select inside a Drawer. TypeScript passes.
- Backend: 118 tests; Ruff and mypy pass. Profile locale round-trips for all three languages; unsupported locales are rejected.
- Docker: production image built with Node24/Python3.14. No additional environment variables, migrations or paid services required.
- Browser: Portuguese/English login, English demo navigation, German Settings save and reload, German Dashboard/Finance/Workouts, desktop and 390×844 dropdown visual checks. Escape closes the select while preserving the Drawer. Tests used local demo data only.
- Independent review corrected localized enum values, money-edit decimal separators, German hour extraction, untranslated validation and missing labels. Stored names/descriptions/custom units remain original user data.
