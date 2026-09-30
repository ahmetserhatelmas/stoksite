"use server";

import { readFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { fetchAllFrom } from "@/lib/supabase/fetch-all";
import { customerCode } from "@/lib/customer-code";

type CatalogCustomer = {
  code: string;
  name: string;
  note: string | null;
};

const BATCH = 200;

function noteWithCode(item: CatalogCustomer) {
  return item.note ? `Kod: ${item.code} | ${item.note}` : `Kod: ${item.code}`;
}

export async function importCariCatalog() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { error: "Bu işlem için admin girişi gerekli" };
  }

  const raw = await readFile(
    path.join(process.cwd(), "scripts/cari-catalog.json"),
    "utf8"
  );
  const catalog = JSON.parse(raw) as { customers: CatalogCustomer[] };
  const supabase = await createClient();

  let hasCodeColumn = true;
  let existing: { id: string; code?: string | null; note: string | null }[];
  try {
    existing = await fetchAllFrom(supabase, "customers", "id, code, note");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.toLowerCase().includes("code")) {
      return { error: message };
    }
    hasCodeColumn = false;
    try {
      existing = await fetchAllFrom(supabase, "customers", "id, note");
    } catch (fallbackErr) {
      return {
        error:
          fallbackErr instanceof Error
            ? fallbackErr.message
            : String(fallbackErr),
      };
    }
  }

  const byCode = new Set(
    existing
      .map((row) => customerCode({ code: row.code ?? null, note: row.note }))
      .filter((code): code is string => Boolean(code))
  );

  const toInsert: {
    code?: string;
    name: string;
    phone: null;
    note: string | null;
  }[] = [];
  let skipped = 0;

  for (const item of catalog.customers) {
    if (byCode.has(item.code)) {
      skipped += 1;
      continue;
    }
    const row = {
      name: item.name,
      phone: null,
      note: hasCodeColumn ? item.note : noteWithCode(item),
    };
    toInsert.push(hasCodeColumn ? { ...row, code: item.code } : row);
  }

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const { error } = await supabase.from("customers").insert(batch);
    if (error) return { error: error.message };
    inserted += batch.length;
  }

  revalidatePath("/");
  revalidatePath("/yonetim");
  revalidatePath("/faturalar");
  revalidatePath("/panel");
  revalidatePath("/admin");

  return { inserted, skipped, total: catalog.customers.length };
}
