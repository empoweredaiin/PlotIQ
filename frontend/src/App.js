import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LayoutGrid, BarChart2, Receipt, Download, Check, X, AlertTriangle, ChevronDown } from 'lucide-react';
import './styles/tokens.css';
import { computeBuildable } from './core/schemes';
import { analyseEligibility } from './core/validators/eligibility';
import { detectApplicableSchemes, pickPrimaryScheme, ALL_SCHEMES } from './core/validators/schemes';
import { Footer } from './components/shared/primitives';
import SpecialLocationWarning from './components/shared/SpecialLocationWarning';
import SlumFlag from './components/shared/SlumFlag';
import InputPanel from './components/schemes/Reg33_7B/InputPanel';
import { AreaStatement, MemberEntitlement } from './components/schemes/Reg33_7B/Results';
import ClusterResult from './components/schemes/Reg33_9/Results';


// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function App() {
  const [input, setInput] = useState({
    societyName: '',
    address: '',
    location: 'suburbsExtended',
    zone: 'residential',
    buildingAge: 38,
    buildingType: 'society',
    authorisationStatus: 'oc',
    membersOnSamePlot: true,
    gbResolution: false,
    mixedTenancy: false,
    plotArea: 1500,
    dpRoadDeduction: 0,
    reservationDeduction: 0,
    roadWidth: 12,
    // Reg 14 amenity (auto with manual override)
    reg14Override: false,
    reg14ManualValue: 0,
    isAmalgamated: false,
    smallestOriginalPlot: 0,
    roadWideningProposed: false,
    specialLocation: 'none',
    // Reg 27 LOS (auto with manual override)
    losOverride: false,
    losManualValue: 0,
    rosProposed: 0,
    // BUA / flats
    buaInputMode: 'total',
    totalExistingBua: '',
    tenementCount: '',
    flats: [
      { label: '1BHK', carpet: 32, count: 12, use: 'residential' },
      { label: '2BHK', carpet: 56, count: 10, use: 'residential' },
      { label: '3BHK', carpet: 88, count: 2,  use: 'residential' },
    ],
    asrLandRate: 200000,
    constructionRate: 27500,
    devOfferRehab: 0,        // sqft carpet — what developer offers society members
    devOfferSale: 0,         // sqft carpet — what developer keeps as sale
    devOfferFileName: '',    // filename of uploaded offer doc (archival only)
    memberIncentiveShare: 80,
    // FSI loading sliders — fraction of permissible (0..1, default 1 = full)
    premiumFsiLoad: 1.0,
    tdrLoad: 1.0,
    fungibleLoad: 1.0,
    // Scheme selection
    selectedScheme: null,    // null = use auto-detected primary
    // Cluster (33(9)) inputs (only used when cluster opted-in)
    clusterOptIn: false,
    clusterPlotArea: 0,
    clusterBuildings: 1,
    clusterExistingBua: 0,
    clusterApartments: 0,
    // Slum (33(10)) flag
    slumOnPlot: false,
    // Report scope controls which optional fields are shown
    reportScope: 'entitlement',
  });

  const [wardDetect, setWardDetect] = useState({ status: 'idle', ward: null, error: null });
  const [workspacePage, setWorkspacePage] = useState('overview');
  const [page, setPage] = useState('landing');
  const [editingInputs, setEditingInputs] = useState(false);

  const update = (k, v) => setInput(prev => ({ ...prev, [k]: v }));
  const updateFlat = (idx, k, v) =>
    setInput(prev => ({ ...prev, flats: prev.flats.map((f, i) => i === idx ? { ...f, [k]: v } : f) }));
  const addFlat = () =>
    setInput(prev => ({ ...prev, flats: [...prev.flats, { label: 'New', carpet: 50, count: 1, use: 'residential' }] }));
  const removeFlat = (idx) =>
    setInput(prev => ({ ...prev, flats: prev.flats.filter((_, i) => i !== idx) }));

  const eligibility = useMemo(() => analyseEligibility(input), [input]);
  const schemes = useMemo(() => detectApplicableSchemes(input), [input]);
  const primarySchemeId = useMemo(() => pickPrimaryScheme(schemes, input), [schemes, input]);
  const activeSchemeId = input.selectedScheme || primarySchemeId;

  // Compute the active scheme + the auto-detected primary (for comparison)
  const result = useMemo(() => computeBuildable({ ...input, selectedScheme: activeSchemeId }), [input, activeSchemeId]);
  const result_33_7B = useMemo(() => {
    const s = schemes.find(x => x.id === 'reg33_7B');
    return s?.eligible ? computeBuildable({ ...input, selectedScheme: 'reg33_7B' }) : null;
  }, [input, schemes]);
  const result_33_9 = useMemo(() => {
    const s = schemes.find(x => x.id === 'reg33_9');
    return s?.eligible ? computeBuildable({ ...input, selectedScheme: 'reg33_9' }) : null;
  }, [input, schemes]);

  const renderWorkspaceContent = () => {
    switch (workspacePage) {

      // ── TAB 1: OVERVIEW ──────────────────────────────────────────────────────
      case 'overview':
      default:
        return <OverviewTab result={result} input={input} eligibility={eligibility} wardDetect={wardDetect} />;

      // ── TAB 2: AREA & FEASIBILITY ─────────────────────────────────────────────
      case 'area':
        return <AreaFeasibilityTab result={result} result_33_7B={result_33_7B} result_33_9={result_33_9} input={input} update={update} activeSchemeId={activeSchemeId} />;

      // ── TAB 3: COSTS ──────────────────────────────────────────────────────────
      case 'costs':
        return <CostsTab result={result} input={input} update={update} />;
    }
  };

  if (page === 'landing') {
    return <LandingPage onStart={() => setPage('tool')} />;
  }

  const _gold = '#C9A96E';
  const workspaceNav = [
    { id:'overview', label:'Overview',          icon:<LayoutGrid size={15}/> },
    { id:'area',     label:'Area & Feasibility', icon:<BarChart2 size={15}/> },
    { id:'costs',    label:'Costs',              icon:<Receipt size={15}/> },
  ];

  return (
    <div style={{
      position:'fixed',inset:0,background:'#F5F4F0',display:'flex',zIndex:1000,
      fontFamily:'"Source Sans 3",-apple-system,sans-serif',
    }}>
      <Styles />
      <GlobalStyles />

      {/* ── SIDEBAR (left) — project summary or full input form ── */}
      <aside className="piq-input-panel" style={{
        width: editingInputs ? 360 : 260,
        flexShrink:0,background:'#FFFFFF',
        borderRight:`1px solid #D7D2C7`,
        display:'flex',flexDirection:'column',
        overflow:'hidden',
        transition:'width 0.25s ease',
      }}>
        {/* Header */}
        <div style={{
          height:48,flexShrink:0,
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'0 16px',borderBottom:`1px solid #D7D2C7`,
        }}>
          <div style={{fontSize:15,fontWeight:700,letterSpacing:'0.05em',color:'#20242C'}}>
            PLOTI<span style={{color:_gold}}>Q</span>
          </div>
          <button onClick={()=>setPage('landing')} style={{
            background:'transparent',border:`1px solid #D7D2C7`,borderRadius:4,
            color:'#8D95A3',fontSize:11,letterSpacing:'0.07em',padding:'3px 7px',
            cursor:'pointer',fontFamily:'inherit',
          }}>← HOME</button>
        </div>

        {editingInputs ? (
          /* ── Full input form ── */
          <>
            <div style={{flex:1,overflowY:'auto',padding:'16px 18px 36px',background:'#F5F4F0'}}>
              <InputPanel
                input={input}
                update={update}
                updateFlat={updateFlat}
                addFlat={addFlat}
                removeFlat={removeFlat}
                wardDetect={wardDetect}
                setWardDetect={setWardDetect}
              />
            </div>
            <div style={{flexShrink:0,padding:'12px 16px',borderTop:`1px solid #D7D2C7`,background:'#FFFFFF'}}>
              <button onClick={()=>setEditingInputs(false)} style={{
                width:'100%',padding:'9px 0',background:'#C9A96E',color:'#FFFFFF',
                border:'none',borderRadius:4,fontSize:13,fontWeight:700,
                letterSpacing:'0.06em',cursor:'pointer',fontFamily:'inherit',
              }}>Done — View Results</button>
            </div>
          </>
        ) : (
          /* ── Compact project summary (results mode) ── */
          <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column'}}>
            {/* Property identity */}
            <div style={{padding:'20px 16px 16px',borderBottom:`1px solid #D7D2C7`}}>
              {input.societyName ? (
                <div style={{fontSize:14,fontWeight:700,color:'#20242C',lineHeight:1.3,marginBottom:4}}>{input.societyName}</div>
              ) : (
                <div style={{fontSize:12,color:'#8D95A3',fontStyle:'italic',marginBottom:4}}>Unnamed property</div>
              )}
              {(input.address || wardDetect.ward) && (
                <div style={{fontSize:11,color:'#5F6775',lineHeight:1.4}}>{wardDetect.ward || input.address}</div>
              )}
            </div>

            {/* Key facts */}
            <div style={{padding:'12px 16px',borderBottom:`1px solid #D7D2C7`}}>
              {[
                { label: 'Plot Area',      value: `${Math.round(input.plotArea).toLocaleString('en-IN')} sqm` },
                { label: 'Building Age',   value: `${input.buildingAge} years` },
                { label: 'Regulation',     value: result.schemeName || '—' },
                { label: 'Net Plot',       value: result.netPlot ? `${Math.round(result.netPlot).toLocaleString('en-IN')} sqm` : '—' },
                { label: 'Eff. FSI',       value: result.effFsi ? result.effFsi.toFixed(2) : '—' },
              ].map((f, i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'5px 0',borderBottom:`1px solid #E7E2D8`}}>
                  <span style={{fontSize:10,color:'#8D95A3',textTransform:'uppercase',letterSpacing:'0.07em',fontWeight:600}}>{f.label}</span>
                  <span style={{fontSize:12,fontWeight:700,color:'#20242C',fontFamily:'"JetBrains Mono",monospace'}}>{f.value}</span>
                </div>
              ))}
            </div>

            {/* Eligibility status */}
            <div style={{padding:'12px 16px',borderBottom:`1px solid #D7D2C7`}}>
              {(() => {
                const failCount = eligibility.issues.filter(i => i.level === 'fail').length;
                const warnCount = eligibility.issues.filter(i => i.level === 'warn').length;
                const passCount = eligibility.passed.length;
                const isEligible = failCount === 0;
                return (
                  <div style={{
                    padding:'10px 12px',borderRadius:4,
                    background: isEligible ? 'rgba(74,156,110,0.08)' : 'rgba(192,80,80,0.08)',
                    border: `1px solid ${isEligible ? 'rgba(74,156,110,0.25)' : 'rgba(192,80,80,0.25)'}`,
                  }}>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',
                      color: isEligible ? '#4A9C6E' : '#C05050', marginBottom:4}}>
                      {isEligible ? (warnCount > 0 ? 'Eligible — with caveats' : 'Eligible') : 'Blocked'}
                    </div>
                    <div style={{fontSize:11,color:'#5F6775',lineHeight:1.5}}>
                      {passCount} condition{passCount !== 1 ? 's' : ''} met
                      {warnCount > 0 && ` · ${warnCount} warning${warnCount !== 1 ? 's' : ''}`}
                      {failCount > 0 && ` · ${failCount} blocker${failCount !== 1 ? 's' : ''}`}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Scheme switcher */}
            <div style={{padding:'12px 16px',borderBottom:`1px solid #D7D2C7`}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'#8D95A3',marginBottom:8}}>Active Scheme</div>
              <select
                value={activeSchemeId || ''}
                onChange={e => update('selectedScheme', e.target.value === primarySchemeId ? null : e.target.value)}
                style={{width:'100%',background:'#FFFFFF',border:`1px solid #D7D2C7`,color:'#20242C',
                  padding:'7px 10px',fontSize:12,borderRadius:3,outline:'none',fontFamily:'inherit',cursor:'pointer'}}
              >
                {ALL_SCHEMES.map(s => {
                  const sched = schemes.find(x => x.id === s.id);
                  const tag = s.id === primarySchemeId ? ' ★' : sched?.eligible ? ' ✓' : ' ✗';
                  return <option key={s.id} value={s.id}>{s.code}{tag}</option>;
                })}
              </select>
            </div>

            {/* Spacer + Edit button pinned to bottom */}
            <div style={{flex:1}} />
            <div style={{padding:'12px 16px',borderTop:`1px solid #D7D2C7`,background:'#FFFFFF',flexShrink:0}}>
              <button onClick={()=>setEditingInputs(true)} style={{
                width:'100%',padding:'9px 0',background:'transparent',
                border:`1px solid #D7D2C7`,borderRadius:4,
                fontSize:12,fontWeight:600,color:'#5F6775',letterSpacing:'0.06em',
                cursor:'pointer',fontFamily:'inherit',
              }}>Edit Inputs</button>
            </div>
          </div>
        )}
      </aside>

      {/* ── RESULTS AREA (right) ── */}
      <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',overflow:'hidden',position:'relative'}}>

        {/* Topbar — 48px */}
        <div className="piq-topbar-padding" style={{
          height:48,flexShrink:0,borderBottom:`1px solid #D7D2C7`,
          display:'flex',alignItems:'center',gap:0,
          background:'#FFFFFF',
        }}>
          {/* Workspace nav tabs */}
          <div style={{display:'flex',height:'100%',paddingLeft:16}}>
            {workspaceNav.map(tab=>(
              <button key={tab.id} onClick={()=>setWorkspacePage(tab.id)} style={{
                display:'flex',alignItems:'center',gap:6,
                padding:'0 18px',fontSize:12,fontWeight:workspacePage===tab.id?700:500,
                background:'none',border:'none',
                borderBottom:workspacePage===tab.id?`2px solid ${_gold}`:'2px solid transparent',
                color:workspacePage===tab.id?'#20242C':'#8D95A3',
                cursor:'pointer',fontFamily:'inherit',
                letterSpacing:'0.08em',textTransform:'uppercase',
              }}>
                <span style={{opacity:workspacePage===tab.id?0.8:0.4,display:'flex'}}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{flex:1,minWidth:0,padding:'0 12px'}}>
            {result.fsiSlab && (
              <div className="piq-topbar-stats" style={{display:'flex',gap:20,justifyContent:'flex-end'}}>
                {[
                  {val:`${input.plotArea} m²`,label:'Plot'},
                  {val:result.fsiSlab.basic.toFixed(2),label:'Base FSI'},
                  result.fsiSlab.tdr>0 ? {val:result.fsiSlab.tdr.toFixed(2),label:'TDR'} : null,
                ].filter(Boolean).map(item=>(
                  <div key={item.label} style={{textAlign:'right'}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#20242C',fontFamily:'"JetBrains Mono",monospace'}}>{item.val}</div>
                    <div style={{fontSize:10,color:'#8D95A3',textTransform:'uppercase',letterSpacing:'0.11em',marginTop:1}}>{item.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0,paddingRight:16}}>
            <button onClick={()=>window.print()} style={{
              display:'flex',alignItems:'center',gap:5,
              padding:'5px 10px',background:'transparent',
              border:`1px solid #D7D2C7`,borderRadius:4,
              color:'#5F6775',fontSize:12,fontWeight:600,letterSpacing:'0.06em',
              cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',
            }}><Download size={11}/>Export</button>
            <button onClick={()=>setPage('landing')} style={{
              padding:'5px 12px',background:_gold,
              border:`none`,borderRadius:4,
              color:'#FFFFFF',fontSize:12,fontWeight:700,letterSpacing:'0.07em',
              cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',
            }}>+ NEW</button>
          </div>
        </div>

        {/* Mobile workspace nav */}
        <div className="piq-mobile-workspace-nav">
          {workspaceNav.map(item=>(
            <button key={item.id} onClick={()=>setWorkspacePage(item.id)}
                    className={workspacePage===item.id?'active':''}>
              {item.label}
            </button>
          ))}
          <button
            onClick={()=>setEditingInputs(true)}
            className="piq-mobile-edit-btn"
            style={{marginLeft:'auto',padding:'11px 14px',fontSize:11,fontWeight:600,
              background:'none',border:'none',borderBottom:'2px solid transparent',
              color:'#C9A96E',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',
              letterSpacing:'0.04em',flexShrink:0}}>
            Edit ✎
          </button>
        </div>

        {/* Mobile input overlay */}
        {editingInputs && (
          <div className="piq-mobile-input-overlay">
            <div style={{background:'#FFFFFF',height:'100%',display:'flex',flexDirection:'column',overflow:'hidden'}}>
              <div style={{height:48,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',
                padding:'0 16px',borderBottom:'1px solid #D7D2C7'}}>
                <div style={{fontSize:13,fontWeight:700,color:'#20242C'}}>Inputs</div>
                <button onClick={()=>setEditingInputs(false)} style={{
                  background:'#C9A96E',border:'none',borderRadius:4,
                  color:'#FFFFFF',fontSize:12,fontWeight:700,padding:'6px 14px',
                  cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.06em'}}>Done</button>
              </div>
              <div style={{flex:1,overflowY:'auto',padding:'16px 18px 48px',background:'#F5F4F0'}}>
                <InputPanel input={input} update={update} updateFlat={updateFlat}
                  addFlat={addFlat} removeFlat={removeFlat}
                  wardDetect={wardDetect} setWardDetect={setWardDetect} />
              </div>
            </div>
          </div>
        )}

        {/* Content — single dominant scroll */}
        <div className="redev-app piq-content-area" style={{flex:1,minHeight:0,overflowY:'auto',padding:'24px 32px 48px',display:'block',background:'#F5F4F0'}}>
          {renderWorkspaceContent()}
          <Footer />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB COMPONENTS
// ============================================================================

// ── palette constants ─────────────────────────────────────────────────────────
const _G  = '#C9A96E';                        // gold
const _BD = '#D7D2C7';                        // border
const _MU = '#5F6775';                         // muted text
const _FA = '#8D95A3';                         // faint label
const _INK = '#20242C';                        // primary ink


// ── TAB 1: OVERVIEW — "Can I redevelop?" ─────────────────────────────────────
function OverviewTab({ result, input, eligibility, wardDetect }) {
  const r = result;
  const n = (v) => v == null ? '—' : Math.round(v).toLocaleString('en-IN');

  const AUTH = { oc: 'OC', cc: 'CC', tolerated: 'Tolerated', none: 'None' };

  const VC = {
    marginal:            { color: '#C05050', border: 'rgba(192,80,80,0.25)',    bg: 'rgba(192,80,80,0.06)',    label: 'Marginal' },
    viable:              { color: '#C9A96E', border: 'rgba(201,169,110,0.25)',  bg: 'rgba(201,169,110,0.06)', label: 'Viable' },
    attractive:          { color: '#4A9C6E', border: 'rgba(74,156,110,0.25)',   bg: 'rgba(74,156,110,0.06)',  label: 'Attractive' },
    'highly attractive': { color: '#4A9C6E', border: 'rgba(74,156,110,0.25)',   bg: 'rgba(74,156,110,0.06)',  label: 'Highly Attractive' },
  };
  const vc = VC[r.viabilityRating] || VC.marginal;

  const failCount = eligibility.issues.filter(i => i.level === 'fail').length;
  const warnCount = eligibility.issues.filter(i => i.level === 'warn').length;
  const passCount = eligibility.passed.length;
  const isEligible = failCount === 0;
  const rehabPct = r.permissibleBua > 0 ? (r.memberSideRehabBua / r.permissibleBua) * 100 : 0;
  const salePct = 100 - rehabPct;

  const CHECKS = [
    { q: 'Building age',         s: input.buildingAge >= 30 ? 'pass' : 'fail', v: `${input.buildingAge} yr`,    note: input.buildingAge >= 30 ? 'Meets ≥ 30 yr threshold' : 'Must be ≥ 30 yrs for 33(7)(B)' },
    { q: 'Authorisation',        s: ['oc','cc','tolerated'].includes(input.authorisationStatus) ? 'pass' : 'fail', v: AUTH[input.authorisationStatus], note: input.authorisationStatus === 'none' ? 'No OC/CC — incentive BUA at risk' : 'On record' },
    { q: 'Members on same plot', s: input.membersOnSamePlot ? 'pass' : 'fail', v: input.membersOnSamePlot ? 'Yes' : 'No', note: input.membersOnSamePlot ? 'Required condition met' : 'Required for 33(7)(B)' },
    { q: 'GB resolution',        s: input.gbResolution ? 'pass' : 'warn',      v: input.gbResolution ? 'Passed' : 'Pending', note: input.gbResolution ? 'Ready to proceed' : 'Required before submission' },
    { q: 'Commercial viability', s: r.viabilityRating === 'marginal' ? 'warn' : r.viabilityRating ? 'pass' : 'warn', v: vc.label, note: r.viabilityNote },
    ...eligibility.issues.filter(i => i.level === 'fail').map(iss => ({ q: iss.title, s: 'fail', v: 'Blocker', note: iss.detail })),
  ];

  const SI = {
    pass: <Check size={12} color="#4A9C6E" />,
    warn: <AlertTriangle size={12} color={_G} />,
    fail: <X size={12} color="#C05050" />,
  };

  return (
    <div>

      {/* ── VERDICT — dominant outcome ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: _FA, marginBottom: 16 }}>
          Executive Assessment
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
          {/* Status badge */}
          <div style={{
            flexShrink: 0,
            padding: '6px 16px',
            borderRadius: 3,
            border: `1px solid ${isEligible ? 'rgba(74,156,110,0.35)' : 'rgba(192,80,80,0.35)'}`,
            background: isEligible ? 'rgba(74,156,110,0.08)' : 'rgba(192,80,80,0.08)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: isEligible ? '#4A9C6E' : '#C05050', marginBottom: 2 }}>
              {isEligible ? (warnCount > 0 ? 'ELIGIBLE' : 'ELIGIBLE') : 'BLOCKED'}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: '"JetBrains Mono",monospace', color: isEligible ? '#4A9C6E' : '#C05050', lineHeight: 1 }}>
              {passCount}/{passCount + failCount + warnCount}
            </div>
            <div style={{ fontSize: 9, color: _FA, marginTop: 3 }}>conditions</div>
          </div>

          {/* Primary metrics inline */}
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 36, fontWeight: 800, fontFamily: '"JetBrains Mono",monospace', color: _INK, lineHeight: 1, letterSpacing: '-0.02em' }}>{n(r.permissibleBua)}</div>
              <div style={{ fontSize: 11, color: _MU, marginTop: 4 }}>sqm permissible buildable area</div>
            </div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 800, fontFamily: '"JetBrains Mono",monospace', color: _INK, lineHeight: 1, letterSpacing: '-0.02em' }}>{r.effFsi?.toFixed(2) ?? '—'}</div>
              <div style={{ fontSize: 11, color: _MU, marginTop: 4 }}>effective FSI</div>
            </div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 800, fontFamily: '"JetBrains Mono",monospace', color: vc.color, lineHeight: 1, letterSpacing: '-0.02em' }}>{vc.label}</div>
              <div style={{ fontSize: 11, color: _MU, marginTop: 4 }}>commercial viability · {r.viabilityRatio?.toFixed(2) ?? '—'}× ratio</div>
            </div>
          </div>
        </div>

        {/* BUA split — slim bar below headline */}
        {r.permissibleBua > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ height: 4, display: 'flex', borderRadius: 2, overflow: 'hidden', background: _BD }}>
              <div style={{ width: `${rehabPct}%`, background: '#4A9C6E', transition: 'width .5s ease' }} />
              <div style={{ width: `${salePct}%`, background: _G, transition: 'width .5s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11 }}>
              <span style={{ color: '#4A9C6E', fontFamily: '"JetBrains Mono",monospace' }}>Members — {n(r.memberSideRehabBua)} sqm ({rehabPct.toFixed(0)}%)</span>
              <span style={{ color: _G, fontFamily: '"JetBrains Mono",monospace' }}>Developer — {n(r.saleBua)} sqm ({salePct.toFixed(0)}%)</span>
            </div>
          </div>
        )}
      </div>

      {/* ── QUALIFICATION CHECKLIST ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: _FA, marginBottom: 12 }}>
          Qualification Checks
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {CHECKS.map((row, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${_BD}` }}>
                <td style={{ padding: '10px 8px 10px 0', width: 20, verticalAlign: 'top' }}>{SI[row.s]}</td>
                <td style={{ padding: '10px 16px 10px 0', fontSize: 13, color: row.s === 'fail' ? '#C05050' : _INK, fontWeight: row.s === 'fail' ? 600 : 400, verticalAlign: 'top', width: '32%' }}>{row.q}</td>
                <td style={{ padding: '10px 16px 10px 0', fontSize: 12, fontWeight: 700, fontFamily: '"JetBrains Mono",monospace', color: row.s === 'pass' ? _INK : row.s === 'warn' ? _G : '#C05050', verticalAlign: 'top', width: '18%' }}>{row.v}</td>
                <td style={{ padding: '10px 0', fontSize: 12, color: _MU, verticalAlign: 'top', lineHeight: 1.5 }}>{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── RISKS — warnings and issues from eligibility engine ── */}
      {eligibility.issues.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: _FA, marginBottom: 12 }}>Risks & Flags</div>
          {eligibility.issues.map((iss, i) => (
            <div key={i} style={{
              padding: '12px 14px', marginBottom: 8, borderRadius: 3,
              borderLeft: `3px solid ${iss.level === 'fail' ? '#C05050' : _G}`,
              background: iss.level === 'fail' ? 'rgba(192,80,80,0.05)' : 'rgba(201,169,110,0.05)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: _INK, marginBottom: 3 }}>{iss.title}</div>
              <div style={{ fontSize: 12, color: _MU, lineHeight: 1.5 }}>{iss.detail}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── PROPERTY SNAPSHOT ── */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: _FA, marginBottom: 12 }}>Property Snapshot</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
          {[
            { label: 'Gross Plot',    value: `${n(input.plotArea)} sqm` },
            { label: 'Net Plot',      value: `${n(r.netPlot)} sqm` },
            { label: 'Existing BUA',  value: `${n(r.existingBua)} sqm` },
            { label: 'Road Width',    value: `${input.roadWidth} m` },
            { label: 'Base FSI',      value: r.fsiSlab?.basic?.toFixed(2) ?? '—' },
            { label: 'TDR FSI',       value: r.fsiSlab?.tdr > 0 ? r.fsiSlab.tdr.toFixed(2) : 'none' },
            { label: 'Location',      value: input.location === 'islandCity' ? 'Island City' : 'Suburbs / Extended' },
            { label: wardDetect.ward ? 'Ward' : 'Regulation', value: wardDetect.ward || r.schemeName || '—' },
          ].map((f, i) => (
            <div key={i} style={{ width: '25%', padding: '10px 16px 10px 0', borderBottom: `1px solid ${_BD}` }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _FA, marginBottom: 4 }}>{f.label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: _INK, fontFamily: '"JetBrains Mono",monospace' }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      {input.specialLocation !== 'none' && <div style={{ marginTop: 24 }}><SpecialLocationWarning specialLocation={input.specialLocation} /></div>}
      {input.slumOnPlot && <div style={{ marginTop: 16 }}><SlumFlag /></div>}
    </div>
  );
}

// ── TAB 2: AREA & FEASIBILITY — "How much can actually be built?" ─────────────
function AreaFeasibilityTab({ result, result_33_7B, result_33_9, input, update, activeSchemeId }) {
  const r = result;
  const n = (v) => v == null ? '—' : Math.round(v).toLocaleString('en-IN');
  const sqft = (v) => v == null ? '—' : Math.round(v * 10.764).toLocaleString('en-IN');
  const [showWorking, setShowWorking] = useState(true);
  const [openWatch, setOpenWatch] = useState(null);

  const WATCH = [
    { tag: 'Area claim',    title: 'Developer says "only 1.2× existing carpet"', body: `Under 33(7)(B) incentive BUA is minimum 15% of existing BUA or 10 sqm/flat — free of cost. Plus premium FSI and TDR up to Table 12 ceiling. A 1.2× offer is a negotiating position, not the regulation.` },
    { tag: 'TDR',          title: '"TDR unavailable" or "too expensive"',         body: `TDR is actively traded in Mumbai. Ask the developer for the specific TDR market quote they used. Refusing to disclose is a red flag.` },
    { tag: 'Premium',      title: 'Developer asks society to pay any premium',    body: `Incentive BUA under 33(7)(B) is free of premium. Premium on FSI goes to MCGM, paid by developer from sale proceeds. Any premium charged to society is non-standard.` },
    { tag: 'Transparency', title: 'Offer made but no area statement shown',       body: `A written area statement (existing BUA → incentive → FSI build-up → fungible → rehab/sale split) is standard practice. Refusal to provide it is itself a signal.` },
    { tag: 'Corpus',       title: 'Corpus quoted without showing the maths',      body: `Corpus, rent and other payments are negotiated, not regulated. Compare at least 3 offers together — corpus + rent + carpet + finishing schedule.` },
    { tag: 'Double count', title: 'Prior FSI already claimed on this plot',       body: `FSI/TDR previously claimed on a DP-road or reservation area cannot be claimed again. Ask your architect to verify against past sanctioned proposals on the property card.` },
    r.viabilityRatio < 0.4 ? { tag: 'Viability', title: 'Low sale:rehab — expect limited developer interest', body: `Options: (a) await higher FSI policy, (b) explore Reg 33(9) cluster, (c) verify 33(7)(A) applicability, (d) self-redevelopment via society loan.` } : null,
  ].filter(Boolean);

  return (
    <div>

      {/* ── BUILDABLE OUTCOME — dominant number ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: _FA, marginBottom: 16 }}>Buildable Outcome</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 6 }}>
          <span className="piq-hero-num" style={{ fontSize: 56, fontWeight: 800, fontFamily: '"JetBrains Mono",monospace', color: _INK, lineHeight: 1, letterSpacing: '-0.03em' }}>{n(r.permissibleBua)}</span>
          <span style={{ fontSize: 16, color: _MU, paddingBottom: 10 }}>sqm</span>
        </div>
        <div style={{ fontSize: 13, color: _MU, marginBottom: 20 }}>
          Permissible Buildable Area — {sqft(r.permissibleBua)} sqft · Eff. FSI {r.effFsi?.toFixed(2) ?? '—'}
        </div>

        {/* Entitlement summary — 3 inline stats */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, borderTop: `1px solid ${_BD}`, borderLeft: `1px solid ${_BD}` }}>
          {[
            { label: 'Member Rehab',    value: n(r.memberSideRehabBua), sub: `sqm · ${sqft(r.memberSideRehabBua)} sqft`, color: '#4A9C6E' },
            { label: 'Developer Sale',  value: n(r.saleBua),            sub: `sqm · viability ${r.viabilityRatio?.toFixed(2) ?? '—'}×` },
            { label: 'Incentive BUA',   value: n(r.incentiveBua),       sub: `sqm · free of premium` },
          ].map((c, i) => (
            <div key={i} style={{ flex: '1 1 120px', padding: '14px 16px', borderRight: `1px solid ${_BD}`, borderBottom: `1px solid ${_BD}` }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.color || _FA, marginBottom: 5 }}>{c.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: '"JetBrains Mono",monospace', color: c.color || _INK, lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: 10, color: _MU, marginTop: 4 }}>{c.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MEMBER ENTITLEMENT ── */}
      {(activeSchemeId === 'reg33_9' || result.flatBreakdown?.length > 0) && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: _FA, marginBottom: 16 }}>Member Entitlement</div>
          {activeSchemeId === 'reg33_9' && <div style={{ marginBottom: 16 }}><ClusterResult result={result} input={input} /></div>}
          {result.flatBreakdown?.length > 0 && (
            <MemberEntitlement breakdown={result.flatBreakdown} input={input} update={update} />
          )}
        </div>
      )}

      {/* ── SCHEME COMPARISON (conditional) ── */}
      {result_33_7B && result_33_9 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: _FA, marginBottom: 12 }}>Scheme Comparison</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${_BD}` }}>
                <th style={{ padding: '6px 0', textAlign: 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _FA }}>Metric</th>
                <th style={{ padding: '6px 16px', textAlign: 'right', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _FA }}>Reg 33(7)(B)</th>
                <th style={{ padding: '6px 0', textAlign: 'right', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _G }}>Reg 33(9)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Permissible BUA', v1: n(result_33_7B.permissibleBua), v2: n(result_33_9.permissibleBua) },
                { label: 'Member Rehab',    v1: n(result_33_7B.memberSideRehabBua), v2: n(result_33_9.rehabBase) },
                { label: 'Developer Sale',  v1: n(result_33_7B.saleBua), v2: n(result_33_9.saleBua) },
                { label: 'Eff. FSI',        v1: result_33_7B.effFsi?.toFixed(2), v2: result_33_9.effFsi?.toFixed(2) },
              ].map((row, i) => {
                const cWins = result_33_9.permissibleBua > result_33_7B.permissibleBua;
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${_BD}` }}>
                    <td style={{ padding: '9px 0', fontSize: 12, color: _MU }}>{row.label}</td>
                    <td style={{ padding: '9px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: _INK, fontFamily: '"JetBrains Mono",monospace' }}>{row.v1}</td>
                    <td style={{ padding: '9px 0', textAlign: 'right', fontSize: 13, fontWeight: cWins ? 700 : 400, color: cWins ? _G : _INK, fontFamily: '"JetBrains Mono",monospace' }}>{row.v2}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── DETAILED WORKING ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ borderTop: `1px solid ${_BD}`, paddingTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: _FA }}>
              FSI Build-up & Area Statement
            </div>
            <button
              onClick={() => setShowWorking(w => !w)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0' }}
            >
              <ChevronDown size={11} color={_FA} style={{ transform: showWorking ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }} />
              <span style={{ fontSize: 11, color: _FA }}>{showWorking ? 'Collapse' : 'Expand'}</span>
            </button>
          </div>
          {showWorking && (
            <AreaStatement result={result} input={input} update={update} schemeId={activeSchemeId} readOnly={true} />
          )}
        </div>
      </div>

      {/* ── RED FLAGS ── */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: _FA, marginBottom: 12 }}>What to Watch For</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {WATCH.map((item, i) => (
              <>
                <tr key={`r${i}`}
                  style={{ borderBottom: openWatch === i ? 'none' : `1px solid ${_BD}`, cursor: 'pointer' }}
                  onClick={() => setOpenWatch(openWatch === i ? null : i)}>
                  <td style={{ padding: '11px 0', width: 20 }}>
                    <ChevronDown size={11} color={_FA} style={{ transform: openWatch === i ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }} />
                  </td>
                  <td style={{ padding: '11px 12px 11px 8px', verticalAlign: 'middle' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', background: 'rgba(201,169,110,0.08)', border: `1px solid rgba(201,169,110,0.2)`, borderRadius: 2, fontSize: 9, fontWeight: 700, color: _G, marginRight: 10, whiteSpace: 'nowrap' }}>{item.tag}</span>
                    <span style={{ fontSize: 13, color: _INK }}>{item.title}</span>
                  </td>
                </tr>
                {openWatch === i && (
                  <tr key={`d${i}`} style={{ borderBottom: `1px solid ${_BD}` }}>
                    <td />
                    <td style={{ padding: '4px 12px 14px 8px', fontSize: 12, color: _MU, lineHeight: 1.6 }}>{item.body}</td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── TAB 3: COSTS — "What will it cost?" ─────────────────────────────────────
function CostsTab({ result, input, update }) {
  const ps = result.premiumSheet;
  const cr = (v) => v == null ? '—' : `₹${Math.round(v).toLocaleString('en-IN')}`;
  const n  = (v) => v == null ? '—' : Math.round(v).toLocaleString('en-IN');
  const asrRate = parseFloat(input.asrLandRate) || 0;
  const cRate   = parseFloat(input.constructionRate) || 27500;

  const LEDGER = ps ? [
    { label: 'Premium FSI',             basis: `${n(result.premiumFsiBuaLoaded)} sqm × ASR × 50%`,  amount: ps.premiumFsiPayable,   ref: 'Reg 30(A)(6)', section: 'Government Premiums' },
    { label: 'Fungible — sale portion', basis: `${n(result.fungibleSaleBua)} sqm × ASR × 50%`,      amount: ps.fungiblePremium,     ref: 'Reg 31(3)',    section: 'Government Premiums' },
    { label: '  MCGM share (50%)',      basis: '',                                                   amount: ps.fungibleMCGM,        ref: '',             section: 'Government Premiums', sub: true },
    { label: '  State Govt share (30%)',basis: '',                                                   amount: ps.fungibleGovt,        ref: '',             section: 'Government Premiums', sub: true },
    { label: '  MSRDC share (20%)',     basis: '',                                                   amount: ps.fungibleMSRDC,       ref: '',             section: 'Government Premiums', sub: true },
    ...(ps.osdPremium > 0 ? [{ label: 'Open Space Deficiency', basis: `${n(result.rosDeficiency)} sqm × ASR × 25%`, amount: ps.osdPremium, ref: 'Reg 27', section: 'Government Premiums' }] : []),
    { label: 'Scrutiny Fee',            basis: `${n(result.permissibleBua)} sqm × ₹70.7`,           amount: ps.scrutinyFee,         ref: 'AutoDCR',      section: 'Statutory Fees' },
    { label: 'IOD Deposit',             basis: `${n(result.permissibleBua)} sqm × ₹10.76/sqft`,     amount: ps.iodDeposit,          ref: 'AutoDCR',      section: 'Statutory Fees' },
    { label: 'Debris Removal Deposit',  basis: 'Min(BUA × ₹2/sqft, ₹45k)',                          amount: ps.debrisDeposit,       ref: 'AutoDCR',      section: 'Statutory Fees' },
    { label: 'Labour Welfare Cess',     basis: `BUA × ₹${n(cRate)} × 1%`,                           amount: ps.labourWelfareCess,   ref: 'BOCW Act',     section: 'Statutory Fees' },
    { label: 'Dev Charges — Land',      basis: `Base FSI × plot × ASR × 1%`,                        amount: ps.devChargesLand,      ref: 'MR&TP 124E',   section: 'Statutory Fees' },
    { label: 'Dev Charges — BUA',       basis: `BUA × ASR × 4%`,                                    amount: ps.devChargesBua,       ref: 'MR&TP 124E',   section: 'Statutory Fees' },
    { label: 'Layout Scrutiny',         basis: `${n(result.netPlot)} sqm × ₹11.13`,                 amount: ps.layoutScrutinyFee,   ref: 'AutoDCR',      section: 'Statutory Fees' },
    ...(ps.tdrScrutinyFee > 0 ? [
      { label: 'TDR Utilisation Scrutiny', basis: 'TDR BUA × ₹59',                                   amount: ps.tdrScrutinyFee,   ref: 'AutoDCR',      section: 'Statutory Fees' },
      { label: 'TDR Infrastructure Charge',basis: `TDR BUA × ₹${n(cRate)} × 5%`,                     amount: ps.tdrInfraCharge,   ref: 'Reg 32',       section: 'Statutory Fees' },
    ] : []),
  ] : [];

  const permBuaSqft = result.permissibleBua ? Math.round(result.permissibleBua * 10.764) : null;
  const costPerSqft = ps?.grandTotal && permBuaSqft ? Math.round(ps.grandTotal / permBuaSqft) : null;

  return (
    <div>

      {/* ── TOTAL COST — dominant number ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: _FA, marginBottom: 16 }}>Total Government Cost</div>
        {asrRate === 0 ? (
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, fontFamily: '"JetBrains Mono",monospace', color: _FA, lineHeight: 1 }}>—</div>
            <div style={{ fontSize: 13, color: _MU, marginTop: 8 }}>Enter ASR Land Rate below to compute</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 6 }}>
              <span className="piq-hero-num" style={{ fontSize: 52, fontWeight: 800, fontFamily: '"JetBrains Mono",monospace', color: _G, lineHeight: 1, letterSpacing: '-0.03em' }}>{ps ? cr(ps.grandTotal) : '—'}</span>
            </div>
            <div style={{ fontSize: 13, color: _MU, marginBottom: 20 }}>
              Rough estimate · Premiums + Statutory Fees
              {costPerSqft && ` · ₹${costPerSqft.toLocaleString('en-IN')}/sqft permissible BUA`}
            </div>
          </>
        )}

        {/* Cost breakdown — 2 inline stats */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, borderTop: `1px solid ${_BD}`, borderLeft: `1px solid ${_BD}` }}>
          {[
            { label: 'Government Premiums', value: ps ? cr(ps.totalPremium) : '—',  sub: 'Reg 30 / 31 · FSI & fungible' },
            { label: 'Statutory Fees',      value: ps ? cr(ps.totalAutoDCR) : '—',  sub: 'AutoDCR processing · FY 2025-26' },
          ].map((c, i) => (
            <div key={i} style={{ flex: '1 1 150px', padding: '14px 16px', borderRight: `1px solid ${_BD}`, borderBottom: `1px solid ${_BD}` }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: _FA, marginBottom: 5 }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: '"JetBrains Mono",monospace', color: _INK, lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: 10, color: _MU, marginTop: 4 }}>{c.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RATE INPUTS ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: _FA, marginBottom: 12 }}>Rate Inputs</div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 160px' }}>
            <div style={{ fontSize: 11, color: _MU, marginBottom: 6 }}>ASR Land Rate — ₹/sqm</div>
            <input type="number" value={input.asrLandRate}
              onChange={e => update('asrLandRate', parseFloat(e.target.value) || 0)}
              style={{ width: '100%', background: '#FFFFFF', border: `1px solid ${_BD}`, color: _INK, padding: '8px 12px', fontSize: 15, fontFamily: '"JetBrains Mono",monospace', borderRadius: 3, outline: 'none' }} />
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <div style={{ fontSize: 11, color: _MU, marginBottom: 6 }}>Construction Rate — ₹/sqm BUA</div>
            <input type="number" value={input.constructionRate}
              onChange={e => update('constructionRate', parseFloat(e.target.value) || 0)}
              style={{ width: '100%', background: '#FFFFFF', border: `1px solid ${_BD}`, color: _INK, padding: '8px 12px', fontSize: 15, fontFamily: '"JetBrains Mono",monospace', borderRadius: 3, outline: 'none' }} />
          </div>
          <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: 11, color: _MU, marginBottom: 6 }}>FSI Loading</div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[['Premium', input.premiumFsiLoad], ['TDR', input.tdrLoad], ['Fungible', input.fungibleLoad]].map(([lbl, v]) => (
                <div key={lbl}>
                  <div style={{ fontSize: 9, color: _FA, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{lbl}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: '"JetBrains Mono",monospace', color: (v ?? 1) < 1 ? _G : _INK }}>{((v ?? 1) * 100).toFixed(0)}%</div>
                </div>
              ))}
              <div style={{ fontSize: 9, color: _FA, alignSelf: 'flex-end', paddingBottom: 2 }}>adjust on Area tab</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── COST LEDGER ── */}
      {ps && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: _FA, marginBottom: 12 }}>Cost Breakdown</div>
          {['Government Premiums', 'Statutory Fees'].map(sectionName => {
            const rows = LEDGER.filter(r => r.section === sectionName);
            const subtotal = sectionName === 'Government Premiums' ? ps.totalPremium : ps.totalAutoDCR;
            return (
              <div key={sectionName} style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 8, borderBottom: `1px solid ${_BD}`, marginBottom: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: _MU, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{sectionName}</span>
                  {sectionName === 'Statutory Fees' && <span style={{ fontSize: 9, color: _FA, fontFamily: '"JetBrains Mono",monospace' }}>FY 2025-26</span>}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {rows.map((row, ri) => (
                      <tr key={ri} style={{ borderBottom: `1px solid ${_BD}` }}>
                        <td style={{ padding: `${row.sub ? 6 : 9}px 0`, paddingLeft: row.sub ? 16 : 0, fontSize: row.sub ? 11 : 13, color: row.sub ? _MU : _INK, width: '36%' }}>{row.label}</td>
                        <td style={{ padding: '9px 12px', fontSize: 11, color: _FA, fontStyle: 'italic' }}>{row.basis}</td>
                        <td style={{ padding: '9px 0 9px 12px', textAlign: 'right', fontSize: row.sub ? 11 : 13, fontFamily: '"JetBrains Mono",monospace', color: row.sub ? _MU : _INK, whiteSpace: 'nowrap' }}>{cr(row.amount)}</td>
                        <td style={{ padding: '9px 0 9px 10px', textAlign: 'right', fontSize: 9, color: _G, fontFamily: '"JetBrains Mono",monospace', whiteSpace: 'nowrap', width: 76 }}>{row.ref}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} style={{ padding: '10px 0', fontSize: 11, fontWeight: 700, color: _MU, textTransform: 'uppercase', letterSpacing: '0.07em', borderTop: `1px solid ${_BD}` }}>Subtotal</td>
                      <td style={{ padding: '10px 0 10px 12px', textAlign: 'right', fontSize: 15, fontWeight: 700, fontFamily: '"JetBrains Mono",monospace', color: _INK, borderTop: `1px solid ${_BD}` }}>{cr(subtotal)}</td>
                      <td style={{ borderTop: `1px solid ${_BD}` }} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}

          {/* Grand Total */}
          <div style={{ borderTop: `2px solid ${_G}`, paddingTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: _INK }}>Grand Total</span>
              <span style={{ fontSize: 32, fontWeight: 800, fontFamily: '"JetBrains Mono",monospace', color: _G, letterSpacing: '-0.02em' }}>{cr(ps.grandTotal)}</span>
            </div>
            <div style={{ fontSize: 11, color: _FA, lineHeight: 1.6 }}>
              Rough estimate only. Fungible on rehab BUA ({n(result.fungibleRehabBua)} sqm) is premium-free and excluded above. Architect's Proforma-A is authoritative.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STYLES (scoped to .redev-app)
// ============================================================================
const Styles = () => (
  <style>{`
    .redev-app, .redev-app * { box-sizing: border-box; }
    .redev-app {
      height: 100%;
      display: flex;
      background: transparent;
      color: var(--ink);
      font-family: var(--sans);
      line-height: 1.5;
    }

    .redev-app .serif { font-family: var(--display); font-feature-settings: "liga","kern"; }
    .redev-app .num { font-family: var(--mono); font-feature-settings: "tnum"; }

    .redev-app input[type="text"],
    .redev-app input[type="number"],
    .redev-app select,
    .redev-app textarea {
      width: 100%;
      background: #FFFFFF;
      border: 1px solid #D7D2C7;
      color: #20242C;
      padding: 8px 11px;
      font-family: inherit;
      font-size: 13px;
      border-radius: 4px;
      outline: none;
      transition: border-color .12s;
    }
    .redev-app input::placeholder, .redev-app textarea::placeholder { color: #8D95A3; }
    .redev-app input:focus, .redev-app select:focus, .redev-app textarea:focus {
      border-color: #C9A96E;
      box-shadow: 0 0 0 2px rgba(201,169,110,0.14);
    }
    .redev-app input.num { font-family: "JetBrains Mono", monospace; }

    .redev-app select {
      cursor: pointer; appearance: none;
      background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%23C9A96E' stroke-width='1.5'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 32px;
    }
    .redev-app select option { background: #FFFFFF; color: #20242C; }

    .redev-app .field-label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #5F6775;
      margin-bottom: 6px;
    }
    .redev-app .help-text {
      font-size: 12px;
      color: #5F6775;
      margin-top: 5px;
      line-height: 1.6;
    }
    .redev-app .radio-card {
      padding: 12px 14px;
      border: 1px solid #D7D2C7;
      border-radius: 4px;
      cursor: pointer;
      background: #FFFFFF;
      transition: border-color .15s, background .15s;
      font-size: 13px;
    }
    .redev-app .radio-card:hover { border-color: #C9A96E; background: #FAF8F4; }
    .redev-app .radio-card.active { border-color: #C9A96E; background: rgba(201,169,110,0.06); }

    .redev-app .scenario-card {
      padding: 20px;
      border-radius: 4px;
      background: #FFFFFF;
      border: 1px solid #D7D2C7;
    }

    /* BUA split bar */
    .redev-app .bua-split-bar { height: 8px; overflow: hidden; display: flex; background: #E7E2D8; }
    .redev-app .bua-split-rehab { background: #C9A96E; transition: width .5s ease; }
    .redev-app .bua-split-sale  { background: #4A9C6E; transition: width .5s ease; }

    /* Phase stepper */
    .redev-app .phase-stepper { display: flex; align-items: center; margin-bottom: 20px; overflow-x: auto; }
    .redev-app .phase-dot { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; font-weight: 700; color: #FFFFFF; flex-shrink: 0; }
    .redev-app .phase-line { flex: 1; height: 1px; background: #D7D2C7; min-width: 20px; flex-shrink: 0; }

    /* Doc pill */
    .redev-app .doc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .redev-app .doc-pill {
      padding: 8px 10px;
      background: #FAF8F4;
      border-radius: 4px; font-size: 11px; line-height: 1.45;
      border-left: 2px solid #C9A96E;
      color: #20242C;
    }

    .redev-app tbody tr:hover td { background: rgba(201,169,110,0.04); }

    /* Details arrow rotation */
    .redev-app details summary { cursor: pointer; list-style: none; }
    .redev-app details summary::-webkit-details-marker { display: none; }
    .redev-app details summary .chevron { transition: transform .2s ease; }
    .redev-app details[open] summary .chevron { transform: rotate(180deg); }

    @keyframes redev-slide { from { opacity:0; transform: translateY(-6px); } to { opacity:1; transform: translateY(0); } }
    .redev-app details[open] > div { animation: redev-slide .18s ease-out; }

    @media print {
      .redev-app { background: white; color: #000; }
      .redev-app .no-print { display: none !important; }
    }
    @media (max-width: 980px) {
      .redev-app .grid-3col { grid-template-columns: 1fr !important; }
      .redev-app .grid-2 { grid-template-columns: 1fr !important; }
      .redev-app .doc-grid { grid-template-columns: 1fr !important; }
    }
    @media (max-width: 768px) {
      .redev-app table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; }
      .piq-grid-2 { grid-template-columns: 1fr !important; }
    }
  `}</style>
);

// ============================================================================
// GLOBAL RESPONSIVE STYLES
// ============================================================================
const GlobalStyles = () => (
  <style>{`
    /* ── Tool input panel ── */
    .piq-input-panel { display: flex !important; }
    .piq-mobile-workspace-nav {
      display: none;
      overflow-x: auto; -webkit-overflow-scrolling: touch;
      border-bottom: 1px solid #D7D2C7;
      gap: 0; flex-shrink: 0;
      scrollbar-width: none;
      background: #FFFFFF;
    }
    .piq-mobile-workspace-nav::-webkit-scrollbar { display: none; }
    .piq-mobile-workspace-nav button {
      padding: 11px 16px; font-size: 11px; font-weight: 500;
      background: none; border: none; border-bottom: 2px solid transparent;
      color: #8D95A3; cursor: pointer;
      font-family: inherit; white-space: nowrap; flex-shrink: 0;
      letter-spacing: 0.04em;
    }
    .piq-mobile-workspace-nav button.active {
      color: #C9A96E; border-bottom-color: #C9A96E;
    }

    /* Mobile input overlay — fullscreen sheet over the results area */
    .piq-mobile-input-overlay {
      display: none;
      position: absolute; inset: 0; z-index: 200;
    }
    /* Hide the Edit button in the mobile nav when on desktop */
    .piq-mobile-edit-btn { display: none !important; }

    @media (max-width: 768px) {
      .piq-input-panel { display: none !important; }
      .piq-topbar-stats { display: none !important; }
      .piq-mobile-workspace-nav { display: flex !important; }
      .piq-topbar-padding { padding-left: 8px !important; }
      .piq-content-area { padding: 16px 16px 48px !important; }
      .piq-mobile-edit-btn { display: flex !important; }
      .piq-mobile-input-overlay { display: block !important; }
    }

    @media (max-width: 480px) {
      .piq-lp-cta-row { flex-direction: column !important; align-items: flex-start !important; }
      .piq-topbar-new { font-size: 9px !important; padding: 5px 8px !important; }
      .piq-content-area { padding: 12px 12px 48px !important; }
      .piq-hero-num { font-size: 38px !important; }
    }
  `}</style>
);

// ============================================================================
// HEADER / INTRO / FOOTER / SHARED
// ============================================================================
const LandingPage = ({ onStart }) => {
  const gold = '#C9A96E';
  const bg = '#F5F4F0';
  const border = '#D7D2C7';
  const ink = '#20242C';
  const textMuted = '#5F6775';
  const textFaint = '#8D95A3';

  const navItems = [
    { id: 'capabilities', label: 'Capabilities' },
    { id: 'usecases',     label: 'Who It\'s For' },
    { id: 'pricing',      label: 'Access' },
  ];
  const mainRef = useRef(null);
  const [isDay, setIsDay] = useState(() => {
    const h = new Date().getHours();
    return h >= 6 && h < 19;
  });
  const [navScrolled, setNavScrolled] = useState(false);

  const scrollTo = (id) => {
    const el = document.getElementById(`lp-${id}`);
    if (el && mainRef.current) mainRef.current.scrollTo({ top: el.offsetTop - 56, behavior: 'smooth' });
  };

  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;
    const ids = ['capabilities', 'usecases', 'pricing'];
    const handleScroll = () => {
      setNavScrolled(mainEl.scrollTop > 60);
      for (let i = ids.length - 1; i >= 0; i--) {
        const el = document.getElementById(`lp-${ids[i]}`);
        if (el && el.offsetTop - 80 <= mainEl.scrollTop) {
          return;
        }
      }
    };
    mainEl.addEventListener('scroll', handleScroll);
    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, []);


  return (
    <div style={{
      position:'fixed',top:0,left:0,right:0,bottom:0,
      background:bg,overflowY:'auto',zIndex:1000,
      fontFamily:'"Source Sans 3",-apple-system,sans-serif',
    }} ref={mainRef}>
      <GlobalStyles />

      {/* ── TOP NAV ── */}
      <nav style={{
        position:'sticky',top:0,zIndex:100,height:56,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'0 48px',
        background: navScrolled ? 'rgba(245,244,240,0.96)' : 'transparent',
        backdropFilter: navScrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: navScrolled ? 'blur(20px)' : 'none',
        borderBottom: navScrolled ? `1px solid ${border}` : '1px solid transparent',
        transition:'background 0.3s ease, border-color 0.3s ease',
      }}>
        <div style={{fontSize:17,fontWeight:700,letterSpacing:'0.04em',color: navScrolled ? ink : '#FFFFFF'}}>
          PLOTI<span style={{color:gold}}>Q</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:32}}>
          {navItems.map(item=>(
            <button key={item.id} onClick={()=>scrollTo(item.id)} style={{
              background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',
              fontSize:14,fontWeight:500,letterSpacing:'0.04em',
              color: navScrolled ? textMuted : 'rgba(255,255,255,0.55)',
              transition:'color 0.2s',padding:'4px 0',
            }}>{item.label}</button>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>setIsDay(d=>!d)} style={{
            background:'none',border:'none',cursor:'pointer',fontSize:18,lineHeight:1,padding:4,
          }}>{isDay?'🌙':'☀️'}</button>
          <button onClick={onStart} style={{
            padding:'8px 22px',background:gold,color:'#FFFFFF',
            border:'none',borderRadius:4,
            fontSize:14,fontWeight:600,letterSpacing:'0.04em',
            cursor:'pointer',fontFamily:'inherit',
          }}>Run Assessment →</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{position:'relative',marginTop:-56,overflow:'hidden'}}>
        <img src="/day_bg.webp" alt="" aria-hidden="true" style={{
          position:'absolute',inset:0,width:'100%',height:'100%',
          objectFit:'cover',objectPosition:'center',
          opacity:isDay?1:0,transition:'opacity 2.4s ease-in-out',zIndex:0,
        }}/>
        <img src="/night_bg.webp" alt="" aria-hidden="true" style={{
          position:'absolute',inset:0,width:'100%',height:'100%',
          objectFit:'cover',objectPosition:'center',
          opacity:isDay?0:1,transition:'opacity 2.4s ease-in-out',zIndex:0,
        }}/>
        {/* Top — darkens sky behind nav */}
        <div style={{position:'absolute',inset:0,zIndex:1,pointerEvents:'none',
          background:'linear-gradient(to bottom, rgba(5,7,14,0.72) 0%, rgba(5,7,14,0.30) 28%, rgba(5,7,14,0.10) 50%, transparent 70%)',
        }}/>
        {/* Centre scrim — text legibility over bright skyline band */}
        <div style={{position:'absolute',inset:0,zIndex:1,pointerEvents:'none',
          background:'linear-gradient(to bottom, transparent 30%, rgba(5,7,14,0.52) 54%, rgba(5,7,14,0.70) 72%, rgba(5,7,14,0.82) 88%)',
        }}/>
        {/* Bottom fade to page bg */}
        <div style={{position:'absolute',inset:0,zIndex:1,pointerEvents:'none',
          background:`linear-gradient(to top, ${bg} 0%, rgba(245,244,240,0.70) 8%, transparent 22%)`,
        }}/>

        <div style={{position:'relative',zIndex:2,padding:'120px 72px 100px',maxWidth:920}}>
          <div style={{
            fontSize:12,letterSpacing:'0.22em',textTransform:'uppercase',
            color:'rgba(255,255,255,0.55)',marginBottom:32,fontWeight:400,
          }}>
            Mumbai · DCPR 2034 · <span style={{color:gold}}>Redevelopment Intelligence</span>
          </div>
          <h1 style={{
            margin:0,lineHeight:1.08,
            fontSize:'clamp(46px,5.2vw,76px)',
            fontWeight:600,letterSpacing:'-0.03em',color:'#FFFFFF',
            fontFamily:'"Source Serif 4",Georgia,serif',
            textShadow:'0 2px 40px rgba(0,0,0,0.5)',
          }}>
            Before You Sign Anything,<br/>
            Know What Your Property<br/>
            Is Actually Entitled To<span style={{color:gold}}>.</span>
          </h1>
          <p style={{
            marginTop:28,fontSize:17,lineHeight:1.85,
            color:'rgba(255,255,255,0.72)',maxWidth:560,fontWeight:300,
          }}>
            Every redevelopment begins with promises. But the regulations have already defined what is possible. PlotIQ converts DCPR 2034 into a clear redevelopment assessment — every calculation traceable to regulation, no assumptions, no guesswork.
          </p>
          <div style={{display:'flex',gap:14,marginTop:44,alignItems:'center'}}>
            <button onClick={onStart} style={{
              padding:'14px 32px',background:gold,color:'#FFFFFF',
              border:'none',borderRadius:4,
              fontSize:15,fontWeight:600,letterSpacing:'0.03em',
              cursor:'pointer',fontFamily:'inherit',
            }}>Run Assessment →</button>
            <button onClick={()=>scrollTo('capabilities')} style={{
              padding:'14px 22px',background:'transparent',
              border:'1px solid rgba(255,255,255,0.14)',
              color:'rgba(255,255,255,0.72)',borderRadius:4,
              fontSize:15,fontWeight:400,cursor:'pointer',fontFamily:'inherit',
            }}>See what it computes ↓</button>
          </div>
        </div>

        {/* Four questions strip */}
        <div style={{
          position:'relative',zIndex:2,
          display:'grid',gridTemplateColumns:'repeat(4,1fr)',
          borderTop:'1px solid rgba(255,255,255,0.07)',
          background:'rgba(16,18,26,0.76)',
          backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)',
        }}>
          {[
            {q:'How much can actually be built?',    a:'Permissible BUA, FSI, TDR and incentive area'},
            {q:'What is every member entitled to?',  a:'Rehabilitation obligations before negotiation begins'},
            {q:'Will a developer be interested?',    a:'Rehab-to-sale ratio before inviting proposals'},
            {q:'What will the project cost?',        a:'Premiums, statutory charges, regulatory liabilities'},
          ].map((item,i)=>(
            <div key={i} style={{
              padding:'24px 28px',
              borderRight:i<3?'1px solid rgba(255,255,255,0.07)':'none',
            }}>
              <div style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,0.80)',marginBottom:7,lineHeight:1.4}}>{item.q}</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.34)',lineHeight:1.55}}>{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── MANIFESTO ── */}
      <section style={{padding:'96px 72px',borderBottom:`1px solid ${border}`,background:bg}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:80,alignItems:'start'}}>
          <div>
            <h2 style={{
              margin:'0 0 28px',
              fontSize:'clamp(30px,2.8vw,42px)',fontWeight:600,
              letterSpacing:'-0.025em',color:ink,
              fontFamily:'"Source Serif 4",Georgia,serif',lineHeight:1.16,
            }}>
              Redevelopment is negotiated<br/>with numbers.<br/>
              <span style={{color:textMuted,fontWeight:400}}>Not opinions. Not brochures.</span>
            </h2>
            <p style={{fontSize:17,lineHeight:1.85,color:textMuted,fontWeight:300,margin:'0 0 32px'}}>
              The strongest position in any redevelopment discussion is knowing the regulatory reality before someone else explains it to you.
            </p>
            <button onClick={onStart} style={{
              padding:'12px 26px',background:'transparent',color:ink,
              border:`1px solid ${border}`,borderRadius:4,
              fontSize:15,fontWeight:500,cursor:'pointer',fontFamily:'inherit',
            }}>Open PlotIQ →</button>
          </div>
          <div>
            {[
              'Which redevelopment scheme applies to your property',
              'How much area is legally achievable under DCPR 2034',
              'How rehabilitation and sale area are distributed',
              'What government premiums and charges may apply',
              'Whether a proposal aligns with regulatory entitlement',
              'Where risks and negotiation gaps exist',
            ].map((pt,i)=>(
              <div key={i} style={{
                display:'flex',gap:18,alignItems:'flex-start',
                padding:'16px 0',borderBottom:`1px solid ${border}`,
              }}>
                <span style={{color:gold,fontSize:13,marginTop:2,flexShrink:0}}>✓</span>
                <span style={{fontSize:17,color:ink,lineHeight:1.55}}>{pt}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT PLOTIQ COMPUTES ── */}
      <section id="lp-capabilities" style={{padding:'96px 72px',borderBottom:`1px solid ${border}`,background:'#FFFFFF'}}>
        <div style={{marginBottom:56}}>
          <div style={{fontSize:12,letterSpacing:'0.18em',textTransform:'uppercase',color:gold,marginBottom:18,fontWeight:500}}>What PlotIQ computes</div>
          <h2 style={{
            margin:0,maxWidth:640,
            fontSize:'clamp(30px,2.8vw,42px)',fontWeight:600,
            letterSpacing:'-0.022em',color:ink,
            fontFamily:'"Source Serif 4",Georgia,serif',lineHeight:1.18,
          }}>
            Every number derived from the gazette.<br/>
            <span style={{fontWeight:400,color:textMuted}}>Not estimated.</span>
          </h2>
        </div>
        <div>
          {[
            {
              label:'Area Entitlement',
              text:'Compute permissible BUA under applicable redevelopment provisions — including incentive area, premium FSI, TDR loading and fungible compensatory area. Every figure cited to a specific regulation clause.',
            },
            {
              label:'Rehab vs. Sale Analysis',
              text:'See how redevelopment potential is allocated between society obligations and developer inventory. The number that ultimately determines whether a project gets built.',
            },
            {
              label:'Viability Assessment',
              text:'Understand whether a project creates sufficient commercial value to attract serious developer interest — before you invite a single proposal or sign a resolution.',
            },
            {
              label:'Premium Liability',
              text:'Estimate the full regulatory cost stack: Reg 30/31 premiums, fungible charges, open space deficiency, AutoDCR scrutiny fees, development charges. What the developer actually faces at IOD.',
            },
            {
              label:'Proposal Benchmarking',
              text:'Compare any redevelopment proposal against regulation-derived entitlement. See precisely where commitments fall short before you sign a Development Agreement.',
            },
          ].map((c,i)=>(
            <div key={i} style={{
              display:'grid',gridTemplateColumns:'210px 1fr',
              gap:48,padding:'24px 0',
              borderTop:`1px solid ${border}`,
            }}>
              <div style={{fontSize:16,fontWeight:700,color:ink,paddingTop:2}}>{c.label}</div>
              <div style={{fontSize:17,color:textMuted,lineHeight:1.78,fontWeight:300}}>{c.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHO IT'S FOR ── */}
      <section id="lp-usecases" style={{padding:'96px 72px',borderBottom:`1px solid ${border}`,background:bg}}>
        <div style={{marginBottom:56}}>
          <div style={{fontSize:12,letterSpacing:'0.18em',textTransform:'uppercase',color:gold,marginBottom:18,fontWeight:500}}>Who it's for</div>
          <h2 style={{
            margin:0,
            fontSize:'clamp(30px,2.8vw,42px)',fontWeight:600,
            letterSpacing:'-0.022em',color:ink,
            fontFamily:'"Source Serif 4",Georgia,serif',lineHeight:1.18,
          }}>
            Built for every stakeholder at the table.
          </h2>
        </div>
        <div>
          {[
            {
              audience:'Housing Societies',
              verdict:'Walk into redevelopment discussions knowing what your property is entitled to before anyone makes an offer.',
              body:'Understand member entitlement, project viability and key risks before signing resolutions, term sheets or agreements.',
            },
            {
              audience:'Architects & Technical Consultants',
              verdict:'Generate regulation-backed entitlement assessments and area statements without rebuilding calculations manually.',
              body:'33(7)(B), 33(7)(A), and 33(9) side by side. Every output traceable to a specific DCPR clause.',
            },
            {
              audience:'Developers',
              verdict:'Evaluate redevelopment opportunities and assess project attractiveness before allocating resources or pricing bids.',
              body:'Know exactly what the society is entitled to, what the sale component could be, and where the viability inflection points are.',
            },
            {
              audience:'Lenders & Investors',
              verdict:'Independently verify entitlement assumptions and regulatory constraints before capital is committed.',
              body:'A regulation-derived area statement to stress-test any proposal — viability ratio, premium liability, and GDV ceiling from the gazette, not the pitch deck.',
            },
          ].map((uc,i)=>(
            <div key={i} style={{
              display:'grid',gridTemplateColumns:'220px 1fr 1fr',
              gap:48,padding:'28px 0',
              borderTop:`1px solid ${border}`,
              alignItems:'start',
            }}>
              <div style={{fontSize:17,fontWeight:700,color:ink}}>{uc.audience}</div>
              <div style={{fontSize:16,fontWeight:500,color:ink,lineHeight:1.55}}>{uc.verdict}</div>
              <div style={{fontSize:16,color:textMuted,lineHeight:1.75,fontWeight:300}}>{uc.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY PLOTIQ EXISTS ── */}
      <section style={{padding:'96px 72px',borderBottom:`1px solid ${border}`,background:'#FFFFFF'}}>
        <div style={{maxWidth:700}}>
          <h2 style={{
            margin:'0 0 32px',
            fontSize:'clamp(30px,2.8vw,42px)',fontWeight:600,
            letterSpacing:'-0.025em',color:ink,
            fontFamily:'"Source Serif 4",Georgia,serif',lineHeight:1.16,
          }}>
            Why PlotIQ exists.
          </h2>
          <p style={{fontSize:18,lineHeight:1.88,color:textMuted,fontWeight:300,margin:'0 0 22px'}}>
            Mumbai redevelopment is often discussed before it is properly understood. The result is confusion — conflicting calculations, misaligned expectations, and decisions made without a clear view of entitlement, feasibility or cost.
          </p>
          <p style={{fontSize:18,lineHeight:1.88,color:textMuted,fontWeight:300,margin:'0 0 44px'}}>
            PlotIQ exists to make the regulatory reality visible before commitments are made. Because better redevelopment decisions begin with better information.
          </p>
          <p style={{fontSize:16,lineHeight:1.72,color:textFaint,fontStyle:'italic',fontWeight:300,margin:0,borderLeft:`2px solid ${border}`,paddingLeft:20}}>
            The most expensive mistakes in redevelopment happen before construction begins — when stakeholders commit before understanding the numbers.
          </p>
        </div>
      </section>

      {/* ── ACCESS ── */}
      <section id="lp-pricing" style={{padding:'96px 72px',background:bg}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:80,alignItems:'start'}}>
          <div>
            <div style={{fontSize:12,letterSpacing:'0.18em',textTransform:'uppercase',color:gold,marginBottom:18,fontWeight:500}}>Access</div>
            <h2 style={{
              margin:'0 0 22px',
              fontSize:'clamp(28px,2.6vw,40px)',fontWeight:600,
              letterSpacing:'-0.022em',color:ink,
              fontFamily:'"Source Serif 4",Georgia,serif',lineHeight:1.2,
            }}>
              Start with the assessment.
            </h2>
            <p style={{fontSize:17,color:textMuted,lineHeight:1.82,fontWeight:300,margin:0}}>
              Generate a redevelopment assessment for any eligible Mumbai property. Eligibility analysis, area entitlement, rehab vs. sale, viability indicators and premium liability estimates — at no cost.
            </p>
          </div>
          <div style={{borderTop:`2px solid ${border}`}}>
            {[
              {
                tier:'Assessment',
                price:'Free',
                desc:'Eligibility analysis · Area entitlement · Rehab vs. sale · Viability indicators · Premium liability estimates · Regulation references',
                cta:'Run Assessment →',
                action:onStart,
                primary:true,
              },
              {
                tier:'Professional Review',
                price:'By engagement',
                desc:'For projects requiring independent review, stamped feasibility, RFP preparation or stakeholder presentation support.',
                cta:'Contact Us →',
                action:()=>window.location.href='mailto:nik.tengle167@gmail.com?subject=PlotIQ%20Professional%20Engagement',
                primary:false,
              },
            ].map((t,i)=>(
              <div key={i} style={{
                display:'grid',gridTemplateColumns:'170px 1fr auto',
                gap:32,alignItems:'center',
                padding:'28px 0',
                borderBottom:`1px solid ${border}`,
              }}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:textMuted,marginBottom:6,letterSpacing:'0.02em',textTransform:'uppercase'}}>{t.tier}</div>
                  <div style={{fontSize:22,fontWeight:700,color: t.primary ? gold : ink,fontFamily:'"JetBrains Mono",monospace',letterSpacing:'-0.02em'}}>{t.price}</div>
                </div>
                <div style={{fontSize:16,color:textMuted,lineHeight:1.72,fontWeight:300}}>{t.desc}</div>
                <button onClick={t.action} style={{
                  padding:'11px 22px',whiteSpace:'nowrap',
                  background: t.primary ? gold : 'transparent',
                  color: t.primary ? '#FFFFFF' : textMuted,
                  border: t.primary ? 'none' : `1px solid ${border}`,
                  borderRadius:4,fontSize:14,fontWeight: t.primary ? 600 : 400,
                  cursor:'pointer',fontFamily:'inherit',
                }}>{t.cta}</button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{marginTop:80,paddingTop:32,borderTop:`1px solid ${border}`,display:'grid',gridTemplateColumns:'1fr auto',gap:40,alignItems:'end'}}>
          <div style={{fontSize:13,color:textFaint,lineHeight:1.78,maxWidth:700}}>
            <strong style={{color:textMuted}}>Disclaimer.</strong> PlotIQ provides preliminary redevelopment feasibility analysis derived from DCPR 2034 and related regulatory provisions. Outputs are informational and do not constitute statutory approval, architectural certification, legal advice or sanctioned development permission. Applicable government notifications, amendments and authority decisions shall prevail.
          </div>
          <div style={{textAlign:'right',flexShrink:0}}>
            <div style={{fontSize:15,fontWeight:700,letterSpacing:'0.04em',color:ink,marginBottom:6}}>PLOTI<span style={{color:gold}}>Q</span></div>
            <div style={{fontSize:13,color:textFaint,lineHeight:1.7}}>© 2026 · All rights reserved</div>
            <div style={{fontSize:13,color:textFaint}}>Powered by <a href="https://studios.kravon.in" target="_blank" rel="noopener noreferrer" style={{color:gold,textDecoration:'none'}}>KRAVON Studios</a></div>
          </div>
        </div>
      </section>

    </div>
  );
};
