# Deployment Guide (Vercel)

This app is designed to run with a server runtime because it uses Next.js API routes:

- `/api/inference/start`
- `/api/inference/next`
- `/api/inference/models`

These endpoints power the OpenAI integration and should run server-side.

## Prerequisites

- GitHub repo pushed and up to date
- Vercel account
- OpenAI API key

## Option 1: Vercel Dashboard (Recommended)

1. Open Vercel and click `Add New...` -> `Project`.
2. Import `ivangris/llm-visualizer`.
3. Keep framework preset as `Next.js`.
4. Add environment variable:
   - `OPENAI_API_KEY` = your key
5. Deploy.

Vercel will automatically:

- build with `next build`
- deploy your App Router pages
- deploy `/api/inference/*` routes

## Option 2: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link
vercel env add OPENAI_API_KEY production
vercel --prod
```

## Post-Deploy Verification

1. Open your deployed URL.
2. Set provider to `OpenAI API`.
3. Click `Start` and confirm tree growth works.
4. Confirm model dropdown loads compatible models when API key is provided in UI.
5. Confirm no console/server errors for `/api/inference/*`.

## Recommended Project Settings

- Production branch: `master` (or `main` if you rename later)
- Enable Preview Deployments for pull requests
- Keep `OPENAI_API_KEY` configured in:
  - `Production`
  - `Preview` (optional but useful)
  - `Development` (optional if using `vercel dev`)

## Custom Domain (Optional)

1. In Vercel project settings, open `Domains`.
2. Add your domain.
3. Follow DNS instructions from Vercel.
4. Re-test generation and API routes on the custom domain.

## Notes

- You can still enter an API key in the UI for testing.
- For production demos, prefer server-side `OPENAI_API_KEY` so collaborators do not need to paste keys.
