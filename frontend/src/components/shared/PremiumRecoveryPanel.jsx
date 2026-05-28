import { SQFT_PER_SQM } from '../../core/constants';
import { fmt, fmtCurrency } from '../../utils/format';
import { SectionTitle, th, td } from './primitives';

export default function PremiumRecoveryPanel({ result, input }) {
  const ps = result.premiumSheet;
  const asrRate = parseFloat(input.asrLandRate) || 0;
  if (!ps || asrRate === 0) {
    return (
      <div style={{ marginBottom: 28, padding: '14px 18px', background: '#111318', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4, fontSize: 12, color: 'var(--ink-soft)' }}>
        <strong>Premium Recovery Sheet</strong> — enter your ASR Land Rate above to see itemised premium payable to MCGM.
      </div>
    );
  }
  const _totalBua = result.permissibleBua || 0;
  const _tdrLoaded = (result.tdrBua || 0) * (result.tdrLoadFactor ?? 1);
  const _cRate = parseFloat(input.constructionRate) || 27500;
  const _plotA = parseFloat(result.plotArea) || parseFloat(input.plotArea) || 0;
  const _basicFsi = (result.fsiSlab && result.fsiSlab.basic) || 0;
  const rows = [
    { label: 'Premium FSI', sub: `${fmt(result.premiumFsiBua * (result.premiumLoad ?? 1))} sqm × ASR × 50% (Reg 30(A)(6))`, value: ps.premiumFsiPayable, reg: 'Reg 30(A)/Table 12' },
    { label: 'Fungible (sale component, residential)', sub: `${fmt(result.fungibleSaleBua)} sqm × ASR × 50% (rehab portion is FREE per Reg 31(3))`, value: ps.fungiblePremium, reg: 'Reg 31(3)' },
    { label: '  → MCGM share (50%)', sub: '', value: ps.fungibleMCGM, reg: '', indent: true },
    { label: '  → State Govt share (30%)', sub: '', value: ps.fungibleGovt, reg: '', indent: true },
    { label: '  → MSRDC Sea Link share (20%)', sub: '', value: ps.fungibleMSRDC, reg: '', indent: true },
    ...(ps.osdPremium > 0 ? [{ label: 'Open Space Deficiency (OSD)', sub: `${fmt(result.rosDeficiency)} sqm deficit × ASR × 25% (concession u/CHE/DP/03450 for 33(7)(B))`, value: ps.osdPremium, reg: 'Reg 27' }] : []),
    { label: 'Sub-total - Premiums (Reg 30/31)', sub: '', value: ps.totalPremium, reg: '', bold: true },
    { label: 'Scrutiny Fee', sub: `${fmt(_totalBua)} sqm x Rs.70.7/sqm`, value: ps.scrutinyFee, reg: 'AutoDCR' },
    { label: 'IOD Deposit', sub: `${fmt(_totalBua * SQFT_PER_SQM)} sqft x Re.1/sqft`, value: ps.iodDeposit, reg: 'AutoDCR' },
    { label: 'Debris Removal Deposit', sub: `min(${fmt(_totalBua * SQFT_PER_SQM)} sqft x Rs.2, Rs.45000 cap)`, value: ps.debrisDeposit, reg: 'AutoDCR' },
    { label: 'Labour Welfare Cess', sub: `${fmt(_totalBua)} sqm x Rs.${fmt(_cRate)} x 1%`, value: ps.labourWelfareCess, reg: 'BOCW Act 1996' },
    { label: 'Development Charges - Land', sub: `${_basicFsi.toFixed(2)} x ${fmt(_plotA)} sqm x ASR x 1%`, value: ps.devChargesLand, reg: 'MR&TP 124E' },
    { label: 'Development Charges - BUA', sub: `${fmt(_totalBua)} sqm x ASR x 4%`, value: ps.devChargesBua, reg: 'MR&TP 124E' },
    { label: 'Layout Scrutiny Fee', sub: `${fmt(_plotA)} sqm x Rs.11.13`, value: ps.layoutScrutinyFee, reg: 'AutoDCR' },
    ...(_tdrLoaded > 0 ? [
      { label: 'TDR Utilization Scrutiny', sub: `${fmt(_tdrLoaded)} sqm x Rs.59`, value: ps.tdrScrutinyFee, reg: 'AutoDCR' },
      { label: 'TDR Infrastructure Charge', sub: `${fmt(_tdrLoaded)} sqm x Rs.${fmt(_cRate)} x 5%`, value: ps.tdrInfraCharge, reg: 'Reg 32 circular' },
    ] : []),
    { label: 'Sub-total - AutoDCR fees', sub: '', value: ps.totalAutoDCR, reg: '', bold: true },
    { label: 'GRAND TOTAL PAYABLE TO MCGM/GOVT', sub: 'Rough estimate - architect recovery sheet is authoritative', value: ps.grandTotal, reg: '', bold: true },
  ];
  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Proforma-A Premium Sheet" title="Premiums payable to MCGM / Govt">
        Per MCGM circulars (FY 2023-24). Premium FSI is charged at 50% of ASR under Reg 30(A)(6) — the temporary 50% rebate under GR 14.01.2021 has expired. Fungible premium is split 50% MCGM / 30% State Govt / 20% MSRDC. These are rough estimates — actual recovery sheet from your architect will be authoritative.
      </SectionTitle>
      <div style={{ background: '#13161D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              <th style={th}>Premium head</th>
              <th style={{ ...th, textAlign: 'left' }}>Basis</th>
              <th style={{ ...th, textAlign: 'right' }}>Amount (rough)</th>
              <th style={{ ...th }}>Reference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: r.bold ? 'rgba(201,169,110,0.06)' : 'transparent' }}>
                <td style={{ ...td, fontWeight: r.bold ? 700 : r.indent ? 400 : 500, paddingLeft: r.indent ? 32 : 18, color: r.bold ? '#C9A96E' : 'var(--ink)', fontSize: r.indent ? 11.5 : 13 }}>{r.label}</td>
                <td style={{ ...td, fontSize: 11, color: 'var(--ink-soft)', fontStyle: 'italic' }}>{r.sub}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: r.bold ? 700 : 500, color: r.bold ? '#C9A96E' : 'var(--ink)' }} className="num">{fmtCurrency(r.value)}</td>
                <td style={{ ...td, fontSize: 10.5, color: '#C9A96E' }} className="num">{r.reg}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '10px 18px', fontSize: 11, color: 'var(--ink-soft)', borderTop: '1px solid rgba(255,255,255,0.07)', fontStyle: 'italic' }}>
          ASR rate used: ₹{fmt(asrRate)}/sqm (FSI 1, user input). Construction rate: ₹{fmt(_cRate)}/sqm (SDRR).
          Typically paid in instalments across IOD → Plinth CC → Full CC → OC per GR 03.05.2023.
          Fungible on rehab portion ({fmt(result.fungibleRehabBua)} sqm) is free of premium per Reg 31(3) — not included above.
          For exact figures use the MCGM AutoDCR Fee Calculator: <a href="https://autodcr.mcgm.gov.in/AutoDCR.SWC.WebUI/Calculator/Main.aspx" target="_blank" rel="noopener noreferrer" style={{ color: '#C9A96E', fontWeight: 600 }}>Open AutoDCR ↗</a>
        </div>
      </div>
    </div>
  );
}
