# Schemes — Drafted from PDF before encoding

Reading source: `Research/comprehensive-dcpr-2034-peata.pdf` via /tmp/dcpr/full.txt
PDF page numbers in `[brackets]`.

---

## Routing & Detection — How the calculator picks a scheme

The user does not pick. Their inputs route them. Logic tree:

```
Step 1 — Cluster opt-in?
  IF user has explicitly toggled "Combine with neighbouring societies (cluster)"
  AND total cluster area ≥ minimum (4,000 Island City / 6,000 Suburbs)
  → Reg 33(9) Cluster Development Scheme

Step 2 — Building type?
  IF buildingType == 'cessed' AND age >= 30 (any age accepted; cess status itself is the gate)
  → Reg 33(7) Cessed building redev (Island City only — flag if Suburbs)

  ELSE IF buildingType == 'tenanted' AND structurally unsafe declared
  → Reg 33(7)(A) Dilapidated tenanted redev

  ELSE IF buildingType == 'society' AND age >= 30
  → Reg 33(7)(B) Society redev  [the existing scheme]

  ELSE
  → Standard Reg 30 (greenfield / under-30-yr / no Reg 33 scheme available)

Step 3 — Slum on plot? (informational only — doesn't change the scheme)
  IF user toggled "slum on part of plot"
  → Add 33(10) advisory flag — needs separate scheme analysis for the slum portion
```

**UX:** highlight the auto-detected scheme. Show all schemes user could opt into in a dropdown, with each tagged ✓ Eligible / ✗ Not eligible (with reason) / ⊙ Available (cluster opt-in).

---

## Reg 33(7) — Cessed Building Redev (Island City) [PDF p. 207–212]

### Eligibility gates (in order)
1. **Plot in Island City** (south of Mahim/Sion). Suburbs → fail.
2. **Building paying MHADA cess** (under MHAD Act, 1976), OR municipal Corporation building, **existing prior to 30/9/1969**.
3. Either: landlord, Co-op Society of landlords, Co-op Society of tenants, or Co-op Society of occupiers (multiple paths).
4. **51% irrevocable consent** of occupiers (clause 1(a)).
5. **All eligible occupants** (cessed AND non-cessed pre-30.09.1969) re-accommodated (clause 1(b)).
6. List certified by MBRRB (Mumbai Building Repairs & Reconstruction Board) — clause 3.

### FSI math — 5(a) base case [p. 209]
> *"FSI shall be 3.00 of the gross plot area or the FSI required for rehabilitation of existing occupiers plus 50% incentive FSI whichever is more"*

**Variations per number of plots in joint redev:**
| Plots in joint redev | Incentive FSI on rehab | Additional rehab carpet % | Source |
|---|---|---|---|
| Single plot (5(a)) | **50%** | **5%** | clause 5(a) |
| 2–5 plots joint (5(b)) | **60%** | **8%** | clause 5(b) |
| ≥ 6 plots OR municipal density >650/ha (5(b) proviso) | **70%** | **15%** | clause 5(b) |
| Co-op Society of occupiers, formerly cessed but now exempt (5(c)) | **50%** | n/a (5(c) cap is 2.5 not 3.0 FSI) | clause 5(c) |

**Math:**
```
For single-plot 5(a):
  rehabCarpet = sum of existing residential carpet (min 27.88 sqm, max 120 sqm per occupier)
              + sum of non-residential carpet (= existing area)
  rehabCarpetWithBonus = rehabCarpet × 1.05  // 5% additional
  rehabBua = rehabCarpetWithBonus × 1.2      // BUA factor on carpet
  incentiveFsi = rehabBua × 0.50              // 50% incentive
  schemeBua = rehabBua + incentiveFsi
  
  governingBua = max(schemeBua, 3.00 × grossPlot)   // "or 3.00 whichever is more"
  
  Note: if scheme uses rehab+incentive route AND it exceeds 3.0 FSI, the extra
  for 5%/8%/15% bonus carpet is permitted ABOVE the 3.0 cap (clause 5 Note)
```

### Other key rules
- **Tenement carpet limits:** min 27.88 sqm (300 sqft), max 120 sqm (1292 sqft) free; above 120 sqm tenant pays cost (clause 2).
- **Cut-off date:** No tenancy created after 13/6/96 considered (clause 13).
- **20% of incentive can be non-residential** (clause 9).
- **Fungible:** standard Reg 31(3) on exclusions — clause 12 confirms.
- **Premium reduction (clause 8):** premium for additional FSI on premium reduced to **10% of normal premium OR 2.5% of ASR** for FSI 1, whichever is more.
- **Additional dev cess clause 15:** 100% of dev charges OR ₹5,000/sqm whichever is more, on BUA above existing.
- **9m road minimum for height >32m (clause 21).**
- **5(b) joint-plot route is strongly incentivised** — likely a future "explore joint redev" CTA.

### Abeyance
None affecting our math.

### What we tell a society chairman who shouldn't be here
If a 33(7) plot ends up in our calculator (chairman picked "society" but it's actually cessed-then-bought-by-society), we route to clause 5(c) — 2.5 FSI cap, 50% incentive.

---

## Reg 33(7)(A) — Dilapidated Tenanted [PDF p. 213–216]

### Eligibility gates
1. **Building authorised** (has plans/CC/OC) — same as 33(7)(B).
2. **Building type: tenant-occupied** (NOT member-owned coop). Reads as the inverse of 33(7)(B).
3. **Suburbs/Extended Suburbs** (any non-cessed building anywhere also qualifies for non-cessed Mumbai City case).
4. **Declared unsafe for human habitation** by competent authority — or order to demolish, certified.
5. **51% tenant consent** (Appendix 2(a)).
6. **All tenants re-accommodated** (Appendix 2(b)).

### FSI math — clause (a)/(b)
> *"FSI shall be equal to FSI required for rehabilitation of existing lawful tenant plus 50% incentive FSI and the occupier shall be eligible for 5% additional rehab carpet area."*

**Joint redev variations (Appendix proviso):**
| Plots in joint redev | Incentive FSI | Additional rehab carpet % |
|---|---|---|
| Single plot (clause a) | **50%** | **5%** |
| 2–5 plots joint | **60%** | **8%** |
| ≥ 6 plots joint | **70%** | **15%** |

Composite (b): tenant-occupied + non-tenanted on same plot →
```
schemeFsi = rehab_for_tenant + 50% incentive on rehab + already-utilised FSI of non-tenanted
```

### Carpet rules [Appendix clause 3]
- min 27.88 sqm (300 sqft), max 120 sqm (1292 sqft) free
- above 120 sqm → tenant pays cost; carpet >120 considered for **rehab FSI** but NOT for **incentive FSI**
- non-residential occupant: existing area, no minimum

### Reg 30 fallback [clause 20] — IMPORTANT
> *"If the rehab plus incentive as per this regulation is less than the permissible FSI as per regulation 30, then the owner may opt for development up to permissible FSI by availing TDR/Additional FSI on payment of premium at 50% rate of normal premium as per Regulation 30."*

**This is parallel to the 33(7)(B) proviso.** The user can top up via Premium FSI/TDR up to Reg 30 ceiling, at HALF the normal premium rate.

### Other rules
- **Fungible:** clause 13 — fungible on rehab is **without premium**, cannot be used for free-sale, used for additional area to existing tenants
- **Cut-off date:** No tenancy after 13/6/96 (clause 4)
- **Dev cess:** ₹5,000/sqm × BUA (clause 15)
- **Cluster guideline:** 9m road for height >32m (per Reg 30 note)
- **Premium reduction (clause 21):** even more — 10% normal premium / 2.5% ASR (whichever higher)

### Abeyance
None affecting our math.

---

## Reg 33(7)(B) — Already encoded [PDF p. 215–216]

### What changes with the routing
- Eligibility gates already in place — no change.
- The calculator currently hardcodes scheme = `reg33_7B`. We replace with auto-detection that lands on this for the standard society case.
- Reg 14 amenity: full rate (already encoded).

---

## Reg 33(9) — Cluster Development Scheme [PDF p. 223–230+]

### Eligibility gates
1. **Cluster minimum area:** **4,000 sqm Island City / 6,000 sqm Suburbs** (clause 1.1).
2. **Bounded by physical boundaries** (roads, nallas, railway lines).
3. **Access by 18m DP road minimum**, or 12m dead-end ex-18m road with HPC traffic study approval.
4. Cluster can include (clause 1.2):
   - Cessed Island City buildings
   - 30+ year MHADA-acquired buildings
   - **30+ year authorised buildings** (this includes societies — so society plot = clause 1.2(ii)(b))
   - 30+ year govt/MCGM/MHADA buildings
   - Dilapidated buildings (1.2(iv))
   - Slums on public land pre-1.1.2000 (≤50% of cluster, clause 1.2(v))
5. **Impact Assessment Study** required.
6. **51%+ consent** (varies by sub-group; need to verify).

### FSI math
> *"FSI shall be 4.00 or the FSI required for rehabilitation of existing tenants/occupiers plus incentive FSI whichever is more"*

**Specific incentive rates by occupier type — vary across the long Appendix.** For our MVP target (society plot ≥ 4,000 sqm Island City / ≥ 6,000 sqm Suburbs, opting into cluster), the relevant clause for cooperative society members is the same incentive structure as 33(7)(B) but with the FSI cap raised to 4.00.

**Conservative encoding for MVP:**
```
clusterRehabBua = sum across all society members in cluster of (existing carpet × 1.2)
clusterIncentive = clusterRehabBua × 0.50  // standard incentive
schemeFsi = clusterRehabBua + clusterIncentive
governingBua = max(schemeFsi, 4.00 × grossClusterPlot)
```

**Honest disclosure:** for the MVP the chairman will likely not have data on neighbours' existing BUA. So cluster math should display:
- Aggregate cluster plot area (input)
- Indicative buildable BUA at 4.0 FSI ceiling
- Note: "Detailed cluster computation requires aggregating existing BUA from all participating societies. Engage a Licensed Architect once neighbour consent is in hand."

### Abeyance
None affecting our math.

### What 33(9) does for a society chairman (the framing)
"If you and 1-2 neighbouring societies combine to make ≥ 6,000 sqm (Suburbs), you can access cluster development with FSI of 4.00 — meaningfully more than 33(7)(B)'s typical realistic ceiling of 2.4. The trade-off is coordinating consent across multiple societies and a longer approval timeline."

---

## Reg 33(10) — Slum Rehabilitation Scheme — FLAG ONLY

### Why flag-only (not full computation)
- Eligibility is per-dweller, not per-society
- Cut-off date 1.1.2000 with documentation
- Math involves SRA-determined sale-rehab ratio (varies by land tenure)
- Real users (society chairmen with slum encroachment) need an SRA consultant, not our calculator

### What we do
If user toggles "slum encroachment on part of plot":
- Show flag card: "Slum portion needs separate analysis under Reg 33(10)"
- List the typical entitlement (27.88 sqm per eligible dweller, cut-off 1.1.2000)
- Recommend SRA consultant
- Note: under 33(7) clause 20(a), MCGM-owned plots with partial slum can integrate; under 33(7)(B) there's no equivalent

---

## Reg 30 — Standard greenfield (fallback)

When buildingAge < 30 OR (no scheme matches), present the standard Reg 30 / Table 12 result:
- Basic FSI on net plot (already encoded as `baseFsiBua`)
- Premium FSI option (already encoded)
- TDR option (already encoded)
- Fungible 35% (already encoded)
- This is the "no incentive scheme" baseline

---

## What I'm asking you to confirm before encoding

**Q1.** **33(9) Cluster math depth.** For MVP, do we:
   (a) Show only the 4.00 FSI ceiling × cluster plot — simplest, no neighbour-data needed
   (b) Take aggregate cluster plot + aggregate cluster existing BUA as inputs; compute rehab+incentive scheme as well
   
   My recommendation: **(a)** for MVP. Add a "Calculate full cluster math" CTA that opens an extended panel asking for neighbour data — only if the user wants it. Most chairmen exploring cluster won't have neighbour BUA data.

**Q2.** **33(7) joint-plot incentive.** The 60%/70% bands for 2-5 / 6+ plots are huge incentives. Do we:
   (a) Default to single-plot 50% incentive — simplest
   (b) Add a "How many plots in joint redev?" input field (1, 2-5, 6+)
   
   My recommendation: **(b)** with a default of 1. The jump from 50% to 70% incentive is so material that hiding it would be misleading. Same applies to 33(7)(A).

**Q3.** **Mumbai City vs Suburbs gating for 33(7).** 33(7) is Island City-only (cessed buildings exist there pre-1969). If user has Suburbs + cessed → that's almost certainly a data-entry error or the building isn't actually cessed. Do we:
   (a) Hard-fail with explanation
   (b) Soft-warn but compute anyway
   
   My recommendation: **(a)** hard-fail. Real chairmen of cessed buildings know they're in Island City; if Suburbs+cessed appears, it's a mistake.

**Q4.** **Eligibility-trace UI** I sketched above (the "Why this scheme?" panel showing each gate ✓/✗). Is the tone right? Should it be:
   (a) Always visible at top of result section (anchors trust)
   (b) Behind a "Why this scheme?" expander
   
   My recommendation: **(a)** always visible. This *is* the trust mechanism Q2 from your previous reply asked for.

**Q5.** **Premium reduction in 33(7) and 33(7)(A).** Both have a 10% normal premium / 2.5% ASR (whichever higher) for additional Premium FSI. This is dramatically lower than 33(7)(B) which uses standard 50%-of-ASR-with-50%-cut-via-directive. For 33(7)/33(7)(A) Premium FSI loadings, do we encode the lower rate per these clauses?
   
   My recommendation: **yes** — 10% / 2.5% ASR for 33(7) and 33(7)(A); standard rate (50% × 50% directive) for 33(7)(B) and 33(9).

---

## After your sign-off, the encoding plan

Order:
1. Extract scheme-routing function `detectApplicableScheme(input)` — auto-detects + lists all options
2. Generalise `computeBuildable(input)` to take a `scheme` param and route to scheme-specific math
3. Add `computeBuildable_33_7(input)`, `_33_7A(input)`, `_33_9(input)` functions; keep `_33_7B` as it is (rename for clarity)
4. UI: scheme picker (auto-selected, dropdown to override; eligibility tags on each option)
5. UI: eligibility-trace panel "Why this scheme?"
6. UI: scheme-specific input fields shown only when relevant (cessed proof, joint plots count, cluster opt-in, slum flag)
7. Update Area Statement section C to reflect chosen scheme's incentive math (currently hard-codes 33(7)(B))

Encoding effort estimate: 3-4 hours of careful work. I'll check in after each scheme is encoded so you can verify the math before I move to the next.
