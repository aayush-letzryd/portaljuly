import psycopg2
import os
import random
from datetime import datetime, timedelta

with open('.env', 'r') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            os.environ[k] = v

conn = psycopg2.connect(dsn=os.environ.get('DATABASE_URL'))
cur = conn.cursor()

# Clear existing onboarding records
cur.execute("DELETE FROM copy_form_onboarding;")

CITIES = ['Bangalore', 'Hyderabad', 'Mumbai']
EXECUTIVES = ['Admin (ID: 9001)', 'Kiran (ID: 3)', 'Chetan (ID: 1)', 'SHAIK ABDULLA (ID: 5)']

# 5 Operators
operators_data = [
    ("Bangalore Cabs Network", "OP-BLR-001", "8765432190", "Bangalore", "Chetan (ID: 1)"),
    ("Hyderabad Fleet Services", "OP-HYD-002", "9876543210", "Hyderabad", "Kiran (ID: 3)"),
    ("Mumbai Logistics Hub", "OP-MUM-003", "9123456789", "Mumbai", "Admin (ID: 9001)"),
    ("Deccan Operators Co", "OP-HYD-004", "9988776655", "Hyderabad", "SHAIK ABDULLA (ID: 5)"),
    ("Karnataka Mobility Pvt Ltd", "OP-BLR-005", "9845012345", "Bangalore", "Chetan (ID: 1)")
]

# 5 Drivers
drivers_data = [
    ("Rohit Sharma", "9000044444", "Bangalore", "Bangalore Cabs Network", "OP-BLR-001", "Anand Sharma", "9111122222", "Kiran (ID: 3)"),
    ("Virat Kohli", "9000033333", "Mumbai", "Mumbai Logistics Hub", "OP-MUM-003", "Saroj Kohli", "9222233333", "Admin (ID: 9001)"),
    ("MS Dhoni", "9000022222", "Hyderabad", "", "", "Paan Singh Dhoni", "9333344444", "SHAIK ABDULLA (ID: 5)"), # Own operator
    ("Rahul Dravid", "9000011111", "Bangalore", "", "", "Sharad Dravid", "9444455555", "Chetan (ID: 1)"), # Own operator
    ("Kavitha Nair", "9012645678", "Hyderabad", "Deccan Operators Co", "OP-HYD-004", "Ramesh Nair", "9555566666", "Kiran (ID: 3)")
]

insert_query = """
    INSERT INTO copy_form_onboarding (
        driver_name, phone_number, whatsapp_number, dob, city, operating_place,
        present_address, permanent_address, emergency_name, emergency_phone,
        dl_number, dl_expiry_date, lead_source, pan_number, aadhaar_number,
        vendor_name, vendor_id, vendor_type, candidate_role, created_at
    ) VALUES (
        %s, %s, %s, %s, %s, %s,
        %s, %s, %s, %s,
        %s, %s, %s, %s, %s,
        %s, %s, %s, %s, NOW()
    )
"""

# Insert Operators
for op in operators_data:
    cur.execute(insert_query, (
        op[0], op[2], op[2], "1985-05-15", op[3], op[3],
        f"Plot 12, {op[3]} Main Rd", f"Plot 12, {op[3]} Main Rd",
        "Manager", "9876500000",
        "", "", "Direct", "", "",
        op[0], op[1], "Operator", "Operator"
    ))

# Insert Drivers
for d in drivers_data:
    cur.execute(insert_query, (
        d[0], d[1], d[1], "1992-08-20", d[2], d[2],
        f"House 45, {d[2]} St", f"House 45, {d[2]} St",
        d[5], d[6],
        f"DL{random.randint(1000000000, 9999999999)}", "2030-12-31", "Walk-in",
        f"ABCDE{random.randint(1000,9999)}F", f"{random.randint(100000000000, 999999999999)}",
        d[3], d[4], "Driver", "Driver"
    ))

conn.commit()
cur.close()
conn.close()
print("Successfully inserted 10 onboarding records (5 Operators, 5 Drivers).")
