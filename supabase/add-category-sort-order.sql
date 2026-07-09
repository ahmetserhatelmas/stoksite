-- Kategori sıralama desteği
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Mevcut kategorilere başlangıç sırası ver
WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(parent_id::text, 'root')
      ORDER BY name
    ) * 10 AS rn
  FROM categories
)
UPDATE categories c
SET sort_order = n.rn
FROM numbered n
WHERE c.id = n.id;

CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(parent_id, sort_order);
