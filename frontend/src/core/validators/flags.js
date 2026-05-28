// Reg 15 — Inclusive Housing (informational flag only — NOT a plot deduction).
// PDF p. 102. Plot ≥ 4,000 sqm: 20% handover for EWS/LIG, but FSI of handed-over
// portion is loadable on balance plot. So no net effect on FSI base.

export function computeReg15IHFlag(grossPlotExclRoad, zone) {
  if (zone !== 'residential' && zone !== 'mixed') return null;
  if (grossPlotExclRoad < 4000) return null;
  return {
    applies: true,
    handoverArea: grossPlotExclRoad * 0.20,
    note: '20% of plot to be handed over to MCGM for EWS/LIG housing. FSI of this portion is loadable on balance plot — so this is NOT a deduction from your buildable BUA. It is a handover obligation.',
  };
}
