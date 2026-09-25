import psycopg2, os
from passlib.context import CryptContext

env = {}
if os.path.exists('.env'):
    with open('.env') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k.strip()] = v.strip()

conn = psycopg2.connect(dsn=env['DATABASE_URL'])
cur = conn.cursor()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
default_pw_hash = pwd_context.hash("123456")

# Users to seed / ensure in DB
new_users = [
    {
        "name": "Sarvagna G",
        "username": "sarvagna@letzryd.com",
        "email": "sarvagna@letzryd.com",
        "company_email": "sarvagna@letzryd.com",
        "role": "CityHead / General Manager",
        "role_id": 218,
        "city": "All Cities",
        "forms": ["adjustment", "onboarding", "walkin", "allocation", "dropoff", "rents", "expenses", "vehicle_onboarding"]
    },
    {
        "name": "Ravikumar Chinnasamy",
        "username": "ravikumar@letzryd.com",
        "email": "ravikumar@letzryd.com",
        "company_email": "ravikumar@letzryd.com",
        "role": "CityHead / General Manager",
        "role_id": 218,
        "city": "All Cities",
        "forms": ["adjustment", "onboarding", "walkin", "allocation", "dropoff", "rents", "expenses", "vehicle_onboarding"]
    },
    {
        "name": "Ramanagouda V Patil",
        "username": "docs2@letzryd.com",
        "email": "docs2@letzryd.com",
        "company_email": "docs2@letzryd.com",
        "role": "Onboarding Executive",
        "role_id": 201,
        "city": "All Cities",
        "forms": ["onboarding", "walkin", "driver_onboarding"]
    }
]

created_ids = {}

for u in new_users:
    # 1. Check if employee exists in july_employees
    cur.execute("SELECT employee_id FROM july_employees WHERE LOWER(company_email) = %s OR LOWER(first_name) LIKE %s;", (u["email"].lower(), f"%{u['name'].split()[0].lower()}%"))
    emp_row = cur.fetchone()
    emp_id = None
    if emp_row:
        emp_id = emp_row[0]
    else:
        name_parts = u["name"].split(" ", 1)
        fname = name_parts[0]
        lname = name_parts[1] if len(name_parts) > 1 else ""
        cur.execute("""
            INSERT INTO july_employees (first_name, last_name, company_email, department, city, is_active, role_id, phone)
            VALUES (%s, %s, %s, 'Operations', %s, TRUE, 34, %s)
            RETURNING employee_id;
        """, (fname, lname, u["email"], u["city"], "9999999999"))
        emp_id = cur.fetchone()[0]

    # 2. Check if portal user exists in july_portal_users
    cur.execute("SELECT portal_user_id FROM july_portal_users WHERE LOWER(username) = %s OR LOWER(email) = %s;", (u["username"].lower(), u["email"].lower()))
    pu_row = cur.fetchone()
    pu_id = None
    if pu_row:
        pu_id = pu_row[0]
        print(f"[EXISTS] User {u['name']} already has portal_user_id: {pu_id}")
    else:
        cur.execute("""
            INSERT INTO july_portal_users (employee_id, username, password_hash, role, role_id, account_status, email, company_email, city)
            VALUES (%s, %s, %s, %s, %s, 'Active', %s, %s, %s)
            RETURNING portal_user_id;
        """, (emp_id, u["username"], default_pw_hash, u["role"], u["role_id"], u["email"], u["company_email"], u["city"]))
        pu_id = cur.fetchone()[0]
        print(f"[CREATED] User {u['name']} created with portal_user_id: {pu_id} (email: {u['email']})")

    created_ids[u["name"]] = pu_id

    # 3. Ensure form access permissions in july_user_form_access
    cur.execute("""
        CREATE TABLE IF NOT EXISTS july_user_form_access (
            id SERIAL PRIMARY KEY,
            portal_user_id INTEGER REFERENCES july_portal_users(portal_user_id) ON DELETE CASCADE,
            form_key VARCHAR(50) NOT NULL,
            can_access BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """)
    for form_key in u["forms"]:
        cur.execute("""
            INSERT INTO july_user_form_access (portal_user_id, form_key, can_access)
            SELECT %s, %s, TRUE
            WHERE NOT EXISTS (
                SELECT 1 FROM july_user_form_access WHERE portal_user_id = %s AND form_key = %s
            );
        """, (pu_id, form_key, pu_id, form_key))

conn.commit()
conn.close()

print("\n=== SUMMARY OF USER CREATION ===")
for name, p_id in created_ids.items():
    print(f"  - {name}: portal_user_id = {p_id}")
