# RedevReady — Build Handoff (continue here)

**Project:** `/Users/maheshnaik/Desktop/Automated Platform - Real Estate Builability for Mumbai/`
**Single source of truth:** `frontend/src/App.js` (~2,586 lines)
**Dev URL:** http://localhost:3001 (user's VS Code) — refresh after edits, hot-reloads
**Source PDF text:** `/tmp/dcpr/full.txt` (full 708-page DCPR 2034 extracted; may need re-extract if session is fresh — see end of doc)

---

## What this is (90 seconds)

Free society-side feasibility calculator for Mumbai redevelopment. Encoded from DCPR 2034 (PEATA edition).

**Wedge:** chairmen of 30+ yr cooperative housing societies in Mumbai suburbs. Forwarding outputs in WhatsApp committee groups. Anti-developer-deception positioning.

**Scope locked to:** Reg 30 standard, Reg 33(7)(B) society redev, Reg 33(9) cluster, Reg 33(10) flag-only. 33(7) cessed and 33(7)(A) tenanted are explicitly OUT.

**Monetization parked.** Free MVP for now.

---

## Current state of App.js (as of last edit)

### What works
- Inputs panel (left, sticky-scroll): plot, road, age, building type, auth status, flats breakdown, deductions (Reg 14 auto + override, LOS auto + override), cluster opt-in, slum toggle
- Auto-detects applicable scheme; shows scheme picker with eligibility trace ("Why this scheme?")
- Dropdown to manually override scheme
- **Sliders** for Premium FSI load / TDR load / Fungible load (0-100% each, default 1.0)
- One live `permissibleBua` updates as sliders move, with `permissibleBuaMax` as reference
- Cluster (33(9)) renders its own `ClusterResult` component
- Side-by-side `SchemeComparison` (33(7)(B) vs Cluster) when both eligible
- Eligibility flags (mixed tenancy clause 8 warning, slum flag)
- "Watch out for developer conversations" cards
- Next steps, plain-English FAQ
- Print/PDF via window.print()

### Engine architecture
```
computeBuildable(input) [dispatcher]
  ↓ routes by input.selectedScheme || pickPrimaryScheme(detectApplicableSchemes(input))
  ├─ computeBuildable_Reg30(input)   — standard, no incentive, with sliders
  ├─ computeBuildable_33_7B(input)   — society redev, 15%/10sqm incentive, with sliders
  └─ computeBuildable_33_9(input)    — cluster, 4.0 FSI ceiling, no sliders (cluster has its own model)

All three share computeBaseInputs(input, schemeId) — handles plot deductions,
existing BUA, fsiSlab lookup. Reg 14 amenity logic varies by scheme (35%
reduction for 33(7)/33(7)(A)/33(10); full for 33(7)(B)/33(9)).
```

### Key result-object fields (33(7)(B) and Reg 30)
```
permissibleBua, permissibleBuaMax        // live + max reference
fsiBua, fsiBuaMax
fungibleArea, fungibleAreaMax
saleBua, saleBuaMax
memberSideRehabBua, developerSideIncentive
rehabBasePath, reg30PathLoaded, reg30PathMax, rehabPathGoverns
premiumLoad, tdrLoadFactor, fungibleLoadFactor  // 0..1 echoed from input
incentiveBua, incentive15Pct, incentivePerTenement, incentiveBasis
existingBua, residentialFlats, totalFlats
netPlot, plotArea, reg14Deduction, reg14Auto, dpRoadDeduction, reservationDeduction
losRequirement, losActualArea, reg15Flag
fsiSlab { basic, premium, tdr, max, roadMin, roadMax }
baseFsiBua, premiumFsiBua, tdrBua, ceilingBua
viabilityRating, viabilityNote, viabilityRatio
flatBreakdown[] { label, count, existingCarpet, minGuaranteed, realisticLow, realisticHigh, use }
effFsi, effFsiMax
premiumPayable
```

### Cluster result fields (different shape)
```
clusterPlot, clusterBuildings, clusterExistingBua, clusterApartments
minClusterArea, meetsMinimum
rehabBase, incentiveBua, ceilingBua, schemeFsiBua, ceilingGoverns
fungibleArea, permissibleBua, saleBua
viabilityRatio, viabilityRating, viabilityNote
effFsi
```

---

## ⚠️ ONE KNOWN BROKEN THING — fix this first

**`AreaStatement` component still references OLD field names.**

Search in App.js for `function AreaStatement(` (~line 1860). The `rows` array still uses the deprecated fields from before sliders were added:
- `permissibleConservative / permissibleRealistic / permissibleMaximum` → no longer exist
- `conservativeFsiBua / realisticFsiBua / maximumFsiBua` → no longer exist
- `fungibleConservative / fungibleRealistic / fungibleMaximum` → no longer exist
- `saleConservative / saleRealistic / saleMaximum` → no longer exist

Result: area statement table renders `—` for all those rows.

**Fix:** replace D₂, E, F, G sections of the rows array with the slider-aware versions:

```javascript
// D₂ — Governing FSI BUA at user's selected loadings
{ isHeader: true, section: 'D₂', label: 'Governing FSI BUA at your selected loadings' },
{ label: 'Existing + Incentive (rehab-base path)',
  value: result.rehabBasePath, unit: 'sqm', ref: 'B + C',
  formula: `${fmt(result.existingBua)} + ${fmt(result.incentiveBua)}` },
{ label: `Reg 30 path at chosen loadings = Base + (Premium × ${((result.premiumLoad ?? 1) * 100).toFixed(0)}%) + (TDR × ${((result.tdrLoadFactor ?? 1) * 100).toFixed(0)}%)`,
  value: result.reg30PathLoaded, unit: 'sqm', ref: 'Reg 30(A) + 33(7)(B) proviso' },
{ label: 'Governing FSI BUA = max of above',
  value: result.fsiBua, unit: 'sqm', ref: result.rehabPathGoverns ? 'Rehab-base governs' : 'Reg 30 path governs',
  bold: true, highlight: true },
{ label: 'Maximum possible FSI BUA (full loadings, for reference)',
  value: result.fsiBuaMax, unit: 'sqm', ref: '—', italic: true },

// E — Fungible
{ isHeader: true, section: 'E', label: 'Fungible Compensatory Area — Reg 31(3)' },
{ label: 'Fungible rate (residential)', value: '35%', unit: '', ref: 'Reg 31(3)' },
{ label: `Fungible at chosen loading (${((result.fungibleLoadFactor ?? 1) * 100).toFixed(0)}% of available)`,
  value: result.fungibleArea, unit: 'sqm', ref: 'Reg 31(3)', bold: true },
{ label: 'Maximum possible Fungible',
  value: result.fungibleAreaMax, unit: 'sqm', ref: '—', italic: true },

// F — Permissible BUA
{ isHeader: true, section: 'F', label: 'Permissible BUA = FSI BUA + Fungible' },
{ label: 'Permissible BUA at your settings',
  value: result.permissibleBua, unit: 'sqm', ref: 'D₂ + E', bold: true, highlight: true },
{ label: 'Maximum possible Permissible BUA',
  value: result.permissibleBuaMax, unit: 'sqm', ref: '—', italic: true },

// G — Society & member adjustments
{ isHeader: true, section: 'G', label: 'Society & member adjustments' },
{ label: 'Member-side rehab base = Existing BUA',
  value: result.existingBua, unit: 'sqm', ref: 'Reg 33(7)(B)' },
{ label: `Member share of Incentive BUA (${(result.memberIncentiveShare * 100).toFixed(0)}%)`,
  value: result.incentiveBua * result.memberIncentiveShare, unit: 'sqm', ref: 'GB Resolution' },
{ label: 'Total rehab to existing members',
  value: result.memberSideRehabBua, unit: 'sqm', ref: '—', bold: true },
{ label: 'Developer share of Incentive BUA',
  value: result.developerSideIncentive, unit: 'sqm', ref: 'GB Resolution' },
{ label: 'Sale BUA available to developer',
  value: result.saleBua, unit: 'sqm', ref: 'F − rehab', bold: true, highlight: true },
```

Sections A.1, A.2, A.3, A.4, B, C, D unchanged — they don't use the deprecated fields.

---

## What user wants next (in priority order)

### 1. Verify against real approved area statements (CRITICAL)
User to provide one or more real sanctioned 33(7)(B) area statements from completed Mumbai projects. Trace each line vs calculator output. Find discrepancies. Fix what's broken; document what's a known difference. **This is the trust-validation step before any further build.**

### 2. Polish & prune for MVP rollout to societies
After verification. Likely cuts:
- Hide scheme-switch dropdown unless user actively wants alternatives
- Collapse cluster section by default
- Maybe hide slum toggle
- Add prominent WhatsApp-shareable headline ("Your society can build ~X sq ft")
- Add worked-example library (Borivali, Mulund, Andheri pre-fills)
- Real PDF export with society name + headline + 5-line summary

### 3. User testing
Send to 3-5 real society chairmen. Watch them use. Cut based on actual confusion, not guesses.

---

## Locked product decisions (do not revisit)

- **Society audience, not developer/IPC** (anti-Archonet positioning)
- **33(7)(B) is the wedge** (not all DCPR; not all of Reg 33)
- **Sliders not scenarios** (replaced Conservative/Realistic/Maximum)
- **Default permissible BUA = maximum the regulation allows**; user dials down
- **Auto-detected scheme highlighted; dropdown overrides allowed**
- **Reg 14 amenity auto-applied with override toggle**
- **LOS auto-applied with override toggle**
- **Mixed-tenancy = warning flag only** (no proportional split math)
- **Slum = advisory flag only** (no 33(10) math)
- **Cluster opt-in only, requires user action**
- **Premium/financial estimates parked** (ASR rate input is rough, ignore in MVP rollout)

---

## Locked aesthetic

- Warm off-white `#f5f1ea`, Source Serif 4 display, Source Sans 3 body, JetBrains Mono numerics
- Single accent `#8b3a2a` (rust)
- Document-grade, institutional report feel — NOT SaaS dashboard
- All styling scoped via `.redev-app` class (don't break global CSS)
- Print-friendly: input panel hides, single-column layout

---

## How to safely edit App.js

1. Desktop Commander is the only filesystem tool; **prefer small `edit_block` operations** (<100 line replacements). Large replacements time out the tool — happened twice today.
2. After every batch of edits, run the babel parser check:
   ```
   cd "Automated Platform - Real Estate Builability for Mumbai/frontend"
   node -e "const b=require('@babel/parser');const fs=require('fs');try{b.parse(fs.readFileSync('src/App.js','utf-8'),{sourceType:'module',plugins:['jsx']});console.log('OK')}catch(e){console.log('ERR L'+e.loc?.line+':',e.message)}"
   ```
3. VS Code dev server on :3001 hot-reloads on save.
4. **Read App.js first** before editing — user makes manual VS Code edits between sessions.

---

## Working principle for this assistant role

**Re-read source before encoding any new regulation.** Memory of DCPR 2034 specifics is unreliable; always grep `/tmp/dcpr/full.txt` first. If file is missing on session start, re-extract:

```bash
# Setup if /tmp/dcpr/full.txt is missing:
python3 -m venv /tmp/dcpr-venv
/tmp/dcpr-venv/bin/pip install pdfplumber
# then run a small extractor script reading Research/comprehensive-dcpr-2034-peata.pdf
```

**Check in before encoding new rules.** Workflow: re-read PDF → draft rules in markdown with citations → user confirms → encode. Do NOT skip the draft step. See past drafts in `DEDUCTIONS-DRAFT.md` and `SCHEMES-DRAFT.md` at project root for format reference.

**Push back when scope creeps.** User has been disciplined about wedge but flexible on tactics. Hold the line on: society-side positioning, 33(7)(B) primary scope, no cessed/tenanted in MVP, no premium financial modelling.

---

## Other context files in project root (for fuller context if needed)

- `HANDOFF.md` — earlier handoff (predates slider rework; partly outdated)
- `DEDUCTIONS-DRAFT.md` — rule drafts for Reg 14/15/17/27/30 with PDF citations
- `SCHEMES-DRAFT.md` — rule drafts for the 4 schemes considered (33(7), 33(7)(A), 33(7)(B), 33(9), 33(10)) with PDF citations
- `PITCH-CONTEXT.md` — separate pitch/investor narrative (not for build chat)

This file (`BUILD-HANDOFF.md`) supersedes `HANDOFF.md` for the build chat.

---

## First message to send the new chat

> Read `/Users/maheshnaik/Desktop/Automated Platform - Real Estate Builability for Mumbai/BUILD-HANDOFF.md` and the current `frontend/src/App.js`. Then fix the AreaStatement broken section called out in the handoff. Await my next instruction after that.

That gets you to a working state in one round-trip.
