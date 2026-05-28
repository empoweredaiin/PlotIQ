# DCPR Ontology & Rule Schema V1

## Purpose

This document defines the foundational ontology, semantic primitives, rule schema, and graph architecture for converting Mumbai DCPR 2034 into a machine-readable regulatory intelligence system.

This is NOT a redevelopment calculator.

This architecture is intended to support:
- computational urban law,
- explainable redevelopment analysis,
- GIS-linked parcel evaluation,
- policy graph traversal,
- amendment overlays,
- regulatory simulation,
- and AI-assisted interpretation.

---

# 1. Core Philosophy

The system separates:

| Layer | Responsibility |
|---|---|
| Source Layer | PDF / markdown legal source |
| Ontology Layer | semantic definitions |
| Rule Layer | normalized regulatory logic |
| Execution Layer | computation engine |
| Spatial Layer | GIS / parcel intelligence |
| Explainability Layer | traceability + reasoning |
| Financial Layer | viability + economics |

---

# 2. Core Ontology Domains

## 2.1 Spatial Domain

Represents urban geometry and parcel intelligence.

### Entity Types

```json
[
  "plot",
  "sub_plot",
  "road",
  "means_of_access",
  "reservation",
  "amenity_space",
  "setback",
  "buffer_zone",
  "open_space",
  "layout",
  "building_footprint",
  "access_path",
  "railway_buffer",
  "airport_funnel",
  "crz_boundary",
  "heritage_precinct"
]
```

### Spatial Properties

```json
[
  "plot_area",
  "net_plot_area",
  "gross_plot_area",
  "road_width",
  "frontage",
  "height_limit",
  "buffer_distance",
  "access_length",
  "reservation_area",
  "setback_depth",
  "density",
  "fsi_zone"
]
```

---

# 3. Development Domain

Represents redevelopment schemes and building programs.

## Development Schemes

```json
[
  "reg33_5",
  "reg33_6",
  "reg33_7",
  "reg33_7A",
  "reg33_7B",
  "reg33_9",
  "reg33_9A",
  "reg33_9B",
  "reg33_10",
  "reg33_10A",
  "reg33_11",
  "reg33_20",
  "reg33_23"
]
```

## Building Typologies

```json
[
  "residential",
  "commercial",
  "mixed_use",
  "institutional",
  "industrial",
  "public_building",
  "slum_rehab",
  "transit_camp",
  "affordable_housing"
]
```

---

# 4. Economic Ontology

Represents redevelopment economics.

## Economic Primitives

```json
[
  "basic_fsi",
  "premium_fsi",
  "tdr_fsi",
  "fungible_area",
  "rehab_bua",
  "sale_bua",
  "incentive_bua",
  "premium_payable",
  "cess_payable",
  "construction_cost",
  "rehab_cost",
  "developer_margin",
  "sale_revenue",
  "viability_ratio"
]
```

## Financial Outputs

```json
[
  "permissible_bua",
  "effective_fsi",
  "developer_side_area",
  "member_side_area",
  "surplus_handover",
  "premium_liability"
]
```

---

# 5. Human & Institutional Domain

Represents actors and governing authorities.

## Actors

```json
[
  "occupant",
  "tenant",
  "owner",
  "society",
  "developer",
  "architect",
  "planner",
  "mcgm",
  "mhada",
  "mbrrb",
  "sra",
  "government"
]
```

## Institutional Dependencies

```json
[
  "mhad_act_1976",
  "mr_and_tp_act_1966",
  "rent_control_act",
  "sra_circular",
  "gr_amendment",
  "fire_noc",
  "airport_authority_clearance",
  "railway_clearance"
]
```

---

# 6. Rule Taxonomy

Every regulation clause must be categorized.

## Rule Categories

```json
[
  "eligibility_gate",
  "warning",
  "formula",
  "modifier",
  "carveout",
  "override",
  "dependency",
  "geometry_constraint",
  "premium_rule",
  "fungible_rule",
  "timeline_constraint",
  "rehab_rule",
  "incentive_rule",
  "tdr_rule",
  "environmental_constraint"
]
```

---

# 7. Core Rule Schema

Every rule in the system must follow a normalized structure.

## Canonical Rule Schema

```json
{
  "ruleId": "",
  "title": "",
  "category": "",
  "scope": "",
  "jurisdiction": "Mumbai",
  "version": "DCPR_2034",
  "priority": 0,
  "condition": {},
  "effect": {},
  "formula": {},
  "dependencies": [],
  "dependsOnRules": [],
  "traceability": {},
  "validation": {},
  "metadata": {}
}
```

---

# 8. Condition Schema

Conditions must be declarative.

## Example

```json
{
  "all": [
    {
      "field": "proposedHeight",
      "operator": ">",
      "value": 32
    },
    {
      "field": "roadWidth",
      "operator": "<",
      "value": 9
    }
  ]
}
```

## Supported Operators

```json
[
  "=",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "in",
  "not_in",
  "exists",
  "not_exists",
  "contains",
  "between"
]
```

---

# 9. Formula AST Schema

Formulas must NEVER use executable JS strings.

## Example

```json
{
  "multiply": [
    {
      "var": "rehabBua"
    },
    0.5
  ]
}
```

## Supported Formula Nodes

```json
[
  "add",
  "subtract",
  "multiply",
  "divide",
  "min",
  "max",
  "ceil",
  "floor",
  "conditional",
  "percentage",
  "clamp"
]
```

---

# 10. Explainability Schema

Every rule evaluation must preserve explainability.

## Example

```json
{
  "effect": {
    "status": "fail",
    "message": "9m road required for height above 32m",
    "impact": "High-rise development not permissible"
  }
}
```

---

# 11. Traceability Schema

Every computational outcome must map back to legal source.

## Example

```json
{
  "traceability": {
    "sourceClause": "Reg 33(7)(21)",
    "lineRefs": ["L17163"],
    "sourceDocument": "DCPR_2034",
    "confidence": "high",
    "requiresExternalValidation": false
  }
}
```

---

# 12. Dependency Graph Schema

Rules must support graph traversal.

## Example

```json
{
  "dependsOnRules": [
    "reg30_fsi_slab",
    "reg14_amenity_deduction"
  ]
}
```

## Dependency Types

```json
[
  "hard_dependency",
  "soft_dependency",
  "external_dependency",
  "amendment_override"
]
```

---

# 13. Amendment Overlay Architecture

Rules must support non-destructive overrides.

## Example

```json
{
  "amendmentId": "GR_2021_01_14",
  "targetRule": "premium_33_7B",
  "changes": {
    "premiumMultiplier": 0.5
  }
}
```

---

# 14. Chunking Specification

Markdown extraction must split DCPR into atomic semantic chunks.

## Chunk Types

```json
[
  "regulation",
  "sub_clause",
  "proviso",
  "note",
  "formula",
  "table",
  "definition",
  "dependency",
  "exception"
]
```

## Chunk Metadata

```json
{
  "chunkId": "",
  "regulation": "",
  "page": 0,
  "clause": "",
  "text": "",
  "chunkType": "",
  "dependencies": []
}
```

---

# 15. Shared Mechanics Library

Shared computational primitives must be centralized.

## Shared Mechanics

```json
[
  "reg30_fsi_slabs",
  "fungible_residential_35",
  "fungible_commercial_20",
  "premium_fsi_calculation",
  "tdr_loading",
  "reg14_amenity_deduction",
  "reg16_in_situ_fsi",
  "road_width_constraints",
  "height_constraints"
]
```

---

# 16. GIS Integration Targets

The system should eventually support:

```json
[
  "parcel_geometry",
  "cts_linking",
  "reservation_polygons",
  "road_networks",
  "dp_layers",
  "access_analysis",
  "height_restriction_buffers",
  "crz_boundaries",
  "heritage_precincts"
]
```

---

# 17. Execution Engine Principles

The execution engine should:

- evaluate declarative rules,
- resolve dependencies,
- preserve traceability,
- support amendment overlays,
- generate explainable outputs,
- support partial regulation loading,
- support graph traversal,
- support spatial queries.

The engine should NOT contain hardcoded regulation logic.

---

# 18. Recommended Repository Structure

```txt
/dcpr-engine
  /ontology
  /schemas
  /regulations
  /shared_mechanics
  /dependencies
  /amendments
  /chunks
  /execution_engine
  /gis
  /financial_models
  /explainability
```

---

# 19. Immediate Next Deliverables

## Priority 1

- RULE_SCHEMA_V1.json
- FORMULA_AST_SCHEMA.json
- CHUNKING_PIPELINE_V1.md
- REGULATION_DEPENDENCY_MAP.json

## Priority 2

- Reg 30 extraction
- Reg 31 extraction
- Reg 32 extraction
- Reg 33 family extraction

## Priority 3

- GIS integration
- Spatial indexing
- Financial simulation engine
- Amendment runtime

---

# 20. Final Architectural Goal

The final system should behave like:

- a policy engine,
- a regulatory graph,
- an urban simulation runtime,
- and an explainable redevelopment intelligence system.

NOT:

- a static PDF parser,
- a redevelopment calculator,
- or a hardcoded rules file.

