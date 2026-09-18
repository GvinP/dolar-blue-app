// Чистые функции разбора котировок dolarhoy.
// Вынесены из index.ts, чтобы покрыть тестами: 2026-09-18 в 19:15 UTC именно
// здесь сломались все котировки, кроме blue (её спас кросс-чек с argentinadatos).

// ─── Числа ────────────────────────────────────────────────────────────────────

// "1.530" — это тысячи, а не 1,53: разделитель группирует ровно по 3 цифры.
const isGrouped = (body: string, sep: "." | ","): boolean =>
  new RegExp(`^\\d{1,3}(?:\\${sep}\\d{3})+$`).test(body);

/**
 * Разбирает число из разметки dolarhoy.
 *
 * До 2026-09-18 сайт отдавал цены без разделителя тысяч ("1530,20"), после —
 * полностью локализованные ("$1.530,20"). Старый парсер делал
 * `.replace(",", ".")` по ПЕРВОМУ разделителю, поэтому "1.530,20" превращалось
 * в "1.530.20", а parseFloat обрезал это до 1.53. Проценты ("-0.33%") при этом
 * парсились верно, поэтому поломка выглядела как «цены стали копейками».
 *
 * Поддерживаем все встречающиеся варианты:
 *   "$1.530,20" (es-AR)   → 1530.2
 *   "1530,20"   (старый)  → 1530.2
 *   "$1.530"              → 1530    (точка группирует тысячи)
 *   "-0.33%"              → -0.33   (точка десятичная: группа не из 3 цифр)
 *   "1,530.20"  (en-US)   → 1530.2
 */
export function parseNum(str?: string | null): number | null {
  if (!str) return null;

  const cleaned = str.replace(/[^\d,.\-]/g, "");
  if (!/\d/.test(cleaned)) return null;

  const negative = cleaned.startsWith("-");
  const body = cleaned.replace(/-/g, "");

  const hasDot = body.includes(".");
  const hasComma = body.includes(",");

  // null = разделителя дробной части нет, оба символа группируют тысячи
  let decimalSep: "." | "," | null = null;
  if (hasDot && hasComma) {
    // Есть оба: правый — десятичный, левый группирует тысячи
    decimalSep = body.lastIndexOf(".") > body.lastIndexOf(",") ? "." : ",";
  } else if (hasComma) {
    decimalSep = isGrouped(body, ",") ? null : ",";
  } else if (hasDot) {
    decimalSep = isGrouped(body, ".") ? null : ".";
  }

  let normalized: string;
  if (decimalSep === ".") normalized = body.replace(/,/g, "");
  else if (decimalSep === ",") normalized = body.replace(/\./g, "").replace(",", ".");
  else normalized = body.replace(/[.,]/g, "");

  const n = parseFloat(normalized);
  if (!isFinite(n)) return null;
  return negative ? -n : n;
}

// ─── Санити-чек значений ──────────────────────────────────────────────────────

// Нижняя граница отсекает ровно тот класс поломки, что случился 2026-09-18
// (1530 → 1.53): курс ARS/USD ниже 100 не опускался за всё время жизни приложения.
// Старый isPlausible() принимал всё в (0, 100000), поэтому 1.53 прошло насквозь
// и уехало в базу вместо того, чтобы уйти в fallback на argentinadatos.
export const MIN_PLAUSIBLE_RATE = 100;
export const MAX_PLAUSIBLE_RATE = 1_000_000;

/** null допустим — это просто «нет данных» (например, tarjeta без второй цены). */
export function isPlausibleRate(v: number | null): boolean {
  if (v === null) return true;
  return v >= MIN_PLAUSIBLE_RATE && v <= MAX_PLAUSIBLE_RATE;
}

/** Суточное изменение больше 50% означает, что распарсили не то поле. */
export function isPlausiblePct(v: number | null): boolean {
  if (v === null) return true;
  return Math.abs(v) <= 50;
}

// ─── Плитки с одной ценой ─────────────────────────────────────────────────────

/**
 * Плитка с единственной ценой (сейчас это tarjeta): решаем по подписи,
 * compra это или venta.
 *
 * Узлы `.val` берутся позиционно, и парсер клал единственное значение в compra —
 * хотя на dolarhoy у tarjeta подписано «Venta». Из-за этого приложение рисовало
 * цену с ярлыком COMPRA, а send-notifications вовсе пропускал код: он отбирает
 * строки по `sell IS NOT NULL`.
 */
export function pickSingleValueField(tileText: string): "compra" | "venta" {
  const t = tileText.toLowerCase();
  const hasVenta = t.includes("venta");
  const hasCompra = t.includes("compra");
  // Подписи нет или есть обе — оставляем прежнее поведение
  return hasVenta && !hasCompra ? "venta" : "compra";
}

// ─── Маппинг заголовков ───────────────────────────────────────────────────────

// Порядок важен: более специфичные правила должны идти раньше
export const TITLE_MAP: Array<{ keywords: string[]; code: string; name: string }> = [
  { keywords: ["blue"],                        code: "blue",      name: "Dólar Blue"      },
  { keywords: ["bolsa", "mep"],               code: "mep",       name: "Dólar MEP"       },
  { keywords: ["contado con liqui", "ccl"],   code: "ccl",       name: "Dólar CCL"       },
  { keywords: ["tarjeta", "turista"],          code: "tarjeta",   name: "Dólar Tarjeta"   },
  { keywords: ["cripto", "digital", "usdc"],   code: "cripto",    name: "Dólar Cripto"    },
  { keywords: ["mayorista"],                   code: "mayorista", name: "Dólar Mayorista" },
  { keywords: ["oficial"],                     code: "oficial",   name: "Dólar Oficial"   },
];

export function inferCode(title: string): { code: string; name: string } | null {
  const lower = title.toLowerCase();
  for (const entry of TITLE_MAP) {
    if (entry.keywords.some(k => lower.includes(k))) {
      return { code: entry.code, name: entry.name };
    }
  }
  return null;
}
