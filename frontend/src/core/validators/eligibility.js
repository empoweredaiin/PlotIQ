// Eligibility gates for Reg 33(7)(B) — cooperative housing society redevelopment

export function analyseEligibility(input) {
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
