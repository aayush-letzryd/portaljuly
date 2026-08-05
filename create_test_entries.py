import os
import psycopg2

if os.path.exists(".env"):
    with open(".env") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip()

db_url = os.environ.get("DATABASE_URL")
if db_url:
    conn = psycopg2.connect(db_url)
else:
    conn = psycopg2.connect(
        user=os.environ.get("DB_USER"),
        password=os.environ.get("DB_PASS"),
        host=os.environ.get("DB_HOST"),
        port=os.environ.get("DB_PORT", "5432"),
        database=os.environ.get("DB_NAME")
    )

cur = conn.cursor()

# 1. New Candidate Walk-In
cur.execute("""
INSERT INTO july_walkins (
    first_name, last_name, person_name, person_number, city, visitor_type, partner_type,
    visiting_reason, joined_status, lead_channel, lead_channel_details,
    aadhaar_number, dl_number, is_existing_partner, submission_status, created_at, updated_at
) VALUES (
    'Ramesh', 'Kumar', 'Ramesh Kumar', '9876543210', 'Hyderabad', 'Driver', 'Driver',
    'Onboarding Inquiry', 'Onboarding Process Initiated', 'Direct Walk-in', 'Ameerpet Hub Walk-In',
    '123456789012', 'TS-09-2023-0012345', false, 'Submitted', NOW(), NOW()
) RETURNING id;
""")
id1 = cur.fetchone()[0]

# 2. Existing Partner Walk-In
cur.execute("""
INSERT INTO july_walkins (
    first_name, last_name, person_name, person_number, city, visitor_type, partner_type,
    visiting_reason, joined_status, visit_notes, is_existing_partner, submission_status, created_at, updated_at
) VALUES (
    'Suresh', 'Reddy', 'Suresh Reddy', '9876543211', 'Bengaluru', 'Operator', 'Operator',
    'Fleet Commission & Payout', 'Follow Up Required', 'Operator visited hub regarding weekly fleet payout for 4 cars. Verified statement and initiated accounts transfer.',
    true, 'Submitted', NOW(), NOW()
) RETURNING id;
""")
id2 = cur.fetchone()[0]

conn.commit()
cur.close()
conn.close()

print(f"[OK] Successfully inserted 2 test records:")
print(f"  1. New Candidate Walk-in ID: #{id1} (Ramesh Kumar - 9876543210)")
print(f"  2. Existing Partner Walk-in ID: #{id2} (Suresh Reddy - 9876543211)")
