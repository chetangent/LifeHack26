# App Overview

This is the local Next.js MVP for AgentShelf.

## What the app demonstrates

- paste or upload a simple catalog CSV
- automatically focus the weakest SKU
- explain why an AI assistant would struggle to recommend it
- apply suggested fixes
- compare baseline vs improved score
- compare baseline vs improved prompt results
- export the enriched product as JSON
- optionally call a live OpenAI model when `OPENAI_API_KEY` is configured

## Run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

Before starting the app, create `.env.local` in this directory and add the
OpenAI and Supabase values. Keep the Supabase service-role key and OpenAI key
server-only:

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_publishable_key_here
SUPABASE_SERVICE_ROLE_KEY=your_server_secret_key_here
```

If the key is missing, the app uses the built-in fallback optimizer so the demo still works.

For persistent workspace data, create the Supabase table by running
`db/supabase-schema.sql` in the Supabase SQL Editor, then add the project URL,
publishable key, and server-only service-role key to `.env.local`. Restart the
Next.js server after changing environment variables.

## Verify

```bash
npm run typecheck
npm run build
```

## Main files

- `app/page.tsx`: homepage composition
- `components/workbench.tsx`: main interactive demo flow
- `data/products.ts`: seeded demo products
- `lib/scoring.ts`: scoring and simulation logic

## Scoring summary

The scoring is heuristic today. It checks whether the product content contains the signals an AI shopping assistant would need, such as:

- context like climate or usage
- persona fit
- recommendation reasoning
- comparison framing
- trust and completeness

The output includes:

- baseline score
- improved score
- score breakdown by dimension
- prompt simulation confidence

## Backend MVP

The app now includes server-backed API routes for the demo workflow:

- `GET /api/workspace`: load the active workspace
- `PUT /api/workspace`: persist workflow state
- `POST /api/catalog`: parse and import a CSV catalog
- `POST /api/simulate`: extract intent and rank the stored catalog
- `GET /api/optimization-runs`: read optimization history
- `POST /api/enrich`: enrich a product and persist the optimization run

The repository uses Supabase when `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are configured. If the table or credentials are
unavailable, local development falls back to `.agentshelf-data/workspace.json`
(ignored by Git). The API response from `GET /api/workspace` includes a
`storage` field so the connection can be checked without exposing credentials.
The service-role key is server-only and must never be exposed to browser code.

## Suggested next product step

Ground each generated claim to source evidence and persist optimized outputs for repeated demos.
