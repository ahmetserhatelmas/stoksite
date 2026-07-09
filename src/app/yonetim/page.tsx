import { Navbar } from "@/components/Navbar";
import { AdminForms } from "@/components/AdminForms";
import { CategoryOrderManager } from "@/components/CategoryOrderManager";
import { ProductManageRow } from "@/components/ProductManageRow";
import { getCategories } from "@/actions/categories";
import { getAllProducts } from "@/actions/products";

export default async function AdminPage() {
  const [categories, products] = await Promise.all([
    getCategories(),
    getAllProducts(),
  ]);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1e3a5f]">Stok Yönetimi</h1>
          <p className="mt-2 text-slate-600">
            Ürün ve kategori ekleyin, stok adetlerini güncelleyin.
          </p>
        </div>

        <AdminForms categories={categories} />

        <div className="mt-10">
          <CategoryOrderManager categories={categories} />
        </div>

        <div className="mt-10">
          <h2 className="mb-4 text-xl font-semibold text-[#1e3a5f]">
            Tüm Ürünler ({products.length})
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Ürün
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Fiyat
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Stok
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Stok Değeri
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <ProductManageRow key={product.id} product={product} />
                ))}
              </tbody>
            </table>
            {products.length === 0 && (
              <p className="p-8 text-center text-slate-500">
                Henüz ürün eklenmemiş.
              </p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
