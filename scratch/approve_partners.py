import psycopg2
import os

if os.path.exists(".env"):
    with open(".env") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                if "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip()

db_url = os.environ.get("DATABASE_URL")

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("""
        UPDATE july_form_onboarding 
        SET approval_status = 'Approved' 
        WHERE phone_number IN ('9876543211', '9876001122') 
           OR driver_name ILIKE '%Suresh%' 
           OR driver_name ILIKE '%Priya%';
    """)
    conn.commit()
    print(f"Updated {cur.rowcount} records to Approved status.")
    
    cur.execute("SELECT id, driver_name, phone_number, approval_status FROM july_form_onboarding WHERE phone_number IN ('9876543211', '9876001122');")
    for r in cur.fetchall():
        print("Record:", r)
    conn.close()
except Exception as e:
    print("Error:", e)
