import { SectionTitle, th, td } from './primitives';

export default function ParkingPanel({ result, input }) {
  const p = result.parking;
  if (!p || (p.total === 0 && result.totalFlats === 0)) return null;
  const flatRows = input.buaInputMode === 'breakdown'
    ? (input.flats || []).filter(f => parseInt(f.count) > 0 && f.use === 'residential').map(f => {
        const carpet = parseFloat(f.carpet) || 0;
        const count = parseInt(f.count) || 0;
        const norm = carpet > 90 ? 2 : carpet > 60 ? 1 : carpet > 45 ? 0.5 : 0;
        return { label: f.label, carpet, count, norm, subtotal: Math.ceil(norm * count) };
      })
    : [];
  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Proforma-A Section II(E)" title="Parking requirement">
        Computed per DCPR 2034 Reg 30 parking norms. For reference — actual parking layout depends on site geometry and architect's basement design.
      </SectionTitle>
      <div style={{ background: '#13161D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              <th style={th}>Category</th>
              <th style={{ ...th, textAlign: 'right' }}>Norm</th>
              <th style={{ ...th, textAlign: 'right' }}>Required</th>
            </tr>
          </thead>
          <tbody>
            {flatRows.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={td}>{r.label} — {r.count} flats × {r.carpet} sqm carpet</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{r.norm} car/flat</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{r.subtotal}</td>
              </tr>
            ))}
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#111318' }}>
              <td style={td}>Visitor parking (5% of residential cars)</td>
              <td style={{ ...td, textAlign: 'right' }} className="num">5%</td>
              <td style={{ ...td, textAlign: 'right' }} className="num">{p.visitor}</td>
            </tr>
            {p.shopCars > 0 && (
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={td}>Commercial / shop (1 per 40 sqm up to 800 sqm)</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">1/40 sqm</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{p.shopCars}</td>
              </tr>
            )}
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(201,169,110,0.06)' }}>
              <td style={{ ...td, fontWeight: 700 }}>Total Cars</td>
              <td style={{ ...td, textAlign: 'right' }} />
              <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#C9A96E' }} className="num">{p.total}</td>
            </tr>
            <tr>
              <td style={td}>Two-wheelers (1 per residential flat)</td>
              <td style={{ ...td, textAlign: 'right' }} className="num">1/flat</td>
              <td style={{ ...td, textAlign: 'right' }} className="num">{p.twoWheeler}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ padding: '10px 18px', fontSize: 11, color: 'var(--ink-soft)', borderTop: '1px solid rgba(255,255,255,0.07)', fontStyle: 'italic' }}>
          Basement / stilt / podium area used for parking is free of FSI per Reg 31(1). Typically spread across 1–2 basements + podium. Your architect will size the basement to accommodate this.
        </div>
      </div>
    </div>
  );
}
