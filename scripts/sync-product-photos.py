#!/usr/bin/env python3
"""Rewrite product image_url values to public https URLs.

Local /products/assos/* files and Assos Metal remote images are uploaded
to Supabase Storage so Vercel and the mobile app can load them.
"""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_env() -> None:
    env_path = ROOT / ".env.local"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_env()
SUPABASE = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
KEY = os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

TR = str.maketrans("ğüşıöçâîû", "gusiocaiu")
STOP = {
    "ve",
    "ile",
    "mm",
    "cm",
    "kg",
    "ml",
    "gr",
    "tip",
    "tipi",
    "yeni",
    "serisi",
    "nolu",
    "numara",
    "set",
    "seti",
    "govde",
    "saten",
    "sari",
    "nikel",
    "krom",
    "siyah",
    "beyaz",
    "naturel",
    "paslanmaz",
    "gumus",
    "gri",
}


def norm_name(value: str) -> str:
    s = value.lower().replace("i̇", "i")
    s = s.translate(TR)
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    s = re.sub(r"\s+", " ", s)
    return s.replace("dormakaba", "dorma").replace("kapi kapatici", "hidrolik")


def name_tokens(value: str) -> set[str]:
    return {t for t in norm_name(value).split(" ") if len(t) > 1 and t not in STOP}


def name_codes(value: str) -> set[str]:
    n = norm_name(value)
    found = set()
    for raw in re.findall(r"[a-z]*\d+[a-z0-9]*", n.replace(" ", "")):
        if len(raw) >= 3:
            found.add(raw)
    for match in re.finditer(r"\b([a-z]{1,5})\s+(\d{2,4}[a-z]?)\b", n):
        found.add(f"{match.group(1)}{match.group(2)}")
    return found


def name_stem(value: str) -> str:
    return re.sub(
        r"\s+",
        " ",
        re.sub(
            r"\b(saten|sari|nikel|krom|siyah|beyaz|naturel|paslanmaz|gumus|gri|govde|barelli|barelsiz)\b",
            " ",
            norm_name(value),
        ),
    ).strip()


def find_photo(name: str, mapping: dict[str, str], wc: list[dict]) -> str | None:
    n = norm_name(name)
    stem = name_stem(name)
    if mapping.get(n):
        return mapping[n]
    if mapping.get(stem):
        return mapping[stem]

    codes = name_codes(name)
    tokens = name_tokens(name)
    best = None
    best_score = 0.0
    for item in wc:
        score = 0.0
        shared_codes = [c for c in item["codes"] if c in codes]
        if shared_codes:
            score += 2 * len(shared_codes)
        shared_tok = len([t for t in item["tok"] if t in tokens])
        union = len(set(item["tok"]) | tokens) or 1
        if shared_tok:
            score += shared_tok / union
        if stem and stem == item["stem"]:
            score += 3
        if score > best_score:
            best_score = score
            best = item

    if best and (
        best_score >= 2.3
        or (best_score >= 1.15 and any(c in codes for c in best["codes"]))
        or (best["stem"] == stem and len(stem.split(" ")) >= 3)
    ):
        return best["img"]
    return None


def fetch_all(table: str, select: str) -> list[dict]:
    rows: list[dict] = []
    start = 0
    while True:
        req = urllib.request.Request(
            f"{SUPABASE}/rest/v1/{table}?select={urllib.parse.quote(select)}&order=name",
            headers={**HEADERS, "Range": f"{start}-{start + 999}", "Prefer": "count=exact"},
        )
        with urllib.request.urlopen(req) as response:
            chunk = json.loads(response.read().decode())
        rows.extend(chunk)
        if len(chunk) < 1000:
            break
        start += 1000
    return rows


def read_bytes(source: str) -> bytes | None:
    if source.startswith("/products/"):
        path = ROOT / "public" / source.lstrip("/")
        return path.read_bytes() if path.exists() else None
    if source.startswith("http"):
        req = urllib.request.Request(
            source,
            headers={"User-Agent": "Mozilla/5.0 AssosStok/1.0"},
        )
        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                return response.read()
        except Exception:
            return None
    return None


def ext_for(source: str, data: bytes) -> str:
    lower = source.lower()
    if lower.endswith(".png") or data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if lower.endswith(".webp"):
        return "webp"
    return "jpg"


def upload(product_id: str, source: str, data: bytes) -> str:
    ext = ext_for(source, data)
    object_path = f"{product_id}/catalog.{ext}"
    content_type = "image/png" if ext == "png" else "image/webp" if ext == "webp" else "image/jpeg"
    req = urllib.request.Request(
        f"{SUPABASE}/storage/v1/object/product-images/{object_path}",
        data=data,
        method="POST",
        headers={
            **HEADERS,
            "Content-Type": content_type,
            "x-upsert": "true",
        },
    )
    with urllib.request.urlopen(req, timeout=40) as response:
        response.read()
    return f"{SUPABASE}/storage/v1/object/public/product-images/{object_path}"


def patch_image(product_id: str, image_url: str) -> None:
    from datetime import datetime, timezone

    payload = json.dumps(
        {
            "image_url": image_url,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).encode()
    req = urllib.request.Request(
        f"{SUPABASE}/rest/v1/products?id=eq.{product_id}",
        data=payload,
        method="PATCH",
        headers={
            **HEADERS,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    with urllib.request.urlopen(req, timeout=20) as response:
        response.read()


def process(product: dict, source: str) -> tuple[str, str]:
    data = read_bytes(source)
    if not data:
        return product["id"], "missing-bytes"
    public_url = upload(product["id"], source, data)
    patch_image(product["id"], public_url)
    return product["id"], "ok"


def main() -> None:
    photo_data = json.loads((ROOT / "scripts/photo-map.json").read_text())
    mapping = photo_data["map"]
    wc = photo_data["wc"]
    products = fetch_all("products", "id,name,image_url")

    jobs: list[tuple[dict, str]] = []
    already = 0
    unmatched = 0
    for product in products:
        current = product.get("image_url") or ""
        if "supabase.co/storage" in current:
            already += 1
            continue
        source = current
        if not source.startswith("https://www.assosmetal.com.tr") and not source.startswith(
            "/products/"
        ):
            found = find_photo(product["name"], mapping, wc)
            if not found:
                unmatched += 1
                continue
            source = found
        jobs.append((product, source))

    print(
        f"products={len(products)} already={already} jobs={len(jobs)} unmatched={unmatched}"
    )

    ok = missing = failed = 0
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = [pool.submit(process, product, source) for product, source in jobs]
        for i, future in enumerate(as_completed(futures), 1):
            try:
                _, status = future.result()
                if status == "ok":
                    ok += 1
                else:
                    missing += 1
            except Exception as exc:
                failed += 1
                if failed <= 8:
                    print("fail", exc)
            if i % 50 == 0 or i == len(futures):
                print(f"progress {i}/{len(futures)} ok={ok} missing={missing} failed={failed}")

    print(f"done ok={ok} missing={missing} failed={failed}")


if __name__ == "__main__":
    main()
