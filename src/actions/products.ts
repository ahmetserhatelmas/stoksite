"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Product, ProductWithCategory } from "@/lib/types";

export async function getProductsByCategory(
  categoryId: string
): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", categoryId)
    .order("name");

  if (error) throw new Error(error.message);
  return data as Product[];
}

export async function getProductsByCategoryIds(
  categoryIds: string[]
): Promise<Product[]> {
  if (categoryIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("category_id", categoryIds)
    .order("name");

  if (error) throw new Error(error.message);
  return data as Product[];
}

export async function getAllProducts(): Promise<ProductWithCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(id, name, slug)")
    .order("name");

  if (error) throw new Error(error.message);
  return data as ProductWithCategory[];
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
