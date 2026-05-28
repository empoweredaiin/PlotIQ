import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LayoutGrid, Map, Layers, TrendingUp, Target, FileText } from 'lucide-react';
import './styles/tokens.css';
import SiteIntelligencePage from './components/pages/SiteIntelligencePage';
import { computeBuildable } from './core/schemes';
import { analyseEligibility } from './core/validators/eligibility';
import { detectApplicableSchemes, pickPrimaryScheme } from './core/validators/schemes';
import { Footer, PrintBar } from './components/shared/primitives';
import SpecialLocationWarning from './components/shared/SpecialLocationWarning';
import SlumFlag from './components/shared/SlumFlag';
import SchemePicker from './components/shared/SchemePicker';
import EligibilityPanel from './components/shared/EligibilityPanel';
import WatchOutFor from './components/shared/WatchOutFor';
import SchemeComparison from './components/shared/SchemeComparison';
import CompareOffer from './components/shared/CompareOffer';
import PremiumRecoveryPanel from './components/shared/PremiumRecoveryPanel';
import ParkingPanel from './components/shared/ParkingPanel';
import InputPanel from './components/schemes/Reg33_7B/InputPanel';
import { InteractiveResult, AreaStatement, MemberEntitlement } from './components/schemes/Reg33_7B/Results';
import ClusterResult from './components/schemes/Reg33_9/Results';
import NextSteps from './components/pages/NextSteps';
import Explainers from './components/pages/Explainers';

const WORKSPACE_PAGES = [
  { id: 'overview', label: 'Overview', title: 'Site discovery & entitlement snapshot', description: 'A concise workspace for plot context, scheme selection and eligibility clarity.' },
  { id: 'intelligence', label: 'Spatial Intelligence', title: 'Parcel and location intelligence', description: 'Translate plot, ward and zoning context into clear site metrics and spatial insight.' },
  { id: 'regulations', label: 'Regulatory Intelligence', title: 'Applicable regulations and entitlement clarity', description: 'Show what the system understands: entitlement, constraints and scheme implications.' },
  { id: 'buildability', label: 'Buildability', title: 'Buildable envelope and spatial feasibility', description: 'Turn entitlement into buildability insight with an emphasis on what fits and why.' },
  { id: 'feasibility', label: 'Feasibility', title: 'Cost, parking and offer analysis', description: 'Translate regulatory outcomes into financial and parking feasibility for advisory review.' },
  { id: 'ai', label: 'Advisory Guide', title: 'Process guidance & regulatory explainers', description: 'Step-by-step redevelopment process guidance, document checklists, and plain-language regulatory explainers.' },
  { id: 'reports', label: 'Reports', title: 'Institutional reporting', description: 'Produce a review-ready advisory snapshot designed for committees, architects and lenders.' },
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
    devOfferRehab: 0,        // sqft carpet Ã¢â‚¬â€ what developer offers society members
    devOfferSale: 0,         // sqft carpet Ã¢â‚¬â€ what developer keeps as sale
    devOfferFileName: '',    // filename of uploaded offer doc (archival only)
    memberIncentiveShare: 80,
    // FSI loading sliders Ã¢â‚¬â€ fraction of permissible (0..1, default 1 = full)
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
  const [activeTab, setActiveTab] = useState('overview');
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
    if (activeTab === 'costs' && !showCostReport) {
      setActiveTab('overview');
    }
  }, [activeTab, showCostReport]);

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
      case 'intelligence':
        return (
          <SiteIntelligencePage input={input} wardDetect={wardDetect} result={result} />
        );
      case 'regulations':
        return (
          <>
            <SchemePicker
              schemes={schemes}
              activeSchemeId={activeSchemeId}
              primarySchemeId={primarySchemeId}
              onSelect={(id) => update('selectedScheme', id)}
              input={input}
              update={update}
            />
            <SpecialLocationWarning specialLocation={input.specialLocation} />
            {eligibility.issues.length > 0 && <EligibilityPanel eligibility={eligibility} input={input} />}
            {input.slumOnPlot && <SlumFlag />}
            <AreaStatement result={result} input={input} update={update} schemeId={activeSchemeId} />
          </>
        );
      case 'buildability':
        return (
          <>
            <InteractiveResult result={result} input={input} update={update} schemeId={activeSchemeId} />
            {result_33_7B && result_33_9 && <SchemeComparison r1={result_33_7B} r2={result_33_9} />}
            <WatchOutFor result={result} />
          </>
        );
      case 'feasibility':
        return (
          <>
            <CompareOffer result={result} input={input} update={update} />
            <PremiumRecoveryPanel result={result} input={input} />
            <ParkingPanel result={result} input={input} />
            {result.flatBreakdown && result.flatBreakdown.length > 0 ? (
              <MemberEntitlement breakdown={result.flatBreakdown} input={input} update={update} />
            ) : (
              <div style={{ padding: 28, border: '1px solid var(--border)', borderRadius: 10, background: '#13161D', color: 'var(--ink-soft)' }}>
                Switch to "By flat type" input mode to review member entitlement detail.
              </div>
            )}
          </>
        );
      case 'ai':
        return (
          <>
            <NextSteps />
            <Explainers />
          </>
        );
      case 'reports':
        return (
          <>
            <div style={{ marginBottom: 24, padding: 24, background: '#13161D', border: '1px solid var(--border)', borderRadius: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--rust)', marginBottom: 10 }}>Report workspace</div>
              <div style={{ color: 'var(--ink-soft)', lineHeight: 1.7 }}>
                This module is the final review artifact environment. Use it to print or save an institutional-grade advisory summary for committee review, architect validation and lender pre-check.
              </div>
            </div>
            <PrintBar />
          </>
        );
      default:
        return (
          <>
            <SchemePicker
              schemes={schemes}
              activeSchemeId={activeSchemeId}
              primarySchemeId={primarySchemeId}
              onSelect={(id) => update('selectedScheme', id)}
              input={input}
              update={update}
            />
            <SpecialLocationWarning specialLocation={input.specialLocation} />
            {eligibility.issues.length > 0 && <EligibilityPanel eligibility={eligibility} input={input} />}
            {input.slumOnPlot && <SlumFlag />}
            {activeSchemeId === 'reg33_9'
              ? <ClusterResult result={result} input={input} />
              : <>
                  <InteractiveResult result={result} input={input} update={update} schemeId={activeSchemeId} />
                  {result_33_7B && result_33_9 && <SchemeComparison r1={result_33_7B} r2={result_33_9} />}
                  <WatchOutFor result={result} />
                </>
            }
          </>
        );
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
    { id:'overview',     label:'Overview',               icon:<LayoutGrid size={15}/> },
    { id:'intelligence', label:'Site Intelligence',       icon:<Map size={15}/> },
    { id:'regulations',  label:'Regulatory Intelligence', icon:<Layers size={15}/> },
    { id:'buildability', label:'Buildability',            icon:<TrendingUp size={15}/> },
    { id:'feasibility',  label:'Feasibility',             icon:<Target size={15}/> },
    { id:'ai',           label:'Advisory Guide',           icon:<FileText size={15}/> },
    { id:'reports',      label:'Reports',                 icon:<FileText size={15}/> },
  ];
  return (
    <div style={{
      position:'fixed',inset:0,background:'#0D0F14',display:'flex',zIndex:1000,
      fontFamily:'"Source Sans 3",-apple-system,sans-serif',
    }}>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ SIDEBAR Ã¢â€â‚¬Ã¢â€â‚¬ */}
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
          }}>Ã¢â€ Â BACK</button>
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
              <div style={{fontSize:11.5,color:_muted}}>Fill in plot details Ã¢â€ â€™</div>
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
          <div style={{fontSize:11,color:_muted,lineHeight:1.5}}>DCPR 2034 Ã‚Â· Mumbai</div>
        </div>
      </aside>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ MAIN Ã¢â€â‚¬Ã¢â€â‚¬ */}
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

          <div style={{display:'flex',alignItems:'center',gap:18,flexShrink:0,paddingRight:28}}>
            {appTab==='results' && result.fsiSlab && (
              <div className="piq-topbar-stats" style={{display:'flex',gap:18}}>
                {[
                  {val:`${input.plotArea} mÃ‚Â²`,label:'Plot'},
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
          {/* Mobile workspace nav Ã¢â‚¬â€ shown only on small screens in Results tab */}
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
            /* Ã¢â€â‚¬Ã¢â€â‚¬ INPUT TAB Ã¢â‚¬â€ full-width form Ã¢â€â‚¬Ã¢â€â‚¬ */
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
                  }}>Calculate <span style={{fontSize:16,lineHeight:1}}>Ã¢â€ â€™</span></button>
                </div>
              </div>
            </main>
          ) : (
            /* Ã¢â€â‚¬Ã¢â€â‚¬ RESULTS TAB Ã¢â‚¬â€ workspace modules Ã¢â€â‚¬Ã¢â€â‚¬ */
            <main className="piq-results-tab" style={{flex:1,overflowY:'auto',padding:'24px 28px',display:'grid',gap:20,alignContent:'start'}}>
              <div style={{display:'flex',justifyContent:'flex-end'}}>
                <button onClick={()=>setAppTab('input')} style={{
                  padding:'6px 14px',background:'transparent',
                  border:`1px solid ${_border}`,borderRadius:4,
                  color:_muted,fontSize:10,fontWeight:600,letterSpacing:'0.07em',
                  cursor:'pointer',fontFamily:'inherit',textTransform:'uppercase',
                }}>Ã¢â€ Â Edit inputs</button>
              </div>
              {renderWorkspaceContent()}
              {workspacePage !== 'reports' && <PrintBar />}
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
    /* Ã¢â€â‚¬Ã¢â€â‚¬ Landing sidebar Ã¢â€â‚¬Ã¢â€â‚¬ */
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

    /* Ã¢â€â‚¬Ã¢â€â‚¬ Tool sidebar Ã¢â€â‚¬Ã¢â€â‚¬ */
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

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ SIDEBAR Ã¢â€â‚¬Ã¢â€â‚¬ */}
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
            Start Assessment Ã¢â€ â€™
          </button>
        </div>
      </aside>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ MAIN (scrollable) Ã¢â€â‚¬Ã¢â€â‚¬ */}
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
              {isDay ? 'Ã°Å¸Å’â„¢' : 'Ã¢Ëœâ‚¬Ã¯Â¸Â'}
            </button>
            <button onClick={onStart} style={{
              padding:'7px 14px',background:'rgba(201,169,110,0.07)',
              border:`1px solid rgba(201,169,110,0.18)`,borderRadius:4,color:gold,
              fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit',letterSpacing:'0.03em',
              transition:'background 0.5s ease',
            }}>Start Ã¢â€ â€™</button>
          </div>
        </div>

        {/* Day / Night toggle Ã¢â‚¬â€ desktop only */}
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
          {isDay ? 'Ã°Å¸Å’â„¢' : 'Ã¢Ëœâ‚¬Ã¯Â¸Â'}
        </button>

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ PLATFORM / HERO Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <section id="lp-platform" style={{height:'100vh',minHeight:600,position:'relative',overflow:'hidden'}}>

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ Background image layers Ã¢â€â‚¬Ã¢â€â‚¬ */}
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

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ Atmospheric overlays Ã¢â€â‚¬Ã¢â€â‚¬ */}
          {/* Top vignette Ã¢â‚¬â€ darkens sky behind nav */}
          <div style={{
            position:'absolute',inset:0,zIndex:1,pointerEvents:'none',
            background:'linear-gradient(to bottom, rgba(5,7,14,0.62) 0%, rgba(5,7,14,0.18) 28%, transparent 52%)',
          }}/>
          {/* Bottom fade Ã¢â‚¬â€ text legibility and section transition */}
          <div style={{
            position:'absolute',inset:0,zIndex:1,pointerEvents:'none',
            background:'linear-gradient(to top, rgba(10,12,20,0.96) 0%, rgba(10,12,20,0.65) 22%, rgba(10,12,20,0.15) 48%, transparent 68%)',
          }}/>
          {/* Subtle edge vignette */}
          <div style={{
            position:'absolute',inset:0,zIndex:1,pointerEvents:'none',
            background:'radial-gradient(ellipse 110% 100% at 50% 50%, transparent 42%, rgba(5,7,14,0.38) 100%)',
          }}/>
          {/* Gold warmth bloom Ã¢â‚¬â€ anchors content */}
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
                Start New Assessment Ã¢â€ â€™
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
                Explore Services Ã¢â€ â€™
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
              desc:'Map your plot\'s zoning, FSI envelope, road access, and surrounding land uses Ã¢â‚¬â€ derived from cadastral and regulatory data.',
              icon:<svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
            },
            {
              title:'Regulatory Intelligence',
              desc:'Navigate DCPR 2034, TDR entitlements, premium FSI, and development restrictions Ã¢â‚¬â€ with a cited rule reference for every output.',
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

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ ABOUT Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <section id="lp-about" className="piq-lp-section" style={{padding:'80px 60px',borderBottom:`1px solid ${border}`,background:'#0D0F14'}}>
          <div style={{maxWidth:820}}>
            <div style={{fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:gold,marginBottom:22,fontWeight:500,opacity:0.85}}>About PlotIQ</div>
            <h2 style={{margin:'0 0 28px',fontSize:'clamp(28px,3vw,44px)',fontWeight:600,letterSpacing:'-0.022em',color:'#fff',fontFamily:'"Source Serif 4",Georgia,serif',lineHeight:1.15}}>
              Mumbai's regulatory framework is complex by design.<br/>We make it legible.
            </h2>
            <p style={{fontSize:14,lineHeight:1.86,color:textMuted,maxWidth:600,margin:'0 0 52px',fontWeight:300}}>
              PlotIQ is a regulatory and spatial intelligence platform built specifically for Mumbai's Comprehensive Development Control and Promotion Regulations 2034. Every FSI slab, premium schedule, incentive BUA formula, and TDR rule is encoded directly from the gazette Ã¢â‚¬â€ so every output is traceable back to a specific regulation, not a consultant's estimate.
            </p>
            <div className="piq-about-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:1,background:border,border:`1px solid ${border}`,borderRadius:4,overflow:'hidden'}}>
              {[
                {val:'DCPR 2034',label:'Primary regulation encoded'},
                {val:'Reg 33(7)(B)',label:'Core redevelopment scheme'},
                {val:'33(7)(A) Ã‚Â· 33(9)',label:'Alternate schemes supported'},
              ].map((s,i)=>(
                <div key={i} style={{padding:'22px 24px',background:'#13161D'}}>
                  <div style={{fontSize:18,fontWeight:700,color:'#fff',fontFamily:'"JetBrains Mono",monospace',marginBottom:6,letterSpacing:'-0.02em'}}>{s.val}</div>
                  <div style={{fontSize:11,color:textMuted,textTransform:'uppercase',letterSpacing:'0.1em'}}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ SERVICES Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <section id="lp-services" className="piq-lp-section" style={{padding:'80px 60px',borderBottom:`1px solid ${border}`,background:'#0A0C11'}}>
          <div style={{fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:gold,marginBottom:22,fontWeight:500,opacity:0.85}}>What We Do</div>
          <h2 style={{margin:'0 0 14px',fontSize:'clamp(26px,2.8vw,40px)',fontWeight:600,letterSpacing:'-0.022em',color:'#fff',fontFamily:'"Source Serif 4",Georgia,serif',lineHeight:1.15}}>
            End-to-end support for society redevelopment.
          </h2>
          <p style={{fontSize:14,lineHeight:1.84,color:textMuted,maxWidth:560,margin:'0 0 52px',fontWeight:300}}>
            From the first committee discussion to Occupancy Certificate Ã¢â‚¬â€ we provide the intelligence, documents, and advisory support that turn regulatory complexity into a clear path forward.
          </p>
          <div style={{display:'grid',gap:3}}>
            {[
              {
                phase:'01',colour:'#5a7a4f',
                title:'Document Readiness Audit',
                summary:'Before you engage a developer or architect, we audit your property card, OC / CC status, approved plans, and structural reports Ã¢â‚¬â€ and produce a gap list of exactly what is missing and where to obtain it.',
                tags:['Property card & Index II','OC / CC confirmation','Approved plan status check','Structural audit guidance','RTI filing support'],
              },
              {
                phase:'02',colour:gold,
                title:'Regulatory Feasibility Report',
                summary:'We compute your FSI entitlement under DCPR 2034, produce a Proforma-A aligned area statement, and make explicit what carpet area every member is owed Ã¢â‚¬â€ before any developer conversation begins.',
                tags:['FSI under Reg 33(7)(B) / 33(7)(A) / 33(9)','Incentive BUA & premium FSI build-up','Rehab vs. sale split analysis','Scheme benchmarking','GB resolution scope guidance'],
              },
              {
                phase:'03',colour:'#3d5a4d',
                title:'RFP Preparation & Developer Evaluation',
                summary:'We write the RFP that goes to developers, define the offer evaluation matrix, and benchmark every incoming proposal against your regulatory floor Ã¢â‚¬â€ so no developer can mislead you on numbers.',
                tags:['Standardised RFP with feasibility floor','Offer comparison matrix','Developer RERA & KYC verification','Corpus / rent / carpet benchmarking','GBR 3 resolution support'],
              },
              {
                phase:'04',colour:'#4a3a8a',
                title:'Agreement Review & MCGM Filing Support',
                summary:'We review the Development Agreement against your feasibility numbers, flag deviations from regulation, and support your architect through the IOD / Development Permission filing.',
                tags:['DA clause review vs. Proforma-A','Premium payment verification','NOC checklist Ã¢â‚¬â€ Fire, AAI, Tree','MCGM submission tracking','IOD / DP milestone reporting'],
              },
              {
                phase:'05',colour:'rgba(255,255,255,0.3)',
                title:'Construction Monitoring & OC Verification',
                summary:'We track milestone payments, monitor DA compliance, and verify flat measurements against what was promised before members accept possession Ã¢â‚¬â€ the phase most societies hand off entirely.',
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

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ USE CASES Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <section id="lp-usecases" className="piq-lp-section" style={{padding:'80px 60px',borderBottom:`1px solid ${border}`,background:'#0D0F14'}}>
          <div style={{fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:gold,marginBottom:22,fontWeight:500,opacity:0.85}}>Who It's For</div>
          <h2 style={{margin:'0 0 52px',fontSize:'clamp(26px,2.8vw,40px)',fontWeight:600,letterSpacing:'-0.022em',color:'#fff',fontFamily:'"Source Serif 4",Georgia,serif',lineHeight:1.15}}>
            Built for every stakeholder in the redevelopment chain.
          </h2>
          <div className="piq-usecases-grid" style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16}}>
            {[
              {
                type:'Housing Societies',badge:'Primary',
                desc:'Understand your FSI entitlement and incentive BUA before you invite a single developer. Walk into every negotiation knowing the regulatory floor Ã¢â‚¬â€ not discovering it after you\'ve signed.',
                points:['Know what area each member is owed','Identify missing documents before they block you','Prepare a credible RFP, not just a conversation'],
              },
              {
                type:'Architects & PMCs',badge:'Professional',
                desc:'Generate FSI computations, area statements and scheme comparisons in minutes. PlotIQ handles the DCPR arithmetic Ã¢â‚¬â€ you focus on the design and the client relationship.',
                points:['Proforma-A aligned area statement output','33(7)(B) / 33(7)(A) / 33(9) side-by-side','Verify mode for cross-checking your own calcs'],
              },
              {
                type:'Developers & Builders',badge:'Developer',
                desc:'Underwrite acquisition bids with regulatory precision. Know exactly what the society is entitled to, what the sale component could be, and where the viability inflection points are before you make an offer.',
                points:['Maximum permissible BUA under DCPR 2034','Rehab-to-sale ratio and viability analysis','Premium FSI and TDR loading scenarios'],
              },
              {
                type:'Lenders & Investors',badge:'Finance',
                desc:'Validate FSI claims in developer proposals before committing capital. PlotIQ produces an independent area statement from the regulation Ã¢â‚¬â€ not from the developer\'s architect.',
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
                      <span style={{color:gold,fontSize:9,marginTop:4,flexShrink:0}}>Ã¢â€”â€ </span>
                      <span style={{fontSize:12,color:textMuted,lineHeight:1.5}}>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ PRICING Ã¢â€â‚¬Ã¢â€â‚¬ */}
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
                tier:'Professional',price:'Ã¢â€šÂ¹ 25,000',priceNote:'per engagement',highlight:true,ctaLabel:'Request Engagement',ctaAction:()=>window.location.href='mailto:nik.tengle167@gmail.com?subject=PlotIQ%20Professional%20Engagement&body=I%20would%20like%20to%20discuss%20a%20Professional%20engagement%20for%20my%20society.',
                desc:'Document readiness audit, stamped feasibility review, and a developer RFP prepared for your specific plot.',
                features:['Everything in Assessment','Document gap audit with source guide','RFP preparation (Proforma-A aligned)','Developer offer evaluation matrix','One review cycle with our team'],
              },
              {
                tier:'Advisory Retainer',price:'Ã¢â€šÂ¹ 75,000+',priceNote:'by scope',highlight:false,ctaLabel:'Schedule a Call',ctaAction:()=>window.location.href='mailto:nik.tengle167@gmail.com?subject=PlotIQ%20Advisory%20Retainer&body=I%20would%20like%20to%20discuss%20a%20full-cycle%20advisory%20retainer%20for%20my%20society.',
                desc:'Full-cycle advisory from GB resolution through MCGM filing Ã¢â‚¬â€ including DA review and construction milestone tracking.',
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
                      <span style={{color:t.highlight?gold:textMuted,fontSize:11,marginTop:2,flexShrink:0}}>Ã¢Å“â€œ</span>
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



