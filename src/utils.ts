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
