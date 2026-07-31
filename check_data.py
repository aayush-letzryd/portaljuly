import psycopg2, os
conn = psycopg2.connect(
    user=os.environ['DB_USER'], password=os.environ['DB_PASS'],
    host=os.environ['DB_HOST'], port=os.environ['DB_PORT'], database=os.environ['DB_NAME']
)
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM rents;")
print("Rents count:", cur.fetchone()[0])
cur.execute("SELECT id, level, vehicle_model, vehicle_number, vendor_id, driver_id, rent_amount FROM rents ORDER BY id LIMIT 20;")
for row in cur.fetchall():
    print(" ", row)
cur.execute("SELECT COUNT(*) FROM form_onboarding WHERE vendor_type='Operator';")
print("Operators count:", cur.fetchone()[0])
cur.execute("SELECT id, driver_name, vendor_id, city FROM form_onboarding WHERE vendor_type='Operator';")
for row in cur.fetchall():
    print(" ", row)
conn.close()
