# Design QA

## OpenAI-compatible model dropdowns

### Evidence

- Source visual truth: `design-qa-artifacts/settings-reference.png`
- Bug evidence: `C:/Users/jiazh/AppData/Local/Temp/codex-clipboard-b68f2d04-d3f8-4fbd-9876-fab660c7c506.png`
- Matched desktop implementation: `C:/Users/jiazh/AppData/Local/Temp/t002-settings-dropdown-qa-2048.png`
- Desktop interaction capture: `C:/Users/jiazh/AppData/Local/Temp/t002-settings-dropdown-desktop.png`
- Mobile implementation: `C:/Users/jiazh/AppData/Local/Temp/t002-settings-dropdown-mobile.png`
- Viewports: 2048×1080 visual comparison, 1600×1024 desktop interaction, 390×844 responsive check
- State: both roles configured; text model dropdowns populated; optional image model set to “不使用图片模型”.

### Full-view comparison

The source and current 2048×1080 implementation were opened together in one comparison input. The implementation preserves the warm paper background, plum accent, serif display heading, two-card role structure, restrained border treatment, left navigation proportions, and green server-safety banner. The denser form controls are an intentional functional expansion of the reference summary cards.

The floating pixel pet in the source is an environment overlay rather than a settings-page asset and is therefore not treated as product-code drift. The current page uses the shared left-rail hatch control supplied by that environment.

### Focused form-region comparison

A separate crop was not required: at 2048×1080 the endpoint, API-key, discovery action, native select chevrons, selected values, helper copy, and save actions are legible in the full-view pair. The 1600×1024 capture was additionally inspected for control alignment and card balance.

### Findings

- No actionable P0, P1, or P2 visual differences remain.
- Typography: display/body hierarchy, weights, wrapping, and small helper text remain consistent with the reference language.
- Spacing and layout: cards align to the shared grid; dropdowns and actions retain a stable vertical rhythm; no horizontal overflow at desktop or mobile widths.
- Colors and tokens: plum interactive states, warm surfaces, muted helper text, green configured/safety states, and border contrast remain coherent.
- Image quality: no new image assets are introduced by this change; existing iconography remains vector-sharp and consistent.
- Copy: all custom-entry language was removed; helper copy now clearly says the model must be selected from the discovered list.
- Accessibility: model controls are native `select` elements with labels, keyboard behavior, visible focus styling, disabled states, and readable selected values.

### Primary interactions tested

- Confirmed the analysis and execution model controls render as native `SELECT` elements, not text inputs or datalists.
- Changed the analysis selection to `gpt-5.6-sol`, verified the exact selected value and available options, then restored `gpt-5.6-luna` without saving or changing the persisted configuration.
- Confirmed the optional image selector exposes “不使用图片模型”.
- Confirmed the server save route rejects text and image model IDs that are absent from the endpoint discovery result through code-level regression coverage.
- Confirmed document `scrollWidth` equals `clientWidth` at 1600×1024 and 390×844.
- Checked the final settings tab console: no application errors or warnings attributable to this change.

### Comparison history

- Earlier state: editable datalist controls allowed arbitrary model IDs; the reported workflow also failed when a model omitted a JSON comma.
- Fixes made: replaced editable controls with native selects, reset stale choices after discovery, added server-side discovered-model allowlist validation, and added deterministic repair for missing commas, trailing commas, and raw control characters before Schema validation.
- Post-fix evidence: desktop dropdown interaction, desktop/mobile screenshots, seven passing regression tests, successful TypeScript check, and successful 29-route production build.

### Implementation checklist

- [x] Dropdown-only model selection
- [x] Optional image-model empty choice
- [x] Server-side option validation
- [x] Structured JSON syntax repair
- [x] Desktop and mobile overflow checks
- [x] Console, tests, typecheck, and build verification

final result: passed
