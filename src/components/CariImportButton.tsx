"use client";

import { useState, useTransition } from "react";
import { importCariCatalog } from "@/actions/import-customers";

export function CariImportButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleImport() {
    setMessage(null);
    startTransition(async () => {
      const result = await importCariCatalog();
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setMessage(
        `${result.inserted} yeni cari eklendi, ${result.skipped} zaten vardı (toplam ${result.total} kod).`
      );
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-[#1e3a5f]">Cari hesap aktarımı</p>
      <p className="mt-1 text-xs text-slate-500">
        Excel’deki 1150 cari, hesap kodlarıyla birlikte eklenir. Aynı kod varsa
        unvan ve vergi bilgisi güncellenir.
      </p>
      <button
        type="button"
        onClick={handleImport}
        disabled={isPending}
        className="mt-3 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#152a45] disabled:opacity-50"
      >
        {isPending ? "Aktarılıyor..." : "Carileri içe aktar"}
      </button>
      {message && <p className="mt-2 text-sm text-slate-700">{message}</p>}
    </div>
  );
}
