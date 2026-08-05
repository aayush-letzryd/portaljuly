import os
import sys
import datetime
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import main

def perform_adversarial_bug_hunting():
    print("=" * 75)
    print("[BUG HUNTING] DEEP ADVERSARIAL EDGE CASE & BUG AUDIT")
    print("=" * 75)

    client = TestClient(main.app, raise_server_exceptions=False)
    bugs_found = []

    def log_result(test_name, success, details):
        if success:
            print(f"  [PASS] {test_name}: {details}")
        else:
            print(f"  [BUG DISCOVERED] {test_name}: {details}")
            bugs_found.append({"test": test_name, "issue": details})

    # 1. Login as Admin
    r_login = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert r_login.status_code == 200, "Login failed!"
    token = r_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # CATEGORY A: AUTH & RBAC SECURITY
    print("\n--- CATEGORY A: AUTH & RBAC BOUNDARY AUDIT ---")
    r_no_auth = client.get("/api/walkins")
    log_result("Unauthenticated Request Guard", r_no_auth.status_code in [401, 403], f"Status: {r_no_auth.status_code}")

    r_bad_token = client.get("/api/walkins", headers={"Authorization": "Bearer invalid_junk_token_123"})
    log_result("Invalid JWT Bearer Token Guard", r_bad_token.status_code in [401, 403], f"Status: {r_bad_token.status_code}")

    # CATEGORY B: QUERY PARAMETER BOUNDARY & MALFORMED INPUTS
    print("\n--- CATEGORY B: QUERY PARAMETER BOUNDARY AUDIT ---")
    r_neg_page = client.get("/api/walkins?page=-1&limit=10", headers=headers)
    log_result("Negative Page Number (page=-1)", r_neg_page.status_code == 200, f"Status: {r_neg_page.status_code}, Res: {r_neg_page.text[:100]}")

    r_zero_limit = client.get("/api/walkins?page=1&limit=0", headers=headers)
    log_result("Zero Limit Parameter (limit=0)", r_zero_limit.status_code == 200, f"Status: {r_zero_limit.status_code}, Res: {r_zero_limit.text[:100]}")

    r_huge_page = client.get("/api/walkins?page=999999&limit=10", headers=headers)
    log_result("Out of Bounds Page (page=999999)", r_huge_page.status_code == 200 and r_huge_page.json().get("items") == [], f"Status: {r_huge_page.status_code}, Items: {len(r_huge_page.json().get('items', [])) if r_huge_page.status_code == 200 else 'N/A'}")

    r_sql_search = client.get("/api/walkins?search=' OR '1'='1", headers=headers)
    log_result("SQL Injection Attack in Search Query", r_sql_search.status_code == 200, f"Status: {r_sql_search.status_code}, Items: {len(r_sql_search.json().get('items', [])) if r_sql_search.status_code == 200 else 'N/A'}")

    # CATEGORY C: TIME PERIOD FILTER & INVALID DATES
    print("\n--- CATEGORY C: TIME FILTER & DATE EDGE CASES ---")
    r_invalid_date = client.get("/api/walkins?time_period=custom&from_date=invalid-date-string&to_date=2026-08-05", headers=headers)
    log_result("Invalid Custom From Date Parameter", r_invalid_date.status_code == 200, f"Status: {r_invalid_date.status_code}, Res: {r_invalid_date.text[:100]}")

    r_inverted_dates = client.get("/api/walkins?time_period=custom&from_date=2026-12-31&to_date=2026-01-01", headers=headers)
    log_result("Inverted Date Range (From > To)", r_inverted_dates.status_code == 200, f"Status: {r_inverted_dates.status_code}, Items: {len(r_inverted_dates.json().get('items', [])) if r_inverted_dates.status_code == 200 else 'N/A'}")

    # CATEGORY D: RECORD CREATION WITH EXTREME / SPECIAL CHARACTERS
    print("\n--- CATEGORY D: RECORD CREATION WITH SPECIAL CHARS & LONG STRINGS ---")
    test_phone_special = f"987{int(datetime.datetime.now().timestamp()) % 10000000:07d}"
    special_payload = {
        "visitor_type": "Driver",
        "event_date": "2026-08-05",
        "enquiry_time": "14:00",
        "city": "Mumbai",
        "first_name": "Test<script>alert(1)</script>",
        "last_name": "O'Connor-Smith & Co.",
        "person_name": "Test<script>alert(1)</script> O'Connor-Smith & Co.",
        "person_number": test_phone_special,
        "dl_number": "DL123'OR'1'='1",
        "visiting_reason": "Testing special chars &'\"<>/",
        "operating_place": "Mumbai Central",
        "lead_channel": "Direct Walk-in",
        "joined_status": "Onboarding Process Initiated",
        "submission_status": "Submitted",
        "remarks": "A" * 2000,
        "is_existing_partner": False,
        "record_type": "new"
    }
    r_create_special = client.post("/api/walkins", json=special_payload, headers=headers)
    log_result("Creation with XSS / Special Chars / 2000-char Remarks", r_create_special.status_code == 200, f"Status: {r_create_special.status_code}, Res: {r_create_special.text[:100]}")

    if r_create_special.status_code == 200:
        sp_id = r_create_special.json().get("walkin_id")
        conn = main.postgreSQL_pool.getconn()
        try:
            cur = conn.cursor()
            raw_num = int(sp_id.replace("N", "").replace("E", ""))
            cur.execute("DELETE FROM july_new_walkins WHERE id = %s;", (raw_num,))
            conn.commit()
        finally:
            main.postgreSQL_pool.putconn(conn)

    # CATEGORY E: NON-EXISTENT RECORD OPERATIONS
    print("\n--- CATEGORY E: NON-EXISTENT RECORD OPERATIONS ---")
    r_get_nonexist = client.get("/api/walkins/N99999999", headers=headers)
    log_result("Get Non-existent Walk-in ID (N99999999)", r_get_nonexist.status_code == 404, f"Status: {r_get_nonexist.status_code}")

    r_delete_nonexist = client.delete("/api/walkins/N99999999", headers=headers)
    log_result("Delete Non-existent Walk-in ID (N99999999)", r_delete_nonexist.status_code in [200, 404], f"Status: {r_delete_nonexist.status_code}")

    print("\n" + "=" * 75)
    print(f"[SUMMARY] BUG AUDIT COMPLETED. TOTAL UNHANDLED BUGS: {len(bugs_found)}")
    print("=" * 75)
    for b in bugs_found:
        print(f"  * {b['test']}: {b['issue']}")

if __name__ == "__main__":
    perform_adversarial_bug_hunting()
