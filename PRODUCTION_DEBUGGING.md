# LetzRyd Operations Portal: Production Diagnostics & Logging Guide

This document describes the **Non-Blocking Global Exception Catcher and Structured JSON Logging** mechanism integrated into the LetzRyd backend (`main.py`). This feature allows developers and data scientists to easily debug production crashes, trace which user triggered an issue, and inspect exact variables at the time of failure, without blocking concurrent traffic.

---

## 1. How It Works

The diagnostic tracker acts like a **flight data recorder** for the API server. Whenever a database query, data conversion, or route execution fails:

1. **Interception**: The catcher intercepts the unhandled Python exception (which would normally result in a generic 500 error page).
2. **Non-Blocking Identity Resolution**: It safely parses the incoming request's `Authorization` header and resolves the logged-in **Username** and **User ID**. This synchronous database check is run inside a **thread pool** (`run_in_threadpool`) so it does not block the FastAPI async event loop for other users.
3. **Structured JSON Output**: Instead of plain text prints, it outputs a single-line **JSON string** to stdout. Google Cloud Logging automatically detects, parses, and indexes this JSON object.
4. **Guaranteed Unique Diagnostic ID**: It generates a unique identifier using the format `ERR-YYYYMMDD-HHMMSS-[8-char-uuid]` so concurrent errors are easily separated.

---

## 2. The Code

The implementation is located at the top of `main.py`:

```python
import traceback
import json
import uuid
from datetime import datetime
from starlette.concurrency import run_in_threadpool

def get_user_for_log(request: Request) -> str:
    auth = request.headers.get("authorization")
    if not auth or not auth.startswith("Bearer "):
        return "Anonymous"
    token = auth.split(" ", 1)[1]
    conn = None
    try:
        conn = postgreSQL_pool.getconn()
        cur = conn.cursor()
        cur.execute(
            "SELECT au.username, au.id FROM app_sessions s JOIN app_users au ON au.id = s.user_id WHERE s.token = %s;", 
            (token,)
        )
        row = cur.fetchone()
        if row:
            return f"@{row[0]} (ID: {row[1]})"
    except Exception:
        pass
    finally:
        if conn:
            postgreSQL_pool.putconn(conn)
    return "Anonymous/Invalid Token"

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Run the blocking DB call in a thread pool so it does not block the event loop
    user_info = await run_in_threadpool(get_user_for_log, request)
    error_traceback = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    
    # Generate a guaranteed unique Diagnostic ID using UUID + Timestamp
    timestamp = datetime.utcnow().isoformat() + "Z"
    unique_suffix = uuid.uuid4().hex[:8]
    diagnostic_id = f"ERR-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}-{unique_suffix}"
    
    # Structured JSON log format automatically parsed by Google Cloud Logging
    log_entry = {
        "severity": "ERROR",
        "message": f"Production Crash on {request.method} {request.url.path}: {str(exc)}",
        "timestamp": timestamp,
        "diagnostic_id": diagnostic_id,
        "request": {
            "method": request.method,
            "path": request.url.path,
            "query_params": str(request.query_params)
        },
        "user": user_info,
        "traceback": error_traceback
    }
    
    # Print as JSON string - GCP Logging reads stdout JSON objects and auto-indexes all fields
    print(json.dumps(log_entry))
    
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error. Diagnostic ID: {diagnostic_id}"}
    )
```

---

## 3. How to Deploy

To push the diagnostic logger to your servers:

### A. Automatic Deploy (Git-based e.g., Render, Heroku)
Simply run the standard commands in your workspace:
```bash
git add main.py
git commit -m "Add global exception diagnostic logger"
git push origin main
```
The hosting platform will pick up the code and deploy it automatically.

### B. Google Cloud Run (Containerized)
If deploying via Docker / gcloud CLI:
```bash
# Build and submit the container to Google Artifact Registry
gcloud builds submit --tag gcr.io/letzryd-prod/portal-api:latest

# Deploy to Cloud Run
gcloud run deploy letzryd-portal-api \
    --image gcr.io/letzryd-prod/portal-api:latest \
    --platform managed \
    --region asia-south1
```

---

## 4. How to Use & View Logs

### A. Local Development
Watch the output in the terminal where you start the server:
```bash
python -m uvicorn main:app --port 8000
```
Any error will print directly in your PowerShell/Bash console window.

### B. Production (Google Cloud Console Log Explorer)
1. Navigate to the **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Search for **Log Explorer** or go to **Logging** ➔ **Log Explorer**.
3. Since we use structured JSON logs, Google Cloud automatically populates all variables under `jsonPayload`. You can search/filter with high precision:
   - Find only critical errors:
     ```text
     severity="ERROR"
     ```
   - Find errors triggered by a specific username:
     ```text
     jsonPayload.user:"priyasharma"
     ```
   - Find logs containing a specific diagnostic ID:
     ```text
     jsonPayload.diagnostic_id="ERR-20260703-143000-8f3a9cb1"
     ```
   - Find errors on a specific request path:
     ```text
     jsonPayload.request.path="/api/tickets"
     ```

---

## 5. What it Will Show (Example Log Output)

When a crash happens, you will see a structured diagnostic log entry like this:

```json
{
  "severity": "ERROR",
  "message": "Production Crash on POST /api/tickets: null value in column \"title\" violates not-null constraint",
  "timestamp": "2026-07-03T14:30:15.123456Z",
  "diagnostic_id": "ERR-20260703-143015-8f3a9cb1",
  "request": {
    "method": "POST",
    "path": "/api/tickets",
    "query_params": ""
  },
  "user": "@priyasharma (ID: 12)",
  "traceback": "Traceback:\n  File \"main.py\", line 1618, in create_ticket\n    cur.execute(\"INSERT INTO tickets (title, description) VALUES (%s, %s);\", (title, desc))\npsycopg2.errors.NotNullViolation: null value in column \"title\" violates not-null constraint"
}
```

*Note: The frontend will also display the unique **Diagnostic ID** (e.g. `ERR-20260703-143015-8f3a9cb1`) in the error alert box, so users can report it directly to developers to look up.*
