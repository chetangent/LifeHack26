import { Workbench } from "@/components/workbench";

export default function OptimizePage() {
  return <div className="page-shell"><div className="page-intro"><p className="eyebrow">02 · Improve</p><h1>Optimize a SKU</h1><p>Surface the biggest content gap, apply the recommended fixes, and see the projected lift.</p></div><Workbench initialProducts={[]} view="optimize" /></div>;
}
