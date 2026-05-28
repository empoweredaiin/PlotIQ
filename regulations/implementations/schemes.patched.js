// ============================================================================
// regulations.js — PSEUDOCODE REFERENCE for DCPR 2034 redevelopment regimes
// ============================================================================
//
// PURPOSE
// -------
// This file is reference pseudocode, not production code. None of these
// functions are wired into the App. They document the computation chain for
// each DCPR 2034 redevelopment regulation in the same shape as the existing
// `computeBuildable_33_7B` in App.js, so a future session can decide which
// ones to actually implement and integrate.
//
// SOURCE
// ------
// All citations are to the PEATA Comprehensive DCPR 2034 edition (708 pp).
// Line references in `// L<n>` comments point to the extracted plain-text at
// /tmp/dcpr2034_text.txt (re-extract via pdfplumber from
// Research/comprehensive-dcpr-2034-peata.pdf if missing).
//
// SHAPE CONVENTION
// ----------------
// Each `computeBuildable_<RegId>(input)` returns the same object shape as
// `computeBuildable_33_7B` in App.js, with at minimum:
//   { schemeId, schemeName,
//     ...baseInputs,                   // netPlot, baseFsiBua, premiumFsiBua,
//                                      // tdrBua, fsiSlab, existingBua, etc.
//     incentiveBua, incentiveBasis,
//     rehabBasePath, reg30PathLoaded, fsiBua, fsiBuaMax,
//     fungibleArea, fungibleAreaMax,
//     permissibleBua, permissibleBuaMax,
//     memberSideRehabBua, developerSideIncentive,
//     saleBua, saleBuaMax,
//     premiumPayable, premiumSheet,
//     viabilityRating, viabilityNote, viabilityRatio,
//     inSituFsiBua, inSituFsiEligible, inSituFsiDeniedReason,
//     eligibility: { gates: [...], warnings: [...] } }
//
// Per-scheme eligibility lives in `analyseEligibility_<RegId>(input)`.
//
// PSEUDOCODE CONVENTIONS
// ----------------------
//   - Every constant carries a `// Reg X.Y(Z) — short reason` citation.
//   - Lines that depend on external regimes (MHADA Act, MBRRB circulars,
//     GR amendments) carry `// EXT:` markers.
//   - Lines marked `// TODO` flag a real ambiguity in the regulation text
//     that needs a real-world reference (a sanctioned area statement, an
//     MBRRB circular, etc.) before implementation.
//   - Lines marked `// PSEUDOCODE ONLY — not implemented` mean the function
//     body is illustrative and would need a real compute pass to ship.
//
// SCOPE OF THIS FILE (Tier 1 per HANDOFF v2, May 2026)
// ----------------------------------------------------
//   - computeBuildable_33_7     // Cessed buildings, Island City
//   - computeBuildable_33_7A    // Tenanted, dilapidated, non-cessed
//   - computeBuildable_33_7B    // CHS redev (re-stated for completeness;
//                                  authoritative version lives in App.js)
//   - computeBuildable_33_9     // Cluster (re-stated for completeness)
//   - computeBuildable_33_10    // Slum (SRA)
//   - computeBuildable_33_11    // Permanent Transit Camp tenements
//
// Tier 2 (mechanics — Reg 30, 31(3), 31(4), 32, 14A, 15, 16, 17) appears as
// shared helpers below and is re-stated formally as separate pseudocode in a
// later file/section.
// ============================================================================

// ----------------------------------------------------------------------------
// SHARED HELPERS (Tier 2 mechanics referenced by every scheme below)
// ----------------------------------------------------------------------------

// FSI_TABLE_12 lookup by zone + road-width band.
//   - Authoritative copy in App.js. Re-state interface only here.
//   - Reg 30(A)(2) Note 1: if existing road 6–8m AND DP proposes widening to
//     ≥9m, use 9m-band slab. Currently not modelled in App.js (see HANDOFF
//     task B). Encode here as `widenedTo9m` input flag.
function _fsiSlab(zone, roadWidth, widenedTo9m) {
  // PSEUDOCODE ONLY — refer to FSI_TABLE_12 in App.js for actual values.
  // Reg 30 Table 12 — slab = { basic, premium, tdr }
  // If widenedTo9m && roadWidth in [6,9) → use 9m-band                         // Reg 30 Note 1
  // Special sub-cases NOT modelled (out of scope):                              // Reg 30 Suburbs row
  //   - BARC-earmarked M Ward → flat 0.75                                       // Reg 30 Suburbs (i)(c)
  //   - Akse/Marve/CRZ-Erangal P-N Ward → flat 0.50                             // Reg 30 Suburbs (i)(d)
  return null;
}

// Net plot after the three deductions of Reg 30(A)(2).
function _netPlot(plotArea, dpRoadAndSetback, reg14Deduction, reservation) {
  return plotArea - dpRoadAndSetback - reg14Deduction - reservation;             // Reg 30(A)(2)
}

// Reg 16 in-situ FSI: FSI on surrendered land for DP-road/Regular-Line
// set-back AND reservation surrender. EXCLUDED for several 33-family schemes.
const SCHEMES_DENIED_INSITU_FSI = new Set([
  'reg33_5', 'reg33_7', 'reg33_7A', 'reg33_7B',                                  // Reg 16 exclusion list
  'reg33_9', 'reg33_9A', 'reg33_9B',                                             //   (see App.js
  'reg33_10', 'reg33_10A',                                                       //   computeBaseInputs)
  'reg33_20A', 'reg33_21'
]);
function _inSituFsi(schemeId, surrenderedArea, slabBasic) {
  if (SCHEMES_DENIED_INSITU_FSI.has(schemeId)) return 0;                         // Reg 16 — denial
  return surrenderedArea * slabBasic;                                            // Reg 16 — in-lieu FSI
}

// Reg 14(A) amenity deduction. Reduced to 35% for 33(7)/33(7)(A)/33(10).
function _reg14Amenity(grossPlotExclRoad, schemeId) {
  // Plot 4000–10000 sqm → 5%; >10000 → 500 + 10%×(plot−10000)                   // Reg 14(A)
  // For 33(7)/33(7)(A)/33(10): final requirement × 0.35                         // L7350 — 35% concession
  // PSEUDOCODE ONLY — see computeReg14Amenity in App.js for the live impl.
  return 0;
}

// Reg 31(3) Fungible Compensatory Area.
// VERIFIED AGAINST PEATA p.120 (2026-05):
//   "Commissioner may, by special permission, permit fungible compensatory area,
//    NOT EXCEEDING 35% for residential/Industrial/Commercial development, over and
//    above admissible FSI/BUA, by charging a premium at the rate of 50% for
//    Residential and 60% for Industrial and Commercial development of ASR (for FSI 1)."
// The 35% CAP IS UNIFORM ACROSS USES. What varies by use is the ASR PREMIUM RATE.
// (Previous code applied a 20% cap to commercial — that was a misreading of the
//  MSRDC/State/MCGM revenue split "50%, 30% and 20%" in the same paragraph.)
function _fungibleArea(fsiBua, use, loadFactor) {
  const cap = 0.35;                                                              // Reg 31(3) — PEATA p.120
  return fsiBua * cap * loadFactor;
}
function _fungiblePremiumRate(use) {
  return use === 'commercial' || use === 'industrial' ? 0.60 : 0.50;             // Reg 31(3) — ASR multiplier
}

// Reg 31(4) — areas NOT counted in FSI: lifts, lobbies, staircases, refuge
// floors, service areas, parking floors, AHU, electrical/water tanks.
// Material when comparing "effective carpet vs BUA" — developers exploit this.
//   - See HANDOFF for "Watch out for" item.

// ============================================================================
// Reg 33(7) — Cessed buildings in Island City
// ============================================================================
//
// COVERS
// ------
// Reconstruction or redevelopment of cessed buildings in the Island City by:
//   (a) Landlord, or                                                            // Reg 33(7)(1)
//   (b) Co-op society of landlords, or
//   (c) Composite landlord+CHS-of-occupiers, or
//   (d) Proposed CHS of occupiers (formerly cessed, cess-exempt now → 5(c)),
//   (e) MCGM-owned old buildings pre-30/9/1969.
//
// PRIMARY ELIGIBILITY GATES
// -------------------------
//   - Building existed prior to 30/9/1969                                       // Reg 33(7)(1) — L16793
//   - Attracts MHAD Act 1976 provisions (cessed)                                // Reg 33(7)(1)
//   - 51% irrevocable written consent of occupiers                              // Reg 33(7)(1)(a) — L16819
//   - Tenant list certified by MBRRB                                            // Reg 33(7)(3) — L16859
//   - No new tenancy created after 13/6/1996 counts                             // Reg 33(7)(13) — L17026
//   - 9m existing road essential for height >32m                                // Reg 33(7)(21) — L17163
//
// COMPOSITE EXTERNAL REGIME — MUST FLAG
// -------------------------------------
// DCPR 2034 governs the FSI math. The tenant-eligibility rules live in:
//   - Maharashtra Housing & Area Development Act 1976 (MHAD Act)                // EXT: MHAD Act 1976
//   - MBRRB regulations and circulars                                           // EXT: MBRRB circulars
//   - Third Schedule of MHAD Act (% surplus BUA → MHADA)                        // Reg 33(7)(4) — L16893
// Pure DCPR pseudocode is INCOMPLETE on its own. Certified-tenant lists,
// master tenant cut-offs, and the cess deposit mechanism are external.
//
// PRIMARY CITATIONS
// -----------------
//   Reg 33(7)(1)     — FSI = 3.0 gross OR rehab + incentive, whichever more.
//   Reg 33(7)(2)     — Per-occupant 27.88 sqm min, 120 sqm max free, beyond 120 paid by occupant.
//   Reg 33(7)(5)(a)  — Single-landlord / landlord+CHS path: 50% incentive + 5% addl rehab carpet.
//   Reg 33(7)(5)(b)  — Composite 2–5 plots: 60% incentive + 8% addl. 6+ plots OR municipal density>650/ha: 70% + 15%.
//   Reg 33(7)(5)(c)  — Occupier-CHS, formerly cessed, cess-exempt now: FSI = 2.5 gross OR rehab + 50% incentive.
//   Reg 33(7)(4)     — MHADA surplus-BUA handover; no fungible on sale of handover portion.
//   Reg 33(7)(8)     — Premium: 10% normal OR 2.5% ASR (per FSI 1), whichever more. LOS min 10%.
//   Reg 33(7)(9)     — 20% of incentive FSI usable for non-residential.
//   Reg 33(7)(19)    — Non-cessed mixed-structure: ≤25% plot → treat as 33(7); >25% → excess deducted, FSI per Reg 30.
//
// GR AMENDMENTS THAT MATERIALLY CHANGE MATH
// -----------------------------------------
//   - 33(7) clause 8 in PEATA already states the 10%/2.5% formula; this is the
//     post-amendment text as printed. GR 14.01.2021 affected 33(7)(B) premium
//     directly. The PEATA edition of 33(7) clause 8 is consistent with the
//     reduced rates and does not need an additional 14.01.2021 halving.
//     [Verified via PEATA p.154, 2026-05.]
// ----------------------------------------------------------------------------

function computeBuildable_33_7(input) {
  // PSEUDOCODE ONLY — not implemented; do not wire into detectApplicableSchemes.

  // ---- 1. Base inputs (reuse App.js's computeBaseInputs for real impl) ----
  const grossPlot       = input.plotArea;                                        // gross before deductions
  const dpRoadAndSetback = input.dpRoadDeduction;                                // Reg 16 — Regular Line / DP road
  const reservation     = input.reservationDeduction;                            // Reg 17 — net handover
  const reg14           = _reg14Amenity(input.grossPlotExclRoad, 'reg33_7');     // Reg 14(A) — 35% concession applies
  const netPlot         = _netPlot(grossPlot, dpRoadAndSetback, reg14, reservation); // Reg 30(A)(2)

  // ---- 2. Path determination (5(a) / 5(b) / 5(c)) -----------------------
  // Inputs that decide which sub-clause governs:
  //   - input.compositionMode: 'single' | 'composite_2to5' | 'composite_6plus'
  //                          | 'municipal_dense' | 'occupier_chs_cessexempt'
  //   - input.eligibleTenementDensityPerHa  (only for municipal_dense path)
  let incentiveRatio, additionalRehabCarpetPct, gateFsiOnGross;
  switch (input.compositionMode) {
    case 'single':
      incentiveRatio              = 0.50;                                        // Reg 33(7)(5)(a) — L16980
      additionalRehabCarpetPct    = 0.05;                                        // Reg 33(7)(5)(a) — L16983
      gateFsiOnGross              = 3.00;                                        // Reg 33(7)(1)   — L16802
      break;
    case 'composite_2to5':
      incentiveRatio              = 0.60;                                        // Reg 33(7)(5)(b) — L16988
      additionalRehabCarpetPct    = 0.08;                                        // Reg 33(7)(5)(b)
      gateFsiOnGross              = 3.00;                                        // Reg 33(7)(5)(b)
      break;
    case 'composite_6plus':
    case 'municipal_dense':                                                      // density >650/ha trigger
      incentiveRatio              = 0.70;                                        // Reg 33(7)(5)(b) proviso — L17004
      additionalRehabCarpetPct    = 0.15;                                        // Reg 33(7)(5)(b) proviso
      gateFsiOnGross              = 3.00;                                        // Reg 33(7)(5)(b) proviso
      break;
    case 'occupier_chs_cessexempt':
      incentiveRatio              = 0.50;                                        // Reg 33(7)(5)(c) — L17019
      additionalRehabCarpetPct    = 0;                                           // 5(c) silent on addl carpet
      gateFsiOnGross              = 2.50;                                        // Reg 33(7)(5)(c) — L17019
      break;
    default:
      throw new Error('33(7): compositionMode required');
  }

  // ---- 3. Existing BUA + carpet entitlements -----------------------------
  // Per-occupant rehab carpet:
  //   min 27.88 sqm, max 120 sqm free, beyond 120 sqm paid by occupant at ASR. // Reg 33(7)(2) — L16831
  // Area beyond 120 sqm counts for REHAB FSI but NOT for INCENTIVE FSI.        // Reg 33(7)(2) — L16846
  // EXT: MBRRB must certify each occupant's "rehab carpet area".               // Reg 33(7)(3)
  const REHAB_MIN_CARPET = 27.88;                                                // Reg 33(7)(2) — 300 sqft
  const REHAB_FREE_CAP   = 120.00;                                               // Reg 33(7)(2) — 1292 sqft
  const CARPET_TO_BUA    = 1.20;                                                 // Reg 33(8)(II)(E)(b) — PEATA p.163: "ratio of BUA to carpet area shall be considered as 1.2"

  // input.occupants: [{ carpet, use: 'residential'|'commercial'|'mixed' }, ...]
  // Apply 27.88 floor, 120 cap-for-incentive logic per occupant:
  let totalRehabCarpet = 0, totalIncentiveBaseCarpet = 0;
  for (const o of (input.occupants || [])) {
    const rehab = Math.max(o.carpet, REHAB_MIN_CARPET);                          // Reg 33(7)(2)
    const incBase = Math.min(rehab, REHAB_FREE_CAP);                             // Reg 33(7)(2) proviso
    totalRehabCarpet           += rehab;
    totalIncentiveBaseCarpet   += incBase;
  }
  const rehabBua          = totalRehabCarpet * CARPET_TO_BUA;
  const incentiveBaseBua  = totalIncentiveBaseCarpet * CARPET_TO_BUA;
  const incentiveBua      = incentiveBaseBua * incentiveRatio;                   // Reg 33(7)(5) — 50%/60%/70%
  const addlRehabBua      = rehabBua * additionalRehabCarpetPct;                 // Reg 33(7)(5) — 5%/8%/15% addl

  // 5(b) Note: permissible FSI may EXCEED 3.0 by the BUA required for the
  // additional rehab carpet (5%/8%/15%) — i.e. the cap is not hard at 3.0.    // Reg 33(7)(5) Note — L17009

  // ---- 4. Governing FSI BUA ---------------------------------------------
  // Two paths, take the larger (per clause 1):
  //   Path A (rehab+incentive):     rehab + incentive + addl rehab
  //   Path B (gate FSI on gross):   gateFsiOnGross × grossPlot
  // Plus the 5(b)-Note carve-out for the addl rehab BUA exceeding the gate.
  const rehabBasePath = rehabBua + incentiveBua + addlRehabBua;                  // Reg 33(7)(1) Path A
  const gatePathRaw   = gateFsiOnGross * grossPlot;                              // Reg 33(7)(1) Path B
  const gatePath      = gatePathRaw + addlRehabBua;                              // Reg 33(7)(5) Note carve-out
  const fsiBua        = Math.max(rehabBasePath, gatePath);                      // Reg 33(7)(1) — whichever more

  // ---- 5. Fungible Compensatory Area (Reg 31(3)) -------------------------
  // VERIFIED AGAINST PEATA p.120 (2026-05):
  //   "Provided that in case of redevelopment under regulation 33(7), 33(7)(A),
  //    33(8), 33(9), 33(9)(B), 33(20), and 33(10) excluding clause No. 3.11 of the
  //    Regulation the fungible compensatory area admissible on AH/R&R component
  //    shall be granted without charging premium."
  // 33(7) clause 4 proviso additionally bars fungible on the MHADA-handover
  // surplus area from being used on sale component.
  // Therefore: split fungible into (i) rehab carve-out → tenants, no premium,
  // and (ii) sale-side fungible → premium-payable.
  const fungibleLoad   = input.fungibleLoad ?? 1.0;
  const saleSideFsiBua = Math.max(0, fsiBua - rehabBua - addlRehabBua);          // sale portion only
  const fungibleRehab  = (rehabBua + addlRehabBua) * 0.35;                       // rehab+addl carve-out
  const fungibleSale   = saleSideFsiBua * 0.35 * fungibleLoad;                   // sale portion, premium-payable
  const fungibleArea   = fungibleRehab + fungibleSale;

  // ---- 6. MHADA surplus BUA handover (Third Schedule of MHAD Act 1976) --
  // EXT: percentage = per Third Schedule (varies by tenement density tier).
  //      The PEATA edition does not in-line the table; pull from MBRRB.        // EXT: MHAD Act 1976, 3rd Sch.
  const mhadaSurplusPct = input.mhadaSurplusPct ?? null;                         // EXT — input from MBRRB ref
  const mhadaSurplusBua = mhadaSurplusPct === null
    ? null                                                                       // unknown — gate the scheme
    : fsiBua * mhadaSurplusPct;                                                  // EXT: MHAD Act 3rd Sch.

  // ---- 7. Permissible BUA + sale ----------------------------------------
  const permissibleBua    = fsiBua + fungibleArea;
  // memberSide gets rehab + addl + the rehab-side fungible carve-out
  // (which by Reg 31(3) proviso cannot be used on sale component).
  const memberSideRehabBua = rehabBua + addlRehabBua + fungibleRehab;            // Reg 31(3) + 33(7)(4)
  const saleBua           = Math.max(
    0,
    permissibleBua - memberSideRehabBua - (mhadaSurplusBua ?? 0)                 // MHADA share off-the-top
  );

  // 20% of incentive FSI usable for non-residential.                            // Reg 33(7)(9) — L17112
  const nonResidentialCapBua = incentiveBua * 0.20;

  // ---- 8. Premium under Reg 33(7)(8) ------------------------------------
  // Premium = max(10% of normal premium, 2.5% of ASR land rate per FSI 1).
  // "Normal premium" = the Reg 30 standard premium-FSI charge (50% ASR × BUA).  // Reg 30 standard
  const asrRate          = input.asrLandRate || 0;
  const normalPremium    = (input.normalPremiumBua || 0) * asrRate * 0.50;       // Reg 30 — placeholder
  const altPremium       = (fsiBua) * asrRate * 0.025;                           // Reg 33(7)(8) — 2.5% ASR
  const premiumPayable   = Math.max(normalPremium * 0.10, altPremium);           // Reg 33(7)(8) — L17041

  // Development cess additionally per clause 15: 100% of dev charges on BUA    // Reg 33(7)(15) — L17048
  // (excluding fungible), OR Rs 5,000/sqm for new BUA, whichever more.
  const DEV_CESS_PER_SQM_MIN = 5000;                                             // Reg 33(7)(15)

  // ---- 9. LOS minimum -- relaxations from 33(10)(6) except 6.11/6.16/6.18 -
  // LOS may be reduced for viability, but minimum 10% must be retained.        // Reg 33(7)(8) proviso — L17047
  const losMinPct = 0.10;

  // ---- 10. In-situ FSI (Reg 16) — DENIED for 33(7) ----------------------
  const slab = _fsiSlab(input.zone, input.roadWidth, input.widenedTo9m);
  const inSituFsiBua = _inSituFsi('reg33_7', dpRoadAndSetback + reservation, (slab||{}).basic||0);
  const inSituFsiEligible = false;
  const inSituFsiDeniedReason = 'Reg 16 denies in-situ FSI for Reg 33(7) schemes';

  // ---- 11. Eligibility return shell -------------------------------------
  const eligibility = analyseEligibility_33_7(input);

  return {
    schemeId: 'reg33_7',
    schemeName: 'Reg 33(7) Cessed Building Redevelopment (Island City)',
    // Base
    grossPlot, netPlot, reg14, dpRoadAndSetback, reservation,
    // Path determination
    compositionMode: input.compositionMode, incentiveRatio, additionalRehabCarpetPct, gateFsiOnGross,
    // BUA build-up
    rehabBua, incentiveBua, addlRehabBua, rehabBasePath, gatePath, fsiBua,
    fungibleArea, permissibleBua,
    // Allocation
    memberSideRehabBua, mhadaSurplusBua, mhadaSurplusPct, saleBua,
    nonResidentialCapBua,
    // Premium
    premiumPayable, altPremium, normalPremium, DEV_CESS_PER_SQM_MIN,
    // Constraints
    losMinPct,
    inSituFsiBua, inSituFsiEligible, inSituFsiDeniedReason,
    // Eligibility
    eligibility,
    // Effective
    effFsi: netPlot > 0 ? permissibleBua / netPlot : 0,
  };
}

function analyseEligibility_33_7(input) {
  const gates = [];
  const warnings = [];

  // Location — Island City only.                                                // Reg 33(7) head
  if (input.zone !== 'islandCity') {
    gates.push({ id: 'zone', ok: false, msg: 'Reg 33(7) applies to Island City only' });
  }

  // Cessed and pre-30/9/1969.                                                   // Reg 33(7)(1)
  if (input.preSep1969 !== true) {
    gates.push({ id: 'pre1969', ok: false, msg: 'Building must have existed prior to 30/9/1969' });
  }
  if (input.isCessed !== true && input.compositionMode !== 'occupier_chs_cessexempt') {
    gates.push({ id: 'cessed', ok: false, msg: 'Building must attract MHAD Act 1976 (cessed) or qualify under 5(c) exemption' });
  }

  // 51% consent.                                                                // Reg 33(7)(1)(a)
  if ((input.consentPct ?? 0) < 0.51) {
    gates.push({ id: 'consent', ok: false, msg: '51% irrevocable written consent of occupiers required' });
  }

  // MBRRB tenant list certified.                                                // Reg 33(7)(3)
  if (input.mbrrbCertified !== true) {
    gates.push({ id: 'mbrrb', ok: false, msg: 'MBRRB must certify the eligible-occupants list' });
  }

  // No new tenancy post 13/6/1996.                                              // Reg 33(7)(13)
  if (input.tenanciesPost1996 === true) {
    warnings.push('Tenancies created after 13/6/1996 are not counted for incentive — verify cut-off list');
  }

  // 9m road for >32m height.                                                    // Reg 33(7)(21)
  if (input.proposedHeight > 32 && input.roadWidth < 9) {
    gates.push({ id: 'road9m', ok: false, msg: '9m existing road essential for any height above 32m' });
  }

  // 25% non-cessed mixed-structure trigger.                                     // Reg 33(7)(19)
  if ((input.nonCessedPlotPct ?? 0) > 0.25) {
    warnings.push('Non-cessed structure area exceeds 25% — excess plot area falls under Reg 30, not 33(7)');
  }

  // MHADA surplus BUA percentage required (Reg 33(7)(4) → Third Schedule of MHAD Act 1976).
  // If unknown, the sale-side BUA cannot be computed correctly — gate the scheme.
  if (input.mhadaSurplusPct == null && input.compositionMode !== 'occupier_chs_cessexempt') {
    gates.push({ id: 'mhadaSurplus', ok: false,
      msg: 'MHADA surplus-BUA percentage (Third Schedule of MHAD Act 1976) required — pull from MBRRB' });
  }

  // EXT: MHAD Act / MBRRB constraints not modelled.
  warnings.push('EXT: Tenant eligibility, certified-tenant list cut-offs, and cess-deposit mechanism are governed by MHAD Act 1976 + MBRRB circulars — pseudocode does not encode these');

  return { gates, warnings };
}

// ============================================================================
// Reg 33(7)(A) — Tenanted dilapidated/unsafe buildings (non-cessed)
// ============================================================================
//
// COVERS
// ------
// Reconstruction or redevelopment of:
//   - Authorised tenant-occupied buildings in Suburbs / Extended Suburbs
//     that are dilapidated/unsafe (MCGM-declared), AND
//   - Authorised non-cessed tenant-occupied buildings in Mumbai (Island) City.
// Undertaken by landlord/s OR CHS of existing tenants.
//
// PRIMARY ELIGIBILITY GATES
// -------------------------
//   - MCGM-declared unsafe / lawful demolition order                            // Reg 33(7)(A) head — L17171
//   - 51% irrevocable written consent of tenants                                // Reg 33(7)(A)(2)(a) — L17207
//   - All tenants re-accommodated in redeveloped building                       // Reg 33(7)(A)(2)(b) — L17214
//   - No new tenancy created after 13/6/1996                                    // Reg 33(7)(A)(4) — L17236
//   - Tenant list certified by MCGM (NOT MBRRB — key difference from 33(7))   // Reg 33(7)(A)(5) — L17247
//
// KEY DIFFERENCES FROM 33(7)
// --------------------------
//   - Geography: Suburbs/Extended Suburbs (dilapidated) + Island City non-cessed.
//   - Certifying authority: MCGM, not MBRRB.
//   - No "FSI 3.0 gate" — uses Reg 30 + clause 5(a)/(b) explicitly.
//   - Composite path includes "FSI already authorisedly consumed by
//     non-tenanted buildings/structures" on top of rehab+incentive.
//   - Reg 33(7)(A)(20) gives an explicit TDR/additional-FSI fallback at
//     50% of Reg 30 premium if rehab+incentive < Reg 30 permissible.
//   - Reg 33(7)(A)(13) makes rehab-component fungible compulsory-to-tenants,
//     no premium, no free-sale use.
//
// PRIMARY CITATIONS
// -----------------
//   Reg 33(7)(A)(a)         — Pure tenant plot: 50% incentive + 5% addl carpet.
//   Reg 33(7)(A)(b)         — Composite: 50% incentive + addl FSI consumed by non-tenanted parts.
//   Reg 33(7)(A) proviso    — 2–5 plots → 60% + 8%; 6+ plots → 70% + 15%.
//   Reg 33(7)(A)(3)         — 27.88 sqm floor, 120 sqm cap free, beyond → tenant pays.
//   Reg 33(7)(A)(10)        — FSI on entire plot incl. DP/internal roads BUT excluding reservation land.
//   Reg 33(7)(A)(12)        — 20% of incentive FSI usable for non-residential.
//   Reg 33(7)(A)(13)        — Rehab-component fungible: no premium, must go to tenants, no free-sale use.
//   Reg 33(7)(A)(15)        — Cess ₹5,000/sqm on BUA over Reg 30 Table 12, +10% every 3 years.
//   Reg 33(7)(A)(17)        — Start within 1 year, complete within 5 years.
//   Reg 33(7)(A)(20)        — Reg 30 fallback at 50% of normal premium.
//   Reg 33(7)(A)(21)        — Premium 10% normal OR 2.5% ASR (per FSI 1), whichever more.
//
// GR AMENDMENTS
// -------------
//   - GR 13.09.2019 (TPB-4318/629/CR-55/2019/UD-11) sanctioned modification to
//     Reg 33(7)(A): MODIFIED clause 20 (rate now "50% of Normal Premium" as
//     per Reg 30) and INTRODUCED clause 21 (relaxations of Reg 33(10) cl. 6
//     except 6.11/6.16/6.18; premium = max(10% normal, 2.5% ASR per FSI 1)).
//     The (10%, 2.5%) formula is NOT a halving of an earlier rate — it is
//     itself the original sanctioned text of clause 21.
//     [Verified via PEATA p.516–518 schedule, 2026-05.]
//
// EXT FLAGS
// ---------
//   - Rent Control Act governs tenement transfer restrictions until CHS forms.  // Reg 33(7)(A)(19)
//   - MCGM inspection extract 1995-96 OR Court Order needed for pre-13/6/96 tenancy proof. // Reg 33(7)(A)(4)
// ----------------------------------------------------------------------------

function computeBuildable_33_7A(input) {
  // PSEUDOCODE ONLY — not implemented.

  // ---- 1. Base inputs ----------------------------------------------------
  const grossPlot       = input.plotArea;
  const dpRoadAndSetback = input.dpRoadDeduction;                                // Reg 16 — Regular Line
  const reservation     = input.reservationDeduction;                            // Reg 17 — net handover
  const reg14           = _reg14Amenity(input.grossPlotExclRoad, 'reg33_7A');    // Reg 14(A) 35% concession
  // Reg 33(7)(A)(10): FSI on whole plot incl. roads, EXCLUDING reservation.   // L17297
  // i.e. dpRoadAndSetback is NOT deducted here, unlike Reg 30(A)(2) default.
  const fsiPlotForCalc  = grossPlot - reservation - reg14;                       // Reg 33(7)(A)(10)
  const netPlot         = _netPlot(grossPlot, dpRoadAndSetback, reg14, reservation); // for reference / Reg 30 fallback

  // ---- 2. Path determination --------------------------------------------
  // input.compositionMode: 'pure_tenant' | 'composite_with_nontenanted'
  //                       | 'multi_plot_2to5' | 'multi_plot_6plus'
  let incentiveRatio, additionalRehabCarpetPct;
  switch (input.compositionMode) {
    case 'pure_tenant':
      incentiveRatio = 0.50;                                                     // Reg 33(7)(A)(a) — L17181
      additionalRehabCarpetPct = 0.05;
      break;
    case 'composite_with_nontenanted':
      incentiveRatio = 0.50;                                                     // Reg 33(7)(A)(b) — L17188
      additionalRehabCarpetPct = 0.05;
      break;
    case 'multi_plot_2to5':
      incentiveRatio = 0.60;                                                     // Reg 33(7)(A) proviso — L17198
      additionalRehabCarpetPct = 0.08;
      break;
    case 'multi_plot_6plus':
      incentiveRatio = 0.70;                                                     // Reg 33(7)(A) proviso — L17202
      additionalRehabCarpetPct = 0.15;
      break;
    default:
      throw new Error('33(7)(A): compositionMode required');
  }

  // ---- 3. Rehab + incentive carpet ---------------------------------------
  // Floor 27.88, free cap 120; beyond 120 paid by tenant at ASR, counts for    // Reg 33(7)(A)(3) — L17217
  // rehab FSI but NOT incentive FSI.
  const REHAB_MIN_CARPET = 27.88;
  const REHAB_FREE_CAP   = 120.00;
  const CARPET_TO_BUA    = 1.20;                                                 // Reg 33(8)(II)(E)(b) — PEATA p.163

  let totalRehabCarpet = 0, totalIncentiveBaseCarpet = 0;
  for (const t of (input.tenants || [])) {
    const rehab = Math.max(t.carpet, REHAB_MIN_CARPET);                          // Reg 33(7)(A)(3)
    const incBase = Math.min(rehab, REHAB_FREE_CAP);                             // Reg 33(7)(A)(3) proviso
    totalRehabCarpet         += rehab;
    totalIncentiveBaseCarpet += incBase;
  }
  const rehabBua          = totalRehabCarpet * CARPET_TO_BUA;
  const incentiveBaseBua  = totalIncentiveBaseCarpet * CARPET_TO_BUA;
  const incentiveBua      = incentiveBaseBua * incentiveRatio;                   // Reg 33(7)(A) 5(a)/(b)
  const addlRehabBua      = rehabBua * additionalRehabCarpetPct;                 // Reg 33(7)(A) 5(a)/(b)

  // Composite carve-out: add FSI already authorisedly consumed by non-tenanted // Reg 33(7)(A)(b) — L17192
  // buildings on the plot.
  const nonTenantedConsumedBua = (input.compositionMode === 'composite_with_nontenanted')
    ? (input.nonTenantedConsumedBua || 0)
    : 0;

  // ---- 4. Governing FSI --------------------------------------------------
  const rehabIncentivePath = rehabBua + incentiveBua + addlRehabBua + nonTenantedConsumedBua;

  // Reg 33(7)(A)(20) fallback: if rehab+incentive < Reg 30 permissible,         // Reg 33(7)(A)(20) — L17370
  // owner MAY opt for Reg 30 permissible by paying 50% of normal Reg 30
  // premium for the gap (loaded via TDR / Additional FSI).
  const slab           = _fsiSlab(input.zone, input.roadWidth, input.widenedTo9m);
  const reg30Path      = netPlot * ((slab||{}).basic||0)
                       + netPlot * ((slab||{}).premium||0) * (input.premiumFsiLoad ?? 1.0)
                       + netPlot * ((slab||{}).tdr||0)     * (input.tdrLoad ?? 1.0);
  const optReg30Fallback = input.optReg30Fallback === true;                      // user opts in
  const reg30FallbackUsable = optReg30Fallback && reg30Path > rehabIncentivePath;
  const fsiBua  = reg30FallbackUsable ? reg30Path : rehabIncentivePath;          // Reg 33(7)(A) 5 OR 20

  // ---- 5. Fungible Compensatory Area -------------------------------------
  // Reg 33(7)(A)(13): rehab-component fungible: NO premium, MUST go to tenants  // Reg 33(7)(A)(13) — L17307
  // as additional area, CANNOT be used on free-sale component.
  // Sale-component fungible: per Reg 31(3), 35% × sale BUA × ASR × 50%.
  const fungibleRehab = rehabBua * 0.35;                                         // Reg 31(3) + 33(7)(A)(13)
  const fungibleLoad  = input.fungibleLoad ?? 1.0;
  const fungibleSale  = (fsiBua - rehabBua) * 0.35 * fungibleLoad;               // sale portion only
  const fungibleArea  = fungibleRehab + fungibleSale;

  // ---- 6. Permissible BUA + sale ----------------------------------------
  const permissibleBua    = fsiBua + fungibleArea;
  // memberSide gets all rehab + addl + their fungible carve-out.
  const memberSideRehabBua = rehabBua + addlRehabBua + fungibleRehab;            // Reg 33(7)(A)(13)
  const saleBua           = Math.max(0, permissibleBua - memberSideRehabBua);
  const nonResidentialCapBua = incentiveBua * 0.20;                              // Reg 33(7)(A)(12)

  // ---- 7. Premium under Reg 33(7)(A)(21) --------------------------------
  // Same formula as 33(7)(8): max(10% normal premium, 2.5% ASR per FSI 1).
  const asrRate        = input.asrLandRate || 0;
  const normalPremium  = (input.normalPremiumBua || 0) * asrRate * 0.50;         // Reg 30 placeholder
  const altPremium     = fsiBua * asrRate * 0.025;                               // Reg 33(7)(A)(21) — 2.5% ASR
  const premiumPayable = Math.max(normalPremium * 0.10, altPremium);             // Reg 33(7)(A)(21)

  // Fallback premium (clause 20) — for the gap loaded via TDR/Additional FSI.
  let fallbackPremium = 0;
  if (reg30FallbackUsable) {
    const gapBua = reg30Path - rehabIncentivePath;
    fallbackPremium = gapBua * asrRate * 0.50 * 0.50;                            // Reg 33(7)(A)(20) — 50% of normal
  }

  // ---- 8. Cess (Reg 33(7)(A)(15)) ---------------------------------------
  // ₹5000/sqm on BUA over Reg 30 Table 12 permissible, with +10% every 3 yrs.   // Reg 33(7)(A)(15)
  const reg30TableBua = netPlot * ((slab||{}).basic||0);
  const excessOverReg30Bua = Math.max(0, fsiBua - reg30TableBua);
  const yearsSince2018 = Math.max(0, (input.currentYear || new Date().getFullYear()) - 2018);
  const tripletEscalations = Math.floor(yearsSince2018 / 3);
  const cessRatePerSqm = 5000 * Math.pow(1.10, tripletEscalations);              // Reg 33(7)(A)(15)
  const cessPayable = excessOverReg30Bua * cessRatePerSqm;

  // ---- 9. In-situ FSI (Reg 16) — DENIED for 33(7)(A) ---------------------
  const inSituFsiBua = _inSituFsi('reg33_7A', dpRoadAndSetback + reservation, (slab||{}).basic||0);
  const inSituFsiEligible = false;
  const inSituFsiDeniedReason = 'Reg 16 denies in-situ FSI for Reg 33(7)(A) schemes';

  // ---- 10. Eligibility return shell -------------------------------------
  const eligibility = analyseEligibility_33_7A(input);

  return {
    schemeId: 'reg33_7A',
    schemeName: 'Reg 33(7)(A) Tenanted Dilapidated Redevelopment',
    grossPlot, netPlot, fsiPlotForCalc, reg14, dpRoadAndSetback, reservation,
    compositionMode: input.compositionMode, incentiveRatio, additionalRehabCarpetPct,
    rehabBua, incentiveBua, addlRehabBua, nonTenantedConsumedBua,
    rehabIncentivePath, reg30Path, reg30FallbackUsable, fsiBua,
    fungibleRehab, fungibleSale, fungibleArea,
    permissibleBua, memberSideRehabBua, saleBua, nonResidentialCapBua,
    premiumPayable, fallbackPremium, cessPayable, cessRatePerSqm,
    inSituFsiBua, inSituFsiEligible, inSituFsiDeniedReason,
    eligibility,
    effFsi: netPlot > 0 ? permissibleBua / netPlot : 0,
  };
}

function analyseEligibility_33_7A(input) {
  const gates = [];
  const warnings = [];

  // MCGM unsafe / lawful demolition order.                                      // Reg 33(7)(A) head
  if (input.mcgmUnsafeDeclared !== true && input.mcgmDemolitionOrder !== true) {
    gates.push({ id: 'unsafe', ok: false, msg: 'MCGM must declare building unsafe OR issue lawful demolition order' });
  }

  // 51% consent.                                                                // Reg 33(7)(A)(2)(a)
  if ((input.consentPct ?? 0) < 0.51) {
    gates.push({ id: 'consent', ok: false, msg: '51% irrevocable written consent of tenants required' });
  }

  // MCGM tenant list certified.                                                 // Reg 33(7)(A)(5)
  if (input.mcgmTenantListCertified !== true) {
    gates.push({ id: 'mcgmList', ok: false, msg: 'MCGM must certify tenant list and consent' });
  }

  // Pre-13/6/96 tenancy proof.                                                  // Reg 33(7)(A)(4)
  if (input.preJun1996EvidenceType == null) {
    warnings.push('Pre-13/6/96 tenancy proof needed: MCGM inspection extract 1995-96 OR court order');
  }

  // All tenants re-accommodated.                                                // Reg 33(7)(A)(2)(b)
  if (input.tenantsReaccommodated !== true) {
    gates.push({ id: 'reaccommodation', ok: false, msg: 'All tenants of old building must be re-accommodated' });
  }

  // Geography eligibility.                                                      // Reg 33(7)(A) head
  if (input.zone === 'islandCity' && input.isCessed === true) {
    warnings.push('Cessed buildings in Island City are governed by Reg 33(7), not 33(7)(A)');
  }

  return { gates, warnings };
}

