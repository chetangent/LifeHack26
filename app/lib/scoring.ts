import type {
  CatalogSummary,
  EnrichedContent,
  OptimizationMeta,
  ParsedCatalogRow,
  Product,
  RecommendationMode,
  ScenarioResult
} from "@/lib/types";

const promptLibrary = [
  "I need lightweight running shoes for humid weather under S$200.",
  "I'm training for my first half marathon and need breathable daily trainers.",
  "What's the best value neutral shoe for hot climates?"
];

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
    category: "Running shoes"
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
    score_breakdown: product.scoreBreakdown
  };
}

export function parseCatalogCsv(input: string): ParsedCatalogRow[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  return lines
    .slice(1)
    .map((row) => splitCsvRow(row))
    .filter((columns) => columns.length >= 3)
    .map((columns) => ({
      name: columns[0],
      price: columns[1],
      description: columns[2],
      features: columns[3] ? columns[3].split("|").map((item) => item.trim()).filter(Boolean) : []
    }));
}

export function createProductFromRow(row: ParsedCatalogRow, index: number): Product {
  const description = row.description.toLowerCase();
  const priceValue = Number(row.price.replace(/[^\d.]/g, "")) || 0;
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
  const personas = derivePersonas(description, fit, priceValue);
  const useCases = deriveUseCases(description, climate);
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
    category: "Running shoes",
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
      aiSummary: `${capitalize(cushioning)} ${fit} running shoe for ${useCases[0]} with ${climate}-climate positioning at ${row.price}.`,
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
      features: product.rawBullets
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

function derivePersonas(description: string, fit: string, priceValue: number) {
  const personas = [];

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

function deriveUseCases(description: string, climate: string) {
  const useCases = [];

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

function splitCsvRow(row: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of row) {
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());

  return result;
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
