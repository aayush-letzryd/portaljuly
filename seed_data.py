"""
Quick seed script to insert operator onboarding records and rent plans.
Run: python seed_data.py
"""
import psycopg2, os

conn = psycopg2.connect(
    user=os.environ.get("DB_USER"),
    password=os.environ.get("DB_PASS"),
    host=os.environ.get("DB_HOST"),
    port=os.environ.get("DB_PORT", "5432"),
    database=os.environ.get("DB_NAME")
)
cur = conn.cursor()

# ── Ensure rents table has new columns ─────────────────────
cur.execute("ALTER TABLE rents ADD COLUMN IF NOT EXISTS level VARCHAR(50) DEFAULT 'model';")
cur.execute("ALTER TABLE rents ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(100);")

# ── Seed operator onboarding records ───────────────────────
cur.execute("SELECT COUNT(*) FROM form_onboarding WHERE vendor_type = 'Operator';")
if cur.fetchone()[0] == 0:
    op_sql = """
        INSERT INTO form_onboarding (
            driver_name, phone_number, whatsapp_number, dob, city, operating_place,
            present_address, permanent_address, emergency_name, emergency_phone,
            pan_number, aadhaar_number, vendor_name, vendor_id, vendor_type,
            father_name, custom_rent_amount, bank_name, account_number, ifsc_code, upi_id
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s);
    """
    op_records = [
        ("Hyderabad Fleet Services", "9876543210", "9876543210", "1970-01-01", "Hyderabad", "Jubilee Hub",
         "Plot 45, HITEC City, Hyderabad - 500081", "Plot 45, HITEC City, Hyderabad - 500081",
         "N/A", "0000000000", "AABCH5432E", "432156789012",
         "Hyderabad Fleet Services", "VND-HYD-001", "Operator",
         "N/A", "1200", "HDFC Bank", "50100123456789", "HDFC0001234", "hfs@hdfcbank"),
        ("Bangalore Cabs Network", "8765432190", "8765432190", "1970-01-01", "Bangalore", "Koramangala Hub",
         "3rd Floor, Tech Park, Whitefield, Bangalore - 560066", "3rd Floor, Tech Park, Whitefield, Bangalore - 560066",
         "N/A", "0000000000", "BNKCA1234C", "567890123456",
         "Bangalore Cabs Network", "VND-BLR-001", "Operator",
         "N/A", "1350", "ICICI Bank", "123456789012", "ICIC0001234", "bcn@icicibank"),
        ("Delhi Drive Fleet", "7654321098", "7654321098", "1970-01-01", "Delhi", "Connaught Place Hub",
         "12 Barakhamba Road, New Delhi - 110001", "12 Barakhamba Road, New Delhi - 110001",
         "N/A", "0000000000", "DDFLT3210B", "678901234567",
         "Delhi Drive Fleet", "VND-DEL-001", "Operator",
         "N/A", "1100", "State Bank of India", "36987412365", "SBIN0001234", "ddf@sbi"),
    ]
    for r in op_records:
        cur.execute(op_sql, r)
    print("[OK] Operator onboarding records seeded")
else:
    print("[SKIP] Operator records already exist")

# ── Seed rent plans ────────────────────────────────────────
cur.execute("SELECT COUNT(*) FROM rents;")
if cur.fetchone()[0] == 0:
    rent_sql = """
        INSERT INTO rents (level, vehicle_model, vehicle_number, vehicle_age, vendor_id, driver_id, rent_amount)
        VALUES (%s, %s, %s, %s, %s, %s, %s);
    """
    rent_records = [
        ("model", "WagonR",  None, "0-2 Years", None, None, 900),
        ("model", "WagonR",  None, "3-5 Years", None, None, 800),
        ("model", "WagonR",  None, ">5 Years",  None, None, 700),
        ("model", "Swift",   None, "0-2 Years", None, None, 950),
        ("model", "Swift",   None, "3-5 Years", None, None, 850),
        ("model", "Ertiga",  None, "0-2 Years", None, None, 1200),
        ("model", "Innova",  None, "0-2 Years", None, None, 1500),
        ("model", "Alto",    None, "0-2 Years", None, None, 750),
        ("vehicle", "WagonR", "TS09 EA 1001", None, None, None, 870),
        ("vehicle", "Swift",  "KA01 AB 2002", None, None, None, 920),
        ("operator", None, None, None, "VND-HYD-001", None, 1200),
        ("operator", None, None, None, "VND-BLR-001", None, 1350),
        ("operator", None, None, None, "VND-DEL-001", None, 1100),
        ("driver", None, None, None, None, "DR-HYD-001", 1100),
        ("driver", None, None, None, None, "DR-HYD-002", 1150),
        ("driver", None, None, None, None, "DR-BLR-001", 1250),
    ]
    for r in rent_records:
        cur.execute(rent_sql, r)
    print("[OK] Rent plans seeded")
else:
    print("[SKIP] Rent plans already exist")

conn.commit()
cur.close()
conn.close()
print("[DONE] Seeding complete")
