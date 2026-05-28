import { AlertTriangle } from 'lucide-react';

export default function SpecialLocationWarning({ specialLocation }) {
  if (!specialLocation || specialLocation === 'none') return null;
  const msgs = {
    barc: { label: 'BARC Area — M Ward', detail: 'This micro-location within M Ward is adjacent to BARC and carries a reduced basic FSI of 0.75 (not the standard 1.00 for Suburbs). The platform is using the standard Suburbs Table 12 slab. Instruct your Licensed Architect to verify the applicable FSI slab for your specific plot before relying on this output.' },
    crz: { label: 'CRZ-affected — Aksa / Marve / Erangal (P/N Ward)', detail: 'Plots in these coastal locations may carry a reduced basic FSI of 0.50 under CRZ regulations. The platform is using the standard Suburbs Table 12 slab. Your Licensed Architect must verify the applicable CRZ category and permissible FSI for your specific plot.' },
  };
  const m = msgs[specialLocation];
  if (!m) return null;
  return (
    <div style={{ background: 'rgba(192,140,48,0.08)', border: '1px solid rgba(192,140,48,0.35)', borderLeft: '3px solid #C9A96E', borderRadius: 4, padding: 16, marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <AlertTriangle size={18} color="#C9A96E" style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Caution — {m.label}</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 6, lineHeight: 1.55 }}>{m.detail}</div>
      </div>
    </div>
  );
}
