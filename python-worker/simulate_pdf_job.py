import time
import requests
import json
import os

ORG_ID = "test-org"
JOB_ID = f"pdf-job-{int(time.time())}"
WORKER_URL = "http://localhost:8000/v1/jobs/run"
TOKEN = os.getenv("PY_WORKER_TOKEN", "dev-token")

MOCK_REPORT = {
    "sections": [
        {
            "title": "Mantenimiento Preventivo",
            "type": "text",
            "content": "<p>Se realizó limpieza general de unidad evaporadora y condensadora.</p>"
        },
        {
            "title": "Checklist de Verificación",
            "type": "checklist",
            "items": [
                {"label": "Filtros", "checked": True, "notes": "Limpios"},
                {"label": "Drenaje", "checked": True, "notes": "Libre"},
                {"label": "Gas Refrigerante", "checked": False, "notes": "Carga Baja"}
            ]
        }
    ]
}

MOCK_TICKET = {
    "id": "ticket-001",
    "ticketNumber": "T-2023-999",
    "clientName": "Hotel Paradise",
    "locationName": "Habitación 304",
    "assignedToName": "Juan Pérez",
    "status": "COMPLETED",
    "description": "Mantenimiento de Aire Acondicionado Split."
}

def run_simulation():
    print(f"--- Triggering PDF PDF Job: {JOB_ID} ---")
    
    payload = {
        "orgId": ORG_ID, 
        "jobId": JOB_ID,
        "type": "GENERATE_PDF_REPORT", 
        "input": {
             "report": MOCK_REPORT,
             "ticket": MOCK_TICKET,
             "org": {"name": "Empresa Test URL", "logoUrl": "https://via.placeholder.com/150"}
        }
    }
    
    print("Warning: ensuring Worker is running with MOCK_DB=true")
    
    try:
        res = requests.post(
            WORKER_URL, 
            json=payload,
            headers={"Authorization": f"Bearer {TOKEN}"}
        )
        print(f"   Response: {res.status_code} - {res.text}")
        print("   >> CHECK WORKER TERMINAL FOR 'PDF Generated' or 'ValueError' <<")
        
    except Exception as e:
        print(f"   ERROR: {e}")

if __name__ == "__main__":
    run_simulation()
