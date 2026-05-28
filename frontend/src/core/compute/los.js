// Reg 27 — Recreational Open Space (ROS / LOS), site-planning constraint.
// Computed on net plot area.
//   ≤ 1,000 sqm → None | 1,001–2,500 → 15% | 2,501–10,000 → 20% | >10,000 → 25%
// NOT an FSI deduction — deficiency attracts OSD premium = deficient × ASR × 25%.
// Concession under MCGM Circular CHE/DP/03450/26.08.2020 for 33(7)(B) cases.

export function computeLOSRequirement(netPlotForLOS, zone) {
  if (zone === 'industrial') {
    if (netPlotForLOS < 1000) return { applies: false, area: 0, percent: 0 };
    return { applies: true, area: netPlotForLOS * 0.15, percent: 15, band: 'Industrial — flat 15%' };
  }
  if (netPlotForLOS <= 1000) return { applies: false, area: 0, percent: 0, band: 'Plot ≤ 1,000 sqm — ROS not required' };
  if (netPlotForLOS <= 2500) return { applies: true, area: netPlotForLOS * 0.15, percent: 15, band: '1,001–2,500 sqm' };
  if (netPlotForLOS <= 10000) return { applies: true, area: netPlotForLOS * 0.20, percent: 20, band: '2,501–10,000 sqm' };
  return { applies: true, area: netPlotForLOS * 0.25, percent: 25, band: '> 10,000 sqm' };
}

// Parking — Reg 30 norms (DCPR 2034)
// Cars: carpet ≤45 → 0 | 45–60 → 0.5 | 60–90 → 1 | >90 → 2 per flat
// Two-wheeler: 1 per residential flat
// Visitor: 5% of required cars (residential)
// Shop: 1 per 40 sqm floor area up to 800 sqm
export function computeParkingRequirement(flats, commercialBua) {
  let cars = 0, twoWheeler = 0;
  (flats || []).forEach(f => {
    const carpet = parseFloat(f.carpet) || 0;
    const count = parseInt(f.count) || 0;
    if (f.use !== 'residential') return;
    let carPerFlat = carpet > 90 ? 2 : carpet > 60 ? 1 : carpet > 45 ? 0.5 : 0;
    cars += carPerFlat * count;
    twoWheeler += count;
  });
  const visitor = Math.ceil(cars * 0.05);
  const shopCars = commercialBua > 0 ? Math.ceil(Math.min(commercialBua, 800) / 40) : 0;
  return { cars: Math.ceil(cars), twoWheeler, visitor, shopCars, total: Math.ceil(cars) + visitor + shopCars };
}
