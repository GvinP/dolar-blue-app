/** Currency codes matching Supabase quotes_latest.code */
export type QuoteCode =
  | 'blue'
  | 'oficial'
  | 'mep'
  | 'ccl'
  | 'tarjeta'
  | 'cripto';

/** Raw row from Supabase quotes_latest table */
export interface QuoteRow {
  code: QuoteCode;
  name: string;
  buy: string | null;
  sell: string | null;
  change_pct: string | null;
  source: string;
  updated_at: string;
}

/** Display-ready cotizacion (used by HomeScreen) */
export interface Cotizacion {
  code: QuoteCode;
  title: string;
  compra?: string;
  venta?: string;
  porcentaje?: string;
}

export type RootStackParamList = {
  HomeScreen: undefined;
  ChartScreen: {code: QuoteCode; title: string};
};
