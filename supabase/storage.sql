-- Supabase Storage: ürün görselleri bucket'ı
-- schema.sql'den sonra çalıştırın

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Ürün görselleri herkese açık"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Ürün görseli yükleme"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Ürün görseli güncelleme"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images');

CREATE POLICY "Ürün görseli silme"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');
