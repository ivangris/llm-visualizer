# Deployment (Vercel)

Use Vercel for production. This app needs a server runtime for Next.js API routes (`/api/inference/*`).

## Quick Start

1. In Vercel, create a new project from `ivangris/llm-visualizer`.
2. Keep framework preset as `Next.js`.
3. Add environment variable: `OPENAI_API_KEY`.
4. Deploy.

You can still enter an OpenAI API key in the UI at runtime for testing.  
That runtime value is not persisted by the app, and this can be verified by running locally and inspecting code.

## CLI Alternative

```bash
npm i -g vercel
vercel login
vercel link
vercel env add OPENAI_API_KEY production
vercel --prod
```

## Verify After Deploy

1. Open the deployed URL.
2. Choose provider `OpenAI API`.
3. Run generation and confirm the tree advances.
4. Confirm `/api/inference/start`, `/api/inference/next`, and `/api/inference/models` return successfully.

## Recommended Settings

- Production branch: `master` (or `main` if renamed)
- Enable preview deployments for PRs
- Configure `OPENAI_API_KEY` in Production (and Preview if needed)

## Optional: Custom Domain

1. Vercel Project -> `Settings` -> `Domains`
2. Add domain and follow DNS instructions
