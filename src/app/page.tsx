import { OrderScreen } from "@/components/order/OrderScreen";
import { getCategories } from "@/actions/categories";
import { getCustomers } from "@/actions/customers";
import { getAllProducts, getProductCountsByCategory } from "@/actions/products";
import { getSession } from "@/lib/session";
import { getUnreadConversationCount } from "@/actions/messages";

export default async function HomePage() {
  const [categories, products, customers, user, productCounts] = await Promise.all([
    getCategories(),
    getAllProducts(),
    getCustomers().catch(() => []),
    getSession(),
    getProductCountsByCategory(),
  ]);
  const unreadConversations = user
    ? await getUnreadConversationCount()
    : 0;

  return (
    <OrderScreen
      user={user}
      unreadConversations={unreadConversations}
      categories={categories}
      customers={customers}
      productCounts={productCounts}
      products={products.map((p) => ({
        id: p.id,
        category_id: p.category_id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        stock_quantity: p.stock_quantity,
        image_url: p.image_url,
        created_at: p.created_at,
        updated_at: p.updated_at,
      }))}
    />
  );
}
