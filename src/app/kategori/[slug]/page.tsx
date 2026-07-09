import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { SubCategoryGrid } from "@/components/SubCategoryGrid";
import {
  getCategoryBySlug,
  getCategories,
  getChildCategories,
} from "@/actions/categories";
import {
  getProductsByCategory,
  getProductsByCategoryIds,
} from "@/actions/products";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const [childCategories, directProducts, allCategories] = await Promise.all([
    getChildCategories(category.id),
    getProductsByCategory(category.id),
    getCategories(),
  ]);

  const childProducts =
    childCategories.length > 0
      ? await getProductsByCategoryIds(childCategories.map((c) => c.id))
      : [];

  const products =
    directProducts.length > 0 ? directProducts : childProducts;

  const parentCategory = category.parent_id
    ? allCategories
        .flatMap((c) => [c, ...(c.children ?? [])])
        .find((c) => c.id === category.parent_id)
    : null;

  const isParentCategory = childCategories.length > 0;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <nav className="mb-6 text-sm text-slate-500">
          <Link href="/" className="hover:text-[#1e3a5f]">
            Kategoriler
          </Link>
          {parentCategory && (
            <>
              <span className="mx-2">/</span>
              <Link
                href={`/kategori/${parentCategory.slug}`}
                className="hover:text-[#1e3a5f]"
              >
                {parentCategory.name}
              </Link>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-slate-900">{category.name}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1e3a5f]">{category.name}</h1>
          <p className="mt-2 text-slate-600">
            {isParentCategory
              ? `${childCategories.length} alt kategori`
              : `${products.length} ürün`}{" "}
            · Adet seçip &quot;Sat&quot; butonuna tıklayın
          </p>
        </div>

        {isParentCategory && (
          <SubCategoryGrid categories={childCategories} />
        )}

        {products.length > 0 ? (
          <section>
            {isParentCategory && (
              <h2 className="mb-4 text-lg font-semibold text-[#1e3a5f]">
                Tüm Ürünler
              </h2>
            )}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => {
                const productCategory = childCategories.find(
                  (c) => c.id === product.category_id
                );
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    categoryName={productCategory?.name ?? category.name}
                  />
                );
              })}
            </div>
          </section>
        ) : (
          !isParentCategory && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="text-slate-500">Bu kategoride henüz ürün yok.</p>
              <Link
                href="/yonetim"
                className="mt-4 inline-block text-sm text-[#1e3a5f] hover:underline"
              >
                Stok yönetiminden ürün ekleyin →
              </Link>
            </div>
          )
        )}

        {isParentCategory && products.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-slate-500">
              Bu ana kategoride henüz ürün yok. Yukarıdaki alt kategorilerden
              birini seçin veya stok yönetiminden ürün ekleyin.
            </p>
            <p className="mt-3 text-sm text-slate-400">
              Test ürünleri:{" "}
              <Link href="/kategori/kapi-hidrolikleri" className="text-[#1e3a5f] hover:underline">
                Kapı Hidrolikleri
              </Link>
              {" · "}
              <Link href="/kategori/kapi-aksesuarlari" className="text-[#1e3a5f] hover:underline">
                Kapı Aksesuarları
              </Link>
            </p>
          </div>
        )}
      </main>
    </>
  );
}
