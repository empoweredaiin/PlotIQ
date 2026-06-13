import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LayoutGrid, BarChart2, Receipt, Download, Check, X, AlertTriangle, ChevronDown } from 'lucide-react';
import './styles/tokens.css';
import { computeBuildable } from './core/schemes';
import { analyseEligibility } from './core/validators/eligibility';
import { detectApplicableSchemes, pickPrimaryScheme } from './core/validators/schemes';
import { Footer } from './components/shared/primitives';
import SchemeComparison from './components/shared/SchemeComparison';
import CompareOffer from './components/shared/CompareOffer';
import PremiumRecoveryPanel from './components/shared/PremiumRecoveryPanel';
import ParkingPanel from './components/shared/ParkingPanel';
import InputPanel from './components/schemes/Reg33_7B/InputPanel';
import { InteractiveResult, AreaStatement, MemberEntitlement } from './components/schemes/Reg33_7B/Results';
import ClusterResult from './components/schemes/Reg33_9/Results';

const WORKSPACE_PAGES = [
  { id: 'overview',     label: 'Overview',          title: 'Redevelopment position at a glance' },
  { id: 'area',         label: 'Area & Feasibility', title: 'Entitlement, scenarios & negotiation intelligence' },
  { id: 'costs',        label: 'Costs',              title: 'Government charges & premiums payable' },
];

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
  const [appTab, setAppTab] = useState('input');

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
  const showCostReport = input.reportScope !== 'entitlement';

  useEffect(() => {
    if (workspacePage === 'costs' && !showCostReport) {
      setWorkspacePage('overview');
    }
  }, [workspacePage, showCostReport]);

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

  const currentWorkspace = WORKSPACE_PAGES.find(p => p.id === workspacePage) || WORKSPACE_PAGES[0];

  const renderWorkspaceContent = () => {
    switch (workspacePage) {

      // ── TAB 1: OVERVIEW ──────────────────────────────────────────────────────
      case 'overview':
      default:
        return <OverviewTab result={result} input={input} update={update} eligibility={eligibility} schemes={schemes} activeSchemeId={activeSchemeId} primarySchemeId={primarySchemeId} wardDetect={wardDetect} />;

      // ── TAB 2: AREA & FEASIBILITY ─────────────────────────────────────────────
      case 'area':
        return <AreaFeasibilityTab result={result} result_33_7B={result_33_7B} result_33_9={result_33_9} input={input} update={update} eligibility={eligibility} activeSchemeId={activeSchemeId} />;

      // ── TAB 3: COSTS ──────────────────────────────────────────────────────────
      case 'costs':
        return <CostsTab result={result} input={input} />;
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
      position:'fixed',inset:0,background:'#0D0F14',display:'flex',zIndex:1000,
      fontFamily:'"Source Sans 3",-apple-system,sans-serif',
    }}>

      {/* ── SIDEBAR ── */}
      <aside className="piq-tool-sidebar" style={{
        width:218,flexShrink:0,background:'#0F1219',
        borderRight:`1px solid ${_border}`,
        display:'flex',flexDirection:'column',
        padding:'28px 0 20px',
      }}>
        <div style={{padding:'0 22px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:15,fontWeight:700,letterSpacing:'0.04em',color:'#fff'}}>
            PLOTI<span style={{color:_gold}}>Q</span>
          </div>
          <button onClick={()=>setPage('landing')} style={{
            background:'transparent',border:`1px solid ${_border}`,borderRadius:3,
            color:_faint,fontSize:9,letterSpacing:'0.08em',padding:'3px 6px',
            cursor:'pointer',fontFamily:'inherit',
          }}>← BACK</button>
        </div>

        <div style={{padding:'0 22px 14px',borderBottom:`1px solid ${_border}`,marginBottom:8}}>
          {input.societyName ? (
            <>
              <div style={{fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',color:_gold,marginBottom:4}}>ACTIVE ASSESSMENT</div>
              <div style={{fontSize:12,fontWeight:600,color:'#fff',lineHeight:1.3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{input.societyName}</div>
              {input.address && <div style={{fontSize:10.5,color:_faint,marginTop:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{input.address}</div>}
            </>
          ) : (
            <>
              <div style={{fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',color:_faint,marginBottom:4}}>NEW ASSESSMENT</div>
              <div style={{fontSize:11.5,color:_muted}}>Fill in plot details →</div>
            </>
          )}
        </div>

        <nav style={{flex:1}}>
          {workspaceNav.map(item=>(
            <div key={item.id} onClick={()=>setWorkspacePage(item.id)} style={{
              display:'flex',alignItems:'center',gap:11,
              padding:'10px 22px',
              borderLeft:workspacePage===item.id?`2px solid ${_gold}`:'2px solid transparent',
              background:workspacePage===item.id?'rgba(201,169,110,0.06)':'transparent',
              color:workspacePage===item.id?'#fff':_muted,
              fontSize:13,fontWeight:workspacePage===item.id?600:400,
              cursor:'pointer',
            }}>
              <span style={{opacity:workspacePage===item.id?1:0.65,display:'flex'}}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>

        <div style={{padding:'14px 22px 0',borderTop:`1px solid ${_border}`}}>
          <div style={{fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',color:_faint,marginBottom:4}}>PLOTIQ</div>
          <div style={{fontSize:11,color:_muted,lineHeight:1.5}}>DCPR 2034 · Mumbai</div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',overflow:'hidden'}}>

        {/* Topbar */}
        <div className="piq-topbar-padding" style={{
          height:50,flexShrink:0,borderBottom:`1px solid ${_border}`,
          display:'flex',alignItems:'center',padding:'0 0 0 28px',gap:0,
          background:'#0F1219',
        }}>
          {/* Tab buttons */}
          <div style={{display:'flex',height:'100%',marginRight:20}}>
            {[{id:'input',label:'Input'},{id:'results',label:'Results'}].map(tab=>(
              <button key={tab.id} onClick={()=>setAppTab(tab.id)} style={{
                padding:'0 22px',fontSize:11,fontWeight:appTab===tab.id?700:400,
                background:'none',border:'none',
                borderBottom:appTab===tab.id?`2px solid ${_gold}`:'2px solid transparent',
                color:appTab===tab.id?'#fff':_muted,
                cursor:'pointer',fontFamily:'inherit',
                letterSpacing:'0.07em',textTransform:'uppercase',
              }}>{tab.label}</button>
            ))}
          </div>

          <div style={{flex:1,minWidth:0}}>
            {appTab==='results' && (
              <div style={{fontSize:10.5,letterSpacing:'0.14em',textTransform:'uppercase',color:_faint,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                {currentWorkspace.title}
              </div>
            )}
          </div>

          <div style={{display:'flex',alignItems:'center',gap:12,flexShrink:0,paddingRight:28}}>
            {appTab==='results' && result.fsiSlab && (
              <div className="piq-topbar-stats" style={{display:'flex',gap:18}}>
                {[
                  {val:`${input.plotArea} m²`,label:'Plot'},
                  {val:result.fsiSlab.basic.toFixed(2),label:'Base FSI'},
                  result.fsiSlab.tdr>0 ? {val:result.fsiSlab.tdr.toFixed(2),label:'TDR'} : null,
                ].filter(Boolean).map(item=>(
                  <div key={item.label} style={{textAlign:'right'}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#fff',fontFamily:'"JetBrains Mono",monospace'}}>{item.val}</div>
                    <div style={{fontSize:9,color:_faint,textTransform:'uppercase',letterSpacing:'0.1em',marginTop:1}}>{item.label}</div>
                  </div>
                ))}
              </div>
            )}
            {appTab==='results' && (
              <button onClick={()=>window.print()} style={{
                display:'flex',alignItems:'center',gap:6,
                padding:'6px 12px',background:'transparent',
                border:`1px solid ${_border}`,borderRadius:4,
                color:_muted,fontSize:10,fontWeight:600,letterSpacing:'0.06em',
                cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',
              }}><Download size={12}/>Export</button>
            )}
            <button onClick={()=>setPage('landing')} style={{
              padding:'6px 12px',background:'rgba(201,169,110,0.08)',
              border:`1px solid rgba(201,169,110,0.2)`,borderRadius:4,
              color:_gold,fontSize:10,fontWeight:700,letterSpacing:'0.08em',
              cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',
            }}>+ NEW</button>
          </div>
        </div>

        {/* Content */}
        <div className="redev-app" style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <Styles />
          <GlobalStyles />
          {/* Mobile workspace nav — shown only on small screens in Results tab */}
          {appTab === 'results' && (
            <div className="piq-mobile-workspace-nav">
              {workspaceNav.map(item=>(
                <button key={item.id} onClick={()=>setWorkspacePage(item.id)}
                        className={workspacePage===item.id?'active':''}>
                  {item.label}
                </button>
              ))}
            </div>
          )}
          {/* Inner content row */}
          <div style={{flex:1,minHeight:0,display:'flex',overflow:'hidden'}}>

          {appTab === 'input' ? (
            /* ── INPUT TAB — full-width form ── */
            <main className="piq-input-tab-inner" style={{flex:1,overflowY:'auto',padding:'32px 40px',display:'flex',justifyContent:'center'}}>
              <div className="piq-input-col" style={{width:'100%',maxWidth:660}}>
                <InputPanel
                  input={input}
                  update={update}
                  updateFlat={updateFlat}
                  addFlat={addFlat}
                  removeFlat={removeFlat}
                  showAdvanced={showAdvanced}
                  setShowAdvanced={setShowAdvanced}
                  wardDetect={wardDetect}
                  setWardDetect={setWardDetect}
                />
                <div style={{marginTop:36,paddingTop:28,borderTop:`1px solid ${_border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{fontSize:11,color:_muted,lineHeight:1.5}}>
                    All inputs are saved automatically between tabs.
                  </div>
                  <button onClick={()=>setAppTab('results')} style={{
                    padding:'12px 32px',background:_gold,color:'#0D0F14',
                    border:'none',borderRadius:4,fontSize:13,fontWeight:700,
                    letterSpacing:'0.05em',cursor:'pointer',fontFamily:'inherit',
                    display:'flex',alignItems:'center',gap:8,
                  }}>Calculate <span style={{fontSize:16,lineHeight:1}}>→</span></button>
                </div>
              </div>
            </main>
          ) : (
            /* ── RESULTS TAB — workspace modules ── */
            <main className="piq-results-tab" style={{flex:1,overflowY:'auto',padding:'24px 28px',display:'grid',gap:20,alignContent:'start'}}>
              <div style={{display:'flex',justifyContent:'flex-end'}}>
                <button onClick={()=>setAppTab('input')} style={{
                  padding:'6px 14px',background:'transparent',
                  border:`1px solid ${_border}`,borderRadius:4,
                  color:_muted,fontSize:10,fontWeight:600,letterSpacing:'0.07em',
                  cursor:'pointer',fontFamily:'inherit',textTransform:'uppercase',
                }}>← Edit inputs</button>
              </div>
              {renderWorkspaceContent()}
              <Footer />
            </main>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB COMPONENTS
// ============================================================================

// ── helpers ──────────────────────────────────────────────────────────────────
const _G = '#C9A96E';
const _BD = 'rgba(255,255,255,0.07)';
const _MU = 'rgba(255,255,255,0.45)';
const _FA = 'rgba(255,255,255,0.22)';
const SURFACE  = '#191C24';   // slightly lifted card surface
const SURFACE2 = '#1E2130';   // hover/secondary surface

function KPI({ label, value, sub, accent, large }) {
  return (
    <div style={{
      padding: large ? '28px 24px' : '20px 20px',
      background: SURFACE,
      border: `1px solid ${accent ? accent : _BD}`,
      borderTop: accent ? `3px solid ${accent}` : `1px solid ${_BD}`,
      borderRadius: 8,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: accent || _MU, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: large ? 42 : 32, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em', fontFamily: '"JetBrains Mono",monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: _MU, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ label, eyebrow }) {
  return (
    <div style={{ marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${_BD}` }}>
      {eyebrow && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: _G, marginBottom: 4 }}>{eyebrow}</div>}
      <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{label}</div>
    </div>
  );
}

function MetaRow({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
      <span style={{ fontSize: 12.5, color: _MU }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: accent ? _G : '#fff', fontFamily: '"JetBrains Mono",monospace' }}>{value || '—'}</span>
    </div>
  );
}

function ViabilityBadge({ rating, ratio }) {
  const cfg = {
    marginal:         { bg: 'rgba(164,73,58,0.15)',  border: '#a4493a', color: '#e07060', label: 'Marginal' },
    viable:           { bg: 'rgba(201,169,110,0.12)', border: '#C9A96E', color: '#C9A96E', label: 'Viable' },
    attractive:       { bg: 'rgba(74,140,102,0.12)', border: '#4a8c66', color: '#5aac80', label: 'Attractive' },
    'highly attractive': { bg: 'rgba(74,140,102,0.18)', border: '#3d7a58', color: '#4fd490', label: 'Highly Attractive' },
  };
  const c = cfg[rating] || cfg['marginal'];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 20 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.color }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: c.color, letterSpacing: '0.06em' }}>{c.label}</span>
      {ratio > 0 && <span style={{ fontSize: 11, color: c.color, opacity: 0.7 }}>· {ratio.toFixed(2)}×</span>}
    </div>
  );
}

// ── TAB 1: OVERVIEW ──────────────────────────────────────────────────────────
function OverviewTab({ result, input, update, eligibility, schemes, activeSchemeId, primarySchemeId, wardDetect }) {
  const r = result;
  const fmt = (v) => v == null ? '—' : Math.round(v).toLocaleString('en-IN');
  const fmtSqft = (sqm) => sqm == null ? '—' : Math.round(sqm * 10.764).toLocaleString('en-IN');

  const LOCATION_LABELS = { islandCity: 'Island City', suburbsExtended: 'Suburbs / Extended Suburbs' };
  const ZONE_LABELS = { residential: 'Residential', commercial: 'Commercial', industrial: 'Industrial' };
  const AUTH_LABELS = { oc: 'OC Received', cc: 'CC Received', tolerated: 'Tolerated', none: 'Unauthorised' };

  const wardLabel = wardDetect.ward || (input.address ? input.address : null);
  const rehabPct = r.permissibleBua > 0 ? (r.memberSideRehabBua / r.permissibleBua) * 100 : 0;
  const salePct = 100 - rehabPct;

  return (
    <div style={{ display: 'grid', gap: 24 }}>

      {/* Section A — Executive Summary */}
      <div>
        <SectionHeader eyebrow="Executive Summary" label="Your redevelopment position" />

        {/* Hero KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <KPI large label="Permissible BUA" value={`${fmt(r.permissibleBua)} sqm`} sub={`${fmtSqft(r.permissibleBua)} sqft · FSI ${r.effFsi?.toFixed(2)}`} accent={_G} />
          <KPI label="Rehab → Members" value={`${fmt(r.memberSideRehabBua)} sqm`} sub={`${fmtSqft(r.memberSideRehabBua)} sqft · ${rehabPct.toFixed(0)}% of total`} accent="rgba(74,140,102,0.9)" />
          <KPI label="Sale → Developer" value={`${fmt(r.saleBua)} sqm`} sub={`${fmtSqft(r.saleBua)} sqft · ${salePct.toFixed(0)}% of total`} accent="rgba(201,169,110,0.6)" />
        </div>

        {/* BUA split bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: _MU, marginBottom: 6, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <span style={{ color: '#5aac80' }}>◼ Members ({rehabPct.toFixed(0)}%) · {fmt(r.memberSideRehabBua)} sqm</span>
            <span style={{ color: _G }}>◼ Developer ({salePct.toFixed(0)}%) · {fmt(r.saleBua)} sqm</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', background: 'rgba(255,255,255,0.06)' }}>
            <div style={{ width: `${rehabPct}%`, background: '#4a8c66', transition: 'width .5s ease' }} />
            <div style={{ width: `${salePct}%`, background: _G,       transition: 'width .5s ease' }} />
          </div>
        </div>

        {/* Scheme + Viability row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
          <div style={{ padding: '18px 20px', background: SURFACE, border: `1px solid ${_BD}`, borderRadius: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: _MU, marginBottom: 8 }}>Applicable Scheme</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{r.schemeName || activeSchemeId}</div>
            <div style={{ fontSize: 11.5, color: eligibility.eligible ? '#5aac80' : '#e07060', display: 'flex', alignItems: 'center', gap: 6 }}>
              {eligibility.eligible
                ? <><Check size={13} color="#5aac80" /> Eligible — all conditions met</>
                : <><X size={13} color="#e07060" /> {eligibility.issues.length} issue{eligibility.issues.length > 1 ? 's' : ''} to resolve</>}
            </div>
          </div>
          <div style={{ padding: '18px 20px', background: SURFACE, border: `1px solid ${_BD}`, borderRadius: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: _MU, marginBottom: 8 }}>Project Viability</div>
            <ViabilityBadge rating={r.viabilityRating} ratio={r.viabilityRatio} />
            <div style={{ fontSize: 11.5, color: _MU, marginTop: 10, lineHeight: 1.55 }}>{r.viabilityNote}</div>
          </div>
        </div>
      </div>

      {/* Section B — Site Intelligence */}
      <div>
        <SectionHeader eyebrow="Site Intelligence" label="Plot & location details" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ padding: '18px 20px', background: SURFACE, border: `1px solid ${_BD}`, borderRadius: 8 }}>
            <MetaRow label="Gross Plot Area" value={`${fmt(input.plotArea)} sqm`} />
            <MetaRow label="Net Plot Area (FSI)" value={`${fmt(r.netPlot)} sqm`} />
            <MetaRow label="Road Width" value={`${input.roadWidth} m`} />
            <MetaRow label="Location Belt" value={LOCATION_LABELS[input.location]} />
            <MetaRow label="Zone" value={ZONE_LABELS[input.zone]} />
          </div>
          <div style={{ padding: '18px 20px', background: SURFACE, border: `1px solid ${_BD}`, borderRadius: 8 }}>
            {wardLabel && <MetaRow label="Ward / Locality" value={wardLabel} accent />}
            <MetaRow label="Building Age" value={`${input.buildingAge} years`} />
            <MetaRow label="Authorisation" value={AUTH_LABELS[input.authorisationStatus]} />
            <MetaRow label="Existing BUA" value={`${fmt(r.existingBua)} sqm`} />
            <MetaRow label="Total Tenements" value={r.totalFlats ? `${r.totalFlats} flats` : null} />
          </div>
        </div>
      </div>

      {/* Section C — Key Findings */}
      <div>
        <SectionHeader eyebrow="Key Findings" label="What you need to know" />
        <div style={{ display: 'grid', gap: 8 }}>
          {eligibility.passed.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 16px', background: 'rgba(74,140,102,0.06)', border: '1px solid rgba(74,140,102,0.18)', borderRadius: 6 }}>
              <Check size={14} color="#5aac80" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, color: '#d0f0dc', fontWeight: 500 }}>{p.title}</span>
                <span style={{ fontSize: 10.5, color: '#5aac80', marginLeft: 8, opacity: 0.7 }}>[{p.ref}]</span>
              </div>
            </div>
          ))}
          {eligibility.issues.map((iss, i) => (
            <div key={i} style={{ padding: '12px 16px', background: iss.level === 'fail' ? 'rgba(164,73,58,0.08)' : 'rgba(201,169,110,0.06)', border: `1px solid ${iss.level === 'fail' ? 'rgba(164,73,58,0.3)' : 'rgba(201,169,110,0.25)'}`, borderLeft: `3px solid ${iss.level === 'fail' ? '#a4493a' : _G}`, borderRadius: 6 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {iss.level === 'fail'
                  ? <X size={14} color="#e07060" style={{ flexShrink: 0, marginTop: 2 }} />
                  : <AlertTriangle size={14} color={_G} style={{ flexShrink: 0, marginTop: 2 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{iss.title}</div>
                  <div style={{ fontSize: 12, color: _MU, lineHeight: 1.55 }}>{iss.detail}</div>
                  <div style={{ fontSize: 10, color: _G, marginTop: 6, fontFamily: '"JetBrains Mono",monospace' }}>[{iss.ref}]</div>
                </div>
              </div>
            </div>
          ))}
          {input.slumOnPlot && (
            <div style={{ padding: '12px 16px', background: 'rgba(164,73,58,0.08)', border: '1px solid rgba(164,73,58,0.3)', borderRadius: 6, fontSize: 13, color: '#e07060' }}>
              <AlertTriangle size={14} style={{ display: 'inline', marginRight: 8 }} />
              Slum presence detected on plot — MCGM clearance required before redevelopment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── TAB 2: AREA & FEASIBILITY ─────────────────────────────────────────────────
function AreaFeasibilityTab({ result, result_33_7B, result_33_9, input, update, eligibility, activeSchemeId }) {
  const [devSection, setDevSection] = useState(null);

  const WATCH_ITEMS = [
    { title: 'Developer claims you can only get "1.2× existing carpet"', body: `Under 33(7)(B), the incentive BUA is at minimum 15% of total existing BUA, OR 10 sqm per residential flat — that's free. Beyond that, premium FSI and TDR up to Table 12 ceiling apply. A flat 1.2× offer is their negotiation position, not the regulation.` },
    { title: 'Developer says "TDR is not available" or "TDR is too expensive"', body: `TDR is available and actively traded in Mumbai. Whether it makes sense depends on TDR market price vs. ASR rates. If a developer rules it out, ask for the TDR market quote they used.` },
    { title: 'Developer asks the society to pay any premium', body: `Under 33(7)(B), the incentive BUA portion is free of premium. Premium goes to MCGM, not the developer, and applies only to the Premium FSI portion. Standard practice: developer pays from sale-component proceeds. Any request for the society to pay is a major red flag.` },
    { title: "Developer offers area X but won't show the area statement", body: `Always ask for a written area statement showing: existing BUA, incentive BUA, FSI build-up, fungible, rehab to members, sale to developer. Reputable developers produce this routinely. Refusal to share is itself information.` },
    { title: 'Developer commits to corpus of ₹X lakhs without showing the maths', body: `Corpus, rent, and monetary payments are negotiated, not regulated by DCPR. Reasonable benchmarks come from comparable society redevs in your micro-market. Get at least 3 offers and compare corpus + rent + carpet + finishing schedule together.` },
    { title: 'Past FSI claims on the same plot (Reg 30(A)(2) Note 2)', body: `If FSI/TDR benefit was already claimed for any road/DP-road/reservation area in a prior development proposal, that area is still deducted now — you cannot double-claim it. Ask your architect to check past sanctioned proposals on the property card.` },
    result.viabilityRatio < 0.4 ? { title: 'No developer interest or all want money from society', body: `Your sale-to-rehab ratio is low — this is a real constraint. Options: (a) wait for higher FSI policy, (b) explore Reg 33(9) cluster with neighbouring societies, (c) check if 33(7)(A) applies, (d) consider self-redevelopment with a society loan.` } : null,
  ].filter(Boolean);

  return (
    <div style={{ display: 'grid', gap: 28 }}>

      {/* Section A — Eligibility Logic */}
      <div>
        <SectionHeader eyebrow="Section A — Eligibility" label="Why this scheme qualifies" />
        <div style={{ display: 'grid', gap: 8 }}>
          {eligibility.passed.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 14px', background: SURFACE, border: '1px solid rgba(74,140,102,0.2)', borderRadius: 6 }}>
              <Check size={13} color="#5aac80" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, fontSize: 13, color: '#d8f0e0' }}>
                {p.title}
                <span style={{ marginLeft: 8, fontSize: 10, color: '#5aac80', fontFamily: '"JetBrains Mono",monospace', opacity: 0.8 }}>[{p.ref}]</span>
              </div>
            </div>
          ))}
          {eligibility.issues.length === 0 && eligibility.passed.length === 0 && (
            <div style={{ padding: '14px 18px', background: SURFACE, border: `1px solid ${_BD}`, borderRadius: 6, color: _MU, fontSize: 13 }}>
              Fill in plot details in the Input tab to run eligibility checks.
            </div>
          )}
        </div>
      </div>

      {/* Section B — Area Statement */}
      <div>
        <SectionHeader eyebrow="Section B — Area Statement" label="Full FSI computation" />
        <AreaStatement result={result} input={input} update={update} schemeId={activeSchemeId} />
      </div>

      {/* Section C — Scenario Sliders (inside AreaStatement, but also offer scheme comparison) */}
      {result_33_7B && result_33_9 && (
        <div>
          <SectionHeader eyebrow="Section C — Scheme Comparison" label="33(7)(B) vs 33(9) cluster" />
          <SchemeComparison r1={result_33_7B} r2={result_33_9} />
        </div>
      )}

      {/* Section D — Buildability & Viability */}
      <div>
        <SectionHeader eyebrow="Section D — Buildability & Viability" label="Area allocation & developer attractiveness" />
        {activeSchemeId === 'reg33_9'
          ? <ClusterResult result={result} input={input} />
          : <InteractiveResult result={result} input={input} update={update} schemeId={activeSchemeId} />}

        {/* Developer offer comparison */}
        <div style={{ marginTop: 20 }}>
          <CompareOffer result={result} input={input} update={update} />
        </div>

        {/* Member entitlement */}
        {result.flatBreakdown && result.flatBreakdown.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <MemberEntitlement breakdown={result.flatBreakdown} input={input} update={update} />
          </div>
        )}

        {/* Parking */}
        <div style={{ marginTop: 20 }}>
          <ParkingPanel result={result} input={input} />
        </div>
      </div>

      {/* Section E — Developer Intelligence */}
      <div>
        <SectionHeader eyebrow="Section E — Developer Intelligence" label="What to watch for in developer conversations" />
        <div style={{ display: 'grid', gap: 8 }}>
          {WATCH_ITEMS.map((item, i) => (
            <div key={i} style={{ background: SURFACE, border: `1px solid ${_BD}`, borderRadius: 6, overflow: 'hidden' }}>
              <button
                onClick={() => setDevSection(devSection === i ? null : i)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                  <AlertTriangle size={15} color={_G} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: '#fff' }}>{item.title}</span>
                </div>
                <ChevronDown size={14} color={_FA} style={{ flexShrink: 0, transform: devSection === i ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              </button>
              {devSection === i && (
                <div style={{ padding: '0 16px 16px 44px', fontSize: 13, color: _MU, lineHeight: 1.65, borderTop: `1px solid ${_BD}`, paddingTop: 12 }}>
                  {item.body}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── TAB 3: COSTS ──────────────────────────────────────────────────────────────
function CostsTab({ result, input }) {
  const ps = result.premiumSheet;
  const { fmtCurrency, fmt } = (() => {
    const f = (v) => v == null ? '—' : `₹${Math.round(v).toLocaleString('en-IN')}`;
    const n = (v) => v == null ? '—' : Math.round(v).toLocaleString('en-IN');
    return { fmtCurrency: f, fmt: n };
  })();
  const asrRate = parseFloat(input.asrLandRate) || 0;

  if (!ps || asrRate === 0) {
    return (
      <div style={{ padding: '32px 28px', background: SURFACE, border: `1px solid ${_BD}`, borderRadius: 8, color: _MU, lineHeight: 1.7 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Enter ASR Land Rate to compute costs</div>
        Go to the <strong style={{ color: _G }}>Input</strong> tab → scroll to Financial Parameters → enter your ward's ASR Land Rate (₹/sqm).
      </div>
    );
  }

  const grandTotal = ps.grandTotal || 0;
  const totalPremium = ps.totalPremium || 0;
  const totalAutoDCR = ps.totalAutoDCR || 0;

  return (
    <div style={{ display: 'grid', gap: 24 }}>

      {/* Hero total */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <KPI large label="Total Government Payable" value={fmtCurrency(grandTotal)} sub="Rough estimate — architect recovery sheet is authoritative" accent={_G} />
        <KPI label="Reg 30/31 Premiums" value={fmtCurrency(totalPremium)} sub="Premium FSI + Fungible + OSD" accent="rgba(201,169,110,0.5)" />
        <KPI label="AutoDCR Statutory Fees" value={fmtCurrency(totalAutoDCR)} sub="Scrutiny, IOD, dev charges, labour cess, TDR infra" accent="rgba(255,255,255,0.2)" />
      </div>

      {/* Premium breakdown */}
      <div>
        <SectionHeader eyebrow="Premium Breakdown — Reg 30 / 31" label="FSI premiums payable to MCGM / Government" />
        <div style={{ background: SURFACE, border: `1px solid ${_BD}`, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: SURFACE2 }}>
                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _MU }}>Premium Head</th>
                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _MU }}>Basis</th>
                <th style={{ padding: '12px 18px', textAlign: 'right', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _MU }}>Amount</th>
                <th style={{ padding: '12px 18px', textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _MU }}>Ref</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Premium FSI', sub: `${fmt(result.premiumFsiBuaLoaded)} sqm × ASR × 50%`, value: ps.premiumFsiPayable, ref: 'Reg 30(A)(6)' },
                { label: 'Fungible Premium (sale component)', sub: `${fmt(result.fungibleSaleBua)} sqm × ASR × 50%`, value: ps.fungiblePremium, ref: 'Reg 31(3)' },
                { label: '  MCGM share (50%)', sub: '', value: ps.fungibleMCGM, ref: '', indent: true },
                { label: '  State Govt share (30%)', sub: '', value: ps.fungibleGovt, ref: '', indent: true },
                { label: '  MSRDC Sea Link share (20%)', sub: '', value: ps.fungibleMSRDC, ref: '', indent: true },
                ...(ps.osdPremium > 0 ? [{ label: 'Open Space Deficiency (OSD)', sub: `${fmt(result.rosDeficiency)} sqm × ASR × 25%`, value: ps.osdPremium, ref: 'Reg 27' }] : []),
                { label: 'Sub-total — Premiums', sub: '', value: ps.totalPremium, ref: '', bold: true },
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${_BD}`, background: row.bold ? 'rgba(201,169,110,0.07)' : 'transparent' }}>
                  <td style={{ padding: '10px 18px', paddingLeft: row.indent ? 36 : 18, fontWeight: row.bold ? 700 : row.indent ? 400 : 500, fontSize: row.indent ? 11.5 : 13, color: row.bold ? _G : row.indent ? _MU : '#fff' }}>{row.label}</td>
                  <td style={{ padding: '10px 18px', fontSize: 11, color: _MU, fontStyle: 'italic' }}>{row.sub}</td>
                  <td style={{ padding: '10px 18px', textAlign: 'right', fontWeight: row.bold ? 700 : 500, color: row.bold ? _G : '#fff', fontFamily: '"JetBrains Mono",monospace' }}>{fmtCurrency(row.value)}</td>
                  <td style={{ padding: '10px 18px', textAlign: 'center', fontSize: 10.5, color: _G, fontFamily: '"JetBrains Mono",monospace' }}>{row.ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AutoDCR fees */}
      <div>
        <SectionHeader eyebrow="Statutory Charges — AutoDCR" label="Government processing fees" />
        <div style={{ background: SURFACE, border: `1px solid ${_BD}`, borderRadius: 8, overflow: 'hidden' }}>
          <PremiumRecoveryPanel result={result} input={input} />
        </div>
      </div>

      <div style={{ padding: '12px 18px', background: 'rgba(201,169,110,0.05)', border: `1px solid rgba(201,169,110,0.18)`, borderRadius: 6, fontSize: 12, color: _MU, lineHeight: 1.6 }}>
        ASR rate used: ₹{fmt(asrRate)}/sqm · Construction rate: ₹{fmt(parseFloat(input.constructionRate) || 27500)}/sqm (SDRR).
        These are rough estimates only — your architect's Proforma-A recovery sheet will be authoritative.
        Fungible on rehab portion is <strong style={{ color: '#fff' }}>free of premium</strong> per Reg 31(3).
      </div>
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
      line-height: 1.55;
    }

    .redev-app .serif { font-family: var(--display); font-feature-settings: "liga","kern"; }
    .redev-app .num { font-family: var(--mono); font-feature-settings: "tnum"; }

    .redev-app input[type="text"],
    .redev-app input[type="number"],
    .redev-app select,
    .redev-app textarea {
      width: 100%;
      background: #1A1D26;
      border: 1px solid rgba(255,255,255,0.1);
      color: #ffffff;
      padding: 9px 12px;
      font-family: inherit;
      font-size: 14px;
      border-radius: 3px;
      outline: none;
      transition: border-color .12s;
    }
    .redev-app input::placeholder, .redev-app textarea::placeholder { color: rgba(255,255,255,0.25); }
    .redev-app input:focus, .redev-app select:focus, .redev-app textarea:focus {
      border-color: #C9A96E;
      box-shadow: 0 0 0 3px rgba(201,169,110,0.12);
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

    /* ── Tool sidebar ── */
    .piq-tool-sidebar { display: flex !important; }
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
      .piq-tool-sidebar { display: none !important; }
      .piq-topbar-stats { display: none !important; }
      .piq-mobile-workspace-nav { display: flex !important; }
      .piq-topbar-padding { padding-left: 12px !important; }
      .piq-input-tab-inner { padding: 20px 16px !important; }
      .piq-input-col { max-width: 100% !important; }
      .piq-results-tab { padding: 16px !important; }
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
