# Deduction Rules — Drafted from PDF before encoding

Reading source: `Research/comprehensive-dcpr-2034-peata.pdf` via /tmp/dcpr/full.txt
Verified PDF page numbers in `[brackets]`.

---

## The Master Rule — Reg 30(A)(2) [PDF p. 167]

> *"The permissible FSI shall be on plot area excluding area under DP roads / roads for which sanctioned Regular line as per MMC Act is prescribed, as per Regulation 16, Regulation 14 (amenity plots), and area of DP Reservation to be surrendered to MCGM / Appropriate Authority under Regulation 17."*

So the canonical net plot is:

```
Net Plot = Gross Plot
           − DP road / Regular line set-back               [Reg 16, Reg 30(A)(2)]
           − Reg 14 amenity area to be handed over          [Reg 14, Reg 30(A)(2)]
           − Reg 17 reservation area to be surrendered      [Reg 17, Reg 30(A)(2)]
```

**Reg 30(A)(4) — which would have allowed FSI on gross (including amenity surrender etc.) — is KEPT IN ABEYANCE.** So we do NOT use that.

---

## What is NOT a deduction from gross plot (counter-intuitive)

These reduce buildable area in *other* ways but don't reduce the FSI base:

- **Reg 15 Inclusive Housing** [PDF p. 102]: 20% of plot ≥ 4,000 sqm handed over to MCGM, but **FSI of handed-over portion is loadable on balance plot**. So no net deduction. Calculator should flag this for plots ≥ 4,000 sqm but not deduct from gross.
- **Reg 27 Layout Open Space (LOS)** [PDF p. 157]: occupies *space within the plot* (a rec ground inside the layout). Does not reduce FSI computation. Computed on net plot per Reg 27 Note 1. Calculator should compute and display LOS as a *site planning constraint*, not as an FSI deduction.

---

## Reg 14 — Amenity Surrender [PDF p. 98–99]

### Trigger
Plot area ≥ **4,000 sqm** (excluding road set-back / DP road) in Residential or Commercial zone.

### Quantum
| Plot area band | Amenity to MCGM |
|---|---|
| 4,000 – 10,000 sqm | **5% of plot area** |
| > 10,000 sqm | **500 sqm + 10% of (area − 10,000)** |

### Important variations (Reg 14 Note ii):
For redevelopment under **33(7), 33(7)(A), 33(10)**, amenity is **reduced to 35% of the prescribed amount**.
**For 33(7)(B) and 33(9), the FULL amenity applies** (no reduction).

### Edge cases:
- If DP reservation already on plot ≥ required amenity → no separate amenity needed (Reg 14(A)(b))
- If DP reservation < required amenity → only the additional area required (Reg 14(A)(a))
- For amalgamated plots: no amenity if any original < 4,000 sqm UNLESS amalgamated total > 20,000 sqm (Note iii)

### Encoding rule:
```
if grossPlot ≥ 4000 and zone in {residential, commercial, mixed}:
    if scheme in {standard_reg30, 33(7)(B), 33(9)}:
        reduction_factor = 1.0    // full amenity
    elif scheme in {33(7), 33(7)(A), 33(10)}:
        reduction_factor = 0.35   // reduced per Note ii
    
    if 4000 ≤ grossPlot ≤ 10000:
        amenity = grossPlot * 0.05 * reduction_factor
    else:  # > 10,000
        amenity = (500 + 0.10 * (grossPlot - 10000)) * reduction_factor
```

---

## Reg 16 — Road Widening / DP Road Set-back

Plot area falling under sanctioned DP road or Regular Line per MMC Act → handed over → deducted from gross plot for FSI purposes (Reg 30(A)(2)).

User must input. We can't infer this from address (no API for DP plans). Manual input only.

### Special bonus (Note 1 to Table 12) — *not a deduction but worth noting*:
> Plots abutting roads of existing width 6m to <9m, **proposed to be widened to 9m or more** → permissible FSI is per the **9m+ slab** (i.e., they get the higher FSI as if road were already widened).

UX implication: when user enters road width 6–8m, ask: "Is this road proposed to be widened to 9m or more under DP?" If yes, apply 9m FSI slab.

---

## Reg 17 — DP Reservation Surrender [PDF p. 106–108]

If plot has a DP reservation (school, garden, hospital, etc.):
- Owner can develop under **Accommodation Reservation (AR)**
- Hands over **Y%** of reserved plot area + **X%** Basic FSI as built-up amenity
- Y and X depend on reservation type — Table 5 of Reg 17

### For our calculator:
- Manual input for reservation area
- If non-zero, show warning: "DP reservations can be developed under Reg 17 Accommodation Reservation. The Y% area handover and X% BUA values depend on reservation type (Table 5). Consult an architect."
- For MVP, assume the user inputs the area to be deducted (they would know from architect/property card)

---

## Reg 27 — Layout Open Space (LOS) [PDF p. 157]

NOT a deduction from gross plot for FSI — but a **site planning constraint** the chairman should know.

### Bands (Residential/Commercial):
| Plot area | LOS % of net plot |
|---|---|
| ≤ 1,000 sqm | None |
| 1,001 – 2,500 sqm | **15%** |
| 2,501 – 10,000 sqm | **20%** |
| > 10,000 sqm | **25%** |

(Note: my earlier code had 8/10/12/15 — wrong. Correct values from PDF p. 157.)

### Calculation base [PDF p. 159, Note 1]:
> *"The area of LOS shall be calculated on the area excluding the areas under DP road / setback / reservations area to be handed over to appropriate authority"*

So LOS is calculated on **net plot after deductions**, not gross.

### Reduction option (planning constraints):
For redev under **33(5), 33(7), 33(8), 33(15), 33(20)(A)** — LOS may be reduced to **minimum 10%** due to planning constraints.
For **33(7)(A), 33(7)(B), 33(9), 33(10)** — full LOS applies.

### Encoding:
Show LOS as an "indicative site constraint" line in the area statement, not as a deduction. Compute on net plot.

---

## Reg 30 / Table 12 — Road-Width Bonus

When user enters road width:
- **Existing < 6m** — basic FSI per <9m row applies (1.33 Island City / 1.00 Suburbs); no premium, no TDR available
- **6m to <9m, no widening proposal** — same as above
- **6m to <9m, with widening proposal to ≥9m** — permitted to use 9m slab (Note 1)
- **≥9m** — full slab access

We add a checkbox: "Is this road being widened to 9m+ under DP?"

---

## Reg 30 special sub-rows (informational flags)

- **BARC area, M Ward** — basic FSI 0.75 (not 1.0)
- **Aksa, Marve, Erangal CRZ-affected (P/N Ward)** — basic FSI 0.50

These are exceptional locations. We don't need to encode logic, but if user enters a Suburbs location and the ward is M-East/M-West, P-North — show a flag: "Specific micro-locations within this ward may have reduced FSI (BARC area = 0.75; Aksa/Marve/Erangal CRZ = 0.50). Verify with architect."

---

## Abeyance Status — relevant for our scope

Searched all "kept in abeyance" mentions. For our 5 schemes:

| Scheme | Abeyance issues |
|---|---|
| Standard Reg 30 | Reg 30(A)(3)(c) [TDR for unconsumed BUA] and Reg 30(A)(4) [FSI on gross including surrender] kept in abeyance — but these don't affect our standard computation |
| 33(7) | None affecting our math |
| 33(7)(A) | None |
| 33(7)(B) | None |
| 33(9) | None |
| 33(10) | None |

The schemes in our scope are all operationally live. **33(23) TOD is fully in abeyance** but isn't in our scope. **Reg 35 mill land** has multiple abeyance items but isn't in our scope.

We will still build a `schemeStatus.abeyance: false` field per scheme in the engine, with the disclaimer pattern, so we're future-proofed.

---

## Section A in Area Statement — Restructured

Based on the above, Section A becomes:

```
A — Plot Computation & Deductions
─────────────────────────────────────────────────────
A.1  Gross plot area                              X sqm  [user input]

A.2  DEDUCTIONS (Reg 30(A)(2))
     - DP road / Regular line set-back            -X sqm  [Reg 16, manual]
     - Reg 14 amenity to MCGM (auto-applied)      -X sqm  [Reg 14, auto if plot≥4000]
       → applies at full / reduced rate?  (full for 33(7)(B), 33(9))
     - DP reservation handover                    -X sqm  [Reg 17, manual]
                                                  ─────
A.3  Net plot area for FSI                         Y sqm

A.4  SITE PLANNING CONSTRAINTS (informational, not deductions)
     - Layout Open Space (Reg 27) @ Z%             X sqm  [auto if net plot ≥ 1000]
     - Reg 15 Inclusive Housing (if plot ≥ 4000)   X sqm  [flag only — FSI is loadable]
                                                                   on balance plot]

A.5  FLAGS
     [If road 6–<9m] "Is road widening proposed?"  toggle → applies 9m FSI slab
     [If micro-locations matter] BARC / Aksa / etc. caution
```

Each deduction has:
- **Auto-applied checkbox** (default ON when rule triggers)
- **Override field** allowing user to set 0 or a different value with reason
- **Reg reference** in the Area Statement output

---

## What I want to confirm before coding

1. **Reg 14 amenity for 33(7)(B)**: I read Note ii as 33(7)(B) being **excluded** from the 35% reduction (i.e., full amenity applies). Read again, the Note says: "In case of redevelopment under 33(7), 33(7)(A), 33(10) amenity as per this Regulation shall be reduced to 35%." 33(7)(B) is conspicuously absent. **Should we treat 33(7)(B) as: (a) full amenity, or (b) by analogy to 33(7) and 33(7)(A), also 35% reduced?**

   My read: full amenity, since the regulation chose to exclude it from the list. But practising architects sometimes apply the reduction by analogy. Tell me your view.

2. **LOS as line-item or hidden**: For a chairman, "your plot needs 15% LOS" might be useful or might be noise. Should LOS show in the Area Statement Section A.4 always, or only as a flag/explainer for plots > 1,000 sqm?

3. **Mixed-use building (Reg 33(7)(B) clause 8)**: If a society plot has both tenanted + non-tenanted buildings, regulation says to split into proportional notional plots and apply 33(7)(A) and 33(7)(B) separately. **Encode this as a future feature** or **flag-only for MVP**? My recommendation: flag-only (a chairman with a mixed building should see an architect anyway).

4. **The road-widening 9m bonus**: encode as a checkbox the user toggles, or detect from a "DP road plan" question? My recommendation: simple checkbox: "Is your abutting road being widened to 9m+ under DP?"

If you confirm these four, I'll move to the coding phase. The encoding work should take 60–90 min and produce:
- Restructured `computeBuildable()` with proper net plot
- Auto-applied deductions with override toggles
- New Section A.1–A.5 in the area statement
- New input fields for the toggles/flags
- Per-scheme deduction routing (so 33(7) and 33(7)(A) get the 35% reduction; 33(7)(B) and 33(9) don't)
- Abeyance scaffold per scheme

After deductions, we move to schemes — but only one at a time, same workflow: re-read PDF, draft rules, you confirm, then encode.
