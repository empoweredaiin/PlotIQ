import { useState } from 'react';
import { fmt, fmtSqft, fmtCurrency } from '../../../utils/format';
import { isVerifyMode, loadVerifyStore, saveVerifyStore, verifyDelta } from '../../../utils/verify';
import { SectionTitle, th, td } from '../../shared/primitives';

export function InteractiveResult({ result, input, update, schemeId }) {
  const r = result;
  const isFullyLoaded = (input.premiumFsiLoad ?? 1) === 1
    && (input.tdrLoad ?? 1) === 1
    && (input.fungibleLoad ?? 1) === 1;
  const utilisationPct = r.permissibleBuaMax > 0
    ? (r.permissibleBua / r.permissibleBuaMax) * 100 : 100;
  const rehabPct = r.permissibleBua > 0
    ? (r.memberSideRehabBua / r.permissibleBua) * 100 : 0;
  const salePct = 100 - rehabPct;

  const viabilityColour = r.viabilityRating === 'marginal' ? '#C9A96E'
    : r.viabilityRating === 'viable' ? '#C9A96E' : '#3d5a4d';

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="At your selected loadings" title="Buildable area — live">
        Adjust sliders in the <strong>Area Statement</strong> tab to explore scenarios.
      </SectionTitle>

      <div className="stat-grid">
        <div className="stat-card stat-card-accent">
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A96E', marginBottom: 6 }}>Total permissible</div>
          <div className="num serif" style={{ fontSize: 36, fontWeight: 700, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.02em' }}>
            {fmt(r.permissibleBua)}
          </div>
          <div className="num" style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>sqm · {fmtSqft(r.permissibleBua)} sqft</div>
          <div className="num" style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3 }}>FSI {r.effFsi.toFixed(2)} effective</div>
          {!isFullyLoaded && (
            <div style={{ marginTop: 8, fontSize: 10.5, color: '#C9A96E', background: 'rgba(192,140,48,0.08)', padding: '4px 8px', borderRadius: 3 }}>
              Max: {fmt(r.permissibleBuaMax)} sqm ({utilisationPct.toFixed(0)}% loaded)
            </div>
          )}
        </div>

        <div className="stat-card">
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3d5a4d', marginBottom: 6 }}>Rehab → members</div>
          <div className="num serif" style={{ fontSize: 36, fontWeight: 700, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.02em' }}>
            {fmt(r.memberSideRehabBua)}
          </div>
          <div className="num" style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>sqm · {fmtSqft(r.memberSideRehabBua)} sqft</div>
          <div className="num" style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3 }}>{rehabPct.toFixed(0)}% of total</div>
        </div>

        <div className="stat-card">
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 6 }}>Sale → developer</div>
          <div className="num serif" style={{ fontSize: 36, fontWeight: 700, color: '#C9A96E', lineHeight: 1, letterSpacing: '-0.02em' }}>
            {fmt(r.saleBua)}
          </div>
          <div className="num" style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>sqm · {fmtSqft(r.saleBua)} sqft</div>
          <div className="num" style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3 }}>Ratio {r.viabilityRatio.toFixed(2)} sale : rehab</div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-soft)', marginBottom: 5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          <span>◼ Members ({rehabPct.toFixed(0)}%)</span>
          <span>◼ Developer ({salePct.toFixed(0)}%)</span>
        </div>
        <div className="bua-split-bar">
          {r.permissibleBua > 0 && <>
            <div className="bua-split-rehab" style={{ width: `${rehabPct}%` }} />
            <div className="bua-split-sale" style={{ width: `${salePct}%` }} />
          </>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 10.5 }}>
          <span className="num" style={{ color: '#3d5a4d', fontWeight: 600 }}>{fmt(r.memberSideRehabBua)} sqm</span>
          <span className="num" style={{ color: '#C9A96E', fontWeight: 600 }}>{fmt(r.saleBua)} sqm</span>
        </div>
      </div>

      <div style={{ background: '#13161D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: schemeId === 'reg33_7B' ? 14 : 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: viabilityColour, marginTop: 6, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: viabilityColour }}>
              {r.viabilityRating}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 3, lineHeight: 1.55 }}>{r.viabilityNote}</div>
          </div>
        </div>
        {schemeId === 'reg33_7B' && (
          <div style={{ paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--ink)' }}>Governing path:</strong>{' '}
            {r.rehabPathGoverns
              ? `Rehab + Incentive (${fmt(r.rehabBasePath)} sqm) exceeds Reg 30 ceiling at current loadings.`
              : `Reg 30 ceiling (${fmt(r.reg30PathLoaded)} sqm) governs. Incentive of ${fmt(r.incentiveBua)} sqm is absorbed within this.`}
          </div>
        )}
      </div>

      <div style={{ background: '#111318', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
            Adjust <strong>Premium FSI</strong>, <strong>TDR</strong> and <strong>Fungible</strong> sliders in the
            {' '}<button onClick={() => {}} style={{ background: 'none', border: 'none', padding: 0, color: '#C9A96E', fontWeight: 600, cursor: 'default', fontSize: 11 }}>Area Statement</button> tab.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => { update('premiumFsiLoad', 1); update('tdrLoad', 1); update('fungibleLoad', 1); }}
              style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: 'var(--ink)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, cursor: 'pointer' }}>
              Reset max
            </button>
            <button onClick={() => { update('premiumFsiLoad', 0); update('tdrLoad', 0); update('fungibleLoad', 1); }}
              style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, background: 'transparent', color: '#C9A96E', border: '1px solid rgba(201,169,110,0.35)', borderRadius: 4, cursor: 'pointer' }}>
              Basic only
            </button>
            {r.premiumPayable > 0 && (
              <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', alignSelf: 'center' }}>
                Premium: <span className="num" style={{ fontWeight: 700, color: '#C9A96E' }}>{fmtCurrency(r.premiumPayable)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AreaStatement({ result, input, update }) {
  const verifyMode = isVerifyMode();
  const [verifyStore, setVerifyStore] = useState(() => loadVerifyStore());

  const setVerifyField = (key, field, val) => {
    setVerifyStore(prev => {
      const next = { ...prev, [key]: { ...(prev[key] || {}), [field]: val } };
      saveVerifyStore(next);
      return next;
    });
  };
  const clearVerifyStore = () => {
    setVerifyStore({});
    saveVerifyStore({});
  };

  const incentiveLabel = result.incentiveBasis === '15percent'
    ? '15% of existing BUA'
    : `10 sqm × ${result.residentialFlats} residential flats`;

  const rows = [
    { isHeader: true, section: 'A.1', label: 'Plot area' },
    { label: 'Gross plot area', value: result.plotArea, unit: 'sqm', ref: 'Owner declaration', bold: true },

    { isHeader: true, section: 'A.2', label: 'Deductions for FSI base — Reg 30(A)(2)' },
    { kind: 'editable',
      label: 'Less: DP road set-back / Regular line',
      sublabel: 'Reg 16 + Reg 30(A)(2). Sum of: (a) area under proposed DP road, AND (b) area under sanctioned Regular Line of street per MMC Act 1888.',
      stateKey: 'dpRoadDeduction',
      ref: 'Reg 16, Reg 30(A)(2)' },
    ...(result.reg14Auto.applies || result.reg14Override
      ? [{
          label: result.reg14Override
            ? 'Less: Reg 14 amenity (manual override)'
            : `Less: Reg 14 amenity (auto, ${result.reg14Auto.reductionFactor < 1 ? 'reduced 35%' : 'full rate'})`,
          value: -result.reg14Deduction,
          unit: 'sqm',
          ref: 'Reg 14(A), Reg 30(A)(2)',
          formula: result.reg14Override
            ? 'manual'
            : (() => {
                const base = result.reg14Auto.baseAmenity || 0;
                const factor = result.reg14Auto.reductionFactor || 1;
                const offset = result.reg14ReservationOffset || 0;
                const bandStr = result.grossExclRoad <= 10000
                  ? `${fmt(result.grossExclRoad)} sqm × 5%`
                  : `500 + 10% × (${fmt(result.grossExclRoad)} − 10,000)`;
                const factorStr = factor < 1 ? ` × ${factor} (35% reduction)` : '';
                const baseResult = `${bandStr}${factorStr} = ${fmt(base * factor)} sqm`;
                const offsetStr = offset > 0
                  ? ` − ${fmt(offset)} sqm DP reservation offset (Reg 14(A)(a)/(b)) = ${fmt(result.reg14EffectiveArea)} sqm net`
                  : '';
                return baseResult + offsetStr;
              })()
        }]
      : [{
          label: 'Less: Reg 14 amenity',
          value: 0, unit: 'sqm', ref: 'Reg 14(A)',
          formula: result.reg14Auto.reason,
          italic: true,
        }]),
    { kind: 'editable',
      label: 'Less: DP reservation handover',
      sublabel: 'Reg 17 + Reg 30(A)(2). Enter the reservation area NET deducted from FSI plot. Plain surrender = full reservation area; AR development = only the Y% handed over.',
      stateKey: 'reservationDeduction',
      ref: 'Reg 17, Reg 30(A)(2)' },

    { isHeader: true, section: 'A.3', label: 'Net plot area for FSI computation' },
    { label: 'Net plot area = Gross − all deductions',
      value: result.netPlot, unit: 'sqm', ref: 'Reg 30(A)(2)', bold: true, highlight: true },

    ...(result.losRequirement.applies || result.losOverride
      ? [{ isHeader: true, section: 'A.4', label: 'Site-planning constraints (informational — not FSI deductions)' },
         { label: result.losOverride
             ? `Reg 27 LOS area (manual override) on net plot`
             : `Reg 27 Layout Open Space @ ${result.losRequirement.percent}% (${result.losRequirement.band})`,
           value: result.losActualArea, unit: 'sqm', ref: 'Reg 27',
           formula: result.losOverride ? 'manual' : `${fmt(result.netPlot)} × ${result.losRequirement.percent}%`,
           italic: true }]
      : []),
    ...(result.reg15Flag
      ? [{ label: 'Reg 15 Inclusive Housing — 20% handover (FSI loadable on balance)',
           value: result.reg15Flag.handoverArea, unit: 'sqm', ref: 'Reg 15',
           italic: true }]
      : []),

    { isHeader: true, section: 'B', label: 'Existing built-up area (rehab base)' },
    { label: 'Existing authorised BUA', value: result.existingBua, unit: 'sqm', ref: 'OC / approved plans', bold: true },
    { label: 'Total residential tenements', value: result.residentialFlats, unit: 'flats', ref: 'Society records' },
    { label: 'Total tenements (incl. commercial)', value: result.totalFlats, unit: 'flats', ref: '—' },

    { isHeader: true, section: 'C', label: 'Reg 33(7)(B) Incentive BUA — free of premium' },
    { label: '15% of existing BUA', value: result.incentive15Pct, unit: 'sqm', ref: 'Reg 33(7)(B)' },
    { label: `10 sqm × ${result.residentialFlats} residential flats`,
      value: result.incentivePerTenement, unit: 'sqm', ref: 'Reg 33(7)(B)' },
    { label: `Incentive BUA = greater of above (${incentiveLabel})`,
      value: result.incentiveBua, unit: 'sqm', ref: 'Reg 33(7)(B)', bold: true, highlight: true },

    { isHeader: true, section: 'D',
      label: `FSI build-up — Reg 30 / Table 12 (Road ${result.roadWideningApplied ? `${result.rawRoadWidth}m → widened to 9m per DP (Table 12 Note 1)` : `${result.rawRoadWidth || input.roadWidth}m`}, ${input.location === 'islandCity' ? 'Island City' : 'Suburbs'})` },
    { label: 'Base FSI on net plot', value: result.fsiSlab.basic, unit: 'index', ref: 'Reg 30 / Table 12, Col 4' },
    { label: 'Base FSI BUA = Net plot × Base FSI',
      value: result.baseFsiBua, unit: 'sqm', ref: '—',
      formula: `${fmt(result.netPlot)} × ${result.fsiSlab.basic.toFixed(2)}` },
    { label: 'In-situ FSI for area handed over to MCGM (Reg 30(A)(2))',
      value: result.inSituFsiBua, unit: 'sqm', ref: 'Reg 30(A)(2) / Reg 16',
      formula: result.inSituFsiEligible === false
        ? (result.inSituFsiDeniedReason || 'Not available under this scheme per Reg 16')
        : (result.inSituFsiBua > 0
            ? `(${fmt(result.dpRoadDeduction)} DP road + ${fmt(result.reservationDeduction)} reservation) × ${result.fsiSlab.basic.toFixed(2)} FSI`
            : 'No area handed over'),
      italic: result.inSituFsiBua === 0 },
    { label: 'Premium FSI (additional, on payment)', value: result.fsiSlab.premium, unit: 'index', ref: 'Reg 30 / Table 12, Col 5' },
    { label: 'Premium FSI BUA available = Net plot × Premium FSI',
      value: result.premiumFsiBua, unit: 'sqm', ref: 'Reg 30(A)(6)',
      formula: `${fmt(result.netPlot)} × ${result.fsiSlab.premium.toFixed(2)}`,
      italic: true },
    { kind: 'slider',
      label: 'Premium FSI loading',
      sublabel: 'How much of the available Premium FSI to actually purchase',
      ref: 'Reg 30(A)(6)',
      stateKey: 'premiumFsiLoad',
      availableSqm: result.premiumFsiBua,
      disabled: result.premiumFsiBua === 0,
      disabledReason: 'No premium FSI available at this road width' },
    { label: `→ Premium FSI BUA loaded into computation (${((result.premiumLoad ?? 1) * 100).toFixed(0)}% of available)`,
      value: result.premiumFsiBuaLoaded, unit: 'sqm', ref: 'Reg 30(A)(6)',
      formula: `${fmt(result.premiumFsiBua)} × ${((result.premiumLoad ?? 1) * 100).toFixed(0)}%`,
      bold: true },
    { label: 'TDR loading (admissible)', value: result.fsiSlab.tdr, unit: 'index', ref: 'Reg 30 / Table 12, Col 6' },
    { label: 'TDR BUA available = Net plot × TDR',
      value: result.tdrBua, unit: 'sqm', ref: 'Reg 32',
      formula: `${fmt(result.netPlot)} × ${result.fsiSlab.tdr.toFixed(2)}`,
      italic: true },
    { kind: 'slider',
      label: 'TDR loading',
      sublabel: 'How much TDR to purchase and load onto your plot',
      ref: 'Reg 32',
      stateKey: 'tdrLoad',
      availableSqm: result.tdrBua,
      disabled: result.tdrBua === 0,
      disabledReason: 'No TDR loading available at this road width' },
    { label: `→ TDR BUA loaded into computation (${((result.tdrLoadFactor ?? 1) * 100).toFixed(0)}% of available)`,
      value: result.tdrBuaLoaded, unit: 'sqm', ref: 'Reg 32',
      formula: `${fmt(result.tdrBua)} × ${((result.tdrLoadFactor ?? 1) * 100).toFixed(0)}%`,
      bold: true },
    { label: 'Maximum FSI ceiling (Base + Premium + TDR, full loadings)',
      value: result.fsiSlab.basic + result.fsiSlab.premium + result.fsiSlab.tdr,
      unit: 'index', ref: 'Reg 30 / Table 12, Col 7', italic: true },
    { label: 'FSI BUA at ceiling = Net plot × Max FSI (reference only)',
      value: result.ceilingBua, unit: 'sqm', ref: '—',
      formula: `${fmt(result.netPlot)} × ${(result.fsiSlab.basic + result.fsiSlab.premium + result.fsiSlab.tdr).toFixed(2)}`, italic: true },

    { isHeader: true, section: 'D₂', label: 'Governing FSI BUA at your selected loadings' },
    { label: 'Existing + Incentive (rehab-base path)',
      value: result.rehabBasePath, unit: 'sqm', ref: 'B + C',
      formula: `${fmt(result.existingBua)} + ${fmt(result.incentiveBua)}` },
    { label: `Reg 30 path at chosen loadings = Base + (Premium × ${((result.premiumLoad ?? 1) * 100).toFixed(0)}%) + (TDR × ${((result.tdrLoadFactor ?? 1) * 100).toFixed(0)}%)`,
      value: result.reg30PathLoaded, unit: 'sqm', ref: 'Reg 30(A) + 33(7)(B) proviso' },
    { label: 'Governing FSI BUA = max of above',
      value: result.fsiBua, unit: 'sqm', ref: result.rehabPathGoverns ? 'Rehab-base governs' : 'Reg 30 path governs',
      bold: true, highlight: true },
    { label: 'Maximum possible FSI BUA (full loadings, for reference)',
      value: result.fsiBuaMax, unit: 'sqm', ref: '—', italic: true },

    { isHeader: true, section: 'E', label: 'Fungible Compensatory Area — Reg 31(3)' },
    { label: 'Fungible rate (residential)', value: '35%', unit: '', ref: 'Reg 31(3)' },
    { label: 'Fungible available = FSI BUA × 35%',
      value: result.fsiBua * 0.35, unit: 'sqm', ref: 'Reg 31(3)',
      formula: `${fmt(result.fsiBua)} × 35%`, italic: true },
    { kind: 'slider',
      label: 'Fungible loading',
      sublabel: '35% of FSI BUA, over and above admissible FSI',
      ref: 'Reg 31(3)',
      stateKey: 'fungibleLoad',
      availableSqm: result.fsiBua * 0.35,
      disabled: false },
    { label: `Fungible loaded into computation (${((result.fungibleLoadFactor ?? 1) * 100).toFixed(0)}% of available)`,
      value: result.fungibleArea, unit: 'sqm', ref: 'Reg 31(3)',
      formula: `${fmt(result.fsiBua * 0.35)} × ${((result.fungibleLoadFactor ?? 1) * 100).toFixed(0)}%`,
      bold: true, highlight: true },
    { label: 'Premium treatment (Reg 31(3) proviso for 33(7)(B))',
      value: '—', unit: '',
      ref: 'Reg 31(3)',
      formula: `Portion on existing/rehab BUA = FREE; portion on incentive + sale = premium @ 50% ASR (residential). See Premium Recovery Sheet below for amount.`,
      italic: true },
    { label: 'Maximum possible Fungible (at 100% loading, reference)',
      value: result.fungibleAreaMax, unit: 'sqm', ref: '—', italic: true },

    { isHeader: true, section: 'F', label: 'Permissible BUA = FSI BUA + Fungible' },
    { label: 'Permissible BUA at your settings',
      value: result.permissibleBua, unit: 'sqm', ref: 'D₂ + E', bold: true, highlight: true },
    { label: 'Maximum possible Permissible BUA',
      value: result.permissibleBuaMax, unit: 'sqm', ref: '—', italic: true },

    { isHeader: true, section: 'G', label: 'Society & member adjustments' },
    { label: 'Member-side rehab base = Existing BUA',
      value: result.existingBua, unit: 'sqm', ref: 'Reg 33(7)(B)' },
    { label: `Member share of Incentive BUA (${(result.memberIncentiveShare * 100).toFixed(0)}%)`,
      value: result.incentiveBua * result.memberIncentiveShare, unit: 'sqm', ref: 'GB Resolution' },
    { label: 'Total rehab to existing members',
      value: result.memberSideRehabBua, unit: 'sqm', ref: '—', bold: true },
    { label: 'Developer share of Incentive BUA',
      value: result.developerSideIncentive, unit: 'sqm', ref: 'GB Resolution' },
    { label: 'Sale BUA available to developer',
      value: result.saleBua, unit: 'sqm', ref: 'F − rehab', bold: true, highlight: true },
  ];

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Detailed working" title="Area statement with regulation references">
        Built up in the order an architect reads it: plot → existing → incentive → FSI build-up → fungible → permissible BUA → member adjustments.
      </SectionTitle>

      {verifyMode && (
        <div className="no-print" style={{ marginBottom: 12, padding: '10px 14px',
                                            background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.3)',
                                            borderRadius: 4, fontSize: 12, color: '#C9A96E',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>
            <strong>Verification mode active.</strong> Type expected values from your approved area statement into the Expected column.
            Δ% &gt; 1.0 will flag in red. Values persist in localStorage.
          </span>
          <button onClick={clearVerifyStore}
                  style={{ padding: '4px 10px', fontSize: 11, background: '#13161D',
                           border: '1px solid rgba(201,169,110,0.3)', borderRadius: 3, cursor: 'pointer',
                           color: '#C9A96E' }}>
            Clear all
          </button>
        </div>
      )}

      <div style={{ background: '#13161D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <th style={th}>#</th>
              <th style={{ ...th, textAlign: 'left' }}>Item</th>
              <th style={{ ...th, textAlign: 'right' }}>Value</th>
              <th style={{ ...th, textAlign: 'left', width: 70 }}>Unit</th>
              <th style={{ ...th, textAlign: 'left' }}>Reference</th>
              {verifyMode && <th style={{ ...th, textAlign: 'right', width: 120 }}>Expected</th>}
              {verifyMode && <th style={{ ...th, textAlign: 'left', width: 160 }}>Δ / Source</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const colCount = verifyMode ? 7 : 5;
              if (row.isHeader) {
                return (
                  <tr key={i} style={{ background: 'rgba(201,169,110,0.08)' }}>
                    <td colSpan={colCount} style={{ padding: '10px 18px', fontSize: 11,
                                             letterSpacing: '0.12em', textTransform: 'uppercase',
                                             color: '#C9A96E', fontWeight: 700 }}>
                      {row.section} — {row.label}
                    </td>
                  </tr>
                );
              }
              if (row.kind === 'slider') {
                const currentVal = input[row.stateKey] ?? 1;
                const pct = Math.round(currentVal * 100);
                const loadedSqm = (row.availableSqm || 0) * currentVal;
                return (
                  <tr key={i} className="no-print" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)',
                                       background: 'rgba(192, 140, 48, 0.04)' }}>
                    <td style={{ ...td, color: 'var(--ink-faint)', fontSize: 10 }} className="num">{i + 1}</td>
                    <td style={{ ...td }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#C9A96E', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#C9A96E', color: '#0D0F14', padding: '2px 6px', borderRadius: 2 }}>SLIDER</span>
                        {row.label}
                      </div>
                      {row.sublabel && (
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 3 }}>{row.sublabel}</div>
                      )}
                    </td>
                    <td colSpan={verifyMode ? 5 : 3} style={{ ...td, paddingTop: 10, paddingBottom: 10 }}>
                      {row.disabled ? (
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                          {row.disabledReason || 'Not available'}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <input
                            type="range" min="0" max="1" step="0.01"
                            value={currentVal}
                            onChange={e => update(row.stateKey, parseFloat(e.target.value))}
                            style={{ flex: 1, accentColor: '#C9A96E', minWidth: 200 }}
                          />
                          <div style={{ minWidth: 180, textAlign: 'right' }}>
                            <div className="num" style={{ fontSize: 13, fontWeight: 700, color: '#C9A96E' }}>
                              {fmt(loadedSqm)} <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--ink-soft)' }}>/ {fmt(row.availableSqm)} sqm</span>
                            </div>
                            <div className="num" style={{ fontSize: 10.5, color: 'var(--ink-soft)' }}>{pct}% loaded · Ref: {row.ref}</div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              }
              if (row.kind === 'editable') {
                const rawVal = input[row.stateKey];
                const displayVal = rawVal === undefined || rawVal === null ? '' : rawVal;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)',
                                       background: 'rgba(192, 140, 48, 0.04)' }}>
                    <td style={{ ...td, color: 'var(--ink-faint)', fontSize: 10 }} className="num">{i + 1}</td>
                    <td style={{ ...td, fontWeight: 400, color: 'var(--ink-soft)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#C9A96E', color: '#0D0F14', padding: '2px 6px', borderRadius: 2 }}>EDIT</span>
                        <span>{row.label}</span>
                      </div>
                      {row.sublabel && (
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4, lineHeight: 1.4 }}>{row.sublabel}</div>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                        <span className="num" style={{ fontSize: 13, color: '#a4493a', fontWeight: 500 }}>−</span>
                        <input
                          type="number"
                          value={displayVal}
                          min="0" step="any"
                          onChange={e => {
                            const v = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            update(row.stateKey, Number.isNaN(v) ? 0 : v);
                          }}
                          className="num"
                          style={{ width: 110, padding: '5px 8px', fontSize: 13, fontWeight: 600,
                                   background: '#13161D', border: '1px solid #c9b896', color: '#a4493a',
                                   borderRadius: 3, textAlign: 'right' }}
                        />
                      </div>
                    </td>
                    <td style={{ ...td, fontSize: 11, color: 'var(--ink-soft)' }} className="num">{row.unit || 'sqm'}</td>
                    <td style={{ ...td, fontSize: 10.5, color: '#C9A96E' }} className="num">{row.ref}</td>
                    {verifyMode && (<><td style={{ ...td }}>—</td><td style={{ ...td }}>—</td></>)}
                  </tr>
                );
              }
              const isNeg = typeof row.value === 'number' && row.value < 0;
              const rowKey = `r-${i}-${(row.label || '').slice(0, 40)}`;
              const vEntry = verifyStore[rowKey] || {};
              const expectedRaw = vEntry.expected;
              const sourceRaw = vEntry.source || '';
              const calcNum = typeof row.value === 'number' ? row.value : null;
              const expectedNum = expectedRaw !== undefined && expectedRaw !== '' ? Number(expectedRaw) : null;
              const delta = calcNum !== null && expectedNum !== null ? verifyDelta(calcNum, expectedNum) : null;
              const flag = delta !== null && Math.abs(delta) > 1.0;
              const isNumericRow = typeof row.value === 'number';
              return (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)',
                                     background: row.highlight ? 'rgba(201,169,110,0.06)' : 'transparent',
                                     opacity: row.italic ? 0.8 : 1 }}>
                  <td style={{ ...td, color: 'var(--ink-faint)', fontSize: 10 }} className="num">{i + 1}</td>
                  <td style={{ ...td, fontWeight: row.bold ? 600 : 400,
                               color: row.bold ? 'var(--ink)' : 'var(--ink-soft)',
                               fontStyle: row.italic ? 'italic' : 'normal' }}>
                    {row.label}
                    {row.formula && (
                      <div className="num" style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 2, fontWeight: 400 }}>
                        = {row.formula}
                      </div>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: 'right',
                               fontWeight: row.bold ? 700 : 500,
                               color: row.highlight ? '#C9A96E' : isNeg ? '#a4493a' : 'var(--ink)' }}
                      className="num">
                    {typeof row.value === 'number'
                      ? fmt(row.value, row.value < 10 && row.value > 0 ? 2 : 0)
                      : (row.value || '—')}
                  </td>
                  <td style={{ ...td, fontSize: 11, color: 'var(--ink-soft)' }} className="num">{row.unit}</td>
                  <td style={{ ...td, fontSize: 10.5, color: '#C9A96E' }} className="num">{row.ref}</td>
                  {verifyMode && (
                    <td style={{ ...td, textAlign: 'right', padding: '4px 8px' }}>
                      {isNumericRow ? (
                        <input
                          type="number"
                          value={expectedRaw ?? ''}
                          onChange={e => setVerifyField(rowKey, 'expected', e.target.value)}
                          placeholder="—"
                          className="num"
                          style={{ width: 100, padding: '4px 6px', fontSize: 12,
                                   background: '#13161D', border: '1px solid rgba(255,255,255,0.07)',
                                   borderRadius: 3, textAlign: 'right' }} />
                      ) : <span style={{ color: 'var(--ink-faint)' }}>—</span>}
                    </td>
                  )}
                  {verifyMode && (
                    <td style={{ ...td, padding: '4px 8px', fontSize: 11 }}>
                      {isNumericRow && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {delta !== null && (
                            <div className="num" style={{ fontSize: 11, fontWeight: 600, color: flag ? '#a4493a' : '#3a7a4a' }}>
                              {flag ? '⚠ ' : '✓ '}
                              {delta > 0 ? '+' : ''}{delta.toFixed(2)}%
                            </div>
                          )}
                          <input
                            type="text"
                            value={sourceRaw}
                            onChange={e => setVerifyField(rowKey, 'source', e.target.value)}
                            placeholder="source note"
                            style={{ width: '100%', padding: '3px 6px', fontSize: 10.5,
                                     background: '#13161D', border: '1px solid rgba(255,255,255,0.07)',
                                     borderRadius: 3, fontStyle: 'italic', color: 'var(--ink-soft)' }} />
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MemberEntitlement({ breakdown, input, update }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Per-member entitlement" title="What each member can expect">
        Minimum guarantee under 33(7)(B) is existing carpet area for each member.
        Realistic expectation depends on what fraction of the incentive BUA the General Body resolves to allocate to members.
      </SectionTitle>

      <div className="no-print" style={{ marginBottom: 16, padding: 16,
                                          background: 'rgba(201,169,110,0.06)',
                                          border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4 }}>
        <label className="field-label">
          Member share of Incentive BUA — set this per your draft GB resolution
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <input type="range" min="0" max="100" step="5"
                 value={input.memberIncentiveShare}
                 onChange={e => update('memberIncentiveShare', parseInt(e.target.value))}
                 style={{ flex: 1, accentColor: '#C9A96E' }} />
          <div className="num" style={{ fontSize: 18, fontWeight: 700, color: '#C9A96E',
                                        minWidth: 60, textAlign: 'right' }}>
            {input.memberIncentiveShare}%
          </div>
        </div>
        <div className="help-text">
          Typical range: 70–90% to members. The remainder accrues to the developer's sale component.
          0% means society retains nothing of the incentive; 100% means society keeps it all (and developer monetises only via Premium FSI / TDR loading).
        </div>
      </div>

      <div style={{ background: '#13161D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              <th style={th}>Flat type</th>
              <th style={{ ...th, textAlign: 'right' }}>Count</th>
              <th style={{ ...th, textAlign: 'right' }}>Existing carpet</th>
              <th style={{ ...th, textAlign: 'right' }}>Minimum guaranteed</th>
              <th style={{ ...th, textAlign: 'right' }}>Realistic expectation</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((b, i) => (
              <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{b.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase',
                                letterSpacing: '0.06em', marginTop: 2 }}>{b.use}</div>
                </td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{b.count}</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">
                  {fmt(b.existingCarpet)} sqm
                  <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>≈ {fmtSqft(b.existingCarpet)} sqft</div>
                </td>
                <td style={{ ...td, textAlign: 'right' }} className="num">
                  {fmt(b.minGuaranteed)} sqm
                  <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>≈ {fmtSqft(b.minGuaranteed)} sqft</div>
                </td>
                <td style={{ ...td, textAlign: 'right', background: 'rgba(201,169,110,0.06)' }} className="num">
                  <span style={{ fontWeight: 700, color: '#C9A96E' }}>
                    {fmt(b.realisticLow)}–{fmt(b.realisticHigh)} sqm
                  </span>
                  <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
                    ≈ {fmtSqft(b.realisticLow)}–{fmtSqft(b.realisticHigh)} sqft
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
