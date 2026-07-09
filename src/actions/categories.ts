"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Category, CategoryWithChildren } from "@/lib/types";
import { slugify } from "@/lib/utils";

function sortCategories(list: Category[]): Category[] {
  return [...list].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }
    return a.name.localeCompare(b.name, "tr");
  });
}

export async function getCategories(): Promise<CategoryWithChildren[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("*");

  if (error) throw new Error(error.message);

  const categories = data as Category[];
  const parentCategories = sortCategories(
    categories.filter((c) => !c.parent_id)
  );
  const childMap = new Map<string, Category[]>();

  for (const cat of categories) {
    if (cat.parent_id) {
      const siblings = childMap.get(cat.parent_id) ?? [];
      siblings.push(cat);
      childMap.set(cat.parent_id, siblings);
    }
  }

  return parentCategories.map((parent) => ({
    ...parent,
    children: sortCategories(childMap.get(parent.id) ?? []),
  }));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data as Category;
}

export async function getChildCategories(parentId: string): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("parent_id", parentId);

  if (error) throw new Error(error.message);
  return sortCategories(data as Category[]);
}

export async function createCategory(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parent_id") ?? "").trim() || null;

  if (!name) {
    return { error: "Kategori adı gerekli" };
  }

  const supabase = await createClient();

  let maxQuery = supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  maxQuery = parentId
    ? maxQuery.eq("parent_id", parentId)
    : maxQuery.is("parent_id", null);

  const { data: maxRow } = await maxQuery.maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? 0) + 10;

  const { error } = await supabase.from("categories").insert({
    name,
    slug: slugify(name),
    parent_id: parentId,
    sort_order: nextOrder,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/yonetim");
  return { success: true };
}

export async function moveCategory(
  categoryId: string,
  direction: "up" | "down"
) {
  const supabase = await createClient();

  const { data: current, error: currentError } = await supabase
    .from("categories")
    .select("*")
    .eq("id", categoryId)
    .single();

  if (currentError || !current) {
    return { error: "Kategori bulunamadı" };
  }

  let siblingsQuery = supabase.from("categories").select("*");
  siblingsQuery = current.parent_id
    ? siblingsQuery.eq("parent_id", current.parent_id)
    : siblingsQuery.is("parent_id", null);

  const { data: siblings, error: siblingsError } = await siblingsQuery;

  if (siblingsError || !siblings) {
    return { error: siblingsError?.message ?? "Kategoriler alınamadı" };
  }

  const ordered = sortCategories(siblings as Category[]);
  const index = ordered.findIndex((c) => c.id === categoryId);

  if (index === -1) {
    return { error: "Kategori sırası bulunamadı" };
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;

  if (swapIndex < 0 || swapIndex >= ordered.length) {
    return { success: true };
  }

  const needsReindex =
    ordered.every((c) => c.sort_order === 0) ||
    new Set(ordered.map((c) => c.sort_order)).size !== ordered.length;

  if (needsReindex) {
    for (let i = 0; i < ordered.length; i++) {
      ordered[i].sort_order = (i + 1) * 10;
      await supabase
        .from("categories")
        .update({ sort_order: ordered[i].sort_order })
        .eq("id", ordered[i].id);
    }
  }

  const currentCat = ordered[index];
  const swapCat = ordered[swapIndex];

  const { error: updateCurrentError } = await supabase
    .from("categories")
    .update({ sort_order: swapCat.sort_order })
    .eq("id", currentCat.id);

  if (updateCurrentError) {
    return { error: updateCurrentError.message };
  }

  const { error: updateSwapError } = await supabase
    .from("categories")
    .update({ sort_order: currentCat.sort_order })
    .eq("id", swapCat.id);

  if (updateSwapError) {
    return { error: updateSwapError.message };
  }

  revalidatePath("/");
  revalidatePath("/yonetim");
  return { success: true };
}
