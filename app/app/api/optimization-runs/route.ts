import { NextResponse } from "next/server";
import { getWorkspace } from "@/lib/server-store";

export const runtime = "nodejs";

export async function GET() {
  const workspace = await getWorkspace();
  return NextResponse.json({ runs: workspace.optimizationRuns });
}
