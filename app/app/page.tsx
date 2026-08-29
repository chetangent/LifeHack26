import { Hero } from "@/components/hero";
import { Workbench } from "@/components/workbench";
import { products } from "@/data/products";

export default function Home() {
  return (
    <main className="page-shell">
      <Hero />
      <Workbench initialProducts={products} />
    </main>
  );
}
