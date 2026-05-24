# PlotIQ — Architecture & Implementation Plan

Purpose
-------
This document captures KravonStudios' directive to reshape PlotIQ into a modular, institutional-grade regulatory intelligence workspace. The goal is to make the interface calm, procedural, explainable and spatially aware — not a dashboard or flashy consumer UI.

Design Principles
-----------------
- Calm: restrained palette, measured typography, limited motion.
- Procedural: clear stepwise workflows, progressive disclosure.
- Explainable: traceable regulatory logic, clause references, and auditability.
- Spatial-first: maps and parcel overlays are first-class; numbers are attached to spatial evidence.
- Modular: independent modules that compose into workspaces.
- Separation of concerns: UI, calculations, regulation logic, spatial rendering, and AI interpretation kept separate.

High-level Workspace Shell
--------------------------
Global layout:

┌──────────────────────────────────────┐
│ Global Navigation                    │
├──────────────────────────────────────┤
│ Workspace Context Bar                │
├──────────────┬───────────────────────┤
│ Left Rail    │ Main Intelligence     │
│ Navigation   │ Workspace             │
├──────────────┼───────────────────────┤
│ Contextual   │ Insight / AI Layer    │
│ Utilities    │                       │
└──────────────┴───────────────────────┘

Primary workspace pages:
- Overview
- Spatial Intelligence
- Regulatory Intelligence
- Buildability
- Feasibility
- AI Insights
- Reports

Component Hierarchy
-------------------
Level 1 — Primitives
- Design tokens (colors, spacing, typography)
- Grid system
- Buttons, Cards, Inputs, Overlays, Motion tokens

Level 2 — Domain components
- ParcelCard, FSIBlock, RegulationSummary, ZoningOverlay, BuildabilityPanel

Level 3 — Modules
- SiteDiscovery, RegulatoryEngineUI, BuildabilityWorkspace, FeasibilityWorkspace, AIInsights

Level 4 — Workspaces
- Multi-module pages composed from modules above

State management
----------------
Split state into scoped stores (single source of truth but modular):
- UI State: panels, modals, active page/router, feature flags
- Site State: selected parcel, coordinates, ward, geometry
- Regulatory State: computed entitlement, referenced clauses, slab metadata
- Financial State: ASR, construction rates, premium calculations, scenarios
- Spatial State: map viewport, overlays, selected features
- AI State: generated insights, rationale, confidence, timestamps

Module responsibilities
-----------------------
- `regulatory` module: pure functions that accept site inputs and return deterministic, testable objects with provenance (`{value, reason, refs}`).
- `spatial` module: thin adapter to mapping libraries; geometry comes in and normalized features go to computations.
- `ui` layer: presentational components only; call domain modules via well-defined hooks/actions.
- `ai` layer: orchestration that consumes domain outputs and produces human-readable recommendations with traceability.

Immediate Implementation Plan (first sprint)
-------------------------------------------
1. Stabilize `App.js` into a workspace shell (done).
2. Extract `WorkspaceNav`, `WorkspacePageHeader`, `SiteIntelligencePage` into `src/components/`.
3. Create `docs/ARCHITECTURE.md` (this file).
4. Create `src/design/tokens.css` and migrate CSS variables from `App.js` to the tokens file.
5. Move domain computations to `src/lib/regulatory.js` (pure functions with tests).
6. Add `src/components/MapView.js` placeholder and wire `Site Intelligence` page to it.
7. Add a `reports/` folder that renders printable, institutionally styled outputs.
8. Add unit tests for `computeBuildable` and key helpers; add a CI job.

Developer rules / guardrails
---------------------------
- All regulatory outputs must include `refs`: clause, paragraph, and short human explanation.
- UI components must be presentational; computation lives in `src/lib/`.
- Avoid ‘AI-first’ UI messaging; frame algorithmic outputs as "system interpretation" with provenance and confidence.
- Keep visual system restrained: follow current tokens; add high-contrast accessible labels for print.

Next steps (I can start these immediately)
-----------------------------------------
- Extract inline components from `frontend/src/App.js` into `src/components/*.js`.
- Move CSS variables into `src/design/tokens.css` and update imports.
- Create `src/lib/regulatory.js` and move computation helpers there.

If you approve, I will begin by extracting the workspace components into separate files under `frontend/src/components/` and moving the CSS tokens into `frontend/src/design/tokens.css`.
