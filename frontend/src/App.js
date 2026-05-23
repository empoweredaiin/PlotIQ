import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Check, X, AlertTriangle, Plus, Trash2, ChevronDown, Printer, Eye, EyeOff, MapPin } from 'lucide-react';

// ============================================================================
// WARD DETECTION — point-in-polygon using WardBoundary.geojson
// ============================================================================

const WARD_INFO = {
  'A':   { localities: 'Colaba, Cuffe Parade, Nariman Point', islandCity: true,  igrDistrict: 'Mumbai City',     igrTaluka: 'Mumbai City' },
  'B':   { localities: 'Fort, CST, Marine Lines, Kalbadevi',  islandCity: true,  igrDistrict: 'Mumbai City',     igrTaluka: 'Mumbai City' },
  'C':   { localities: 'Charni Road, Girgaon, Marine Lines (N)', islandCity: true, igrDistrict: 'Mumbai City',   igrTaluka: 'Mumbai City' },
  'D':   { localities: 'Malabar Hill, Walkeshwar, Nepean Sea Road', islandCity: true, igrDistrict: 'Mumbai City', igrTaluka: 'Mumbai City' },
  'E':   { localities: 'Byculla, Mazgaon, Dongri',            islandCity: true,  igrDistrict: 'Mumbai City',     igrTaluka: 'Mumbai City' },
  'F/N': { localities: 'Matunga, Wadala, Antop Hill',         islandCity: true,  igrDistrict: 'Mumbai City',     igrTaluka: 'Mumbai City' },
  'F/S': { localities: 'Parel, Dadar East, Sewri, Lalbaug',   islandCity: true,  igrDistrict: 'Mumbai City',     igrTaluka: 'Mumbai City' },
  'G/N': { localities: 'Dadar West, Mahim',                   islandCity: true,  igrDistrict: 'Mumbai City',     igrTaluka: 'Mumbai City' },
  'G/S': { localities: 'Worli, Lower Parel, Prabhadevi',      islandCity: true,  igrDistrict: 'Mumbai City',     igrTaluka: 'Mumbai City' },
  'H/E': { localities: 'Bandra East, Kurla West, BKC',        islandCity: false, igrDistrict: 'Mumbai Suburban', igrTaluka: 'Andheri' },
  'H/W': { localities: 'Bandra West, Khar, Santacruz West',   islandCity: false, igrDistrict: 'Mumbai Suburban', igrTaluka: 'Andheri' },
  'K/E': { localities: 'Andheri East, Sahar, Vile Parle East',islandCity: false, igrDistrict: 'Mumbai Suburban', igrTaluka: 'Andheri' },
  'K/N': { localities: 'Santacruz East, Vakola',              islandCity: false, igrDistrict: 'Mumbai Suburban', igrTaluka: 'Andheri' },
  'K/W': { localities: 'Andheri West, Juhu, Vile Parle West', islandCity: false, igrDistrict: 'Mumbai Suburban', igrTaluka: 'Andheri' },
  'L':   { localities: 'Kurla East, Ghatkopar West, Vidyavihar', islandCity: false, igrDistrict: 'Mumbai Suburban', igrTaluka: 'Kurla' },
  'M/E': { localities: 'Govandi, Mankhurd, Trombay',          islandCity: false, igrDistrict: 'Mumbai Suburban', igrTaluka: 'Kurla' },
  'M/W': { localities: 'Chembur, Ghatkopar East, Tilak Nagar',islandCity: false, igrDistrict: 'Mumbai Suburban', igrTaluka: 'Kurla' },
  'N':   { localities: 'Ghatkopar, Vikhroli, Powai (part)',   islandCity: false, igrDistrict: 'Mumbai Suburban', igrTaluka: 'Kurla' },
  'P/E': { localities: 'Goregaon East, Jogeshwari East, Aarey',islandCity: false, igrDistrict: 'Mumbai Suburban', igrTaluka: 'Borivali' },
  'P/N': { localities: 'Malad West, Malvani, Marve, Aksa',    islandCity: false, igrDistrict: 'Mumbai Suburban', igrTaluka: 'Borivali' },
  'P/S': { localities: 'Goregaon West, Jogeshwari West',      islandCity: false, igrDistrict: 'Mumbai Suburban', igrTaluka: 'Borivali' },
  'R/C': { localities: 'Kandivali East, Dahisar (part)',       islandCity: false, igrDistrict: 'Mumbai Suburban', igrTaluka: 'Borivali' },
  'R/N': { localities: 'Borivali East, Dahisar East',         islandCity: false, igrDistrict: 'Mumbai Suburban', igrTaluka: 'Borivali' },
  'R/S': { localities: 'Borivali West, Kandivali West, Poisar',islandCity: false, igrDistrict: 'Mumbai Suburban', igrTaluka: 'Borivali' },
  'S':   { localities: 'Bhandup, Vikhroli East, Powai',       islandCity: false, igrDistrict: 'Mumbai Suburban', igrTaluka: 'Kurla' },
  'T':   { localities: 'Mulund West, Bhandup West, Nahur',    islandCity: false, igrDistrict: 'Mumbai Suburban', igrTaluka: 'Kurla' },
};

function _pipRing(pt, ring) {
  let inside = false;
  const [x, y] = pt;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function detectWardFromCoords(lat, lng, features) {
  const pt = [lng, lat];
  for (const f of features) {
    const { type, coordinates } = f.geometry;
    let hit = false;
    if (type === 'Polygon') hit = _pipRing(pt, coordinates[0]);
    else if (type === 'MultiPolygon') hit = coordinates.some(poly => _pipRing(pt, poly[0]));
    if (hit) return f.properties.wardname;
  }
  return null;
}

function parseGoogleMapsPlace(url) {
  const match = url.match(/\/place\/([^/@?]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1].replace(/\+/g, ' ')).trim();
  } catch (e) {
    return null;
  }
}

function parseGoogleMapsCoords(url) {
  // @lat,lng,zoom or @lat,lng (anywhere in path/query)
  const atMatch = url.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (atMatch) return [parseFloat(atMatch[1]), parseFloat(atMatch[2])];
  // ?q=lat,lng or &q=lat,lng
  const qMatch = url.match(/[?&]q=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (qMatch) return [parseFloat(qMatch[1]), parseFloat(qMatch[2])];
  // ll=lat,lng
  const llMatch = url.match(/[?&]ll=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (llMatch) return [parseFloat(llMatch[1]), parseFloat(llMatch[2])];
  return null;
}

// ============================================================================
// REGULATION 33(7)(B) — RULES ENGINE
// Source: Comprehensive DCPR 2034 (PEATA edition), Reg 33(7)(B) +
//         Operational guidelines for processing 33(7)(B) proposals (Circular)
// ============================================================================

const SQM_TO_SQFT = 10.7639;

// FSI Table 12 (Reg 30) — needed as the ceiling for "may avail premium FSI"
// proviso in 33(7)(B)(1)
const FSI_TABLE_12 = {
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

const findFsiSlab = (location, roadWidth) => {
  const slabs = FSI_TABLE_12[location] || FSI_TABLE_12.suburbsExtended;
  return slabs.find(s => roadWidth >= s.roadMin && roadWidth < s.roadMax) || slabs[0];
};

// Clamp a number to [0, 1]
const clamp01 = (n) => {
  const v = parseFloat(n);
  if (Number.isNaN(v)) return 1;
  return Math.max(0, Math.min(1, v));
};

// ----------------------------------------------------------------------------
// Reg 14(A) — Amenity Surrender on plots ≥ 4,000 sqm
// PDF p. 98–99. Triggered on gross plot (excl. road set-back per Reg 14(A) opening)
//   4,000–10,000 sqm  →  5% of plot
//   > 10,000 sqm      →  500 sqm + 10% of (plot − 10,000)
// Note (ii): for 33(7), 33(7)(A), 33(10) the amenity is reduced to 35%.
// 33(7)(B) and 33(9) get NO reduction (full amenity) — strict reading of Note ii.
// ----------------------------------------------------------------------------
const SCHEMES_WITH_REG14_REDUCTION = new Set(['reg33_7', 'reg33_7A', 'reg33_10']);

function computeReg14Amenity(grossPlotExclRoad, scheme, zone, isAmalgamated, smallestOriginalPlot) {
  if (zone === 'industrial') return { applies: false, area: 0, reason: 'Reg 14 applies to Residential / Commercial zones only' };
  if (grossPlotExclRoad < 4000) return { applies: false, area: 0, reason: 'Plot < 4,000 sqm — Reg 14 not triggered' };

  // Reg 14 Note (iii) — amalgamated plots
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

// ----------------------------------------------------------------------------
// Reg 27 — Recreational Open Space (ROS / LOS), site-planning constraint.
// Computed on net plot area.
//   ≤ 1,000 sqm → None | 1,001–2,500 → 15% | 2,501–10,000 → 20% | >10,000 → 25%
// NOT an FSI deduction, but deficiency attracts OSD premium = deficient × ASR × 25%.
// Concession under MCGM Circular CHE/DP/03450/26.08.2020 for 33(7)(B) cases.
// ----------------------------------------------------------------------------
function computeLOSRequirement(netPlotForLOS, zone) {
  if (zone === 'industrial') {
    if (netPlotForLOS < 1000) return { applies: false, area: 0, percent: 0 };
    return { applies: true, area: netPlotForLOS * 0.15, percent: 15, band: 'Industrial — flat 15%' };
  }
  if (netPlotForLOS <= 1000) return { applies: false, area: 0, percent: 0, band: 'Plot ≤ 1,000 sqm — ROS not required' };
  if (netPlotForLOS <= 2500) return { applies: true, area: netPlotForLOS * 0.15, percent: 15, band: '1,001–2,500 sqm' };
  if (netPlotForLOS <= 10000) return { applies: true, area: netPlotForLOS * 0.20, percent: 20, band: '2,501–10,000 sqm' };
  return { applies: true, area: netPlotForLOS * 0.25, percent: 25, band: '> 10,000 sqm' };
}

// ----------------------------------------------------------------------------
// Parking — Reg 30 norms (DCPR 2034)
// Cars: carpet ≤45 → 0 | 45–60 → 0.5 | 60–90 → 1 | >90 → 2 per flat
// Two-wheeler: 1 per residential flat
// Visitor: 5% of required cars (residential)
// Shop: 1 per 40 sqm floor area up to 800 sqm
// ----------------------------------------------------------------------------
function computeParkingRequirement(flats, commercialBua) {
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

// ----------------------------------------------------------------------------
// Premium Recovery Sheet — per Proforma-A / MCGM circulars (FY 2023-24)
// Premium FSI: premiumFsiBua × load × ASR × 50%  (Reg 30(A)(6) base rate;
//   GR 14.01.2021 50% rebate has expired)
// Fungible (sale only): fungibleSaleBua × ASR × 50% (Residential per Reg 31(3))
//   — Fungible on rehab/existing-BUA portion is FREE of premium for 33(7)(B)
//   — Split: 50% MCGM / 30% State Govt / 20% MSRDC
// OSD: deficientROS × ASR × 25%                  (concession under CHE/DP/03450)
// Additional MCGM AutoDCR fee heads (FY 2025-26 rate card):
//   Scrutiny:        BUA(sqm) × ₹70.7
//   IOD Deposit:     BUA(sqft) × ₹1
//   Debris Removal:  min(BUA(sqft) × ₹2, ₹45,000) — capped
//   Labour Welfare:  BUA(sqm) × Construction-rate × 1%   (BOCW Act 1996)
//   Dev Charges Land: Basic-FSI × Plot × ASR × 1%        (MR&TP §124E)
//   Dev Charges BUA:  BUA × ASR × 4%                     (MR&TP §124E)
//   Layout Scrutiny:  Plot × ₹11.13
//   TDR Util Scrutiny: TDR BUA × ₹59
//   TDR Infra Charge:  TDR BUA × Construction-rate × 5%  (Reg 32 circular)
// ----------------------------------------------------------------------------
const SQFT_PER_SQM = 10.7639;

function computePremiumSheet({
  premiumFsiBua, premiumLoad, asrRate, fungibleSaleBua, deficientROS,
  tdrBuaLoaded, totalBua, plotArea, basicFsi, constructionRate,
}) {
  const asr   = parseFloat(asrRate) || 0;
  const crate = parseFloat(constructionRate) || 0;
  const bua   = parseFloat(totalBua) || 0;
  const plot  = parseFloat(plotArea) || 0;
  const fsi   = parseFloat(basicFsi) || 0;
  const tdr   = parseFloat(tdrBuaLoaded) || 0;
  const buaSqft = bua * SQFT_PER_SQM;

  // Reg 30/31 premiums (existing)
  const premiumFsiPayable = premiumFsiBua * premiumLoad * asr * 0.50;
  const fungiblePremium   = fungibleSaleBua * asr * 0.50;
  const osdPremium        = deficientROS > 0 ? deficientROS * asr * 0.25 : 0;

  // AutoDCR additional heads (Mumbai FY 2025-26)
  const scrutinyFee       = bua * 70.7;
  const iodDeposit        = buaSqft * 1;
  const debrisDeposit     = Math.min(buaSqft * 2, 45000);
  const labourWelfareCess = bua * crate * 0.01;
  const devChargesLand    = fsi * plot * asr * 0.01;
  const devChargesBua     = bua * asr * 0.04;
  const devChargesTotal   = devChargesLand + devChargesBua;
  const layoutScrutinyFee = plot * 11.13;
  const tdrScrutinyFee    = tdr * 59;
  const tdrInfraCharge    = tdr * crate * 0.05;

  const totalAutoDCR =
    scrutinyFee + iodDeposit + debrisDeposit + labourWelfareCess +
    devChargesTotal + layoutScrutinyFee + tdrScrutinyFee + tdrInfraCharge;

  return {
    // Premiums
    premiumFsiPayable,
    fungiblePremium,
    fungibleMCGM:  fungiblePremium * 0.50,
    fungibleGovt:  fungiblePremium * 0.30,
    fungibleMSRDC: fungiblePremium * 0.20,
    osdPremium,
    // AutoDCR additional heads
    scrutinyFee, iodDeposit, debrisDeposit, labourWelfareCess,
    devChargesLand, devChargesBua, devChargesTotal,
    layoutScrutinyFee, tdrScrutinyFee, tdrInfraCharge,
    totalAutoDCR,
    // Grand totals
    totalPremium: premiumFsiPayable + fungiblePremium + osdPremium,
    grandTotal: premiumFsiPayable + fungiblePremium + osdPremium + totalAutoDCR,
  };
}

// ----------------------------------------------------------------------------
// Reg 15 — Inclusive Housing (informational flag only — NOT a plot deduction).
// PDF p. 102. Plot ≥ 4,000 sqm: 20% handover for EWS/LIG, but FSI of handed-over
// portion is loadable on balance plot. So no net effect on FSI base.
// ----------------------------------------------------------------------------
function computeReg15IHFlag(grossPlotExclRoad, zone) {
  if (zone !== 'residential' && zone !== 'mixed') return null;
  if (grossPlotExclRoad < 4000) return null;
  return {
    applies: true,
    handoverArea: grossPlotExclRoad * 0.20,
    note: '20% of plot to be handed over to MCGM for EWS/LIG housing. FSI of this portion is loadable on balance plot — so this is NOT a deduction from your buildable BUA. It is a handover obligation.',
  };
}

// ----------------------------------------------------------------------------
// Eligibility gates for 33(7)(B)
// ----------------------------------------------------------------------------
function analyseEligibility(input) {
  const { buildingAge, buildingType, authorisationStatus, membersOnSamePlot, gbResolution } = input;
  const issues = [];
  const passed = [];

  if (buildingAge < 30) {
    issues.push({
      level: 'warn',
      title: `Building age is ${buildingAge} years — below 30 for 33(7)(B) incentive`,
      detail: `Reg 33(7)(B) requires the building to be 30 years old or more to access the 15% incentive BUA. You'd need to wait ${30 - buildingAge} more years for that scheme. Until then, the platform falls back to standard Reg 30 / Table 12 FSI — no incentive, but redevelopment is still possible. If your building is structurally distressed, a structural audit could trigger 33(7)(A) (out of MVP scope; consult an architect).`,
      ref: 'Reg 33(7)(B)',
    });
  } else {
    passed.push({ title: `Age ${buildingAge} years — meets 30-year minimum for 33(7)(B)`, ref: 'Reg 33(7)(B)' });
  }

  if (buildingType === 'cessed') {
    issues.push({
      level: 'fail',
      title: 'Cessed building — falls under Reg 33(7), not 33(7)(B)',
      detail: 'A building paying cess to MHADA (typically Island City buildings pre-1969) is governed by Reg 33(7), which has different — usually more generous — incentive provisions. This platform does not cover 33(7).',
      ref: 'Reg 33(7)(B) opening',
    });
  } else if (buildingType === 'tenanted') {
    issues.push({
      level: 'fail',
      title: 'Tenanted building — falls under Reg 33(7)(A)',
      detail: 'If your building has tenants (not member-owners), and is dilapidated or unsafe, the applicable regulation is 33(7)(A). This platform does not cover 33(7)(A).',
      ref: 'Reg 33(7)(B) opening',
    });
  } else {
    passed.push({ title: 'Cooperative housing society — correct scheme', ref: 'Reg 33(7)(B) opening' });
  }

  if (authorisationStatus === 'none') {
    issues.push({
      level: 'fail',
      title: 'No approved plans, OC or MCGM file on record',
      detail: 'Per the operational guidelines for 33(7)(B), if there is neither an approved copy of plan, nor an Occupation Certificate, nor a file in MCGM records — the incentive additional BUA is NOT permissible. This is the most serious problem to fix before any redevelopment talk. You may need a regularisation route first.',
      ref: 'Circular Guidelines for 33(7)(B), Clause (b)(iii)',
    });
  } else if (authorisationStatus === 'oc') {
    passed.push({ title: 'Occupation Certificate on record — existing BUA per OC plans qualifies', ref: 'Circular for 33(7)(B), (b)(i)' });
  } else if (authorisationStatus === 'cc') {
    passed.push({ title: 'CC + approved plans on record — existing BUA per approved plans qualifies', ref: 'Circular for 33(7)(B), (b)(ii)' });
  } else if (authorisationStatus === 'tolerated') {
    passed.push({ title: 'Tolerated category — existing BUA per assessment record before datum line qualifies', ref: 'Circular for 33(7)(B), (b)(iv)' });
  }

  if (!membersOnSamePlot) {
    issues.push({
      level: 'fail',
      title: 'Existing members must be re-accommodated on the same plot',
      detail: '33(7)(B) is only available when existing society members are re-accommodated in the redeveloped project. If members are being shifted off-site permanently, this scheme does not apply.',
      ref: 'Reg 33(7)(B)',
    });
  } else {
    passed.push({ title: 'Members re-accommodated on same plot', ref: 'Reg 33(7)(B)' });
  }

  if (!gbResolution) {
    issues.push({
      level: 'warn',
      title: 'General Body Resolution will be required',
      detail: 'A society GB Resolution specifying who gets the incentive BUA (members vs developer or split) will be required at the proposal stage. Not yet a blocker for feasibility — but plan for it.',
      ref: 'Circular for 33(7)(B), (a)',
    });
  }

  // Reg 33(7)(B) clause 8 — mixed tenanted + non-tenanted plot
  if (input.mixedTenancy) {
    issues.push({
      level: 'warn',
      title: 'Mixed-tenancy plot — proportional split required',
      detail: 'If your plot has both tenanted buildings and member-owned cooperative buildings, Reg 33(7)(B) clause 8 requires the plot to be split into proportional notional plots — the tenanted portion redevelops under 33(7)(A), the society portion under 33(7)(B). This platform does not currently compute the split. Engage a Licensed Architect to handle the proportional development.',
      ref: 'Reg 33(7)(B), Clause 8',
    });
  }

  const eligible = !issues.some(i => i.level === 'fail');
  return { eligible, issues, passed };
}

// ----------------------------------------------------------------------------
// Scheme detection — Reg 30 standard / 33(7)(B) / 33(9) Cluster
// MVP scope: cooperative housing societies only.
// 33(7) cessed and 33(7)(A) tenanted are explicitly OUT for this iteration.
// 33(10) slum: flag only — no computation.
// ----------------------------------------------------------------------------
const ALL_SCHEMES = [
  {
    id: 'reg30_standard',
    code: 'Reg 30',
    name: 'Standard FSI (no incentive scheme)',
    short: 'Standard development',
    desc: 'Default FSI per Reg 30 / Table 12 — for societies not yet eligible for any incentive scheme.',
  },
  {
    id: 'reg33_7B',
    code: 'Reg 33(7)(B)',
    name: 'Cooperative Housing Society Redevelopment',
    short: 'Society redev (33(7)(B))',
    desc: 'Society 30+ years old, not cessed, not tenanted, members re-accommodated.',
  },
  {
    id: 'reg33_9',
    code: 'Reg 33(9)',
    name: 'Cluster Development Scheme',
    short: 'Cluster redev (33(9))',
    desc: 'Combine with neighbouring societies into a cluster for higher FSI ceiling of 4.00.',
  },
];

function detectApplicableSchemes(input) {
  const buildingAge = input.buildingAge || 0;
  const buildingType = input.buildingType || 'society';
  const authStatus = input.authorisationStatus;
  const isMembersOnSamePlot = input.membersOnSamePlot;
  const grossPlot = parseFloat(input.plotArea) || 0;
  const clusterOptedIn = input.clusterOptIn === true;
  const clusterPlot = parseFloat(input.clusterPlotArea) || 0;
  const isIslandCity = input.location === 'islandCity';
  const isSuburbs = input.location === 'suburbsExtended';

  const result = [];

  // Reg 30 standard — always available as fallback
  result.push({
    id: 'reg30_standard',
    eligible: true,
    reason: 'Always available as a baseline — uses just the Reg 30 / Table 12 FSI without any redevelopment incentive.',
    gates: [
      { ok: true, text: 'No additional eligibility — baseline calculation' },
    ],
  });

  // 33(7)(B) — society redev
  const reg33_7B_gates = [];
  let reg33_7B_eligible = true;
  let reg33_7B_reason = '';

  if (buildingType !== 'society') {
    reg33_7B_gates.push({ ok: false, text: `Building type "${buildingType}" — 33(7)(B) is only for member-owned co-op housing societies` });
    reg33_7B_eligible = false;
    reg33_7B_reason = 'Building is not a cooperative housing society';
  } else {
    reg33_7B_gates.push({ ok: true, text: 'Cooperative housing society' });
  }

  if (buildingAge < 30) {
    reg33_7B_gates.push({ ok: false, text: `Building is ${buildingAge} years old — 33(7)(B) requires 30+ years` });
    reg33_7B_eligible = false;
    reg33_7B_reason = reg33_7B_reason || 'Building age below 30 years';
  } else {
    reg33_7B_gates.push({ ok: true, text: `Building age ${buildingAge} years (≥30 required)` });
  }

  if (authStatus === 'none') {
    reg33_7B_gates.push({ ok: false, text: 'No MCGM records — incentive BUA not permissible per circular guidelines' });
    reg33_7B_eligible = false;
    reg33_7B_reason = reg33_7B_reason || 'No authorised MCGM records';
  } else {
    reg33_7B_gates.push({ ok: true, text: `Authorisation: ${authStatus.toUpperCase()}` });
  }

  if (!isMembersOnSamePlot) {
    reg33_7B_gates.push({ ok: false, text: 'Members not re-accommodated on same plot' });
    reg33_7B_eligible = false;
    reg33_7B_reason = reg33_7B_reason || 'Members must be re-accommodated on plot';
  } else {
    reg33_7B_gates.push({ ok: true, text: 'Members re-accommodated on same plot' });
  }

  result.push({
    id: 'reg33_7B',
    eligible: reg33_7B_eligible,
    reason: reg33_7B_eligible
      ? 'All eligibility gates satisfied for cooperative housing society redevelopment.'
      : reg33_7B_reason,
    gates: reg33_7B_gates,
  });

  // 33(9) Cluster — opt-in only, requires minimum cluster area
  const minClusterArea = isIslandCity ? 4000 : 6000;
  const reg33_9_gates = [];
  let reg33_9_eligible = true;
  let reg33_9_reason = '';

  if (!clusterOptedIn) {
    reg33_9_gates.push({ ok: false, text: 'Cluster scheme not opted-in — toggle "Combine with neighbouring societies" to evaluate' });
    reg33_9_eligible = false;
    reg33_9_reason = 'Cluster opt-in required';
  } else {
    reg33_9_gates.push({ ok: true, text: 'Cluster scheme opted-in' });

    if (clusterPlot < minClusterArea) {
      reg33_9_gates.push({ ok: false, text: `Cluster plot ${clusterPlot} sqm — minimum ${minClusterArea} sqm required for ${isIslandCity ? 'Island City' : 'Suburbs'}` });
      reg33_9_eligible = false;
      reg33_9_reason = `Cluster plot below minimum ${minClusterArea} sqm`;
    } else {
      reg33_9_gates.push({ ok: true, text: `Cluster plot ${clusterPlot} sqm meets ${minClusterArea} sqm minimum` });
    }

    if (buildingAge < 30) {
      reg33_9_gates.push({ ok: false, text: 'Buildings in cluster must be 30+ years old' });
      reg33_9_eligible = false;
      reg33_9_reason = reg33_9_reason || 'Building age below 30 years';
    } else {
      reg33_9_gates.push({ ok: true, text: 'Buildings 30+ years old' });
    }
  }

  result.push({
    id: 'reg33_9',
    eligible: reg33_9_eligible,
    reason: reg33_9_eligible
      ? 'Cluster eligibility satisfied — FSI ceiling 4.00 with rehab+incentive backstop.'
      : reg33_9_reason,
    gates: reg33_9_gates,
    minClusterArea,
  });

  return result;
}

// Pick the auto-detected primary scheme (the one we highlight by default)
function pickPrimaryScheme(schemes, input) {
  // If user has opted into cluster, ALWAYS route to cluster compute even when
  // size eligibility fails — the eligibility panel will flag the size issue,
  // but the math (FSI on clusterPlot, rehab on clusterExistingBua) is cluster-based.
  const clusterOptedIn = input && input.clusterOptIn === true;
  if (clusterOptedIn) return 'reg33_9';
  // Otherwise: 33(7)(B) if eligible, else Reg 30 fallback
  if (schemes.find(s => s.id === 'reg33_7B')?.eligible) return 'reg33_7B';
  return 'reg30_standard';
}

// ----------------------------------------------------------------------------
// Shared helper — compute deductions, existing BUA, FSI slab info
// (used by all scheme computers)
// ----------------------------------------------------------------------------
function computeBaseInputs(input, schemeId) {
  const plotArea = parseFloat(input.plotArea) || 0;
  const dpRoadDeduction = parseFloat(input.dpRoadDeduction) || 0;
  const reservationDeduction = parseFloat(input.reservationDeduction) || 0;
  const grossExclRoad = Math.max(0, plotArea - dpRoadDeduction);

  const reg14Auto = computeReg14Amenity(
    grossExclRoad, schemeId, input.zone || 'residential',
    input.isAmalgamated || false, parseFloat(input.smallestOriginalPlot) || 0
  );
  const reg14Override = input.reg14Override === true;
  const reg14ManualValue = parseFloat(input.reg14ManualValue) || 0;
  // Reg 14(A)(a)/(b): DP reservation already on plot offsets the amenity requirement
  const reg14ReservationOffset = reg14Auto.applies
    ? Math.min(reg14Auto.area, reservationDeduction)
    : 0;
  const reg14EffectiveArea = reg14Auto.applies
    ? Math.max(0, reg14Auto.area - reg14ReservationOffset)
    : 0;
  const reg14Deduction = reg14Override ? reg14ManualValue : reg14EffectiveArea;

  const netPlot = Math.max(0, plotArea - dpRoadDeduction - reg14Deduction - reservationDeduction);

  const losRequirement = computeLOSRequirement(netPlot, input.zone || 'residential');
  const losOverride = input.losOverride === true;
  const losManualValue = parseFloat(input.losManualValue) || 0;
  const losActualArea = losOverride ? losManualValue : losRequirement.area;

  const reg15Flag = computeReg15IHFlag(grossExclRoad, input.zone || 'residential');

  // Existing BUA & flat counts
  let existingBua = 0;
  if (input.buaInputMode === 'total') {
    existingBua = parseFloat(input.totalExistingBua) || 0;
  } else {
    const totalCarpet = input.flats.reduce(
      (s, f) => s + (parseFloat(f.carpet) || 0) * (parseInt(f.count) || 0), 0
    );
    existingBua = totalCarpet * 1.2;
  }
  const totalFlats = input.buaInputMode === 'total'
    ? (parseInt(input.tenementCount) || 0)
    : input.flats.reduce((s, f) => s + (parseInt(f.count) || 0), 0);
  const residentialFlats = input.buaInputMode === 'total'
    ? totalFlats
    : input.flats.filter(f => f.use === 'residential')
        .reduce((s, f) => s + (parseInt(f.count) || 0), 0);

  // FSI slab
  const rawRoadWidth = parseFloat(input.roadWidth) || 0;
  const roadWideningApplied = rawRoadWidth >= 6 && rawRoadWidth < 9 && !!input.roadWideningProposed;
  const effectiveRoadWidth = roadWideningApplied ? 9 : rawRoadWidth;
  const fsiSlab = findFsiSlab(input.location, effectiveRoadWidth);
  const baseFsiBua = netPlot * fsiSlab.basic;
  const premiumFsiBua = netPlot * fsiSlab.premium;
  const tdrBua = netPlot * fsiSlab.tdr;
  const ceilingBua = baseFsiBua + premiumFsiBua + tdrBua;

  // In-situ FSI for area handed over (Reg 30(A)(2) + Reg 16)
  // Road set-back and reservation handed to MCGM normally earn equivalent FSI on balance plot.
  // BUT Reg 16 explicitly EXCLUDES 33(5), 33(7), 33(7)(A), 33(9), 33(9)(A), 33(9)(B),
  // 33(10), 33(10)(A), 33(20)(A), 33(21) from this in-lieu FSI/TDR benefit
  // (incentive schemes already give BUA over and above basic FSI — preventing double-count).
  // 33(7) parent regulation includes 33(7)(B) per strict reading of the exclusion list.
  const SCHEMES_DENIED_INSITU_FSI = new Set([
    'reg33_5', 'reg33_7', 'reg33_7A', 'reg33_7B',
    'reg33_9', 'reg33_9A', 'reg33_9B',
    'reg33_10', 'reg33_10A', 'reg33_20A', 'reg33_21',
  ]);
  const inSituFsiEligible = !SCHEMES_DENIED_INSITU_FSI.has(schemeId);
  const inSituFsiBua = inSituFsiEligible
    ? (dpRoadDeduction + reservationDeduction) * fsiSlab.basic
    : 0;
  const inSituFsiDeniedReason = inSituFsiEligible
    ? null
    : `Reg 16 denies in-lieu FSI/TDR for road/reservation handover under ${schemeId.replace('reg', 'Reg ').replace('_', '(').replace(/(\w)$/, '$1)')} (anti-double-count with incentive BUA)`;

  // Parking requirements (informational, for Proforma II-E)
  const commercialFlats = input.buaInputMode === 'breakdown'
    ? input.flats.filter(f => f.use === 'commercial').reduce((s, f) => s + (parseFloat(f.carpet) || 0) * (parseInt(f.count) || 0), 0)
    : 0;
  const parking = computeParkingRequirement(input.flats || [], commercialFlats);

  // ROS deficiency (for OSD premium calculation)
  const rosProposed = parseFloat(input.rosProposed) || 0;
  const rosRequired = losRequirement.area;
  const rosDeficiency = Math.max(0, rosRequired - rosProposed);

  return {
    plotArea, dpRoadDeduction, reservationDeduction, grossExclRoad,
    reg14Auto, reg14Deduction, reg14Override, reg14ReservationOffset, reg14EffectiveArea,
    netPlot,
    losRequirement, losActualArea, losOverride,
    rosRequired, rosProposed, rosDeficiency,
    reg15Flag,
    existingBua, totalFlats, residentialFlats,
    fsiSlab, baseFsiBua, premiumFsiBua, tdrBua, ceilingBua,
    rawRoadWidth, roadWideningApplied, effectiveRoadWidth,
    inSituFsiBua, inSituFsiEligible, inSituFsiDeniedReason,
    parking,
  };
}

// ----------------------------------------------------------------------------
// Reg 30 STANDARD computer — for under-30 societies, no incentive
// Just the Reg 30 / Table 12 FSI on net plot. Three scenarios = Basic / Basic+Premium / Max.
// ----------------------------------------------------------------------------
function computeBuildable_Reg30(input) {
  const base = computeBaseInputs(input, 'reg30_standard');
  const { netPlot, baseFsiBua, premiumFsiBua, tdrBua, ceilingBua, existingBua } = base;

  // No incentive BUA under standard Reg 30
  const incentiveBua = 0;

  // Loadings
  const premiumLoad = clamp01(input.premiumFsiLoad ?? 1.0);
  const tdrLoadFactor = clamp01(input.tdrLoad ?? 1.0);
  const fungibleLoadFactor = clamp01(input.fungibleLoad ?? 1.0);

  // FSI BUA at user's selected loadings
  const fsiBua = baseFsiBua + (premiumFsiBua * premiumLoad) + (tdrBua * tdrLoadFactor);
  const fsiBuaMax = ceilingBua;

  // Fungible
  const FUNGIBLE_RATE = 0.35;
  const fungibleArea = fsiBua * FUNGIBLE_RATE * fungibleLoadFactor;
  const fungibleAreaMax = fsiBuaMax * FUNGIBLE_RATE;

  // Permissible
  const permissibleBua = fsiBua + fungibleArea;
  const permissibleBuaMax = fsiBuaMax + fungibleAreaMax;

  // Member rehab base = existing BUA (no incentive to allocate)
  const memberSideRehabBua = existingBua;
  const developerSideIncentive = 0;

  const saleBua = Math.max(0, permissibleBua - memberSideRehabBua);
  const saleBuaMax = Math.max(0, permissibleBuaMax - memberSideRehabBua);

  // Viability
  const viabilityRatio = memberSideRehabBua > 0 ? saleBua / memberSideRehabBua : 0;
  let viabilityRating, viabilityNote;
  if (viabilityRatio < 0.3) {
    viabilityRating = 'marginal';
    viabilityNote = 'No incentive scheme available. Without 33(7)(B) incentive BUA, redevelopment is challenging at these loadings.';
  } else if (viabilityRatio < 0.6) {
    viabilityRating = 'viable';
    viabilityNote = 'Standard Reg 30 FSI gives meaningful sale BUA at these settings. Wait until building turns 30 to access 33(7)(B) incentive — typically 15–25% upside.';
  } else {
    viabilityRating = 'attractive';
    viabilityNote = 'Reg 30 FSI alone is sufficient for redevelopment at these loadings.';
  }

  const memberIncentiveShare = parseFloat(input.memberIncentiveShare ?? 80) / 100;
  const flatBreakdown = input.buaInputMode === 'breakdown'
    ? input.flats.filter(f => parseInt(f.count) > 0).map(f => {
        const carpet = parseFloat(f.carpet) || 0;
        const count = parseInt(f.count) || 0;
        return {
          label: f.label || (f.use === 'residential' ? 'Residential' : 'Commercial'),
          count, existingCarpet: carpet,
          minGuaranteed: carpet,
          realisticLow: carpet,
          realisticHigh: carpet,
          use: f.use,
        };
      })
    : [];

  const asrRate = parseFloat(input.asrLandRate) || 0;
  const premiumPayable = premiumFsiBua * premiumLoad * asrRate * 0.5;
  const premiumSheet = computePremiumSheet({
    premiumFsiBua, premiumLoad, asrRate,
    fungibleSaleBua: fungibleArea,
    deficientROS: base.rosDeficiency,
    tdrBuaLoaded: tdrBua * tdrLoadFactor,
    totalBua: permissibleBua,
    plotArea: parseFloat(input.plotArea) || 0,
    basicFsi: base.fsiSlab ? base.fsiSlab.basic : 0,
    constructionRate: parseFloat(input.constructionRate) || 27500,
  });

  return {
    schemeId: 'reg30_standard',
    premiumSheet,
    fungibleSaleBua: fungibleArea,
    fungibleRehabBua: 0,
    schemeName: 'Reg 30 / Standard FSI',
    ...base,
    incentiveBua, incentive15Pct: 0, incentivePerTenement: 0, incentiveBasis: 'none',
    rehabBasePath: existingBua, reg30PathLoaded: fsiBua, reg30PathMax: fsiBuaMax,
    rehabPathGoverns: false,
    premiumLoad, tdrLoadFactor, fungibleLoadFactor,
    premiumFsiBuaLoaded: premiumFsiBua * premiumLoad,
    tdrBuaLoaded: tdrBua * tdrLoadFactor,
    fsiBua, fungibleArea, permissibleBua,
    fsiBuaMax, fungibleAreaMax, permissibleBuaMax,
    memberIncentiveShare, memberSideRehabBua, developerSideIncentive,
    saleBua, saleBuaMax,
    premiumPayable,
    viabilityRating, viabilityNote, viabilityRatio,
    flatBreakdown,
    effFsi: netPlot > 0 ? permissibleBua / netPlot : 0,
    effFsiMax: netPlot > 0 ? permissibleBuaMax / netPlot : 0,
  };
}

// ----------------------------------------------------------------------------
// Reg 33(9) CLUSTER computer
// Inputs: clusterPlotArea, clusterBuildings (count), clusterExistingBua, clusterApartments
// Math:
//   FSI ceiling      = 4.00 × cluster plot
//   Rehab base       = aggregate existing BUA across all participating buildings
//   Incentive        = 50% of rehab base (standard cluster incentive)
//   Scheme FSI BUA   = max(rehab + incentive, 4.00 × cluster plot)
//   Permissible BUA  = scheme BUA + 35% fungible
// Note: cluster requires aggregate inputs from all participating societies. Chairman
// likely won't have full data. We compute with what they give us and disclose limits.
// ----------------------------------------------------------------------------
function computeBuildable_33_9(input) {
  // Use cluster fields as inputs, falling back to single-society values if not provided
  const clusterPlot = parseFloat(input.clusterPlotArea) || 0;
  const clusterBuildings = parseInt(input.clusterBuildings) || 1;
  const clusterExistingBua = parseFloat(input.clusterExistingBua) || 0;
  const clusterApartments = parseInt(input.clusterApartments) || 0;

  const isIslandCity = input.location === 'islandCity';
  const minClusterArea = isIslandCity ? 4000 : 6000;
  const meetsMinimum = clusterPlot >= minClusterArea;

  // Rehab base = aggregate existing BUA (developer pre-builds rehab for all society members)
  const rehabBase = clusterExistingBua;

  // Cluster incentive — 50% of rehab base (standard incentive under 33(9) per the appendix)
  const incentiveBua = rehabBase * 0.50;

  // FSI ceiling at 4.00 of cluster gross plot
  const ceilingBua = clusterPlot * 4.00;

  // Scheme governing BUA — whichever is more
  const schemeFsiBua = Math.max(rehabBase + incentiveBua, ceilingBua);
  const ceilingGoverns = ceilingBua >= (rehabBase + incentiveBua);

  // Fungible 35% on residential
  const FUNGIBLE_RATE = 0.35;
  const fungibleArea = schemeFsiBua * FUNGIBLE_RATE;
  const permissibleBua = schemeFsiBua + fungibleArea;

  // Sale = total - rehab
  const saleBua = Math.max(0, permissibleBua - rehabBase);
  const viabilityRatio = rehabBase > 0 ? saleBua / rehabBase : 0;

  let viabilityRating, viabilityNote;
  if (!meetsMinimum) {
    viabilityRating = 'not eligible';
    viabilityNote = `Cluster plot ${fmt(clusterPlot)} sqm is below the ${minClusterArea} sqm minimum for ${isIslandCity ? 'Island City' : 'Suburbs'}. Add more participating societies or reconsider cluster scheme.`;
  } else if (viabilityRatio < 0.6) {
    viabilityRating = 'viable';
    viabilityNote = 'Cluster gives meaningful sale component. Coordination with neighbour societies is the binding constraint, not the math.';
  } else if (viabilityRatio < 1.2) {
    viabilityRating = 'attractive';
    viabilityNote = 'Cluster economics are strong. The 4.00 FSI ceiling materially exceeds standalone 33(7)(B). Consent across societies is the next hurdle.';
  } else {
    viabilityRating = 'highly attractive';
    viabilityNote = 'Cluster FSI ceiling significantly exceeds existing BUA. Multiple developers will be interested. Worth investing in neighbour-society coordination.';
  }

  const _asrRate = parseFloat(input.asrLandRate) || 0;
  const _premiumSheet = computePremiumSheet({
    premiumFsiBua: 0, premiumLoad: 0, asrRate: _asrRate,
    fungibleSaleBua: fungibleArea,
    deficientROS: 0,
    tdrBuaLoaded: 0,
    totalBua: permissibleBua,
    plotArea: clusterPlot,
    basicFsi: 4.0,
    constructionRate: parseFloat(input.constructionRate) || 27500,
  });

  return {
    schemeId: 'reg33_9',
    schemeName: 'Reg 33(9) Cluster Development',
    isCluster: true,
    premiumSheet: _premiumSheet,
    fungibleSaleBua: fungibleArea,
    fungibleRehabBua: 0,
    premiumFsiBua: 0, premiumLoad: 1, tdrBua: 0, tdrLoadFactor: 1,
    fsiSlab: { basic: 4.0 },
    rosDeficiency: 0,
    clusterPlot, clusterBuildings, clusterExistingBua: rehabBase, clusterApartments,
    minClusterArea, meetsMinimum,
    rehabBase, incentiveBua, ceilingBua, schemeFsiBua, ceilingGoverns,
    fungibleArea, permissibleBua, saleBua,
    viabilityRating, viabilityNote, viabilityRatio,
    effFsi: clusterPlot > 0 ? permissibleBua / clusterPlot : 0,
    // Echo input fields for the area statement
    plotArea: clusterPlot,
    netPlot: clusterPlot,
    grossExclRoad: clusterPlot,
    existingBua: rehabBase,
    totalFlats: clusterApartments,
    residentialFlats: clusterApartments,
    // Stub fields so other panels (AreaStatement, Members) render gracefully
    reg14Auto: { applies: false, area: 0, reason: 'N/A for cluster (deductions pre-aggregated at member-plot level)', baseAmenity: 0, reductionFactor: 1 },
    reg14Override: false,
    reg14Deduction: 0,
    reg14ReservationOffset: 0,
    reg14EffectiveArea: 0,
    losAuto: { applies: false, area: 0, percent: 0, band: 'N/A for cluster' },
    losRequirement: { applies: false, area: 0, percent: 0, band: 'N/A for cluster' },
    losActualArea: 0,
    losOverride: false,
    reg15Flag: { applies: false, handoverArea: 0 },
    fsiSlab: { basic: 4.0, premium: 0, tdr: 0 },
    baseFsiBua: ceilingBua,
    fsiBua: schemeFsiBua,
    fsiBuaMax: schemeFsiBua,
    fungibleAreaMax: fungibleArea,
    permissibleBuaMax: permissibleBua,
    saleBuaMax: saleBua,
    incentiveBasis: 'cluster',
    incentivePerTenement: 0,
    incentive15Pct: 0,
    rehabBasePath: rehabBase + incentiveBua,
    reg30PathLoaded: ceilingBua,
    rehabPathGoverns: !ceilingGoverns,
    memberSideRehabBua: rehabBase,
    developerSideIncentive: incentiveBua,
    rawRoadWidth: parseFloat(input.roadWidth) || 0,
    roadWideningApplied: false,
    effectiveRoadWidth: parseFloat(input.roadWidth) || 0,
    inSituFsiBua: 0,
    inSituFsiEligible: false,
    inSituFsiDeniedReason: '',
    parking: { cars: 0, twoWheeler: 0, visitor: 0, shopCars: 0, total: 0 },
    flatBreakdown: [],
    rosRequired: 0,
    rosProposed: 0,
    memberIncentiveShare: parseFloat(input.memberIncentiveShare) || 0,
    dpRoadDeduction: 0,
    reservationDeduction: 0,
    fungibleLoadFactor: 1,
    premiumFsiBuaLoaded: 0,
    tdrBua: 0,
    tdrBuaLoaded: 0,
  };
}

// ----------------------------------------------------------------------------
// Reg 33(7)(B) computer — the original society redev math
// (extracted unchanged from the previous monolithic computeBuildable)
// ----------------------------------------------------------------------------
function computeBuildable_33_7B(input) {
  const base = computeBaseInputs(input, 'reg33_7B');
  const { netPlot, baseFsiBua, premiumFsiBua, tdrBua, ceilingBua, existingBua, residentialFlats } = base;

  // Reg 33(7)(B) incentive BUA — free of premium, regulatory entitlement (always at full)
  const incentive15Pct = existingBua * 0.15;
  const incentivePerTenement = residentialFlats * 10;
  const incentiveBua = Math.max(incentive15Pct, incentivePerTenement);
  const incentiveBasis = incentive15Pct >= incentivePerTenement ? '15percent' : 'pertenement';

  // Loading factors — user controls how much of each flexible component to actually utilise
  const premiumLoad = clamp01(input.premiumFsiLoad ?? 1.0);
  const tdrLoadFactor = clamp01(input.tdrLoad ?? 1.0);
  const fungibleLoadFactor = clamp01(input.fungibleLoad ?? 1.0);

  // FSI BUA at user's selected loadings
  // Two paths converge into one governing FSI BUA:
  //   Path A: Existing + 33(7)(B) incentive (the rehab-base path)
  //   Path B: Reg 30 ceiling at chosen loadings = Base + (Premium × load) + (TDR × load)
  // 33(7)(B) clause 1 proviso: society may avail Path B if it exceeds Path A.
  const rehabBasePath = existingBua + incentiveBua;
  const reg30PathLoaded = baseFsiBua + (premiumFsiBua * premiumLoad) + (tdrBua * tdrLoadFactor);
  const fsiBua = Math.max(rehabBasePath, reg30PathLoaded);
  // Which path governed?
  const rehabPathGoverns = rehabBasePath >= reg30PathLoaded;

  // Maximum-possible reference (full loadings) — for the small "max possible" indicator
  const reg30PathMax = baseFsiBua + premiumFsiBua + tdrBua;
  const fsiBuaMax = Math.max(rehabBasePath, reg30PathMax);

  // Fungible Compensatory Area (Reg 31(3)) — split rehab (free) vs sale (on premium)
  // Rehab fungible: on memberSideRehabBua portion — free of premium
  // Sale fungible: on saleBua portion — on premium (60% ASR)
  // Cap: 35% residential, 20% commercial
  const FUNGIBLE_RATE = 0.35;
  const fungibleArea = fsiBua * FUNGIBLE_RATE * fungibleLoadFactor;
  const fungibleAreaMax = fsiBuaMax * FUNGIBLE_RATE;

  // Permissible BUA (live, at user's settings) and its maximum reference
  const permissibleBua = fsiBua + fungibleArea;
  const permissibleBuaMax = fsiBuaMax + fungibleAreaMax;

  // Member entitlement allocation (slider already exists)
  const memberIncentiveShare = parseFloat(input.memberIncentiveShare ?? 80) / 100;
  const memberSideRehabBua = existingBua + incentiveBua * memberIncentiveShare;
  const developerSideIncentive = incentiveBua * (1 - memberIncentiveShare);

  const saleBua = Math.max(0, permissibleBua - memberSideRehabBua);
  const saleBuaMax = Math.max(0, permissibleBuaMax - memberSideRehabBua);

  // Fungible split: rehab portion (free) vs sale portion (premium payable)
  const rehabShare = permissibleBua > 0 ? memberSideRehabBua / permissibleBua : 0;
  const fungibleRehabBua = fungibleArea * rehabShare;
  const fungibleSaleBua  = fungibleArea * (1 - rehabShare);

  // Premium Recovery Sheet (per Proforma-A, MCGM circulars FY 2023-24)
  const asrRate = parseFloat(input.asrLandRate) || 0;
  const tdrBuaLoaded = base.tdrBua * tdrLoadFactor;
  const premiumSheet = computePremiumSheet({
    premiumFsiBua, premiumLoad, asrRate,
    fungibleSaleBua,
    deficientROS: base.rosDeficiency,
    tdrBuaLoaded,
    totalBua: permissibleBua,
    plotArea: parseFloat(input.plotArea) || 0,
    basicFsi: base.fsiSlab ? base.fsiSlab.basic : 0,
    constructionRate: parseFloat(input.constructionRate) || 27500,
  });
  const premiumPayable = premiumSheet.premiumFsiPayable; // legacy field (backward compat)

  // Viability — based on the live (user-selected) numbers
  const viabilityRatio = memberSideRehabBua > 0 ? saleBua / memberSideRehabBua : 0;
  let viabilityRating, viabilityNote;
  if (viabilityRatio < 0.3) {
    viabilityRating = 'marginal';
    viabilityNote = 'At your selected loadings the sale component is small relative to rehab. Most developers will hesitate. Try increasing TDR or Premium FSI loading; if at full and still marginal, consider 33(9) cluster.';
  } else if (viabilityRatio < 0.6) {
    viabilityRating = 'viable';
    viabilityNote = 'Sale component is meaningful at these settings. Established developers will consider this; expect cautious offers.';
  } else if (viabilityRatio < 1.0) {
    viabilityRating = 'attractive';
    viabilityNote = 'Healthy sale-to-rehab ratio. Multiple developers should bid; you have good negotiating position.';
  } else {
    viabilityRating = 'highly attractive';
    viabilityNote = 'Sale exceeds rehab. Strong negotiating position — expect competitive bids and good corpus offers.';
  }

  // Member-flat entitlement breakdown — driven by actual loaded BUA, not a conventional bump
  // Each member's realistic bump = (incentive × member share) distributed proportional to existing carpet
  const totalExistingCarpet = (input.flats || []).reduce(
    (s, f) => s + (parseFloat(f.carpet) || 0) * (parseInt(f.count) || 0), 0
  );
  const incentiveCarpetToMembers = (incentiveBua * memberIncentiveShare) / 1.2; // BUA → carpet
  const bumpFactor = totalExistingCarpet > 0 ? incentiveCarpetToMembers / totalExistingCarpet : 0;

  const flatBreakdown = input.buaInputMode === 'breakdown'
    ? input.flats.filter(f => parseInt(f.count) > 0).map(f => {
        const carpet = parseFloat(f.carpet) || 0;
        const count = parseInt(f.count) || 0;
        const realisticCarpet = carpet * (1 + bumpFactor);
        return {
          label: f.label || (f.use === 'residential' ? 'Residential' : 'Commercial'),
          count, existingCarpet: carpet,
          minGuaranteed: carpet,
          realisticLow: realisticCarpet,    // single value now (was a range)
          realisticHigh: realisticCarpet,
          use: f.use,
        };
      })
    : [];

  return {
    schemeId: 'reg33_7B',
    schemeName: 'Reg 33(7)(B) Society Redevelopment',
    ...base,
    // Incentive (regulatory)
    incentiveBua, incentiveBasis, incentive15Pct, incentivePerTenement,
    // FSI build-up — both governing path and the components
    rehabBasePath, reg30PathLoaded, reg30PathMax,
    rehabPathGoverns,
    // Effective load values (echo for UI)
    premiumLoad, tdrLoadFactor, fungibleLoadFactor,
    // Loaded BUA at user-selected slider settings (for inline row display)
    premiumFsiBuaLoaded: premiumFsiBua * premiumLoad,
    tdrBuaLoaded: base.tdrBua * tdrLoadFactor,
    // The live numbers
    fsiBua, fungibleArea, permissibleBua,
    // Maximum-possible references
    fsiBuaMax, fungibleAreaMax, permissibleBuaMax,
    // Allocation
    memberIncentiveShare, memberSideRehabBua, developerSideIncentive,
    saleBua, saleBuaMax,
    // Premium
    premiumPayable,
    // Viability
    viabilityRating, viabilityNote, viabilityRatio,
    // Flat breakdown
    flatBreakdown,
    // Effective FSI
    effFsi: netPlot > 0 ? permissibleBua / netPlot : 0,
    effFsiMax: netPlot > 0 ? permissibleBuaMax / netPlot : 0,
    // Fungible split (Proforma line 16)
    fungibleRehabBua, fungibleSaleBua,
    // Premium recovery sheet (Proforma premium sheet)
    premiumSheet,
    // In-situ FSI for road/reservation handover (Proforma line 8)
    // Note: For 33(7)(B), Reg 16 denies this in-lieu FSI — value will be 0 and
    // inSituFsiDeniedReason will explain why. Area statement uses these flags.
    inSituFsiBua: base.inSituFsiBua,
    inSituFsiEligible: base.inSituFsiEligible,
    inSituFsiDeniedReason: base.inSituFsiDeniedReason,
    // Parking (Proforma II-E)
    parking: base.parking,
    rosRequired: base.rosRequired,
    rosProposed: base.rosProposed,
    rosDeficiency: base.rosDeficiency,
  };
}

// ----------------------------------------------------------------------------
// DISPATCHER — picks the right computer based on selected scheme
// ----------------------------------------------------------------------------
function computeBuildable(input) {
  const schemeId = input.selectedScheme || 'reg33_7B';
  if (schemeId === 'reg33_9') return computeBuildable_33_9(input);
  if (schemeId === 'reg30_standard') return computeBuildable_Reg30(input);
  return computeBuildable_33_7B(input); // default
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================
const fmt = (n, dp = 0) => {
  if (n === undefined || n === null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: dp, minimumFractionDigits: dp });
};
const fmtSqft = (sqm, dp = 0) => fmt(sqm * SQM_TO_SQFT, dp);
const fmtCurrency = (n) => {
  const num = Number(n);
  if (Number.isNaN(num) || num === 0) return '—';
  if (num >= 10000000) return `₹ ${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹ ${(num / 100000).toFixed(2)} L`;
  return `₹ ${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

// ============================================================================
// VERIFICATION MODE — internal tooling for tracing calculator output
// against real approved 33(7)(B) area statements. Activated via ?verify=1.
// Chairman-facing UI is unaffected when off.
// ============================================================================
const VERIFY_STORAGE_KEY = 'redev-verify-v1';

function isVerifyMode() {
  if (typeof window === 'undefined') return false;
  try { return new URLSearchParams(window.location.search).get('verify') === '1'; }
  catch { return false; }
}

function loadVerifyStore() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(VERIFY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveVerifyStore(store) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(VERIFY_STORAGE_KEY, JSON.stringify(store)); }
  catch { /* quota / private mode */ }
}

// Δ% between calculator and expected. Returns null if either is missing/non-numeric.
function verifyDelta(calc, expected) {
  const c = Number(calc), e = Number(expected);
  if (!Number.isFinite(c) || !Number.isFinite(e) || e === 0) return null;
  return ((c - e) / e) * 100;
}

const WORKSPACE_PAGES = [
  { id: 'overview', label: 'Overview', title: 'Site discovery & entitlement snapshot', description: 'A concise workspace for plot context, scheme selection and eligibility clarity.' },
  { id: 'intelligence', label: 'Spatial Intelligence', title: 'Parcel and location intelligence', description: 'Translate plot, ward and zoning context into clear site metrics and spatial insight.' },
  { id: 'regulations', label: 'Regulatory Intelligence', title: 'Applicable regulations and entitlement clarity', description: 'Show what the system understands: entitlement, constraints and scheme implications.' },
  { id: 'buildability', label: 'Buildability', title: 'Buildable envelope and spatial feasibility', description: 'Turn entitlement into buildability insight with an emphasis on what fits and why.' },
  { id: 'feasibility', label: 'Feasibility', title: 'Cost, parking and offer analysis', description: 'Translate regulatory outcomes into financial and parking feasibility for advisory review.' },
  { id: 'ai', label: 'AI Insights', title: 'Strategic recommendations', description: 'Generate high-level opportunity, constraint and next-step guidance from the assessment.' },
  { id: 'reports', label: 'Reports', title: 'Institutional reporting', description: 'Produce a review-ready advisory snapshot designed for committees, architects and lenders.' },
];

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function App() {
  const [input, setInput] = useState({
    societyName: '',
    address: '',
    location: 'suburbsExtended',
    zone: 'residential',
    buildingAge: 38,
    buildingType: 'society',
    authorisationStatus: 'oc',
    membersOnSamePlot: true,
    gbResolution: false,
    mixedTenancy: false,
    plotArea: 1500,
    dpRoadDeduction: 0,
    reservationDeduction: 0,
    roadWidth: 12,
    // Reg 14 amenity (auto with manual override)
    reg14Override: false,
    reg14ManualValue: 0,
    isAmalgamated: false,
    smallestOriginalPlot: 0,
    roadWideningProposed: false,
    specialLocation: 'none',
    // Reg 27 LOS (auto with manual override)
    losOverride: false,
    losManualValue: 0,
    rosProposed: 0,
    // BUA / flats
    buaInputMode: 'breakdown',
    totalExistingBua: '',
    tenementCount: '',
    flats: [
      { label: '1BHK', carpet: 32, count: 12, use: 'residential' },
      { label: '2BHK', carpet: 56, count: 10, use: 'residential' },
      { label: '3BHK', carpet: 88, count: 2,  use: 'residential' },
    ],
    asrLandRate: 200000,
    constructionRate: 27500,
    devOfferRehab: 0,        // sqft carpet — what developer offers society members
    devOfferSale: 0,         // sqft carpet — what developer keeps as sale
    devOfferFileName: '',    // filename of uploaded offer doc (archival only)
    memberIncentiveShare: 80,
    // FSI loading sliders — fraction of permissible (0..1, default 1 = full)
    premiumFsiLoad: 1.0,
    tdrLoad: 1.0,
    fungibleLoad: 1.0,
    // Scheme selection
    selectedScheme: null,    // null = use auto-detected primary
    // Cluster (33(9)) inputs (only used when cluster opted-in)
    clusterOptIn: false,
    clusterPlotArea: 0,
    clusterBuildings: 1,
    clusterExistingBua: 0,
    clusterApartments: 0,
    // Slum (33(10)) flag
    slumOnPlot: false,
    // Report scope controls which optional fields are shown
    reportScope: 'entitlement',
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [wardDetect, setWardDetect] = useState({ status: 'idle', ward: null, error: null });
  const [workspacePage, setWorkspacePage] = useState('overview');
  const [page, setPage] = useState('landing');

  const update = (k, v) => setInput(prev => ({ ...prev, [k]: v }));
  const updateFlat = (idx, k, v) =>
    setInput(prev => ({ ...prev, flats: prev.flats.map((f, i) => i === idx ? { ...f, [k]: v } : f) }));
  const addFlat = () =>
    setInput(prev => ({ ...prev, flats: [...prev.flats, { label: 'New', carpet: 50, count: 1, use: 'residential' }] }));
  const removeFlat = (idx) =>
    setInput(prev => ({ ...prev, flats: prev.flats.filter((_, i) => i !== idx) }));

  const eligibility = useMemo(() => analyseEligibility(input), [input]);
  const schemes = useMemo(() => detectApplicableSchemes(input), [input]);
  const primarySchemeId = useMemo(() => pickPrimaryScheme(schemes, input), [schemes, input]);
  const activeSchemeId = input.selectedScheme || primarySchemeId;
  const showCostReport = input.reportScope !== 'entitlement';

  useEffect(() => {
    if (activeTab === 'costs' && !showCostReport) {
      setActiveTab('overview');
    }
  }, [activeTab, showCostReport]);

  // Compute the active scheme + the auto-detected primary (for comparison)
  const result = useMemo(() => computeBuildable({ ...input, selectedScheme: activeSchemeId }), [input, activeSchemeId]);
  const result_33_7B = useMemo(() => {
    const s = schemes.find(x => x.id === 'reg33_7B');
    return s?.eligible ? computeBuildable({ ...input, selectedScheme: 'reg33_7B' }) : null;
  }, [input, schemes]);
  const result_33_9 = useMemo(() => {
    const s = schemes.find(x => x.id === 'reg33_9');
    return s?.eligible ? computeBuildable({ ...input, selectedScheme: 'reg33_9' }) : null;
  }, [input, schemes]);

  const currentWorkspace = WORKSPACE_PAGES.find(p => p.id === workspacePage) || WORKSPACE_PAGES[0];

  const renderWorkspaceContent = () => {
    switch (workspacePage) {
      case 'intelligence':
        return (
          <SiteIntelligencePage input={input} wardDetect={wardDetect} result={result} />
        );
      case 'regulations':
        return (
          <>
            <SchemePicker
              schemes={schemes}
              activeSchemeId={activeSchemeId}
              primarySchemeId={primarySchemeId}
              onSelect={(id) => update('selectedScheme', id)}
              input={input}
              update={update}
            />
            <SpecialLocationWarning specialLocation={input.specialLocation} />
            {eligibility.issues.length > 0 && <EligibilityPanel eligibility={eligibility} input={input} />}
            {input.slumOnPlot && <SlumFlag />}
            <AreaStatement result={result} input={input} update={update} schemeId={activeSchemeId} />
          </>
        );
      case 'buildability':
        return (
          <>
            <InteractiveResult result={result} input={input} update={update} schemeId={activeSchemeId} />
            {result_33_7B && result_33_9 && <SchemeComparison r1={result_33_7B} r2={result_33_9} />}
            <WatchOutFor result={result} />
          </>
        );
      case 'feasibility':
        return (
          <>
            <CompareOffer result={result} input={input} update={update} />
            <PremiumRecoveryPanel result={result} input={input} />
            <ParkingPanel result={result} input={input} />
            {result.flatBreakdown && result.flatBreakdown.length > 0 ? (
              <MemberEntitlement breakdown={result.flatBreakdown} input={input} update={update} />
            ) : (
              <div style={{ padding: 28, border: '1px solid var(--border)', borderRadius: 10, background: '#fffefb', color: 'var(--ink-soft)' }}>
                Switch to "By flat type" input mode to review member entitlement detail.
              </div>
            )}
          </>
        );
      case 'ai':
        return (
          <>
            <NextSteps />
            <Explainers />
          </>
        );
      case 'reports':
        return (
          <>
            <div style={{ marginBottom: 24, padding: 24, background: '#fffefb', border: '1px solid var(--border)', borderRadius: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--rust)', marginBottom: 10 }}>Report workspace</div>
              <div style={{ color: 'var(--ink-soft)', lineHeight: 1.7 }}>
                This module is the final review artifact environment. Use it to print or save an institutional-grade advisory summary for committee review, architect validation and lender pre-check.
              </div>
            </div>
            <PrintBar />
          </>
        );
      default:
        return (
          <>
            <SchemePicker
              schemes={schemes}
              activeSchemeId={activeSchemeId}
              primarySchemeId={primarySchemeId}
              onSelect={(id) => update('selectedScheme', id)}
              input={input}
              update={update}
            />
            <SpecialLocationWarning specialLocation={input.specialLocation} />
            {eligibility.issues.length > 0 && <EligibilityPanel eligibility={eligibility} input={input} />}
            {input.slumOnPlot && <SlumFlag />}
            {activeSchemeId === 'reg33_9'
              ? <ClusterResult result={result} input={input} />
              : <>
                  <InteractiveResult result={result} input={input} update={update} schemeId={activeSchemeId} />
                  {result_33_7B && result_33_9 && <SchemeComparison r1={result_33_7B} r2={result_33_9} />}
                  <WatchOutFor result={result} />
                </>
            }
          </>
        );
    }
  };

  if (page === 'landing') {
    return (
      <div className="redev-app">
        <Styles />
        <Header />
        <LandingPage onStart={() => setPage('tool')} />
      </div>
    );
  }

  return (
    <div className="redev-app">
      <Styles />
      <Header />
      <WorkspaceContextBar currentWorkspace={currentWorkspace} />

      <div className="container">
        <div className="workspace-grid">
          <aside className="left-rail no-print">
            <WorkspaceNav
              pages={WORKSPACE_PAGES}
              activePage={workspacePage}
              onSelect={setWorkspacePage}
            />
            <InputPanel
              input={input}
              update={update}
              updateFlat={updateFlat}
              addFlat={addFlat}
              removeFlat={removeFlat}
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced}
              wardDetect={wardDetect}
              setWardDetect={setWardDetect}
            />
          </aside>

          <main className="workspace-main">
            <WorkspacePageHeader currentWorkspace={currentWorkspace} />
            {renderWorkspaceContent()}
            {workspacePage !== 'reports' && <PrintBar />}
          </main>
        </div>

        <Footer />
      </div>
    </div>
  );
}

// ============================================================================
// STYLES (scoped to .redev-app)
// ============================================================================
const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    :root {
      --paper: #F5F2EA;
      --paper-warm: #ECE6DA;
      --border: #D6CFC4;
      --ink: #22272D;
      --ink-soft: #5E6671;
      --ink-faint: #8F98A3;
      --rust: #A17A43;
      --rust-deep: #7F5F37;
      --signal-bg: #F5EFE6;
      --success: #3E6650;
      --display: "Source Serif 4", Georgia, serif;
      --sans: "Source Sans 3", -apple-system, sans-serif;
      --mono: "JetBrains Mono", monospace;
      --radius: 4px;
    }

    .redev-app, .redev-app * { box-sizing: border-box; }
    .redev-app {
      min-height: 100vh;
      background: var(--paper);
      color: var(--ink);
      font-family: var(--sans);
      line-height: 1.55;
    }

    .redev-app .serif { font-family: var(--display); font-feature-settings: "liga","kern"; }
    .redev-app .num { font-family: var(--mono); font-feature-settings: "tnum"; }

    .redev-app input[type="text"],
    .redev-app input[type="number"],
    .redev-app select,
    .redev-app textarea {
      width: 100%;
      background: #fffefb;
      border: 1px solid #d4c9b8;
      color: #1a1815;
      padding: 9px 12px;
      font-family: inherit;
      font-size: 14px;
      border-radius: 3px;
      outline: none;
      transition: border-color .12s;
    }
    .redev-app input:focus, .redev-app select:focus, .redev-app textarea:focus {
      border-color: #8b3a2a;
      box-shadow: 0 0 0 3px rgba(139, 58, 42, 0.1);
    }
    .redev-app input.num { font-family: "JetBrains Mono", monospace; }

    .redev-app select {
      cursor: pointer; appearance: none;
      background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%238b3a2a' stroke-width='1.5'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 32px;
    }

    .redev-app .field-label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--ink-soft);
      margin-bottom: 8px;
    }
    .redev-app .help-text {
      font-size: 12px;
      color: var(--ink-soft);
      margin-top: 6px;
      line-height: 1.65;
      font-style: normal;
    }
    .redev-app .radio-card {
      padding: 14px 16px;
      border: 1px solid #d4c9b8;
      border-radius: 12px;
      cursor: pointer;
      background: #fff;
      transition: border-color .16s, box-shadow .16s, background .16s;
      font-size: 13px;
    }
    .redev-app .radio-card:hover { border-color: #8b3a2a; box-shadow: 0 12px 32px rgba(26,24,21,0.05); }
    .redev-app .radio-card.active { border-color: #8b3a2a; background: rgba(139, 58, 42, 0.06); }

    .redev-app .container {
      max-width: 1180px;
      margin: 0 auto;
      padding: 32px 24px 48px;
    }

    .redev-app .workspace-grid {
      display: grid;
      grid-template-columns: minmax(320px, 400px) 1fr;
      gap: 36px;
      align-items: start;
    }
    .redev-app .left-rail {
      position: sticky;
      top: 24px;
      align-self: start;
      display: grid;
      gap: 24px;
    }
    .redev-app .workspace-main {
      display: grid;
      gap: 24px;
    }

    .redev-app .layout-2col {
      display: grid;
      grid-template-columns: minmax(320px, 420px) 1fr;
      gap: 36px;
      align-items: start;
    }
    .redev-app .input-panel {
      position: sticky;
      top: 24px;
      max-height: calc(100vh - 48px);
      overflow-y: auto;
      overflow-x: hidden;
      background: #fffefb;
      border: 1px solid #e7dfd0;
      border-radius: 18px;
      padding: 28px;
      box-shadow: 0 20px 48px rgba(26,24,21,0.06);
    }
    .redev-app .input-panel::-webkit-scrollbar { width: 8px; }
    .redev-app .input-panel::-webkit-scrollbar-track { background: transparent; }
    .redev-app .input-panel::-webkit-scrollbar-thumb {
      background: #d4c9b8;
      border-radius: 4px;
    }
    .redev-app .input-panel::-webkit-scrollbar-thumb:hover { background: #b8a88a; }

    .redev-app .scenario-card {
      padding: 24px;
      border-radius: 8px;
      background: #fffefb;
      border: 1px solid #e7dfd0;
      box-shadow: 0 1px 6px rgba(26,24,21,0.05);
    }

    /* Tab bar */
    .redev-app .tab-bar {
      display: flex; gap: 2px; margin-bottom: 28px;
      border-bottom: 1.5px solid #e7dfd0;
    }
    .redev-app .tab-btn {
      padding: 10px 16px; font-size: 11px; font-weight: 600;
      letter-spacing: 0.07em; text-transform: uppercase;
      border: none; background: none; cursor: pointer;
      color: #a89c87; border-bottom: 2px solid transparent;
      margin-bottom: -1.5px; transition: color .15s, border-color .15s;
      font-family: inherit;
    }
    .redev-app .tab-btn:hover { color: #8b3a2a; }
    .redev-app .tab-btn.active { color: #8b3a2a; border-bottom-color: #8b3a2a; }

    /* Stat cards */
    .redev-app .stat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 20px; }
    .redev-app .stat-card {
      padding: 18px 20px; background: #fffefb;
      border: 1px solid #e7dfd0; border-radius: 8px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    .redev-app .stat-card-accent { border-top: 3px solid #8b3a2a; }

    /* BUA split bar */
    .redev-app .bua-split-bar { height: 10px; border-radius: 6px; overflow: hidden; display: flex; background: #f0e9dd; }
    .redev-app .bua-split-rehab { background: #8b3a2a; transition: width .5s ease; }
    .redev-app .bua-split-sale  { background: #3d5a4d; transition: width .5s ease; }

    /* Phase stepper */
    .redev-app .phase-stepper { display: flex; align-items: center; margin-bottom: 20px; overflow-x: auto; }
    .redev-app .phase-dot { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; font-weight: 700; color: #fffefb; flex-shrink: 0; }
    .redev-app .phase-line { flex: 1; height: 2px; background: #e7dfd0; min-width: 20px; flex-shrink: 0; }

    /* Doc pill */
    .redev-app .doc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .redev-app .doc-pill {
      padding: 8px 10px; background: #fafaf5;
      border-radius: 4px; font-size: 11px; line-height: 1.45;
      border-left: 2px solid #d4c9b8;
    }

    /* Card hover & radio transitions */
    .redev-app .radio-card { transition: border-color .12s, box-shadow .12s; }
    .redev-app .radio-card:hover { box-shadow: 0 2px 8px rgba(139,58,42,0.10); }
    .redev-app tbody tr:hover td { background: rgba(139,58,42,0.015); }

    /* Details arrow rotation */
    .redev-app details summary { cursor: pointer; list-style: none; }
    .redev-app details summary::-webkit-details-marker { display: none; }
    .redev-app details summary .chevron { transition: transform .2s ease; }
    .redev-app details[open] summary .chevron { transform: rotate(180deg); }

    @keyframes redev-slide { from { opacity:0; transform: translateY(-6px); } to { opacity:1; transform: translateY(0); } }
    .redev-app details[open] > div { animation: redev-slide .18s ease-out; }

    @media print {
      .redev-app { background: white; }
      .redev-app .no-print { display: none !important; }
      .redev-app .scenario-card { break-inside: avoid; border: 1px solid #999; box-shadow: none; }
      .redev-app .input-panel { display: none; }
      .redev-app .layout-2col { display: block; }
      .redev-app .tab-bar { display: none; }
    }
    @media (max-width: 980px) {
      .redev-app .layout-2col { grid-template-columns: 1fr !important; }
      .redev-app .grid-3col { grid-template-columns: 1fr !important; }
      .redev-app .grid-2 { grid-template-columns: 1fr !important; }
      .redev-app .stat-grid { grid-template-columns: 1fr 1fr !important; }
      .redev-app .doc-grid { grid-template-columns: 1fr !important; }
      .redev-app .input-panel { position: static; }
    }
    @media (max-width: 600px) {
      .redev-app .stat-grid { grid-template-columns: 1fr !important; }
      .redev-app .tab-btn { padding: 8px 10px; font-size: 10px; }
    }
  `}</style>
);

// ============================================================================
// HEADER / INTRO / FOOTER / SHARED
// ============================================================================
const Header = () => (
  <header style={{ borderBottom: '1px solid var(--border)', background: 'transparent', padding: '24px 0' }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ width: 40, height: 40, background: 'var(--rust)', borderRadius: 6, display: 'grid', placeItems: 'center', color: '#fff', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.03em' }}>P</div>
        <div>
          <div className="serif" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>
            PlotIQ
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 2 }}>
            Regulatory intelligence infrastructure
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="num" style={{ fontSize: 11, color: 'var(--ink-soft)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          DCPR 2034 · Reg 33(7)(B)
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>
          Institutional assessment for committees and architects
        </div>
      </div>
    </div>
  </header>
);

const Intro = () => (
  <div style={{ marginBottom: 40, maxWidth: 760 }}>
    <h1 className="serif" style={{ fontSize: 44, fontWeight: 600, lineHeight: 1.08, margin: 0, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
      A calm assessment instrument for redevelopment intelligence.
    </h1>
    <p style={{ fontSize: 17, lineHeight: 1.75, color: 'var(--ink-soft)', marginTop: 20 }}>
      PlotIQ stages redevelopment intelligence in three purposeful layers: site understanding, entitlement assessment, and optional advisory detail. It is designed to feel like an interpretive report, not a software utility.
    </p>
    <div style={{ display: 'grid', gap: 12, marginTop: 28 }}>
      {[
        'Establish plot location, ward and land-use context first.',
        'Review entitlement, scheme eligibility and regulatory certainty next.',
        'Add premium, construction and parking detail only when you need a full advisory artifact.',
      ].map((item, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--rust)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {idx + 1}
          </div>
          <div style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.7 }}>{item}</div>
        </div>
      ))}
    </div>

    <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--ink-faint)', marginTop: 24, padding: '16px 18px', background: 'var(--signal-bg)', borderLeft: '3px solid var(--rust)', borderRadius: 6 }}>
      <strong style={{ color: 'var(--ink)' }}>Report note.</strong> This is a structured advisory observation for committee and architect review. It is not a sanctioned MCGM approval document.
    </div>
  </div>
);

const LandingPage = ({ onStart }) => (
  <main style={{ minHeight: 'calc(100vh - 120px)', padding: '72px 24px 40px', background: 'var(--paper)', color: 'var(--ink)' }}>
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <section style={{ display: 'grid', gap: 28, textAlign: 'center', padding: '18px 0 28px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '10px 18px', background: 'rgba(255,255,255,0.9)', borderRadius: 999, border: '1px solid var(--border)', margin: '0 auto', maxWidth: 500 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
            Regulatory intelligence infrastructure
          </span>
        </div>

        <div style={{ padding: '42px 28px 28px', background: 'rgba(255,255,255,0.95)', borderRadius: 18, border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.06)' }}>
          <div className="serif" style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.04em', color: 'var(--ink)' }}>
            Plot<span style={{ color: 'var(--rust)' }}>IQ</span>
          </div>
          <p style={{ margin: '24px auto 0', maxWidth: 760, fontSize: 20, lineHeight: 1.75, color: 'var(--ink-soft)' }}>
            PlotIQ is a regulatory intelligence environment. It is built to structure redevelopment decision-making through layered assessment, not to surface every internal calculation.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
            <button onClick={onStart}
                    style={{ padding: '18px 34px', fontSize: 16, fontWeight: 700, background: 'var(--rust)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', minWidth: 260, boxShadow: '0 18px 40px rgba(161,122,67,0.18)' }}>
              Open the intelligence workspace
            </button>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 24, display: 'grid', gap: 14, justifyItems: 'center' }}>
        {[
          'Capture plot, ward and site context clearly.',
          'Review entitlement, scheme eligibility and regulatory certainty.',
          'Use costs only when you need a review-ready advisory artifact.',
        ].map((label, index) => (
          <div key={index} style={{ maxWidth: 560, padding: '18px 22px', background: '#fff', borderRadius: 14, border: '1px solid var(--border)', color: 'var(--ink-soft)', fontSize: 15, lineHeight: 1.75, textAlign: 'left' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--rust)', fontWeight: 700, marginBottom: 10 }}>Step {index + 1}</div>
            <div>{label}</div>
          </div>
        ))}
      </section>

      <section style={{ marginTop: 42, padding: 28, borderRadius: 14, background: '#fff', border: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--rust)', fontWeight: 700, marginBottom: 14 }}>Proof of authority</div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: 'var(--ink-soft)' }}>
              This platform is the analytical engine behind a formal feasibility assessment. It uses the same clause-led logic and traceability set expected by architects, developers and society committees.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--rust)', fontWeight: 700, marginBottom: 14 }}>Why this matters</div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: 'var(--ink-soft)' }}>
              Redevelopment is a regulatory process. The UI should support calm, procedural decisions and surface assumptions clearly, not push flashy product language.
            </p>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 42, padding: 24, borderRadius: 14, background: 'var(--signal-bg)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', fontWeight: 700, marginBottom: 10 }}>Positioning note</div>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: 'var(--ink-soft)' }}>
          PlotIQ is a regulatory intelligence layer for redevelopment. It is not a lead-generation interface or a flashy app. It is a report-like tool for committees, architects and regulatory review.
        </p>
      </section>
    </div>
  </main>
);

const WorkspaceContextBar = ({ currentWorkspace }) => (
  <div style={{ borderBottom: '1px solid var(--border)', background: '#fffefb', padding: '16px 0' }}>
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 32px', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <div>
        <div className="serif" style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: 'var(--ink)' }}>{currentWorkspace.label}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6 }}>{currentWorkspace.title}</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        Modular intelligence workspace
      </div>
    </div>
  </div>
);

const WorkspaceNav = ({ pages, activePage, onSelect }) => (
  <div style={{ marginBottom: 24, padding: 20, background: '#fffefb', border: '1px solid var(--border)', borderRadius: 14 }}>
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 16 }}>Workspace modules</div>
    <div style={{ display: 'grid', gap: 8 }}>
      {pages.map(page => (
        <button key={page.id}
          type="button"
          onClick={() => onSelect(page.id)}
          style={{
            width: '100%',
            textAlign: 'left',
            padding: '12px 14px',
            borderRadius: 10,
            border: activePage === page.id ? '1px solid var(--rust)' : '1px solid #d4c9b8',
            background: activePage === page.id ? 'rgba(161,122,67,0.12)' : '#fffefb',
            color: activePage === page.id ? 'var(--ink)' : 'var(--ink-soft)',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}>
          {page.label}
        </button>
      ))}
    </div>
  </div>
);

const WorkspacePageHeader = ({ currentWorkspace }) => (
  <div style={{ marginBottom: 24, padding: 22, background: '#fffefb', border: '1px solid var(--border)', borderRadius: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
      <div>
        <div className="serif" style={{ fontSize: 28, fontWeight: 600, marginBottom: 8, color: 'var(--ink)' }}>{currentWorkspace.label}</div>
        <div style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.75 }}>{currentWorkspace.description}</div>
      </div>
      <div style={{ minWidth: 220, padding: '14px 18px', background: '#f5f1ea', borderRadius: 12, border: '1px solid #e7dfd0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--rust)', textTransform: 'uppercase', letterSpacing: '0.11em', marginBottom: 8 }}>Workspace guidance</div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.65 }}>
          Each module should answer: what is this, why it matters, and what to do next.
        </div>
      </div>
    </div>
  </div>
);

const SiteIntelligencePage = ({ input, wardDetect, result }) => (
  <> 
    <div style={{ display: 'grid', gap: 18, marginBottom: 18, gridTemplateColumns: '1fr 1fr' }}>
      <div style={{ padding: 22, background: '#fffefb', border: '1px solid var(--border)', borderRadius: 14 }}>
        <div style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 700, color: 'var(--rust)', marginBottom: 12 }}>Site metrics</div>
        <div style={{ display: 'grid', gap: 14 }}>
          <StatLine label="Plot area" value={`${input.plotArea || 0} sqm`} />
          <StatLine label="DP road width" value={`${input.roadWidth || 0} m`} />
          <StatLine label="Zone / land use" value={input.zone} />
          <StatLine label="Building age" value={`${input.buildingAge || 0} yrs`} />
          <StatLine label="Primary entitlement" value={result.fsiSlab ? `${result.fsiSlab.basic.toFixed(2)} FSI` : 'n/a'} />
        </div>
      </div>
      <div style={{ padding: 22, background: '#fffefb', border: '1px solid var(--border)', borderRadius: 14 }}>
        <div style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 700, color: 'var(--rust)', marginBottom: 12 }}>Location detection</div>
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 13, color: 'var(--ink)' }}>{wardDetect.ward ? `Ward ${wardDetect.ward}` : 'Not detected yet'}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
            {wardDetect.status === 'found' && wardDetect.info ? wardDetect.info.localities : wardDetect.status === 'loading' ? 'Detecting your plot…' : wardDetect.status === 'error' ? wardDetect.error : 'Paste a Google Maps link in the input panel to identify your ward and site context.'}
          </div>
          <div style={{ padding: '12px 14px', background: 'rgba(232,220,192,0.24)', borderRadius: 10, color: 'var(--ink-soft)', fontSize: 12 }}>
            Site intelligence is the first module in a modular workflow. Start with location and plot context, then move to entitlement and feasibility.
          </div>
        </div>
      </div>
    </div>
    <div style={{ padding: 22, background: '#fffefb', border: '1px solid var(--border)', borderRadius: 14 }}>
      <div style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 700, color: 'var(--rust)', marginBottom: 12 }}>Spatial view</div>
      <div style={{ minHeight: 220, display: 'grid', placeItems: 'center', borderRadius: 12, background: '#f5f1ea', color: 'var(--ink-soft)' }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Spatial preview placeholder</div>
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>A map / parcel overlay belongs here. In this modular architecture, spatial intelligence is its own layer, not buried under forms.</div>
        </div>
      </div>
    </div>
  </>
);

const StatLine = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline' }}>
    <div style={{ fontSize: 12, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
    <div className="num" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{value}</div>
  </div>
);

const Footer = () => (
  <footer style={{ marginTop: 80, paddingTop: 32, borderTop: '1px solid #d4c9b8',
                   fontSize: 11, color: '#a89c87', lineHeight: 1.7 }}>
    <p style={{ maxWidth: 760 }}>
      <strong style={{ color: '#6b5d47' }}>Disclaimer.</strong> PlotIQ provides preliminary feasibility
      analysis based on the Comprehensive DCPR 2034 (PEATA edition). Outputs are not sanctioned approvals.
      The original gazette notifications and any subsequent State/MCGM amendments shall prevail. This
      analysis does not replace a Licensed Architect's certified plan or legal advice. Use with awareness
      of its limits.
    </p>
  </footer>
);

const PrintBar = () => (
  <div className="no-print" style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #d4c9b8',
                                     display: 'flex', justifyContent: 'space-between',
                                     alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
    <div style={{ fontSize: 12, color: '#6b5d47', maxWidth: 480 }}>
      This screen is a working advisory assessment. Print it to create a review-ready artifact for committee discussion, architect validation, and lender or bank pre-check.
    </div>
    <button onClick={() => window.print()}
            style={{ padding: '11px 18px', fontSize: 13, fontWeight: 600,
                     background: '#1a1815', color: '#f5f1ea', border: 'none',
                     borderRadius: 3, cursor: 'pointer',
                     display: 'flex', alignItems: 'center', gap: 8 }}>
      <Printer size={14} /> Print or save as PDF
    </button>
  </div>
);

const Section = ({ title, children, topMargin }) => (
  <div style={{ marginTop: topMargin ? 24 : 0 }}>
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: '#8b3a2a', marginBottom: 14 }}>{title}</div>
    {children}
  </div>
);

const Radio = ({ active }) => (
  <div style={{ width: 14, height: 14, borderRadius: '50%',
                border: `1.5px solid ${active ? '#8b3a2a' : '#d4c9b8'}`,
                display: 'grid', placeItems: 'center', flexShrink: 0 }}>
    {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b3a2a' }} />}
  </div>
);

const Toggle = ({ checked, onChange, label, sub }) => (
  <label style={{ display: 'flex', gap: 12, padding: '10px 0', cursor: 'pointer',
                  borderBottom: '1px solid #f0e9dd' }}>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
           style={{ marginTop: 4, accentColor: '#8b3a2a' }} />
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1815' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#6b5d47', marginTop: 2 }}>{sub}</div>}
    </div>
  </label>
);

const SectionTitle = ({ eyebrow, title, children }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: '#8b3a2a', fontWeight: 600, marginBottom: 6 }}>{eyebrow}</div>
    <h3 className="serif" style={{ fontSize: 22, fontWeight: 600, margin: 0,
                                   color: '#1a1815', letterSpacing: '-0.01em' }}>{title}</h3>
    {children && <p style={{ fontSize: 13.5, color: '#3d3528', marginTop: 8,
                              lineHeight: 1.6, maxWidth: 720 }}>{children}</p>}
  </div>
);

const th = { padding: '11px 18px', fontSize: 10, letterSpacing: '0.12em',
             textTransform: 'uppercase', color: '#6b5d47', fontWeight: 600, textAlign: 'left' };
const td = { padding: '12px 18px', verticalAlign: 'top' };

const Row = ({ label, value, sub, highlight, muted }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
    <div style={{ fontSize: 12, color: muted ? '#a89c87' : '#3d3528' }}>{label}</div>
    <div style={{ textAlign: 'right' }}>
      <div className="num" style={{ fontSize: 13, fontWeight: highlight ? 700 : 500,
                                    color: muted ? '#6b5d47' : highlight ? '#8b3a2a' : '#1a1815' }}>{value}</div>
      {sub && <div className="num" style={{ fontSize: 10, color: '#a89c87', marginTop: 1 }}>{sub}</div>}
    </div>
  </div>
);

// ============================================================================
// SPECIAL LOCATION WARNING
// ============================================================================
function SpecialLocationWarning({ specialLocation }) {
  if (!specialLocation || specialLocation === 'none') return null;
  const msgs = {
    barc: { label: 'BARC Area — M Ward', detail: 'This micro-location within M Ward is adjacent to BARC and carries a reduced basic FSI of 0.75 (not the standard 1.00 for Suburbs). The platform is using the standard Suburbs Table 12 slab. Instruct your Licensed Architect to verify the applicable FSI slab for your specific plot before relying on this output.' },
    crz: { label: 'CRZ-affected — Aksa / Marve / Erangal (P/N Ward)', detail: 'Plots in these coastal locations may carry a reduced basic FSI of 0.50 under CRZ regulations. The platform is using the standard Suburbs Table 12 slab. Your Licensed Architect must verify the applicable CRZ category and permissible FSI for your specific plot.' },
  };
  const m = msgs[specialLocation];
  if (!m) return null;
  return (
    <div style={{ background: 'rgba(192,140,48,0.08)', border: '1px solid rgba(192,140,48,0.35)', borderLeft: '3px solid #c08c30', borderRadius: 4, padding: 16, marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <AlertTriangle size={18} color="#c08c30" style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1815' }}>Caution — {m.label}</div>
        <div style={{ fontSize: 12.5, color: '#3d3528', marginTop: 6, lineHeight: 1.55 }}>{m.detail}</div>
      </div>
    </div>
  );
}

// ============================================================================
// INPUT PANEL
// ============================================================================
function InputPanel({ input, update, updateFlat, addFlat, removeFlat, showAdvanced, setShowAdvanced, wardDetect, setWardDetect }) {
  const [gmLink, setGmLink] = useState('');
  const showCostReport = input.reportScope !== 'entitlement';

  const handleDetect = useCallback(async () => {
    const url = gmLink.trim();
    if (!url) return;
    if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')) {
      setWardDetect({ status: 'error', ward: null, error: 'Shortened link detected. Open the link in your browser, then copy the full URL from the address bar and paste it here.' });
      return;
    }
    const coords = parseGoogleMapsCoords(url);
    if (!coords) {
      setWardDetect({ status: 'error', ward: null, error: 'Could not read coordinates from this link. Try right-clicking your plot on Google Maps → "What\'s here?" → copy the URL shown.' });
      return;
    }
    const [lat, lng] = coords;
    if (lat < 18.8 || lat > 19.4 || lng < 72.7 || lng > 73.1) {
      setWardDetect({ status: 'error', ward: null, error: 'Coordinates are outside Mumbai municipal limits. Please check the link.' });
      return;
    }
    setWardDetect({ status: 'loading', ward: null, error: null });
    try {
      const res = await fetch('/wards.geojson');
      const data = await res.json();
      const ward = detectWardFromCoords(lat, lng, data.features);
      if (!ward) {
        setWardDetect({ status: 'error', ward: null, error: 'Plot is within Mumbai bounds but outside known ward polygons. Enter location manually.' });
        return;
      }
      const info = WARD_INFO[ward] || {};
      // Pull place name from the URL → first comma chunk = name, rest = address
      const placeRaw = parseGoogleMapsPlace(url);
      let parsedName = null, parsedAddress = null;
      if (placeRaw) {
        const parts = placeRaw.split(',').map(s => s.trim()).filter(Boolean);
        parsedName = parts[0] || null;
        parsedAddress = parts.slice(1).join(', ') || null;
      }
      setWardDetect({ status: 'found', ward, info, lat, lng, parsedName, parsedAddress });
      update('location', info.islandCity ? 'islandCity' : 'suburbsExtended');
      if (parsedName && !input.societyName) update('societyName', parsedName);
      if (parsedAddress && !input.address) update('address', parsedAddress);
      else if (!input.address && info.localities) update('address', info.localities.split(',')[0].trim());
    } catch (e) {
      setWardDetect({ status: 'error', ward: null, error: 'Failed to load ward data. Try refreshing.' });
    }
  }, [gmLink, setWardDetect, update, input.societyName, input.address]);

  return (
    <div style={{ background: '#fffefb', border: '1px solid #d4c9b8', borderRadius: 4, padding: 28 }}>
      <div className="serif" style={{ fontSize: 20, fontWeight: 600, marginBottom: 20,
                                      paddingBottom: 14, borderBottom: '1px solid #e7dfd0' }}>
        Site assessment inputs
      </div>

      {/* Location Detector */}
      <div style={{ marginBottom: 22, padding: 16, background: '#f5f1ea',
                    border: '1px solid #e7dfd0', borderRadius: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <MapPin size={14} color="#8b3a2a" />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#8b3a2a', letterSpacing: '0.06em' }}>
            LOCATE YOUR PLOT
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Paste Google Maps link…"
            value={gmLink}
            onChange={e => setGmLink(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleDetect()}
            style={{ flex: 1, padding: '8px 10px', fontSize: 12, borderRadius: 3,
                     border: '1px solid #d4c9b8', background: '#fffefb',
                     color: '#1a1815', outline: 'none', fontFamily: 'inherit' }}
          />
          <button onClick={handleDetect}
            style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, borderRadius: 3,
                     background: '#8b3a2a', color: '#fffefb', border: 'none', cursor: 'pointer',
                     whiteSpace: 'nowrap', opacity: wardDetect.status === 'loading' ? 0.6 : 1 }}>
            {wardDetect.status === 'loading' ? 'Detecting…' : 'Detect ward'}
          </button>
        </div>
        <div style={{ fontSize: 10.5, color: '#6b5d47', lineHeight: 1.55 }}>
          Open Google Maps → right-click on your plot → <strong>"What's here?"</strong> → copy the URL from your browser's address bar.
        </div>

        {wardDetect.status === 'found' && wardDetect.ward && (() => {
          const info = wardDetect.info || {};
          return (
            <div style={{ marginTop: 12, padding: '10px 12px', background: '#fffefb',
                          border: `1.5px solid ${info.islandCity ? '#8b3a2a' : '#3a6b8b'}`,
                          borderRadius: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                              background: info.islandCity ? '#8b3a2a' : '#3a6b8b', color: '#fffefb' }}>
                  Ward {wardDetect.ward}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600,
                              color: info.islandCity ? '#8b3a2a' : '#3a6b8b' }}>
                  {info.islandCity ? 'Island City (Mumbai City)' : 'Suburbs (Mumbai Suburban)'}
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#3d3528', marginBottom: 6 }}>
                {info.localities}
              </div>
              <div style={{ fontSize: 10.5, color: '#6b5d47', padding: '8px 10px',
                            background: '#f5f1ea', borderRadius: 3, lineHeight: 1.6 }}>
                <strong>For Ready Reckoner (ASR):</strong> District <strong>{info.igrDistrict}</strong> · Taluka <strong>{info.igrTaluka}</strong>.
                <div style={{ marginTop: 6 }}>
                  <a href="https://efilingigr.maharashtra.gov.in/ePASR/"
                     target="_blank" rel="noopener noreferrer"
                     style={{ color: '#8b3a2a', fontWeight: 600, textDecoration: 'underline' }}>
                    Open IGR ASR portal ↗
                  </a>
                  <span style={{ marginLeft: 6 }}>→ pick village → note "Open Land" rate → enter it in the Ready Reckoner field below.</span>
                </div>
              </div>
            </div>
          );
        })()}

        {wardDetect.status === 'error' && (
          <div style={{ marginTop: 10, padding: '8px 10px', background: '#fff5f3',
                        border: '1px solid #f5c8bf', borderRadius: 3, fontSize: 11,
                        color: '#7a2010', lineHeight: 1.55 }}>
            {wardDetect.error}
          </div>
        )}

        {/* Society name + Address + Location dropdown — merged into the locate card */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed #d4c9b8' }}>
          <div>
            <label className="field-label">
              Society name
              {wardDetect.status === 'found' && wardDetect.parsedName && (
                <span style={{ marginLeft: 8, fontSize: 9.5, fontWeight: 600, color: '#3a6b8b',
                               textTransform: 'none', letterSpacing: 0 }}>
                  ✓ auto-filled from Google
                </span>
              )}
            </label>
            <input type="text" value={input.societyName}
                   onChange={e => update('societyName', e.target.value)}
                   placeholder="e.g. Saraswati CHS Ltd" />
            <div className="help-text" style={{ fontSize: 10.5 }}>
              Edit to override or correct the auto-filled name.
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="field-label">Address / locality</label>
            <input type="text" value={input.address}
                   onChange={e => update('address', e.target.value)}
                   placeholder="e.g. Borivali West" />
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="field-label">Location in Mumbai</label>
            {wardDetect.status === 'found' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                            background: '#fffefb', border: '1.5px solid #d4c9b8', borderRadius: 3 }}>
                <div style={{ padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                              background: (wardDetect.info && wardDetect.info.islandCity) ? '#8b3a2a' : '#3a6b8b',
                              color: '#fffefb' }}>
                  {(wardDetect.info && wardDetect.info.islandCity) ? 'Island City' : 'Suburbs / Extended Suburbs'}
                </div>
                <span style={{ fontSize: 11, color: '#6b5d47' }}>
                  set from Ward {wardDetect.ward}
                </span>
                <button onClick={() => { setWardDetect({ status: 'idle', ward: null, error: null }); setGmLink(''); }}
                        style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 10.5, fontWeight: 600,
                                 background: 'transparent', color: '#8b3a2a', border: '1px solid #d4c9b8',
                                 borderRadius: 3, cursor: 'pointer' }}>
                  Edit manually
                </button>
              </div>
            ) : (
              <select value={input.location} onChange={e => update('location', e.target.value)}>
                <option value="suburbsExtended">Suburbs / Extended Suburbs</option>
                <option value="islandCity">Island City (south of Mahim/Sion)</option>
              </select>
            )}
          </div>
        </div>
      </div>

      <Section title="Assessment scope" topMargin>
        <div style={{ display: 'grid', gap: 10 }}>
          {[
            { id: 'entitlement', title: 'Entitlement assessment', desc: 'Review entitlement, scheme suitability and site eligibility without premium cost or parking detail.' },
            { id: 'costsParking', title: 'Costs & parking analysis', desc: 'Include premium FSI, construction costing and parking requirement detail for a full assessment artifact.' },
            { id: 'full', title: 'Full advisory artifact', desc: 'Produce a complete entitlement and cost/parking output for a review-ready advisory snapshot.' },
          ].map(option => (
            <div key={option.id}
                 className={`radio-card ${input.reportScope === option.id ? 'active' : ''}`}
                 onClick={() => update('reportScope', option.id)}
                 style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Radio active={input.reportScope === option.id} />
                <div>
                  <div style={{ fontWeight: 600, color: '#1a1815' }}>{option.title}</div>
                  <div style={{ fontSize: 12, color: '#6b5d47', marginTop: 4 }}>{option.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Building basics" topMargin>
        <div>
          <label className="field-label">Zone / land use</label>
          <select value={input.zone} onChange={e => update('zone', e.target.value)}>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="mixed">Mixed (Residential + Commercial)</option>
            <option value="industrial">Industrial</option>
          </select>
          <div className="help-text">Determines Reg 14 amenity, LOS %, and fungible rate.</div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label className="field-label">Age of building (years)</label>
          <input type="number" className="num" value={input.buildingAge}
                 onChange={e => update('buildingAge', parseInt(e.target.value) || 0)} />
          <div className="help-text">Reg 33(7)(B) needs 30+ years.</div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label className="field-label">Building type</label>
          <div style={{ display: 'grid', gap: 6 }}>
            {[
              { id: 'society', label: 'Cooperative housing society (members own flats)' },
              { id: 'cessed', label: 'Cessed building (paying MHADA cess)' },
              { id: 'tenanted', label: 'Tenanted building (tenants, not members)' },
            ].map(opt => (
              <div key={opt.id}
                   className={`radio-card ${input.buildingType === opt.id ? 'active' : ''}`}
                   onClick={() => update('buildingType', opt.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Radio active={input.buildingType === opt.id} />
                  {opt.label}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label className="field-label">Authorisation records</label>
          <select value={input.authorisationStatus}
                  onChange={e => update('authorisationStatus', e.target.value)}>
            <option value="oc">Has Occupation Certificate (OC)</option>
            <option value="cc">CC + approved plans only</option>
            <option value="tolerated">Tolerated (assessment record before datum line)</option>
            <option value="none">No approved plans, OC, or MCGM file</option>
          </select>
          <div className="help-text">Check with your society's office bearers.</div>
        </div>
      </Section>

      <Section title="Plot & access" topMargin>
        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="field-label">Plot area (sqm)</label>
            <input type="number" className="num" value={input.plotArea}
                   onChange={e => update('plotArea', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="field-label">DP road width (m)</label>
            <input type="number" className="num" value={input.roadWidth}
                   onChange={e => update('roadWidth', parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        <div className="help-text">
          <strong>Use the DP (Development Plan) road width</strong>, not just the existing width on site.
          If your road is being widened under the DP, enter the proposed full width. The FSI slab follows
          the DP width per Reg 30 / Table 12 Note 1.
        </div>
        <div style={{ marginTop: 14 }}>
          <label className="field-label">DP road + Regular Line set-back (sqm)</label>
          <input type="number" className="num" value={input.dpRoadDeduction}
                 onChange={e => update('dpRoadDeduction', parseFloat(e.target.value) || 0)} />
          <div className="help-text">Reg 16 + Reg 30(A)(2). Area under proposed DP road and sanctioned Regular Line — deducted from plot for FSI. Enter 0 if none.</div>
        </div>
        {parseFloat(input.roadWidth) >= 6 && parseFloat(input.roadWidth) < 9 && (
          <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(192,140,48,0.07)', border: '1px solid rgba(192,140,48,0.3)', borderRadius: 3 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12 }}>
              <input type="checkbox" checked={!!input.roadWideningProposed}
                     onChange={e => update('roadWideningProposed', e.target.checked)}
                     style={{ marginTop: 2, accentColor: '#8b3a2a' }} />
              <div>
                <div style={{ fontWeight: 600, color: '#1a1815' }}>Road being widened to 9m+ under DP?</div>
                <div style={{ color: '#6b5d47', marginTop: 2 }}>Table 12 Note 1: plots abutting roads proposed to be widened to ≥9m may use the 9m FSI slab.</div>
              </div>
            </label>
          </div>
        )}

        <button onClick={() => setShowAdvanced(!showAdvanced)}
                style={{ marginTop: 14, fontSize: 12, color: '#8b3a2a', background: 'none',
                         border: 'none', cursor: 'pointer',
                         display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
          {showAdvanced ? <EyeOff size={12} /> : <Eye size={12} />}
          {showAdvanced ? 'Hide' : 'Show'} deduction details & advanced inputs
        </button>

        {showAdvanced && (
          <div style={{ marginTop: 14, padding: 14, background: '#fafaf5',
                        border: '1px solid #e7dfd0', borderRadius: 3 }}>
            <div className="field-label" style={{ marginBottom: 10, color: '#8b3a2a' }}>
              Plot deductions — Reg 30(A)(2)
            </div>

            <div>
              <label className="field-label">DP reservation — net deduction (sqm)</label>
              <input type="number" className="num" value={input.reservationDeduction}
                     onChange={e => update('reservationDeduction', parseFloat(e.target.value) || 0)} />
              <div className="help-text">Reg 17. Enter the reservation area that is NET deducted from your FSI plot. For a plain surrender: full reservation area. For Accommodation Reservation (AR) development: enter only Y% (the portion handed over) — the (100−Y)% is developable AND its FSI is loadable on the balance plot. Y varies by reservation type (Table 4/5). If unsure, leave as the full reservation area for a conservative estimate; consult an architect for AR upside.</div>
            </div>

            <div style={{ marginTop: 10, padding: 12, background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 3 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                <input type="checkbox" checked={!!input.isAmalgamated}
                       onChange={e => update('isAmalgamated', e.target.checked)}
                       style={{ accentColor: '#8b3a2a' }} />
                <div style={{ fontWeight: 600, color: '#1a1815' }}>Amalgamated plot</div>
              </label>
              <div className="help-text" style={{ marginTop: 4 }}>
                Reg 14 Note (iii): if any original sub-plot was &lt; 4,000 sqm and total ≤ 20,000 sqm, amenity is not triggered.
              </div>
              {input.isAmalgamated && (
                <div style={{ marginTop: 8 }}>
                  <label className="field-label">Smallest original sub-plot area (sqm)</label>
                  <input type="number" className="num" value={input.smallestOriginalPlot}
                         onChange={e => update('smallestOriginalPlot', parseFloat(e.target.value) || 0)} />
                </div>
              )}
            </div>

            {/* Reg 14 amenity — auto with override */}
            <div style={{ marginTop: 14, padding: 12, background: '#fffefb',
                          border: '1px solid #e7dfd0', borderRadius: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1815' }}>
                  Reg 14 amenity surrender
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', color: '#6b5d47' }}>
                  <input type="checkbox" checked={input.reg14Override}
                         onChange={e => update('reg14Override', e.target.checked)}
                         style={{ accentColor: '#8b3a2a' }} />
                  Override auto-value
                </label>
              </div>
              {input.reg14Override ? (
                <div>
                  <input type="number" className="num" value={input.reg14ManualValue}
                         onChange={e => update('reg14ManualValue', parseFloat(e.target.value) || 0)}
                         placeholder="Manual amenity area (sqm)" />
                  <div className="help-text" style={{ marginTop: 4 }}>
                    Override active. Auto-computed value will be ignored.
                  </div>
                </div>
              ) : (
                <div className="help-text" style={{ marginTop: 0 }}>
                  Auto-applied when plot ≥ 4,000 sqm in R/C zone. 5% (4–10k sqm) or 500 + 10% × (plot − 10k).
                  For 33(7)(B) the full amenity applies (no 35% reduction). Toggle override if you need to set a different value.
                </div>
              )}
            </div>

            {/* Reg 27 LOS — auto with override */}
            <div style={{ marginTop: 10, padding: 12, background: '#fffefb',
                          border: '1px solid #e7dfd0', borderRadius: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1815' }}>
                  Reg 27 Layout Open Space (LOS)
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', color: '#6b5d47' }}>
                  <input type="checkbox" checked={input.losOverride}
                         onChange={e => update('losOverride', e.target.checked)}
                         style={{ accentColor: '#8b3a2a' }} />
                  Override auto-value
                </label>
              </div>
              {input.losOverride ? (
                <div>
                  <input type="number" className="num" value={input.losManualValue}
                         onChange={e => update('losManualValue', parseFloat(e.target.value) || 0)}
                         placeholder="Manual LOS area (sqm)" />
                </div>
              ) : (
                <div className="help-text" style={{ marginTop: 0 }}>
                  Auto-applied on net plot. 15% (1–2.5k sqm) / 20% (2.5–10k) / 25% (&gt;10k).
                  LOS is a site-planning constraint — not an FSI deduction.
                </div>
              )}
            </div>

            <div style={{ marginTop: 10, padding: 12, background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 3 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1815', marginBottom: 6 }}>
                Proposed ROS / LOS area in design (sqm)
              </div>
              <input type="number" className="num" value={input.rosProposed}
                     onChange={e => update('rosProposed', parseFloat(e.target.value) || 0)}
                     placeholder="0" />
              <div className="help-text" style={{ marginTop: 4 }}>
                How much open space your proposed building will actually provide. Used to compute OSD premium deficiency — if 0, OSD is calculated on the full required ROS (conservative).
              </div>
            </div>

            <div style={{ marginTop: 10, padding: 12, background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 3 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1815', marginBottom: 6 }}>Special micro-location</div>
              <select value={input.specialLocation} onChange={e => update('specialLocation', e.target.value)}
                      style={{ fontSize: 12 }}>
                <option value="none">None — standard FSI applies</option>
                <option value="barc">BARC area (M Ward) — basic FSI may be 0.75</option>
                <option value="crz">Aksa / Marve / Erangal CRZ (P/N Ward) — basic FSI may be 0.50</option>
              </select>
              <div className="help-text" style={{ marginTop: 4 }}>Selecting one shows a caution — verify with your architect before relying on this platform's FSI output.</div>
            </div>
          </div>
        )}
      </Section>

      <Section title="Existing flats & built-up area" topMargin>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => update('buaInputMode', 'breakdown')}
                  style={{ flex: 1, padding: '8px 10px', fontSize: 12,
                           border: `1px solid ${input.buaInputMode === 'breakdown' ? '#8b3a2a' : '#d4c9b8'}`,
                           background: input.buaInputMode === 'breakdown' ? 'rgba(139, 58, 42, 0.04)' : '#fffefb',
                           color: input.buaInputMode === 'breakdown' ? '#8b3a2a' : '#6b5d47',
                           cursor: 'pointer', borderRadius: 3, fontWeight: 500 }}>
            By flat type
          </button>
          <button onClick={() => update('buaInputMode', 'total')}
                  style={{ flex: 1, padding: '8px 10px', fontSize: 12,
                           border: `1px solid ${input.buaInputMode === 'total' ? '#8b3a2a' : '#d4c9b8'}`,
                           background: input.buaInputMode === 'total' ? 'rgba(139, 58, 42, 0.04)' : '#fffefb',
                           color: input.buaInputMode === 'total' ? '#8b3a2a' : '#6b5d47',
                           cursor: 'pointer', borderRadius: 3, fontWeight: 500 }}>
            Total only
          </button>
        </div>

        {input.buaInputMode === 'breakdown' ? (
          <div>
            {input.flats.map((flat, idx) => (
              <div key={idx} style={{ padding: 10, border: '1px solid #e7dfd0',
                                      borderRadius: 3, marginBottom: 8, background: '#fafaf5' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 26px',
                              gap: 6, alignItems: 'end' }}>
                  <div>
                    <div className="field-label" style={{ fontSize: 9, marginBottom: 3 }}>Type</div>
                    <input type="text" value={flat.label}
                           onChange={e => updateFlat(idx, 'label', e.target.value)}
                           style={{ padding: '6px 8px', fontSize: 12 }} />
                  </div>
                  <div>
                    <div className="field-label" style={{ fontSize: 9, marginBottom: 3 }}>Carpet (sqm)</div>
                    <input type="number" className="num" value={flat.carpet}
                           onChange={e => updateFlat(idx, 'carpet', e.target.value)}
                           style={{ padding: '6px 8px', fontSize: 12 }} />
                  </div>
                  <div>
                    <div className="field-label" style={{ fontSize: 9, marginBottom: 3 }}>Count</div>
                    <input type="number" className="num" value={flat.count}
                           onChange={e => updateFlat(idx, 'count', e.target.value)}
                           style={{ padding: '6px 8px', fontSize: 12 }} />
                  </div>
                  <button onClick={() => removeFlat(idx)}
                          style={{ padding: 6, background: 'none',
                                   border: '1px solid #d4c9b8', borderRadius: 3,
                                   cursor: 'pointer', color: '#a89c87' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: '#6b5d47' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <input type="radio" checked={flat.use === 'residential'}
                           onChange={() => updateFlat(idx, 'use', 'residential')} />
                    Residential
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 12, cursor: 'pointer' }}>
                    <input type="radio" checked={flat.use === 'commercial'}
                           onChange={() => updateFlat(idx, 'use', 'commercial')} />
                    Shop / commercial
                  </label>
                </div>
              </div>
            ))}
            <button onClick={addFlat}
                    style={{ width: '100%', padding: '8px', fontSize: 12, background: 'none',
                             border: '1px dashed #d4c9b8', borderRadius: 3, cursor: 'pointer',
                             color: '#8b3a2a', display: 'flex',
                             alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Plus size={12} /> Add flat type
            </button>
          </div>
        ) : (
          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="field-label">Total existing BUA (sqm)</label>
              <input type="number" className="num" value={input.totalExistingBua}
                     onChange={e => update('totalExistingBua', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Total flats</label>
              <input type="number" className="num" value={input.tenementCount}
                     onChange={e => update('tenementCount', e.target.value)} />
            </div>
          </div>
        )}
      </Section>

      <Section title="Confirmations" topMargin>
        <Toggle checked={input.membersOnSamePlot}
                onChange={v => update('membersOnSamePlot', v)}
                label="Members will be re-accommodated on the same plot"
                sub="Required by Reg 33(7)(B)" />
        <Toggle checked={input.gbResolution}
                onChange={v => update('gbResolution', v)}
                label="Society GB resolution passed (or planned)"
                sub="Required at proposal stage" />
        <Toggle checked={input.mixedTenancy}
                onChange={v => update('mixedTenancy', v)}
                label="Plot has mixed tenanted + member-owned buildings"
                sub="If yes, Reg 33(7)(B) clause 8 requires proportional notional-plot split" />
        <Toggle checked={input.slumOnPlot}
                onChange={v => update('slumOnPlot', v)}
                label="Slum encroachment on part of the plot"
                sub="Triggers Reg 33(10) advisory — needs separate analysis" />
      </Section>

      <Section title="Cluster scheme — Reg 33(9)" topMargin>
        <Toggle checked={input.clusterOptIn}
                onChange={v => update('clusterOptIn', v)}
                label="Combine with neighbouring societies (cluster)"
                sub={`Activates Reg 33(9). Min ${input.location === 'islandCity' ? '4,000' : '6,000'} sqm cluster area.`} />

        {input.clusterOptIn && (
          <div style={{ marginTop: 14, padding: 14, background: 'rgba(139, 58, 42, 0.04)', border: '1px solid #e7dfd0', borderRadius: 4 }}>
            <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label">Total cluster plot (sqm)</label>
                <input type="number" className="num" value={input.clusterPlotArea}
                       onChange={e => update('clusterPlotArea', parseFloat(e.target.value) || 0)} />
                <div className="help-text">Aggregate of all participating society plots.</div>
              </div>
              <div>
                <label className="field-label">Buildings in cluster</label>
                <input type="number" className="num" value={input.clusterBuildings}
                       onChange={e => update('clusterBuildings', parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <label className="field-label">Aggregate existing BUA (sqm)</label>
                <input type="number" className="num" value={input.clusterExistingBua}
                       onChange={e => update('clusterExistingBua', parseFloat(e.target.value) || 0)} />
                <div className="help-text">Sum of existing BUA across all buildings.</div>
              </div>
              <div>
                <label className="field-label">Aggregate apartments</label>
                <input type="number" className="num" value={input.clusterApartments}
                       onChange={e => update('clusterApartments', parseInt(e.target.value) || 0)} />
              </div>
            </div>
          </div>
        )}
      </Section>

      {showCostReport ? (
        <Section title="Ready Reckoner (ASR) & Construction rate" topMargin>
          <div>
            <label className="field-label">Ready Reckoner land rate — FSI 1 (₹/sqm)</label>
            <input type="number" className="num" value={input.asrLandRate}
                   onChange={e => update('asrLandRate', parseFloat(e.target.value) || 0)} />
          </div>
          <div style={{ marginTop: 14 }}>
            <label className="field-label">SDRR construction rate (₹/sqm BUA)</label>
            <input type="number" className="num" value={input.constructionRate}
                   onChange={e => update('constructionRate', parseFloat(e.target.value) || 0)} />
            <div className="help-text" style={{ fontSize: 10.5 }}>
              Used for Labour Welfare Cess (1%) and TDR Infrastructure Charge (5%).
              FY 2025-26 SDRR rate: <strong>₹27,500/sqm</strong> for residential RCC.
            </div>
          </div>
          <div>

          {/* IGR lookup helper */}
          {(() => {
            const wardInfo = wardDetect && wardDetect.status === 'found' ? (wardDetect.info || {}) : null;
            return (
              <div style={{ marginTop: 12, padding: 12, background: '#f5f1ea',
                            border: '1px solid #e7dfd0', borderRadius: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                              textTransform: 'uppercase', color: '#8b3a2a', marginBottom: 8 }}>
                  Look up your rate
                </div>

                {wardInfo ? (
                  <div style={{ fontSize: 11.5, color: '#3d3528', lineHeight: 1.7, marginBottom: 10 }}>
                    For <strong>Ward {wardDetect.ward}</strong> ({wardInfo.localities}):
                    <ol style={{ margin: '6px 0 0 18px', padding: 0 }}>
                      <li>Click the button below — IGR ASR portal opens in a new tab</li>
                      <li>Select District: <strong>{wardInfo.igrDistrict}</strong></li>
                      <li>Select Taluka: <strong>{wardInfo.igrTaluka}</strong></li>
                      <li>Pick the village/locality matching your plot</li>
                      <li>Read the <strong>"Open Land" / Residential FSI&nbsp;1</strong> rate and enter above</li>
                    </ol>
                  </div>
                ) : (
                  <div style={{ fontSize: 11.5, color: '#3d3528', lineHeight: 1.65, marginBottom: 10 }}>
                    Use the <strong>Locate your plot</strong> panel at the top to auto-identify your ward, then return here for tailored lookup steps. Or open the IGR portal directly:
                  </div>
                )}

                <a href="https://efilingigr.maharashtra.gov.in/ePASR/"
                   target="_blank" rel="noopener noreferrer"
                   style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '8px 14px', background: '#8b3a2a', color: '#fffefb',
                            fontSize: 12, fontWeight: 600, borderRadius: 3, textDecoration: 'none',
                            border: 'none' }}>
                  Open IGR ASR portal ↗
                </a>
                <div style={{ marginTop: 8, fontSize: 10.5, color: '#6b5d47', lineHeight: 1.55 }}>
                  Used to estimate premium FSI payable and fungible charges. The ASR is the official basis used by MCGM for these calculations.
                </div>
              </div>
            );
          })()}
        </div>
      </Section>
      ) : (
        <Section title="Ready Reckoner (ASR) & Construction rate" topMargin>
          <div style={{ fontSize: 12, color: '#6b5d47', lineHeight: 1.6 }}>
            These fields are only required when you choose a Costs & Parking report. Keep this section hidden unless you need premium, construction, or parking costing in the same assessment.
          </div>
        </Section>
      )}

      {showAdvanced && (
        <div style={{ display: 'none' }} />
      )}
    </div>
  );
}

// ============================================================================
// ELIGIBILITY PANEL
// ============================================================================
// ============================================================================
// SCHEME PICKER — auto-detected primary highlighted, dropdown to switch
// ============================================================================
function SchemePicker({ schemes, activeSchemeId, primarySchemeId, onSelect, input, update }) {
  const activeMeta = ALL_SCHEMES.find(s => s.id === activeSchemeId);
  const isOverride = input.selectedScheme && input.selectedScheme !== primarySchemeId;

  return (
    <div style={{
      background: '#fffefb',
      border: '1px solid #d4c9b8',
      borderRadius: 6,
      padding: 24,
      marginBottom: 28,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b3a2a', fontWeight: 600, marginBottom: 6 }}>
            {isOverride ? 'Manually selected scheme' : 'Auto-detected applicable scheme'}
          </div>
          <h3 className="serif" style={{ fontSize: 24, fontWeight: 600, margin: 0, color: '#1a1815', letterSpacing: '-0.01em' }}>
            {activeMeta?.code} — {activeMeta?.name}
          </h3>
          <p style={{ fontSize: 13, color: '#3d3528', marginTop: 6, lineHeight: 1.5, margin: '6px 0 0' }}>{activeMeta?.desc}</p>
        </div>
        <div style={{ minWidth: 220 }}>
          <label className="field-label">Switch scheme</label>
          <select
            value={activeSchemeId}
            onChange={e => onSelect(e.target.value === primarySchemeId ? null : e.target.value)}
          >
            {ALL_SCHEMES.map(s => {
              const sched = schemes.find(x => x.id === s.id);
              const eligible = sched?.eligible;
              const tag = s.id === primarySchemeId ? ' ★ recommended' : eligible ? ' ✓ eligible' : ' ✗ not eligible';
              return <option key={s.id} value={s.id}>{s.code}{tag}</option>;
            })}
          </select>
        </div>
      </div>

      {/* Eligibility trace — Why this scheme? Always visible. */}
      <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid #f0e9dd' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b5d47', marginBottom: 10 }}>
          Why this scheme?
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {schemes.map(s => {
            const meta = ALL_SCHEMES.find(m => m.id === s.id);
            const isActive = s.id === activeSchemeId;
            const isPrimary = s.id === primarySchemeId;
            return (
              <div key={s.id} style={{
                padding: 12,
                background: isActive ? 'rgba(139, 58, 42, 0.05)' : 'transparent',
                border: `1px solid ${isActive ? '#8b3a2a' : '#e7dfd0'}`,
                borderRadius: 4,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="num" style={{ fontSize: 11, fontWeight: 700, color: '#8b3a2a', letterSpacing: '0.04em' }}>
                      {meta?.code}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1815' }}>{meta?.short}</div>
                    {isPrimary && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 100, letterSpacing: '0.08em', background: '#8b3a2a', color: 'white' }}>RECOMMENDED</span>
                    )}
                    {!isPrimary && s.eligible && (
                      <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 100, letterSpacing: '0.08em', background: 'rgba(90, 122, 79, 0.15)', color: '#3d5a4d' }}>ELIGIBLE</span>
                    )}
                    {!s.eligible && (
                      <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 100, letterSpacing: '0.08em', background: 'rgba(168, 156, 135, 0.2)', color: '#6b5d47' }}>NOT ELIGIBLE</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 3, marginLeft: 8 }}>
                  {s.gates.map((g, gi) => (
                    <div key={gi} style={{ display: 'flex', gap: 8, fontSize: 12, color: g.ok ? '#3d3528' : '#6b5d47' }}>
                      <span style={{ color: g.ok ? '#5a7a4f' : '#a4493a', flexShrink: 0, fontWeight: 700, marginTop: 1 }}>
                        {g.ok ? '✓' : '✗'}
                      </span>
                      <span>{g.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// ELIGIBILITY PANEL
// ============================================================================
function EligibilityPanel({ eligibility, input }) {
  return (
    <div style={{ background: eligibility.eligible ? '#f0f5ee' : '#fbeeea',
                  border: `1px solid ${eligibility.eligible ? '#a8c2a0' : '#d8a59a'}`,
                  borderRadius: 6, padding: 28, marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%',
                      background: eligibility.eligible ? '#5a7a4f' : '#a4493a',
                      display: 'grid', placeItems: 'center', flexShrink: 0, color: 'white' }}>
          {eligibility.eligible ? <Check size={22} /> : <X size={22} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: eligibility.eligible ? '#5a7a4f' : '#a4493a', fontWeight: 600 }}>
            {eligibility.eligible ? 'Eligible for redevelopment' : 'Not yet eligible — see issues below'}
          </div>
          <h2 className="serif" style={{ fontSize: 26, fontWeight: 600, margin: '4px 0 0 0',
                                          color: '#1a1815', lineHeight: 1.2 }}>
            {eligibility.eligible
              ? `${input.societyName || 'Your society'} qualifies under Reg 33(7)(B)`
              : `${input.societyName || 'Your society'} cannot use Reg 33(7)(B) yet`}
          </h2>
        </div>
      </div>

      {eligibility.passed.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 20,
                      borderTop: `1px solid ${eligibility.eligible ? '#cdd9c6' : '#e8d4ce'}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: '#5a7a4f', marginBottom: 10 }}>
            What's working
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {eligibility.passed.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: '#3d3528' }}>
                <Check size={14} color="#5a7a4f" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  {p.title}
                  <span className="num" style={{ marginLeft: 6, fontSize: 10, color: '#6b5d47' }}>[{p.ref}]</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {eligibility.issues.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 20,
                      borderTop: `1px solid ${eligibility.eligible ? '#cdd9c6' : '#e8d4ce'}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: '#a4493a', marginBottom: 10 }}>
            Issues to address
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {eligibility.issues.map((iss, i) => (
              <div key={i} style={{ padding: 14, background: 'rgba(255,255,255,0.6)',
                                    border: `1px solid ${iss.level === 'fail' ? '#d8a59a' : '#e0c89a'}`,
                                    borderLeft: `3px solid ${iss.level === 'fail' ? '#a4493a' : '#c08c30'}`,
                                    borderRadius: 3 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {iss.level === 'fail'
                    ? <X size={14} color="#a4493a" style={{ flexShrink: 0, marginTop: 3 }} />
                    : <AlertTriangle size={14} color="#c08c30" style={{ flexShrink: 0, marginTop: 3 }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1815' }}>{iss.title}</div>
                    <div style={{ fontSize: 12.5, color: '#3d3528', marginTop: 6, lineHeight: 1.55 }}>
                      {iss.detail}
                    </div>
                    <div className="num" style={{ fontSize: 10, color: '#6b5d47',
                                                  marginTop: 8, letterSpacing: '0.04em' }}>[{iss.ref}]</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SCENARIO COMPARISON
// ============================================================================
// ============================================================================
// INTERACTIVE RESULT — single live BUA, with sliders for FSI loadings
// ============================================================================
function InteractiveResult({ result, input, update, schemeId }) {
  const r = result;
  const isFullyLoaded = (input.premiumFsiLoad ?? 1) === 1
    && (input.tdrLoad ?? 1) === 1
    && (input.fungibleLoad ?? 1) === 1;
  const utilisationPct = r.permissibleBuaMax > 0
    ? (r.permissibleBua / r.permissibleBuaMax) * 100 : 100;
  const rehabPct = r.permissibleBua > 0
    ? (r.memberSideRehabBua / r.permissibleBua) * 100 : 0;
  const salePct = 100 - rehabPct;

  const viabilityColour = r.viabilityRating === 'marginal' ? '#c08c30'
    : r.viabilityRating === 'viable' ? '#8b3a2a' : '#3d5a4d';

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="At your selected loadings" title="Buildable area — live">
        Adjust sliders in the <strong>Area Statement</strong> tab to explore scenarios.
      </SectionTitle>

      {/* 3-stat card row */}
      <div className="stat-grid">
        <div className="stat-card stat-card-accent">
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8b3a2a', marginBottom: 6 }}>Total permissible</div>
          <div className="num serif" style={{ fontSize: 36, fontWeight: 700, color: '#1a1815', lineHeight: 1, letterSpacing: '-0.02em' }}>
            {fmt(r.permissibleBua)}
          </div>
          <div className="num" style={{ fontSize: 12, color: '#6b5d47', marginTop: 4 }}>sqm · {fmtSqft(r.permissibleBua)} sqft</div>
          <div className="num" style={{ fontSize: 11, color: '#a89c87', marginTop: 3 }}>FSI {r.effFsi.toFixed(2)} effective</div>
          {!isFullyLoaded && (
            <div style={{ marginTop: 8, fontSize: 10.5, color: '#c08c30', background: 'rgba(192,140,48,0.08)', padding: '4px 8px', borderRadius: 3 }}>
              Max: {fmt(r.permissibleBuaMax)} sqm ({utilisationPct.toFixed(0)}% loaded)
            </div>
          )}
        </div>

        <div className="stat-card">
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3d5a4d', marginBottom: 6 }}>Rehab → members</div>
          <div className="num serif" style={{ fontSize: 36, fontWeight: 700, color: '#1a1815', lineHeight: 1, letterSpacing: '-0.02em' }}>
            {fmt(r.memberSideRehabBua)}
          </div>
          <div className="num" style={{ fontSize: 12, color: '#6b5d47', marginTop: 4 }}>sqm · {fmtSqft(r.memberSideRehabBua)} sqft</div>
          <div className="num" style={{ fontSize: 11, color: '#a89c87', marginTop: 3 }}>{rehabPct.toFixed(0)}% of total</div>
        </div>

        <div className="stat-card">
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b5d47', marginBottom: 6 }}>Sale → developer</div>
          <div className="num serif" style={{ fontSize: 36, fontWeight: 700, color: '#8b3a2a', lineHeight: 1, letterSpacing: '-0.02em' }}>
            {fmt(r.saleBua)}
          </div>
          <div className="num" style={{ fontSize: 12, color: '#6b5d47', marginTop: 4 }}>sqm · {fmtSqft(r.saleBua)} sqft</div>
          <div className="num" style={{ fontSize: 11, color: '#a89c87', marginTop: 3 }}>Ratio {r.viabilityRatio.toFixed(2)} sale : rehab</div>
        </div>
      </div>

      {/* BUA split bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6b5d47', marginBottom: 5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          <span>◼ Members ({rehabPct.toFixed(0)}%)</span>
          <span>◼ Developer ({salePct.toFixed(0)}%)</span>
        </div>
        <div className="bua-split-bar">
          {r.permissibleBua > 0 && <>
            <div className="bua-split-rehab" style={{ width: `${rehabPct}%` }} />
            <div className="bua-split-sale" style={{ width: `${salePct}%` }} />
          </>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 10.5 }}>
          <span className="num" style={{ color: '#3d5a4d', fontWeight: 600 }}>{fmt(r.memberSideRehabBua)} sqm</span>
          <span className="num" style={{ color: '#8b3a2a', fontWeight: 600 }}>{fmt(r.saleBua)} sqm</span>
        </div>
      </div>

      {/* Viability + governing path */}
      <div style={{ background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 6, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: schemeId === 'reg33_7B' ? 14 : 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: viabilityColour, marginTop: 6, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: viabilityColour }}>
              {r.viabilityRating}
            </div>
            <div style={{ fontSize: 13, color: '#1a1815', marginTop: 3, lineHeight: 1.55 }}>{r.viabilityNote}</div>
          </div>
        </div>
        {schemeId === 'reg33_7B' && (
          <div style={{ paddingTop: 12, borderTop: '1px solid #f0e9dd', fontSize: 11.5, color: '#6b5d47', lineHeight: 1.6 }}>
            <strong style={{ color: '#1a1815' }}>Governing path:</strong>{' '}
            {r.rehabPathGoverns
              ? `Rehab + Incentive (${fmt(r.rehabBasePath)} sqm) exceeds Reg 30 ceiling at current loadings.`
              : `Reg 30 ceiling (${fmt(r.reg30PathLoaded)} sqm) governs. Incentive of ${fmt(r.incentiveBua)} sqm is absorbed within this.`}
          </div>
        )}
      </div>

      {/* Loading controls */}
      <div style={{ background: '#fafaf5', border: '1px solid #e7dfd0', borderRadius: 6, padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 11, color: '#6b5d47', lineHeight: 1.5 }}>
            Adjust <strong>Premium FSI</strong>, <strong>TDR</strong> and <strong>Fungible</strong> sliders in the
            {' '}<button onClick={() => {}} style={{ background: 'none', border: 'none', padding: 0, color: '#8b3a2a', fontWeight: 600, cursor: 'default', fontSize: 11 }}>Area Statement</button> tab.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => { update('premiumFsiLoad', 1); update('tdrLoad', 1); update('fungibleLoad', 1); }}
              style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, background: '#1a1815', color: '#f5f1ea', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              Reset max
            </button>
            <button onClick={() => { update('premiumFsiLoad', 0); update('tdrLoad', 0); update('fungibleLoad', 1); }}
              style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, background: 'transparent', color: '#8b3a2a', border: '1px solid #8b3a2a', borderRadius: 4, cursor: 'pointer' }}>
              Basic only
            </button>
            {r.premiumPayable > 0 && (
              <div style={{ fontSize: 11.5, color: '#6b5d47', alignSelf: 'center' }}>
                Premium: <span className="num" style={{ fontWeight: 700, color: '#8b3a2a' }}>{fmtCurrency(r.premiumPayable)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

// Reusable slider component for FSI loadings
function LoadingSlider({ label, ref_text, value, onChange, availableSqm, loadedSqm, disabled, disabledReason }) {
  const pct = Math.round((value ?? 1) * 100);
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid #f5efe2', opacity: disabled ? 0.5 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1815' }}>{label}</div>
          <div style={{ fontSize: 11, color: '#6b5d47', marginTop: 2 }}>{ref_text}</div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 160 }}>
          {disabled ? (
            <div style={{ fontSize: 11, color: '#a89c87', fontStyle: 'italic' }}>{disabledReason}</div>
          ) : (
            <>
              <div className="num" style={{ fontSize: 14, fontWeight: 700, color: '#8b3a2a' }}>
                {fmt(loadedSqm)} <span style={{ fontSize: 11, fontWeight: 500, color: '#6b5d47' }}>/ {fmt(availableSqm)} sqm</span>
              </div>
              <div className="num" style={{ fontSize: 11, color: '#6b5d47', marginTop: 1 }}>{pct}% loaded</div>
            </>
          )}
        </div>
      </div>
      {!disabled && (
        <input
          type="range"
          min="0" max="1" step="0.01"
          value={value ?? 1}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#8b3a2a', cursor: 'pointer' }}
        />
      )}
    </div>
  );
}

// ============================================================================
// AREA STATEMENT — RESTRUCTURED
// ============================================================================
// COMPARE OFFER — Side-by-side: developer's offer vs regulatory baseline
// Chairman uploads offer doc (optional), enters rehab+sale areas from offer,
// and the panel shows shortfall/excess in plain English.
// ============================================================================
function CompareOffer({ result, input, update }) {
  // Existing carpet (sqft) — from flat breakdown or total mode
  const existingCarpetSqm = (() => {
    if (input.buaInputMode === 'breakdown') {
      return (input.flats || []).reduce((sum, f) =>
        sum + (parseFloat(f.carpet) || 0) * (parseInt(f.count) || 0), 0);
    }
    // total mode: existingBua / 1.2 BUA factor ≈ carpet
    return (parseFloat(input.totalExistingBua) || 0) / 1.2;
  })();
  const existingCarpetSqft = existingCarpetSqm * SQFT_PER_SQM;

  // Regulatory entitlement — convert BUA → carpet (÷ 1.2 BUA factor)
  const regRehabCarpetSqft = ((result.memberSideRehabBua || 0) / 1.2) * SQFT_PER_SQM;
  const regSaleCarpetSqft  = ((result.saleBua             || 0) / 1.2) * SQFT_PER_SQM;

  const devRehab = parseFloat(input.devOfferRehab) || 0;
  const devSale  = parseFloat(input.devOfferSale)  || 0;

  const rehabDelta    = devRehab - regRehabCarpetSqft;
  const rehabDeltaPct = regRehabCarpetSqft > 0 ? (rehabDelta / regRehabCarpetSqft) * 100 : 0;
  const saleDelta     = devSale - regSaleCarpetSqft;
  const saleDeltaPct  = regSaleCarpetSqft > 0 ? (saleDelta / regSaleCarpetSqft) * 100 : 0;

  const rehabVerdict = rehabDelta >= -0.02 * regRehabCarpetSqft ? 'ok' : 'low';   // within 2% = OK
  const saleVerdict  = saleDelta  <=  0.02 * regSaleCarpetSqft  ? 'ok' : 'high';  // within 2% = OK

  const handleFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) update('devOfferFileName', f.name);
  };

  const tone = (v) => v === 'ok' ? '#5a7a4f' : '#a4493a';
  const Pill = ({ kind }) => {
    if (kind === 'ok')   return <span style={{ background: '#5a7a4f', color: '#fffefb', padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>Fair</span>;
    if (kind === 'low')  return <span style={{ background: '#a4493a', color: '#fffefb', padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>Below entitlement</span>;
    if (kind === 'high') return <span style={{ background: '#a4493a', color: '#fffefb', padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>Exceeds permissible</span>;
    return null;
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Developer offer review" title="Compare developer's offer to regulatory baseline">
        Upload the developer's offer letter (optional, for your records), then enter the rehab and sale areas they are proposing. We compare both against what the regulation actually permits.
      </SectionTitle>

      {/* Upload */}
      <div style={{ background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 6, padding: 22, marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8b3a2a', marginBottom: 10 }}>
          1. Upload developer offer (optional)
        </div>
        <label style={{ display: 'inline-block', padding: '10px 18px', background: '#8b3a2a', color: '#fffefb',
                        fontSize: 12, fontWeight: 600, borderRadius: 3, cursor: 'pointer' }}>
          Choose file
          <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFile} style={{ display: 'none' }} />
        </label>
        {input.devOfferFileName && (
          <span style={{ marginLeft: 14, fontSize: 12, color: '#3d3528' }}>
            📄 {input.devOfferFileName} <button onClick={() => update('devOfferFileName', '')}
              style={{ marginLeft: 8, padding: '2px 8px', fontSize: 10, background: 'transparent',
                       color: '#a4493a', border: '1px solid #d4c9b8', borderRadius: 3, cursor: 'pointer' }}>
              Remove
            </button>
          </span>
        )}
        <div style={{ marginTop: 8, fontSize: 11, color: '#6b5d47' }}>
          Stored only in your browser. Not uploaded anywhere. We don't read its contents — type the numbers below.
        </div>
      </div>

      {/* Inputs */}
      <div style={{ background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 6, padding: 22, marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8b3a2a', marginBottom: 14 }}>
          2. What the developer is proposing (sqft carpet)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="grid-2">
          <div>
            <label className="field-label">Rehab area offered to society</label>
            <input type="number" className="num" value={input.devOfferRehab}
                   onChange={e => update('devOfferRehab', parseFloat(e.target.value) || 0)} />
            <div className="help-text" style={{ fontSize: 10.5 }}>
              Total carpet area all members will get back (sum across all flats).
            </div>
          </div>
          <div>
            <label className="field-label">Sale area developer is keeping</label>
            <input type="number" className="num" value={input.devOfferSale}
                   onChange={e => update('devOfferSale', parseFloat(e.target.value) || 0)} />
            <div className="help-text" style={{ fontSize: 10.5 }}>
              Total free-sale carpet developer will sell on open market.
            </div>
          </div>
        </div>
      </div>

      {/* Comparison */}
      {(devRehab > 0 || devSale > 0) ? (
        <div style={{ background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 6, padding: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8b3a2a', marginBottom: 18 }}>
            3. Side-by-side comparison
          </div>

          {/* Rehab block */}
          <div style={{ padding: 18, background: '#fafaf5', borderRadius: 4, borderLeft: `4px solid ${tone(rehabVerdict)}`, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1815' }}>Rehab area to society members</div>
              <Pill kind={rehabVerdict} />
            </div>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ padding: '6px 0', color: '#6b5d47' }}>Your existing carpet area</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }} className="num">{fmt(existingCarpetSqft)} sqft</td></tr>
                <tr><td style={{ padding: '6px 0', color: '#6b5d47' }}>Developer offers as rehab</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }} className="num">{fmt(devRehab)} sqft</td></tr>
                <tr style={{ borderTop: '1px solid #e7dfd0' }}>
                    <td style={{ padding: '6px 0', color: '#6b5d47' }}>Regulatory entitlement (incentive share applied)</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#8b3a2a' }} className="num">{fmt(regRehabCarpetSqft)} sqft</td></tr>
                <tr style={{ borderTop: '1px solid #e7dfd0' }}>
                    <td style={{ padding: '8px 0 0', color: tone(rehabVerdict), fontWeight: 600 }}>
                      {rehabDelta >= 0 ? 'Above entitlement by' : 'Shortfall vs entitlement'}
                    </td>
                    <td style={{ padding: '8px 0 0', textAlign: 'right', fontWeight: 700, color: tone(rehabVerdict) }} className="num">
                      {fmt(Math.abs(rehabDelta))} sqft ({Math.abs(rehabDeltaPct).toFixed(1)}%)
                    </td></tr>
              </tbody>
            </table>
          </div>

          {/* Sale block */}
          <div style={{ padding: 18, background: '#fafaf5', borderRadius: 4, borderLeft: `4px solid ${tone(saleVerdict)}`, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1815' }}>Sale area to developer</div>
              <Pill kind={saleVerdict} />
            </div>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ padding: '6px 0', color: '#6b5d47' }}>Developer claims as sale</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }} className="num">{fmt(devSale)} sqft</td></tr>
                <tr><td style={{ padding: '6px 0', color: '#6b5d47' }}>Regulatory max sale (after rehab obligation)</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#8b3a2a' }} className="num">{fmt(regSaleCarpetSqft)} sqft</td></tr>
                <tr style={{ borderTop: '1px solid #e7dfd0' }}>
                    <td style={{ padding: '8px 0 0', color: tone(saleVerdict), fontWeight: 600 }}>
                      {saleDelta > 0 ? 'Exceeds regulatory max by' : 'Within regulatory max — surplus available'}
                    </td>
                    <td style={{ padding: '8px 0 0', textAlign: 'right', fontWeight: 700, color: tone(saleVerdict) }} className="num">
                      {fmt(Math.abs(saleDelta))} sqft ({Math.abs(saleDeltaPct).toFixed(1)}%)
                    </td></tr>
              </tbody>
            </table>
          </div>

          {/* Verdict */}
          <div style={{ marginTop: 18, padding: 16, background: 'rgba(139,58,42,0.05)', borderLeft: '3px solid #8b3a2a', borderRadius: 3, fontSize: 13, color: '#3d3528', lineHeight: 1.7 }}>
            <strong>Plain-English verdict.&nbsp;</strong>
            {rehabVerdict === 'ok' && saleVerdict === 'ok' &&
              "Developer's offer broadly matches what the regulation permits. Negotiate on corpus, transit rent, and timelines."}
            {rehabVerdict === 'low' && saleVerdict === 'ok' &&
              `Developer is offering you ${Math.abs(rehabDeltaPct).toFixed(0)}% less rehab than your regulatory entitlement. Push for at least ${fmt(regRehabCarpetSqft)} sqft total rehab.`}
            {rehabVerdict === 'ok' && saleVerdict === 'high' &&
              `Developer is claiming ${Math.abs(saleDeltaPct).toFixed(0)}% more sale area than the regulation permits. Either the math is wrong or the offer is overstated — ask for the line-by-line area statement.`}
            {rehabVerdict === 'low' && saleVerdict === 'high' &&
              `Developer is shortchanging you on rehab AND claiming more sale than regulation permits. Both line items need revision before signing anything.`}
            {' '}Have your architect verify against the official area statement before any GB resolution.
          </div>
        </div>
      ) : (
        <div style={{ padding: 28, textAlign: 'center', background: '#fafaf5', border: '1px dashed #d4c9b8', borderRadius: 6, color: '#6b5d47', fontSize: 13 }}>
          Enter the rehab and sale areas from your developer's offer above to see the comparison.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AREA STATEMENT — Proforma-A style, four-column form
// Build-up:
//   A. Plot
//   B. Existing BUA
//   C. Reg 33(7)(B) Incentive BUA
//   D. FSI build-up: Base + Premium + TDR  →  FSI BUA
//   E. + Fungible (Reg 31(3))              →  PERMISSIBLE BUA
//   F. Society / Member adjustments         →  Rehab + Sale split
// ============================================================================
function AreaStatement({ result, input, update }) {
  const verifyMode = isVerifyMode();
  const [verifyStore, setVerifyStore] = useState(() => loadVerifyStore());

  const setVerifyField = (key, field, val) => {
    setVerifyStore(prev => {
      const next = { ...prev, [key]: { ...(prev[key] || {}), [field]: val } };
      saveVerifyStore(next);
      return next;
    });
  };
  const clearVerifyStore = () => {
    setVerifyStore({});
    saveVerifyStore({});
  };

  const incentiveLabel = result.incentiveBasis === '15percent'
    ? '15% of existing BUA'
    : `10 sqm × ${result.residentialFlats} residential flats`;

  const rows = [
    // A.1 — Plot
    { isHeader: true, section: 'A.1', label: 'Plot area' },
    { label: 'Gross plot area', value: result.plotArea, unit: 'sqm', ref: 'Owner declaration', bold: true },

    // A.2 — Deductions per Reg 30(A)(2)
    { isHeader: true, section: 'A.2', label: 'Deductions for FSI base — Reg 30(A)(2)' },
    { kind: 'editable',
      label: 'Less: DP road set-back / Regular line',
      sublabel: 'Reg 16 + Reg 30(A)(2). Sum of: (a) area under proposed DP road, AND (b) area under sanctioned Regular Line of street per MMC Act 1888.',
      stateKey: 'dpRoadDeduction',
      ref: 'Reg 16, Reg 30(A)(2)' },
    ...(result.reg14Auto.applies || result.reg14Override
      ? [{
          label: result.reg14Override
            ? 'Less: Reg 14 amenity (manual override)'
            : `Less: Reg 14 amenity (auto, ${result.reg14Auto.reductionFactor < 1 ? 'reduced 35%' : 'full rate'})`,
          value: -result.reg14Deduction,
          unit: 'sqm',
          ref: 'Reg 14(A), Reg 30(A)(2)',
          formula: result.reg14Override
            ? 'manual'
            : (() => {
                const base = result.reg14Auto.baseAmenity || 0;
                const factor = result.reg14Auto.reductionFactor || 1;
                const offset = result.reg14ReservationOffset || 0;
                const bandStr = result.grossExclRoad <= 10000
                  ? `${fmt(result.grossExclRoad)} sqm × 5%`
                  : `500 + 10% × (${fmt(result.grossExclRoad)} − 10,000)`;
                const factorStr = factor < 1 ? ` × ${factor} (35% reduction)` : '';
                const baseResult = `${bandStr}${factorStr} = ${fmt(base * factor)} sqm`;
                const offsetStr = offset > 0
                  ? ` − ${fmt(offset)} sqm DP reservation offset (Reg 14(A)(a)/(b)) = ${fmt(result.reg14EffectiveArea)} sqm net`
                  : '';
                return baseResult + offsetStr;
              })()
        }]
      : [{
          label: 'Less: Reg 14 amenity',
          value: 0, unit: 'sqm', ref: 'Reg 14(A)',
          formula: result.reg14Auto.reason,
          italic: true,
        }]),
    { kind: 'editable',
      label: 'Less: DP reservation handover',
      sublabel: 'Reg 17 + Reg 30(A)(2). Enter the reservation area NET deducted from FSI plot. Plain surrender = full reservation area; AR development = only the Y% handed over.',
      stateKey: 'reservationDeduction',
      ref: 'Reg 17, Reg 30(A)(2)' },

    // A.3 — Net plot
    { isHeader: true, section: 'A.3', label: 'Net plot area for FSI computation' },
    { label: 'Net plot area = Gross − all deductions',
      value: result.netPlot, unit: 'sqm', ref: 'Reg 30(A)(2)', bold: true, highlight: true },

    // A.4 — Site-planning constraints (informational, not FSI deductions)
    ...(result.losRequirement.applies || result.losOverride
      ? [{ isHeader: true, section: 'A.4', label: 'Site-planning constraints (informational — not FSI deductions)' },
         { label: result.losOverride
             ? `Reg 27 LOS area (manual override) on net plot`
             : `Reg 27 Layout Open Space @ ${result.losRequirement.percent}% (${result.losRequirement.band})`,
           value: result.losActualArea, unit: 'sqm', ref: 'Reg 27',
           formula: result.losOverride ? 'manual' : `${fmt(result.netPlot)} × ${result.losRequirement.percent}%`,
           italic: true }]
      : []),
    ...(result.reg15Flag
      ? [{ label: 'Reg 15 Inclusive Housing — 20% handover (FSI loadable on balance)',
           value: result.reg15Flag.handoverArea, unit: 'sqm', ref: 'Reg 15',
           italic: true }]
      : []),

    // B — Existing
    { isHeader: true, section: 'B', label: 'Existing built-up area (rehab base)' },
    { label: 'Existing authorised BUA', value: result.existingBua, unit: 'sqm', ref: 'OC / approved plans', bold: true },
    { label: 'Total residential tenements', value: result.residentialFlats, unit: 'flats', ref: 'Society records' },
    { label: 'Total tenements (incl. commercial)', value: result.totalFlats, unit: 'flats', ref: '—' },

    // C — Incentive
    { isHeader: true, section: 'C', label: 'Reg 33(7)(B) Incentive BUA — free of premium' },
    { label: '15% of existing BUA', value: result.incentive15Pct, unit: 'sqm', ref: 'Reg 33(7)(B)' },
    { label: `10 sqm × ${result.residentialFlats} residential flats`,
      value: result.incentivePerTenement, unit: 'sqm', ref: 'Reg 33(7)(B)' },
    { label: `Incentive BUA = greater of above (${incentiveLabel})`,
      value: result.incentiveBua, unit: 'sqm', ref: 'Reg 33(7)(B)', bold: true, highlight: true },

    // D — FSI build-up (Reg 30 / Table 12)
    { isHeader: true, section: 'D',
      label: `FSI build-up — Reg 30 / Table 12 (Road ${result.roadWideningApplied ? `${result.rawRoadWidth}m → widened to 9m per DP (Table 12 Note 1)` : `${result.rawRoadWidth || input.roadWidth}m`}, ${input.location === 'islandCity' ? 'Island City' : 'Suburbs'})` },
    { label: 'Base FSI on net plot', value: result.fsiSlab.basic, unit: 'index', ref: 'Reg 30 / Table 12, Col 4' },
    { label: 'Base FSI BUA = Net plot × Base FSI',
      value: result.baseFsiBua, unit: 'sqm', ref: '—',
      formula: `${fmt(result.netPlot)} × ${result.fsiSlab.basic.toFixed(2)}` },
    { label: 'In-situ FSI for area handed over to MCGM (Reg 30(A)(2))',
      value: result.inSituFsiBua, unit: 'sqm', ref: 'Reg 30(A)(2) / Reg 16',
      formula: result.inSituFsiEligible === false
        ? (result.inSituFsiDeniedReason || 'Not available under this scheme per Reg 16')
        : (result.inSituFsiBua > 0
            ? `(${fmt(result.dpRoadDeduction)} DP road + ${fmt(result.reservationDeduction)} reservation) × ${result.fsiSlab.basic.toFixed(2)} FSI`
            : 'No area handed over'),
      italic: result.inSituFsiBua === 0 },
    { label: 'Premium FSI (additional, on payment)', value: result.fsiSlab.premium, unit: 'index', ref: 'Reg 30 / Table 12, Col 5' },
    { label: 'Premium FSI BUA available = Net plot × Premium FSI',
      value: result.premiumFsiBua, unit: 'sqm', ref: 'Reg 30(A)(6)',
      formula: `${fmt(result.netPlot)} × ${result.fsiSlab.premium.toFixed(2)}`,
      italic: true },
    { kind: 'slider',
      label: 'Premium FSI loading',
      sublabel: 'How much of the available Premium FSI to actually purchase',
      ref: 'Reg 30(A)(6)',
      stateKey: 'premiumFsiLoad',
      availableSqm: result.premiumFsiBua,
      disabled: result.premiumFsiBua === 0,
      disabledReason: 'No premium FSI available at this road width' },
    { label: `→ Premium FSI BUA loaded into computation (${((result.premiumLoad ?? 1) * 100).toFixed(0)}% of available)`,
      value: result.premiumFsiBuaLoaded, unit: 'sqm', ref: 'Reg 30(A)(6)',
      formula: `${fmt(result.premiumFsiBua)} × ${((result.premiumLoad ?? 1) * 100).toFixed(0)}%`,
      bold: true },
    { label: 'TDR loading (admissible)', value: result.fsiSlab.tdr, unit: 'index', ref: 'Reg 30 / Table 12, Col 6' },
    { label: 'TDR BUA available = Net plot × TDR',
      value: result.tdrBua, unit: 'sqm', ref: 'Reg 32',
      formula: `${fmt(result.netPlot)} × ${result.fsiSlab.tdr.toFixed(2)}`,
      italic: true },
    { kind: 'slider',
      label: 'TDR loading',
      sublabel: 'How much TDR to purchase and load onto your plot',
      ref: 'Reg 32',
      stateKey: 'tdrLoad',
      availableSqm: result.tdrBua,
      disabled: result.tdrBua === 0,
      disabledReason: 'No TDR loading available at this road width' },
    { label: `→ TDR BUA loaded into computation (${((result.tdrLoadFactor ?? 1) * 100).toFixed(0)}% of available)`,
      value: result.tdrBuaLoaded, unit: 'sqm', ref: 'Reg 32',
      formula: `${fmt(result.tdrBua)} × ${((result.tdrLoadFactor ?? 1) * 100).toFixed(0)}%`,
      bold: true },
    { label: 'Maximum FSI ceiling (Base + Premium + TDR, full loadings)',
      value: result.fsiSlab.basic + result.fsiSlab.premium + result.fsiSlab.tdr,
      unit: 'index', ref: 'Reg 30 / Table 12, Col 7', italic: true },
    { label: 'FSI BUA at ceiling = Net plot × Max FSI (reference only)',
      value: result.ceilingBua, unit: 'sqm', ref: '—',
      formula: `${fmt(result.netPlot)} × ${(result.fsiSlab.basic + result.fsiSlab.premium + result.fsiSlab.tdr).toFixed(2)}`, italic: true },

    // D₂ — Governing FSI BUA at user's selected loadings
    { isHeader: true, section: 'D₂', label: 'Governing FSI BUA at your selected loadings' },
    { label: 'Existing + Incentive (rehab-base path)',
      value: result.rehabBasePath, unit: 'sqm', ref: 'B + C',
      formula: `${fmt(result.existingBua)} + ${fmt(result.incentiveBua)}` },
    { label: `Reg 30 path at chosen loadings = Base + (Premium × ${((result.premiumLoad ?? 1) * 100).toFixed(0)}%) + (TDR × ${((result.tdrLoadFactor ?? 1) * 100).toFixed(0)}%)`,
      value: result.reg30PathLoaded, unit: 'sqm', ref: 'Reg 30(A) + 33(7)(B) proviso' },
    { label: 'Governing FSI BUA = max of above',
      value: result.fsiBua, unit: 'sqm', ref: result.rehabPathGoverns ? 'Rehab-base governs' : 'Reg 30 path governs',
      bold: true, highlight: true },
    { label: 'Maximum possible FSI BUA (full loadings, for reference)',
      value: result.fsiBuaMax, unit: 'sqm', ref: '—', italic: true },

    // E — Fungible (Reg 31(3): 35% over and above FSI BUA)
    { isHeader: true, section: 'E', label: 'Fungible Compensatory Area — Reg 31(3)' },
    { label: 'Fungible rate (residential)', value: '35%', unit: '', ref: 'Reg 31(3)' },
    { label: 'Fungible available = FSI BUA × 35%',
      value: result.fsiBua * 0.35, unit: 'sqm', ref: 'Reg 31(3)',
      formula: `${fmt(result.fsiBua)} × 35%`, italic: true },
    { kind: 'slider',
      label: 'Fungible loading',
      sublabel: '35% of FSI BUA, over and above admissible FSI',
      ref: 'Reg 31(3)',
      stateKey: 'fungibleLoad',
      availableSqm: result.fsiBua * 0.35,
      disabled: false },
    { label: `Fungible loaded into computation (${((result.fungibleLoadFactor ?? 1) * 100).toFixed(0)}% of available)`,
      value: result.fungibleArea, unit: 'sqm', ref: 'Reg 31(3)',
      formula: `${fmt(result.fsiBua * 0.35)} × ${((result.fungibleLoadFactor ?? 1) * 100).toFixed(0)}%`,
      bold: true, highlight: true },
    { label: 'Premium treatment (Reg 31(3) proviso for 33(7)(B))',
      value: '—', unit: '',
      ref: 'Reg 31(3)',
      formula: `Portion on existing/rehab BUA = FREE; portion on incentive + sale = premium @ 50% ASR (residential). See Premium Recovery Sheet below for amount.`,
      italic: true },
    { label: 'Maximum possible Fungible (at 100% loading, reference)',
      value: result.fungibleAreaMax, unit: 'sqm', ref: '—', italic: true },

    // F — Permissible BUA
    { isHeader: true, section: 'F', label: 'Permissible BUA = FSI BUA + Fungible' },
    { label: 'Permissible BUA at your settings',
      value: result.permissibleBua, unit: 'sqm', ref: 'D₂ + E', bold: true, highlight: true },
    { label: 'Maximum possible Permissible BUA',
      value: result.permissibleBuaMax, unit: 'sqm', ref: '—', italic: true },

    // G — Society & member adjustments
    { isHeader: true, section: 'G', label: 'Society & member adjustments' },
    { label: 'Member-side rehab base = Existing BUA',
      value: result.existingBua, unit: 'sqm', ref: 'Reg 33(7)(B)' },
    { label: `Member share of Incentive BUA (${(result.memberIncentiveShare * 100).toFixed(0)}%)`,
      value: result.incentiveBua * result.memberIncentiveShare, unit: 'sqm', ref: 'GB Resolution' },
    { label: 'Total rehab to existing members',
      value: result.memberSideRehabBua, unit: 'sqm', ref: '—', bold: true },
    { label: 'Developer share of Incentive BUA',
      value: result.developerSideIncentive, unit: 'sqm', ref: 'GB Resolution' },
    { label: 'Sale BUA available to developer',
      value: result.saleBua, unit: 'sqm', ref: 'F − rehab', bold: true, highlight: true },
  ];

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Detailed working" title="Area statement with regulation references">
        Built up in the order an architect reads it: plot → existing → incentive → FSI build-up → fungible → permissible BUA → member adjustments.
      </SectionTitle>

      {verifyMode && (
        <div className="no-print" style={{ marginBottom: 12, padding: '10px 14px',
                                            background: '#fff8e6', border: '1px solid #d4b75a',
                                            borderRadius: 4, fontSize: 12, color: '#5a4a1a',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>
            <strong>Verification mode active.</strong> Type expected values from your approved area statement into the Expected column.
            Δ% &gt; 1.0 will flag in red. Values persist in localStorage.
          </span>
          <button onClick={clearVerifyStore}
                  style={{ padding: '4px 10px', fontSize: 11, background: '#fffefb',
                           border: '1px solid #d4b75a', borderRadius: 3, cursor: 'pointer',
                           color: '#5a4a1a' }}>
            Clear all
          </button>
        </div>
      )}

      <div style={{ background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 4, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f0e9dd', borderBottom: '1px solid #e7dfd0' }}>
              <th style={th}>#</th>
              <th style={{ ...th, textAlign: 'left' }}>Item</th>
              <th style={{ ...th, textAlign: 'right' }}>Value</th>
              <th style={{ ...th, textAlign: 'left', width: 70 }}>Unit</th>
              <th style={{ ...th, textAlign: 'left' }}>Reference</th>
              {verifyMode && <th style={{ ...th, textAlign: 'right', width: 120 }}>Expected</th>}
              {verifyMode && <th style={{ ...th, textAlign: 'left', width: 160 }}>Δ / Source</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const colCount = verifyMode ? 7 : 5;
              if (row.isHeader) {
                return (
                  <tr key={i} style={{ background: 'rgba(139, 58, 42, 0.06)' }}>
                    <td colSpan={colCount} style={{ padding: '10px 18px', fontSize: 11,
                                             letterSpacing: '0.12em', textTransform: 'uppercase',
                                             color: '#8b3a2a', fontWeight: 700 }}>
                      {row.section} — {row.label}
                    </td>
                  </tr>
                );
              }
              if (row.kind === 'slider') {
                const currentVal = input[row.stateKey] ?? 1;
                const pct = Math.round(currentVal * 100);
                const loadedSqm = (row.availableSqm || 0) * currentVal;
                return (
                  <tr key={i} className="no-print" style={{ borderBottom: '1px solid #f5efe2',
                                       background: 'rgba(192, 140, 48, 0.04)' }}>
                    <td style={{ ...td, color: '#a89c87', fontSize: 10 }} className="num">{i + 1}</td>
                    <td style={{ ...td }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#8b3a2a', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#8b3a2a', color: '#fffefb', padding: '2px 6px', borderRadius: 2 }}>SLIDER</span>
                        {row.label}
                      </div>
                      {row.sublabel && (
                        <div style={{ fontSize: 11, color: '#6b5d47', marginTop: 3 }}>{row.sublabel}</div>
                      )}
                    </td>
                    <td colSpan={verifyMode ? 5 : 3} style={{ ...td, paddingTop: 10, paddingBottom: 10 }}>
                      {row.disabled ? (
                        <div style={{ fontSize: 11, color: '#a89c87', fontStyle: 'italic' }}>
                          {row.disabledReason || 'Not available'}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={currentVal}
                            onChange={e => update(row.stateKey, parseFloat(e.target.value))}
                            style={{ flex: 1, accentColor: '#8b3a2a', minWidth: 200 }}
                          />
                          <div style={{ minWidth: 180, textAlign: 'right' }}>
                            <div className="num" style={{ fontSize: 13, fontWeight: 700, color: '#8b3a2a' }}>
                              {fmt(loadedSqm)} <span style={{ fontSize: 10, fontWeight: 500, color: '#6b5d47' }}>/ {fmt(row.availableSqm)} sqm</span>
                            </div>
                            <div className="num" style={{ fontSize: 10.5, color: '#6b5d47' }}>{pct}% loaded · Ref: {row.ref}</div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              }
              if (row.kind === 'editable') {
                const rawVal = input[row.stateKey];
                const displayVal = rawVal === undefined || rawVal === null ? '' : rawVal;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f5efe2',
                                       background: 'rgba(192, 140, 48, 0.04)' }}>
                    <td style={{ ...td, color: '#a89c87', fontSize: 10 }} className="num">{i + 1}</td>
                    <td style={{ ...td, fontWeight: 400, color: '#3d3528' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#8b3a2a', color: '#fffefb', padding: '2px 6px', borderRadius: 2 }}>EDIT</span>
                        <span>{row.label}</span>
                      </div>
                      {row.sublabel && (
                        <div style={{ fontSize: 11, color: '#6b5d47', marginTop: 4, lineHeight: 1.4 }}>{row.sublabel}</div>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                        <span className="num" style={{ fontSize: 13, color: '#a4493a', fontWeight: 500 }}>−</span>
                        <input
                          type="number"
                          value={displayVal}
                          min="0"
                          step="any"
                          onChange={e => {
                            const v = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            update(row.stateKey, Number.isNaN(v) ? 0 : v);
                          }}
                          className="num"
                          style={{ width: 110, padding: '5px 8px', fontSize: 13, fontWeight: 600,
                                   background: '#fffefb', border: '1px solid #c9b896', color: '#a4493a',
                                   borderRadius: 3, textAlign: 'right' }}
                        />
                      </div>
                    </td>
                    <td style={{ ...td, fontSize: 11, color: '#6b5d47' }} className="num">{row.unit || 'sqm'}</td>
                    <td style={{ ...td, fontSize: 10.5, color: '#8b3a2a' }} className="num">{row.ref}</td>
                    {verifyMode && (<>
                      <td style={{ ...td }}>—</td>
                      <td style={{ ...td }}>—</td>
                    </>)}
                  </tr>
                );
              }
              const isNeg = typeof row.value === 'number' && row.value < 0;
              const rowKey = `r-${i}-${(row.label || '').slice(0, 40)}`;
              const vEntry = verifyStore[rowKey] || {};
              const expectedRaw = vEntry.expected;
              const sourceRaw = vEntry.source || '';
              const calcNum = typeof row.value === 'number' ? row.value : null;
              const expectedNum = expectedRaw !== undefined && expectedRaw !== '' ? Number(expectedRaw) : null;
              const delta = calcNum !== null && expectedNum !== null ? verifyDelta(calcNum, expectedNum) : null;
              const flag = delta !== null && Math.abs(delta) > 1.0;
              const isNumericRow = typeof row.value === 'number';
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f5efe2',
                                     background: row.highlight ? 'rgba(139, 58, 42, 0.04)' : 'transparent',
                                     opacity: row.italic ? 0.8 : 1 }}>
                  <td style={{ ...td, color: '#a89c87', fontSize: 10 }} className="num">{i + 1}</td>
                  <td style={{ ...td, fontWeight: row.bold ? 600 : 400,
                               color: row.bold ? '#1a1815' : '#3d3528',
                               fontStyle: row.italic ? 'italic' : 'normal' }}>
                    {row.label}
                    {row.formula && (
                      <div className="num" style={{ fontSize: 10.5, color: '#a89c87',
                                                    marginTop: 2, fontWeight: 400 }}>
                        = {row.formula}
                      </div>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: 'right',
                               fontWeight: row.bold ? 700 : 500,
                               color: row.highlight ? '#8b3a2a' : isNeg ? '#a4493a' : '#1a1815' }}
                      className="num">
                    {typeof row.value === 'number'
                      ? fmt(row.value, row.value < 10 && row.value > 0 ? 2 : 0)
                      : (row.value || '—')}
                  </td>
                  <td style={{ ...td, fontSize: 11, color: '#6b5d47' }} className="num">{row.unit}</td>
                  <td style={{ ...td, fontSize: 10.5, color: '#8b3a2a' }} className="num">{row.ref}</td>
                  {verifyMode && (
                    <td style={{ ...td, textAlign: 'right', padding: '4px 8px' }}>
                      {isNumericRow ? (
                        <input
                          type="number"
                          value={expectedRaw ?? ''}
                          onChange={e => setVerifyField(rowKey, 'expected', e.target.value)}
                          placeholder="—"
                          className="num"
                          style={{ width: 100, padding: '4px 6px', fontSize: 12,
                                   background: '#fffefb', border: '1px solid #d4c9b8',
                                   borderRadius: 3, textAlign: 'right' }} />
                      ) : <span style={{ color: '#a89c87' }}>—</span>}
                    </td>
                  )}
                  {verifyMode && (
                    <td style={{ ...td, padding: '4px 8px', fontSize: 11 }}>
                      {isNumericRow && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {delta !== null && (
                            <div className="num" style={{
                              fontSize: 11, fontWeight: 600,
                              color: flag ? '#a4493a' : '#3a7a4a',
                            }}>
                              {flag ? '⚠ ' : '✓ '}
                              {delta > 0 ? '+' : ''}{delta.toFixed(2)}%
                            </div>
                          )}
                          <input
                            type="text"
                            value={sourceRaw}
                            onChange={e => setVerifyField(rowKey, 'source', e.target.value)}
                            placeholder="source note"
                            style={{ width: '100%', padding: '3px 6px', fontSize: 10.5,
                                     background: '#fffefb', border: '1px solid #d4c9b8',
                                     borderRadius: 3, fontStyle: 'italic', color: '#6b5d47' }} />
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// MEMBER ENTITLEMENT (with adjustable GB resolution split)
// ============================================================================
function MemberEntitlement({ breakdown, input, update }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Per-member entitlement" title="What each member can expect">
        Minimum guarantee under 33(7)(B) is existing carpet area for each member.
        Realistic expectation depends on what fraction of the incentive BUA the General Body resolves to allocate to members.
      </SectionTitle>

      <div className="no-print" style={{ marginBottom: 16, padding: 16,
                                          background: 'rgba(139, 58, 42, 0.04)',
                                          border: '1px solid #e7dfd0', borderRadius: 4 }}>
        <label className="field-label">
          Member share of Incentive BUA — set this per your draft GB resolution
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <input type="range" min="0" max="100" step="5"
                 value={input.memberIncentiveShare}
                 onChange={e => update('memberIncentiveShare', parseInt(e.target.value))}
                 style={{ flex: 1, accentColor: '#8b3a2a' }} />
          <div className="num" style={{ fontSize: 18, fontWeight: 700, color: '#8b3a2a',
                                        minWidth: 60, textAlign: 'right' }}>
            {input.memberIncentiveShare}%
          </div>
        </div>
        <div className="help-text">
          Typical range: 70–90% to members. The remainder accrues to the developer's sale component.
          0% means society retains nothing of the incentive; 100% means society keeps it all (and developer monetises only via Premium FSI / TDR loading).
        </div>
      </div>

      <div style={{ background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 4, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f0e9dd' }}>
              <th style={th}>Flat type</th>
              <th style={{ ...th, textAlign: 'right' }}>Count</th>
              <th style={{ ...th, textAlign: 'right' }}>Existing carpet</th>
              <th style={{ ...th, textAlign: 'right' }}>Minimum guaranteed</th>
              <th style={{ ...th, textAlign: 'right' }}>Realistic expectation</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((b, i) => (
              <tr key={i} style={{ borderTop: '1px solid #f0e9dd' }}>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{b.label}</div>
                  <div style={{ fontSize: 10, color: '#a89c87', textTransform: 'uppercase',
                                letterSpacing: '0.06em', marginTop: 2 }}>{b.use}</div>
                </td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{b.count}</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">
                  {fmt(b.existingCarpet)} sqm
                  <div style={{ fontSize: 10, color: '#a89c87' }}>≈ {fmtSqft(b.existingCarpet)} sqft</div>
                </td>
                <td style={{ ...td, textAlign: 'right' }} className="num">
                  {fmt(b.minGuaranteed)} sqm
                  <div style={{ fontSize: 10, color: '#a89c87' }}>≈ {fmtSqft(b.minGuaranteed)} sqft</div>
                </td>
                <td style={{ ...td, textAlign: 'right', background: 'rgba(139, 58, 42, 0.04)' }} className="num">
                  <span style={{ fontWeight: 700, color: '#8b3a2a' }}>
                    {fmt(b.realisticLow)}–{fmt(b.realisticHigh)} sqm
                  </span>
                  <div style={{ fontSize: 10, color: '#a89c87' }}>
                    ≈ {fmtSqft(b.realisticLow)}–{fmtSqft(b.realisticHigh)} sqft
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// WATCH OUT FOR
// ============================================================================
// ============================================================================
// SLUM FLAG — informational only, when user toggles "slum on plot"
// ============================================================================
function SlumFlag() {
  return (
    <div style={{
      background: 'rgba(192, 140, 48, 0.08)',
      border: '1px solid rgba(192, 140, 48, 0.3)',
      borderLeft: '3px solid #c08c30',
      borderRadius: 4,
      padding: 18,
      marginBottom: 24,
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <AlertTriangle size={18} color="#c08c30" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1815' }}>
            Slum encroachment on plot — separate analysis required
          </div>
          <div style={{ fontSize: 12.5, color: '#3d3528', marginTop: 6, lineHeight: 1.55 }}>
            If part of your plot has slum encroachment, that portion is governed by Reg 33(10) — not 33(7)(B). Each eligible slum dweller (cut-off 1.1.2000) is entitled to a 27.88 sqm rehab tenement, with sale-component math determined by the SRA on a case-specific basis. This platform does not compute the slum portion. Engage an SRA consultant; the slum side significantly affects developer economics for the whole plot.
          </div>
          <div className="num" style={{ fontSize: 10, color: '#6b5d47', marginTop: 8, letterSpacing: '0.04em' }}>
            [Reg 33(10) — Slum Rehabilitation Scheme]
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CLUSTER RESULT — Reg 33(9)
// ============================================================================
function ClusterResult({ result, input }) {
  const r = result;

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Cluster scheme output" title="Cluster development under Reg 33(9)">
        FSI 4.00 ceiling on the aggregate cluster plot, OR rehab + 50% incentive — whichever is more.
      </SectionTitle>

      <div style={{ background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 6, padding: 28 }}>
        {/* Headline */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 24 }} className="grid-2">
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8b3a2a', fontWeight: 600, marginBottom: 6 }}>
              Permissible BUA
            </div>
            <div className="num serif" style={{ fontSize: 36, fontWeight: 700, color: '#1a1815', lineHeight: 1 }}>
              {fmt(r.permissibleBua)} <span style={{ fontSize: 14, fontWeight: 500, color: '#6b5d47' }}>sqm</span>
            </div>
            <div className="num" style={{ fontSize: 14, color: '#6b5d47', marginTop: 4 }}>
              ≈ {fmtSqft(r.permissibleBua)} sq ft
            </div>
            <div className="num" style={{ fontSize: 12, color: '#6b5d47', marginTop: 8 }}>
              Effective FSI: {r.effFsi.toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b5d47', fontWeight: 600, marginBottom: 6 }}>
              Sale to developer
            </div>
            <div className="num serif" style={{ fontSize: 36, fontWeight: 700, color: '#8b3a2a', lineHeight: 1 }}>
              {fmt(r.saleBua)} <span style={{ fontSize: 14, fontWeight: 500, color: '#6b5d47' }}>sqm</span>
            </div>
            <div className="num" style={{ fontSize: 14, color: '#6b5d47', marginTop: 4 }}>
              ≈ {fmtSqft(r.saleBua)} sq ft
            </div>
            <div className="num" style={{ fontSize: 12, color: '#6b5d47', marginTop: 8 }}>
              Sale-to-rehab ratio: {r.viabilityRatio.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Math breakdown */}
        <div style={{ background: '#fafaf5', border: '1px solid #e7dfd0', borderRadius: 4, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f0e9dd' }}>
                <th style={th}>Cluster computation</th>
                <th style={{ ...th, textAlign: 'right' }}>Value</th>
                <th style={{ ...th, textAlign: 'left', width: 70 }}>Unit</th>
                <th style={{ ...th, textAlign: 'left' }}>Reference</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f5efe2' }}>
                <td style={td}>Aggregate cluster plot area</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{fmt(r.clusterPlot)}</td>
                <td style={td} className="num">sqm</td>
                <td style={td} className="num" /></tr>
              <tr style={{ borderBottom: '1px solid #f5efe2' }}>
                <td style={td}>Number of buildings in cluster</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{r.clusterBuildings}</td>
                <td style={td} className="num" />
                <td style={td} className="num">User input</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f5efe2' }}>
                <td style={td}>Aggregate existing BUA</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{fmt(r.rehabBase)}</td>
                <td style={td} className="num">sqm</td>
                <td style={td} className="num">Society records</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f5efe2' }}>
                <td style={td}>Aggregate residential apartments</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{r.clusterApartments}</td>
                <td style={td} className="num" />
                <td style={td} className="num" /></tr>
              <tr style={{ background: '#fffefb', borderBottom: '1px solid #f5efe2' }}>
                <td style={{ ...td, fontWeight: 600 }}>Cluster minimum check</td>
                <td style={{ ...td, textAlign: 'right', color: r.meetsMinimum ? '#5a7a4f' : '#a4493a' }} className="num">
                  {r.meetsMinimum ? '✓ Meets' : '✗ Below'}
                </td>
                <td style={td} className="num">{r.minClusterArea} sqm min</td>
                <td style={td} className="num">Reg 33(9) cl 1.1</td>
              </tr>
              <tr style={{ background: 'rgba(139, 58, 42, 0.04)' }}>
                <td colSpan={4} style={{ padding: '10px 18px', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8b3a2a', fontWeight: 700 }}>
                  Computation
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f5efe2' }}>
                <td style={td}>FSI 4.00 ceiling = Cluster plot × 4.00</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{fmt(r.ceilingBua)}</td>
                <td style={td} className="num">sqm</td>
                <td style={td} className="num">Reg 33(9) opening</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f5efe2' }}>
                <td style={td}>Rehab + 50% incentive = Existing BUA × 1.5</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{fmt(r.rehabBase + r.incentiveBua)}</td>
                <td style={td} className="num">sqm</td>
                <td style={td} className="num">Reg 33(9) Appendix</td>
              </tr>
              <tr style={{ background: 'rgba(139, 58, 42, 0.06)', borderBottom: '1px solid #f5efe2' }}>
                <td style={{ ...td, fontWeight: 700 }}>
                  Governing FSI BUA = MAX of above
                  <div className="num" style={{ fontSize: 10.5, color: '#a89c87', marginTop: 2, fontWeight: 400 }}>
                    {r.ceilingGoverns ? '→ Ceiling governs (4.00 × cluster plot is higher)' : '→ Rehab+Incentive governs (existing BUA so high it exceeds 4.00 ceiling)'}
                  </div>
                </td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#8b3a2a' }} className="num">{fmt(r.schemeFsiBua)}</td>
                <td style={td} className="num">sqm</td>
                <td style={td} className="num">Reg 33(9) opening</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f5efe2' }}>
                <td style={td}>+ Fungible Compensatory Area @ 35% (Reg 31(3))</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{fmt(r.fungibleArea)}</td>
                <td style={td} className="num">sqm</td>
                <td style={td} className="num">Reg 31(3)</td>
              </tr>
              <tr style={{ background: 'rgba(139, 58, 42, 0.08)' }}>
                <td style={{ ...td, fontWeight: 700 }}>Permissible BUA</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, fontSize: 16, color: '#8b3a2a' }} className="num">{fmt(r.permissibleBua)}</td>
                <td style={td} className="num">sqm</td>
                <td style={td} className="num">—</td>
              </tr>
              <tr style={{ background: '#fafaf5' }}>
                <td colSpan={4} style={{ padding: '10px 18px', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b5d47', fontWeight: 700 }}>
                  Rehab vs sale split
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f5efe2' }}>
                <td style={td}>Rehab to existing members across all societies</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{fmt(r.rehabBase)}</td>
                <td style={td} className="num">sqm</td>
                <td style={td} className="num">—</td>
              </tr>
              <tr>
                <td style={{ ...td, fontWeight: 700 }}>Sale BUA available to developer</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#8b3a2a' }} className="num">{fmt(r.saleBua)}</td>
                <td style={td} className="num">sqm</td>
                <td style={td} className="num">Permissible − Rehab</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Viability verdict */}
        <div style={{ marginTop: 16, padding: '14px 18px', background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 4, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 7, flexShrink: 0, background: !r.meetsMinimum ? '#a4493a' : r.viabilityRatio < 0.6 ? '#c08c30' : '#3d5a4d' }} />
          <div>
            <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b5d47', fontWeight: 600 }}>
              Cluster viability — {r.viabilityRating}
            </div>
            <div style={{ fontSize: 13.5, color: '#1a1815', marginTop: 4, lineHeight: 1.55 }}>{r.viabilityNote}</div>
          </div>
        </div>

        {/* Disclosure */}
        <div style={{ marginTop: 12, padding: '12px 14px', background: 'rgba(139, 58, 42, 0.03)', borderLeft: '3px solid #8b3a2a', borderRadius: 2, fontSize: 12, color: '#3d3528', lineHeight: 1.6 }}>
          <strong>Honest disclosure:</strong> This computation uses aggregate cluster inputs you provided. The standard incentive rate (50%) and 4.00 FSI ceiling are encoded per Reg 33(9). The actual scheme allows variations (60–70% incentive bands at higher consent levels and additional dwellings density) that we have not modelled in MVP. For a stamped feasibility, engage a Licensed Architect with prior cluster experience.
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SCHEME COMPARISON — side-by-side 33(7)(B) vs Cluster 33(9)
// Renders only when both schemes are eligible
// ============================================================================
function SchemeComparison({ r1, r2 }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Sensitivity comparison" title="Standalone vs Cluster — side by side">
        Direct comparison of the two schemes available to your society. Cluster requires neighbour-society coordination but typically yields more.
      </SectionTitle>

      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ComparisonCard
          title="Standalone — Reg 33(7)(B)"
          subtitle="Just your society redeveloping on its own"
          permissibleBua={r1.permissibleBua}
          rehab={r1.memberSideRehabBua}
          sale={r1.saleBua}
          fsi={r1.effFsi}
          viability={r1.viabilityRating}
          colour="#6b5d47"
        />
        <ComparisonCard
          title="Cluster — Reg 33(9)"
          subtitle="Combined with neighbouring societies"
          permissibleBua={r2.permissibleBua}
          rehab={r2.rehabBase}
          sale={r2.saleBua}
          fsi={r2.effFsi}
          viability={r2.viabilityRating}
          colour="#8b3a2a"
          highlight={r2.permissibleBua > r1.permissibleBua}
        />
      </div>

      {/* Delta */}
      <div style={{ marginTop: 12, padding: '14px 18px', background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 4, fontSize: 13, color: '#1a1815', lineHeight: 1.6 }}>
        <strong>Cluster advantage:</strong>{' '}
        {r2.permissibleBua > r1.permissibleBua ? (
          <>Cluster yields <span className="num" style={{ fontWeight: 700, color: '#8b3a2a' }}>{fmt(r2.permissibleBua - r1.permissibleBua)} sqm</span> more permissible BUA than standalone — a {(((r2.permissibleBua / r1.permissibleBua) - 1) * 100).toFixed(0)}% uplift. Coordination cost is real but math is favourable.</>
        ) : (
          <>Standalone 33(7)(B) is competitive with or better than cluster math at the inputs given. Verify cluster plot data — usually cluster wins when aggregate plot is meaningfully larger than your standalone plot.</>
        )}
      </div>
    </div>
  );
}

function ComparisonCard({ title, subtitle, permissibleBua, rehab, sale, fsi, viability, colour, highlight }) {
  return (
    <div style={{
      padding: 22,
      borderRadius: 6,
      background: highlight ? 'rgba(139, 58, 42, 0.04)' : '#fffefb',
      border: `1px solid ${highlight ? colour : '#e7dfd0'}`,
      position: 'relative',
    }}>
      {highlight && (
        <div style={{ position: 'absolute', top: -10, left: 16, background: colour, color: 'white', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 2, letterSpacing: '0.08em' }}>HIGHER YIELD</div>
      )}
      <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: colour, lineHeight: 1.2 }}>{title}</div>
      <div style={{ fontSize: 11.5, color: '#6b5d47', marginTop: 4 }}>{subtitle}</div>

      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #e7dfd0' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b5d47', marginBottom: 4 }}>Permissible BUA</div>
        <div className="num" style={{ fontSize: 24, fontWeight: 700, color: '#1a1815', lineHeight: 1 }}>
          {fmt(permissibleBua)} <span style={{ fontSize: 12, fontWeight: 500, color: '#6b5d47' }}>sqm</span>
        </div>
        <div className="num" style={{ fontSize: 12, color: '#6b5d47', marginTop: 4 }}>≈ {fmtSqft(permissibleBua)} sq ft · FSI {fsi.toFixed(2)}</div>
      </div>

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #e7dfd0', display: 'grid', gap: 8 }}>
        <Row label="Rehab to members" value={`${fmt(rehab)} sqm`} />
        <Row label="Sale to developer" value={`${fmt(sale)} sqm`} highlight />
        <Row label="Viability" value={viability} muted />
      </div>
    </div>
  );
}

// ============================================================================
// PREMIUM RECOVERY PANEL — Proforma-A Premium Sheet
// Shows itemised premiums payable to MCGM / Govt / MSRDC
// Source: MCGM circulars FY 2023-24; GR 14.01.2021; CHE/DP/03450
// ============================================================================
function PremiumRecoveryPanel({ result, input }) {
  const ps = result.premiumSheet;
  const asrRate = parseFloat(input.asrLandRate) || 0;
  if (!ps || asrRate === 0) {
    return (
      <div style={{ marginBottom: 28, padding: '14px 18px', background: '#fafaf5', border: '1px solid #e7dfd0', borderRadius: 4, fontSize: 12, color: '#6b5d47' }}>
        <strong>Premium Recovery Sheet</strong> — enter your ASR Land Rate above to see itemised premium payable to MCGM.
      </div>
    );
  }
  const _totalBua = result.permissibleBua || 0;
  const _tdrLoaded = (result.tdrBua || 0) * (result.tdrLoadFactor ?? 1);
  const _cRate = parseFloat(input.constructionRate) || 27500;
  // For cluster (33(9)), result.plotArea = clusterPlot; for other schemes, = input.plotArea
  const _plotA = parseFloat(result.plotArea) || parseFloat(input.plotArea) || 0;
  const _basicFsi = (result.fsiSlab && result.fsiSlab.basic) || 0;
  const rows = [
    { label: 'Premium FSI', sub: `${fmt(result.premiumFsiBua * (result.premiumLoad ?? 1))} sqm × ASR × 50% (Reg 30(A)(6))`, value: ps.premiumFsiPayable, reg: 'Reg 30(A)/Table 12' },
    { label: 'Fungible (sale component, residential)', sub: `${fmt(result.fungibleSaleBua)} sqm × ASR × 50% (rehab portion is FREE per Reg 31(3))`, value: ps.fungiblePremium, reg: 'Reg 31(3)' },
    { label: '  → MCGM share (50%)', sub: '', value: ps.fungibleMCGM, reg: '', indent: true },
    { label: '  → State Govt share (30%)', sub: '', value: ps.fungibleGovt, reg: '', indent: true },
    { label: '  → MSRDC Sea Link share (20%)', sub: '', value: ps.fungibleMSRDC, reg: '', indent: true },
    ...(ps.osdPremium > 0 ? [{ label: 'Open Space Deficiency (OSD)', sub: `${fmt(result.rosDeficiency)} sqm deficit × ASR × 25% (concession u/CHE/DP/03450 for 33(7)(B))`, value: ps.osdPremium, reg: 'Reg 27' }] : []),
    { label: 'Sub-total - Premiums (Reg 30/31)', sub: '', value: ps.totalPremium, reg: '', bold: true },
    { label: 'Scrutiny Fee', sub: `${fmt(_totalBua)} sqm x Rs.70.7/sqm`, value: ps.scrutinyFee, reg: 'AutoDCR' },
    { label: 'IOD Deposit', sub: `${fmt(_totalBua * SQFT_PER_SQM)} sqft x Re.1/sqft`, value: ps.iodDeposit, reg: 'AutoDCR' },
    { label: 'Debris Removal Deposit', sub: `min(${fmt(_totalBua * SQFT_PER_SQM)} sqft x Rs.2, Rs.45000 cap)`, value: ps.debrisDeposit, reg: 'AutoDCR' },
    { label: 'Labour Welfare Cess', sub: `${fmt(_totalBua)} sqm x Rs.${fmt(_cRate)} x 1%`, value: ps.labourWelfareCess, reg: 'BOCW Act 1996' },
    { label: 'Development Charges - Land', sub: `${_basicFsi.toFixed(2)} x ${fmt(_plotA)} sqm x ASR x 1%`, value: ps.devChargesLand, reg: 'MR&TP 124E' },
    { label: 'Development Charges - BUA', sub: `${fmt(_totalBua)} sqm x ASR x 4%`, value: ps.devChargesBua, reg: 'MR&TP 124E' },
    { label: 'Layout Scrutiny Fee', sub: `${fmt(_plotA)} sqm x Rs.11.13`, value: ps.layoutScrutinyFee, reg: 'AutoDCR' },
    ...(_tdrLoaded > 0 ? [
      { label: 'TDR Utilization Scrutiny', sub: `${fmt(_tdrLoaded)} sqm x Rs.59`, value: ps.tdrScrutinyFee, reg: 'AutoDCR' },
      { label: 'TDR Infrastructure Charge', sub: `${fmt(_tdrLoaded)} sqm x Rs.${fmt(_cRate)} x 5%`, value: ps.tdrInfraCharge, reg: 'Reg 32 circular' },
    ] : []),
    { label: 'Sub-total - AutoDCR fees', sub: '', value: ps.totalAutoDCR, reg: '', bold: true },
    { label: 'GRAND TOTAL PAYABLE TO MCGM/GOVT', sub: 'Rough estimate - architect recovery sheet is authoritative', value: ps.grandTotal, reg: '', bold: true },
  ];
  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Proforma-A Premium Sheet" title="Premiums payable to MCGM / Govt">
        Per MCGM circulars (FY 2023-24). Premium FSI is charged at 50% of ASR under Reg 30(A)(6) — the temporary 50% rebate under GR 14.01.2021 has expired. Fungible premium is split 50% MCGM / 30% State Govt / 20% MSRDC. These are rough estimates — actual recovery sheet from your architect will be authoritative.
      </SectionTitle>
      <div style={{ background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 4, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f0e9dd' }}>
              <th style={th}>Premium head</th>
              <th style={{ ...th, textAlign: 'left' }}>Basis</th>
              <th style={{ ...th, textAlign: 'right' }}>Amount (rough)</th>
              <th style={{ ...th }}>Reference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f5efe2', background: r.bold ? 'rgba(139,58,42,0.06)' : 'transparent' }}>
                <td style={{ ...td, fontWeight: r.bold ? 700 : r.indent ? 400 : 500, paddingLeft: r.indent ? 32 : 18, color: r.bold ? '#8b3a2a' : '#1a1815', fontSize: r.indent ? 11.5 : 13 }}>{r.label}</td>
                <td style={{ ...td, fontSize: 11, color: '#6b5d47', fontStyle: 'italic' }}>{r.sub}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: r.bold ? 700 : 500, color: r.bold ? '#8b3a2a' : '#1a1815' }} className="num">{fmtCurrency(r.value)}</td>
                <td style={{ ...td, fontSize: 10.5, color: '#8b3a2a' }} className="num">{r.reg}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '10px 18px', fontSize: 11, color: '#6b5d47', borderTop: '1px solid #e7dfd0', fontStyle: 'italic' }}>
          ASR rate used: ₹{fmt(asrRate)}/sqm (FSI 1, user input). Construction rate: ₹{fmt(_cRate)}/sqm (SDRR).
          Typically paid in instalments across IOD → Plinth CC → Full CC → OC per GR 03.05.2023.
          Fungible on rehab portion ({fmt(result.fungibleRehabBua)} sqm) is free of premium per Reg 31(3) — not included above.
          For exact figures use the MCGM AutoDCR Fee Calculator: <a href="https://autodcr.mcgm.gov.in/AutoDCR.SWC.WebUI/Calculator/Main.aspx" target="_blank" rel="noopener noreferrer" style={{ color: '#8b3a2a', fontWeight: 600 }}>Open AutoDCR ↗</a>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PARKING PANEL — Proforma-A Section II(E)
// Per DCPR 2034 parking norms
// ============================================================================
function ParkingPanel({ result, input }) {
  const p = result.parking;
  if (!p || (p.total === 0 && result.totalFlats === 0)) return null;
  const flatRows = input.buaInputMode === 'breakdown'
    ? (input.flats || []).filter(f => parseInt(f.count) > 0 && f.use === 'residential').map(f => {
        const carpet = parseFloat(f.carpet) || 0;
        const count = parseInt(f.count) || 0;
        const norm = carpet > 90 ? 2 : carpet > 60 ? 1 : carpet > 45 ? 0.5 : 0;
        return { label: f.label, carpet, count, norm, subtotal: Math.ceil(norm * count) };
      })
    : [];
  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Proforma-A Section II(E)" title="Parking requirement">
        Computed per DCPR 2034 Reg 30 parking norms. For reference — actual parking layout depends on site geometry and architect's basement design.
      </SectionTitle>
      <div style={{ background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 4, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f0e9dd' }}>
              <th style={th}>Category</th>
              <th style={{ ...th, textAlign: 'right' }}>Norm</th>
              <th style={{ ...th, textAlign: 'right' }}>Required</th>
            </tr>
          </thead>
          <tbody>
            {flatRows.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f5efe2' }}>
                <td style={td}>{r.label} — {r.count} flats × {r.carpet} sqm carpet</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{r.norm} car/flat</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{r.subtotal}</td>
              </tr>
            ))}
            <tr style={{ borderBottom: '1px solid #f5efe2', background: '#fafaf5' }}>
              <td style={td}>Visitor parking (5% of residential cars)</td>
              <td style={{ ...td, textAlign: 'right' }} className="num">5%</td>
              <td style={{ ...td, textAlign: 'right' }} className="num">{p.visitor}</td>
            </tr>
            {p.shopCars > 0 && (
              <tr style={{ borderBottom: '1px solid #f5efe2' }}>
                <td style={td}>Commercial / shop (1 per 40 sqm up to 800 sqm)</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">1/40 sqm</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{p.shopCars}</td>
              </tr>
            )}
            <tr style={{ borderBottom: '1px solid #f5efe2', background: 'rgba(139,58,42,0.04)' }}>
              <td style={{ ...td, fontWeight: 700 }}>Total Cars</td>
              <td style={{ ...td, textAlign: 'right' }} />
              <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#8b3a2a' }} className="num">{p.total}</td>
            </tr>
            <tr>
              <td style={td}>Two-wheelers (1 per residential flat)</td>
              <td style={{ ...td, textAlign: 'right' }} className="num">1/flat</td>
              <td style={{ ...td, textAlign: 'right' }} className="num">{p.twoWheeler}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ padding: '10px 18px', fontSize: 11, color: '#6b5d47', borderTop: '1px solid #e7dfd0', fontStyle: 'italic' }}>
          Basement / stilt / podium area used for parking is free of FSI per Reg 31(1). Typically spread across 1–2 basements + podium. Your architect will size the basement to accommodate this.
        </div>
      </div>
    </div>
  );
}

function WatchOutFor({ result }) {
  const items = [
    {
      title: 'Developer claims you can only get "1.2× existing carpet"',
      response: `Under 33(7)(B), the incentive BUA is at minimum 15% of total existing BUA, OR 10 sqm per residential flat (whichever is higher) — that's free. Beyond that, the regulation also allows your society to access premium FSI and TDR up to the Table 12 ceiling. A flat 1.2× offer is the developer's negotiation position, not the regulation.`,
    },
    {
      title: 'Developer says "TDR is not available" or "TDR is too expensive"',
      response: `TDR is available in Mumbai and is actively traded. Whether it makes commercial sense depends on TDR market price vs. ASR rates at your location. If a developer rules it out, ask them to show you the TDR market quote they used. The Maximum scenario assumes TDR is loaded; if not, the Realistic scenario still applies.`,
    },
    {
      title: 'Developer asks the society to pay any premium',
      response: `Under 33(7)(B), the incentive BUA portion is free of premium. Premium that's payable goes to MCGM, not the developer, and applies only to the Premium FSI portion above existing+incentive. Standard practice: developer pays this premium from sale-component proceeds. If a developer asks the society to pay premium, that's a major red flag.`,
    },
    {
      title: 'Developer offers area X but won\'t show the area statement',
      response: `Always ask for a written area statement (like the one in this report) showing: existing BUA, incentive BUA, FSI build-up, fungible, rehab to members, sale to developer. Reputable developers and their architects produce this routinely. Refusal to show is itself information.`,
    },
    {
      title: 'Developer commits to corpus of ₹X lakhs per flat without showing the maths',
      response: `Corpus, rent during construction, and other monetary payments are negotiated and not regulated by the DCPR. Reasonable benchmarks come from comparable society redevs in your micro-market. Get at least 3 developer offers and compare corpus + rent + carpet + finishing schedule together — not corpus alone.`,
    },
    {
      title: 'Past FSI claims on the same plot for road/reservation area (Reg 30(A)(2) Note 2)',
      response: `If your society or a previous owner has ALREADY claimed FSI/TDR benefit for any road/DP-road/reservation area on this plot in an earlier development proposal, but the title has not yet transferred to MCGM — Reg 30(A)(2) Note 2 says that area is STILL deducted from your plot for FSI computation now (you cannot "double-claim" it). Ask your architect to check past sanctioned proposals on the property card. If found, reduce your "DP road set-back" / "DP reservation" input accordingly — those parts are spent FSI.`,
    },
    {
      title: 'Developer adds "in-situ FSI for road/reservation handover" to your 33(7)(B) area',
      response: `Reg 16 explicitly EXCLUDES 33(5), 33(7), 33(7)(A), 33(9), 33(9)(A), 33(9)(B), 33(10), 33(10)(A), 33(20)(A), 33(21) from earning in-lieu FSI/TDR for road or reservation area handed over. The incentive BUA you already get under 33(7)(B) is treated as covering this. If a developer's area statement shows an "in-situ FSI" or "FSI in lieu of road land" line under your 33(7)(B) calculation, that's likely a double-count.`,
    },
    result.viabilityRatio < 0.4 ? {
      title: 'No developer is interested or all want money from the society',
      response: `Your sale-to-rehab ratio is low — this isn't a developer trick, it's a real constraint. Options: (a) wait for higher FSI policies, (b) explore Reg 33(9) cluster scheme by combining with neighbouring societies, (c) check if 33(7)(A) applies if any structural distress, (d) consider self-redevelopment with a society loan.`,
    } : null,
  ].filter(Boolean);

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Critical reading" title="What to watch for in developer conversations">
        Common moves that compress the value the regulation actually entitles you to.
      </SectionTitle>

      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((item, i) => (
          <details key={i} style={{ background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 4 }}>
            <summary style={{ padding: 16, display: 'flex', justifyContent: 'space-between',
                              alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                <AlertTriangle size={16} color="#c08c30" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 13.5, fontWeight: 500, color: '#1a1815' }}>{item.title}</div>
              </div>
              <ChevronDown size={14} color="#a89c87" />
            </summary>
            <div style={{ padding: '0 16px 16px 44px', fontSize: 13,
                          color: '#3d3528', lineHeight: 1.6 }}>
              {item.response}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// NEXT STEPS — STRUCTURED ROADMAP WITH DOCUMENTS REQUIRED
// ============================================================================
function NextSteps() {
  const phases = [
    {
      phase: 'A',
      title: 'Gather records & get a structural audit',
      timeline: '1–2 months',
      colour: '#5a7a4f',
      summary: 'Before any committee vote, confirm the building\'s physical and legal status. These steps cost little and eliminate surprises later.',
      steps: [
        {
          title: 'Collect your core property documents',
          detail: 'Every document in the list below must be verified before an architect can prepare a stamped feasibility. Missing documents — especially OC and approved plans — disqualify you from the 33(7)(B) incentive BUA entirely. Collect these from the ward office, City Survey office, and society records.',
        },
        {
          title: 'Commission a Structural Audit',
          detail: 'Hire a Licensed Structural Engineer (not just a civil engineer) for a formal structural stability report. This is mandatory per MCGM requirements before any redevelopment proposal. If the building is declared structurally unsafe, 33(7)(A) may apply — which carries more generous incentives than 33(7)(B). The audit also establishes urgency that protects members during negotiations.',
        },
        {
          title: 'Confirm MCGM authorisation status',
          detail: 'Visit your ward office (Building Proposals department) and confirm: (a) OC / CC on file, (b) approved plans on file with your plot number. If plans are missing, apply for a certified copy under RTI. Per the 33(7)(B) circular, without any of OC, CC, or MCGM file record — the incentive BUA is not permissible.',
        },
      ],
      docs: [
        { name: 'Property Card (City Survey extract)', source: 'City Survey office / online at mahabhulekh.maharashtra.gov.in' },
        { name: 'Index II (ownership chain document)', source: 'Sub-Registrar office or via iGR portal' },
        { name: 'Occupation Certificate (OC) or Commencement Certificate (CC)', source: 'Ward office — Building Proposals dept.' },
        { name: 'Approved architectural plans (stamped set)', source: 'Ward office — certified copy request' },
        { name: 'Society Registration Certificate', source: 'Registrar of Co-operative Societies (District office)' },
        { name: 'Share certificates of all members', source: 'Society records' },
        { name: 'List of members with existing carpet area per flat', source: 'Society records / OC plans' },
        { name: 'Structural Audit Report', source: 'Licensed Structural Engineer — IIT or VJTI empanelled preferred' },
      ],
    },
    {
      phase: 'B',
      title: 'Society decision & stamped feasibility',
      timeline: '2–4 months',
      colour: '#8b3a2a',
      summary: 'Pass the first GB resolution, hire an architect, and get a proper stamped feasibility. This is the document you take to developers — not a software printout.',
      steps: [
        {
          title: 'Pass GB Resolution 1 — Authorise exploration',
          detail: 'A simple majority General Body resolution authorising the Managing Committee to: (a) explore redevelopment, (b) engage a Licensed Architect for feasibility, and (c) call for developer proposals. This resolution does NOT commit the society to any developer. It is procedurally required before an architect can be formally engaged.',
        },
        {
          title: 'Hire a Licensed Architect with 33(7)(B) experience',
          detail: 'The architect prepares the stamped Proforma-A area statement — the authoritative document for your FSI entitlement. Look for architects who have submitted and received IODs under 33(7)(B) in your ward. Ask for 2–3 references from completed projects. Fee is typically ₹1–3L for a feasibility; full project fees are a separate negotiation.',
        },
        {
          title: 'Review the stamped area statement',
          detail: 'The architect\'s Proforma-A should match the structure of this platform\'s area statement: gross plot → deductions → net plot → existing BUA → incentive → FSI build-up → permissible BUA → rehab/sale split. If numbers differ significantly from this output, ask the architect to walk through each line. Differences usually come from a different reg14 deduction or a different existing BUA figure from the OC plans.',
        },
        {
          title: 'Pass GB Resolution 2 — Incentive BUA allocation',
          detail: 'A special resolution (typically 75% majority) specifying what percentage of the 33(7)(B) incentive BUA goes to members vs. what accrues to the developer\'s commercial component. This split directly determines the area each member receives above their existing carpet. The resolution becomes a binding clause in the Development Agreement. Typical range: 70–90% to members.',
        },
      ],
      docs: [
        { name: 'Draft GBR 1 — Redevelopment exploration authorisation', source: 'Prepare with your society advocate; follow MCGM model resolution format' },
        { name: 'GBR 1 — signed, stamped minutes', source: 'Society Secretary' },
        { name: 'Architect\'s engagement letter (LOI)', source: 'Signed between society and architect' },
        { name: 'Stamped Proforma-A area statement', source: 'Architect — must be on their letterhead with MCGM registration number' },
        { name: 'Draft GBR 2 — Incentive BUA split resolution', source: 'Prepare with advocate; must specify % allocation clearly' },
        { name: 'GBR 2 — signed, stamped minutes (special resolution)', source: 'Society Secretary + 75% member attestation' },
      ],
    },
    {
      phase: 'C',
      title: 'Developer selection',
      timeline: '3–6 months',
      colour: '#3d5a4d',
      summary: 'Issue a written RFP to at least 3 developers. Compare offers on a level playing field using the stamped feasibility as your floor. Never accept the first offer.',
      steps: [
        {
          title: 'Draft and issue an RFP to shortlisted developers',
          detail: 'The RFP (Request for Proposal) is a formal document telling developers: (a) your plot details and feasibility numbers, (b) exactly what you want them to offer — carpet per member, corpus, rent, hardship, finishing schedule, (c) mandatory format for their area statement so you can compare apples to apples. Minimum 3 developers. Architects with developer relationships can help shortlist credible bidders. Avoid developers who ask to see your GBR 2 before submitting an offer — that lets them tailor the offer to your minimum.',
        },
        {
          title: 'Evaluate developer offers',
          detail: 'Compare across 6 dimensions — not just headline carpet area: (1) Carpet offered per flat type vs. minimum per GBR 2, (2) Corpus (one-time payment to society), (3) Monthly transit rent and for how long, (4) Hardship allowance during shifting, (5) Project timeline and penalty clauses for delay, (6) Developer track record — completed redev projects, OC timelines, litigation history. Use a comparison matrix; the GBR 2 split defines your floor.',
        },
        {
          title: 'Pass GB Resolution 3 — Select developer',
          detail: 'A special resolution (75% majority) selecting the developer and authorising the Managing Committee to negotiate and execute the Development Agreement. This resolution cannot be passed until at least 3 offers are received. Never select a developer without a written offer on your terms.',
        },
      ],
      docs: [
        { name: 'RFP document (Request for Proposal)', source: 'Prepared by society + architect; must include stamped area statement' },
        { name: 'Developer offer letters (minimum 3)', source: 'Each developer — must be on company letterhead, signed by authorised signatory' },
        { name: 'Developer\'s Proforma-A area statement', source: 'Developer\'s architect — cross-check against your stamped feasibility' },
        { name: 'Developer track record document', source: 'Developer — list of completed projects with OC dates and contact persons' },
        { name: 'Developer entity documents (KYC)', source: 'Developer — COI, MOA, GST registration, RERA registration' },
        { name: 'GBR 3 — Developer selection resolution', source: 'Society Secretary + 75% member attestation' },
      ],
    },
    {
      phase: 'D',
      title: 'Agreements & regulatory submission',
      timeline: '2–4 months',
      colour: '#4a3a8a',
      summary: 'Execute legally binding agreements and submit to MCGM for approval. This is the most document-intensive phase. Do not skip legal review of the DA.',
      steps: [
        {
          title: 'Execute Development Agreement (DA) and Power of Attorney (POA)',
          detail: 'The DA is the master contract between the society and developer. It must explicitly cover: (a) carpet area guaranteed per member by flat type, (b) corpus amount and payment schedule, (c) transit rent per sq ft and duration, (d) construction completion timeline with penalty clauses, (e) quality specifications and finishing schedule, (f) sinking fund / maintenance corpus for the new building, (g) dispute resolution mechanism. The DA and POA must both be registered at the Sub-Registrar office. Do NOT sign an unregistered DA. Have a society-side advocate (not the developer\'s advocate) review the DA before signing.',
        },
        {
          title: 'Submit development proposal to MCGM',
          detail: 'The architect submits the full proposal to MCGM\'s Building Proposals department for your ward: drawings, structural report, Proforma-A, premium payment, and all NOCs. MCGM issues an IOD (Intimation of Disapproval — confusingly, this IS the approval to begin) or a Development Permission (DP). Premium FSI and fungible premiums are paid at this stage. Timeline: 6–18 months depending on the ward and whether there are objections.',
        },
      ],
      docs: [
        { name: 'Development Agreement (DA) — registered', source: 'Sub-Registrar office — must be stamped per stamp duty rates' },
        { name: 'Power of Attorney (POA) — registered', source: 'Sub-Registrar office' },
        { name: 'Architect\'s drawings — plans, sections, elevations', source: 'Project architect — auto-CAD + signed hard copies' },
        { name: 'Structural Engineer\'s report (for new building)', source: 'Empanelled structural engineer' },
        { name: 'Premium payment challans (Premium FSI + Fungible)', source: 'MCGM challan + bank payment proof' },
        { name: 'Fire NOC (if building > 15m height)', source: 'Maharashtra Fire Services — Bandra' },
        { name: 'Airport Authority NOC (if in height-restriction zone)', source: 'AAI — online via NOCAS portal' },
        { name: 'Tree NOC (if any trees on plot)', source: 'MCGM Garden Department' },
        { name: 'IOD / Development Permission from MCGM', source: 'Issued by MCGM Building Proposals — ward office' },
      ],
    },
    {
      phase: 'E',
      title: 'Construction, handover & OC',
      timeline: '24–48 months',
      colour: '#6b5d47',
      summary: 'The longest phase. Your job is to monitor milestones, track transit rent payments, and hold the developer accountable to the DA timelines.',
      steps: [
        {
          title: 'Shifting and transit accommodation',
          detail: 'All members vacate the old building only after (a) the DA is registered, (b) MCGM IOD is in hand, (c) the developer has paid the first corpus instalment and set up transit rent standing instructions. Never let members vacate on a verbal promise. The DA should specify the transit rent rate, escalation clause, and the stop date (OC + 30 days typically). Keep a society-level register of when each member vacated and the address of their transit accommodation.',
        },
        {
          title: 'Monitor construction milestones',
          detail: 'The DA should specify payment-linked milestones: Plinth completion → Slab-by-slab progress → Superstructure completion → Finishing → OC application. The Managing Committee should do site visits at each milestone and maintain a photographic record. Delays beyond the DA timeline trigger penalty clauses — enforce them in writing, not verbally. Keep a running WhatsApp group with the developer\'s project manager for day-to-day issues.',
        },
        {
          title: 'Flat allotment and handover',
          detail: 'When the building is ready, the architect and developer prepare a flat allotment plan per the carpet area guaranteed in the DA. Compare each allotted flat\'s carpet area against what was promised — measure physically if needed. Do not accept possession without: (a) OC issued by MCGM, (b) water connection, (c) electricity connection, (d) fire NOC for the new building, (e) the allotment letter signed by developer.',
        },
        {
          title: 'Society re-registration and new share certificates',
          detail: 'After OC, the society must be re-registered (or its share certificate records updated) to reflect new flat numbers, carpet areas, and any new members if the developer sold sale flats. Update the property card with the new building details. The developer must hand over the sinking fund corpus to the newly reconstituted Managing Committee.',
        },
      ],
      docs: [
        { name: 'Corpus payment receipt (first instalment)', source: 'Developer — bank transfer confirmation' },
        { name: 'Transit rent standing instruction / ECS mandate', source: 'Developer — must be active before member vacates' },
        { name: 'Member-wise vacating register', source: 'Society Secretary — date vacated, transit address, contact' },
        { name: 'Plinth Completion Certificate', source: 'MCGM — issued after plinth inspection' },
        { name: 'Construction milestone photos (slab-by-slab)', source: 'Society Managing Committee — maintain dated photo record' },
        { name: 'Occupancy Certificate (OC)', source: 'MCGM — issued after final inspection of completed building' },
        { name: 'Individual flat allotment letters', source: 'Developer — one per member, specifying flat number, floor, carpet area' },
        { name: 'Water connection sanction letter', source: 'MCGM Hydraulic Engineer — ward office' },
        { name: 'Electricity connection (MSEDCL / BEST)', source: 'Distribution company — applied by developer pre-OC' },
        { name: 'Sinking fund handover receipt', source: 'Developer to Society Managing Committee' },
        { name: 'Updated Property Card (with new building)', source: 'City Survey office — apply after OC' },
        { name: 'New share certificates for all members', source: 'Reconstituted society — issued post-OC' },
      ],
    },
  ];

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="From here" title="What your committee should do next">
        Most society redevs take 3–5 years from first committee discussion to OC. The phases below cover the full journey with the documents you need at each stage.
      </SectionTitle>

      {/* Phase timeline strip */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, overflowX: 'auto' }}>
        {phases.map((p, i) => (
          <div key={i} style={{ flex: 1, minWidth: 100, padding: '10px 14px',
            background: p.colour, color: '#fffefb', position: 'relative',
            borderRight: i < phases.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none',
            borderRadius: i === 0 ? '4px 0 0 4px' : i === phases.length - 1 ? '0 4px 4px 0' : 0 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                          opacity: 0.8, marginBottom: 2 }}>Phase {p.phase}</div>
            <div style={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1.3 }}>{p.title.split(' ').slice(0, 3).join(' ')}&hellip;</div>
            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 3 }}>{p.timeline}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {phases.map((p, pi) => (
          <details key={pi} style={{ background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 4 }}>
            <summary style={{ padding: '16px 20px', display: 'flex', alignItems: 'center',
                              gap: 14, cursor: 'pointer', listStyle: 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: p.colour,
                            color: '#fffefb', display: 'grid', placeItems: 'center',
                            fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {p.phase}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1815' }}>{p.title}</div>
                <div style={{ fontSize: 11.5, color: '#6b5d47', marginTop: 2 }}>
                  Typical duration: {p.timeline} · {p.steps.length} steps · {p.docs.length} documents
                </div>
              </div>
              <ChevronDown size={14} color="#a89c87" style={{ flexShrink: 0 }} />
            </summary>

            <div style={{ padding: '0 20px 20px 20px' }}>
              <div style={{ fontSize: 13, color: '#3d3528', lineHeight: 1.6, marginBottom: 18,
                            paddingTop: 4, borderTop: '1px solid #f0e9dd', paddingTop: 14 }}>
                {p.summary}
              </div>

              {/* Steps */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                              textTransform: 'uppercase', color: p.colour, marginBottom: 10 }}>
                  Steps
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {p.steps.map((s, si) => (
                    <div key={si} style={{ display: 'flex', gap: 12, padding: '12px 14px',
                                          background: '#fafaf5', borderRadius: 3,
                                          borderLeft: `3px solid ${p.colour}` }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%',
                                    background: p.colour, color: '#fffefb',
                                    display: 'grid', placeItems: 'center',
                                    fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                        {si + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1815' }}>{s.title}</div>
                        <div style={{ fontSize: 12, color: '#3d3528', marginTop: 5, lineHeight: 1.55 }}>{s.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                              textTransform: 'uppercase', color: p.colour, marginBottom: 10 }}>
                  Documents required at this phase
                </div>
                <div className="doc-grid">
                  {p.docs.map((d, di) => (
                    <div key={di} className="doc-pill" style={{ borderLeftColor: p.colour }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <Check size={11} color={p.colour} style={{ flexShrink: 0, marginTop: 1 }} />
                        <div>
                          <div style={{ fontWeight: 600, color: '#1a1815', fontSize: 11.5 }}>{d.name}</div>
                          <div style={{ color: '#6b5d47', fontSize: 10.5, marginTop: 2 }}>{d.source}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </details>
        ))}
      </div>

      <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(139,58,42,0.04)',
                    borderLeft: '3px solid #8b3a2a', borderRadius: 2, fontSize: 12,
                    color: '#3d3528', lineHeight: 1.6 }}>
        <strong>Timeline reality check.</strong> The above phases overlap in practice. Structural audit and document collection (Phase A) can run in parallel with the GB resolution (Phase B). MCGM approval (Phase D) is often the longest and least predictable — 6 to 18 months is typical. Build this into any developer agreement as a force-majeure type clause so transit rent continues during regulatory delays.
      </div>
    </div>
  );
}

// ============================================================================
// EXPLAINERS — PLAIN-ENGLISH FAQ
// ============================================================================
function Explainers() {
  const faqs = [
    {
      q: 'Why 15% incentive BUA?',
      a: 'Reg 33(7)(B) provides "incentive additional BUA" of 15% of existing BUA OR 10 sqm per residential tenement, whichever is greater — without premium. The government\'s way of incentivising old buildings to redevelop, by giving free FSI to the existing society. Exact split between members and developer is decided by your General Body resolution.',
    },
    {
      q: 'What is FSI? What is BUA?',
      a: 'FSI (Floor Space Index) is a multiplier on plot area that tells you how much you can build. BUA (Built-Up Area) is the actual square metres of construction. If your plot is 1,000 sqm and FSI is 2, you can build 2,000 sqm of BUA. Carpet area is the usable area inside flats — typically 70-80% of BUA after walls and common areas.',
    },
    {
      q: 'How does the FSI build-up work?',
      a: 'Reg 30 / Table 12 sets four levels: Base FSI (free, depends on location and road width), Premium FSI (extra, by paying MCGM), TDR loading (extra, by buying TDR), and the maximum permissible at the top. Your society first computes Existing + 15% Incentive — if that exceeds Base alone, you get that. If you also pay premium and/or buy TDR, you can go up to the maximum.',
    },
    {
      q: 'What is "rehab" vs "sale" component?',
      a: 'Rehab = area allocated to existing society members in the new building. Sale = area the developer can sell to outsiders to monetise the project. The sale component is what makes redevelopment commercially viable for a developer.',
    },
    {
      q: 'What is Premium FSI?',
      a: 'FSI you can buy from MCGM by paying a premium of 50% of the ASR land rate per Reg 30(A)(6). The temporary 50% rebate under GR 14.01.2021 (which made it effectively 25%) has expired. The Realistic scenario assumes premium FSI is purchased.',
    },
    {
      q: 'What is TDR?',
      a: 'Transferable Development Rights — FSI generated when someone surrenders land elsewhere (typically for road widening or slum redev) and traded as a certificate. Buying TDR is an alternative to paying premium. Whether it\'s cheaper depends on TDR market price at the time.',
    },
    {
      q: 'What is Fungible Compensatory Area?',
      a: 'Reg 31(3) — an additional 35% of FSI BUA (residential) you can avail by paying premium. Originally introduced in DCPR 2034 to absorb things that were earlier free of FSI (flowerbeds, niches, etc.).',
    },
    {
      q: 'My building is 28 years old. What can I do?',
      a: 'Three options. (1) Wait two years to qualify under 33(7)(B). (2) If structurally distressed, get a structural audit and pursue 33(7)(A) which has higher incentives. (3) Combine with neighbouring societies under 33(9) cluster scheme.',
    },
  ];

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Plain-English explanations" title="What does all this mean?">
        For members reading this in a committee group. No regulatory jargon.
      </SectionTitle>
      <div style={{ background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 4 }}>
        {faqs.map((faq, i) => (
          <details key={i} style={{ borderBottom: i < faqs.length - 1 ? '1px solid #f0e9dd' : 'none' }}>
            <summary style={{ padding: 16, display: 'flex', justifyContent: 'space-between',
                              alignItems: 'center', gap: 12 }}>
              <div className="serif" style={{ fontSize: 15, fontWeight: 500, color: '#1a1815' }}>{faq.q}</div>
              <ChevronDown size={14} color="#a89c87" />
            </summary>
            <div style={{ padding: '0 16px 16px 16px', fontSize: 13,
                          color: '#3d3528', lineHeight: 1.65, maxWidth: 720 }}>
              {faq.a}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
