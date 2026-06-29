# AI Logo Decision Funnel

English | [中文](README.md)

AI Logo Decision Funnel is an open-source AI logo design funnel. Instead of sending a vague requirement directly into an image model, it breaks the user's intent into a sequence of comparable, selectable, and reversible decisions: understand the requirement, generate directions, filter details, build a final logo plan, produce positive and negative prompts, and optionally hand the prompt off to an image-generation API.

The current implementation focuses on logo design, but the more important part is the method. This repository is meant to show how a fuzzy user goal can be turned into a structured task that an AI model can execute more reliably. I hope other builders reuse this funnel logic in other practical AI scenarios, such as ecommerce image generation, ad creative production, short-video scripts, brand strategy, interior design concepts, marketing copy, education tools, or enterprise knowledge workflows.

## Core Logic

Many AI products fail not because the model cannot answer, but because the system asks the model to produce the final artifact too early. The user starts with an unclear goal, and the product jumps straight to generation. This project takes a different route: expand first, filter next, then generate from structured constraints.

1. **Requirement Understanding**
   The user enters a natural-language logo request. The system extracts brand type, target users, brand mood, preferred elements, preferred colors, typography preference, application scenarios, constraints, and uncertain points.

2. **Direction Expansion**
   The system generates 5 distinct design directions. The user chooses the strategic direction before adjusting details.

3. **Detail Filtering**
   After a direction is selected, the system generates modular decisions such as graphic subject, structure, complexity, line weight, typography, text hierarchy, color palette, application priority, and avoidance rules.

4. **Plan Confirmation**
   The system rebuilds the selected choices into a logo plan, positive prompt, and negative prompt. The final prompt stays aligned with the user's selected constraints.

5. **Generation Handoff**
   The final prompt can be copied into another image model or sent to the configured image-generation endpoint.

The reusable principle is not logo design itself. It is the funnel: expand possible directions, let the user make high-leverage choices, then generate from a structured contract.

## What It Does

- Parses vague logo requirements into structured brand understanding
- Generates 5 comparable design directions
- Lets users filter logo details through modular choices
- Builds a final logo plan, positive prompt, and negative prompt
- Supports Responses-compatible text/model providers
- Supports an image-generation endpoint
- Persists flow state locally with Zustand

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Zustand
- Zod
- lucide-react

## Installation

Clone the repository:

```bash
git clone https://github.com/CraLy1245/ai-logo-decision-funnel.git
cd ai-logo-decision-funnel
```

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.local.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.local.example .env.local
```

Fill in your own API settings:

```bash
RIGHT_CODES_API_KEY=your_api_key_here
RIGHT_CODES_BASE_URL=https://www.right.codes/codex/v1/responses
RIGHT_CODES_MODEL=gpt-5.5
RIGHT_CODES_IMAGE_API_KEY=your_image_api_key_here
RIGHT_CODES_IMAGE_BASE_URL=https://www.right.codes/draw/v1/images/generations
RIGHT_CODES_IMAGE_MODEL=gpt-image-2-vip
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## How To Use

1. Open the home page and enter a rough logo requirement.
2. Review the structured requirement analysis.
3. Compare the generated directions and choose one.
4. Adjust the detail modules.
5. Generate the final plan and prompt.
6. Copy the prompt into your own image model, or configure the image API variables and generate directly from the result page.

## Environment Variables

This project does not include real API keys. Keep real keys only in `.env.local`, which is ignored by Git.

| Variable | Description |
| --- | --- |
| `RIGHT_CODES_API_KEY` | API key for the text/model provider |
| `RIGHT_CODES_BASE_URL` | Responses-compatible text/model endpoint |
| `RIGHT_CODES_MODEL` | Model used for requirement analysis, direction generation, detail generation, and prompt generation |
| `RIGHT_CODES_IMAGE_API_KEY` | Optional image API key when the image endpoint uses a separate key |
| `RIGHT_CODES_IMAGE_BASE_URL` | Image-generation API endpoint |
| `RIGHT_CODES_IMAGE_MODEL` | Image model used by the result page |

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
```

## Project Structure

```text
src/app           Next.js routes and API endpoints
src/components    Reusable UI components and flow workspaces
src/lib           AI client, prompt contracts, schemas, validators
src/store         Client-side flow state
src/types         Shared TypeScript types
public/brand      Brand assets used by the app shell
```

## Adapting The Funnel To Other AI Products

To reuse this project outside logo design, keep the funnel shape and replace the domain schema:

- Replace requirement analysis fields with the core variables of your domain.
- Replace the 5 logo directions with 5 strategic solution directions.
- Replace detail modules with the decisions users must make before generation.
- Keep strict JSON contracts between model calls and UI state.
- Generate final prompts only after the user has selected enough structured constraints.

For example, an ecommerce image workflow could use product analysis, 5 image strategy directions, scene/angle/lighting/props/selling-point modules, and then a final image prompt plus negative prompt.

The key is to let users make meaningful decisions before the model creates the final artifact.

## Development Notes

- Do not commit `.env.local`, real API keys, generated logs, build folders, or private project data.
- Prompt contracts live in `src/lib/promptContracts.ts`.
- Shared schemas and validators live in `src/lib/logoSchemas.ts` and `src/lib/validators.ts`.

## License

MIT
