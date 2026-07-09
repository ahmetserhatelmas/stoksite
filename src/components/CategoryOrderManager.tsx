"use client";

import { useTransition } from "react";
import type { CategoryWithChildren } from "@/lib/types";
import { moveCategory } from "@/actions/categories";

type Props = {
  categories: CategoryWithChildren[];
};

function OrderButtons({
  categoryId,
  isFirst,
  isLast,
}: {
  categoryId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      await moveCategory(categoryId, direction);
    });
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => handleMove("up")}
        disabled={isFirst || isPending}
        className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Yukarı taşı"
      >
        ▲
      </button>
      <button
        type="button"
        onClick={() => handleMove("down")}
        disabled={isLast || isPending}
        className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Aşağı taşı"
      >
        ▼
      </button>
    </div>
  );
}

export function CategoryOrderManager({ categories }: Props) {
  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <h2 className="text-lg font-semibold text-[#1e3a5f]">Kategori Sıralaması</h2>
        <p className="mt-1 text-sm text-slate-500">
          Ana sayfadaki kategori sırasını oklarla düzenleyin.
        </p>
      </div>

      <ul className="divide-y divide-slate-100">
        {categories.map((category, index) => (
          <li key={category.id}>
            <div className="flex items-center gap-2 px-3 py-3 sm:gap-4 sm:px-5">
              <span className="w-5 shrink-0 text-sm font-medium text-slate-400 sm:w-6">
                {index + 1}
              </span>
              <OrderButtons
                categoryId={category.id}
                isFirst={index === 0}
                isLast={index === categories.length - 1}
              />
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium text-slate-900">
                  {category.name}
                </p>
                {category.children && category.children.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {category.children.length} alt kategori
                  </p>
                )}
              </div>
            </div>

            {category.children && category.children.length > 0 && (
              <ul className="border-t border-slate-50 bg-slate-50/50">
                {category.children.map((child, childIndex) => (
                  <li
                    key={child.id}
                    className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 pl-8 last:border-b-0 sm:gap-4 sm:px-5 sm:pl-16"
                  >
                    <span className="w-5 shrink-0 text-xs text-slate-400 sm:w-6">
                      {index + 1}.{childIndex + 1}
                    </span>
                    <OrderButtons
                      categoryId={child.id}
                      isFirst={childIndex === 0}
                      isLast={childIndex === category.children!.length - 1}
                    />
                    <p className="min-w-0 flex-1 break-words text-sm text-slate-700">
                      {child.name}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
