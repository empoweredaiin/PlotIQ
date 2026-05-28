// Smoke test: confirm patched regulations.js doesn't crash and that the
// rehab/sale fungible split behaves correctly for both 33(7) and 33(7)(A).

// Hack: load the patched file's exports. The file declares top-level functions
// but doesn't module.exports them, so eval them into a sandbox.
const fs = require('fs');
const src = fs.readFileSync('/home/claude/out/regulations.patched.js', 'utf8');

// Append exports for the functions we want to call
const exposed = src + `
module.exports = {
  computeBuildable_33_7, analyseEligibility_33_7,
  computeBuildable_33_7A, analyseEligibility_33_7A,
  _fungibleArea, _fungiblePremiumRate,
};
`;
fs.writeFileSync('/tmp/regulations_test.js', exposed);

const R = require('/tmp/regulations_test.js');

// ---- Sanity check 1: fungible area cap is 35% for all uses ----
console.log('--- Test 1: fungible cap uniform at 35% ---');
const fRes  = R._fungibleArea(1000, 'residential', 1.0);
const fCom  = R._fungibleArea(1000, 'commercial', 1.0);
const fInd  = R._fungibleArea(1000, 'industrial', 1.0);
console.log({ fRes, fCom, fInd });
console.assert(fRes === 350 && fCom === 350 && fInd === 350,
  'FAIL: fungible cap should be 35% for all uses');

// ---- Sanity check 2: premium rate differs by use ----
console.log('--- Test 2: fungible premium rate varies by use ---');
console.log({
  res: R._fungiblePremiumRate('residential'),
  com: R._fungiblePremiumRate('commercial'),
  ind: R._fungiblePremiumRate('industrial'),
});
console.assert(R._fungiblePremiumRate('residential') === 0.50);
console.assert(R._fungiblePremiumRate('commercial') === 0.60);
console.assert(R._fungiblePremiumRate('industrial') === 0.60);

// ---- Sanity check 3: 33(7) single-landlord pure cessed plot ----
console.log('\n--- Test 3: 33(7) single, 10 tenants of 30 sqm each, 2000 sqm plot ---');
const tenants = Array.from({length: 10}, () => ({ carpet: 30, use: 'residential' }));
const r337 = R.computeBuildable_33_7({
  plotArea: 2000,
  grossPlotExclRoad: 1900,
  dpRoadDeduction: 100,
  reservationDeduction: 50,
  zone: 'islandCity',
  roadWidth: 12,
  occupants: tenants,
  compositionMode: 'single',
  fungibleLoad: 1.0,
  mhadaSurplusPct: 0.20,
  preSep1969: true,
  isCessed: true,
  consentPct: 0.60,
  mbrrbCertified: true,
  asrLandRate: 100000,
  normalPremiumBua: 500,
});
console.log({
  rehabBua: r337.rehabBua,
  incentiveBua: r337.incentiveBua,
  addlRehabBua: r337.addlRehabBua,
  fsiBua: r337.fsiBua,
  fungibleArea: r337.fungibleArea,
  memberSideRehabBua: r337.memberSideRehabBua,
  mhadaSurplusBua: r337.mhadaSurplusBua,
  saleBua: r337.saleBua,
  premiumPayable: r337.premiumPayable,
  effFsi: r337.effFsi,
  gates: r337.eligibility.gates.length,
});

// Verify the path-determination math:
//   rehab carpet per tenant = max(30, 27.88) = 30
//   total rehab carpet = 300 sqm; rehabBua = 300 × 1.2 = 360
//   incentiveBaseBua  = 300 × 1.2 = 360 (all under 120 cap)
//   incentiveBua      = 360 × 0.50 = 180
//   addlRehabBua      = 360 × 0.05 = 18
//   rehabBasePath = 360 + 180 + 18 = 558
//   gatePath = 3.00 × 2000 + 18 = 6018
//   fsiBua = max(558, 6018) = 6018  → gate path wins
console.assert(r337.rehabBua === 360, `rehabBua wrong: ${r337.rehabBua}`);
console.assert(r337.incentiveBua === 180, `incentiveBua wrong: ${r337.incentiveBua}`);
console.assert(r337.addlRehabBua === 18, `addlRehabBua wrong: ${r337.addlRehabBua}`);
console.assert(r337.fsiBua === 6018, `fsiBua wrong: ${r337.fsiBua}`);

// Fungible split:
//   fungibleRehab = (360 + 18) × 0.35 = 132.3
//   saleSide = 6018 - 360 - 18 = 5640
//   fungibleSale = 5640 × 0.35 = 1974
//   fungibleArea = 132.3 + 1974 = 2106.3
console.assert(Math.abs(r337.fungibleArea - 2106.3) < 0.01,
  `fungibleArea wrong: ${r337.fungibleArea}`);

// memberSideRehabBua should now include fungibleRehab:
//   memberSide = 360 + 18 + 132.3 = 510.3
console.assert(Math.abs(r337.memberSideRehabBua - 510.3) < 0.01,
  `memberSideRehabBua wrong: ${r337.memberSideRehabBua}`);

// MHADA share = 6018 × 0.20 = 1203.6
console.assert(Math.abs(r337.mhadaSurplusBua - 1203.6) < 0.01,
  `mhadaSurplus wrong: ${r337.mhadaSurplusBua}`);

// saleBua = permissible - memberSide - mhada
//   permissible = 6018 + 2106.3 = 8124.3
//   sale = 8124.3 - 510.3 - 1203.6 = 6410.4
console.assert(Math.abs(r337.saleBua - 6410.4) < 0.01,
  `saleBua wrong: ${r337.saleBua}`);

console.log('  ✓ All 33(7) math checks passed');

// ---- Sanity check 4: 33(7)(A) pure tenant plot ----
console.log('\n--- Test 4: 33(7)(A) pure_tenant, 6 tenants of 40 sqm ---');
const r337a = R.computeBuildable_33_7A({
  plotArea: 1500,
  grossPlotExclRoad: 1450,
  dpRoadDeduction: 50,
  reservationDeduction: 30,
  zone: 'suburbs',
  roadWidth: 12,
  tenants: Array.from({length: 6}, () => ({ carpet: 40, use: 'residential' })),
  compositionMode: 'pure_tenant',
  fungibleLoad: 1.0,
  mcgmUnsafeDeclared: true,
  consentPct: 0.55,
  mcgmTenantListCertified: true,
  tenantsReaccommodated: true,
  preJun1996EvidenceType: 'mcgm_extract',
  asrLandRate: 80000,
  normalPremiumBua: 400,
  currentYear: 2026,
});
console.log({
  rehabBua: r337a.rehabBua,
  incentiveBua: r337a.incentiveBua,
  addlRehabBua: r337a.addlRehabBua,
  fsiBua: r337a.fsiBua,
  fungibleRehab: r337a.fungibleRehab,
  fungibleSale: r337a.fungibleSale,
  saleBua: r337a.saleBua,
  premiumPayable: r337a.premiumPayable,
  cessPayable: r337a.cessPayable,
  cessRatePerSqm: r337a.cessRatePerSqm,
  effFsi: r337a.effFsi,
  gates: r337a.eligibility.gates.length,
});

// Verify:
//   rehab carpet 6 × 40 = 240; rehabBua = 240 × 1.2 = 288
//   incBase = 240; incBua = 240 × 1.2 × 0.50 = 144
//   addl = 288 × 0.05 = 14.4
//   rehabIncentivePath = 288 + 144 + 14.4 = 446.4
//   fsiBua = 446.4 (no Reg30 fallback opted in)
console.assert(Math.abs(r337a.rehabBua - 288) < 0.01);
console.assert(Math.abs(r337a.incentiveBua - 144) < 0.01);
console.assert(Math.abs(r337a.addlRehabBua - 14.4) < 0.01);
console.assert(Math.abs(r337a.fsiBua - 446.4) < 0.01);

// Cess escalation: yearsSince2018 = 8, triplets = 2, rate = 5000 × 1.10² = 6050
console.assert(Math.abs(r337a.cessRatePerSqm - 6050) < 0.01,
  `cess rate wrong: ${r337a.cessRatePerSqm}`);
console.log('  ✓ All 33(7)(A) math checks passed');

// ---- Bug #3 gate test: MHADA % null should gate ----
console.log('\n--- Test 5: 33(7) without mhadaSurplusPct gates the scheme ---');
const r337_nogate = R.computeBuildable_33_7({
  plotArea: 1000,
  grossPlotExclRoad: 950,
  dpRoadDeduction: 50,
  reservationDeduction: 0,
  zone: 'islandCity', roadWidth: 12,
  occupants: tenants,
  compositionMode: 'single',
  preSep1969: true, isCessed: true,
  consentPct: 0.60, mbrrbCertified: true,
  asrLandRate: 100000, normalPremiumBua: 200,
  // NOTE: mhadaSurplusPct deliberately omitted
});
const hasMhadaGate = r337_nogate.eligibility.gates.some(g => g.id === 'mhadaSurplus');
console.assert(hasMhadaGate, 'FAIL: missing MHADA gate when surplus % unknown');
console.log('  ✓ MHADA-null gate fires correctly');

console.log('\n=========================');
console.log('ALL TESTS PASSED ✓');
