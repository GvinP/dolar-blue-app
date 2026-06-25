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
  const num = parseFloat(value);
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

/**
 * Map our Supabase codes → argentinadatos API path segments.
 * Used by ChartScreen until quotes_history accumulates enough data.
 */
const ARGENTINADATOS_CODE_MAP: Record<QuoteCode, string> = {
  blue: 'blue',
  oficial: 'oficial',
  mep: 'bolsa',
  ccl: 'contadoconliqui',
  tarjeta: 'oficial', // no dedicated tarjeta series; fall back to oficial
  cripto: 'cripto',
};

export type HistoryPrice = {
  compra: number;
  venta: number;
  fecha: string; // "YYYY-MM-DD"
};

/**
 * Fetch historical prices from argentinadatos (kept as-is for M2;
 * will migrate to Supabase quotes_history once enough data accumulates).
 */
export const fetchQuoteHistory = async (
  code: QuoteCode,
): Promise<HistoryPrice[]> => {
  const apiCode = ARGENTINADATOS_CODE_MAP[code];
  const response = await fetch(
    `https://api.argentinadatos.com/v1/cotizaciones/dolares/${apiCode}`,
  );
  const data = await response.json();
  // API returns {casa, compra, venta, fecha} — keep only what we need
  return (data as Array<{compra: number; venta: number; fecha: string}>)
    .slice(-365)
    .map(({compra, venta, fecha}) => ({compra, venta, fecha}));
};
