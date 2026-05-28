import { useState, useCallback } from 'react';
import { MapPin, Eye, EyeOff, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { WARD_INFO } from '../../../datasets/geography/ward-info';
import { detectWardFromCoords, parseGoogleMapsPlace, parseGoogleMapsCoords } from '../../../datasets/geography/ward-detection';
import { Section, Radio, Toggle } from '../../shared/primitives';

export default function InputPanel({ input, update, updateFlat, addFlat, removeFlat, showAdvanced, setShowAdvanced, wardDetect, setWardDetect }) {
  const [gmLink, setGmLink] = useState('');
  const [showSpecialConditions, setShowSpecialConditions] = useState(input.mixedTenancy || input.slumOnPlot);
  const showCostReport = input.reportScope !== 'entitlement';

  const handleDetect = useCallback(async () => {
    const url = gmLink.trim();
    if (!url) return;
    if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')) {
      setWardDetect({ status: 'error', ward: null, error: 'Shortened link detected. Open the link in your browser, then copy the full URL from the address bar and paste it here.' });
      return;
    }
    const coords = parseGoogleMapsCoords(url);
    if (!coords) {
      setWardDetect({ status: 'error', ward: null, error: "Could not read coordinates from this link. Try right-clicking your plot on Google Maps → \"What's here?\" → copy the URL shown." });
      return;
    }
    const [lat, lng] = coords;
    if (lat < 18.8 || lat > 19.4 || lng < 72.7 || lng > 73.1) {
      setWardDetect({ status: 'error', ward: null, error: 'Coordinates are outside Mumbai municipal limits. Please check the link.' });
      return;
    }
    setWardDetect({ status: 'loading', ward: null, error: null });
    try {
      const res = await fetch('/wards.geojson');
      const data = await res.json();
      const ward = detectWardFromCoords(lat, lng, data.features);
      if (!ward) {
        setWardDetect({ status: 'error', ward: null, error: 'Plot is within Mumbai bounds but outside known ward polygons. Enter location manually.' });
        return;
      }
      const info = WARD_INFO[ward] || {};
      const placeRaw = parseGoogleMapsPlace(url);
      let parsedName = null, parsedAddress = null;
      if (placeRaw) {
        const parts = placeRaw.split(',').map(s => s.trim()).filter(Boolean);
        parsedName = parts[0] || null;
        parsedAddress = parts.slice(1).join(', ') || null;
      }
      setWardDetect({ status: 'found', ward, info, lat, lng, parsedName, parsedAddress });
      update('location', info.islandCity ? 'islandCity' : 'suburbsExtended');
      if (parsedName && !input.societyName) update('societyName', parsedName);
      if (parsedAddress && !input.address) update('address', parsedAddress);
      else if (!input.address && info.localities) update('address', info.localities.split(',')[0].trim());
    } catch (e) {
      setWardDetect({ status: 'error', ward: null, error: 'Failed to load ward data. Try refreshing.' });
    }
  }, [gmLink, setWardDetect, update, input.societyName, input.address]);

  return (
    <div style={{ background: 'transparent', padding: 0 }}>
      <div style={{
        fontSize: 13, fontWeight: 700, marginBottom: 20, letterSpacing: '-0.01em',
        paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.07)', color: '#fff',
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      }}>
        <span className="serif">Site Assessment</span>
        {wardDetect.ward && (
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 400, fontFamily: 'inherit', letterSpacing: '0.04em' }}>
            Ward {wardDetect.ward}
          </span>
        )}
      </div>

      {/* LOCATE YOUR PLOT */}
      <div style={{
        marginBottom: 24, padding: 14,
        background: 'rgba(201,169,110,0.05)',
        border: '1px solid rgba(201,169,110,0.18)', borderRadius: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <MapPin size={13} color="#C9A96E" />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#C9A96E', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Locate your plot
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Paste Google Maps link…"
            value={gmLink}
            onChange={e => setGmLink(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleDetect()}
            style={{ flex: 1, padding: '8px 10px', fontSize: 12, borderRadius: 3, outline: 'none', fontFamily: 'inherit' }}
          />
          <button onClick={handleDetect} style={{
            padding: '8px 14px', fontSize: 12, fontWeight: 600, borderRadius: 3,
            background: '#C9A96E', color: '#0D0F14', border: 'none', cursor: 'pointer',
            whiteSpace: 'nowrap', opacity: wardDetect.status === 'loading' ? 0.6 : 1,
          }}>
            {wardDetect.status === 'loading' ? 'Detecting…' : 'Detect ward'}
          </button>
        </div>
        <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', lineHeight: 1.55 }}>
          Google Maps → right-click on your plot → <strong>"What's here?"</strong> → copy the URL from the address bar.
        </div>

        {wardDetect.status === 'found' && wardDetect.ward && (() => {
          const info = wardDetect.info || {};
          return (
            <div style={{
              marginTop: 12, padding: '10px 12px',
              background: info.islandCity ? 'rgba(201,169,110,0.07)' : 'rgba(74,140,102,0.07)',
              border: `1px solid ${info.islandCity ? 'rgba(201,169,110,0.3)' : 'rgba(74,140,102,0.3)'}`,
              borderRadius: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{
                  padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                  background: info.islandCity ? '#C9A96E' : '#4A8C66', color: '#0D0F14',
                }}>Ward {wardDetect.ward}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: info.islandCity ? '#C9A96E' : '#4A8C66' }}>
                  {info.islandCity ? 'Island City' : 'Suburbs'}
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>{info.localities}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                ASR: {info.igrDistrict} · {info.igrTaluka}
              </div>
            </div>
          );
        })()}

        {wardDetect.status === 'error' && (
          <div style={{
            marginTop: 10, padding: '8px 10px',
            background: 'rgba(220,60,40,0.08)', border: '1px solid rgba(220,60,40,0.25)',
            borderRadius: 3, fontSize: 11, color: 'rgba(255,140,120,0.9)', lineHeight: 1.55,
          }}>
            {wardDetect.error}
          </div>
        )}

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
          <div>
            <label className="field-label">
              Society name
              {wardDetect.status === 'found' && wardDetect.parsedName && (
                <span style={{ marginLeft: 8, fontSize: 9.5, fontWeight: 600, color: '#3a6b8b', textTransform: 'none', letterSpacing: 0 }}>
                  ✓ auto-filled
                </span>
              )}
            </label>
            <input type="text" value={input.societyName}
                   onChange={e => update('societyName', e.target.value)}
                   placeholder="e.g. Saraswati CHS Ltd" />
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="field-label">Address / locality</label>
            <input type="text" value={input.address}
                   onChange={e => update('address', e.target.value)}
                   placeholder="e.g. Borivali West" />
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="field-label">Location in Mumbai</label>
            {wardDetect.status === 'found' ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                background: '#13161D', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 3,
              }}>
                <div style={{
                  padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                  background: (wardDetect.info && wardDetect.info.islandCity) ? '#C9A96E' : '#3a6b8b',
                  color: (wardDetect.info && wardDetect.info.islandCity) ? '#0D0F14' : '#ffffff',
                }}>
                  {(wardDetect.info && wardDetect.info.islandCity) ? 'Island City' : 'Suburbs'}
                </div>
                <button
                  onClick={() => { setWardDetect({ status: 'idle', ward: null, error: null }); setGmLink(''); }}
                  style={{
                    marginLeft: 'auto', padding: '4px 10px', fontSize: 10, fontWeight: 600,
                    background: 'transparent', color: '#C9A96E',
                    border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, cursor: 'pointer',
                  }}>
                  Edit
                </button>
              </div>
            ) : (
              <select value={input.location} onChange={e => update('location', e.target.value)}>
                <option value="suburbsExtended">Suburbs / Extended Suburbs</option>
                <option value="islandCity">Island City (south of Mahim / Sion)</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* WHAT TO ASSESS */}
      <Section title="What to assess" moduleTag="All modules">
        <div style={{ display: 'grid', gap: 8 }}>
          {[
            { id: 'entitlement', title: 'Entitlement only', desc: 'FSI, scheme eligibility, and maximum permissible area. No cost or parking detail.' },
            { id: 'costsParking', title: 'Costs & parking', desc: 'Adds premium FSI cost, construction estimate, and parking analysis.' },
            { id: 'full', title: 'Full advisory output', desc: 'Complete entitlement + costs + offer evaluation — review-ready snapshot.' },
          ].map(option => (
            <div key={option.id}
                 className={`radio-card ${input.reportScope === option.id ? 'active' : ''}`}
                 onClick={() => update('reportScope', option.id)}
                 style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Radio active={input.reportScope === option.id} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{option.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 3, lineHeight: 1.5 }}>{option.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* BUILDING PROFILE */}
      <Section title="Building profile" topMargin moduleTag="Regulatory Intelligence">
        <div className="piq-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label className="field-label">Building age (years)</label>
            <input type="number" className="num" value={input.buildingAge}
                   onChange={e => update('buildingAge', parseInt(e.target.value) || 0)} />
            <div className="help-text">30+ years required for Reg 33(7)(B).</div>
          </div>
          <div>
            <label className="field-label">Authorisation status</label>
            <select value={input.authorisationStatus}
                    onChange={e => update('authorisationStatus', e.target.value)}>
              <option value="oc">OC received</option>
              <option value="cc">CC + plans (no OC)</option>
              <option value="tolerated">Tolerated / pre-datum</option>
              <option value="none">No documents</option>
            </select>
          </div>
        </div>
        <div>
          <label className="field-label">Property zone</label>
          <select value={input.zone} onChange={e => update('zone', e.target.value)}>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="mixed">Mixed use (Residential + Commercial)</option>
            <option value="industrial">Industrial</option>
          </select>
          <div className="help-text">From the DP map. Affects amenity, open space %, and fungible FSI rate.</div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="field-label">Type of building</label>
          <div style={{ display: 'grid', gap: 6 }}>
            {[
              { id: 'society', label: 'Co-operative housing society' },
              { id: 'cessed', label: 'Cessed building (MHADA cess)' },
              { id: 'tenanted', label: 'Tenanted building' },
            ].map(opt => (
              <div key={opt.id}
                   className={`radio-card ${input.buildingType === opt.id ? 'active' : ''}`}
                   onClick={() => update('buildingType', opt.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Radio active={input.buildingType === opt.id} />
                  <span style={{ fontSize: 12 }}>{opt.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
            Eligibility checks
          </div>
          <Toggle checked={input.membersOnSamePlot}
                  onChange={v => update('membersOnSamePlot', v)}
                  label="All members stay on same plot"
                  sub="Required by Reg 33(7)(B)" />
          <Toggle checked={input.gbResolution}
                  onChange={v => update('gbResolution', v)}
                  label="GB resolution passed or planned"
                  sub="Required at proposal stage" />
          <div style={{ marginTop: 8 }}>
            <button onClick={() => setShowSpecialConditions(s => !s)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px',
              background: showSpecialConditions ? 'rgba(201,169,110,0.06)' : 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4,
              cursor: 'pointer', color: showSpecialConditions ? '#C9A96E' : 'rgba(255,255,255,0.45)',
              fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit',
            }}>
              <span>Special conditions {(input.mixedTenancy || input.slumOnPlot) ? '·' : ''}</span>
              <ChevronDown size={13} style={{ transform: showSpecialConditions ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
            </button>
            {showSpecialConditions && (
              <div style={{ padding: '10px 0 2px' }}>
                <Toggle checked={input.mixedTenancy}
                        onChange={v => update('mixedTenancy', v)}
                        label="Plot has mixed tenancy"
                        sub="Triggers notional-plot split under Reg 33(7)(B) clause 8" />
                <Toggle checked={input.slumOnPlot}
                        onChange={v => update('slumOnPlot', v)}
                        label="Slum encroachment on plot"
                        sub="Needs separate Reg 33(10) analysis" />
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* PLOT DETAILS */}
      <Section title="Plot details" topMargin moduleTag="Buildability">
        <div className="piq-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="field-label">Plot area (sqm)</label>
            <input type="number" className="num" value={input.plotArea}
                   onChange={e => update('plotArea', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="field-label">Road width (m)</label>
            <input type="number" className="num" value={input.roadWidth}
                   onChange={e => update('roadWidth', parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        <div className="help-text">Use the DP (Development Plan) road width — proposed width, not current. Determines the FSI slab per Table 12.</div>

        <div style={{ marginTop: 12 }}>
          <label className="field-label">Area under DP road / road line (sqm)</label>
          <input type="number" className="num" value={input.dpRoadDeduction}
                 onChange={e => update('dpRoadDeduction', parseFloat(e.target.value) || 0)}
                 placeholder="0" />
          <div className="help-text">Deducted from plot area for FSI (Reg 16, Reg 30(A)(2)). Enter 0 if none.</div>
        </div>

        {parseFloat(input.roadWidth) >= 6 && parseFloat(input.roadWidth) < 9 && (
          <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(192,140,48,0.07)', border: '1px solid rgba(192,140,48,0.3)', borderRadius: 3 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12 }}>
              <input type="checkbox" checked={!!input.roadWideningProposed}
                     onChange={e => update('roadWideningProposed', e.target.checked)}
                     style={{ marginTop: 2, accentColor: '#C9A96E' }} />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Road being widened to 9m+ under DP?</div>
                <div style={{ color: 'var(--ink-soft)', marginTop: 2, fontSize: 11 }}>Table 12 Note 1: may use the 9m FSI slab if widening is proposed.</div>
              </div>
            </label>
          </div>
        )}

        <button onClick={() => setShowAdvanced(!showAdvanced)}
                style={{
                  marginTop: 12, fontSize: 11.5, color: 'rgba(201,169,110,0.7)', background: 'none',
                  border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                }}>
          {showAdvanced ? <EyeOff size={11} /> : <Eye size={11} />}
          {showAdvanced ? 'Hide' : 'Show'} advanced deductions
        </button>

        {showAdvanced && (
          <div style={{ marginTop: 12, padding: 14, background: '#111318', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3 }}>
            <div className="field-label" style={{ marginBottom: 10, color: '#C9A96E', fontSize: 9.5 }}>
              Advanced deductions — Reg 30(A)(2)
            </div>

            <div>
              <label className="field-label">DP reservation — net deduction (sqm)</label>
              <input type="number" className="num" value={input.reservationDeduction}
                     onChange={e => update('reservationDeduction', parseFloat(e.target.value) || 0)} />
              <div className="help-text">Reg 17. Area surrendered for reservations. For AR development, enter only the portion handed over — the retained % is developable with FSI loadable on the balance plot.</div>
            </div>

            <div style={{ marginTop: 10, padding: 12, background: '#13161D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                <input type="checkbox" checked={!!input.isAmalgamated}
                       onChange={e => update('isAmalgamated', e.target.checked)}
                       style={{ accentColor: '#C9A96E' }} />
                <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Amalgamated plot</span>
              </label>
              <div className="help-text" style={{ marginTop: 4 }}>Reg 14 Note (iii): if any original sub-plot was &lt; 4,000 sqm, amenity may not be triggered.</div>
              {input.isAmalgamated && (
                <div style={{ marginTop: 8 }}>
                  <label className="field-label">Smallest original sub-plot (sqm)</label>
                  <input type="number" className="num" value={input.smallestOriginalPlot}
                         onChange={e => update('smallestOriginalPlot', parseFloat(e.target.value) || 0)} />
                </div>
              )}
            </div>

            <div style={{ marginTop: 10, padding: 12, background: '#13161D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Reg 14 — Amenity space</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', color: 'var(--ink-soft)' }}>
                  <input type="checkbox" checked={input.reg14Override}
                         onChange={e => update('reg14Override', e.target.checked)}
                         style={{ accentColor: '#C9A96E' }} />
                  Override auto
                </label>
              </div>
              {input.reg14Override ? (
                <input type="number" className="num" value={input.reg14ManualValue}
                       onChange={e => update('reg14ManualValue', parseFloat(e.target.value) || 0)}
                       placeholder="Manual amenity area (sqm)" />
              ) : (
                <div className="help-text" style={{ marginTop: 0 }}>Auto-applied when plot ≥ 4,000 sqm. 5% (4–10k sqm) or 500 + 10% × excess above 10k. Full amenity applies for 33(7)(B) — no 35% reduction.</div>
              )}
            </div>

            <div style={{ marginTop: 10, padding: 12, background: '#13161D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Reg 27 — Layout open space</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', color: 'var(--ink-soft)' }}>
                  <input type="checkbox" checked={input.losOverride}
                         onChange={e => update('losOverride', e.target.checked)}
                         style={{ accentColor: '#C9A96E' }} />
                  Override auto
                </label>
              </div>
              {input.losOverride ? (
                <input type="number" className="num" value={input.losManualValue}
                       onChange={e => update('losManualValue', parseFloat(e.target.value) || 0)}
                       placeholder="Manual LOS area (sqm)" />
              ) : (
                <div className="help-text" style={{ marginTop: 0 }}>Auto-applied: 15% (1–2.5k sqm) / 20% (2.5–10k) / 25% (&gt;10k). Site-planning constraint — not an FSI deduction.</div>
              )}
            </div>

            <div style={{ marginTop: 10, padding: 12, background: '#13161D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Proposed open space in design (sqm)</div>
              <input type="number" className="num" value={input.rosProposed}
                     onChange={e => update('rosProposed', parseFloat(e.target.value) || 0)}
                     placeholder="0" />
              <div className="help-text" style={{ marginTop: 4 }}>Open space the proposed building will provide. Reduces the OSD premium deficiency calculation.</div>
            </div>

            <div style={{ marginTop: 10, padding: 12, background: '#13161D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Special micro-location</div>
              <select value={input.specialLocation} onChange={e => update('specialLocation', e.target.value)} style={{ fontSize: 12 }}>
                <option value="none">None — standard FSI applies</option>
                <option value="barc">BARC area (M Ward) — FSI may be 0.75</option>
                <option value="crz">Aksa / Marve / Erangal CRZ — FSI may be 0.50</option>
              </select>
              <div className="help-text" style={{ marginTop: 4 }}>Verify with your architect before relying on this platform's FSI output for these locations.</div>
            </div>
          </div>
        )}
      </Section>

      {/* EXISTING UNITS */}
      <Section title="Existing units" topMargin moduleTag="Buildability · Feasibility">
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {['breakdown', 'total'].map(mode => (
            <button key={mode}
                    onClick={() => update('buaInputMode', mode)}
                    style={{
                      flex: 1, padding: '7px 10px', fontSize: 11.5, fontWeight: 500,
                      border: `1px solid ${input.buaInputMode === mode ? '#C9A96E' : 'rgba(255,255,255,0.1)'}`,
                      background: input.buaInputMode === mode ? 'rgba(201,169,110,0.08)' : '#16191F',
                      color: input.buaInputMode === mode ? '#C9A96E' : 'var(--ink-soft)',
                      cursor: 'pointer', borderRadius: 3,
                    }}>
              {mode === 'breakdown' ? 'By flat type' : 'Total only'}
            </button>
          ))}
        </div>

        {input.buaInputMode === 'breakdown' ? (
          <div>
            {input.flats.map((flat, idx) => (
              <div key={idx} style={{ padding: 10, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, marginBottom: 8, background: '#111318' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 26px', gap: 6, alignItems: 'end' }}>
                  <div>
                    <div className="field-label" style={{ fontSize: 9, marginBottom: 3 }}>Type</div>
                    <input type="text" value={flat.label}
                           onChange={e => updateFlat(idx, 'label', e.target.value)}
                           style={{ padding: '6px 8px', fontSize: 12 }} />
                  </div>
                  <div>
                    <div className="field-label" style={{ fontSize: 9, marginBottom: 3 }}>Carpet (sqm)</div>
                    <input type="number" className="num" value={flat.carpet}
                           onChange={e => updateFlat(idx, 'carpet', e.target.value)}
                           style={{ padding: '6px 8px', fontSize: 12 }} />
                  </div>
                  <div>
                    <div className="field-label" style={{ fontSize: 9, marginBottom: 3 }}>Count</div>
                    <input type="number" className="num" value={flat.count}
                           onChange={e => updateFlat(idx, 'count', e.target.value)}
                           style={{ padding: '6px 8px', fontSize: 12 }} />
                  </div>
                  <button onClick={() => removeFlat(idx)} style={{ padding: 6, background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, cursor: 'pointer', color: 'var(--ink-faint)' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: 'var(--ink-soft)' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <input type="radio" checked={flat.use === 'residential'}
                           onChange={() => updateFlat(idx, 'use', 'residential')} />
                    Residential
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 12, cursor: 'pointer' }}>
                    <input type="radio" checked={flat.use === 'commercial'}
                           onChange={() => updateFlat(idx, 'use', 'commercial')} />
                    Commercial
                  </label>
                </div>
              </div>
            ))}
            <button onClick={addFlat} style={{ width: '100%', padding: '7px', fontSize: 12, background: 'none', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 3, cursor: 'pointer', color: '#C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Plus size={12} /> Add flat type
            </button>
          </div>
        ) : (
          <div className="piq-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="field-label">Total BUA (sqm)</label>
              <input type="number" className="num" value={input.totalExistingBua}
                     onChange={e => update('totalExistingBua', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Total flats</label>
              <input type="number" className="num" value={input.tenementCount}
                     onChange={e => update('tenementCount', e.target.value)} />
            </div>
          </div>
        )}
      </Section>

      {/* CLUSTER SCHEME */}
      <Section title="Cluster scheme" topMargin moduleTag="Buildability">
        <Toggle checked={input.clusterOptIn}
                onChange={v => update('clusterOptIn', v)}
                label="Combine with neighbouring societies (Reg 33(9))"
                sub={`Min ${input.location === 'islandCity' ? '4,000' : '6,000'} sqm total cluster area required.`} />
        {input.clusterOptIn && (
          <div style={{ marginTop: 14, padding: 14, background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4 }}>
            <div className="piq-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="field-label">Total cluster plot (sqm)</label>
                <input type="number" className="num" value={input.clusterPlotArea}
                       onChange={e => update('clusterPlotArea', parseFloat(e.target.value) || 0)} />
                <div className="help-text">All participating plots combined.</div>
              </div>
              <div>
                <label className="field-label">Buildings in cluster</label>
                <input type="number" className="num" value={input.clusterBuildings}
                       onChange={e => update('clusterBuildings', parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <label className="field-label">Total existing BUA (sqm)</label>
                <input type="number" className="num" value={input.clusterExistingBua}
                       onChange={e => update('clusterExistingBua', parseFloat(e.target.value) || 0)} />
                <div className="help-text">Sum across all buildings.</div>
              </div>
              <div>
                <label className="field-label">Total apartments</label>
                <input type="number" className="num" value={input.clusterApartments}
                       onChange={e => update('clusterApartments', parseInt(e.target.value) || 0)} />
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* LAND & CONSTRUCTION RATES */}
      {showCostReport ? (
        <Section title="Land & construction rates" topMargin moduleTag="Feasibility">
          <div>
            <label className="field-label">Ready Reckoner land rate — FSI 1 (₹/sqm)</label>
            <input type="number" className="num" value={input.asrLandRate}
                   onChange={e => update('asrLandRate', parseFloat(e.target.value) || 0)} />
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="field-label">SDRR construction rate (₹/sqm BUA)</label>
            <input type="number" className="num" value={input.constructionRate}
                   onChange={e => update('constructionRate', parseFloat(e.target.value) || 0)} />
            <div className="help-text">FY 2025-26 rate: ₹27,500/sqm for residential RCC.</div>
          </div>
          {(() => {
            const wardInfo = wardDetect && wardDetect.status === 'found' ? (wardDetect.info || {}) : null;
            return (
              <div style={{ marginTop: 12, padding: 12, background: '#16191F', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A96E', marginBottom: 8 }}>
                  Look up your ASR rate
                </div>
                {wardInfo ? (
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.7, marginBottom: 10 }}>
                    For <strong>Ward {wardDetect.ward}</strong>:
                    <ol style={{ margin: '6px 0 0 18px', padding: 0 }}>
                      <li>Click below — IGR ASR portal opens in a new tab</li>
                      <li>District: <strong>{wardInfo.igrDistrict}</strong> · Taluka: <strong>{wardInfo.igrTaluka}</strong></li>
                      <li>Pick your village/locality → read "Open Land" / Residential FSI 1 rate</li>
                    </ol>
                  </div>
                ) : (
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.65, marginBottom: 10 }}>
                    Detect your ward first (top panel) for tailored lookup steps.
                  </div>
                )}
                <a href="https://efilingigr.maharashtra.gov.in/ePASR/"
                   target="_blank" rel="noopener noreferrer"
                   style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: '#C9A96E', color: '#0D0F14', fontSize: 11.5, fontWeight: 600, borderRadius: 3, textDecoration: 'none' }}>
                  Open IGR ASR portal ↗
                </a>
              </div>
            );
          })()}
        </Section>
      ) : (
        <div style={{ marginTop: 20, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, fontSize: 11.5, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
          Switch to "Costs &amp; parking" or "Full advisory" above to unlock land rates and feasibility inputs.
        </div>
      )}
    </div>
  );
}
