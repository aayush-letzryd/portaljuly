import psycopg2, os
from passlib.context import CryptContext

env_path = r"C:\Users\anura\.gemini\antigravity\scratch\portaljuly\.env"
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ[k.strip()] = v.strip()

conn = psycopg2.connect(dsn=os.environ.get("DATABASE_URL"))
conn.autocommit = False
cur = conn.cursor()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
DEFAULT_PASSWORD = "letzryd@123"
DEFAULT_HASH = pwd_context.hash(DEFAULT_PASSWORD)
print("[START] LetzRyd Access Control Seed Script")

# STEP 1: New Roles
NEW_ROLES = [
    ("Sales and Onboarding Manager", "SOM", "Approval L1 for Onboarding/Ops Execs"),
    ("Ops Manager",                  "OM",  "Approval L1 for Driver Managers/Maintenance"),
    ("CityHead / General Manager",   "CH",  "Approval L1 for City Managers; L2 for DM/ME"),
    ("Business Head",                "BH2", "Approval L2 for City Managers"),
    ("Maintenance Executive",        "ME",  "Handles vehicle maintenance"),
    ("Recovery",                     "RC",  "Handles vehicle/loan recovery"),
    ("GM - Ops",                     "GMO", "General Manager - Operations"),
    ("Ops Executive",                "OE",  "Ops Executive"),
]

role_id_map = {}
for role_name, role_code, desc in NEW_ROLES:
    try:
        cur.execute(
            "INSERT INTO july_roles (role_name, role_code, description, is_active) VALUES (%s,%s,%s,TRUE) ON CONFLICT (role_code) DO UPDATE SET role_name=EXCLUDED.role_name RETURNING role_id;",
            (role_name, role_code, desc)
        )
        row = cur.fetchone()
        if row:
            role_id_map[role_code] = row[0]
        else:
            cur.execute("SELECT role_id FROM july_roles WHERE role_code=%s;", (role_code,))
            r = cur.fetchone()
            if r: role_id_map[role_code] = r[0]
        conn.commit()
    except Exception as e:
        conn.rollback()
        cur.execute("SELECT role_id FROM july_roles WHERE role_code=%s;", (role_code,))
        r = cur.fetchone()
        if r: role_id_map[role_code] = r[0]
        print(f"  [WARN] Role {role_code}: {e}")

for code in ["SA", "CM", "DM", "OB", "AU", "FM", "SP", "MC"]:
    cur.execute("SELECT role_id FROM july_roles WHERE role_code=%s;", (code,))
    r = cur.fetchone()
    if r: role_id_map[code] = r[0]

print(f"[OK] Roles: {role_id_map}")

# STEP 2: Tables
cur.execute("""
    CREATE TABLE IF NOT EXISTS july_user_form_access (
        id SERIAL PRIMARY KEY,
        portal_user_id INTEGER NOT NULL,
        form_key VARCHAR(50) NOT NULL,
        can_access BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (portal_user_id, form_key)
    );
""")
cur.execute("""
    CREATE TABLE IF NOT EXISTS july_user_approval_chain (
        id SERIAL PRIMARY KEY,
        portal_user_id INTEGER NOT NULL,
        level INTEGER NOT NULL,
        approver_role_code VARCHAR(20) NOT NULL,
        approver_city VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (portal_user_id, level)
    );
""")
conn.commit()
print("[OK] Tables created")

# STEP 3: Placeholder Approver Accounts
CITIES = ["Bangalore", "Hyderabad", "Mumbai"]
PLACEHOLDER_ROLES = [
    ("Sales and Onboarding Manager", "SOM"),
    ("Ops Manager", "OM"),
    ("CityHead / General Manager", "CH"),
    ("Business Head", "BH2"),
]

placeholder_user_map = {}

def get_or_create_employee(first_name, last_name, role_id, email, city):
    cur.execute("SELECT employee_id FROM july_employees WHERE company_email=%s;", (email,))
    row = cur.fetchone()
    if row: return row[0]
    try:
        cur.execute(
            "INSERT INTO july_employees (first_name, last_name, role_id, phone, company_email, department, city, is_active) VALUES (%s,%s,%s,%s,%s,%s,%s,TRUE) RETURNING employee_id;",
            (first_name, last_name, role_id, "0000000000", email, "Operations", city)
        )
        r = cur.fetchone()
        conn.commit()
        return r[0] if r else None
    except Exception as e:
        conn.rollback()
        cur.execute("SELECT employee_id FROM july_employees WHERE company_email=%s;", (email,))
        r = cur.fetchone()
        return r[0] if r else None

def get_or_create_portal_user(username, password_hash, emp_id, role_id, role_name):
    cur.execute("SELECT portal_user_id FROM july_portal_users WHERE username=%s;", (username,))
    row = cur.fetchone()
    if row:
        cur.execute("UPDATE july_portal_users SET password_hash=%s, role_id=%s, account_status='Active' WHERE username=%s;", (password_hash, role_id, username))
        conn.commit()
        return row[0]
    try:
        cur.execute(
            "INSERT INTO july_portal_users (username, password_hash, employee_id, role_id, account_status, role) VALUES (%s,%s,%s,%s,'Active',%s) RETURNING portal_user_id;",
            (username, password_hash, emp_id, role_id, role_name)
        )
        r = cur.fetchone()
        conn.commit()
        return r[0] if r else None
    except Exception as e:
        conn.rollback()
        cur.execute("SELECT portal_user_id FROM july_portal_users WHERE username=%s;", (username,))
        r = cur.fetchone()
        return r[0] if r else None

for role_name, role_code in PLACEHOLDER_ROLES:
    rid = role_id_map.get(role_code)
    for city in CITIES:
        city_slug = city.lower()
        username = f"{role_code.lower()}.{city_slug}"
        full_name = f"{role_name} - {city}"
        email = f"{role_code.lower()}.{city_slug}@letzryd.com"
        emp_id = get_or_create_employee(full_name, "", rid, email, city)
        if emp_id:
            uid = get_or_create_portal_user(username, DEFAULT_HASH, emp_id, rid, role_name)
            if uid:
                placeholder_user_map[username] = uid
                placeholder_user_map[f"{role_code}_{city}"] = uid
                print(f"  [OK] Placeholder {username} -> ID:{uid}")

conn.commit()
print(f"[OK] {len(PLACEHOLDER_ROLES)*len(CITIES)} placeholder accounts done")

# STEP 4: Real Users
# columns: name, email, username, designation, city, role_code,
#          walkin, onboarding, allocation, dropoff, adjustment, rent_plan, vehicle_ob,
#          ap1_code, ap1_city, ap2_code, ap2_city
REAL_USERS = [
    ("Chethan C","chethan@letzryd.com","chethan","Onboarding Executive","Bangalore","OB",True,True,True,True,False,False,True,"SOM","Bangalore","CH","Bangalore"),
    ("Nandhitha K","nanditha@letzryd.com","nanditha","Onboarding Executive","Bangalore","OB",True,True,True,True,False,False,False,"SOM","Bangalore","CH","Bangalore"),
    ("Yashaswini B S","yashaswini@letzryd.com","yashaswini","Onboarding Executive","Bangalore","OB",True,True,True,True,False,False,False,"SOM","Bangalore","CH","Bangalore"),
    ("Yashwanth Kumar S","yashwanth@letzryd.com","yashwanth","Ops Executive","Bangalore","OE",False,False,True,True,False,False,True,"SOM","Bangalore","CH","Bangalore"),
    ("Jagadish Kumar Benal","jagadish@letzryd.com","jagadish","Ops Executive","Bangalore","OE",False,False,True,True,False,False,True,"SOM","Bangalore","CH","Bangalore"),
    ("Venika B","venika@letzryd.com","venika","Driver Manager","Bangalore","DM",True,False,False,False,True,False,False,"OM","Bangalore","CH","Bangalore"),
    ("Arjun M","arjun@letzryd.com","arjun","Driver Manager","Bangalore","DM",True,False,False,False,True,False,False,"OM","Bangalore","CH","Bangalore"),
    ("Nandhini M","nandhini@letzryd.com","nandhini","Driver Manager","Bangalore","DM",True,False,False,False,True,False,False,"OM","Bangalore","CH","Bangalore"),
    ("Swathi V","swathi@letzryd.com","swathi","Driver Manager","Bangalore","DM",True,False,False,False,True,False,False,"OM","Bangalore","CH","Bangalore"),
    ("Manoj Kumar","manoj@letzryd.com","manoj","Driver Manager","Bangalore","DM",True,False,True,True,True,False,False,"OM","Bangalore","CH","Bangalore"),
    ("Syed Faizan","syed@letzryd.com","syed","City Manager","Bangalore","CM",True,False,True,True,True,True,False,"CH","Bangalore","BH2","Bangalore"),
    ("Kiran M K","kiran@letzryd.com","kiran","City Manager","Bangalore","CM",True,False,True,True,True,True,False,"CH","Bangalore","BH2","Bangalore"),
    ("Shridhara V","shridhara@letzryd.com","shridhara","City Manager","Bangalore","CM",True,True,True,True,False,False,True,"CH","Bangalore","BH2","Bangalore"),
    ("P S Radha Krishna","radha.krishna@letzryd.com","radha.krishna","Onboarding Executive","Hyderabad","OB",True,True,True,True,False,False,False,"SOM","Hyderabad","CH","Hyderabad"),
    ("Shaik Abdulla","abdulla@letzryd.com","abdulla","Onboarding Executive","Hyderabad","OB",True,True,True,True,False,False,False,"SOM","Hyderabad","CH","Hyderabad"),
    ("Kiran Kumar Nuthaki","kiran.kumar@letzryd.com","kiran.kumar","Onboarding Executive","Hyderabad","OB",True,True,True,True,True,False,False,"SOM","Hyderabad","CH","Hyderabad"),
    ("Kondrapally Naresh","naresh@letzryd.com","naresh","Driver Manager","Hyderabad","DM",True,False,False,False,False,False,False,"OM","Hyderabad","CH","Hyderabad"),
    ("Gogula Durganjaneyulu","durganjaneyulu@letzryd.com","durganjaneyulu","Driver Manager","Hyderabad","DM",True,True,False,False,True,False,False,"OM","Hyderabad","CH","Hyderabad"),
    ("Sandeep Borra","sandeep@letzryd.com","sandeep","City Manager","Hyderabad","CM",True,True,True,True,False,True,False,"CH","Hyderabad","BH2","Hyderabad"),
    ("Palli Sathish Kumar","sathish@letzryd.com","sathish","City Manager","Hyderabad","CM",True,True,True,True,False,True,True,"CH","Hyderabad","BH2","Hyderabad"),
    ("Pranay Naidu Dasineni","pranay@letzryd.com","pranay","Maintenance Executive","Hyderabad","ME",False,False,False,False,False,False,True,"OM","Hyderabad","CH","Hyderabad"),
    ("Katherapaka Abhinav","abhinav@letzryd.com","abhinav","Maintenance Executive","Hyderabad","ME",False,False,False,False,False,False,True,"OM","Hyderabad","CH","Hyderabad"),
    ("Akash Sarjerao Kamble","akash@letzryd.com","akash","Onboarding Executive","Mumbai","OB",True,True,True,False,True,False,True,"SOM","Mumbai","CH","Mumbai"),
    ("Ankita Londhe","ankita@letzryd.com","ankita","Onboarding Executive","Mumbai","OB",True,True,True,False,False,False,False,"SOM","Mumbai","CH","Mumbai"),
    ("Vinay Vinod Sharma","vinay@letzryd.com","vinay","Onboarding Executive","Mumbai","OB",True,True,True,True,True,False,True,"SOM","Mumbai","CH","Mumbai"),
    ("Soni Dharmendra Jaiswal","mum.telecaller1@letzryd.com","mum.telecaller1","Driver Manager","Mumbai","DM",True,False,False,True,True,False,False,"OM","Mumbai","CH","Mumbai"),
    ("Nitesh Genu Ghadge","nitesh@letzryd.com","nitesh","Driver Manager","Mumbai","DM",True,False,False,True,True,False,False,"OM","Mumbai","CH","Mumbai"),
    ("Deepak Puran Thapa","deepak@letzryd.com","deepak","City Manager","Mumbai","CM",True,True,True,True,True,True,True,"CH","Mumbai","BH2","Mumbai"),
    ("Tapan","tapan@letzryd.com","tapan","City Manager","Mumbai","CM",True,True,True,True,True,True,True,"CH","Mumbai","BH2","Mumbai"),
    ("Pritam Laxman Kadam","pritam@letzryd.com","pritam","Recovery","Mumbai","RC",False,False,False,False,False,False,True,"BH2","Mumbai","SA",None),
    ("Mohan Kumar","mohan@letzryd.com","mohan","GM - Ops","Bangalore","GMO",True,True,True,True,True,True,True,"BH2","Bangalore","SA",None),
]

FORM_KEYS = ["walkin","onboarding","allocation","dropoff","adjustment","rents","vehicle_onboarding"]
real_user_map = {}

for user_data in REAL_USERS:
    (name,email,username,designation,city,role_code,
     walkin,onboarding,allocation,dropoff,adjustment,rent_plan,vehicle_ob,
     ap1_code,ap1_city,ap2_code,ap2_city) = user_data
    
    rid = role_id_map.get(role_code, role_id_map.get("OB"))
    parts = name.split(" ", 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ""
    
    emp_id = get_or_create_employee(first_name, last_name, rid, email, city)
    if not emp_id:
        print(f"  [SKIP] No emp_id for {username}")
        continue
    
    uid = get_or_create_portal_user(username, DEFAULT_HASH, emp_id, rid, designation)
    if not uid:
        print(f"  [SKIP] No portal_user_id for {username}")
        continue
    
    real_user_map[username] = uid
    
    access_flags = dict(zip(FORM_KEYS, [walkin, onboarding, allocation, dropoff, adjustment, rent_plan, vehicle_ob]))
    for fk, ca in access_flags.items():
        cur.execute(
            "INSERT INTO july_user_form_access (portal_user_id, form_key, can_access) VALUES (%s,%s,%s) ON CONFLICT (portal_user_id, form_key) DO UPDATE SET can_access=EXCLUDED.can_access;",
            (uid, fk, ca)
        )
    
    if ap1_code:
        cur.execute(
            "INSERT INTO july_user_approval_chain (portal_user_id, level, approver_role_code, approver_city) VALUES (%s,1,%s,%s) ON CONFLICT (portal_user_id, level) DO UPDATE SET approver_role_code=EXCLUDED.approver_role_code, approver_city=EXCLUDED.approver_city;",
            (uid, ap1_code, ap1_city)
        )
    if ap2_code:
        cur.execute(
            "INSERT INTO july_user_approval_chain (portal_user_id, level, approver_role_code, approver_city) VALUES (%s,2,%s,%s) ON CONFLICT (portal_user_id, level) DO UPDATE SET approver_role_code=EXCLUDED.approver_role_code, approver_city=EXCLUDED.approver_city;",
            (uid, ap2_code, ap2_city)
        )
    
    form_list = [k for k,v in access_flags.items() if v]
    print(f"  [OK] {username} (ID:{uid}) {city} {role_code} -> forms:{form_list}")

# STEP 5: Give admin full access
cur.execute("SELECT portal_user_id FROM july_portal_users WHERE username='admin';")
row = cur.fetchone()
if row:
    ALL_FORMS = ["walkin","onboarding","allocation","dropoff","adjustment","rents","vehicle_onboarding","expenses","workshops","hubs_parking","accident","inspection","users","vehicle_models","cities","roles","tickets","employees","maintenance","challans","approvals"]
    for fk in ALL_FORMS:
        cur.execute("INSERT INTO july_user_form_access (portal_user_id, form_key, can_access) VALUES (%s,%s,TRUE) ON CONFLICT (portal_user_id, form_key) DO UPDATE SET can_access=TRUE;", (row[0], fk))
    print(f"[OK] Admin (ID:{row[0]}) -> full access")

conn.commit()

cur.execute("SELECT COUNT(*) FROM july_portal_users WHERE account_status='Active';")
cur.execute("SELECT COUNT(*) FROM july_user_form_access;")
cur.execute("SELECT COUNT(*) FROM july_user_approval_chain;")

print(f"\n===== SEED COMPLETE =====")
print(f"Real users: {len(real_user_map)}")
print(f"Placeholder accounts: {len(PLACEHOLDER_ROLES)*len(CITIES)}")
print(f"Password for all: {DEFAULT_PASSWORD}")
conn.close()
