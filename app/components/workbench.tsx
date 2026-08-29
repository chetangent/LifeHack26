"use client";

import Link from "next/link";
import { ChangeEvent, startTransition, useEffect, useMemo, useRef, useState } from "react";
import type { BenchmarkResult, OptimizationMeta, ParsedCatalogRow, Product, RankedRecommendation, ShoppingIntent, WorkspaceState } from "@/lib/types";
import {
  buildClaimEvidence,
  exportProductPayload,
  parseCatalogCsv,
  parseShoppingIntent,
  rankProductsForQuery,
  runBenchmark,
  scoreTone,
  scoreWeights,
  simulatePrompts,
  summarizeCatalog
} from "@/lib/scoring";

type WorkbenchProps = {
  initialProducts: Product[];
  view: "catalog" | "optimize" | "evidence";
};

const sampleCsv = `name,price,description,features
"PulseRoad Breeze","S$168","Breathable daily trainer for beginner runners in humid weather","engineered mesh|foam midsole|rubber outsole"
"PacePilot Shift","S$188","Responsive shoe for faster sessions and hot climate training","open mesh|responsive foam|road grip"
"WideWay Start","S$138","Comfortable wide running shoe for walk run beginners","wide toe box|foam ride|textile upper"`;

const sampleCatalogs = [
  { label: "Running shoes", csv: sampleCsv },
  { label: "Skincare", csv: "name,price,description,features,category\nCalmCurrent Serum,S$42,\"Gentle barrier serum for sensitive skin and humid daily routines\",\"ceramides|fragrance-free|lightweight texture\",Skincare\nSunveil Daily SPF,S$28,\"Lightweight daily sunscreen for tropical commutes with a non-greasy finish\",\"SPF 50|water resistant|no white cast\",Skincare\nNightHarbor Cream,S$58,\"Rich moisturizer for dry skin and overnight recovery\",\"peptides|shea butter|overnight comfort\",Skincare" },
  { label: "Audio gear", csv: "name,price,description,features,category\nMetroQuiet Buds,S$149,\"Compact noise cancelling earbuds for daily commutes and travel\",\"active noise cancellation|portable case|long battery\",Audio gear\nOpenAir Go,S$99,\"Lightweight open earbuds for work calls and all-day listening\",\"open fit|clear microphones|comfortable\",Audio gear\nStudioArc Pro,S$249,\"Premium over-ear headphones for focused work and detailed listening\",\"noise cancellation|rich sound|memory foam\",Audio gear" }
] as const;

const EXAMPLE_QUERY = "I'm training for a half marathon in Singapore's humid weather and need lightweight shoes under S$200.";
const DEFAULT_QUERY = "";
const EMPTY_CATALOG_STATUS = "No catalog loaded yet. Import a CSV to get started.";
const SESSION_STARTED_KEY = "agentshelf-session-started";

const workflowSteps = [
  { id: "catalog", label: "Import", href: "/catalog" },
  { id: "optimize", label: "Optimize", href: "/optimize" },
  { id: "evidence", label: "Prove", href: "/evidence" }
] as const;

export function Workbench({ initialProducts, view }: WorkbenchProps) {
  const initialWeakestProduct = useMemo(
    () => [...initialProducts].sort((left, right) => left.readinessScore - right.readinessScore)[0] ?? null,
    [initialProducts]
  );
  const [products, setProducts] = useState(initialProducts);
  const [selectedId, setSelectedId] = useState(initialWeakestProduct?.id ?? "");
  const [csvText, setCsvText] = useState("");
  const [status, setStatus] = useState(EMPTY_CATALOG_STATUS);
  const [optimizedIds, setOptimizedIds] = useState<string[]>([]);
  const [optimizationMeta, setOptimizationMeta] = useState<Record<string, OptimizationMeta>>({});
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let isNewSession = false;
    try {
      isNewSession = window.sessionStorage.getItem(SESSION_STARTED_KEY) !== "true";
    } catch {
      // If browser storage is unavailable, keep the workspace usable without session tracking.
    }

    const workspaceRequest = isNewSession
      ? fetch("/api/workspace", { method: "DELETE" })
      : fetch("/api/workspace");

    workspaceRequest
      .then((response) => {
        if (!response.ok) throw new Error(`Workspace request failed with status ${response.status}`);
        if (isNewSession) {
          try {
            window.sessionStorage.setItem(SESSION_STARTED_KEY, "true");
          } catch {
            // Continue without session tracking if browser storage is unavailable.
          }
        }
        return response.json() as Promise<{ workspace: WorkspaceState }>;
      })
      .then(({ workspace }) => {
        if (cancelled) return;
        if (workspace.products.length > 0) setProducts(workspace.products);
        setSelectedId(workspace.selectedId);
        setCsvText(workspace.csvText);
        setStatus(workspace.status);
        setOptimizedIds(workspace.optimizedIds);
        setOptimizationMeta(workspace.optimizationMeta);
        setQuery(workspace.query === EXAMPLE_QUERY ? DEFAULT_QUERY : workspace.query);
      })
      .catch((error) => {
        if (!cancelled) setStatus(error instanceof Error ? `${error.message}. Using the local demo state.` : "Workspace request failed. Using the local demo state.");
      })
      .finally(() => {
        if (!cancelled) setWorkspaceReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!workspaceReady) return;
    const timeout = window.setTimeout(() => {
      const workspaceUpdate: Partial<WorkspaceState> = {
        selectedId,
        csvText,
        status,
        optimizedIds,
        optimizationMeta,
        query
      };
      if (products.length > 0) workspaceUpdate.products = products;
      fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workspaceUpdate)
      }).catch(() => {
        // The next state change retries the save; the UI remains usable offline.
      });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [workspaceReady, products, selectedId, csvText, status, optimizedIds, optimizationMeta, query]);

  const summary = useMemo(() => summarizeCatalog(products), [products]);
  const csvPreview = useMemo(() => parseCatalogCsv(csvText), [csvText]);
  const sortedProducts = useMemo(
    () => [...products].sort((left, right) => left.readinessScore - right.readinessScore),
    [products]
  );
  const selectedProduct = products.find((product) => product.id === selectedId) ?? products[0] ?? null;
  const weakestProduct = sortedProducts[0] ?? null;

  async function handleCsvImport() {
    if (!csvText.trim()) {
      setStatus("CSV import needs at least one valid row with name, price, and description.");
      return;
    }

    setStatus("Importing catalog into the server workspace...");
    try {
      const response = await fetch("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText })
      });
      const result = (await response.json()) as { workspace?: WorkspaceState; error?: string };
      if (!response.ok || !result.workspace) throw new Error(result.error ?? "Catalog import failed.");
      startTransition(() => {
        setProducts(result.workspace!.products);
        setSelectedId(result.workspace!.selectedId);
        setOptimizedIds([]);
        setOptimizationMeta({});
        setStatus(result.workspace!.status);
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Catalog import failed unexpectedly.");
    }
  }

  function handleLoadSample(csv: string, label: string) {
    setCsvText(csv);
    setStatus(`${label} sample loaded. Import it to test cross-category recommendations.`);
  }

  async function handleClearCatalog() {
    setIsClearing(true);
    try {
      const response = await fetch("/api/workspace", { method: "DELETE" });
      const result = (await response.json()) as { workspace?: WorkspaceState; error?: string };
      if (!response.ok || !result.workspace) throw new Error(result.error ?? "Catalog could not be cleared.");
      setProducts([]);
      setSelectedId("");
      setCsvText("");
      setOptimizedIds([]);
      setOptimizationMeta({});
      setQuery(DEFAULT_QUERY);
      setStatus(result.workspace.status);
      setShowClearConfirmation(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Catalog could not be cleared.");
    } finally {
      setIsClearing(false);
    }
  }

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      setCsvText(text);
      setStatus(`Loaded ${file.name}. Review or import when ready.`);
    });
  }

  function handleExport() {
    if (!selectedProduct) return;
    const payload = exportProductPayload(selectedProduct);
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedProduct.id.toLowerCase()}-agentshelf.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus(`Exported ${selectedProduct.name} with AI-ready JSON and JSON-LD.`);
  }

  async function handleOptimizeSelected() {
    if (!selectedProduct) return;

    setIsOptimizing(true);
    setStatus(`Optimizing ${selectedProduct.name} for AI recommendation...`);

    try {
      const response = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: selectedProduct })
      });
      if (!response.ok) throw new Error(`Optimization failed with status ${response.status}`);

      const result = (await response.json()) as { product: Product; meta: OptimizationMeta };
      setProducts((current) => current.map((product) => product.id === selectedProduct.id ? result.product : product));
      setOptimizedIds((current) => current.includes(selectedProduct.id) ? current : [...current, selectedProduct.id]);
      setOptimizationMeta((current) => ({ ...current, [selectedProduct.id]: result.meta }));
      setStatus(result.meta.explanation);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Optimization failed unexpectedly.");
    } finally {
      setIsOptimizing(false);
    }
  }

  function handleFocusWeakest() {
    if (!weakestProduct) return;
    setSelectedId(weakestProduct.id);
    setStatus(`Focused ${weakestProduct.name}, the weakest SKU in this catalog.`);
  }

  if (!workspaceReady) {
    return <div className={`workbench workbench-${view}`}><WorkflowSteps active={view} optimizedIds={optimizedIds} products={products} /><LoadingWorkspaceState /></div>;
  }

  if (!selectedProduct && view !== "catalog") {
    return <div className={`workbench workbench-${view}`}><WorkflowSteps active={view} optimizedIds={optimizedIds} products={products} /><EmptyCatalogState view={view} /></div>;
  }

  const baselinePrompts = selectedProduct ? simulatePrompts(selectedProduct, "baseline") : [];
  const improvedPrompts = selectedProduct ? simulatePrompts(selectedProduct, "improved") : [];
  const isOptimized = selectedProduct ? optimizedIds.includes(selectedProduct.id) : false;
  const suggestedFixes = selectedProduct ? recommendFixes(selectedProduct) : [];
  const scoreDelta = selectedProduct ? selectedProduct.improvedScore - selectedProduct.readinessScore : 0;
  const simulatedWinDelta = improvedPrompts.filter((prompt) => prompt.matched).length - baselinePrompts.filter((prompt) => prompt.matched).length;

  return (
    <div className={`workbench workbench-${view}`}>
      <WorkflowSteps active={view} optimizedIds={optimizedIds} products={products} />
      {view === "catalog" ? (
        <>
          <CatalogView
            csvText={csvText}
            previewRows={csvPreview}
            handleCsvImport={handleCsvImport}
            handleFileUpload={handleFileUpload}
            handleFocusWeakest={handleFocusWeakest}
            onCsvChange={setCsvText}
            onLoadSample={handleLoadSample}
            onResetCsv={() => setCsvText("")}
            handleClearCatalog={handleClearCatalog}
            isClearing={isClearing}
            onCancelClear={() => setShowClearConfirmation(false)}
            onRequestClear={() => setShowClearConfirmation(true)}
            onSelectProduct={setSelectedId}
            products={sortedProducts}
            selectedProduct={selectedProduct}
            showClearConfirmation={showClearConfirmation}
            status={status}
            summary={summary}
            weakestProduct={weakestProduct}
          />
          {products.length > 0 ? <CatalogDestinations /> : null}
        </>
      ) : view === "optimize" ? (
        <OptimizeView
          handleExport={handleExport}
          handleOptimizeSelected={handleOptimizeSelected}
          isOptimized={isOptimized}
          isOptimizing={isOptimizing}
          onSelectProduct={setSelectedId}
          products={sortedProducts}
          scoreDelta={scoreDelta}
          selectedProduct={selectedProduct}
          status={status}
          suggestedFixes={suggestedFixes}
          optimizationMeta={optimizationMeta[selectedProduct.id]}
        />
      ) : (
        <>
          <EvidenceView
            baselinePrompts={baselinePrompts}
            handleExport={handleExport}
            handleOptimizeSelected={handleOptimizeSelected}
            improvedPrompts={improvedPrompts}
            isOptimized={isOptimized}
            onSelectProduct={setSelectedId}
            products={sortedProducts}
            scoreDelta={scoreDelta}
            selectedProduct={selectedProduct}
            simulatedWinDelta={simulatedWinDelta}
            status={status}
            optimizationMeta={optimizationMeta[selectedProduct.id]}
          />
          <IntentQueryLab products={products} query={query} onQueryChange={setQuery} />
        </>
      )}
    </div>
  );
}

function WorkflowSteps({ active, optimizedIds, products }: { active: WorkbenchProps["view"]; optimizedIds: string[]; products: Product[] }) {
  const activeIndex = workflowSteps.findIndex((step) => step.id === active);
  const completion = {
    catalog: products.length > 0,
    optimize: optimizedIds.length > 0,
    evidence: false
  };
  const nextAction = active === "catalog"
    ? products.length > 0 ? "Next: choose a SKU in Optimize." : "Next: import a catalog."
    : active === "optimize"
      ? optimizedIds.length > 0 ? "Next: verify the lift in Evidence Lab." : "Next: apply the suggested fixes."
      : "Next: run a shopper query or export the profile.";

  return (
    <div className="workflow-progress">
      <div className="workflow-progress-meta"><span>Workflow progress</span><strong>Step {Math.max(activeIndex + 1, 1)} of {workflowSteps.length}</strong></div>
      <nav className="workflow-steps" aria-label="Workflow steps">
        {workflowSteps.map((step, index) => {
          const isComplete = completion[step.id];
          return <Link aria-current={active === step.id ? "step" : undefined} className={`${active === step.id ? "is-active " : ""}${isComplete ? "is-complete" : ""}`} href={step.href} key={step.id}><span>{isComplete ? "✓" : String(index + 1).padStart(2, "0")}</span>{step.label}</Link>;
        })}
      </nav>
      <p className="workflow-progress-next" aria-live="polite">{nextAction}</p>
    </div>
  );
}

function EmptyCatalogState({ view }: { view: "optimize" | "evidence" }) {
  const isOptimize = view === "optimize";
  return <section className="panel placeholder-state empty-workspace-state"><p className="eyebrow">Catalog required</p><h2>{isOptimize ? "Import a catalog before optimizing." : "Import a catalog before reviewing evidence."}</h2><p>{isOptimize ? "There are no products to improve yet. Add a CSV in Catalog setup, then return here to choose a SKU." : "There are no products to evaluate yet. Add a CSV in Catalog setup, then return here to test the evidence."}</p><Link className="primary-button link-button" href="/catalog">Go to catalog setup <span>→</span></Link></section>;
}

function LoadingWorkspaceState() {
  return <section className="panel placeholder-state empty-workspace-state workspace-loading-state" aria-live="polite"><p className="eyebrow">Workspace</p><h2>Loading your catalog.</h2><p>Preparing the latest workspace before showing this step.</p><span className="workspace-loading-bar" aria-hidden="true" /></section>;
}

function AnimatedScore({ prefix = "", value }: { prefix?: string; value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const from = previousValue.current;
    const to = value;
    previousValue.current = to;
    if (from === to) {
      setDisplayValue(to);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / 620, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(from + (to - from) * eased));
      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return <strong className="animated-score" aria-label={`${prefix}${value}`}>{prefix}{displayValue}</strong>;
}

function CatalogDestinations() {
  return <section className="catalog-destinations" aria-label="Continue the workflow"><div><p className="eyebrow">Continue the workflow</p><h2>Take the catalog to its next step.</h2><p>Choose a SKU in Optimize, then test shopper intent in Evidence Lab.</p></div><div className="catalog-destination-links"><Link className="catalog-destination" href="/optimize"><strong>Choose another SKU</strong><span>Open Optimize a SKU →</span></Link><Link className="catalog-destination" href="/evidence"><strong>Server-backed intent simulation</strong><span>Open Evidence Lab →</span></Link></div></section>;
}

type CatalogViewProps = {
  csvText: string;
  handleClearCatalog: () => void;
  handleCsvImport: () => void;
  handleFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  handleFocusWeakest: () => void;
  isClearing: boolean;
  onCsvChange: (value: string) => void;
  onLoadSample: (csv: string, label: string) => void;
  onResetCsv: () => void;
  onCancelClear: () => void;
  onRequestClear: () => void;
  onSelectProduct: (id: string) => void;
  products: Product[];
  previewRows: ParsedCatalogRow[];
  selectedProduct: Product | null;
  showClearConfirmation: boolean;
  status: string;
  summary: ReturnType<typeof summarizeCatalog>;
  weakestProduct: Product | null;
};

function CatalogView({ csvText, handleClearCatalog, handleCsvImport, handleFileUpload, handleFocusWeakest, isClearing, onCsvChange, onLoadSample, onResetCsv, onCancelClear, onRequestClear, onSelectProduct, previewRows, products, selectedProduct, showClearConfirmation, status, summary, weakestProduct }: CatalogViewProps) {
  return (
    <>
      <section className="workspace-heading">
        <div><p className="eyebrow">Focused step · 01</p><h2>Bring in your catalog.</h2><p className="section-copy">Upload once. AgentShelf will surface the product with the clearest opportunity next.</p></div>
        <span className="workspace-count">1 of 3</span>
      </section>

      <div className="focus-grid catalog-focus-grid">
        <section className="panel primary-task-card">
          <p className="eyebrow">Catalog input</p><h2>Upload a CSV</h2>
          <p className="section-copy">Use a file, or paste a small catalog manually if you are exploring the demo.</p>
          <label className="file-input"><span>Load CSV file</span><input type="file" accept=".csv,text/csv" onChange={handleFileUpload} /></label>
          <details className="inline-details"><summary>Or paste CSV manually</summary><textarea className="csv-input" value={csvText} onChange={(event) => onCsvChange(event.target.value)} placeholder="name,price,description,features\nExample product,S$99,Describe the product here,feature one|feature two" spellCheck={false} /><button className="ghost-button" onClick={onResetCsv} type="button">Clear CSV</button></details>
          {csvText.trim() ? <CsvPreview rows={previewRows} /> : null}
          <div className="action-row"><button className="primary-button" onClick={handleCsvImport} type="button">Import catalog</button><button className="ghost-button clear-catalog-button" disabled={products.length === 0 || isClearing} onClick={onRequestClear} type="button">Clear catalog</button></div>
          {showClearConfirmation ? <div className="clear-confirmation" role="dialog" aria-labelledby="clear-catalog-title" aria-modal="false"><strong id="clear-catalog-title">Clear this catalog?</strong><p>This will remove the imported products and reset Optimize and Evidence. You can import another catalog afterward.</p><div className="action-row"><button className="ghost-button" disabled={isClearing} onClick={onCancelClear} type="button">No, keep catalog</button><button className="danger-button" disabled={isClearing} onClick={handleClearCatalog} type="button">{isClearing ? "Clearing..." : "Yes, clear catalog"}</button></div></div> : null}
          <p className="status-note">{status}</p>
          <div className="sample-switcher">
            <div><span className="eyebrow">Generalisability check</span><p>Try the same workflow on another category.</p></div>
            <div className="sample-switcher-buttons">{sampleCatalogs.map((sample) => <button className="ghost-button" key={sample.label} onClick={() => onLoadSample(sample.csv, sample.label)} type="button">{sample.label}</button>)}</div>
          </div>
        </section>

        <aside className="panel next-step-card">
          <p className="eyebrow">Next best action</p><h2>Start with the weakest SKU.</h2>
          <p className="section-copy">This product has the biggest content gap, making the improvement easiest to see.</p>
          {weakestProduct ? <><div className="focus-product"><div><strong>{weakestProduct.name}</strong><span>{weakestProduct.price} · current score {weakestProduct.readinessScore}</span></div><button className="ghost-button" onClick={handleFocusWeakest} type="button">Select</button></div><div className="mini-stat-grid"><div><span>Catalog average</span><strong>{summary.averageScore}</strong></div><div><span>Products ready</span><strong>{summary.highReadinessCount}</strong></div></div></> : <div className="placeholder-state"><strong>No catalog imported yet.</strong><p>Import a CSV above to see the weakest SKU and catalog health here.</p></div>}
        </aside>
      </div>

      {products.length > 0 ? <CatalogCardGrid onSelectProduct={onSelectProduct} products={products} selectedId={selectedProduct?.id ?? ""} /> : null}

    </>
  );
}

function CsvPreview({ rows }: { rows: ParsedCatalogRow[] }) {
  if (rows.length === 0) {
    return <div className="csv-preview csv-preview--empty" aria-live="polite"><div className="csv-preview-heading"><div><p className="eyebrow">Live preview</p><strong>Waiting for a valid product row.</strong></div><span>Updates as you type</span></div><p>Include name, price, and description columns to preview the catalog before importing.</p></div>;
  }

  return <div className="csv-preview" aria-live="polite"><div className="csv-preview-heading"><div><p className="eyebrow">Live preview</p><strong>{rows.length} product{rows.length === 1 ? "" : "s"} detected</strong></div><span>Updates as you type</span></div><div className="csv-preview-table-wrap"><table className="csv-preview-table"><thead><tr><th>Name</th><th>Price</th><th>Description</th><th>Features</th></tr></thead><tbody>{rows.slice(0, 5).map((row) => <tr key={`${row.name}-${row.price}`}><td data-label="Name">{row.name}</td><td data-label="Price">{row.price}</td><td data-label="Description">{row.description}</td><td data-label="Features">{row.features.slice(0, 2).join(" · ") || "Will infer"}</td></tr>)}</tbody></table></div>{rows.length > 5 ? <small>Showing the first 5 rows. All {rows.length} products will be imported.</small> : null}</div>;
}

function CatalogCardGrid({ onSelectProduct, products, selectedId }: { onSelectProduct: (id: string) => void; products: Product[]; selectedId: string }) {
  const visibleProducts = products.slice(0, 12);
  return <section className="catalog-card-section" aria-labelledby="catalog-products-title"><div className="catalog-card-heading"><div><p className="eyebrow">Catalog snapshot</p><h2 id="catalog-products-title">Explore your products.</h2></div><span>{products.length} loaded · click a card to focus</span></div><div className="catalog-card-grid">{visibleProducts.map((product) => <button aria-pressed={product.id === selectedId} className={`catalog-product-card ${product.id === selectedId ? "is-selected" : ""}`} key={product.id} onClick={() => onSelectProduct(product.id)} type="button"><div className="catalog-product-card-top"><span className="eyebrow">{product.category}</span><span>{product.price}</span></div><h3>{product.name}</h3><p>{product.rawDescription}</p><div className="catalog-product-card-score"><span>Readiness</span><AnimatedScore value={product.readinessScore} /></div><div className="progress-track" aria-hidden="true"><span className="progress-bar progress-bar--improved" style={{ width: `${product.readinessScore}%` }} /></div><small>{product.id === selectedId ? "Selected for optimization" : "Select to focus →"}</small></button>)}</div>{products.length > visibleProducts.length ? <details className="secondary-details compact-details"><summary>Browse all products <span>{products.length - visibleProducts.length} more loaded</span></summary><div className="product-list">{products.slice(visibleProducts.length).map((product) => <ProductListItem key={product.id} onSelect={onSelectProduct} product={product} selected={product.id === selectedId} />)}</div></details> : null}</section>;
}

type ProductListItemProps = { onSelect: (id: string) => void; product: Product; selected: boolean };

function ProductListItem({ onSelect, product, selected }: ProductListItemProps) {
  const tone = scoreTone(product.improvedScore);
  return <button className={`product-list-item ${selected ? "is-active" : ""}`} onClick={() => onSelect(product.id)} type="button"><div><strong>{product.name}</strong><span>{product.price} · {product.fit} · {product.climate}</span></div><span className={`score-pill ${tone.className}`}>{product.improvedScore}</span></button>;
}

type OptimizeViewProps = {
  handleExport: () => void;
  handleOptimizeSelected: () => void;
  isOptimized: boolean;
  isOptimizing: boolean;
  onSelectProduct: (id: string) => void;
  products: Product[];
  scoreDelta: number;
  selectedProduct: Product;
  status: string;
  suggestedFixes: string[];
  optimizationMeta?: OptimizationMeta;
};

function OptimizeView({ handleExport, handleOptimizeSelected, isOptimized, isOptimizing, onSelectProduct, products, scoreDelta, selectedProduct, status, suggestedFixes, optimizationMeta }: OptimizeViewProps) {
  return (
    <>
      <section className="workspace-heading"><div><p className="eyebrow">Focused step · 02</p><h2>Make one product easier to recommend.</h2><p className="section-copy">AgentShelf has already found the highest-impact fixes for the selected SKU.</p></div><span className="workspace-count">2 of 3</span></section>
      <div className="selected-product-bar"><div><span className="eyebrow">Selected SKU</span><strong>{selectedProduct.name}</strong><span>{selectedProduct.price} · {selectedProduct.fit} · {selectedProduct.climate}</span></div><div className="score-pair"><div><span>Current</span><AnimatedScore value={selectedProduct.readinessScore} /></div><span aria-hidden="true">→</span><div><span>After fixes</span><AnimatedScore value={selectedProduct.improvedScore} /></div></div></div>
      <section className="panel optimize-focus-card"><div className="optimization-grid"><div><p className="eyebrow">Recommended path</p><h2>Close the gaps that matter most.</h2><p className="section-copy">These focused changes give AI shoppers enough context to understand when this product is the right fit.</p><ul className="recommendation-list">{suggestedFixes.map((fix) => <li key={fix}>{fix.replace(" so AI can reason about this product.", ".")}</li>)}</ul></div><div className="optimize-score-card"><div className="score-pair-large"><div><span>Current score</span><AnimatedScore value={selectedProduct.readinessScore} /></div><span aria-hidden="true">→</span><div><span>Projected uplift</span><AnimatedScore prefix="+" value={scoreDelta} /></div></div><button className="primary-button" disabled={isOptimizing} onClick={handleOptimizeSelected} type="button">{isOptimizing ? "Applying fixes..." : isOptimized ? "Apply again" : "Apply suggested fixes"}</button><p className="status-note">{status}</p>{optimizationMeta ? <ProvenanceBadge meta={optimizationMeta} /> : null}</div></div></section>
      <details className="secondary-details compact-details"><summary>Choose another SKU <span>{products.length} products loaded</span></summary><div className="product-list">{products.map((product) => <ProductListItem key={product.id} onSelect={onSelectProduct} product={product} selected={product.id === selectedProduct.id} />)}</div></details>
      <details className="secondary-details"><summary>Review the before-and-after content <span>Open only when you need the detail</span></summary><ComparisonPanels handleExport={handleExport} handleOptimizeSelected={handleOptimizeSelected} isOptimized={isOptimized} isOptimizing={isOptimizing} scoreDelta={scoreDelta} selectedProduct={selectedProduct} suggestedFixes={suggestedFixes} /></details>
    </>
  );
}

type ComparisonPanelsProps = { handleExport: () => void; handleOptimizeSelected: () => void; isOptimized: boolean; isOptimizing: boolean; scoreDelta: number; selectedProduct: Product; suggestedFixes: string[] };

function ComparisonPanels({ handleExport, handleOptimizeSelected, isOptimized, isOptimizing, scoreDelta, selectedProduct, suggestedFixes }: ComparisonPanelsProps) {
  return <div className="case-study-grid detail-grid"><article className="panel"><p className="eyebrow">Before</p><div className="comparison-heading"><h2>Raw catalog content</h2><span className={`score-pill ${scoreTone(selectedProduct.readinessScore).className}`}><AnimatedScore value={selectedProduct.readinessScore} /></span></div><p className="raw-copy">{selectedProduct.rawDescription}</p><ul className="clean">{selectedProduct.rawBullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul><div className="insight-block"><h3>Missing context</h3><ul className="clean">{selectedProduct.gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul></div></article><article className="panel"><p className="eyebrow">After</p><div className="comparison-heading"><h2>AI-ready profile</h2><span className={`score-pill ${scoreTone(selectedProduct.improvedScore).className}`}><AnimatedScore value={selectedProduct.improvedScore} /></span></div>{isOptimized ? <><p className="raw-copy">{selectedProduct.enriched.aiSummary}</p><div className="chip-list">{selectedProduct.enriched.machineTags.map((tag) => <span className="chip" key={tag}>{tag}</span>)}</div><div className="dual-list"><div className="insight-block"><h3>Personas</h3><ul className="clean">{selectedProduct.enriched.personas.map((persona) => <li key={persona}>{persona}</li>)}</ul></div><div className="insight-block"><h3>Use cases</h3><ul className="clean">{selectedProduct.enriched.useCases.map((useCase) => <li key={useCase}>{useCase}</li>)}</ul></div></div><div className="action-row"><span className="delta-badge">+{scoreDelta} point uplift</span><button className="ghost-button" onClick={handleExport} type="button">Export JSON + JSON-LD</button></div><EvidenceTrail product={selectedProduct} /></> : <div className="placeholder-state"><strong>Ready to generate</strong><p>Apply the suggested fixes to create the optimized product profile.</p><button className="primary-button" disabled={isOptimizing} onClick={handleOptimizeSelected} type="button">{isOptimizing ? "Applying fixes..." : "Generate profile"}</button></div>}</article></div>;
}

type EvidenceViewProps = { baselinePrompts: ReturnType<typeof simulatePrompts>; handleExport: () => void; handleOptimizeSelected: () => void; improvedPrompts: ReturnType<typeof simulatePrompts>; isOptimized: boolean; onSelectProduct: (id: string) => void; products: Product[]; scoreDelta: number; selectedProduct: Product; simulatedWinDelta: number; status: string; optimizationMeta?: OptimizationMeta };

function EvidenceView({ baselinePrompts, handleExport, handleOptimizeSelected, improvedPrompts, isOptimized, onSelectProduct, products, scoreDelta, selectedProduct, simulatedWinDelta, status, optimizationMeta }: EvidenceViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "prompts" | "breakdown">("overview");

  return <>
    <section className="workspace-heading"><div><p className="eyebrow">Focused step · 03</p><h2>Prove the lift.</h2><p className="section-copy">See the outcome first, then open the evidence behind the score when you need it.</p></div><span className="workspace-count">3 of 3</span></section>
    <section className="panel evidence-summary-card"><div className="evidence-summary-main"><div><p className="eyebrow">Outcome for {selectedProduct.name}</p><h2>{isOptimized ? "This product is ready for AI answers." : "This product is ready to improve."}</h2><p className="section-copy">{isOptimized ? "The same product now carries the context an AI shopper needs to recommend it confidently." : "Run the optimization step first, then return here to verify the improvement."}</p></div><div className="evidence-metrics"><div><span>Score uplift</span><AnimatedScore prefix="+" value={scoreDelta} /></div><div><span>Prompt wins</span><div className="evidence-metric-value"><AnimatedScore prefix="+" value={simulatedWinDelta} /><span>/{baselinePrompts.length}</span></div></div></div></div>{!isOptimized ? <button className="primary-button" onClick={handleOptimizeSelected} type="button">Optimize this SKU first</button> : <button className="ghost-button" onClick={handleExport} type="button">Export AI-ready JSON</button>}<p className="status-note">{status}</p>{optimizationMeta ? <ProvenanceBadge meta={optimizationMeta} /> : null}</section>
    <details className="secondary-details compact-details"><summary>Choose another SKU <span>{products.length} products loaded</span></summary><div className="product-list">{products.map((product) => <ProductListItem key={product.id} onSelect={onSelectProduct} product={product} selected={product.id === selectedProduct.id} />)}</div></details>
    <section className="panel evidence-tabs-card"><div className="evidence-tabs" role="tablist" aria-label="Evidence views">{([["overview", "Before / after"], ["prompts", "Prompt tests"], ["breakdown", "Score breakdown"]] as const).map(([id, label]) => <button aria-selected={activeTab === id} className={activeTab === id ? "is-active" : ""} key={id} onClick={() => setActiveTab(id)} role="tab" type="button">{label}</button>)}</div><div role="tabpanel">{activeTab === "overview" ? <EvidenceOverview isOptimized={isOptimized} selectedProduct={selectedProduct} scoreDelta={scoreDelta} /> : null}{activeTab === "prompts" ? <PromptTests baselinePrompts={baselinePrompts} improvedPrompts={improvedPrompts} isOptimized={isOptimized} /> : null}{activeTab === "breakdown" ? <ScoreBreakdown selectedProduct={selectedProduct} /> : null}</div>{isOptimized ? <EvidenceTrail product={selectedProduct} /> : <div className="evidence-trail-placeholder"><strong>Claim evidence will unlock after optimization.</strong><span>Apply the suggested fixes to connect generated recommendations back to source fields.</span></div>}</section>
  </>;
}

function EvidenceOverview({ isOptimized, scoreDelta, selectedProduct }: { isOptimized: boolean; scoreDelta: number; selectedProduct: Product }) {
  return <div className="evidence-overview"><div className="evidence-result-grid"><article className="evidence-result-card"><span>Current score</span><AnimatedScore value={selectedProduct.readinessScore} /><p>{selectedProduct.rawDescription}</p></article><article className="evidence-result-card is-improved"><span>Improved score</span><AnimatedScore value={selectedProduct.improvedScore} /><p>{isOptimized ? selectedProduct.enriched.aiSummary : "The optimized profile will appear here after the fixes are applied."}</p></article></div><div className="evidence-highlight"><span>What changed</span><strong>{isOptimized ? `+${scoreDelta} points from clearer product context.` : "The recommendation profile is waiting for optimization."}</strong></div></div>;
}

function PromptTests({ baselinePrompts, improvedPrompts, isOptimized }: { baselinePrompts: ReturnType<typeof simulatePrompts>; improvedPrompts: ReturnType<typeof simulatePrompts>; isOptimized: boolean }) {
  return <div className="simulation-grid prompt-tests"><div><p className="eyebrow">Baseline</p><h3>What the original catalog can answer</h3><div className="prompt-list">{baselinePrompts.map((prompt) => <PromptRow key={`base-${prompt.query}`} prompt={prompt} />)}</div></div><div><p className="eyebrow">Improved</p><h3>What the enriched profile can answer</h3><div className="prompt-list">{improvedPrompts.map((prompt) => <PromptRow key={`improved-${prompt.query}`} prompt={prompt} improved={!isOptimized} />)}</div></div></div>;
}

function PromptRow({ improved = false, prompt }: { improved?: boolean; prompt: ReturnType<typeof simulatePrompts>[number] }) {
  return <article className={`prompt-row ${improved ? "success is-muted" : prompt.matched ? "success" : ""}`}><strong>{prompt.query}</strong><span>{prompt.matched ? "Matched" : "Missed"} at {prompt.confidence}% confidence</span><p>{prompt.reason}</p></article>;
}

function EvidenceTrail({ product }: { product: Product }) {
  return <details className="evidence-trail-details"><summary><span>Claim evidence</span><small>Review before publishing</small></summary><div className="evidence-trail">{buildClaimEvidence(product).map((item) => <div className="evidence-trail-row" key={`${item.status}-${item.claim}`}><span className={`evidence-status evidence-status--${item.status}`}>{item.status === "source-backed" ? "Source-backed" : "Generated"}</span><div><strong>{item.claim}</strong><small>{item.source}</small></div></div>)}</div></details>;
}

function ScoreBreakdown({ selectedProduct }: { selectedProduct: Product }) {
  return <div className="score-breakdown-view"><p className="section-copy">This is a transparent, rules-based readiness model for the demo—not a claim about guaranteed recommendation performance.</p><div className="dimension-grid">{selectedProduct.scoreBreakdown.map((dimension) => <article className="dimension-card" key={dimension.label}><div className="dimension-head"><strong>{dimension.label}</strong><span>{dimension.baseline} → {dimension.improved}</span></div><div className="progress-track"><span className="progress-bar progress-bar--baseline" style={{ width: `${dimension.baseline}%` }} /><span className="progress-bar progress-bar--improved" style={{ width: `${dimension.improved}%` }} /></div><p>{dimension.rationale}</p></article>)}</div><details className="inline-details score-method-details"><summary>How the score is calculated</summary><div className="weights-grid">{scoreWeights.map((weight) => <div className="weight-row" key={weight.label}><span>{weight.label}</span><strong>{weight.weight}%</strong></div>)}</div></details></div>;
}

function IntentQueryLab({ products, query, onQueryChange }: { products: Product[]; query: string; onQueryChange: (value: string) => void }) {
  const [submittedQuery, setSubmittedQuery] = useState(query);
  const [simulation, setSimulation] = useState<{ intent: ShoppingIntent; results: RankedRecommendation[]; benchmark: BenchmarkResult } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const fallbackResults = useMemo(() => rankProductsForQuery(products, submittedQuery, "improved"), [products, submittedQuery]);
  const intent = simulation?.intent ?? parseShoppingIntent(submittedQuery);
  const results = simulation?.results ?? fallbackResults;
  const benchmark = simulation?.benchmark ?? runBenchmark(products);

  useEffect(() => setSimulation(null), [products]);

  async function runSimulation(nextQuery: string) {
    const trimmedQuery = nextQuery.trim();
    if (!trimmedQuery) return;
    setSubmittedQuery(trimmedQuery);
    setIsSimulating(true);
    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmedQuery, mode: "improved" })
      });
      if (!response.ok) throw new Error("Server simulation unavailable");
      const payload = (await response.json()) as { intent: ShoppingIntent; results: RankedRecommendation[]; benchmark: BenchmarkResult };
      setSimulation(payload);
    } catch {
      setSimulation(null);
    } finally {
      setIsSimulating(false);
    }
  }
  const exampleQueries = [
    "I need a supportive option for a beginner under S$180.",
    "Find a comfortable choice for a humid daily routine.",
    "Show me a lightweight product for commuting under S$160."
  ];

  return <section className="panel intent-lab"><div className="intent-lab-heading"><div><p className="eyebrow">Server-backed intent simulation</p><h2>Ask the catalog like a shopper.</h2><p className="section-copy">Run one natural-language query across every SKU. AgentShelf extracts constraints, ranks the catalog, and explains the tradeoffs.</p></div><span className="demo-badge">{simulation ? "API response" : "Rules-based fallback"}</span></div><div className="intent-form"><label htmlFor="intent-query">Shopper query</label><textarea id="intent-query" placeholder={EXAMPLE_QUERY} value={query} onChange={(event) => onQueryChange(event.target.value)} /><div className="intent-actions"><button className="primary-button" disabled={isSimulating} onClick={() => runSimulation(query)} type="button">{isSimulating ? "Running simulation..." : "Run recommendation simulation"}</button><div className="query-examples">{exampleQueries.map((example) => <button className="text-button" key={example} onClick={() => onQueryChange(example)} type="button">{example}</button>)}</div></div><div className="extracted-intent"><span>Extracted intent</span>{intent.category ? <strong>{intent.category}</strong> : null}{intent.budgetMax ? <strong>Budget ≤ S${intent.budgetMax}</strong> : null}{intent.signals.slice(0, 5).map((signal) => <strong key={signal}>{signal}</strong>)}</div></div><div className="benchmark-strip"><div><span>Offline benchmark</span><strong>{benchmark.strongMatchRate}% strong matches</strong></div><div><span>Scenario coverage</span><strong>{benchmark.queriesEvaluated} saved queries</strong></div><div><span>Top result average</span><strong>{benchmark.averageTopScore}/98</strong></div></div><div className="intent-results"><div className="intent-results-topline"><span>Ranked results</span><span>{results.length} products evaluated · based on structured profile signals</span></div>{results.slice(0, 3).map((result, index) => <RecommendationCard index={index} key={result.product.id} result={result} />)}<RecommendationComparison results={results.slice(0, 3)} /></div></section>;
}

function RecommendationCard({ index, result }: { index: number; result: RankedRecommendation }) {
  return <article className={`recommendation-card${index === 0 ? " is-top" : ""}`}><div className="recommendation-rank">0{index + 1}</div><div className="recommendation-main"><div className="recommendation-title"><div><span className="eyebrow">{result.product.category}</span><h3>{result.product.name}</h3></div><strong>{result.rankScore}<small>match</small></strong></div><p>{result.rationale}</p><div className="signal-row">{result.matchedSignals.map((signal) => <span className="signal-chip signal-chip--match" key={signal}>✓ {signal}</span>)}{result.missingSignals.slice(0, 2).map((signal) => <span className="signal-chip signal-chip--missing" key={signal}>! {signal}</span>)}</div></div></article>;
}

function RecommendationComparison({ results }: { results: RankedRecommendation[] }) {
  if (results.length < 2) return null;
  return <details className="comparison-details"><summary>Compare the top results <span>See fit, price, and guardrails side by side</span></summary><div className="comparison-table-wrap"><table className="comparison-table"><thead><tr><th>Signal</th>{results.map((result) => <th key={result.product.id}>{result.product.name}</th>)}</tr></thead><tbody><tr><th>Category</th>{results.map((result) => <td key={result.product.id}>{result.product.category}</td>)}</tr><tr><th>Price</th>{results.map((result) => <td key={result.product.id}>{result.product.price}</td>)}</tr><tr><th>Readiness</th>{results.map((result) => <td key={result.product.id}>{result.product.improvedScore}</td>)}</tr><tr><th>Personas</th>{results.map((result) => <td key={result.product.id}>{result.product.enriched.personas.slice(0, 2).join(", ")}</td>)}</tr><tr><th>Tradeoffs</th>{results.map((result) => <td key={result.product.id}>{result.product.enriched.tradeoffs[0] ?? "No major tradeoff recorded"}</td>)}</tr></tbody></table></div></details>;
}

function ProvenanceBadge({ meta }: { meta: OptimizationMeta }) {
  const isLive = meta.provider === "openai";
  return <div className={`provenance-badge${isLive ? " is-live" : ""}`}><span>{isLive ? "Live model" : "Built-in fallback"}</span><small>{isLive ? `${meta.model ?? "OpenAI"} · grounded to source fields` : "Grounded demo logic · no API key required"}</small></div>;
}

export function SolutionProof() {
  const architecture = [
    ["01", "Ingest", "CSV, PIM, or CMS fields"],
    ["02", "Normalize", "Map attributes to a shared schema"],
    ["03", "Enrich", "Add personas, use cases, and guardrails"],
    ["04", "Evaluate", "Score readiness and simulate intent"],
    ["05", "Activate", "Export JSON-LD or send via API"],
  ];

  useEffect(() => {
    const target = document.querySelector<HTMLElement>(".solution-proof-heading h2");
    if (!target) return;
    let timer: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        target.classList.remove("is-scroll-hovering");
        void target.offsetWidth;
        target.classList.add("is-scroll-hovering");
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(() => target.classList.remove("is-scroll-hovering"), 900);
      },
      { threshold: 0.35 }
    );
    observer.observe(target);
    return () => {
      observer.disconnect();
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return <section className="solution-proof"><div className="solution-proof-heading"><div><p className="eyebrow">From demo to deployment</p><h2 className="scroll-hover-text">A recommendation layer brands can actually adopt.</h2></div><p>Keep existing catalog systems. Add an AI-ready layer with traceable content, repeatable evaluation, and a clean handoff to the stack you already use.</p></div><div className="architecture-flow">{architecture.map(([number, title, body]) => <div className="architecture-step" key={title} tabIndex={0}><span>{number}</span><strong>{title}</strong><p>{body}</p></div>)}</div><div className="adoption-grid"><div tabIndex={0}><span className="eyebrow">Grounded by design</span><strong>Every claim can point back to a source field.</strong><p>Separate source facts from generated narrative so teams can review before publishing.</p></div><div tabIndex={0}><span className="eyebrow">Built for teams</span><strong>Batch, approve, and activate at catalog scale.</strong><p>Start with CSV export today, then connect PIM, CMS, webhooks, and API delivery without changing the workflow.</p></div><div tabIndex={0}><span className="eyebrow">Category agnostic</span><strong>One schema, many product stories.</strong><p>Running shoes, skincare, and audio gear can use the same intent-to-evidence loop.</p></div></div></section>;
}

function recommendFixes(product: Product) {
  const fixes = product.gaps.map((gap) => `Add ${gap} so AI can reason about this product.`);
  if (!product.rawDescription.toLowerCase().includes("beginner")) fixes.push(`State the target ${product.category.toLowerCase()} persona explicitly.`);
  fixes.push("Explain why this product wins for a specific shopper instead of only listing features.");
  return fixes.slice(0, 4);
}
