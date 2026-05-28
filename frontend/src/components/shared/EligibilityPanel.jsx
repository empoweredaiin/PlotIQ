import { Check, X, AlertTriangle } from 'lucide-react';

export default function EligibilityPanel({ eligibility, input }) {
  return (
    <div style={{ background: eligibility.eligible ? 'rgba(74,140,102,0.08)' : 'rgba(164,73,58,0.08)',
                  border: `1px solid ${eligibility.eligible ? 'rgba(74,140,102,0.35)' : 'rgba(164,73,58,0.35)'}`,
                  borderRadius: 6, padding: 28, marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%',
                      background: eligibility.eligible ? '#5a7a4f' : '#a4493a',
                      display: 'grid', placeItems: 'center', flexShrink: 0, color: 'white' }}>
          {eligibility.eligible ? <Check size={22} /> : <X size={22} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: eligibility.eligible ? '#5a7a4f' : '#a4493a', fontWeight: 600 }}>
            {eligibility.eligible ? 'Eligible for redevelopment' : 'Not yet eligible — see issues below'}
          </div>
          <h2 className="serif" style={{ fontSize: 26, fontWeight: 600, margin: '4px 0 0 0',
                                          color: 'var(--ink)', lineHeight: 1.2 }}>
            {eligibility.eligible
              ? `${input.societyName || 'Your society'} qualifies under Reg 33(7)(B)`
              : `${input.societyName || 'Your society'} cannot use Reg 33(7)(B) yet`}
          </h2>
        </div>
      </div>

      {eligibility.passed.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 20,
                      borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: '#5a7a4f', marginBottom: 10 }}>
            What's working
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {eligibility.passed.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--ink-soft)' }}>
                <Check size={14} color="#5a7a4f" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  {p.title}
                  <span className="num" style={{ marginLeft: 6, fontSize: 10, color: 'var(--ink-soft)' }}>[{p.ref}]</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {eligibility.issues.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 20,
                      borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: '#a4493a', marginBottom: 10 }}>
            Issues to address
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {eligibility.issues.map((iss, i) => (
              <div key={i} style={{ padding: 14, background: 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${iss.level === 'fail' ? 'rgba(164,73,58,0.3)' : 'rgba(201,169,110,0.3)'}`,
                                    borderLeft: `3px solid ${iss.level === 'fail' ? '#a4493a' : '#C9A96E'}`,
                                    borderRadius: 3 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {iss.level === 'fail'
                    ? <X size={14} color="#a4493a" style={{ flexShrink: 0, marginTop: 3 }} />
                    : <AlertTriangle size={14} color="#C9A96E" style={{ flexShrink: 0, marginTop: 3 }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{iss.title}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 6, lineHeight: 1.55 }}>
                      {iss.detail}
                    </div>
                    <div className="num" style={{ fontSize: 10, color: 'var(--ink-soft)',
                                                  marginTop: 8, letterSpacing: '0.04em' }}>[{iss.ref}]</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
