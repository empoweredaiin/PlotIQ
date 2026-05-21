import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Check, X, AlertTriangle, Info, ChevronDown, ChevronRight, Printer, Plus, Trash2, ArrowRight, Eye, EyeOff } from 'lucide-react';

// ============================================================================
// REGULATION 33(7)(B) — RULES ENGINE
// Source: Comprehensive DCPR 2034 (PEATA edition), pages 160 + Circular C-1 T-2 guidelines
// ============================================================================

const SQM_TO_SQFT = 10.7639;

// FSI Table 12 (Reg 30) — needed as the ceiling for "may avail premium FSI" provision in 33(7)(B)(1)
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

function analyseEligibility(input) {
  const { buildingAge, buildingType, authorisationStatus, membersOnSamePlot, gbResolution } = input;
  const issues = [];
  const passed = [];

  // Gate 1: Age >= 30 years
  if (buildingAge < 30) {
    issues.push({
      level: 'fail',
      title: `Building age is ${buildingAge} years — minimum 30 required`,
      detail: `Reg 33(7)(B)(4) requires the building to be 30 years old or more. You'd need to wait ${30 - buildingAge} more years, OR get a structural audit declaring the building dilapidated/unsafe — that would qualify you under Reg 33(7)(A) instead, which is a different scheme with its own rules.`,
      ref: 'Reg 33(7)(B), Clause 4',
    });
  } else {
    passed.push({ title: `Age ${buildingAge} years — meets 30-year minimum`, ref: 'Reg 33(7)(B), Clause 4' });
  }

  // Gate 2: Building type — should be a housing society, not cessed/tenanted
  if (buildingType === 'cessed') {
    issues.push({
      level: 'fail',
      title: 'Cessed building — falls under Reg 33(7), not 33(7)(B)',
      detail: 'A building paying cess to MHADA (typically Island City buildings pre-1969) is governed by Reg 33(7), which has different — usually more generous — incentive provisions. This calculator does not cover 33(7).',
      ref: 'Reg 33(7)(B) opening clause',
    });
  } else if (buildingType === 'tenanted') {
    issues.push({
      level: 'fail',
      title: 'Tenanted building — falls under Reg 33(7)(A)',
      detail: 'If your building has tenants (not member-owners), and is dilapidated or unsafe, the applicable regulation is 33(7)(A). This calculator does not cover 33(7)(A).',
      ref: 'Reg 33(7)(B) opening clause',
    });
  } else if (buildingType === 'society') {
    passed.push({ title: 'Registered cooperative housing society — correct scheme', ref: 'Reg 33(7)(B), opening clause' });
  }

  // Gate 3: Authorisation status (per Circular C-1 T-2 guidelines)
  if (authorisationStatus === 'none') {
    issues.push({
      level: 'fail',
      title: 'No approved plans, OC or MCGM file on record',
      detail: 'Per the operational guidelines for 33(7)(B), if there is neither an approved copy of plan, nor an Occupation Certificate, nor a file in MCGM records — the incentive additional BUA is NOT permissible. This is the most serious problem to fix before any redevelopment talk. You may need a regularisation route first.',
      ref: 'Circular Guidelines for 33(7)(B), Clause (b)(iii)',
    });
  } else if (authorisationStatus === 'oc') {
    passed.push({ title: 'Occupation Certificate available — existing BUA per OC plans qualifies', ref: 'Circular Guidelines for 33(7)(B), Clause (b)(i)' });
  } else if (authorisationStatus === 'cc') {
    passed.push({ title: 'CC + approved plans available — existing BUA per approved plans qualifies', ref: 'Circular Guidelines for 33(7)(B), Clause (b)(ii)' });
  } else if (authorisationStatus === 'tolerated') {
    passed.push({ title: 'Tolerated category — existing BUA per assessment record before datum line qualifies', ref: 'Circular Guidelines for 33(7)(B), Clause (b)(iv)' });
  }

  // Gate 4: Members re-accommodated on same plot
  if (!membersOnSamePlot) {
    issues.push({
      level: 'fail',
      title: 'Existing members must be re-accommodated on the same plot',
      detail: '33(7)(B) is only available when existing society members are re-accommodated in the redeveloped project. If members are being shifted off-site permanently, this scheme does not apply.',
      ref: 'Reg 33(7)(B), Clause 3',
    });
  } else {
    passed.push({ title: 'Members re-accommodated on same plot', ref: 'Reg 33(7)(B), Clause 3' });
  }

  // Soft warning: GB resolution is required at process stage
  if (!gbResolution) {
    issues.push({
      level: 'warn',
      title: 'General Body Resolution will be required',
      detail: 'A society GB Resolution specifying who gets the incentive BUA (members vs developer or split) will be required at the proposal stage. Not yet a blocker for feasibility — but plan for it.',
      ref: 'Circular Guidelines for 33(7)(B), Clause (a)',
    });
  }

  const eligible = !issues.some(i => i.level === 'fail');
  return { eligible, issues, passed };
}

function computeBuildable(input) {
  const plotArea = parseFloat(input.plotArea) || 0;
  const dpRoadDeduction = parseFloat(input.dpRoadDeduction) || 0;
  const reservationDeduction = parseFloat(input.reservationDeduction) || 0;
  const netPlot = Math.max(0, plotArea - dpRoadDeduction - reservationDeduction);

  // Existing BUA — either total or sum of flats
  let existingBua = 0;
  let totalCarpet = 0;
  if (input.buaInputMode === 'total') {
    existingBua = parseFloat(input.totalExistingBua) || 0;
    totalCarpet = existingBua / 1.2; // BUA-to-carpet ratio per Reg 33(7)(A) clause 3(b) - applies broadly
  } else {
    totalCarpet = input.flats.reduce((sum, f) => sum + (parseFloat(f.carpet) || 0) * (parseInt(f.count) || 0), 0);
    existingBua = totalCarpet * 1.2; // BUA factor
  }

  const totalFlats = input.buaInputMode === 'total'
    ? (parseInt(input.tenementCount) || 0)
    : input.flats.reduce((sum, f) => sum + (parseInt(f.count) || 0), 0);

  const residentialFlats = input.buaInputMode === 'total'
    ? totalFlats
    : input.flats.filter(f => f.use === 'residential').reduce((sum, f) => sum + (parseInt(f.count) || 0), 0);

  // Core 33(7)(B)(1) incentive: max(15% of existing BUA, 10 sqm × residential tenements)
  const incentive15Pct = existingBua * 0.15;
  const incentivePerTenement = residentialFlats * 10; // 10 sq m per residential tenement
  const incentiveBua = Math.max(incentive15Pct, incentivePerTenement);
  const incentiveBasis = incentive15Pct >= incentivePerTenement ? '15percent' : 'pertenement';

  // Subtotal = existing + incentive (the "no premium" portion under 33(7)(B))
  const conservativeBua = existingBua + incentiveBua;

  // Backstop: per 33(7)(B)(1) proviso, society MAY avail Premium FSI / TDR up to Reg 30(A)(1) limit
  const fsiSlab = findFsiSlab(input.location, parseFloat(input.roadWidth) || 0);
  const reg30MaxBua = netPlot * fsiSlab.max;
  const reg30BasicBua = netPlot * fsiSlab.basic;
  const reg30BasicPlusPremiumBua = netPlot * (fsiSlab.basic + fsiSlab.premium);

  // Realistic scenario: existing + incentive, then top up with premium FSI to reach (basic + premium) ceiling
  const realisticBua = Math.max(conservativeBua, reg30BasicPlusPremiumBua);

  // Maximum scenario: top up with premium + TDR to reach full Table 12 max
  const maximumBua = Math.max(conservativeBua, reg30MaxBua);

  // Fungible Compensatory Area (Reg 31(3)) — 35% on residential
  // Per 33(7) clause 13 (applied analogously in 33(7)(B) practice via circulars):
  // Fungible on rehab (existing + incentive) is FREE of premium; fungible on sale component is on premium
  const fungibleRate = 0.35;
  const fungibleConservative = conservativeBua * fungibleRate;
  const fungibleRealistic = realisticBua * fungibleRate;
  const fungibleMaximum = maximumBua * fungibleRate;

  // Conservative total: existing + incentive + fungible
  const totalConservative = conservativeBua + fungibleConservative;
  const totalRealistic = realisticBua + fungibleRealistic;
  const totalMaximum = maximumBua + fungibleMaximum;

  // Sale component = total - rehab (rehab = existing + incentive)
  const rehabBua = existingBua + incentiveBua;
  const saleConservative = Math.max(0, totalConservative - rehabBua);
  const saleRealistic = Math.max(0, totalRealistic - rehabBua);
  const saleMaximum = Math.max(0, totalMaximum - rehabBua);

  // Premium estimate (50% of ASR land rate × premium BUA, then 50% reduction directive)
  const asrRate = parseFloat(input.asrLandRate) || 0;
  const premiumBuaRealistic = Math.max(0, reg30BasicPlusPremiumBua - reg30BasicBua);
  const premiumBuaMaximum = Math.max(0, reg30MaxBua - reg30BasicBua) - (reg30MaxBua - reg30BasicPlusPremiumBua); // only premium portion, not TDR
  const premiumPayableRealistic = premiumBuaRealistic * asrRate * 0.5 * 0.5;
  const premiumPayableMaximum = (Math.max(0, reg30BasicPlusPremiumBua - reg30BasicBua)) * asrRate * 0.5 * 0.5;

  // Commercial viability: ratio of sale-to-rehab
  // <0.4 — marginal, developer unlikely to bite
  // 0.4-0.8 — viable, normal
  // >0.8 — attractive, multiple bidders likely
  const viabilityRatio = rehabBua > 0 ? saleRealistic / rehabBua : 0;
  let viabilityRating, viabilityNote;
  if (viabilityRatio < 0.3) {
    viabilityRating = 'marginal';
    viabilityNote = 'The sale component for the developer is small relative to rehabilitation. Most developers will not take this on without society contribution, or you may need to wait for higher FSI policies.';
  } else if (viabilityRatio < 0.6) {
    viabilityRating = 'viable';
    viabilityNote = 'The sale component is meaningful. Established developers will consider this; expect cautious offers.';
  } else if (viabilityRatio < 1.0) {
    viabilityRating = 'attractive';
    viabilityNote = 'Healthy sale-to-rehab ratio. Multiple developers should bid; you have good negotiating position.';
  } else {
    viabilityRating = 'highly attractive';
    viabilityNote = 'Sale component exceeds rehabilitation. Strong negotiating position — expect competitive bids and good corpus offers.';
  }

  // Member entitlement breakdown
  const flatBreakdown = input.buaInputMode === 'breakdown'
    ? input.flats.filter(f => parseInt(f.count) > 0).map(f => {
        const carpet = parseFloat(f.carpet) || 0;
        const count = parseInt(f.count) || 0;
        // Realistic expectation: existing + share of incentive proportional to flat size
        // Per society resolution this can vary; show typical 20-30% bump
        const minGuaranteed = carpet;
        const realisticLow = carpet * 1.20;
        const realisticHigh = carpet * 1.30;
        return {
          label: f.label || (f.use === 'residential' ? 'Residential' : 'Commercial'),
          count,
          existingCarpet: carpet,
          minGuaranteed,
          realisticLow,
          realisticHigh,
          use: f.use,
        };
      })
    : [];

  return {
    plotArea,
    netPlot,
    existingBua,
    totalFlats,
    residentialFlats,
    incentiveBua,
    incentiveBasis,
    incentive15Pct,
    incentivePerTenement,
    rehabBua,
    fsiSlab,
    reg30BasicBua,
    reg30BasicPlusPremiumBua,
    reg30MaxBua,
    conservativeBua,
    realisticBua,
    maximumBua,
    fungibleConservative,
    fungibleRealistic,
    fungibleMaximum,
    totalConservative,
    totalRealistic,
    totalMaximum,
    saleConservative,
    saleRealistic,
    saleMaximum,
    viabilityRating,
    viabilityNote,
    viabilityRatio,
    premiumPayableRealistic,
    premiumPayableMaximum,
    flatBreakdown,
    effectiveFsiConservative: netPlot > 0 ? totalConservative / netPlot : 0,
    effectiveFsiRealistic: netPlot > 0 ? totalRealistic / netPlot : 0,
    effectiveFsiMaximum: netPlot > 0 ? totalMaximum / netPlot : 0,
  };
}

// ============================================================================
// FORMATTING UTILITIES
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
// MAIN APP
// ============================================================================

export default function App() {
  const [input, setInput] = useState({
    societyName: '',
    address: '',
    location: 'suburbsExtended',
    buildingAge: 38,
    buildingType: 'society',
    authorisationStatus: 'oc',
    membersOnSamePlot: true,
    gbResolution: false,
    plotArea: 1500,
    dpRoadDeduction: 0,
    reservationDeduction: 0,
    roadWidth: 12,
    buaInputMode: 'breakdown',
    totalExistingBua: '',
    tenementCount: '',
    flats: [
      { label: '1BHK', carpet: 32, count: 12, use: 'residential' },
      { label: '2BHK', carpet: 56, count: 10, use: 'residential' },
      { label: '3BHK', carpet: 88, count: 2,  use: 'residential' },
    ],
    asrLandRate: 200000,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(null);

  const update = (k, v) => setInput(prev => ({ ...prev, [k]: v }));

  const updateFlat = (idx, k, v) => {
    setInput(prev => ({
      ...prev,
      flats: prev.flats.map((f, i) => i === idx ? { ...f, [k]: v } : f),
    }));
  };

  const addFlat = () => {
    setInput(prev => ({
      ...prev,
      flats: [...prev.flats, { label: 'New', carpet: 50, count: 1, use: 'residential' }],
    }));
  };

  const removeFlat = (idx) => {
    setInput(prev => ({
      ...prev,
      flats: prev.flats.filter((_, i) => i !== idx),
    }));
  };

  const eligibility = useMemo(() => analyseEligibility(input), [input]);
  const result = useMemo(() => computeBuildable(input), [input]);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f1ea', color: '#1a1815', fontFamily: '"Source Sans 3", -apple-system, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&family=JetBrains+Mono:wght@400;500;600&display=swap');

        * { box-sizing: border-box; }
        body { margin: 0; }

        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: #f5f1ea; }
        ::-webkit-scrollbar-thumb { background: #d4c9b8; border-radius: 5px; }

        .serif { font-family: "Source Serif 4", Georgia, serif; font-feature-settings: "liga", "kern"; }
        .num { font-family: "JetBrains Mono", monospace; font-feature-settings: "tnum"; }

        input[type="text"], input[type="number"], select, textarea {
          width: 100%;
          background: #fffefb;
          border: 1px solid #d4c9b8;
          color: #1a1815;
          padding: 9px 12px;
          font-family: inherit;
          font-size: 14px;
          border-radius: 3px;
          outline: none;
          transition: border-color 0.12s;
        }

        input:focus, select:focus, textarea:focus {
          border-color: #8b3a2a;
          box-shadow: 0 0 0 3px rgba(139, 58, 42, 0.1);
        }

        input[type="number"].num { font-family: "JetBrains Mono", monospace; }

        select { cursor: pointer; appearance: none; background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%238b3a2a' stroke-width='1.5'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }

        .field-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #6b5d47;
          margin-bottom: 6px;
        }

        .help-text {
          font-size: 11.5px;
          color: #6b5d47;
          margin-top: 5px;
          line-height: 1.5;
          font-style: italic;
        }

        .radio-card {
          padding: 10px 12px;
          border: 1px solid #d4c9b8;
          border-radius: 3px;
          cursor: pointer;
          background: #fffefb;
          transition: all 0.12s;
          font-size: 13px;
        }
        .radio-card:hover { border-color: #8b3a2a; }
        .radio-card.active { border-color: #8b3a2a; background: rgba(139, 58, 42, 0.04); }

        .scenario-card {
          padding: 24px;
          border-radius: 6px;
          background: #fffefb;
          border: 1px solid #e7dfd0;
          transition: all 0.2s;
        }

        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          .scenario-card { break-inside: avoid; border: 1px solid #999; }
        }

        @media (max-width: 980px) {
          .grid-2col { grid-template-columns: 1fr !important; }
          .grid-3col { grid-template-columns: 1fr !important; }
        }

        details summary { cursor: pointer; list-style: none; }
        details summary::-webkit-details-marker { display: none; }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        details[open] > div { animation: slideDown 0.2s ease-out; }
      `}</style>

      {/* HEADER */}
      <header style={{ borderBottom: '1px solid #d4c9b8', background: '#f5f1ea', padding: '24px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, background: '#8b3a2a', borderRadius: 3, display: 'grid', placeItems: 'center', color: '#f5f1ea', fontFamily: 'Source Serif 4', fontWeight: 600, fontSize: 18, fontStyle: 'italic' }}>R</div>
              <div className="serif" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.01em' }}>RedevReady</div>
            </div>
            <div style={{ fontSize: 12, color: '#6b5d47', letterSpacing: '0.04em', marginLeft: 50 }}>Society redevelopment feasibility · Mumbai (MCGM)</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="num" style={{ fontSize: 11, color: '#6b5d47', letterSpacing: '0.06em' }}>REG 33(7)(B) · DCPR 2034</div>
            <div style={{ fontSize: 11, color: '#a89c87', marginTop: 4 }}>Free preview · For your committee discussion</div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px' }}>

        {/* INTRO */}
        <div style={{ marginBottom: 40, maxWidth: 760 }}>
          <h1 className="serif" style={{ fontSize: 44, fontWeight: 600, lineHeight: 1.1, margin: 0, letterSpacing: '-0.02em', color: '#1a1815' }}>
            What can your society<br/>actually be redeveloped into?
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: '#3d3528', marginTop: 20 }}>
            For housing societies in MCGM jurisdiction whose buildings are 30+ years old. Tells you the buildable area each member is entitled to, the developer's sale component, and three honest scenarios — conservative, realistic, and maximum — based on Regulation 33(7)(B) of the DCPR 2034.
          </p>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: '#6b5d47', marginTop: 16, padding: '14px 18px', background: 'rgba(139, 58, 42, 0.04)', borderLeft: '3px solid #8b3a2a', borderRadius: 2 }}>
            <strong>This is preliminary.</strong> The output is for your committee meetings, not for sanctioning. A Licensed Architect should verify on your specific drawings before any agreement with a developer.
          </div>
        </div>

        <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 40, alignItems: 'start' }}>

          {/* LEFT: INPUTS */}
          <div className="no-print" style={{ position: 'sticky', top: 24 }}>
            <div style={{ background: '#fffefb', border: '1px solid #d4c9b8', borderRadius: 4, padding: 28 }}>
              <div className="serif" style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid #e7dfd0' }}>About your building</div>

              <Section title="Society details">
                <div>
                  <label className="field-label">Society name</label>
                  <input type="text" value={input.societyName} onChange={e => update('societyName', e.target.value)} placeholder="e.g. Saraswati CHS Ltd" />
                </div>
                <div style={{ marginTop: 14 }}>
                  <label className="field-label">Address / locality</label>
                  <input type="text" value={input.address} onChange={e => update('address', e.target.value)} placeholder="e.g. Borivali West" />
                </div>
                <div style={{ marginTop: 14 }}>
                  <label className="field-label">Location in Mumbai</label>
                  <select value={input.location} onChange={e => update('location', e.target.value)}>
                    <option value="suburbsExtended">Suburbs / Extended Suburbs</option>
                    <option value="islandCity">Island City (south of Mahim/Sion)</option>
                  </select>
                </div>
              </Section>

              <Section title="Building basics" topMargin>
                <div>
                  <label className="field-label">Age of building (years)</label>
                  <input type="number" className="num" value={input.buildingAge} onChange={e => update('buildingAge', parseInt(e.target.value) || 0)} />
                  <div className="help-text">Reg 33(7)(B) needs 30+ years. If younger, consider waiting or pursue 33(7)(A) if dilapidated.</div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <label className="field-label">Building type</label>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {[
                      { id: 'society', label: 'Cooperative housing society (members own flats)' },
                      { id: 'cessed', label: 'Cessed building (paying MHADA cess)' },
                      { id: 'tenanted', label: 'Tenanted building (tenants, not members)' },
                    ].map(opt => (
                      <div key={opt.id} className={`radio-card ${input.buildingType === opt.id ? 'active' : ''}`} onClick={() => update('buildingType', opt.id)}>
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
                  <select value={input.authorisationStatus} onChange={e => update('authorisationStatus', e.target.value)}>
                    <option value="oc">Has Occupation Certificate (OC)</option>
                    <option value="cc">CC + approved plans only</option>
                    <option value="tolerated">Tolerated (assessment record before datum line)</option>
                    <option value="none">No approved plans, OC, or MCGM file</option>
                  </select>
                  <div className="help-text">Check with your society's office bearers or the society's document file.</div>
                </div>
              </Section>

              <Section title="Plot & access" topMargin>
                <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="field-label">Plot area (sqm)</label>
                    <input type="number" className="num" value={input.plotArea} onChange={e => update('plotArea', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className="field-label">Road width (m)</label>
                    <input type="number" className="num" value={input.roadWidth} onChange={e => update('roadWidth', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="help-text">Plot area is on your society's title document or property card. Road width is the width of the road in front of the gate.</div>

                <button onClick={() => setShowAdvanced(!showAdvanced)} style={{ marginTop: 14, fontSize: 12, color: '#8b3a2a', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
                  {showAdvanced ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showAdvanced ? 'Hide' : 'Show'} advanced inputs
                </button>

                {showAdvanced && (
                  <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                    <div>
                      <label className="field-label">DP road set-back (sqm)</label>
                      <input type="number" className="num" value={input.dpRoadDeduction} onChange={e => update('dpRoadDeduction', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <label className="field-label">DP reservation (sqm)</label>
                      <input type="number" className="num" value={input.reservationDeduction} onChange={e => update('reservationDeduction', parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                )}
              </Section>

              <Section title="Existing flats & built-up area" topMargin>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button
                    onClick={() => update('buaInputMode', 'breakdown')}
                    style={{ flex: 1, padding: '8px 10px', fontSize: 12, border: `1px solid ${input.buaInputMode === 'breakdown' ? '#8b3a2a' : '#d4c9b8'}`, background: input.buaInputMode === 'breakdown' ? 'rgba(139, 58, 42, 0.04)' : '#fffefb', color: input.buaInputMode === 'breakdown' ? '#8b3a2a' : '#6b5d47', cursor: 'pointer', borderRadius: 3, fontWeight: 500 }}>
                    By flat type
                  </button>
                  <button
                    onClick={() => update('buaInputMode', 'total')}
                    style={{ flex: 1, padding: '8px 10px', fontSize: 12, border: `1px solid ${input.buaInputMode === 'total' ? '#8b3a2a' : '#d4c9b8'}`, background: input.buaInputMode === 'total' ? 'rgba(139, 58, 42, 0.04)' : '#fffefb', color: input.buaInputMode === 'total' ? '#8b3a2a' : '#6b5d47', cursor: 'pointer', borderRadius: 3, fontWeight: 500 }}>
                    Total only
                  </button>
                </div>

                {input.buaInputMode === 'breakdown' ? (
                  <div>
                    {input.flats.map((flat, idx) => (
                      <div key={idx} style={{ padding: 10, border: '1px solid #e7dfd0', borderRadius: 3, marginBottom: 8, background: '#fafaf5' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 26px', gap: 6, alignItems: 'end' }}>
                          <div>
                            <div className="field-label" style={{ fontSize: 9, marginBottom: 3 }}>Type</div>
                            <input type="text" value={flat.label} onChange={e => updateFlat(idx, 'label', e.target.value)} style={{ padding: '6px 8px', fontSize: 12 }} />
                          </div>
                          <div>
                            <div className="field-label" style={{ fontSize: 9, marginBottom: 3 }}>Carpet (sqm)</div>
                            <input type="number" className="num" value={flat.carpet} onChange={e => updateFlat(idx, 'carpet', e.target.value)} style={{ padding: '6px 8px', fontSize: 12 }} />
                          </div>
                          <div>
                            <div className="field-label" style={{ fontSize: 9, marginBottom: 3 }}>Count</div>
                            <input type="number" className="num" value={flat.count} onChange={e => updateFlat(idx, 'count', e.target.value)} style={{ padding: '6px 8px', fontSize: 12 }} />
                          </div>
                          <button onClick={() => removeFlat(idx)} style={{ padding: 6, background: 'none', border: '1px solid #d4c9b8', borderRadius: 3, cursor: 'pointer', color: '#a89c87' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 10, color: '#6b5d47' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                            <input type="radio" checked={flat.use === 'residential'} onChange={() => updateFlat(idx, 'use', 'residential')} />
                            Residential
                          </label>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 12, cursor: 'pointer' }}>
                            <input type="radio" checked={flat.use === 'commercial'} onChange={() => updateFlat(idx, 'use', 'commercial')} />
                            Shop / commercial
                          </label>
                        </div>
                      </div>
                    ))}
                    <button onClick={addFlat} style={{ width: '100%', padding: '8px', fontSize: 12, background: 'none', border: '1px dashed #d4c9b8', borderRadius: 3, cursor: 'pointer', color: '#8b3a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Plus size={12} /> Add flat type
                    </button>
                  </div>
                ) : (
                  <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="field-label">Total existing BUA (sqm)</label>
                      <input type="number" className="num" value={input.totalExistingBua} onChange={e => update('totalExistingBua', e.target.value)} />
                    </div>
                    <div>
                      <label className="field-label">Total flats</label>
                      <input type="number" className="num" value={input.tenementCount} onChange={e => update('tenementCount', e.target.value)} />
                    </div>
                  </div>
                )}
              </Section>

              <Section title="Confirmations" topMargin>
                <Toggle
                  checked={input.membersOnSamePlot}
                  onChange={v => update('membersOnSamePlot', v)}
                  label="Members will be re-accommodated on the same plot"
                  sub="Required by Reg 33(7)(B), Clause 3"
                />
                <Toggle
                  checked={input.gbResolution}
                  onChange={v => update('gbResolution', v)}
                  label="Society GB resolution passed (or planned)"
                  sub="Required at proposal stage"
                />
              </Section>

              {showAdvanced && (
                <Section title="For premium estimate" topMargin>
                  <div>
                    <label className="field-label">ASR land rate for FSI 1 (₹/sqm)</label>
                    <input type="number" className="num" value={input.asrLandRate} onChange={e => update('asrLandRate', parseFloat(e.target.value) || 0)} />
                    <div className="help-text">From IGR Maharashtra Annual Statement of Rates for your area. Used only to estimate premium payable in maximum scenario.</div>
                  </div>
                </Section>
              )}
            </div>
          </div>

          {/* RIGHT: OUTPUT */}
          <div>
            {/* HEADLINE: ELIGIBILITY */}
            <EligibilityPanel eligibility={eligibility} input={input} />

            {eligibility.eligible && (
              <>
                {/* SCENARIO COMPARISON */}
                <ScenarioComparison result={result} input={input} />

                {/* MEMBER ENTITLEMENT */}
                {result.flatBreakdown.length > 0 && (
                  <MemberEntitlement breakdown={result.flatBreakdown} result={result} />
                )}

                {/* AREA STATEMENT */}
                <AreaStatement result={result} input={input} />

                {/* WHAT TO WATCH FOR */}
                <WatchOutFor result={result} />

                {/* NEXT STEPS */}
                <NextSteps />

                {/* FAQ / EXPLAINER */}
                <Explainers />
              </>
            )}

            {/* PRINT BUTTON */}
            <div className="no-print" style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #d4c9b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, color: '#6b5d47', maxWidth: 480 }}>
                Forward this analysis to your committee. For a Licensed Architect's stamped report — needed for bank/lender or formal society resolution — see the next-steps section.
              </div>
              <button onClick={() => window.print()} style={{ padding: '11px 18px', fontSize: 13, fontWeight: 600, background: '#1a1815', color: '#f5f1ea', border: 'none', borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Printer size={14} /> Print or save as PDF
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer style={{ marginTop: 80, paddingTop: 32, borderTop: '1px solid #d4c9b8', fontSize: 11, color: '#a89c87', lineHeight: 1.7 }}>
          <p style={{ maxWidth: 760 }}>
            <strong style={{ color: '#6b5d47' }}>Disclaimer.</strong> RedevReady provides preliminary feasibility analysis based on the Comprehensive DCPR 2034 (PEATA edition). Outputs are not sanctioned approvals. The original gazette notifications and any subsequent State/MCGM amendments shall prevail. This analysis does not replace a Licensed Architect's certified plan or legal advice. Use with awareness of its limits.
          </p>
        </footer>
      </div>
    </div>
  );
}

// ============================================================================
// REUSABLE UI COMPONENTS
// ============================================================================

const Section = ({ title, children, topMargin }) => (
  <div style={{ marginTop: topMargin ? 24 : 0 }}>
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8b3a2a', marginBottom: 14 }}>{title}</div>
    {children}
  </div>
);

const Radio = ({ active }) => (
  <div style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${active ? '#8b3a2a' : '#d4c9b8'}`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
    {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b3a2a' }} />}
  </div>
);

const Toggle = ({ checked, onChange, label, sub }) => (
  <label style={{ display: 'flex', gap: 12, padding: '10px 0', cursor: 'pointer', borderBottom: '1px solid #f0e9dd' }}>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ marginTop: 4, accentColor: '#8b3a2a' }} />
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1815' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#6b5d47', marginTop: 2 }}>{sub}</div>}
    </div>
  </label>
);

// ============================================================================
// ELIGIBILITY PANEL
// ============================================================================

function EligibilityPanel({ eligibility, input }) {
  return (
    <div style={{
      background: eligibility.eligible ? '#f0f5ee' : '#fbeeea',
      border: `1px solid ${eligibility.eligible ? '#a8c2a0' : '#d8a59a'}`,
      borderRadius: 6,
      padding: 28,
      marginBottom: 28,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: eligibility.eligible ? '#5a7a4f' : '#a4493a', display: 'grid', placeItems: 'center', flexShrink: 0, color: 'white' }}>
          {eligibility.eligible ? <Check size={22} /> : <X size={22} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: eligibility.eligible ? '#5a7a4f' : '#a4493a', fontWeight: 600 }}>
            {eligibility.eligible ? 'Eligible for redevelopment' : 'Not yet eligible — see issues below'}
          </div>
          <h2 className="serif" style={{ fontSize: 26, fontWeight: 600, margin: '4px 0 0 0', color: '#1a1815', lineHeight: 1.2 }}>
            {eligibility.eligible
              ? `${input.societyName || 'Your society'} qualifies under Reg 33(7)(B)`
              : `${input.societyName || 'Your society'} cannot use Reg 33(7)(B) yet`}
          </h2>
          {!eligibility.eligible && (
            <p style={{ fontSize: 14, color: '#3d3528', marginTop: 8, lineHeight: 1.5 }}>
              Resolve the items below before proceeding. Some are absolute blockers (red); others are warnings that need attention later (amber).
            </p>
          )}
        </div>
      </div>

      {eligibility.passed.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${eligibility.eligible ? '#cdd9c6' : '#e8d4ce'}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5a7a4f', marginBottom: 10 }}>What's working</div>
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
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${eligibility.eligible ? '#cdd9c6' : '#e8d4ce'}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a4493a', marginBottom: 10 }}>Issues to address</div>
          <div style={{ display: 'grid', gap: 12 }}>
            {eligibility.issues.map((iss, i) => (
              <div key={i} style={{
                padding: 14,
                background: 'rgba(255,255,255,0.6)',
                border: `1px solid ${iss.level === 'fail' ? '#d8a59a' : '#e0c89a'}`,
                borderLeft: `3px solid ${iss.level === 'fail' ? '#a4493a' : '#c08c30'}`,
                borderRadius: 3,
              }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {iss.level === 'fail' ? <X size={14} color="#a4493a" style={{ flexShrink: 0, marginTop: 3 }} /> : <AlertTriangle size={14} color="#c08c30" style={{ flexShrink: 0, marginTop: 3 }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1815' }}>{iss.title}</div>
                    <div style={{ fontSize: 12.5, color: '#3d3528', marginTop: 6, lineHeight: 1.55 }}>{iss.detail}</div>
                    <div className="num" style={{ fontSize: 10, color: '#6b5d47', marginTop: 8, letterSpacing: '0.04em' }}>[{iss.ref}]</div>
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
// SCENARIO COMPARISON — THE CENTREPIECE
// ============================================================================

function ScenarioComparison({ result, input }) {
  const scenarios = [
    {
      name: 'Conservative',
      sub: 'Existing + Incentive only',
      logic: 'Use only the free incentive BUA (15% of existing OR 10 sqm/flat). No premium FSI, no TDR. The smallest legitimate outcome.',
      total: result.totalConservative,
      sale: result.saleConservative,
      rehab: result.rehabBua,
      fungible: result.fungibleConservative,
      effFsi: result.effectiveFsiConservative,
      premium: 0,
      colour: '#6b5d47',
    },
    {
      name: 'Realistic',
      sub: 'Existing + Incentive + Premium FSI',
      logic: 'Society pays premium to MCGM (50% of ASR rate, halved by 14.01.2021 directive) to load up to (Basic + Premium) FSI per Table 12. Most society redevs end up here.',
      total: result.totalRealistic,
      sale: result.saleRealistic,
      rehab: result.rehabBua,
      fungible: result.fungibleRealistic,
      effFsi: result.effectiveFsiRealistic,
      premium: result.premiumPayableRealistic,
      colour: '#8b3a2a',
      highlight: true,
    },
    {
      name: 'Maximum',
      sub: 'Existing + Incentive + Premium + TDR',
      logic: 'Above realistic, also load TDR (Transferable Development Rights — purchased separately) to reach Table 12 ceiling. Best when TDR is cheap and well-located plot.',
      total: result.totalMaximum,
      sale: result.saleMaximum,
      rehab: result.rehabBua,
      fungible: result.fungibleMaximum,
      effFsi: result.effectiveFsiMaximum,
      premium: result.premiumPayableMaximum,
      colour: '#3d5a4d',
    },
  ];

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="The three scenarios" title="What your society can be redeveloped into">
        Three honest outcomes based on Reg 33(7)(B) and the Table 12 backstop. The Realistic column is the most common end-state; Conservative is the absolute floor; Maximum requires TDR purchase and good site conditions.
      </SectionTitle>

      <div className="grid-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {scenarios.map((s, i) => (
          <div key={i} className="scenario-card" style={{
            borderColor: s.highlight ? s.colour : '#e7dfd0',
            background: s.highlight ? 'rgba(139, 58, 42, 0.03)' : '#fffefb',
            position: 'relative',
          }}>
            {s.highlight && (
              <div style={{ position: 'absolute', top: -10, left: 20, background: s.colour, color: 'white', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 2, letterSpacing: '0.08em' }}>MOST LIKELY</div>
            )}

            <div className="serif" style={{ fontSize: 24, fontWeight: 600, color: s.colour, lineHeight: 1, marginBottom: 4 }}>{s.name}</div>
            <div style={{ fontSize: 11.5, color: '#6b5d47', marginBottom: 18, lineHeight: 1.4 }}>{s.sub}</div>

            <div style={{ paddingTop: 14, borderTop: '1px solid #e7dfd0' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b5d47', marginBottom: 4 }}>Total buildable</div>
              <div className="num" style={{ fontSize: 26, fontWeight: 700, color: '#1a1815', lineHeight: 1 }}>
                {fmt(s.total)} <span style={{ fontSize: 12, fontWeight: 500, color: '#6b5d47' }}>sqm</span>
              </div>
              <div className="num" style={{ fontSize: 13, color: '#6b5d47', marginTop: 2 }}>
                ≈ {fmtSqft(s.total)} sq ft
              </div>
              <div className="num" style={{ fontSize: 11, color: '#6b5d47', marginTop: 6 }}>
                Effective FSI: {s.effFsi.toFixed(2)}
              </div>
            </div>

            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #e7dfd0', display: 'grid', gap: 10 }}>
              <Row label="Rehab to members" value={`${fmt(s.rehab)} sqm`} sub={`≈ ${fmtSqft(s.rehab)} sq ft`} />
              <Row label="Sale to developer" value={`${fmt(s.sale)} sqm`} sub={`≈ ${fmtSqft(s.sale)} sq ft`} highlight={s.highlight} />
              <Row label="Fungible (35%)" value={`${fmt(s.fungible)} sqm`} muted />
              {s.premium > 0 && (
                <Row label="Premium payable" value={fmtCurrency(s.premium)} muted />
              )}
            </div>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #e7dfd0', fontSize: 11.5, lineHeight: 1.55, color: '#3d3528' }}>
              {s.logic}
            </div>
          </div>
        ))}
      </div>

      {/* VIABILITY VERDICT */}
      <div style={{ marginTop: 18, padding: '18px 22px', background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 4, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', marginTop: 7, flexShrink: 0,
          background: result.viabilityRating === 'marginal' ? '#c08c30' : result.viabilityRating === 'viable' ? '#8b3a2a' : '#3d5a4d',
        }} />
        <div>
          <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b5d47', fontWeight: 600 }}>Commercial viability — {result.viabilityRating}</div>
          <div style={{ fontSize: 13.5, color: '#1a1815', marginTop: 4, lineHeight: 1.55 }}>{result.viabilityNote}</div>
          <div style={{ fontSize: 11.5, color: '#6b5d47', marginTop: 6 }}>
            Sale-to-rehab ratio in Realistic scenario: <span className="num" style={{ fontWeight: 600 }}>{result.viabilityRatio.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const Row = ({ label, value, sub, highlight, muted }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
    <div style={{ fontSize: 12, color: muted ? '#a89c87' : '#3d3528' }}>{label}</div>
    <div style={{ textAlign: 'right' }}>
      <div className="num" style={{ fontSize: 13, fontWeight: highlight ? 700 : 500, color: muted ? '#6b5d47' : highlight ? '#8b3a2a' : '#1a1815' }}>{value}</div>
      {sub && <div className="num" style={{ fontSize: 10, color: '#a89c87', marginTop: 1 }}>{sub}</div>}
    </div>
  </div>
);

// ============================================================================
// MEMBER ENTITLEMENT
// ============================================================================

function MemberEntitlement({ breakdown, result }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="What each member can expect" title="Member entitlement breakdown">
        The minimum guarantee under 33(7)(B) is <em>existing carpet area</em> for each member. Realistic expectation includes a share of the incentive BUA, typically 20–30% larger than current — exact split depends on your society's General Body resolution.
      </SectionTitle>

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
                  <div style={{ fontSize: 10, color: '#a89c87', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{b.use}</div>
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
                  <span style={{ fontWeight: 700, color: '#8b3a2a' }}>{fmt(b.realisticLow)}–{fmt(b.realisticHigh)} sqm</span>
                  <div style={{ fontSize: 10, color: '#a89c87' }}>≈ {fmtSqft(b.realisticLow)}–{fmtSqft(b.realisticHigh)} sqft</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: '#6b5d47', lineHeight: 1.6, padding: '12px 14px', background: 'rgba(139, 58, 42, 0.03)', borderLeft: '3px solid #8b3a2a', borderRadius: 2 }}>
        <strong>Note:</strong> Reg 33(7)(B) does not specify a fixed bump like 33(7)(A)'s "5%/8%/15% additional rehab carpet". The incentive BUA can be allocated to members, retained by developer, or split — as decided by the society's General Body resolution. The realistic expectation column assumes the society negotiates a fair split (typical: members keep 70–80% of incentive BUA + flat-size proportional).
      </div>
    </div>
  );
}

// ============================================================================
// AREA STATEMENT — DETAILED WORKING
// ============================================================================

function AreaStatement({ result, input }) {
  const incentiveLabel = result.incentiveBasis === '15percent'
    ? '15% of existing BUA'
    : `10 sqm × ${result.residentialFlats} residential flats`;

  const rows = [
    { isHeader: true, section: 'A', label: 'Plot computation' },
    { label: 'Gross plot area', value: result.plotArea, unit: 'sqm', ref: 'Owner declaration' },
    { label: 'Less: DP road / set-back', value: -input.dpRoadDeduction, unit: 'sqm', ref: 'Reg 30(A)(2)' },
    { label: 'Less: DP reservation', value: -input.reservationDeduction, unit: 'sqm', ref: 'Reg 17 / Reg 30(A)(2)' },
    { label: 'Net plot area for FSI', value: result.netPlot, unit: 'sqm', ref: 'Reg 30(A)(2)', bold: true },

    { isHeader: true, section: 'B', label: 'Existing built-up area' },
    { label: 'Total existing authorised BUA', value: result.existingBua, unit: 'sqm', ref: 'OC plans / approved plans', bold: true },
    { label: 'Total residential tenements', value: result.residentialFlats, unit: 'flats', ref: 'Society records' },
    { label: 'Total tenements (incl. commercial)', value: result.totalFlats, unit: 'flats', ref: '—' },

    { isHeader: true, section: 'C', label: 'Incentive BUA — 33(7)(B)(1)' },
    { label: '15% of existing BUA', value: result.incentive15Pct, unit: 'sqm', ref: 'Reg 33(7)(B)(1)' },
    { label: `10 sqm × ${result.residentialFlats} flats`, value: result.incentivePerTenement, unit: 'sqm', ref: 'Reg 33(7)(B)(1)' },
    { label: `Incentive BUA = greater of above (${incentiveLabel})`, value: result.incentiveBua, unit: 'sqm', ref: 'Reg 33(7)(B)(1)', bold: true, highlight: true },
    { label: 'Premium on incentive BUA', value: 0, unit: '₹', ref: 'Reg 33(7)(B)(1) — without premium', italic: true, currency: true },

    { isHeader: true, section: 'D', label: 'Backstop — Reg 30 / Table 12 ceiling' },
    { label: `Road width ${input.roadWidth} m, ${input.location === 'islandCity' ? 'Island City' : 'Suburbs'} — applicable slab`, ref: `Reg 30 / Table 12`, meta: true },
    { label: 'Basic FSI on net plot', value: result.fsiSlab.basic, unit: 'index', ref: 'Reg 30 / Table 12, Col 4' },
    { label: 'Basic + Premium FSI ceiling', value: result.fsiSlab.basic + result.fsiSlab.premium, unit: 'index', ref: 'Reg 30 / Table 12, Cols 4+5' },
    { label: 'Maximum FSI (Basic + Premium + TDR)', value: result.fsiSlab.max, unit: 'index', ref: 'Reg 30 / Table 12, Col 7' },
    { label: 'Reg 30 BUA at Basic only', value: result.reg30BasicBua, unit: 'sqm', ref: '—' },
    { label: 'Reg 30 BUA at Basic + Premium', value: result.reg30BasicPlusPremiumBua, unit: 'sqm', ref: '—' },
    { label: 'Reg 30 BUA at Maximum', value: result.reg30MaxBua, unit: 'sqm', ref: '—' },

    { isHeader: true, section: 'E', label: 'Computed BUA per scenario' },
    { label: 'Conservative: Existing + Incentive', value: result.conservativeBua, unit: 'sqm', ref: '33(7)(B)(1)' },
    { label: 'Realistic: max(Conservative, Reg 30 Basic+Premium)', value: result.realisticBua, unit: 'sqm', ref: '33(7)(B)(1) proviso' },
    { label: 'Maximum: max(Conservative, Reg 30 full)', value: result.maximumBua, unit: 'sqm', ref: '33(7)(B)(1) proviso' },

    { isHeader: true, section: 'F', label: 'Fungible Compensatory Area — Reg 31(3)' },
    { label: '35% of Realistic BUA (residential)', value: result.fungibleRealistic, unit: 'sqm', ref: 'Reg 31(3)' },
    { label: 'Premium on fungible (rehab portion)', value: 0, unit: '₹', ref: 'Reg 33(7) clause 13 (analogous)', italic: true, currency: true },

    { isHeader: true, section: 'G', label: 'Final buildable totals' },
    { label: 'Total buildable BUA — Realistic', value: result.totalRealistic, unit: 'sqm', ref: 'Computed', bold: true, highlight: true },
    { label: '   of which: Rehab to existing members', value: result.rehabBua, unit: 'sqm', ref: '—' },
    { label: '   of which: Sale component for developer', value: result.saleRealistic, unit: 'sqm', ref: '—', bold: true },
  ];

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Detailed working" title="Area statement with regulation references">
        For your committee meeting, your architect, or to verify against any developer's offer document.
      </SectionTitle>

      <div style={{ background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 4, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f0e9dd', borderBottom: '1px solid #e7dfd0' }}>
              <th style={th}>#</th>
              <th style={{ ...th, textAlign: 'left' }}>Item</th>
              <th style={{ ...th, textAlign: 'right' }}>Value</th>
              <th style={{ ...th, textAlign: 'left', width: 70 }}>Unit</th>
              <th style={{ ...th, textAlign: 'left' }}>Reference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              if (row.isHeader) {
                return (
                  <tr key={i} style={{ background: 'rgba(139, 58, 42, 0.06)' }}>
                    <td colSpan={5} style={{ padding: '10px 18px', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8b3a2a', fontWeight: 700 }}>
                      {row.section} — {row.label}
                    </td>
                  </tr>
                );
              }
              if (row.meta) {
                return (
                  <tr key={i}>
                    <td></td>
                    <td colSpan={4} style={{ padding: '6px 18px', fontSize: 11, color: '#6b5d47', fontStyle: 'italic' }}>
                      {row.label} — <span className="num" style={{ color: '#8b3a2a', fontStyle: 'normal' }}>[{row.ref}]</span>
                    </td>
                  </tr>
                );
              }
              const isNeg = typeof row.value === 'number' && row.value < 0;
              return (
                <tr key={i} style={{
                  borderBottom: '1px solid #f5efe2',
                  background: row.highlight ? 'rgba(139, 58, 42, 0.04)' : 'transparent',
                }}>
                  <td style={{ ...td, color: '#a89c87', fontSize: 10 }} className="num">{i + 1}</td>
                  <td style={{ ...td, fontWeight: row.bold ? 600 : 400, color: row.bold ? '#1a1815' : '#3d3528', fontStyle: row.italic ? 'italic' : 'normal' }}>{row.label}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: row.bold ? 700 : 500, color: row.highlight ? '#8b3a2a' : isNeg ? '#a4493a' : '#1a1815' }} className="num">
                    {row.currency ? fmtCurrency(row.value) : (typeof row.value === 'number' ? fmt(row.value, row.value < 10 && row.value > 0 ? 2 : 0) : (row.value || '—'))}
                  </td>
                  <td style={{ ...td, fontSize: 11, color: '#6b5d47' }} className="num">{row.unit}</td>
                  <td style={{ ...td, fontSize: 10.5, color: '#8b3a2a' }} className="num">{row.ref}</td>
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
// WATCH OUT FOR
// ============================================================================

function WatchOutFor({ result }) {
  const items = [
    {
      title: 'Developer claims you can only get "1.2× existing carpet"',
      response: `Under 33(7)(B), the incentive BUA is at minimum 15% of total existing BUA, OR 10 sqm per residential flat (whichever is higher) — that's free. Beyond that, the regulation also allows your society to access premium FSI and TDR up to the Table 12 ceiling. A flat 1.2× offer is a developer's negotiation position, not the regulation.`,
    },
    {
      title: 'Developer says "TDR is not available" or "TDR is too expensive"',
      response: `TDR (Transferable Development Rights) is available in Mumbai and is actively traded. Whether it makes sense depends on TDR market price vs. ASR rates at your location. If a developer rules it out, ask them to show you the TDR market quote they used. The Maximum scenario above assumes TDR is available; if it's not, the Realistic scenario still applies.`,
    },
    {
      title: 'Developer asks the society to pay any premium',
      response: `Under 33(7)(B), the incentive BUA portion is free of premium. The premium that's payable goes to MCGM, not the developer, and applies only to the Premium FSI portion above existing+incentive. The standard practice is the developer pays this premium from their sale-component proceeds. If a developer asks the society to pay premium, that's a major red flag.`,
    },
    {
      title: `Developer offers area X but won't show the area statement`,
      response: `Always ask for a written area statement (like the one in this report) showing: existing BUA, incentive BUA, rehab to members, sale to developer, fungible. Reputable developers and their architects produce this routinely. Refusal to show is itself information.`,
    },
    {
      title: 'Developer commits to a corpus of ₹X lakhs per flat without showing the maths',
      response: `Corpus, rent during construction, and other monetary payments are negotiated and not regulated by the DCPR. Reasonable benchmarks come from comparable society redevs in your micro-market. Get at least 3 developer offers and compare corpus + rent + carpet + finishing schedule together — not corpus alone.`,
    },
    {
      title: result.viabilityRatio < 0.4 ? 'No developer is interested or all want money from the society' : null,
      response: result.viabilityRatio < 0.4 ? `Your sale-to-rehab ratio is low. This isn't a developer trick — it's a real constraint. Options: (a) wait for higher FSI policies, (b) explore Reg 33(9) cluster scheme by combining with neighbouring societies, (c) check if 33(7)(A) applies if any structural distress, (d) consider a self-redevelopment route with a society loan.` : null,
    },
  ].filter(i => i.title);

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Critical reading" title="What to watch for in developer conversations">
        Common moves that compress the value the regulation actually entitles you to. Use this as a checklist when meeting developers or evaluating their term sheets.
      </SectionTitle>

      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((item, i) => (
          <details key={i} style={{ background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 4 }}>
            <summary style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                <AlertTriangle size={16} color="#c08c30" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 13.5, fontWeight: 500, color: '#1a1815' }}>{item.title}</div>
              </div>
              <ChevronDown size={14} color="#a89c87" />
            </summary>
            <div style={{ padding: '0 16px 16px 44px', fontSize: 13, color: '#3d3528', lineHeight: 1.6 }}>
              {item.response}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// NEXT STEPS
// ============================================================================

function NextSteps() {
  const steps = [
    { title: 'Get a structural audit', detail: 'Hire a Licensed Structural Engineer to assess the building. This is mandatory and also tells you whether 33(7)(A) might apply (which has more generous incentives if dilapidated).' },
    { title: 'Verify your records with MCGM', detail: 'Confirm OC and approved plans are on file in your ward office. Without these, no incentive BUA is permissible. Fix this first if missing.' },
    { title: 'Hire a Licensed Architect', detail: 'For a stamped feasibility — required for any formal society resolution, lender discussions, or RFP to developers. Look for one with prior 33(7)(B) project experience.' },
    { title: 'Pass General Body Resolutions', detail: 'Two key resolutions: (1) authorising redevelopment exploration, (2) specifying who gets the incentive BUA — members, developer, or what split. The second resolution becomes a binding term in any developer agreement.' },
    { title: 'Issue an RFP to multiple developers', detail: 'Get at least 3 offers. Use the area statement above as the floor of what you should be offered. A reputable redevelopment consultant or society-side architect can run the RFP.' },
    { title: 'Compare offers on a level field', detail: 'Compare flats offered (carpet, configuration), corpus, rent during construction, hardship payment, finishing schedule, project completion timeline, and developer\'s past project track record. Not just the headline area number.' },
  ];

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="From here" title="What your committee should do next">
        A simplified timeline. Most society redevs take 18–36 months from first committee discussion to occupation. Don't rush.
      </SectionTitle>

      <div style={{ background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 4 }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, padding: 18, borderBottom: i < steps.length - 1 ? '1px solid #f0e9dd' : 'none' }}>
            <div className="num serif" style={{ width: 30, height: 30, borderRadius: '50%', background: '#f0e9dd', color: '#8b3a2a', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1815' }}>{step.title}</div>
              <div style={{ fontSize: 12.5, color: '#3d3528', marginTop: 4, lineHeight: 1.55 }}>{step.detail}</div>
            </div>
          </div>
        ))}
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
      a: 'Reg 33(7)(B)(1) provides "incentive additional BUA" of 15% of existing BUA OR 10 sqm per residential tenement, whichever is greater — without premium. This is the government\'s way of incentivising old buildings to redevelop, by giving free FSI to the existing society. The exact split between members and developer is decided by your General Body resolution.',
    },
    {
      q: 'What is FSI? What is BUA?',
      a: 'FSI (Floor Space Index) is a multiplier on plot area that tells you how much you can build. BUA (Built-Up Area) is the actual square metres of construction. If your plot is 1,000 sqm and FSI is 2, you can build 2,000 sqm of BUA. Carpet area is the usable area inside flats — typically 70-80% of BUA after walls and common areas.',
    },
    {
      q: 'What is "rehab" vs "sale" component?',
      a: 'Rehab = the area allocated to existing society members in the new building (their flats). Sale = the area the developer can sell to outsiders to monetise the project. The sale component is what makes redevelopment commercially viable for a developer — without enough sale BUA, no developer will take on the project.',
    },
    {
      q: 'What is Premium FSI?',
      a: 'FSI you can buy from MCGM by paying a premium (50% of the ASR land rate per Reg 30(A)(6)). Currently halved by the 14.01.2021 directive, so effectively 25% of ASR. The Realistic scenario assumes premium FSI is purchased; the Conservative scenario doesn\'t use it.',
    },
    {
      q: 'What is TDR?',
      a: 'Transferable Development Rights — FSI generated when someone surrenders land elsewhere (typically for road widening or slum redev) and traded as a certificate. Buying TDR is an alternative to paying premium. Whether it\'s cheaper than premium depends on TDR market price at the time. Maximum scenario assumes TDR is loaded.',
    },
    {
      q: 'What is Fungible Compensatory Area?',
      a: 'Reg 31(3) — an additional 35% of FSI BUA (residential) that you can avail by paying premium. Originally introduced in DCPR 2034 to absorb things that were earlier free of FSI (flowerbeds, niches, etc.). For redevelopment under 33(7)(B), the fungible on the rehab portion is typically free of premium per circular guidelines analogous to 33(7).',
    },
    {
      q: 'Why a road-width threshold?',
      a: 'Wider abutting roads allow taller buildings and higher density. Reg 30 / Table 12 sets FSI ceilings by road width: 9-12m road gets 2.0 FSI in suburbs, 18-27m road gets 2.4, etc. If your plot is on a narrower road and there\'s a DP plan to widen it, you may get the higher slab once widening is notified.',
    },
    {
      q: 'My building is 28 years old. What can I do?',
      a: 'Three options. (1) Wait two years to qualify under 33(7)(B). (2) If the building is structurally distressed, get a structural audit and pursue 33(7)(A) which has higher incentives (50% incentive FSI vs 15%). (3) Combine with neighbouring societies to qualify under 33(9) cluster scheme which has its own age rules.',
    },
  ];

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Plain-English explanations" title="What does all this mean?">
        For members reading this in a committee group. No regulatory jargon — just what each term actually does.
      </SectionTitle>

      <div style={{ background: '#fffefb', border: '1px solid #e7dfd0', borderRadius: 4 }}>
        {faqs.map((faq, i) => (
          <details key={i} style={{ borderBottom: i < faqs.length - 1 ? '1px solid #f0e9dd' : 'none' }}>
            <summary style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div className="serif" style={{ fontSize: 15, fontWeight: 500, color: '#1a1815' }}>{faq.q}</div>
              <ChevronDown size={14} color="#a89c87" />
            </summary>
            <div style={{ padding: '0 16px 16px 16px', fontSize: 13, color: '#3d3528', lineHeight: 1.65, maxWidth: 720 }}>
              {faq.a}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// SHARED
// ============================================================================

const SectionTitle = ({ eyebrow, title, children }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b3a2a', fontWeight: 600, marginBottom: 6 }}>{eyebrow}</div>
    <h3 className="serif" style={{ fontSize: 22, fontWeight: 600, margin: 0, color: '#1a1815', letterSpacing: '-0.01em' }}>{title}</h3>
    {children && <p style={{ fontSize: 13.5, color: '#3d3528', marginTop: 8, lineHeight: 1.6, maxWidth: 720 }}>{children}</p>}
  </div>
);

const th = { padding: '11px 18px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b5d47', fontWeight: 600, textAlign: 'left' };
const td = { padding: '12px 18px', verticalAlign: 'top' };
