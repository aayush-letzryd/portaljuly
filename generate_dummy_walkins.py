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

# Clear existing walkins
cur.execute("DELETE FROM copy_walkins;")

CITIES = ['Bangalore', 'Hyderabad', 'Mumbai']
ROLES = ['Driver', 'Operator', 'Partner']
SOURCES = ['In-person Visit', 'Social Media', 'Referral']
REASONS = ['Onboarding', 'Enquiry']
EXECUTIVES = [(1, 'Chetan'), (2, 'Kiran'), (3, 'Admin'), (5, 'SHAIK ABDULLA')]

def get_random_date():
    start_date = datetime.now() - timedelta(days=30)
    end_date = datetime.now()
    random_days = random.randrange((end_date - start_date).days)
    return (start_date + timedelta(days=random_days)).strftime('%Y-%m-%d')

dummy_names = [
    "Rohit Sharma", "Virat Kohli", "MS Dhoni", "Rahul Dravid", "Kavitha Nair",
    "Sachin Tendulkar", "Sourav Ganguly", "VVS Laxman", "Yuvraj Singh", "Virender Sehwag",
    "Gautam Gambhir", "Zaheer Khan", "Harbhajan Singh", "Anil Kumble", "Jasprit Bumrah",
    "Hardik Pandya", "Rishabh Pant", "Shreyas Iyer", "KL Rahul", "Shikhar Dhawan",
    "Bhuvneshwar Kumar", "Mohammed Shami", "R Ashwin", "Ravindra Jadeja", "Ajinkya Rahane",
    "Cheteshwar Pujara", "Ishan Kishan", "Suryakumar Yadav", "Smriti Mandhana", "Harmanpreet Kaur",
    "Mithali Raj", "Jhulan Goswami", "Shafali Verma", "Jemimah Rodrigues"
]

# Ensure we have exactly 34 records
records = []

# 21 Successfully Onboarded
for i in range(21):
    records.append({
        'status': random.choice(['Successfully Onboarded', 'Onboarded']),
        'name': dummy_names[i]
    })

# 7 Follow Up Required
for i in range(21, 28):
    records.append({
        'status': random.choice(['Follow Up Required', 'Pending']),
        'name': dummy_names[i]
    })

# 6 Others (e.g. Onboarding Process Initiated, Not Interested)
for i in range(28, 34):
    records.append({
        'status': random.choice(['Onboarding Process Initiated', 'Not Interested', 'No Follow Up Required / Closed']),
        'name': dummy_names[i]
    })

random.shuffle(records)

insert_query = """
    INSERT INTO copy_walkins (
        visitor_type, event_date, enquiry_time, mode_of_enquiry,
        first_name, last_name, city, executive_id, person_name,
        person_number, aadhaar_number, dl_number, visiting_reason,
        joined_status, remarks, created_at
    ) VALUES (
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
    )
"""

for r in records:
    name_parts = r['name'].split(' ')
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ''
    
    city = random.choice(CITIES)
    exec_id, exec_name = random.choice(EXECUTIVES)
    
    cur.execute(insert_query, (
        random.choice(ROLES),
        get_random_date(),
        '10:00',
        random.choice(SOURCES),
        first_name,
        last_name,
        city,
        exec_id,
        r['name'],
        f"90{random.randint(10000000, 99999999)}",
        f"{random.randint(100000000000, 999999999999)}",
        f"DL{random.randint(1000000000, 9999999999)}",
        random.choice(REASONS),
        r['status'],
        'Dummy data'
    ))

conn.commit()
cur.close()
conn.close()
print("Successfully inserted 34 dummy walk-in records.")
