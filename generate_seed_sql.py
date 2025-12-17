
import json
import random

# Organizations
organizations = [
    { "id": 'cfa', "name": 'CFA - Conselho Federal', "type": 'CFA' },
    { "id": 'cra-ac', "name": 'CRA-AC', "type": 'CRA' },
    { "id": 'cra-al', "name": 'CRA-AL', "type": 'CRA' },
    { "id": 'cra-am', "name": 'CRA-AM', "type": 'CRA' },
    { "id": 'cra-ap', "name": 'CRA-AP', "type": 'CRA' },
    { "id": 'cra-ba', "name": 'CRA-BA', "type": 'CRA' },
    { "id": 'cra-ce', "name": 'CRA-CE', "type": 'CRA' },
    { "id": 'cra-df', "name": 'CRA-DF', "type": 'CRA' },
    { "id": 'cra-es', "name": 'CRA-ES', "type": 'CRA' },
    { "id": 'cra-go', "name": 'CRA-GO', "type": 'CRA' },
    { "id": 'cra-ma', "name": 'CRA-MA', "type": 'CRA' },
    { "id": 'cra-mg', "name": 'CRA-MG', "type": 'CRA' },
    { "id": 'cra-ms', "name": 'CRA-MS', "type": 'CRA' },
    { "id": 'cra-mt', "name": 'CRA-MT', "type": 'CRA' },
    { "id": 'cra-pa', "name": 'CRA-PA', "type": 'CRA' },
    { "id": 'cra-pb', "name": 'CRA-PB', "type": 'CRA' },
    { "id": 'cra-pe', "name": 'CRA-PE', "type": 'CRA' },
    { "id": 'cra-pi', "name": 'CRA-PI', "type": 'CRA' },
    { "id": 'cra-pr', "name": 'CRA-PR', "type": 'CRA' },
    { "id": 'cra-rj', "name": 'CRA-RJ', "type": 'CRA' },
    { "id": 'cra-rn', "name": 'CRA-RN', "type": 'CRA' },
    { "id": 'cra-ro', "name": 'CRA-RO', "type": 'CRA' },
    { "id": 'cra-rr', "name": 'CRA-RR', "type": 'CRA' },
    { "id": 'cra-rs', "name": 'CRA-RS', "type": 'CRA' },
    { "id": 'cra-sc', "name": 'CRA-SC', "type": 'CRA' },
    { "id": 'cra-se', "name": 'CRA-SE', "type": 'CRA' },
    { "id": 'cra-sp', "name": 'CRA-SP', "type": 'CRA' },
    { "id": 'cra-to', "name": 'CRA-TO', "type": 'CRA' },
]

# Load JSONs (Simulating loading since I can't read files easily in this script without valid paths)
# I will paste the minimal analytical accounts manually or try to read if I know the path.
# I'll rely on the previous `view_file` outputs.

# Simplified list of analytical accounts to keep script small but representative?
# No, user wants ALL.
# I will define a function to load the JSONs.

expense_file = r"c:\Users\douglas.sousa\Documents\nova\cfa-expense-app\src\lib\all-accounts.json"
revenue_file = r"c:\Users\douglas.sousa\Documents\nova\cfa-expense-app\src\lib\all-revenues.json"

try:
    with open(expense_file, 'r', encoding='utf-8') as f:
        expenses = [a for a in json.load(f) if a['type'] == 'Analítica']

    with open(revenue_file, 'r', encoding='utf-8') as f:
        revenues = [a for a in json.load(f) if a['type'] == 'Analítica']
except Exception as e:
    print(f"-- Error loading files: {e}")
    exit(1)

print("BEGIN;")
print("TRUNCATE TABLE expenses, revenues;")

for org in organizations:
    print(f"\n-- Data for {org['name']}")
    
    # Expenses
    values = []
    for acc in expenses:
        total = random.randint(5000, 50000)
        finalistica = int(total * random.uniform(0.1, 0.9))
        
        # Escape single quotes in name
        safe_name = acc['name'].replace("'", "''")
        
        values.append(f"('{org['id']}', '{acc['id']}', '{safe_name}', {total}, {finalistica}, NOW())")
    
    if values:
        print(f"INSERT INTO expenses (organization_id, account_id, account_name, total, finalistica, updated_at) VALUES")
        print(",\n".join(values) + ";")

    # Revenues
    r_values = []
    for acc in revenues:
        val = random.randint(10000, 100000)
        r_values.append(f"('{org['id']}', '{acc['id']}', {val}, NOW())")
    
    if r_values:
        print(f"INSERT INTO revenues (organization_id, account_id, value, updated_at) VALUES")
        print(",\n".join(r_values) + ";")

print("COMMIT;")
