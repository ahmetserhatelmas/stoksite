import { OrderScreen } from "@/components/order/OrderScreen";
import { getCategories } from "@/actions/categories";
import { getAllProducts } from "@/actions/products";

export default async function HomePage() {
  const [categories, products] = await Promise.all([
    getCategories(),
    getAllProducts(),
  ]);

  return (
    <OrderScreen
      categories={categories}
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
