-- Mevcut veritabanını düzeltmek için çalıştırın
-- Yanlış alt kategorileri kaldırır, PALMO / YALE / DESİ ekler

-- Eski yanlış alt kategorileri ana kategoriye taşı (parent_id = null)
UPDATE categories
SET parent_id = NULL
WHERE slug IN (
  'celik-kapi-kilitleri',
  'saft-kapak-pano-kilitleri',
  'merter-akilli-kilit',
  'tirajli-kilitler',
  'radar-sensor',
  'manyetik-kilitler',
  'elektrikli-kilit-karsiligi-bas-ac',
  'bareller'
);

-- Eksik ana kategorileri ekle
INSERT INTO categories (name, slug) VALUES
  ('ÇELİK KAPI KİLİTLERİ', 'celik-kapi-kilitleri'),
  ('ŞAFT KAPAK PANO KİLİTLERİ', 'saft-kapak-pano-kilitleri'),
  ('MERTER AKILLI KİLİT', 'merter-akilli-kilit'),
  ('TİRAJLI KİLİTLER', 'tirajli-kilitler'),
  ('RADAR SENSÖR', 'radar-sensor'),
  ('MANYETİK KİLİTLER', 'manyetik-kilitler'),
  ('ELEKTRİKLİ KİLİT KARŞILIĞI BAS AÇ', 'elektrikli-kilit-karsiligi-bas-ac'),
  ('BARELLER', 'bareller')
ON CONFLICT (slug) DO UPDATE SET parent_id = NULL;

-- Doğru alt kategorileri ekle (PALMO, YALE, DESİ)
INSERT INTO categories (name, slug, parent_id)
SELECT sub.name, sub.slug, parent.id
FROM categories parent
CROSS JOIN (VALUES
  ('PALMO', 'palmo'),
  ('YALE', 'yale'),
  ('DESİ', 'desi')
) AS sub(name, slug)
WHERE parent.slug = 'akilli-guvenlik-sistemleri'
ON CONFLICT (slug) DO UPDATE
SET parent_id = EXCLUDED.parent_id,
    name = EXCLUDED.name;

-- Örnek ürünler - PALMO
INSERT INTO products (category_id, name, description, price, stock_quantity)
SELECT c.id, p.name, p.description, p.price, p.stock
FROM categories c
CROSS JOIN (VALUES
  ('Palmo Akıllı Kapı Kilidi', 'Parmak izi ve şifreli akıllı kilit', 3200.00, 18),
  ('Palmo WiFi Akıllı Kilit', 'WiFi bağlantılı akıllı kapı kilidi', 4500.00, 12),
  ('Palmo Kartlı Geçiş Sistemi', 'RFID kartlı geçiş kontrol sistemi', 2800.00, 25)
) AS p(name, description, price, stock)
WHERE c.slug = 'palmo'
AND NOT EXISTS (SELECT 1 FROM products pr WHERE pr.category_id = c.id);

-- Örnek ürünler - YALE
INSERT INTO products (category_id, name, description, price, stock_quantity)
SELECT c.id, p.name, p.description, p.price, p.stock
FROM categories c
CROSS JOIN (VALUES
  ('Yale Akıllı Kapı Kilidi Linus', 'Yale Linus akıllı kilit sistemi', 5200.00, 10),
  ('Yale Dijital Kapı Kilidi', 'Tuş takımlı dijital kilit', 3800.00, 15),
  ('Yale Akıllı Alarm Seti', 'Yale akıllı güvenlik alarm seti', 6500.00, 8)
) AS p(name, description, price, stock)
WHERE c.slug = 'yale'
AND NOT EXISTS (SELECT 1 FROM products pr WHERE pr.category_id = c.id);

-- Örnek ürünler - DESİ
INSERT INTO products (category_id, name, description, price, stock_quantity)
SELECT c.id, p.name, p.description, p.price, p.stock
FROM categories c
CROSS JOIN (VALUES
  ('Desi Akıllı Kapı Kilidi', 'Desi parmak izi akıllı kilit', 2900.00, 20),
  ('Desi WiFi Akıllı Kilit Pro', 'Desi WiFi akıllı kilit pro model', 4100.00, 14),
  ('Desi Akıllı Zil Seti', 'Desi video interkom zil seti', 3500.00, 16)
) AS p(name, description, price, stock)
WHERE c.slug = 'desi'
AND NOT EXISTS (SELECT 1 FROM products pr WHERE pr.category_id = c.id);
