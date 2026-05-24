import React from 'react';

export default function WorkspaceNav({ pages, activePage, onSelect }) {
  return (
    <div style={{ marginBottom: 24, padding: 20, background: '#fffefb', border: '1px solid var(--border)', borderRadius: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 16 }}>Workspace modules</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {pages.map(page => (
          <button key={page.id}
            type="button"
            onClick={() => onSelect(page.id)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '12px 14px',
              borderRadius: 10,
              border: activePage === page.id ? '1px solid var(--rust)' : '1px solid #d4c9b8',
              background: activePage === page.id ? 'rgba(161,122,67,0.12)' : '#fffefb',
              color: activePage === page.id ? 'var(--ink)' : 'var(--ink-soft)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}>
            {page.label}
          </button>
        ))}
      </div>
    </div>
  );
}
