# AgentShelf

AgentShelf helps brands make product catalogs recommendable in AI answers.

Instead of optimizing only for SEO, ads, or website browsing, AgentShelf helps ecommerce teams understand whether an AI shopping assistant can confidently recommend a product, why it might fail, and how to fix it.

## Why this can win

The strongest version of this project is not "AI generates better product copy."

It is:

**AgentShelf shows which products AI will recommend, why some products lose, and how brands can improve recommendation readiness with measurable before-and-after results.**

That matters because judges will likely reward:

- a clear shift in user behavior from search to conversational shopping
- a focused product problem with real business value
- visible AI functionality instead of vague AI wrapping
- measurable outcomes
- a credible path to production

## Core value proposition

Brands already have product catalogs, but AI assistants need richer signals than titles and specs.

AgentShelf converts traditional product content into:

- structured product attributes for machine understanding
- persona-aware recommendation narratives
- use-case and constraint coverage
- tradeoff-aware summaries
- an AI readiness score
- simulation results across natural-language shopping prompts

## Demo thesis

Show one weak product.
Show why AI cannot confidently recommend it.
Generate better AI-ready content.
Re-run the simulation.
Show the recommendation score improve.

That before-and-after proof is the centerpiece of the demo.

## MVP scope for the hackathon

To maximize quality and speed, keep the MVP narrow:

- one category only: running shoes
- one primary workflow: upload -> enrich -> score -> simulate -> improve
- one hero metric: recommendation readiness score
- one proof point: simulation win rate before vs after

Running shoes are a good category because they naturally involve:

- budget constraints
- climate and geography
- runner personas
- fit and cushioning tradeoffs
- beginner vs advanced use cases

## What the app should do

### 1. Ingest a simple catalog

Accept a CSV or seed dataset with:

- product name
- price
- description
- bullet features
- optional tags and reviews

### 2. Enrich the product for AI consumption

For each SKU, generate:

- AI summary
- ideal personas
- ideal use cases
- strengths
- tradeoffs
- missing recommendation signals
- structured machine-readable fields

### 3. Score recommendation readiness

Score each product across dimensions such as:

- attribute completeness
- contextual richness
- constraint compatibility
- persona coverage
- use-case coverage
- trust evidence
- machine readability

### 4. Simulate realistic shopping prompts

Example prompts:

- "I need lightweight running shoes for humid weather under S$200."
- "I'm training for my first half marathon and want a value-for-money daily trainer."
- "Find me breathable shoes for hot weather with moderate cushioning."

The app should show:

- whether the SKU is selected
- confidence score
- why it wins
- why it loses
- what content is missing

### 5. Recommend fixes

The app should suggest the content improvements that would increase AI confidence, then let the user regenerate the AI-ready version.

## Recommended judging story

Frame the project around this idea:

**SEO made brands discoverable on webpages. AgentShelf makes them recommendable in AI conversations.**

Suggested flow:

1. Commerce is shifting from search boxes to AI conversations.
2. Most product content is still written for human browsing.
3. AI assistants need structured, contextual, decision-ready product knowledge.
4. AgentShelf measures recommendation readiness and closes the gap.
5. Here is a real before-and-after product example.

## Current scaffold

This repo currently includes:

- Next.js App Router scaffold
- styled landing page and dashboard shell
- sample running-shoe catalog
- starter readiness summary
- prompt simulation panel
- API stub at `/api/enrich`

## Best next build order

Build in this sequence:

1. CSV upload for raw products
2. product detail screen with raw vs enriched content
3. readiness score breakdown by dimension
4. prompt simulation results with win/loss reasons
5. improvement suggestions and re-score flow
6. export enriched JSON or CSV

## Ideal tech architecture

### Frontend

- Next.js
- TypeScript
- simple dashboard views

### Backend

- API routes or lightweight server actions
- enrichment pipeline
- scoring engine
- simulation engine

### AI layer

- prompt-driven enrichment from raw product data
- structured JSON output
- explanations for inferred vs sourced claims

### Rules layer

- deterministic scoring
- schema checks
- gap detection
- simulation heuristics

## What makes the project compelling

- It solves a fresh and credible problem.
- It has a real buyer: ecommerce and catalog teams.
- It is easy for judges to understand in under one minute.
- It produces measurable outputs instead of vague content generation.
- It can grow into an enterprise SaaS product.

## Deliverables to prepare

You should leave the hackathon with:

- a working MVP demo
- a polished README
- a 3 to 4 minute demo video
- a concise pitch deck
- sample inputs and outputs

## Local development

```bash
cd /Users/Chetan/Documents/Codex/2026-08-29/problem-statement-traditional-digital-commerce-has/app
npm install
npm run dev
```

## Suggested repository structure

```text
app/
  app/
  components/
  data/
  lib/
outputs/
  ai-commerce-solution-concept.md
  demo-narrative.md
  pitch-deck-outline.md
  prd-mvp-spec.md
```

## Immediate next steps

1. Turn the static dataset into a real upload flow.
2. Build a product detail page with before-and-after enrichment.
3. Add score explanations and content gap recommendations.
4. Record the demo around one strong SKU transformation.
