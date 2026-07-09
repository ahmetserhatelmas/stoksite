import { Navbar } from "@/components/Navbar";
import { CategoryGrid } from "@/components/CategoryGrid";
import { getCategories } from "@/actions/categories";

export default async function HomePage() {
  const categories = await getCategories();

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1e3a5f]">Ürün Kategorileri</h1>
          <p className="mt-2 text-slate-600">
            Kategori seçerek ürünleri görüntüleyin ve satış yapın.
          </p>
        </div>
        <CategoryGrid categories={categories} />
      </main>
    </>
  );
}
