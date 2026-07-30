/**
 * Calculate evenly-spaced label indexes for chart X-axis.
 */
export const calculateLabelIndexes = (
  dataLength: number,
  labelCount = 7,
): number[] => {
  if (dataLength <= labelCount) {
    return Array.from({length: dataLength}, (_, i) => i);
  }

  const interval = (dataLength - 1) / (labelCount - 1);
  const indexes = [];

  for (let i = 0; i < labelCount; i++) {
    const index = Math.round(i * interval);
    indexes.push(index);
  }

  return indexes;
};

/** -0.32 → "-0.32%" · 0.8 → "0.80%" — mismo formato que produce la API (ver formatPct) */
export const formatPercent = (value: number): string => `${value.toFixed(2)}%`;

/** 1450 → "$1.450" · 1520.15 → "$1.520,15" — mismo formato que usa fetchLatestQuotes */
export const formatPrice = (value: number): string => {
  const hasDecimals = value % 1 !== 0;
  return `$${value.toLocaleString('es-AR', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
};
