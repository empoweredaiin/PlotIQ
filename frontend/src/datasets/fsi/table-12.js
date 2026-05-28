// FSI Table 12 (Reg 30) — basic/premium/TDR slabs by location × road width
// Source: DCPR 2034, Reg 30, Table 12 (PEATA edition verified)
export const FSI_TABLE_12 = {
  islandCity: [
    { roadMin: 0,  roadMax: 9,    basic: 1.33, premium: 0,    tdr: 0,    max: 1.33 },
    { roadMin: 9,  roadMax: 12,   basic: 1.33, premium: 0.50, tdr: 0.17, max: 2.00 },
    { roadMin: 12, roadMax: 18,   basic: 1.33, premium: 0.62, tdr: 0.45, max: 2.40 },
    { roadMin: 18, roadMax: 27,   basic: 1.33, premium: 0.73, tdr: 0.64, max: 2.70 },
    { roadMin: 27, roadMax: 9999, basic: 1.33, premium: 0.84, tdr: 0.83, max: 3.00 },
  ],
  suburbsExtended: [
    { roadMin: 0,  roadMax: 9,    basic: 1.00, premium: 0,    tdr: 0,    max: 1.00 },
    { roadMin: 9,  roadMax: 12,   basic: 1.00, premium: 0.50, tdr: 0.50, max: 2.00 },
    { roadMin: 12, roadMax: 18,   basic: 1.00, premium: 0.50, tdr: 0.70, max: 2.20 },
    { roadMin: 18, roadMax: 27,   basic: 1.00, premium: 0.50, tdr: 0.90, max: 2.40 },
    { roadMin: 27, roadMax: 9999, basic: 1.00, premium: 0.50, tdr: 1.00, max: 2.50 },
  ],
};
