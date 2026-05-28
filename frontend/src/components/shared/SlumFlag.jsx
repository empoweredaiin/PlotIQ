import { AlertTriangle } from 'lucide-react';

export default function SlumFlag() {
  return (
    <div style={{
      background: 'rgba(192, 140, 48, 0.08)',
      border: '1px solid rgba(192, 140, 48, 0.3)',
      borderLeft: '3px solid #C9A96E',
      borderRadius: 4,
      padding: 18,
      marginBottom: 24,
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <AlertTriangle size={18} color="#C9A96E" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            Slum encroachment on plot — separate analysis required
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 6, lineHeight: 1.55 }}>
            If part of your plot has slum encroachment, that portion is governed by Reg 33(10) — not 33(7)(B). Each eligible slum dweller (cut-off 1.1.2000) is entitled to a 27.88 sqm rehab tenement, with sale-component math determined by the SRA on a case-specific basis. This platform does not compute the slum portion. Engage an SRA consultant; the slum side significantly affects developer economics for the whole plot.
          </div>
          <div className="num" style={{ fontSize: 10, color: 'var(--ink-soft)', marginTop: 8, letterSpacing: '0.04em' }}>
            [Reg 33(10) — Slum Rehabilitation Scheme]
          </div>
        </div>
      </div>
    </div>
  );
}
