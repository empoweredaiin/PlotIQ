import { fmt, fmtSqft } from '../../utils/format';
import { SectionTitle, Row } from './primitives';

function ComparisonCard({ title, subtitle, permissibleBua, rehab, sale, fsi, viability, colour, highlight }) {
  return (
    <div style={{
      padding: 22,
      borderRadius: 6,
      background: highlight ? 'rgba(201,169,110,0.06)' : '#13161D',
      border: `1px solid ${highlight ? colour : 'rgba(255,255,255,0.07)'}`,
      position: 'relative',
    }}>
      {highlight && (
        <div style={{ position: 'absolute', top: -10, left: 16, background: colour, color: 'white', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 2, letterSpacing: '0.08em' }}>HIGHER YIELD</div>
      )}
      <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: colour, lineHeight: 1.2 }}>{title}</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>{subtitle}</div>

      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 4 }}>Permissible BUA</div>
        <div className="num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
          {fmt(permissibleBua)} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-soft)' }}>sqm</span>
        </div>
        <div className="num" style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>≈ {fmtSqft(permissibleBua)} sq ft · FSI {fsi.toFixed(2)}</div>
      </div>

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'grid', gap: 8 }}>
        <Row label="Rehab to members" value={`${fmt(rehab)} sqm`} />
        <Row label="Sale to developer" value={`${fmt(sale)} sqm`} highlight />
        <Row label="Viability" value={viability} muted />
      </div>
    </div>
  );
}

export default function SchemeComparison({ r1, r2 }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="Sensitivity comparison" title="Standalone vs Cluster — side by side">
        Direct comparison of the two schemes available to your society. Cluster requires neighbour-society coordination but typically yields more.
      </SectionTitle>

      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ComparisonCard
          title="Standalone — Reg 33(7)(B)"
          subtitle="Just your society redeveloping on its own"
          permissibleBua={r1.permissibleBua}
          rehab={r1.memberSideRehabBua}
          sale={r1.saleBua}
          fsi={r1.effFsi}
          viability={r1.viabilityRating}
          colour="rgba(255,255,255,0.4)"
        />
        <ComparisonCard
          title="Cluster — Reg 33(9)"
          subtitle="Combined with neighbouring societies"
          permissibleBua={r2.permissibleBua}
          rehab={r2.rehabBase}
          sale={r2.saleBua}
          fsi={r2.effFsi}
          viability={r2.viabilityRating}
          colour="#C9A96E"
          highlight={r2.permissibleBua > r1.permissibleBua}
        />
      </div>

      <div style={{ marginTop: 12, padding: '14px 18px', background: '#13161D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4, fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>
        <strong>Cluster advantage:</strong>{' '}
        {r2.permissibleBua > r1.permissibleBua ? (
          <>Cluster yields <span className="num" style={{ fontWeight: 700, color: '#C9A96E' }}>{fmt(r2.permissibleBua - r1.permissibleBua)} sqm</span> more permissible BUA than standalone — a {(((r2.permissibleBua / r1.permissibleBua) - 1) * 100).toFixed(0)}% uplift. Coordination cost is real but math is favourable.</>
        ) : (
          <>Standalone 33(7)(B) is competitive with or better than cluster math at the inputs given. Verify cluster plot data — usually cluster wins when aggregate plot is meaningfully larger than your standalone plot.</>
        )}
      </div>
    </div>
  );
}
