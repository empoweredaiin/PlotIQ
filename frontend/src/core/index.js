// Public API for the DCPR 2034 computation engine

export { computeBuildable, computeBuildable_Reg30, computeBuildable_33_7B, computeBuildable_33_9 } from './schemes';
export { computeBaseInputs } from './compute/base';
export { findFsiSlab, clamp01 } from './compute/fsi';
export { computeReg14Amenity } from './compute/amenity';
export { computeLOSRequirement, computeParkingRequirement } from './compute/los';
export { computePremiumSheet } from './compute/premiums';
export { analyseEligibility } from './validators/eligibility';
export { computeReg15IHFlag } from './validators/flags';
export { ALL_SCHEMES, detectApplicableSchemes, pickPrimaryScheme } from './validators/schemes';
export { CARPET_TO_BUA, SQM_TO_SQFT, FUNGIBLE_RATE, SCHEMES_DENIED_INSITU_FSI, SCHEMES_WITH_REG14_REDUCTION, AUTODCR_RATES } from './constants';
