# AgentShelf

AgentShelf helps brands make products recommendable in AI shopping conversations.

Traditional ecommerce content was built for humans browsing websites. AgentShelf is built for a world where shoppers ask AI assistants for help, and those AI systems need structured, contextual, decision-ready product knowledge.

## One-line pitch

SEO made brands discoverable on webpages. AgentShelf makes them recommendable in AI answers.

## The problem

Most brands still publish product content like this:

- title
- price
- specs
- short marketing copy

But AI shopping assistants need more than that. To recommend a product confidently, they need to understand:

- who the product is for
- when to use it
- what constraints it fits
- what tradeoffs it has
- what evidence supports the claim

Without that layer, products may be invisible, misunderstood, or poorly matched in conversational commerce.

## What AgentShelf does

AgentShelf takes a normal product catalog and turns it into an AI-ready recommendation layer.

It helps brands:

- find weak product listings
- detect missing recommendation signals
- generate richer AI-ready content
- score recommendation readiness
- simulate real shopping prompts
- prove before-and-after improvement

## Demo flow

The app is built around one simple story:

1. Upload or paste a basic catalog
2. AgentShelf finds the weakest SKU
3. It explains why AI would struggle to recommend it
4. It applies suggested fixes
5. It shows score uplift and better simulation results

That makes the project easy to understand in a hackathon demo and easy to extend into a real product.

## Current product features

- Guided workflow with weakest-SKU prioritization
- CSV upload or paste flow
- Before/after product comparison
- Explainable readiness scoring
- Prompt simulation for buyer-intent testing
- Optional live OpenAI-powered optimization with graceful fallback
- AI-ready JSON export
- Sample running-shoe dataset for fast demo setup

## How the scoring works

The current scoring system is a demo-friendly heuristic model implemented in [`app/lib/scoring.ts`](./app/lib/scoring.ts).

It evaluates whether a product exposes the kinds of signals an AI shopping assistant needs, including:

- completeness
- context
- persona fit
- trust signals
- climate suitability
- recommendation reasoning
- comparison framing

For uploaded CSV rows, AgentShelf parses the raw description and features, derives missing signals, and computes:

- a baseline score for the original listing
- an improved score for the AI-optimized listing
- a score breakdown by dimension

Important:

- the current scoring is intentionally lightweight for hackathon speed
- it is not yet connected to a live model-based evaluator
- the product vision is for AgentShelf to improve the content automatically, then rescore it

## How the optimization works

Right now, AgentShelf acts like a guided content copilot:

- it detects missing recommendation signals
- it suggests what to add
- it generates an improved AI-ready profile
- it shows how that changes the score and prompt performance

In the current MVP, this is done with structured demo logic rather than a live LLM API, so the product can run reliably and be demoed offline after install.

If `OPENAI_API_KEY` is set, the optimize action calls a live OpenAI model through the server route and then rescoring happens inside AgentShelf.

## Why this is compelling

This is not just another AI copywriter.

The interesting part is the feedback loop:

- diagnose
- optimize
- simulate
- prove improvement

That makes the product feel more measurable, more enterprise-ready, and more useful than pure content generation.

## Run locally

```bash
git clone https://github.com/chetangent/LifeHack26.git
cd LifeHack26/app
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

To enable live optimization, add your API key in `app/.env.local`:

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5-mini
```

If the key is missing or the API call fails, the app falls back to its built-in optimization logic so the demo still works.

## Build and verify

```bash
cd app
npm run typecheck
npm run build
```

## CSV format

Use a simple CSV like this:

```csv
name,price,description,features
PulseRoad Breeze,S$168,Breathable daily trainer for beginner runners in humid weather,engineered mesh|foam midsole|rubber outsole
PacePilot Shift,S$188,Responsive shoe for faster sessions and hot climate training,open mesh|responsive foam|road grip
WideWay Start,S$138,Comfortable wide running shoe for walk run beginners,wide toe box|foam ride|textile upper
```

## Repository structure

```text
app/
  app/
  components/
  data/
  lib/
  public/
outputs/
  ai-commerce-solution-concept.md
  demo-narrative.md
  pitch-deck-outline.md
  prd-mvp-spec.md
  video-script.md
  winning-build-plan.md
```

## Submission materials

- [Solution concept](./outputs/ai-commerce-solution-concept.md)
- [Pitch deck outline](./outputs/pitch-deck-outline.md)
- [PRD / MVP spec](./outputs/prd-mvp-spec.md)
- [Demo narrative](./outputs/demo-narrative.md)
- [Winning build plan](./outputs/winning-build-plan.md)
- [Video script](./outputs/video-script.md)
- [Video production guide](./outputs/video-production-guide.md)

## What is real vs demo right now

Real:

- the app runs locally
- CSV input works
- weakest-SKU prioritization works
- score and simulation views work
- JSON export works

Demo logic:

- enrichment is heuristic, not live model-generated
- scoring is rules-based, not production-eval grade
- no live CMS or catalog integrations yet

## Best next improvements

- connect real OpenAI-powered enrichment
- make score explanations traceable to exact source fields
- add side-by-side product comparison
- support more categories beyond running shoes
- export directly into ecommerce-ready fields
