/**
 * Ürün görselini Supabase Storage'a yükler ve products.image_url günceller.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const productName = process.argv[2];
const imagePath = process.argv[3];

if (!url || !key || !productName || !imagePath) {
  console.error(
    'Kullanım: node scripts/upload-product-image.mjs "Dormakaba TS 89 F" ./gorsel.png'
  );
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

const searchRes = await fetch(
  `${url}/rest/v1/products?name=ilike.*${encodeURIComponent(productName)}*&select=id,name`,
  { headers }
);
const products = await searchRes.json();

if (!products?.length) {
  console.error("Ürün bulunamadı:", productName);
  process.exit(1);
}

const product = products[0];
const fileBuffer = readFileSync(resolve(imagePath));
const extension = imagePath.split(".").pop()?.toLowerCase() ?? "png";
const contentType = extension === "jpg" ? "image/jpeg" : `image/${extension}`;
const filePath = `${product.id}/main.${extension}`;

const uploadRes = await fetch(
  `${url}/storage/v1/object/product-images/${filePath}`,
  {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: fileBuffer,
  }
);

if (!uploadRes.ok) {
  const err = await uploadRes.text();
  console.error("Yükleme hatası:", err);
  console.error("Önce supabase/storage.sql dosyasını Supabase SQL Editor'de çalıştırın.");
  process.exit(1);
}

const publicUrl = `${url}/storage/v1/object/public/product-images/${filePath}`;

const updateRes = await fetch(`${url}/rest/v1/products?id=eq.${product.id}`, {
  method: "PATCH",
  headers: {
    ...headers,
    Prefer: "return=minimal",
  },
  body: JSON.stringify({
    image_url: publicUrl,
    updated_at: new Date().toISOString(),
  }),
});

if (!updateRes.ok) {
  console.error("Veritabanı güncelleme hatası:", await updateRes.text());
  process.exit(1);
}

console.log("✓ Görsel yüklendi:", product.name);
console.log("  URL:", publicUrl);
