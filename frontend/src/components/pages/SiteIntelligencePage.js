import React from 'react';

const ZONE_LABELS = {
  residential: 'Residential',
  commercial: 'Commercial',
  industrial: 'Industrial',
  mixed: 'Mixed Use',
};

const LOCATION_LABELS = {
  islandCity: 'Island City',
  suburbsExtended: 'Suburbs / Extended Suburbs',
};

const BUILDING_TYPE_LABELS = {
  society: 'Co-operative Housing Society',
  mhada: 'MHADA Colony',
  trust: 'Trust / Wakf Property',
};

const AUTH_LABELS = {
  oc: 'OC Received',
  cc: 'CC Received',
  none: 'Unauthorised / No OC-CC',
};

function fmtArea(sqm) {
  if (!sqm) return '—';
  return `${Number(sqm).toLocaleString('en-IN')} sqm  (${Math.round(sqm * 10.764).toLocaleString('en-IN')} sqft)`;
}

function Card({ title, children, accent }) {
  return (
    <div style={{
      padding: 22,
      background: '#13161D',
      border: `1px solid var(--border)`,
      borderRadius: 6,
      borderTop: accent ? `2px solid ${accent}` : undefined,
    }}>
      <div style={{
        fontSize: 10,
        textTransform: 'uppercase',
        fontWeight: 700,
        letterSpacing: '0.14em',
        color: 'var(--rust)',
        marginBottom: 14,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function MetricRow({ label, value, mono, highlight }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 12,
      padding: '7px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4 }}>{label}</div>
      <div style={{
        fontSize: mono ? 14 : 13,
        fontWeight: highlight ? 700 : 500,
        color: highlight ? 'var(--rust)' : 'var(--ink)',
        fontFamily: mono ? '"JetBrains Mono", monospace' : 'inherit',
        textAlign: 'right',
      }}>
        {value || '—'}
      </div>
    </div>
  );
}

function Flag({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: ok ? '#4A8C66' : 'rgba(255,255,255,0.2)',
        flexShrink: 0,
      }} />
      <div style={{ fontSize: 12, color: ok ? 'var(--ink)' : 'var(--ink-soft)' }}>{label}</div>
    </div>
  );
}

export default function SiteIntelligencePage({ input, wardDetect, result }) {
  const hasPlot = input.plotArea > 0;
  const hasFsi = result && result.fsiSlab;
  const ward = wardDetect.ward;
  const wardInfo = wardDetect.info;

  const mapsUrl = input.address
    ? `https://www.google.com/maps/search/${encodeURIComponent(input.address + ', Mumbai')}`
    : 'https://www.google.com/maps/place/Mumbai';

  const netPlot = hasPlot
    ? input.plotArea - (Number(input.dpRoadDeduction) || 0) - (Number(input.reservationDeduction) || 0)
    : null;

  return (
    <>
      {/* Row 1: Plot context + Ward */}
      <div className="piq-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card title="Plot parameters">
          <MetricRow label="Gross plot area" value={fmtArea(input.plotArea)} mono highlight={hasPlot} />
          {Number(input.dpRoadDeduction) > 0 && (
            <MetricRow label="DP road deduction" value={fmtArea(input.dpRoadDeduction)} mono />
          )}
          {Number(input.reservationDeduction) > 0 && (
            <MetricRow label="Reservation deduction" value={fmtArea(input.reservationDeduction)} mono />
          )}
          {netPlot !== null && (
            <MetricRow label="Net plot (after deductions)" value={fmtArea(netPlot)} mono highlight />
          )}
          <MetricRow label="Abutting road width" value={input.roadWidth ? `${input.roadWidth} m` : '—'} />
          <MetricRow label="Zone / land use" value={ZONE_LABELS[input.zone] || input.zone} />
          <MetricRow label="Location belt" value={LOCATION_LABELS[input.location] || input.location} />
        </Card>

        <Card title="Ward & location detection">
          {ward ? (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  fontSize: 28, fontWeight: 700, color: 'var(--ink)',
                  fontFamily: '"JetBrains Mono", monospace',
                  letterSpacing: '-0.02em', lineHeight: 1,
                }}>
                  Ward {ward}
                </div>
                {wardInfo?.localities && (
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6, lineHeight: 1.6 }}>
                    {wardInfo.localities}
                  </div>
                )}
              </div>
              <MetricRow
                label="ASR district"
                value={wardInfo?.igrDistrict || '—'}
              />
              <MetricRow
                label="ASR taluka"
                value={wardInfo?.igrTaluka || '—'}
              />
            </>
          ) : (
            <div style={{ color: 'var(--ink-soft)', fontSize: 13, lineHeight: 1.7 }}>
              {wardDetect.status === 'loading'
                ? 'Detecting ward from map link…'
                : wardDetect.status === 'error'
                  ? wardDetect.error
                  : 'Paste a Google Maps link in the input panel to auto-detect ward, location belt, and ASR district.'}
            </div>
          )}
        </Card>
      </div>

      {/* Row 2: Building profile + Entitlement snapshot */}
      <div className="piq-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card title="Building profile">
          <MetricRow label="Building type" value={BUILDING_TYPE_LABELS[input.buildingType] || input.buildingType} />
          <MetricRow label="Building age" value={input.buildingAge ? `${input.buildingAge} years` : '—'} />
          <MetricRow label="Authorisation status" value={AUTH_LABELS[input.authorisationStatus] || input.authorisationStatus} />
          <MetricRow label="Members on same plot" value={input.membersOnSamePlot ? 'Yes' : 'No'} />
          <MetricRow label="GB resolution passed" value={input.gbResolution ? 'Yes' : 'No'} />
          <MetricRow label="Mixed tenancy" value={input.mixedTenancy ? 'Yes' : 'No'} />
          <MetricRow label="Slum on plot" value={input.slumOnPlot ? 'Yes — Reg 33(10) applicable' : 'No'} />
        </Card>

        <Card title="Entitlement snapshot" accent="var(--rust)">
          {hasFsi ? (
            <>
              <MetricRow label="Basic FSI" value={result.fsiSlab.basic.toFixed(2)} mono highlight />
              {result.fsiSlab.tdr > 0 && (
                <MetricRow label="TDR FSI" value={result.fsiSlab.tdr.toFixed(2)} mono />
              )}
              {result.fsiSlab.premium > 0 && (
                <MetricRow label="Premium FSI" value={result.fsiSlab.premium.toFixed(2)} mono />
              )}
              {result.fsiSlab.fungible > 0 && (
                <MetricRow label="Fungible FSI" value={result.fsiSlab.fungible.toFixed(2)} mono />
              )}
              <MetricRow
                label="Effective FSI"
                value={result.effFsi ? result.effFsi.toFixed(2) : '—'}
                mono highlight
              />
              <MetricRow
                label="Max permissible BUA"
                value={result.permissibleBua
                  ? `${Math.round(result.permissibleBua).toLocaleString('en-IN')} sqm`
                  : '—'}
                mono highlight
              />
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
              Fill in plot area, location, road width, and zone to compute entitlement.
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: Eligibility flags + Map link */}
      <div className="piq-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card title="Eligibility indicators">
          <div style={{ display: 'grid', gap: 10 }}>
            <Flag ok={Number(input.buildingAge) >= 30} label="Building ≥ 30 years old (33(7)(B) gate)" />
            <Flag ok={input.gbResolution} label="GB resolution passed" />
            <Flag ok={input.membersOnSamePlot} label="All members on same plot" />
            <Flag ok={!input.mixedTenancy} label="No mixed tenancy" />
            <Flag ok={!input.slumOnPlot} label="No slum encumbrance" />
            <Flag ok={input.authorisationStatus === 'oc'} label="OC received" />
            <Flag ok={Number(input.plotArea) > 0} label="Plot area entered" />
          </div>
        </Card>

        <Card title="Location view">
          <div style={{
            borderRadius: 4,
            overflow: 'hidden',
            background: '#0D0F14',
            border: '1px solid var(--border)',
          }}>
            {/* Static map placeholder with real link */}
            <div style={{
              height: 160,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: 20,
              textAlign: 'center',
            }}>
              <svg width="28" height="28" fill="none" stroke="var(--rust)" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.6, maxWidth: 240 }}>
                {input.societyName || input.address
                  ? `${input.societyName || ''}${input.societyName && input.address ? ' · ' : ''}${input.address || ''}`
                  : 'No address entered yet'}
              </div>
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                padding: '10px 16px',
                borderTop: '1px solid var(--border)',
                fontSize: 11.5,
                fontWeight: 600,
                color: 'var(--rust)',
                textDecoration: 'none',
                letterSpacing: '0.04em',
                textAlign: 'center',
              }}
            >
              Open in Google Maps →
            </a>
          </div>
          {ward && (
            <div style={{
              marginTop: 10,
              padding: '8px 12px',
              background: 'rgba(201,169,110,0.06)',
              border: '1px solid rgba(201,169,110,0.15)',
              borderRadius: 4,
              fontSize: 11.5,
              color: 'var(--ink-soft)',
              lineHeight: 1.6,
            }}>
              Ward {ward} detected · {LOCATION_LABELS[input.location] || input.location}
              {wardInfo?.igrDistrict ? ` · ${wardInfo.igrDistrict} district` : ''}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
