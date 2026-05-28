import { FSI_TABLE_12 } from '../../datasets/fsi/table-12';

export const findFsiSlab = (location, roadWidth) => {
  const slabs = FSI_TABLE_12[location] || FSI_TABLE_12.suburbsExtended;
  return slabs.find(s => roadWidth >= s.roadMin && roadWidth < s.roadMax) || slabs[0];
};

// Clamps a number to [0, 1]; NaN → 1 (full load)
export const clamp01 = (n) => {
  const v = parseFloat(n);
  if (Number.isNaN(v)) return 1;
  return Math.max(0, Math.min(1, v));
};
