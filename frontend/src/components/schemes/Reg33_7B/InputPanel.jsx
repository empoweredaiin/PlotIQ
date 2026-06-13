import { useState, useCallback } from 'react';
import { MapPin, Check, ChevronRight, Edit2 } from 'lucide-react';
import { WARD_INFO } from '../../../datasets/geography/ward-info';
import { detectWardFromCoords, parseGoogleMapsPlace, parseGoogleMapsCoords } from '../../../datasets/geography/ward-detection';

const _G   = '#C9A96E';
const _BD  = 'rgba(255,255,255,0.08)';
const _MU  = 'rgba(237,240,247,0.50)';
const _FA  = 'rgba(237,240,247,0.26)';
const _INK = '#EDF0F7';
const _SU  = '#141720';
const _BG  = '#111520';

function Label({ children }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: _FA, marginBottom: 5 }}>
      {children}
    </div>
  );
}

function Hint({ children }) {
  return <div style={{ fontSize: 10.5, color: _MU, marginTop: 4, lineHeight: 1.55 }}>{children}</div>;
}

function FieldInput({ value, onChange, type = 'text', placeholder }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '9px 11px', fontSize: 13,
        background: '#0E1118', border: `1px solid ${_BD}`,
        color: _INK, borderRadius: 3, outline: 'none',
        fontFamily: 'inherit',
      }}
    />
  );
}

function OptionCard({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', padding: '10px 12px',
        background: active ? 'rgba(201,169,110,0.08)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${active ? 'rgba(201,169,110,0.35)' : _BD}`,
        borderRadius: 3, cursor: 'pointer', color: _INK, fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${active ? _G : 'rgba(255,255,255,0.2)'}`,
        background: active ? _G : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#0E1118' }} />}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </button>
  );
}

function Toggle({ checked, onChange, label, sub }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 10 }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 32, height: 18, borderRadius: 9, flexShrink: 0, marginTop: 1,
          background: checked ? _G : 'rgba(255,255,255,0.12)',
          position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
        }}
      >
        <div style={{
          position: 'absolute', top: 2, left: checked ? 16 : 2,
          width: 14, height: 14, borderRadius: '50%',
          background: checked ? '#0E1118' : 'rgba(255,255,255,0.5)',
          transition: 'left 0.2s',
        }} />
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: _INK, lineHeight: 1.4 }}>{label}</div>
        {sub && <div style={{ fontSize: 10.5, color: _MU, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>}
      </div>
    </label>
  );
}

function NextButton({ onClick, label = 'Continue', disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', padding: '11px', fontSize: 12, fontWeight: 700,
        background: disabled ? 'rgba(201,169,110,0.2)' : _G,
        color: disabled ? 'rgba(201,169,110,0.4)' : '#0E1118',
        border: 'none', borderRadius: 3, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', letterSpacing: '0.04em',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        marginTop: 16,
      }}
    >
      {label} <ChevronRight size={14} />
    </button>
  );
}

function StepDot({ n, active, done }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
      background: done ? _G : active ? 'rgba(201,169,110,0.2)' : 'rgba(255,255,255,0.05)',
      border: `1px solid ${done ? _G : active ? _G : _BD}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700,
      color: done ? '#0E1118' : active ? _G : _FA,
    }}>
      {done ? <Check size={11} /> : n}
    </div>
  );
}

// ── STEP 1: Where is your society? ───────────────────────────────────────────
function StepLocation({ input, update, wardDetect, setWardDetect, onNext }) {
  const [gmLink, setGmLink] = useState('');

  const handleDetect = useCallback(async () => {
    const url = gmLink.trim();
    if (!url) return;
    if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')) {
      setWardDetect({ status: 'error', ward: null, error: 'Shortened link — open it in your browser, then copy the full address bar URL.' });
      return;
    }
    const coords = parseGoogleMapsCoords(url);
    if (!coords) {
      setWardDetect({ status: 'error', ward: null, error: "Couldn't read coordinates. Right-click your plot on Google Maps → \"What's here?\" → copy the URL from your address bar." });
      return;
    }
    const [lat, lng] = coords;
    if (lat < 18.8 || lat > 19.4 || lng < 72.7 || lng > 73.1) {
      setWardDetect({ status: 'error', ward: null, error: 'These coordinates are outside Mumbai limits.' });
      return;
    }
    setWardDetect({ status: 'loading', ward: null, error: null });
    try {
      const res = await fetch('/wards.geojson');
      const data = await res.json();
      const ward = detectWardFromCoords(lat, lng, data.features);
      if (!ward) {
        setWardDetect({ status: 'error', ward: null, error: 'Within Mumbai but outside known ward polygons. Select location manually below.' });
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

  const wardFound = wardDetect.status === 'found';

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: _INK, marginBottom: 4, lineHeight: 1.3 }}>
        Where is your society?
      </div>
      <div style={{ fontSize: 11.5, color: _MU, marginBottom: 18, lineHeight: 1.5 }}>
        Paste a Google Maps link and we'll fill in the location details automatically.
      </div>

      {/* Google Maps paste */}
      {!wardFound && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input
              type="text"
              placeholder="Paste Google Maps link…"
              value={gmLink}
              onChange={e => setGmLink(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDetect()}
              style={{
                flex: 1, padding: '9px 11px', fontSize: 12,
                background: '#0E1118', border: `1px solid ${_BD}`,
                color: _INK, borderRadius: 3, outline: 'none', fontFamily: 'inherit',
              }}
            />
            <button onClick={handleDetect} style={{
              padding: '9px 13px', fontSize: 11, fontWeight: 700,
              background: _G, color: '#0E1118', border: 'none',
              borderRadius: 3, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
              opacity: wardDetect.status === 'loading' ? 0.6 : 1,
            }}>
              {wardDetect.status === 'loading' ? '…' : <MapPin size={13} />}
            </button>
          </div>
          <div style={{ fontSize: 10, color: _FA, lineHeight: 1.5 }}>
            Google Maps → right-click plot → <strong style={{ color: _MU }}>"What's here?"</strong> → copy address bar URL
          </div>
          {wardDetect.status === 'error' && (
            <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(192,60,40,0.08)', border: '1px solid rgba(192,60,40,0.25)', borderRadius: 3, fontSize: 10.5, color: 'rgba(255,140,120,0.9)', lineHeight: 1.5 }}>
              {wardDetect.error}
            </div>
          )}
          <div style={{ marginTop: 14, borderTop: `1px dashed ${_BD}`, paddingTop: 14, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _FA, marginBottom: 10 }}>
            Or select manually
          </div>
          <OptionCard active={input.location === 'suburbsExtended'} onClick={() => update('location', 'suburbsExtended')}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Suburbs / Extended Suburbs</div>
            <div style={{ fontSize: 10.5, color: _MU, marginTop: 2 }}>Andheri, Borivali, Thane belt, etc.</div>
          </OptionCard>
          <OptionCard active={input.location === 'islandCity'} onClick={() => update('location', 'islandCity')}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Island City</div>
            <div style={{ fontSize: 10.5, color: _MU, marginTop: 2 }}>South of Mahim / Sion creek</div>
          </OptionCard>
        </div>
      )}

      {/* Ward found */}
      {wardFound && (
        <div style={{ padding: '12px 14px', background: 'rgba(74,156,110,0.08)', border: '1px solid rgba(74,156,110,0.3)', borderRadius: 4, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ padding: '2px 9px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#4A9C6E', color: '#fff' }}>
              Ward {wardDetect.ward}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#4A9C6E' }}>
              {wardDetect.info?.islandCity ? 'Island City' : 'Suburbs'}
            </div>
            <button onClick={() => { setWardDetect({ status: 'idle', ward: null, error: null }); setGmLink(''); }}
              style={{ marginLeft: 'auto', fontSize: 10, color: _MU, background: 'none', border: `1px solid ${_BD}`, borderRadius: 3, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Change
            </button>
          </div>
          <div style={{ fontSize: 11, color: _MU }}>{wardDetect.info?.localities}</div>
        </div>
      )}

      {/* Society name */}
      <div style={{ marginBottom: 12 }}>
        <Label>Society name</Label>
        <FieldInput value={input.societyName} onChange={e => update('societyName', e.target.value)} placeholder="e.g. Saraswati CHS Ltd" />
      </div>
      <div style={{ marginBottom: 4 }}>
        <Label>Locality / address</Label>
        <FieldInput value={input.address} onChange={e => update('address', e.target.value)} placeholder="e.g. Borivali West" />
      </div>

      <NextButton onClick={onNext} disabled={!input.location} label="Next — Building details" />
    </div>
  );
}

// ── STEP 2: How old is the building? ─────────────────────────────────────────
function StepBuilding({ input, update, onNext, onBack }) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: _INK, marginBottom: 4, lineHeight: 1.3 }}>
        How old is the building?
      </div>
      <div style={{ fontSize: 11.5, color: _MU, marginBottom: 20, lineHeight: 1.5 }}>
        Buildings 30 years or older can apply for redevelopment under the cooperative housing scheme.
      </div>

      <div style={{ marginBottom: 20 }}>
        <Label>Building age (years)</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="number"
            value={input.buildingAge}
            onChange={e => update('buildingAge', parseInt(e.target.value) || 0)}
            style={{
              width: 90, padding: '10px 12px', fontSize: 20, fontWeight: 700,
              background: '#0E1118', border: `1px solid ${_BD}`,
              color: input.buildingAge >= 30 ? _G : '#C05050',
              borderRadius: 3, outline: 'none', fontFamily: '"JetBrains Mono",monospace',
              textAlign: 'center',
            }}
          />
          <div style={{ fontSize: 12, color: input.buildingAge >= 30 ? '#4A9C6E' : '#C05050', fontWeight: 600 }}>
            {input.buildingAge >= 30 ? '✓ Eligible for redevelopment' : '✗ Must be at least 30 years old'}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Label>Building documents</Label>
        <Hint style={{ marginBottom: 10 }}>Most societies have OC or CC. "Tolerated" means MCGM accepted it without formal approval.</Hint>
        {[
          { id: 'oc',        label: 'Has Occupancy Certificate (OC)' },
          { id: 'cc',        label: 'Has Commencement Certificate only' },
          { id: 'tolerated', label: 'Old building — approved verbally / no paperwork' },
          { id: 'none',      label: 'No formal documents' },
        ].map(opt => (
          <OptionCard key={opt.id} active={input.authorisationStatus === opt.id} onClick={() => update('authorisationStatus', opt.id)}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{opt.label}</div>
          </OptionCard>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <Label>All members live on this same plot?</Label>
        <Toggle
          checked={input.membersOnSamePlot}
          onChange={v => update('membersOnSamePlot', v)}
          label="Yes — all member flats are on this plot"
          sub="If some members live on a different plot, the calculation changes."
        />
      </div>

      <NextButton onClick={onNext} label="Next — Plot dimensions" />
      <button onClick={onBack} style={{ width: '100%', marginTop: 8, padding: '8px', fontSize: 11, fontWeight: 500, background: 'none', border: `1px solid ${_BD}`, borderRadius: 3, color: _MU, cursor: 'pointer', fontFamily: 'inherit' }}>
        ← Back
      </button>
    </div>
  );
}

// ── STEP 3: How big is the plot? ──────────────────────────────────────────────
function StepPlot({ input, update, onNext, onBack }) {
  const [showDeductions, setShowDeductions] = useState(false);

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: _INK, marginBottom: 4, lineHeight: 1.3 }}>
        How big is the plot?
      </div>
      <div style={{ fontSize: 11.5, color: _MU, marginBottom: 20, lineHeight: 1.5 }}>
        These two numbers determine how much your society can build. Use the DP (Development Plan) measurements, not the old sale deed.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
        <div>
          <Label>Plot area (sqm)</Label>
          <FieldInput type="number" value={input.plotArea} onChange={e => update('plotArea', parseFloat(e.target.value) || 0)} placeholder="1500" />
        </div>
        <div>
          <Label>Road width (metres)</Label>
          <FieldInput type="number" value={input.roadWidth} onChange={e => update('roadWidth', parseFloat(e.target.value) || 0)} placeholder="12" />
        </div>
      </div>
      <Hint>Use the width of the road your main gate faces. Wider roads allow a taller building.</Hint>

      {parseFloat(input.roadWidth) >= 6 && parseFloat(input.roadWidth) < 9 && (
        <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(201,169,110,0.06)', border: `1px solid rgba(201,169,110,0.25)`, borderRadius: 3 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!input.roadWideningProposed} onChange={e => update('roadWideningProposed', e.target.checked)} style={{ marginTop: 2, accentColor: _G }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: _INK }}>Is this road being widened to 9m under the DP?</div>
              <div style={{ fontSize: 10.5, color: _MU, marginTop: 2, lineHeight: 1.5 }}>If yes, your plot may qualify for more buildable area.</div>
            </div>
          </label>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <button onClick={() => setShowDeductions(s => !s)} style={{ fontSize: 11, color: showDeductions ? _G : _MU, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
          {showDeductions ? '▾' : '▸'} Is any part of the plot reserved for a road or public use?
        </button>
        {showDeductions && (
          <div style={{ marginTop: 10, padding: 12, background: '#0E1118', border: `1px solid ${_BD}`, borderRadius: 3 }}>
            <div style={{ marginBottom: 10 }}>
              <Label>Area under DP road (sqm) — enter 0 if none</Label>
              <FieldInput type="number" value={input.dpRoadDeduction} onChange={e => update('dpRoadDeduction', parseFloat(e.target.value) || 0)} placeholder="0" />
              <Hint>The strip of land the municipality will take for the road. Enter 0 if not applicable.</Hint>
            </div>
          </div>
        )}
      </div>

      <NextButton onClick={onNext} label="Next — Existing flats" />
      <button onClick={onBack} style={{ width: '100%', marginTop: 8, padding: '8px', fontSize: 11, fontWeight: 500, background: 'none', border: `1px solid ${_BD}`, borderRadius: 3, color: _MU, cursor: 'pointer', fontFamily: 'inherit' }}>
        ← Back
      </button>
    </div>
  );
}

// ── STEP 4: How many flats does the society have? ────────────────────────────
function StepUnits({ input, update, updateFlat, addFlat, removeFlat, onDone, onBack }) {
  const [showBreakdown, setShowBreakdown] = useState(input.buaInputMode === 'breakdown');
  const mode = showBreakdown ? 'breakdown' : 'total';

  const toggleMode = () => {
    const next = !showBreakdown;
    setShowBreakdown(next);
    update('buaInputMode', next ? 'breakdown' : 'total');
  };

  const canContinue = mode === 'total'
    ? (parseFloat(input.totalExistingBua) > 0 && parseInt(input.tenementCount) > 0)
    : input.flats.length > 0 && input.flats.every(f => f.carpet > 0 && f.count > 0);

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: _INK, marginBottom: 4, lineHeight: 1.3 }}>
        How many flats does the society have?
      </div>
      <div style={{ fontSize: 11.5, color: _MU, marginBottom: 20, lineHeight: 1.5 }}>
        The total built area and flat count determine your members' entitlement in the new building.
      </div>

      {!showBreakdown ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 6 }}>
            <div>
              <Label>Total built area of all flats (sqm)</Label>
              <FieldInput type="number" value={input.totalExistingBua} onChange={e => update('totalExistingBua', e.target.value)} placeholder="e.g. 2400" />
            </div>
            <div>
              <Label>Number of flats</Label>
              <FieldInput type="number" value={input.tenementCount} onChange={e => update('tenementCount', e.target.value)} placeholder="e.g. 24" />
            </div>
          </div>
          <Hint>Built area means carpet area plus walls. If you only know the carpet area, multiply by 1.20. You can find this in your society's share certificates.</Hint>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {input.flats.map((flat, idx) => (
            <div key={idx} style={{ padding: 10, border: `1px solid ${_BD}`, borderRadius: 3, marginBottom: 8, background: '#0E1118' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr 1fr 26px', gap: 6, alignItems: 'end' }}>
                <div>
                  <Label>Type</Label>
                  <input type="text" value={flat.label} onChange={e => updateFlat(idx, 'label', e.target.value)} style={{ width: '100%', padding: '7px 8px', fontSize: 12, background: '#111520', border: `1px solid ${_BD}`, color: _INK, borderRadius: 3, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <Label>Carpet (sqm)</Label>
                  <input type="number" value={flat.carpet} onChange={e => updateFlat(idx, 'carpet', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '7px 8px', fontSize: 12, background: '#111520', border: `1px solid ${_BD}`, color: _INK, borderRadius: 3, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <Label>Count</Label>
                  <input type="number" value={flat.count} onChange={e => updateFlat(idx, 'count', parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '7px 8px', fontSize: 12, background: '#111520', border: `1px solid ${_BD}`, color: _INK, borderRadius: 3, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <button onClick={() => removeFlat(idx)} style={{ padding: 6, background: 'none', border: `1px solid ${_BD}`, borderRadius: 3, cursor: 'pointer', color: _FA, marginBottom: 1, alignSelf: 'end' }}>✕</button>
              </div>
            </div>
          ))}
          <button onClick={addFlat} style={{ width: '100%', padding: '7px', fontSize: 11, background: 'none', border: `1px dashed rgba(255,255,255,0.12)`, borderRadius: 3, cursor: 'pointer', color: _G, fontFamily: 'inherit', marginBottom: 4 }}>
            + Add flat type
          </button>
        </div>
      )}

      <button onClick={toggleMode} style={{ fontSize: 11, color: _MU, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', textDecoration: 'underline', marginBottom: 16 }}>
        {showBreakdown ? 'I only have the totals' : 'I have a flat-type breakdown'}
      </button>

      <div style={{ paddingTop: 16, borderTop: `1px solid ${_BD}`, marginBottom: 4 }}>
        <Label>What do you want to calculate?</Label>
        {[
          { id: 'entitlement', label: 'How much can we build?',      sub: 'Maximum area, scheme eligibility, building entitlement' },
          { id: 'costsParking', label: 'What will it cost?',         sub: 'Adds government premium costs and parking requirements' },
          { id: 'full', label: 'Full report for negotiations',        sub: 'Everything — compare what the developer is offering you' },
        ].map(opt => (
          <OptionCard key={opt.id} active={input.reportScope === opt.id} onClick={() => update('reportScope', opt.id)}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{opt.label}</div>
            <div style={{ fontSize: 10.5, color: _MU, marginTop: 2 }}>{opt.sub}</div>
          </OptionCard>
        ))}
      </div>

      <NextButton onClick={onDone} disabled={!canContinue} label="Calculate" />
      <button onClick={onBack} style={{ width: '100%', marginTop: 8, padding: '8px', fontSize: 11, fontWeight: 500, background: 'none', border: `1px solid ${_BD}`, borderRadius: 3, color: _MU, cursor: 'pointer', fontFamily: 'inherit' }}>
        ← Back
      </button>
    </div>
  );
}

// ── COMPACT SUMMARY (post-wizard) ─────────────────────────────────────────────
function SummaryView({ input, wardDetect, onEditStep }) {
  const showCostReport = input.reportScope !== 'entitlement';
  const buaDisplay = input.buaInputMode === 'total'
    ? `${input.totalExistingBua || '—'} sqm · ${input.tenementCount || '—'} flats`
    : `${input.flats.length} flat types · ${input.flats.reduce((s, f) => s + (parseInt(f.count) || 0), 0)} total`;

  const rows = [
    { step: 0, label: 'Location', value: wardDetect.status === 'found' ? `Ward ${wardDetect.ward} · ${wardDetect.info?.islandCity ? 'Island City' : 'Suburbs'}` : (input.location === 'islandCity' ? 'Island City' : 'Suburbs') },
    { step: 1, label: 'Building', value: `${input.buildingAge} yrs · ${input.authorisationStatus.toUpperCase()}` },
    { step: 2, label: 'Plot', value: `${input.plotArea} sqm · ${input.roadWidth}m road` },
    { step: 3, label: 'Units', value: buaDisplay },
  ];

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _FA, marginBottom: 14 }}>
        {input.societyName || 'Site assessment'}
      </div>

      {rows.map(row => (
        <div key={row.step} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${_BD}` }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: _G, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _FA }}>{row.label}</div>
            <div style={{ fontSize: 11.5, color: _INK, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</div>
          </div>
          <button onClick={() => onEditStep(row.step)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: _MU, padding: 4, display: 'flex', flexShrink: 0 }}>
            <Edit2 size={11} />
          </button>
        </div>
      ))}

      {/* Advanced section */}
      <AdvancedSection input={input} update={null} showCostReport={showCostReport} wardDetect={wardDetect} />
    </div>
  );
}

// ── ADVANCED (collapse — shown only in summary view after wizard) ─────────────
function AdvancedSection({ input, wardDetect, showCostReport }) {
  const [open, setOpen] = useState(false);
  // We need update from the parent — re-use via context or prop drilling.
  // This component is always rendered inside InputPanel which has update.
  // We pass it via the outer closure through InputPanel's render.
  // For simplicity, this component receives updateFn from parent.
  return null; // placeholder — wired below inside InputPanel
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export default function InputPanel({ input, update, updateFlat, addFlat, removeFlat, wardDetect, setWardDetect }) {
  const [step, setStep] = useState(0);   // 0-3 = wizard steps; 4 = done/summary
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const goTo = (n) => setStep(n);
  const showCostReport = input.reportScope !== 'entitlement';

  // Progress bar
  const progressSteps = ['Location', 'Building', 'Plot', 'Units'];

  if (step < 4) {
    return (
      <div>
        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
          {progressSteps.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < progressSteps.length - 1 ? 1 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <StepDot n={i + 1} active={i === step} done={i < step} />
                <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: i === step ? _G : i < step ? _MU : _FA, whiteSpace: 'nowrap' }}>{label}</div>
              </div>
              {i < progressSteps.length - 1 && (
                <div style={{ flex: 1, height: 1, background: i < step ? _G : _BD, margin: '0 6px', marginBottom: 14 }} />
              )}
            </div>
          ))}
        </div>

        {step === 0 && <StepLocation input={input} update={update} wardDetect={wardDetect} setWardDetect={setWardDetect} onNext={() => goTo(1)} />}
        {step === 1 && <StepBuilding input={input} update={update} onNext={() => goTo(2)} onBack={() => goTo(0)} />}
        {step === 2 && <StepPlot input={input} update={update} onNext={() => goTo(3)} onBack={() => goTo(1)} />}
        {step === 3 && <StepUnits input={input} update={update} updateFlat={updateFlat} addFlat={addFlat} removeFlat={removeFlat} onDone={() => goTo(4)} onBack={() => goTo(2)} />}
      </div>
    );
  }

  // ── SUMMARY STATE ──
  return (
    <div>
      {/* Society name header */}
      <div style={{ fontSize: 13, fontWeight: 700, color: _INK, paddingBottom: 14, marginBottom: 14, borderBottom: `1px solid ${_BD}`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span>{input.societyName || 'Site assessment'}</span>
        {wardDetect.ward && <span style={{ fontSize: 10, color: _FA, fontWeight: 400 }}>Ward {wardDetect.ward}</span>}
      </div>

      {/* Compact rows */}
      {[
        { step: 0, label: 'Location', value: wardDetect.status === 'found' ? `Ward ${wardDetect.ward} · ${wardDetect.info?.islandCity ? 'Island City' : 'Suburbs'}` : (input.location === 'islandCity' ? 'Island City' : 'Suburbs') },
        { step: 1, label: 'Building', value: `${input.buildingAge} yrs · ${input.authorisationStatus.toUpperCase()}` },
        { step: 2, label: 'Plot', value: `${input.plotArea} sqm · ${input.roadWidth}m road` },
        { step: 3, label: 'Units', value: input.buaInputMode === 'total' ? `${input.totalExistingBua || '—'} sqm · ${input.tenementCount || '—'} flats` : `${input.flats.length} types · ${input.flats.reduce((s, f) => s + (parseInt(f.count) || 0), 0)} flats` },
      ].map(row => (
        <div key={row.step} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
          <Check size={10} color={_G} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: _FA }}>{row.label}</div>
            <div style={{ fontSize: 11.5, color: _INK, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</div>
          </div>
          <button onClick={() => goTo(row.step)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: _FA, padding: 4, flexShrink: 0, display: 'flex' }}>
            <Edit2 size={11} />
          </button>
        </div>
      ))}

      {/* Advanced toggle */}
      <button onClick={() => setAdvancedOpen(s => !s)} style={{
        width: '100%', marginTop: 16, padding: '7px 10px', fontSize: 10.5, fontWeight: 600,
        background: advancedOpen ? 'rgba(201,169,110,0.05)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${advancedOpen ? 'rgba(201,169,110,0.2)' : _BD}`,
        borderRadius: 3, cursor: 'pointer', color: advancedOpen ? _G : _MU,
        fontFamily: 'inherit', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        Advanced settings
        <span style={{ fontSize: 10, color: _FA }}>{advancedOpen ? '▲' : '▼'}</span>
      </button>

      {advancedOpen && (
        <div style={{ marginTop: 10, padding: 14, background: '#0E1118', border: `1px solid ${_BD}`, borderRadius: 3 }}>

          <div style={{ marginBottom: 14 }}>
            <Label>What is this plot used for?</Label>
            <select value={input.zone} onChange={e => update('zone', e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: 12, background: '#111520', border: `1px solid ${_BD}`, color: _INK, borderRadius: 3, fontFamily: 'inherit' }}>
              <option value="residential">Homes only (residential)</option>
              <option value="commercial">Shops / offices (commercial)</option>
              <option value="mixed">Homes + shops (mixed use)</option>
              <option value="industrial">Factory / warehouse (industrial)</option>
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <Label>Has the society voted to redevelop?</Label>
            <Toggle checked={input.gbResolution} onChange={v => update('gbResolution', v)} label="General body meeting held and approved" sub="Required before submitting a proposal to MCGM" />
          </div>

          <div style={{ marginBottom: 14 }}>
            <Label>Special conditions</Label>
            <Toggle checked={input.mixedTenancy} onChange={v => update('mixedTenancy', v)} label="Some flats are rented out (not owned by members)" sub="Affects how the entitlement is divided" />
            <Toggle checked={input.slumOnPlot} onChange={v => update('slumOnPlot', v)} label="There is a slum on part of the plot" sub="Requires a separate calculation — flag this to your architect" />
          </div>

          <div style={{ marginBottom: 14 }}>
            <Label>Land reserved for public use (sqm)</Label>
            <FieldInput type="number" value={input.reservationDeduction} onChange={e => update('reservationDeduction', parseFloat(e.target.value) || 0)} placeholder="0" />
            <Hint>Land the municipality has marked for a public use (school, garden, etc.). Enter 0 if none.</Hint>
          </div>

          <div style={{ marginBottom: 14, padding: 10, background: '#111520', border: `1px solid ${_BD}`, borderRadius: 3 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
              <input type="checkbox" checked={!!input.isAmalgamated} onChange={e => update('isAmalgamated', e.target.checked)} style={{ accentColor: _G }} />
              <span style={{ fontWeight: 600, color: _INK }}>Plot was formed by merging two or more smaller plots</span>
            </label>
            {input.isAmalgamated && (
              <div style={{ marginTop: 8 }}>
                <Label>Smallest original sub-plot (sqm)</Label>
                <FieldInput type="number" value={input.smallestOriginalPlot} onChange={e => update('smallestOriginalPlot', parseFloat(e.target.value) || 0)} placeholder="0" />
              </div>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <Label>Is the plot near a sensitive area?</Label>
            <select value={input.specialLocation} onChange={e => update('specialLocation', e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: 12, background: '#111520', border: `1px solid ${_BD}`, color: _INK, borderRadius: 3, fontFamily: 'inherit' }}>
              <option value="none">No — standard rules apply</option>
              <option value="barc">Near BARC (Trombay / M Ward)</option>
              <option value="crz">Near the coast (Aksa, Marve, Erangal)</option>
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <Label>Joint redevelopment with neighbours</Label>
            <Toggle checked={input.clusterOptIn} onChange={v => update('clusterOptIn', v)} label="Multiple societies redeveloping together" sub={`Combined plot must be at least ${input.location === 'islandCity' ? '4,000' : '6,000'} sqm`} />
            {input.clusterOptIn && (
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { key: 'clusterPlotArea',   label: 'Total cluster area (sqm)', parse: parseFloat },
                  { key: 'clusterBuildings',  label: 'Buildings in cluster',     parse: parseInt },
                  { key: 'clusterExistingBua',label: 'Total built area across all societies (sqm)', parse: parseFloat },
                  { key: 'clusterApartments', label: 'Total apartments',         parse: parseInt },
                ].map(f => (
                  <div key={f.key}>
                    <Label>{f.label}</Label>
                    <FieldInput type="number" value={input[f.key]} onChange={e => update(f.key, f.parse(e.target.value) || 0)} placeholder="0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {showCostReport && (
            <div style={{ marginTop: 4 }}>
              <Label>Government land rate for your area (₹ per sqm)</Label>
              <FieldInput type="number" value={input.asrLandRate} onChange={e => update('asrLandRate', parseFloat(e.target.value) || 0)} placeholder="200000" />
              <Hint>The official Ready Reckoner rate. Look it up at igr.maharashtra.gov.in → Annual Statement of Rates → your ward.</Hint>
              <div style={{ marginTop: 10 }}>
                <Label>Construction cost estimate (₹ per sqm)</Label>
                <FieldInput type="number" value={input.constructionRate} onChange={e => update('constructionRate', parseFloat(e.target.value) || 0)} placeholder="27500" />
                <Hint>Current standard rate is ₹27,500 per sqm. Your architect can give you a precise figure.</Hint>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recalculate with fresh data */}
      <button onClick={() => goTo(0)} style={{
        width: '100%', marginTop: 14, padding: '7px', fontSize: 10.5, fontWeight: 600,
        background: 'none', border: `1px solid ${_BD}`, borderRadius: 3,
        color: _FA, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        Start over
      </button>
    </div>
  );
}
