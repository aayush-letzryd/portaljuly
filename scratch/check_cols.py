from main import postgreSQL_pool

conn = postgreSQL_pool.getconn()
cur = conn.cursor()

query = """
    SELECT 
        f.id AS id,
        f.id AS onboarding_id,
        COALESCE(f.driver_id, f.vendor_id, 'DRV-' || f.id) AS driver_id,
        COALESCE(f.driver_name, f.vendor_name, 'Partner') AS driver_name,
        f.phone_number,
        f.city,
        f.rental_model AS driver_plan,
        f.father_name,
        f.present_address,
        f.emergency_name,
        f.emergency_phone,
        f.dl_number AS driving_license,
        f.pan_number,
        f.aadhaar_number,
        COALESCE(f.approval_status, 'Draft') AS approval_status,
        f.created_by,
        f.updated_by,
        f.current_approver_id,
        f.approved_by,
        f.approval_note AS approval_remarks,
        f.created_at,
        f.updated_at,
        f.security_deposit,
        f.custom_rent_amount AS daily_rent,
        COALESCE(f.vendor_type, f.candidate_role, 'Driver') AS vendor_type,
        COALESCE(f.candidate_role, f.vendor_type, 'Driver') AS candidate_role,
        COALESCE(NULLIF(TRIM(CONCAT(e1.first_name, ' ', e1.last_name)), ''), u1.username, 'Admin') AS executive_name,
        COALESCE(NULLIF(TRIM(CONCAT(e2.first_name, ' ', e2.last_name)), ''), u2.username, NULLIF(TRIM(CONCAT(e1.first_name, ' ', e1.last_name)), ''), u1.username, '—') AS updated_by_name
    FROM july_form_onboarding f
    LEFT JOIN july_portal_users u1 ON u1.portal_user_id = f.created_by
    LEFT JOIN july_employees e1 ON e1.employee_id = u1.employee_id
    LEFT JOIN july_portal_users u2 ON u2.portal_user_id = f.updated_by
    LEFT JOIN july_employees e2 ON e2.employee_id = u2.employee_id
    WHERE 1=1
    ORDER BY COALESCE(f.updated_at, f.created_at) DESC, f.id DESC LIMIT 100;
"""

cur.execute(query)
rows = cur.fetchall()
print("SUCCESS! Total Onboarding Records Returned:", len(rows))
for r in rows[:10]:
    print("Record:", r[0], "| Name:", r[3], "| Phone:", r[4], "| City:", r[5], "| Status:", r[14])

postgreSQL_pool.putconn(conn)
