import { ChevronDown } from 'lucide-react';
import { Check } from 'lucide-react';
import { SectionTitle } from '../shared/primitives';

const phases = [
  {
    phase: 'A',
    title: 'Gather records & get a structural audit',
    timeline: '1–2 months',
    colour: '#5a7a4f',
    summary: "Before any committee vote, confirm the building's physical and legal status. These steps cost little and eliminate surprises later.",
    steps: [
      {
        title: 'Collect your core property documents',
        detail: 'Every document in the list below must be verified before an architect can prepare a stamped feasibility. Missing documents — especially OC and approved plans — disqualify you from the 33(7)(B) incentive BUA entirely. Collect these from the ward office, City Survey office, and society records.',
      },
      {
        title: 'Commission a Structural Audit',
        detail: 'Hire a Licensed Structural Engineer (not just a civil engineer) for a formal structural stability report. This is mandatory per MCGM requirements before any redevelopment proposal. If the building is declared structurally unsafe, 33(7)(A) may apply — which carries more generous incentives than 33(7)(B). The audit also establishes urgency that protects members during negotiations.',
      },
      {
        title: 'Confirm MCGM authorisation status',
        detail: 'Visit your ward office (Building Proposals department) and confirm: (a) OC / CC on file, (b) approved plans on file with your plot number. If plans are missing, apply for a certified copy under RTI. Per the 33(7)(B) circular, without any of OC, CC, or MCGM file record — the incentive BUA is not permissible.',
      },
    ],
    docs: [
      { name: 'Property Card (City Survey extract)', source: 'City Survey office / online at mahabhulekh.maharashtra.gov.in' },
      { name: 'Index II (ownership chain document)', source: 'Sub-Registrar office or via iGR portal' },
      { name: 'Occupation Certificate (OC) or Commencement Certificate (CC)', source: 'Ward office — Building Proposals dept.' },
      { name: 'Approved architectural plans (stamped set)', source: 'Ward office — certified copy request' },
      { name: 'Society Registration Certificate', source: 'Registrar of Co-operative Societies (District office)' },
      { name: 'Share certificates of all members', source: 'Society records' },
      { name: 'List of members with existing carpet area per flat', source: 'Society records / OC plans' },
      { name: 'Structural Audit Report', source: 'Licensed Structural Engineer — IIT or VJTI empanelled preferred' },
    ],
  },
  {
    phase: 'B',
    title: 'Society decision & stamped feasibility',
    timeline: '2–4 months',
    colour: '#C9A96E',
    summary: "Pass the first GB resolution, hire an architect, and get a proper stamped feasibility. This is the document you take to developers — not a software printout.",
    steps: [
      {
        title: 'Pass GB Resolution 1 — Authorise exploration',
        detail: 'A simple majority General Body resolution authorising the Managing Committee to: (a) explore redevelopment, (b) engage a Licensed Architect for feasibility, and (c) call for developer proposals. This resolution does NOT commit the society to any developer. It is procedurally required before an architect can be formally engaged.',
      },
      {
        title: 'Hire a Licensed Architect with 33(7)(B) experience',
        detail: 'The architect prepares the stamped Proforma-A area statement — the authoritative document for your FSI entitlement. Look for architects who have submitted and received IODs under 33(7)(B) in your ward. Ask for 2–3 references from completed projects. Fee is typically ₹1–3L for a feasibility; full project fees are a separate negotiation.',
      },
      {
        title: 'Review the stamped area statement',
        detail: "The architect's Proforma-A should match the structure of this platform's area statement: gross plot → deductions → net plot → existing BUA → incentive → FSI build-up → permissible BUA → rehab/sale split. If numbers differ significantly from this output, ask the architect to walk through each line. Differences usually come from a different reg14 deduction or a different existing BUA figure from the OC plans.",
      },
      {
        title: 'Pass GB Resolution 2 — Incentive BUA allocation',
        detail: "A special resolution (typically 75% majority) specifying what percentage of the 33(7)(B) incentive BUA goes to members vs. what accrues to the developer's commercial component. This split directly determines the area each member receives above their existing carpet. The resolution becomes a binding clause in the Development Agreement. Typical range: 70–90% to members.",
      },
    ],
    docs: [
      { name: 'Draft GBR 1 — Redevelopment exploration authorisation', source: 'Prepare with your society advocate; follow MCGM model resolution format' },
      { name: 'GBR 1 — signed, stamped minutes', source: 'Society Secretary' },
      { name: "Architect's engagement letter (LOI)", source: 'Signed between society and architect' },
      { name: 'Stamped Proforma-A area statement', source: 'Architect — must be on their letterhead with MCGM registration number' },
      { name: 'Draft GBR 2 — Incentive BUA split resolution', source: 'Prepare with advocate; must specify % allocation clearly' },
      { name: 'GBR 2 — signed, stamped minutes (special resolution)', source: 'Society Secretary + 75% member attestation' },
    ],
  },
  {
    phase: 'C',
    title: 'Developer selection',
    timeline: '3–6 months',
    colour: '#3d5a4d',
    summary: 'Issue a written RFP to at least 3 developers. Compare offers on a level playing field using the stamped feasibility as your floor. Never accept the first offer.',
    steps: [
      {
        title: 'Draft and issue an RFP to shortlisted developers',
        detail: "The RFP (Request for Proposal) is a formal document telling developers: (a) your plot details and feasibility numbers, (b) exactly what you want them to offer — carpet per member, corpus, rent, hardship, finishing schedule, (c) mandatory format for their area statement so you can compare apples to apples. Minimum 3 developers. Architects with developer relationships can help shortlist credible bidders. Avoid developers who ask to see your GBR 2 before submitting an offer — that lets them tailor the offer to your minimum.",
      },
      {
        title: 'Evaluate developer offers',
        detail: 'Compare across 6 dimensions — not just headline carpet area: (1) Carpet offered per flat type vs. minimum per GBR 2, (2) Corpus (one-time payment to society), (3) Monthly transit rent and for how long, (4) Hardship allowance during shifting, (5) Project timeline and penalty clauses for delay, (6) Developer track record — completed redev projects, OC timelines, litigation history. Use a comparison matrix; the GBR 2 split defines your floor.',
      },
      {
        title: 'Pass GB Resolution 3 — Select developer',
        detail: 'A special resolution (75% majority) selecting the developer and authorising the Managing Committee to negotiate and execute the Development Agreement. This resolution cannot be passed until at least 3 offers are received. Never select a developer without a written offer on your terms.',
      },
    ],
    docs: [
      { name: 'RFP document (Request for Proposal)', source: 'Prepared by society + architect; must include stamped area statement' },
      { name: 'Developer offer letters (minimum 3)', source: 'Each developer — must be on company letterhead, signed by authorised signatory' },
      { name: "Developer's Proforma-A area statement", source: "Developer's architect — cross-check against your stamped feasibility" },
      { name: 'Developer track record document', source: 'Developer — list of completed projects with OC dates and contact persons' },
      { name: 'Developer entity documents (KYC)', source: 'Developer — COI, MOA, GST registration, RERA registration' },
      { name: 'GBR 3 — Developer selection resolution', source: 'Society Secretary + 75% member attestation' },
    ],
  },
  {
    phase: 'D',
    title: 'Agreements & regulatory submission',
    timeline: '2–4 months',
    colour: '#4a3a8a',
    summary: 'Execute legally binding agreements and submit to MCGM for approval. This is the most document-intensive phase. Do not skip legal review of the DA.',
    steps: [
      {
        title: 'Execute Development Agreement (DA) and Power of Attorney (POA)',
        detail: "The DA is the master contract between the society and developer. It must explicitly cover: (a) carpet area guaranteed per member by flat type, (b) corpus amount and payment schedule, (c) transit rent per sq ft and duration, (d) construction completion timeline with penalty clauses, (e) quality specifications and finishing schedule, (f) sinking fund / maintenance corpus for the new building, (g) dispute resolution mechanism. The DA and POA must both be registered at the Sub-Registrar office. Do NOT sign an unregistered DA. Have a society-side advocate (not the developer's advocate) review the DA before signing.",
      },
      {
        title: 'Submit development proposal to MCGM',
        detail: "The architect submits the full proposal to MCGM's Building Proposals department for your ward: drawings, structural report, Proforma-A, premium payment, and all NOCs. MCGM issues an IOD (Intimation of Disapproval — confusingly, this IS the approval to begin) or a Development Permission (DP). Premium FSI and fungible premiums are paid at this stage. Timeline: 6–18 months depending on the ward and whether there are objections.",
      },
    ],
    docs: [
      { name: 'Development Agreement (DA) — registered', source: 'Sub-Registrar office — must be stamped per stamp duty rates' },
      { name: 'Power of Attorney (POA) — registered', source: 'Sub-Registrar office' },
      { name: "Architect's drawings — plans, sections, elevations", source: 'Project architect — auto-CAD + signed hard copies' },
      { name: "Structural Engineer's report (for new building)", source: 'Empanelled structural engineer' },
      { name: 'Premium payment challans (Premium FSI + Fungible)', source: 'MCGM challan + bank payment proof' },
      { name: 'Fire NOC (if building > 15m height)', source: 'Maharashtra Fire Services — Bandra' },
      { name: 'Airport Authority NOC (if in height-restriction zone)', source: 'AAI — online via NOCAS portal' },
      { name: 'Tree NOC (if any trees on plot)', source: 'MCGM Garden Department' },
      { name: 'IOD / Development Permission from MCGM', source: 'Issued by MCGM Building Proposals — ward office' },
    ],
  },
  {
    phase: 'E',
    title: 'Construction, handover & OC',
    timeline: '24–48 months',
    colour: 'rgba(255,255,255,0.4)',
    summary: 'The longest phase. Your job is to monitor milestones, track transit rent payments, and hold the developer accountable to the DA timelines.',
    steps: [
      {
        title: 'Shifting and transit accommodation',
        detail: 'All members vacate the old building only after (a) the DA is registered, (b) MCGM IOD is in hand, (c) the developer has paid the first corpus instalment and set up transit rent standing instructions. Never let members vacate on a verbal promise. The DA should specify the transit rent rate, escalation clause, and the stop date (OC + 30 days typically). Keep a society-level register of when each member vacated and the address of their transit accommodation.',
      },
      {
        title: 'Monitor construction milestones',
        detail: "The DA should specify payment-linked milestones: Plinth completion → Slab-by-slab progress → Superstructure completion → Finishing → OC application. The Managing Committee should do site visits at each milestone and maintain a photographic record. Delays beyond the DA timeline trigger penalty clauses — enforce them in writing, not verbally. Keep a running WhatsApp group with the developer's project manager for day-to-day issues.",
      },
      {
        title: 'Flat allotment and handover',
        detail: "When the building is ready, the architect and developer prepare a flat allotment plan per the carpet area guaranteed in the DA. Compare each allotted flat's carpet area against what was promised — measure physically if needed. Do not accept possession without: (a) OC issued by MCGM, (b) water connection, (c) electricity connection, (d) fire NOC for the new building, (e) the allotment letter signed by developer.",
      },
      {
        title: 'Society re-registration and new share certificates',
        detail: 'After OC, the society must be re-registered (or its share certificate records updated) to reflect new flat numbers, carpet areas, and any new members if the developer sold sale flats. Update the property card with the new building details. The developer must hand over the sinking fund corpus to the newly reconstituted Managing Committee.',
      },
    ],
    docs: [
      { name: 'Corpus payment receipt (first instalment)', source: 'Developer — bank transfer confirmation' },
      { name: 'Transit rent standing instruction / ECS mandate', source: 'Developer — must be active before member vacates' },
      { name: 'Member-wise vacating register', source: 'Society Secretary — date vacated, transit address, contact' },
      { name: 'Plinth Completion Certificate', source: 'MCGM — issued after plinth inspection' },
      { name: 'Construction milestone photos (slab-by-slab)', source: 'Society Managing Committee — maintain dated photo record' },
      { name: 'Occupancy Certificate (OC)', source: 'MCGM — issued after final inspection of completed building' },
      { name: 'Individual flat allotment letters', source: 'Developer — one per member, specifying flat number, floor, carpet area' },
      { name: 'Water connection sanction letter', source: 'MCGM Hydraulic Engineer — ward office' },
      { name: 'Electricity connection (MSEDCL / BEST)', source: 'Distribution company — applied by developer pre-OC' },
      { name: 'Sinking fund handover receipt', source: 'Developer to Society Managing Committee' },
      { name: 'Updated Property Card (with new building)', source: 'City Survey office — apply after OC' },
      { name: 'New share certificates for all members', source: 'Reconstituted society — issued post-OC' },
    ],
  },
];

export default function NextSteps() {
  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle eyebrow="From here" title="What your committee should do next">
        Most society redevs take 3–5 years from first committee discussion to OC. The phases below cover the full journey with the documents you need at each stage.
      </SectionTitle>

      <div style={{ display: 'flex', gap: 0, marginBottom: 20, overflowX: 'auto' }}>
        {phases.map((p, i) => (
          <div key={i} style={{ flex: 1, minWidth: 100, padding: '10px 14px',
            background: p.colour, color: '#fffefb', position: 'relative',
            borderRight: i < phases.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none',
            borderRadius: i === 0 ? '4px 0 0 4px' : i === phases.length - 1 ? '0 4px 4px 0' : 0 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                          opacity: 0.8, marginBottom: 2 }}>Phase {p.phase}</div>
            <div style={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1.3 }}>{p.title.split(' ').slice(0, 3).join(' ')}&hellip;</div>
            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 3 }}>{p.timeline}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {phases.map((p, pi) => (
          <details key={pi} style={{ background: '#13161D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4 }}>
            <summary style={{ padding: '16px 20px', display: 'flex', alignItems: 'center',
                              gap: 14, cursor: 'pointer', listStyle: 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: p.colour,
                            color: '#fffefb', display: 'grid', placeItems: 'center',
                            fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {p.phase}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{p.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                  Typical duration: {p.timeline} · {p.steps.length} steps · {p.docs.length} documents
                </div>
              </div>
              <ChevronDown size={14} color="rgba(255,255,255,0.35)" style={{ flexShrink: 0 }} />
            </summary>

            <div style={{ padding: '0 20px 20px 20px' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 18,
                            paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                {p.summary}
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                              textTransform: 'uppercase', color: p.colour, marginBottom: 10 }}>
                  Steps
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {p.steps.map((s, si) => (
                    <div key={si} style={{ display: 'flex', gap: 12, padding: '12px 14px',
                                          background: '#111318', borderRadius: 3,
                                          borderLeft: `3px solid ${p.colour}` }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%',
                                    background: p.colour, color: '#fffefb',
                                    display: 'grid', placeItems: 'center',
                                    fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                        {si + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{s.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 5, lineHeight: 1.55 }}>{s.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                              textTransform: 'uppercase', color: p.colour, marginBottom: 10 }}>
                  Documents required at this phase
                </div>
                <div className="doc-grid">
                  {p.docs.map((d, di) => (
                    <div key={di} className="doc-pill" style={{ borderLeftColor: p.colour }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <Check size={11} color={p.colour} style={{ flexShrink: 0, marginTop: 1 }} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 11.5 }}>{d.name}</div>
                          <div style={{ color: 'var(--ink-soft)', fontSize: 10.5, marginTop: 2 }}>{d.source}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </details>
        ))}
      </div>

      <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(201,169,110,0.06)',
                    borderLeft: '3px solid #C9A96E', borderRadius: 2, fontSize: 12,
                    color: 'var(--ink-soft)', lineHeight: 1.6 }}>
        <strong>Timeline reality check.</strong> The above phases overlap in practice. Structural audit and document collection (Phase A) can run in parallel with the GB resolution (Phase B). MCGM approval (Phase D) is often the longest and least predictable — 6 to 18 months is typical. Build this into any developer agreement as a force-majeure type clause so transit rent continues during regulatory delays.
      </div>
    </div>
  );
}
