# Design QA

## OpenAI-compatible model settings

### Inputs

- Source reference: `design-qa-artifacts/settings-reference.png`
- Desktop implementation: `C:/Users/jiazh/AppData/Local/Temp/T-002-settings-model-choice-after.png` at 1600×1024
- Responsive implementation: `C:/Users/jiazh/AppData/Local/Temp/T-002-settings-model-choice-mobile.png` at 390×844
- Bug evidence: `C:/Users/jiazh/AppData/Local/Temp/codex-clipboard-e2e4c3c3-1ea8-4a0f-aacd-cf27db32b75c.png`
- Comparison state: both roles connected to a local OpenAI-compatible test server; the analysis role shows a manually selected listed model and execution shows a custom text model plus selected image model.

### Visual comparison

- Preserved the reference shell, warm paper surface, deep plum accent, serif display heading, two-card role structure, restrained borders, and green security banner.
- Added a bordered “获取模型列表” action and editable model comboboxes while retaining the reference hierarchy, typography, card surfaces, and plum/green state language.
- Full-view comparison and focused form-region inspection were completed in the same pass.
- Issue found at 1600px: grid items initially honored input min-content width and visually clipped the execution card. Fixed with `minmax(0, 1fr)`, `min-width: 0`, and a one-column intermediate breakpoint.
- This iteration introduced no new P0/P1/P2 visual mismatch. The denser cards are an intentional functional expansion and remain balanced in the existing two-column frame.

### Interaction and responsive checks

- In the in-app browser, fetched three models using a full `/chat/completions` URL and confirmed normalization to the `/v1` root.
- Toggled API-key visibility, confirmed the key field clears after save, and confirmed the public status response contains no `apiKey` field.
- Changed the analysis model from the existing value to listed model `execution-writer` and saved it successfully.
- Entered list-external execution model `my-custom-model`, selected `gpt-image-1`, and confirmed both exact values persisted after save.
- Replayed a malformed writing draft matching the reported failure: missing `platform`/`tone`, string-valued `structure`, and string `targetLength`. The real build-spec API normalized it to a valid Zhihu ArtifactSpec with object sections and passed strict validation.
- At 1600×1024 both cards remained inside the 1120px content region. At 390×844 the sidebar became the mobile header, cards stacked, action buttons stacked, and document `scrollWidth` did not exceed `clientWidth`.
- Application console produced no errors or warnings in the final desktop and mobile passes.

## Rubric

| Area | Result |
| --- | --- |
| Visual fidelity | Passed — reference shell, palette, type, spacing, cards, and security treatment retained |
| Information hierarchy | Passed — role, endpoint, key, discovered model, state, and primary save action are clear |
| Responsive behavior | Passed — two columns collapse without document overflow and mobile actions remain reachable |
| Interaction integrity | Passed — discovery, listed selection, custom entry, image selection, test/save, and structured-draft normalization were verified |
| Security communication | Passed — masked key, server-only persistence notice, and key-free public response verified |
| Accessibility basics | Passed — semantic labels, status/alert roles, visible focus, and disabled states are present |

final result: passed
