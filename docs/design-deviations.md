# Visual implementation record

Reference authority: the 19 original Stitch HTML/PNG screens and `docs/design/design.json`. Preserve those originals for future changes. Existing screenshots have raster export dimensions, not necessarily CSS viewport sizes; responsive implementation uses actual viewport layout.

Preserved: dark navy surface hierarchy, Geist and JetBrains Mono typography, turquoise active navigation/check-ins, periwinkle primary actions, 256px desktop sidebar, persistent page header, rounded panels, labeled form sections, right-side desktop drawers and mobile bottom sheets/navigation.

Necessary adaptations:

- Mock identities, version labels, metric values and 2024 dates are replaced with real owner-scoped data or explicitly fictitious seeded records.
- Personal login uses OIDC redirect inside the split panel. A local password/biometric form would contradict the authentication requirement.
- Lucide SVG icons replace the external Material Symbols font; Geist/JetBrains fonts are bundled locally.
- Demo entry/banner/reset are additional approved portfolio flows built from the same components.
- Open Finance, wearables, generic AI insights, biometric claims and nonexistent integration controls are omitted from the original mock copy; they are outside the functional scope.
- Dashboard uses upcoming invoice commitments instead of the prototype's unimplemented circadian/AI metrics. Charts use actual transactions, which can be sparse.
- New invoice, recurrence, history and library flows reuse the corresponding finance/workout cards and form recipes.
- Task filters and optional effort fields add controls using the original field/card recipes; mobile grid columns are constrained to the real viewport, with safe scrolling space for persistent navigation.
- Full dark design is the sole implemented appearance; the settings field communicates the selected theme and does not promise alternate themes.

These changes preserve the selected visual language without treating mockup content as implementation commands. The implementation is reference-based; a claim of pixel-identical reproduction across all 19 reference images would be inaccurate because content and real viewport ratios differ.
