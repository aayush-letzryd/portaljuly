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

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='copy_walkins' ORDER BY ordinal_position;")
print('copy_walkins columns:', [r[0] for r in cur.fetchall()])

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='copy_vehicle_allocations' ORDER BY ordinal_position;")
print('copy_vehicle_allocations columns:', [r[0] for r in cur.fetchall()])

conn.close()
