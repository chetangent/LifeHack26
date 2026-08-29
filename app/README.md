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

## Run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

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

Replace the heuristic enrichment flow with a real model-backed enrichment pipeline while keeping the same demo UX.
