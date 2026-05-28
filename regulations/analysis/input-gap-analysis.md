# INPUT_GAP_ANALYSIS.md
# PlotIQ — User Input Inventory & Gap Analysis

**Date:** May 2026
**Source analysed:** `frontend/src/App.js` — `InputPanel`, `InteractiveResult`, `CompareOffer`, `MemberEntitlement`

---

## Complete Input Inventory (38 fields)

### Locate Plot

| Field | Type | Feeds |
|---|---|---|
| Google Maps link | text → auto-parse | ward, location, societyName, address |
| `societyName` | text | display only |
| `address` | text | display only |
| `location` | islandCity / suburbsExtended | FSI slab table selection |

### What to Assess

| Field | Type | Feeds |
|---|---|---|
| `reportScope` | entitlement / costsParking / full | shows/hides cost inputs and feasibility modules |

### Building Profile

| Field | Type | Feeds |
|---|---|---|
| `buildingAge` | years | eligibility gate (30yr min for 33(7)(B)) |
| `authorisationStatus` | oc / cc / tolerated / none | eligibility gate (incentive BUA permissibility) |
| `zone` | residential / commercial / mixed / industrial | Reg 14 deduction, LOS rules, fungible premium rate |
| `buildingType` | society / cessed / tenanted | scheme routing (hard fail gates) |
| `membersOnSamePlot` | toggle | eligibility gate |
| `gbResolution` | toggle | advisory warning only |
| `mixedTenancy` | toggle (hidden under "special conditions") | advisory warning only |
| `slumOnPlot` | toggle (hidden under "special conditions") | flag only — no computation |

### Plot Details

| Field | Type | Feeds |
|---|---|---|
| `plotArea` | sqm | everything |
| `roadWidth` | m | FSI slab selection |
| `dpRoadDeduction` | sqm | grossExclRoad, netPlot |
| `roadWideningProposed` | checkbox (appears only when roadWidth 6–9m) | 9m FSI band-shift |

**Advanced (hidden by default)**

| Field | Type | Feeds |
|---|---|---|
| `reservationDeduction` | sqm | netPlot, Reg 14 reservation offset |
| `isAmalgamated` + `smallestOriginalPlot` | checkbox + sqm | Reg 14 Note(iii) exemption |
| `reg14Override` + `reg14ManualValue` | checkbox + sqm | manual override of Reg 14 deduction |
| `losOverride` + `losManualValue` | checkbox + sqm | manual override of LOS area |
| `rosProposed` | sqm | OSD premium deficiency calculation |
| `specialLocation` | none / barc / crz | UI warning only — not wired into FSI computation |

### Existing Units

| Field | Type | Feeds |
|---|---|---|
| `buaInputMode` | breakdown / total | switches existingBua computation path |
| `flats[]` {label, carpet, count, use} | per-type array | existingBua, residentialFlats, incentivePerTenement, flatBreakdown |
| `totalExistingBua` + `tenementCount` | sqm + integer | existingBua in total mode |

### Cluster Scheme

| Field | Type | Feeds |
|---|---|---|
| `clusterOptIn` | toggle | routes computation to 33(9) |
| `clusterPlotArea` | sqm | 33(9) net plot |
| `clusterBuildings` | integer | display only |
| `clusterExistingBua` | sqm | 33(9) rehab base |
| `clusterApartments` | integer | display only |

### Land & Construction Rates (only visible in costsParking / full mode)

| Field | Type | Feeds |
|---|---|---|
| `asrLandRate` | ₹/sqm | all premium and fee calculations |
| `constructionRate` | ₹/sqm | labour welfare cess, TDR infra charge |

### Results Tab (interactive — not in InputPanel)

| Field | Type | Feeds |
|---|---|---|
| `premiumFsiLoad` | slider 0–1 | how much of available premium FSI to avail |
| `tdrLoad` | slider 0–1 | how much TDR to load |
| `fungibleLoad` | slider 0–1 | how much fungible area to avail |
| `memberIncentiveShare` | slider 0–100% | split of incentive BUA between members and developer |
| `devOfferRehab` | sqft carpet | developer offer comparison (CompareOffer panel) |
| `devOfferSale` | sqft carpet | developer offer comparison (CompareOffer panel) |

---

## Gap Analysis — Is It Enough?

### For the 3 live schemes: mostly yes, with 3 bugs/gaps

#### Gap 1 — Commercial flat count in total mode (active bug)

When `buaInputMode='total'`, `residentialFlats = tenementCount` — every flat is assumed residential. If a mixed-use building has commercial units:
- `incentivePerTenement` is overstated (commercial units don't qualify for the per-tenement incentive formula)
- Fungible premium rate is wrong (commercial should be 60% ASR, not 50%)

**Fix:** Add `commercialTenementCount` field in total mode (default 0). `residentialFlats = tenementCount − commercialTenementCount`.

---

#### Gap 2 — No numeric split of authorised vs. full existing BUA

`authorisationStatus` is categorical (oc/cc/tolerated/none) but the actual *quantum* of authorised BUA may be less than `totalExistingBua` if the building has unauthorized additions. The computation uses `existingBua` (full observed area) as the rehab base regardless. In practice, only the authorised BUA is guaranteed rehab entitlement — the unauthorized portion may or may not be regularized.

**Fix:** Optional `authorisedBua` field (default = existingBua). When provided, used as the effective rehab base instead of full existingBua.

---

#### Gap 3 — `specialLocation` is a warning, not a computation

BARC (M Ward, FSI 0.75) and Akse/Marve/CRZ (FSI 0.50) are flagged in the UI but `findFsiSlab()` still returns the standard Table 12 slab — FSI is silently overcalculated for these locations.

**Fix:** Wire `specialLocation` into `findFsiSlab()` to override the slab when set to 'barc' or 'crz'.

---

### For schemes not yet implemented: significant new inputs needed

#### Reg 33(7) — Cessed buildings (8 new inputs)

| Missing Input | Why Needed |
|---|---|
| `compositionMode` | single / composite_2to5 / composite_6plus / occupier_chs_cessexempt — determines incentive % (50% / 60% / 70%) |
| `occupants[]` {carpet, use} | occupants/tenants, not member-owners — different legal entity from society members |
| `mhadaSurplusPct` | MHADA's share of surplus BUA (MHAD Act 1976 Third Schedule) — variable by case, not publicly tabulated |
| `preSep1969` | boolean — cessed status typically requires pre-September 1969 construction |
| `consentPct` | actual % consent obtained — eligibility gate requires ≥51% |
| `mbrrbCertified` | boolean — MBRRB (not MCGM) must certify tenant list for 33(7) |
| `nonCessedPortion` | % non-cessed mixed structure — clause 19 fires when > 25% |
| `cessAmountPerFlat` | ₹ — informational for financial feasibility; affects cess liability |

---

#### Reg 33(7)(A) — Tenanted dilapidated buildings (7 new inputs)

| Missing Input | Why Needed |
|---|---|
| `tenants[]` {carpet, use} | tenants (not owner-members) — legal distinction matters for entitlement floor and incentive base |
| `compositionMode` | pure_tenant / composite_with_nontenanted / multi_plot_2to5 / multi_plot_6plus |
| `mcgmUnsafeDeclared` | boolean — MCGM must formally declare building structurally unsafe; eligibility gate |
| `mcgmTenantListCertified` | boolean — MCGM (not MBRRB) certifies tenant list for 33(7)(A) |
| `tenantsReaccommodated` | boolean — all tenants must be re-accommodated; eligibility gate |
| `preJun1996EvidenceType` | mcgm_extract / court_order / assessment_register — proof type that tenancy predates June 1996 |
| `cessRateBaseYear` | integer — cess escalation: ₹5,000 base + 10% every 3 years from 2018. System year can be auto-derived but needs confirmation. |

---

#### Reg 33(10) SRA / Reg 33(11) Transit — not yet scoped

Will need a separate data model. Indicative new inputs: eligible slum dweller count, SRA scheme type, slum survey number, eligible tenement area, MHADA/SRA authority involvement. Significantly different from the society redev model.

---

### For full feasibility: 5 missing financial inputs

These are required to compute project revenue, developer margin, and IRR — none currently exist:

| Missing Input | Why Needed |
|---|---|
| `saleRatePerSqft` | ₹/sqft — market sale rate for the location; needed for revenue projection |
| `corpusOffered` | ₹ lump sum — corpus fund offered by developer to society |
| `shiftingAllowance` | ₹/flat/month — temporary accommodation cost during construction |
| `projectTimeline` | years — construction timeline; needed for financing cost calculation |
| `tdrPurchaseRate` | ₹/sqm — cost of buying TDR in the market; needed for total project cost when TDR is loaded |

---

## Verdict

| Scope | Verdict |
|---|---|
| 33(7)(B) society redev — planning estimate | **Sufficient.** 3 gaps but none block a feasibility read. |
| 33(9) cluster — planning estimate | **Sufficient.** |
| Reg 30 standard FSI | **Sufficient.** |
| Adding Reg 33(7) cessed | **Not sufficient.** 8 new fields needed, including the MHADA Third Schedule % which requires external lookup. |
| Adding Reg 33(7)(A) tenanted | **Not sufficient.** 7 new fields needed. |
| Full financial feasibility | **Not sufficient.** Missing sale rate, corpus, shifting allowance, timeline, TDR cost. |

---

## Architecture Note

The existing input structure — progressive disclosure (basic / advanced / costs), toggle-revealed sections, dual BUA input mode — is the right pattern. It does not need redesign.

The next implementation wave (33(7) and 33(7)(A)) should add ~8 fields each as new **conditional sections** that appear only when `buildingType === 'cessed'` or `buildingType === 'tenanted'`. The rest of the form stays identical. The 3 current gaps are small targeted fixes, not structural changes.
