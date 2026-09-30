"use client";

import { useRef, useState, useTransition } from "react";
import { ProductPhoto } from "@/components/ProductPhoto";
import type { ProductWithCategory } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { updateProduct, updateStock, uploadProductImage } from "@/actions/products";

type Props = {
  product: ProductWithCategory;
};

function useProductManage(product: ProductWithCategory) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stock, setStock] = useState(product.stock_quantity);
  const [price, setPrice] = useState(product.price);
  const [imageUrl, setImageUrl] = useState(product.image_url);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleStockUpdate() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateStock(product.id, stock);
      setMessage(result.error ?? "Stok güncellendi");
    });
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", product.id);
      formData.set("name", product.name);
      formData.set("price", String(price));
      formData.set("stock_quantity", String(stock));
      const result = await updateProduct(formData);
      setMessage(result.error ?? "Kaydedildi");
    });
  }

  function handleImageUpload(file: File) {
    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("image", file);
      const result = await uploadProductImage(product.id, formData);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      if (result.imageUrl) {
        setImageUrl(result.imageUrl);
      }
      setMessage("Görsel yüklendi");
    });
  }

  return {
    fileInputRef,
    stock,
    setStock,
    price,
    setPrice,
    imageUrl,
    message,
    isPending,
    handleStockUpdate,
    handleSave,
    handleImageUpload,
  };
}

function ProductImage({
  imageUrl,
  name,
  fileInputRef,
  isPending,
  onUpload,
}: {
  imageUrl: string | null;
  name: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isPending: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <>
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <ProductPhoto
          src={imageUrl}
          alt={name}
          className="absolute inset-0 h-full w-full object-contain p-0.5"
          emptyLabel="Yok"
        />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
      />
    </>
  );
}

export function ProductManageRow({ product }: Props) {
  const {
    fileInputRef,
    stock,
    setStock,
    price,
    setPrice,
    imageUrl,
    message,
    isPending,
    handleStockUpdate,
    handleSave,
    handleImageUpload,
  } = useProductManage(product);

  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <ProductImage
            imageUrl={imageUrl}
            name={product.name}
            fileInputRef={fileInputRef}
            isPending={isPending}
            onUpload={handleImageUpload}
          />
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{product.name}</p>
            <p className="text-xs text-slate-500">
              {product.categories?.name ?? "—"}
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="mt-1 text-xs text-[#1e3a5f] hover:underline"
            >
              Görsel yükle
            </button>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          inputMode="decimal"
          value={price}
          onChange={(e) => {
            const cleaned = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");
            setPrice(cleaned === "" || cleaned === "." ? 0 : parseFloat(cleaned) || 0);
          }}
          className="w-28 rounded border border-slate-300 px-2 py-1 text-sm"
          disabled={isPending}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={stock}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              setStock(digits === "" ? 0 : parseInt(digits, 10) || 0);
            }}
            className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
            disabled={isPending}
          />
          <button
            type="button"
            onClick={handleStockUpdate}
            disabled={isPending}
            className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            Stok
          </button>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {formatCurrency(price * stock)}
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-[#1e3a5f] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#152a45]"
        >
          Kaydet
        </button>
        {message && (
          <p className="mt-1 text-xs text-green-600">{message}</p>
        )}
      </td>
    </tr>
  );
}

export function ProductManageCard({ product }: Props) {
  const {
    fileInputRef,
    stock,
    setStock,
    price,
    setPrice,
    imageUrl,
    message,
    isPending,
    handleStockUpdate,
    handleSave,
    handleImageUpload,
  } = useProductManage(product);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <ProductImage
          imageUrl={imageUrl}
          name={product.name}
          fileInputRef={fileInputRef}
          isPending={isPending}
          onUpload={handleImageUpload}
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-900">{product.name}</p>
          <p className="text-xs text-slate-500">
            {product.categories?.name ?? "—"}
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            className="mt-1 text-xs text-[#1e3a5f] hover:underline"
          >
            Görsel yükle
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Fiyat</label>
          <input
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(e) => {
              const cleaned = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");
              setPrice(cleaned === "" || cleaned === "." ? 0 : parseFloat(cleaned) || 0);
            }}
            className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
            disabled={isPending}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Stok</label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={stock}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                setStock(digits === "" ? 0 : parseInt(digits, 10) || 0);
              }}
              className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-2 text-sm"
              disabled={isPending}
            />
            <button
              type="button"
              onClick={handleStockUpdate}
              disabled={isPending}
              className="shrink-0 rounded bg-slate-100 px-2 py-2 text-xs font-medium text-slate-700"
            >
              Stok
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Değer: <span className="font-medium">{formatCurrency(price * stock)}</span>
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#152a45]"
        >
          Kaydet
        </button>
      </div>

      {message && (
        <p className="mt-2 text-xs text-green-600">{message}</p>
      )}
    </div>
  );
}
