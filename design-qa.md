# Design QA

## Inputs

- Reference: `design-qa-artifacts/reference.png`
- Desktop implementation: `design-qa-artifacts/home-desktop.png`, `design-qa-artifacts/workspace-desktop.png`
- Mobile implementation: `design-qa-artifacts/home-mobile.png`, `design-qa-artifacts/workspace-mobile.png`
- Secondary flow: `design-qa-artifacts/packs-new-desktop.png`, `design-qa-artifacts/packs-new-mobile.png`

## Iteration 1 — shell and hierarchy

- Matched the reference's fixed left navigation, horizontal workflow stepper, dense central work area, sticky right summary, warm paper surface, deep plum accent, serif display typography, fine borders, and low-shadow treatment.
- Replaced the previous top navigation with a persistent desktop shell and an accessible mobile drawer.
- Reduced the marketing weight of the landing page while retaining the product's existing brand voice.
- Issue found: project list/new-pack eyebrows flowed beside the back link. Fixed by making the eyebrow begin a new block.

## Iteration 2 — behavior and responsive fit

- Verified 1600×1024 and 390×844 layouts across `/`, `/projects`, `/packs`, `/packs/new`, `/settings`, `/about`, `/create`, `/understanding`, `/directions`, `/details`, `/plan`, `/result`, and a live `/workspace/[projectId]` route.
- Verified mobile navigation open/close behavior and keyboard-visible focus styling.
- Verified direction selection, decision selection, refresh recovery, and project step persistence.
- Issue found: analysis state was only held in Zustand, so refresh could return a project to input. Fixed by persisting analysis, directions, decision modules, selected direction, decisions, and input values with the project record.
- No document-level horizontal overflow at either target viewport. The workflow stepper intentionally scrolls within its own bounded navigation region on mobile.
- Browser console: no errors or warnings in the final route pass.

## Rubric

| Area | Result |
| --- | --- |
| Visual fidelity to reference | Passed — structure, palette, density, typography, border/radius and shadow language align |
| Information hierarchy | Passed — title, stage, primary task, summary, and next action remain clear |
| Responsive behavior | Passed — desktop shell converts to mobile header/drawer without page overflow |
| Interaction integrity | Passed — workflow progression and persisted project state verified after reload |
| Accessibility basics | Passed — labeled textareas, visible focus, semantic navigation, disabled future steps, alert roles |
| Asset quality | Passed — real generated preview images replace placeholder/CSS mock artwork |

final result: passed
