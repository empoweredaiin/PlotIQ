# PlotIQ — Developer Handover

_Last updated: May 2026 (current session). Replaces the prior RedevReady handoff._

---

## TL;DR for the new developer

- **One-line elevator:** Free, browser-based feasibility calculator for Mumbai cooperative housing societies considering redevelopment under DCPR 2034. Audience: society chairmen, 50–60 yrs old, low DCPR literacy. Output is meant to be printed or forwarded in a WhatsApp committee group.
- **Where to start:** Read this file end-to-end (15 min). Then `cd frontend && npm install && npm start` → open `http://localhost:3000`. Then open `frontend/src/App.js` — it is the entire app (~4,166 lines, single React file).
- **What to NOT do:** Do not touch the compute functions (`computeBuildable_*`, `computePremiumSheet`, `computeReg14Amenity`, `analyseEligibility`, `detectApplicableSchemes`) without first reading `DEDUCTIONS-DRAFT.md` and `SCHEMES-DRAFT.md`. The math has been cross-checked against DCPR 2034 and the MCGM AutoDCR fee calculator — every formula carries a regulation citation.

---

## 1. Project paths

```
/Users/maheshnaik/Desktop/Automated Platform - Real Estate Builability for Mumbai/
├── HANDOFF.md                          ← this file (start here)
├── BUILD-HANDOFF.md                    ← older notes (skim, then ignore)
├── DEDUCTIONS-DRAFT.md                 ← canonical deduction rules with PDF page refs
├── SCHEMES-DRAFT.md                    ← canonical scheme math (33(7), 33(7)(A), 33(7)(B), 33(9), 33(10))
├── DCPR- 2034 and Notification.pdf     ← the regulation
├── Research/
│   └── comprehensive-dcpr-2034-peata.pdf   ← 708-page regulatory source (PEATA edition)
├── backend/                             ← unused stub, ignore
└── frontend/                            ← THE APP
    ├── public/
    │   ├── index.html
    │   └── wards.geojson               ← MCGM ward boundaries (26 wards, used for plot location detection)
    ├── src/
    │   ├── App.js                      ← ENTIRE APP (~4,166 lines)
    │   ├── App.css                     ← empty (all styles inline / in Styles() component)
    │   ├── index.css                   ← default CRA
    │   └── index.js                    ← default CRA entry
    └── package.json                    ← React 18, CRA (react-scripts 5), lucide-react. No other libs.
```

---

## 2. How to run locally

```bash
cd frontend
npm install        # first time only — pulls react, lucide-react, react-scripts
npm start          # serves on http://localhost:3000 with hot reload
```

To build for production: `npm run build` (outputs to `frontend/build/`).

---

## 3. Architecture in 90 seconds

- **100% client-side React.** No backend, no DB, no API calls. Everything runs in the user's browser.
- **Single `useState` object** in `App()` holds all inputs. All derived values via `useMemo`.
- **Tabs** on the right pane: Overview · Compare Offer · Area Statement · Costs & Parking · Members · Way Ahead.
- **Three scheme computers** dispatch from `computeBuildable(input)`:
  - `computeBuildable_33_7B` — cooperative housing society redev (primary use case)
  - `computeBuildable_Reg30` — standard fallback for under-30-year societies
  - `computeBuildable_33_9` — cluster development
- **Premium recovery** is a single function `computePremiumSheet({...})` shared by all three. Returns Reg 30/31 premiums + 8 AutoDCR fee heads + grand total.
- **Storage:** only `localStorage` (verify mode + Compare Offer filename). Nothing leaves the browser.
- **Styling:** warm document aesthetic. Accent `#8b3a2a` (rust), background `#f5f1ea`. Fonts: Source Serif 4 / JetBrains Mono / Source Sans 3.

---

## 4. Top-to-bottom layout of `App.js`

| Lines (approx) | What lives there |
|---|---|
| 1–100 | Imports + ward detection (point-in-polygon, Google Maps URL parsing, `WARD_INFO` map) |
| 100–200 | FSI_TABLE_12 (Reg 30/Table 12 slabs) |
| 200–280 | `computePremiumSheet` — Reg 30/31 premiums + 8 AutoDCR fee heads |
| 280–400 | `computeReg14Amenity`, `computeLOSRequirement`, `computeReg15IHFlag`, parking calc |
| 400–520 | `detectApplicableSchemes`, `analyseEligibility`, `pickPrimaryScheme` |
| 520–640 | `computeBaseInputs` — shared base for all schemes |
| 640–740 | `computeBuildable_Reg30` |
| 740–840 | `computeBuildable_33_9` (cluster) |
| 840–1010 | `computeBuildable_33_7B` (primary scheme) + dispatcher |
| 1010–1110 | Formatting helpers, verify mode |
| 1110–1300 | **`App()` component** — state, useMemo chains, tab structure |
| 1300–1500 | `Styles()` — all CSS in a single tag |
| 1500–2230 | UI: Header, Intro, Footer, InputPanel (locator card + cluster sub-panel + ASR card) |
| 2230–2450 | SchemePicker, EligibilityPanel, SpecialLocationWarning, SchemeComparison |
| 2450–2630 | InteractiveResult, LoadingSlider, WatchOutFor |
| 2630–2890 | **CompareOffer (new this session)** — developer offer comparator |
| 2890–3340 | AreaStatement — Proforma-A line-by-line FSI build-up |
| 3340–3450 | PremiumRecoveryPanel — itemised premium + AutoDCR fees |
| 3450–3700 | ClusterResult, ParkingPanel, MemberEntitlement |
| 3700–3900 | NextSteps — 5-phase roadmap (A → E) with document pill grid |
| 3900–4166 | Explainers (FAQ), PrintBar |

---

## 5. What changed in this session (May 2026)

### A. Premium FSI rate corrected (25% → 50%)
- **Before:** premium FSI charged at 25% of ASR (post GR 14.01.2021 rebate × 50%)
- **After:** 50% of ASR (Reg 30(A)(6) base — the rebate has expired)
- Touched: `computePremiumSheet` (line ~215), `computeBuildable_Reg30` (line ~706), Premium Recovery Sheet labels, FAQ explainer

### B. AutoDCR fee integration (8 new cost heads)
Per the MCGM AutoDCR Calculator (`https://autodcr.mcgm.gov.in/AutoDCR.SWC.WebUI/Calculator/Main.aspx`), the following are now computed by `computePremiumSheet`:

| Head | Formula |
|---|---|
| Scrutiny Fee | BUA(sqm) × ₹70.7 |
| IOD Deposit | BUA(sqft) × ₹1 |
| Debris Removal Deposit | min(BUA(sqft) × ₹2, ₹45,000) |
| Labour Welfare Cess | BUA × Construction-rate × 1% (BOCW Act) |
| Dev Charges — Land | Basic-FSI × Plot × ASR × 1% (MR&TP §124E) |
| Dev Charges — BUA | BUA × ASR × 4% (MR&TP §124E) |
| Layout Scrutiny | Plot × ₹11.13 |
| TDR Util Scrutiny | TDR BUA × ₹59 |
| TDR Infrastructure | TDR BUA × Construction-rate × 5% (Reg 32 circular) |

New input: `constructionRate` (₹27,500/sqm default — FY 2025-26 SDRR rate for residential RCC). Edit in the "Ready Reckoner (ASR) & Construction rate" section.

### C. Compare Offer tab (NEW)
A new tab between Overview and Area Statement. Chairman can:
1. Upload developer's offer doc (PDF/image/Word — filename only, never parsed or uploaded).
2. Type two numbers — rehab carpet sqft + sale carpet sqft from the offer.
3. See side-by-side vs regulatory entitlement (`result.memberSideRehabBua / 1.2 × 10.7639` for rehab; `result.saleBua / 1.2 × 10.7639` for sale).
4. Plain-English verdict that adapts to four combinations (both fair / low rehab / high sale / both).

### D. Plot location detector
Top of input panel:
- Paste Google Maps URL → app parses `@lat,lng` → point-in-polygon over `wards.geojson` → returns ward (e.g. "K/E") → auto-sets Island City vs Suburbs → suggests IGR District/Taluka for ASR lookup.
- Society name + Address auto-fill from the `/place/NAME/` segment (overridable).
- Direct link to IGR ASR portal with the right district/taluka hint.

### E. Cluster scheme robustness
- `pickPrimaryScheme(schemes, input)` now routes to cluster whenever `clusterOptIn === true`, even if the size minimum isn't met (eligibility panel still flags it). Previously the app would silently fall back to 33(7)(B) using initial plot — counter-intuitive.
- `computeBuildable_33_9` now returns ~25 stub fields (reg14Auto, losRequirement, fsiSlab, etc.) so Area Statement / Costs / Members tabs render without crashing in cluster mode.

### F. Rebrand
App name changed from "RedevReady" to **"PlotIQ"** (logo + disclaimer text).

---

## 6. Known issues / open items

1. **PDF export** — relies on browser print (Cmd+P). A proper stamped-PDF export with PlotIQ letterhead would be a real win. Use `react-to-print` or headless Chromium.
2. **Worked-examples library** — preset chips (Borivali, Mulund, Bandra) for first-time users. Spec'd in this session but not yet built (~2 hrs).
3. **Marketing landing page** — app currently loads straight into the calculator. A 200-word landing + "Get started" CTA would improve conversion.
4. **`existingBua = carpet × 1.2`** is approximate. Real BUA factor varies 1.20–1.35 by building. Acceptable for MVP.
5. **No ward-level ASR auto-lookup** — chairman types the ASR rate. Could bundle a static `asr-mumbai-2025.json` (8–12 hrs one-time PDF parse, ~2 hrs/yr update). Discussed and parked.
6. **Backend stub at `backend/`** — FastAPI + pdfplumber, unused. Ignore.
7. **Pre-existing build warnings** (unused vars `grossPlot`, `isSuburbs`, `ceilingBua`, `LoadingSlider`, duplicate `paddingTop` key). Harmless. Clean up in passing.

---

## 7. State shape (the input object)

```js
{
  // Identity
  societyName, address,
  // Location
  location: 'suburbsExtended' | 'islandCity',
  zone: 'residential' | 'commercial' | 'industrial' | 'mixed',
  // Building
  buildingAge, buildingType, authorisationStatus,
  membersOnSamePlot, gbResolution, mixedTenancy, slumOnPlot,
  // Plot
  plotArea, dpRoadDeduction, reservationDeduction, roadWidth,
  roadWideningProposed, isAmalgamated, smallestOriginalPlot, specialLocation,
  // Deductions
  reg14Override, reg14ManualValue, losOverride, losManualValue, rosProposed,
  // BUA
  buaInputMode: 'breakdown' | 'total',
  flats: [{ label, carpet, count, use }],
  totalExistingBua, tenementCount,
  // Costs
  asrLandRate, constructionRate,
  // Loadings
  memberIncentiveShare, premiumFsiLoad, tdrLoad, fungibleLoad,
  // Scheme
  selectedScheme: null | 'reg30_standard' | 'reg33_7B' | 'reg33_9',
  // Cluster
  clusterOptIn, clusterPlotArea, clusterBuildings, clusterExistingBua, clusterApartments,
  // Compare Offer (new this session)
  devOfferRehab, devOfferSale, devOfferFileName,
}
```

---

## 8. Compute pipeline (don't break this)

1. `analyseEligibility(input)` → eligibility object with 4 hard checks + 2 soft warnings
2. `detectApplicableSchemes(input)` → 3 schemes with per-gate eligibility
3. `pickPrimaryScheme(schemes, input)` → auto-detected primary (cluster opt-in overrides)
4. `computeBuildable({ ...input, selectedScheme })` → dispatches to one of:
   - `computeBuildable_33_7B` (society redev — primary)
   - `computeBuildable_Reg30` (under-30 fallback)
   - `computeBuildable_33_9` (cluster)
5. Each computer calls `computeBaseInputs` (deductions, FSI slab) and `computePremiumSheet` (recovery + AutoDCR)
6. Result drives **all** UI panels via `result.<field>` reads.

If you need to add a field, add it to ALL three computer returns (including the cluster stub around line 835) so cluster mode doesn't crash.

---

## 9. Deployment paths

### Quick share (laptop must stay on)
```bash
# Install one of these:
brew install cloudflared      # or
npm install -g localtunnel

# With `npm start` already running:
cloudflared tunnel --url http://localhost:3000
# or
lt --port 3000
# It prints a public URL — send that.
```

### Permanent deploy (recommended)
1. `cd frontend && git init && git add . && git commit -m "Initial PlotIQ"`
2. Create a repo on GitHub, push: `git remote add origin <url> && git push -u origin main`
3. Go to **vercel.com** → "New Project" → import the repo → keep all defaults → Deploy
4. You get a permanent URL like `plotiq.vercel.app` in 2 minutes

Custom domain (optional): buy `plotiq.in` on namecheap/godaddy (~₹800/yr), connect to Vercel.

---

## 10. Reasonable next directions (pick one)

- **A. Worked-examples library** — 3 preset chips (Borivali, Mulund, Bandra). ~2 hrs.
- **B. PDF stamped export** — `react-to-print` with PlotIQ letterhead. ~3 hrs.
- **C. Marketing landing page** — 200-word intro + "Try it" CTA. ~3 hrs.
- **D. AutoDCR cross-check** — verify the 8 fee heads against a real approved area statement using `?verify=1` mode. ~1 hr.
- **E. Bundle static ASR dataset** — `asr-mumbai-2025.json` keyed by ward+locality. ~10 hrs.
- **F. SRA cluster handling** — currently flag-only. Wire up Reg 33(10) computer if there's demand.

Recommendation: **A first** → **B** → **C**.

---

## 11. References

- **DCPR 2034 PDF** — `Research/comprehensive-dcpr-2034-peata.pdf` (708 pages, PEATA edition)
- **Deduction rules** — `DEDUCTIONS-DRAFT.md` (Reg 14, Reg 27, Reg 30 with verified page citations)
- **Scheme math** — `SCHEMES-DRAFT.md` (33(7), 33(7)(A), 33(7)(B), 33(9), 33(10))
- **MCGM AutoDCR** — `https://autodcr.mcgm.gov.in/AutoDCR.SWC.WebUI/Calculator/Main.aspx` (authoritative for fee structure)
- **IGR ASR portal** — `https://efilingigr.maharashtra.gov.in/ePASR/` (for ready reckoner rates)

---

_End of handover. Commit incrementally with descriptive messages._
