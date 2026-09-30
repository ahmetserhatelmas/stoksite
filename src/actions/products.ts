"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Product, ProductWithCategory } from "@/lib/types";

const PAGE_SIZE = 1000;

async function fetchProductPages<T>(
  build: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

export async function getProductsByCategory(
  categoryId: string
): Promise<Product[]> {
  const supabase = await createClient();
  return fetchProductPages((from, to) =>
    supabase
      .from("products")
      .select("*")
      .eq("category_id", categoryId)
      .order("name")
      .range(from, to)
  );
}

export async function getProductsByCategoryIds(
  categoryIds: string[]
): Promise<Product[]> {
  if (categoryIds.length === 0) return [];

  const supabase = await createClient();
  return fetchProductPages((from, to) =>
    supabase
      .from("products")
      .select("*")
      .in("category_id", categoryIds)
      .order("name")
      .range(from, to)
  );
}

export async function getAllProducts(): Promise<ProductWithCategory[]> {
  const supabase = await createClient();
  return fetchProductPages((from, to) =>
    supabase
      .from("products")
      .select("*, categories(id, name, slug)")
      .order("name")
      .range(from, to)
  );
}

export async function getProductCountsByCategory(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const rows = await fetchProductPages<{ category_id: string }>((from, to) =>
    supabase.from("products").select("category_id").range(from, to)
  );
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
  }
  return counts;
}

export async function createProduct(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const price = parseFloat(String(formData.get("price") ?? "0"));
  const stockQuantity = parseInt(String(formData.get("stock_quantity") ?? "0"), 10);

  if (!name || !categoryId) {
    return { error: "Ürün adı ve kategori gerekli" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    name,
    category_id: categoryId,
    description,
    price: isNaN(price) ? 0 : price,
    stock_quantity: isNaN(stockQuantity) ? 0 : stockQuantity,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/yonetim");
  return { success: true };
}

export async function updateStock(productId: string, quantity: number) {
  if (quantity < 0) {
    return { error: "Stok negatif olamaz" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ stock_quantity: quantity, updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/yonetim");
  return { success: true };
}

export async function updateProduct(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const price = parseFloat(String(formData.get("price") ?? "0"));
  const stockQuantity = parseInt(String(formData.get("stock_quantity") ?? "0"), 10);

  if (!id || !name) {
    return { error: "Ürün bilgileri eksik" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name,
      price: isNaN(price) ? 0 : price,
      stock_quantity: isNaN(stockQuantity) ? 0 : stockQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/yonetim");
  return { success: true };
}

export async function uploadProductImage(productId: string, formData: FormData) {
  const file = formData.get("image");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Görsel dosyası seçin" };
  }

  const supabase = await createClient();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filePath = `${productId}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("product-images").getPublicUrl(filePath);

  const { error: updateError } = await supabase
    .from("products")
    .update({
      image_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/");
  revalidatePath("/yonetim");
  return { success: true, imageUrl: publicUrl };
}
