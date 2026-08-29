import { NextResponse } from "next/server";
import { parseShoppingIntent, rankProductsForQuery, runBenchmark } from "@/lib/scoring";
import { getWorkspace } from "@/lib/server-store";
import type { RecommendationMode } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { query?: string; mode?: RecommendationMode };
  const workspace = await getWorkspace();
  const query = body.query?.trim() || workspace.query;
  const mode = body.mode === "baseline" ? "baseline" : "improved";
  const results = rankProductsForQuery(workspace.products, query, mode);

  return NextResponse.json({
    query,
    intent: parseShoppingIntent(query),
    results,
    benchmark: runBenchmark(workspace.products),
    evaluatedAt: new Date().toISOString()
  });
}
