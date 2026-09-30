const TR: Record<string, string> = {
  ğ: "g",
  ü: "u",
  ş: "s",
  ı: "i",
  i̇: "i",
  ö: "o",
  ç: "c",
  â: "a",
  î: "i",
  û: "u",
};

const STOP = new Set([
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
]);

export function normName(value: string) {
  let s = value.toLocaleLowerCase("tr");
  s = s.replace(/i̇/g, "i");
  s = s.replace(/[ğüşıöçâîû]/g, (ch) => TR[ch] ?? ch);
  s = s.replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
  return s.replace(/dormakaba/g, "dorma").replace(/kapi kapatici/g, "hidrolik");
}

export function nameTokens(value: string) {
  return new Set(
    normName(value)
      .split(" ")
      .filter((t) => t.length > 1 && !STOP.has(t))
  );
}

export function nameCodes(value: string) {
  const n = normName(value);
  const found = new Set<string>();
  for (const raw of n.replace(/ /g, "").match(/[a-z]*\d+[a-z0-9]*/g) ?? []) {
    if (raw.length >= 3) found.add(raw);
  }
  const spaced = n.matchAll(/\b([a-z]{1,5})\s+(\d{2,4}[a-z]?)\b/g);
  for (const match of spaced) {
    found.add(`${match[1]}${match[2]}`);
  }
  return found;
}

export function nameStem(value: string) {
  return normName(value)
    .replace(
      /\b(saten|sari|nikel|krom|siyah|beyaz|naturel|paslanmaz|gumus|gri|govde|barelli|barelsiz)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

export type WcPhoto = {
  norm: string;
  stem: string;
  tok: string[];
  codes: string[];
  img: string;
};

export function findPhoto(
  name: string,
  map: Record<string, string>,
  wc: WcPhoto[]
) {
  const n = normName(name);
  const stem = nameStem(name);
  if (map[n]) return map[n];
  if (map[stem]) return map[stem];

  const c = nameCodes(name);
  const t = nameTokens(name);
  let best: WcPhoto | null = null;
  let bestScore = 0;

  for (const item of wc) {
    let score = 0;
    const sharedCodes = item.codes.filter((code) => c.has(code));
    if (sharedCodes.length) score += 2 * sharedCodes.length;
    const sharedTok = item.tok.filter((tok) => t.has(tok)).length;
    const union = new Set([...item.tok, ...t]).size || 1;
    if (sharedTok) score += sharedTok / union;
    if (stem && stem === item.stem) score += 3;
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (
    best &&
    (bestScore >= 2.3 ||
      (bestScore >= 1.15 && best.codes.some((code) => c.has(code))) ||
      (best.stem === stem && stem.split(" ").length >= 3))
  ) {
    return best.img;
  }
  return null;
}
