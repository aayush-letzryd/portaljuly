import os, re

onboarding_path = r"C:\Users\anura\.gemini\antigravity\scratch\portalv2\src\components\OnboardingForm.tsx"
operator_path = r"C:\Users\anura\.gemini\antigravity\scratch\portalv2\src\components\OperatorOnboardingForm.tsx"
walkin_path = r"C:\Users\anura\.gemini\antigravity\scratch\portalv2\src\components\WalkInForm.tsx"
vehicle_path = r"C:\Users\anura\.gemini\antigravity\scratch\portalv2\src\components\VehicleOnboardingForm.tsx"
backend_path = r"C:\Users\anura\.gemini\antigravity\scratch\portalv2\main.py"

def read_file(path):
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()

onb = read_file(onboarding_path)
op = read_file(operator_path)
wi = read_file(walkin_path)
veh = read_file(vehicle_path)
bnd = read_file(backend_path)

print("=== Check 1: Auto-fill Walkin to Onboarding ===")
# Is there a way to select walkin or auto-fill details?
# Let's search for how walkin is linked
for path, name in [(onboarding_path, "Onboarding"), (operator_path, "Operator Onboarding")]:
    content = read_file(path)
    if "walkin" in content.lower():
        print(f"[{name}] Found walkin mentions:")
        matches = [line.strip() for line in content.split("\n") if "walkin" in line.lower()]
        for m in matches[:5]:
            print(f"  {m}")

print("\n=== Check 2: Unique Identifiers / Duplicate Check ===")
# Unique identifiers for onboarding should be phone number and govt ID. If duplicate display "Already filled."
for path, name in [(onboarding_path, "Onboarding"), (operator_path, "Operator Onboarding")]:
    content = read_file(path)
    if "already filled" in content.lower():
        print(f"[{name}] Found 'already filled' duplicate check!")
    else:
        print(f"[{name}] No direct string 'already filled' found.")

print("\n=== Check 3: SpringVerify Integration ===")
# How is springverify check implemented?
for path, name in [(onboarding_path, "Onboarding"), (operator_path, "Operator Onboarding"), (backend_path, "Backend")]:
    content = read_file(path)
    if "spring" in content.lower():
        print(f"[{name}] Found 'spring' mentions:")
        matches = [line.strip() for line in content.split("\n") if "spring" in line.lower()]
        for m in matches[:5]:
            print(f"  {m}")

print("\n=== Check 4: Configurable Cheques (LetzOwn) ===")
# LetzOwn (3 or 4 cheques) - configurable number of cheques
if "letzownCheques" in onb or "letzown_cheques" in onb:
    print("[Onboarding] LetzOwn cheques state:")
    matches = [line.strip() for line in onb.split("\n") if "letzown" in line.lower()]
    for m in matches[:5]:
        print(f"  {m}")

print("\n=== Check 5: Legality digital agreement / Word doc generation ===")
# Generate a Word document with 99% of the details pre-filled, which can then be sent for signing.
# Add deposit section.
matches = [line.strip() for line in onb.split("\n") if "legality" in line.lower() or "handlelegality" in line.lower()]
print("[Onboarding] Legality mentions:")
for m in matches[:5]:
    print(f"  {m}")

print("\n=== Check 6: Aadhaar number masking ===")
# Masking in Onboarding/Walkin registry
matches = [line.strip() for line in onb.split("\n") if "mask" in line.lower()][:3]
print("[Onboarding] Masking mentions:")
for m in matches:
    print(f"  {m}")

print("\n=== Check 7: Walk-in Phone pre-fill ===")
# "Instead of a separate Walk-in link, entering a phone number in a new entry should allow all candidate details to be filled."
# "If the phone number already exists, the system should check and automatically pre-fill the details."
matches = [line.strip() for line in wi.split("\n") if "phone" in line.lower() or "prefill" in line.lower() or "fetch" in line.lower()][:5]
print("[Walkin] Prefill/phone mentions:")
for m in matches:
    print(f"  {m}")

print("\n=== Check 8: Access levels ===")
# "The Walk-in form can be filled by anyone, but the Onboarding form should only be accessible to authorized users."
matches = [line.strip() for line in onb.split("\n") if "role" in line.lower() or "permission" in line.lower() or "authorized" in line.lower()][:5]
print("[Onboarding] Role/Permission mentions:")
for m in matches:
    print(f"  {m}")

print("\n=== Check 9: Vehicle Onboarding OCR ===")
# "OCR should also be available to auto-fill the Vehicle Onboarding form."
matches = [line.strip() for line in veh.split("\n") if "ocr" in line.lower() or "vision" in line.lower() or "tesseract" in line.lower()][:10]
print("[Vehicle Onboarding] OCR mentions:")
for m in matches:
    print(f"  {m}")

print("\n=== Check 10: Vehicle Onboarding Tyre OCR / FASTag / GPS ID ===")
matches = [line.strip() for line in veh.split("\n") if "tyre" in line.lower() or "fastag" in line.lower() or "gps" in line.lower()][:10]
print("[Vehicle Onboarding] Tyre/FASTag/GPS mentions:")
for m in matches:
    print(f"  {m}")
