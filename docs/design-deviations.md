# Visual implementation record

Reference authority: the 19 original Stitch HTML/PNG screens and `docs/design/design.json`. Preserve those originals for future changes. Existing screenshots have raster export dimensions, not necessarily CSS viewport sizes; responsive implementation uses actual viewport layout.

Preserved: dark navy surface hierarchy, Geist and JetBrains Mono typography, turquoise active navigation/check-ins, periwinkle primary actions, 256px desktop sidebar, persistent page header, rounded panels, labeled form sections, right-side desktop drawers and mobile bottom sheets/navigation.

Necessary adaptations:

- Mock identities, version labels, metric values and 2024 dates are replaced with real owner-scoped data or explicitly fictitious seeded records.
- The user requested login without Auth0 on 2026-09-03. Personal login now restores the original split-panel email/password fields, including password visibility. Sessions last seven days; the mock's 30-day checkbox, passkeys and email recovery are not implemented. Existing OIDC configurations remain optional.
- Lucide SVG icons replace the external Material Symbols font; Geist/JetBrains fonts are bundled locally.
- Demo entry/banner/reset are additional approved portfolio flows built from the same components. The approved single-installation flow now places a secondary “Experimentar demonstração” action beneath personal login, preserving the split panel and existing buttons; session badges reflect the authenticated user, not the deployment mode. `/demo` opens that same entry page.
- Open Finance, wearables, generic AI insights, biometric claims and nonexistent integration controls are omitted from the original mock copy; they are outside the functional scope.
- Dashboard uses upcoming invoice commitments instead of the prototype's unimplemented circadian/AI metrics. Charts use actual transactions, which can be sparse.
- New invoice, recurrence, history and library flows reuse the corresponding finance/workout cards and form recipes.
- Task filters and optional effort fields add controls using the original field/card recipes; mobile grid columns are constrained to the real viewport, with safe scrolling space for persistent navigation.
- Full dark design is the sole implemented appearance; the settings field communicates the selected theme and does not promise alternate themes.

These changes preserve the selected visual language without treating mockup content as implementation commands. The implementation is reference-based; a claim of pixel-identical reproduction across all 19 reference images would be inaccurate because content and real viewport ratios differ.
