import { Navbar } from "@/components/Navbar";
import { AdminForms } from "@/components/AdminForms";
import { CategoryOrderManager } from "@/components/CategoryOrderManager";
import {
  ProductManageCard,
  ProductManageRow,
} from "@/components/ProductManageRow";
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
      <main className="mx-auto min-w-0 max-w-7xl flex-1 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold text-[#1e3a5f] sm:text-3xl">
            Stok Yönetimi
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Ürün ve kategori ekleyin, stok adetlerini güncelleyin.
          </p>
        </div>

        <AdminForms categories={categories} />

        <div className="mt-8 sm:mt-10">
          <CategoryOrderManager categories={categories} />
        </div>

        <div className="mt-8 sm:mt-10">
          <h2 className="mb-4 text-lg font-semibold text-[#1e3a5f] sm:text-xl">
            Tüm Ürünler ({products.length})
          </h2>

          <div className="space-y-4 md:hidden">
            {products.map((product) => (
              <ProductManageCard key={product.id} product={product} />
            ))}
            {products.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                Henüz ürün eklenmemiş.
              </p>
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
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
