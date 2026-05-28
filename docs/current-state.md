# PlotIQ — Current State Brief
**Date:** May 2026  
**Build:** ✅ Clean — 0 errors, 0 warnings  
**Purpose:** Context handoff for a new session or collaborator. Read this before touching any code.

---

## What is PlotIQ

A regulatory intelligence workspace for Mumbai DCPR 2034 (Development Control & Promotion Regulations). Computes buildable area (FSI), premium liability, and redevelopment viability for a given plot under various MCGM redevelopment schemes.

Primary users: cooperative housing society committees, architects, PMCs, developers, lenders.

---

## Codebase Layout

```
/frontend/src/

  App.js                            ← thin orchestrator: workspace shell + landing page (~1205 lines)
  styles/
    tokens.css                      ← CSS design tokens (gold, rust, surface, border)
    app.css
    index.css

  core/                             ← pure computation engine (no React, no side effects)
    schemes.js                      ← computeBuildable() dispatcher
    constants/
      index.js                      ← SQFT_PER_SQM, FSI_TABLE_12, etc.
    validators/
      eligibility.js                ← analyseEligibility(input) → { eligible, issues[] }
      schemes.js                    ← detectApplicableSchemes, pickPrimaryScheme, ALL_SCHEMES
    schemes/
      reg33_7B.js                   ← computeBuildable_33_7B() — PRODUCTION
      reg33_9.js                    ← computeBuildable_33_9() — LIVE (simplified)
      index.js

  datasets/
    geography/
      ward-info.js                  ← WARD_INFO map (ward → location, road widths, FSI zone)
      ward-detection.js             ← detectWardFromCoords, parseGoogleMapsPlace, parseGoogleMapsCoords

  utils/
    format.js                       ← fmt(), fmtSqft(), fmtCurrency()
    verify.js                       ← isVerifyMode, loadVerifyStore, saveVerifyStore, verifyDelta

  components/
    shared/                         ← reusable UI, scheme-agnostic
      primitives.jsx                ← Section, Radio, Toggle, SectionTitle, Row, th, td, Footer, PrintBar
      SchemePicker.jsx
      EligibilityPanel.jsx
      SpecialLocationWarning.jsx
      SlumFlag.jsx
      WatchOutFor.jsx
      SchemeComparison.jsx          ← side-by-side 33(7B) vs 33(9) comparison
      CompareOffer.jsx              ← developer offer vs regulatory entitlement
      PremiumRecoveryPanel.jsx      ← MCGM premium sheet (Reg 30/31 + AutoDCR fees)
      ParkingPanel.jsx              ← Reg 30 parking norms

    schemes/                        ← one folder per scheme; add new schemes here
      Reg33_7B/
        InputPanel.jsx              ← full input form (ward detect, plot, units, cluster, rates)
        Results.jsx                 ← named exports: InteractiveResult, AreaStatement, MemberEntitlement
      Reg33_9/
        Results.jsx                 ← ClusterResult

    pages/
      SiteIntelligencePage.jsx      ← spatial intelligence tab
      NextSteps.jsx                 ← 5-phase redevelopment process guide + document checklists
      Explainers.jsx                ← FAQ accordion (plain-English regulatory explainers)

/regulations/
  source/
    mumbai-dcpr-2034.md             ← full DCPR 2034 source, normalized markdown (~1MB, 510 pp)
  schemas/
    rule-schema-v1.md               ← target architecture: declarative rule engine ontology
  implementations/
    schemes.patched.js              ← pseudocode for 33(7), 33(7A), 33(9), 33(10), 33(11) — bugs patched
    schemes.test.js                 ← 5 smoke tests, passing
  analysis/
    verification-report.md         ← line-by-line verification against PEATA DCPR 2034 edition
    computation-map.md              ← full reverse-engineering of the computation engine
    input-gap-analysis.md           ← 38-field inventory + gap analysis for unimplemented schemes

/docs/
  architecture.md                   ← modular workspace design intent
  current-state.md                  ← this file
```

---

## Architecture — How It Works Now

### Clean separation of concerns

```
Input form (InputPanel.jsx)
      ↓
computeBuildable(input)          ← core/schemes.js dispatcher
      ↓
result object                    ← passed as props to all result panels
      ↓
InteractiveResult / AreaStatement / ClusterResult / PremiumRecoveryPanel / etc.
```

**App.js** (`~1205 lines`) only does:
- State management (`input`, `wardDetect`, `workspacePage`, `page`, `appTab`)
- `useMemo` wrappers around `computeBuildable`, `analyseEligibility`, `detectApplicableSchemes`
- Workspace page routing (`renderWorkspaceContent` switch)
- Landing page + `Styles` / `GlobalStyles` CSS components

**To add a new scheme:** create `components/schemes/RegXX/InputPanel.jsx` + `Results.jsx`. Zero changes to App.js.

---

## What Is Computationally Live

| Regulation | Status | Location |
|---|---|---|
| Reg 30 — Standard FSI (Table 12) | ✅ Production | `core/schemes/reg33_7B.js` |
| Reg 33(7)(B) — CHS self-redevelopment | ✅ Production | `core/schemes/reg33_7B.js` |
| Reg 33(9) — Cluster development | ✅ Live (simplified) | `core/schemes/reg33_9.js` |
| Reg 14(A) — Amenity deduction | ✅ Production | `computeBaseInputs` |
| Reg 27 — LOS/ROS requirement | ✅ Production | embedded |
| Reg 30/31 + AutoDCR premium sheet | ✅ Production | `computePremiumSheet` |
| Reg 15 — Inclusive Housing flag | ⚠️ Flag only | embedded |
| Reg 16 — In-situ FSI denial | ✅ Embedded logic | `computeBaseInputs` |
| Reg 33(7) — Cessed buildings | ❌ Not implemented | routes to hard fail gate |
| Reg 33(7)(A) — Tenanted/dilapidated | ❌ Not implemented | routes to hard fail gate |
| Reg 33(10) — SRA/Slum | ❌ Not implemented | boolean flag only |
| Reg 33(11) — Transit camp | ❌ Not implemented | not referenced |

---

## Computation Engine — How the Math Works

### Shared base (all schemes)

```
computeBaseInputs(input, schemeId)
  grossExclRoad = plotArea − dpRoadDeduction
  reg14Deduction (Reg 14A: 5% for 4k–10k sqm; 500+10% above 10k;
                  35% reduction for 33_7/33_7A/33_10 only — NOT 33_7B)
  netPlot = plotArea − road − reg14 − reservation
  fsiSlab = FSI_TABLE_12[location][roadWidth]
  baseFsiBua / premiumFsiBua / tdrBua = netPlot × slab.rate
  inSituFsiBua = 0 for all 33-family schemes (Reg 16 denial)
  existingBua = flatBreakdown × 1.20, or direct input
```

### Reg 33(7)(B) — the governing formula

```
incentiveBua = max(existingBua × 15%, residentialFlats × 10 sqm)

rehabBasePath = existingBua + incentiveBua
reg30Path     = baseFsiBua + premiumFsiBua×premiumLoad + tdrBua×tdrLoad

fsiBua = max(rehabBasePath, reg30Path)      ← dual-path: society takes whichever is more
fungibleArea = fsiBua × 0.35 × fungibleLoad

permissibleBua = fsiBua + fungibleArea
memberSideRehabBua = existingBua + incentiveBua × memberIncentiveShare
saleBua = permissibleBua − memberSideRehabBua

viabilityRatio = saleBua / memberSideRehabBua
  < 0.3 → marginal | < 0.6 → viable | < 1.0 → attractive | ≥ 1.0 → highly attractive
```

### Reg 33(9) Cluster — simplified

```
incentiveBua = clusterExistingBua × 0.50     (actual regulation has 4×4 slab table — not modelled)
ceilingBua   = clusterPlotArea × 4.00
schemeFsiBua = max(clusterExistingBua + incentiveBua, ceilingBua)
fungibleArea = schemeFsiBua × 0.35
permissibleBua = schemeFsiBua + fungibleArea
saleBua = permissibleBua − clusterExistingBua
```

### Load factors (user-controlled, 0–1 sliders)
`premiumFsiLoad`, `tdrLoad`, `fungibleLoad` — planning strategy variables. Developer may choose partial loading when TDR is scarce or premium expensive.

---

## Key Assumptions Baked Into the Engine

| Assumption | Value | Basis |
|---|---|---|
| CARPET_TO_BUA multiplier | 1.20 | Reg 33(8) SDZ clause E(b) |
| Incentive tenement unit | 10 sqm BUA (not carpet) | BUA-throughout convention |
| OSD premium rate | 25% of ASR | MCGM Circular CHE/DP/03450 concession rate |
| Fungible premium rate | 50% residential | Bug: commercial/industrial should be 60% |
| 33(9) incentive rate | flat 50% | Simplified; regulation uses area×ratio slab table |
| memberIncentiveShare default | 80% | Market convention; actual is GB Resolution decision |
| AutoDCR rate card | FY 2025-26 hardcoded | Will go stale; needs refresh annually |
| Reg 14 Note(ii): 33(7)(B) reduction | reductionFactor = 1.0 (no reduction) | Strict reading — 33(7)(B) not in Note(ii) list |
| Reg 16 denial includes 33(7)(B) | schemeId `reg33_7B` in denied set | 33(7) parent reg covers sub-regs |

---

## Known Bugs / Open Items

### Live engine
1. `computePremiumSheet` applies 50% fungible premium to all uses. Correct: 50% residential, **60% commercial/industrial** per Reg 31(3).

### Pseudocode (regulations/implementations/schemes.patched.js) — patched but not yet wired
1. **Patch #1** — Commercial fungible cap was 20%; corrected to 35% (uniform across all uses)
2. **Patch #2** — Reg 33(7) fungible computed on full fsiBua; must split rehab (free) vs sale (premium-bearing)
3. **Patch #3** — MHADA null gate: missing eligibility check when `mhadaSurplusPct` is undefined

### Cleanup
- `fsiPlotForCalc` in pseudocode `computeBuildable_33_7A`: computed but never used downstream
- `_inSituFsi` denied branch returns `0` instead of `null` — semantically ambiguous

---

## Input Data Model

### Required
`plotArea`, `roadWidth`, `location` (islandCity / suburbsExtended), `zone`, `buildingAge`, `buildingType` (society / cessed / tenanted), `authorisationStatus` (oc / cc / tolerated / none), `membersOnSamePlot`, `buaInputMode`, existing BUA source

### Key Optional (with defaults)
`dpRoadDeduction` (0), `reservationDeduction` (0), `premiumFsiLoad` (1.0), `tdrLoad` (1.0), `fungibleLoad` (1.0), `memberIncentiveShare` (80%), `asrLandRate` (200,000 ₹/sqm), `constructionRate` (27,500 ₹/sqm), `rosProposed` (0), `reg14Override` (false), `losOverride` (false), `roadWideningProposed` (false), `isAmalgamated` (false)

### Derived (never stored in state)
`grossExclRoad`, `netPlot`, `fsiSlab`, `baseFsiBua`, `premiumFsiBua`, `tdrBua`, `existingBua`, `incentiveBua`, `rehabBasePath`, `fsiBua`, `fungibleArea`, `permissibleBua`, `memberSideRehabBua`, `saleBua`, `viabilityRatio`, `premiumSheet`, `flatBreakdown[]`

---

## Pseudocode Ready to Wire (regulations/implementations/schemes.patched.js)

All schemes verified against PEATA DCPR 2034 edition, bugs patched, smoke tests passing. Waiting to be promoted to `core/schemes/`.

| Scheme | Composition modes | Extra inputs vs 33(7)(B) |
|---|---|---|
| Reg 33(7) — Cessed | single / composite_2to5 / composite_6plus / occupier_chs_cessexempt | `occupants[]`, `compositionMode`, `mhadaSurplusPct`, `preSep1969`, `isCessed`, `consentPct`, `mbrrbCertified` |
| Reg 33(7)(A) — Tenanted | pure_tenant / composite_with_nontenanted / multi_plot_2to5 / multi_plot_6plus | `tenants[]`, `compositionMode`, `mcgmUnsafeDeclared`, `mcgmTenantListCertified`, `tenantsReaccommodated`, `cessBaseYear` |
| Reg 33(10) — SRA | — | Not pseudocoded; FSI = 4.00, incentive table confirmed in verification report |
| Reg 33(11) — Transit | — | Pseudocoded; FSI table by location × road width |

---

## Next Steps (priority order)

### 1. Add Reg 33(7) — Cessed Buildings (Island City)
The most commercially important unimplemented scheme.
- **Backend:** Wire `computeBuildable_33_7` from `schemes.patched.js` into `core/schemes/`
- **Frontend:** `components/schemes/Reg33_7/InputPanel.jsx` + `Results.jsx`
- Input model: per-occupant list `{ carpet }`, 27.88 sqm floor per occupant, 120 sqm incentive cap per occupant
- MHADA surplus handling: compute at 0% (upper-bound), show soft warning, let user enter actual % to refine

### 2. Wire the three patches into live engine
Port Patch #1, #2, #3 from `schemes.patched.js` into `core/schemes/reg33_7B.js`. Run existing tests + spot-check with known site.

### 3. Verify Reg 33(9) computation
Cross-check cluster output against an architect's stamped feasibility for a real cluster site.

### 4. Implement Reg 33(7)(A) — Tenanted/Dilapidated
Second most-requested after 33(7).

### 5. Move toward declarative rule engine (long horizon)
See `regulations/schemas/rule-schema-v1.md`. Each regulation clause becomes a rule object with `ruleId`, `condition`, `effect`, `formula (as AST)`, `traceability { sourceClause, lineRefs }`. Engine evaluates rules, preserves trace, supports amendment overlays.

---

## Design System

Dark luxury intelligence platform. Tokens in `frontend/src/styles/tokens.css`.

Key tokens: `--gold` (#C9A96E), `--rust` accent, dark card backgrounds (`#13161D`, `#111318`), subtle borders (`rgba(255,255,255,0.07)`). Editorial serif hero (`Source Serif 4`). Cinematic full-bleed hero on landing. Monospace numbers (`JetBrains Mono`).

Workspace pages: **Overview → Spatial Intelligence → Regulatory Intelligence → Buildability → Feasibility → Advisory Guide → Reports**

---

## Files to Read for Context (priority order)

1. `frontend/src/App.js` — workspace orchestrator and state model
2. `frontend/src/core/schemes/reg33_7B.js` — the live computation engine
3. `regulations/implementations/schemes.patched.js` — pseudocode for all unimplemented schemes
4. `regulations/analysis/verification-report.md` — what was verified and what bugs were found
5. `regulations/schemas/rule-schema-v1.md` — target declarative architecture
6. `docs/architecture.md` — modular UI design intent
