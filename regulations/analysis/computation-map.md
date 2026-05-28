# LIVE_APP_COMPUTATION_MAP.md
# PlotIQ — Reverse-Engineered Computational Grammar

**Source analysed:** `frontend/src/App.js` (lines 1–1215)
**Reference cross-checked:** `DCPR Docx/regulations.patched.js`, `smoke_test.js`, `VERIFICATION_REPORT.md`
**Date:** May 2026
**Method:** Full code read, line-by-line structural annotation, cross-scheme comparison

---

## PHASE 1 — REGULATORY COVERAGE AUDIT

### Live Production (computationally active in App.js)

| Regulation | Implemented | Partial | Notes |
|---|---|---|---|
| Reg 30 — FSI Table 12 | Yes | No | `FSI_TABLE_12` object: islandCity + suburbsExtended slabs. Two location types only (see gaps below). |
| Reg 14(A) — Amenity Deduction | Yes | No | `computeReg14Amenity()`. Covers 4k–10k and >10k bands, Note(ii) reduction for qualifying schemes, Note(iii) amalgamated plot exemption. |
| Reg 15 — Inclusive Housing | Flag only | Yes | `computeReg15IHFlag()` returns an informational note and the 20% handover area. No deduction from FSI base (regulation-correct: FSI of handed-over portion remains loadable on balance plot). |
| Reg 16 — In-situ FSI denial | Yes | No | `SCHEMES_DENIED_INSITU_FSI` set in `computeBaseInputs()`. Denies in-lieu FSI/TDR for all 33-family schemes that carry incentive BUA. |
| Reg 27 — LOS / ROS | Yes | No | `computeLOSRequirement()`. Covers 4 area bands for residential and flat 15% for industrial. OSD deficiency premium computed in sheet. |
| Reg 30 Parking norms | Yes | No | `computeParkingRequirement()`. Car norms by carpet band, two-wheeler, visitor, shop. Informational (Proforma II-E only). |
| Reg 30(A)(6) + Reg 31(3) — Premium sheet | Yes | Partial | `computePremiumSheet()`. Covers Premium FSI premium, Fungible premium (sale side only), OSD, plus full AutoDCR fee heads (FY 2025-26 rate card). Fungible premium rate hardcoded at 50% (residential only). See gap: commercial/industrial rate not differentiated. |
| Reg 33(7)(B) — CHS redevelopment | Yes | No | `computeBuildable_33_7B()`. Authoritative production implementation. Two-path FSI governance, incentive computation (max of 15%/per-tenement), fungible split, premium recovery, viability. |
| Reg 33(9) — Cluster development | Yes | Partial | `computeBuildable_33_9()`. FSI ceiling 4.0 on cluster plot implemented. Cluster incentive simplified to flat 50% of rehab base (actual regulation has a 4×4 slab table). |
| Reg 30 standard — no incentive | Yes | No | `computeBuildable_Reg30()`. Full Reg 30 / Table 12 FSI with fungible. Used as fallback scheme. |

### Not Implemented (flagged in code)

| Regulation | Status | Notes |
|---|---|---|
| Reg 33(7) — Cessed buildings | Not implemented | Hard `fail` gate in `analyseEligibility()`. Pseudocode in `regulations.patched.js` (3 bugs fixed). |
| Reg 33(7)(A) — Tenanted dilapidated | Not implemented | Hard `fail` gate in `analyseEligibility()`. Pseudocode in `regulations.patched.js`. |
| Reg 33(10) — SRA/Slum | Not implemented | `slumOnPlot` boolean flag in input state — triggers UI warning only. No computation. |
| Reg 33(11) — Transit camp | Not implemented | Not referenced in App.js. Pseudocode in `regulations.patched.js`. |
| Reg 32 — TDR donor mechanics | Not implemented | TDR receiving side exists (as a loading factor on net plot). Donor side / generation mechanics not modelled. |
| Reg 30 sub-cases | Not implemented | BARC-earmarked M Ward (flat 0.75), Akse/Marve/CRZ P-N Ward (flat 0.50). Code comment acknowledges these. |

---

## PHASE 2 — EXECUTION FLOW MAPPING

### Master Sequence (all schemes share this backbone)

```
USER INPUT (40+ fields)
        │
        ▼
detectApplicableSchemes(input)
  → eligibility per scheme: [reg30_standard, reg33_7B, reg33_9]
  → gates: [{ok, text}] per scheme
        │
        ▼
pickPrimaryScheme(schemes, input)
  → clusterOptIn=true → reg33_9
  → reg33_7B eligible → reg33_7B
  → else → reg30_standard
        │
        ▼
computeBuildable(input, selectedScheme)    ← dispatcher
        │
        ├─ 'reg33_9'         → computeBuildable_33_9(input)
        ├─ 'reg30_standard'  → computeBuildable_Reg30(input)
        └─ default           → computeBuildable_33_7B(input)
```

### Scheme Computer: 33(7)(B) — Full Sequence

```
computeBuildable_33_7B(input)
        │
        ▼
[STEP 1] computeBaseInputs(input, 'reg33_7B')
        │
        ├─ [1a] grossExclRoad = plotArea − dpRoadDeduction
        │
        ├─ [1b] computeReg14Amenity(grossExclRoad, scheme, zone, amalgamated, smallestPlot)
        │         → 4k–10k: 5% of plot
        │         → >10k: 500 + 10% × (plot − 10,000)
        │         → If 33(7B): reductionFactor = 1.0 (NO reduction, strict Note ii reading)
        │         → reservationOffset = min(reg14.area, reservationDeduction)
        │         → reg14Effective = reg14.area − reservationOffset
        │         → reg14Deduction = override ? manualValue : reg14Effective
        │
        ├─ [1c] netPlot = plotArea − dpRoadDeduction − reg14Deduction − reservationDeduction
        │
        ├─ [1d] computeLOSRequirement(netPlot, zone)   [informational]
        │
        ├─ [1e] computeReg15IHFlag(grossExclRoad, zone)  [informational flag]
        │
        ├─ [1f] existingBua  (two modes)
        │         buaInputMode='total'     → totalExistingBua (direct)
        │         buaInputMode='breakdown' → Σ(carpet × count) × 1.20
        │
        ├─ [1g] Road width resolution
        │         rawRoadWidth 6–9m AND roadWideningProposed → effectiveRoadWidth = 9m
        │         else → effectiveRoadWidth = rawRoadWidth
        │
        ├─ [1h] findFsiSlab(location, effectiveRoadWidth)
        │         → lookup FSI_TABLE_12[location] by road width band
        │         → {basic, premium, tdr, max}
        │
        ├─ [1i] FSI BUA components (all on netPlot)
        │         baseFsiBua   = netPlot × slab.basic
        │         premiumFsiBua = netPlot × slab.premium
        │         tdrBua       = netPlot × slab.tdr
        │         ceilingBua   = baseFsiBua + premiumFsiBua + tdrBua
        │
        ├─ [1j] Reg 16 in-situ FSI
        │         SCHEMES_DENIED_INSITU_FSI.has('reg33_7B') → true
        │         inSituFsiBua = 0
        │         inSituFsiDeniedReason = [explanation string]
        │
        ├─ [1k] computeParkingRequirement(flats, commercialBua)  [informational]
        │
        └─ [1l] rosDeficiency = max(0, rosRequired − rosProposed)  [for OSD premium]
        │
        ▼
[STEP 2] Load factors (user-controlled sliders, 0–1)
        premiumLoad = clamp01(input.premiumFsiLoad)   default 1.0
        tdrLoad     = clamp01(input.tdrLoad)          default 1.0
        fungibleLoad = clamp01(input.fungibleLoad)    default 1.0
        │
        ▼
[STEP 3] Incentive BUA (free of premium — the regulatory entitlement)
        incentive15Pct      = existingBua × 0.15
        incentivePerTenement = residentialFlats × 10  [sqm BUA]
        incentiveBua        = max(incentive15Pct, incentivePerTenement)
        incentiveBasis      = '15percent' | 'pertenement'
        │
        ▼
[STEP 4] Dual-path FSI governance  ← CRITICAL ARCHITECTURAL DECISION
        rehabBasePath = existingBua + incentiveBua
        reg30PathLoaded = baseFsiBua + (premiumFsiBua × premiumLoad) + (tdrBua × tdrLoad)
        fsiBua = max(rehabBasePath, reg30PathLoaded)
        rehabPathGoverns = rehabBasePath ≥ reg30PathLoaded
        │
        [Max-possible reference for display]
        reg30PathMax = baseFsiBua + premiumFsiBua + tdrBua   (at full load)
        fsiBuaMax = max(rehabBasePath, reg30PathMax)
        │
        ▼
[STEP 5] Fungible Compensatory Area  (Reg 31(3))
        fungibleArea    = fsiBua    × 0.35 × fungibleLoad
        fungibleAreaMax = fsiBuaMax × 0.35
        │
        ▼
[STEP 6] Permissible BUA
        permissibleBua    = fsiBua    + fungibleArea
        permissibleBuaMax = fsiBuaMax + fungibleAreaMax
        │
        ▼
[STEP 7] Member allocation
        memberIncentiveShare = input.memberIncentiveShare / 100   default 80%
        memberSideRehabBua   = existingBua + (incentiveBua × memberShare)
        developerSideIncentive = incentiveBua × (1 − memberShare)
        saleBua    = max(0, permissibleBua    − memberSideRehabBua)
        saleBuaMax = max(0, permissibleBuaMax − memberSideRehabBua)
        │
        ▼
[STEP 8] Fungible split (Proforma line 16)
        rehabShare      = memberSideRehabBua / permissibleBua
        fungibleRehabBua = fungibleArea × rehabShare   [free of premium]
        fungibleSaleBua  = fungibleArea × (1 − rehabShare)   [premium payable]
        │
        ▼
[STEP 9] Premium sheet
        computePremiumSheet({premiumFsiBua, premiumLoad, asrRate,
          fungibleSaleBua, rosDeficiency, tdrBuaLoaded, totalBua,
          plotArea, basicFsi, constructionRate})
        → premiumFsiPayable  = premiumFsiBua × premiumLoad × ASR × 0.50
        → fungiblePremium    = fungibleSaleBua × ASR × 0.50
        → osdPremium         = rosDeficiency × ASR × 0.25
        → [full AutoDCR fee heads: scrutiny, IoD, debris, labour welfare, dev charges, TDR scrutiny, TDR infra]
        │
        ▼
[STEP 10] Viability
        viabilityRatio = saleBua / memberSideRehabBua
        < 0.3  → 'marginal'
        < 0.6  → 'viable'
        < 1.0  → 'attractive'
        ≥ 1.0  → 'highly attractive'
        │
        ▼
[STEP 11] Flat breakdown (per-type entitlement)
        bumpFactor = (incentiveBua × memberShare / 1.20) / totalExistingCarpet
        per type: realisticCarpet = existingCarpet × (1 + bumpFactor)
        │
        ▼
OUTPUT OBJECT (50+ fields)
```

### Scheme Computer: Reg 30 Standard

Identical flow through Steps 1, 2. Skips Steps 3–7. `incentiveBua = 0`. `saleBua = permissibleBua − existingBua`. Viability thresholds are more conservative (no incentive to pad the ratio).

### Scheme Computer: Reg 33(9) Cluster

**Diverges from computeBaseInputs entirely.** Uses `clusterPlotArea` directly as both `grossExclRoad` and `netPlot` — all per-plot deductions are treated as pre-aggregated at the member-plot level.

```
clusterPlot = input.clusterPlotArea
rehabBase   = input.clusterExistingBua
incentiveBua = rehabBase × 0.50     ← flat rate (regulation has 4×4 slab table)
ceilingBua  = clusterPlot × 4.00
schemeFsiBua = max(rehabBase + incentiveBua, ceilingBua)
fungibleArea = schemeFsiBua × 0.35
permissibleBua = schemeFsiBua + fungibleArea
saleBua = permissibleBua − rehabBase
```

No load factors on cluster computation (premium/TDR/fungible all at 1.0, hardcoded).

---

## PHASE 3 — SHARED COMPUTATIONAL PRIMITIVES

These functions are the reusable engine components. Every scheme computer calls or depends on them.

### Tier-1 Shared (called from computeBaseInputs)

| Primitive | Function | Regulation | Used By |
|---|---|---|---|
| Amenity deduction | `computeReg14Amenity()` | Reg 14(A) | computeBaseInputs → all schemes via base |
| LOS/ROS computation | `computeLOSRequirement()` | Reg 27 | computeBaseInputs → all schemes via base |
| IH flag | `computeReg15IHFlag()` | Reg 15 | computeBaseInputs (informational only) |
| FSI slab lookup | `findFsiSlab(location, roadWidth)` | Reg 30 Table 12 | computeBaseInputs → all schemes via base |
| FSI data | `FSI_TABLE_12` | Reg 30 Table 12 | findFsiSlab |
| Reg 16 denial gate | `SCHEMES_DENIED_INSITU_FSI` set | Reg 16 | computeBaseInputs |
| Parking | `computeParkingRequirement()` | Reg 30 parking norms | computeBaseInputs (informational) |
| Input sanitizer | `clamp01(n)` | — | All scheme computers (load factors) |

### Tier-2 Shared (called from each scheme computer separately)

| Primitive | Function | Regulation | Used By |
|---|---|---|---|
| Premium + fee sheet | `computePremiumSheet()` | Reg 30/31 + AutoDCR | computeBuildable_Reg30, _33_7B, _33_9 |

### Tier-3 Shared (embedded, not factored into a function)

| Primitive | Location | Regulation | Used By |
|---|---|---|---|
| Fungible 35% cap | inline in each scheme | Reg 31(3) | Reg30, 33_7B, 33_9 |
| CARPET_TO_BUA = 1.20 | `computeBaseInputs` line ~574, `_33_7B` line ~979 | Reg 33(8) SDZ basis | Both BUA input modes |
| Fungible rehab/sale split | inline in `_33_7B` only | Reg 31(3) proviso | 33_7B |

**Normalization note:** The fungible rehab/sale split is already in `_33_7B` but not in `_Reg30` or `_33_9`. It should become a shared primitive.

---

## PHASE 4 — HIDDEN ASSUMPTION REGISTRY

Every entry here represents a decision encoded in the app that is not self-evident from the regulation text alone.

### A. Conversion Factors

| Assumption | Value | Location | Basis / Origin |
|---|---|---|---|
| CARPET_TO_BUA | 1.20 | `computeBaseInputs` (buaInputMode='breakdown') | Reg 33(8) SDZ clause E(b) — confirmed by VERIFICATION_REPORT |
| incentivePerTenement unit | 10 sqm **BUA** (not carpet) | `computeBuildable_33_7B` | Regulation says 10 sqm; app works in BUA throughout; carpet would require ÷1.20 |
| incentiveCarpetToMembers | `incentiveBua × memberShare / 1.20` | flat breakdown bump | Converting back from BUA to carpet for per-member area display |

### B. Two-Path FSI Governance

```
fsiBua = max(rehabBasePath, reg30PathLoaded)
```

This is the single most consequential interpretation in the app. The regulation says the society "may avail" premium FSI — the app interprets this as: take the higher of (rehab entitlement path) vs (Reg 30 ceiling at chosen loadings). This is the architect's operational reading of the "proviso" in 33(7)(B) clause 1. When a large plot has low existing BUA, Reg 30 path governs; when a dense old building has high existing BUA, the rehab path governs.

### C. Load Factors as Strategy Variables

```
premiumFsiLoad: 0–1   (how much premium FSI to actually avail)
tdrLoad:        0–1   (how much TDR to load)
fungibleLoad:   0–1   (how much fungible to avail)
```

These are not regulatory parameters — they are **planning strategy inputs**. The regulation permits up to the ceiling; the developer may choose to load less (e.g., TDR is scarce, premium is expensive). This is a real operational workflow decision encoded as interactive sliders.

### D. Reg 14 Reservation Offset

```
reg14ReservationOffset = min(reg14Auto.area, reservationDeduction)
reg14Effective = reg14Auto.area − reg14ReservationOffset
```

If a DP reservation already exists on the plot, that area has already effectively been "surrendered" for public use — so it offsets part of the Reg 14 amenity obligation. This is an interpretation of Reg 14(A)(a)/(b) and is not explicitly in the headnote.

### E. Note (ii) Strict Reading — 33(7)(B) Gets No Reduction

```js
const SCHEMES_WITH_REG14_REDUCTION = new Set(['reg33_7', 'reg33_7A', 'reg33_10']);
```

Reg 14 Note (ii) lists the 35% reduction for certain schemes. 33(7)(B) is not listed. The app applies the full amenity to 33(7)(B) — this is the strict reading. (An argument exists that 33(7)(B) is a sub-regulation of 33(7) and should inherit the reduction; the app does not take that position.)

### F. Reg 16 Denial Scope

The `SCHEMES_DENIED_INSITU_FSI` set includes `reg33_7B` even though the regulation says "33(7)" — because 33(7)(B) is a sub-regulation of 33(7), the app treats the parent-regulation denial as inclusive of all sub-regulations. This is an explicit architectural decision (noted in the code comment: "33(7) parent regulation includes 33(7)(B) per strict reading").

### G. Fungible Cap: 35% for All Uses (Post-Patch)

The live App.js applies `FUNGIBLE_RATE = 0.35` uniformly. This is consistent with the VERIFICATION_REPORT Patch #1 finding — the 35% cap is uniform across residential, commercial, and industrial per Reg 31(3) head. (An older version of the code used 20% for commercial, which was a bug.)

### H. Premium Rate: 50% Post-GR-Expiry

```js
premiumFsiPayable = premiumFsiBua × premiumLoad × asr × 0.50
```

The code comment says: "GR 14.01.2021 50% rebate has expired." The 0.50 rate is the base Reg 30(A)(6) rate, not a discounted rate. This needs ongoing verification as amendment overlays are not modelled.

### I. OSD Premium Rate: 25% (Concession Rate)

```js
osdPremium = deficientROS × asr × 0.25
```

This 25% rate comes from MCGM Circular CHE/DP/03450/26.08.2020 — a concession for 33(7)(B) cases. The base Reg 27 OSD premium rate is higher. The app uses the concession rate.

### J. Viability Thresholds (Heuristic, Not Regulatory)

```
saleBua / memberSideRehabBua:
  < 0.3  → marginal
  < 0.6  → viable
  < 1.0  → attractive
  ≥ 1.0  → highly attractive
```

These thresholds are a **developer market heuristic**, not a DCPR provision. They encode observed behavior: developers with `<30%` sale headroom typically don't bid; `>100%` means seller holds negotiating power.

### K. memberIncentiveShare Default: 80%

The regulation does not specify a fixed split between society members and developer for the incentive BUA. The 80% default (members get 80%, developer keeps 20%) is an operational convention seen in typical sanctioned agreements. The GB Resolution sets the actual split; this is a planning default.

### L. AutoDCR Rate Card (FY 2025-26)

Scrutiny fee ₹70.7/sqm, IoD deposit ₹1/sqft, labour welfare 1% of construction cost, dev charges land 1% basic FSI × plot × ASR, dev charges BUA 4% × BUA × ASR, TDR scrutiny ₹59/sqm, TDR infra 5% × TDR BUA × construction rate. These are hardcoded constants tied to a specific financial year. **They will go stale.**

### M. Cluster Incentive: Flat 50% of Rehab Base

The actual Reg 33(9) has a 4-band area × 4-band ratio incentive slab table. The app uses a flat 50% — which is the midpoint/common case. For small clusters or very high existing BUAs, this over/understates the incentive.

---

## PHASE 5 — DEPENDENCY GRAPH

```
computeBuildable_33_7B
├── computeBaseInputs  (shared entry point)
│   ├── computeReg14Amenity              [Reg 14(A)]
│   │   └── SCHEMES_WITH_REG14_REDUCTION (set)
│   ├── computeLOSRequirement            [Reg 27]
│   ├── computeReg15IHFlag               [Reg 15]
│   ├── findFsiSlab                      [Reg 30 Table 12]
│   │   └── FSI_TABLE_12                 (data constant)
│   ├── computeParkingRequirement        [Reg 30 parking norms]
│   └── SCHEMES_DENIED_INSITU_FSI        [Reg 16] (set)
└── computePremiumSheet                  [Reg 30/31 + AutoDCR]
    └── SQFT_PER_SQM                     (constant)

computeBuildable_Reg30
├── computeBaseInputs   (same as above)
└── computePremiumSheet (same as above)

computeBuildable_33_9
├── (does NOT call computeBaseInputs — divergent path)
└── computePremiumSheet

detectApplicableSchemes
└── (pure function of input; no shared helpers)

analyseEligibility
└── (pure function of input; no shared helpers)

pickPrimaryScheme
└── detectApplicableSchemes output

computeBuildable (dispatcher)
├── computeBuildable_33_7B
├── computeBuildable_Reg30
└── computeBuildable_33_9
```

### External Statutory Dependencies (not modelled as code)

| Dependency | Required For | Status |
|---|---|---|
| ASR (Annual Statement of Rates) | All premium and fee calculations | User input; not fetched |
| GR amendments (as overlays) | Premium rate changes, incentive changes | Static / not modelled |
| MHADA Act 1976 Third Schedule | Reg 33(7) MHADA surplus % | Not implemented |
| MBRRB circulars | Tenant list certification gate | Gate flag only |
| AutoDCR rate card | Fee heads in premium sheet | Hardcoded FY 2025-26 |

---

## PHASE 6 — EXCEPTION AND BRANCHING ANALYSIS

### Primary Branches

#### Branch 1: buaInputMode
```js
if (buaInputMode === 'total')
    existingBua = totalExistingBua
else
    existingBua = Σ(carpet × count) × 1.20
```
**What changes:** How the existingBua base is derived. Downstream effect: affects `incentiveBua`, `rehabBasePath`, `memberSideRehabBua`, viability.

#### Branch 2: Dual-Path FSI Governance
```js
rehabPathGoverns = rehabBasePath ≥ reg30PathLoaded
fsiBua = max(rehabBasePath, reg30PathLoaded)
```
**What changes:** When the rehab path governs, TDR and Premium loadings become irrelevant. When Reg 30 governs, the incentiveBua still allocates to members but doesn't cap the total BUA. This is the most consequential computational branch.

#### Branch 3: Incentive Formula
```js
incentiveBasis = incentive15Pct ≥ incentivePerTenement ? '15percent' : 'pertenement'
incentiveBua = max(incentive15Pct, incentivePerTenement)
```
**What changes:** The `pertenement` path (₹10 sqm/flat) helps small buildings (few but large flats). The `15percent` path helps large buildings (many or small flats). Neither is a penalty — it's always the better of the two.

#### Branch 4: Road Widening
```js
roadWideningApplied = (rawRoad >= 6 && rawRoad < 9) && roadWideningProposed
effectiveRoadWidth = roadWideningApplied ? 9 : rawRoadWidth
```
**What changes:** Band-shifts the FSI slab from the <9m band (basic only, no premium/TDR) to the 9–12m band. Unlocks premium FSI and TDR on the plot.

#### Branch 5: Reg 14 Reduction
```js
reductionFactor = SCHEMES_WITH_REG14_REDUCTION.has(scheme) ? 0.35 : 1.0
```
**What changes:** Amenity deduction for qualifying schemes is only 35% of the auto-computed figure. Reduces the Reg 14 bite on net plot. 33(7)(B) does NOT qualify (reductionFactor = 1.0).

#### Branch 6: Amalgamated Plot Exemption
```js
if (isAmalgamated && smallestOriginalPlot < 4000 && plotArea ≤ 20000)
    reg14 = { applies: false }   // Reg 14 Note (iii)
```
**What changes:** Entire Reg 14 deduction is waived. Materially increases net plot and therefore all FSI BUA figures.

#### Branch 7: Building Type / Authorization Hard Gates
```js
if (buildingType === 'cessed') → fail gate, route to 33(7)
if (buildingType === 'tenanted') → fail gate, route to 33(7)(A)
if (authorisationStatus === 'none') → fail gate, incentive not permissible
```
**What changes:** These are eligibility hard stops. The computation still runs (via `computeBuildable_Reg30` as fallback) but the 33(7)(B) scheme is marked ineligible.

#### Branch 8: Zone-Based Rules
```js
if (zone === 'industrial')
    Reg 14 → does not apply
    LOS → flat 15% regardless of area
```
**What changes:** Industrial plots skip the Reg 14 amenity obligation entirely. Their LOS doesn't scale with area.

#### Branch 9: Reg 14 Override
```js
reg14Deduction = reg14Override ? reg14ManualValue : reg14EffectiveArea
losActualArea  = losOverride   ? losManualValue   : losRequirement.area
```
**What changes:** Allows the user to substitute a manually verified site-specific figure for the auto-calculated deduction. These overrides exist because site conditions (actual reservation area, constrained geometry) may differ from the formula output.

#### Branch 10: Cluster Computation Path
```js
if (clusterOptedIn) → pickPrimaryScheme returns 'reg33_9'
// computeBuildable_33_9 bypasses computeBaseInputs entirely
```
**What changes:** Entire per-plot deduction chain is bypassed. Cluster uses gross inputs directly.

---

## PHASE 7 — REGULATORY INTERPRETATION LAYER

Divergences between the literal DCPR text and the app's computational encoding.

### I1. "May avail premium FSI" → max(rehabPath, reg30Path)

**Literal text (33(7)(B) clause 1 proviso):** Society "may avail" premium FSI up to the Reg 30 ceiling.  
**App interpretation:** Treat this as: the society gets whichever of the two paths gives more BUA. This is arguably the most generous reading — some practitioners interpret it as "premium FSI is an option only if the rehab path cannot be achieved." The app takes the unconditionally better-of-two approach.

### I2. CARPET_TO_BUA = 1.20 Applied Universally

**Literal text:** 1.20 is cited in Reg 33(8) SDZ for specific BUA-to-carpet conversion. The VERIFICATION_REPORT confirms it as the regulation-grounded factor.  
**App interpretation:** Applied uniformly to all flat types regardless of use (residential and commercial alike). Commercial BUA-to-carpet ratios may differ structurally.

### I3. 33(7)(B) Excluded from Reg 14(A) Note (ii) Reduction

**Literal text:** Note (ii) explicitly lists "Regulation 33(7), 33(7)(A), 33(10)". 33(7)(B) is absent.  
**App interpretation:** Strict exclusion — 33(7)(B) gets no reduction. This is the correct strict reading but does increase the net deduction (and therefore reduces net plot) for 33(7)(B) proposals.

### I4. Reg 16 Denial: "33(7)" includes "33(7)(B)"

**Literal text:** Reg 16 denial list includes "33(7)" without explicit sub-scheme enumeration.  
**App interpretation:** `SCHEMES_DENIED_INSITU_FSI` includes `reg33_7B` explicitly. The comment explains: "incentive schemes already give BUA over and above basic FSI — preventing double-count." This is functionally correct under the anti-double-count rationale.

### I5. Fungible Premium Rate: 50% for All (Residential Rate Applied Broadly)

**Literal text (Reg 31(3)):** Premium 50% residential, 60% commercial/industrial.  
**App interpretation:** `computePremiumSheet` applies 0.50 uniformly (line ~240). The rate differentiation is not encoded. For a mixed-use building with commercial floor space, the app under-charges the fungible premium on the commercial portion.

### I6. OSD at 25% (Concession Rate, Not Base Rate)

**Literal text (Reg 27):** OSD premium at base rate.  
**App interpretation:** Uses 25% from MCGM Circular CHE/DP/03450/26.08.2020 — the concession rate specifically for 33(7)(B). This is correct for 33(7)(B) but would be incorrect for a Reg 30 standard case. The `computePremiumSheet` function doesn't know which scheme called it — it always applies 25%.

### I7. 33(9) Incentive: 50% Flat (vs. Regulation Slab Table)

**Literal text (Reg 33(9) Appendix):** Incentive table keyed on cluster area × ratio bands.  
**App interpretation:** Flat 50% of rehab base. Simpler but not precise — for the actual submission, the licensed architect would use the regulation table.

---

## PHASE 8 — DATA MODEL DISCOVERY

### Required Inputs (computation cannot run without these)

| Field | Type | Role |
|---|---|---|
| `plotArea` | number (sqm) | Base geometry |
| `roadWidth` | number (m) | FSI slab selection |
| `location` | 'islandCity' \| 'suburbsExtended' | FSI slab selection |
| `zone` | 'residential' \| 'commercial' \| 'industrial' \| 'mixed' | Reg 14 and LOS rules |
| `buildingAge` | number (years) | Eligibility gate |
| `buildingType` | 'society' \| 'cessed' \| 'tenanted' | Eligibility gate |
| `authorisationStatus` | 'oc' \| 'cc' \| 'tolerated' \| 'none' | Eligibility gate |
| `membersOnSamePlot` | boolean | Eligibility gate |
| `buaInputMode` | 'total' \| 'breakdown' | BUA computation mode |
| `totalExistingBua` OR `flats[]` | number or array | Existing BUA source |

### Optional Inputs (with defaults)

| Field | Default | Role |
|---|---|---|
| `dpRoadDeduction` | 0 | Reg 14 and net plot |
| `reservationDeduction` | 0 | Net plot |
| `premiumFsiLoad` | 1.0 | Strategy variable |
| `tdrLoad` | 1.0 | Strategy variable |
| `fungibleLoad` | 1.0 | Strategy variable |
| `memberIncentiveShare` | 80 (%) | Allocation split |
| `asrLandRate` | 200,000 ₹/sqm | Premium calculation |
| `constructionRate` | 27,500 ₹/sqm | AutoDCR fee calculation |
| `rosProposed` | 0 | OSD deficiency calculation |
| `reg14Override` | false | Manual site correction |
| `reg14ManualValue` | 0 | Manual Reg 14 value |
| `losOverride` | false | Manual site correction |
| `losManualValue` | 0 | Manual LOS value |
| `roadWideningProposed` | false | Band-shift trigger |
| `isAmalgamated` | false | Reg 14 Note (iii) |
| `smallestOriginalPlot` | 0 | Reg 14 Note (iii) |
| `clusterOptIn` | false | Scheme routing |
| `clusterPlotArea` | 0 | Cluster computation |
| `clusterExistingBua` | 0 | Cluster computation |
| `clusterBuildings` | 1 | Display only |
| `clusterApartments` | 0 | Display only |
| `gbResolution` | false | Advisory warning |
| `mixedTenancy` | false | Advisory warning |
| `slumOnPlot` | false | Flag only |

### Derived State (computed, not stored)

| Variable | Derived From | Significance |
|---|---|---|
| `grossExclRoad` | plotArea − dpRoadDeduction | Reg 14 base |
| `reg14Deduction` | auto or manual | Net plot deduction |
| `netPlot` | plotArea − road − reg14 − reservation | FSI computation base |
| `existingBua` | flats or totalExistingBua | Rehab base |
| `fsiSlab` | location × effectiveRoadWidth | FSI rate table |
| `baseFsiBua / premiumFsiBua / tdrBua` | netPlot × slab rates | FSI component BUAs |
| `incentiveBua` | max(15%, perTenement) | Regulatory entitlement |
| `rehabBasePath` | existingBua + incentiveBua | Governance path A |
| `reg30PathLoaded` | base + premium×load + tdr×load | Governance path B |
| `fsiBua` | max(A, B) | Governing FSI BUA |
| `fungibleArea` | fsiBua × 0.35 × fungibleLoad | Fungible entitlement |
| `permissibleBua` | fsiBua + fungibleArea | Total buildable |
| `memberSideRehabBua` | existingBua + incentive×memberShare | Members' total entitlement |
| `saleBua` | permissibleBua − memberSideRehabBua | Developer's portion |
| `viabilityRatio` | saleBua / memberSideRehabBua | Economic viability metric |
| `fungibleRehabBua / fungibleSaleBua` | proportional split of fungibleArea | Premium liability split |
| `premiumSheet` | multi-line fee computation | Proforma output |

### Runtime-Only State (UI, not computational)

```
eligibility        — { eligible, issues[], passed[] }  per scheme
schemes            — detectApplicableSchemes output
primarySchemeId    — auto-detected from scheme eligibility
activeSchemeId     — user override or primarySchemeId
result             — computed output for activeScheme
result_33_7B       — computed output for 33(7)(B) if eligible (comparison)
result_33_9        — computed output for 33(9) if eligible (comparison)
```

---

## PHASE 9 — EXPLAINABILITY MAPPING

The app already has a structured explainability layer — here is its full current architecture.

### Layer 1: Eligibility (Pre-computation)

**`analyseEligibility(input)` returns:**
```js
{
  eligible: bool,          // false if any 'fail' level issue
  issues: [{
    level: 'fail' | 'warn',
    title: string,         // short human label
    detail: string,        // full paragraph explanation
    ref: string,           // regulation citation string
  }],
  passed: [{
    title: string,
    ref: string,
  }]
}
```

**Current gate coverage (33(7)(B) only):**
- buildingAge < 30 → warn
- buildingType === 'cessed' → fail (redirect to 33(7))
- buildingType === 'tenanted' → fail (redirect to 33(7)(A))
- authorisationStatus === 'none' → fail
- !membersOnSamePlot → fail
- !gbResolution → warn (advisory)
- mixedTenancy → warn (proportional split required)

### Layer 2: Scheme Detection (Pre-computation)

**`detectApplicableSchemes(input)` returns per scheme:**
```js
{
  id: string,
  eligible: bool,
  reason: string,           // human-readable summary
  gates: [{ ok: bool, text: string }],
  minClusterArea: number,   // 33(9) only
}
```

### Layer 3: Computation Provenance (Post-computation)

Every scheme output object carries contextual flags:

| Field | Type | Explainability Purpose |
|---|---|---|
| `incentiveBasis` | '15percent' \| 'pertenement' \| 'cluster' \| 'none' | Which incentive formula won |
| `rehabPathGoverns` | bool | Which FSI path governed |
| `reg14Auto.reason` | string | Why Reg 14 deduction was applied or waived |
| `reg14Auto.reductionFactor` | number | Whether the 35% reduction applied |
| `inSituFsiDeniedReason` | string | Why Reg 16 in-situ FSI is zero |
| `losRequirement.band` | string | Which LOS area band applies |
| `viabilityRating` | string | Human label for viability |
| `viabilityNote` | string | Contextual explanation of rating |
| `roadWideningApplied` | bool | Whether the 9m band-shift triggered |

### Layer 4: Verify Mode (Internal)

Activated via `?verify=1` URL param. Allows loading a "ground truth" area statement and comparing computed values against expected values with a Δ% delta. This is an internal calibration tool — not shown to end users.

### Gap: No Per-Calculation Traceability

The current explainability layer provides schema-level provenance (which regulation, which branch). What it lacks is **per-number source tracing** — e.g., "this 3,240 sqm figure = 2,700 sqm (netPlot) × 1.20 (basic FSI) [Reg 30 Table 12, Road ≥12m, Suburbs]." This is the explainability layer described in the ontology doc and not yet implemented.

---

## PHASE 10 — RULE CATEGORIZATION

Every computational unit categorized against the ontology taxonomy.

| Computation | Category | Notes |
|---|---|---|
| FSI_TABLE_12 lookup | `formula` | Pure lookup, keyed on location × road width |
| Road widening band-shift | `modifier` | Conditional on site flag; modifies effective road width |
| computeReg14Amenity (area bands) | `formula` | Two-tier band formula |
| Reg 14 35% reduction for qualifying schemes | `modifier` | Applied after base formula |
| Reg 14 Note (iii) amalgamated exemption | `carveout` | Blocks execution of the base formula |
| Reg 14 reservation offset | `modifier` | Reduces effective amenity by existing reservation area |
| computeLOSRequirement | `geometry_constraint` + `formula` | Computes required ROS; deficiency triggers OSD premium |
| computeReg15IHFlag | `eligibility_gate` (warn) | Advisory only; no BUA effect |
| Reg 16 in-situ denial (SCHEMES_DENIED_INSITU_FSI) | `override` | Overrides the default Reg 16 in-situ FSI credit |
| analyseEligibility buildingAge gate | `eligibility_gate` (warn) | Sub-30 → warn, not block |
| analyseEligibility buildingType gate | `eligibility_gate` (fail) | Cessed/tenanted → hard block |
| analyseEligibility authorisationStatus gate | `eligibility_gate` (fail) | 'none' → hard block |
| analyseEligibility membersOnSamePlot gate | `eligibility_gate` (fail) | Hard block |
| incentiveBua max(15%, perTenement) | `incentive_rule` + `formula` | Max-of-two incentive paths |
| Dual-path max(rehabPath, reg30Path) | `formula` + `override` | The governance path decision |
| Fungible 35% cap | `fungible_rule` + `formula` | Uniform cap, all uses |
| Fungible rehab/sale split | `fungible_rule` + `modifier` | Determines premium liability |
| Premium FSI charge: BUA × load × ASR × 0.50 | `premium_rule` + `formula` | Reg 30(A)(6) |
| Fungible premium: saleBua × ASR × 0.50 | `premium_rule` + `formula` | Reg 31(3) — residential rate |
| OSD premium: deficient × ASR × 0.25 | `premium_rule` + `formula` | Circular concession rate |
| AutoDCR scrutiny fee | `formula` | Rate card head |
| Dev charges (land + BUA) | `formula` + `dependency` | MR&TP §124E |
| TDR scrutiny + infra charges | `formula` + `dependency` | Reg 32 circular |
| viabilityRatio thresholds | `formula` (heuristic) | Not regulatory — market heuristic |
| memberIncentiveShare allocation | `modifier` | User-variable split of incentive BUA |
| Flat breakdown bump factor | `formula` | Distributes member-side incentive proportionally to existing carpet |
| CARPET_TO_BUA = 1.20 | `modifier` | Conversion constant applied at input normalisation |
| clamp01 (load factors) | `modifier` | Input sanitiser |

---

## PHASE 11 — NORMALIZATION TARGETS

What should become declarative primitives as the engine evolves.

### Tier A: Shared Mechanics (reusable across schemes, already nearly parameterized)

| Target | Current State | Normalization Goal |
|---|---|---|
| `reg14_amenity_deduction` | Function, scheme-parameterized | Rule object with `condition` (zone, plot size, scheme) + `formula` (two-tier) + `modifier` (reduction factor) + `carveout` (Note iii) |
| `fsi_slab_lookup` | Table + function | Parameterized lookup rule: `{zone, roadWidth} → {basic, premium, tdr, max}` |
| `fungible_computation` | Inline in each scheme | Shared primitive: `{fsiBua, use, loadFactor} → {fungibleArea, cap}` |
| `fungible_premium_split` | Only in `_33_7B` | Should be in shared layer: `{fungibleArea, rehabShare} → {free, premium-liable}` |
| `premium_sheet` | Function, correct | Parameterize rate card constants (ASR, fee rates) as injectable context, not hardcoded |
| `reg16_insitu_denial` | Set + inline logic | Declarative dependency: `{schemeId} → denied: bool, reason: string` |
| `los_requirement` | Function | Declarative formula + geometry constraint: `{netPlot, zone} → {required, band}` |
| `carpet_to_bua` | Inline constant 1.20 | Named conversion factor with regulation citation |

### Tier B: Rule Objects (should become declarative JSON)

| Target | Current Form |
|---|---|
| buildingAge gate | `if (buildingAge < 30)` in function body |
| buildingType gate | `if (buildingType === 'cessed')` |
| authorisationStatus gate | `if (authorisationStatus === 'none')` |
| membersOnSamePlot gate | `if (!membersOnSamePlot)` |
| 33(7)(B) incentive formula | Inline in `computeBuildable_33_7B` |
| 33(9) cluster incentive | Inline in `computeBuildable_33_9` |
| Dual-path governance | Inline `max()` |

### Tier C: Amendment Overlay Architecture (not yet modelled)

These are currently hardcoded constants that will go stale:

| Constant | Should Become |
|---|---|
| Premium rate 50% (post-GR-expiry) | Amendment overlay: GR date + rate change |
| OSD 25% concession rate | Scheme-specific rate binding |
| AutoDCR fee rates (FY 2025-26) | Versioned rate card, injectable |
| Cess escalation formula (33(7)(A)) | Amendment rule with base year and step |

### Tier D: Spatial Primitives (partially present)

| Target | Current State |
|---|---|
| Ward detection (point-in-polygon) | Implemented via `detectWardFromCoords` + geojson |
| FSI zone classification | Encoded as 'islandCity' / 'suburbsExtended' user selection |
| Road width classification | Part of slab lookup |
| Plot-area based deduction bands | Embedded in Reg 14 and LOS functions |

### Tier E: Economic Primitives (partially present)

| Target | Current State |
|---|---|
| viabilityRatio computation | Implemented, thresholds are heuristic |
| memberEntitlement bump factor | Implemented (proportional carpet distribution) |
| devOffer comparison | State fields only (`devOfferRehab`, `devOfferSale`), no computation |
| Revenue vs premium vs construction | Not yet modelled (feasibility tab is incomplete) |

---

## STRATEGIC SYNTHESIS

### What the App Already Does Well

1. **The shared `computeBaseInputs` pattern** is the correct architecture. All schemes call it first; scheme-specific logic runs after. This is the foundation of the future rule engine.
2. **The dual-path governance** (`max(rehabPath, reg30Path)`) is correctly encoded and the `rehabPathGoverns` flag is already surfaced for explainability.
3. **The output object contract** (50+ fields, consistent shape across schemes) is a good implicit API contract for future schema definition.
4. **Load factors as strategy variables** (premium/TDR/fungible sliders) encode real planning workflow — this is not overhead, it is a core product feature.
5. **The eligibility system** (`fail` vs `warn` levels, per-gate `ref` citations) is already the skeleton of the explainability layer.

### What Must Be Preserved in Migration

1. **The sequencing of deductions** (road → Reg 14 → reservation → netPlot) — this order is not arbitrary.
2. **The two-path FSI governance** — do not simplify to a single formula.
3. **The load factor mechanics** — these are strategy inputs, not bugs.
4. **The fungible rehab/sale split** — already correct in `_33_7B`; must propagate to other schemes.
5. **The Reg 14 reservation offset** — an important interpretation that reduces developer's deduction.
6. **All `ref` citation strings** — these are the seed of the traceability layer.

### The Three Critical Gaps

1. **Reg 31(3) fungible premium rate differentiation** — commercial/industrial should be 60%, not 50%. Currently all uses get 50%.
2. **Per-number traceability** — no line-by-line calculation trail. The output is a result object, not a computation trace.
3. **Amendment overlay architecture** — rate cards and regulation amendments are hardcoded. Any GR that changes a rate silently breaks the computation.

### Migration Priority

```
Phase A: Normalize shared mechanics (computeBaseInputs → rule graph nodes)
Phase B: Wire regulations.patched.js schemes into production (33_7, 33_7A, 33_10, 33_11)
Phase C: Per-number calculation trace (explainability backbone)
Phase D: Amendment overlay architecture (decouple constants from logic)
Phase E: Spatial primitives (GIS-aware parcel context)
Phase F: Financial simulation (revenue, IRR, sensitivity)
```
