# LLM Token Tree Visualizer: Interactive Learning of Next-Token Prediction

LLM Token Tree Visualizer is an interactive teaching tool for showing how language models choose the next token.  
It generates one token at a time, shows alternative candidates with probabilities, and highlights the selected continuation path.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ivangris/llm-visualizer&env=OPENAI_API_KEY&project-name=llm-token-tree-visualizer&repository-name=llm-visualizer)

## Live Demo

Local demo:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## What You Can Explore

- Next-token branching at each generation step
- Strategy modes: `Top-k`, `Top-p`, `Temperature`
- Topology modes: `Layered LR`, `Top-down`, `Radial`
- OpenAI-based token probabilities with logprobs
- Deterministic mock mode for repeatable teaching demos
- Selected-path preview with chain probability

## How To Run Locally

#### Prerequisites

- Node.js 20+
- npm 10+

#### Steps

```bash
git clone https://github.com/ivangris/llm-visualizer.git
cd llm-visualizer
npm install
npm run dev
```

Optional `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
```

## Technical Implementation

The full architecture, module-by-module breakdown, provider contract, and OpenAI logprobs details are in:

- [TECHNICAL_README.md](./TECHNICAL_README.md)

## Deployment

Production deployment instructions (Vercel) are in:

- [DEPLOYMENT.md](./DEPLOYMENT.md)

## License

This project is available under the [MIT License](./LICENSE).

