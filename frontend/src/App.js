import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LayoutGrid, BarChart2, Receipt, Download, Check, X, AlertTriangle, ChevronDown } from 'lucide-react';
import './styles/tokens.css';
import { computeBuildable } from './core/schemes';
import { analyseEligibility } from './core/validators/eligibility';
import { detectApplicableSchemes, pickPrimaryScheme, ALL_SCHEMES } from './core/validators/schemes';
import { Footer } from './components/shared/primitives';
import SpecialLocationWarning from './components/shared/SpecialLocationWarning';
import SlumFlag from './components/shared/SlumFlag';
import SchemePicker from './components/shared/SchemePicker';
import CompareOffer from './components/shared/CompareOffer';
import ParkingPanel from './components/shared/ParkingPanel';
import InputPanel from './components/schemes/Reg33_7B/InputPanel';
import { InteractiveResult, AreaStatement, MemberEntitlement } from './components/schemes/Reg33_7B/Results';
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

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [wardDetect, setWardDetect] = useState({ status: 'idle', ward: null, error: null });
  const [workspacePage, setWorkspacePage] = useState('overview');
  const [page, setPage] = useState('landing');

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
        return <OverviewTab result={result} input={input} update={update} eligibility={eligibility} schemes={schemes} activeSchemeId={activeSchemeId} primarySchemeId={primarySchemeId} wardDetect={wardDetect} onSchemeSelect={(id) => update('selectedScheme', id)} />;

      // ── TAB 2: AREA & FEASIBILITY ─────────────────────────────────────────────
      case 'area':
        return <AreaFeasibilityTab result={result} result_33_7B={result_33_7B} result_33_9={result_33_9} input={input} update={update} eligibility={eligibility} activeSchemeId={activeSchemeId} />;

      // ── TAB 3: COSTS ──────────────────────────────────────────────────────────
      case 'costs':
        return <CostsTab result={result} input={input} update={update} />;
    }
  };

  if (page === 'landing') {
    return <LandingPage onStart={() => setPage('tool')} />;
  }

  const _gold = '#C9A96E';
  const _border = 'rgba(255,255,255,0.07)';
  const _muted = 'rgba(255,255,255,0.45)';
  const _faint = 'rgba(255,255,255,0.22)';
  const workspaceNav = [
    { id:'overview', label:'Overview',          icon:<LayoutGrid size={15}/> },
    { id:'area',     label:'Area & Feasibility', icon:<BarChart2 size={15}/> },
    { id:'costs',    label:'Costs',              icon:<Receipt size={15}/> },
  ];

  return (
    <div style={{
      position:'fixed',inset:0,background:'#0E1118',display:'flex',zIndex:1000,
      fontFamily:'"Source Sans 3",-apple-system,sans-serif',
    }}>
      <Styles />
      <GlobalStyles />

      {/* ── INPUT PANEL (left) — lighter visual weight than content ── */}
      <aside className="piq-input-panel" style={{
        width:260,flexShrink:0,background:'#111520',
        borderRight:`1px solid rgba(255,255,255,0.06)`,
        display:'flex',flexDirection:'column',
        overflow:'hidden',
      }}>
        {/* Sidebar header */}
        <div style={{
          height:44,flexShrink:0,
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'0 16px',borderBottom:`1px solid rgba(255,255,255,0.06)`,
        }}>
          <div style={{fontSize:13,fontWeight:700,letterSpacing:'0.05em',color:'#EDF0F7'}}>
            PLOTI<span style={{color:_gold}}>Q</span>
          </div>
          <button onClick={()=>setPage('landing')} style={{
            background:'transparent',border:`1px solid rgba(255,255,255,0.08)`,borderRadius:3,
            color:'rgba(237,240,247,0.3)',fontSize:9,letterSpacing:'0.07em',padding:'3px 7px',
            cursor:'pointer',fontFamily:'inherit',
          }}>← BACK</button>
        </div>

        {/* Scrollable form */}
        <div style={{flex:1,overflowY:'auto',padding:'16px 14px 28px'}}>
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
      </aside>

      {/* ── RESULTS AREA (right) — dominant attention zone ── */}
      <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',overflow:'hidden'}}>

        {/* Topbar — 44px, minimal chrome */}
        <div className="piq-topbar-padding" style={{
          height:44,flexShrink:0,borderBottom:`1px solid rgba(255,255,255,0.06)`,
          display:'flex',alignItems:'center',gap:0,
          background:'#111520',
        }}>
          {/* Workspace nav tabs */}
          <div style={{display:'flex',height:'100%',paddingLeft:16}}>
            {workspaceNav.map(tab=>(
              <button key={tab.id} onClick={()=>setWorkspacePage(tab.id)} style={{
                display:'flex',alignItems:'center',gap:6,
                padding:'0 18px',fontSize:10,fontWeight:workspacePage===tab.id?700:400,
                background:'none',border:'none',
                borderBottom:workspacePage===tab.id?`2px solid ${_gold}`:'2px solid transparent',
                color:workspacePage===tab.id?'#EDF0F7':'rgba(237,240,247,0.38)',
                cursor:'pointer',fontFamily:'inherit',
                letterSpacing:'0.08em',textTransform:'uppercase',
              }}>
                <span style={{opacity:workspacePage===tab.id?0.9:0.35,display:'flex'}}>{tab.icon}</span>
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
                    <div style={{fontSize:11,fontWeight:700,color:'#EDF0F7',fontFamily:'"JetBrains Mono",monospace'}}>{item.val}</div>
                    <div style={{fontSize:8,color:'rgba(237,240,247,0.28)',textTransform:'uppercase',letterSpacing:'0.11em',marginTop:1}}>{item.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0,paddingRight:16}}>
            <button onClick={()=>window.print()} style={{
              display:'flex',alignItems:'center',gap:5,
              padding:'5px 10px',background:'transparent',
              border:`1px solid rgba(255,255,255,0.08)`,borderRadius:3,
              color:'rgba(237,240,247,0.38)',fontSize:10,fontWeight:600,letterSpacing:'0.06em',
              cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',
            }}><Download size={11}/>Export</button>
            <button onClick={()=>setPage('landing')} style={{
              padding:'5px 10px',background:'rgba(201,169,110,0.09)',
              border:`1px solid rgba(201,169,110,0.22)`,borderRadius:3,
              color:_gold,fontSize:10,fontWeight:700,letterSpacing:'0.07em',
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
        </div>

        {/* Content — single dominant scroll, tighter padding */}
        <div className="redev-app" style={{flex:1,minHeight:0,overflowY:'auto',padding:'20px 24px 32px',display:'block'}}>
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
const _BD = 'rgba(255,255,255,0.08)';         // border
const _MU = 'rgba(237,240,247,0.50)';         // muted text
const _FA = 'rgba(237,240,247,0.28)';         // faint label
const _SU = '#141720';                         // surface
const _INK = '#EDF0F7';                        // warm ivory

// KPI strip — full-bleed, no margin-bottom (callers add gap via parent grid)
function KpiStrip({ cells }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cells.length}, 1fr)`,
      borderBottom: `1px solid ${_BD}`,
      borderLeft: `1px solid ${_BD}`,
      background: _SU,
    }}>
      {cells.map((c, i) => (
        <div key={i} style={{
          padding: '14px 18px',
          borderRight: `1px solid ${_BD}`,
          borderTop: `1px solid ${_BD}`,
          background: c.bg || 'transparent',
        }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.labelColor || _FA, marginBottom: 5 }}>{c.label}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: c.color || _INK, lineHeight: 1, fontFamily: '"JetBrains Mono",monospace', letterSpacing: '-0.02em' }}>{c.value}</div>
          {c.sub && <div style={{ fontSize: 10, color: _MU, marginTop: 4 }}>{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}

// Section eyebrow — replaces the repeated inline pattern
function Eyebrow({ children }) {
  return <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: _FA, marginBottom: 8 }}>{children}</div>;
}

// Compact scheme selector — name + dropdown only, no cards
function CompactSchemePicker({ schemes, activeSchemeId, primarySchemeId, onSelect }) {
  const meta = ALL_SCHEMES.find(s => s.id === activeSchemeId);
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: _INK, marginBottom: 4 }}>{meta?.code}</div>
      <div style={{ fontSize: 11, color: _MU, marginBottom: 10, lineHeight: 1.4 }}>{meta?.short}</div>
      <select
        value={activeSchemeId}
        onChange={e => onSelect(e.target.value === primarySchemeId ? null : e.target.value)}
        style={{ width: '100%', background: '#1C2030', border: `1px solid ${_BD}`, color: _INK, padding: '6px 10px', fontSize: 11, borderRadius: 3, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
      >
        {ALL_SCHEMES.map(s => {
          const sched = schemes.find(x => x.id === s.id);
          const tag = s.id === primarySchemeId ? ' ★ rec' : sched?.eligible ? ' ✓' : ' ✗';
          return <option key={s.id} value={s.id}>{s.code}{tag}</option>;
        })}
      </select>
    </div>
  );
}

// ── TAB 1: OVERVIEW — "Can I redevelop?" ─────────────────────────────────────
function OverviewTab({ result, input, eligibility, schemes, activeSchemeId, primarySchemeId, wardDetect, onSchemeSelect, update }) {
  const r = result;
  const n    = (v) => v == null ? '—' : Math.round(v).toLocaleString('en-IN');
  const sqft = (v) => v == null ? '—' : Math.round(v * 10.764).toLocaleString('en-IN');

  const LOC  = { islandCity: 'Island City', suburbsExtended: 'Suburbs / Extended' };
  const AUTH = { oc: 'OC', cc: 'CC', tolerated: 'Tolerated', none: 'None' };

  const wardLabel  = wardDetect.ward || input.address || null;
  const rehabPct   = r.permissibleBua > 0 ? (r.memberSideRehabBua / r.permissibleBua) * 100 : 0;
  const salePct    = 100 - rehabPct;

  const VC = {
    marginal:            { color: '#d46060', bg: 'rgba(150,60,50,0.14)',   label: 'Marginal' },
    viable:              { color: _G,        bg: 'rgba(201,169,110,0.10)', label: 'Viable' },
    attractive:          { color: '#5aac80', bg: 'rgba(70,130,95,0.12)',   label: 'Attractive' },
    'highly attractive': { color: '#45d090', bg: 'rgba(60,160,100,0.15)',  label: 'Highly Attractive' },
  };
  const vc = VC[r.viabilityRating] || VC.marginal;

  const passCount = eligibility.passed.length;
  const warnCount = eligibility.issues.filter(i => i.level === 'warn').length;
  const failCount = eligibility.issues.filter(i => i.level === 'fail').length;
  const eligLabel = failCount > 0 ? `${failCount} Blocker${failCount > 1 ? 's' : ''}` : passCount > 0 ? 'Qualified' : '—';
  const eligColor = failCount > 0 ? '#d46060' : warnCount > 0 ? _G : '#5aac80';

  const SI = {
    pass: <Check size={13} color="#5aac80" />,
    warn: <AlertTriangle size={13} color={_G} />,
    fail: <X size={13} color="#d46060" />,
  };

  const ROWS = [
    { q: 'Building age',       s: input.buildingAge >= 30 ? 'pass' : 'fail', v: `${input.buildingAge} yr`, note: input.buildingAge >= 30 ? 'Meets ≥ 30 yr threshold' : 'Must be ≥ 30 yrs for 33(7)(B)' },
    { q: 'Authorisation',      s: ['oc','cc','tolerated'].includes(input.authorisationStatus) ? 'pass' : 'fail', v: AUTH[input.authorisationStatus], note: input.authorisationStatus === 'none' ? 'No OC/CC — incentive BUA at risk' : 'On record' },
    { q: 'Members on plot',    s: input.membersOnSamePlot ? 'pass' : 'fail', v: input.membersOnSamePlot ? 'Yes' : 'No', note: input.membersOnSamePlot ? 'Required condition met' : 'Required for 33(7)(B)' },
    { q: 'GB resolution',      s: input.gbResolution ? 'pass' : 'warn', v: input.gbResolution ? 'Passed' : 'Pending', note: input.gbResolution ? 'Ready to proceed' : 'Required before submission' },
    { q: 'Commercial viability', s: r.viabilityRating === 'marginal' ? 'warn' : r.viabilityRating ? 'pass' : 'warn', v: vc.label, note: r.viabilityNote },
    ...eligibility.issues.filter(i => i.level === 'fail').map(iss => ({ q: iss.title, s: 'fail', v: 'Blocker', note: iss.detail })),
  ];

  return (
    <div style={{ display: 'grid', gap: 0 }}>

      {/* ── KPI STRIP — 5 cells, full-width ── */}
      <KpiStrip cells={[
        { label: 'Permissible BUA', value: n(r.permissibleBua), sub: `sqm · ${sqft(r.permissibleBua)} sqft` },
        { label: 'Effective FSI',   value: r.effFsi?.toFixed(2) ?? '—', sub: r.schemeName },
        { label: 'Viability',       value: vc.label, sub: `Ratio ${r.viabilityRatio?.toFixed(2) ?? '—'}×`, color: vc.color, bg: vc.bg, labelColor: vc.color },
        { label: 'Scheme',          value: activeSchemeId === 'reg33_9' ? '33(9)' : activeSchemeId === 'reg33_7B' ? '33(7)(B)' : '30', sub: 'applicable regulation' },
        { label: 'Eligibility',     value: eligLabel, sub: `${passCount} passed · ${warnCount + failCount} flag${warnCount + failCount !== 1 ? 's' : ''}`, color: eligColor },
      ]} />

      {/* ── BUA SPLIT BAR — runs edge to edge below KPI strip ── */}
      <div style={{ background: _SU, borderBottom: `1px solid ${_BD}`, padding: '10px 18px 12px' }}>
        <div style={{ height: 5, overflow: 'hidden', display: 'flex', background: 'rgba(255,255,255,0.05)', marginBottom: 7 }}>
          <div style={{ width: `${rehabPct}%`, background: '#4a8c66', transition: 'width .5s ease' }} />
          <div style={{ width: `${salePct}%`, background: _G, transition: 'width .5s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: '#5aac80', fontFamily: '"JetBrains Mono",monospace' }}>Members {n(r.memberSideRehabBua)} sqm ({rehabPct.toFixed(0)}%)</span>
          <span style={{ color: _G, fontFamily: '"JetBrains Mono",monospace' }}>Developer {n(r.saleBua)} sqm ({salePct.toFixed(0)}%)</span>
        </div>
      </div>

      {/* ── TWO-COLUMN BODY: Scorecard (left) + Plot facts (right) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 0, borderBottom: `1px solid ${_BD}` }}>

        {/* LEFT — scorecard */}
        <div style={{ borderRight: `1px solid ${_BD}`, padding: '16px 18px 0' }}>
          <Eyebrow>Redevelopment Scorecard</Eyebrow>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${_BD}` }}>
                <th style={{ textAlign: 'left', padding: '6px 0', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _FA, width: '35%' }}>Check</th>
                <th style={{ width: 28 }}></th>
                <th style={{ textAlign: 'right', padding: '6px 0', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _FA, width: '20%' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _FA }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${_BD}`, background: row.s === 'fail' ? 'rgba(150,60,50,0.05)' : 'transparent' }}>
                  <td style={{ padding: '8px 0', fontSize: 12, color: _INK, fontWeight: 500 }}>{row.q}</td>
                  <td style={{ padding: '8px 0', textAlign: 'center' }}>{SI[row.s]}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontSize: 11, fontWeight: 700, fontFamily: '"JetBrains Mono",monospace', color: row.s === 'pass' ? _INK : row.s === 'warn' ? _G : '#d46060' }}>{row.v}</td>
                  <td style={{ padding: '8px 8px', fontSize: 11, color: _MU, lineHeight: 1.4, maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.note}>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RIGHT — plot parameters + scheme picker stacked */}
        <div style={{ padding: '16px 18px' }}>
          <Eyebrow>Plot Parameters</Eyebrow>
          {[
            { label: 'Gross Plot',    value: `${n(input.plotArea)} sqm` },
            { label: 'Net Plot',      value: `${n(r.netPlot)} sqm` },
            { label: 'Road Width',    value: `${input.roadWidth} m` },
            { label: 'Location',      value: LOC[input.location] },
            { label: wardLabel ? 'Ward' : 'Existing BUA', value: wardLabel || `${n(r.existingBua)} sqm` },
            { label: 'Base FSI',      value: r.fsiSlab?.basic?.toFixed(2) ?? '—' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderBottom: `1px solid ${_BD}` }}>
              <span style={{ fontSize: 11, color: _MU }}>{f.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: _INK, fontFamily: '"JetBrains Mono",monospace' }}>{f.value}</span>
            </div>
          ))}

          {/* Scheme — compact inline, no heavy card */}
          <div style={{ marginTop: 16 }}>
            <Eyebrow>Scheme</Eyebrow>
            <CompactSchemePicker schemes={schemes} activeSchemeId={activeSchemeId} primarySchemeId={primarySchemeId} onSelect={onSchemeSelect} />
          </div>
        </div>
      </div>

      {/* Warnings — only when needed, no extra space otherwise */}
      {input.specialLocation !== 'none' && <div style={{ padding: '0 0 0 0' }}><SpecialLocationWarning specialLocation={input.specialLocation} /></div>}
      {input.slumOnPlot && <SlumFlag />}
    </div>
  );
}

// ── TAB 2: AREA & FEASIBILITY — "How much can I build? What do I negotiate?" ─
function AreaFeasibilityTab({ result, result_33_7B, result_33_9, input, update, eligibility, activeSchemeId }) {
  const r = result;
  const n = (v) => v == null ? '—' : Math.round(v).toLocaleString('en-IN');
  const [openWatch, setOpenWatch] = useState(null);

  const WATCH = [
    { tag: 'Area claim',   title: 'Developer says "only 1.2× existing carpet"', body: `Under 33(7)(B) incentive BUA is minimum 15% of existing BUA or 10 sqm/flat — free of cost. Plus premium FSI and TDR up to Table 12 ceiling. A 1.2× offer is a negotiating position, not the regulation.` },
    { tag: 'TDR',         title: '"TDR unavailable" or "too expensive"', body: `TDR is actively traded in Mumbai. Ask the developer for the specific TDR market quote they used. Refusing to disclose is a red flag.` },
    { tag: 'Premium',     title: 'Developer asks society to pay any premium', body: `Incentive BUA under 33(7)(B) is free of premium. Premium on FSI goes to MCGM, paid by developer from sale proceeds. Any premium charged to society is non-standard.` },
    { tag: 'Transparency', title: "Offer made but no area statement shown", body: `A written area statement (existing BUA → incentive → FSI build-up → fungible → rehab/sale split) is standard practice. Refusal to provide it is itself a signal.` },
    { tag: 'Corpus',      title: 'Corpus quoted without showing the maths', body: `Corpus, rent and other payments are negotiated, not regulated. Compare at least 3 offers together — corpus + rent + carpet + finishing schedule.` },
    { tag: 'Double count', title: 'Prior FSI already claimed on this plot', body: `FSI/TDR previously claimed on a DP-road or reservation area cannot be claimed again. Ask your architect to verify against past sanctioned proposals on the property card.` },
    r.viabilityRatio < 0.4 ? { tag: 'Viability', title: 'Low sale:rehab — expect limited developer interest', body: `Options: (a) await higher FSI policy, (b) explore Reg 33(9) cluster, (c) verify 33(7)(A) applicability, (d) self-redevelopment via society loan.` } : null,
  ].filter(Boolean);

  return (
    <div style={{ display: 'grid', gap: 0 }}>

      {/* ── KPI STRIP ── */}
      <KpiStrip cells={[
        { label: 'Permissible BUA', value: n(r.permissibleBua), sub: 'sqm total' },
        { label: 'Sale BUA',        value: n(r.saleBua),            sub: 'sqm to developer' },
        { label: 'Rehab BUA',       value: n(r.memberSideRehabBua), sub: 'sqm to members', color: '#5aac80' },
        { label: 'Viability Ratio', value: r.viabilityRatio != null ? r.viabilityRatio.toFixed(2) + '×' : '—', sub: 'sale ÷ rehab' },
        { label: 'Net Plot',        value: n(r.netPlot), sub: 'sqm after deductions' },
      ]} />

      {/* ── 2-COL BODY: Area statement (left 60%) + Eligibility (right 40%) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', borderBottom: `1px solid ${_BD}` }}>

        {/* Area statement */}
        <div style={{ borderRight: `1px solid ${_BD}`, padding: '16px 18px' }}>
          <Eyebrow>Area Statement · FSI build-up</Eyebrow>
          <AreaStatement result={result} input={input} update={update} schemeId={activeSchemeId} readOnly={true} />
        </div>

        {/* Eligibility checklist — fills the right column completely */}
        <div style={{ padding: '16px 18px' }}>
          <Eyebrow>Eligibility · {activeSchemeId === 'reg33_9' ? 'Reg 33(9)' : activeSchemeId === 'reg33_7B' ? 'Reg 33(7)(B)' : 'Reg 30'}</Eyebrow>
          <div>
            {eligibility.passed.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: `1px solid ${_BD}` }}>
                <Check size={11} color="#5aac80" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ flex: 1, fontSize: 12, color: '#b8ddc8', lineHeight: 1.4 }}>{p.title}</span>
                <span style={{ fontSize: 8, color: '#5aac80', fontFamily: '"JetBrains Mono",monospace', flexShrink: 0, paddingTop: 2 }}>{p.ref}</span>
              </div>
            ))}
            {eligibility.issues.map((iss, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0 8px 8px', borderBottom: `1px solid ${_BD}`, borderLeft: `2px solid ${iss.level === 'fail' ? '#c05050' : _G}` }}>
                {iss.level === 'fail' ? <X size={11} color="#d46060" style={{ flexShrink: 0, marginTop: 2 }} /> : <AlertTriangle size={11} color={_G} style={{ flexShrink: 0, marginTop: 2 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: _INK, lineHeight: 1.3 }}>{iss.title}</div>
                  <div style={{ fontSize: 11, color: _MU, marginTop: 2, lineHeight: 1.4 }}>{iss.detail}</div>
                </div>
              </div>
            ))}
            {eligibility.passed.length === 0 && eligibility.issues.length === 0 && (
              <div style={{ padding: '10px 0', fontSize: 12, color: _MU }}>Fill in plot details to run eligibility checks.</div>
            )}
          </div>

          {/* Scheme comparison inline when available — no separate section needed */}
          {result_33_7B && result_33_9 && (
            <div style={{ marginTop: 20 }}>
              <Eyebrow>Scheme Comparison</Eyebrow>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${_BD}` }}>
                    <th style={{ padding: '5px 0', textAlign: 'left', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _FA }}>Metric</th>
                    <th style={{ padding: '5px 4px', textAlign: 'right', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _FA }}>33(7)(B)</th>
                    <th style={{ padding: '5px 0', textAlign: 'right', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _G }}>33(9)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Permissible BUA', v1: `${n(result_33_7B.permissibleBua)}`, v2: `${n(result_33_9.permissibleBua)}` },
                    { label: 'Rehab',           v1: `${n(result_33_7B.memberSideRehabBua)}`, v2: `${n(result_33_9.rehabBase)}` },
                    { label: 'Sale',            v1: `${n(result_33_7B.saleBua)}`, v2: `${n(result_33_9.saleBua)}` },
                    { label: 'Eff. FSI',        v1: result_33_7B.effFsi?.toFixed(2), v2: result_33_9.effFsi?.toFixed(2) },
                  ].map((row, i) => {
                    const cWins = i < 3 && result_33_9.permissibleBua > result_33_7B.permissibleBua;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${_BD}` }}>
                        <td style={{ padding: '6px 0', fontSize: 11, color: _MU }}>{row.label}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'right', fontSize: 11, color: _INK, fontFamily: '"JetBrains Mono",monospace' }}>{row.v1}</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontSize: 11, fontWeight: cWins ? 700 : 400, color: cWins ? _G : _INK, fontFamily: '"JetBrains Mono",monospace' }}>{row.v2}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── NEGOTIATION — offer compare + member entitlement (no sliders — those are on Costs tab) ── */}
      <div style={{ borderBottom: `1px solid ${_BD}`, padding: '16px 0' }}>
        <div style={{ padding: '0 18px 12px' }}><Eyebrow>Negotiation · Developer Offer vs Entitlement</Eyebrow></div>
        {activeSchemeId === 'reg33_9' && <ClusterResult result={result} input={input} />}
        <div style={{ marginTop: 0 }}><CompareOffer result={result} input={input} update={update} /></div>
        {result.flatBreakdown?.length > 0 && (
          <div style={{ marginTop: 16 }}><MemberEntitlement breakdown={result.flatBreakdown} input={input} update={update} /></div>
        )}
        <div style={{ marginTop: 16 }}><ParkingPanel result={result} input={input} /></div>
      </div>

      {/* ── DEVELOPER INTELLIGENCE — compact expandable table ── */}
      <div style={{ padding: '16px 0 0' }}>
        <div style={{ padding: '0 0 10px' }}><Eyebrow>Developer Intelligence · Red Flags</Eyebrow></div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${_BD}` }}>
              <th style={{ padding: '6px 0', textAlign: 'left', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _FA, width: 80 }}>Topic</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _FA }}>Watch for</th>
              <th style={{ width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {WATCH.map((item, i) => (
              <>
                <tr key={`r${i}`} style={{ borderBottom: openWatch === i ? 'none' : `1px solid ${_BD}`, background: openWatch === i ? 'rgba(201,169,110,0.04)' : 'transparent', cursor: 'pointer' }} onClick={() => setOpenWatch(openWatch === i ? null : i)}>
                  <td style={{ padding: '10px 0', verticalAlign: 'top' }}>
                    <span style={{ display: 'inline-block', padding: '2px 7px', background: 'rgba(201,169,110,0.09)', border: `1px solid rgba(201,169,110,0.20)`, borderRadius: 2, fontSize: 8, fontWeight: 700, color: _G, whiteSpace: 'nowrap' }}>{item.tag}</span>
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: 12, color: _INK, verticalAlign: 'top' }}>{item.title}</td>
                  <td style={{ padding: '10px 0', textAlign: 'center', verticalAlign: 'top' }}>
                    <ChevronDown size={11} color={_FA} style={{ transform: openWatch === i ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }} />
                  </td>
                </tr>
                {openWatch === i && (
                  <tr key={`d${i}`} style={{ borderBottom: `1px solid ${_BD}`, background: 'rgba(201,169,110,0.04)' }}>
                    <td />
                    <td colSpan={2} style={{ padding: '2px 8px 12px', fontSize: 12, color: _MU, lineHeight: 1.6 }}>{item.body}</td>
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

// ── TAB 3: COSTS — "What does it cost the developer?" ────────────────────────
function CostsTab({ result, input, update }) {
  const ps = result.premiumSheet;
  const cr = (v) => v == null ? '—' : `₹${Math.round(v).toLocaleString('en-IN')}`;
  const n  = (v) => v == null ? '—' : Math.round(v).toLocaleString('en-IN');
  const asrRate = parseFloat(input.asrLandRate) || 0;
  const cRate   = parseFloat(input.constructionRate) || 27500;

  const LEDGER_SECTIONS = ps ? [
    {
      group: 'Reg 30 / 31 — FSI Premiums',
      ref: '',
      rows: [
        { label: 'Premium FSI', basis: `${n(result.premiumFsiBuaLoaded)} sqm × ASR × 50%`, amount: ps.premiumFsiPayable, ref: 'Reg 30(A)(6)' },
        { label: 'Fungible — sale component', basis: `${n(result.fungibleSaleBua)} sqm × ASR × 50%`, amount: ps.fungiblePremium, ref: 'Reg 31(3)' },
        { label: '  → MCGM (50%)', basis: '', amount: ps.fungibleMCGM, ref: '', sub: true },
        { label: '  → State Govt (30%)', basis: '', amount: ps.fungibleGovt, ref: '', sub: true },
        { label: '  → MSRDC (20%)', basis: '', amount: ps.fungibleMSRDC, ref: '', sub: true },
        ...(ps.osdPremium > 0 ? [{ label: 'Open Space Deficiency', basis: `${n(result.rosDeficiency)} sqm × ASR × 25%`, amount: ps.osdPremium, ref: 'Reg 27' }] : []),
      ],
      subtotal: ps.totalPremium,
    },
    {
      group: 'AutoDCR — Statutory Processing Fees',
      ref: 'FY 2025-26',
      rows: [
        { label: 'Scrutiny Fee', basis: `${n(result.permissibleBua)} sqm × ₹70.7`, amount: ps.scrutinyFee, ref: 'AutoDCR' },
        { label: 'IOD Deposit', basis: `${n(result.permissibleBua)} sqm × ₹10.76/sqft`, amount: ps.iodDeposit, ref: 'AutoDCR' },
        { label: 'Debris Removal Deposit', basis: 'Min(BUA × ₹2/sqft, ₹45k cap)', amount: ps.debrisDeposit, ref: 'AutoDCR' },
        { label: 'Labour Welfare Cess', basis: `BUA × ₹${n(cRate)} × 1%`, amount: ps.labourWelfareCess, ref: 'BOCW Act' },
        { label: 'Development Charges — Land', basis: `Base FSI × plot × ASR × 1%`, amount: ps.devChargesLand, ref: 'MR&TP 124E' },
        { label: 'Development Charges — BUA', basis: `BUA × ASR × 4%`, amount: ps.devChargesBua, ref: 'MR&TP 124E' },
        { label: 'Layout Scrutiny Fee', basis: `${n(result.netPlot)} sqm × ₹11.13`, amount: ps.layoutScrutinyFee, ref: 'AutoDCR' },
        ...(ps.tdrScrutinyFee > 0 ? [
          { label: 'TDR Utilisation Scrutiny', basis: 'TDR BUA × ₹59', amount: ps.tdrScrutinyFee, ref: 'AutoDCR' },
          { label: 'TDR Infrastructure Charge', basis: `TDR BUA × ₹${n(cRate)} × 5%`, amount: ps.tdrInfraCharge, ref: 'Reg 32' },
        ] : []),
      ],
      subtotal: ps.totalAutoDCR,
    },
  ] : [];

  return (
    <div style={{ display: 'grid', gap: 0 }}>

      {/* ── KPI STRIP ── */}
      <KpiStrip cells={[
        { label: 'Grand Total',   value: ps ? cr(ps.grandTotal) : '—',      sub: asrRate === 0 ? 'Enter ASR to compute' : 'rough estimate', color: _G, labelColor: _G },
        { label: 'Reg Premiums',  value: ps ? cr(ps.totalPremium) : '—',   sub: 'Reg 30 / 31' },
        { label: 'AutoDCR Fees',  value: ps ? cr(ps.totalAutoDCR) : '—',  sub: 'FY 2025-26' },
        { label: 'ASR Land Rate', value: asrRate > 0 ? `₹${n(asrRate)}` : '—', sub: asrRate > 0 ? '₹/sqm — edit below' : 'not entered' },
      ]} />

      {/* ── RATE PARAMETERS — flush strip below KPI ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: `1px solid ${_BD}`, background: _SU }}>
        {[
          {
            label: 'ASR Land Rate (₹/sqm)',
            inp: <input type="number" value={input.asrLandRate} onChange={e => update('asrLandRate', parseFloat(e.target.value) || 0)}
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${_BD}`, color: _INK, padding: '3px 0', fontSize: 16, fontFamily: '"JetBrains Mono",monospace', outline: 'none' }} />,
          },
          {
            label: 'Construction Rate (₹/sqm BUA)',
            inp: <input type="number" value={input.constructionRate} onChange={e => update('constructionRate', parseFloat(e.target.value) || 0)}
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${_BD}`, color: _INK, padding: '3px 0', fontSize: 16, fontFamily: '"JetBrains Mono",monospace', outline: 'none' }} />,
          },
          {
            label: 'Active FSI loadings',
            disp: (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 2 }}>
                {[['Prem', input.premiumFsiLoad], ['TDR', input.tdrLoad], ['Fung', input.fungibleLoad]].map(([lbl, v]) => (
                  <span key={lbl} style={{ fontSize: 11, fontFamily: '"JetBrains Mono",monospace', color: (v ?? 1) === 1 ? _MU : _G }}>
                    {lbl} {((v ?? 1) * 100).toFixed(0)}%
                  </span>
                ))}
                <span style={{ fontSize: 9, color: _FA, alignSelf: 'flex-end' }}>adjust on Area tab</span>
              </div>
            ),
          },
        ].map((col, i) => (
          <div key={i} style={{ padding: '12px 18px', borderRight: i < 2 ? `1px solid ${_BD}` : 'none' }}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: _FA, marginBottom: 6 }}>{col.label}</div>
            {col.inp || col.disp}
          </div>
        ))}
      </div>

      {/* ── FSI LOADINGS — the controls that directly drive all costs below ── */}
      <div style={{ borderBottom: `1px solid ${_BD}`, padding: '14px 0 18px', marginBottom: 4 }}>
        <Eyebrow>FSI Loadings · Adjust to model scenarios — all costs update live</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
          {[
            { key: 'premiumFsiLoad', label: 'Premium FSI', available: result.premiumFsiBua, disabled: (result.premiumFsiBua ?? 0) === 0, disabledMsg: 'No premium FSI at this road width' },
            { key: 'tdrLoad',        label: 'TDR',         available: result.tdrBua,        disabled: (result.tdrBua ?? 0) === 0,        disabledMsg: 'No TDR loading at this road width' },
            { key: 'fungibleLoad',   label: 'Fungible',    available: (result.fsiBua ?? 0) * 0.35, disabled: false },
          ].map((ctrl, i) => {
            const val = input[ctrl.key] ?? 1;
            const loaded = (ctrl.available || 0) * val;
            return (
              <div key={ctrl.key} style={{ padding: '10px 18px', borderRight: i < 2 ? `1px solid ${_BD}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: _INK }}>{ctrl.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: '"JetBrains Mono",monospace', color: ctrl.disabled ? _FA : _G }}>{Math.round(val * 100)}%</span>
                </div>
                {ctrl.disabled ? (
                  <div style={{ fontSize: 10, color: _FA, fontStyle: 'italic', paddingTop: 4 }}>{ctrl.disabledMsg}</div>
                ) : (
                  <>
                    <input type="range" min="0" max="1" step="0.01" value={val}
                      onChange={e => update(ctrl.key, parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: _G, margin: '4px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: _MU, fontFamily: '"JetBrains Mono",monospace' }}>
                      <span>{Math.round(loaded).toLocaleString('en-IN')} sqm loaded</span>
                      <span>{Math.round(ctrl.available || 0).toLocaleString('en-IN')} max</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ padding: '10px 18px 0', display: 'flex', gap: 8 }}>
          <button onClick={() => { update('premiumFsiLoad', 1); update('tdrLoad', 1); update('fungibleLoad', 1); }}
            style={{ padding: '5px 12px', fontSize: 10, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: _INK, border: `1px solid ${_BD}`, borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit' }}>
            Reset to max
          </button>
          <button onClick={() => { update('premiumFsiLoad', 0); update('tdrLoad', 0); update('fungibleLoad', 1); }}
            style={{ padding: '5px 12px', fontSize: 10, fontWeight: 600, background: 'transparent', color: _G, border: `1px solid rgba(201,169,110,0.3)`, borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit' }}>
            Basic FSI only
          </button>
        </div>
      </div>

      {ps && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 28, alignItems: 'start', padding: '20px 0 0' }}>

          {/* LEFT — full ledger */}
          <div>
            {LEDGER_SECTIONS.map((section, si) => (
              <div key={si} style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${_BD}` }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _MU }}>{section.group}</span>
                  {section.ref && <span style={{ fontSize: 9, color: _FA, fontFamily: '"JetBrains Mono",monospace' }}>{section.ref}</span>}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {section.rows.map((row, ri) => (
                      <tr key={ri} style={{ borderBottom: `1px solid ${_BD}` }}>
                        <td style={{ padding: '9px 0', paddingLeft: row.sub ? 20 : 0, fontSize: row.sub ? 11.5 : 13, color: row.sub ? _MU : '#fff', width: '38%' }}>{row.label}</td>
                        <td style={{ padding: '9px 10px', fontSize: 11, color: _FA, fontStyle: 'italic' }}>{row.basis}</td>
                        <td style={{ padding: '9px 0 9px 10px', textAlign: 'right', fontSize: row.sub ? 11.5 : 13, fontFamily: '"JetBrains Mono",monospace', color: row.sub ? _MU : '#fff', whiteSpace: 'nowrap' }}>{cr(row.amount)}</td>
                        <td style={{ padding: '9px 0 9px 8px', textAlign: 'right', fontSize: 9, color: _G, fontFamily: '"JetBrains Mono",monospace', whiteSpace: 'nowrap', width: 80 }}>{row.ref}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: `1px solid ${_BD}` }}>
                      <td colSpan={2} style={{ padding: '10px 0', fontSize: 11, fontWeight: 700, color: _MU, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Subtotal</td>
                      <td style={{ padding: '10px 0 10px 10px', textAlign: 'right', fontSize: 14, fontWeight: 700, fontFamily: '"JetBrains Mono",monospace', color: '#fff' }}>{cr(section.subtotal)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}
          </div>

          {/* RIGHT — sticky total column */}
          <div style={{ position: 'sticky', top: 0 }}>
            <div style={{ borderLeft: `3px solid ${_G}`, paddingLeft: 20 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: _G, marginBottom: 16 }}>Total Payable</div>
              {[
                { label: 'Reg 30/31 Premiums', value: cr(ps.totalPremium) },
                { label: 'AutoDCR Fees',        value: cr(ps.totalAutoDCR) },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${_BD}` }}>
                  <span style={{ fontSize: 12, color: _MU }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: '"JetBrains Mono",monospace' }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', marginTop: 4, borderTop: `2px solid ${_G}` }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Grand Total</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: _G, fontFamily: '"JetBrains Mono",monospace' }}>{cr(ps.grandTotal)}</span>
              </div>
              <div style={{ fontSize: 10, color: _FA, lineHeight: 1.6, marginTop: 12 }}>
                Rough estimate. Fungible on rehab ({n(result.fungibleRehabBua)} sqm) is free per Reg 31(3). Architect's Proforma-A is authoritative.
              </div>
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
      background: #1C2030;
      border: 1px solid rgba(255,255,255,0.09);
      color: #EDF0F7;
      padding: 8px 11px;
      font-family: inherit;
      font-size: 13px;
      border-radius: 3px;
      outline: none;
      transition: border-color .12s;
    }
    .redev-app input::placeholder, .redev-app textarea::placeholder { color: rgba(237,240,247,0.22); }
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
    .redev-app select option { background: #1A1D26; color: #ffffff; }

    .redev-app .field-label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--ink-soft);
      margin-bottom: 8px;
    }
    .redev-app .help-text {
      font-size: 12px;
      color: var(--ink-soft);
      margin-top: 6px;
      line-height: 1.65;
      font-style: normal;
    }
    .redev-app .radio-card {
      padding: 14px 16px;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      cursor: pointer;
      background: #16191F;
      transition: border-color .16s, background .16s;
      font-size: 13px;
    }
    .redev-app .radio-card:hover { border-color: rgba(201,169,110,0.35); }
    .redev-app .radio-card.active { border-color: #C9A96E; background: rgba(201,169,110,0.06); }

    .redev-app .input-panel {
      background: transparent;
      border: none;
      padding: 0;
      box-shadow: none;
    }

    .redev-app .scenario-card {
      padding: 24px;
      border-radius: 8px;
      background: #13161D;
      border: 1px solid rgba(255,255,255,0.07);
    }

    /* Tab bar */
    .redev-app .tab-bar {
      display: flex; gap: 2px; margin-bottom: 28px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .redev-app .tab-btn {
      padding: 10px 16px; font-size: 11px; font-weight: 600;
      letter-spacing: 0.07em; text-transform: uppercase;
      border: none; background: none; cursor: pointer;
      color: rgba(255,255,255,0.3); border-bottom: 2px solid transparent;
      margin-bottom: -1px; transition: color .15s, border-color .15s;
      font-family: inherit;
    }
    .redev-app .tab-btn:hover { color: #C9A96E; }
    .redev-app .tab-btn.active { color: #C9A96E; border-bottom-color: #C9A96E; }

    /* Stat cards */
    .redev-app .stat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 20px; }
    .redev-app .stat-card {
      padding: 18px 20px;
      background: #13161D;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 8px;
    }
    .redev-app .stat-card-accent { border-top: 3px solid #C9A96E; }

    /* BUA split bar */
    .redev-app .bua-split-bar { height: 10px; border-radius: 6px; overflow: hidden; display: flex; background: rgba(255,255,255,0.06); }
    .redev-app .bua-split-rehab { background: #C9A96E; transition: width .5s ease; }
    .redev-app .bua-split-sale  { background: #4A8C66; transition: width .5s ease; }

    /* Phase stepper */
    .redev-app .phase-stepper { display: flex; align-items: center; margin-bottom: 20px; overflow-x: auto; }
    .redev-app .phase-dot { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; font-weight: 700; color: #0D0F14; flex-shrink: 0; }
    .redev-app .phase-line { flex: 1; height: 2px; background: rgba(255,255,255,0.07); min-width: 20px; flex-shrink: 0; }

    /* Doc pill */
    .redev-app .doc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .redev-app .doc-pill {
      padding: 8px 10px;
      background: #16191F;
      border-radius: 4px; font-size: 11px; line-height: 1.45;
      border-left: 2px solid rgba(201,169,110,0.3);
    }

    .redev-app .radio-card { transition: border-color .12s; }
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
      .redev-app .scenario-card { break-inside: avoid; border: 1px solid #999; background: white; }
      .redev-app .tab-bar { display: none; }
    }
    @media (max-width: 980px) {
      .redev-app .grid-3col { grid-template-columns: 1fr !important; }
      .redev-app .grid-2 { grid-template-columns: 1fr !important; }
      .redev-app .stat-grid { grid-template-columns: 1fr 1fr !important; }
      .redev-app .doc-grid { grid-template-columns: 1fr !important; }
    }
    @media (max-width: 600px) {
      .redev-app .stat-grid { grid-template-columns: 1fr !important; }
      .redev-app .tab-btn { padding: 8px 10px; font-size: 10px; }
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
    /* ── Landing sidebar ── */
    .piq-lp-sidebar { display: flex !important; }
    .piq-lp-sidebar nav > div:hover { background: rgba(255,255,255,0.025) !important; }
    .piq-feature-strip > div { transition: background 0.4s ease; }
    .piq-feature-strip > div:hover { background: rgba(255,255,255,0.018); }
    .piq-lp-mobile-nav {
      display: none;
      position: sticky; top: 0; z-index: 50;
      background: rgba(6,8,14,0.50);
      backdrop-filter: blur(32px);
      -webkit-backdrop-filter: blur(32px);
      border-bottom: 1px solid rgba(255,255,255,0.04);
      padding: 0 18px;
      height: 50px;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    /* ── Tool input panel ── */
    .piq-input-panel { display: flex !important; }
    .piq-mobile-workspace-nav {
      display: none;
      overflow-x: auto; -webkit-overflow-scrolling: touch;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      gap: 0; flex-shrink: 0;
      scrollbar-width: none;
    }
    .piq-mobile-workspace-nav::-webkit-scrollbar { display: none; }
    .piq-mobile-workspace-nav button {
      padding: 11px 16px; font-size: 11px; font-weight: 500;
      background: none; border: none; border-bottom: 2px solid transparent;
      color: rgba(255,255,255,0.45); cursor: pointer;
      font-family: inherit; white-space: nowrap; flex-shrink: 0;
      letter-spacing: 0.04em;
    }
    .piq-mobile-workspace-nav button.active {
      color: #C9A96E; border-bottom-color: #C9A96E;
    }

    @media (max-width: 768px) {
      /* Landing */
      .piq-lp-sidebar { display: none !important; }
      .piq-lp-mobile-nav { display: flex !important; }
      .piq-hero-toggle { display: none !important; }
      .piq-lp-main { padding-top: 0 !important; }
      .piq-hero-content { padding: 52px 20px 72px !important; }
      .piq-feature-strip { grid-template-columns: 1fr 1fr !important; }
      .piq-lp-section { padding: 48px 20px !important; }
      .piq-about-grid { grid-template-columns: 1fr !important; }
      .piq-usecases-grid { grid-template-columns: 1fr !important; }
      .piq-pricing-grid { grid-template-columns: 1fr !important; max-width: 100% !important; }
      .piq-services-card { grid-template-columns: 36px 1fr !important; }
      .piq-services-card .piq-phase-bar { padding: 12px 0 !important; font-size: 8px !important; }
      .piq-services-card-body { padding: 16px 16px !important; }

      /* Tool */
      .piq-input-panel { display: none !important; }
      .piq-topbar-stats { display: none !important; }
      .piq-mobile-workspace-nav { display: flex !important; }
      .piq-topbar-padding { padding-left: 8px !important; }
    }

    @media (max-width: 480px) {
      .piq-feature-strip { grid-template-columns: 1fr !important; }
      .piq-lp-cta-row { flex-direction: column !important; align-items: flex-start !important; }
      .piq-topbar-new { font-size: 9px !important; padding: 5px 8px !important; }
    }
  `}</style>
);

// ============================================================================
// HEADER / INTRO / FOOTER / SHARED
// ============================================================================
const LandingPage = ({ onStart }) => {
  const gold = '#C9A96E';
  const bg = '#0D0F14';
  const border = 'rgba(255,255,255,0.07)';
  const textMuted = 'rgba(255,255,255,0.38)';
  const textFaint = 'rgba(255,255,255,0.17)';

  const navItems = [
    { id: 'platform', label: 'Platform' },
    { id: 'about',    label: 'About' },
    { id: 'services', label: 'Services' },
    { id: 'usecases', label: 'Use Cases' },
    { id: 'pricing',  label: 'Pricing' },
  ];
  const [activeSection, setActiveSection] = useState('platform');
  const mainRef = useRef(null);
  const [isDay, setIsDay] = useState(() => {
    const h = new Date().getHours();
    return h >= 6 && h < 19;
  });

  const scrollTo = (id) => {
    setActiveSection(id);
    const el = document.getElementById(`lp-${id}`);
    if (el && mainRef.current) mainRef.current.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
  };

  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;
    const ids = ['platform', 'about', 'services', 'usecases', 'pricing'];
    const handleScroll = () => {
      for (let i = ids.length - 1; i >= 0; i--) {
        const el = document.getElementById(`lp-${ids[i]}`);
        if (el && el.offsetTop <= mainEl.scrollTop + 120) {
          setActiveSection(ids[i]);
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
      background:bg, display:'flex', zIndex:1000,
      fontFamily:'"Source Sans 3",-apple-system,sans-serif',
    }}>
      <GlobalStyles />

      {/* ── SIDEBAR ── */}
      <aside className="piq-lp-sidebar" style={{
        width:218, flexShrink:0,
        background:'rgba(6,8,14,0.48)',
        backdropFilter:'blur(34px)',
        WebkitBackdropFilter:'blur(34px)',
        borderRight:`1px solid rgba(255,255,255,0.04)`,
        display:'flex', flexDirection:'column',
        padding:'28px 0 20px',
        position:'relative', zIndex:50,
      }}>
        <div style={{padding:'0 22px 36px',fontSize:15,fontWeight:700,letterSpacing:'0.04em',color:'#fff'}}>
          PLOTI<span style={{color:gold}}>Q</span>
        </div>
        <nav style={{flex:1}}>
          {navItems.map(item => (
            <div key={item.id} onClick={() => scrollTo(item.id)} style={{
              display:'flex',alignItems:'center',
              padding:'11px 22px',
              borderLeft:activeSection===item.id?`2px solid ${gold}`:'2px solid transparent',
              background:activeSection===item.id?'rgba(201,169,110,0.06)':'transparent',
              color:activeSection===item.id?'#fff':textMuted,
              fontSize:13,fontWeight:activeSection===item.id?600:400,
              cursor:'pointer',
              transition:'color 0.3s ease,background 0.3s ease',
            }}>
              {item.label}
            </div>
          ))}
        </nav>
        <div style={{padding:'14px 22px 0',borderTop:`1px solid ${border}`}}>
          <button onClick={onStart} style={{
            width:'100%',padding:'10px 14px',
            background:'rgba(201,169,110,0.07)',
            border:`1px solid rgba(201,169,110,0.18)`,
            borderRadius:4,color:gold,
            fontSize:12,fontWeight:500,
            cursor:'pointer',fontFamily:'inherit',
            letterSpacing:'0.03em',
            transition:'background 0.5s ease, border-color 0.5s ease',
          }}>
            Start Assessment →
          </button>
        </div>
      </aside>

      {/* ── MAIN (scrollable) ── */}
      <main ref={mainRef} className="piq-lp-main" style={{
        flex:1,minWidth:0,
        overflowY:'auto',
        position:'relative',
        display:'flex',flexDirection:'column',
      }}>

        {/* Mobile top nav (hidden on desktop via CSS) */}
        <div className="piq-lp-mobile-nav">
          <div style={{fontSize:15,fontWeight:700,letterSpacing:'0.04em',color:'#fff'}}>
            PLOTI<span style={{color:gold}}>Q</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button
              onClick={() => setIsDay(d => !d)}
              title={isDay ? 'Switch to night' : 'Switch to day'}
              style={{
                width:32,height:32,borderRadius:'50%',
                background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.07)',
                backdropFilter:'blur(18px)',
                WebkitBackdropFilter:'blur(18px)',
                display:'flex',alignItems:'center',justifyContent:'center',
                cursor:'pointer',fontSize:14,lineHeight:1,
                transition:'background 0.4s ease',
              }}
            >
              {isDay ? '🌙' : '☀️'}
            </button>
            <button onClick={onStart} style={{
              padding:'7px 14px',background:'rgba(201,169,110,0.07)',
              border:`1px solid rgba(201,169,110,0.18)`,borderRadius:4,color:gold,
              fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.03em',
              transition:'background 0.5s ease',
            }}>Start →</button>
          </div>
        </div>

        {/* Day / Night toggle — desktop only */}
        <button
          className="piq-hero-toggle"
          onClick={() => setIsDay(d => !d)}
          title={isDay ? 'Switch to night' : 'Switch to day'}
          style={{
            position:'absolute',top:18,right:20,zIndex:20,
            width:38,height:38,borderRadius:'50%',
            background:'rgba(255,255,255,0.04)',
            border:'1px solid rgba(255,255,255,0.07)',
            backdropFilter:'blur(18px)',
            WebkitBackdropFilter:'blur(18px)',
            display:'flex',alignItems:'center',justifyContent:'center',
            cursor:'pointer',
            fontSize:15,lineHeight:1,
            transition:'background 0.4s ease, border-color 0.4s ease',
          }}
        >
          {isDay ? '🌙' : '☀️'}
        </button>

        {/* ── PLATFORM / HERO ── */}
        <section id="lp-platform" style={{height:'100vh',minHeight:600,position:'relative',overflow:'hidden'}}>

          {/* ── Background image layers ── */}
          <img
            src="/day_bg.webp"
            alt=""
            aria-hidden="true"
            className="animate-hero-zoom"
            style={{
              position:'absolute',inset:0,width:'100%',height:'100%',
              objectFit:'cover',objectPosition:'center',
              opacity: isDay ? 1 : 0,
              transition:'opacity 2.4s ease-in-out',
              zIndex:0,
            }}
          />
          <img
            src="/night_bg.webp"
            alt=""
            aria-hidden="true"
            className="animate-hero-zoom"
            style={{
              position:'absolute',inset:0,width:'100%',height:'100%',
              objectFit:'cover',objectPosition:'center',
              opacity: isDay ? 0 : 1,
              transition:'opacity 2.4s ease-in-out',
              zIndex:0,
            }}
          />

          {/* ── Atmospheric overlays ── */}
          {/* Top vignette — darkens sky behind nav */}
          <div style={{
            position:'absolute',inset:0,zIndex:1,pointerEvents:'none',
            background:'linear-gradient(to bottom, rgba(5,7,14,0.62) 0%, rgba(5,7,14,0.18) 28%, transparent 52%)',
          }}/>
          {/* Bottom fade — text legibility and section transition */}
          <div style={{
            position:'absolute',inset:0,zIndex:1,pointerEvents:'none',
            background:'linear-gradient(to top, rgba(10,12,20,0.96) 0%, rgba(10,12,20,0.65) 22%, rgba(10,12,20,0.15) 48%, transparent 68%)',
          }}/>
          {/* Subtle edge vignette */}
          <div style={{
            position:'absolute',inset:0,zIndex:1,pointerEvents:'none',
            background:'radial-gradient(ellipse 110% 100% at 50% 50%, transparent 42%, rgba(5,7,14,0.38) 100%)',
          }}/>
          {/* Gold warmth bloom — anchors content */}
          <div style={{
            position:'absolute',bottom:'12%',left:'4%',right:'55%',height:'40%',
            zIndex:1,pointerEvents:'none',
            background:'radial-gradient(ellipse at 30% 80%, rgba(201,169,110,0.06) 0%, transparent 70%)',
          }}/>

          {/* Hero text */}
          <div className="piq-hero-content" style={{position:'relative',zIndex:2,padding:'92px 52px 108px'}}>
            <div style={{
              display:'inline-flex',alignItems:'center',gap:4,
              fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',
              color:'rgba(255,255,255,0.30)',marginBottom:32,fontWeight:400,
            }}>
              <span style={{color:gold,borderBottom:`1px solid rgba(201,169,110,0.40)`,paddingBottom:'2px'}}>URBAN</span>
              {' '}DEVELOPMENT INTELLIGENCE
            </div>

            <h1 style={{
              margin:0,lineHeight:1.07,
              fontSize:'clamp(46px,5.2vw,78px)',
              fontWeight:600,letterSpacing:'-0.03em',color:'#FFFFFF',
              fontFamily:'"Source Serif 4",Georgia,serif',
              textShadow:'0 2px 36px rgba(0,0,0,0.62)',
            }}>
              Understand.<br/>
              Evaluate.<br/>
              Decide with Clarity<span style={{color:gold}}>.</span>
            </h1>

            <p style={{
              marginTop:28,fontSize:13.5,lineHeight:1.9,
              color:'rgba(255,255,255,0.34)',maxWidth:350,
              fontFamily:'"Source Sans 3",sans-serif',fontWeight:300,
            }}>
              PlotIQ transforms regulatory complexity, spatial intelligence and feasibility logic into structured assessments you can trust.
            </p>

            <div className="piq-lp-cta-row" style={{display:'flex',gap:14,marginTop:42,alignItems:'center'}}>
              <button onClick={onStart} style={{
                padding:'12px 26px',
                background:'rgba(201,169,110,0.09)',
                color:gold,
                border:`1px solid rgba(201,169,110,0.26)`,
                borderRadius:4,
                fontSize:13,fontWeight:500,
                cursor:'pointer',letterSpacing:'0.02em',
                display:'flex',alignItems:'center',gap:9,
                backdropFilter:'blur(10px)',
                WebkitBackdropFilter:'blur(10px)',
                transition:'background 0.5s ease, border-color 0.5s ease',
              }}>
                Start New Assessment →
              </button>
              <button onClick={() => scrollTo('services')} style={{
                padding:'12px 20px',
                background:'transparent',
                border:'1px solid rgba(255,255,255,0.07)',
                color:'rgba(255,255,255,0.42)',borderRadius:4,
                fontSize:13,fontWeight:400,
                cursor:'pointer',letterSpacing:'0.01em',
                display:'flex',alignItems:'center',gap:8,
                transition:'border-color 0.45s ease, color 0.45s ease',
              }}>
                Explore Services →
              </button>
            </div>
          </div>

        </section>

        {/* Feature strip */}
        <div className="piq-feature-strip" style={{
          display:'grid',gridTemplateColumns:'repeat(4,1fr)',
          background:'rgba(6,8,14,0.60)',
          backdropFilter:'blur(24px)',
          WebkitBackdropFilter:'blur(24px)',
          borderTop:'1px solid rgba(255,255,255,0.04)',
          borderBottom:'1px solid rgba(255,255,255,0.04)',
        }}>
          {[
            {
              title:'Spatial Intelligence',
              desc:'Map your plot\'s zoning, FSI envelope, road access, and surrounding land uses — derived from cadastral and regulatory data.',
              icon:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
            },
            {
              title:'Regulatory Intelligence',
              desc:'Navigate DCPR 2034, TDR entitlements, premium FSI, and development restrictions — with a cited rule reference for every output.',
              icon:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
            },
            {
              title:'Feasibility Intelligence',
              desc:'Model BUA, GDV, construction cost, and return across residential, commercial, and mixed-use configurations on any Mumbai plot.',
              icon:<svg width="18" height="18" fill="currentColor" stroke="none" viewBox="0 0 24 24"><rect x="17" y="3" width="4" height="18" rx="1"/><rect x="11" y="8" width="4" height="13" rx="1"/><rect x="5" y="13" width="4" height="8" rx="1"/></svg>,
            },
            {
              title:'Strategic Intelligence',
              desc:'Identify TDR loading opportunities, acquisition risk flags, and market signals to make confident development decisions.',
              icon:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
            },
          ].map((f,i)=>(
            <div key={f.title} style={{
              padding:'20px 22px',
              borderRight:i<3?`1px solid ${border}`:'none',
              display:'flex',gap:14,alignItems:'flex-start',
              cursor:'pointer',
            }}>
              <div style={{
                width:38,height:38,borderRadius:9,
                background:'rgba(201,169,110,0.07)',
                border:'1px solid rgba(201,169,110,0.14)',
                display:'flex',alignItems:'center',justifyContent:'center',
                color:gold,flexShrink:0,
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.82)',marginBottom:6,lineHeight:1.2}}>{f.title}</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.32)',lineHeight:1.68}}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── ABOUT ── */}
        <section id="lp-about" className="piq-lp-section" style={{padding:'80px 60px',borderBottom:`1px solid ${border}`,background:'#0D0F14'}}>
          <div style={{maxWidth:820}}>
            <div style={{fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:gold,marginBottom:22,fontWeight:500,opacity:0.85}}>About PlotIQ</div>
            <h2 style={{margin:'0 0 28px',fontSize:'clamp(28px,3vw,44px)',fontWeight:600,letterSpacing:'-0.022em',color:'#fff',fontFamily:'"Source Serif 4",Georgia,serif',lineHeight:1.15}}>
              Mumbai's regulatory framework is complex by design.<br/>We make it legible.
            </h2>
            <p style={{fontSize:14,lineHeight:1.86,color:textMuted,maxWidth:600,margin:'0 0 52px',fontWeight:300}}>
              PlotIQ is a regulatory and spatial intelligence platform built specifically for Mumbai's Comprehensive Development Control and Promotion Regulations 2034. Every FSI slab, premium schedule, incentive BUA formula, and TDR rule is encoded directly from the gazette — so every output is traceable back to a specific regulation, not a consultant's estimate.
            </p>
            <div className="piq-about-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:1,background:border,border:`1px solid ${border}`,borderRadius:4,overflow:'hidden'}}>
              {[
                {val:'DCPR 2034',label:'Primary regulation encoded'},
                {val:'Reg 33(7)(B)',label:'Core redevelopment scheme'},
                {val:'33(7)(A) · 33(9)',label:'Alternate schemes supported'},
              ].map((s,i)=>(
                <div key={i} style={{padding:'22px 24px',background:'#13161D'}}>
                  <div style={{fontSize:18,fontWeight:700,color:'#fff',fontFamily:'"JetBrains Mono",monospace',marginBottom:6,letterSpacing:'-0.02em'}}>{s.val}</div>
                  <div style={{fontSize:11,color:textMuted,textTransform:'uppercase',letterSpacing:'0.1em'}}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SERVICES ── */}
        <section id="lp-services" className="piq-lp-section" style={{padding:'80px 60px',borderBottom:`1px solid ${border}`,background:'#0A0C11'}}>
          <div style={{fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:gold,marginBottom:22,fontWeight:500,opacity:0.85}}>What We Do</div>
          <h2 style={{margin:'0 0 14px',fontSize:'clamp(26px,2.8vw,40px)',fontWeight:600,letterSpacing:'-0.022em',color:'#fff',fontFamily:'"Source Serif 4",Georgia,serif',lineHeight:1.15}}>
            End-to-end support for society redevelopment.
          </h2>
          <p style={{fontSize:14,lineHeight:1.84,color:textMuted,maxWidth:560,margin:'0 0 52px',fontWeight:300}}>
            From the first committee discussion to Occupancy Certificate — we provide the intelligence, documents, and advisory support that turn regulatory complexity into a clear path forward.
          </p>
          <div style={{display:'grid',gap:3}}>
            {[
              {
                phase:'01',colour:'#5a7a4f',
                title:'Document Readiness Audit',
                summary:'Before you engage a developer or architect, we audit your property card, OC / CC status, approved plans, and structural reports — and produce a gap list of exactly what is missing and where to obtain it.',
                tags:['Property card & Index II','OC / CC confirmation','Approved plan status check','Structural audit guidance','RTI filing support'],
              },
              {
                phase:'02',colour:gold,
                title:'Regulatory Feasibility Report',
                summary:'We compute your FSI entitlement under DCPR 2034, produce a Proforma-A aligned area statement, and make explicit what carpet area every member is owed — before any developer conversation begins.',
                tags:['FSI under Reg 33(7)(B) / 33(7)(A) / 33(9)','Incentive BUA & premium FSI build-up','Rehab vs. sale split analysis','Scheme benchmarking','GB resolution scope guidance'],
              },
              {
                phase:'03',colour:'#3d5a4d',
                title:'RFP Preparation & Developer Evaluation',
                summary:'We write the RFP that goes to developers, define the offer evaluation matrix, and benchmark every incoming proposal against your regulatory floor — so no developer can mislead you on numbers.',
                tags:['Standardised RFP with feasibility floor','Offer comparison matrix','Developer RERA & KYC verification','Corpus / rent / carpet benchmarking','GBR 3 resolution support'],
              },
              {
                phase:'04',colour:'#4a3a8a',
                title:'Agreement Review & MCGM Filing Support',
                summary:'We review the Development Agreement against your feasibility numbers, flag deviations from regulation, and support your architect through the IOD / Development Permission filing.',
                tags:['DA clause review vs. Proforma-A','Premium payment verification','NOC checklist — Fire, AAI, Tree','MCGM submission tracking','IOD / DP milestone reporting'],
              },
              {
                phase:'05',colour:'rgba(255,255,255,0.3)',
                title:'Construction Monitoring & OC Verification',
                summary:'We track milestone payments, monitor DA compliance, and verify flat measurements against what was promised before members accept possession — the phase most societies hand off entirely.',
                tags:['Transit rent standing instruction audit','Slab-by-slab progress reporting','Milestone vs. DA schedule','Flat measurement verification','OC & sinking fund handover checklist'],
              },
            ].map((s,i)=>(
              <div key={i} className="piq-services-card" style={{display:'grid',gridTemplateColumns:'52px 1fr',background:'#13161D',border:`1px solid ${border}`,borderRadius:4,overflow:'hidden'}}>
                <div className="piq-phase-bar" style={{background:s.colour,display:'grid',placeItems:'center',padding:'20px 0',writingMode:'vertical-rl',transform:'rotate(180deg)'}}>
                  <span style={{fontSize:9.5,fontWeight:700,letterSpacing:'0.16em',color:'rgba(255,255,255,0.9)',textTransform:'uppercase',whiteSpace:'nowrap'}}>Phase {s.phase}</span>
                </div>
                <div className="piq-services-card-body" style={{padding:'24px 28px'}}>
                  <div style={{fontSize:15,fontWeight:700,color:'#fff',marginBottom:8}}>{s.title}</div>
                  <div style={{fontSize:13,color:textMuted,lineHeight:1.7,marginBottom:16,maxWidth:660}}>{s.summary}</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
                    {s.tags.map((tag,j)=>(
                      <div key={j} style={{padding:'4px 10px',fontSize:11,background:'rgba(255,255,255,0.04)',border:`1px solid ${border}`,borderRadius:3,color:textMuted}}>{tag}</div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── USE CASES ── */}
        <section id="lp-usecases" className="piq-lp-section" style={{padding:'80px 60px',borderBottom:`1px solid ${border}`,background:'#0D0F14'}}>
          <div style={{fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:gold,marginBottom:22,fontWeight:500,opacity:0.85}}>Who It's For</div>
          <h2 style={{margin:'0 0 52px',fontSize:'clamp(26px,2.8vw,40px)',fontWeight:600,letterSpacing:'-0.022em',color:'#fff',fontFamily:'"Source Serif 4",Georgia,serif',lineHeight:1.15}}>
            Built for every stakeholder in the redevelopment chain.
          </h2>
          <div className="piq-usecases-grid" style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16}}>
            {[
              {
                type:'Housing Societies',badge:'Primary',
                desc:'Understand your FSI entitlement and incentive BUA before you invite a single developer. Walk into every negotiation knowing the regulatory floor — not discovering it after you\'ve signed.',
                points:['Know what area each member is owed','Identify missing documents before they block you','Prepare a credible RFP, not just a conversation'],
              },
              {
                type:'Architects & PMCs',badge:'Professional',
                desc:'Generate FSI computations, area statements and scheme comparisons in minutes. PlotIQ handles the DCPR arithmetic — you focus on the design and the client relationship.',
                points:['Proforma-A aligned area statement output','33(7)(B) / 33(7)(A) / 33(9) side-by-side','Verify mode for cross-checking your own calcs'],
              },
              {
                type:'Developers & Builders',badge:'Developer',
                desc:'Underwrite acquisition bids with regulatory precision. Know exactly what the society is entitled to, what the sale component could be, and where the viability inflection points are before you make an offer.',
                points:['Maximum permissible BUA under DCPR 2034','Rehab-to-sale ratio and viability analysis','Premium FSI and TDR loading scenarios'],
              },
              {
                type:'Lenders & Investors',badge:'Finance',
                desc:'Validate FSI claims in developer proposals before committing capital. PlotIQ produces an independent area statement from the regulation — not from the developer\'s architect.',
                points:['Independent FSI entitlement verification','Viability ratio and GDV benchmarking','Development timeline and risk flag summary'],
              },
            ].map((uc,i)=>(
              <div key={i} style={{padding:'28px 30px',background:'#13161D',border:`1px solid ${border}`,borderRadius:4}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:16}}>
                  <div style={{fontSize:16,fontWeight:700,color:'#fff'}}>{uc.type}</div>
                  <div style={{padding:'3px 8px',fontSize:9.5,letterSpacing:'0.12em',textTransform:'uppercase',background:'rgba(201,169,110,0.08)',border:'1px solid rgba(201,169,110,0.2)',borderRadius:3,color:gold,flexShrink:0}}>{uc.badge}</div>
                </div>
                <p style={{fontSize:13,color:textMuted,lineHeight:1.7,margin:'0 0 18px'}}>{uc.desc}</p>
                <div style={{display:'grid',gap:9}}>
                  {uc.points.map((pt,j)=>(
                    <div key={j} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                      <span style={{color:gold,fontSize:9,marginTop:4,flexShrink:0}}>◆</span>
                      <span style={{fontSize:12,color:textMuted,lineHeight:1.5}}>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="lp-pricing" className="piq-lp-section" style={{padding:'80px 60px',background:'#0A0C11'}}>
          <div style={{fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:gold,marginBottom:22,fontWeight:500,opacity:0.85}}>Access</div>
          <h2 style={{margin:'0 0 14px',fontSize:'clamp(26px,2.8vw,40px)',fontWeight:600,letterSpacing:'-0.022em',color:'#fff',fontFamily:'"Source Serif 4",Georgia,serif',lineHeight:1.15}}>
            Start with the calculation. Engage for the full picture.
          </h2>
          <p style={{fontSize:14,lineHeight:1.84,color:textMuted,maxWidth:500,margin:'0 0 56px',fontWeight:300}}>
            The assessment tool is free for all. Advisory retainers are by engagement.
          </p>
          <div className="piq-pricing-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,maxWidth:880}}>
            {[
              {
                tier:'Assessment',price:'Free',priceNote:null,highlight:false,ctaLabel:'Start Now',ctaAction:onStart,
                desc:'Run the full FSI computation, scheme comparison, and area statement for any Mumbai plot.',
                features:['Reg 33(7)(B) / 33(7)(A) / 33(9) computation','Area statement & rehab / sale split','Premium FSI and TDR scenarios','Developer negotiation flags','Printable advisory report'],
              },
              {
                tier:'Professional',price:'₹ 25,000',priceNote:'per engagement',highlight:true,ctaLabel:'Request Engagement',ctaAction:()=>window.location.href='mailto:nik.tengle167@gmail.com?subject=PlotIQ%20Professional%20Engagement&body=I%20would%20like%20to%20discuss%20a%20Professional%20engagement%20for%20my%20society.',
                desc:'Document readiness audit, stamped feasibility review, and a developer RFP prepared for your specific plot.',
                features:['Everything in Assessment','Document gap audit with source guide','RFP preparation (Proforma-A aligned)','Developer offer evaluation matrix','One review cycle with our team'],
              },
              {
                tier:'Advisory Retainer',price:'₹ 75,000+',priceNote:'by scope',highlight:false,ctaLabel:'Schedule a Call',ctaAction:()=>window.location.href='mailto:nik.tengle167@gmail.com?subject=PlotIQ%20Advisory%20Retainer&body=I%20would%20like%20to%20discuss%20a%20full-cycle%20advisory%20retainer%20for%20my%20society.',
                desc:'Full-cycle advisory from GB resolution through MCGM filing — including DA review and construction milestone tracking.',
                features:['Everything in Professional','GB resolution drafting support','DA clause-by-clause review','MCGM filing tracking','Construction milestone & OC checklist'],
              },
            ].map((t,i)=>(
              <div key={i} style={{padding:'28px 26px',background:t.highlight?'rgba(201,169,110,0.06)':'#13161D',border:t.highlight?`1px solid rgba(201,169,110,0.3)`:`1px solid ${border}`,borderRadius:4,display:'flex',flexDirection:'column'}}>
                <div style={{fontSize:10,letterSpacing:'0.14em',textTransform:'uppercase',color:t.highlight?gold:textFaint,marginBottom:12,fontWeight:600}}>{t.tier}</div>
                <div style={{fontSize:28,fontWeight:700,color:'#fff',fontFamily:'"Source Serif 4",serif',letterSpacing:'-0.02em',lineHeight:1,marginBottom:4}}>{t.price}</div>
                <div style={{fontSize:11,color:textFaint,marginBottom:t.priceNote?14:18,minHeight:16}}>{t.priceNote||''}</div>
                <p style={{fontSize:12.5,color:textMuted,lineHeight:1.65,margin:'0 0 20px',flex:1}}>{t.desc}</p>
                <div style={{display:'grid',gap:9,marginBottom:24}}>
                  {t.features.map((ft,j)=>(
                    <div key={j} style={{display:'flex',gap:9,alignItems:'flex-start'}}>
                      <span style={{color:t.highlight?gold:textMuted,fontSize:11,marginTop:2,flexShrink:0}}>✓</span>
                      <span style={{fontSize:12,color:textMuted,lineHeight:1.45}}>{ft}</span>
                    </div>
                  ))}
                </div>
                <button onClick={t.ctaAction} style={{width:'100%',padding:'11px',background:t.highlight?'rgba(201,169,110,0.80)':'rgba(255,255,255,0.04)',color:t.highlight?'#0D0F14':'rgba(255,255,255,0.58)',border:t.highlight?'none':`1px solid ${border}`,borderRadius:4,fontSize:13,fontWeight:t.highlight?600:500,cursor:'pointer',fontFamily:'inherit',transition:'background 0.45s ease, opacity 0.45s ease'}}>
                  {t.ctaLabel}
                </button>
              </div>
            ))}
          </div>
          <div style={{marginTop:80,paddingTop:32,borderTop:`1px solid ${border}`,fontSize:11,color:textFaint,lineHeight:1.7,maxWidth:760}}>
            <strong style={{color:textMuted}}>Disclaimer.</strong> PlotIQ provides preliminary feasibility analysis based on the Comprehensive DCPR 2034 (PEATA edition). Outputs are not sanctioned approvals. The original gazette notifications and any subsequent State / MCGM amendments shall prevail. This analysis does not replace a Licensed Architect's certified plan or legal advice.
          </div>
        </section>

      </main>
    </div>
  );
};
