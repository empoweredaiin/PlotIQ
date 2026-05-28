import { computeBuildable_Reg30 } from './reg30';
import { computeBuildable_33_7B } from './reg33_7b';
import { computeBuildable_33_9 } from './reg33_9';

export { computeBuildable_Reg30, computeBuildable_33_7B, computeBuildable_33_9 };

export function computeBuildable(input) {
  const schemeId = input.selectedScheme || 'reg33_7B';
  if (schemeId === 'reg33_9') return computeBuildable_33_9(input);
  if (schemeId === 'reg30_standard') return computeBuildable_Reg30(input);
  return computeBuildable_33_7B(input);
}
