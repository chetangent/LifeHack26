export type RecommendationMode = "baseline" | "improved";

export type ScoreDimension = {
  label: string;
  baseline: number;
  improved: number;
  rationale: string;
};

export type ScenarioResult = {
  query: string;
  matched: boolean;
  confidence: number;
  reason: string;
};

export type EnrichedContent = {
  aiSummary: string;
  personas: string[];
  useCases: string[];
  strengths: string[];
  tradeoffs: string[];
  proofPoints: string[];
  machineTags: string[];
  recommendationReasons: string[];
  missingSignals: string[];
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  price: string;
  climate: string;
  fit: string;
  cushioning: string;
  category: string;
  rawDescription: string;
  rawBullets: string[];
  sourceSignals: string[];
  gaps: string[];
  readinessScore: number;
  improvedScore: number;
  scoreBreakdown: ScoreDimension[];
  enriched: EnrichedContent;
};

export type CatalogSummary = {
  averageScore: number;
  improvedAverageScore: number;
  highReadinessCount: number;
  averageGapCount: number;
  topGap: string;
  category: string;
};

export type ParsedCatalogRow = {
  name: string;
  price: string;
  description: string;
  features: string[];
};

export type OptimizationMeta = {
  provider: "openai" | "fallback";
  model?: string;
  explanation: string;
};
