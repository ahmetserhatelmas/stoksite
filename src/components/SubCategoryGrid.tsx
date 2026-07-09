import Link from "next/link";
import type { Category } from "@/lib/types";

type Props = {
  categories: Category[];
  title?: string;
};

export function SubCategoryGrid({ categories, title = "Alt Kategoriler" }: Props) {
  if (categories.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-semibold text-[#1e3a5f]">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/kategori/${category.slug}`}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#1e3a5f]/30 hover:shadow-md"
          >
            <h3 className="font-semibold text-[#1e3a5f]">{category.name}</h3>
            <p className="mt-2 text-sm text-slate-500">Ürünleri görüntüle →</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
