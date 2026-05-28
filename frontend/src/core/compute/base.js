// Shared base computation — called by all scheme computers first.
// Computes deductions, existing BUA, FSI slab, parking, and ROS.

import { CARPET_TO_BUA, SCHEMES_DENIED_INSITU_FSI } from '../constants';
import { findFsiSlab } from './fsi';
import { computeReg14Amenity } from './amenity';
import { computeLOSRequirement, computeParkingRequirement } from './los';
import { computeReg15IHFlag } from '../validators/flags';

export function computeBaseInputs(input, schemeId) {
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
    existingBua = totalCarpet * CARPET_TO_BUA;
  }
  const totalFlats = input.buaInputMode === 'total'
    ? (parseInt(input.tenementCount) || 0)
    : input.flats.reduce((s, f) => s + (parseInt(f.count) || 0), 0);
  const residentialFlats = input.buaInputMode === 'total'
    ? totalFlats
    : input.flats.filter(f => f.use === 'residential')
        .reduce((s, f) => s + (parseInt(f.count) || 0), 0);

  // FSI slab — with optional road-widening band shift
  const rawRoadWidth = parseFloat(input.roadWidth) || 0;
  const roadWideningApplied = rawRoadWidth >= 6 && rawRoadWidth < 9 && !!input.roadWideningProposed;
  const effectiveRoadWidth = roadWideningApplied ? 9 : rawRoadWidth;
  const fsiSlab = findFsiSlab(input.location, effectiveRoadWidth);
  const baseFsiBua = netPlot * fsiSlab.basic;
  const premiumFsiBua = netPlot * fsiSlab.premium;
  const tdrBua = netPlot * fsiSlab.tdr;
  const ceilingBua = baseFsiBua + premiumFsiBua + tdrBua;

  // Reg 16 — in-situ FSI denial for incentive schemes (anti-double-count)
  const inSituFsiEligible = !SCHEMES_DENIED_INSITU_FSI.has(schemeId);
  const inSituFsiBua = inSituFsiEligible
    ? (dpRoadDeduction + reservationDeduction) * fsiSlab.basic
    : 0;
  const inSituFsiDeniedReason = inSituFsiEligible
    ? null
    : `Reg 16 denies in-lieu FSI/TDR for road/reservation handover under ${schemeId.replace('reg', 'Reg ').replace('_', '(').replace(/(\w)$/, '$1)')} (anti-double-count with incentive BUA)`;

  // Parking (informational, for Proforma II-E)
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
