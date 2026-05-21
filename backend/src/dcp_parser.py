import pdfplumber
import re
from typing import List, Dict

PDF_PATH = "/Users/maheshnaik/Desktop/Automated Platform - Real Estate Builability for Mumbai/DCPR- 2034 and Notification.pdf"

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract all text from the PDF."""
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

def parse_clauses(text: str) -> List[Dict[str, str]]:
    """Parse the text to identify clauses from the DCPR PDF.
    This parser matches numeric clause headings like '1.0', '1.1', '36.5', etc.
    """
    lines = text.splitlines()
    clause_indices = []
    clause_pattern = re.compile(r'^(\d+(?:\.\d+)*)(?:\s+|-)\s*(.+)$')

    for index, line in enumerate(lines):
        stripped = line.strip()
        match = clause_pattern.match(stripped)
        if match:
            clause_id = match.group(1)
            title = match.group(2).strip()
            if title:
                clause_indices.append((index, clause_id, title))

    clauses = []
    for idx, (line_index, clause_id, title) in enumerate(clause_indices):
        start_line = line_index
        end_line = clause_indices[idx + 1][0] if idx + 1 < len(clause_indices) else len(lines)
        content = "\n".join(lines[start_line:end_line]).strip()
        clauses.append({"id": clause_id, "title": title, "content": content})

    return clauses

def get_clauses() -> List[Dict[str, str]]:
    """Get list of clauses from PDF."""
    text = extract_text_from_pdf(PDF_PATH)
    return parse_clauses(text)