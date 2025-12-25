import time
import requests
import json
import os
import firebase_admin
from firebase_admin import credentials, firestore

# --- Setup ---
MOCK_DB = os.getenv("MOCK_DB", "false").lower() == "true"
ORG_ID = "test-org"
JOB_ID = f"sim-job-{int(time.time())}"
WORKER_URL = "http://localhost:8000/v1/jobs/run"
TOKEN = os.getenv("PY_WORKER_TOKEN", "dev-token")

if not MOCK_DB:
    # Ensure credentials exist or use default
    if not firebase_admin._apps:
        try:
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred)
        except Exception:
            key_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "serviceAccountKey.json")
            if os.path.exists(key_path):
                 cred = credentials.Certificate(key_path)
                 firebase_admin.initialize_app(cred)
            else:
                 print("Warning: No Firebase Credentials found. Ensure you are logged in or have key.")
    db = firestore.client()

def run_simulation():
    print(f"--- Starting Simulation ({'MOCK' if MOCK_DB else 'LIVE'}) ---")
    
    if not MOCK_DB:
        # 1. Create a Fake Payment Doc (so the worker has something to update)
        payment_id = f"pay-{int(time.time())}"
        print(f"1. Creating Dummy Payment: {payment_id}...")
        db.collection(f"orgs/{ORG_ID}/payments").document(payment_id).set({
            "status": "PROOF_UPLOADED",
            "amount": 0,
            "proofStoragePath": "gs://bucket/fake-proof.jpg"
        })

        # 2. Create the Job in Firestore
        print(f"2. Creating Job Doc: {JOB_ID}...")
        job_ref = db.collection(f"orgs/{ORG_ID}/jobs").document(JOB_ID)
        job_ref.set({
            "type": "EXTRACT_PAYMENT_PROOF",
            "status": "QUEUED",
            "ticketId": "ticket-sim-001",
            "paymentId": payment_id,
            "input": {
                "proofStoragePath": "gs://bucket/fake-proof.jpg",
                "mimeType": "image/jpeg"
            },
            "createdAt": firestore.SERVER_TIMESTAMP,
            "attempts": 0
        })
    else:
        print("1. [Mock] Skipped creating Firestore Documents.")

    # 3. Trigger the Worker
    print(f"3. Calling Worker Endpoint: {WORKER_URL}...")
    try:
        res = requests.post(
            WORKER_URL, 
            json={"orgId": ORG_ID, "jobId": JOB_ID},
            headers={"Authorization": f"Bearer {TOKEN}"}
        )
        print(f"   Response: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"   ERROR: Could not connect to worker. Is it running? {e}")
        return

    # 4. Watch for Updates
    print("4. Polling Job Status...")
    if not MOCK_DB:
        for i in range(10):
            time.sleep(1)
            doc = job_ref.get()
            data = doc.to_dict()
            status = data.get("status")
            print(f"   [{i}s] Job Status: {status}")
            
            if status == "SUCCEEDED":
                print(f"\n✅ SUCCESS! Extraction Result: \n{json.dumps(data.get('result'), indent=2)}")
                
                # Check Payment
                pay_doc = db.collection(f"orgs/{ORG_ID}/payments").document(payment_id).get()
                print(f"   Payment Status: {pay_doc.get('status')}")
                break
            
            if status == "FAILED":
                print(f"\n❌ FAILED! Error: {data.get('error')}")
                break
    else:
        print("   [Mock] Waiting for worker logs to print success...")
        time.sleep(3)
        print("\n✅ SIMULATION SENT. Check the Worker Terminal for 'SUCCEEDED' logs.")


if __name__ == "__main__":
    run_simulation()
