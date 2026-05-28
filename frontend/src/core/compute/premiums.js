// Premium Recovery Sheet — per Proforma-A / MCGM circulars (FY 2023-24)
// Premium FSI: premiumFsiBua × load × ASR × 50%  (Reg 30(A)(6) base rate)
// Fungible (sale only): fungibleSaleBua × ASR × 50% (Residential per Reg 31(3))
//   — Fungible on rehab/existing-BUA portion is FREE of premium for 33(7)(B)
//   — Split: 50% MCGM / 30% State Govt / 20% MSRDC
// OSD: deficientROS × ASR × 25%                  (concession under CHE/DP/03450)
// Additional MCGM AutoDCR fee heads (FY 2025-26 rate card) — see constants/index.js

import { SQM_TO_SQFT, AUTODCR_RATES } from '../constants';

export function computePremiumSheet({
  premiumFsiBua, premiumLoad, asrRate, fungibleSaleBua, deficientROS,
  tdrBuaLoaded, totalBua, plotArea, basicFsi, constructionRate,
}) {
  const asr   = parseFloat(asrRate) || 0;
  const crate = parseFloat(constructionRate) || 0;
  const bua   = parseFloat(totalBua) || 0;
  const plot  = parseFloat(plotArea) || 0;
  const fsi   = parseFloat(basicFsi) || 0;
  const tdr   = parseFloat(tdrBuaLoaded) || 0;
  const buaSqft = bua * SQM_TO_SQFT;

  const r = AUTODCR_RATES;

  // Reg 30/31 premiums
  const premiumFsiPayable = premiumFsiBua * premiumLoad * asr * 0.50;
  const fungiblePremium   = fungibleSaleBua * asr * 0.50;
  const osdPremium        = deficientROS > 0 ? deficientROS * asr * 0.25 : 0;

  // AutoDCR additional heads (Mumbai FY 2025-26)
  const scrutinyFee       = bua * r.scrutinyPerSqm;
  const iodDeposit        = buaSqft * r.iodDepositPerSqft;
  const debrisDeposit     = Math.min(buaSqft * r.debrisPerSqft, r.debrisCap);
  const labourWelfareCess = bua * crate * r.labourWelfarePct;
  const devChargesLand    = fsi * plot * asr * r.devChargesLandPct;
  const devChargesBua     = bua * asr * r.devChargesBuaPct;
  const devChargesTotal   = devChargesLand + devChargesBua;
  const layoutScrutinyFee = plot * r.layoutScrutinyPerSqm;
  const tdrScrutinyFee    = tdr * r.tdrScrutinyPerBua;
  const tdrInfraCharge    = tdr * crate * r.tdrInfraPct;

  const totalAutoDCR =
    scrutinyFee + iodDeposit + debrisDeposit + labourWelfareCess +
    devChargesTotal + layoutScrutinyFee + tdrScrutinyFee + tdrInfraCharge;

  return {
    premiumFsiPayable,
    fungiblePremium,
    fungibleMCGM:  fungiblePremium * 0.50,
    fungibleGovt:  fungiblePremium * 0.30,
    fungibleMSRDC: fungiblePremium * 0.20,
    osdPremium,
    scrutinyFee, iodDeposit, debrisDeposit, labourWelfareCess,
    devChargesLand, devChargesBua, devChargesTotal,
    layoutScrutinyFee, tdrScrutinyFee, tdrInfraCharge,
    totalAutoDCR,
    totalPremium: premiumFsiPayable + fungiblePremium + osdPremium,
    grandTotal: premiumFsiPayable + fungiblePremium + osdPremium + totalAutoDCR,
  };
}
