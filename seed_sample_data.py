"""
Seed sample data for Approvals Dashboard testing.
"""
import psycopg2

env = {}
with open('.env') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()

conn = psycopg2.connect(dsn=env['DATABASE_URL'])
cur = conn.cursor()
print("[OK] Connected!")

# Use onboarding_executive (portal_user_id=26) as exec, city_manager (20) as mgr
exec_id = 26   # onboarding_executive
mgr_id  = 20   # city_manager

print(f"Executive ID: {exec_id}  |  Manager ID: {mgr_id}")

# Check current records
cur.execute("SELECT COUNT(*) FROM july_onboarding;")
print(f"Current onboarding records: {cur.fetchone()[0]}")

# Check available columns in july_onboarding
cur.execute("""
    SELECT column_name FROM information_schema.columns 
    WHERE table_name='july_onboarding' ORDER BY ordinal_position;
""")
cols = [r[0] for r in cur.fetchall()]
print(f"Columns: {cols}")

# Samples: name, city, plan, status, approver_id, remarks
samples = [
    ("Ramesh Babu",      "Hyderabad", "Drive to Rent", "Pending Approval",  mgr_id,  None),
    ("Priya Sharma",     "Bangalore", "Drive to Own",  "Pending Approval",  mgr_id,  None),
    ("Sanjay Kumar",     "Chennai",   "LetzOwn",       "Pending Approval",  mgr_id,  None),
    ("Anjali Devi",      "Mumbai",    "Drive to Rent", "Changes Requested", exec_id, "[Suggested Rent: Rs.2500/day] Please update the daily rent amount. Also the Aadhaar Card back photo is blurry - please recapture and re-upload clearly."),
    ("Vikram Reddy",     "Hyderabad", "Drive to Own",  "Changes Requested", exec_id, "Unclear Documents - DL photo is blurry, please recapture. Verify that PAN card number matches Aadhaar details exactly."),
    ("Meera Nair",       "Kochi",     "Drive to Rent", "Approved",          None,    "All documents verified. Onboarding complete."),
    ("Arjun Patel",      "Ahmedabad", "Drive to Rent", "Draft",             None,    None),
    ("Sunita Rao",       "Pune",      "LetzOwn",       "Rejected",          None,    "Duplicate - candidate already onboarded under ID #12."),
]

inserted = 0
for (name, city, plan, status, approver, remarks) in samples:
    cur.execute("SELECT COUNT(*) FROM july_onboarding WHERE driver_name=%s AND city=%s;", (name, city))
    if cur.fetchone()[0] > 0:
        print(f"  [SKIP]  {name} / {city}")
        # Update remarks if it's a Changes Requested record
        if remarks and status == "Changes Requested":
            cur.execute("""
                UPDATE july_onboarding 
                SET approval_status=%s, approval_remarks=%s, current_approver_id=%s
                WHERE driver_name=%s AND city=%s;
            """, (status, remarks, approver, name, city))
            print(f"  [UPDATE] remarks set on {name}")
        continue

    phone = str(abs(hash(name)) % 9000000000 + 1000000000)[:10]

    cur.execute("""
        INSERT INTO july_onboarding (
            driver_name, city, driver_plan,
            approval_status, current_approver_id, approval_remarks,
            created_by, phone_number
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING onboarding_id;
    """, (name, city, plan, status, approver, remarks, exec_id, phone))
    new_id = cur.fetchone()[0]
    print(f"  [INSERT] #{new_id}  {name}  /  {city}  ->  {status}")
    inserted += 1

conn.commit()
print(f"\nDone. Inserted {inserted} new records.")

# Final summary
print("\n--- All onboarding records ---")
cur.execute("""
    SELECT o.onboarding_id, o.driver_name, o.city, o.approval_status,
           COALESCE(pu.username, 'none') as pending_with,
           COALESCE(LEFT(o.approval_remarks, 50), '') as remarks_preview
    FROM july_onboarding o
    LEFT JOIN july_portal_users pu ON pu.portal_user_id = o.current_approver_id
    ORDER BY o.created_at DESC LIMIT 20;
""")
for r in cur.fetchall():
    print(f"  #{r[0]:<4} {r[1]:<22} {r[2]:<12} [{r[3]:<22}] pending={r[4]:<25} {r[5]}")

conn.close()
print("\nRefresh localhost:8000!")
