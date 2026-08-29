"use client";

import { ChangeEvent, startTransition, useMemo, useState } from "react";
import type { OptimizationMeta, Product } from "@/lib/types";
import {
  createProductFromRow,
  exportProductPayload,
  parseCatalogCsv,
  scoreTone,
  scoreWeights,
  simulatePrompts,
  summarizeCatalog
} from "@/lib/scoring";

type WorkbenchProps = {
  initialProducts: Product[];
};

const sampleCsv = `name,price,description,features
PulseRoad Breeze,S$168,Breathable daily trainer for beginner runners in humid weather,engineered mesh|foam midsole|rubber outsole
PacePilot Shift,S$188,Responsive shoe for faster sessions and hot climate training,open mesh|responsive foam|road grip
WideWay Start,S$138,Comfortable wide running shoe for walk run beginners,wide toe box|foam ride|textile upper`;

export function Workbench({ initialProducts }: WorkbenchProps) {
  const initialWeakestProduct = useMemo(
    () =>
      [...initialProducts].sort(
        (left, right) => left.readinessScore - right.readinessScore
      )[0] ?? null,
    [initialProducts]
  );
  const [products, setProducts] = useState(initialProducts);
  const [selectedId, setSelectedId] = useState(initialWeakestProduct?.id ?? "");
  const [csvText, setCsvText] = useState(sampleCsv);
  const [status, setStatus] = useState("Loaded demo running catalog.");
  const [optimizedIds, setOptimizedIds] = useState<string[]>([]);
  const [optimizationMeta, setOptimizationMeta] = useState<Record<string, OptimizationMeta>>({});
  const [isOptimizing, setIsOptimizing] = useState(false);

  const summary = useMemo(() => summarizeCatalog(products), [products]);
  const sortedProducts = useMemo(
    () =>
      [...products].sort(
        (left, right) => left.readinessScore - right.readinessScore
      ),
    [products]
  );
  const selectedProduct =
    products.find((product) => product.id === selectedId) ?? products[0] ?? null;
  const weakestProduct = sortedProducts[0] ?? null;
  const baselinePrompts = selectedProduct
    ? simulatePrompts(selectedProduct, "baseline")
    : [];
  const improvedPrompts = selectedProduct
    ? simulatePrompts(selectedProduct, "improved")
    : [];
  const isOptimized = selectedProduct
    ? optimizedIds.includes(selectedProduct.id)
    : false;
  const suggestedFixes = selectedProduct ? recommendFixes(selectedProduct) : [];
  const activeMeta = selectedProduct ? optimizationMeta[selectedProduct.id] : undefined;

  function handleCsvImport() {
    const rows = parseCatalogCsv(csvText);

    if (rows.length === 0) {
      setStatus("CSV import needs at least one valid row with name, price, and description.");
      return;
    }

    startTransition(() => {
      const imported = rows.map(createProductFromRow);
      const weakestImported = [...imported].sort(
        (left, right) => left.readinessScore - right.readinessScore
      )[0];
      setProducts(imported);
      setSelectedId(weakestImported?.id ?? imported[0]?.id ?? "");
      setOptimizedIds([]);
      setStatus(
        `Imported ${imported.length} products. AgentShelf focused the weakest SKU first so you can improve the biggest content gap.`
      );
    });
  }

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    file.text().then((text) => {
      setCsvText(text);
      setStatus(`Loaded ${file.name}. Review or import when ready.`);
    });
  }

  function handleExport() {
    if (!selectedProduct) {
      return;
    }

    const payload = exportProductPayload(selectedProduct);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedProduct.id.toLowerCase()}-agentshelf.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus(`Exported ${selectedProduct.name} as AI-ready JSON.`);
  }

  async function handleOptimizeSelected() {
    if (!selectedProduct) {
      return;
    }

    setIsOptimizing(true);
    setStatus(`Optimizing ${selectedProduct.name} for AI recommendation...`);

    try {
      const response = await fetch("/api/enrich", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ product: selectedProduct })
      });

      if (!response.ok) {
        throw new Error(`Optimization failed with status ${response.status}`);
      }

      const result = (await response.json()) as {
        product: Product;
        meta: OptimizationMeta;
      };

      setProducts((current) =>
        current.map((product) =>
          product.id === selectedProduct.id ? result.product : product
        )
      );
      setOptimizedIds((current) =>
        current.includes(selectedProduct.id)
          ? current
          : [...current, selectedProduct.id]
      );
      setOptimizationMeta((current) => ({
        ...current,
        [selectedProduct.id]: result.meta
      }));
      setStatus(result.meta.explanation);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Optimization failed unexpectedly."
      );
    } finally {
      setIsOptimizing(false);
    }
  }

  function handleFocusWeakest() {
    if (!weakestProduct) {
      return;
    }

    setSelectedId(weakestProduct.id);
    setStatus(
      `Focused ${weakestProduct.name}, the weakest SKU in this catalog. This is the fastest path to a stronger before-and-after demo.`
    );
  }

  if (!selectedProduct) {
    return null;
  }

  const scoreDelta = selectedProduct.improvedScore - selectedProduct.readinessScore;
  const simulatedWinDelta =
    improvedPrompts.filter((prompt) => prompt.matched).length -
    baselinePrompts.filter((prompt) => prompt.matched).length;

  return (
    <>
      <section className="guidance-banner">
        <div>
          <p className="eyebrow">Guided Flow</p>
          <h2>Upload a catalog, fix the weakest SKU, and prove the lift.</h2>
        </div>
        <div className="step-list">
          <span className="step-chip">1. Ingest</span>
          <span className="step-chip">2. Diagnose</span>
          <span className="step-chip">3. Optimize</span>
          <span className="step-chip">4. Re-test</span>
        </div>
      </section>

      <section className="summary-strip">
        <article className="summary-card">
          <span>Current average</span>
          <strong>{summary.averageScore}</strong>
        </article>
        <article className="summary-card">
          <span>Improved average</span>
          <strong>{summary.improvedAverageScore}</strong>
        </article>
        <article className="summary-card">
          <span>Products above 85</span>
          <strong>{summary.highReadinessCount}</strong>
        </article>
        <article className="summary-card">
          <span>Top gap</span>
          <strong>{summary.topGap}</strong>
        </article>
      </section>

      <div className="section-heading overview-heading">
        <div>
          <p className="eyebrow">Catalog overview</p>
          <h2>Find the next product worth fixing.</h2>
        </div>
        <p className="section-copy">Your weakest SKU is already selected below. Start there for the clearest lift.</p>
      </div>

      <section className="studio-grid active-workspace">
        <div className="panel selection-panel">
          <p className="eyebrow">Fastest Win</p>
          <h2>Start with the weakest SKU</h2>
          <p className="section-copy">
            Hackathon demos get stronger when the improvement is obvious. We
            automatically surface the product with the biggest content gap.
          </p>
          <div className="weakest-card">
            <div>
              <strong>{weakestProduct?.name}</strong>
              <span>
                {weakestProduct?.price} • baseline {weakestProduct?.readinessScore}
              </span>
            </div>
            <button className="primary-button" onClick={handleFocusWeakest} type="button">
              Focus weakest SKU
            </button>
          </div>
          <div className="insight-block">
            <h3>What AgentShelf will improve</h3>
            <ul className="clean">
              {suggestedFixes.map((fix) => (
                <li key={fix}>{fix}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="panel selection-panel">
          <p className="eyebrow">Optimization Copilot</p>
          <h2>One click to make the product more recommendable</h2>
          <p className="section-copy">
            Instead of asking the user to tune the score manually, AgentShelf
            suggests the missing recommendation signals and applies them to the
            product profile.
          </p>
          <div className="action-row">
            <button
              className="primary-button"
              disabled={isOptimizing}
              onClick={handleOptimizeSelected}
              type="button"
            >
              {isOptimizing ? "Optimizing..." : "Apply suggested fixes"}
            </button>
            <button className="ghost-button" onClick={handleExport} type="button">
              Export AI-ready JSON
            </button>
          </div>
          <div className="metric-grid">
            <article className="metric">
              <strong>+{scoreDelta}</strong>
              <span>projected score uplift for this SKU</span>
            </article>
            <article className="metric">
              <strong>
                +{simulatedWinDelta}/{baselinePrompts.length}
              </strong>
              <span>prompt wins gained after optimization</span>
            </article>
          </div>
          <p className="status-note">{status}</p>
          {activeMeta ? (
            <p className="meta-note">
              {activeMeta.provider === "openai" ? "Live OpenAI optimization" : "Fallback optimizer"}
              {activeMeta.model ? ` • ${activeMeta.model}` : ""}
            </p>
          ) : null}
        </div>
      </section>

      <details className="secondary-details">
        <summary>Catalog setup <span>Upload a new CSV or choose another SKU</span></summary>
      <section className="studio-grid">
        <div className="panel import-panel">
          <p className="eyebrow">Catalog Input</p>
          <h2>Upload or paste a raw catalog</h2>
          <p className="section-copy">
            The MVP accepts a simple CSV with `name`, `price`, `description`, and
            `features`. This makes the demo feel real without requiring backend
            plumbing first.
          </p>
          <label className="file-input">
            <span>Load CSV file</span>
            <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} />
          </label>
          <textarea
            className="csv-input"
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            spellCheck={false}
          />
          <div className="action-row">
            <button className="primary-button" onClick={handleCsvImport} type="button">
              Generate AI-ready catalog
            </button>
            <button className="ghost-button" onClick={() => setCsvText(sampleCsv)} type="button">
              Reset sample CSV
            </button>
          </div>
          <p className="status-note">{status}</p>
        </div>

        <div className="panel selection-panel">
          <p className="eyebrow">Hero SKU</p>
          <h2>Pick the product you want to improve</h2>
          <div className="product-list">
            {sortedProducts.map((product) => {
              const tone = scoreTone(product.improvedScore);
              const isActive = product.id === selectedProduct.id;

              return (
                <button
                  className={`product-list-item ${isActive ? "is-active" : ""}`}
                  key={product.id}
                  onClick={() => setSelectedId(product.id)}
                  type="button"
                >
                  <div>
                    <strong>{product.name}</strong>
                    <span>
                      {product.price} • {product.fit} • {product.climate}
                    </span>
                  </div>
                  <span className={`score-pill ${tone.className}`}>
                    {product.improvedScore}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
      </details>

      <section className="case-study-grid">
        <article className="panel">
          <p className="eyebrow">Before</p>
          <div className="comparison-heading">
            <h2>Raw catalog content</h2>
            <span className={`score-pill ${scoreTone(selectedProduct.readinessScore).className}`}>
              {selectedProduct.readinessScore}
            </span>
          </div>
          <p className="raw-copy">{selectedProduct.rawDescription}</p>
          <ul className="clean">
            {selectedProduct.rawBullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          <div className="insight-block">
            <h3>Why AI struggles</h3>
            <ul className="clean">
              {selectedProduct.gaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">After</p>
          <div className="comparison-heading">
            <h2>AI-ready product profile</h2>
            <span className={`score-pill ${scoreTone(selectedProduct.improvedScore).className}`}>
              {selectedProduct.improvedScore}
            </span>
          </div>
          {isOptimized ? (
            <>
              <p className="raw-copy">{selectedProduct.enriched.aiSummary}</p>
              <div className="chip-list">
                {selectedProduct.enriched.machineTags.map((tag) => (
                  <span className="chip" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <div className="dual-list">
                <div className="insight-block">
                  <h3>Personas</h3>
                  <ul className="clean">
                    {selectedProduct.enriched.personas.map((persona) => (
                      <li key={persona}>{persona}</li>
                    ))}
                  </ul>
                </div>
                <div className="insight-block">
                  <h3>Use cases</h3>
                  <ul className="clean">
                    {selectedProduct.enriched.useCases.map((useCase) => (
                      <li key={useCase}>{useCase}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="action-row">
                <span className="delta-badge">+{scoreDelta} point uplift</span>
                <button className="ghost-button" onClick={handleExport} type="button">
                  Export AI-ready JSON
                </button>
              </div>
            </>
          ) : (
            <div className="placeholder-state">
              <strong>AI-ready profile is waiting for optimization.</strong>
              <p>
                AgentShelf has already detected the missing recommendation
                signals. Apply the suggested fixes to generate the optimized
                product profile and unlock the higher score.
              </p>
              <ul className="clean">
                {suggestedFixes.map((fix) => (
                  <li key={fix}>{fix}</li>
                ))}
              </ul>
              <div className="action-row">
                <button
                  className="primary-button"
                  disabled={isOptimizing}
                  onClick={handleOptimizeSelected}
                  type="button"
                >
                  {isOptimizing ? "Optimizing..." : "Generate optimized profile"}
                </button>
              </div>
            </div>
          )}
        </article>
      </section>

      <details className="secondary-details evidence-details">
        <summary>Evidence & explainability <span>See score breakdown and recommendation simulations</span></summary>
      <section className="panel score-panel">
        <p className="eyebrow">Readiness Engine</p>
        <div className="section-heading compact">
          <div>
            <h2>Score breakdown with explainability</h2>
            <p className="section-copy">
              This is the part judges remember: not just a number, but a reason
              for the number and a path to improve it.
            </p>
          </div>
        </div>
        <div className="dimension-grid">
          {selectedProduct.scoreBreakdown.map((dimension) => (
            <article className="dimension-card" key={dimension.label}>
              <div className="dimension-head">
                <strong>{dimension.label}</strong>
                <span>
                  {dimension.baseline} {"->"} {dimension.improved}
                </span>
              </div>
              <div className="progress-track">
                <span
                  className="progress-bar progress-bar--baseline"
                  style={{ width: `${dimension.baseline}%` }}
                />
                <span
                  className="progress-bar progress-bar--improved"
                  style={{ width: `${dimension.improved}%` }}
                />
              </div>
              <p>{dimension.rationale}</p>
            </article>
          ))}
        </div>
        <div className="weights-panel">
          <h3>How the score is calculated</h3>
          <div className="weights-grid">
            {scoreWeights.map((weight) => (
              <div className="weight-row" key={weight.label}>
                <span>{weight.label}</span>
                <strong>{weight.weight}%</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel score-panel">
        <p className="eyebrow">Simulation Lab</p>
        <div className="section-heading compact">
          <div>
            <h2>Before-and-after recommendation tests</h2>
            <p className="section-copy">
              The strongest evidence is whether the same SKU performs better
              against natural language shopping prompts after enrichment.
            </p>
          </div>
        </div>
        <div className="simulation-grid">
          <div>
            <h3>Baseline</h3>
            <div className="prompt-list">
              {baselinePrompts.map((prompt) => (
                <article className="prompt-row" key={`base-${prompt.query}`}>
                  <strong>{prompt.query}</strong>
                  <span>
                    {prompt.matched ? "Matched" : "Missed"} at {prompt.confidence}% confidence
                  </span>
                  <p>{prompt.reason}</p>
                </article>
              ))}
            </div>
          </div>
          <div>
            <h3>Improved</h3>
            <div className="prompt-list">
              {improvedPrompts.map((prompt) => (
                <article
                  className={`prompt-row success ${isOptimized ? "" : "is-muted"}`}
                  key={`improved-${prompt.query}`}
                >
                  <strong>{prompt.query}</strong>
                  <span>
                    {prompt.matched ? "Matched" : "Missed"} at {prompt.confidence}% confidence
                  </span>
                  <p>{prompt.reason}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
      </details>
    </>
  );
}

function recommendFixes(product: Product) {
  const fixes = product.gaps.map((gap) => `Add ${gap} so AI can reason about this product.`);

  if (!product.rawDescription.toLowerCase().includes("beginner")) {
    fixes.push("State the target runner persona explicitly, such as beginner or support-seeking.");
  }

  fixes.push("Explain why this shoe wins for a specific shopper instead of only listing features.");

  return fixes.slice(0, 4);
}
