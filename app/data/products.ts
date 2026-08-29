import type { Product } from "@/lib/types";

export const products: Product[] = [
  {
    id: "RS-001",
    name: "StrideFlow Aero",
    brand: "StrideFlow",
    price: "S$179",
    climate: "humid",
    fit: "neutral",
    cushioning: "moderate",
    category: "Running shoes",
    rawDescription:
      "Lightweight daily trainer with foam midsole and engineered mesh upper for road running.",
    rawBullets: [
      "Foam midsole",
      "Engineered mesh upper",
      "Rubber outsole",
      "Weight: 248g"
    ],
    sourceSignals: ["mesh upper", "sub-S$200 price", "lightweight weight spec"],
    gaps: ["fit-width guidance", "durability proof"],
    readinessScore: 81,
    improvedScore: 92,
    scoreBreakdown: [
      {
        label: "Completeness",
        baseline: 74,
        improved: 90,
        rationale: "Needs width and durability evidence to complete the decision set."
      },
      {
        label: "Context",
        baseline: 78,
        improved: 94,
        rationale: "Humidity and half-marathon suitability become explicit after enrichment."
      },
      {
        label: "Persona Fit",
        baseline: 80,
        improved: 92,
        rationale: "Strong for beginner runners once buyer type is stated directly."
      },
      {
        label: "Trust Signals",
        baseline: 66,
        improved: 87,
        rationale: "Structured proof points reduce uncertainty in recommendation."
      }
    ],
    enriched: {
      aiSummary:
        "Breathable neutral running shoe for beginner to intermediate runners training for 10K to half-marathon distances in hot, humid weather under S$200.",
      personas: ["beginner runner", "budget-conscious runner"],
      useCases: ["daily training", "half-marathon prep", "humid weather"],
      strengths: ["breathable upper", "lightweight foam", "good value"],
      tradeoffs: [
        "Less cushioned than premium max-stack trainers",
        "Needs more width guidance for wider-foot shoppers"
      ],
      proofPoints: [
        "248g weight supports lightweight positioning",
        "Mesh upper supports hot-weather breathability"
      ],
      machineTags: [
        "climate:humid",
        "distance:10k-half-marathon",
        "budget:mid",
        "fit:neutral"
      ],
      recommendationReasons: [
        "Matches humid-climate training needs",
        "Fits the shopper's budget constraint",
        "Clear daily-trainer positioning for newer runners"
      ],
      missingSignals: ["fit-width guidance", "durability proof"]
    }
  },
  {
    id: "RS-002",
    name: "TerraPace Core",
    brand: "TerraPace",
    price: "S$159",
    climate: "mixed",
    fit: "stable",
    cushioning: "firm",
    category: "Running shoes",
    rawDescription:
      "Supportive trainer with guidance-focused geometry built for everyday mileage and reliable stability.",
    rawBullets: [
      "Guidance geometry",
      "Durable outsole",
      "Firm ride",
      "Stability support"
    ],
    sourceSignals: ["supportive ride", "durable outsole", "everyday mileage"],
    gaps: ["heat comfort signal", "pace-specific positioning", "comparison note"],
    readinessScore: 62,
    improvedScore: 82,
    scoreBreakdown: [
      {
        label: "Completeness",
        baseline: 60,
        improved: 83,
        rationale: "The baseline copy misses climate comfort and pace positioning."
      },
      {
        label: "Context",
        baseline: 56,
        improved: 79,
        rationale: "Adding beginner and support-seeking use cases improves relevance."
      },
      {
        label: "Persona Fit",
        baseline: 68,
        improved: 84,
        rationale: "Stable shoes need a clearer target user to be recommended confidently."
      },
      {
        label: "Trust Signals",
        baseline: 64,
        improved: 80,
        rationale: "Comparison framing clarifies when to pick this over neutral alternatives."
      }
    ],
    enriched: {
      aiSummary:
        "Stable daily trainer for new runners who want extra support and durability at a mid-range price, especially for easy mileage and first-race preparation.",
      personas: ["new runner", "support-seeking runner"],
      useCases: ["5k training", "daily runs", "easy-mileage stability"],
      strengths: ["supportive ride", "durable outsole", "good everyday value"],
      tradeoffs: [
        "Less breathable than airy tempo shoes",
        "Feels firmer than soft-cushion recovery trainers"
      ],
      proofPoints: [
        "Durable outsole supports heavy weekly use",
        "Guidance geometry indicates stability intent"
      ],
      machineTags: [
        "fit:stable",
        "budget:mid",
        "support:high",
        "use-case:daily-runs"
      ],
      recommendationReasons: [
        "Suitable for runners asking for extra support",
        "Durable choice for repeat training miles",
        "Accessible price for entry-level shoppers"
      ],
      missingSignals: ["heat comfort signal", "comparison note"]
    }
  },
  {
    id: "RS-003",
    name: "NimbusLite 10",
    brand: "NimbusLite",
    price: "S$209",
    climate: "humid",
    fit: "neutral",
    cushioning: "soft",
    category: "Running shoes",
    rawDescription:
      "Soft-cushion trainer designed for smooth transitions and comfortable longer sessions.",
    rawBullets: ["Soft foam stack", "Rocker geometry", "Road outsole", "Comfort collar"],
    sourceSignals: ["soft cushioning", "smooth transitions", "longer session comfort"],
    gaps: ["budget fit", "race-day suitability"],
    readinessScore: 74,
    improvedScore: 86,
    scoreBreakdown: [
      {
        label: "Completeness",
        baseline: 70,
        improved: 82,
        rationale: "Price sensitivity and speed-use boundaries need clarification."
      },
      {
        label: "Context",
        baseline: 76,
        improved: 88,
        rationale: "Long-run and recovery positioning becomes clearer with use-case labeling."
      },
      {
        label: "Persona Fit",
        baseline: 74,
        improved: 86,
        rationale: "Comfort-first runners become easy to match once called out."
      },
      {
        label: "Trust Signals",
        baseline: 71,
        improved: 84,
        rationale: "Tradeoff framing reduces the risk of mismatched race-day recommendations."
      }
    ],
    enriched: {
      aiSummary:
        "Soft neutral trainer for runners prioritizing comfort on easy and long runs, with enough breathability for humid climates but priced above entry-level budgets.",
      personas: ["comfort-first runner", "long-distance runner"],
      useCases: ["recovery runs", "long easy runs", "humid-weather comfort"],
      strengths: ["soft cushioning", "smooth transitions", "long-run comfort"],
      tradeoffs: [
        "Pricier than value daily trainers",
        "Not the sharpest option for speedwork or race day"
      ],
      proofPoints: [
        "Rocker geometry supports smooth turnover",
        "Soft foam stack supports comfort positioning"
      ],
      machineTags: [
        "comfort:high",
        "budget:premium-mid",
        "distance:long-run",
        "fit:neutral"
      ],
      recommendationReasons: [
        "Well aligned to recovery-focused shoppers",
        "Strong comfort story for long sessions",
        "Clear tradeoff prevents speed-focused mismatches"
      ],
      missingSignals: ["budget fit"]
    }
  },
  {
    id: "RS-004",
    name: "VoltSprint Edge",
    brand: "VoltSprint",
    price: "S$189",
    climate: "hot",
    fit: "neutral",
    cushioning: "responsive",
    category: "Running shoes",
    rawDescription:
      "Quick-feeling trainer with a snappy forefoot and open mesh upper for faster sessions.",
    rawBullets: ["Responsive midsole", "Open mesh", "Road outsole", "Tempo shape"],
    sourceSignals: ["snappy forefoot", "ventilated mesh", "faster session intent"],
    gaps: ["beginner suitability", "stability note", "wet-grip evidence"],
    readinessScore: 69,
    improvedScore: 88,
    scoreBreakdown: [
      {
        label: "Completeness",
        baseline: 65,
        improved: 86,
        rationale: "Beginner and grip guardrails are needed for safe recommendations."
      },
      {
        label: "Context",
        baseline: 72,
        improved: 91,
        rationale: "Hot-weather tempo use cases become easy for an agent to reason about."
      },
      {
        label: "Persona Fit",
        baseline: 68,
        improved: 87,
        rationale: "The improved version clearly targets speed-curious runners."
      },
      {
        label: "Trust Signals",
        baseline: 62,
        improved: 82,
        rationale: "Explicit tradeoffs prevent over-recommending it to the wrong buyer."
      }
    ],
    enriched: {
      aiSummary:
        "Responsive neutral trainer for runners who want a breathable option for tempo sessions and shorter races in hot weather, while accepting less support than stability models.",
      personas: ["tempo runner", "race-focused runner"],
      useCases: ["tempo sessions", "10k training", "hot-weather workouts"],
      strengths: ["snappy forefoot", "ventilated mesh", "strong value for speedwork"],
      tradeoffs: [
        "Less supportive for runners needing stability",
        "Needs clear wet-grip guidance for rainy conditions"
      ],
      proofPoints: [
        "Open mesh supports high breathability",
        "Tempo geometry supports faster training use"
      ],
      machineTags: [
        "pace:tempo",
        "climate:hot",
        "fit:neutral",
        "budget:mid"
      ],
      recommendationReasons: [
        "Aligned to hot-weather speed sessions",
        "Appropriate for sub-S$200 performance-minded shoppers",
        "Tradeoffs make the recommendation safer"
      ],
      missingSignals: ["wet-grip evidence"]
    }
  },
  {
    id: "RS-005",
    name: "HarborRun Ease",
    brand: "HarborRun",
    price: "S$129",
    climate: "humid",
    fit: "wide-friendly",
    cushioning: "moderate",
    category: "Running shoes",
    rawDescription:
      "Comfortable everyday shoe with roomier fit and accessible price point for casual activity.",
    rawBullets: ["Wide toe box", "Foam midsole", "Textile upper", "Low price"],
    sourceSignals: ["wide toe box", "accessible price", "everyday comfort"],
    gaps: ["distance range", "material quality proof", "expert validation"],
    readinessScore: 58,
    improvedScore: 79,
    scoreBreakdown: [
      {
        label: "Completeness",
        baseline: 52,
        improved: 76,
        rationale: "Distance suitability is too vague in the raw copy."
      },
      {
        label: "Context",
        baseline: 57,
        improved: 80,
        rationale: "Great fit for walk-run programs once the scenario is stated."
      },
      {
        label: "Persona Fit",
        baseline: 60,
        improved: 82,
        rationale: "Wide-foot, casual, and value-led personas make this easier to match."
      },
      {
        label: "Trust Signals",
        baseline: 49,
        improved: 71,
        rationale: "The product still needs stronger proof to avoid weak recommendations."
      }
    ],
    enriched: {
      aiSummary:
        "Budget-friendly, wide-friendly daily trainer for casual runners and walk-run beginners who want comfort in humid climates without paying for premium features.",
      personas: ["casual runner", "value shopper", "wide-foot runner"],
      useCases: ["walk-run programs", "daily wear", "beginner jogging"],
      strengths: ["wide toe box", "accessible price", "comfortable entry point"],
      tradeoffs: [
        "Limited evidence for longer-distance training",
        "Less premium material story than mid-tier competitors"
      ],
      proofPoints: [
        "Wide toe box supports fit accessibility",
        "Low price strengthens value positioning"
      ],
      machineTags: [
        "fit:wide-friendly",
        "budget:entry",
        "climate:humid",
        "use-case:beginner-jogging"
      ],
      recommendationReasons: [
        "Strong fit for value-first beginners",
        "Clear wide-foot angle improves discoverability",
        "Useful for low-stakes daily movement use cases"
      ],
      missingSignals: ["material quality proof", "expert validation"]
    }
  },
  {
    id: "RS-006",
    name: "KindStep Origin",
    brand: "KindStep",
    price: "S$185",
    climate: "humid",
    fit: "neutral",
    cushioning: "moderate",
    category: "Running shoes",
    rawDescription:
      "Balanced trainer with recycled materials, everyday comfort, and a versatile road-running setup.",
    rawBullets: ["Recycled upper", "Balanced midsole", "Road outsole", "Daily trainer"],
    sourceSignals: ["recycled upper", "balanced ride", "daily trainer use"],
    gaps: ["certification evidence", "comparative value signal"],
    readinessScore: 76,
    improvedScore: 89,
    scoreBreakdown: [
      {
        label: "Completeness",
        baseline: 74,
        improved: 88,
        rationale: "Sustainability claims need evidence to carry more weight."
      },
      {
        label: "Context",
        baseline: 75,
        improved: 90,
        rationale: "Eco-minded daily-training scenarios become clearer after enrichment."
      },
      {
        label: "Persona Fit",
        baseline: 78,
        improved: 91,
        rationale: "The improved content calls out eco-minded shoppers directly."
      },
      {
        label: "Trust Signals",
        baseline: 67,
        improved: 84,
        rationale: "Evidence-backed sustainability reduces skepticism."
      }
    ],
    enriched: {
      aiSummary:
        "Balanced daily trainer for eco-minded runners who want a versatile neutral shoe for humid-climate training, with sustainability signals that support responsible purchase decisions.",
      personas: ["eco-minded runner", "daily trainer buyer"],
      useCases: ["daily training", "easy miles", "sustainable shopping"],
      strengths: ["recycled upper", "balanced ride", "versatile positioning"],
      tradeoffs: [
        "Needs clearer certification support for sustainability claims",
        "Not as specialized for race pace as performance trainers"
      ],
      proofPoints: [
        "Recycled upper supports sustainability positioning",
        "Daily trainer setup supports broad use-case fit"
      ],
      machineTags: [
        "sustainability:yes",
        "climate:humid",
        "fit:neutral",
        "use-case:daily-training"
      ],
      recommendationReasons: [
        "Strong match for sustainability-led buyer intent",
        "Versatile enough for repeated daily use",
        "Balanced performance story avoids overclaiming"
      ],
      missingSignals: ["certification evidence"]
    }
  }
];
