import { clamp01 } from '../compute/fsi';
import { computeBaseInputs } from '../compute/base';
import { computePremiumSheet } from '../compute/premiums';
import { FUNGIBLE_RATE } from '../constants';

export function computeBuildable_33_7B(input) {
  const base = computeBaseInputs(input, 'reg33_7B');
  const { netPlot, baseFsiBua, premiumFsiBua, tdrBua, existingBua, residentialFlats } = base;

  // Reg 33(7)(B) incentive BUA — free of premium, regulatory entitlement
  const incentive15Pct = existingBua * 0.15;
  const incentivePerTenement = residentialFlats * 10;
  const incentiveBua = Math.max(incentive15Pct, incentivePerTenement);
  const incentiveBasis = incentive15Pct >= incentivePerTenement ? '15percent' : 'pertenement';

  const premiumLoad = clamp01(input.premiumFsiLoad ?? 1.0);
  const tdrLoadFactor = clamp01(input.tdrLoad ?? 1.0);
  const fungibleLoadFactor = clamp01(input.fungibleLoad ?? 1.0);

  // Dual-path governance: max(rehab path, Reg 30 path at chosen loadings)
  const rehabBasePath = existingBua + incentiveBua;
  const reg30PathLoaded = baseFsiBua + (premiumFsiBua * premiumLoad) + (tdrBua * tdrLoadFactor);
  const fsiBua = Math.max(rehabBasePath, reg30PathLoaded);
  const rehabPathGoverns = rehabBasePath >= reg30PathLoaded;

  const reg30PathMax = baseFsiBua + premiumFsiBua + tdrBua;
  const fsiBuaMax = Math.max(rehabBasePath, reg30PathMax);

  // Fungible split: rehab portion free, sale portion on premium
  const fungibleArea = fsiBua * FUNGIBLE_RATE * fungibleLoadFactor;
  const fungibleAreaMax = fsiBuaMax * FUNGIBLE_RATE;

  const permissibleBua = fsiBua + fungibleArea;
  const permissibleBuaMax = fsiBuaMax + fungibleAreaMax;

  const memberIncentiveShare = parseFloat(input.memberIncentiveShare ?? 80) / 100;
  const memberSideRehabBua = existingBua + incentiveBua * memberIncentiveShare;
  const developerSideIncentive = incentiveBua * (1 - memberIncentiveShare);

  const saleBua = Math.max(0, permissibleBua - memberSideRehabBua);
  const saleBuaMax = Math.max(0, permissibleBuaMax - memberSideRehabBua);

  const rehabShare = permissibleBua > 0 ? memberSideRehabBua / permissibleBua : 0;
  const fungibleRehabBua = fungibleArea * rehabShare;
  const fungibleSaleBua  = fungibleArea * (1 - rehabShare);

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
  const premiumPayable = premiumSheet.premiumFsiPayable;

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

  const totalExistingCarpet = (input.flats || []).reduce(
    (s, f) => s + (parseFloat(f.carpet) || 0) * (parseInt(f.count) || 0), 0
  );
  const incentiveCarpetToMembers = (incentiveBua * memberIncentiveShare) / 1.2;
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
          realisticLow: realisticCarpet,
          realisticHigh: realisticCarpet,
          use: f.use,
        };
      })
    : [];

  return {
    schemeId: 'reg33_7B',
    schemeName: 'Reg 33(7)(B) Society Redevelopment',
    ...base,
    incentiveBua, incentiveBasis, incentive15Pct, incentivePerTenement,
    rehabBasePath, reg30PathLoaded, reg30PathMax,
    rehabPathGoverns,
    premiumLoad, tdrLoadFactor, fungibleLoadFactor,
    premiumFsiBuaLoaded: premiumFsiBua * premiumLoad,
    tdrBuaLoaded: base.tdrBua * tdrLoadFactor,
    fsiBua, fungibleArea, permissibleBua,
    fsiBuaMax, fungibleAreaMax, permissibleBuaMax,
    memberIncentiveShare, memberSideRehabBua, developerSideIncentive,
    saleBua, saleBuaMax,
    premiumPayable,
    viabilityRating, viabilityNote, viabilityRatio,
    flatBreakdown,
    effFsi: netPlot > 0 ? permissibleBua / netPlot : 0,
    effFsiMax: netPlot > 0 ? permissibleBuaMax / netPlot : 0,
    fungibleRehabBua, fungibleSaleBua,
    premiumSheet,
    inSituFsiBua: base.inSituFsiBua,
    inSituFsiEligible: base.inSituFsiEligible,
    inSituFsiDeniedReason: base.inSituFsiDeniedReason,
    parking: base.parking,
    rosRequired: base.rosRequired,
    rosProposed: base.rosProposed,
    rosDeficiency: base.rosDeficiency,
  };
}
