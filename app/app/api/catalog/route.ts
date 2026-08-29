import { NextResponse } from "next/server";
import { createProductFromRow, parseCatalogCsv, summarizeCatalog } from "@/lib/scoring";
import { getWorkspace, updateWorkspace } from "@/lib/server-store";

export const runtime = "nodejs";

export async function GET() {
  const workspace = await getWorkspace();
  return NextResponse.json({ workspace, summary: summarizeCatalog(workspace.products) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { csv?: string };
  const rows = parseCatalogCsv(body.csv ?? "");
  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV import needs at least one valid row with name, price, and description." }, { status: 400 });
  }

  const imported = rows.map(createProductFromRow);
  const weakest = [...imported].sort((left, right) => left.readinessScore - right.readinessScore)[0];
  const workspace = await updateWorkspace((current) => ({
    ...current,
    products: imported,
    selectedId: weakest?.id ?? imported[0]?.id ?? "",
    csvText: body.csv ?? "",
    optimizedIds: [],
    optimizationMeta: {},
    optimizationRuns: [],
    status: `Imported ${imported.length} products. The weakest SKU is selected for the next step.`
  }));

  return NextResponse.json({ workspace, summary: summarizeCatalog(workspace.products) });
}
