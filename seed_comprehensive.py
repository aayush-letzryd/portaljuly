# Save as seed_comprehensive.py
import psycopg2
import json
from datetime import datetime, timedelta
import random

env = {}
with open('.env') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()

conn = psycopg2.connect(dsn=env['DATABASE_URL'])
cur = conn.cursor()

# Get portal users
cur.execute("SELECT portal_user_id, username, role_id FROM july_portal_users ORDER BY role_id LIMIT 5;")
portal_users = cur.fetchall()
print('Portal users:', portal_users)

if not portal_users:
    print('No portal users found! Cannot seed approval data.')
    conn.close()
    exit()

executive_id = portal_users[-1][0]  # Last user = lowest role (executive)
approver_id = portal_users[0][0]    # First user = highest role (manager)

print(f'Using executive_id={executive_id}, approver_id={approver_id}')

# 1. Seed Walk-ins
walkin_data = [
    ('Arun Prasad', '9871234567', 'Hyderabad', 'Driver', '2026-07-25', '09:30', 'Successfully Onboarded', 'Direct Walk-in', 'Onboarding', 'Arun', 'Prasad', 'TS04-20231234567', '1234 5678 9012'),
    ('Divya Nair', '9845678901', 'Bangalore', 'Driver', '2026-07-26', '10:00', 'Follow Up Required', 'Telecaller', 'Onboarding', 'Divya', 'Nair', 'KA01-20209876543', '2345 6789 0123'),
    ('Ravi Teja', '9932145678', 'Mumbai', 'Operator', '2026-07-27', '11:30', 'Onboarding Process Initiated', 'FSE', 'Onboarding', 'Ravi', 'Teja', 'MH14-20181234567', '3456 7890 1234'),
    ('Swetha G', '9756123456', 'Hyderabad', 'Driver', '2026-07-28', '14:00', 'Successfully Onboarded', 'Driver Referral', 'Onboarding', 'Swetha', 'G', 'TS09-20211234567', '4567 8901 2345'),
    ('Sanjay Kumar', '9812356789', 'Bangalore', 'Driver', '2026-07-29', '15:30', 'No Follow Up Required / Closed', 'Vendor', 'Enquiry', 'Sanjay', 'Kumar', None, None),
    ('Kavitha R', '9898765432', 'Hyderabad', 'Driver', '2026-07-30', '09:00', 'Onboarding Process Initiated', 'Direct Walk-in', 'Onboarding', 'Kavitha', 'R', 'TS07-20201234567', '5678 9012 3456'),
    ('Mohan Das', '9776543210', 'Mumbai', 'Operator', '2026-07-31', '10:30', 'Follow Up Required', 'Direct Walk-in', 'Onboarding', 'Mohan', 'Das', 'MH12-20191234567', '6789 0123 4567'),
    ('Preeti Singh', '9934512678', 'Hyderabad', 'Driver', '2026-08-01', '11:00', 'Draft', 'Direct Walk-in', 'Onboarding', 'Preeti', 'Singh', None, None),
]

for w in walkin_data:
    try:
        cur.execute("""
            INSERT INTO copy_walkins 
            (person_name, person_number, city, visitor_type, event_date, enquiry_time,
             joined_status, mode_of_enquiry, visiting_reason, first_name, last_name,
             dl_number, aadhaar_number, executive_id, lead_channel)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (w[0], w[1], w[2], w[3], w[4], w[5], w[6], w[7], w[8], w[9], w[10], w[11], w[12], 2, w[7]))
        conn.commit()
        print(f'Walk-in inserted: {w[0]}')
    except Exception as e:
        conn.rollback()
        print(f'Walk-in error {w[0]}: {e}')

# 2. Seed Onboarding records in july_onboarding
onboarding_data = [
    ('Arun Prasad Driver', '9871234567', 'Hyderabad', 'Drive to Rent', 'Pending Approval', approver_id, executive_id),
    ('Divya Nair Driver', '9845678901', 'Bangalore', 'Drive to Own', 'Approved', None, executive_id),
    ('Ravi Teja Operator', '9932145678', 'Mumbai', 'LetzOwn Operator', 'Changes Requested', None, executive_id),
    ('Swetha G Driver', '9756123456', 'Hyderabad', 'Drive to Rent', 'Draft', None, executive_id),
    ('Kavitha R Driver', '9898765432', 'Hyderabad', 'Drive to Rent', 'Rejected', None, executive_id),
]

for o in onboarding_data:
    try:
        remarks = 'Please verify the DL expiry date and resubmit' if o[4] == 'Changes Requested' else None
        cur.execute("""
            INSERT INTO july_onboarding 
            (driver_name, phone_number, city, driver_plan, approval_status, 
             current_approver_id, created_by, created_at, approval_remarks)
            VALUES (%s,%s,%s,%s,%s,%s,%s,NOW(),%s)
        """, (o[0], o[1], o[2], o[3], o[4], o[5], o[6], remarks))
        conn.commit()
        print(f'Onboarding inserted: {o[0]}')
    except Exception as e:
        conn.rollback()
        print(f'Onboarding error {o[0]}: {e}')

# 3. Seed Vehicle records in july_vehicles
vehicle_data = [
    ('TS09AB1234', 'Hyderabad', 'Tata', 'Nexon EV', 'EV', 'Pending Approval', approver_id, executive_id),
    ('KA03CD5678', 'Bangalore', 'Tata', 'Xpres-T EV', 'EV', 'Approved', None, executive_id),
    ('MH14EF9012', 'Mumbai', 'Mahindra', 'e2o Plus', 'EV', 'Draft', None, executive_id),
    ('TS07GH3456', 'Hyderabad', 'Tata', 'Tigor EV', 'EV', 'Changes Requested', None, executive_id),
]

for v in vehicle_data:
    try:
        cur.execute("""
            INSERT INTO july_vehicles
            (vehicle_number, city, manufacturer, model, fuel_type, approval_status,
             current_approver_id, created_by, created_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,NOW())
        """, (v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7]))
        conn.commit()
        print(f'Vehicle inserted: {v[0]}')
    except Exception as e:
        conn.rollback()
        print(f'Vehicle error {v[0]}: {e}')

# 4. Log entries for approval chain
for mod in ['individual_onboarding', 'vehicle_onboarding']:
    try:
        cur.execute("""
            INSERT INTO july_approval_chain_logs 
            (module_name, record_id, from_user_id, to_user_id, action, remarks, action_at)
            VALUES (%s, 1, %s, %s, 'SUBMITTED', 'Submitted for review and approval', NOW())
        """, (mod, executive_id, approver_id))
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f'Log error: {e}')

print('\nAll seeding complete!')
conn.close()
