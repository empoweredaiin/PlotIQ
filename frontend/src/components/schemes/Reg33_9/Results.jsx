import { fmt, fmtSqft } from '../../../utils/format';
import { SectionTitle, th, td } from '../../shared/primitives';

export default function ClusterResult({ result, input }) {
  const r = result;

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Cluster scheme output" title="Cluster development under Reg 33(9)">
        FSI 4.00 ceiling on the aggregate cluster plot, OR rehab + 50% incentive — whichever is more.
      </SectionTitle>

      <div style={{ background: '#13161D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 24 }} className="grid-2">
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A96E', fontWeight: 600, marginBottom: 6 }}>
              Permissible BUA
            </div>
            <div className="num serif" style={{ fontSize: 36, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
              {fmt(r.permissibleBua)} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-soft)' }}>sqm</span>
            </div>
            <div className="num" style={{ fontSize: 14, color: 'var(--ink-soft)', marginTop: 4 }}>
              ≈ {fmtSqft(r.permissibleBua)} sq ft
            </div>
            <div className="num" style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 8 }}>
              Effective FSI: {r.effFsi.toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-soft)', fontWeight: 600, marginBottom: 6 }}>
              Sale to developer
            </div>
            <div className="num serif" style={{ fontSize: 36, fontWeight: 700, color: '#C9A96E', lineHeight: 1 }}>
              {fmt(r.saleBua)} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-soft)' }}>sqm</span>
            </div>
            <div className="num" style={{ fontSize: 14, color: 'var(--ink-soft)', marginTop: 4 }}>
              ≈ {fmtSqft(r.saleBua)} sq ft
            </div>
            <div className="num" style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 8 }}>
              Sale-to-rehab ratio: {r.viabilityRatio.toFixed(2)}
            </div>
          </div>
        </div>

        <div style={{ background: '#111318', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                <th style={th}>Cluster computation</th>
                <th style={{ ...th, textAlign: 'right' }}>Value</th>
                <th style={{ ...th, textAlign: 'left', width: 70 }}>Unit</th>
                <th style={{ ...th, textAlign: 'left' }}>Reference</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={td}>Aggregate cluster plot area</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{fmt(r.clusterPlot)}</td>
                <td style={td} className="num">sqm</td>
                <td style={td} className="num" />
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={td}>Number of buildings in cluster</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{r.clusterBuildings}</td>
                <td style={td} className="num" />
                <td style={td} className="num">User input</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={td}>Aggregate existing BUA</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{fmt(r.rehabBase)}</td>
                <td style={td} className="num">sqm</td>
                <td style={td} className="num">Society records</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={td}>Aggregate residential apartments</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{r.clusterApartments}</td>
                <td style={td} className="num" />
                <td style={td} className="num" />
              </tr>
              <tr style={{ background: '#13161D', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={{ ...td, fontWeight: 600 }}>Cluster minimum check</td>
                <td style={{ ...td, textAlign: 'right', color: r.meetsMinimum ? '#5a7a4f' : '#a4493a' }} className="num">
                  {r.meetsMinimum ? '✓ Meets' : '✗ Below'}
                </td>
                <td style={td} className="num">{r.minClusterArea} sqm min</td>
                <td style={td} className="num">Reg 33(9) cl 1.1</td>
              </tr>
              <tr style={{ background: 'rgba(201,169,110,0.06)' }}>
                <td colSpan={4} style={{ padding: '10px 18px', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A96E', fontWeight: 700 }}>
                  Computation
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={td}>FSI 4.00 ceiling = Cluster plot × 4.00</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{fmt(r.ceilingBua)}</td>
                <td style={td} className="num">sqm</td>
                <td style={td} className="num">Reg 33(9) opening</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={td}>Rehab + 50% incentive = Existing BUA × 1.5</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{fmt(r.rehabBase + r.incentiveBua)}</td>
                <td style={td} className="num">sqm</td>
                <td style={td} className="num">Reg 33(9) Appendix</td>
              </tr>
              <tr style={{ background: 'rgba(201,169,110,0.08)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={{ ...td, fontWeight: 700 }}>
                  Governing FSI BUA = MAX of above
                  <div className="num" style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 2, fontWeight: 400 }}>
                    {r.ceilingGoverns
                      ? '↑ Ceiling governs (4.00 × cluster plot is higher)'
                      : '↑ Rehab+Incentive governs (existing BUA so high it exceeds 4.00 ceiling)'}
                  </div>
                </td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#C9A96E' }} className="num">{fmt(r.schemeFsiBua)}</td>
                <td style={td} className="num">sqm</td>
                <td style={td} className="num">Reg 33(9) opening</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={td}>+ Fungible Compensatory Area @ 35% (Reg 31(3))</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{fmt(r.fungibleArea)}</td>
                <td style={td} className="num">sqm</td>
                <td style={td} className="num">Reg 31(3)</td>
              </tr>
              <tr style={{ background: 'rgba(201,169,110,0.10)' }}>
                <td style={{ ...td, fontWeight: 700 }}>Permissible BUA</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, fontSize: 16, color: '#C9A96E' }} className="num">{fmt(r.permissibleBua)}</td>
                <td style={td} className="num">sqm</td>
                <td style={td} className="num">—</td>
              </tr>
              <tr style={{ background: '#111318' }}>
                <td colSpan={4} style={{ padding: '10px 18px', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-soft)', fontWeight: 700 }}>
                  Rehab vs sale split
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={td}>Rehab to existing members across all societies</td>
                <td style={{ ...td, textAlign: 'right' }} className="num">{fmt(r.rehabBase)}</td>
                <td style={td} className="num">sqm</td>
                <td style={td} className="num">—</td>
              </tr>
              <tr>
                <td style={{ ...td, fontWeight: 700 }}>Sale BUA available to developer</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#C9A96E' }} className="num">{fmt(r.saleBua)}</td>
                <td style={td} className="num">sqm</td>
                <td style={td} className="num">Permissible − Rehab</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 16, padding: '14px 18px', background: '#13161D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 7, flexShrink: 0, background: !r.meetsMinimum ? '#a4493a' : r.viabilityRatio < 0.6 ? '#C9A96E' : '#3d5a4d' }} />
          <div>
            <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-soft)', fontWeight: 600 }}>
              Cluster viability — {r.viabilityRating}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--ink)', marginTop: 4, lineHeight: 1.55 }}>{r.viabilityNote}</div>
          </div>
        </div>

        <div style={{ marginTop: 12, padding: '12px 14px', background: 'rgba(201,169,110,0.04)', borderLeft: '3px solid rgba(201,169,110,0.4)', borderRadius: 2, fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
          <strong>Honest disclosure:</strong> This computation uses aggregate cluster inputs you provided. The standard incentive rate (50%) and 4.00 FSI ceiling are encoded per Reg 33(9). The actual scheme allows variations (60–70% incentive bands at higher consent levels and additional dwellings density) that we have not modelled in MVP. For a stamped feasibility, engage a Licensed Architect with prior cluster experience.
        </div>
      </div>
    </div>
  );
}
