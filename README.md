# Stok & Fatura Yönetim Sistemi

Next.js ve Supabase ile kategori bazlı stok takibi, satış ve PDF fatura oluşturma uygulaması.

## Özellikler

- **Kategoriler**: Ana ve alt kategoriler (Assos Metal referanslı yapı)
- **Ürünler**: Kategori bazlı ürün listesi, fiyat ve stok takibi
- **Satış**: Adet seçip "Sat" butonu ile stoktan düşme + otomatik fatura
- **Faturalar**: Geçmiş faturaları görüntüleme ve PDF indirme
- **Stok Yönetimi**: Ürün/kategori ekleme, stok adedi güncelleme

## Kurulum

### 1. Bağımlılıklar

```bash
npm install
```

### 2. Supabase Projesi

1. [supabase.com](https://supabase.com) üzerinde yeni proje oluşturun
2. SQL Editor'de sırasıyla çalıştırın:
   - `supabase/schema.sql` — tablolar ve satış fonksiyonu
   - `supabase/seed.sql` — örnek kategoriler ve ürünler

### 3. Ortam Değişkenleri

`.env.local` dosyası oluşturun:

```bash
cp .env.example .env.local
```

Supabase proje ayarlarından `URL` ve `anon key` değerlerini ekleyin.

### 4. Çalıştırma

```bash
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) adresini açın.

## Sayfalar

| Sayfa | Açıklama |
|-------|----------|
| `/` | Kategori listesi |
| `/kategori/[slug]` | Kategori ürünleri ve satış |
| `/yonetim` | Stok yönetimi (ürün/kategori ekleme) |
| `/faturalar` | Fatura geçmişi |
| `/faturalar/[id]` | Fatura detayı + PDF indir |

## Satış Akışı

1. Kategori seç → ürün kartında adet gir
2. **Sat** butonuna tıkla
3. Stok otomatik düşer, fatura oluşur
4. Fatura detay sayfasına yönlendirilirsin
5. **PDF İndir** ile faturayı kaydet

## Teknolojiler

- Next.js 16 (App Router)
- Supabase (PostgreSQL)
- Tailwind CSS
- @react-pdf/renderer (PDF fatura)
