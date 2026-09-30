-- Müşteri portföyü, fatura düzenleme alanları, kullanıcılar, mesajlaşma
-- Supabase SQL Editor'de çalıştırın

-- Müşteriler (cari portföy)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  phone TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE UNIQUE INDEX IF NOT EXISTS customers_code_key ON customers (code);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on customers" ON customers;
CREATE POLICY "Allow all on customers" ON customers FOR ALL USING (true) WITH CHECK (true);

-- Fatura alanları
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMPTZ;

UPDATE invoices
SET invoice_date = created_at
WHERE invoice_date IS NULL;

-- Teslim checkbox
ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS delivered BOOLEAN NOT NULL DEFAULT false;

-- Uygulama kullanıcıları (admin / user)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on app_users" ON app_users;
CREATE POLICY "Allow all on app_users" ON app_users FOR ALL USING (true) WITH CHECK (true);

INSERT INTO app_users (name, username, password, role) VALUES
  ('Yönetici', 'admin', 'admin123', 'admin'),
  ('Kullanıcı', 'user', 'user123', 'user')
ON CONFLICT (username) DO NOTHING;

-- Mesajlaşma
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on messages" ON messages;
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true) WITH CHECK (true);

-- Örnek müşteriler
INSERT INTO customers (name, phone)
SELECT v.name, v.phone
FROM (VALUES
  ('ABC Yapı İnşaat Ltd. Şti.', '0212 000 00 01'),
  ('Yıldız Mobilya San. Tic.', '0216 000 00 02'),
  ('Anadolu Kapı Sistemleri', '0312 000 00 03')
) AS v(name, phone)
WHERE NOT EXISTS (
  SELECT 1 FROM customers c WHERE c.name = v.name
);
