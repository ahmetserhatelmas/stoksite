import Link from "next/link";
import type { CategoryWithChildren } from "@/lib/types";

type Props = {
  categories: CategoryWithChildren[];
};

export function CategoryGrid({ categories }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {categories.map((category) => (
        <div
          key={category.id}
          className="rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
        >
          <Link
            href={`/kategori/${category.slug}`}
            className="block p-5"
          >
            <h3 className="font-semibold text-[#1e3a5f]">{category.name}</h3>
            {category.children && category.children.length > 0 && (
              <p className="mt-1 text-sm text-slate-500">
                {category.children.length} alt kategori
              </p>
            )}
          </Link>
          {category.children && category.children.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-3">
              <ul className="space-y-1">
                {category.children.slice(0, 4).map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/kategori/${child.slug}`}
                      className="text-sm text-slate-600 hover:text-[#1e3a5f]"
                    >
                      {child.name}
                    </Link>
                  </li>
                ))}
                {category.children.length > 4 && (
                  <li className="text-xs text-slate-400">
                    +{category.children.length - 4} daha
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
