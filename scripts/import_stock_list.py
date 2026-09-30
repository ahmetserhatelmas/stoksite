#!/usr/bin/env python3
"""Excel stok listesini Assos Metal site fotoğraflarıyla eşleştirip SQL üretir."""

from __future__ import annotations

import json
import re
import ssl
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
EXCEL = Path("/Users/ase/Downloads/STOK LİSTESİ (1).XLSX")
WC_JSON = Path("/tmp/assos-import/wc-products.json")
OUT_SQL = ROOT / "supabase" / "import-stock-list.sql"
OUT_REPORT = ROOT / "scripts" / "import-stock-report.json"
IMG_DIR = ROOT / "public" / "products" / "assos"

TR = {
    "ğ": "g",
    "ü": "u",
    "ş": "s",
    "ı": "i",
    "i̇": "i",
    "ö": "o",
    "ç": "c",
    "â": "a",
    "î": "i",
    "û": "u",
}

PARENT_RULES = [
    (["hidrolik", "kapi kapat"], "kapi-hidrolikleri"),
    (["panik", "yangin"], "yangin-kapisi-donanimlari"),
    (["barel", "silindir", "cerman"], "bareller"),
    (["traj", "tiraj"], "tirajli-kilitler"),
    (["manyetik"], "manyetik-kilitler"),
    (["bas ac", "bas-ac", "karsilik"], "elektrikli-kilit-karsiligi-bas-ac"),
    (["palmo"], "palmo"),
    (["desi"], "desi"),
    (["merter"], "merter-akilli-kilit"),
    (["radar", "sensor"], "radar-sensor"),
    (["taktak"], "kapi-taktak"),
    (["pivot", "mentese"], "pivot-kapi-mentese"),
    (["kasa"], "doras-para-kasalari"),
    (["saft", "pano kilit"], "saft-kapak-pano-kilitleri"),
    (["cekme kol", "profil cekme"], "kapi-cekme-kollari"),
    (["aluminyum acma"], "aluminyum-acma-kollar"),
    (["aluminyum oda", "aluminyum wc"], "aluminyum-oda-wc-kapi-kollari"),
    (["paslanmaz acma"], "paslanmaz-acma-kollar"),
    (["paslanmaz oda", "paslanmaz wc"], "paslanmaz-oda-wc-kapi-kollari"),
    (["zamak oda", "zamak wc"], "zamak-oda-wc-kapi-kollari"),
    (["zamak acma"], "zamak-acma-kollar"),
    (["selsil"], "selsil"),
    (["dolgu kopuk", "montaj dolgu"], "montaj-dolgu-kopukleri"),
    (["yapistirici kopuk"], "yapistirici-kopukler"),
    (["montaj yapistir"], "montaj-yapistiricilar"),
    (["cephe silikon"], "cephe-silikonlar"),
    (["profesyonel silikon"], "profesyonel-silikonlar"),
    (["genel amacli silikon", "silikon"], "genel-amacli-silikonlar"),
    (["kontak"], "kontak-yapistiricilar"),
    (["aksesuar", "durbin", "rozet", "surgü", "surgü", "kelepce"], "kapi-aksesuarlari"),
    (["celik kapi", "monoblok", "emniyet kilit"], "celik-kapi-kilitleri"),
    (["alarm", "akilli", "elektronik", "gecis kontrol", "x10"], "akilli-guvenlik-sistemleri"),
    (["yale"], "yale"),
]


def slugify(text: str) -> str:
    s = norm(text)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "kategori"


def norm(s: str) -> str:
    s = (s or "").lower()
    for a, b in TR.items():
        s = s.replace(a, b)
    s = " ".join(re.sub(r"[^a-z0-9]+", " ", s).split())
    s = s.replace("dormakaba", "dorma")
    s = s.replace("kapi kapatici", "hidrolik")
    return s


def sql_str(s: str) -> str:
    return "'" + (s or "").replace("'", "''") + "'"


def model_codes(name: str) -> set[str]:
    n = norm(name)
    codes = set()
    for raw in re.findall(r"[a-z]*\d+[a-z0-9]*", n):
        if len(raw) >= 3:
            codes.add(raw)
    glued = n.replace(" ", "")
    for raw in re.findall(r"[a-z]*\d+[a-z0-9]*", glued):
        if len(raw) >= 3:
            codes.add(raw)
    # TS 83 / ITS 96 / DC 120 gibi ayrık model no
    for raw in re.findall(r"\b([a-z]{1,4})\s+(\d{2,4}[a-z]?)\b", n):
        codes.add(raw[0] + raw[1])
    return codes


def map_parent(group_name: str) -> str:
    n = norm(group_name)
    for needles, slug in PARENT_RULES:
        if any(needle in n for needle in needles):
            return slug
    return "diger-stok"


def parse_excel():
    wb = load_workbook(EXCEL, data_only=True)
    ws = wb[wb.sheetnames[0]]
    groups = {}
    products = []
    for row in ws.iter_rows(min_row=3, values_only=True):
        _seq, _uretici, turu, kodu, aciklama, *_ = (row or ()) + (None,) * 8
        if not turu or not kodu:
            continue
        code = str(turu).strip()
        name = " ".join(str(kodu).split())
        extra = str(aciklama).strip() if aciklama else ""
        if extra == code:
            groups[code] = name
        else:
            parent = ".".join(code.split(".")[:2])
            products.append({"code": code, "name": name, "group": parent})
    for p in products:
        if p["group"] not in groups:
            groups[p["group"]] = p["group"]
    return groups, products


def load_wc():
    items = []
    for p in json.loads(WC_JSON.read_text()):
        name = p.get("name") or ""
        imgs = p.get("images") or []
        src = imgs[0].get("src") if imgs else None
        cats = p.get("categories") or []
        raw_slug = cats[0]["slug"] if cats else "diger-stok"
        slug = {
            "kasalar": "doras-para-kasalari",
            "kilitler": "celik-kapi-kilitleri",
            "yapistirici-kopuk": "yapistirici-kopukler",
        }.get(raw_slug, raw_slug)
        items.append(
            {
                "name": name,
                "norm": norm(name),
                "codes": model_codes(name),
                "img": src,
                "cat_slug": slug,
                "cat_name": cats[0]["name"] if cats else "Diğer Stok",
            }
        )
    return items


def match_image(product, wc_items):
    n = norm(product["name"])
    codes = model_codes(product["name"])
    exact = [w for w in wc_items if w["norm"] == n]
    if exact:
        return exact[0], "exact"
    if codes:
        coded = []
        for w in wc_items:
            shared = codes & w["codes"]
            if not shared:
                continue
            # avoid tiny shared codes like "001"
            if not any(len(c) >= 4 or any(ch.isalpha() for ch in c) for c in shared):
                continue
            coded.append((len(shared), w))
        coded.sort(key=lambda x: -x[0])
        if coded and coded[0][0] >= 1:
            best = coded[0][1]
            # require the excel name to share a brand-ish first token or high code overlap
            e_toks = set(n.split())
            w_toks = set(best["norm"].split())
            if (e_toks & w_toks) or coded[0][0] >= 2:
                return best, "code"
    return None, None


def ext_from_url(url: str) -> str:
    path = url.split("?")[0].lower()
    for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        if path.endswith(ext):
            return ext
    return ".jpg"


def download_image(url: str, dest: Path) -> bool:
    if dest.exists() and dest.stat().st_size > 1000:
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    ctx = ssl._create_unverified_context()
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=40, context=ctx) as r:
            data = r.read()
        if len(data) < 500:
            return False
        dest.write_bytes(data)
        return True
    except Exception:
        return False


def main():
    groups, excel_products = parse_excel()
    wc_items = load_wc()

    matched = 0
    rows = []
    used_wc = set()
    for p in excel_products:
        hit, how = match_image(p, wc_items)
        image_url = None
        image_src = None
        if hit and hit["img"]:
            used_wc.add(hit["name"])
            slug = slugify(p["code"] + "-" + p["name"])[:80]
            ext = ext_from_url(hit["img"])
            local = IMG_DIR / f"{slug}{ext}"
            image_src = hit["img"]
            image_url = f"/products/assos/{slug}{ext}"
            p["_local"] = local
            p["_src"] = image_src
            matched += 1
        parent_slug = map_parent(groups.get(p["group"], p["group"]))
        cat_slug = "excel-" + p["group"].replace(".", "-")
        rows.append(
            {
                **p,
                "group_name": groups.get(p["group"], p["group"]),
                "parent_slug": parent_slug,
                "cat_slug": cat_slug,
                "image_url": image_url,
                "image_src": image_src,
                "match": how,
            }
        )

    extra_wc = []
    for w in wc_items:
        if w["name"] in used_wc:
            continue
        slug = slugify("wc-" + w["name"])[:80]
        ext = ext_from_url(w["img"] or ".jpg")
        local_name = f"{slug}{ext}"
        extra_wc.append(
            {
                "name": w["name"],
                "cat_slug": w["cat_slug"] or "diger-stok",
                "image_url": f"/products/assos/{local_name}" if w["img"] else None,
                "image_src": w["img"],
                "local": IMG_DIR / local_name,
            }
        )

    print(f"Excel ürün: {len(rows)}")
    print(f"Fotoğraf eşleşmesi: {matched}")
    print(f"Sitede olup listede net eşleşmeyen: {len(extra_wc)}")

    # download matched + extra images
    downloads = []
    for r in rows:
        if r.get("_src") and r.get("_local"):
            downloads.append((r["_src"], r["_local"]))
    for w in extra_wc:
        if w["image_src"]:
            downloads.append((w["image_src"], w["local"]))

    ok = fail = 0
    seen = {}
    for url, dest in downloads:
        seen[str(dest)] = (url, dest)
    unique = list(seen.values())

    def job(item):
        url, dest = item
        return dest, url, download_image(url, dest)

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(job, item) for item in unique]
        for fut in as_completed(futures):
            dest, url, success = fut.result()
            if success:
                ok += 1
            else:
                fail += 1
                for r in rows:
                    if r.get("_local") == dest:
                        r["image_url"] = url
                for w in extra_wc:
                    if w.get("local") == dest:
                        w["image_url"] = url
    print(f"İndirilen görsel: {ok}  başarısız: {fail}")

    # SQL
    group_meta = {}
    for r in rows:
        group_meta[r["cat_slug"]] = {
            "name": r["group_name"],
            "parent": r["parent_slug"],
            "code": r["group"],
        }

    lines = [
        "-- Stok listesi + Assos Metal site fotoğrafları",
        "-- Supabase SQL Editor'de bir kez çalıştırın",
        "",
        "INSERT INTO categories (name, slug, parent_id, sort_order)",
        "VALUES ('DİĞER STOK', 'diger-stok', NULL, 900)",
        "ON CONFLICT (slug) DO NOTHING;",
        "",
    ]

    by_parent = defaultdict(list)
    for slug, meta in sorted(group_meta.items()):
        by_parent[meta["parent"]].append((slug, meta))

    sort = 10
    for parent, items in by_parent.items():
        for slug, meta in items:
            name = f"{meta['name']} ({meta['code']})"
            lines.append(
                "INSERT INTO categories (name, slug, parent_id, sort_order)"
            )
            lines.append(
                f"SELECT {sql_str(name)}, {sql_str(slug)}, id, {sort}"
            )
            lines.append(
                f"FROM categories WHERE slug = {sql_str(parent)} LIMIT 1"
            )
            lines.append("ON CONFLICT (slug) DO NOTHING;")
            lines.append("")
            sort += 10

    for r in rows:
        desc = f"Stok kodu: {r['code']}"
        img = r["image_url"]
        img_sql = sql_str(img) if img else "NULL"
        lines.append("INSERT INTO products (category_id, name, description, price, stock_quantity, image_url)")
        lines.append(
            f"SELECT c.id, {sql_str(r['name'])}, {sql_str(desc)}, 0, 0, {img_sql}"
        )
        lines.append(f"FROM categories c WHERE c.slug = {sql_str(r['cat_slug'])}")
        lines.append(
            f"AND NOT EXISTS (SELECT 1 FROM products p WHERE lower(p.name) = lower({sql_str(r['name'])}))"
        )
        lines.append("LIMIT 1;")
        lines.append("")

    for w in extra_wc:
        img = w["image_url"]
        img_sql = sql_str(img) if img else "NULL"
        lines.append("INSERT INTO products (category_id, name, description, price, stock_quantity, image_url)")
        lines.append(
            f"SELECT c.id, {sql_str(w['name'])}, 'Assos Metal web kataloğu', 0, 0, {img_sql}"
        )
        lines.append(f"FROM categories c WHERE c.slug = {sql_str(w['cat_slug'])}")
        lines.append(
            f"AND NOT EXISTS (SELECT 1 FROM products p WHERE lower(p.name) = lower({sql_str(w['name'])}))"
        )
        lines.append("LIMIT 1;")
        lines.append("")

    # also update images on existing same-name products
    lines.append("-- Mevcut aynı isimli ürünlere görsel bağla")
    for r in rows:
        if r["image_url"]:
            lines.append(
                "UPDATE products SET image_url = "
                f"{sql_str(r['image_url'])}, updated_at = NOW() "
                f"WHERE lower(name) = lower({sql_str(r['name'])}) "
                "AND (image_url IS NULL OR image_url = '');"
            )

    OUT_SQL.write_text("\n".join(lines) + "\n")
    catalog = {
        "categories": [
            {
                "name": meta["name"] + " (" + meta["code"] + ")",
                "slug": slug,
                "parent_slug": meta["parent"],
            }
            for slug, meta in sorted(group_meta.items())
        ],
        "products": [
            {
                "name": r["name"],
                "code": r["code"],
                "cat_slug": r["cat_slug"],
                "image_url": r["image_url"],
            }
            for r in rows
        ]
        + [
            {
                "name": w["name"],
                "code": None,
                "cat_slug": w["cat_slug"],
                "image_url": w["image_url"],
            }
            for w in extra_wc
        ],
    }
    (ROOT / "scripts" / "stock-catalog.json").write_text(
        json.dumps(catalog, ensure_ascii=False)
    )

    OUT_REPORT.write_text(
        json.dumps(
            {
                "excel_products": len(rows),
                "matched_photos": matched,
                "extra_website_products": len(extra_wc),
                "downloaded": ok,
                "download_failed": fail,
                "sample_matches": [
                    {
                        "excel": r["name"],
                        "image": r["image_url"],
                        "how": r["match"],
                    }
                    for r in rows
                    if r["match"]
                ][:40],
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    print(f"SQL yazıldı: {OUT_SQL}")
    print(f"Rapor: {OUT_REPORT}")


if __name__ == "__main__":
    main()
