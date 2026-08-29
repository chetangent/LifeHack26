"use client";

import { ChangeEvent, startTransition, useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import {
  createProductFromRow,
  exportProductPayload,
  parseCatalogCsv,
  scoreTone,
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
  const [products, setProducts] = useState(initialProducts);
  const [selectedId, setSelectedId] = useState(initialProducts[0]?.id ?? "");
  const [csvText, setCsvText] = useState(sampleCsv);
  const [status, setStatus] = useState("Loaded demo running catalog.");

  const summary = useMemo(() => summarizeCatalog(products), [products]);
  const selectedProduct =
    products.find((product) => product.id === selectedId) ?? products[0] ?? null;
  const baselinePrompts = selectedProduct
    ? simulatePrompts(selectedProduct, "baseline")
    : [];
  const improvedPrompts = selectedProduct
    ? simulatePrompts(selectedProduct, "improved")
    : [];

  function handleCsvImport() {
    const rows = parseCatalogCsv(csvText);

    if (rows.length === 0) {
      setStatus("CSV import needs at least one valid row with name, price, and description.");
      return;
    }

    startTransition(() => {
      const imported = rows.map(createProductFromRow);
      setProducts(imported);
      setSelectedId(imported[0]?.id ?? "");
      setStatus(`Imported ${imported.length} products and generated AI-ready profiles.`);
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

  if (!selectedProduct) {
    return null;
  }

  const scoreDelta = selectedProduct.improvedScore - selectedProduct.readinessScore;

  return (
    <>
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
          <h2>Pick the product you want to win</h2>
          <div className="product-list">
            {products.map((product) => {
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
        </article>
      </section>

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
                <article className="prompt-row success" key={`improved-${prompt.query}`}>
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
    </>
  );
}
