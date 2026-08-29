"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";

const steps = [
  { id: "import", label: "Import", kicker: "Start with what you have", title: "Every catalog has a story hiding in it.", body: "Bring in your product data and AgentShelf finds the signals an AI shopper needs to make a confident recommendation." },
  { id: "diagnose", label: "Diagnose", kicker: "Find the opportunity", title: "See exactly what the AI cannot see.", body: "Readiness scoring turns vague content gaps into a clear, prioritized path forward—starting with the SKU that needs you most." },
  { id: "optimize", label: "Optimize", kicker: "Make the lift", title: "One product. A much better answer.", body: "Add context, personas, use cases, and proof points in one focused pass. The product becomes easier to understand and easier to recommend." },
  { id: "prove", label: "Prove", kicker: "Show the difference", title: "Better content. Measurable impact.", body: "Test the same shopper prompts before and after enrichment, then export the profile your AI stack can use." }
];

export function StoryExperience({ product }: { product: Product }) {
  const [activeStep, setActiveStep] = useState("import");
  const activeIndex = steps.findIndex((step) => step.id === activeStep);
  const score = activeStep === "import" || activeStep === "diagnose" ? product.readinessScore : product.improvedScore;

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".story-step"));
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && setActiveStep(entry.target.id)),
      { rootMargin: "-35% 0px -50%", threshold: 0 }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  function jumpTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setActiveStep(id);
  }

  return (
    <div className="story-page">
      <section className="story-hero">
        <p className="eyebrow">The AI commerce layer</p>
        <h1>Products deserve better answers.</h1>
        <p>AgentShelf turns the static catalog into a living product story—structured for the way AI assistants actually help people shop.</p>
        <button className="story-scroll-button" onClick={() => jumpTo("import")} type="button">Scroll to explore <span>↓</span></button>
      </section>

      <div className="story-progress" aria-label="Story progress">
        {steps.map((step, index) => <button className={activeStep === step.id ? "is-active" : ""} key={step.id} onClick={() => jumpTo(step.id)} type="button"><span>{String(index + 1).padStart(2, "0")}</span>{step.label}</button>)}
      </div>

      <div className="story-layout">
        <div className="story-steps">
          {steps.map((step) => (
            <section className="story-step" id={step.id} key={step.id}>
              <p className="eyebrow">{step.kicker}</p>
              <h2>{step.title}</h2>
              <p>{step.body}</p>
              {step.id === "prove" ? <Link className="primary-button link-button" href="/evidence">Open evidence lab <span>→</span></Link> : null}
            </section>
          ))}
        </div>

        <aside className="story-stage" aria-live="polite">
          <div className="stage-topline"><span>AgentShelf / {steps[activeIndex]?.label}</span><span>{String(activeIndex + 1).padStart(2, "0")} / 04</span></div>
          <div className={`stage-product stage-product--${activeStep}`}>
            <div className="product-orbit orbit-one" /><div className="product-orbit orbit-two" />
            <span className="stage-category">{product.category}</span>
            <h3>{product.name}</h3>
            <p>{activeStep === "optimize" || activeStep === "prove" ? product.enriched.aiSummary : product.rawDescription}</p>
            <div className="stage-score"><strong>{score}</strong><span>readiness</span></div>
            <div className="stage-tags">
              {(activeStep === "optimize" || activeStep === "prove" ? product.enriched.machineTags : product.rawBullets).slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          </div>
          <div className="stage-footer"><span>{activeStep === "prove" ? "Recommendation wins" : activeStep === "optimize" ? "AI-ready profile" : "Raw catalog signal"}</span><strong>{activeStep === "prove" ? "+3 prompts" : activeStep === "optimize" ? `+${product.improvedScore - product.readinessScore} points` : "Needs context"}</strong></div>
        </aside>
      </div>
    </div>
  );
}
