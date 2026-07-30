/** Assets para Font.loadAsync — ver App.tsx */
export const fontAssets = {
  'Figtree-Regular': require('./Figtree-Regular.ttf'),
  'Figtree-Bold': require('./Figtree-Bold.ttf'),
  'Figtree-ExtraBold': require('./Figtree-ExtraBold.ttf'),
  'MartianMono-Bold': require('./MartianMono-Bold.ttf'),
};

/** Nombres de familia para usar en fontFamily — deben coincidir con las keys de arriba */
export const FONT_FAMILY = {
  regular: 'Figtree-Regular',
  bold: 'Figtree-Bold',
  extraBold: 'Figtree-ExtraBold',
  /** Tabular, para cifras (precios, porcentajes) — no usar para texto libre */
  ticker: 'MartianMono-Bold',
} as const;
