"""
Seed comprehensive, fully populated sample entries for all 4 portal forms:
1. Walk-in / Lead Generation
2. Partner Onboarding (Driver & Operator)
3. Vehicle Onboarding
4. Vehicle Allocation & Drop-off

Executes directly against PostgreSQL using .env credentials.
"""
import psycopg2
import json
import os

env = {}
with open('.env') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()

conn = psycopg2.connect(dsn=env['DATABASE_URL'])
conn.autocommit = False
cur = conn.cursor()
print("[OK] Connected to PostgreSQL Database!")

# ── 1. Fetch Users & Roles ───────────────────────────────────────────────────
cur.execute("""
    SELECT pu.portal_user_id, pu.username, r.role_code, r.role_name
    FROM july_portal_users pu
    LEFT JOIN july_roles r ON r.role_id = pu.role_id
    ORDER BY pu.portal_user_id;
""")
users = cur.fetchall()
user_map = {u[1]: u[0] for u in users}
print(f"[OK] Found {len(users)} portal users.")

# User IDs
exec_id = user_map.get("onboarding_executive", user_map.get("ops_executive", 26))
cm_id   = user_map.get("city_manager", 20)
bh_id   = user_map.get("business", 17)
dm_id   = user_map.get("driver_manager", 21)

# Ensure GM role exists in july_roles
cur.execute("SELECT role_id FROM july_roles WHERE role_code = 'GM';")
gm_row = cur.fetchone()
if not gm_row:
    cur.execute("INSERT INTO july_roles (role_name, role_code) VALUES ('General Manager', 'GM') RETURNING role_id;")
    gm_role_id = cur.fetchone()[0]
    print(f"[OK] Inserted General Manager (GM) role_id={gm_role_id}")
else:
    gm_role_id = gm_row[0]

# Ensure GM portal user exists
cur.execute("SELECT portal_user_id FROM july_portal_users WHERE username = 'general_manager';")
gm_user_row = cur.fetchone()
if not gm_user_row:
    cur.execute("SELECT employee_id FROM july_employees LIMIT 1;")
    emp_row = cur.fetchone()
    gm_emp_id = emp_row[0] if emp_row else 1
    
    cur.execute("""
        INSERT INTO july_portal_users (username, password_hash, role_id, account_status, employee_id)
        VALUES ('general_manager', '$2b$12$OyO0RrmQfRDxkQRNVStnbuXCN.aVzcrNrHqq.wot441EF3mqC2Jm6', %s, 'Active', %s)
        RETURNING portal_user_id;
    """, (gm_role_id, gm_emp_id))
    gm_id = cur.fetchone()[0]
    print(f"[OK] Inserted user general_manager portal_user_id={gm_id}")
else:
    gm_id = gm_user_row[0]

# Ensure columns exist
cur.execute("ALTER TABLE july_onboarding ADD COLUMN IF NOT EXISTS security_deposit VARCHAR(100);")
cur.execute("ALTER TABLE july_vehicles ADD COLUMN IF NOT EXISTS approval_remarks TEXT;")
cur.execute("ALTER TABLE copy_vehicle_allocation ADD COLUMN IF NOT EXISTS approval_status VARCHAR(100);")
cur.execute("ALTER TABLE copy_vehicle_allocation ADD COLUMN IF NOT EXISTS current_approver_id INTEGER;")
cur.execute("ALTER TABLE copy_vehicle_allocation ADD COLUMN IF NOT EXISTS approval_remarks TEXT;")
cur.execute("ALTER TABLE copy_vehicle_allocation ADD COLUMN IF NOT EXISTS created_by INTEGER;")
print(f"-> Executive ID: {exec_id} | CM ID: {cm_id} | GM ID: {gm_id} | BH ID: {bh_id}")

# ── 2. Seed Walk-in Records ──────────────────────────────────────────────────
walkin_samples = [
    # (name, phone, visiting_reason, lead_channel, interested_position, city, status)
    ("Rajesh Verma",   "9876543210", "Onboarding",                "Telecaller",       "Driver",   "Hyderabad", "Finalized"),
    ("Sunil Chhetri",  "9876543211", "Driver Manager (DM) Meet",  "Direct Walk-in",   "Driver",   "Hyderabad", "Finalized"),
    ("Karan Johar",    "9876543212", "Maintenance Related Issue", "FSE",              "Operator", "Bangalore", "Finalized"),
    ("Alia Bhatt",     "9876543213", "Onboarding",                "Vendor",           "Driver",   "Mumbai",    "Draft"),
    ("Ranbir Kapoor",  "9876543214", "Complaints",                "Driver Referral",  "Operator", "Delhi",     "Draft"),
]

for name, phone, reason, channel, pos, city, status in walkin_samples:
    cur.execute("SELECT COUNT(*) FROM copy_walkins WHERE person_name = %s;", (name,))
    if cur.fetchone()[0] == 0:
        cur.execute("""
            INSERT INTO copy_walkins (
                person_name, person_number, visiting_reason, lead_channel, visitor_type,
                city, joined_status, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
        """, (name, phone, reason, channel, pos, city, status, exec_id))
        print(f"  + Walk-in: {name} ({status})")

# ── 3. Seed Partner Onboarding Records ───────────────────────────────────────
onboarding_samples = [
    # (name, city, plan, status, approver, remarks, rent, deposit)
    ("Ramesh Babu",      "Hyderabad", "Drive to Rent", "Pending Approval",  cm_id,   None, 750, 10000),
    ("Priya Sharma",     "Bangalore", "Drive to Own",  "Pending Approval",  cm_id,   None, 950, 15000),
    ("Sanjay Kumar",     "Chennai",   "LetzOwn",       "Pending Approval",  cm_id,   None, 1100, 20000),
    ("Anjali Devi",      "Mumbai",    "Drive to Rent", "Changes Requested", exec_id, "[Suggested Rent: Rs.750/day] Please update daily rent and re-upload Aadhaar back photo.", 750, 10000),
    ("Vikram Reddy",     "Hyderabad", "Drive to Own",  "Changes Requested", exec_id, "Unclear Documents - DL photo is blurry, please recapture.", 950, 15000),
    ("Meera Nair",       "Kochi",     "Drive to Rent", "Approved",          None,    "All documents verified.", 750, 10000),
    ("Arjun Patel",      "Ahmedabad", "Drive to Rent", "Draft",             None,    None, 750, 10000),
    ("Sunita Rao",       "Pune",      "LetzOwn",       "Rejected",          None,    "Duplicate entry.", 1100, 20000),
    ("Deepak Malhotra",  "Delhi",     "Drive to Rent", "Pending Approval",  gm_id,   "Forwarded by CM to GM for rate approval.", 800, 12000),
    ("Kavita Krishnan",  "Bangalore", "Drive to Own",  "Pending Approval",  bh_id,   "Forwarded by GM to BH for deposit waiver.", 900, 5000),
]

for name, city, plan, status, approver, remarks, rent, deposit in onboarding_samples:
    cur.execute("SELECT onboarding_id FROM july_onboarding WHERE driver_name = %s AND city = %s;", (name, city))
    row = cur.fetchone()
    if not row:
        phone = f"9{abs(hash(name)) % 900000000 + 100000000}"
        cur.execute("""
            INSERT INTO july_onboarding (
                driver_name, city, driver_plan, approval_status, current_approver_id,
                approval_remarks, created_by, phone_number, security_deposit
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING onboarding_id;
        """, (name, city, plan, status, approver, remarks, exec_id, phone, deposit))
        oid = cur.fetchone()[0]
        print(f"  + Onboarding: #{oid} {name} ({status})")
        
        if approver in (gm_id, bh_id):
            cur.execute("""
                INSERT INTO july_approval_chain_logs (
                    module_name, record_id, action, from_user_id, to_user_id, remarks
                ) VALUES (%s, %s, 'FORWARDED', %s, %s, %s);
            """, ("individual_onboarding", oid, cm_id, approver, remarks or "Forwarded for review"))

# ── 4. Seed Vehicle Onboarding Records ───────────────────────────────────────
vehicle_samples = [
    # (veh_no, city, model, status, approver, remarks, fuel_type)
    ("TS09FA1234", "Hyderabad", "Tata Xpres-T EV",  "Pending Approval",  cm_id,  None, "EV"),
    ("KA01MB5678", "Bangalore", "Maruti Tour S CNG", "Pending Approval",  cm_id,  None, "CNG"),
    ("MH02CL9012", "Mumbai",    "Hyundai Aura CNG",  "Changes Requested", exec_id, "FASTag vendor details missing.", "CNG"),
    ("DL01AB3456", "Delhi",     "Tata Xpres-T EV",  "Approved",          None,   "PDI inspection complete.", "EV"),
    ("HR26CD7890", "Gurgaon",   "Maruti WagonR CNG", "Draft",             None,   None, "CNG"),
]

for veh_no, city, model, status, approver, remarks, fuel in vehicle_samples:
    cur.execute("SELECT vehicle_id FROM july_vehicles WHERE vehicle_number = %s;", (veh_no,))
    if not cur.fetchone():
        cur.execute("""
            INSERT INTO july_vehicles (
                vehicle_number, city, model, approval_status, current_approver_id,
                approval_remarks, created_by, manufacturer, fuel_type
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'Tata Motors', %s)
            RETURNING vehicle_id;
        """, (veh_no, city, model, status, approver, remarks, exec_id, fuel))
        vid = cur.fetchone()[0]
        print(f"  + Vehicle: #{vid} {veh_no} ({status})")

# ── 5. Seed Allocation Records ───────────────────────────────────────────────
alloc_samples = [
    # (driver_name, vehicle_no, city, alloc_type, status, approver)
    ("Suresh Kumar",   "TS09FA1234", "Hyderabad", "New Allocation", "Pending Approval", cm_id),
    ("Mahesh Sharma",  "KA01MB5678", "Bangalore", "Rejoining",      "Approved",         None),
    ("Ganesh Rao",     "DL01AB3456", "Delhi",     "Swap",           "Draft",            None),
]

for dname, vno, city, atype, status, approver in alloc_samples:
    cur.execute("SELECT id FROM copy_vehicle_allocation WHERE driver_name = %s;", (dname,))
    if not cur.fetchone():
        cur.execute("""
            INSERT INTO copy_vehicle_allocation (
                driver_name, vehicle_number, city_name, allocation_type, approval_status,
                created_by
            ) VALUES (%s, %s, %s, %s, %s, %s);
        """, (dname, vno, city, atype, status, exec_id))
        print(f"  + Allocation: {dname} ({status})")

conn.commit()
conn.close()
print("\n[SUCCESS] Seeded comprehensive sample records across all 4 portal forms!")
