import React from 'react';

export default function WorkspaceContextBar({ currentWorkspace }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)', background: '#fffefb', padding: '16px 0' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 32px', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: 'var(--ink)' }}>{currentWorkspace.label}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6 }}>{currentWorkspace.title}</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Modular intelligence workspace
        </div>
      </div>
    </div>
  );
}
