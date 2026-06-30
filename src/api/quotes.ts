import {supabaseGet} from './supabase';
import {Cotizacion, QuoteCode, QuoteRow} from '../types';

/**
 * Format a numeric price for display in Argentine style.
 * 1460.00 → "$1.460"  |  1520.15 → "$1.520,15"
 */
const formatPrice = (value: string | null): string | undefined => {
  if (value == null) {
    return undefined;
  }
  const num = parseFloat(String(value));
  if (isNaN(num)) {
    return undefined;
  }
  // Use es-AR locale: dot for thousands, comma for decimals
  const hasDecimals = num % 1 !== 0;
  const formatted = num.toLocaleString('es-AR', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `$${formatted}`;
};

/**
 * Format change_pct for display: "0.00" → "0.00%", null → undefined
 */
const formatPct = (value: string | null): string | undefined => {
  if (value == null) {
    return undefined;
  }
  return `${value}%`;
};

/** Display order for currencies on HomeScreen */
const CODE_ORDER: QuoteCode[] = [
  'blue',
  'oficial',
  'mep',
  'ccl',
  'tarjeta',
  'cripto',
];

/**
 * Fetch latest quotes from Supabase (replaces client-side dolarhoy scraping).
 * Returns data shaped as Cotizacion[] for drop-in HomeScreen compatibility.
 */
export const fetchLatestQuotes = async (): Promise<Cotizacion[]> => {
  const rows = await supabaseGet<QuoteRow>(
    'quotes_latest',
    'select=code,name,buy,sell,change_pct',
  );

  // Build a map for ordering
  const byCode = new Map(rows.map(r => [r.code, r]));

  return CODE_ORDER.map(code => byCode.get(code))
    .filter((r): r is QuoteRow => r != null)
    .map(row => ({
      code: row.code,
      title: row.name,
      compra: formatPrice(row.buy),
      venta: formatPrice(row.sell),
      porcentaje: formatPct(row.change_pct),
    }));
};

export type HistoryPrice = {
  compra: number;
  venta: number;
  fecha: string; // "YYYY-MM-DD"
};

/**
 * Fetch daily-aggregated history from Supabase quotes_history_daily view.
 * Returns one entry per calendar day (Argentina timezone).
 */
const fetchQuoteHistoryFromSupabase = async (
  code: QuoteCode,
): Promise<HistoryPrice[]> => {
  return supabaseGet<HistoryPrice>(
    'quotes_history_daily',
    `code=eq.${code}&order=fecha.asc&select=compra,venta,fecha`,
  );
};

/**
 * Map our Supabase codes → argentinadatos API path segments.
 */
const ARGENTINADATOS_CODE_MAP: Record<QuoteCode, string> = {
  blue: 'blue',
  oficial: 'oficial',
  mep: 'bolsa',
  ccl: 'contadoconliqui',
  tarjeta: 'oficial', // no dedicated tarjeta series; fall back to oficial
  cripto: 'cripto',
};

const fetchQuoteHistoryFromArgentinadatos = async (
  code: QuoteCode,
): Promise<HistoryPrice[]> => {
  const apiCode = ARGENTINADATOS_CODE_MAP[code];
  const response = await fetch(
    `https://api.argentinadatos.com/v1/cotizaciones/dolares/${apiCode}`,
  );
  if (!response.ok) {
    throw new Error(`argentinadatos error: ${response.status}`);
  }
  const data = await response.json();
  return (data as Array<{compra: number; venta: number; fecha: string}>)
    .slice(-365)
    .map(({compra, venta, fecha}) => ({compra, venta, fecha}));
};

/**
 * Minimum days of Supabase history required to use it as the primary source.
 * Below this threshold we fall back to argentinadatos (which has a full year).
 */
const SUPABASE_HISTORY_MIN_DAYS = 30;

/**
 * Fetch historical prices.
 * Uses Supabase once it has accumulated ≥30 days; falls back to argentinadatos.
 * As data accumulates the cutover happens automatically.
 */
export const fetchQuoteHistory = async (
  code: QuoteCode,
): Promise<HistoryPrice[]> => {
  try {
    const rows = await fetchQuoteHistoryFromSupabase(code);
    if (rows.length >= SUPABASE_HISTORY_MIN_DAYS) {
      return rows;
    }
  } catch {
    // fall through to argentinadatos
  }
  return fetchQuoteHistoryFromArgentinadatos(code);
};
