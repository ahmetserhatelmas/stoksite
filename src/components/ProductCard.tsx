"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { sellProduct } from "@/actions/sales";

type Props = {
  product: Product;
  categoryName: string;
};

export function ProductCard({ product, categoryName }: Props) {
  const router = useRouter();
  const [quantityInput, setQuantityInput] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function normalizeQuantity(value: string): number {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 1) return 1;
    return Math.min(parsed, product.stock_quantity);
  }

  function handleQuantityBlur() {
    const normalized = normalizeQuantity(quantityInput);
    setQuantityInput(String(normalized));
  }

  function stepQuantity(delta: number) {
    const current = normalizeQuantity(quantityInput);
    const next = Math.min(
      Math.max(current + delta, 1),
      product.stock_quantity
    );
    setQuantityInput(String(next));
  }

  function handleOpenConfirm() {
    const quantity = normalizeQuantity(quantityInput);
    setQuantityInput(String(quantity));
    setShowConfirm(true);
  }

  function handleSellConfirm() {
    const quantity = normalizeQuantity(quantityInput);
    setQuantityInput(String(quantity));
    setError(null);
    setShowConfirm(false);
    startTransition(async () => {
      const result = await sellProduct(product.id, quantity);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/faturalar/${result.invoiceId}`);
    });
  }

  const shortName = product.name.length > 28
    ? `${product.name.slice(0, 28)}...`
    : product.name;

  const quantity = normalizeQuantity(quantityInput);
  const totalPrice = product.price * quantity;

  return (
    <>
      <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="relative aspect-square w-full bg-white">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-contain p-2"
              sizes="(max-width: 768px) 100vw, 280px"
            />
          ) : (
            <>
              <div className="flex items-start justify-between bg-slate-50 px-4 py-3">
                <span className="text-xs font-medium text-slate-500">Assos Metal</span>
                <span className="max-w-[55%] rounded bg-[#1e3a5f] px-2 py-1 text-right text-[10px] font-medium leading-tight text-white">
                  {shortName}
                </span>
              </div>
              <div className="flex h-[calc(100%-44px)] items-center justify-center bg-slate-50 text-sm text-slate-400">
                Görsel yok
              </div>
            </>
          )}
        </div>

        <div className="flex flex-1 flex-col border-t border-slate-100 p-4">
          {!product.image_url && (
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              {categoryName}
            </p>
          )}
          <h3 className={`text-base font-semibold text-slate-900 ${product.image_url ? "" : "mt-2"}`}>
            {product.name}
          </h3>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
              {product.description}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Stok: <span className="font-semibold text-[#1e3a5f]">{product.stock_quantity}</span>
          </p>
          <p className="mt-2 text-lg font-bold text-[#1e3a5f]">
            {formatCurrency(product.price)}
          </p>

          <div className="mt-auto space-y-3 pt-4">
            <div className="flex items-center gap-2">
              <label htmlFor={`qty-${product.id}`} className="text-sm text-slate-600">
                Adet:
              </label>
              <div className="flex items-center gap-1">
                <input
                  id={`qty-${product.id}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={quantityInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d+$/.test(val)) {
                      setQuantityInput(val);
                    }
                  }}
                  onBlur={handleQuantityBlur}
                  className="w-14 rounded-lg border border-slate-300 py-1.5 text-center text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                  disabled={product.stock_quantity === 0 || isPending}
                />
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => stepQuantity(1)}
                    disabled={
                      product.stock_quantity === 0 ||
                      isPending ||
                      normalizeQuantity(quantityInput) >= product.stock_quantity
                    }
                    className="flex h-[18px] w-7 items-center justify-center rounded-t border border-b-0 border-slate-300 text-[10px] text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Adedi artır"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => stepQuantity(-1)}
                    disabled={
                      product.stock_quantity === 0 ||
                      isPending ||
                      normalizeQuantity(quantityInput) <= 1
                    }
                    className="flex h-[18px] w-7 items-center justify-center rounded-b border border-slate-300 text-[10px] text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Adedi azalt"
                  >
                    ▼
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="button"
              onClick={handleOpenConfirm}
              disabled={product.stock_quantity === 0 || isPending}
              className="w-full rounded-lg bg-[#1e3a5f] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#152a45] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "İşleniyor..." : product.stock_quantity === 0 ? "Stokta Yok" : "Sat"}
            </button>
          </div>
        </div>
      </article>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-[#1e3a5f]">Satış Onayı</h2>
            <p className="mt-3 text-slate-700">
              <span className="font-semibold">{quantity} adet</span>{" "}
              <span className="font-semibold">{product.name}</span> satıyorsunuz.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Toplam tutar: <span className="font-semibold text-slate-900">{formatCurrency(totalPrice)}</span>
            </p>
            <p className="mt-4 text-sm text-slate-600">Onaylıyor musunuz?</p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSellConfirm}
                disabled={isPending}
                className="flex-1 rounded-lg bg-[#1e3a5f] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#152a45] disabled:opacity-50"
              >
                Onayla
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
