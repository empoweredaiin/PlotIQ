import { clamp01 } from '../compute/fsi';
import { computeBaseInputs } from '../compute/base';
import { computePremiumSheet } from '../compute/premiums';
import { FUNGIBLE_RATE } from '../constants';

export function computeBuildable_Reg30(input) {
  const base = computeBaseInputs(input, 'reg30_standard');
  const { netPlot, baseFsiBua, premiumFsiBua, tdrBua, ceilingBua, existingBua } = base;

  const incentiveBua = 0;

  const premiumLoad = clamp01(input.premiumFsiLoad ?? 1.0);
  const tdrLoadFactor = clamp01(input.tdrLoad ?? 1.0);
  const fungibleLoadFactor = clamp01(input.fungibleLoad ?? 1.0);

  const fsiBua = baseFsiBua + (premiumFsiBua * premiumLoad) + (tdrBua * tdrLoadFactor);
  const fsiBuaMax = ceilingBua;

  const fungibleArea = fsiBua * FUNGIBLE_RATE * fungibleLoadFactor;
  const fungibleAreaMax = fsiBuaMax * FUNGIBLE_RATE;

  const permissibleBua = fsiBua + fungibleArea;
  const permissibleBuaMax = fsiBuaMax + fungibleAreaMax;

  const memberSideRehabBua = existingBua;
  const developerSideIncentive = 0;

  const saleBua = Math.max(0, permissibleBua - memberSideRehabBua);
  const saleBuaMax = Math.max(0, permissibleBuaMax - memberSideRehabBua);

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
    schemeName: 'Reg 30 / Standard FSI',
    premiumSheet,
    fungibleSaleBua: fungibleArea,
    fungibleRehabBua: 0,
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
