"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import type { ProductWithCategory } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { updateProduct, updateStock, uploadProductImage } from "@/actions/products";

type Props = {
  product: ProductWithCategory;
};

export function ProductManageRow({ product }: Props) {
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

  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                className="object-contain p-0.5"
                sizes="56px"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                Yok
              </div>
            )}
          </div>
          <div>
            <p className="font-medium text-slate-900">{product.name}</p>
            <p className="text-xs text-slate-500">
              {product.categories?.name ?? "—"}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
            />
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
          type="number"
          min={0}
          step={0.01}
          value={price}
          onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
          className="w-28 rounded border border-slate-300 px-2 py-1 text-sm"
          disabled={isPending}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={stock}
            onChange={(e) => setStock(parseInt(e.target.value, 10) || 0)}
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
