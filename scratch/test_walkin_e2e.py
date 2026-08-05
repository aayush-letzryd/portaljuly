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

    # 2. Test GET /api/walkins initial fetch
    print("\n[TEST 2] Fetching initial Walk-In Registry list...")
    list_res = client.get("/api/walkins?page=1&limit=10", headers=headers)
    assert list_res.status_code == 200, f"List failed: {list_res.text}"
    list_data = list_res.json()
    initial_total = list_data.get("total", 0)
    print(f"  OK Initial total walk-in records in system: {initial_total}")

    # 3. Test POST /api/walkins - Create a New Driver Candidate Walk-in
    print("\n[TEST 3] Creating a new New Walk-In candidate entry...")
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
        "lead_channel": "Direct Walk-in",
        "joined_status": "Onboarding Process Initiated",
        "submission_status": "Submitted",
        "remarks": "E2E Unit test automated creation",
        "is_existing_partner": False,
        "record_type": "new"
    }
    create_res = client.post("/api/walkins", json=new_candidate_payload, headers=headers)
    assert create_res.status_code == 200, f"Create new walk-in failed: {create_res.text}"
    create_data = create_res.json()
    new_id = create_data.get("walkin_id")
    print(f"  OK New Walk-In created successfully: ID='{new_id}'")

    # 4. Test GET /api/walkins/{id} detail fetch
    print(f"\n[TEST 4] Fetching detail view for record '{new_id}'...")
    detail_res = client.get(f"/api/walkins/{new_id}", headers=headers)
    assert detail_res.status_code == 200, f"Detail fetch failed: {detail_res.text}"
    detail_data = detail_res.json()
    assert detail_data.get("person_name") == "Testing Candidate", f"Name mismatch: {detail_data}"
    assert detail_data.get("person_number") == test_phone, f"Phone mismatch: {detail_data}"
    print(f"  OK Detail loaded cleanly: Name='{detail_data.get('person_name')}', Phone='{detail_data.get('person_number')}'")

    # 5. Test Phone duplicate check / search auto-fill lookup
    print(f"\n[TEST 5] Testing phone lookup for duplicate detection ({test_phone})...")
    search_res = client.get(f"/api/walkins?search={test_phone}", headers=headers)
    assert search_res.status_code == 200, f"Search failed: {search_res.text}"
    search_data = search_res.json()
    found_items = search_data.get("items", [])
    assert len(found_items) > 0, "Candidate phone search yielded no results!"
    print(f"  OK Candidate duplicate lookup verified! Found candidate: '{found_items[0].get('person_name')}'")

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
        "lead_channel": "Direct Walk-in",
        "joined_status": "Document Verification Completed",
        "submission_status": "Submitted",
        "remarks": "E2E Unit test edited by System Super Admin",
        "is_existing_partner": False,
        "record_type": "new"
    }
    update_res = client.put(f"/api/walkins/{new_id}", json=update_payload, headers=headers)
    assert update_res.status_code == 200, f"Update failed: {update_res.text}"
    print(f"  OK Edit request returned 200 OK")

    # 7. Verify editor attribution and top-of-table sorting
    print(f"\n[TEST 7] Verifying registry sorting and editor attribution for '{new_id}'...")
    list_after_edit = client.get("/api/walkins?page=1&limit=10", headers=headers).json()
    first_item = list_after_edit["items"][0]
    print(f"  OK Top record in registry: ID='{first_item.get('id')}', Name='{first_item.get('person_name')}'")
    assert first_item.get("id") == new_id, f"Edited record '{new_id}' is not at top of registry! Found '{first_item.get('id')}'"
    print(f"  OK Sorting verified: Most recently edited record '{new_id}' is at the TOP of the table!")
    
    updated_by = first_item.get("updated_by_name")
    print(f"  OK Editor attribution: 'LAST EDITED BY' = '{updated_by}'")
    assert updated_by in ["System Super Admin", "admin"], f"Expected System Super Admin, got '{updated_by}'"
    print(f"  OK Editor attribution verified! Matches logged-in Admin.")

    # 8. Test POST /api/walkins - Save as Draft
    print("\n[TEST 8] Creating a Draft Walk-In entry...")
    draft_payload = {
        "visitor_type": "Operator",
        "event_date": datetime.datetime.now().strftime("%Y-%m-%d"),
        "enquiry_time": "12:00",
        "city": "Mumbai",
        "first_name": "Draft",
        "last_name": "Operator",
        "person_name": "Draft Operator",
        "person_number": "9888877777",
        "visiting_reason": "Hisaab & Payout",
        "lead_channel": "Direct Walk-in",
        "joined_status": "Onboarding Process Initiated",
        "submission_status": "Draft",
        "remarks": "Draft record for unit test",
        "is_existing_partner": False,
        "record_type": "new"
    }
    draft_res = client.post("/api/walkins", json=draft_payload, headers=headers)
    assert draft_res.status_code == 200, f"Draft creation failed: {draft_res.text}"
    draft_id = draft_res.json().get("walkin_id")
    print(f"  OK Draft Walk-In created: ID='{draft_id}'")

    # 9. Test Drafts filter query
    print("\n[TEST 9] Fetching Drafts list (`status=Draft`)...")
    drafts_list_res = client.get("/api/walkins?status=Draft&time_period=all&limit=100", headers=headers)
    assert drafts_list_res.status_code == 200, f"Drafts list failed: {drafts_list_res.text}"
    drafts_items = drafts_list_res.json().get("items", [])
    draft_ids = [d["id"] for d in drafts_items]
    assert draft_id in draft_ids, f"Draft ID '{draft_id}' not found in drafts list: {draft_ids}"
    print(f"  OK Drafts filter verified! Record '{draft_id}' present in Drafts inbox.")

    # 10. Test GET /api/stats metrics calculation
    print("\n[TEST 10] Testing Walk-in stats summary metrics (/api/stats)...")
    stats_res = client.get("/api/stats?page=1&limit=10", headers=headers)
    assert stats_res.status_code == 200, f"Stats endpoint failed: {stats_res.text}"
    stats_data = stats_res.json()
    print(f"  OK Stats loaded: Total={stats_data.get('total')}, Joined={stats_data.get('joined')}, Pending={stats_data.get('pending')}, Drivers={stats_data.get('individuals')}, Operators={stats_data.get('operators')}")
    assert "total" in stats_data and "joined" in stats_data, "Stats structure missing required fields!"

    # 11. Cleanup test records from DB
    print(f"\n[TEST 11] Cleaning up test records '{new_id}' and '{draft_id}' from DB...")
    conn = main.postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        for rec_id in [new_id, draft_id]:
            raw_num = int(rec_id.replace("N", "").replace("E", ""))
            cur.execute("DELETE FROM july_new_walkins WHERE id = %s;", (raw_num,))
        conn.commit()
        print("  OK Cleanup complete! Database restored to clean state.")
    finally:
        main.postgreSQL_pool.putconn(conn)

    print("\n" + "=" * 70)
    print("[SUCCESS] ALL 11 E2E UNIT TESTS FOR WALKIN & LEADS FORM PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_walkin_e2e_tests()
