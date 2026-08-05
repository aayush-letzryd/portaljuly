import main
import time
from fastapi.testclient import TestClient

def run_deep_workflow_tests():
    client = TestClient(main.app)
    
    admin_token = client.post("/api/auth/login", json={"username": "admin", "password": "admin"}).json()["token"]
    cm_token = client.post("/api/auth/login", json={"username": "city_manager", "password": "admin"}).json()["token"]
    
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    cm_headers = {"Authorization": f"Bearer {cm_token}"}
    
    ts = str(int(time.time()))[-6:]
    
    print("\n=======================================================")
    print("RUNNING END-TO-END DEEP WORKFLOW INTEGRATION TEST SUITE")
    print("=======================================================")
    
    # ── SCENARIO A: Driver Draft -> Edit -> Save Draft -> Submit -> Forward -> Approve
    print("\n[TEST A] Driver Onboarding Lifecycle (Ramesh Sharma)")
    draft_a = {
        "driver_name": "Ramesh Sharma",
        "phone_number": f"987{ts}01",
        "whatsapp_number": f"987{ts}01",
        "dob": "1990-01-01",
        "city": "Bengaluru",
        "operating_place": "Indiranagar",
        "present_address": "123 Main St, Bengaluru",
        "permanent_address": "123 Main St, Bengaluru",
        "emergency_name": "Suresh Sharma",
        "emergency_phone": f"987{ts}02",
        "father_name": "Rakesh Sharma",
        "candidate_role": "Driver",
        "rental_model": "Daily Rent",
        "security_deposit": "5000",
        "pan_number": f"RAM{ts}A",
        "aadhaar_number": f"998877{ts}"
    }
    
    # 1. Create Onboarding Record
    res_a1 = client.post("/api/onboarding", json=draft_a, headers=admin_headers).json()
    id_a = res_a1.get("id") or res_a1.get("onboarding_id")
    print(f"  1. Created Onboarding #{id_a}: response = {res_a1}")
    assert id_a is not None, f"Failed to create record A: {res_a1}"
    
    # 2. Edit Record & Save as Draft
    draft_a["emergency_name"] = "Suresh Sharma (Father)"
    res_a2 = client.put(f"/api/onboarding/{id_a}", json=draft_a, headers=admin_headers).json()
    print(f"  2. Updated Record #{id_a}: success = {res_a2.get('success')}")
    
    # 3. Verify in Registry
    reg_a = client.get(f"/api/onboarding/{id_a}", headers=admin_headers).json()
    print(f"  3. Registry Record #{id_a}: status = {reg_a.get('approval_status')}, updated_at = {reg_a.get('updated_at')}")
    assert reg_a.get("approval_status") == "Draft", "Draft A status mismatch"
    
    # 4. Submit for Approval
    res_a3 = client.post(f"/api/onboarding/send-for-approval/{id_a}", json={}, headers=admin_headers).json()
    print(f"  4. Submitted #{id_a} for Approval: approver_id = {res_a3.get('approver_id')}")
    
    # 5. Forward to User #24 (Fleet Manager)
    res_a4 = client.post(f"/api/july/approval/individual_onboarding/{id_a}", json={
        "action": "FORWARD",
        "remarks": "Forwarding Ramesh to Fleet Manager for vehicle allocation",
        "forward_to_user_id": 24
    }, headers=admin_headers).json()
    print(f"  5. Forwarded #{id_a}: success = {res_a4.get('success')}")
    
    # 6. Approve
    res_a5 = client.post(f"/api/july/approval/individual_onboarding/{id_a}", json={
        "action": "APPROVE",
        "remarks": "Approved Ramesh Sharma onboarding"
    }, headers=admin_headers).json()
    print(f"  6. Approved #{id_a}: success = {res_a5.get('success')}")
    
    # 7. Check Approval Timeline Logs
    logs_a = client.get(f"/api/july/approval-logs/individual_onboarding/{id_a}", headers=admin_headers).json()
    print(f"  7. Timeline Logs for #{id_a} ({len(logs_a)} steps):")
    for l in logs_a:
        print(f"     - {l['action']} | {l['action_at']} | {l['from_name']} -> {l['to_name']} | '{l['remarks']}'")
        
    # ── SCENARIO B: Operator Draft -> Submit -> Send Back (Changes Requested) -> Edit -> Re-submit -> Approve
    print("\n[TEST B] Operator Onboarding Lifecycle (Priya Verma)")
    draft_b = {
        "driver_name": "Priya Verma",
        "phone_number": f"912{ts}03",
        "whatsapp_number": f"912{ts}03",
        "dob": "1992-05-15",
        "city": "Hyderabad",
        "operating_place": "Gachibowli",
        "present_address": "456 Park Rd, Hyderabad",
        "permanent_address": "456 Park Rd, Hyderabad",
        "emergency_name": "Anil Verma",
        "emergency_phone": f"912{ts}04",
        "father_name": "Rajesh Verma",
        "candidate_role": "Operator",
        "vendor_type": "Operator",
        "security_deposit": "10000",
        "pan_number": f"PRI{ts}B",
        "aadhaar_number": f"887766{ts}"
    }
    
    # 1. Create & Submit
    res_b1 = client.post("/api/onboarding", json=draft_b, headers=admin_headers).json()
    id_b = res_b1.get("id") or res_b1.get("onboarding_id")
    client.post(f"/api/onboarding/send-for-approval/{id_b}", json={}, headers=admin_headers)
    print(f"  1. Created & Submitted Operator #{id_b}")
    
    # 2. Request Changes (Send Back)
    client.post(f"/api/july/approval/operator_onboarding/{id_b}", json={
        "action": "SEND_BACK",
        "remarks": "Please provide alternate contact number and DL copy"
    }, headers=cm_headers)
    
    rec_b2 = client.get(f"/api/onboarding/{id_b}", headers=admin_headers).json()
    print(f"  2. Sent Back #{id_b}: status = {rec_b2.get('approval_status')}")
    assert rec_b2.get("approval_status") == "Changes Requested", "Send back status mismatch"
    
    # 3. Edit & Re-submit
    draft_b["emergency_phone"] = f"912{ts}05"
    client.put(f"/api/onboarding/{id_b}", json=draft_b, headers=admin_headers)
    client.post(f"/api/onboarding/send-for-approval/{id_b}", json={}, headers=admin_headers)
    print(f"  3. Re-submitted #{id_b} after edits")
    
    # 4. Final Approval
    client.post(f"/api/july/approval/operator_onboarding/{id_b}", json={
        "action": "APPROVE",
        "remarks": "Operator approved after document update"
    }, headers=cm_headers)
    
    rec_b4 = client.get(f"/api/onboarding/{id_b}", headers=admin_headers).json()
    print(f"  4. Final Status #{id_b}: {rec_b4.get('approval_status')}")
    assert rec_b4.get("approval_status") == "Approved", "Operator approval failed"
    
    # ── SCENARIO C: Walk-In Candidate Creation & Lookup
    print("\n[TEST C] Walk-In Record Lookup & Editing")
    walkin_payload = {
        "record_type": "new",
        "visitor_type": "Individual",
        "event_date": "2026-08-06",
        "city": "Bengaluru",
        "operating_place": "Koramangala",
        "person_name": "Vikram Sethi",
        "person_number": f"998{ts}06",
        "aadhaar_number": f"5566 7788 {ts}",
        "dl_number": f"KA03202500{ts}",
        "visiting_reason": "Onboarding",
        "joined_status": "Interested",
        "lead_channel": "Direct"
    }
    res_c1 = client.post("/api/walkins", json=walkin_payload, headers=admin_headers).json()
    walkin_id = res_c1.get("id")
    print(f"  1. Created Walk-In #{walkin_id} for Vikram Sethi")
    
    # Fetch details by ID
    res_c2 = client.get(f"/api/walkins/{walkin_id}", headers=admin_headers).json()
    print(f"  2. GET /api/walkins/{walkin_id}: person_name = {res_c2.get('person_name')}, city = {res_c2.get('city')}")
    assert res_c2.get("person_name") == "Vikram Sethi", "Walkin fetch mismatch"
    
    # ── SCENARIO D: Batch Approvals Verification
    print("\n[TEST D] Batch Approvals Suite")
    b1_payload = dict(draft_a, driver_name="Batch Candidate 1", phone_number=f"900{ts}07", pan_number=f"BAT1{ts[:4]}A", aadhaar_number=f"111122{ts}")
    b2_payload = dict(draft_a, driver_name="Batch Candidate 2", phone_number=f"900{ts}08", pan_number=f"BAT2{ts[:4]}B", aadhaar_number=f"444455{ts}")
    
    d1 = client.post("/api/onboarding", json=b1_payload, headers=admin_headers).json()
    d2 = client.post("/api/onboarding", json=b2_payload, headers=admin_headers).json()
    
    id1, id2 = d1["id"], d2["id"]
    client.post(f"/api/onboarding/send-for-approval/{id1}", json={}, headers=admin_headers)
    client.post(f"/api/onboarding/send-for-approval/{id2}", json={}, headers=admin_headers)
    
    # Run batch approval
    res_d = client.post("/api/july/batch-approval", json={
        "items": [
            {"module": "individual_onboarding", "id": id1},
            {"module": "individual_onboarding", "id": id2}
        ],
        "action": "APPROVE",
        "remarks": "Batch approved in automated test suite"
    }, headers=admin_headers).json()
    
    print(f"  1. Batch Approval Result: success = {res_d.get('success')}, count = {res_d.get('count')}")
    
    rec_d1 = client.get(f"/api/onboarding/{id1}", headers=admin_headers).json()
    rec_d2 = client.get(f"/api/onboarding/{id2}", headers=admin_headers).json()
    print(f"  2. Registry Status Batch 1 (#{id1}): {rec_d1.get('approval_status')}")
    print(f"  3. Registry Status Batch 2 (#{id2}): {rec_d2.get('approval_status')}")
    
    assert rec_d1.get("approval_status") == "Approved", "Batch 1 approval sync failed"
    assert rec_d2.get("approval_status") == "Approved", "Batch 2 approval sync failed"

    print("\n=======================================================")
    print("ALL END-TO-END WORKFLOW SUITE TESTS PASSED 100% PERFECTLY!")
    print("=======================================================\n")

if __name__ == "__main__":
    run_deep_workflow_tests()
