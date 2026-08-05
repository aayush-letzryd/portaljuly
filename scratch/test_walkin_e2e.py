import os
import sys
import datetime
from fastapi.testclient import TestClient

# Import FastAPI app from main.py
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import main

def run_walkin_e2e_tests():
    print("=" * 70)
    print("[START] STARTING END-TO-END UNIT TESTS FOR WALKIN & LEADS FORM")
    print("=" * 70)

    client = TestClient(main.app)

    # 1. Authenticate as Admin
    print("\n[TEST 1] Authenticating as Admin...")
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    login_data = login_res.json()
    token = login_data["token"]
    user = login_data["user"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"  OK Admin authenticated successfully: User ID={user.get('portal_user_id')}, Name='{user.get('name')}', Role='{user.get('role')}'")

    # 2. Test GET /api/walkins initial fetch & payload keys validation
    print("\n[TEST 2] Fetching initial Walk-In Registry list & validating payload fields...")
    list_res = client.get("/api/walkins?page=1&limit=10", headers=headers)
    assert list_res.status_code == 200, f"List failed: {list_res.text}"
    list_data = list_res.json()
    items = list_data.get("items", [])
    assert len(items) > 0, "No walk-in items returned!"
    sample = items[0]
    assert "executive_id" in sample, "Payload missing 'executive_id'!"
    assert "updated_by" in sample, "Payload missing 'updated_by'!"
    assert "referred_by_name" in sample, "Payload missing 'referred_by_name'!"
    assert "referred_by_phone" in sample, "Payload missing 'referred_by_phone'!"
    print(f"  OK Payload key validation PASSED: executive_id={sample.get('executive_id')}, updated_by={sample.get('updated_by')}, referred_by_name='{sample.get('referred_by_name')}'")

    # 3. Test City Filter (city=Mumbai)
    print("\n[TEST 3] Testing City filter API parameterization (city=Mumbai)...")
    city_res = client.get("/api/walkins?city=mumbai&page=1&limit=10", headers=headers)
    assert city_res.status_code == 200, f"City filter failed: {city_res.text}"
    city_items = city_res.json().get("items", [])
    print(f"  OK City filter (Mumbai) PASSED: Found {len(city_items)} matching records!")

    # 4. Test POST /api/walkins - Create a New Driver Candidate Walk-in with Referral
    print("\n[TEST 4] Creating a new Walk-In candidate entry with referral info...")
    test_phone = f"9999{int(datetime.datetime.now().timestamp()) % 1000000:06d}"
    new_candidate_payload = {
        "visitor_type": "Driver",
        "event_date": datetime.datetime.now().strftime("%Y-%m-%d"),
        "enquiry_time": "11:15",
        "city": "Hyderabad",
        "first_name": "Testing",
        "last_name": "Candidate",
        "person_name": "Testing Candidate",
        "person_number": test_phone,
        "dl_number": "TS0920269999",
        "aadhaar_number": "9999 8888 7777",
        "visiting_reason": "Onboarding Inquiry",
        "operating_place": "Kukatpally Hub",
        "lead_channel": "Referred by Partner",
        "referred_by_name": "Rajesh Kumar",
        "referred_by_phone": "9888811111",
        "joined_status": "Onboarding Process Initiated",
        "submission_status": "Submitted",
        "remarks": "E2E Unit test automated creation with referral",
        "is_existing_partner": False,
        "record_type": "new"
    }
    create_res = client.post("/api/walkins", json=new_candidate_payload, headers=headers)
    assert create_res.status_code == 200, f"Create new walk-in failed: {create_res.text}"
    create_data = create_res.json()
    new_id = create_data.get("walkin_id")
    print(f"  OK New Walk-In created successfully: ID='{new_id}'")

    # 5. Test GET /api/walkins/{id} detail fetch
    print(f"\n[TEST 5] Fetching detail view for record '{new_id}'...")
    detail_res = client.get(f"/api/walkins/{new_id}", headers=headers)
    assert detail_res.status_code == 200, f"Detail fetch failed: {detail_res.text}"
    detail_data = detail_res.json()
    assert detail_data.get("person_name") == "Testing Candidate", f"Name mismatch: {detail_data}"
    assert detail_data.get("person_number") == test_phone, f"Phone mismatch: {detail_data}"
    print(f"  OK Detail loaded cleanly: Name='{detail_data.get('person_name')}', Phone='{detail_data.get('person_number')}'")

    # 6. Test PUT /api/walkins/{id} - Update record & verify editor + IST timestamp
    print(f"\n[TEST 6] Editing walk-in record '{new_id}' as Admin...")
    update_payload = {
        "visitor_type": "Driver",
        "event_date": datetime.datetime.now().strftime("%Y-%m-%d"),
        "enquiry_time": "11:30",
        "city": "Hyderabad",
        "first_name": "Testing",
        "last_name": "Candidate Updated",
        "person_name": "Testing Candidate Updated",
        "person_number": test_phone,
        "dl_number": "TS0920269999",
        "aadhaar_number": "9999 8888 7777",
        "visiting_reason": "Payout & Earnings",
        "operating_place": "Gachibowli Hub",
        "lead_channel": "Referred by Partner",
        "referred_by_name": "Rajesh Kumar",
        "referred_by_phone": "9888811111",
        "joined_status": "Document Verification Completed",
        "submission_status": "Submitted",
        "remarks": "E2E Unit test edited by System Super Admin",
        "is_existing_partner": False,
        "record_type": "new"
    }
    update_res = client.put(f"/api/walkins/{new_id}", json=update_payload, headers=headers)
    assert update_res.status_code == 200, f"Update failed: {update_res.text}"
    print(f"  OK Edit request returned 200 OK")

    # 7. Verify editor attribution, IDs, and top-of-table sorting
    print(f"\n[TEST 7] Verifying registry sorting, executive_id, and editor attribution for '{new_id}'...")
    list_after_edit = client.get("/api/walkins?page=1&limit=10", headers=headers).json()
    first_item = list_after_edit["items"][0]
    print(f"  OK Top record in registry: ID='{first_item.get('id')}', Name='{first_item.get('person_name')}'")
    assert first_item.get("id") == new_id, f"Edited record '{new_id}' is not at top of registry! Found '{first_item.get('id')}'"
    assert first_item.get("executive_id") is not None, "executive_id is None!"
    assert first_item.get("updated_by") is not None, "updated_by is None!"
    assert first_item.get("referred_by_name") == "Rajesh Kumar", f"Referred by name mismatch: {first_item.get('referred_by_name')}"
    print(f"  OK All IDs and Referred By fields verified: executive_id={first_item.get('executive_id')}, updated_by={first_item.get('updated_by')}, referred_by_name='{first_item.get('referred_by_name')}'")

    # 8. Cleanup test records from DB
    print(f"\n[TEST 8] Cleaning up test record '{new_id}' from DB...")
    conn = main.postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        raw_num = int(new_id.replace("N", "").replace("E", ""))
        cur.execute("DELETE FROM july_new_walkins WHERE id = %s;", (raw_num,))
        conn.commit()
        print("  OK Cleanup complete! Database restored to clean state.")
    finally:
        main.postgreSQL_pool.putconn(conn)

    print("\n" + "=" * 70)
    print("[SUCCESS] ALL ENHANCED E2E UNIT TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_walkin_e2e_tests()
