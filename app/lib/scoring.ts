import type {
  BenchmarkResult,
  ClaimEvidence,
  CatalogSummary,
  EnrichedContent,
  OptimizationMeta,
  ParsedCatalogRow,
  Product,
  RecommendationMode,
  RankedRecommendation,
  ScenarioResult,
  ShoppingIntent
} from "@/lib/types";

const promptLibrary = [
  "I need lightweight running shoes for humid weather under S$200.",
  "I'm training for my first half marathon and need breathable daily trainers.",
  "What's the best value neutral shoe for hot climates?"
];

const benchmarkQueries = [
  { category: "Running shoes", query: "I'm training for a half marathon in Singapore's humid weather and need lightweight shoes under S$200." },
  { category: "Running shoes", query: "I need a supportive option for a beginner under S$180." },
  { category: "Running shoes", query: "Find a comfortable choice for a humid daily routine." },
  { category: "Skincare", query: "Find a sustainable skincare routine for sensitive skin under S$60." },
  { category: "Skincare", query: "I need a lightweight product for a tropical morning commute." },
  { category: "Audio gear", query: "Show me lightweight noise cancelling audio for commuting under S$160." },
  { category: "Audio gear", query: "I need comfortable audio for work calls and all-day listening." }
];

const intentSignalAliases: Record<string, string[]> = {
  "humid-climate fit": ["humid", "tropical", "hot", "breathable"],
  "lightweight signal": ["lightweight", "light weight", "mesh", "airy", "portable", "compact"],
  "long-distance use case": ["half", "long", "distance", "endurance", "marathon"],
  "beginner-friendly": ["beginner", "new runner", "entry", "first-time", "first"],
  "support signal": ["stable", "stability", "support"],
  "wide-fit signal": ["wide"],
  "comfort signal": ["soft", "comfort", "gentle", "comfortable"],
  "performance signal": ["responsive", "tempo", "speed", "noise cancelling", "focused"],
  "sustainable signal": ["sustainable", "recycled", "eco", "responsible"],
  "sensitive-skin signal": ["sensitive skin", "sensitive", "gentle", "barrier"],
  "commute signal": ["commute", "commuting", "travel", "portable"],
  "workday signal": ["work", "calls", "meeting", "all-day"]
};

export const scoreWeights = [
  { label: "Completeness", weight: 30 },
  { label: "Context", weight: 25 },
  { label: "Persona Fit", weight: 20 },
  { label: "Trust Signals", weight: 15 },
  { label: "Recommendation Clarity", weight: 10 }
] as const;

export function buildProductInsight(product: Product) {
  return {
    id: product.id,
    aiSummary: product.enriched.aiSummary,
    recommendationReasons: product.enriched.recommendationReasons,
    missingSignals: product.enriched.missingSignals
  };
}

export function summarizeCatalog(products: Product[]): CatalogSummary {
  if (products.length === 0) {
    return {
      averageScore: 0,
      improvedAverageScore: 0,
      highReadinessCount: 0,
      averageGapCount: 0,
      topGap: "No gaps",
      category: "Catalog"
    };
  }
  const averageScore = Math.round(
    products.reduce((total, product) => total + product.readinessScore, 0) /
      products.length
  );
  const improvedAverageScore = Math.round(
    products.reduce((total, product) => total + product.improvedScore, 0) /
      products.length
  );
  const highReadinessCount = products.filter(
    (product) => product.improvedScore >= 85
  ).length;
  const averageGapCount = Number(
    (
      products.reduce((total, product) => total + product.gaps.length, 0) /
      products.length
    ).toFixed(1)
  );
  const gapFrequency = new Map<string, number>();

  for (const product of products) {
    for (const gap of product.gaps) {
      gapFrequency.set(gap, (gapFrequency.get(gap) ?? 0) + 1);
    }
  }

  const topGap =
    [...gapFrequency.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ??
    "No gaps";

  return {
    averageScore,
    improvedAverageScore,
    highReadinessCount,
    averageGapCount,
    topGap,
    category: [...new Set(products.map((product) => product.category))].join(" · ") || "Catalog"
  };
}

export function parseShoppingIntent(query: string): ShoppingIntent {
  const normalized = query.toLowerCase();
  const budget = normalized.match(/(?:under|below|less than|max(?:imum)?(?: budget)?(?: of)?)\s*(?:s\$|\$)?\s*(\d+)/)?.[1];
  const category = /skincare|skin care|serum|cleanser|moisturizer|spf/.test(normalized)
    ? "Skincare"
    : /audio|headphone|earbud|speaker|noise cancelling/.test(normalized)
      ? "Audio gear"
      : /shoe|trainer|running|marathon|sneaker/.test(normalized)
        ? "Running shoes"
        : undefined;
  const signals = Object.entries(intentSignalAliases)
    .filter(([, aliases]) => aliases.some((alias) => normalized.includes(alias)))
    .map(([label]) => label);

  return {
    originalQuery: query,
    category,
    budgetMax: budget ? Number(budget) : undefined,
    signals
  };
}

export function rankProductsForQuery(
  products: Product[],
  query: string,
  mode: RecommendationMode = "improved"
): RankedRecommendation[] {
  const intent = parseShoppingIntent(query);
  const isImproved = mode === "improved";

  return products.map((product) => {
    const price = Number(product.price.replace(/[^\d.]/g, "")) || 0;
    const searchText = [
      product.name,
      product.category,
      product.rawDescription,
      ...product.rawBullets,
      product.climate,
      product.fit,
      product.cushioning,
      ...(isImproved ? product.enriched.personas : []),
      ...(isImproved ? product.enriched.useCases : []),
      ...(isImproved ? product.enriched.recommendationReasons : product.sourceSignals)
    ].join(" ").toLowerCase();
    const matchedSignals: string[] = [];
    const missingSignals: string[] = [];

    if (intent.budgetMax !== undefined) {
      if (price > 0 && price <= intent.budgetMax) matchedSignals.push(`under S$${intent.budgetMax}`);
      else missingSignals.push(`over S$${intent.budgetMax}`);
    }
    if (intent.category) {
      if (product.category.toLowerCase() === intent.category.toLowerCase()) matchedSignals.push(`${intent.category} category`);
      else missingSignals.push(`${intent.category} category`);
    }
    intent.signals.forEach((signal) => {
      const hasSignal = intentSignalAliases[signal].some((alias) => searchText.includes(alias));
      if (hasSignal) matchedSignals.push(signal);
      else missingSignals.push(signal);
    });

    const genericTokens = intent.originalQuery.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 4);
    const genericMatches = genericTokens.filter((token) => searchText.includes(token));
    if (genericMatches.length > 0 && matchedSignals.length === 0) {
      matchedSignals.push(`${genericMatches.length} catalog signal${genericMatches.length === 1 ? "" : "s"}`);
    }

    const rankScore = clamp(38 + matchedSignals.length * 13 - missingSignals.length * 9 + (isImproved ? 6 : 0), 18, 98);
    const topSignals = matchedSignals.slice(0, 4);
    const rationale = topSignals.length > 0
      ? `${product.name} is ranked on ${topSignals.join(", ")}. ${missingSignals.length > 0 ? `Watch-out: ${missingSignals[0]}.` : "No major query constraint is missing from the current profile."}`
      : `${product.name} has limited explicit evidence for this query, so the assistant should ask a follow-up question before recommending it.`;

    return { product, rankScore, matchedSignals: topSignals, missingSignals, rationale };
  }).sort((left, right) => right.rankScore - left.rankScore);
}

export function runBenchmark(products: Product[]): BenchmarkResult {
  const categories = new Set(products.map((product) => product.category));
  const relevantQueries = benchmarkQueries.filter((item) => categories.has(item.category));
  if (relevantQueries.length === 0) return { queriesEvaluated: 0, averageTopScore: 0, strongMatchRate: 0 };
  const topScores = relevantQueries.map((item) => rankProductsForQuery(products, item.query)[0]?.rankScore ?? 0);
  return {
    queriesEvaluated: relevantQueries.length,
    averageTopScore: Math.round(topScores.reduce((total, score) => total + score, 0) / topScores.length),
    strongMatchRate: Math.round((topScores.filter((score) => score >= 70).length / topScores.length) * 100)
  };
}

export function simulatePrompts(
  product: Product,
  mode: RecommendationMode
): ScenarioResult[] {
  return promptLibrary.map((query) => {
    const normalized = query.toLowerCase();
    const featureTerms =
      mode === "improved"
        ? [
            product.climate,
            product.fit,
            product.cushioning,
            ...product.enriched.personas,
            ...product.enriched.useCases,
            ...product.enriched.recommendationReasons
          ]
        : [product.climate, product.fit, ...product.sourceSignals];

    const matchedTerms = featureTerms.filter((term) =>
      normalized.includes(term.toLowerCase().split(" ")[0])
    );
    const gapPenalty = mode === "baseline" ? product.gaps.length * 7 : product.gaps.length * 2;
    const confidence = clamp(32 + matchedTerms.length * 13 - gapPenalty, 18, 96);
    const matched = confidence >= 60;

    return {
      query,
      matched,
      confidence,
      reason: matched
        ? buildWinReason(product, query, mode)
        : buildLossReason(product, query, mode)
    };
  });
}

export function scoreTone(score: number) {
  if (score >= 85) {
    return { className: "score-high", label: "Strong" };
  }

  if (score >= 70) {
    return { className: "score-mid", label: "Promising" };
  }

  return { className: "score-low", label: "Needs work" };
}

export function exportProductPayload(product: Product) {
  return {
    product_id: product.id,
    name: product.name,
    category: product.category,
    baseline_score: product.readinessScore,
    improved_score: product.improvedScore,
    source_content: {
      description: product.rawDescription,
      bullets: product.rawBullets
    },
    enriched_content: product.enriched,
    score_breakdown: product.scoreBreakdown,
    json_ld: buildProductJsonLd(product)
  };
}

export function buildProductJsonLd(product: Product) {
  const price = product.price.replace(/[^\d.]/g, "");
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    brand: { "@type": "Brand", name: product.brand },
    category: product.category,
    description: product.enriched.aiSummary,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: "SGD",
      availability: "https://schema.org/InStock"
    },
    additionalProperty: [
      ...product.enriched.machineTags.map((value) => ({ "@type": "PropertyValue", name: "AI tag", value })),
      ...product.enriched.personas.map((value) => ({ "@type": "PropertyValue", name: "Audience", value })),
      ...product.enriched.useCases.map((value) => ({ "@type": "PropertyValue", name: "Use case", value }))
    ]
  };
}

export function buildClaimEvidence(product: Product): ClaimEvidence[] {
  const source = product.rawDescription || product.rawBullets[0] || "Raw catalog input";
  return [
    ...product.enriched.proofPoints.slice(0, 3).map((claim) => ({ claim, source, status: "source-backed" as const })),
    ...product.enriched.recommendationReasons.slice(0, 2).map((claim) => ({ claim, source: "Enriched profile logic", status: "generated" as const }))
  ];
}

export function parseCatalogCsv(input: string): ParsedCatalogRow[] {
  const records = parseCsvRecords(input);

  if (records.length < 2) {
    return [];
  }

  const headers = records[0].map(normalizeCsvHeader);
  const columnIndex = (aliases: string[], fallback: number) => {
    const match = aliases
      .map((alias) => headers.indexOf(alias))
      .find((index) => index >= 0);
    return match ?? fallback;
  };
  const nameIndex = columnIndex(["name", "product name", "title"], 0);
  const priceIndex = columnIndex(["price", "product price"], 1);
  const descriptionIndex = columnIndex(["description", "product description", "details", "summary"], 2);
  const featuresIndex = columnIndex(["features", "feature", "attributes", "materials"], 3);
  const categoryIndex = columnIndex(["category", "product category", "department"], 4);

  return records
    .slice(1)
    .map((columns) => ({
      name: columns[nameIndex]?.trim() ?? "",
      price: columns[priceIndex]?.trim() ?? "",
      description: columns[descriptionIndex]?.trim() ?? "",
      features: splitFeatureValue(columns[featuresIndex] ?? ""),
      category: columns[categoryIndex]?.trim() || undefined
    }))
    .filter((row) => Boolean(row.name && row.price && row.description));
}

export function createProductFromRow(row: ParsedCatalogRow, index: number): Product {
  const description = row.description.toLowerCase();
  const priceValue = Number(row.price.replace(/[^\d.]/g, "")) || 0;
  const category = row.category?.trim() || inferCategory(`${row.name} ${row.description} ${row.features.join(" ")}`);
  const climate =
    description.includes("humid") || description.includes("breathable")
      ? "humid"
      : description.includes("hot")
        ? "hot"
        : "mixed";
  const fit =
    description.includes("stability") || description.includes("support")
      ? "stable"
      : description.includes("wide")
        ? "wide-friendly"
        : "neutral";
  const cushioning = description.includes("soft")
    ? "soft"
    : description.includes("responsive") || description.includes("fast")
      ? "responsive"
      : "moderate";
  const personas = derivePersonas(description, fit, priceValue, category);
  const useCases = deriveUseCases(description, climate, category);
  const strengths = deriveStrengths(row.features, description, priceValue);
  const gaps = deriveGaps(description, row.features);
  const readinessScore = clamp(52 + strengths.length * 4 - gaps.length * 5, 42, 80);
  const improvedScore = clamp(readinessScore + 18, 68, 93);

  return {
    id: `UP-${String(index + 1).padStart(3, "0")}`,
    name: row.name,
    brand: row.name.split(" ")[0] || "Uploaded",
    price: row.price,
    climate,
    fit,
    cushioning,
    category,
    rawDescription: row.description,
    rawBullets: row.features,
    sourceSignals: strengths.slice(0, 3),
    gaps,
    readinessScore,
    improvedScore,
    scoreBreakdown: [
      {
        label: "Completeness",
        baseline: clamp(readinessScore - 5, 40, 90),
        improved: clamp(improvedScore - 2, 55, 96),
        rationale:
          "Uploaded products often miss explicit decision signals like climate, buyer type, and tradeoffs."
      },
      {
        label: "Context",
        baseline: clamp(readinessScore - 2, 42, 90),
        improved: clamp(improvedScore + 1, 60, 96),
        rationale:
          "Enrichment adds context that helps AI match the product to real shopper intent."
      },
      {
        label: "Persona Fit",
        baseline: clamp(readinessScore - 3, 40, 90),
        improved: clamp(improvedScore, 58, 96),
        rationale: "Explicit personas make the product easier to recommend safely."
      },
      {
        label: "Trust Signals",
        baseline: clamp(readinessScore - 8, 35, 86),
        improved: clamp(improvedScore - 4, 50, 92),
        rationale:
          "Source-backed proof points and clearer claims improve recommendation confidence."
      }
    ],
    enriched: {
      aiSummary: buildAiSummary(category, cushioning, fit, personas, useCases, row.price, row.description),
      personas,
      useCases,
      strengths,
      tradeoffs: deriveTradeoffs(fit, cushioning, priceValue),
      proofPoints: strengths.map((strength) => `Source signal: ${strength}`),
      machineTags: [
        `climate:${climate}`,
        `fit:${fit}`,
        `budget:${priceValue <= 180 ? "entry-mid" : "mid-premium"}`,
        `cushioning:${cushioning}`
      ],
      recommendationReasons: [
        `Clear fit for ${personas[0]}`,
        `Aligned to ${useCases[0]}`,
        priceValue <= 180
          ? "Works for budget-conscious shoppers"
          : "Supports a more premium positioning"
      ],
      missingSignals: gaps
    }
  };
}

export function buildFallbackProductFromProduct(product: Product): Product {
  const derived = createProductFromRow(
    {
      name: product.name,
      price: product.price,
      description: product.rawDescription,
      features: product.rawBullets,
      category: product.category
    },
    0
  );

  const fallbackEnriched =
    product.enriched.personas.length > 0 ? product.enriched : derived.enriched;

  return applyEnrichmentToProduct(
    {
      ...product,
      climate: product.climate || derived.climate,
      fit: product.fit || derived.fit,
      cushioning: product.cushioning || derived.cushioning,
      sourceSignals:
        product.sourceSignals.length > 0 ? product.sourceSignals : derived.sourceSignals,
      gaps: product.gaps.length > 0 ? product.gaps : derived.gaps,
      readinessScore: product.readinessScore || derived.readinessScore
    },
    fallbackEnriched
  );
}

export function applyEnrichmentToProduct(
  product: Product,
  enriched: EnrichedContent
): Product {
  const scoreBreakdown = buildScoreBreakdown(product, enriched);
  const improvedScore = calculateWeightedScore(scoreBreakdown);

  return {
    ...product,
    improvedScore,
    scoreBreakdown,
    enriched
  };
}

export function normalizeEnrichment(raw: Partial<EnrichedContent>, product: Product): EnrichedContent {
  return {
    aiSummary: raw.aiSummary?.trim() || product.enriched.aiSummary,
    personas: sanitizeList(raw.personas, product.enriched.personas),
    useCases: sanitizeList(raw.useCases, product.enriched.useCases),
    strengths: sanitizeList(raw.strengths, product.enriched.strengths),
    tradeoffs: sanitizeList(raw.tradeoffs, product.enriched.tradeoffs),
    proofPoints: sanitizeList(raw.proofPoints, product.enriched.proofPoints),
    machineTags: sanitizeList(raw.machineTags, product.enriched.machineTags),
    recommendationReasons: sanitizeList(
      raw.recommendationReasons,
      product.enriched.recommendationReasons
    ),
    missingSignals: sanitizeList(raw.missingSignals, product.gaps)
  };
}

export function buildOptimizationMeta(
  provider: OptimizationMeta["provider"],
  explanation: string,
  model?: string
): OptimizationMeta {
  return { provider, explanation, model };
}

function derivePersonas(description: string, fit: string, priceValue: number, category: string) {
  const personas = [];

  if (!category.toLowerCase().includes("running") && !category.toLowerCase().includes("shoe")) {
    if (description.includes("beginner") || description.includes("daily") || description.includes("easy")) personas.push("first-time buyer");
    if (description.includes("sensitive") || description.includes("gentle")) personas.push("careful chooser");
    if (description.includes("commute") || description.includes("portable")) personas.push("on-the-go shopper");
    if (priceValue <= 180) personas.push("value shopper");
    return unique(personas.length > 0 ? personas : ["practical shopper", "research-led buyer"]);
  }

  if (description.includes("beginner") || description.includes("daily")) {
    personas.push("beginner runner");
  }

  if (fit === "stable") {
    personas.push("support-seeking runner");
  }

  if (fit === "wide-friendly") {
    personas.push("wide-foot runner");
  }

  if (priceValue <= 180) {
    personas.push("budget-conscious runner");
  }

  if (description.includes("tempo") || description.includes("fast")) {
    personas.push("speed-curious runner");
  }

  return unique(personas.length > 0 ? personas : ["daily trainer buyer", "value shopper"]);
}

function buildScoreBreakdown(
  product: Product,
  enriched: EnrichedContent
): {
  label: (typeof scoreWeights)[number]["label"];
  baseline: number;
  improved: number;
  rationale: string;
}[] {
  const gapPenalty = enriched.missingSignals.length * 4;
  const completenessImproved = clamp(
    48 + product.rawBullets.length * 6 + enriched.machineTags.length * 4 - gapPenalty,
    45,
    96
  );
  const contextImproved = clamp(
    44 +
      enriched.useCases.length * 9 +
      (enriched.aiSummary.toLowerCase().includes(product.climate) ? 8 : 0) -
      gapPenalty,
    42,
    96
  );
  const personaImproved = clamp(
    46 + enriched.personas.length * 11 - Math.max(0, enriched.missingSignals.length - 1) * 4,
    45,
    96
  );
  const trustImproved = clamp(
    42 + enriched.proofPoints.length * 12 - gapPenalty,
    38,
    94
  );
  const clarityImproved = clamp(
    50 + enriched.recommendationReasons.length * 10 + enriched.tradeoffs.length * 5 - gapPenalty,
    45,
    96
  );

  return [
    {
      label: "Completeness",
      baseline: clamp(product.readinessScore - 8, 40, 90),
      improved: completenessImproved,
      rationale:
        "Measures whether the product exposes enough machine-readable facts, attributes, and decision signals."
    },
    {
      label: "Context",
      baseline: clamp(product.readinessScore - 4, 42, 90),
      improved: contextImproved,
      rationale:
        "Rewards concrete shopper context such as climate, goals, budget, and use-case fit."
    },
    {
      label: "Persona Fit",
      baseline: clamp(product.readinessScore - 5, 40, 90),
      improved: personaImproved,
      rationale:
        "Checks whether an AI assistant can tell who this product is best for and when not to recommend it."
    },
    {
      label: "Trust Signals",
      baseline: clamp(product.readinessScore - 10, 35, 86),
      improved: trustImproved,
      rationale:
        "Improves when claims are supported by proof points instead of only marketing language."
    },
    {
      label: "Recommendation Clarity",
      baseline: clamp(product.readinessScore - 6, 38, 90),
      improved: clarityImproved,
      rationale:
        "Captures how clearly the listing explains why this SKU wins, plus key tradeoffs and guardrails."
    }
  ];
}

function calculateWeightedScore(
  dimensions: { label: (typeof scoreWeights)[number]["label"]; improved: number }[]
) {
  const weightByLabel = new Map(scoreWeights.map((item) => [item.label, item.weight]));
  const weightedTotal = dimensions.reduce((total, dimension) => {
    const weight = weightByLabel.get(dimension.label) ?? 0;
    return total + dimension.improved * weight;
  }, 0);

  return clamp(Math.round(weightedTotal / 100), 55, 96);
}

function sanitizeList(values: string[] | undefined, fallback: string[]) {
  if (!values || values.length === 0) {
    return fallback;
  }

  return unique(
    values
      .map((value) => value.trim())
      .filter(Boolean)
  ).slice(0, 6);
}

function deriveUseCases(description: string, climate: string, category: string) {
  const useCases = [];

  if (!category.toLowerCase().includes("running") && !category.toLowerCase().includes("shoe")) {
    if (description.includes("commute") || description.includes("travel")) useCases.push("commuting and travel");
    if (description.includes("sensitive") || description.includes("gentle")) useCases.push("sensitive-skin routines");
    if (description.includes("work") || description.includes("meeting")) useCases.push("workday use");
    useCases.push(description.includes("daily") ? "daily use" : "considered purchase");
    return unique(useCases);
  }

  if (description.includes("half marathon") || description.includes("long")) {
    useCases.push("half-marathon prep");
  }

  if (description.includes("tempo") || description.includes("fast")) {
    useCases.push("tempo sessions");
  } else {
    useCases.push("daily training");
  }

  useCases.push(`${climate} weather`);

  if (description.includes("walk")) {
    useCases.push("walk-run programs");
  }

  return unique(useCases);
}

function deriveStrengths(features: string[], description: string, priceValue: number) {
  const strengths = [...features];

  if (description.includes("breathable") || description.includes("mesh")) {
    strengths.push("breathable upper");
  }

  if (description.includes("lightweight")) {
    strengths.push("lightweight build");
  }

  if (priceValue <= 180) {
    strengths.push("strong value positioning");
  }

  return unique(strengths).slice(0, 4);
}

function deriveGaps(description: string, features: string[]) {
  const text = `${description} ${features.join(" ")}`.toLowerCase();
  const gaps = [];

  if (!text.includes("humid") && !text.includes("hot") && !text.includes("breathable")) {
    gaps.push("climate suitability");
  }

  if (!text.includes("beginner") && !text.includes("runner")) {
    gaps.push("persona guidance");
  }

  if (!text.includes("compare") && !text.includes("versus")) {
    gaps.push("comparison framing");
  }

  if (!text.includes("because") && !text.includes("best for")) {
    gaps.push("recommendation reasoning");
  }

  return gaps;
}

function deriveTradeoffs(fit: string, cushioning: string, priceValue: number) {
  const tradeoffs = [];

  if (fit === "stable") {
    tradeoffs.push("Feels less free-flowing than neutral trainers");
  }

  if (cushioning === "responsive") {
    tradeoffs.push("Less forgiving than soft recovery shoes");
  }

  if (priceValue > 180) {
    tradeoffs.push("May not fit budget-first shoppers");
  } else {
    tradeoffs.push("Less premium cushioning than higher-end models");
  }

  return unique(tradeoffs);
}

function inferCategory(text: string) {
  const normalized = text.toLowerCase();
  if (/shoe|trainer|running|sneaker|mesh upper/.test(normalized)) return "Running shoes";
  if (/skin|serum|cleanser|moistur|spf|cream/.test(normalized)) return "Skincare";
  if (/headphone|earbud|speaker|audio|noise cancel/.test(normalized)) return "Audio gear";
  return "General merchandise";
}

function buildAiSummary(category: string, cushioning: string, fit: string, personas: string[], useCases: string[], price: string, description: string) {
  if (category.toLowerCase().includes("running") || category.toLowerCase().includes("shoe")) {
    return `${capitalize(cushioning)} ${fit} running shoe for ${useCases[0]} at ${price}, shaped for ${personas[0]}.`;
  }
  return `${category} for ${personas[0]}, positioned for ${useCases[0]} at ${price}. Source description: ${description}`;
}

function buildWinReason(product: Product, query: string, mode: RecommendationMode) {
  if (mode === "improved") {
    return `${product.name} matches ${query.toLowerCase().includes("humid") ? "climate" : "intent"} because the enriched profile includes explicit personas, use cases, and recommendation logic.`;
  }

  return `${product.name} still matches some core signals, but only through limited raw attributes.`;
}

function buildLossReason(product: Product, query: string, mode: RecommendationMode) {
  if (mode === "baseline") {
    return `${product.name} lacks enough explicit signals for "${query}" because the raw catalog copy does not expose the right decision context.`;
  }

  return `${product.name} improved, but still needs ${product.enriched.missingSignals[0] ?? "stronger evidence"} to win more confidently.`;
}

function parseCsvRecords(input: string) {
  const records: string[][] = [];
  const source = input.replace(/^\uFEFF/, "");
  let record: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (char === '"') {
      if (inQuotes && source[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      record.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      record.push(current.trim());
      current = "";
      if (record.some(Boolean)) records.push(record);
      record = [];
      continue;
    }

    current += char;
  }

  if (inQuotes) return [];

  if (current.length > 0 || record.length > 0) {
    record.push(current.trim());
    if (record.some(Boolean)) records.push(record);
  }

  return records;
}

function normalizeCsvHeader(value: string) {
  return value.toLowerCase().replace(/[\s_-]+/g, " ").trim();
}

function splitFeatureValue(value: string) {
  return value
    .split(/\s*[|;]\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}
