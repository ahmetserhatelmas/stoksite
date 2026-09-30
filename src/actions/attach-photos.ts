"use server";

import { readFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { findPhoto, type WcPhoto } from "@/lib/product-photos";
import { fetchAllFrom } from "@/lib/supabase/fetch-all";

type PhotoMapFile = {
  map: Record<string, string>;
  wc: WcPhoto[];
};

export async function attachProductPhotos() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { error: "Bu işlem için admin girişi gerekli" };
  }

  const raw = await readFile(
    path.join(process.cwd(), "scripts/photo-map.json"),
    "utf8"
  );
  const photoData = JSON.parse(raw) as PhotoMapFile;
  const supabase = await createClient();

  let products: Array<{ id: string; name: string; image_url: string | null }>;
  try {
    products = await fetchAllFrom(supabase, "products", "id, name, image_url");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ürünler okunamadı" };
  }

  let updated = 0;
  let already = 0;
  let missing = 0;
  const updates: Array<{ id: string; image_url: string }> = [];

  for (const product of products) {
    const photo = findPhoto(product.name, photoData.map, photoData.wc);
    if (!photo) {
      missing += 1;
      continue;
    }
    if (product.image_url === photo) {
      already += 1;
      continue;
    }
    updates.push({ id: product.id, image_url: photo });
  }

  for (let i = 0; i < updates.length; i += 25) {
    const chunk = updates.slice(i, i + 25);
    const results = await Promise.all(
      chunk.map((row) =>
        supabase
          .from("products")
          .update({
            image_url: row.image_url,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id)
      )
    );
    updated += results.filter((r) => !r.error).length;
  }

  revalidatePath("/");
  revalidatePath("/yonetim");
  revalidatePath("/kategori");

  return {
    success: true,
    updated,
    already,
    missing,
    total: products.length,
    withPhoto: updated + already,
  };
}
