import { NextResponse } from "next/server";
import { getStorageMode, getWorkspace, replaceWorkspace, resetWorkspace } from "@/lib/server-store";
import type { WorkspaceState } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ workspace: await getWorkspace(), storage: getStorageMode() });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Partial<WorkspaceState>;
  if (body.products !== undefined && (!Array.isArray(body.products) || body.products.length === 0)) {
    return NextResponse.json({ error: "Workspace products must be a non-empty array." }, { status: 400 });
  }
  return NextResponse.json({ workspace: await replaceWorkspace(body), storage: getStorageMode() });
}

export async function DELETE() {
  return NextResponse.json({ workspace: await resetWorkspace(), storage: getStorageMode() });
}
