import os
import time
import logging
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Header, BackgroundTasks, Depends
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, firestore

# --- Configuration ---
app = FastAPI(title="Hecho App - Python Worker")
logger = logging.getLogger("worker")
logging.basicConfig(level=logging.INFO)

# --- Windows GTK3 Path Fix ---
# Essential for WeasyPrint to find DLLs on Windows
if os.name == 'nt':
    gtk3_path = r"C:\Program Files\GTK3-Runtime Win64\bin"
    if os.path.exists(gtk3_path):
        os.environ['PATH'] = gtk3_path + os.pathsep + os.environ['PATH']
        logger.info(f"Added GTK3 to PATH: {gtk3_path}")
    else:
        logger.warning(f"GTK3 not found at {gtk3_path}. PDF generation may fail.")

WORKER_TOKEN = os.getenv("PY_WORKER_TOKEN", "dev-token")
MOCK_DB = os.getenv("MOCK_DB", "false").lower() == "true"

# --- DB Setup ---
if MOCK_DB:
    logger.warning("⚠️ RUNNING IN MOCK DB MODE - No writes to Firestore")
    
    class MockDocRef:
        def __init__(self, path): self.path = path
        def get(self): return self
        def to_dict(self): 
            if "pdf-job-" in self.path:
                return {
                    "type": "GENERATE_PDF_REPORT",
                    "input": {
                         "report": {"sections": []},
                         "ticket": {"id": "t1", "ticketNumber": "T-MOCK"},
                         "org": {}
                    }
                }
            return {"type": "EXTRACT_PAYMENT_PROOF", "input": {}}
        @property
        def exists(self): return True
        def update(self, data): logger.info(f"MOCK DB UPDATE {self.path}: {data}")

    class MockClient:
        def collection(self, path): return self
        def document(self, id): return MockDocRef(id)

    db = MockClient()

else:
    # Uses Environment Vars for Credentials
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
                 print("Warning: No Firebase Credentials found.")

    db = firestore.client()

# --- Models ---
class JobDispatch(BaseModel):
    orgId: str
    jobId: str

class ExtractionResult(BaseModel):
    amount: float
    reference: str
    date: str
    bank: str
    confidence: float

# --- Logic ---
def process_job_task(org_id: str, job_id: str):
    """
    Background Task to process the Job
    """
    job_ref = db.collection(f"orgs/{org_id}/jobs").document(job_id)
    
    try:
        # 1. Fetch Job
        doc = job_ref.get()
        if not doc.exists:
            logger.error(f"Job {job_id} not found.")
            return

        job_data = doc.to_dict()
        
        # 2. Update Status to RUNNING
        job_ref.update({
            "status": "RUNNING",
            "startedAt": "MOCK_TIMESTAMP" if MOCK_DB else firestore.SERVER_TIMESTAMP,
            "workerId": os.getenv("HOSTNAME", "local-worker")
        })
        
        logger.info(f"Processing Job {job_id} [{job_data.get('type')}]")

        # 3. Route Logic based on Type
        job_type = job_data.get("type")

        if job_type == "GENERATE_PDF_REPORT":
            from services.pdf_generator import generate_pdf_bytes
            
            input_data = job_data.get("input", {})
            report = input_data.get("report")
            ticket = input_data.get("ticket")
            org = input_data.get("org")

            # Generate
            pdf_bytes = generate_pdf_bytes(report, ticket, org or {})
            
            # Upload
            storage_path = f"orgs/{org_id}/reports/{ticket.get('id')}_{int(time.time())}.pdf"
            pdf_url = "https://mock-storage.com/report.pdf"

            if not MOCK_DB:
                bucket = firebase_admin.storage.bucket()
                blob = bucket.blob(storage_path)
                blob.upload_from_string(pdf_bytes, content_type='application/pdf')
                pdf_url = blob.generate_signed_url(expiration=604800) # 7 days
            else:
                logger.info("[MOCK] Generated PDF bytes. Upload skipped.")

            # Success
            job_ref.update({
                "status": "SUCCEEDED",
                "result": { "pdfUrl": pdf_url, "storagePath": storage_path },
                "finishedAt": "MOCK_TIMESTAMP" if MOCK_DB else firestore.SERVER_TIMESTAMP
            })
            logger.info(f"PDF Generated: {pdf_url}")

        else:
            raise ValueError(f"Unknown Job Type: {job_type}")

    except Exception as e:
        logger.exception(f"Job {job_id} Failed")
        job_ref.update({
            "status": "FAILED",
            "error": {"message": str(e)},
            "finishedAt": "MOCK_TIMESTAMP" if MOCK_DB else firestore.SERVER_TIMESTAMP
        })

# --- Endpoints ---

async def verify_token(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Header")
    token = authorization.split(" ")[1]
    if token != WORKER_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid Token")
    return token

@app.get("/")
def health_check():
    return {"status": "ok", "worker": "python-v1", "mode": "MOCK" if MOCK_DB else "LIVE"}

@app.post("/v1/jobs/run")
async def run_job(dispatch: JobDispatch, background_tasks: BackgroundTasks, token: str = Depends(verify_token)):
    logger.info(f"Received Dispatch: {dispatch}")
    background_tasks.add_task(process_job_task, dispatch.orgId, dispatch.jobId)
    return {"status": "queued", "jobId": dispatch.jobId}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
