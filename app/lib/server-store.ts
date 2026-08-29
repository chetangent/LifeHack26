import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { products as seedProducts } from "@/data/products";
import type { OptimizationMeta, OptimizationRun, Product, WorkspaceState } from "@/lib/types";

const dataDirectory = resolve(process.env.AGENTSHELF_DATA_DIR ?? join(process.cwd(), ".agentshelf-data"));
const workspacePath = join(dataDirectory, "workspace.json");
let lastStorageMode: "supabase" | "local-file" = "local-file";

function createInitialWorkspace(): WorkspaceState {
  return {
    id: "demo-workspace",
    name: "Demo workspace",
    products: seedProducts,
    selectedId: seedProducts[0]?.id ?? "",
    csvText: "",
    status: "Loaded demo running catalog.",
    optimizedIds: [],
    optimizationMeta: {},
    optimizationRuns: [],
    query: "I'm training for a half marathon in Singapore's humid weather and need lightweight shoes under S$200.",
    updatedAt: new Date().toISOString()
  };
}

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders() {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
    "Content-Type": "application/json"
  };
}

async function readLocalWorkspace(): Promise<WorkspaceState> {
  try {
    const contents = await readFile(workspacePath, "utf8");
    const parsed = JSON.parse(contents) as WorkspaceState;
    if (Array.isArray(parsed.products) && Array.isArray(parsed.optimizedIds)) return parsed;
  } catch {
    // A first request creates the local store from the seeded demo workspace.
  }

  const initial = createInitialWorkspace();
  await writeWorkspace(initial);
  return initial;
}

async function readSupabaseWorkspace(): Promise<WorkspaceState | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  const response = await fetch(`${url}/rest/v1/agentshelf_workspaces?id=eq.demo-workspace&select=id,name,state,updated_at`, {
    headers: supabaseHeaders(),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Supabase workspace read failed with status ${response.status}`);
  const rows = (await response.json()) as Array<{ state?: WorkspaceState }>;
  return rows[0]?.state ?? null;
}

async function writeSupabaseWorkspace(workspace: WorkspaceState) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return;
  const response = await fetch(`${url}/rest/v1/agentshelf_workspaces`, {
    method: "POST",
    headers: { ...supabaseHeaders(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      id: workspace.id,
      name: workspace.name,
      state: workspace,
      updated_at: workspace.updatedAt
    })
  });
  if (!response.ok) throw new Error(`Supabase workspace write failed with status ${response.status}`);
}

async function readWorkspace(): Promise<WorkspaceState> {
  if (hasSupabaseConfig()) {
    try {
      const remote = await readSupabaseWorkspace();
      if (remote) {
        lastStorageMode = "supabase";
        return remote;
      }
      const initial = await readLocalWorkspace();
      await writeSupabaseWorkspace(initial);
      lastStorageMode = "supabase";
      return initial;
    } catch (error) {
      console.warn("Supabase workspace unavailable; using local development storage.", error);
      lastStorageMode = "local-file";
    }
  }
  lastStorageMode = "local-file";
  return readLocalWorkspace();
}

async function writeWorkspace(workspace: WorkspaceState) {
  if (hasSupabaseConfig()) {
    try {
      await writeSupabaseWorkspace(workspace);
      lastStorageMode = "supabase";
      return;
    } catch (error) {
      console.warn("Supabase workspace write unavailable; using local development storage.", error);
      lastStorageMode = "local-file";
    }
  }
  lastStorageMode = "local-file";
  await mkdir(dataDirectory, { recursive: true });
  const temporaryPath = `${workspacePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(workspace, null, 2), "utf8");
  await rename(temporaryPath, workspacePath);
}

export async function getWorkspace() {
  return readWorkspace();
}

export function getStorageMode() {
  return lastStorageMode;
}

export async function replaceWorkspace(input: Partial<WorkspaceState>) {
  const current = await readWorkspace();
  const next: WorkspaceState = {
    ...current,
    ...input,
    id: current.id,
    name: current.name,
    products: Array.isArray(input.products) && input.products.length > 0 ? input.products : current.products,
    optimizedIds: Array.isArray(input.optimizedIds) ? input.optimizedIds : current.optimizedIds,
    optimizationMeta: input.optimizationMeta ?? current.optimizationMeta,
    optimizationRuns: Array.isArray(input.optimizationRuns) ? input.optimizationRuns : current.optimizationRuns,
    updatedAt: new Date().toISOString()
  };
  await writeWorkspace(next);
  return next;
}

export async function updateWorkspace(mutator: (workspace: WorkspaceState) => WorkspaceState | Promise<WorkspaceState>) {
  const current = await readWorkspace();
  const next = { ...(await mutator(current)), updatedAt: new Date().toISOString() };
  await writeWorkspace(next);
  return next;
}

export async function recordOptimization(product: Product, meta: OptimizationMeta) {
  return updateWorkspace((workspace) => {
    const run: OptimizationRun = {
      id: randomUUID(),
      productId: product.id,
      provider: meta.provider,
      model: meta.model,
      baselineScore: product.readinessScore,
      improvedScore: product.improvedScore,
      createdAt: new Date().toISOString()
    };
    return {
      ...workspace,
      products: workspace.products.some((item) => item.id === product.id)
        ? workspace.products.map((item) => item.id === product.id ? product : item)
        : [...workspace.products, product],
      selectedId: product.id,
      optimizedIds: workspace.optimizedIds.includes(product.id) ? workspace.optimizedIds : [...workspace.optimizedIds, product.id],
      optimizationMeta: { ...workspace.optimizationMeta, [product.id]: meta },
      optimizationRuns: [run, ...workspace.optimizationRuns].slice(0, 50),
      status: meta.explanation
    };
  });
}

export async function resetWorkspace() {
  const initial = createInitialWorkspace();
  await writeWorkspace(initial);
  return initial;
}
