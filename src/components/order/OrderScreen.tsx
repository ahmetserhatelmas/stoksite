"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CategoryWithChildren, Product } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { sellOrder } from "@/actions/sales";

type Props = {
  categories: CategoryWithChildren[];
  products: Product[];
};

type CartMap = Record<string, number>;

function flattenCategories(categories: CategoryWithChildren[]) {
  const list: { id: string; name: string; parentId: string | null }[] = [];
  for (const cat of categories) {
    list.push({ id: cat.id, name: cat.name, parentId: null });
    for (const child of cat.children ?? []) {
      list.push({ id: child.id, name: child.name, parentId: cat.id });
    }
  }
  return list;
}

export function OrderScreen({ categories, products }: Props) {
  const router = useRouter();
  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    flatCategories[0]?.id ?? null
  );
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartMap>({});
  const [customerName, setCustomerName] = useState("Misafir Müşteri");
  const [draftCustomerName, setDraftCustomerName] = useState("Misafir Müşteri");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"products" | "cart">("products");
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function openCustomerModal() {
    setDraftCustomerName(customerName);
    setShowCustomerModal(true);
  }

  function saveCustomerName() {
    const next = draftCustomerName.trim();
    if (!next) return;
    setCustomerName(next);
    setShowCustomerModal(false);
  }

  const productCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      map.set(product.category_id, (map.get(product.category_id) ?? 0) + 1);
    }
    return map;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory =
        !selectedCategoryId || product.category_id === selectedCategoryId;
      const matchesSearch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        (product.description ?? "").toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategoryId, search]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([productId, quantity]) => {
        const product = products.find((p) => p.id === productId);
        if (!product || quantity <= 0) return null;
        return { product, quantity };
      })
      .filter((item): item is { product: Product; quantity: number } => item !== null);
  }, [cart, products]);

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const selectedCategoryName =
    flatCategories.find((c) => c.id === selectedCategoryId)?.name ?? "Tüm Ürünler";

  function getQty(productId: string) {
    return cart[productId] ?? 0;
  }

  function setQty(productId: string, quantity: number, maxStock: number) {
    const next = Math.max(0, Math.min(quantity, maxStock));
    setCart((prev) => {
      const copy = { ...prev };
      if (next <= 0) {
        delete copy[productId];
      } else {
        copy[productId] = next;
      }
      return copy;
    });
  }

  function clearCart() {
    setCart({});
  }

  function handleConfirmOrder() {
    setError(null);
    setShowConfirm(false);
    startTransition(async () => {
      const result = await sellOrder(
        cartItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        }))
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      clearCart();
      router.push(`/faturalar/${result.invoiceId}`);
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#ececec] text-slate-900">
      {/* Header */}
      <header className="border-b border-black/10 bg-[#2b2b2b] text-white">
        <div className="flex flex-wrap items-center gap-3 px-3 py-3 lg:px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-wide text-[#d4af37]">
              ASSOS METAL
            </p>
            <p className="truncate text-xs text-white/70">SİPARİŞ GİRİŞ EKRANI</p>
          </div>

          <div className="order-last w-full grow lg:order-none lg:mx-4 lg:max-w-xl">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ürün adı ile ara..."
              className="w-full rounded-lg border-0 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-2 ring-transparent focus:ring-[#d4af37]"
            />
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openCustomerModal}
              className="rounded-lg border border-white/20 px-3 py-2 text-xs font-medium hover:bg-white/10"
            >
              Cari Seç
            </button>
            <button
              type="button"
              onClick={() => {
                if (cartItems.length === 0) {
                  setError("Sepete ürün ekleyin");
                  return;
                }
                setShowConfirm(true);
              }}
              disabled={isPending || cartItems.length === 0}
              className="rounded-lg bg-[#d4af37] px-4 py-2 text-xs font-bold text-[#1a1a1a] hover:bg-[#e0c04a] disabled:opacity-50"
            >
              Siparişi Kaydet
            </button>
            <Link
              href="/yonetim"
              className="rounded-lg border border-white/20 px-3 py-2 text-xs font-medium hover:bg-white/10"
            >
              Stok
            </Link>
            <Link
              href="/faturalar"
              className="rounded-lg border border-white/20 px-3 py-2 text-xs font-medium hover:bg-white/10"
            >
              Faturalar
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile tabs */}
      <div className="flex border-b border-slate-300 bg-white lg:hidden">
        <button
          type="button"
          onClick={() => setMobilePanel("products")}
          className={`flex-1 py-3 text-sm font-medium ${
            mobilePanel === "products"
              ? "border-b-2 border-[#d4af37] text-[#1a1a1a]"
              : "text-slate-500"
          }`}
        >
          Ürünler
        </button>
        <button
          type="button"
          onClick={() => setMobilePanel("cart")}
          className={`flex-1 py-3 text-sm font-medium ${
            mobilePanel === "cart"
              ? "border-b-2 border-[#d4af37] text-[#1a1a1a]"
              : "text-slate-500"
          }`}
        >
          Sepet ({cartCount})
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Left categories */}
        <aside
          className={`w-56 shrink-0 overflow-y-auto bg-[#2b2b2b] text-white lg:block ${
            mobilePanel === "products" ? "hidden sm:block" : "hidden"
          }`}
        >
          <div className="border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white/50">
            Kategoriler
          </div>
          <ul>
            <li>
              <button
                type="button"
                onClick={() => setSelectedCategoryId(null)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                  selectedCategoryId === null
                    ? "bg-[#d4af37] font-semibold text-[#1a1a1a]"
                    : "hover:bg-white/5"
                }`}
              >
                <span>Tümü</span>
                <span className="text-xs opacity-70">{products.length}</span>
              </button>
            </li>
            {flatCategories.map((cat) => (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                    selectedCategoryId === cat.id
                      ? "bg-[#d4af37] font-semibold text-[#1a1a1a]"
                      : "hover:bg-white/5"
                  } ${cat.parentId ? "pl-7 text-[13px]" : ""}`}
                >
                  <span className="pr-2 leading-snug">{cat.name}</span>
                  <span className="shrink-0 text-xs opacity-70">
                    {productCountByCategory.get(cat.id) ?? 0}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Center products */}
        <main
          className={`min-w-0 flex-1 overflow-y-auto p-3 sm:p-4 ${
            mobilePanel === "products" ? "block" : "hidden lg:block"
          }`}
        >
          <div className="mb-3 sm:hidden">
            <select
              value={selectedCategoryId ?? ""}
              onChange={(e) =>
                setSelectedCategoryId(e.target.value || null)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Tüm kategoriler ({products.length})</option>
              {flatCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.parentId ? "— " : ""}
                  {cat.name} ({productCountByCategory.get(cat.id) ?? 0})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-lg font-bold text-[#1a1a1a] sm:text-xl">
              {search ? `Arama: “${search}”` : selectedCategoryName}
            </h1>
            <p className="text-sm text-slate-500">
              {filteredProducts.length} ürün
            </p>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              Bu filtrede ürün bulunamadı.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product, index) => {
                const qty = getQty(product.id);
                return (
                  <article
                    key={product.id}
                    className="relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    {qty > 0 && (
                      <span className="absolute right-2 top-2 z-10 flex h-7 min-w-7 items-center justify-center rounded-full bg-[#1e3a5f] px-2 text-xs font-bold text-white">
                        {qty}
                      </span>
                    )}
                    <div className="relative aspect-square bg-white">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          className="object-contain p-2"
                          sizes="220px"
                          priority={index < 4}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-400">
                          Görsel yok
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
                        {product.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Stok: {product.stock_quantity}
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#1e3a5f]">
                        {formatCurrency(product.price)}
                      </p>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                        <button
                          type="button"
                          onClick={() =>
                            setQty(product.id, qty - 1, product.stock_quantity)
                          }
                          disabled={qty <= 0}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-lg disabled:opacity-30"
                        >
                          −
                        </button>
                        <span className="min-w-6 text-center text-sm font-semibold">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setQty(product.id, qty + 1, product.stock_quantity)
                          }
                          disabled={qty >= product.stock_quantity}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-lg disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>

        {/* Right cart */}
        <aside
          className={`flex w-full shrink-0 flex-col overflow-hidden border-l border-slate-300 bg-white lg:w-80 xl:w-96 ${
            mobilePanel === "cart" ? "flex" : "hidden lg:flex"
          }`}
        >
          <div className="shrink-0 border-b border-slate-200 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Cari</p>
                <p className="truncate font-semibold text-slate-900">
                  {customerName}
                </p>
              </div>
              <button
                type="button"
                onClick={openCustomerModal}
                className="shrink-0 text-xs font-medium text-[#1e3a5f] hover:underline"
              >
                Değiştir
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {cartItems.length === 0 ? (
              <p className="px-4 py-4 text-sm text-slate-500">
                Sepet boş. Ürünlerden adet ekleyin.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {cartItems.map(({ product, quantity }) => (
                  <li key={product.id} className="flex gap-3 px-4 py-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          className="object-contain p-0.5"
                          sizes="48px"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-slate-900">
                        {product.name}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500">
                          {formatCurrency(product.price)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setQty(product.id, quantity - 1, product.stock_quantity)
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-sm font-medium hover:bg-slate-50"
                            aria-label="Adedi azalt"
                          >
                            −
                          </button>
                          <span className="min-w-6 text-center text-sm font-semibold">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setQty(product.id, quantity + 1, product.stock_quantity)
                            }
                            disabled={quantity >= product.stock_quantity}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-sm font-medium hover:bg-slate-50 disabled:opacity-30"
                            aria-label="Adedi artır"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-xs font-semibold text-slate-900">
                          {formatCurrency(product.price * quantity)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQty(product.id, 0, product.stock_quantity)}
                      className="shrink-0 self-start text-red-600 hover:text-red-700"
                      aria-label="Sepetten çıkar"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-slate-200 p-4">
              <div className="mb-2 flex justify-between text-sm text-slate-600">
                <span>Toplam Kalem</span>
                <span>{cartCount}</span>
              </div>
              <div className="mb-4 flex justify-between">
                <span className="font-semibold">Genel Toplam</span>
                <span className="text-xl font-bold text-[#1e3a5f]">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
              {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
              <button
                type="button"
                onClick={clearCart}
                disabled={cartItems.length === 0}
                className="mb-2 w-full text-sm font-medium text-red-600 hover:underline disabled:opacity-40"
              >
                Tümünü Temizle
              </button>
              <button
                type="button"
                onClick={() => {
                  if (cartItems.length === 0) {
                    setError("Sepete ürün ekleyin");
                    return;
                  }
                  setShowConfirm(true);
                }}
                disabled={isPending || cartItems.length === 0}
                className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isPending ? "İşleniyor..." : "Siparişi Onayla"}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#1a1a1a]">Cari Seç</h2>
            <p className="mt-2 text-sm text-slate-500">
              Sipariş için müşteri / cari adını girin.
            </p>
            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Cari / müşteri adı
              </span>
              <input
                autoFocus
                value={draftCustomerName}
                onChange={(e) => setDraftCustomerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveCustomerName();
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
                placeholder="Örn. ABC Yapı İnşaat Ltd. Şti."
              />
            </label>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={saveCustomerName}
                disabled={!draftCustomerName.trim()}
                className="flex-1 rounded-lg bg-[#1e3a5f] py-2.5 text-sm font-bold text-white hover:bg-[#152a45] disabled:opacity-50"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#1a1a1a]">Sipariş Onayı</h2>
            <p className="mt-3 text-sm text-slate-700">
              <span className="font-semibold">{cartCount} adet</span> ürün, toplam{" "}
              <span className="font-semibold">{formatCurrency(cartTotal)}</span>
            </p>
            <p className="mt-1 text-sm text-slate-500">Cari: {customerName}</p>
            <p className="mt-4 text-sm text-slate-600">
              Stoklar düşülecek ve fatura oluşturulacak. Onaylıyor musunuz?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={isPending}
                className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
              >
                Onayla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
