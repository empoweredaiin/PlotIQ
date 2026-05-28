import React from 'react';

export default function StatLine({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline' }}>
      <div style={{ fontSize: 12, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div className="num" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{value}</div>
    </div>
  );
}
