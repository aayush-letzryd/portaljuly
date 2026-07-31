# LetzRyd Operations Management Portal

A premium management portal for LetzRyd operations executives, supporting onboarding, vehicle allocations, adjustment requests, and partner expenses logs.

## 🚀 Features

The portal integrates 5 core operation desks:
1. **Walk-in Form & Registry**: Visitor check-in, tracking joins/leads, city selection, and onboarding follow-ups.
2. **Onboarding Form & Registry**: Driver document collections (DL, Aadhaar, PAN, UPI, bank info), profile photo captures, and active fleet joins.
3. **Adjustment Form & Registry**: Credit/debit adjustments, remittance approvals, and multi-level executive status tracking.
4. **Allocation Form & Registry**: Vehicle assignments (New, Swaps, Reallocations) with drop-off odometer checks and car return photo proofs.
5. **Expenses Form & Registry**: CNG fuel refills, tolls, OLA CL balance updates, and cash payments logs with proof upload / camera captures.

---

## 🛠️ Tech Stack

* **Frontend**: React, TypeScript, Vite, TailwindCSS (for theme base), Lucide Icons, HTML5 Camera API.
* **Backend**: FastAPI, PostgreSQL connection pool, Pydantic, Passlib, Uvicorn.
* **Database**: PostgreSQL (externally hosted).

---

## 💻 Local Development Setup

### Prerequisites
* Node.js (v18+)
* Python (v3.10+)
* PostgreSQL access credentials

### 1. Backend Setup
1. Open a terminal and navigate to the project directory.
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the development server:
   ```bash
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   The backend API will run at `http://localhost:8000`.

### 2. Frontend Setup
1. Open a new terminal in the project directory.
2. Install Node packages:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend UI will run at `http://localhost:3000`.

---

## 🐳 Production Deployment

The FastAPI backend is configured to statically serve the compiled React bundle from the `dist/` directory.

### Docker Deployment (Recommended)
Build and run the multi-stage Docker container:
```bash
# Build
docker build -t letzryd-portal .

# Run
docker run -d -p 8000:8000 letzryd-portal
```
The application will serve both frontend assets and API endpoints together on port `8000`.

### Manual VPS Build
1. Build the frontend assets:
   ```bash
   npm run build
   ```
2. Start the FastAPI application with Uvicorn:
   ```bash
   python -m uvicorn main:app --host 0.0.0.0 --port 8000
   ```
