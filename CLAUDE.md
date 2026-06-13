# PlotIQ — Engineering Handoff

---

## 1. Executive Summary

PlotIQ is a Mumbai DCPR 2034 regulatory intelligence workspace. It computes buildable area (FSI), premium liability, and redevelopment viability for any Mumbai plot under the MCGM's redevelopment schemes. Primary users are cooperative housing society committees, architects, PMCs, developers, and lenders who need to understand what a plot is actually entitled to before entering any negotiation.

Architecture: a pure-React SPA with a deterministic JS computation engine at the core. No backend, no database. All regulation math runs in the browser.

Deployed on Vercel. The frontend directory is the Vercel root.

Current maturity: Reg 33(7)(B) is fully production-ready. Reg 33(9) is live in simplified form. Reg 33(7) (cessed) and Reg 33(7)(A) (tenanted/dilapidated) are pseudocoded and verified but not yet wired into the UI. The platform is a functioning advisory tool, not a prototype.

Built by Nikhil (KravonStudios), solo.

---

## 2. Product Philosophy

**What it IS:**
- A regulation-to-output calculator: every number is derived directly from a DCPR 2034 clause, with the clause reference traceable
- An advisory tool for society committees entering developer negotiations
- A feasibility pre-screen for architects, PMCs, developers, and lenders

**What it is NOT:**
- A GIS platform (ward detection is a helper, not the core)
- A document management system
- A government-sanctioned approval system (explicit disclaimer in footer)
- A generic real-estate tool — it is Mumbai DCPR 2034 only

**Core principle:** Every output must be traceable to a specific regulation clause. No consultant estimates, no rule-of-thumb. This shapes everything: the computation engine is a pure function with no implicit state; every constant carries a comment citation (`// Reg 33(7)(B)`).

**Non-obvious domain concepts:**
- FSI (Floor Space Index): the multiplier applied to net plot area to get permissible BUA
- BUA (Built-up Area): gross floor area including walls; carpet area × 1.20
- Incentive BUA: free additional BUA the regulation grants for redevelopment — the core value proposition
- Fungible compensatory area: an additional 35% of FSI BUA available by paying a premium (Reg 31(3))
- TDR (Transferable Development Rights): purchased rights to build more; location and road width determine the cap
- Viability ratio: `saleBua / memberSideRehabBua` — if this is too low, no developer will bid
- rehabBasePath vs reg30Path: 33(7)(B) uses whichever is larger — the society takes the better of their incentive entitlement or the standard Reg 30 maximum

---

## 3. Founder / Team Context

Solo project (Nikhil / KravonStudios). Engineering philosophy: working correctness over abstraction elegance. Every shortcut is documented in the pseudocode comments. Speed to advisory value, not engineering ceremony.

**For Claude: always recommend the smallest change that solves the problem.** Do not refactor what is not broken. Do not introduce new patterns unless the existing one genuinely cannot do the job.

---

## 4. Architectural Constraints

Do NOT recommend the following unless Nikhil explicitly asks:

- TypeScript migration — the codebase is plain JS; the computation engine has no type errors that matter
- State management libraries (Redux, Zustand, etc.) — React `useState` + `useMemo` is sufficient and intentional
- Backend / API layer — the entire product is client-side by design; no server is needed for the core value
- Database of any kind — all computation is stateless and per-request
- Microservices, Docker, Kubernetes — this is a single Vercel-deployed SPA
- ORM or any persistence layer
- Any mapping library beyond what exists — ward detection uses GeoJSON point-in-polygon; no Mapbox/Leaflet is wired
- Ejecting from Create React App — `react-scripts` is the build tool; do not eject

Current scale does not justify these changes.

---

## 5. Platform / Tenant Model

There is no multi-tenant SaaS model. This is a single-user tool (publicly accessible, free for the assessment tier). The "pricing" section on the landing page describes advisory service tiers (Assessment free / Professional ₹25k / Advisory Retainer ₹75k+) — these are service engagement tiers, not software access gates. There is no auth, no feature flagging, no tenant isolation in the code.

The only gating model is regulatory eligibility, not access control:

| Scheme | Eligibility check | Where |
|---|---|---|
| Reg 30 (standard) | Always eligible | `detectApplicableSchemes` |
| Reg 33(7)(B) | Building type = society, age ≥ 30, authorisation ≠ none, members on same plot | `validators/schemes.js` |
| Reg 33(9) | User opts in, clusterOptIn = true, cluster plot ≥ min area | `validators/schemes.js` |
| Reg 33(7) (cessed) | Not implemented — fails eligibility gate | `validators/eligibility.js` |
| Reg 33(7)(A) (tenanted) | Not implemented — fails eligibility gate | `validators/eligibility.js` |
| Reg 33(10) (slum) | Boolean flag only — no computation | `SlumFlag.jsx` |

---

## 6. Current Priorities

**P0 — Live bugs to fix:**
- `computePremiumSheet` applies 50% fungible premium to all uses. Correct rate: 50% residential, **60% commercial/industrial** per Reg 31(3). File: `frontend/src/core/compute/premiums.js`, `computePremiumSheet` function.

**P1 — Next features to wire:**
- Wire `computeBuildable_33_7` (cessed buildings, Island City) from `regulations/implementations/schemes.patched.js` into `core/schemes/reg33_7.js`. This is the most commercially important unimplemented scheme. Requires a new `InputPanel.jsx` for per-occupant inputs (not per flat-type).
- Port the three pseudocode patches into the live engine: Patch #1 (commercial fungible cap), Patch #2 (33(7) fungible rehab/sale split), Patch #3 (MHADA null gate). These are in `schemes.patched.js` header comments.
- Verify Reg 33(9) cluster output against a real architect's stamped feasibility.

**P2 — Longer horizon:**
- Implement Reg 33(7)(A) — tenanted/dilapidated buildings
- Declarative rule engine (see `regulations/schemas/rule-schema-v1.md`)
- AutoDCR rate card refresh (currently FY 2025-26 hardcoded in `constants/index.js`)

Do not introduce new modules unless explicitly requested.

---

## 7. Repo Structure

```
plotiq/
  frontend/                       ← Vercel deployment root
    package.json                  ← react-scripts, react 18, lucide-react, axios
    public/
      day_bg.webp                 ← landing hero day background
      night_bg.webp               ← landing hero night background
      wards.geojson               ← Mumbai ward boundaries for PIP detection
    src/
      index.js                    ← React DOM root
      App.js                      ← orchestrator: landing page, workspace shell, state
      styles/
        tokens.css                ← CSS custom properties (--gold, --paper, --border, fonts)
        app.css
        index.css
      core/                       ← pure JS computation engine (no React, no side effects)
        index.js                  ← re-exports computeBuildable dispatcher
        schemes/
          index.js                ← computeBuildable(input) dispatcher → routes by schemeId
          reg30.js                ← Reg 30 standard FSI (no incentive)
          reg33_7b.js             ← Reg 33(7)(B) CHS redevelopment — PRODUCTION
          reg33_9.js              ← Reg 33(9) cluster — LIVE SIMPLIFIED
        compute/
          base.js                 ← computeBaseInputs() — shared deductions + FSI slab
          fsi.js                  ← findFsiSlab(), clamp01()
          amenity.js              ← computeReg14Amenity()
          los.js                  ← computeLOSRequirement(), computeParkingRequirement()
          premiums.js             ← computePremiumSheet() — Reg 30/31 + AutoDCR fees
        constants/
          index.js                ← CARPET_TO_BUA, FUNGIBLE_RATE, AUTODCR_RATES, SCHEMES_DENIED_INSITU_FSI
        validators/
          eligibility.js          ← analyseEligibility(input) → {eligible, issues[], passed[]}
          schemes.js              ← detectApplicableSchemes(), pickPrimaryScheme(), ALL_SCHEMES
          flags.js                ← computeReg15IHFlag()
      datasets/
        fsi/
          table-12.js             ← FSI_TABLE_12: location × roadWidth → {basic, premium, tdr, max}
        geography/
          ward-info.js            ← WARD_INFO map: ward name → {location, roadWidth, zone}
          ward-detection.js       ← detectWardFromCoords(), parseGoogleMapsPlace(), parseGoogleMapsCoords()
      components/
        shared/                   ← scheme-agnostic UI components
          primitives.jsx          ← Section, Radio, Toggle, SectionTitle, Row, th, td, Footer, PrintBar
          SchemePicker.jsx
          EligibilityPanel.jsx
          SpecialLocationWarning.jsx
          SlumFlag.jsx
          WatchOutFor.jsx
          SchemeComparison.jsx    ← side-by-side 33(7)(B) vs 33(9)
          CompareOffer.jsx        ← developer offer vs regulatory floor
          PremiumRecoveryPanel.jsx
          ParkingPanel.jsx
        schemes/                  ← one folder per scheme; new schemes go here
          Reg33_7B/
            InputPanel.jsx        ← full input form (ward detect, plot, flats, rates)
            Results.jsx           ← InteractiveResult, AreaStatement, MemberEntitlement
          Reg33_9/
            Results.jsx           ← ClusterResult
        pages/
          SiteIntelligencePage.js ← spatial intelligence workspace page
          NextSteps.jsx           ← 5-phase redevelopment process guide
          Explainers.jsx          ← FAQ accordion (plain-English regulatory explainers)
        layout/
          WorkspaceContextBar.js
          WorkspaceNav.js
          WorkspacePageHeader.js
        ui/
          StatLine.js
      utils/
        format.js                 ← fmt(), fmtSqft(), fmtCurrency()
        verify.js                 ← verify mode helpers (isVerifyMode, verifyDelta)

  regulations/                    ← reference material, not imported by the app
    source/
      mumbai-dcpr-2034.md         ← full DCPR 2034 normalised markdown (~1MB, 510 pp)
    implementations/
      schemes.patched.js          ← PSEUDOCODE for 33(7), 33(7)(A), 33(9), 33(10), 33(11)
    schemas/
      rule-schema-v1.md           ← target declarative rule engine design
    analysis/
      verification-report.md     ← line-by-line verification vs PEATA DCPR 2034
      computation-map.md          ← full reverse-engineering of the computation chain
      input-gap-analysis.md       ← 38-field inventory for unimplemented schemes

  docs/
    architecture.md               ← modular workspace design intent
    current-state.md              ← prior session handoff (read for history)

  tests/
    schemes.test.js               ← 5 smoke tests for pseudocode (Node eval hack, not jest)
```

---

## 8. Data Model

No database. All state is React component state in `App.js`. The `input` object is the single source of truth; everything else is derived via `useMemo`.

### Input object (all fields)

| Field | Type | Default | Purpose |
|---|---|---|---|
| `societyName` | string | '' | Display only |
| `address` | string | '' | Display only |
| `location` | enum | 'suburbsExtended' | `islandCity` or `suburbsExtended` — determines FSI slab |
| `zone` | enum | 'residential' | `residential` or `commercial` |
| `buildingAge` | number | 38 | Years — gates 33(7)(B) at ≥30 |
| `buildingType` | enum | 'society' | `society` / `cessed` / `tenanted` |
| `authorisationStatus` | enum | 'oc' | `oc` / `cc` / `tolerated` / `none` |
| `membersOnSamePlot` | bool | true | 33(7)(B) gate |
| `gbResolution` | bool | false | Warning gate |
| `mixedTenancy` | bool | false | Warning gate |
| `plotArea` | number | 1500 | sqm gross |
| `dpRoadDeduction` | number | 0 | sqm DP road to be surrendered |
| `reservationDeduction` | number | 0 | sqm DP reservation |
| `roadWidth` | number | 12 | metres — selects FSI slab band |
| `reg14Override` | bool | false | Manual override for amenity deduction |
| `reg14ManualValue` | number | 0 | sqm, used if override = true |
| `isAmalgamated` | bool | false | Affects Reg 14 amenity deduction |
| `smallestOriginalPlot` | number | 0 | sqm, for amalgamated plots |
| `roadWideningProposed` | bool | false | Shifts 6–9m road into 9m FSI band |
| `specialLocation` | enum | 'none' | Warning flags (CRZ, Heritage, etc.) |
| `losOverride` | bool | false | Manual LOS override |
| `losManualValue` | number | 0 | sqm |
| `rosProposed` | number | 0 | sqm proposed recreation open space |
| `buaInputMode` | enum | 'total' | `total` (enter BUA directly) or `breakdown` (per flat type) |
| `totalExistingBua` | number/string | '' | sqm, used when buaInputMode = 'total' |
| `tenementCount` | number/string | '' | count, used when buaInputMode = 'total' |
| `flats` | array | 3 default types | `[{label, carpet, count, use}]` — used when buaInputMode = 'breakdown' |
| `asrLandRate` | number | 200000 | ₹/sqm — Annual Statement of Rates |
| `constructionRate` | number | 27500 | ₹/sqm — used in AutoDCR fees |
| `devOfferRehab` | number | 0 | sqft carpet — what developer offers members |
| `devOfferSale` | number | 0 | sqft carpet — what developer keeps |
| `memberIncentiveShare` | number | 80 | % of incentive BUA going to members (20% to developer) |
| `premiumFsiLoad` | number | 1.0 | 0–1 slider: fraction of permissible premium FSI to load |
| `tdrLoad` | number | 1.0 | 0–1 slider: fraction of permissible TDR to load |
| `fungibleLoad` | number | 1.0 | 0–1 slider: fraction of permissible fungible to take |
| `selectedScheme` | string/null | null | null = auto-detect; else `reg30_standard` / `reg33_7B` / `reg33_9` |
| `clusterOptIn` | bool | false | Enables Reg 33(9) cluster path |
| `clusterPlotArea` | number | 0 | sqm — total cluster plot |
| `clusterBuildings` | number | 1 | building count in cluster |
| `clusterExistingBua` | number | 0 | sqm — aggregate existing BUA across cluster |
| `clusterApartments` | number | 0 | aggregate apartment count |
| `slumOnPlot` | bool | false | Shows SlumFlag warning |
| `reportScope` | enum | 'entitlement' | Controls which tabs are active |

### Result object shape (same for all schemes)

The `computeBuildable()` dispatcher always returns an object conforming to this shape:

```
{ schemeId, schemeName,
  netPlot, existingBua,
  fsiSlab: { basic, premium, tdr },
  baseFsiBua, premiumFsiBua, tdrBua,
  incentiveBua, incentiveBasis,
  rehabBasePath, reg30PathLoaded,
  fsiBua, fsiBuaMax,
  fungibleArea, fungibleAreaMax,
  permissibleBua, permissibleBuaMax,
  memberSideRehabBua, developerSideIncentive,
  saleBua, saleBuaMax,
  premiumPayable, premiumSheet,
  viabilityRatio, viabilityRating, viabilityNote,
  flatBreakdown[],
  effFsi, effFsiMax,
  inSituFsiBua, inSituFsiEligible, inSituFsiDeniedReason,
  parking: { cars, twoWheeler, visitor, total },
  rosRequired, rosProposed, rosDeficiency,
  reg14Auto, reg14Deduction, reg14Override,
  losRequirement, losActualArea,
  reg15Flag }
```

### FSI Table 12 (core lookup)

| Location | Road < 9m | 9–12m | 12–18m | 18–27m | 27m+ |
|---|---|---|---|---|---|
| Island City | 1.33 / 0 / 0 | 1.33 / 0.50 / 0.17 | 1.33 / 0.62 / 0.45 | 1.33 / 0.73 / 0.64 | 1.33 / 0.84 / 0.83 |
| Suburbs/Extended | 1.00 / 0 / 0 | 1.00 / 0.50 / 0.50 | 1.00 / 0.50 / 0.70 | 1.00 / 0.50 / 0.90 | 1.00 / 0.50 / 1.00 |

Format: `basic / premium / tdr`. Source: `datasets/fsi/table-12.js`.

---

## 9. Key Engineering Patterns

### Computation flow

```
Input (React state in App.js)
  → useMemo → analyseEligibility(input)      # { eligible, issues[], passed[] }
  → useMemo → detectApplicableSchemes(input) # [{ id, eligible, reason, gates[] }]
  → useMemo → computeBuildable({ ...input, selectedScheme: activeSchemeId })
  → result object → passed as props to all result panels
```

No component computes anything. All computation is in `core/`. Components are purely presentational.

### Adding a new scheme

1. Create `core/schemes/regXX.js` — export `computeBuildable_XX(input)`
2. Import and add to the `computeBuildable` dispatcher in `core/schemes/index.js`
3. Add scheme descriptor to `ALL_SCHEMES` in `validators/schemes.js`
4. Add eligibility gates to `detectApplicableSchemes` in `validators/schemes.js`
5. Create `components/schemes/RegXX/InputPanel.jsx` and `Results.jsx`
6. Add routing to `renderWorkspaceContent` switch in `App.js`

Zero other files need touching.

### Authentication / access

None. No auth layer. The tool is public.

### State updates

`update(key, value)` — single field update on the `input` object.
`updateFlat(idx, key, value)` — update a field within `input.flats[idx]`.
`addFlat()` / `removeFlat(idx)` — mutate the flats array.

### No caching, no events, no transactions

The computation is synchronous and deterministic. Every `useMemo` is effectively a cache keyed on `input`. No cache invalidation is needed; React handles it.

### Numeric formatting

Always use `fmt()`, `fmtSqft()`, `fmtCurrency()` from `utils/format.js`. Never format numbers inline in JSX.

### CSS class strategy

Inline styles for one-off layout. CSS classes (`.redev-app .stat-card`, etc.) for repeated patterns defined in the `Styles` component inside `App.js`. Design tokens via CSS custom properties from `tokens.css`. Do not add Tailwind classes (it is installed as a dev dependency but is not being used for active styling).

### Regulatory citations

Every constant in the computation engine carries a comment: `// Reg 33(7)(B) — short reason`. Maintain this convention when adding new constants.

---

## 10. Capabilities (Built)

- Full Reg 33(7)(B) cooperative housing society redevelopment computation: FSI slab lookup, incentive BUA (max of 15% existing or 10 sqm/tenement), dual-path governance (rehab vs Reg 30), fungible compensatory area, viability ratio and rating
- Reg 30 standard FSI computation (baseline, no incentive)
- Reg 33(9) cluster development — simplified (50% incentive, 4.00 FSI ceiling)
- Reg 14(A) amenity deduction (auto + manual override)
- Reg 27 LOS/ROS open space requirement
- Reg 16 in-situ FSI denial for all 33-family incentive schemes
- Reg 15 Inclusive Housing flag (informational)
- FSI premium sheet: Reg 30/31 premium FSI, fungible premium, OSD premium
- AutoDCR fee schedule: scrutiny, IOD deposit, debris, labour welfare cess, dev charges, TDR infrastructure (FY 2025-26 rates)
- Parking norms (Reg 30 table, informational)
- Eligibility gates for 33(7)(B) with pass/warn/fail levels
- Scheme auto-detection and manual override
- Side-by-side scheme comparison (33(7)(B) vs 33(9))
- Developer offer vs regulatory floor comparison (CompareOffer)
- Member entitlement by flat type (when buaInputMode = 'breakdown')
- Ward detection via Google Maps URL paste (GeoJSON PIP) and WARD_INFO lookup
- Viability rating: marginal / viable / attractive / highly attractive
- Premium FSI, TDR, and fungible load sliders for scenario modelling
- Road widening band upgrade (6–9m road with proposed widening treated as 9m)
- Cinematic landing page with day/night hero toggle, pricing tiers, service phases, use cases
- 7-page workspace shell: Overview, Spatial Intelligence, Regulatory Intelligence, Buildability, Feasibility, Advisory Guide, Reports
- Print-ready output (PrintBar, CSS print media query)
- Responsive layout (mobile workspace nav, collapsed sidebar on < 768px)

---

## 11. Known Gaps (Ranked by Priority)

1. **Fungible premium rate bug** — `computePremiumSheet` uses 50% for all uses. Commercial/industrial should be 60%. File: `frontend/src/core/compute/premiums.js`. Fix: pass `use` to `computePremiumSheet` and apply `FUNGIBLE_RATE_BY_USE`.

2. **Reg 33(7) cessed buildings not wired** — Fully pseudocoded and verified in `regulations/implementations/schemes.patched.js`. The computation logic is correct; it needs a new `InputPanel.jsx` that takes per-occupant carpet areas (not per flat type), and wiring into `schemes/index.js` and `detectApplicableSchemes`. This is the highest-value unimplemented scheme.

3. **Reg 33(9) cluster incentive rate is simplified** — The regulation uses a 4×4 slab table keyed on cluster area and building count. The live implementation uses a flat 50% rate. This gives a conservative result but is not fully regulation-compliant. File: `frontend/src/core/schemes/reg33_9.js`.

4. **Reg 33(7)(A) tenanted/dilapidated not wired** — Pseudocode verified and patched in `schemes.patched.js`. Lower commercial priority than 33(7) but second-most-requested.

5. **AutoDCR rates will go stale** — Rates are hardcoded as FY 2025-26 in `frontend/src/core/constants/index.js`. Needs annual refresh.

6. **`fsiPlotForCalc` in 33(7)(A) pseudocode is computed but unused downstream** — Minor cleanup when implementing that scheme.

7. **`_inSituFsi` denial branch returns `0` instead of `null`** — Semantically ambiguous; `0` and "not applicable" are different for debugging. Minor.

---

## 12. Known Operational Gaps

- **No saved state / sessions** — All input is lost on page refresh. Users must re-enter data each time. This is a known UX friction for repeat analysis sessions.
- **No PDF export** — PrintBar triggers browser print. Institutional clients want a proper PDF download with headers and a PlotIQ watermark. Currently deferred.
- **ASR rate is manually entered** — Users must look up the current ASR rate for their ward themselves. There is no integration with the MCGM ASR data feed.
- **Ward detection requires a Google Maps URL** — Users without a Google Maps link cannot use auto-detection; they must select location manually from a dropdown. No address geocoder is implemented.
- **No audit trail** — There is no way for a committee to record which inputs produced which output on which date, which is important for institutional accountability.
- **SiteIntelligencePage is a shell** — The spatial intelligence workspace exists but is not connected to any map renderer. It displays plot metadata but not a parcel map.

---

## 13. Local Dev

All commands run from `frontend/`:

```bash
cd frontend
npm install
npm start        # dev server at localhost:3000 (hot reload)
npm run build    # production build → frontend/build/
npm test         # react-scripts jest (unit tests, if any)
```

The pseudocode smoke tests in `tests/schemes.test.js` are Node scripts, not jest:

```bash
node tests/schemes.test.js
```

Note: `tests/schemes.test.js` has a hardcoded path `/home/claude/out/regulations.patched.js`. If running locally, update the path to `regulations/implementations/schemes.patched.js` before running.

There is no `.env` file, no environment variables, and no backend to start. The app is fully self-contained.
