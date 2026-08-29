import Link from "next/link";
import { StoryExperience } from "@/components/story-experience";
import { products } from "@/data/products";

export default function Home() {
  return (
    <div className="page-shell landing-page"><StoryExperience product={products.find((item) => item.id === "RS-002") ?? products[0]} /><section className="landing-cta"><p className="eyebrow">Ready to see it work?</p><h2>Give your catalog a better story.</h2><Link className="primary-button link-button" href="/optimize">Open optimization workspace <span>→</span></Link></section></div>
  );
}
