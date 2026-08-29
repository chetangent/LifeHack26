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
cp .env.example .env.local
npm install
npm run dev
```

Then open `http://localhost:3000`.

For live optimization, add your key to `.env.local`:

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5-mini
```

If the key is missing, the app uses the built-in fallback optimizer so the demo still works.

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

## Suggested next product step

Ground each generated claim to source evidence and persist optimized outputs for repeated demos.
