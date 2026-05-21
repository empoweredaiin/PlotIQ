from dcp_parser import get_clauses

if __name__ == "__main__":
    clauses = get_clauses()
    print(f"Found {len(clauses)} clauses")
    for clause in clauses[:5]:  # Print first 5
        print(f"{clause['id']}: {clause['title'][:50]}...")