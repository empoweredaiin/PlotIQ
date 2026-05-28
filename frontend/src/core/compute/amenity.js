// Reg 14(A) — Amenity Surrender on plots ≥ 4,000 sqm
// PDF p. 98–99. Triggered on gross plot (excl. road set-back per Reg 14(A) opening)
//   4,000–10,000 sqm  →  5% of plot
//   > 10,000 sqm      →  500 sqm + 10% of (plot − 10,000)
// Note (ii): for reg33_7, reg33_7A, reg33_10 the amenity is reduced to 35%.
// reg33_7B and reg33_9 get NO reduction — strict reading of Note (ii).

import { SCHEMES_WITH_REG14_REDUCTION } from '../constants';

export function computeReg14Amenity(grossPlotExclRoad, scheme, zone, isAmalgamated, smallestOriginalPlot) {
  if (zone === 'industrial') return { applies: false, area: 0, reason: 'Reg 14 applies to Residential / Commercial zones only' };
  if (grossPlotExclRoad < 4000) return { applies: false, area: 0, reason: 'Plot < 4,000 sqm — Reg 14 not triggered' };

  // Reg 14 Note (iii) — amalgamated plots: smallest original < 4,000 sqm and total ≤ 20,000 sqm
  if (isAmalgamated && (parseFloat(smallestOriginalPlot) || 0) < 4000 && grossPlotExclRoad <= 20000) {
    return {
      applies: false, area: 0,
      reason: 'Amalgamated plot — smallest original plot < 4,000 sqm and total ≤ 20,000 sqm: Reg 14 not triggered per Note (iii).',
    };
  }

  let baseAmenity;
  if (grossPlotExclRoad <= 10000) {
    baseAmenity = grossPlotExclRoad * 0.05;
  } else {
    baseAmenity = 500 + 0.10 * (grossPlotExclRoad - 10000);
  }

  const reductionFactor = SCHEMES_WITH_REG14_REDUCTION.has(scheme) ? 0.35 : 1.0;
  const finalAmenity = baseAmenity * reductionFactor;

  return {
    applies: true,
    area: finalAmenity,
    baseAmenity,
    reductionFactor,
    reason: reductionFactor < 1
      ? `Plot ≥ 4,000 sqm; redev under ${scheme} reduces amenity to 35% per Reg 14 Note (ii)`
      : `Plot ≥ 4,000 sqm; full amenity applies (this scheme not eligible for the 35% reduction)`,
  };
}
