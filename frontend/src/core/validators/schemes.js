// Scheme detection — Reg 30 standard / 33(7)(B) / 33(9) Cluster
// MVP scope: cooperative housing societies only.
// 33(7) cessed and 33(7)(A) tenanted are explicitly OUT for this iteration.
// 33(10) slum: flag only — no computation.

export const ALL_SCHEMES = [
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

export function detectApplicableSchemes(input) {
  const buildingAge = input.buildingAge || 0;
  const buildingType = input.buildingType || 'society';
  const authStatus = input.authorisationStatus;
  const isMembersOnSamePlot = input.membersOnSamePlot;
  const clusterOptedIn = input.clusterOptIn === true;
  const clusterPlot = parseFloat(input.clusterPlotArea) || 0;
  const isIslandCity = input.location === 'islandCity';

  const result = [];

  result.push({
    id: 'reg30_standard',
    eligible: true,
    reason: 'Always available as a baseline — uses just the Reg 30 / Table 12 FSI without any redevelopment incentive.',
    gates: [
      { ok: true, text: 'No additional eligibility — baseline calculation' },
    ],
  });

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

// Auto-selects the primary scheme to highlight by default.
// Cluster always wins when opted-in (size eligibility is shown but doesn't block routing).
export function pickPrimaryScheme(schemes, input) {
  if (input && input.clusterOptIn === true) return 'reg33_9';
  if (schemes.find(s => s.id === 'reg33_7B')?.eligible) return 'reg33_7B';
  return 'reg30_standard';
}
