-- Örnek kategoriler ve ürünler (Assos Metal referanslı)
-- schema.sql'den sonra çalıştırın

-- Ana kategoriler
INSERT INTO categories (name, slug) VALUES
  ('KAPI HİDROLİKLERİ', 'kapi-hidrolikleri'),
  ('KAPI ÇEKME KOLLARI', 'kapi-cekme-kollari'),
  ('KAPI AKSESUARLARI', 'kapi-aksesuarlari'),
  ('YANGIN KAPISI DONANIMLARI', 'yangin-kapisi-donanimlari'),
  ('DORAS PARA KASALARI', 'doras-para-kasalari'),
  ('KAPI TAKTAK', 'kapi-taktak'),
  ('PİVOT KAPI MENTEŞE', 'pivot-kapi-mentese'),
  ('AKILLI GÜVENLİK SİSTEMLERİ', 'akilli-guvenlik-sistemleri'),
  ('ÇELİK KAPI KİLİTLERİ', 'celik-kapi-kilitleri'),
  ('ŞAFT KAPAK PANO KİLİTLERİ', 'saft-kapak-pano-kilitleri'),
  ('MERTER AKILLI KİLİT', 'merter-akilli-kilit'),
  ('TİRAJLI KİLİTLER', 'tirajli-kilitler'),
  ('RADAR SENSÖR', 'radar-sensor'),
  ('MANYETİK KİLİTLER', 'manyetik-kilitler'),
  ('ELEKTRİKLİ KİLİT KARŞILIĞI BAS AÇ', 'elektrikli-kilit-karsiligi-bas-ac'),
  ('BARELLER', 'bareller'),
  ('ALÜMİNYUM AÇMA KOLLAR', 'aluminyum-acma-kollar'),
  ('ALÜMİNYUM ODA WC KAPI KOLLARI', 'aluminyum-oda-wc-kapi-kollari'),
  ('PASLANMAZ AÇMA KOLLAR', 'paslanmaz-acma-kollar'),
  ('PASLANMAZ ODA WC KAPI KOLLARI', 'paslanmaz-oda-wc-kapi-kollari'),
  ('ZAMAK ODA WC KAPI KOLLARI', 'zamak-oda-wc-kapi-kollari'),
  ('ZAMAK AÇMA KOLLAR', 'zamak-acma-kollar'),
  ('SELSİL', 'selsil'),
  ('MONTAJ DOLGU KÖPÜKLERİ', 'montaj-dolgu-kopukleri'),
  ('MONTAJ YAPIŞTIRICILAR', 'montaj-yapistiricilar'),
  ('GENEL AMAÇLI SİLİKONLAR', 'genel-amacli-silikonlar'),
  ('YAPIŞTIRICI KÖPÜKLER', 'yapistirici-kopukler'),
  ('CEPHE SİLİKONLAR', 'cephe-silikonlar'),
  ('PROFESYONEL SİLİKONLAR', 'profesyonel-silikonlar'),
  ('KONTAK YAPIŞTIRICILAR', 'kontak-yapistiricilar')
ON CONFLICT (slug) DO NOTHING;

-- Akıllı güvenlik alt kategorileri (markalar)
INSERT INTO categories (name, slug, parent_id)
SELECT sub.name, sub.slug, parent.id
FROM categories parent
CROSS JOIN (VALUES
  ('PALMO', 'palmo'),
  ('YALE', 'yale'),
  ('DESİ', 'desi')
) AS sub(name, slug)
WHERE parent.slug = 'akilli-guvenlik-sistemleri'
ON CONFLICT (slug) DO NOTHING;

-- Örnek ürünler - Kapı Hidrolikleri
INSERT INTO products (category_id, name, description, price, stock_quantity)
SELECT c.id, p.name, p.description, p.price, p.stock
FROM categories c
CROSS JOIN (VALUES
  ('Dormakaba TS 83 Dirsek Kayar Kollu Kapı Kapatıcı', 'Dirsek kayar kollu kapı kapatıcı', 2850.00, 25),
  ('Dormakaba TS 89 F Dirsek Kayar Kollu Kapı Kapatıcı', 'Dirsek kayar kollu kapı kapatıcı', 3200.00, 18),
  ('Dormakaba TS 90 Kayar Kollu Kapı Kapatıcı', 'Kayar kollu kapı kapatıcı', 2650.00, 30),
  ('Dormakaba TS 93 Emr Duman Dedektörlü Kapı Kapatıcı', 'Duman dedektörlü kapı kapatıcı', 4500.00, 12),
  ('Dormakaba TS 93 Gsr Sıralamalı Kapı Kapatıcı', 'Sıralamalı kapı kapatıcı', 4200.00, 15)
) AS p(name, description, price, stock)
WHERE c.slug = 'kapi-hidrolikleri';

-- Örnek ürünler - Kapı Aksesuarları
INSERT INTO products (category_id, name, description, price, stock_quantity)
SELECT c.id, p.name, p.description, p.price, p.stock
FROM categories c
CROSS JOIN (VALUES
  ('Çelik Kapı Dürbün Pulu', 'Çelik kapı dürbün pulu', 45.00, 200),
  ('Çelik Kapı Dürbünü', 'Çelik kapı dürbünü', 180.00, 85),
  ('Çelik Kapı Gizli Kelepçe', 'Gizli kelepçe', 95.00, 120),
  ('Çelik Kapı Gömme Sürgü', 'Gömme sürgü', 75.00, 150),
  ('Emniyet Kelepçe Mandalı Kare', 'Kare emniyet kelepçe mandalı', 55.00, 100),
  ('Gül Çelik Rozet', 'Gül çelik rozet', 35.00, 250),
  ('Irmak Çelik Rozet', 'Irmak çelik rozet', 40.00, 180),
  ('Irmak Çelik Rozet M8 Vidalı', 'M8 vidalı Irmak çelik rozet', 48.00, 160)
) AS p(name, description, price, stock)
WHERE c.slug = 'kapi-aksesuarlari';

-- Örnek ürünler - PALMO
INSERT INTO products (category_id, name, description, price, stock_quantity)
SELECT c.id, p.name, p.description, p.price, p.stock
FROM categories c
CROSS JOIN (VALUES
  ('Palmo Akıllı Kapı Kilidi', 'Parmak izi ve şifreli akıllı kilit', 3200.00, 18),
  ('Palmo WiFi Akıllı Kilit', 'WiFi bağlantılı akıllı kapı kilidi', 4500.00, 12),
  ('Palmo Kartlı Geçiş Sistemi', 'RFID kartlı geçiş kontrol sistemi', 2800.00, 25)
) AS p(name, description, price, stock)
WHERE c.slug = 'palmo';

-- Örnek ürünler - YALE
INSERT INTO products (category_id, name, description, price, stock_quantity)
SELECT c.id, p.name, p.description, p.price, p.stock
FROM categories c
CROSS JOIN (VALUES
  ('Yale Akıllı Kapı Kilidi Linus', 'Yale Linus akıllı kilit sistemi', 5200.00, 10),
  ('Yale Dijital Kapı Kilidi', 'Tuş takımlı dijital kilit', 3800.00, 15),
  ('Yale Akıllı Alarm Seti', 'Yale akıllı güvenlik alarm seti', 6500.00, 8)
) AS p(name, description, price, stock)
WHERE c.slug = 'yale';

-- Örnek ürünler - DESİ
INSERT INTO products (category_id, name, description, price, stock_quantity)
SELECT c.id, p.name, p.description, p.price, p.stock
FROM categories c
CROSS JOIN (VALUES
  ('Desi Akıllı Kapı Kilidi', 'Desi parmak izi akıllı kilit', 2900.00, 20),
  ('Desi WiFi Akıllı Kilit Pro', 'Desi WiFi akıllı kilit pro model', 4100.00, 14),
  ('Desi Akıllı Zil Seti', 'Desi video interkom zil seti', 3500.00, 16)
) AS p(name, description, price, stock)
WHERE c.slug = 'desi';
