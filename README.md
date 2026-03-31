# LLM Token Tree Visualizer

A local-first teaching app that visualizes next-token prediction in a branching tree. It is designed for demos, executive education, and student-friendly explanations of how LLM generation unfolds step by step.

## What This App Does

- Accepts a prompt/question and generates one token per step
- Shows multiple candidate next tokens with probabilities
- Highlights one selected continuation branch while alternatives are truncated
- Supports layout modes: `Layered LR`, `Top-down`, `Radial`
- Supports strategy modes: `Top-k`, `Top-p`, `Temperature`
- Supports clickable hypothetical path exploration + chain probability preview
- Supports OpenAI provider with compatibility-checked model dropdown

## Technology Stack

- **Next.js 16 (App Router, TypeScript)**
  - App shell, routing, and API routes
- **React 19**
  - UI rendering and interactive controls
- **React Flow**
  - Graph canvas (pan/zoom, nodes, edges, minimap, controls)
- **Zustand**
  - Central client state store for config, run state, autoplay, selection
- **Framer Motion**
  - Entrance/transitional animations for polished UI behavior
- **Dagre + custom layout logic**
  - Auto layout for top-down and custom deterministic layout strategies
- **Vitest + Testing Library**
  - Unit/integration-style tests for strategy, tree progression, layouts, and presets
- **Tailwind CSS**
  - Styling system and dark UI theme

## High-Level Architecture

1. UI controls update `VisualizationConfig` in the Zustand store.
2. `stepRun()` asks a provider adapter for the next token candidates.
3. Provider returns ranked candidates + selected token.
4. Tree state is advanced (new nodes/edges appended).
5. Layout engine places nodes; React Flow renders the graph.
6. Selected path preview computes chain probability from selected nodes.

## "Class" / Module Summary

Note: this codebase is primarily functional (React functions + TS interfaces), not OOP class-based. The list below maps each major module to its responsibility.

### App Entrypoints

- `src/app/layout.tsx`
  - Root HTML/body layout, fonts, global metadata
- `src/app/page.tsx`
  - Main page entry that mounts the visualizer app
- `src/app/globals.css`
  - Global styles, theme tokens, base typography/scrollbar styles

### API Routes

- `src/app/api/inference/start/route.ts`
  - Starts a generation run context
- `src/app/api/inference/next/route.ts`
  - Returns next-step candidates/selection for active run
- `src/app/api/inference/models/route.ts`
  - Returns compatibility-checked OpenAI model list for dropdown

### UI Components

- `src/components/visualizer-app.tsx`
  - Top-level composition: control panel, info panel, canvas, selected path preview
- `src/components/control-panel.tsx`
  - Prompt/provider/model/strategy/layout/playback controls and preset management
- `src/components/flow-canvas.tsx`
  - React Flow graph rendering, camera behavior, node click handling
- `src/components/token-node.tsx`
  - Visual node rendering: token label + probability metadata
- `src/components/info-panel.tsx`
  - Educational explanatory text for selected topics

### State Management

- `src/store/visualizer-store.ts`
  - Single source of truth for run lifecycle, config, autoplay, selection, and presets

### Core Logic Libraries

- `src/lib/strategies.ts`
  - Candidate filtering/selection logic for Top-k, Top-p, Temperature
- `src/lib/tree-state.ts`
  - Tree creation and step-wise mutation (nodes/edges/status transitions)
- `src/lib/layout.ts`
  - Node positioning engine for LR, top-down, radial layouts
- `src/lib/selected-chain.ts`
  - Selected/hypothetical path analysis + probability computation
- `src/lib/token-display.ts`
  - Token/word formatting and percentage display rules
- `src/lib/random.ts`
  - Deterministic seeded PRNG utilities
- `src/lib/presets.ts`
  - Local storage load/save helpers for control presets
- `src/lib/defaults.ts`
  - Default app configuration constants

### Provider Layer

- `src/lib/providers/factory.ts`
  - Resolves provider adapter by configured provider type
- `src/lib/providers/api-provider.ts`
  - Client-side calls to internal API routes
- `src/lib/providers/mock-provider.ts`
  - Deterministic local mock token source

### Server Helpers

- `src/lib/server/openai-next-step.ts`
  - OpenAI chat-completions call + token logprobs mapping to app candidate format
- `src/lib/server/run-registry.ts`
  - In-memory run context registry for started runs

### Types (Data Contracts)

- `src/types/visualizer.ts`
  - Core interfaces/enums used throughout app:
  - `VisualizationConfig`: run + UI settings
  - `TokenCandidate`: candidate token + probability metadata
  - `TreeNode` / `TreeEdge`: graph entities
  - `ProviderAdapter`: provider interface contract
  - supporting enums (`StrategyType`, `LayoutMode`, `ProviderType`, etc.)

### Tests

- `src/lib/strategies.test.ts`
  - Selection strategy correctness and deterministic sampling behavior
- `src/lib/tree-state.test.ts`
  - Tree progression and branch truncation invariants
- `src/lib/layout.test.ts`
  - Layout correctness across modes
- `src/lib/presets.test.ts`
  - Preset persistence behavior
- `src/test/setup.ts`
  - Testing environment setup hooks
- `vitest.config.ts`
  - Vitest config, aliasing, environment setup

## Local Development

```bash
npm install
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

## Environment

Create `.env.local` (or enter key via UI):

```bash
OPENAI_API_KEY=your_key_here
```

## Scripts

```bash
npm run dev
npm run lint
npm run test
npm run build
```

## Current Scope and Roadmap

- Current: local web app with OpenAI + deterministic mock provider
- Planned: local HuggingFace CPU/GPU runtime adapter (phase 2)

