import { Printer } from 'lucide-react';

export const Section = ({ title, children, topMargin, moduleTag }) => (
  <div style={{ marginTop: topMargin ? 26 : 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: '#C9A96E' }}>{title}</div>
      {moduleTag && (
        <div style={{
          fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500,
          color: '#8D95A3', background: '#F0EDE8',
          padding: '2px 8px', borderRadius: 10, border: '1px solid #D7D2C7',
          whiteSpace: 'nowrap',
        }}>{moduleTag}</div>
      )}
    </div>
    {children}
  </div>
);

export const Radio = ({ active }) => (
  <div style={{ width: 14, height: 14, borderRadius: '50%',
                border: `1.5px solid ${active ? '#C9A96E' : '#D7D2C7'}`,
                display: 'grid', placeItems: 'center', flexShrink: 0 }}>
    {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A96E' }} />}
  </div>
);

export const Toggle = ({ checked, onChange, label, sub }) => (
  <label style={{ display: 'flex', gap: 12, padding: '10px 0', cursor: 'pointer',
                  borderBottom: '1px solid #D7D2C7' }}>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
           style={{ marginTop: 4, accentColor: '#C9A96E' }} />
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>{sub}</div>}
    </div>
  </label>
);

export const SectionTitle = ({ eyebrow, title }) => (
  <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
    <div style={{ fontSize: 10, letterSpacing: '0.13em', textTransform: 'uppercase',
                  color: '#C9A96E', fontWeight: 700 }}>{eyebrow || title}</div>
    {eyebrow && title && (
      <div style={{ fontSize: 13, color: '#5F6775', fontWeight: 500 }}>{title}</div>
    )}
  </div>
);

export const Row = ({ label, value, sub, highlight, muted }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
    <div style={{ fontSize: 12, color: muted ? 'var(--ink-faint)' : 'var(--ink-soft)' }}>{label}</div>
    <div style={{ textAlign: 'right' }}>
      <div className="num" style={{ fontSize: 13, fontWeight: highlight ? 700 : 500,
                                    color: muted ? 'var(--ink-soft)' : highlight ? '#C9A96E' : 'var(--ink)' }}>{value}</div>
      {sub && <div className="num" style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 1 }}>{sub}</div>}
    </div>
  </div>
);

export const th = { padding: '11px 18px', fontSize: 10, letterSpacing: '0.12em',
             textTransform: 'uppercase', color: 'var(--ink-soft)', fontWeight: 600, textAlign: 'left' };

export const td = { padding: '12px 18px', verticalAlign: 'top' };

export const Footer = () => (
  <footer style={{ marginTop: 80, paddingTop: 32, borderTop: '1px solid #D7D2C7',
                   fontSize: 11, color: 'var(--ink-faint)', lineHeight: 1.7 }}>
    <p style={{ maxWidth: 760 }}>
      <strong style={{ color: 'var(--ink-soft)' }}>Disclaimer.</strong> PlotIQ provides preliminary feasibility
      analysis based on the Comprehensive DCPR 2034 (PEATA edition). Outputs are not sanctioned approvals.
      The original gazette notifications and any subsequent State/MCGM amendments shall prevail. This
      analysis does not replace a Licensed Architect's certified plan or legal advice. Use with awareness
      of its limits.
    </p>
  </footer>
);

export const PrintBar = () => (
  <div className="no-print" style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #D7D2C7',
                                     display: 'flex', justifyContent: 'space-between',
                                     alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
    <div style={{ fontSize: 12, color: 'var(--ink-soft)', maxWidth: 480 }}>
      This screen is a working advisory assessment. Print it to create a review-ready artifact for committee discussion, architect validation, and lender or bank pre-check.
    </div>
    <button onClick={() => window.print()}
            style={{ padding: '11px 18px', fontSize: 13, fontWeight: 600,
                     background: '#C9A96E', color: '#0D0F14', border: 'none',
                     borderRadius: 3, cursor: 'pointer',
                     display: 'flex', alignItems: 'center', gap: 8 }}>
      <Printer size={14} /> Print or save as PDF
    </button>
  </div>
);
