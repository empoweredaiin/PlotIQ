import { ALL_SCHEMES } from '../../core/validators/schemes';

export default function SchemePicker({ schemes, activeSchemeId, primarySchemeId, onSelect, input, update }) {
  const activeMeta = ALL_SCHEMES.find(s => s.id === activeSchemeId);
  const isOverride = input.selectedScheme && input.selectedScheme !== primarySchemeId;

  return (
    <div style={{
      background: '#13161D',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 6,
      padding: 24,
      marginBottom: 28,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A96E', fontWeight: 600, marginBottom: 6 }}>
            {isOverride ? 'Manually selected scheme' : 'Auto-detected applicable scheme'}
          </div>
          <h3 className="serif" style={{ fontSize: 24, fontWeight: 600, margin: 0, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
            {activeMeta?.code} — {activeMeta?.name}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 6, lineHeight: 1.5, margin: '6px 0 0' }}>{activeMeta?.desc}</p>
        </div>
        <div style={{ minWidth: 220 }}>
          <label className="field-label">Switch scheme</label>
          <select
            value={activeSchemeId}
            onChange={e => onSelect(e.target.value === primarySchemeId ? null : e.target.value)}
          >
            {ALL_SCHEMES.map(s => {
              const sched = schemes.find(x => x.id === s.id);
              const eligible = sched?.eligible;
              const tag = s.id === primarySchemeId ? ' ★ recommended' : eligible ? ' ✓ eligible' : ' ✗ not eligible';
              return <option key={s.id} value={s.id}>{s.code}{tag}</option>;
            })}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 10 }}>
          Why this scheme?
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {schemes.map(s => {
            const meta = ALL_SCHEMES.find(m => m.id === s.id);
            const isActive = s.id === activeSchemeId;
            const isPrimary = s.id === primarySchemeId;
            return (
              <div key={s.id} style={{
                padding: 12,
                background: isActive ? 'rgba(201,169,110,0.08)' : 'transparent',
                border: `1px solid ${isActive ? '#C9A96E' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 4,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="num" style={{ fontSize: 11, fontWeight: 700, color: '#C9A96E', letterSpacing: '0.04em' }}>
                      {meta?.code}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{meta?.short}</div>
                    {isPrimary && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 100, letterSpacing: '0.08em', background: '#C9A96E', color: 'white' }}>RECOMMENDED</span>
                    )}
                    {!isPrimary && s.eligible && (
                      <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 100, letterSpacing: '0.08em', background: 'rgba(90, 122, 79, 0.15)', color: '#3d5a4d' }}>ELIGIBLE</span>
                    )}
                    {!s.eligible && (
                      <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 100, letterSpacing: '0.08em', background: 'rgba(168, 156, 135, 0.2)', color: 'var(--ink-soft)' }}>NOT ELIGIBLE</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 3, marginLeft: 8 }}>
                  {s.gates.map((g, gi) => (
                    <div key={gi} style={{ display: 'flex', gap: 8, fontSize: 12, color: g.ok ? 'var(--ink)' : 'var(--ink-soft)' }}>
                      <span style={{ color: g.ok ? '#5a7a4f' : '#a4493a', flexShrink: 0, fontWeight: 700, marginTop: 1 }}>
                        {g.ok ? '✓' : '✗'}
                      </span>
                      <span>{g.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
