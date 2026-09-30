-- Cari hesap kodu. Uygulamadan aktarım yapmadan önce bir kez çalıştırın.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS customers_code_key ON customers (code);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers (code);
