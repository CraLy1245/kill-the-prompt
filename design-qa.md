# Design QA

## OpenAI-compatible model settings

### Inputs

- Source reference: `design-qa-artifacts/settings-reference.png`
- Desktop implementation: `design-qa-artifacts/settings-openai-desktop.png` at 1600×1024
- Responsive implementation: `design-qa-artifacts/settings-openai-mobile.png`
- Comparison state: both roles configured against a local OpenAI-compatible test server, with automatically discovered text and image models visible.

### Visual comparison

- Preserved the reference shell, warm paper surface, deep plum accent, serif display heading, two-card role structure, restrained borders, and green security banner.
- Replaced status-only rows with labeled endpoint and masked API-key controls while retaining the reference hierarchy and density.
- Full-view comparison and focused form-region inspection were completed in the same pass.
- Issue found at 1600px: grid items initially honored input min-content width and visually clipped the execution card. Fixed with `minmax(0, 1fr)`, `min-width: 0`, and a one-column intermediate breakpoint.

### Interaction and responsive checks

- In the in-app browser, saved the analysis role using a full `/chat/completions` URL and confirmed normalization to the `/v1` root plus automatic selection of `analysis-reasoner`.
- Toggled API-key visibility, confirmed the key field clears after save, and confirmed the public status response contains no `apiKey` field.
- Saved the execution role with the same endpoint and confirmed automatic selection of `execution-writer` and `gpt-image-1`.
- Cleared both role configurations from the UI and verified configured/unconfigured state changes.
- At 1600×1024 both cards remained inside the 1120px content region. At 390×844 the sidebar became the mobile header, cards stacked, action buttons stacked, and document `scrollWidth` did not exceed `clientWidth`.
- Application console produced no app-origin errors. A browser-host Statsig telemetry timeout was observed and excluded because it originated from `ab.chatgpt.com`, not the project.

## Rubric

| Area | Result |
| --- | --- |
| Visual fidelity | Passed — reference shell, palette, type, spacing, cards, and security treatment retained |
| Information hierarchy | Passed — role, endpoint, key, discovered model, state, and primary save action are clear |
| Responsive behavior | Passed — two columns collapse without document overflow and mobile actions remain reachable |
| Interaction integrity | Passed — show/hide, test/save, automatic discovery, key reuse, and clear were verified |
| Security communication | Passed — masked key, server-only persistence notice, and key-free public response verified |
| Accessibility basics | Passed — semantic labels, status/alert roles, visible focus, and disabled states are present |

final result: passed
