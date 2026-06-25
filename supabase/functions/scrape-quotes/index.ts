import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.48/deno-dom-wasm.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Supabase client (env vars доступны в Edge Functions автоматически) ───────
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // service role обходит RLS
);

// ─── Типы ─────────────────────────────────────────────────────────────────────
interface RawQuote {
  title: string;
  compra?: string;
  venta?: string;
  porcentaje?: string;
}

interface Quote {
  code: string;
  name: string;
  buy: number | null;
  sell: number | null;
  change_pct: number | null;
  source: "dolarhoy" | "argentinadatos";
}

// ─── Маппинг: ключевые слова в title → внутренний code ────────────────────────
// Порядок важен: более специфичные правила должны идти раньше
const TITLE_MAP: Array<{ keywords: string[]; code: string; name: string }> = [
  { keywords: ["blue"],                        code: "blue",      name: "Dólar Blue"      },
  { keywords: ["bolsa", "mep"],               code: "mep",       name: "Dólar MEP"       },
  { keywords: ["contado con liqui", "ccl"],   code: "ccl",       name: "Dólar CCL"       },
  { keywords: ["tarjeta", "turista"],          code: "tarjeta",   name: "Dólar Tarjeta"   },
  { keywords: ["cripto", "digital", "usdc"],   code: "cripto",    name: "Dólar Cripto"    },
  { keywords: ["mayorista"],                   code: "mayorista", name: "Dólar Mayorista" },
  { keywords: ["oficial"],                     code: "oficial",   name: "Dólar Oficial"   },
];

// Типы argentinadatos, соответствующие нашим кодам (для fallback и кросс-проверки)
const AD_TIPO: Record<string, string> = {
  blue:      "blue",
  oficial:   "oficial",
  mep:       "bolsa",
  ccl:       "contadoconliqui",
  tarjeta:   "tarjeta",
  mayorista: "mayorista",
};

// ─── Вспомогательные функции ──────────────────────────────────────────────────
function parseNum(str?: string): number | null {
  if (!str) return null;
  // Убираем все символы кроме цифр, запятой, точки и минуса
  const cleaned = str.replace(/[^\d,.\-]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function isPlausible(v: number | null): boolean {
  // null допустим (просто нет данных), но число должно быть положительным и в разумном диапазоне
  if (v === null) return true;
  return v > 0 && v < 100_000;
}

function inferCode(title: string): { code: string; name: string } | null {
  const lower = title.toLowerCase();
  for (const entry of TITLE_MAP) {
    if (entry.keywords.some(k => lower.includes(k))) {
      return { code: entry.code, name: entry.name };
    }
  }
  return null;
}

// ─── Парсинг dolarhoy.com (логика из utils.ts, переписанная под deno-dom) ─────
async function fetchDolarhoy(): Promise<RawQuote[]> {
  const res = await fetch(`https://www.dolarhoy.com?${Date.now()}`, {
    headers: {
      "User-Agent": "DolarBlue-App/1.0 (price tracker)",
      "Accept":     "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`dolarhoy HTTP ${res.status}`);
  const html = await res.text();
  return parseHtml(html);
}

function parseHtml(html: string): RawQuote[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return [];

  // Аналог: findAll(el => el.attribs.class?.includes('tile is-child'), doc)
  // .tile.is-child — элемент содержит оба класса
  const tiles = doc.querySelectorAll(".tile.is-child");
  const seen = new Set<string>();
  const results: RawQuote[] = [];

  for (const tile of tiles) {
    // Аналог: findOne(el => el.attribs.class === 'title', tile)
    const titleEl = tile.querySelector(".title");
    const title = titleEl?.textContent?.trim() ?? "";
    if (!title || seen.has(title)) continue;
    seen.add(title);

    // Аналог: findAll(el => el.attribs.class === 'val', tile)
    const valNodes = tile.querySelectorAll(".val");
    const compra    = valNodes[0]?.textContent?.trim();
    const venta     = valNodes[1]?.textContent?.trim();
    const porcentaje = tile.querySelector(".var-porcentaje")?.textContent?.trim();

    if (!compra && !venta) continue;
    results.push({ title, compra, venta, porcentaje });
  }

  return results;
}

// ─── Запрос к argentinadatos (fallback / датчик исправности) ──────────────────
async function fetchArgentinadatos(
  tipo: string,
): Promise<{ compra: number; venta: number } | null> {
  try {
    const res = await fetch(
      `https://api.argentinadatos.com/v1/cotizaciones/dolares/${tipo}`,
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    // API возвращает массив; последний элемент — свежий
    const last = Array.isArray(data) ? data[data.length - 1] : data;
    if (!last?.compra || !last?.venta) return null;
    return { compra: Number(last.compra), venta: Number(last.venta) };
  } catch {
    return null;
  }
}

const DISCREPANCY_THRESHOLD = 0.20; // 20% — считаем парсер сломанным

function bigDiscrepancy(a: number | null, b: number | null): boolean {
  if (a === null || b === null || b === 0) return false;
  return Math.abs(a - b) / b > DISCREPANCY_THRESHOLD;
}

// ─── Основной обработчик ──────────────────────────────────────────────────────
Deno.serve(async (_req) => {
  try {
    // 1. Парсим dolarhoy
    let rawQuotes: RawQuote[] = [];
    try {
      rawQuotes = await fetchDolarhoy();
      console.log(`dolarhoy: got ${rawQuotes.length} raw tiles`);
    } catch (e) {
      console.error("dolarhoy fetch failed:", e);
      // Продолжаем — уйдём в fallback ниже
    }

    // 2. Нормализуем и валидируем
    const quotes: Quote[] = [];
    const broken = new Set<string>(); // коды, которые нужно заменить через fallback

    for (const raw of rawQuotes) {
      if (raw.title === "Won") continue; // фильтр из оригинала

      const mapped = inferCode(raw.title);
      if (!mapped) {
        console.log(`Skipping unmapped title: "${raw.title}"`);
        continue;
      }

      const buy       = parseNum(raw.compra);
      const sell      = parseNum(raw.venta);
      const changePct = parseNum(raw.porcentaje);

      if (!isPlausible(buy) || !isPlausible(sell)) {
        console.warn(`Implausible values for ${mapped.code}: buy=${buy} sell=${sell} — marking broken`);
        broken.add(mapped.code);
        continue;
      }

      quotes.push({ code: mapped.code, name: mapped.name, buy, sell, change_pct: changePct, source: "dolarhoy" });
    }

    // 3. Кросс-проверка "blue" с argentinadatos
    //    Если расхождение > 20% — парсер поехал, заменяем через fallback
    const blueQuote = quotes.find(q => q.code === "blue");
    if (blueQuote) {
      const adBlue = await fetchArgentinadatos("blue");
      if (adBlue && bigDiscrepancy(blueQuote.sell, adBlue.venta)) {
        console.warn(
          `Blue discrepancy: dolarhoy=${blueQuote.sell} vs argentinadatos=${adBlue.venta} — parser likely broken`,
        );
        broken.add("blue");
        // Убираем поломанное значение из quotes
        const idx = quotes.findIndex(q => q.code === "blue");
        if (idx >= 0) quotes.splice(idx, 1);
      }
    }

    // 4. Fallback: заменяем сломанные/отсутствующие через argentinadatos
    for (const code of broken) {
      const tipo = AD_TIPO[code];
      if (!tipo) continue;
      const adData = await fetchArgentinadatos(tipo);
      if (!adData) {
        console.error(`argentinadatos fallback also failed for ${code}`);
        continue;
      }
      const meta = TITLE_MAP.find(t => t.code === code);
      quotes.push({
        code,
        name:       meta?.name ?? code,
        buy:        adData.compra,
        sell:       adData.venta,
        change_pct: null,
        source:     "argentinadatos",
      });
      console.log(`Fallback applied for ${code} via argentinadatos`);
    }

    if (quotes.length === 0) {
      return json({ error: "No quotes available — all sources failed" }, 503);
    }

    const now = new Date().toISOString();

    // 5. Upsert в quotes_latest
    const { error: upsertErr } = await supabase
      .from("quotes_latest")
      .upsert(
        quotes.map(q => ({ ...q, updated_at: now })),
        { onConflict: "code" },
      );
    if (upsertErr) throw upsertErr;

    // 6. Append в quotes_history
    const { error: histErr } = await supabase
      .from("quotes_history")
      .insert(
        quotes.map(q => ({
          code:        q.code,
          buy:         q.buy,
          sell:        q.sell,
          change_pct:  q.change_pct,
          source:      q.source,
          captured_at: now,
        })),
      );
    if (histErr) throw histErr;

    const sources = [...new Set(quotes.map(q => q.source))];
    console.log(`Done: ${quotes.length} quotes, sources: ${sources.join(", ")}`);

    return json({ ok: true, count: quotes.length, sources, updatedAt: now });
  } catch (err) {
    console.error("scrape-quotes error:", err);
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}