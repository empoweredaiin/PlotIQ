import { SQFT_PER_SQM } from '../../core/constants';
import { fmt } from '../../utils/format';
import { SectionTitle } from './primitives';

export default function CompareOffer({ result, input, update }) {
  const existingCarpetSqm = (() => {
    if (input.buaInputMode === 'breakdown') {
      return (input.flats || []).reduce((sum, f) =>
        sum + (parseFloat(f.carpet) || 0) * (parseInt(f.count) || 0), 0);
    }
    return (parseFloat(input.totalExistingBua) || 0) / 1.2;
  })();
  const existingCarpetSqft = existingCarpetSqm * SQFT_PER_SQM;

  const regRehabCarpetSqft = ((result.memberSideRehabBua || 0) / 1.2) * SQFT_PER_SQM;
  const regSaleCarpetSqft  = ((result.saleBua             || 0) / 1.2) * SQFT_PER_SQM;

  const devRehab = parseFloat(input.devOfferRehab) || 0;
  const devSale  = parseFloat(input.devOfferSale)  || 0;

  const rehabDelta    = devRehab - regRehabCarpetSqft;
  const rehabDeltaPct = regRehabCarpetSqft > 0 ? (rehabDelta / regRehabCarpetSqft) * 100 : 0;
  const saleDelta     = devSale - regSaleCarpetSqft;
  const saleDeltaPct  = regSaleCarpetSqft > 0 ? (saleDelta / regSaleCarpetSqft) * 100 : 0;

  const rehabVerdict = rehabDelta >= -0.02 * regRehabCarpetSqft ? 'ok' : 'low';
  const saleVerdict  = saleDelta  <=  0.02 * regSaleCarpetSqft  ? 'ok' : 'high';

  const handleFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) update('devOfferFileName', f.name);
  };

  const tone = (v) => v === 'ok' ? '#5a7a4f' : '#a4493a';
  const Pill = ({ kind }) => {
    if (kind === 'ok')   return <span style={{ background: '#5a7a4f', color: '#fffefb', padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>Fair</span>;
    if (kind === 'low')  return <span style={{ background: '#a4493a', color: '#fffefb', padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>Below entitlement</span>;
    if (kind === 'high') return <span style={{ background: '#a4493a', color: '#fffefb', padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>Exceeds permissible</span>;
    return null;
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Developer offer review" title="Compare developer's offer to regulatory baseline">
        Upload the developer's offer letter (optional, for your records), then enter the rehab and sale areas they are proposing. We compare both against what the regulation actually permits.
      </SectionTitle>

      <div style={{ background: '#13161D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: 22, marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A96E', marginBottom: 10 }}>
          1. Upload developer offer (optional)
        </div>
        <label style={{ display: 'inline-block', padding: '10px 18px', background: '#C9A96E', color: '#0D0F14',
                        fontSize: 12, fontWeight: 600, borderRadius: 3, cursor: 'pointer' }}>
          Choose file
          <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFile} style={{ display: 'none' }} />
        </label>
        {input.devOfferFileName && (
          <span style={{ marginLeft: 14, fontSize: 12, color: 'var(--ink-soft)' }}>
            📄 {input.devOfferFileName} <button onClick={() => update('devOfferFileName', '')}
              style={{ marginLeft: 8, padding: '2px 8px', fontSize: 10, background: 'transparent',
                       color: '#a4493a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, cursor: 'pointer' }}>
              Remove
            </button>
          </span>
        )}
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-soft)' }}>
          Stored only in your browser. Not uploaded anywhere. We don't read its contents — type the numbers below.
        </div>
      </div>

      <div style={{ background: '#13161D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: 22, marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A96E', marginBottom: 14 }}>
          2. What the developer is proposing (sqft carpet)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="grid-2">
          <div>
            <label className="field-label">Rehab area offered to society</label>
            <input type="number" className="num" value={input.devOfferRehab}
                   onChange={e => update('devOfferRehab', parseFloat(e.target.value) || 0)} />
            <div className="help-text" style={{ fontSize: 10.5 }}>
              Total carpet area all members will get back (sum across all flats).
            </div>
          </div>
          <div>
            <label className="field-label">Sale area developer is keeping</label>
            <input type="number" className="num" value={input.devOfferSale}
                   onChange={e => update('devOfferSale', parseFloat(e.target.value) || 0)} />
            <div className="help-text" style={{ fontSize: 10.5 }}>
              Total free-sale carpet developer will sell on open market.
            </div>
          </div>
        </div>
      </div>

      {(devRehab > 0 || devSale > 0) ? (
        <div style={{ background: '#13161D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A96E', marginBottom: 18 }}>
            3. Side-by-side comparison
          </div>

          <div style={{ padding: 18, background: '#111318', borderRadius: 4, borderLeft: `4px solid ${tone(rehabVerdict)}`, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Rehab area to society members</div>
              <Pill kind={rehabVerdict} />
            </div>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ padding: '6px 0', color: 'var(--ink-soft)' }}>Your existing carpet area</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }} className="num">{fmt(existingCarpetSqft)} sqft</td></tr>
                <tr><td style={{ padding: '6px 0', color: 'var(--ink-soft)' }}>Developer offers as rehab</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }} className="num">{fmt(devRehab)} sqft</td></tr>
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <td style={{ padding: '6px 0', color: 'var(--ink-soft)' }}>Regulatory entitlement (incentive share applied)</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#C9A96E' }} className="num">{fmt(regRehabCarpetSqft)} sqft</td></tr>
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <td style={{ padding: '8px 0 0', color: tone(rehabVerdict), fontWeight: 600 }}>
                      {rehabDelta >= 0 ? 'Above entitlement by' : 'Shortfall vs entitlement'}
                    </td>
                    <td style={{ padding: '8px 0 0', textAlign: 'right', fontWeight: 700, color: tone(rehabVerdict) }} className="num">
                      {fmt(Math.abs(rehabDelta))} sqft ({Math.abs(rehabDeltaPct).toFixed(1)}%)
                    </td></tr>
              </tbody>
            </table>
          </div>

          <div style={{ padding: 18, background: '#111318', borderRadius: 4, borderLeft: `4px solid ${tone(saleVerdict)}`, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Sale area to developer</div>
              <Pill kind={saleVerdict} />
            </div>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ padding: '6px 0', color: 'var(--ink-soft)' }}>Developer claims as sale</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }} className="num">{fmt(devSale)} sqft</td></tr>
                <tr><td style={{ padding: '6px 0', color: 'var(--ink-soft)' }}>Regulatory max sale (after rehab obligation)</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#C9A96E' }} className="num">{fmt(regSaleCarpetSqft)} sqft</td></tr>
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <td style={{ padding: '8px 0 0', color: tone(saleVerdict), fontWeight: 600 }}>
                      {saleDelta > 0 ? 'Exceeds regulatory max by' : 'Within regulatory max — surplus available'}
                    </td>
                    <td style={{ padding: '8px 0 0', textAlign: 'right', fontWeight: 700, color: tone(saleVerdict) }} className="num">
                      {fmt(Math.abs(saleDelta))} sqft ({Math.abs(saleDeltaPct).toFixed(1)}%)
                    </td></tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 18, padding: 16, background: 'rgba(201,169,110,0.08)', borderLeft: '3px solid #C9A96E', borderRadius: 3, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
            <strong>Plain-English verdict.&nbsp;</strong>
            {rehabVerdict === 'ok' && saleVerdict === 'ok' &&
              "Developer's offer broadly matches what the regulation permits. Negotiate on corpus, transit rent, and timelines."}
            {rehabVerdict === 'low' && saleVerdict === 'ok' &&
              `Developer is offering you ${Math.abs(rehabDeltaPct).toFixed(0)}% less rehab than your regulatory entitlement. Push for at least ${fmt(regRehabCarpetSqft)} sqft total rehab.`}
            {rehabVerdict === 'ok' && saleVerdict === 'high' &&
              `Developer is claiming ${Math.abs(saleDeltaPct).toFixed(0)}% more sale area than the regulation permits. Either the math is wrong or the offer is overstated — ask for the line-by-line area statement.`}
            {rehabVerdict === 'low' && saleVerdict === 'high' &&
              `Developer is shortchanging you on rehab AND claiming more sale than regulation permits. Both line items need revision before signing anything.`}
            {' '}Have your architect verify against the official area statement before any GB resolution.
          </div>
        </div>
      ) : (
        <div style={{ padding: 28, textAlign: 'center', background: '#111318', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 6, color: 'var(--ink-soft)', fontSize: 13 }}>
          Enter the rehab and sale areas from your developer's offer above to see the comparison.
        </div>
      )}
    </div>
  );
}
