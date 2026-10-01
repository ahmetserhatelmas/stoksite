import { sortCustomers } from "./customer-code";
import { fetchAll, supabase } from "./supabase";
import type {
  AppUser,
  Category,
  CategoryWithChildren,
  Customer,
  Invoice,
  InvoiceWithItems,
  Message,
  Product,
  ProductWithCategory,
  SessionUser,
} from "./types";

const cache = new Map<string, { at: number; data: unknown }>();
const CACHE_MS = 3 * 60 * 1000;

export function peekCache<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (!hit || Date.now() - hit.at > CACHE_MS) return undefined;
  return hit.data as T;
}

export function invalidateCache(keys?: string[]) {
  if (!keys) {
    cache.clear();
    return;
  }
  for (const key of keys) cache.delete(key);
}

async function remember<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = peekCache<T>(key);
  if (hit) return hit;
  const data = await load();
  cache.set(key, { at: Date.now(), data });
  return data;
}

function sortCategories(list: Category[]) {
  return [...list].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.name.localeCompare(b.name, "tr");
  });
}

export async function loginUser(
  username: string,
  password: string
): Promise<{ user?: SessionUser; error?: string }> {
  const { data, error } = await supabase
    .from("app_users")
    .select("id, name, username, role, password")
    .eq("username", username.trim())
    .single();

  if (error || !data || data.password !== password) {
    return { error: "Kullanıcı adı veya şifre hatalı" };
  }

  return {
    user: {
      id: data.id,
      name: data.name,
      username: data.username,
      role: data.role,
    },
  };
}

export async function getCategories(): Promise<CategoryWithChildren[]> {
  return remember("categories", async () => {
  const { data, error } = await supabase.from("categories").select("*");
  if (error) throw new Error(error.message);
  const categories = data as Category[];
  const parents = sortCategories(categories.filter((c) => !c.parent_id));
  const childMap = new Map<string, Category[]>();
  for (const cat of categories) {
    if (!cat.parent_id) continue;
    const siblings = childMap.get(cat.parent_id) ?? [];
    siblings.push(cat);
    childMap.set(cat.parent_id, siblings);
  }
  return parents.map((parent) => ({
    ...parent,
    children: sortCategories(childMap.get(parent.id) ?? []),
  }));
  });
}

export async function getAllProducts(): Promise<ProductWithCategory[]> {
  return remember("products", () =>
    fetchAll(
      supabase.from("products").select("*, categories(id, name, slug)").order("name")
    )
  );
}

export async function getCustomers(): Promise<Customer[]> {
  return remember("customers", async () => {
    const rows = await fetchAll<Customer>(
      supabase.from("customers").select("*").order("name")
    );
    return sortCustomers(rows);
  });
}

export async function createCustomer(input: {
  name: string;
  code?: string | null;
  phone?: string | null;
  note?: string | null;
}): Promise<{ customer?: Customer; error?: string }> {
  const name = input.name.trim();
  const code = input.code?.trim() || null;
  const phone = input.phone?.trim() || null;
  const note = input.note?.trim() || null;
  if (!name) return { error: "Müşteri adı gerekli" };

  const first = await supabase
    .from("customers")
    .insert({ name, code, phone, note })
    .select("*")
    .single();

  if (!first.error) {
    invalidateCache(["customers"]);
    return { customer: first.data as Customer };
  }

  if (!first.error.message.toLowerCase().includes("code")) {
    return { error: first.error.message };
  }

  const fallbackNote = code
    ? note
      ? `Kod: ${code} | ${note}`
      : `Kod: ${code}`
    : note;
  const second = await supabase
    .from("customers")
    .insert({ name, phone, note: fallbackNote })
    .select("*")
    .single();
  if (second.error) return { error: second.error.message };
  invalidateCache(["customers"]);
  return { customer: second.data as Customer };
}

export async function updateCustomer(input: {
  id: string;
  name: string;
  code?: string | null;
  phone?: string | null;
}): Promise<{ customer?: Customer; error?: string }> {
  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
  };
  if (input.code !== undefined) payload.code = input.code?.trim() || null;

  const { data, error } = await supabase
    .from("customers")
    .update(payload)
    .eq("id", input.id)
    .select("*")
    .single();

  if (!error) {
    invalidateCache(["customers"]);
    return { customer: data as Customer };
  }
  if (!error.message.toLowerCase().includes("code")) {
    return { error: error.message };
  }

  const existing = await supabase
    .from("customers")
    .select("note")
    .eq("id", input.id)
    .single();
  const rest = existing.data?.note?.replace(/^Kod:\s*[^|]+\s*\|\s*/, "") ?? null;
  const nextNote = input.code
    ? rest
      ? `Kod: ${input.code} | ${rest}`
      : `Kod: ${input.code}`
    : rest;
  const retry = await supabase
    .from("customers")
    .update({ name: input.name.trim(), phone: input.phone?.trim() || null, note: nextNote })
    .eq("id", input.id)
    .select("*")
    .single();
  if (retry.error) return { error: retry.error.message };
  invalidateCache(["customers"]);
  return { customer: retry.data as Customer };
}

export async function deleteCustomer(id: string) {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return { error: error.message };
  invalidateCache(["customers"]);
  return { success: true };
}

export async function sellOrder(
  items: { productId: string; quantity: number }[],
  options: { customerId?: string | null; customerName?: string | null } = {}
) {
  const cleaned = items
    .map((item) => ({
      product_id: item.productId,
      quantity: Math.floor(item.quantity),
    }))
    .filter((item) => item.quantity > 0);

  if (cleaned.length === 0) {
    return { error: "Siparişte en az bir ürün olmalıdır" };
  }

  const { data, error } = await supabase.rpc("sell_order", { p_items: cleaned });
  let result = Array.isArray(data) ? data[0] : data;

  if (error) {
    if (
      cleaned.length === 1 &&
      (error.message.includes("sell_order") ||
        error.message.includes("Could not find the function"))
    ) {
      const single = await supabase.rpc("sell_product", {
        p_product_id: cleaned[0].product_id,
        p_quantity: cleaned[0].quantity,
      });
      if (single.error) return { error: single.error.message };
      result = Array.isArray(single.data) ? single.data[0] : single.data;
    } else {
      return { error: error.message };
    }
  }

  const invoiceId = result?.invoice_id as string | undefined;
  if (invoiceId) {
    await supabase
      .from("invoices")
      .update({
        customer_id: options.customerId ?? null,
        customer_name: options.customerName ?? null,
        invoice_date: new Date().toISOString(),
      })
      .eq("id", invoiceId);
  }

  invalidateCache(["products", "invoices"]);
  return {
    success: true,
    invoiceId,
    invoiceNumber: result?.invoice_number as string,
  };
}

export async function getInvoices(): Promise<Invoice[]> {
  return remember("invoices", async () => {
    const rows = await fetchAll<Invoice>(
      supabase
        .from("invoices")
        .select("*")
        .order("invoice_date", { ascending: false })
        .order("created_at", { ascending: false })
    );
    return rows.map((row) => ({ ...row, total_amount: Number(row.total_amount) }));
  });
}

export async function getInvoiceById(id: string): Promise<InvoiceWithItems | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return {
    ...data,
    total_amount: Number(data.total_amount),
    invoice_items: (data.invoice_items ?? [])
      .map((item: Record<string, unknown>) => ({
        ...item,
        product_name: String(item.product_name ?? ""),
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        subtotal: Number(item.subtotal),
        delivered: Boolean(item.delivered),
      }))
      .filter(
        (item: { quantity: number; product_name: string }) =>
          item.quantity > 0 && item.product_name.trim().length > 0
      ),
  } as InvoiceWithItems;
}

export async function deleteInvoices(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return { error: "Silinecek fatura seçilmedi" };
  const { error } = await supabase.from("invoices").delete().in("id", unique);
  if (error) return { error: error.message };
  invalidateCache(["invoices"]);
  return { success: true, count: unique.length };
}

export async function updateInvoiceMeta(
  invoiceId: string,
  input: {
    invoiceDate?: string;
    customerId?: string | null;
    customerName?: string | null;
  }
) {
  const payload: Record<string, unknown> = {};
  if (input.invoiceDate) payload.invoice_date = new Date(input.invoiceDate).toISOString();
  if (input.customerId !== undefined) payload.customer_id = input.customerId;
  if (input.customerName !== undefined) payload.customer_name = input.customerName;
  const { error } = await supabase.from("invoices").update(payload).eq("id", invoiceId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function updateInvoiceItemQuantity(
  itemId: string,
  invoiceId: string,
  quantity: number
) {
  if (quantity <= 0) return { error: "Adet 0'dan büyük olmalıdır" };
  const { data: item, error: itemError } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("id", itemId)
    .single();
  if (itemError || !item) return { error: "Kalem bulunamadı" };
  const subtotal = Number(item.unit_price) * quantity;
  const { error } = await supabase
    .from("invoice_items")
    .update({ quantity, subtotal })
    .eq("id", itemId);
  if (error) return { error: error.message };
  const { data: items } = await supabase
    .from("invoice_items")
    .select("subtotal")
    .eq("invoice_id", invoiceId);
  const total = (items ?? []).reduce((sum, row) => sum + Number(row.subtotal), 0);
  await supabase.from("invoices").update({ total_amount: total }).eq("id", invoiceId);
  return { success: true };
}

export async function toggleInvoiceItemDelivered(
  itemId: string,
  delivered: boolean
) {
  const { error } = await supabase
    .from("invoice_items")
    .update({ delivered })
    .eq("id", itemId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function getUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from("app_users")
    .select("id, name, username, role, created_at")
    .order("name");
  if (error) throw new Error(error.message);
  return data as AppUser[];
}

export async function getAdminUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from("app_users")
    .select("id, name, username, role, password, created_at")
    .order("name");
  if (error) throw new Error(error.message);
  return data as AppUser[];
}

export async function createAppUser(input: {
  name: string;
  username: string;
  password: string;
  role: "admin" | "user";
}) {
  const name = input.name.trim();
  const username = input.username.trim();
  const password = input.password.trim();
  if (!name || !username || !password) {
    return { error: "Ad, kullanıcı adı ve şifre gerekli" };
  }
  const { data, error } = await supabase
    .from("app_users")
    .insert({ name, username, password, role: input.role })
    .select("id, name, username, role, password, created_at")
    .single();
  if (error) {
    if (error.code === "23505") return { error: "Bu kullanıcı adı alınmış" };
    return { error: error.message };
  }
  return { user: data as AppUser };
}

export async function updateAppUser(
  id: string,
  input: { username?: string; password?: string }
) {
  if (!id) return { error: "Kullanıcı seçilmedi" };
  const username = input.username?.trim();
  const password = input.password?.trim();
  const patch: { username?: string; password?: string } = {};
  if (username) patch.username = username;
  if (password) patch.password = password;
  if (!patch.username && !patch.password) {
    return { error: "Kullanıcı adı veya şifre gerekli" };
  }
  const { error } = await supabase.from("app_users").update(patch).eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: "Bu kullanıcı adı alınmış" };
    return { error: error.message };
  }
  return { success: true };
}

export async function deleteAppUser(id: string, currentUserId: string) {
  if (!id) return { error: "Kullanıcı seçilmedi" };
  if (id === currentUserId) return { error: "Kendi hesabınızı silemezsiniz" };
  const { data: admins, error: adminError } = await supabase
    .from("app_users")
    .select("id, role")
    .eq("role", "admin");
  if (adminError) return { error: adminError.message };
  const target = (admins ?? []).find((row) => row.id === id);
  if (target && (admins ?? []).length <= 1) {
    return { error: "Son admin silinemez" };
  }
  const { error } = await supabase.from("app_users").delete().eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function getMessages(userId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(
      "*, sender:app_users!messages_sender_id_fkey(id, name, username, role), receiver:app_users!messages_receiver_id_fkey(id, name, username, role)"
    )
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data as Message[];
}

export async function getUnreadConversationCount(userId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("sender_id")
    .eq("receiver_id", userId)
    .eq("is_read", false);
  if (error || !data) return 0;
  return new Set(data.map((row) => row.sender_id)).size;
}

export async function markConversationRead(userId: string, otherUserId: string) {
  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("receiver_id", userId)
    .eq("sender_id", otherUserId)
    .eq("is_read", false);
  if (error) return { error: error.message };
  return { success: true };
}

export async function sendMessage(
  senderId: string,
  receiverId: string,
  body: string
) {
  const text = body.trim();
  if (!receiverId || !text) return { error: "Alıcı ve mesaj gerekli" };
  const { error } = await supabase.from("messages").insert({
    sender_id: senderId,
    receiver_id: receiverId,
    body: text,
    is_read: false,
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function updateStock(productId: string, quantity: number) {
  if (quantity < 0) return { error: "Stok negatif olamaz" };
  const { error } = await supabase
    .from("products")
    .update({ stock_quantity: quantity, updated_at: new Date().toISOString() })
    .eq("id", productId);
  if (error) return { error: error.message };
  invalidateCache(["products"]);
  return { success: true };
}

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createProduct(input: {
  name: string;
  categoryId: string;
  description?: string;
  price: number;
  stockQuantity: number;
}): Promise<{ product?: ProductWithCategory; error?: string }> {
  const name = input.name.trim();
  if (!name || !input.categoryId) return { error: "Ürün adı ve kategori gerekli" };
  const { data, error } = await supabase
    .from("products")
    .insert({
      name,
      category_id: input.categoryId,
      description: input.description?.trim() || null,
      price: Number.isFinite(input.price) ? input.price : 0,
      stock_quantity: Number.isFinite(input.stockQuantity) ? input.stockQuantity : 0,
    })
    .select("*, categories(id, name, slug)")
    .single();
  if (error) return { error: error.message };
  invalidateCache(["products"]);
  return { product: data as ProductWithCategory };
}

export async function uploadProductPhoto(productId: string, uri: string, mime?: string) {
  const contentType = mime && mime.startsWith("image/") ? mime : "image/jpeg";
  const ext = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : contentType.includes("gif")
        ? "gif"
        : "jpg";
  const response = await fetch(uri);
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > 5 * 1024 * 1024) {
    return { error: "Fotoğraf 5 MB'dan büyük" };
  }
  const filePath = `${productId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(filePath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) return { error: error.message };
  const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
  const { error: updateError } = await supabase
    .from("products")
    .update({ image_url: data.publicUrl, updated_at: new Date().toISOString() })
    .eq("id", productId);
  if (updateError) return { error: updateError.message };
  invalidateCache(["products"]);
  return { imageUrl: data.publicUrl };
}

export async function clearProductPhoto(productId: string) {
  const { error } = await supabase
    .from("products")
    .update({ image_url: null, updated_at: new Date().toISOString() })
    .eq("id", productId);
  if (error) return { error: error.message };
  invalidateCache(["products"]);
  return { success: true };
}

export async function updateProduct(input: {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  stockQuantity: number;
}): Promise<{ product?: ProductWithCategory; error?: string }> {
  const name = input.name.trim();
  if (!input.id || !name || !input.categoryId) return { error: "Ürün bilgileri eksik" };
  const { data, error } = await supabase
    .from("products")
    .update({
      name,
      category_id: input.categoryId,
      price: Number.isFinite(input.price) ? input.price : 0,
      stock_quantity: Number.isFinite(input.stockQuantity) ? input.stockQuantity : 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("*, categories(id, name, slug)")
    .single();
  if (error) return { error: error.message };
  invalidateCache(["products"]);
  return { product: data as ProductWithCategory };
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: error.message };
  invalidateCache(["products"]);
  return { success: true };
}

export async function createCategory(name: string, parentId: string | null) {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Kategori adı gerekli" };

  let sameName = supabase.from("categories").select("id").ilike("name", trimmed);
  sameName = parentId ? sameName.eq("parent_id", parentId) : sameName.is("parent_id", null);
  const { data: duplicate } = await sameName.limit(1);
  if (duplicate && duplicate.length > 0) {
    return { error: parentId ? "Bu alt kategori zaten var" : "Bu ana kategori zaten var" };
  }

  let maxQuery = supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  maxQuery = parentId
    ? maxQuery.eq("parent_id", parentId)
    : maxQuery.is("parent_id", null);
  const { data: maxRow } = await maxQuery.maybeSingle();
  const base = slugify(trimmed) || "kategori";
  const sortOrder = (maxRow?.sort_order ?? 0) + 10;

  for (let attempt = 0; attempt < 8; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data, error } = await supabase
      .from("categories")
      .insert({
        name: trimmed,
        slug,
        parent_id: parentId,
        sort_order: sortOrder,
      })
      .select("*")
      .single();
    if (!error && data) {
      invalidateCache(["categories"]);
      return { category: data as Category };
    }
    const message = error?.message ?? "";
    const slugTaken = message.includes("categories_slug_key") || message.includes("duplicate key");
    if (!slugTaken) return { error: message || "Kategori eklenemedi" };
  }

  return { error: "Bu isimle kategori eklenemedi" };
}

export async function updateCategory(id: string, name: string) {
  const trimmed = name.trim();
  if (!id || !trimmed) return { error: "Kategori adı gerekli" };
  const slug = slugify(trimmed) || id.slice(0, 8);
  const first = await supabase.from("categories").update({ name: trimmed, slug }).eq("id", id);
  if (!first.error) {
    invalidateCache(["categories"]);
    return { success: true };
  }
  const retry = await supabase
    .from("categories")
    .update({ name: trimmed, slug: `${slug}-${id.slice(0, 6)}` })
    .eq("id", id);
  if (retry.error) return { error: retry.error.message };
  invalidateCache(["categories"]);
  return { success: true };
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };
  invalidateCache(["categories", "products"]);
  return { success: true };
}
