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

export type RankedRecommendation = {
  product: Product;
  rankScore: number;
  matchedSignals: string[];
  missingSignals: string[];
  rationale: string;
};

export type ShoppingIntent = {
  originalQuery: string;
  category?: string;
  budgetMax?: number;
  signals: string[];
};

export type BenchmarkResult = {
  queriesEvaluated: number;
  averageTopScore: number;
  strongMatchRate: number;
};

export type ClaimEvidence = {
  claim: string;
  source: string;
  status: "source-backed" | "generated";
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
  category?: string;
};

export type OptimizationMeta = {
  provider: "openai" | "fallback";
  model?: string;
  explanation: string;
};

export type OptimizationRun = {
  id: string;
  productId: string;
  provider: OptimizationMeta["provider"];
  model?: string;
  baselineScore: number;
  improvedScore: number;
  createdAt: string;
};

export type WorkspaceState = {
  id: string;
  name: string;
  products: Product[];
  selectedId: string;
  csvText: string;
  status: string;
  optimizedIds: string[];
  optimizationMeta: Record<string, OptimizationMeta>;
  optimizationRuns: OptimizationRun[];
  query: string;
  updatedAt: string;
};
