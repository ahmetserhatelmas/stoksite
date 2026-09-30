import type { SupabaseClient } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;

export async function fetchAllRows<T>(
  query: {
    range: (
      from: number,
      to: number
    ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
  }
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await query.range(from, to);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

export async function fetchAllFrom<T>(
  supabase: SupabaseClient,
  table: string,
  columns: string
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, to);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}
