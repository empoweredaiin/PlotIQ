// Regulatory and physical constants for the DCPR 2034 computation engine

// Reg 33(8) SDZ clause E(b) — carpet-to-BUA conversion factor
export const CARPET_TO_BUA = 1.20;

// Unit conversion (two names for the same value — used in different contexts across the codebase)
export const SQM_TO_SQFT = 10.7639;
export const SQFT_PER_SQM = 10.7639;

// Reg 31(3) — fungible compensatory area rate (uniform for residential/commercial/industrial)
export const FUNGIBLE_RATE = 0.35;

// Reg 16 — schemes denied in-lieu FSI/TDR for road/reservation handover
// These schemes get incentive BUA instead; Reg 16 prevents double-counting.
export const SCHEMES_DENIED_INSITU_FSI = new Set([
  'reg33_5', 'reg33_7', 'reg33_7A', 'reg33_7B',
  'reg33_9', 'reg33_9A', 'reg33_9B',
  'reg33_10', 'reg33_10A', 'reg33_20A', 'reg33_21',
]);

// Reg 14(A) Note (ii) — amenity reduced to 35% for these schemes only
export const SCHEMES_WITH_REG14_REDUCTION = new Set(['reg33_7', 'reg33_7A', 'reg33_10']);

// AutoDCR fee heads — FY 2025-26 rate card (Mumbai MCGM)
export const AUTODCR_RATES = {
  scrutinyPerSqm:      70.7,
  iodDepositPerSqft:   1,
  debrisPerSqft:       2,
  debrisCap:           45000,
  labourWelfarePct:    0.01,   // of BUA × construction rate (BOCW Act 1996)
  devChargesLandPct:   0.01,   // of basic-FSI × plot × ASR (MR&TP §124E)
  devChargesBuaPct:    0.04,   // of BUA × ASR (MR&TP §124E)
  layoutScrutinyPerSqm: 11.13,
  tdrScrutinyPerBua:   59,
  tdrInfraPct:         0.05,   // of TDR BUA × construction rate (Reg 32 circular)
};
