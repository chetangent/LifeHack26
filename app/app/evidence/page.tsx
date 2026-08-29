import { Workbench } from "@/components/workbench";
import { products } from "@/data/products";

export default function EvidencePage() {
  return <div className="page-shell"><div className="page-intro"><p className="eyebrow">03 · Prove</p><h1>Evidence lab</h1><p>Understand why the score changes and test how the product performs against natural-language prompts.</p></div><Workbench initialProducts={products} view="evidence" /></div>;
}
