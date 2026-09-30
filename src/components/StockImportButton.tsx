"use client";

import { useState, useTransition } from "react";
import { attachProductPhotos } from "@/actions/attach-photos";
import { importStockCatalog } from "@/actions/import-stock";

export function StockImportButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleImport() {
    setMessage(null);
    startTransition(async () => {
      const result = await importStockCatalog();
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setMessage(
        `${result.inserted} yeni ürün eklendi. Fotoğraflar için “Fotoğrafları bağla”ya basın.`
      );
    });
  }

  function handlePhotos() {
    setMessage(null);
    startTransition(async () => {
      const result = await attachProductPhotos();
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setMessage(
        `${result.withPhoto} ürüne fotoğraf bağlandı (${result.updated} güncellendi, ${result.missing} sitede yok).`
      );
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-[#1e3a5f]">Stok listesi aktarımı</p>
      <p className="mt-1 text-xs text-slate-500">
        Ürünler Excel’den gelir. Fotoğraflar Assos Metal sitesinden isim/model
        koduyla bağlanır. Sitede olmayan ürüne fotoğraf uydurulmaz.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleImport}
          disabled={isPending}
          className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#152a45] disabled:opacity-50"
        >
          {isPending ? "İşleniyor..." : "Stok listesini içe aktar"}
        </button>
        <button
          type="button"
          onClick={handlePhotos}
          disabled={isPending}
          className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-[#1a1a1a] hover:bg-[#e0c04a] disabled:opacity-50"
        >
          Fotoğrafları bağla
        </button>
      </div>
      {message && <p className="mt-2 text-sm text-slate-700">{message}</p>}
    </div>
  );
}
