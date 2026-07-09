"use client";

import { useTransition } from "react";
import type { CategoryWithChildren } from "@/lib/types";
import { createProduct } from "@/actions/products";
import { createCategory } from "@/actions/categories";

type Props = {
  categories: CategoryWithChildren[];
};

function flattenCategories(categories: CategoryWithChildren[]) {
  const result: { id: string; name: string; depth: number }[] = [];
  for (const cat of categories) {
    result.push({ id: cat.id, name: cat.name, depth: 0 });
    for (const child of cat.children ?? []) {
      result.push({ id: child.id, name: child.name, depth: 1 });
    }
  }
  return result;
}

export function AdminForms({ categories }: Props) {
  const flatCategories = flattenCategories(categories);
  const [isPending, startTransition] = useTransition();

  function handleCreateProduct(formData: FormData) {
    startTransition(async () => {
      await createProduct(formData);
    });
  }

  function handleCreateCategory(formData: FormData) {
    startTransition(async () => {
      await createCategory(formData);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={handleCreateProduct} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-[#1e3a5f]">Yeni Ürün Ekle</h3>
        <div className="space-y-3">
          <input
            name="name"
            placeholder="Ürün adı"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            name="category_id"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Kategori seçin</option>
            {flatCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {"—".repeat(cat.depth)} {cat.name}
              </option>
            ))}
          </select>
          <textarea
            name="description"
            placeholder="Açıklama (opsiyonel)"
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              name="price"
              type="number"
              min={0}
              step={0.01}
              placeholder="Fiyat (₺)"
              defaultValue={0}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="stock_quantity"
              type="number"
              min={0}
              placeholder="Stok adedi"
              defaultValue={0}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-[#1e3a5f] py-2.5 text-sm font-medium text-white hover:bg-[#152a45]"
          >
            Ürün Ekle
          </button>
        </div>
      </form>

      <form action={handleCreateCategory} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-[#1e3a5f]">Yeni Kategori Ekle</h3>
        <div className="space-y-3">
          <input
            name="name"
            placeholder="Kategori adı"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            name="parent_id"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Ana kategori (üst yok)</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-[#1e3a5f] py-2.5 text-sm font-medium text-white hover:bg-[#152a45]"
          >
            Kategori Ekle
          </button>
        </div>
      </form>
    </div>
  );
}
