# PlotIQ — Resume Context for a New Claude Conversation

_Drop this file into a fresh Claude conversation and say "read this and stand by — I'll tell you what to work on." Claude will then have full context._

---

## 🟢 EXACT PROMPT TO PASTE IN NEW CONVERSATION

> I'm continuing work on **PlotIQ**, a Mumbai DCPR 2034 redevelopment feasibility calculator. Please read the following two files at the project root, in this order, before doing anything:
>
> 1. `/Users/maheshnaik/Desktop/Automated Platform - Real Estate Builability for Mumbai/CLAUDE-RESUME.md` (this file — full context for resumption)
> 2. `/Users/maheshnaik/Desktop/Automated Platform - Real Estate Builability for Mumbai/HANDOFF.md` (developer handover with architecture)
>
> Do **not** read `frontend/src/App.js` upfront — it is ~4,166 lines. Read sections only when needed for the specific task. After reading both files, summarise back to me in 3 bullets what you understand, and ask what I want to work on.

---

## 1. Project facts (memorise these)

- **Project root:** `/Users/maheshnaik/Desktop/Automated Platform - Real Estate Builability for Mumbai/`
- **Dev URL:** http://localhost:3000 (start with `cd frontend && npm start`)
- **Single source of truth:** `frontend/src/App.js` (~4,166 lines, one file by design)
- **Stack:** React 18, CRA (react-scripts 5), lucide-react. 100% client-side. No backend.
- **Brand:** PlotIQ (renamed from RedevReady earlier this session)
- **Audience:** Mumbai society chairmen, 50–60 yrs old, no DCPR literacy

---

## 2. Recent decisions — DO NOT re-litigate these

The user has explicitly chosen these in past sessions. Don't propose alternatives:

| Decision | Status |
|---|---|
| Free, society-side calculator (not a paid SaaS for developers) | ✅ Locked |
| Single-file React app, no router, no state library | ✅ Locked |
| Warm document aesthetic (rust + cream), not dark dashboard | ✅ Locked |
| Tabs: Overview · Compare Offer · Area Statement · Costs & Parking · Members · Way Ahead | ✅ Locked |
| Anti-developer-deception framing in copy | ✅ Locked |
| 33(7)(B) is the primary scheme; Reg 30 + 33(9) are alternates | ✅ Locked |
| Compare Offer = upload + 2 numbers + simple comparison (NOT a 10-field corpus/transit comparator) | ✅ Locked |
| Premium FSI rate is 50% of ASR (the GR 14.01.2021 rebate has expired) | ✅ Locked |
| Construction rate for BOCW/TDR-infra defaults to ₹27,500/sqm (FY 2025-26 SDRR) | ✅ Locked |

---

## 3. What's already shipped (Apr–May 2026 sessions)

### Calculator core
- 3 scheme computers: `computeBuildable_Reg30`, `computeBuildable_33_7B`, `computeBuildable_33_9`
- Shared `computePremiumSheet` with 8 AutoDCR fee heads + Reg 30/31 premiums
- `computeBaseInputs` for shared deduction logic (Reg 14, Reg 17, road widening bonus, amalgamated plots, special locations)

### UI panels
- Locate-your-plot card (Google Maps URL → ward detection via `wards.geojson` point-in-polygon → auto Island City/Suburbs + ASR district hint)
- InputPanel with society details merged in, cluster sub-panel, ASR + construction rate inputs
- 6 tabs (see above)
- CompareOffer (the new tab) — file upload (filename only, no parsing) + 2 carpet sqft inputs + traffic-light comparison + plain-English verdict
- AreaStatement (Proforma-A style with line-by-line FSI build-up)
- PremiumRecoveryPanel (Reg 30/31 sub-total + AutoDCR sub-total + grand total)
- ParkingPanel, MemberEntitlement, NextSteps (5-phase roadmap A–E), Explainers (FAQ)

### Recent fixes
- Cluster scheme now routes correctly when `clusterOptIn === true` (was silently falling back to 33(7)(B) when cluster size minimum not met)
- Cluster compute returns ~25 stub fields so all tabs render without crashing
- Premium FSI doubled (was 25%, now 50% — rebate expired)
- TDR Infrastructure rate now uses `constructionRate` input (was hard-coded ₹30,250)

---

## 4. Open tasks (priority order)

The user wants these next. Pick whichever they ask for. Don't auto-start — wait for direction.

| # | Task | Effort | Notes |
|---|---|---|---|
| A | Worked-examples library (3 preset chips: Borivali, Mulund, Bandra) | ~2 hrs | Spec'd but not built. Each chip = one click → fills entire input state |
| B | PDF stamped export with PlotIQ letterhead | ~3 hrs | Use `react-to-print`. Currently relies on browser print |
| C | Marketing landing page | ~3 hrs | App currently loads straight into calculator. 200-word intro + "Try it" CTA |
| D | AutoDCR cross-check using `?verify=1` mode | ~1 hr | Verify the 8 fee heads against a real approved area statement |
| E | Bundle static ASR dataset (`asr-mumbai-2025.json`) | ~10 hrs | One-time PDF parse + ~2 hrs/yr update. Discussed and parked |
| F | Vercel/permanent deploy | ~15 min | GitHub repo created locally; user needs to push and connect Vercel |
| G | Cluster mode polish — replace Area Statement Section A with cluster-specific summary instead of N/A rows | ~1 hr | Currently shows "N/A for cluster" stubs which look messy |

User's stated preference order: A → B → C.

---

## 5. Important gotchas

1. **Do NOT touch compute functions** without first reading `DEDUCTIONS-DRAFT.md` and `SCHEMES-DRAFT.md` at the project root. Every formula has a regulation citation; breaking math is hard to detect.
2. **If you add a field to the result object** for any scheme, add it to **all three** computers (especially the cluster stub around line ~835) or cluster mode will crash on the panels that read it.
3. **String matching pitfalls in Edit:** The file has literal `’` escape sequences (typographic apostrophes encoded as escape strings). When using the Edit tool, the regular `'` character won't match `’`. Either use Python via Bash for sed-like replacements, or copy the exact escape sequence.
4. **Avoid touching `~/.git`** — there's a stray git repo at the user's home folder from an old experiment. We initialized a fresh repo at the project root which is isolated.
5. **The dev server may already be running** — check with `lsof -nP -iTCP:3000 -sTCP:LISTEN` before starting another instance.
6. **Build warnings are pre-existing** (`grossPlot`, `isSuburbs`, `ceilingBua`, `LoadingSlider` unused; duplicate `paddingTop` key). Harmless. Clean up only if asked.

---

## 6. State shape (the single `input` object)

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
  // Compare Offer
  devOfferRehab, devOfferSale, devOfferFileName,
}
```

---

## 7. How to verify the app is up before making changes

```bash
# Check if server is running:
lsof -nP -iTCP:3000 -sTCP:LISTEN

# If not running, start it:
cd "/Users/maheshnaik/Desktop/Automated Platform - Real Estate Builability for Mumbai/frontend"
npm start &
# Wait for "Compiled successfully!" then open http://localhost:3000
```

If a public/shareable URL is needed (laptop must stay on):
```bash
npx --yes localtunnel --port 3000 > /tmp/lt.log 2>&1 &
sleep 15 && cat /tmp/lt.log     # prints "your url is: https://..."
```

For a permanent URL: git push to GitHub → import on vercel.com → set Root Directory to `frontend` → Deploy.

---

## 8. File map (cliff notes)

```
project root/
├── CLAUDE-RESUME.md       ← THIS FILE (resume context)
├── HANDOFF.md             ← developer-facing handover (architecture, what changed)
├── DEDUCTIONS-DRAFT.md    ← Reg 14, 17, 27 with verified PDF page citations
├── SCHEMES-DRAFT.md       ← 33(7), 33(7)(A), 33(7)(B), 33(9), 33(10) math
├── BUILD-HANDOFF.md       ← older notes (skim if needed)
├── Research/
│   └── comprehensive-dcpr-2034-peata.pdf  ← 708-page regulation source
├── backend/               ← unused stub — ignore
└── frontend/
    ├── public/
    │   ├── index.html
    │   └── wards.geojson  ← 26 MCGM ward polygons (used for plot detection)
    └── src/App.js          ← THE APP (~4,166 lines, single file)
```

---

## 9. Section-line index for `App.js` (jump to what you need)

| Lines | What |
|---|---|
| 1–100 | Imports + `WARD_INFO`, point-in-polygon, Google Maps URL parser |
| 100–200 | `FSI_TABLE_12` |
| 200–280 | `computePremiumSheet` (Reg 30/31 + AutoDCR) |
| 280–400 | Reg 14 / LOS / IH / parking helpers |
| 400–520 | `detectApplicableSchemes`, `analyseEligibility`, `pickPrimaryScheme` |
| 520–640 | `computeBaseInputs` |
| 640–740 | `computeBuildable_Reg30` |
| 740–840 | `computeBuildable_33_9` (cluster — with ~25 stub fields for cross-tab safety) |
| 840–1010 | `computeBuildable_33_7B` + dispatcher |
| 1110–1300 | `App()` — state, useMemo, tab structure |
| 1300–1500 | `Styles()` |
| 1500–2230 | InputPanel + locator + cluster sub-panel + ASR card |
| 2230–2630 | SchemePicker, Eligibility, InteractiveResult, WatchOutFor |
| 2630–2890 | **CompareOffer** (newest) |
| 2890–3340 | AreaStatement |
| 3340–3700 | PremiumRecoveryPanel, ClusterResult, ParkingPanel, MemberEntitlement |
| 3700–3900 | NextSteps |
| 3900–4166 | Explainers, PrintBar |

---

## 10. Conversation style preferences (the user)

- **Decisive.** Don't over-explain. Ship and ask short clarifying questions only when truly blocked.
- **Concrete.** Numbers, formulas, file paths. Not vague platitudes.
- **Honest about limitations.** If something can't be done client-side (e.g., IGR scraping, PDF auto-parsing), say so plainly with the tradeoffs.
- **Short messages preferred.** Long bullet lists are OK; long paragraphs are not.
- **No emojis in code/docs unless asked.** Emojis in chat are fine.
- **One-step-at-a-time deployment guidance.** User prefers step → action → confirm pattern over a wall of instructions.

---

_End of resume context. After reading this and `HANDOFF.md`, ask the user what they want to work on. Pick from the open task list in §4 above unless they specify something else._
