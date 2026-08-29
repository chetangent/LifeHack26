import { NextResponse } from "next/server";
import { products } from "@/data/products";
import { buildProductInsight, summarizeCatalog } from "@/lib/scoring";

export async function GET() {
  return NextResponse.json({
    summary: summarizeCatalog(products),
    products: products.map(buildProductInsight)
  });
}
