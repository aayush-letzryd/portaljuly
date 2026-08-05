import os
import sys
import datetime
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import main

def run_all_forms_e2e():
    print("=" * 75)
    print("[START] MULTI-FORM E2E UNIT TEST SUITE (Walkin, Onboarding, Alloc, Dropoff, Expenses, Adjustments)")
    print("=" * 75)

    client = TestClient(main.app)

    # 1. Login as Admin
    print("\n[STEP 1] Logging in as Admin...")
    r_login = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert r_login.status_code == 200, f"Login failed: {r_login.text}"
    token = r_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"  OK Authenticated as System Super Admin! Token: {token[:12]}...")

    # 2. Test Walkin & Leads Form
    print("\n[STEP 2] Testing Walkin & Leads Form...")
    r_walkin = client.get("/api/walkins?page=1&limit=10", headers=headers)
    assert r_walkin.status_code == 200, f"Walkin fetch failed: {r_walkin.text}"
    items = r_walkin.json().get("items", [])
    print(f"  OK Walkin registry loaded. Total items: {len(items)}")

    # 3. Test Onboarding Desk (/api/onboarding)
    print("\n[STEP 3] Testing Partner Onboarding Form...")
    r_onboard_list = client.get("/api/onboarding", headers=headers)
    assert r_onboard_list.status_code == 200, f"Onboarding fetch failed: {r_onboard_list.text}"
    onboard_items = r_onboard_list.json() if isinstance(r_onboard_list.json(), list) else r_onboard_list.json().get("data", [])
    print(f"  OK Onboarding records loaded. Count: {len(onboard_items)}")

    # 4. Test Vehicle Allocation Form (/api/allocation)
    print("\n[STEP 4] Testing Vehicle Allocation Form...")
    r_alloc = client.get("/api/allocation", headers=headers)
    assert r_alloc.status_code == 200, f"Allocation fetch failed: {r_alloc.text}"
    alloc_items = r_alloc.json()
    print(f"  OK Vehicle Allocation records loaded. Count: {len(alloc_items)}")

    # 5. Test Vehicle Drop-Off Form (/api/dropoffs)
    print("\n[STEP 5] Testing Vehicle Drop-Off Form...")
    r_drop = client.get("/api/dropoffs", headers=headers)
    assert r_drop.status_code == 200, f"Dropoff fetch failed: {r_drop.text}"
    drop_items = r_drop.json()
    print(f"  OK Vehicle Drop-Off records loaded. Count: {len(drop_items)}")

    # 6. Test Expenses Form (/api/expense)
    print("\n[STEP 6] Testing Expenses Form...")
    r_exp = client.get("/api/expense", headers=headers)
    assert r_exp.status_code == 200, f"Expenses fetch failed: {r_exp.text}"
    exp_items = r_exp.json() if isinstance(r_exp.json(), list) else r_exp.json().get("data", [])
    print(f"  OK Expenses records loaded. Count: {len(exp_items)}")

    # 7. Test Adjustments Form (/api/adjustment)
    print("\n[STEP 7] Testing Partner Adjustments Form...")
    r_adj = client.get("/api/adjustment", headers=headers)
    assert r_adj.status_code == 200, f"Adjustment fetch failed: {r_adj.text}"
    adj_items = r_adj.json() if isinstance(r_adj.json(), list) else r_adj.json().get("data", [])
    print(f"  OK Adjustment records loaded. Count: {len(adj_items)}")

    print("\n" + "=" * 75)
    print("[SUCCESS] ALL 6 PRIMARY FORM MODULES PASSED HEALTH & ENDPOINT CHECKS!")
    print("=" * 75)

if __name__ == "__main__":
    run_all_forms_e2e()
