from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import openai
import json
from src.dcp_parser import get_clauses

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set OpenAI API key - in production, use environment variable
openai.api_key = "your-openai-api-key"  # Replace with actual key or env var

class AnalysisInput(BaseModel):
    gross_plot_area: float
    net_plot_area: Optional[float] = None
    road_width: float
    zone: str
    frontage: Optional[float] = None
    reservation: Optional[str] = None
    special_conditions: Optional[str] = None
    selected_clause_id: str

def extract_rules(clause_content: str) -> Dict[str, Any]:
    """Use LLM to extract rules from clause content."""
    prompt = f"""
    Extract the following information from the DCPR 2034 clause text below. Output as JSON with keys: base_fsi, premium_fsi, tdr, fungible, deductions, conditions.
    - base_fsi: base FSI value (float or string if conditional)
    - premium_fsi: premium FSI value (float or 0 if none)
    - tdr: TDR eligibility (string description or 0)
    - fungible: fungible FSI (float or 0)
    - deductions: description of deductions like RG, AOS, setbacks (string)
    - conditions: any plot size, road width conditions (string)

    Clause text:
    {clause_content}

    Output only valid JSON.
    """
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0
        )
        content = response.choices[0].message.content.strip()
        return json.loads(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM extraction failed: {str(e)}")

def calculate_buildability(inputs: AnalysisInput, rules: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate buildability based on inputs and rules."""
    gross = inputs.gross_plot_area
    net = inputs.net_plot_area or gross  # Assume net = gross if not provided

    # Parse deductions - for MVP, assume simple parsing or ask LLM for values
    # This is simplified; in reality, might need more logic
    deductions = 0  # Placeholder, need to parse from rules['deductions']

    # For now, assume deductions are 0, or add logic later
    net_effective = net - deductions

    base_fsi = float(rules.get('base_fsi', 0))
    premium_fsi = float(rules.get('premium_fsi', 0))
    tdr_fsi = 0  # Placeholder
    fungible_fsi = float(rules.get('fungible', 0))

    total_fsi = base_fsi + premium_fsi + tdr_fsi + fungible_fsi

    base_bua = net_effective * base_fsi
    premium_bua = net_effective * premium_fsi
    tdr_bua = net_effective * tdr_fsi
    fungible_bua = net_effective * fungible_fsi
    total_bua = net_effective * total_fsi

    return {
        "net_effective_plot_area": net_effective,
        "base_bua": base_bua,
        "premium_bua": premium_bua,
        "tdr_bua": tdr_bua,
        "fungible_bua": fungible_bua,
        "total_permissible_bua": total_bua,
        "deductions": deductions,
        "rules": rules
    }

@app.get("/clauses")
def get_clauses_endpoint():
    """Get list of DCPR clauses."""
    return {"clauses": get_clauses()}

@app.post("/analyze")
def analyze(inputs: AnalysisInput):
    """Analyze buildability."""
    clauses = get_clauses()
    clause = next((c for c in clauses if c['id'] == inputs.selected_clause_id), None)
    if not clause:
        raise HTTPException(status_code=404, detail="Clause not found")

    rules = extract_rules(clause['content'])
    result = calculate_buildability(inputs, rules)

    # Format output
    output = f"""
---------------------------------------------------
REAL ESTATE FEASIBILITY SUMMARY
---------------------------------------------------

INPUTS:
- Gross Plot Area: {inputs.gross_plot_area} sq.m
- Net Plot Area: {inputs.net_plot_area or 'N/A'} sq.m
- Road Width: {inputs.road_width} m
- Zone: {inputs.zone}
- Frontage: {inputs.frontage or 'N/A'} m
- Reservation: {inputs.reservation or 'N/A'}
- Special Conditions: {inputs.special_conditions or 'N/A'}

APPLICABLE REGULATION:
- Clause reference: {clause['id']} {clause['title']}
- Extracted conditions: {rules.get('conditions', 'N/A')}

FSI APPLICABILITY:
- Base FSI: {rules.get('base_fsi', 'N/A')}
- Premium FSI: {rules.get('premium_fsi', 'N/A')}
- TDR: {rules.get('tdr', 'N/A')}
- Fungible FSI: {rules.get('fungible', 'N/A')}

DEDUCTIONS:
- Deductions: {rules.get('deductions', 'N/A')}
- Total Deductions: {result['deductions']} sq.m

CALCULATIONS:
1. Gross Plot Area = {inputs.gross_plot_area}
2. Less deductions = {result['deductions']}
3. Net Effective Plot Area = {result['net_effective_plot_area']}

Buildability:
- Base BUA = {result['base_bua']} sq.m
- Premium BUA = {result['premium_bua']} sq.m
- TDR BUA = {result['tdr_bua']} sq.m
- Fungible BUA = {result['fungible_bua']} sq.m

TOTAL PERMISSIBLE BUILT-UP AREA = {result['total_permissible_bua']} sq.m

ASSUMPTIONS / WARNINGS:
- Deductions calculation is placeholder; needs refinement based on rules.
- LLM extraction may have inaccuracies.
---------------------------------------------------
"""
    return {"summary": output.strip()}