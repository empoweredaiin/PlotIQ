import { computePremiumSheet } from '../compute/premiums';
import { FUNGIBLE_RATE } from '../constants';

export function computeBuildable_33_9(input) {
  const clusterPlot = parseFloat(input.clusterPlotArea) || 0;
  const clusterBuildings = parseInt(input.clusterBuildings) || 1;
  const clusterExistingBua = parseFloat(input.clusterExistingBua) || 0;
  const clusterApartments = parseInt(input.clusterApartments) || 0;

  const isIslandCity = input.location === 'islandCity';
  const minClusterArea = isIslandCity ? 4000 : 6000;
  const meetsMinimum = clusterPlot >= minClusterArea;

  const rehabBase = clusterExistingBua;
  const incentiveBua = rehabBase * 0.50;
  const ceilingBua = clusterPlot * 4.00;

  const schemeFsiBua = Math.max(rehabBase + incentiveBua, ceilingBua);
  const ceilingGoverns = ceilingBua >= (rehabBase + incentiveBua);

  const fungibleArea = schemeFsiBua * FUNGIBLE_RATE;
  const permissibleBua = schemeFsiBua + fungibleArea;

  const saleBua = Math.max(0, permissibleBua - rehabBase);
  const viabilityRatio = rehabBase > 0 ? saleBua / rehabBase : 0;

  let viabilityRating, viabilityNote;
  if (!meetsMinimum) {
    viabilityRating = 'not eligible';
    viabilityNote = `Cluster plot ${clusterPlot.toLocaleString('en-IN')} sqm is below the ${minClusterArea} sqm minimum for ${isIslandCity ? 'Island City' : 'Suburbs'}. Add more participating societies or reconsider cluster scheme.`;
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
    premiumFsiBua: 0, premiumLoad: 1, tdrLoadFactor: 1,
    rosDeficiency: 0,
    clusterPlot, clusterBuildings, clusterExistingBua: rehabBase, clusterApartments,
    minClusterArea, meetsMinimum,
    rehabBase, incentiveBua, ceilingBua, schemeFsiBua, ceilingGoverns,
    fungibleArea, permissibleBua, saleBua,
    viabilityRating, viabilityNote, viabilityRatio,
    effFsi: clusterPlot > 0 ? permissibleBua / clusterPlot : 0,
    plotArea: clusterPlot,
    netPlot: clusterPlot,
    grossExclRoad: clusterPlot,
    existingBua: rehabBase,
    totalFlats: clusterApartments,
    residentialFlats: clusterApartments,
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
    tdrBuaLoaded: 0,
  };
}
