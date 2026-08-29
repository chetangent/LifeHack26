# PRD / MVP Spec

## Product Name
AgentShelf

## Product Vision
Help brands transform traditional product data into AI-ready content that improves discoverability, recommendation confidence, and performance in conversational commerce.

## Problem Statement
Brands currently maintain product content optimized for websites and search engines, but AI shopping assistants require richer structured context to recommend products effectively. Without this layer, products may be overlooked, misunderstood, or described inaccurately.

## Goals
- generate AI-ready product content from existing catalog inputs
- score how recommendation-ready each product is
- identify content gaps that reduce recommendation confidence
- simulate natural-language shopping prompts to validate content quality

## Non-Goals for MVP
- live integration with external marketplaces
- full omnichannel publishing workflows
- direct purchase or checkout flows
- category coverage across all retail verticals

## Target User
The primary MVP user is a brand catalog manager or ecommerce content manager responsible for improving product discoverability and content quality.

## MVP Persona
**Aisha**, Ecommerce Content Lead
- manages 5,000 SKUs
- has spreadsheets, product copy, and image assets
- knows her products well but does not know how AI agents interpret them
- needs a practical way to upgrade content without rewriting everything manually

## User Stories
- As a catalog manager, I want to upload my existing product data so I can see how AI-ready each SKU is.
- As a content manager, I want the system to generate richer structured content so I can improve recommendation quality quickly.
- As a merchandiser, I want to test products against shopper-style prompts so I can find missing information.
- As a team lead, I want a clear score and explanation so I can prioritize which SKUs to fix first.

## Core Workflow
1. User uploads CSV with product catalog.
2. User selects category template such as running shoes or skincare.
3. System parses rows and maps fields into canonical attributes.
4. LLM enrichment generates:
   - use cases
   - persona fit
   - recommendation reasons
   - tradeoffs
   - missing fields
5. Readiness engine scores each product.
6. Simulation engine runs sample prompts against enriched content.
7. Dashboard shows score, win rate, gaps, and suggested edits.
8. User exports structured content and improved copy.

## Functional Requirements
### 1. Catalog Upload
- support CSV upload
- require minimal columns: product name, category, price, description
- optional columns: materials, features, dimensions, certifications, reviews

### 2. Category Template
- support one initial category only
- include category-specific attribute schema
- include common personas and use cases

### 3. AI Content Generation
For each product, generate:
- concise AI summary
- best-fit personas
- best-fit use cases
- recommendation reasons
- tradeoffs or limitations
- structured JSON output

### 4. AI Readiness Score
Return:
- overall score out of 100
- sub-scores by dimension
- explanation of missing factors
- priority recommendations

### 5. Prompt Simulation
- run a library of prebuilt shopping prompts
- match products to prompts using structured attributes plus generated content
- output selection confidence
- log failure reasons

### 6. Export
- downloadable CSV with enriched fields
- downloadable JSON per product

## Suggested Scoring Dimensions
- Attribute Completeness: 20
- Contextual Relevance: 15
- Persona Coverage: 15
- Use-Case Coverage: 15
- Differentiation Clarity: 10
- Trust and Evidence: 10
- Constraint Compatibility: 10
- Machine Readability: 5

## Example Product Output Schema
```json
{
  "product_id": "RS-001",
  "ai_summary": "Breathable neutral running shoe for half-marathon training in hot, humid climates under S$200.",
  "personas": ["beginner runner", "budget-conscious runner"],
  "use_cases": ["daily training", "tempo runs", "humid weather"],
  "strengths": ["lightweight", "breathable", "good value"],
  "tradeoffs": ["not ideal for overpronation", "less cushioning than premium models"],
  "constraints": {
    "budget_band": "mid",
    "climate": "humid",
    "activity_level": "moderate-high"
  },
  "readiness_score": 78,
  "gaps": ["missing outsole durability evidence", "missing fit-width information"]
}
```

## UX Screens
### Screen 1: Upload
- file upload area
- category selector
- sample template download

### Screen 2: Catalog Dashboard
- table of products
- overall readiness score
- filters by low-score SKUs and missing fields

### Screen 3: Product Detail
- raw content vs generated AI-ready content
- score breakdown
- simulation results
- suggested improvements

### Screen 4: Simulation View
- prompt list
- selected product
- recommendation confidence
- why product won or lost

## Technical Architecture
### Frontend
- simple web app
- upload, results table, product detail, simulation view

### Backend
- file ingestion service
- schema mapper
- LLM enrichment pipeline
- scoring engine
- prompt simulation engine

### Model Responsibilities
- extract and normalize attributes
- generate content candidates
- explain missing fields
- create persona and use-case narratives

### Rules-Based Layer
- validate schema completeness
- calculate sub-scores
- enforce output structure

## Data Inputs
- CSV catalog
- optional reviews
- optional product FAQs
- optional brand tone guide

## Risks
- hallucinated product claims if source data is weak
- category quality may degrade without domain-specific schema
- scores may feel subjective unless explanations are transparent

## MVP Safeguards
- cite generated claims back to source fields when possible
- label inferred vs provided attributes
- keep category scope narrow
- expose why each score was assigned

## Success Metrics
- time to enrich one SKU
- percentage of SKUs with completed AI-ready profiles
- average readiness score increase after optimization
- simulation win-rate lift after recommended edits

## Demo Dataset Recommendation
Use 10 to 20 SKUs in one category:
- running shoes
or
- skincare

Running shoes is easiest for a live demo because personas, climate, budget, and activity goals are intuitive to judges.
