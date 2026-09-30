"use server";

import { readFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { fetchAllFrom } from "@/lib/supabase/fetch-all";

type CatalogCategory = {
  name: string;
  slug: string;
  parent_slug: string;
};

type CatalogProduct = {
  name: string;
  code: string | null;
  cat_slug: string;
  image_url: string | null;
};

type Catalog = {
  categories: CatalogCategory[];
  products: CatalogProduct[];
};

export async function importStockCatalog() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { error: "Bu işlem için admin girişi gerekli" };
  }

  const raw = await readFile(
    path.join(process.cwd(), "scripts/stock-catalog.json"),
    "utf8"
  );
  const catalog = JSON.parse(raw) as Catalog;
  const supabase = await createClient();

  const { error: parentError } = await supabase.from("categories").upsert(
    {
      name: "DİĞER STOK",
      slug: "diger-stok",
      parent_id: null,
      sort_order: 900,
    },
    { onConflict: "slug" }
  );
  if (parentError) {
    return { error: parentError.message };
  }

  const { data: allCats, error: catReadError } = await supabase
    .from("categories")
    .select("id, slug");
  if (catReadError || !allCats) {
    return { error: catReadError?.message ?? "Kategoriler okunamadı" };
  }

  const slugToId = new Map(allCats.map((c) => [c.slug, c.id]));

  const missingParents = new Set<string>();
  const categoryRows = [];
  for (const [index, cat] of catalog.categories.entries()) {
    const parentId = slugToId.get(cat.parent_slug) ?? slugToId.get("diger-stok");
    if (!parentId) missingParents.add(cat.parent_slug);
    categoryRows.push({
      name: cat.name,
      slug: cat.slug,
      parent_id: parentId ?? null,
      sort_order: 10 + index * 10,
    });
  }

  const { error: upsertCatsError } = await supabase
    .from("categories")
    .upsert(categoryRows, { onConflict: "slug" });
  if (upsertCatsError) {
    return { error: upsertCatsError.message };
  }

  const { data: catsAgain, error: catReadError2 } = await supabase
    .from("categories")
    .select("id, slug");
  if (catReadError2 || !catsAgain) {
    return { error: catReadError2?.message ?? "Kategoriler yenilenemedi" };
  }
  const catMap = new Map(catsAgain.map((c) => [c.slug, c.id]));

  let existing: Array<{ id: string; name: string; image_url: string | null }>;
  try {
    existing = await fetchAllFrom(supabase, "products", "id, name, image_url");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ürünler okunamadı" };
  }

  const existingByName = new Map(
    (existing ?? []).map((p) => [p.name.toLocaleLowerCase("tr"), p])
  );

  let inserted = 0;
  let updated = 0;
  const toInsert: Array<Record<string, unknown>> = [];
  const toUpdate: Array<{ id: string; image_url: string }> = [];

  for (const product of catalog.products) {
    const categoryId = catMap.get(product.cat_slug);
    if (!categoryId) continue;
    const key = product.name.toLocaleLowerCase("tr");
    const found = existingByName.get(key);
    if (found) {
      if (product.image_url && !found.image_url) {
        toUpdate.push({ id: found.id, image_url: product.image_url });
      }
      continue;
    }
    toInsert.push({
      name: product.name,
      category_id: categoryId,
      description: product.code ? `Stok kodu: ${product.code}` : "Assos Metal web kataloğu",
      price: 0,
      stock_quantity: 0,
      image_url: product.image_url,
    });
    existingByName.set(key, {
      id: "pending",
      name: product.name,
      image_url: product.image_url,
    });
  }

  for (let i = 0; i < toInsert.length; i += 80) {
    const chunk = toInsert.slice(i, i + 80);
    const { error } = await supabase.from("products").insert(chunk);
    if (error) {
      return {
        error: error.message,
        inserted,
        updated,
      };
    }
    inserted += chunk.length;
  }

  for (const row of toUpdate) {
    const { error } = await supabase
      .from("products")
      .update({ image_url: row.image_url, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (!error) updated += 1;
  }

  revalidatePath("/");
  revalidatePath("/yonetim");
  revalidatePath("/kategori");

  return {
    success: true,
    inserted,
    updated,
    total: catalog.products.length,
    missingParents: [...missingParents],
  };
}
