# regulations.js — Verification Report

**Source verified against:** PEATA Comprehensive DCPR 2034 (708 pp, 2021 ed.)
**Date:** May 2026
**Scope:** Tier-1 schemes (33(7), 33(7)(A), 33(9), 33(10), 33(11)) and the shared mechanics (Reg 14(A), 31(3))

---

## TL;DR

The pseudocode is mostly correct on regulation interpretation. Three real bugs found and patched. All `// TODO` ambiguities in the original file are resolved against the PEATA source. A working patch (`regulations.patched.js`) is included with a passing smoke test.

---

## Verification methodology

For each citation in `regulations.js`, the source text was located in the PEATA edition by either (a) `pdftotext` extraction with `grep` anchoring, or (b) direct page rasterization (`pdftoppm`) where text extraction was unreliable (parallel English/Marathi columns, OCR'd scans). Page references below are the PEATA printed page number, not the physical PDF page.

Three categories of finding:

1. **CONFIRMED** — the regulations.js value/citation matches the PEATA text verbatim or as a faithful paraphrase.
2. **BUG** — the regulations.js value/citation contradicts the PEATA text.
3. **OPEN** — could not be verified from the materials at hand and requires the App.js live implementation or an external (MHADA Act, GR circular) source.

---

## Reg 33(7) — Cessed Buildings in Island City

PEATA pp. 151–156. Twenty-one clauses (not 20 — earlier 2018 base PDF stopped at 20; clause 21 added in PEATA).

| Code element | PEATA evidence | Result |
|---|---|---|
| `compositionMode 'single'`: 50% incentive, 5% addl, gate 3.0 | clause 5(a), p. 153 | CONFIRMED |
| `compositionMode 'composite_2to5'`: 60% incentive, 8% addl | clause 5(b), p. 153 | CONFIRMED |
| `composite_6plus` / `municipal_dense`: 70% incentive, 15% addl | clause 5(b) proviso, p. 154 | CONFIRMED |
| `occupier_chs_cessexempt`: 50% incentive, gate 2.5 | clause 5(c), p. 154 | CONFIRMED |
| 27.88 sqm floor / 120 sqm cap per occupant | clause 2, p. 152 | CONFIRMED |
| Beyond 120 sqm counts for rehab FSI, not for incentive FSI | clause 2 proviso, p. 152 | CONFIRMED |
| 51% irrevocable consent | clause 1(a), p. 152 | CONFIRMED |
| MBRRB certifies tenant list | clause 3, p. 152 | CONFIRMED |
| 5(b) Note carve-out (FSI 3.0 may be exceeded by addl rehab BUA) | clause 5(b) Note, p. 154 | CONFIRMED |
| 20% of incentive usable for non-residential | clause 9, p. 155 | CONFIRMED |
| Premium = max(10% normal, 2.5% ASR per FSI 1) | clause 8, p. 154 | CONFIRMED |
| LOS minimum 10% | clause 8 proviso, p. 154 | CONFIRMED |
| Cess Rs 5000/sqm (no escalation clause for 33(7)) | clause 15, p. 155 | CONFIRMED |
| No new tenancy post 13/6/1996 | clause 13, p. 155 | CONFIRMED |
| 25% non-cessed mixed-structure trigger | clause 19, p. 156 | CONFIRMED |
| **9m road essential for height >32m** as clause 21 | **clause 21, p. 156** | **CONFIRMED** (this clause exists in PEATA; was absent in the 2018 base text) |
| Fungible computation calling `_fungibleArea(fsiBua, 'residential', load)` | clause 4 + Reg 31(3), pp. 152, 120 | **BUG** — see Patch #2 |

### Bug in 33(7) fungible handling (Patch #2)

The original code computed fungible on the entire `fsiBua`. The PEATA Reg 31(3) proviso (p. 120) lists 33(7) explicitly among schemes where fungible on the AH/R&R component is granted without premium. Combined with 33(7) clause 4 (p. 152) — "Fungible Compensatory Area as applicable on the surplus area to be handed over to MHADA/MCGM shall not be allowed to be utilized on sale component. No premium shall be charged on the fungible compensatory area in respect of area to be handed over" — the calculation must split rehab and sale, the same way `computeBuildable_33_7A` already did. The patch implements that split.

---

## Reg 33(7)(A) — Tenanted Dilapidated/Unsafe Buildings (non-cessed)

PEATA pp. 157–160. The body is followed by an **Appendix** running clauses 1–21.

| Code element | PEATA evidence | Result |
|---|---|---|
| `pure_tenant`: 50% incentive + 5% addl carpet | head clause (a), p. 157 | CONFIRMED |
| `composite_with_nontenanted`: 50% + addl FSI consumed by non-tenanted | head clause (b), p. 157 | CONFIRMED |
| `multi_plot_2to5`: 60% + 8% | Appendix proviso, p. 157 | CONFIRMED |
| `multi_plot_6plus`: 70% + 15% | Appendix proviso, p. 157 | CONFIRMED |
| 27.88 / 120 sqm floor/cap | Appendix clause 3, p. 158 | CONFIRMED |
| 51% consent | Appendix clause 2(a), p. 157 | CONFIRMED |
| All tenants re-accommodated | Appendix clause 2(b), p. 157 | CONFIRMED |
| MCGM (not MBRRB) certifies tenant list | Appendix clause 5, p. 158 | CONFIRMED |
| No tenancy post 13/6/1996; MCGM 1995-96 extract / Court order proof | Appendix clause 4, p. 158 | CONFIRMED |
| FSI computed on entire plot incl. DP/internal roads, excl. reservation | Appendix clause 10, p. 159 | CONFIRMED (note: `fsiPlotForCalc` variable is correctly computed at line 447, but never used downstream — see "Style/cleanup" below) |
| 20% of incentive for non-residential | Appendix clause 12, p. 159 | CONFIRMED |
| Rehab-component fungible: no premium, no sale-use, given to tenants | Appendix clause 13, p. 159 + Reg 31(3) proviso | CONFIRMED |
| ₹5,000/sqm cess, +10% every 3 years (base from existing FSI, post-Reg-30) | Appendix clause 15, p. 159 | CONFIRMED |
| Start within 1 yr, complete within 5 yrs | Appendix clause 17, p. 159 | CONFIRMED |
| **Clause 20: Reg 30 fallback at 50% premium** | Schedule of GR 13.09.2019, PEATA p. 518 | CONFIRMED (post-amendment text) |
| **Clause 21: premium 10% normal OR 2.5% ASR (whichever more)** | Schedule of GR 13.09.2019, PEATA p. 518 | CONFIRMED |

### Resolution of `// TODO` at line 428 of original

The original asked: *"GR 14.01.2021 family of premium-halving amendments. TODO: confirm whether 33(7)(A) premium under clause 21 was also halved or whether the 50% in clause 20 was the only impact."*

**Answer (from PEATA p. 516–518, GR dated 13 September 2019, GR No. TPB-4318/629/CR-55/2019/UD-11):**

The GR 13.09.2019 *introduced* clause 21 of Reg 33(7)(A) with the (10%, 2.5%) formula as its original text — it was not a halving of an earlier rate. The same GR rewrote clause 20 to charge premium at "50% rate of Normal Premium as per Regulation 30" (versus the original 33(7)(A) text which said "premium as per Regulation 30" — i.e., full rate). GR 14.01.2021 is a separate amendment that primarily affected 33(7)(B); it did not further modify 33(7)(A) clauses 20–21.

The Schedule table extracted from PEATA p. 518 (rasterized; not from text-layer):

| Regulation | Existing provision | Sanctioned provision |
|---|---|---|
| Clause 20 of 33(7)(A) | "...payment of premium **as per Regulation 30**" | "...payment of premium at **50% rate of Normal Premium** as per Regulation 30" |
| New clause 21 added | — | Relaxations of Reg 33(10) cl. 6 except 6.11, 6.16, 6.18. Premium = max(10% normal, 2.5% ASR per FSI 1) |

regulations.js line 535 (`Math.max(normalPremium * 0.10, altPremium)`) is therefore **correct**.

---

## Reg 14(A) — Amenity Deduction

PEATA p. 42.

| Code element | PEATA evidence | Result |
|---|---|---|
| 4000–10000 sqm: hand over 5% | Reg 14(A)(i) | CONFIRMED |
| > 10000 sqm: 500 + 10% × (plot − 10000) | Reg 14(A)(ii) | CONFIRMED |
| 33(7)/33(7)(A)/33(10): amenity reduced to 35% | Reg 14(A) Note (ii) | CONFIRMED |

---

## Reg 31(3) — Fungible Compensatory Area

PEATA p. 120.

| Code element | PEATA evidence | Result |
|---|---|---|
| Fungible cap = 35% for residential | Reg 31(3) head | CONFIRMED |
| Fungible cap = 20% for commercial | Reg 31(3) head | **BUG** — PEATA explicitly says "**not exceeding 35% for residential/Industrial/Commercial development.**" The 35% cap is uniform. See Patch #1. |
| Premium rate 50% residential, 60% commercial/industrial | Reg 31(3) head | CONFIRMED (modulo the use bucket: industrial pays the higher rate, same as commercial) |
| Rehab-side fungible on 33(7)/33(7)(A)/33(8)/33(9)/33(9)(B)/33(20)/33(10): no premium | Reg 31(3) proviso | CONFIRMED |

The "20%" in the original code appears to be a misreading of the next sentence: "[premium] **shared between MCGM, State Govt. and MSRDC (for Sea Link) in 50%, 30% and 20% respectively**." That 50/30/20 is the inter-government share split, not a sectoral cap.

---

## Reg 33(8), 33(9), 33(10), 33(11) — Spot checks for the Tier-1 list

These functions are not in the original file (they're scoped as future Tier-1 work), but a few foundational values relevant to App.js or future implementations were verified:

| Item | PEATA evidence | Result |
|---|---|---|
| Reg 33(8) SDZ — BUA:carpet = 1.2 | clause E(b), p. 163 | CONFIRMED. **This is the regulation-cited basis for `CARPET_TO_BUA = 1.20`** used in 33(7) and 33(7)(A). The original code called it a "working factor (App.js convention)" — it is in fact regulation-grounded. The patched file cites this clause. |
| Reg 33(10) URS — total permissible FSI = 4.00 on gross plot | clause 4(a), p. 188 | CONFIRMED |
| Reg 33(10) — incentive table keyed on Basic Ratio (LR/RC) × scheme area | Table B, p. 188 | CONFIRMED (4 area bands × 4 ratio bands; incentive 55%–100% of admissible rehab area) |
| Reg 33(10) — rehab tenement 27.88 sqm (post-amendment from 25 sqm) | clarification on p. 213 | CONFIRMED |
| Reg 33(11) — total FSI up to 4 for SRA transit camps | head clause, p. 233 | CONFIRMED |
| Reg 33(11) — table by location × road width: Island 12m → 3.0/63%:37%; 18m → 4.0; Suburbs 12m → 3.0/50%:50%; 18m → 4.0 | table A, p. 234 | CONFIRMED |
| Reg 33(11) — transit tenement 27.88 sqm residential / 20.90 sqm non-res | clause C, p. 234 | CONFIRMED |

---

## Style / cleanup items (non-bug)

1. **`fsiPlotForCalc` in `computeBuildable_33_7A`** (line 447) is computed correctly per Appendix clause 10 but never used in downstream BUA math. The `reg30Path` fallback uses `netPlot` instead. If the regulation's "FSI on entire plot incl. roads, excl. reservation" is intended for the fallback base too, the variable should be wired in. If it's just informational, delete it to avoid the dead-store smell.

2. **`_inSituFsi` called even when denied** (lines 99–100, called from 300, 554). The function returns `0` because `schemeId` is in `SCHEMES_DENIED_INSITU_FSI`. Consider returning `null` from the denied branch so downstream `inSituFsiBua` is unambiguously "not applicable" rather than "zero."

3. **Citation drift** in original (now corrected in patch):
   - "L7350 — 35% concession" → corrected to "PEATA p. 42 Note (ii)"
   - "L16903" etc. — these are line numbers in `/tmp/dcpr2034_text.txt` (the working extraction file), which a future session may not have. The patched file keeps PEATA *printed page* citations.

---

## Still open / unverified

- **Reg 30 — FSI Table 12** values used by `_fsiSlab(zone, roadWidth, widenedTo9m)`. Not verified against PEATA in this pass. The pseudocode signature is correct; the values live in App.js.
- **Reg 16 in-situ FSI denial list** (lines 92–97 in original). The list of denied scheme IDs needs cross-check against PEATA Reg 16.
- **MHADA Third Schedule % tier table** for `mhadaSurplusPct`. PEATA references the MHAD Act 1976 Third Schedule but does not reproduce the percentages. Pull from MBRRB.
- **`_reg14Amenity` body** (line 104) is a stub returning 0. The shape and citations are correct; the body needs the live App.js implementation.

---

## Files produced

| File | Description |
|---|---|
| `regulations.patched.js` | Original file with 3 bug fixes, 2 TODO resolutions, and citation corrections applied |
| `smoke_test.js` | Sanity tests covering the 35% cap fix, the rehab/sale fungible split, and the MHADA-null gate. Run with `node smoke_test.js`. All five tests pass. |
| `VERIFICATION_REPORT.md` | This document |

## Suggested next pass

1. Wire the patched fungible logic into the live App.js `computeBuildable_33_7B` and confirm no regression on a known-sanctioned proposal.
2. Verify Reg 30 Table 12 against PEATA Part VI head (pages I did not rasterize this session).
3. Stand up the remaining Tier-1 functions (`computeBuildable_33_9`, `_33_10`, `_33_11`) using the same shape contract, with values lifted directly from the PEATA evidence above.
