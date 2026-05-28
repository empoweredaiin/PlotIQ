import React from 'react';

export default function WorkspacePageHeader({ currentWorkspace }) {
  return (
    <div style={{ marginBottom: 24, padding: 22, background: '#fffefb', border: '1px solid var(--border)', borderRadius: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div className="serif" style={{ fontSize: 28, fontWeight: 600, marginBottom: 8, color: 'var(--ink)' }}>{currentWorkspace.label}</div>
          <div style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.75 }}>{currentWorkspace.description}</div>
        </div>
        <div style={{ minWidth: 220, padding: '14px 18px', background: '#f5f1ea', borderRadius: 12, border: '1px solid #e7dfd0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--rust)', textTransform: 'uppercase', letterSpacing: '0.11em', marginBottom: 8 }}>Workspace guidance</div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.65 }}>
            Each module should answer: what is this, why it matters, and what to do next.
          </div>
        </div>
      </div>
    </div>
  );
}
