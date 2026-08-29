import { Workbench } from "@/components/workbench";

export default function CatalogPage() {
  return <div className="page-shell"><div className="page-intro"><p className="eyebrow">01 · Import</p><h1>Catalog setup</h1><p>Load your product data and choose the SKU you want to improve next.</p></div><Workbench initialProducts={[]} view="catalog" /></div>;
}
