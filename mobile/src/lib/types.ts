export type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
};

export type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  name: string;
  code: string | null;
  phone: string | null;
  note: string | null;
  created_at: string;
};

export type Invoice = {
  id: string;
  invoice_number: string;
  total_amount: number;
  created_at: string;
  customer_id: string | null;
  customer_name: string | null;
  invoice_date: string | null;
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  delivered: boolean;
};

export type InvoiceWithItems = Invoice & {
  invoice_items: InvoiceItem[];
};

export type CategoryWithChildren = Category & {
  children?: Category[];
};

export type ProductWithCategory = Product & {
  categories: Pick<Category, "id" | "name" | "slug"> | null;
};

export type AppUser = {
  id: string;
  name: string;
  username: string;
  role: "admin" | "user";
  created_at: string;
  password?: string;
};

export type SessionUser = Pick<AppUser, "id" | "name" | "username" | "role">;

export type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
  sender?: Pick<AppUser, "id" | "name" | "username" | "role"> | null;
  receiver?: Pick<AppUser, "id" | "name" | "username" | "role"> | null;
};
