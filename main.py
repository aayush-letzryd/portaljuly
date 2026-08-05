import psycopg2
from psycopg2 import pool
from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Union, Any, List
from passlib.context import CryptContext
import os
import secrets
import traceback
import json
import uuid
import uvicorn
import asyncio
from datetime import datetime
from starlette.concurrency import run_in_threadpool

app = FastAPI(title="LetzRyd Walk-In Registry API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_user_for_log(request: Request) -> str:
    auth = request.headers.get("authorization")
    if not auth or not auth.startswith("Bearer "):
        return "Anonymous"
    token = auth.split(" ", 1)[1]
    conn = None
    try:
        conn = postgreSQL_pool.getconn()
        cur = conn.cursor()
        cur.execute("SELECT au.username, au.id FROM copy_app_sessions s JOIN copy_app_users au ON au.id = s.user_id WHERE s.token = %s;", (token,))
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
    user_info = await run_in_threadpool(get_user_for_log, request)
    error_traceback = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    
    timestamp = datetime.utcnow().isoformat() + "Z"
    unique_suffix = uuid.uuid4().hex[:8]
    diagnostic_id = f"ERR-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}-{unique_suffix}"
    
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
    
    print(json.dumps(log_entry))
    
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error. Diagnostic ID: {diagnostic_id}"}
    )

if os.path.exists(".env"):
    with open(".env") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                if "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip()

# ─────────────────────────────────────────────────────────
# Connection Pool
# ─────────────────────────────────────────────────────────
postgreSQL_pool = None

try:
    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        postgreSQL_pool = psycopg2.pool.SimpleConnectionPool(1, 20, dsn=db_url)
    else:
        postgreSQL_pool = psycopg2.pool.SimpleConnectionPool(
            1, 20,
            user=os.environ.get("DB_USER"),
            password=os.environ.get("DB_PASS"),
            host=os.environ.get("DB_HOST"),
            port=os.environ.get("DB_PORT", "5432"),
            database=os.environ.get("DB_NAME")
        )
    if postgreSQL_pool:
        print("[OK] Connection pool created successfully")
except (Exception, psycopg2.DatabaseError) as error:
    print("[ERROR] Error connecting to PostgreSQL:", error)
    if not postgreSQL_pool:
        raise RuntimeError("Failed to initialize PostgreSQL connection pool") from error


# ─────────────────────────────────────────────────────────
# Startup — Tables + Seed Data
# ─────────────────────────────────────────────────────────
@app.on_event("startup")
def startup_event():
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()

        # ── july_cities ──────────────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS july_cities (
                id         SERIAL PRIMARY KEY,
                city_name  VARCHAR(255) NOT NULL UNIQUE,
                city_code  VARCHAR(100),
                state      VARCHAR(100) DEFAULT 'India',
                status     VARCHAR(50) DEFAULT 'Active',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cur.execute("TRUNCATE TABLE july_cities RESTART IDENTITY CASCADE;")
        cur.execute("""
            INSERT INTO july_cities (id, city_name, city_code, state, status) VALUES
            (1, 'Bengaluru', 'BLR', 'Karnataka', 'Active'),
            (2, 'Mumbai', 'BOM', 'Maharashtra', 'Active'),
            (3, 'Hyderabad', 'HYD', 'Telangana', 'Active');
        """)
        cur.execute("SELECT setval('july_cities_id_seq', (SELECT MAX(id) FROM july_cities));")
        conn.commit()
        print("[OK] july_cities table initialized with Bengaluru, Mumbai, and Hyderabad")

        # ── copy_cities ──────────────────────────────────────
        try:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS copy_cities (
                    id   SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL
                );
            """)
            cur.execute("TRUNCATE TABLE copy_cities RESTART IDENTITY CASCADE;")
            cur.execute("""
                INSERT INTO copy_cities (id, name) VALUES
                (1, 'Bengaluru'), (2, 'Mumbai'), (3, 'Hyderabad');
            """)
            cur.execute("SELECT setval('copy_cities_id_seq', (SELECT MAX(id) FROM copy_cities));")
            conn.commit()
        except Exception as err:
            conn.rollback()
            print(f"[WARN] copy_cities setup notice: {err}")


        # ── copy_users (executives / employees) ───────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS copy_users (
                id   SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL
            );
        """)
        cur.execute("ALTER TABLE copy_users ADD COLUMN IF NOT EXISTS role VARCHAR(255) DEFAULT 'Executive';")
        cur.execute("ALTER TABLE copy_users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);")
        cur.execute("ALTER TABLE copy_users ADD COLUMN IF NOT EXISTS email VARCHAR(255);")
        cur.execute("ALTER TABLE copy_users ADD COLUMN IF NOT EXISTS company_email VARCHAR(255);")
        cur.execute("ALTER TABLE copy_users ADD COLUMN IF NOT EXISTS department VARCHAR(255);")
        cur.execute("ALTER TABLE copy_users ADD COLUMN IF NOT EXISTS city VARCHAR(255);")
        cur.execute("ALTER TABLE copy_users ADD COLUMN IF NOT EXISTS joining_date VARCHAR(50);")
        cur.execute("ALTER TABLE copy_users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(100);")
        cur.execute("ALTER TABLE copy_users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';")

        cur.execute("SELECT COUNT(*) FROM copy_users;")
        if cur.fetchone()[0] == 0:
            cur.execute("""
                INSERT INTO copy_users (name, role) VALUES
                ('D Shiva',      'Driver Relations Manager'),
                ('Arshad Khan',  'Onboarding Specialist'),
                ('Priya Sharma', 'Partner Onboarding Lead'),
                ('Rohan Verma',  'Executive Assistant'),
                ('Sneha Reddy',  'Regional Operations Manager');
            """)
            print("[OK] Executives seeded")

        # ── Safe live-data migrations: copy_ → july_ (runs only when old tables still exist) ──
        legacy_renames = [
            ("copy_walkins",                 "july_walkins"),
            ("copy_form_onboarding",         "july_form_onboarding"),
            ("copy_vehicle_onboarding",      "july_vehicle_onboarding"),
            ("copy_walkin_form_links",       "july_walkin_form_links"),
            ("copy_walkin_logs",             "july_walkin_logs"),
            ("copy_onboarding_logs",         "july_onboarding_logs"),
            ("copy_vehicle_logs",            "july_vehicle_logs"),
            ("copy_driver_onboarding",       "july_driver_onboarding"),
            ("copy_walkin_onboarding_links", "july_walkin_onboarding_links"),
        ]
        for old_name, new_name in legacy_renames:
            cur.execute("""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.tables
                               WHERE table_schema = 'public' AND table_name = %s)
                       AND NOT EXISTS (SELECT 1 FROM information_schema.tables
                                      WHERE table_schema = 'public' AND table_name = %s)
                    THEN
                        EXECUTE 'ALTER TABLE ' || %s || ' RENAME TO ' || %s;
                    END IF;
                END;
                $$;
            """, (old_name, new_name, old_name, new_name))
        print("[OK] Legacy table renames applied")

        # ── july_walkins ──────────────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS july_walkins (
                id             SERIAL PRIMARY KEY,
                visitor_type   VARCHAR(50),
                event_date     VARCHAR(20),
                city           VARCHAR(255),
                executive_id   INTEGER REFERENCES copy_users(id),
                person_name    VARCHAR(255),
                person_number  VARCHAR(50),
                aadhaar_number VARCHAR(20),
                dl_number      VARCHAR(100),
                aadhaar_image  TEXT,
                dl_image       TEXT,
                visiting_reason VARCHAR(255),
                joined_status  VARCHAR(50),
                remarks        TEXT,
                created_at     TIMESTAMP DEFAULT NOW()
            );
        """)
        for col in [
            "aadhaar_number VARCHAR(50)",
            "aadhaar_image  TEXT",
            "dl_image       TEXT",
            "created_at     TIMESTAMP DEFAULT NOW()",
            "first_name     VARCHAR(255)",
            "last_name      VARCHAR(255)",
            "enquiry_time   VARCHAR(50)",
            "mode_of_enquiry VARCHAR(50)",
            "referred_by_name VARCHAR(255)",
            "referred_by_phone VARCHAR(50)",
            "is_existing_partner BOOLEAN DEFAULT FALSE",
            "partner_type VARCHAR(50) DEFAULT 'Driver'",
            "partner_code VARCHAR(100)",
            "visit_tags JSONB DEFAULT '[]'::jsonb",
            "visit_notes TEXT"
        ]:
            cur.execute(f"ALTER TABLE july_walkins ADD COLUMN IF NOT EXISTS {col};")

        # ── july_new_walkins & july_existing_walkins ─────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS july_new_walkins (
                id SERIAL PRIMARY KEY,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                person_name VARCHAR(200),
                person_number VARCHAR(15),
                city VARCHAR(100),
                operating_place VARCHAR(200),
                interested_position VARCHAR(50) DEFAULT 'Driver',
                visiting_reason VARCHAR(200),
                event_date DATE,
                enquiry_time VARCHAR(20),
                dl_number VARCHAR(100),
                aadhaar_number VARCHAR(30),
                aadhaar_image TEXT,
                dl_image TEXT,
                lead_channel VARCHAR(100),
                lead_channel_details VARCHAR(300),
                referred_by_name VARCHAR(100),
                referred_by_phone VARCHAR(15),
                joined_status VARCHAR(100) DEFAULT 'Onboarding Process Initiated',
                remarks TEXT,
                submission_status VARCHAR(50) DEFAULT 'Submitted',
                executive_id INTEGER,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP,
                updated_by INTEGER
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS july_existing_walkins (
                id SERIAL PRIMARY KEY,
                person_number VARCHAR(15),
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                person_name VARCHAR(200),
                city VARCHAR(100),
                partner_type VARCHAR(50) DEFAULT 'Driver',
                visiting_reason VARCHAR(200),
                event_date DATE,
                enquiry_time VARCHAR(20),
                visit_notes TEXT,
                submission_status VARCHAR(50) DEFAULT 'Submitted',
                executive_id INTEGER,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP,
                updated_by INTEGER
            );
        """)
        conn.commit()

        # ── july_driver_onboarding ───────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS july_driver_onboarding (
                id SERIAL PRIMARY KEY,
                driver_name VARCHAR(255),
                phone_number VARCHAR(50),
                whatsapp_number VARCHAR(50),
                dob VARCHAR(20),
                city VARCHAR(100),
                present_address TEXT,
                emergency_name VARCHAR(255),
                emergency_phone VARCHAR(50),
                dl_number VARCHAR(100),
                dl_expiry_date VARCHAR(20),
                driver_plan VARCHAR(50),
                lead_source VARCHAR(100),
                pan_number VARCHAR(50),
                aadhaar_number VARCHAR(50),
                pan_aadhaar_linked VARCHAR(50),
                selfie_photo TEXT,
                dl_front TEXT,
                dl_back TEXT,
                pan_card_photo TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

        # ── july_walkin_onboarding_links ──────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS july_walkin_onboarding_links (
                id SERIAL PRIMARY KEY,
                walkin_id INTEGER REFERENCES july_walkins(id),
                onboarding_id INTEGER REFERENCES july_driver_onboarding(id),
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

        # ── july_form_onboarding ───────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS july_form_onboarding (
                id SERIAL PRIMARY KEY,
                vendor_type VARCHAR(50),
                driver_id VARCHAR(50),
                driver_name VARCHAR(255),
                phone_number VARCHAR(50),
                whatsapp_number VARCHAR(50),
                dob VARCHAR(20),
                city VARCHAR(100),
                operating_place VARCHAR(255),
                present_address TEXT,
                permanent_address TEXT,
                emergency_name VARCHAR(255),
                emergency_phone VARCHAR(50),
                dl_number VARCHAR(100),
                dl_expiry_date VARCHAR(20),
                lead_source VARCHAR(100),
                pan_number VARCHAR(50),
                aadhaar_number VARCHAR(50),
                pan_aadhaar_linked VARCHAR(50),
                selfie_photo TEXT,
                dl_front TEXT,
                dl_back TEXT,
                pan_card_photo TEXT,
                vendor_name VARCHAR(255),
                vendor_id VARCHAR(50),
                aadhaar_card_photo TEXT,
                father_name VARCHAR(255),
                bank_name VARCHAR(255),
                other_bank_name VARCHAR(255),
                account_number VARCHAR(100),
                ifsc_code VARCHAR(50),
                upi_id VARCHAR(100),
                custom_rent_amount VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

        # ADDED LETZRYD REQUIREMENTS MIGRATIONS
        for col in [
            "vendor_type VARCHAR(50)", 
            "driver_id VARCHAR(50)", 
            "custom_rent_amount VARCHAR(50)",
            "emergency_relationship VARCHAR(100)",
            "platform_details TEXT",
            "documents_verified BOOLEAN DEFAULT FALSE",
            "custom_rental_plan BOOLEAN DEFAULT FALSE",
            "cancelled_cheque_photo TEXT",
            "signature_photo TEXT",
            "account_name VARCHAR(255)",
            "account_type VARCHAR(50)",
            "candidate_role VARCHAR(50)",
            "rental_model VARCHAR(100)",
            "security_deposit VARCHAR(50)",
            "letzown_cheques VARCHAR(50)",
            "is_spring_verified BOOLEAN DEFAULT FALSE",
            "aadhaar_card_front TEXT",
            "aadhaar_card_back TEXT",
            "driver_email VARCHAR(255)",
            "local_address_proof TEXT",
            "ref1_name VARCHAR(255)", "ref1_phone VARCHAR(50)", "ref1_address TEXT",
            "ref2_name VARCHAR(255)", "ref2_phone VARCHAR(50)", "ref2_address TEXT",
            "ref3_name VARCHAR(255)", "ref3_phone VARCHAR(50)", "ref3_address TEXT"
        ]:
            cur.execute(f"ALTER TABLE july_form_onboarding ADD COLUMN IF NOT EXISTS {col};")

        for col in [
            "lead_channel VARCHAR(100)",
            "lead_channel_details VARCHAR(255)"
        ]:
            cur.execute(f"ALTER TABLE july_walkins ADD COLUMN IF NOT EXISTS {col};")

        # ── Extra columns needed by approval workflow ─────────────────────
        for col in [
            "approval_requested_to  INTEGER",
            "approval_note          TEXT",
            "approval_submitted_at  TIMESTAMP",
            "cheque2_photo          TEXT",
            "cheque3_photo          TEXT",
        ]:
            cur.execute(f"ALTER TABLE july_form_onboarding ADD COLUMN IF NOT EXISTS {col};")

        # ── Audit columns: july_walkins ──────────────────────────────────────
        for col in [
            "created_by       INTEGER",
            "updated_by       INTEGER",
            "updated_at       TIMESTAMP",
            "approval_status  VARCHAR(50) DEFAULT 'Draft'",
            "current_approver_id INTEGER",
            "approved_by      INTEGER",
        ]:
            cur.execute(f"ALTER TABLE july_walkins ADD COLUMN IF NOT EXISTS {col};")

        # ── Audit columns: july_form_onboarding ──────────────────────────────
        for col in [
            "created_by          INTEGER",
            "updated_by          INTEGER",
            "updated_at          TIMESTAMP",
            "approval_status     VARCHAR(50) DEFAULT 'Draft'",
            "current_approver_id INTEGER",
            "approved_by         INTEGER",
        ]:
            cur.execute(f"ALTER TABLE july_form_onboarding ADD COLUMN IF NOT EXISTS {col};")

        # ── Audit columns: july_vehicle_onboarding ───────────────────────────
        for col in [
            "created_by          INTEGER",
            "updated_by          INTEGER",
            "updated_at          TIMESTAMP",
            "created_at          TIMESTAMP DEFAULT NOW()",
            "approval_status     VARCHAR(50) DEFAULT 'Draft'",
            "current_approver_id INTEGER",
            "approved_by         INTEGER",
        ]:
            cur.execute(f"ALTER TABLE july_vehicle_onboarding ADD COLUMN IF NOT EXISTS {col};")

        # ── july_walkin_logs (audit every change to a walk-in) ───────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS july_walkin_logs (
                log_id       SERIAL PRIMARY KEY,
                walkin_id    INTEGER NOT NULL REFERENCES july_walkins(id) ON DELETE CASCADE,
                action       VARCHAR(30) NOT NULL,      -- CREATE / UPDATE / DELETE / STATUS_CHANGE
                old_status   VARCHAR(50),
                new_status   VARCHAR(50),
                changed_fields JSONB,                   -- Structured JSON of changed fields
                previous_data  JSONB,                   -- Full row snapshot before edit
                new_data       JSONB,                   -- Full row snapshot after edit
                remarks      TEXT,
                performed_by INTEGER REFERENCES july_portal_users(portal_user_id) ON DELETE SET NULL,
                performed_by_name VARCHAR(255),
                performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_walkin_logs_walkin_id ON july_walkin_logs (walkin_id);
            CREATE INDEX IF NOT EXISTS idx_walkin_logs_performed_by ON july_walkin_logs (performed_by);
            CREATE INDEX IF NOT EXISTS idx_walkin_logs_performed_at ON july_walkin_logs (performed_at DESC);
            CREATE INDEX IF NOT EXISTS idx_walkin_logs_changed_fields ON july_walkin_logs USING GIN (changed_fields);
        """)

        # ── july_onboarding_logs (audit every change to partner onboarding) ──
        cur.execute("""
            CREATE TABLE IF NOT EXISTS july_onboarding_logs (
                log_id          SERIAL PRIMARY KEY,
                onboarding_id   INTEGER NOT NULL,
                action          VARCHAR(30) NOT NULL,   -- CREATE / UPDATE / DELETE / STATUS_CHANGE / SEND_FOR_APPROVAL
                old_status      VARCHAR(50),
                new_status      VARCHAR(50),
                changed_fields  TEXT,
                remarks         TEXT,
                performed_by    INTEGER,
                performed_by_name VARCHAR(255),
                performed_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        """)

        for col in [
            "old_status VARCHAR(50)",
            "new_status VARCHAR(50)",
            "changed_fields TEXT",
            "remarks TEXT",
            "performed_by INTEGER",
            "performed_by_name VARCHAR(255)",
            "performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()"
        ]:
            cur.execute(f"ALTER TABLE july_onboarding_logs ADD COLUMN IF NOT EXISTS {col};")

        # ── july_vehicle_logs (audit every change to vehicle onboarding) ─────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS july_vehicle_logs (
                log_id          SERIAL PRIMARY KEY,
                vehicle_ob_id   INTEGER NOT NULL,       -- references july_vehicle_onboarding.id
                vehicle_number  VARCHAR(100),
                action          VARCHAR(30) NOT NULL,   -- CREATE / UPDATE / DELETE / STATUS_CHANGE
                old_status      VARCHAR(50),
                new_status      VARCHAR(50),
                changed_fields  TEXT,
                remarks         TEXT,
                performed_by    INTEGER,
                performed_by_name VARCHAR(255),
                performed_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)

        for col in [
            "vehicle_number VARCHAR(100)",
            "old_status VARCHAR(50)",
            "new_status VARCHAR(50)",
            "changed_fields TEXT",
            "remarks TEXT",
            "performed_by INTEGER",
            "performed_by_name VARCHAR(255)",
            "performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()"
        ]:
            cur.execute(f"ALTER TABLE july_vehicle_logs ADD COLUMN IF NOT EXISTS {col};")

        for col in [
            "insurance_idv VARCHAR(50)",
            "cover_engine_protect BOOLEAN DEFAULT FALSE",
            "cover_consumables BOOLEAN DEFAULT FALSE",
            "cover_zero_dep BOOLEAN DEFAULT FALSE",
            "cover_rsa BOOLEAN DEFAULT FALSE",
            "chassis_number VARCHAR(100)",
            "engine_number VARCHAR(100)",
            "cng_tank_number VARCHAR(100)",
            "fast_tag_number VARCHAR(100)",
            "fast_tag_vendor VARCHAR(100)"
        ]:
            cur.execute(f"ALTER TABLE july_vehicle_onboarding ADD COLUMN IF NOT EXISTS {col};")

        # ── copy_rents ───────────────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS copy_rents (
                id SERIAL PRIMARY KEY,
                level VARCHAR(50) DEFAULT 'model',
                vehicle_model VARCHAR(100),
                vehicle_number VARCHAR(100),
                vehicle_age VARCHAR(50),
                vendor_id VARCHAR(50),
                driver_id VARCHAR(50),
                rent_amount INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        cur.execute("ALTER TABLE copy_rents ADD COLUMN IF NOT EXISTS level VARCHAR(50) DEFAULT 'model';")
        cur.execute("ALTER TABLE copy_rents ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(100);")
        cur.execute("ALTER TABLE copy_rents ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';")
        cur.execute("ALTER TABLE copy_rents ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(100);")
        cur.execute("ALTER TABLE copy_rents ADD COLUMN IF NOT EXISTS assigned_by VARCHAR(100);")
        cur.execute("ALTER TABLE copy_rents ADD COLUMN IF NOT EXISTS assigned_time TIMESTAMP;")


        # ── july_walkin_form_links ──────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS july_walkin_form_links (
                id SERIAL PRIMARY KEY,
                walkin_id INTEGER REFERENCES july_walkins(id),
                onboarding_id INTEGER REFERENCES july_form_onboarding(id),
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

        cur.execute("ALTER TABLE july_form_onboarding ADD COLUMN IF NOT EXISTS operating_place VARCHAR(255);")
        cur.execute("ALTER TABLE july_walkins ADD COLUMN IF NOT EXISTS operating_place VARCHAR(255);")
        cur.execute("ALTER TABLE july_form_onboarding ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255);")
        cur.execute("ALTER TABLE july_form_onboarding ADD COLUMN IF NOT EXISTS vendor_id VARCHAR(50);")
        cur.execute("ALTER TABLE july_form_onboarding ADD COLUMN IF NOT EXISTS aadhaar_card_photo TEXT;")
        cur.execute("ALTER TABLE july_form_onboarding ADD COLUMN IF NOT EXISTS father_name VARCHAR(255);")
        cur.execute("ALTER TABLE july_form_onboarding ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);")
        cur.execute("ALTER TABLE july_form_onboarding ADD COLUMN IF NOT EXISTS other_bank_name VARCHAR(255);")
        cur.execute("ALTER TABLE july_form_onboarding ADD COLUMN IF NOT EXISTS account_number VARCHAR(100);")
        cur.execute("ALTER TABLE july_form_onboarding ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(50);")
        cur.execute("ALTER TABLE july_form_onboarding ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);")

        # ── copy_partner_adjustment ───────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS copy_partner_adjustment (
                id SERIAL PRIMARY KEY,
                partner_name VARCHAR(255),
                partner_code VARCHAR(100),
                driver_id VARCHAR(50),
                partner_number VARCHAR(50),
                vehicle_number VARCHAR(100),
                city_name VARCHAR(100),
                partner_type VARCHAR(50),
                adjustment_type VARCHAR(50),
                adjustment_date VARCHAR(50),
                enter_amount VARCHAR(50),
                remittance_towards TEXT,
                adjustment_related_to TEXT,
                remarks TEXT,
                first_level_approval_by VARCHAR(255),
                finance_team_status VARCHAR(50),
                finance_team_remarks TEXT,
                final_level_approval_by VARCHAR(255),
                status VARCHAR(50),
                photo TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        for col in [
            "driver_id VARCHAR(50)",
            "vehicle_number VARCHAR(100)",
            "photo TEXT",
            "first_level_approval_by VARCHAR(255)",
            "finance_team_status VARCHAR(50)",
            "finance_team_remarks TEXT",
            "final_level_approval_by VARCHAR(255)",
            "status VARCHAR(50)",
            "adjustment_level VARCHAR(50)",
            "adjustment_nature VARCHAR(50)",
            "time_duration VARCHAR(50)",
            "hisaab_number VARCHAR(255)",
            "contested_line_items TEXT",
            "severity_level VARCHAR(50)",
            "cost_level VARCHAR(50)",
            "escalate_to VARCHAR(100)",
            "submitter_comments TEXT",
            "sent_for_approval VARCHAR(10)"
        ]:
            cur.execute(f"ALTER TABLE copy_partner_adjustment ADD COLUMN IF NOT EXISTS {col};")

        # ── copy_vehicle_allocation ───────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS copy_vehicle_allocation (
                id SERIAL PRIMARY KEY,
                allocation_date VARCHAR(50),
                allocation_type VARCHAR(50),
                city_name VARCHAR(100),
                driver_id VARCHAR(50),
                driver_name VARCHAR(255),
                driver_phone VARCHAR(50),
                driver_plan VARCHAR(100),
                type_of_plan VARCHAR(100),
                car_model VARCHAR(100),
                vehicle_number VARCHAR(100),
                old_vehicle_number VARCHAR(100),
                dropoff_odometer VARCHAR(50),
                dropoff_remarks TEXT,
                dropoff_photo TEXT,
                is_migrated BOOLEAN NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        for col in [
            "driver_plan VARCHAR(100)",
            "type_of_plan VARCHAR(100)",
            "car_model VARCHAR(100)",
            "old_vehicle_number VARCHAR(100)",
            "dropoff_odometer VARCHAR(50)",
            "dropoff_remarks TEXT",
            "dropoff_photo TEXT"
        ]:
            cur.execute(f"ALTER TABLE copy_vehicle_allocation ADD COLUMN IF NOT EXISTS {col};")

        # ── july_allocation_form (new production table) ──────────────────
        try:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS july_allocation_form (
                    id                          SERIAL PRIMARY KEY,

                    -- Allocation Meta
                    allocation_date             DATE,
                    allocation_type             VARCHAR(50),
                    sub_type                    VARCHAR(100),
                    city_name                   VARCHAR(100),

                    -- Driver / Partner Information
                    driver_id                   VARCHAR(100),
                    driver_name                 VARCHAR(255),
                    driver_phone                VARCHAR(20),
                    driver_plan                 VARCHAR(100),
                    type_of_plan                VARCHAR(100),
                    car_model                   VARCHAR(100),

                    -- Allocated / Given Vehicle
                    vehicle_number              VARCHAR(50),
                    gps_active                  VARCHAR(10)  DEFAULT 'Yes',
                    ola_negative_balance        NUMERIC(12, 2),
                    ola_negative_balance_proof  TEXT,

                    -- 4-Side Car Condition Photos (at handover)
                    photo_lh_side               TEXT,
                    photo_rh_side               TEXT,
                    photo_front_side            TEXT,
                    photo_back_side             TEXT,

                    -- Allocated Vehicle Inspection Checklist
                    insp_jack                   VARCHAR(30)  DEFAULT 'Available',
                    insp_jack_rod               VARCHAR(30)  DEFAULT 'Available',
                    insp_spanner                VARCHAR(30)  DEFAULT 'Available',
                    insp_parking_triangle       VARCHAR(30)  DEFAULT 'Available',
                    insp_fire_extinguishers     VARCHAR(30)  DEFAULT 'Available',
                    insp_seat_cover             VARCHAR(30)  DEFAULT 'Available',
                    insp_floor_carpet           VARCHAR(30)  DEFAULT 'Available',
                    insp_music_system           VARCHAR(30)  DEFAULT 'Available',
                    insp_remarks                TEXT,

                    -- Drop-Off / Returned Vehicle Fields
                    old_vehicle_number          VARCHAR(50),
                    dropoff_odometer            NUMERIC(10, 1),
                    dropoff_remarks             TEXT,
                    dropoff_photo               TEXT,
                    dropoff_location            VARCHAR(50),
                    duplicate_key_status        VARCHAR(10),
                    fastag_balance_amount       NUMERIC(10, 2),
                    fastag_balance_proof        TEXT,

                    -- Returned Vehicle Inspection Checklist
                    ret_jack                    VARCHAR(30)  DEFAULT 'Available',
                    ret_jack_rod                VARCHAR(30)  DEFAULT 'Available',
                    ret_spanner                 VARCHAR(30)  DEFAULT 'Available',
                    ret_parking_triangle        VARCHAR(30)  DEFAULT 'Available',
                    ret_fire_extinguishers      VARCHAR(30)  DEFAULT 'Available',
                    ret_seat_cover              VARCHAR(30)  DEFAULT 'Available',
                    ret_floor_carpet            VARCHAR(30)  DEFAULT 'Available',
                    ret_music_system            VARCHAR(30)  DEFAULT 'Available',
                    ret_insp_remarks            TEXT,

                    -- Status & Audit Columns
                    status                      VARCHAR(50)  NOT NULL DEFAULT 'Submitted',
                    created_by                  INTEGER,
                    updated_by                  INTEGER,
                    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at                  TIMESTAMP WITH TIME ZONE
                );
            """)

            # Indexes for july_allocation_form
            for idx_sql in [
                "CREATE INDEX IF NOT EXISTS idx_jaf_driver_id       ON july_allocation_form (driver_id);",
                "CREATE INDEX IF NOT EXISTS idx_jaf_vehicle_number  ON july_allocation_form (vehicle_number);",
                "CREATE INDEX IF NOT EXISTS idx_jaf_old_vehicle     ON july_allocation_form (old_vehicle_number);",
                "CREATE INDEX IF NOT EXISTS idx_jaf_city            ON july_allocation_form (city_name);",
                "CREATE INDEX IF NOT EXISTS idx_jaf_status          ON july_allocation_form (status);",
                "CREATE INDEX IF NOT EXISTS idx_jaf_alloc_date      ON july_allocation_form (allocation_date DESC);",
                "CREATE INDEX IF NOT EXISTS idx_jaf_created_at      ON july_allocation_form (created_at DESC);",
            ]:
                cur.execute(idx_sql)

            # ── july_allocation_form_logs (audit trail) ──────────────────────
            cur.execute("""
                CREATE TABLE IF NOT EXISTS july_allocation_form_logs (
                    log_id              SERIAL PRIMARY KEY,

                    -- Reference (no hard FK so logs survive DELETE)
                    allocation_id       INTEGER      NOT NULL,
                    allocation_date     DATE,
                    vehicle_number      VARCHAR(50),
                    driver_id           VARCHAR(100),
                    driver_name         VARCHAR(255),

                    -- Action
                    action              VARCHAR(30)  NOT NULL,
                    old_status          VARCHAR(50),
                    new_status          VARCHAR(50),

                    -- Change Payload
                    changed_fields      JSONB,
                    previous_data       JSONB,
                    new_data            JSONB,

                    -- Notes
                    remarks             TEXT,

                    -- Who & When
                    performed_by        INTEGER,
                    performed_by_name   VARCHAR(255),
                    performed_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """)

            for idx_sql in [
                "CREATE INDEX IF NOT EXISTS idx_jafl_allocation_id  ON july_allocation_form_logs (allocation_id);",
                "CREATE INDEX IF NOT EXISTS idx_jafl_performed_at   ON july_allocation_form_logs (performed_at DESC);",
                "CREATE INDEX IF NOT EXISTS idx_jafl_action         ON july_allocation_form_logs (action);",
                "CREATE INDEX IF NOT EXISTS idx_jafl_driver_id      ON july_allocation_form_logs (driver_id);",
                "CREATE INDEX IF NOT EXISTS idx_jafl_changed_fields ON july_allocation_form_logs USING GIN (changed_fields);",
            ]:
                cur.execute(idx_sql)

            conn.commit()
            print("[OK] july_allocation_form and july_allocation_form_logs tables ready and committed")
        except Exception as alloc_err:
            conn.rollback()
            print(f"[ERROR] Failed to create allocation tables: {alloc_err}")


        # ── copy_partner_expenses ───────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS copy_partner_expenses (
                id SERIAL PRIMARY KEY,
                expense_date VARCHAR(50),
                driver_name VARCHAR(255),
                phone_number VARCHAR(50),
                vehicle_number VARCHAR(100),
                expenses_type VARCHAR(100),
                amount_paid VARCHAR(50),
                reference_photo TEXT,
                is_migrated BOOLEAN NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        for col in [
            "expense_date VARCHAR(50)",
            "driver_name VARCHAR(255)",
            "phone_number VARCHAR(50)",
            "vehicle_number VARCHAR(100)",
            "expenses_type VARCHAR(100)",
            "amount_paid VARCHAR(50)",
            "reference_photo TEXT"
        ]:
            cur.execute(f"ALTER TABLE copy_partner_expenses ADD COLUMN IF NOT EXISTS {col};")


        cur.execute("SELECT COUNT(*) FROM july_form_onboarding;")
        if cur.fetchone()[0] < 5:
            cur.execute("DELETE FROM july_walkin_form_links;")
            cur.execute("DELETE FROM july_form_onboarding;")
            
            onboarding_records = [
                ("Kavitha Nair", "9012345678", "1992-05-15", "Hyderabad", "Banjara Hills", "123 Street, Hyderabad", "123 Street, Hyderabad", "Rahul Nair", "9876543210", "TS0620181234567", "ABCDE1234F", "[Aadhaar Redacted]", "Yes", "FastFleet Logistics", "V-9901", "Gopal Nair"),
                ("Ravi Shankar", "9100044556", "1994-08-22", "Bangalore", "Indiranagar", "456 Avenue, Bangalore", "456 Avenue, Bangalore", "Saraswathi", "9900088220", "KA0320210056789", "BCDEF2345G", "[Aadhaar Redacted]", "Yes", "FastFleet Logistics", "V-9901", "Shiva Shankar"),
                ("Ajay Deshmukh", "9988833221", "1990-12-05", "Hyderabad", "Gachibowli", "789 Lane, Hyderabad", "789 Lane, Hyderabad", "Seema Deshmukh", "9988833200", "TS0220200765432", "CDEFG3456H", "[Aadhaar Redacted]", "Yes", "Self-Employed", "", "Anand Deshmukh"),
                ("Deepak Mehta", "9800155667", "1988-03-30", "Mumbai", "Bandra", "101 Sea Road, Mumbai", "101 Sea Road, Mumbai", "Karan Mehta", "9800155660", "MH0120100098765", "DEFGH4567I", "[Aadhaar Redacted]", "Yes", "Alpha Cabs", "V-8802", "Suresh Mehta"),
                ("Amit Patel", "9876543210", "1991-07-14", "Mumbai", "Andheri", "202 Park Plaza, Mumbai", "202 Park Plaza, Mumbai", "Jaya Patel", "9876543200", "MH0220150012345", "EFGHI5678J", "[Aadhaar Redacted]", "No", "Alpha Cabs", "V-8802", "Dinesh Patel"),
                ("Priya Sharma", "9911223344", "1995-11-20", "Hyderabad", "Begumpet", "505 Metro Heights, Hyderabad", "505 Metro Heights, Hyderabad", "Vijay Sharma", "9911223340", "TS0920190012345", "FGHIJ6789K", "[Aadhaar Redacted]", "Yes", "Self-Employed", "", "Rajendra Sharma"),
                ("Rajesh Kumar", "9811223344", "1989-02-18", "Bangalore", "Koramangala", "303 Block B, Bangalore", "303 Block B, Bangalore", "Sunita Kumar", "9811223340", "KA0120180098765", "GHIJK7890L", "[Aadhaar Redacted]", "Yes", "FastFleet Logistics", "V-9901", "Ramesh Kumar"),
                ("Sunita Rao", "9711223344", "1993-06-25", "Hyderabad", "Madhapur", "404 Cyber Towers, Hyderabad", "404 Cyber Towers, Hyderabad", "Krishna Rao", "9711223340", "TS0520211234567", "HIJKL8901M", "[Aadhaar Redacted]", "No", "Self-Employed", "", "Hanumantha Rao"),
                ("Vinod Khanna", "9611223344", "1992-09-02", "Mumbai", "Thane", "707 West End, Mumbai", "707 West End, Mumbai", "Asha Khanna", "9611223340", "MH0420160054321", "IJKLM9012N", "[Aadhaar Redacted]", "Yes", "Alpha Cabs", "V-8802", "Prem Khanna"),
                ("Meera Sen", "9511223344", "1994-04-10", "Bangalore", "Whitefield", "808 Silicon Valley, Bangalore", "808 Silicon Valley, Bangalore", "Anoop Sen", "9511223340", "KA0420220011223", "JKLMN0123O", "[Aadhaar Redacted]", "Yes", "Direct Partner", "", "Bimal Sen")
            ]
            
            for item in onboarding_records:
                cur.execute("""
                    INSERT INTO july_form_onboarding (
                        driver_name, phone_number, dob, city, operating_place, 
                        present_address, permanent_address, emergency_name, emergency_phone, 
                        dl_number, pan_number, aadhaar_number, pan_aadhaar_linked, vendor_name, vendor_id, father_name, vendor_type, candidate_role
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'Individual','Driver') RETURNING id;
                """, item)
                onb_id = cur.fetchone()[0]

            cur.execute("""
                INSERT INTO july_form_onboarding (
                    driver_name, phone_number, dob, city, operating_place, 
                    present_address, permanent_address, emergency_name, emergency_phone, 
                    dl_number, pan_number, aadhaar_number, pan_aadhaar_linked, 
                    vendor_name, vendor_id, father_name, vendor_type, candidate_role, custom_rent_amount
                ) VALUES ('Ganesh Fleet Travels', '9876541230', '1985-01-01', 'Hyderabad', 'Banjara Hills',
                          '123 Street, Hyderabad', '123 Street, Hyderabad', 'N/A', '0000000000',
                          'N/A', 'PANOP7788P', '[Aadhaar Redacted]', 'Yes', 'Ganesh Fleet Travels', 'OP-7788', 'N/A', 'Operator', 'Operator', '1000') RETURNING id;
            """)

            cur.execute("""
                INSERT INTO july_form_onboarding (
                    driver_name, phone_number, dl_number, custom_rent_amount, driver_id,
                    vendor_name, vendor_id, vendor_type, candidate_role,
                    whatsapp_number, dob, city, present_address, permanent_address, 
                    emergency_name, emergency_phone, pan_number, aadhaar_number, father_name
                ) VALUES ('Suresh Kumar', '9900112233', 'TS0920200012345', '850', 'DR-9001',
                          'Ganesh Fleet Travels', 'OP-7788', 'Operator', 'Driver',
                          '9900112233', '1992-05-15', 'Hyderabad', '123 Street, Hyderabad', '123 Street, Hyderabad',
                          'Ramesh Kumar', '9876543210', 'ABCDE9876A', '[Aadhaar Redacted]', 'Ramesh Kumar');
            """)

        # ── roles and permissions ────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS app_roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS app_permissions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS app_role_permissions (
                role_id INTEGER REFERENCES app_roles(id) ON DELETE CASCADE,
                permission_id INTEGER REFERENCES app_permissions(id) ON DELETE CASCADE,
                PRIMARY KEY (role_id, permission_id)
            );
        """)

        # ── copy_app_users (login accounts) ───────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS copy_app_users (
                id           SERIAL PRIMARY KEY,
                username     VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                executive_id INTEGER REFERENCES copy_users(id),
                role_id      INTEGER REFERENCES app_roles(id),
                created_at   TIMESTAMP DEFAULT NOW()
            );
        """)
        cur.execute("ALTER TABLE copy_app_users ADD COLUMN IF NOT EXISTS raw_password VARCHAR(255);")
        cur.execute("ALTER TABLE copy_app_users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES app_roles(id);")
        cur.execute("ALTER TABLE copy_app_users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(100);")
        cur.execute("ALTER TABLE copy_app_users ADD COLUMN IF NOT EXISTS email VARCHAR(255);")
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS copy_app_sessions (
                token        VARCHAR(255) PRIMARY KEY,
                user_id      INTEGER REFERENCES copy_app_users(id),
                created_at   TIMESTAMP DEFAULT NOW()
            );
        """)

        # ── july_user_login_logs (Login/Logout Tracking) ────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS july_user_login_logs (
                log_id SERIAL PRIMARY KEY,
                user_id INTEGER,
                username VARCHAR(100),
                full_name VARCHAR(255),
                role_code VARCHAR(50),
                role_name VARCHAR(100),
                city VARCHAR(100),
                session_token VARCHAR(255),
                login_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                logout_time TIMESTAMP WITH TIME ZONE,
                session_duration_minutes NUMERIC(10, 2),
                ip_address VARCHAR(100),
                user_agent TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # ── copy_vehicle_models ─────────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS copy_vehicle_models (
                id         SERIAL PRIMARY KEY,
                brand      VARCHAR(255) NOT NULL,
                model_name VARCHAR(255) NOT NULL,
                variant    VARCHAR(100) NOT NULL,
                fuel_type  VARCHAR(100) NOT NULL,
                make_year  INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

        # NOTE: july_vehicle_onboarding is now PERMANENT — no DROP TABLE

        # ── july_vehicle_onboarding ─────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS july_vehicle_onboarding (
                id SERIAL PRIMARY KEY,
                vehicle_number VARCHAR(100),
                letzryd_unique_no VARCHAR(100),
                city_name VARCHAR(100),
                model VARCHAR(255),
                received_allocated VARCHAR(50),
                delivery_month VARCHAR(50),
                registration_date VARCHAR(50),
                rto_tax_validity VARCHAR(50),
                permit_validity VARCHAR(50),
                fitness_validity VARCHAR(50),
                pollution_validity VARCHAR(50),
                insurance_validity VARCHAR(50),
                insurance_broker VARCHAR(255),
                insurance_underwriter VARCHAR(255),
                insurance_start_date VARCHAR(50),
                authorization_certificate VARCHAR(255),
                insurance_mapping VARCHAR(255),
                kms_reading VARCHAR(50),
                tracking_device_vendor VARCHAR(100),
                tracking_device_type VARCHAR(100),
                cng_installed VARCHAR(50),
                cng_plate VARCHAR(100),
                cng_installation_date VARCHAR(50),
                jack VARCHAR(50),
                jack_rod VARCHAR(50),
                spanner VARCHAR(50),
                parking_triangle VARCHAR(50),
                fire_extinguishers VARCHAR(50),
                seat_cover VARCHAR(50),
                floor_carpet VARCHAR(50),
                image_front TEXT,
                image_lh TEXT,
                image_back TEXT,
                image_rh TEXT,
                engine_chasis_no_img TEXT,
                battery_sl_no_img TEXT,
                engine_compartment_img TEXT,
                fast_tag_img TEXT,
                music_system_img TEXT,
                key_quantity INTEGER,
                rc_document TEXT,
                insurance_document TEXT,
                authorization_certificate_doc TEXT,
                rto_tax_receipt TEXT,
                rh_fr_tyre_img TEXT,
                lh_fr_tyre_img TEXT,
                rh_rear_tyre_img TEXT,
                lh_rear_tyre_img TEXT,
                spare_wheel_img TEXT,
                fuel_type VARCHAR(50),
                is_migrated BOOLEAN NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

        # ── copy_workshop_vendors ───────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS copy_workshop_vendors (
                id SERIAL PRIMARY KEY,
                vendor_name VARCHAR(255),
                workshop_type VARCHAR(100),
                city_name VARCHAR(100),
                address TEXT,
                gst_number VARCHAR(50),
                contact_person VARCHAR(255),
                mobile_number VARCHAR(50),
                email_id VARCHAR(255),
                pan_card VARCHAR(50),
                bank_name VARCHAR(255),
                account_number VARCHAR(100),
                ifsc_code VARCHAR(50),
                workshop_status VARCHAR(50),
                workshop_photo TEXT,
                contact_person_2 VARCHAR(255),
                alternate_mobile VARCHAR(50),
                telephone VARCHAR(50),
                owner_name VARCHAR(255),
                upi_id VARCHAR(100),
                is_migrated BOOLEAN NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

        # ── copy_hubs_parking ──────────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS copy_hubs_parking (
                id SERIAL PRIMARY KEY,
                hub_name VARCHAR(255),
                city_name VARCHAR(100),
                address TEXT,
                pincode VARCHAR(20),
                facility_type VARCHAR(100),
                total_capacity VARCHAR(50),
                ev_charging VARCHAR(10),
                security_cctv VARCHAR(10),
                hub_manager VARCHAR(255),
                manager_phone VARCHAR(50),
                operating_hours VARCHAR(100),
                hub_photo TEXT,
                contact_person VARCHAR(255),
                designation VARCHAR(255),
                is_migrated BOOLEAN NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

        # ── copy_accidents_registry ───────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS copy_accidents_registry (
                id SERIAL PRIMARY KEY,
                vehicle_number VARCHAR(100),
                vendor_id VARCHAR(100),
                vendor_name VARCHAR(255),
                city_name VARCHAR(100),
                date_of_accident VARCHAR(50),
                time_of_accident VARCHAR(50),
                place_of_accident TEXT,
                vehicle_status VARCHAR(100),
                driver_id VARCHAR(100),
                driver_name VARCHAR(255),
                no_of_persons VARCHAR(50),
                third_party_involvement VARCHAR(50),
                fir_filed VARCHAR(50),
                accident_reason TEXT,
                accident_inspection TEXT,
                insurance_status VARCHAR(100),
                repair_cost VARCHAR(50),
                toeing_cost VARCHAR(50),
                challan_amount VARCHAR(50),
                fine_amount VARCHAR(50),
                comments TEXT,
                front_vehicle_photo TEXT,
                back_vehicle_photo TEXT,
                right_vehicle_photo TEXT,
                left_vehicle_photo TEXT,
                fir_document_copy TEXT,
                is_migrated BOOLEAN NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

        # ── copy_inspections ───────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS copy_inspections (
                id SERIAL PRIMARY KEY,
                vehicle_number VARCHAR(100),
                inspection_date VARCHAR(50),
                odometer_reading VARCHAR(50),
                jack VARCHAR(50),
                jack_rod VARCHAR(50),
                spanner VARCHAR(50),
                parking_triangle VARCHAR(50),
                fire_extinguishers VARCHAR(50),
                seat_cover VARCHAR(50),
                floor_carpet VARCHAR(50),
                photo_front TEXT,
                photo_back TEXT,
                photo_lh TEXT,
                photo_rh TEXT,
                photo_engine_chassis TEXT,
                photo_battery TEXT,
                photo_engine_compartment TEXT,
                photo_fast_tag TEXT,
                photo_music_system TEXT,
                key_quantity INTEGER,
                photo_tyre_rh_fr TEXT,
                photo_tyre_lh_fr TEXT,
                photo_tyre_rh_re TEXT,
                photo_tyre_lh_re TEXT,
                photo_tyre_spare TEXT,
                remarks TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

        # ── copy_maintenance_registry ───────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS copy_maintenance_registry (
                id SERIAL PRIMARY KEY,
                vehicle_number VARCHAR(100),
                city_name VARCHAR(100),
                model VARCHAR(100),
                vehicle_k_m_s VARCHAR(50),
                repair_type VARCHAR(100),
                vehicle_location TEXT,
                vehicle_in_date VARCHAR(50),
                initial_remarks TEXT,
                vehicle_damage_photos TEXT,
                workshop_name VARCHAR(255),
                allocation_date VARCHAR(50),
                estimated_delivery_date VARCHAR(50),
                estimated_amount VARCHAR(50),
                insurance_claimed VARCHAR(50),
                claim_number VARCHAR(100),
                insurance_brokerage VARCHAR(255),
                approved_by VARCHAR(100),
                approval_date VARCHAR(50),
                approval_file TEXT,
                maintenance_status VARCHAR(100),
                vehicle_status_date VARCHAR(50),
                daily_vehicle_remarks TEXT,
                rfd_date VARCHAR(50),
                delivered_date VARCHAR(50),
                final_status VARCHAR(50),
                tat VARCHAR(50),
                pdi_status VARCHAR(50),
                invoice_no VARCHAR(100),
                invoice_date VARCHAR(50),
                invoice_amount VARCHAR(50),
                insurance_liability_discounts VARCHAR(50),
                letzryd_payable VARCHAR(50),
                payment_status VARCHAR(50),
                type_of_payment VARCHAR(50),
                utr_no VARCHAR(100),
                entry_remarks TEXT,
                invoice_file TEXT,
                pdi_front_photo TEXT,
                pdi_back_photo TEXT,
                pdi_lh_photo TEXT,
                pdi_rh_photo TEXT,
                pdi_engine_photo TEXT,
                engine_chassis_no VARCHAR(100),
                battery_sl_no VARCHAR(100),
                fast_tag VARCHAR(100),
                pdi_jack VARCHAR(50),
                pdi_jack_rod VARCHAR(50),
                pdi_spanner VARCHAR(50),
                pdi_parking_triangle VARCHAR(50),
                pdi_fire_extinguisher VARCHAR(50),
                pdi_seat_cover VARCHAR(50),
                pdi_floor_carpet VARCHAR(50),
                pdi_music_system VARCHAR(50),
                pdi_spare_wheel VARCHAR(50),
                pdi_key_quantity VARCHAR(50),
                pdi_rh_front_tyre VARCHAR(50),
                pdi_lh_front_tyre VARCHAR(50),
                pdi_rh_rear_tyre VARCHAR(50),
                pdi_lh_rear_tyre VARCHAR(50),
                invoices TEXT,
                maintenance_steps TEXT,
                is_migrated BOOLEAN NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

        # ── copy_rent_ledger ──────────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS copy_rent_ledger (
                id SERIAL PRIMARY KEY,
                entity_type VARCHAR(50),
                entity_id VARCHAR(100),
                change_type VARCHAR(50),
                old_amount INTEGER,
                new_amount INTEGER,
                modified_by VARCHAR(100),
                effective_date VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

        # ── copy_traffic_challans ─────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS copy_traffic_challans (
                id SERIAL PRIMARY KEY,
                challan_number VARCHAR(100) NOT NULL UNIQUE,
                vehicle_number VARCHAR(100) NOT NULL,
                driver_id VARCHAR(50),
                driver_name VARCHAR(255),
                violation_date VARCHAR(50),
                violation_location TEXT,
                challan_amount INTEGER NOT NULL,
                internal_fine_amount INTEGER DEFAULT 0,
                recovery_status VARCHAR(50) DEFAULT 'Pending',
                recovered_amount INTEGER DEFAULT 0,
                remarks TEXT,
                challan_photo TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)

        conn.commit()
        cur.close()
        print("[OK] Database setup complete")

    except Exception as e:
        print(f"[ERROR] Startup error: {e}")
        conn.rollback()
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Auth helpers
# ─────────────────────────────────────────────────────────
def get_current_user(authorization: Optional[str] = Header(None)):
    """Validate Bearer token and return user profile. Checks july_portal_users first with fallback."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        
        # 1. Try july_portal_users join
        cur.execute("""
            SELECT pu.portal_user_id, e.employee_id, 
                   CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')), 
                   r.role_name, pu.username, pu.role_id,
                   r.role_code, COALESCE(e.city, 'Hyderabad')
            FROM copy_app_sessions s
            JOIN july_portal_users pu ON pu.portal_user_id = s.user_id
            JOIN july_employees e ON e.employee_id = pu.employee_id
            JOIN july_roles r ON r.role_id = pu.role_id
            WHERE s.token = %s AND pu.account_status = 'Active';
        """, (token,))
        row = cur.fetchone()
        
        if row:
            user_id, exec_id, name, role, username, role_id, role_code, city = row
            # Fetch july_role_permissions
            cur.execute("""
                SELECT p.permission_code, rp.can_view, rp.can_create, rp.can_edit, rp.can_approve, rp.can_delete
                FROM july_role_permissions rp
                JOIN july_permissions p ON p.permission_id = rp.permission_id
                WHERE rp.role_id = %s;
            """, (role_id,))
            perm_rows = cur.fetchall()
            perm_matrix = {
                r[0]: {"view": r[1], "create": r[2], "edit": r[3], "approve": r[4], "delete": r[5]}
                for r in perm_rows
            }
            return {
                "user_id": user_id, 
                "portal_user_id": user_id,
                "executive_id": f"EMP-{exec_id}", 
                "name": name.strip(), 
                "role": role, 
                "username": username,
                "role_id": role_id,
                "role_code": role_code,
                "city": city,
                "permission_matrix": perm_matrix,
                "permissions": [k for k, v in perm_matrix.items() if v["view"]]
            }
            
        # 2. Fallback to copy_app_users
        cur.execute("""
            SELECT au.id, au.executive_id, u.name, COALESCE(ar.name, u.role, 'Executive'), au.username, au.role_id
            FROM copy_app_sessions s
            JOIN copy_app_users au ON au.id = s.user_id
            LEFT JOIN copy_users u ON u.id = au.executive_id
            LEFT JOIN app_roles ar ON ar.id = au.role_id
            WHERE s.token = %s;
        """, (token,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        user_id, exec_id, name, role, username, role_id = row
        
        permissions = []
        if role_id:
            cur.execute("""
                SELECT p.name 
                FROM app_role_permissions arp
                JOIN app_permissions p ON p.id = arp.permission_id
                WHERE arp.role_id = %s;
            """, (role_id,))
            permissions = [r[0] for r in cur.fetchall()]

        return {
            "user_id": user_id, 
            "executive_id": exec_id, 
            "name": name, 
            "role": role, 
            "username": username,
            "role_id": role_id,
            "permissions": permissions
        }
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class WalkinData(BaseModel):
    visitor_type:    Optional[str] = None
    event_date:      Optional[str] = None
    enquiry_time:    Optional[str] = None
    city:            Union[str, int, None] = None
    operating_place: Optional[str] = None
    executive_id:    Union[str, int, None] = None
    first_name:      Optional[str] = None
    last_name:       Optional[str] = None
    person_name:     Optional[str] = None
    person_number:   Union[str, int, None] = None
    aadhaar_number:  Optional[str] = None
    dl_number:       Union[str, int, None] = None
    aadhaar_image:   Optional[Any] = None
    dl_image:        Optional[Any] = None
    visiting_reason: Optional[str] = None
    mode_of_enquiry: Optional[str] = None
    lead_channel:    Optional[str] = None
    lead_channel_details: Optional[str] = None
    referred_by_name: Optional[str] = None
    referred_by_phone: Optional[str] = None
    joined_status:   Optional[str] = None
    submission_status: Optional[str] = None
    remarks:         Optional[str] = None

class OnboardingData(BaseModel):
    driver_name: str
    phone_number: str
    whatsapp_number: Optional[str] = None
    dob: str
    city: str
    operating_place: Optional[str] = None
    present_address: str
    permanent_address: str
    emergency_name: str
    emergency_phone: str
    emergency_relationship: Optional[str] = None
    dl_number: Optional[str] = None
    dl_expiry_date: Optional[str] = None
    lead_source: Optional[str] = None
    pan_number: str
    aadhaar_number: str
    pan_aadhaar_linked: Optional[str] = None
    selfie_photo: Optional[Any] = None
    dl_front: Optional[Any] = None
    dl_back: Optional[Any] = None
    pan_card_photo: Optional[Any] = None
    aadhaar_card_front: Optional[Any] = None
    aadhaar_card_back: Optional[Any] = None
    driver_email: Optional[str] = None
    local_address_proof: Optional[Any] = None
    ref1_name: Optional[str] = None
    ref1_phone: Optional[str] = None
    ref1_address: Optional[str] = None
    ref2_name: Optional[str] = None
    ref2_phone: Optional[str] = None
    ref2_address: Optional[str] = None
    ref3_name: Optional[str] = None
    ref3_phone: Optional[str] = None
    ref3_address: Optional[str] = None
    walkin_id: Optional[int] = None
    vendor_name: Optional[str] = None
    vendor_id: Optional[str] = None
    aadhaar_card_photo: Optional[Any] = None
    father_name: str
    bank_name: Optional[str] = None
    other_bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    upi_id: Optional[str] = None
    account_name: Optional[str] = None
    account_type: Optional[str] = None
    vendor_type: Optional[str] = "Individual"
    driver_id: Optional[str] = None
    custom_rent_amount: Optional[str] = None
    operator_drivers: Optional[list[dict]] = None
    platform_details: Optional[Union[dict, str]] = None
    documents_verified: Optional[bool] = False
    custom_rental_plan: Optional[bool] = False
    cancelled_cheque_photo: Optional[Any] = None
    cheque2_photo: Optional[Any] = None
    cheque3_photo: Optional[Any] = None
    signature_photo: Optional[Any] = None
    candidate_role: Optional[str] = "Driver"
    rental_model: Optional[str] = None
    security_deposit: Optional[str] = None
    letzown_cheques: Optional[str] = None
    is_spring_verified: Optional[bool] = False

class AdjustmentData(BaseModel):
    partner_name: Optional[str] = None
    partner_code: Optional[str] = None
    driver_id: Optional[str] = None
    partner_number: Optional[str] = None
    vehicle_number: Optional[str] = None
    city_name: Optional[str] = None
    partner_type: Optional[str] = None
    adjustment_level: Optional[str] = None
    adjustment_nature: Optional[str] = None
    time_duration: Optional[str] = None
    adjustment_type: str
    adjustment_date: str
    enter_amount: str
    remittance_towards: Optional[str] = None
    adjustment_related_to: Optional[str] = None
    remarks: Optional[str] = None
    first_level_approval_by: Optional[str] = None
    finance_team_status: str
    finance_team_remarks: Optional[str] = None
    final_level_approval_by: Optional[str] = None
    status: str
    photo: Optional[Any] = None
    hisaab_number: Optional[str] = None
    contested_line_items: Optional[str] = None
    severity_level: Optional[str] = None
    cost_level: Optional[str] = None
    escalate_to: Optional[Union[str, int]] = None
    submitter_comments: Optional[str] = None
    sent_for_approval: Optional[str] = None

class AllocationData(BaseModel):
    allocation_date: str
    allocation_type: str
    city_name: str
    driver_id: str
    driver_name: str
    driver_phone: str
    driver_plan: Optional[str] = None
    type_of_plan: Optional[str] = None
    car_model: Optional[str] = None
    vehicle_number: str
    old_vehicle_number: Optional[str] = None
    dropoff_odometer: Optional[str] = None
    dropoff_remarks: Optional[str] = None
    dropoff_photo: Optional[Any] = None
    sub_type: Optional[str] = None
    ola_negative_balance: Optional[str] = None
    ola_negative_balance_proof: Optional[Any] = None
    photo_lh_side: Optional[Any] = None
    photo_rh_side: Optional[Any] = None
    photo_front_side: Optional[Any] = None
    photo_back_side: Optional[Any] = None
    gps_active: Optional[str] = None
    duplicate_key_status: Optional[str] = None
    fastag_balance_amount: Optional[str] = None
    fastag_balance_proof: Optional[Any] = None
    dropoff_location: Optional[str] = None
    status: Optional[str] = None
    created_by: Optional[int] = None


class ExpenseData(BaseModel):
    expense_date: str
    driver_name: str
    phone_number: str
    vehicle_number: str
    expenses_type: str
    amount_paid: str
    reference_photo: Optional[Any] = None


class VehicleOnboardingData(BaseModel):
    vehicle_number: Optional[str] = None
    letzryd_unique_no: Optional[str] = None
    city_name: Optional[str] = "Hyderabad"
    model: Optional[str] = None
    received_allocated: Optional[str] = "In Process"
    fuel_type: Optional[str] = None
    delivery_month: Optional[str] = None
    registration_date: Optional[str] = None
    rto_tax_validity: Optional[str] = None
    permit_validity: Optional[str] = None
    fitness_validity: Optional[str] = None
    pollution_validity: Optional[str] = None
    insurance_validity: Optional[str] = None
    insurance_broker: Optional[str] = None
    insurance_underwriter: Optional[str] = None
    insurance_start_date: Optional[str] = None
    insurance_idv: Optional[str] = None
    cover_engine_protect: Optional[Union[bool, str]] = False
    cover_consumables: Optional[Union[bool, str]] = False
    cover_zero_dep: Optional[Union[bool, str]] = False
    cover_rsa: Optional[Union[bool, str]] = False
    chassis_number: Optional[str] = None
    engine_number: Optional[str] = None
    cng_tank_number: Optional[str] = None
    authorization_certificate: Optional[str] = None
    insurance_mapping: Optional[str] = None
    kms_reading: Optional[str] = None
    tracking_device_vendor: Optional[str] = None
    tracking_device_type: Optional[str] = None
    cng_installed: Optional[str] = "No"
    cng_plate: Optional[str] = None
    cng_installation_date: Optional[str] = None
    jack: Optional[str] = None
    jack_rod: Optional[str] = None
    spanner: Optional[str] = None
    parking_triangle: Optional[str] = None
    fire_extinguishers: Optional[str] = None
    seat_cover: Optional[str] = None
    floor_carpet: Optional[str] = None
    fast_tag: Optional[str] = None
    fast_tag_number: Optional[str] = None
    fast_tag_vendor: Optional[str] = None
    music_system: Optional[str] = None
    image_front: Optional[Any] = None
    image_lh: Optional[Any] = None
    image_back: Optional[Any] = None
    image_rh: Optional[Any] = None
    engine_chasis_no_img: Optional[Any] = None
    battery_sl_no_img: Optional[Any] = None
    engine_compartment_img: Optional[Any] = None
    fast_tag_img: Optional[Any] = None
    music_system_img: Optional[Any] = None
    key_quantity: Optional[int] = None
    rh_fr_tyre_img: Optional[Any] = None
    lh_fr_tyre_img: Optional[Any] = None
    rh_rear_tyre_img: Optional[Any] = None
    lh_rear_tyre_img: Optional[Any] = None
    spare_wheel_img: Optional[Any] = None
    rc_document: Optional[Any] = None
    insurance_document: Optional[Any] = None
    authorization_certificate_doc: Optional[Any] = None
    rto_tax_receipt: Optional[Any] = None
    approval_status: Optional[str] = "Draft"
    current_approver_id: Optional[int] = None
    approval_remarks: Optional[str] = None
    created_by: Optional[int] = None


class WorkshopData(BaseModel):
    vendor_name: str
    workshop_type: str
    city_name: str
    address: str
    gst_number: str
    contact_person: str
    mobile_number: str
    email_id: str
    pan_card: str
    bank_name: str
    account_number: str
    ifsc_code: str
    workshop_status: str
    workshop_photo: Optional[Any] = None
    contact_person_2: Optional[str] = None
    alternate_mobile: Optional[str] = None
    telephone: Optional[str] = None
    owner_name: Optional[str] = None
    upi_id: Optional[str] = None


class HubData(BaseModel):
    hub_name: str
    city_name: str
    address: str
    pincode: str
    facility_type: str
    total_capacity: str
    ev_charging: Optional[str] = None
    security_cctv: Optional[str] = None
    hub_manager: Optional[str] = None
    manager_phone: Optional[str] = None
    operating_hours: Optional[str] = None
    hub_photo: Optional[Any] = None
    contact_person: Optional[str] = None
    designation: Optional[str] = None

class RentData(BaseModel):
    level: str = "model"
    vehicle_manufacturer: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_number: Optional[str] = None
    vehicle_age: Optional[str] = None
    vendor_id: Optional[str] = None
    driver_id: Optional[str] = None
    rent_amount: int

class AccidentData(BaseModel):
    vehicle_number: str
    vendor_id: Optional[str] = None
    vendor_name: str
    city_name: str
    date_of_accident: str
    time_of_accident: str
    place_of_accident: str
    vehicle_status: str
    driver_id: str
    driver_name: str
    no_of_persons: str
    third_party_involvement: str
    fir_filed: str
    accident_reason: str
    accident_inspection: str
    insurance_status: str
    repair_cost: Optional[str] = None
    toeing_cost: Optional[str] = None
    challan_amount: Optional[str] = None
    fine_amount: Optional[str] = None
    comments: Optional[str] = None
    front_vehicle_photo: Optional[Any] = None
    back_vehicle_photo: Optional[Any] = None
    right_vehicle_photo: Optional[Any] = None
    left_vehicle_photo: Optional[Any] = None
    fir_document_copy: Optional[Any] = None

class InspectionData(BaseModel):
    vehicle_number: str
    inspection_date: str
    odometer_reading: str
    jack: str
    jack_rod: str
    spanner: str
    parking_triangle: str
    fire_extinguishers: str
    seat_cover: str
    floor_carpet: str
    photo_front: Optional[Any] = None
    photo_back: Optional[Any] = None
    photo_lh: Optional[Any] = None
    photo_rh: Optional[Any] = None
    photo_engine_chassis: Optional[Any] = None
    photo_battery: Optional[Any] = None
    photo_engine_compartment: Optional[Any] = None
    photo_fast_tag: Optional[Any] = None
    photo_music_system: Optional[Any] = None
    key_quantity: Optional[int] = None
    photo_tyre_rh_fr: Optional[Any] = None
    photo_tyre_lh_fr: Optional[Any] = None
    photo_tyre_rh_re: Optional[Any] = None
    photo_tyre_lh_re: Optional[Any] = None
    photo_tyre_spare: Optional[Any] = None
    remarks: Optional[str] = None
    music_system: Optional[str] = None

def extract_image(val: Any) -> Optional[str]:
    if val is None:
        return None
    if isinstance(val, list) and len(val) > 0:
        first = val[0]
        return first.get("content") if isinstance(first, dict) else str(first)
    if isinstance(val, str) and val.startswith("data:"):
        return val
    return None


# ─────────────────────────────────────────────────────────
# Auth Endpoints
# ─────────────────────────────────────────────────────────
@app.post("/api/auth/login")
def login(req: LoginRequest, request: Request):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        uname = req.username.strip().lower()
        lookup_name = 'super_admin' if uname in ['admin', 'superadmin'] else uname
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "")
        
        # Check july_portal_users first
        cur.execute("""
            SELECT pu.portal_user_id, pu.password_hash, pu.employee_id, 
                   CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')), 
                   r.role_name, pu.username, pu.role_id,
                   r.role_code, COALESCE(e.city, 'Hyderabad')
            FROM july_portal_users pu
            JOIN july_employees e ON e.employee_id = pu.employee_id
            JOIN july_roles r ON r.role_id = pu.role_id
            WHERE pu.username = %s AND pu.account_status = 'Active';
        """, (lookup_name,))
        row = cur.fetchone()
        
        if row:
            user_id, pw_hash, exec_id, name, role, username, role_id, role_code, city = row
            if not pwd_context.verify(req.password, pw_hash):
                raise HTTPException(status_code=401, detail="Invalid username or password")
            
            token = secrets.token_urlsafe(32)
            cur.execute(
                "INSERT INTO copy_app_sessions (token, user_id) VALUES (%s, %s);",
                (token, user_id)
            )

            # Record Login Log Entry
            try:
                cur.execute("""
                    INSERT INTO july_user_login_logs 
                    (user_id, username, full_name, role_code, role_name, city, session_token, login_time, ip_address, user_agent)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, %s, %s);
                """, (user_id, username, name.strip(), role_code, role, city, token, client_ip, user_agent))
            except Exception as log_err:
                print(f"[WARN] Failed to insert login log: {log_err}")
            
            # Fetch july_role_permissions
            cur.execute("""
                SELECT p.permission_code, rp.can_view, rp.can_create, rp.can_edit, rp.can_approve, rp.can_delete
                FROM july_role_permissions rp
                JOIN july_permissions p ON p.permission_id = rp.permission_id
                WHERE rp.role_id = %s;
            """, (role_id,))
            perm_rows = cur.fetchall()
            perm_matrix = {
                r[0]: {"view": r[1], "create": r[2], "edit": r[3], "approve": r[4], "delete": r[5]}
                for r in perm_rows
            }
            
            conn.commit()
            return {
                "token": token,
                "user": {
                    "id": user_id,
                    "portal_user_id": user_id,
                    "username": username,
                    "executive_id": exec_id,
                    "name": name.strip(),
                    "role": role,
                    "role_id": role_id,
                    "role_code": role_code,
                    "city": city,
                    "permission_matrix": perm_matrix,
                    "permissions": [k for k, v in perm_matrix.items() if v["view"]]
                }
            }
        
        # Fallback to copy_app_users if not found in july_portal_users
        cur.execute("""
            SELECT au.id, au.password_hash, au.executive_id, u.name, COALESCE(ar.name, u.role, 'Executive'), au.username, au.role_id
            FROM copy_app_users au
            LEFT JOIN copy_users u ON u.id = au.executive_id
            LEFT JOIN app_roles ar ON ar.id = au.role_id
            WHERE au.username = %s;
        """, (uname,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        user_id, pw_hash, exec_id, name, role, username, role_id = row
        if not pwd_context.verify(req.password, pw_hash):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        token = secrets.token_urlsafe(32)
        cur.execute(
            "INSERT INTO copy_app_sessions (token, user_id) VALUES (%s, %s);",
            (token, user_id)
        )

        try:
            cur.execute("""
                INSERT INTO july_user_login_logs 
                (user_id, username, full_name, role_code, role_name, city, session_token, login_time, ip_address, user_agent)
                VALUES (%s, %s, %s, 'USER', %s, 'Hyderabad', %s, CURRENT_TIMESTAMP, %s, %s);
            """, (user_id, username, name or username, role, token, client_ip, user_agent))
        except Exception as log_err:
            print(f"[WARN] Failed to insert fallback login log: {log_err}")
        
        permissions = []
        if role_id:
            cur.execute("""
                SELECT p.name 
                FROM app_role_permissions arp
                JOIN app_permissions p ON p.id = arp.permission_id
                WHERE arp.role_id = %s;
            """, (role_id,))
            permissions = [r[0] for r in cur.fetchall()]
            
        conn.commit()
        return {
            "token": token,
            "user": {
                "id": user_id,
                "username": username,
                "executive_id": exec_id,
                "name": name,
                "role": role,
                "role_id": role_id,
                "permissions": permissions
            }
        }
    finally:
        postgreSQL_pool.putconn(conn)


@app.post("/api/auth/logout")
def logout(request: Request, authorization: Optional[str] = Header(None), token: Optional[str] = None):
    """Record logout timestamp and calculate session duration."""
    auth_token = token
    if not auth_token and authorization and authorization.startswith("Bearer "):
        auth_token = authorization.split(" ", 1)[1]
    if not auth_token:
        auth_token = request.query_params.get("token")
    
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        if auth_token:
            cur.execute("""
                UPDATE july_user_login_logs 
                SET logout_time = CURRENT_TIMESTAMP,
                    session_duration_minutes = ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - login_time)) / 60.0, 2)
                WHERE session_token = %s AND logout_time IS NULL;
            """, (auth_token,))
            cur.execute("DELETE FROM copy_app_sessions WHERE token = %s;", (auth_token,))
            conn.commit()
        return {"success": True, "message": "Logged out successfully"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        postgreSQL_pool.putconn(conn)


@app.get("/api/july/user-login-logs")
def get_user_login_logs(limit: int = 100, authorization: Optional[str] = Header(None)):
    """Fetch history of all user login & logout sessions."""
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT log_id, user_id, username, full_name, role_code, role_name, city,
                   login_time, logout_time, session_duration_minutes, ip_address
            FROM july_user_login_logs
            ORDER BY login_time DESC
            LIMIT %s;
        """, (limit,))
        rows = cur.fetchall()
        return [
            {
                "log_id": r[0],
                "user_id": r[1],
                "username": r[2],
                "full_name": r[3],
                "role_code": r[4],
                "role_name": r[5],
                "city": r[6],
                "login_time": r[7].isoformat() if r[7] else None,
                "logout_time": r[8].isoformat() if r[8] else None,
                "session_duration_minutes": float(r[9]) if r[9] is not None else None,
                "ip_address": r[10]
            }
            for r in rows
        ]
    finally:
        postgreSQL_pool.putconn(conn)


@app.get("/api/auth/me")
def get_me(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    exec_id = user.get("executive_id") or user.get("portal_user_id") or user.get("user_id")
    if isinstance(exec_id, str) and exec_id.startswith("EMP-"):
        exec_id = exec_id.replace("EMP-", "")
        
    return {
        "user_id": user.get("user_id") or user.get("portal_user_id"),
        "portal_user_id": user.get("user_id") or user.get("portal_user_id"),
        "username": user["username"],
        "executive_id": exec_id,
        "name": user["name"],
        "role": user["role"],
        "role_id": user.get("role_id"),
        "role_code": user.get("role_code"),
        "city": user.get("city", "Hyderabad"),
        "data_scope": user.get("data_scope", "City-Scoped"),
        "permissions": user.get("permissions", []),
        "permission_matrix": user.get("permission_matrix")
    }


@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        conn = postgreSQL_pool.getconn()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM copy_app_sessions WHERE token = %s;", (token,))
            conn.commit()
        finally:
            postgreSQL_pool.putconn(conn)
    return {"success": True}


class AppUserData(BaseModel):
    name: str
    role: str
    username: str
    password: str
    role_id: Optional[int] = None
    employee_id: Optional[str] = None
    email: Optional[str] = None

class AppUserUpdateData(BaseModel):
    name: str
    role: str
    username: str
    password: Optional[str] = None
    role_id: Optional[int] = None
    employee_id: Optional[str] = None
    email: Optional[str] = None

@app.get("/api/users")
def list_app_users(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT au.id, au.username, u.name, u.role, au.created_at, au.raw_password, 
                   au.role_id, ar.name, COALESCE(au.employee_id, u.employee_id), COALESCE(au.email, u.email)
            FROM copy_app_users au
            JOIN copy_users u ON u.id = au.executive_id
            LEFT JOIN app_roles ar ON ar.id = au.role_id
            ORDER BY au.id DESC;
        """)
        rows = cur.fetchall()
        result = []
        for r in rows:
            result.append({
                "id": r[0],
                "username": r[1],
                "name": r[2],
                "role": r[3],
                "created_at": r[4].isoformat() if r[4] else None,
                "raw_password": r[5] or "letzryd123",
                "role_id": r[6],
                "role_name": r[7],
                "employee_id": r[8],
                "email": r[9]
            })
        return result
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/users")
def create_app_user(req: AppUserData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    username_cleaned = req.username.strip().lower()
    if not req.password:
         raise HTTPException(status_code=400, detail="Password is required")
    
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM copy_app_users WHERE username = %s;", (username_cleaned,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Username already exists")
        
        executive_id = None
        if req.employee_id and req.employee_id.strip():
            cur.execute("SELECT id FROM copy_users WHERE employee_id = %s;", (req.employee_id.strip(),))
            row = cur.fetchone()
            if row:
                executive_id = row[0]
                cur.execute(
                    "UPDATE copy_users SET name = %s, role = %s, email = COALESCE(email, %s) WHERE id = %s;",
                    (req.name.strip(), req.role.strip(), req.email, executive_id)
                )

        if not executive_id:
            cur.execute(
                "INSERT INTO copy_users (name, role, employee_id, email) VALUES (%s, %s, %s, %s) RETURNING id;",
                (req.name.strip(), req.role.strip(), req.employee_id, req.email)
            )
            executive_id = cur.fetchone()[0]
        
        hashed_password = pwd_context.hash(req.password)
        cur.execute(
            """INSERT INTO copy_app_users (username, password_hash, executive_id, raw_password, role_id, employee_id, email) 
               VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id;""",
            (username_cleaned, hashed_password, executive_id, req.password, req.role_id, req.employee_id, req.email)
        )
        user_id = cur.fetchone()[0]
        
        conn.commit()
        return {"success": True, "user_id": user_id, "executive_id": executive_id}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/users/{id}")
def update_app_user(id: int, req: AppUserUpdateData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    username_cleaned = req.username.strip().lower()
    
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        
        cur.execute("SELECT executive_id FROM copy_app_users WHERE id = %s;", (id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        exec_id = row[0]
        
        cur.execute("SELECT id FROM copy_app_users WHERE username = %s AND id != %s;", (username_cleaned, id))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Username already exists")
            
        if req.employee_id and req.employee_id.strip():
            cur.execute("SELECT id FROM copy_users WHERE employee_id = %s;", (req.employee_id.strip(),))
            emp_row = cur.fetchone()
            if emp_row:
                new_exec_id = emp_row[0]
                if new_exec_id != exec_id:
                    cur.execute("UPDATE copy_app_users SET executive_id = %s WHERE id = %s;", (new_exec_id, id))
                    exec_id = new_exec_id
                cur.execute(
                    "UPDATE copy_users SET name = %s, role = %s, email = COALESCE(email, %s) WHERE id = %s;",
                    (req.name.strip(), req.role.strip(), req.email, exec_id)
                )
            else:
                cur.execute(
                    "UPDATE copy_users SET name = %s, role = %s, employee_id = %s, email = %s WHERE id = %s;",
                    (req.name.strip(), req.role.strip(), req.employee_id, req.email, exec_id)
                )
        else:
            cur.execute(
                "UPDATE copy_users SET name = %s, role = %s WHERE id = %s;",
                (req.name.strip(), req.role.strip(), exec_id)
            )
        
        if req.password:
            hashed_password = pwd_context.hash(req.password)
            cur.execute(
                """UPDATE copy_app_users SET username = %s, password_hash = %s, raw_password = %s, 
                          role_id = %s, employee_id = %s, email = %s WHERE id = %s;""",
                (username_cleaned, hashed_password, req.password, req.role_id, req.employee_id, req.email, id)
            )
        else:
            cur.execute(
                "UPDATE copy_app_users SET username = %s, role_id = %s, employee_id = %s, email = %s WHERE id = %s;",
                (username_cleaned, req.role_id, req.employee_id, req.email, id)
            )
            
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/users/{id}")
def delete_app_user(id: int, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    if user["user_id"] == id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT executive_id FROM copy_app_users WHERE id = %s;", (id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        exec_id = row[0]
        
        cur.execute("DELETE FROM copy_app_sessions WHERE user_id = %s;", (id,))
        cur.execute("DELETE FROM copy_app_users WHERE id = %s;", (id,))
        
        try:
            cur.execute("DELETE FROM copy_users WHERE id = %s;", (exec_id,))
        except Exception:
            conn.rollback()
            cur = conn.cursor()
            cur.execute("DELETE FROM copy_app_sessions WHERE user_id = %s;", (id,))
            cur.execute("DELETE FROM copy_app_users WHERE id = %s;", (id,))
            
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)


class VehicleModelData(BaseModel):
    brand: str
    model_name: str
    variant: str
    fuel_type: str
    make_year: int

@app.get("/api/vehicle-models")
def list_vehicle_models(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, brand, model_name, variant, fuel_type, make_year, created_at
            FROM copy_vehicle_models
            ORDER BY brand, model_name, variant, make_year DESC;
        """)
        rows = cur.fetchall()
        result = []
        for r in rows:
            result.append({
                "id": r[0],
                "brand": r[1],
                "model_name": r[2],
                "variant": r[3],
                "fuel_type": r[4],
                "make_year": r[5],
                "created_at": r[6].isoformat() if r[6] else None
            })
        return result
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/vehicle-models")
def create_vehicle_model(req: VehicleModelData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO copy_vehicle_models (brand, model_name, variant, fuel_type, make_year) VALUES (%s, %s, %s, %s, %s) RETURNING id;",
            (req.brand.strip(), req.model_name.strip(), req.variant.strip(), req.fuel_type.strip(), req.make_year)
        )
        model_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": model_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/vehicle-models/{id}")
def delete_vehicle_model(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM copy_vehicle_models WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Vehicle model not found")
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Executives (legacy — used by dropdowns in forms)
# ─────────────────────────────────────────────────────────
@app.get("/api/executives")
def get_all_executives():
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, name, COALESCE(role,'Executive') FROM copy_users ORDER BY id;")
        rows = cur.fetchall()
        return [{"value": r[0], "text": f"{r[1]}  (ID {r[0]})"} for r in rows]
    finally:
        postgreSQL_pool.putconn(conn)


@app.get("/api/executives/{user_id}")
def get_executive(user_id: int):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT name, COALESCE(role,'Executive') FROM copy_users WHERE id=%s;", (user_id,))
        r = cur.fetchone()
        if r:
            return {"id": user_id, "name": r[0], "role": r[1]}
        raise HTTPException(status_code=404, detail="Executive not found")
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Employees (full CRUD)
# ─────────────────────────────────────────────────────────

class EmployeeData(BaseModel):
    name: str
    role: str
    phone: Optional[str] = None
    email: Optional[str] = None
    company_email: Optional[str] = None
    department: Optional[str] = None
    city: Optional[str] = None
    joining_date: Optional[str] = None
    employee_id: Optional[str] = None
    status: Optional[str] = "Active"

@app.get("/api/employees")
def get_employees(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, name, COALESCE(role,'Executive'), phone, email, company_email,
                   department, city, joining_date, employee_id, COALESCE(status,'Active')
            FROM copy_users ORDER BY id;
        """)
        keys = ["id","name","role","phone","email","company_email","department","city","joining_date","employee_id","status"]
        return [dict(zip(keys, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/employees")
def create_employee(req: EmployeeData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO copy_users (name, role, phone, email, company_email, department, city, joining_date, employee_id, status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id;
        """, (req.name.strip(), req.role.strip(), req.phone, req.email, req.company_email, req.department,
              req.city, req.joining_date, req.employee_id, req.status or "Active"))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/employees/{id}")
def update_employee(id: int, req: EmployeeData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE copy_users SET name=%s, role=%s, phone=%s, email=%s, company_email=%s, department=%s,
                city=%s, joining_date=%s, employee_id=%s, status=%s
            WHERE id=%s RETURNING id;
        """, (req.name.strip(), req.role.strip(), req.phone, req.email, req.company_email, req.department,
              req.city, req.joining_date, req.employee_id, req.status or "Active", id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Employee not found")
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/employees/{id}")
def delete_employee(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM copy_app_users WHERE executive_id = %s;", (id,))
        if cur.fetchone():
            cur.execute("UPDATE copy_users SET status = 'Inactive' WHERE id = %s;", (id,))
            conn.commit()
            return {"success": True, "deactivated": True, "message": "Employee deactivated (has a portal login — not permanently deleted)"}
        cur.execute("DELETE FROM copy_users WHERE id = %s RETURNING id;", (id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Employee not found")
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
class CityData(BaseModel):
    name: str
    state: Optional[str] = None
    country: Optional[str] = "India"
    status: Optional[str] = "Active"

@app.get("/api/july/cities")
@app.get("/api/cities")
def get_all_cities():
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, city_name, city_code, state, status FROM july_cities ORDER BY id;")
        rows = cur.fetchall()
        if not rows:
            return [
                {"id": 1, "value": "Bengaluru", "text": "Bengaluru", "name": "Bengaluru", "code": "BLR", "state": "Karnataka", "country": "India", "status": "Active"},
                {"id": 2, "value": "Mumbai", "text": "Mumbai", "name": "Mumbai", "code": "BOM", "state": "Maharashtra", "country": "India", "status": "Active"},
                {"id": 3, "value": "Hyderabad", "text": "Hyderabad", "name": "Hyderabad", "code": "HYD", "state": "Telangana", "country": "India", "status": "Active"}
            ]
        return [{
            "id": r[0],
            "value": r[1],
            "text": r[1],
            "name": r[1],
            "code": r[2] or "",
            "state": r[3] or "",
            "country": "India",
            "status": r[4] or "Active"
        } for r in rows]
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/cities")
def create_city(req: CityData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    name_cleaned = req.name.strip()
    if not name_cleaned:
        raise HTTPException(status_code=400, detail="City name is required")
        
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM dev_city WHERE name = %s;", (name_cleaned,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="City already exists")
            
        cur.execute(
            "INSERT INTO dev_city (name, state, country, status) VALUES (%s, %s, %s, %s) RETURNING id;", 
            (name_cleaned, (req.state or "").strip(), (req.country or "India").strip(), (req.status or "Active").strip())
        )
        city_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": city_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/cities/{id}")
def update_city(id: int, req: CityData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    if id <= 3:
        raise HTTPException(status_code=400, detail="Pre-existing operating copy_cities cannot be edited")
        
    name_cleaned = req.name.strip()
    if not name_cleaned:
        raise HTTPException(status_code=400, detail="City name is required")
        
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM dev_city WHERE name = %s AND id != %s;", (name_cleaned, id))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="City name already exists")
            
        cur.execute(
            """UPDATE dev_city 
               SET name = %s, state = %s, country = %s, status = %s, modified_at = NOW() 
               WHERE id = %s;""",
            (name_cleaned, (req.state or "").strip(), (req.country or "India").strip(), (req.status or "Active").strip(), id)
        )
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/cities/{id}")
def delete_city(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    if id <= 3:
        raise HTTPException(status_code=400, detail="Pre-existing operating copy_cities cannot be deleted")
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM dev_city WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="City not found")
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Stats
# ─────────────────────────────────────────────────────────
# Stats
# ─────────────────────────────────────────────────────────
@app.get("/api/stats")
def get_stats(
    authorization: Optional[str] = Header(None),
    search: Optional[str] = None,
    city: Optional[str] = "all",
    visitor_type: Optional[str] = "all",
    status: Optional[str] = "all",
    time_period: Optional[str] = "all",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    user_city = None
    is_global = True
    if authorization:
        try:
            curr_user = get_current_user(authorization)
            r_code = curr_user.get("role_code", "")
            is_global = r_code in ["SA", "BH", "FL", "FE", "AU"] or curr_user.get("role") in ["Super Admin", "Admin", "Business Head"]
            user_city = curr_user.get("city", "Hyderabad")
        except Exception:
            pass

    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        
        where_clause = "WHERE (w.submission_status IS NULL OR w.submission_status != 'Draft')"
        params = []

        if city and city != "all":
            where_clause += " AND w.city ILIKE %s"
            params.append(f"%{city}%")
        
        if search:
            where_clause += """
                AND (
                    w.person_name ILIKE %s
                    OR w.first_name ILIKE %s
                    OR w.last_name ILIKE %s
                    OR w.person_number ILIKE %s
                    OR w.dl_number ILIKE %s
                    OR w.aadhaar_number ILIKE %s
                    OR w.id::text ILIKE %s
                )
            """
            search_pattern = f"%{search}%"
            params.extend([search_pattern] * 7)
            
        if visitor_type and visitor_type != "all":
            where_clause += " AND w.visitor_type = %s"
            params.append(visitor_type)
            
        if status and status != "all":
            where_clause += " AND w.joined_status = %s"
            params.append(status)
            
        if time_period == "custom" or start_date or end_date or from_date or to_date:
            s_date = start_date or from_date
            e_date = end_date or to_date
            if s_date:
                where_clause += " AND (w.event_date >= %s OR w.created_at >= %s)"
                params.extend([s_date, s_date])
            if e_date:
                where_clause += " AND (w.event_date <= %s OR w.created_at <= %s)"
                params.extend([e_date, e_date + " 23:59:59"])
        elif time_period and time_period != "all":
            from datetime import datetime
            from dateutil.relativedelta import relativedelta
            today = datetime.now()
            if time_period == "beginning_of_month":
                start_dt = today.replace(day=1).strftime("%Y-%m-%d")
                where_clause += " AND w.event_date >= %s"
                params.append(start_dt)
            elif time_period == "last_1_month":
                start_dt = (today - relativedelta(months=1)).strftime("%Y-%m-%d")
                where_clause += " AND w.event_date >= %s"
                params.append(start_dt)
            elif time_period == "this_year":
                start_dt = today.replace(month=1, day=1).strftime("%Y-%m-%d")
                where_clause += " AND w.event_date >= %s"
                params.append(start_dt)
            elif time_period == "last_1_year":
                start_dt = (today - relativedelta(years=1)).strftime("%Y-%m-%d")
                where_clause += " AND w.event_date >= %s"
                params.append(start_dt)

        query = f"""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN w.joined_status IN ('Successfully Onboarded', 'Joined', 'Onboarded', 'Completed') THEN 1 ELSE 0 END) as joined,
                SUM(CASE WHEN w.joined_status IN ('Follow Up Required', 'Onboarding Process Initiated', 'Initiated', 'Pending') THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN w.joined_status IN ('No Follow Up Required / Closed', 'Not Interested') THEN 1 ELSE 0 END) as not_interested,
                SUM(CASE WHEN w.visitor_type ILIKE '%%Driver%%' THEN 1 ELSE 0 END) as individuals,
                SUM(CASE WHEN w.visitor_type ILIKE '%%Operator%%' THEN 1 ELSE 0 END) as operators
            FROM july_walkins w
            {where_clause}
        """
        
        cur.execute(query, params)
        row = cur.fetchone()
        
        total = row[0] or 0
        joined = row[1] or 0
        pending = row[2] or 0
        not_interested = row[3] or 0
        individuals = row[4] or 0
        operators = row[5] or 0
        
        conversion = round(joined / total * 100, 1) if total > 0 else 0.0
        
        return {
            "total": total,
            "joined": joined,
            "pending": pending,
            "not_interested": not_interested,
            "individuals": individuals,
            "operators": operators,
            "conversion_rate": conversion,
        }
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Walk-ins — List (UNION of july_new_walkins, july_existing_walkins & july_walkins archive)
# ─────────────────────────────────────────────────────────
@app.get("/api/walkins")
def get_all_walkins(
    authorization: Optional[str] = Header(None),
    search: Optional[str] = None,
    city: Optional[str] = "all",
    visitor_type: Optional[str] = "all",
    status: Optional[str] = "all",
    record_type: Optional[str] = "all",
    time_period: Optional[str] = "all",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    page: Optional[int] = 1,
    limit: Optional[int] = 10
):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()

        new_query = """
            SELECT
                'N' || n.id::text AS id,
                'new' AS record_type,
                n.interested_position AS visitor_type,
                n.event_date,
                COALESCE(n.enquiry_time, '10:30') AS enquiry_time,
                n.first_name,
                n.last_name,
                n.city AS city_name,
                n.person_name,
                n.person_number,
                n.visiting_reason,
                n.joined_status,
                n.lead_channel,
                n.lead_channel_details,
                n.created_at,
                COALESCE(n.submission_status, 'Submitted') AS submission_status,
                COALESCE(n.updated_at, n.created_at) AS updated_at,
                COALESCE(e.first_name || ' ' || COALESCE(e.last_name, ''), 'Executive') AS executive_name,
                COALESCE(e_up.first_name || ' ' || COALESCE(e_up.last_name, ''), '') AS updated_by_name,
                n.id::integer AS raw_id
            FROM july_new_walkins n
            LEFT JOIN july_portal_users pu ON pu.portal_user_id = COALESCE(n.created_by, n.executive_id)
            LEFT JOIN july_employees e ON e.employee_id = pu.employee_id
            LEFT JOIN july_portal_users pu_up ON pu_up.portal_user_id = n.updated_by
            LEFT JOIN july_employees e_up ON e_up.employee_id = pu_up.employee_id
            WHERE 1=1
        """

        existing_query = """
            SELECT
                'E' || ex.id::text AS id,
                'existing' AS record_type,
                ex.partner_type AS visitor_type,
                ex.event_date,
                COALESCE(ex.enquiry_time, '10:30') AS enquiry_time,
                ex.first_name,
                ex.last_name,
                ex.city AS city_name,
                ex.person_name,
                ex.person_number,
                ex.visiting_reason,
                'Partner Visit' AS joined_status,
                '' AS lead_channel,
                '' AS lead_channel_details,
                ex.created_at,
                COALESCE(ex.submission_status, 'Submitted') AS submission_status,
                COALESCE(ex.updated_at, ex.created_at) AS updated_at,
                COALESCE(e.first_name || ' ' || COALESCE(e.last_name, ''), 'Executive') AS executive_name,
                COALESCE(e_up.first_name || ' ' || COALESCE(e_up.last_name, ''), '') AS updated_by_name,
                ex.id::integer AS raw_id
            FROM july_existing_walkins ex
            LEFT JOIN july_portal_users pu ON pu.portal_user_id = COALESCE(ex.created_by, ex.executive_id)
            LEFT JOIN july_employees e ON e.employee_id = pu.employee_id
            LEFT JOIN july_portal_users pu_up ON pu_up.portal_user_id = ex.updated_by
            LEFT JOIN july_employees e_up ON e_up.employee_id = pu_up.employee_id
            WHERE 1=1
        """

        legacy_query = """
            SELECT
                w.id::text AS id,
                CASE WHEN w.is_existing_partner THEN 'existing' ELSE 'new' END AS record_type,
                COALESCE(w.partner_type, w.visitor_type, 'Driver') AS visitor_type,
                CASE WHEN w.event_date ~ '^\d{4}-\d{2}-\d{2}$' THEN w.event_date::date ELSE w.created_at::date END AS event_date,
                COALESCE(w.enquiry_time, '10:30') AS enquiry_time,
                w.first_name,
                w.last_name,
                w.city AS city_name,
                w.person_name,
                w.person_number,
                w.visiting_reason,
                COALESCE(w.joined_status, 'Onboarding Process Initiated') AS joined_status,
                COALESCE(w.lead_channel, '') AS lead_channel,
                COALESCE(w.lead_channel_details, '') AS lead_channel_details,
                w.created_at,
                COALESCE(w.submission_status, 'Submitted') AS submission_status,
                COALESCE(w.updated_at, w.created_at) AS updated_at,
                COALESCE(e.first_name || ' ' || COALESCE(e.last_name, ''), 'Executive') AS executive_name,
                COALESCE(e_up.first_name || ' ' || COALESCE(e_up.last_name, ''), '') AS updated_by_name,
                w.id::integer AS raw_id
            FROM july_walkins w
            LEFT JOIN july_portal_users pu ON pu.portal_user_id = COALESCE(w.created_by, w.executive_id)
            LEFT JOIN july_employees e ON e.employee_id = pu.employee_id
            LEFT JOIN july_portal_users pu_up ON pu_up.portal_user_id = w.updated_by
            LEFT JOIN july_employees e_up ON e_up.employee_id = pu_up.employee_id
            WHERE 1=1
        """

        new_params = []
        existing_params = []
        legacy_params = []

        if city and city != "all":
            new_query += " AND n.city ILIKE %s"
            new_params.append(f"%{city}%")
            existing_query += " AND ex.city ILIKE %s"
            existing_params.append(f"%{city}%")
            legacy_query += " AND w.city ILIKE %s"
            legacy_params.append(f"%{city}%")

        if search:
            sp = f"%{search}%"
            new_query += " AND (n.person_name ILIKE %s OR n.first_name ILIKE %s OR n.person_number ILIKE %s OR n.id::text ILIKE %s)"
            new_params.extend([sp, sp, sp, sp])
            existing_query += " AND (ex.person_name ILIKE %s OR ex.first_name ILIKE %s OR ex.person_number ILIKE %s OR ex.id::text ILIKE %s)"
            existing_params.extend([sp, sp, sp, sp])
            legacy_query += " AND (w.person_name ILIKE %s OR w.first_name ILIKE %s OR w.person_number ILIKE %s OR w.id::text ILIKE %s)"
            legacy_params.extend([sp, sp, sp, sp])

        if visitor_type and visitor_type != "all":
            new_query += " AND n.interested_position = %s"
            new_params.append(visitor_type)
            existing_query += " AND ex.partner_type = %s"
            existing_params.append(visitor_type)
            legacy_query += " AND (w.partner_type = %s OR w.visitor_type = %s)"
            legacy_params.extend([visitor_type, visitor_type])

        if record_type == "new":
            union_query = f"({new_query})"
            union_params = new_params
        elif record_type == "existing":
            union_query = f"({existing_query}) UNION ALL ({legacy_query} AND w.is_existing_partner = true)"
            union_params = existing_params + legacy_params
        else:
            union_query = f"({new_query}) UNION ALL ({existing_query}) UNION ALL ({legacy_query})"
            union_params = new_params + existing_params + legacy_params

        count_q = f"SELECT COUNT(*) FROM ({union_query}) AS cnt"
        cur.execute(count_q, union_params)
        total_count = cur.fetchone()[0]

        final_query = f"SELECT * FROM ({union_query}) AS combined ORDER BY created_at DESC LIMIT %s OFFSET %s"
        offset = (page - 1) * limit
        cur.execute(final_query, union_params + [limit, offset])
        rows = cur.fetchall()

        items = []
        for r in rows:
            items.append({
                "id": r[0],
                "record_type": r[1],
                "visitor_type": r[2],
                "event_date": r[3].isoformat() if r[3] else None,
                "enquiry_time": r[4],
                "first_name": r[5],
                "last_name": r[6],
                "city": r[7],
                "city_name": r[7],
                "person_name": r[8],
                "person_number": r[9],
                "visiting_reason": r[10],
                "joined_status": r[11],
                "lead_channel": r[12],
                "lead_channel_details": r[13],
                "created_at": r[14].isoformat() if r[14] else None,
                "submission_status": r[15],
                "updated_at": r[16].isoformat() if r[16] else None,
                "executive_name": r[17],
                "updated_by_name": r[18],
                "raw_id": r[19],
            })

        return {"items": items, "total": total_count, "page": page, "limit": limit}
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Walk-ins — Search across tables
# ─────────────────────────────────────────────────────────
@app.get("/api/walkins/search")
def search_walkins(q: str):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        sp = f"%{q}%"
        cur.execute("""
            SELECT 'N' || id::text AS id, 'new' AS record_type, first_name, last_name, person_name, person_number, city, interested_position AS visitor_type, visiting_reason, event_date::text, false AS is_existing_partner
            FROM july_new_walkins
            WHERE person_number ILIKE %s OR person_name ILIKE %s OR first_name ILIKE %s
            UNION ALL
            SELECT 'E' || id::text AS id, 'existing' AS record_type, first_name, last_name, person_name, person_number, city, partner_type AS visitor_type, visiting_reason, event_date::text, true AS is_existing_partner
            FROM july_existing_walkins
            WHERE person_number ILIKE %s OR person_name ILIKE %s OR first_name ILIKE %s
            UNION ALL
            SELECT 'O' || id::text AS id, 'existing' AS record_type, '' AS first_name, '' AS last_name, driver_name AS person_name, phone_number AS person_number, city, COALESCE(candidate_role, 'Driver') AS visitor_type, 'Partner Visit' AS visiting_reason, created_at::text AS event_date, true AS is_existing_partner
            FROM july_form_onboarding
            WHERE (phone_number ILIKE %s OR driver_name ILIKE %s)
              AND approval_status ILIKE 'Approved%%'
            LIMIT 10;
        """, (sp, sp, sp, sp, sp, sp, sp, sp))
        
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)


@app.get("/api/walkins/tags")
def get_preset_visit_tags():
    return {
        "Driver": [
            "Payment / Payout Dispute",
            "Plan Inquiry (Drive to Rent/Own)",
            "Vehicle Swap / Issue",
            "App / Login Technical Issue",
            "Fastag / Toll Balance Query",
            "Penalty / Fine Waiver Request",
            "Shift Timing Change",
            "Document Resubmission"
        ],
        "Operator": [
            "Multi-Vehicle Remittance",
            "Fleet Expansion / Adding Cars",
            "Sub-Driver Assignment / Swap",
            "Operator Commission Payout",
            "Hisaab Settlement",
            "Fleet Security / GPS Issue"
        ],
        "Vendor": [
            "Garage Repair Invoice Settlement",
            "CNG Fuel Vendor Payout",
            "Spare Parts Supply",
            "Fastag Tag Installation",
            "Insurance Claim Processing"
        ]
    }


# ─────────────────────────────────────────────────────────
# Walk-ins — Get Single Record
# ─────────────────────────────────────────────────────────
@app.get("/api/walkins/{walkin_id}")
def get_walkin(walkin_id: str):
    import re
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        clean_id_str = str(walkin_id).upper()
        digits = re.sub(r'\D', '', clean_id_str)
        raw_id = int(digits) if digits else 0

        if clean_id_str.startswith("E"):
            cur.execute("""
                SELECT id, first_name, last_name, person_name, person_number,
                       city, partner_type, visiting_reason, event_date, enquiry_time,
                       visit_notes, submission_status, created_at
                FROM july_existing_walkins WHERE id = %s;
            """, (raw_id,))
            r = cur.fetchone()
            if r:
                return {
                    "record_type": "existing",
                    "id": f"E{r[0]}",
                    "raw_id": r[0],
                    "first_name": r[1], "last_name": r[2], "person_name": r[3],
                    "person_number": r[4], "city": r[5],
                    "partner_type": r[6], "is_existing_partner": True,
                    "visiting_reason": r[7],
                    "event_date": r[8].isoformat() if r[8] else None,
                    "enquiry_time": r[9],
                    "visit_notes": r[10],
                    "submission_status": r[11],
                    "created_at": r[12].isoformat() if r[12] else None,
                }
            raise HTTPException(status_code=404, detail="Existing walkin not found")

        elif clean_id_str.startswith("N"):
            cur.execute("""
                SELECT id, first_name, last_name, person_name, person_number,
                       city, operating_place, interested_position, visiting_reason,
                       event_date, enquiry_time, dl_number, aadhaar_number,
                       aadhaar_image, dl_image, lead_channel, lead_channel_details,
                       referred_by_name, referred_by_phone, joined_status, remarks, created_at
                FROM july_new_walkins WHERE id = %s;
            """, (raw_id,))
            r = cur.fetchone()
            if r:
                return {
                    "record_type": "new",
                    "id": f"N{r[0]}",
                    "raw_id": r[0],
                    "first_name": r[1], "last_name": r[2], "person_name": r[3],
                    "person_number": r[4], "city": r[5], "operating_place": r[6],
                    "interested_position": r[7], "visitor_type": r[7],
                    "is_existing_partner": False,
                    "visiting_reason": r[8],
                    "event_date": r[9].isoformat() if r[9] else None,
                    "enquiry_time": r[10],
                    "dl_number": r[11], "aadhaar_number": r[12],
                    "aadhaar_image": r[13], "dl_image": r[14],
                    "lead_channel": r[15], "lead_channel_details": r[16],
                    "referred_by_name": r[17], "referred_by_phone": r[18],
                    "joined_status": r[19], "remarks": r[20],
                    "created_at": r[21].isoformat() if r[21] else None,
                }
            raise HTTPException(status_code=404, detail="New walkin not found")

        else:
            cur.execute("""
                SELECT w.visitor_type, w.event_date, w.city, w.operating_place, w.executive_id,
                       w.person_name, w.person_number, w.aadhaar_number, w.dl_number,
                       w.visiting_reason, w.joined_status, w.remarks,
                       COALESCE(u.name, '') AS executive_name,
                       w.first_name, w.last_name, w.enquiry_time, w.mode_of_enquiry,
                       w.referred_by_name, w.referred_by_phone,
                       w.aadhaar_image, w.dl_image,
                       w.lead_channel, w.lead_channel_details,
                       w.is_existing_partner, w.partner_type, w.visit_notes
                FROM july_walkins w
                LEFT JOIN copy_users u ON u.id = w.executive_id
                WHERE w.id = %s;
            """, (raw_id,))
            r = cur.fetchone()
            if r:
                is_ex = bool(r[23])
                return {
                    "record_type": "existing" if is_ex else "new",
                    "visitor_type": r[0], "event_date": r[1], "city": r[2], "operating_place": r[3],
                    "executive_id": r[4], "person_name": r[5], "person_number": r[6],
                    "aadhaar_number": r[7], "dl_number": r[8],
                    "visiting_reason": r[9], "joined_status": r[10], "remarks": r[11],
                    "executive_name": r[12],
                    "first_name": r[13], "last_name": r[14], "enquiry_time": r[15],
                    "mode_of_enquiry": r[16], "referred_by_name": r[17], "referred_by_phone": r[18],
                    "aadhaar_image": r[19], "dl_image": r[20],
                    "lead_channel": r[21], "lead_channel_details": r[22],
                    "is_existing_partner": is_ex,
                    "partner_type": r[24], "visit_notes": r[25],
                }
            raise HTTPException(status_code=404, detail="Walkin not found")
    finally:
        postgreSQL_pool.putconn(conn)


class WalkinData(BaseModel):
    record_type: Optional[str] = 'new'
    visitor_type: Optional[str] = 'Driver'
    event_date: Optional[str] = None
    enquiry_time: Optional[str] = None
    city: Optional[str] = 'Hyderabad'
    operating_place: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    person_name: Optional[str] = None
    person_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    dl_number: Optional[str] = None
    visiting_reason: Optional[str] = None
    mode_of_enquiry: Optional[str] = None
    lead_channel: Optional[str] = None
    lead_channel_details: Optional[str] = None
    referred_by_name: Optional[str] = None
    referred_by_phone: Optional[str] = None
    joined_status: Optional[str] = None
    submission_status: Optional[str] = None
    remarks: Optional[str] = None
    aadhaar_image: Optional[str] = None
    dl_image: Optional[str] = None
    is_existing_partner: Optional[bool] = False
    partner_type: Optional[str] = 'Driver'
    partner_code: Optional[str] = None
    visit_tags: Optional[Any] = None
    visit_notes: Optional[str] = None

# ─────────────────────────────────────────────────────────
# Walk-ins — Create
# ─────────────────────────────────────────────────────────
@app.post("/api/walkins")
def create_walkin(data: WalkinData, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    user_p_id = user.get("portal_user_id")

    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()

        if not user_p_id:
            username = user.get("username") or ""
            cur.execute("SELECT portal_user_id FROM july_portal_users WHERE username = %s LIMIT 1;", (username,))
            row = cur.fetchone()
            if row:
                user_p_id = row[0]

        if user_p_id:
            cur.execute("SELECT 1 FROM july_portal_users WHERE portal_user_id = %s;", (user_p_id,))
            if not cur.fetchone():
                user_p_id = None

        f_name = (data.first_name or "").strip()
        l_name = (data.last_name or "").strip()
        full_n = (data.person_name or f"{f_name} {l_name}").strip()
        is_existing = data.is_existing_partner or data.record_type == 'existing'

        if is_existing:
            cur.execute("""
                INSERT INTO july_existing_walkins
                  (first_name, last_name, person_name, person_number, city,
                   partner_type, visiting_reason, event_date, enquiry_time,
                   visit_notes, submission_status, executive_id, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                f_name, l_name, full_n,
                str(data.person_number) if data.person_number else '',
                str(data.city) if data.city else 'Hyderabad',
                data.partner_type or data.visitor_type or 'Driver',
                data.visiting_reason or 'Visit',
                data.event_date or datetime.now().strftime("%Y-%m-%d"),
                data.enquiry_time or '10:30',
                data.visit_notes or data.remarks or '',
                'Submitted',
                user_p_id, user_p_id
            ))
            new_id = cur.fetchone()[0]
            conn.commit()
            return {"success": True, "walkin_id": f"E{new_id}", "record_type": "existing"}

        else:
            # For non-partner candidates: enforce single entry rule per phone number
            if data.person_number:
                cur.execute("SELECT id FROM july_new_walkins WHERE person_number = %s LIMIT 1;", (str(data.person_number),))
                existing_row = cur.fetchone()
                if existing_row:
                    existing_id = existing_row[0]
                    cur.execute("""
                        UPDATE july_new_walkins SET
                            first_name=%s, last_name=%s, person_name=%s, city=%s, operating_place=%s,
                            interested_position=%s, visiting_reason=%s, event_date=%s, enquiry_time=%s,
                            dl_number=%s, aadhaar_number=%s, lead_channel=%s, lead_channel_details=%s,
                            joined_status=%s, remarks=%s, updated_at=NOW(), updated_by=%s
                        WHERE id=%s;
                    """, (
                        f_name, l_name, full_n, str(data.city) if data.city else 'Hyderabad',
                        data.operating_place or '', data.visitor_type or data.partner_type or 'Driver',
                        data.visiting_reason or 'Onboarding Inquiry',
                        data.event_date or datetime.now().strftime("%Y-%m-%d"),
                        data.enquiry_time or '10:30', data.dl_number or '', data.aadhaar_number or '',
                        data.lead_channel or 'Direct Walk-in', data.lead_channel_details or '',
                        data.joined_status or 'Onboarding Process Initiated', data.remarks or '',
                        user_p_id, existing_id
                    ))
                    conn.commit()
                    return {"success": True, "walkin_id": f"N{existing_id}", "record_type": "new", "updated_existing": True}

            cur.execute("""
                INSERT INTO july_new_walkins
                  (first_name, last_name, person_name, person_number, city, operating_place,
                   interested_position, visiting_reason, event_date, enquiry_time,
                   dl_number, aadhaar_number, aadhaar_image, dl_image,
                   lead_channel, lead_channel_details, referred_by_name, referred_by_phone,
                   joined_status, remarks, submission_status, executive_id, created_by)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING id;
            """, (
                f_name, l_name, full_n,
                str(data.person_number) if data.person_number else '',
                str(data.city) if data.city else 'Hyderabad',
                data.operating_place or '',
                data.visitor_type or data.partner_type or 'Driver',
                data.visiting_reason or 'Onboarding Inquiry',
                data.event_date or datetime.now().strftime("%Y-%m-%d"),
                data.enquiry_time or '10:30',
                data.dl_number or '',
                data.aadhaar_number or '',
                data.aadhaar_image or None,
                data.dl_image or None,
                data.lead_channel or 'Direct Walk-in',
                data.lead_channel_details or '',
                data.referred_by_name or '',
                data.referred_by_phone or '',
                data.joined_status or 'Onboarding Process Initiated',
                data.remarks or '',
                'Submitted',
                user_p_id, user_p_id
            ))
            new_id = cur.fetchone()[0]
            conn.commit()
            return {"success": True, "walkin_id": f"N{new_id}", "record_type": "new"}

    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Walk-ins — Update
# ─────────────────────────────────────────────────────────
@app.put("/api/walkins/{walkin_id}")
def update_walkin(walkin_id: str, data: WalkinData, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    user_p_id = user.get("portal_user_id")
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        clean_id_str = str(walkin_id).upper()
        digits = re.sub(r'\D', '', clean_id_str)
        raw_id = int(digits) if digits else 0

        f_name = (data.first_name or "").strip()
        l_name = (data.last_name or "").strip()
        full_n = (data.person_name or f"{f_name} {l_name}").strip()

        if clean_id_str.startswith("E"):
            cur.execute("""
                UPDATE july_existing_walkins SET
                    first_name=%s, last_name=%s, person_name=%s, person_number=%s,
                    city=%s, partner_type=%s, visiting_reason=%s, event_date=%s,
                    enquiry_time=%s, visit_notes=%s, updated_at=NOW(), updated_by=%s
                WHERE id=%s;
            """, (f_name, l_name, full_n, data.person_number, data.city, data.partner_type, data.visiting_reason, data.event_date, data.enquiry_time, data.visit_notes, user_p_id, raw_id))

        elif clean_id_str.startswith("N"):
            cur.execute("""
                UPDATE july_new_walkins SET
                    first_name=%s, last_name=%s, person_name=%s, person_number=%s,
                    city=%s, operating_place=%s, interested_position=%s, visiting_reason=%s,
                    event_date=%s, enquiry_time=%s, dl_number=%s, aadhaar_number=%s,
                    lead_channel=%s, lead_channel_details=%s, joined_status=%s, remarks=%s,
                    updated_at=NOW(), updated_by=%s
                WHERE id=%s;
            """, (f_name, l_name, full_n, data.person_number, data.city, data.operating_place, data.visitor_type, data.visiting_reason, data.event_date, data.enquiry_time, data.dl_number, data.aadhaar_number, data.lead_channel, data.lead_channel_details, data.joined_status, data.remarks, user_p_id, raw_id))

        else:
            cur.execute("""
                UPDATE july_walkins SET
                    first_name=%s, last_name=%s, person_name=%s, person_number=%s,
                    city=%s, visiting_reason=%s, updated_at=NOW()
                WHERE id=%s;
            """, (f_name, l_name, full_n, data.person_number, data.city, data.visiting_reason, raw_id))

        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Walk-ins — Delete
# ─────────────────────────────────────────────────────────
@app.delete("/api/walkins/{walkin_id}")
def delete_walkin(walkin_id: str, authorization: Optional[str] = Header(None)):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        clean_id_str = str(walkin_id).upper()
        digits = re.sub(r'\D', '', clean_id_str)
        raw_id = int(digits) if digits else 0

        if clean_id_str.startswith("E"):
            cur.execute("DELETE FROM july_existing_walkins WHERE id = %s;", (raw_id,))
        elif clean_id_str.startswith("N"):
            cur.execute("DELETE FROM july_new_walkins WHERE id = %s;", (raw_id,))
        else:
            cur.execute("DELETE FROM july_walkins WHERE id = %s;", (raw_id,))
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Onboarding API
# ─────────────────────────────────────────────────────────
@app.get("/api/onboarding")
def get_all_onboarding(search: Optional[str] = None, city: Optional[str] = None, status: Optional[str] = None, limit: Optional[int] = 100):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SET TIME ZONE 'Asia/Kolkata';")
        
        base_query = """
            SELECT 
                f.id AS id,
                f.id AS onboarding_id,
                COALESCE(f.driver_id, f.vendor_id, 'DRV-' || f.id) AS driver_id,
                COALESCE(f.driver_name, f.vendor_name, 'Partner') AS driver_name,
                f.phone_number,
                f.city,
                f.rental_model AS driver_plan,
                f.father_name,
                f.present_address,
                f.emergency_name,
                f.emergency_phone,
                f.dl_number AS driving_license,
                f.pan_number,
                f.aadhaar_number,
                COALESCE(f.approval_status, 'Draft') AS approval_status,
                f.created_by,
                f.updated_by,
                f.current_approver_id,
                f.approved_by,
                f.approval_remarks,
                f.created_at,
                f.updated_at,
                f.security_deposit,
                f.custom_rent_amount AS daily_rent,
                COALESCE(f.vendor_type, f.candidate_role, 'Driver') AS vendor_type,
                COALESCE(f.candidate_role, f.vendor_type, 'Driver') AS candidate_role,
                COALESCE(NULLIF(TRIM(CONCAT(e1.first_name, ' ', e1.last_name)), ''), u1.username, 'Admin') AS executive_name,
                COALESCE(NULLIF(TRIM(CONCAT(e2.first_name, ' ', e2.last_name)), ''), u2.username, NULLIF(TRIM(CONCAT(e1.first_name, ' ', e1.last_name)), ''), u1.username, '—') AS updated_by_name
            FROM july_form_onboarding f
            LEFT JOIN july_portal_users u1 ON u1.portal_user_id = f.created_by
            LEFT JOIN july_employees e1 ON e1.employee_id = u1.employee_id
            LEFT JOIN july_portal_users u2 ON u2.portal_user_id = f.updated_by
            LEFT JOIN july_employees e2 ON e2.employee_id = u2.employee_id
            WHERE 1=1
        """
        params = []
        
        if status == "Draft":
            base_query += " AND f.approval_status = 'Draft'"
        elif status and status != "all":
            base_query += " AND f.approval_status = %s"
            params.append(status)
        elif not status:
            base_query += " AND (f.approval_status IS NULL OR f.approval_status != 'Draft')"

        if search:
            base_query += """
                AND (
                    f.driver_name ILIKE %s OR f.phone_number ILIKE %s 
                    OR f.dl_number ILIKE %s OR f.aadhaar_number ILIKE %s
                    OR CAST(f.id AS TEXT) ILIKE %s
                )
            """
            search_pattern = f"%{search}%"
            params.extend([search_pattern] * 5)
            
        if city and city != "all":
            base_query += " AND f.city = %s"
            params.append(city)
            
        base_query += " ORDER BY COALESCE(f.updated_at, f.created_at) DESC, f.id DESC LIMIT %s;"
        params.append(limit)
        
        cur.execute(base_query, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/onboarding")
def create_onboarding(data: OnboardingData, authorization: Optional[str] = Header(None)):
    # Resolve creator
    creator_id = None
    creator_name = "Unknown"
    if authorization:
        try:
            _u = get_current_user(authorization)
            creator_id = _u.get("portal_user_id") or _u.get("user_id")
            creator_name = _u.get("name") or _u.get("username") or "Unknown"
        except Exception:
            pass
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        import json

        # ── DUPLICATE CHECK ─────────────────────────────────────────────────────
        # Check phone number first (always present)
        cur.execute(
            "SELECT id, driver_name FROM july_form_onboarding WHERE phone_number = %s LIMIT 1;",
            (data.phone_number,)
        )
        dup = cur.fetchone()
        if not dup and data.aadhaar_number:
            clean_aadhaar = data.aadhaar_number.replace(" ", "")
            cur.execute(
                "SELECT id, driver_name FROM july_form_onboarding WHERE REPLACE(aadhaar_number, ' ', '') = %s LIMIT 1;",
                (clean_aadhaar,)
            )
            dup = cur.fetchone()
        if not dup and data.pan_number:
            cur.execute(
                "SELECT id, driver_name FROM july_form_onboarding WHERE UPPER(pan_number) = UPPER(%s) LIMIT 1;",
                (data.pan_number,)
            )
            dup = cur.fetchone()
        if dup:
            raise HTTPException(
                status_code=400,
                detail=f"Already filled. A record for '{dup[1]}' (ID: {dup[0]}) already exists with the same phone, Aadhaar, or PAN."
            )
        # ────────────────────────────────────────────────────────────────────────

        # Ensure cheque columns exist (migration guard)
        for col in ["cheque2_photo", "cheque3_photo"]:
            cur.execute(f"""
                ALTER TABLE july_form_onboarding
                ADD COLUMN IF NOT EXISTS {col} TEXT;
            """)

        cur.execute("""
            INSERT INTO july_form_onboarding (
                driver_name, phone_number, whatsapp_number, dob, city, operating_place,
                present_address, permanent_address, emergency_name, emergency_phone, 
                dl_number, dl_expiry_date, lead_source, 
                pan_number, aadhaar_number, pan_aadhaar_linked, 
                selfie_photo, dl_front, dl_back, pan_card_photo,
                vendor_name, vendor_id, aadhaar_card_photo,
                father_name, bank_name, other_bank_name,
                account_number, ifsc_code, upi_id,
                vendor_type, driver_id, custom_rent_amount,
                walkin_id, emergency_relationship, platform_details, documents_verified, 
                custom_rental_plan, cancelled_cheque_photo, cheque2_photo, cheque3_photo, signature_photo,
                account_name, account_type,
                candidate_role, rental_model, security_deposit, letzown_cheques, is_spring_verified,
                aadhaar_card_front, aadhaar_card_back, driver_email, local_address_proof,
                ref1_name, ref1_phone, ref1_address,
                ref2_name, ref2_phone, ref2_address,
                ref3_name, ref3_phone, ref3_address,
                created_by, approval_status
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id;
        """, (
            data.driver_name, data.phone_number, data.whatsapp_number, data.dob, data.city, data.operating_place,
            data.present_address, data.permanent_address, data.emergency_name, data.emergency_phone,
            data.dl_number, data.dl_expiry_date, data.lead_source,
            data.pan_number, data.aadhaar_number, data.pan_aadhaar_linked,
            extract_image(data.selfie_photo), extract_image(data.dl_front), 
            extract_image(data.dl_back), extract_image(data.pan_card_photo),
            data.vendor_name, data.vendor_id, extract_image(data.aadhaar_card_photo),
            data.father_name, data.bank_name, data.other_bank_name,
            data.account_number, data.ifsc_code, data.upi_id,
            data.vendor_type, data.driver_id, data.custom_rent_amount,
            data.walkin_id, data.emergency_relationship, json.dumps(data.platform_details) if data.platform_details else None, data.documents_verified,
            data.custom_rental_plan, extract_image(data.cancelled_cheque_photo),
            extract_image(data.cheque2_photo), extract_image(data.cheque3_photo),
            extract_image(data.signature_photo),
            data.account_name, data.account_type,
            data.candidate_role, data.rental_model, data.security_deposit, data.letzown_cheques, data.is_spring_verified,
            extract_image(data.aadhaar_card_front), extract_image(data.aadhaar_card_back), data.driver_email, extract_image(data.local_address_proof),
            data.ref1_name, data.ref1_phone, data.ref1_address,
            data.ref2_name, data.ref2_phone, data.ref2_address,
            data.ref3_name, data.ref3_phone, data.ref3_address,
            creator_id, 'Draft'
        ))
        new_id = cur.fetchone()[0]
        
        walkin_id = data.walkin_id
        if not walkin_id:
            cur.execute("SELECT id FROM july_walkins WHERE REPLACE(person_number, ' ', '') = %s LIMIT 1;", (data.phone_number.replace(" ", ""),))
            row = cur.fetchone()
            if row:
                walkin_id = row[0]
            else:
                cur.execute("""
                    INSERT INTO july_walkins (
                        visitor_type, event_date, city, operating_place, 
                        person_name, person_number, aadhaar_number, dl_number,
                        visiting_reason, joined_status, remarks,
                        first_name, last_name, lead_source
                    ) VALUES (%s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id;
                """, (
                    "Individual",
                    data.city,
                    data.operating_place or data.city,
                    data.driver_name,
                    data.phone_number,
                    data.aadhaar_number,
                    data.dl_number or "",
                    "Onboarding",
                    "Successfully Onboarded",
                    "Auto-created from Onboarding Form",
                    data.driver_name.split()[0] if data.driver_name else "",
                    " ".join(data.driver_name.split()[1:]) if data.driver_name and len(data.driver_name.split()) > 1 else "",
                    data.lead_source or "Direct"
                ))
                walkin_id = cur.fetchone()[0]

        cur.execute("""
            INSERT INTO july_walkin_form_links (walkin_id, onboarding_id)
            VALUES (%s, %s);
        """, (walkin_id, new_id))
        
        cur.execute("""
            UPDATE july_walkins SET joined_status = 'Successfully Onboarded' WHERE id = %s;
        """, (walkin_id,))

        if data.vendor_type == "Operator" and data.operator_drivers:
            for drv in data.operator_drivers:
                cur.execute("""
                    INSERT INTO july_form_onboarding (
                        driver_name, phone_number, dl_number, custom_rent_amount, driver_id,
                        vendor_name, vendor_id, vendor_type,
                        whatsapp_number, dob, city, present_address, permanent_address, 
                        emergency_name, emergency_phone, pan_number, aadhaar_number, father_name,
                        candidate_role
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (
                    drv.get('driver_name', ''), drv.get('phone_number', ''), drv.get('dl_number', ''), 
                    drv.get('custom_rent_amount', ''), drv.get('driver_id', ''),
                    data.vendor_name, data.vendor_id, "Operator",
                    data.whatsapp_number, data.dob, data.city, data.present_address, data.permanent_address,
                    data.emergency_name, data.emergency_phone, data.pan_number, data.aadhaar_number, data.father_name,
                    "Driver"
                ))

        # ── Audit log ────────────────────────────────────────────────────────
        cur.execute("""
            INSERT INTO july_onboarding_logs
              (onboarding_id, action, old_status, new_status, changed_fields,
               performed_by, performed_by_name)
            VALUES (%s, 'CREATE', NULL, 'Draft', %s, %s, %s);
        """, (new_id,
              f'{{"driver_name":"{data.driver_name}","phone":"{data.phone_number}"}}',
              creator_id, creator_name))

        conn.commit()
        return {"success": True, "id": new_id}
    finally:
        postgreSQL_pool.putconn(conn)


class SendForApprovalRequest(BaseModel):
    approver_id: Optional[int] = None   # Executive can override; defaults to city CM


@app.post("/api/onboarding/send-for-approval/{id}")
def send_onboarding_for_approval(
    id: int,
    body: Optional[SendForApprovalRequest] = None,
    authorization: Optional[str] = Header(None)
):
    """Send a Draft or Changes Requested onboarding record for City Manager approval.
    The approver defaults to the City Manager of the record's city, but the executive
    may pass a different approver_id in the request body.
    """
    user = get_current_user(authorization)
    submitter_id = user.get("portal_user_id") or user.get("user_id") or 1
    submitter_name = user.get("name") or user.get("username") or "Unknown"
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()

        # ── Fetch record
        cur.execute("""
            SELECT driver_name, candidate_role, vendor_type, city,
                   phone_number, father_name, present_address,
                   emergency_name, emergency_phone,
                   dl_number, pan_number, aadhaar_number, approval_status
            FROM july_form_onboarding
            WHERE id = %s;
        """, (id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Onboarding record not found")
        (driver_name, candidate_role, vendor_type, city,
         phone_number, father_name, present_address,
         emergency_name, emergency_phone,
         dl_number, pan_number, aadhaar_number, old_status) = row
        role_label = vendor_type or candidate_role or "Driver"

        if old_status not in (None, 'Draft', 'Changes Requested', 'Rejected'):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot submit: record is already in '{old_status}' state"
            )

        # ── Resolve approver: explicit override > city's default CM (excluding submitter)
        approver_id = (body.approver_id if body and body.approver_id else None)
        if not approver_id or approver_id == submitter_id:
            cur.execute("""
                SELECT id FROM copy_users
                WHERE city = %s AND role ILIKE '%%city manager%%' AND id != %s
                ORDER BY id LIMIT 1;
            """, (city, submitter_id))
            cm_row = cur.fetchone()
            if cm_row:
                approver_id = cm_row[0]
            else:
                # Fallback to General Manager / Admin (id 3) if no other CM available
                approver_id = 3 if submitter_id != 3 else 20

        if approver_id == submitter_id:
            raise HTTPException(
                status_code=400,
                detail="Invalid approver: you cannot send an approval request to yourself."
            )

        # ── Update july_form_onboarding
        cur.execute("""
            UPDATE july_form_onboarding
            SET approval_status    = 'Pending Approval',
                approval_requested_to = %s,
                current_approver_id   = %s,
                approval_note      = 'Submitted by Executive for City Manager Review',
                approval_submitted_at = NOW(),
                updated_by         = %s,
                updated_at         = NOW()
            WHERE id = %s;
        """, (approver_id, approver_id, submitter_id, id))

        # ── Upsert into july_onboarding (approval workflow engine table)
        cur.execute("SELECT onboarding_id FROM july_onboarding WHERE onboarding_id = %s;", (id,))
        if cur.fetchone():
            cur.execute("""
                UPDATE july_onboarding
                SET approval_status    = 'Pending Approval',
                    current_approver_id = %s
                WHERE onboarding_id = %s;
            """, (approver_id, id))
        else:
            cur.execute("""
                INSERT INTO july_onboarding (
                    onboarding_id, driver_id, driver_name, phone_number, city, driver_plan,
                    father_name, present_address, emergency_name, emergency_phone,
                    driving_license, pan_number, aadhaar_number,
                    approval_status, created_by, current_approver_id, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                          'Pending Approval', %s, %s, NOW());
            """, (id, f"DRV-{id}", driver_name, phone_number, city, role_label,
                  father_name, present_address, emergency_name, emergency_phone,
                  dl_number, pan_number, aadhaar_number, submitter_id, approver_id))

        # ── Audit log
        cur.execute("""
            INSERT INTO july_onboarding_logs
              (onboarding_id, action, old_status, new_status,
               changed_fields, performed_by, performed_by_name)
            VALUES (%s, 'SEND_FOR_APPROVAL', %s, 'Pending Approval',
                    %s, %s, %s);
        """, (id, old_status,
              f'{{"approver_id":{approver_id}}}',
              submitter_id, submitter_name))

        # ── july_approval_chain_logs
        cur.execute("""
            INSERT INTO july_approval_chain_logs
              (module_name, record_id, action, from_user_id, to_user_id, remarks)
            VALUES ('individual_onboarding', %s, 'SUBMITTED', %s, %s,
                    'Submitted for City Manager approval');
        """, (id, submitter_id, approver_id))

        conn.commit()
        return {
            "success": True,
            "approver_id": approver_id,
            "message": f"Onboarding application sent to approver #{approver_id} for review."
        }
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# City Managers list (for approver dropdown)
# ─────────────────────────────────────────────────────────
@app.get("/api/city-managers")
def get_city_managers(city: Optional[str] = None, authorization: Optional[str] = Header(None)):
    """Return users with City Manager role, optionally filtered by city.
    Used by the frontend to populate the approver dropdown with the default CM pre-selected.
    """
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        if city:
            cur.execute("""
                SELECT id, name, role, city
                FROM copy_users
                WHERE role ILIKE '%%city manager%%' AND city = %s
                ORDER BY name;
            """, (city,))
        else:
            cur.execute("""
                SELECT id, name, role, city
                FROM copy_users
                WHERE role ILIKE '%%city manager%%'
                ORDER BY city, name;
            """)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Draft Save — save onboarding progress without submitting
# ─────────────────────────────────────────────────────────
@app.post("/api/onboarding/save-draft/{id}")
def save_onboarding_draft(id: int, data: OnboardingData, authorization: Optional[str] = Header(None)):
    """Persist partial onboarding data without changing approval_status.
    If id == 0 (new record), a new row is created with status='Draft'.
    """
    user = get_current_user(authorization)
    user_p_id = user.get("portal_user_id") or user.get("user_id") or 1
    user_name = user.get("name") or user.get("username") or "Unknown"
    import json
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        if id == 0:
            # New draft — minimal insert
            cur.execute("""
                INSERT INTO july_form_onboarding
                  (driver_name, phone_number, city, vendor_type, candidate_role,
                   approval_status, created_by)
                VALUES (%s, %s, %s, %s, %s, 'Draft', %s)
                RETURNING id;
            """, (
                data.driver_name, data.phone_number,
                data.city, data.vendor_type or 'Individual',
                data.candidate_role or 'Driver', user_p_id
            ))
            new_id = cur.fetchone()[0]
            cur.execute("""
                INSERT INTO july_onboarding_logs
                  (onboarding_id, action, old_status, new_status,
                   changed_fields, performed_by, performed_by_name)
                VALUES (%s, 'CREATE_DRAFT', NULL, 'Draft', %s, %s, %s);
            """, (new_id,
                  f'{{"driver_name":"{data.driver_name}"}}',
                  user_p_id, user_name))
            conn.commit()
            return {"success": True, "id": new_id, "approval_status": "Draft"}
        else:
            # Existing record — update fields but preserve approval_status
            cur.execute("SELECT approval_status FROM july_form_onboarding WHERE id = %s;", (id,))
            rec = cur.fetchone()
            if not rec:
                raise HTTPException(status_code=404, detail="Onboarding record not found")
            current_status = rec[0]
            cur.execute("""
                UPDATE july_form_onboarding SET
                    driver_name=%s, phone_number=%s, whatsapp_number=%s,
                    dob=%s, city=%s, operating_place=%s,
                    present_address=%s, permanent_address=%s,
                    emergency_name=%s, emergency_phone=%s, emergency_relationship=%s,
                    dl_number=%s, dl_expiry_date=%s,
                    pan_number=%s, aadhaar_number=%s, pan_aadhaar_linked=%s,
                    vendor_name=%s, vendor_id=%s, vendor_type=%s,
                    father_name=%s, bank_name=%s, other_bank_name=%s,
                    account_number=%s, ifsc_code=%s, upi_id=%s,
                    account_name=%s, account_type=%s,
                    candidate_role=%s, rental_model=%s, security_deposit=%s,
                    letzown_cheques=%s, is_spring_verified=%s,
                    driver_email=%s, lead_source=%s, platform_details=%s,
                    documents_verified=%s, custom_rental_plan=%s,
                    ref1_name=%s, ref1_phone=%s, ref1_address=%s,
                    ref2_name=%s, ref2_phone=%s, ref2_address=%s,
                    ref3_name=%s, ref3_phone=%s, ref3_address=%s,
                    updated_by=%s, updated_at=NOW()
                WHERE id=%s;
            """, (
                data.driver_name, data.phone_number, data.whatsapp_number,
                data.dob, data.city, data.operating_place,
                data.present_address, data.permanent_address,
                data.emergency_name, data.emergency_phone, data.emergency_relationship,
                data.dl_number, data.dl_expiry_date,
                data.pan_number, data.aadhaar_number, data.pan_aadhaar_linked,
                data.vendor_name, data.vendor_id, data.vendor_type,
                data.father_name, data.bank_name, data.other_bank_name,
                data.account_number, data.ifsc_code, data.upi_id,
                data.account_name, data.account_type,
                data.candidate_role, data.rental_model, data.security_deposit,
                data.letzown_cheques, data.is_spring_verified,
                data.driver_email, data.lead_source,
                json.dumps(data.platform_details) if data.platform_details else None,
                data.documents_verified, data.custom_rental_plan,
                data.ref1_name, data.ref1_phone, data.ref1_address,
                data.ref2_name, data.ref2_phone, data.ref2_address,
                data.ref3_name, data.ref3_phone, data.ref3_address,
                user_p_id, id
            ))
            # Update photo fields only if new values provided
            for field, val in [
                ("selfie_photo",          extract_image(data.selfie_photo)),
                ("dl_front",              extract_image(data.dl_front)),
                ("dl_back",               extract_image(data.dl_back)),
                ("pan_card_photo",        extract_image(data.pan_card_photo)),
                ("aadhaar_card_photo",    extract_image(data.aadhaar_card_photo)),
                ("aadhaar_card_front",    extract_image(data.aadhaar_card_front)),
                ("aadhaar_card_back",     extract_image(data.aadhaar_card_back)),
                ("local_address_proof",   extract_image(data.local_address_proof)),
                ("cancelled_cheque_photo",extract_image(data.cancelled_cheque_photo)),
                ("signature_photo",       extract_image(data.signature_photo)),
            ]:
                if val:
                    cur.execute(
                        f"UPDATE july_form_onboarding SET {field}=%s WHERE id=%s;",
                        (val, id)
                    )
            cur.execute("""
                INSERT INTO july_onboarding_logs
                  (onboarding_id, action, old_status, new_status,
                   changed_fields, performed_by, performed_by_name)
                VALUES (%s, 'DRAFT_SAVE', %s, %s, %s, %s, %s);
            """, (id, current_status, current_status,
                  f'{{"driver_name":"{data.driver_name}"}}',
                  user_p_id, user_name))
            conn.commit()
            return {"success": True, "id": id, "approval_status": current_status}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)


@app.get("/api/onboarding/{id}")
def get_onboarding(id: int):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT
                driver_name, phone_number, whatsapp_number, dob, city, operating_place,
                present_address, permanent_address, emergency_name, emergency_phone,
                dl_number, dl_expiry_date, lead_source,
                pan_number, aadhaar_number, pan_aadhaar_linked,
                vendor_name, vendor_id, aadhaar_card_photo,
                father_name, bank_name, other_bank_name,
                account_number, ifsc_code, upi_id,
                selfie_photo, dl_front, dl_back, pan_card_photo,
                vendor_type, driver_id, custom_rent_amount,
                walkin_id, emergency_relationship, platform_details, documents_verified,
                custom_rental_plan, cancelled_cheque_photo, NULL AS cheque2_photo, NULL AS cheque3_photo, signature_photo,
                account_name, account_type,
                candidate_role, rental_model, security_deposit, letzown_cheques, is_spring_verified,
                aadhaar_card_front, aadhaar_card_back, driver_email, local_address_proof,
                ref1_name, ref1_phone, ref1_address,
                ref2_name, ref2_phone, ref2_address,
                ref3_name, ref3_phone, ref3_address
            FROM july_form_onboarding
            WHERE id = %s;
        """, (id,))
        r = cur.fetchone()
        if r:
            res = {
                "id": id, "driver_name": r[0], "phone_number": r[1],
                "whatsapp_number": r[2], "dob": r[3], "city": r[4], "operating_place": r[5],
                "present_address": r[6], "permanent_address": r[7],
                "emergency_name": r[8], "emergency_phone": r[9],
                "dl_number": r[10], "dl_expiry_date": r[11],
                "lead_source": r[12], "pan_number": r[13],
                "aadhaar_number": r[14], "pan_aadhaar_linked": r[15],
                "vendor_name": r[16], "vendor_id": r[17],
                "aadhaar_card_photo": r[18],
                "father_name": r[19], "bank_name": r[20], "other_bank_name": r[21],
                "account_number": r[22], "ifsc_code": r[23], "upi_id": r[24],
                "selfie_photo": r[25], "dl_front": r[26], "dl_back": r[27], "pan_card_photo": r[28],
                "vendor_type": r[29], "driver_id": r[30], "custom_rent_amount": r[31],
                "walkin_id": r[32], "emergency_relationship": r[33], "platform_details": r[34],
                "documents_verified": r[35], "custom_rental_plan": r[36],
                "cancelled_cheque_photo": r[37], "cheque2_photo": r[38], "cheque3_photo": r[39], "signature_photo": r[40],
                "account_name": r[41], "account_type": r[42],
                "candidate_role": r[43], "rental_model": r[44], "security_deposit": r[45], 
                "letzown_cheques": r[46], "is_spring_verified": r[47],
                "aadhaar_card_front": r[48], "aadhaar_card_back": r[49], "driver_email": r[50], "local_address_proof": r[51],
                "ref1_name": r[52], "ref1_phone": r[53], "ref1_address": r[54],
                "ref2_name": r[55], "ref2_phone": r[56], "ref2_address": r[57],
                "ref3_name": r[58], "ref3_phone": r[59], "ref3_address": r[60]
            }
            if r[29] == "Operator" and r[17]:
                cur.execute("""
                    SELECT 
                        driver_name, phone_number, dl_number, custom_rent_amount, driver_id,
                        whatsapp_number, dob, present_address, permanent_address, 
                        emergency_name, emergency_phone, pan_number, aadhaar_number, father_name,
                        selfie_photo, dl_front, dl_back, pan_card_photo, aadhaar_card_photo
                    FROM july_form_onboarding
                    WHERE vendor_id = %s AND vendor_type = 'Operator' AND driver_id IS NOT NULL;
                """, (r[17],))
                drivers_rows = cur.fetchall()
                res["operator_drivers"] = [
                    {
                        "driver_name": d[0], "phone_number": d[1], "dl_number": d[2], "custom_rent_amount": d[3], "driver_id": d[4],
                        "whatsapp_number": d[5], "dob": d[6], "present_address": d[7], "permanent_address": d[8],
                        "emergency_name": d[9], "emergency_phone": d[10], "pan_number": d[11], "aadhaar_number": d[12], "father_name": d[13],
                        "selfie_photo": d[14], "dl_front": d[15], "dl_back": d[16], "pan_card_photo": d[17], "aadhaar_card_photo": d[18]
                    } for d in drivers_rows
                ]
            else:
                res["operator_drivers"] = []
            return res
        
        # Fallback to july_onboarding for July portal entries
        cur.execute("SELECT * FROM july_onboarding WHERE onboarding_id = %s;", (id,))
        jrow = cur.fetchone()
        if jrow:
            jcols = [desc[0] for desc in cur.description]
            jdata = dict(zip(jcols, jrow))
            jdata["id"] = jdata["onboarding_id"]
            jdata["vendor_type"] = jdata.get("driver_plan") or "Driver"
            jdata["candidate_role"] = jdata.get("driver_plan") or "Driver"
            jdata["operator_drivers"] = []
            return jdata

        raise HTTPException(status_code=404, detail="Onboarding record not found")
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/onboarding/{id}")
def update_onboarding(id: int, data: OnboardingData, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    user_p_id = user.get("portal_user_id") or user.get("user_id") or 1
    user_name = user.get("name") or user.get("username") or "Unknown"
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, approval_status FROM july_form_onboarding WHERE id = %s;", (id,))
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Onboarding record not found")
        old_approval_status = existing[1]
            
        import json
        cur.execute("""
            UPDATE july_form_onboarding SET
                driver_name=%s, phone_number=%s, whatsapp_number=%s, dob=%s, city=%s, operating_place=%s,
                present_address=%s, permanent_address=%s, emergency_name=%s, emergency_phone=%s, 
                dl_number=%s, dl_expiry_date=%s, lead_source=%s, 
                pan_number=%s, aadhaar_number=%s, pan_aadhaar_linked=%s,
                vendor_name=%s, vendor_id=%s,
                father_name=%s, bank_name=%s, other_bank_name=%s,
                account_number=%s, ifsc_code=%s, upi_id=%s,
                walkin_id=%s, emergency_relationship=%s, platform_details=%s, documents_verified=%s,
                custom_rental_plan=%s, account_name=%s, account_type=%s,
                candidate_role=%s, rental_model=%s, security_deposit=%s, letzown_cheques=%s, is_spring_verified=%s,
                driver_email=%s,
                ref1_name=%s, ref1_phone=%s, ref1_address=%s,
                ref2_name=%s, ref2_phone=%s, ref2_address=%s,
                ref3_name=%s, ref3_phone=%s, ref3_address=%s,
                updated_by=%s, updated_at=NOW()
            WHERE id=%s;
        """, (
            data.driver_name, data.phone_number, data.whatsapp_number, data.dob, data.city, data.operating_place,
            data.present_address, data.permanent_address, data.emergency_name, data.emergency_phone,
            data.dl_number, data.dl_expiry_date, data.lead_source,
            data.pan_number, data.aadhaar_number, data.pan_aadhaar_linked,
            data.vendor_name, data.vendor_id,
            data.father_name, data.bank_name, data.other_bank_name,
            data.account_number, data.ifsc_code, data.upi_id,
            data.walkin_id, data.emergency_relationship, json.dumps(data.platform_details) if data.platform_details else None, data.documents_verified,
            data.custom_rental_plan, data.account_name, data.account_type,
            data.candidate_role, data.rental_model, data.security_deposit, data.letzown_cheques, data.is_spring_verified,
            data.driver_email,
            data.ref1_name, data.ref1_phone, data.ref1_address,
            data.ref2_name, data.ref2_phone, data.ref2_address,
            data.ref3_name, data.ref3_phone, data.ref3_address,
            user_p_id,
            id
        ))
        
        new_selfie = extract_image(data.selfie_photo)
        new_dl_front = extract_image(data.dl_front)
        new_dl_back = extract_image(data.dl_back)
        new_pan = extract_image(data.pan_card_photo)
        new_aadhaar_img = extract_image(data.aadhaar_card_photo)
        new_aadhaar_front = extract_image(data.aadhaar_card_front)
        new_aadhaar_back = extract_image(data.aadhaar_card_back)
        new_local_address_proof = extract_image(data.local_address_proof)
        new_cancelled_cheque = extract_image(data.cancelled_cheque_photo)
        new_cheque2 = extract_image(data.cheque2_photo)
        new_cheque3 = extract_image(data.cheque3_photo)
        new_signature = extract_image(data.signature_photo)
        
        if new_selfie: cur.execute("UPDATE july_form_onboarding SET selfie_photo=%s WHERE id=%s;", (new_selfie, id))
        if new_dl_front: cur.execute("UPDATE july_form_onboarding SET dl_front=%s WHERE id=%s;", (new_dl_front, id))
        if new_dl_back: cur.execute("UPDATE july_form_onboarding SET dl_back=%s WHERE id=%s;", (new_dl_back, id))
        if new_pan: cur.execute("UPDATE july_form_onboarding SET pan_card_photo=%s WHERE id=%s;", (new_pan, id))
        if new_aadhaar_img: cur.execute("UPDATE july_form_onboarding SET aadhaar_card_photo=%s WHERE id=%s;", (new_aadhaar_img, id))
        if new_aadhaar_front: cur.execute("UPDATE july_form_onboarding SET aadhaar_card_front=%s WHERE id=%s;", (new_aadhaar_front, id))
        if new_aadhaar_back: cur.execute("UPDATE july_form_onboarding SET aadhaar_card_back=%s WHERE id=%s;", (new_aadhaar_back, id))
        if new_local_address_proof: cur.execute("UPDATE july_form_onboarding SET local_address_proof=%s WHERE id=%s;", (new_local_address_proof, id))
        if new_cancelled_cheque: cur.execute("UPDATE july_form_onboarding SET cancelled_cheque_photo=%s WHERE id=%s;", (new_cancelled_cheque, id))
        if new_cheque2: cur.execute("UPDATE july_form_onboarding SET cheque2_photo=%s WHERE id=%s;", (new_cheque2, id))
        if new_cheque3: cur.execute("UPDATE july_form_onboarding SET cheque3_photo=%s WHERE id=%s;", (new_cheque3, id))
        if new_signature: cur.execute("UPDATE july_form_onboarding SET signature_photo=%s WHERE id=%s;", (new_signature, id))
            
        if data.walkin_id:
            cur.execute("DELETE FROM july_walkin_form_links WHERE onboarding_id = %s;", (id,))
            cur.execute("INSERT INTO july_walkin_form_links (walkin_id, onboarding_id) VALUES (%s, %s);", (data.walkin_id, id))
            cur.execute("UPDATE july_walkins SET joined_status = 'Onboarded' WHERE id = %s;", (data.walkin_id,))

        # ── Audit log ────────────────────────────────────────────────────────
        new_status = data.approval_status if hasattr(data, 'approval_status') and data.approval_status else old_approval_status
        action = 'STATUS_CHANGE' if old_approval_status != new_status else 'UPDATE'
        cur.execute("""
            INSERT INTO july_onboarding_logs
              (onboarding_id, action, old_status, new_status, changed_fields,
               performed_by, performed_by_name)
            VALUES (%s, %s, %s, %s, %s, %s, %s);
        """, (id, action, old_approval_status, new_status,
              f'{{"driver_name":"{data.driver_name}"}}',
              user_p_id, user_name))

        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/stats/onboarding")
def get_onboarding_stats():
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        
        cur.execute("SELECT COUNT(*) FROM july_onboarding WHERE (vendor_type ILIKE '%%Driver%%' OR candidate_role ILIKE '%%Driver%%');")
        driver_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM july_onboarding WHERE (vendor_type ILIKE '%%Operator%%' OR candidate_role ILIKE '%%Operator%%');")
        operator_count = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM july_onboarding WHERE created_at >= NOW() - INTERVAL '7 days';")
        last_7_days_count = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM july_onboarding WHERE approval_status ILIKE '%%Pending%%';")
        pending_approvals_count = cur.fetchone()[0]
            
        return {
            "driver_count": driver_count,
            "operator_count": operator_count,
            "last_7_days_count": last_7_days_count,
            "pending_approvals_count": pending_approvals_count
        }
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/onboarding/{id}")
def delete_onboarding(id: int, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    user_p_id = user.get("portal_user_id") or user.get("user_id") or 1
    user_name = user.get("name") or user.get("username") or "Unknown"
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT driver_name, approval_status FROM july_form_onboarding WHERE id = %s;", (id,))
        old = cur.fetchone()
        if not old:
            raise HTTPException(status_code=404, detail="Record not found")
        old_name, old_status = old

        # Log before delete
        cur.execute("""
            INSERT INTO july_onboarding_logs
              (onboarding_id, action, old_status, new_status, changed_fields,
               performed_by, performed_by_name)
            VALUES (%s, 'DELETE', %s, 'DELETED', %s, %s, %s);
        """, (id, old_status,
              f'{{"driver_name":"{old_name}"}}',
              user_p_id, user_name))

        cur.execute("DELETE FROM july_walkin_form_links WHERE onboarding_id = %s;", (id,))
        cur.execute("DELETE FROM july_form_onboarding WHERE id = %s;", (id,))
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)



# ─────────────────────────────────────────────────────────
# Partner Adjustment Endpoints
# ─────────────────────────────────────────────────────────
@app.get("/api/adjustment")
def get_adjustments(
    query: Optional[str] = None,
    city: Optional[str] = None,
    adj_type: Optional[str] = None,
    status: Optional[str] = None
):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        base_query = "SELECT * FROM copy_partner_adjustment WHERE 1=1"
        params = []
        
        if query:
            base_query += """ AND (
                LOWER(partner_name) LIKE %s OR 
                LOWER(partner_code) LIKE %s OR 
                LOWER(driver_id) LIKE %s OR 
                partner_number LIKE %s OR 
                LOWER(vehicle_number) LIKE %s
            )"""
            q = f"%{query.lower()}%"
            params.extend([q, q, q, q, q])
            
        if city and city != "all":
            base_query += " AND city_name = %s"
            params.append(city)
            
        if adj_type and adj_type != "all":
            base_query += " AND adjustment_type = %s"
            params.append(adj_type)
            
        if status and status != "all":
            base_query += " AND status = %s"
            params.append(status)
            
        base_query += " ORDER BY id DESC"
        cur.execute(base_query, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/adjustment/stats")
def get_adjustment_stats():
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        
        cur.execute("SELECT COUNT(*) FROM copy_partner_adjustment;")
        total = cur.fetchone()[0]
        
        cur.execute("""
            SELECT COALESCE(SUM(CASE 
                WHEN enter_amount ~ '^[0-9]+(\\.[0-9]+)?$' THEN CAST(enter_amount AS DOUBLE PRECISION)
                ELSE 0 
            END), 0) FROM copy_partner_adjustment;
        """)
        total_amount = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM copy_partner_adjustment WHERE finance_team_status = 'Approved';")
        approved = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM copy_partner_adjustment WHERE status = 'Completed';")
        completed = cur.fetchone()[0]
        
        return {
            "total_adjustments": total,
            "total_amount": round(total_amount, 2),
            "approved_count": approved,
            "completed_count": completed
        }
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/adjustment/{id}")
def get_adjustment(id: int):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM copy_partner_adjustment WHERE id = %s;", (id,))
        r = cur.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Adjustment record not found")
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, r))
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/adjustment")
def create_adjustment(data: AdjustmentData):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO copy_partner_adjustment (
                partner_name, partner_code, driver_id, partner_number, vehicle_number, city_name, 
                partner_type, adjustment_level, adjustment_nature, time_duration, adjustment_type, adjustment_date, enter_amount, 
                remittance_towards, adjustment_related_to, remarks, first_level_approval_by, 
                finance_team_status, finance_team_remarks, final_level_approval_by, status, photo
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id;
        """, (
            data.partner_name, data.partner_code, data.driver_id, data.partner_number, data.vehicle_number, data.city_name,
            data.partner_type, data.adjustment_level, data.adjustment_nature, data.time_duration, data.adjustment_type, data.adjustment_date, data.enter_amount,
            data.remittance_towards, data.adjustment_related_to, data.remarks, data.first_level_approval_by,
            data.finance_team_status, data.finance_team_remarks, data.final_level_approval_by, data.status,
            extract_image(data.photo)
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": new_id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/adjustment/{id}")
def update_adjustment(id: int, data: AdjustmentData):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE copy_partner_adjustment SET
                partner_name=%s, partner_code=%s, driver_id=%s, partner_number=%s, vehicle_number=%s, city_name=%s, 
                partner_type=%s, adjustment_level=%s, adjustment_nature=%s, time_duration=%s, adjustment_type=%s, adjustment_date=%s, enter_amount=%s, 
                remittance_towards=%s, adjustment_related_to=%s, remarks=%s, first_level_approval_by=%s, 
                finance_team_status=%s, finance_team_remarks=%s, final_level_approval_by=%s, status=%s, photo=%s
            WHERE id=%s RETURNING id;
        """, (
            data.partner_name, data.partner_code, data.driver_id, data.partner_number, data.vehicle_number, data.city_name,
            data.partner_type, data.adjustment_level, data.adjustment_nature, data.time_duration, data.adjustment_type, data.adjustment_date, data.enter_amount,
            data.remittance_towards, data.adjustment_related_to, data.remarks, data.first_level_approval_by,
            data.finance_team_status, data.finance_team_remarks, data.final_level_approval_by, data.status,
            extract_image(data.photo),
            id
        ))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Adjustment record not found")
        conn.commit()
        return {"success": True, "id": id}
    finally:
        postgreSQL_pool.putconn(conn)


@app.put("/api/adjustment/{id}/status")
def update_adjustment_status(id: int, request: Request, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    if user.get("role") not in ["Manager", "Admin", "Founder/Admin", "CEO/Admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to approve")
    
    data = asyncio.run(request.json())
    new_status = data.get("status")
    
    if new_status not in ["Approved", "Rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE copy_partner_adjustment SET status = %s, first_level_approval_by = %s WHERE id = %s", (new_status, user.get("name", ""), id))
        conn.commit()
        return {"status": "success", "message": f"Adjustment {new_status}"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)


@app.put("/api/adjustment/{id}/assign")
def assign_adjustment(id: int, request: Request, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    if user.get("role") not in ["Manager", "Admin", "Founder/Admin", "CEO/Admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to assign")
    
    data = asyncio.run(request.json())
    assigned_to = data.get("assigned_to")
    
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE copy_partner_adjustment 
            SET assigned_to = %s, assigned_by = %s, assigned_time = NOW() 
            WHERE id = %s
        """, (assigned_to, user.get("name", ""), id))
        conn.commit()
        return {"status": "success", "message": f"Assigned to {assigned_to}"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/adjustment/{id}")
def delete_adjustment(id: int):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM copy_partner_adjustment WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Adjustment record not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)



# ─────────────────────────────────────────────────────────
# Vehicle Allocation Endpoints  (→ july_allocation_form)
# ─────────────────────────────────────────────────────────

def _write_alloc_log(cur, allocation_id, action, old_status, new_status,
                     changed_fields, previous_data, new_data, remarks,
                     performed_by, performed_by_name,
                     alloc_date=None, vehicle_number=None,
                     driver_id=None, driver_name=None):
    """Insert one audit row into july_allocation_form_logs."""
    cur.execute("""
        INSERT INTO july_allocation_form_logs (
            allocation_id, allocation_date, vehicle_number, driver_id, driver_name,
            action, old_status, new_status,
            changed_fields, previous_data, new_data, remarks,
            performed_by, performed_by_name
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
    """, (
        allocation_id,
        alloc_date, vehicle_number, driver_id, driver_name,
        action, old_status, new_status,
        json.dumps(changed_fields) if changed_fields else None,
        json.dumps(previous_data)  if previous_data  else None,
        json.dumps(new_data)       if new_data        else None,
        remarks,
        performed_by, performed_by_name
    ))


@app.get("/api/allocation")
def get_allocations(
    query: Optional[str] = None,
    city: Optional[str] = None,
    alloc_type: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        base_query = "SELECT * FROM july_allocation_form WHERE 1=1"
        params = []

        if query:
            base_query += """ AND (
                LOWER(driver_name)        LIKE %s OR
                LOWER(driver_id)          LIKE %s OR
                driver_phone              LIKE %s OR
                LOWER(vehicle_number)     LIKE %s OR
                LOWER(old_vehicle_number) LIKE %s OR
                CAST(id AS TEXT)          LIKE %s
            )"""
            q = f"%{query.lower()}%"
            params.extend([q, q, q, q, q, q])

        if city and city != "all":
            base_query += " AND city_name = %s"
            params.append(city)

        if alloc_type and alloc_type != "all":
            base_query += " AND allocation_type = %s"
            params.append(alloc_type)

        base_query += " ORDER BY id DESC"
        cur.execute(base_query, params)
        cols = [d[0] for d in cur.description]
        result = []
        for row in cur.fetchall():
            rec = dict(zip(cols, row))
            # Serialise date/timestamp fields so JSON can handle them
            for df in ["allocation_date", "created_at", "updated_at"]:
                if rec.get(df) and hasattr(rec[df], "isoformat"):
                    rec[df] = rec[df].isoformat()
            result.append(rec)
        return result
    finally:
        postgreSQL_pool.putconn(conn)


@app.get("/api/allocation/stats")
def get_allocation_stats(authorization: Optional[str] = Header(None)):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) FROM july_allocation_form;")
        total = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM july_allocation_form
            WHERE allocation_type = 'Allocation'
              AND sub_type IN ('New Allocation', 'Rejoining');
        """)
        new_alloc = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM july_allocation_form
            WHERE allocation_type = 'Allocation' AND sub_type = 'Swap';
        """)
        swap_alloc = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM july_allocation_form
            WHERE allocation_type = 'Drop-Off';
        """)
        dropoffs = cur.fetchone()[0]

        return {
            "total_allocations": total,
            "new_allocations":   new_alloc,
            "car_swaps":         swap_alloc,
            "reallocations":     dropoffs      # kept for frontend compat
        }
    finally:
        postgreSQL_pool.putconn(conn)


@app.get("/api/allocation/{id}")
def get_allocation_record(id: int, authorization: Optional[str] = Header(None)):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM july_allocation_form WHERE id = %s;", (id,))
        r = cur.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Allocation record not found")
        cols = [d[0] for d in cur.description]
        rec = dict(zip(cols, r))
        for df in ["allocation_date", "created_at", "updated_at"]:
            if rec.get(df) and hasattr(rec[df], "isoformat"):
                rec[df] = rec[df].isoformat()
        return rec
    finally:
        postgreSQL_pool.putconn(conn)


@app.post("/api/allocation")
def create_allocation_record(data: AllocationData, authorization: Optional[str] = Header(None)):
    user = None
    if authorization:
        try:
            user = get_july_user(authorization)
        except Exception:
            pass
    uid   = user["portal_user_id"] if user else None
    uname = user["name"]           if user else "System"

    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO july_allocation_form (
                allocation_date, allocation_type, sub_type, city_name,
                driver_id, driver_name, driver_phone,
                driver_plan, type_of_plan, car_model,
                vehicle_number, gps_active,
                ola_negative_balance, ola_negative_balance_proof,
                photo_lh_side, photo_rh_side, photo_front_side, photo_back_side,
                old_vehicle_number, dropoff_odometer, dropoff_remarks, dropoff_photo,
                dropoff_location, duplicate_key_status,
                fastag_balance_amount, fastag_balance_proof,
                status, created_by, created_at
            ) VALUES (
                %s,%s,%s,%s, %s,%s,%s, %s,%s,%s, %s,%s,
                %s,%s, %s,%s,%s,%s,
                %s,%s,%s,%s, %s,%s, %s,%s,
                %s, %s, NOW()
            ) RETURNING id;
        """, (
            data.allocation_date, data.allocation_type, data.sub_type, data.city_name,
            data.driver_id, data.driver_name, data.driver_phone,
            data.driver_plan, data.type_of_plan, data.car_model,
            data.vehicle_number, data.gps_active,
            data.ola_negative_balance, extract_image(data.ola_negative_balance_proof),
            extract_image(data.photo_lh_side), extract_image(data.photo_rh_side),
            extract_image(data.photo_front_side), extract_image(data.photo_back_side),
            data.old_vehicle_number,
            float(data.dropoff_odometer) if data.dropoff_odometer else None,
            data.dropoff_remarks, extract_image(data.dropoff_photo),
            data.dropoff_location, data.duplicate_key_status,
            float(data.fastag_balance_amount) if data.fastag_balance_amount else None,
            extract_image(data.fastag_balance_proof),
            data.status or "Submitted",
            data.created_by or uid
        ))
        new_id = cur.fetchone()[0]

        # Write CREATE log
        _write_alloc_log(
            cur, new_id, "CREATE",
            old_status=None, new_status=data.status or "Submitted",
            changed_fields=None, previous_data=None,
            new_data={
                "driver_id":       data.driver_id,
                "driver_name":     data.driver_name,
                "vehicle_number":  data.vehicle_number,
                "allocation_type": data.allocation_type,
                "sub_type":        data.sub_type,
                "status":          data.status or "Submitted"
            },
            remarks=None,
            performed_by=uid, performed_by_name=uname,
            alloc_date=data.allocation_date,
            vehicle_number=data.vehicle_number,
            driver_id=data.driver_id, driver_name=data.driver_name
        )

        conn.commit()
        return {"success": True, "id": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)


@app.put("/api/allocation/{id}")
def update_allocation_record(id: int, data: AllocationData, authorization: Optional[str] = Header(None)):
    user = None
    if authorization:
        try:
            user = get_july_user(authorization)
        except Exception:
            pass
    uid   = user["portal_user_id"] if user else None
    uname = user["name"]           if user else "System"

    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()

        # Snapshot previous state for the audit log
        cur.execute("SELECT * FROM july_allocation_form WHERE id = %s;", (id,))
        prev_row = cur.fetchone()
        if not prev_row:
            raise HTTPException(status_code=404, detail="Allocation record not found")
        prev_cols = [d[0] for d in cur.description]
        prev_data = dict(zip(prev_cols, prev_row))
        old_status = prev_data.get("status")
        # Serialise dates before storing as JSON
        for df in ["allocation_date", "created_at", "updated_at"]:
            if prev_data.get(df) and hasattr(prev_data[df], "isoformat"):
                prev_data[df] = prev_data[df].isoformat()

        cur.execute("""
            UPDATE july_allocation_form SET
                allocation_date=%s, allocation_type=%s, sub_type=%s, city_name=%s,
                driver_id=%s, driver_name=%s, driver_phone=%s,
                driver_plan=%s, type_of_plan=%s, car_model=%s,
                vehicle_number=%s, gps_active=%s,
                ola_negative_balance=%s, ola_negative_balance_proof=%s,
                photo_lh_side=%s, photo_rh_side=%s, photo_front_side=%s, photo_back_side=%s,
                old_vehicle_number=%s, dropoff_odometer=%s, dropoff_remarks=%s, dropoff_photo=%s,
                dropoff_location=%s, duplicate_key_status=%s,
                fastag_balance_amount=%s, fastag_balance_proof=%s,
                status=%s, updated_by=%s, updated_at=NOW()
            WHERE id=%s RETURNING id;
        """, (
            data.allocation_date, data.allocation_type, data.sub_type, data.city_name,
            data.driver_id, data.driver_name, data.driver_phone,
            data.driver_plan, data.type_of_plan, data.car_model,
            data.vehicle_number, data.gps_active,
            data.ola_negative_balance, extract_image(data.ola_negative_balance_proof),
            extract_image(data.photo_lh_side), extract_image(data.photo_rh_side),
            extract_image(data.photo_front_side), extract_image(data.photo_back_side),
            data.old_vehicle_number,
            float(data.dropoff_odometer) if data.dropoff_odometer else None,
            data.dropoff_remarks, extract_image(data.dropoff_photo),
            data.dropoff_location, data.duplicate_key_status,
            float(data.fastag_balance_amount) if data.fastag_balance_amount else None,
            extract_image(data.fastag_balance_proof),
            data.status or "Submitted",
            uid, id
        ))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Allocation record not found")

        new_stat = data.status or "Submitted"
        _write_alloc_log(
            cur, id, "UPDATE",
            old_status=old_status, new_status=new_stat,
            changed_fields=None, previous_data=prev_data,
            new_data={
                "driver_id":       data.driver_id,
                "vehicle_number":  data.vehicle_number,
                "status":          new_stat
            },
            remarks=None,
            performed_by=uid, performed_by_name=uname,
            alloc_date=data.allocation_date,
            vehicle_number=data.vehicle_number,
            driver_id=data.driver_id, driver_name=data.driver_name
        )

        conn.commit()
        return {"success": True, "id": id}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)


@app.delete("/api/allocation/{id}")
def delete_allocation_record(id: int, authorization: Optional[str] = Header(None)):
    user = None
    if authorization:
        try:
            user = get_july_user(authorization)
        except Exception:
            pass
    uid   = user["portal_user_id"] if user else None
    uname = user["name"]           if user else "System"

    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        # Snapshot before delete so the log captures who was deleted
        cur.execute("""
            SELECT driver_id, driver_name, vehicle_number, allocation_date, status
            FROM july_allocation_form WHERE id = %s;
        """, (id,))
        snap = cur.fetchone()
        if not snap:
            raise HTTPException(status_code=404, detail="Allocation record not found")
        drv_id, drv_name, veh_num, alloc_dt, status = snap

        cur.execute("DELETE FROM july_allocation_form WHERE id = %s RETURNING id;", (id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Allocation record not found")

        _write_alloc_log(
            cur, id, "DELETE",
            old_status=status, new_status=None,
            changed_fields=None,
            previous_data={"id": id, "driver_id": drv_id, "vehicle_number": veh_num},
            new_data=None,
            remarks="Record permanently deleted",
            performed_by=uid, performed_by_name=uname,
            alloc_date=str(alloc_dt) if alloc_dt else None,
            vehicle_number=veh_num, driver_id=drv_id, driver_name=drv_name
        )

        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)



# ─────────────────────────────────────────────────────────
# Partner Expenses Endpoints
# ─────────────────────────────────────────────────────────
@app.get("/api/expense")
def get_expenses(
    query: Optional[str] = None,
    exp_type: Optional[str] = None
):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        base_query = "SELECT * FROM copy_partner_expenses WHERE 1=1"
        params = []
        
        if query:
            base_query += """ AND (
                LOWER(driver_name) LIKE %s OR 
                phone_number LIKE %s OR 
                LOWER(vehicle_number) LIKE %s
            )"""
            q = f"%{query.lower()}%"
            params.extend([q, q, q])
            
        if exp_type and exp_type != "all":
            base_query += " AND expenses_type = %s"
            params.append(exp_type)
            
        base_query += " ORDER BY id DESC"
        cur.execute(base_query, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/expense/stats")
def get_expense_stats():
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        
        cur.execute("SELECT amount_paid FROM copy_partner_expenses;")
        total = sum(float(r[0]) for r in cur.fetchall() if r[0] and r[0].replace('.', '', 1).isdigit())
        
        cur.execute("SELECT amount_paid FROM copy_partner_expenses WHERE expenses_type = 'CNG';")
        cng = sum(float(r[0]) for r in cur.fetchall() if r[0] and r[0].replace('.', '', 1).isdigit())
        
        cur.execute("SELECT amount_paid FROM copy_partner_expenses WHERE expenses_type = 'Toll';")
        toll = sum(float(r[0]) for r in cur.fetchall() if r[0] and r[0].replace('.', '', 1).isdigit())
        
        cur.execute("SELECT amount_paid FROM copy_partner_expenses WHERE expenses_type IN ('OLA - CL Balance', 'Paid to Company');")
        other = sum(float(r[0]) for r in cur.fetchall() if r[0] and r[0].replace('.', '', 1).isdigit())
        
        return {
            "total_expenses": total,
            "cng_total": cng,
            "toll_total": toll,
            "other_total": other
        }
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/expense/{id}")
def get_expense_record(id: int):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM copy_partner_expenses WHERE id = %s;", (id,))
        r = cur.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Expense record not found")
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, r))
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/expense")
def create_expense_record(data: ExpenseData):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO copy_partner_expenses (
                expense_date, driver_name, phone_number, vehicle_number, 
                expenses_type, amount_paid, reference_photo
            ) VALUES (%s,%s,%s,%s,%s,%s,%s)
            RETURNING id;
        """, (
            data.expense_date, data.driver_name, data.phone_number, data.vehicle_number,
            data.expenses_type, data.amount_paid, extract_image(data.reference_photo)
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": new_id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/expense/{id}")
def update_expense_record(id: int, data: ExpenseData):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE copy_partner_expenses SET
                expense_date=%s, driver_name=%s, phone_number=%s, vehicle_number=%s, 
                expenses_type=%s, amount_paid=%s, reference_photo=%s
            WHERE id=%s RETURNING id;
        """, (
            data.expense_date, data.driver_name, data.phone_number, data.vehicle_number,
            data.expenses_type, data.amount_paid, extract_image(data.reference_photo),
            id
        ))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Expense record not found")
        conn.commit()
        return {"success": True, "id": id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/expense/{id}")
def delete_expense_record(id: int):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM copy_partner_expenses WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Expense record not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Vehicle Onboarding Endpoints
# ─────────────────────────────────────────────────────────
@app.get("/api/vehicle")
def get_all_vehicles(search: Optional[str] = None, city: Optional[str] = None, type: Optional[str] = None, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        query = "SELECT * FROM july_vehicle_onboarding_1 WHERE 1=1"
        params = []
        if search:
            query += " AND (vehicle_number ILIKE %s OR model ILIKE %s OR letzryd_unique_no ILIKE %s)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
        if city and city != "all":
            query += " AND city_name = %s"
            params.append(city)
        if type and type != "all":
            query += " AND received_allocated = %s"
            params.append(type)
        query += " ORDER BY id DESC"
        cur.execute(query, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/vehicle/stats")
def get_vehicle_stats(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM july_vehicle_onboarding_1;")
        total = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM july_vehicle_onboarding_1 WHERE received_allocated = 'In Process';")
        receiving = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM july_vehicle_onboarding_1 WHERE received_allocated = 'PDI Done';")
        allocation = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM july_vehicle_onboarding_1 WHERE cng_installed = 'Yes';")
        cng = cur.fetchone()[0]
        return {
            "total_fleet": total,
            "receiving_count": receiving,
            "allocation_count": allocation,
            "cng_count": cng
        }
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/vehicle/{id}")
def get_single_vehicle(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM july_vehicle_onboarding_1 WHERE id = %s;", (id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Vehicle record not found")
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, row))
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/vehicle")
@app.post("/api/vehicle/draft")
def create_vehicle_record(data: VehicleOnboardingData, authorization: Optional[str] = Header(None)):
    user = None
    user_name = "Unknown"
    if authorization:
        try:
            user = get_current_user(authorization)
            user_name = user.get("name") or user.get("username") or "Unknown"
        except Exception:
            pass
    uid = user.get("portal_user_id") or user.get("user_id") if user else None
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO july_vehicle_onboarding_1 (
                vehicle_number, letzryd_unique_no, city_name, model, received_allocated, delivery_month,
                registration_date, rto_tax_validity, permit_validity, fitness_validity, pollution_validity, insurance_validity,
                insurance_broker, insurance_underwriter, insurance_start_date,
                authorization_certificate, insurance_mapping,
                kms_reading, tracking_device_vendor, tracking_device_type, cng_installed, cng_plate, cng_installation_date, jack, jack_rod, spanner, parking_triangle, fire_extinguishers, seat_cover, floor_carpet, fast_tag, music_system, key_quantity,
                image_front, image_lh, image_back, image_rh, engine_chasis_no_img, battery_sl_no_img, engine_compartment_img, fast_tag_img, music_system_img, rh_fr_tyre_img, lh_fr_tyre_img, rh_rear_tyre_img, lh_rear_tyre_img, spare_wheel_img,
                rc_document, insurance_document, authorization_certificate_doc, rto_tax_receipt,
                fuel_type,
                insurance_idv, cover_engine_protect, cover_consumables, cover_zero_dep, cover_rsa,
                chassis_number, engine_number, cng_tank_number, fast_tag_number, fast_tag_vendor,
                approval_status, current_approver_id, approval_remarks, created_by
            ) VALUES (
                %s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,
                %s,%s,%s,
                %s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,
                %s,
                %s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,
                %s,%s,%s,%s
            ) RETURNING id;
        """, (
            data.vehicle_number or "DRAFT-VEH", data.letzryd_unique_no, data.city_name, data.model, data.received_allocated, data.delivery_month,
            data.registration_date, data.rto_tax_validity, data.permit_validity, data.fitness_validity, data.pollution_validity, data.insurance_validity,
            data.insurance_broker, data.insurance_underwriter, data.insurance_start_date,
            data.authorization_certificate, data.insurance_mapping,
            data.kms_reading, data.tracking_device_vendor, data.tracking_device_type, data.cng_installed, data.cng_plate, data.cng_installation_date, data.jack, data.jack_rod, data.spanner, data.parking_triangle, data.fire_extinguishers, data.seat_cover, data.floor_carpet, data.fast_tag, data.music_system, data.key_quantity,
            extract_image(data.image_front), extract_image(data.image_lh), extract_image(data.image_back), extract_image(data.image_rh),
            extract_image(data.engine_chasis_no_img), extract_image(data.battery_sl_no_img), extract_image(data.engine_compartment_img), extract_image(data.fast_tag_img),
            extract_image(data.music_system_img), extract_image(data.rh_fr_tyre_img), extract_image(data.lh_fr_tyre_img),
            extract_image(data.rh_rear_tyre_img), extract_image(data.lh_rear_tyre_img), extract_image(data.spare_wheel_img),
            extract_image(data.rc_document), extract_image(data.insurance_document), extract_image(data.authorization_certificate_doc), extract_image(data.rto_tax_receipt),
            data.fuel_type,
            data.insurance_idv, str(data.cover_engine_protect), str(data.cover_consumables), str(data.cover_zero_dep), str(data.cover_rsa),
            data.chassis_number, data.engine_number, data.cng_tank_number, data.fast_tag_number, data.fast_tag_vendor,
            data.approval_status or "Draft", data.current_approver_id, data.approval_remarks, data.created_by or uid
        ))
        new_id = cur.fetchone()[0]

        import json
        cur.execute("""
            INSERT INTO july_vehicle_onboarding_1_logs
              (vehicle_id, vehicle_ob_id, vehicle_number, action, old_status, new_status,
               changed_fields, performed_by, performed_by_name)
            VALUES (%s, %s, %s, 'CREATE', NULL, %s, %s, %s, %s);
        """, (new_id, new_id, data.vehicle_number or "DRAFT-VEH",
              data.approval_status or 'Draft',
              json.dumps({"city": data.city_name, "model": data.model}),
              uid, user_name))

        conn.commit()
        return {"success": True, "id": new_id, "message": "Vehicle entry saved successfully"}
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/vehicle/save-draft/{id}")
@app.put("/api/vehicle/{id}")
def update_vehicle_record(id: int, data: VehicleOnboardingData, authorization: Optional[str] = Header(None)):
    user = None
    user_name = "Unknown"
    if authorization:
        try:
            user = get_current_user(authorization)
            user_name = user.get("name") or user.get("username") or "Unknown"
        except Exception:
            pass
    uid = user.get("portal_user_id") or user.get("user_id") if user else None
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        if id == 0:
            return create_vehicle_record(data, authorization)

        cur.execute("SELECT approval_status, vehicle_number FROM july_vehicle_onboarding_1 WHERE id=%s;", (id,))
        old_veh = cur.fetchone()
        if not old_veh:
            return create_vehicle_record(data, authorization)
        
        old_veh_status = old_veh[0]
        old_veh_number = old_veh[1] or data.vehicle_number

        cur.execute("""
            UPDATE july_vehicle_onboarding_1 SET
                vehicle_number=%s, letzryd_unique_no=%s, city_name=%s, model=%s, received_allocated=%s, delivery_month=%s,
                registration_date=%s, rto_tax_validity=%s, permit_validity=%s, fitness_validity=%s, pollution_validity=%s, insurance_validity=%s, 
                insurance_broker=%s, insurance_underwriter=%s, insurance_start_date=%s,
                authorization_certificate=%s, insurance_mapping=%s,
                kms_reading=%s, tracking_device_vendor=%s, tracking_device_type=%s, cng_installed=%s, cng_plate=%s, cng_installation_date=%s, jack=%s, jack_rod=%s, spanner=%s, parking_triangle=%s, fire_extinguishers=%s, seat_cover=%s, floor_carpet=%s, fast_tag=%s, music_system=%s, key_quantity=%s,
                image_front=COALESCE(%s, image_front), image_lh=COALESCE(%s, image_lh), image_back=COALESCE(%s, image_back), image_rh=COALESCE(%s, image_rh), 
                engine_chasis_no_img=COALESCE(%s, engine_chasis_no_img), battery_sl_no_img=COALESCE(%s, battery_sl_no_img), engine_compartment_img=COALESCE(%s, engine_compartment_img), fast_tag_img=COALESCE(%s, fast_tag_img),
                music_system_img=COALESCE(%s, music_system_img), rh_fr_tyre_img=COALESCE(%s, rh_fr_tyre_img), lh_fr_tyre_img=COALESCE(%s, lh_fr_tyre_img),
                rh_rear_tyre_img=COALESCE(%s, rh_rear_tyre_img), lh_rear_tyre_img=COALESCE(%s, lh_rear_tyre_img), spare_wheel_img=COALESCE(%s, spare_wheel_img),
                rc_document=COALESCE(%s, rc_document), insurance_document=COALESCE(%s, insurance_document), authorization_certificate_doc=COALESCE(%s, authorization_certificate_doc), rto_tax_receipt=COALESCE(%s, rto_tax_receipt),
                fuel_type=%s,
                insurance_idv=%s, cover_engine_protect=%s, cover_consumables=%s, cover_zero_dep=%s, cover_rsa=%s,
                chassis_number=%s, engine_number=%s, cng_tank_number=%s, fast_tag_number=%s, fast_tag_vendor=%s,
                approval_status=%s, current_approver_id=%s, approval_remarks=%s,
                updated_by=%s, updated_at=NOW()
            WHERE id=%s RETURNING id;
        """, (
            data.vehicle_number or old_veh_number, data.letzryd_unique_no, data.city_name, data.model, data.received_allocated, data.delivery_month,
            data.registration_date, data.rto_tax_validity, data.permit_validity, data.fitness_validity, data.pollution_validity, data.insurance_validity, 
            data.insurance_broker, data.insurance_underwriter, data.insurance_start_date,
            data.authorization_certificate, data.insurance_mapping,
            data.kms_reading, data.tracking_device_vendor, data.tracking_device_type, data.cng_installed, data.cng_plate, data.cng_installation_date, data.jack, data.jack_rod, data.spanner, data.parking_triangle, data.fire_extinguishers, data.seat_cover, data.floor_carpet, data.fast_tag, data.music_system, data.key_quantity,
            extract_image(data.image_front), extract_image(data.image_lh), extract_image(data.image_back), extract_image(data.image_rh),
            extract_image(data.engine_chasis_no_img), extract_image(data.battery_sl_no_img), extract_image(data.engine_compartment_img), extract_image(data.fast_tag_img),
            extract_image(data.music_system_img), extract_image(data.rh_fr_tyre_img), extract_image(data.lh_fr_tyre_img),
            extract_image(data.rh_rear_tyre_img), extract_image(data.lh_rear_tyre_img), extract_image(data.spare_wheel_img),
            extract_image(data.rc_document), extract_image(data.insurance_document), extract_image(data.authorization_certificate_doc), extract_image(data.rto_tax_receipt),
            data.fuel_type,
            data.insurance_idv, str(data.cover_engine_protect), str(data.cover_consumables), str(data.cover_zero_dep), str(data.cover_rsa),
            data.chassis_number, data.engine_number, data.cng_tank_number, data.fast_tag_number, data.fast_tag_vendor,
            data.approval_status or old_veh_status or 'Draft', data.current_approver_id, data.approval_remarks,
            uid,
            id
        ))

        import json
        cur.execute("""
            INSERT INTO july_vehicle_onboarding_1_logs
              (vehicle_id, vehicle_ob_id, vehicle_number, action, old_status, new_status,
               changed_fields, performed_by, performed_by_name)
            VALUES (%s, %s, %s, 'UPDATE', %s, %s, %s, %s, %s);
        """, (id, id, data.vehicle_number or old_veh_number, old_veh_status,
              data.approval_status or 'Draft',
              json.dumps({"city": data.city_name, "model": data.model}),
              uid, user_name))

        conn.commit()
        return {"success": True, "id": id, "message": "Draft updated successfully"}
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/vehicle/{id}")
def delete_vehicle_record(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM july_vehicle_onboarding_1 WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Vehicle record not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Workshop Endpoints
# ─────────────────────────────────────────────────────────
@app.get("/api/workshop")
def get_all_workshops(search: Optional[str] = None, city: Optional[str] = None, type: Optional[str] = None, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        query = "SELECT * FROM copy_workshop_vendors WHERE 1=1"
        params = []
        if search:
            query += " AND (vendor_name ILIKE %s OR contact_person ILIKE %s OR owner_name ILIKE %s)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
        if city and city != "all":
            query += " AND city_name = %s"
            params.append(city)
        if type and type != "all":
            query += " AND workshop_type = %s"
            params.append(type)
        query += " ORDER BY id DESC"
        cur.execute(query, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/workshop/stats")
def get_workshop_stats(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM copy_workshop_vendors;")
        total = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM copy_workshop_vendors WHERE workshop_status = 'Active';")
        active = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM copy_workshop_vendors WHERE workshop_type = 'EV Specialist';")
        ev_specialist = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM copy_workshop_vendors WHERE workshop_status = 'Onboarding';")
        onboarding = cur.fetchone()[0]
        return {
            "total_workshops": total,
            "active_count": active,
            "ev_specialist_count": ev_specialist,
            "onboarding_count": onboarding
        }
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/workshop/{id}")
def get_single_workshop(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM copy_workshop_vendors WHERE id = %s;", (id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Workshop vendor not found")
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, row))
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/workshop")
def create_workshop_record(data: WorkshopData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO copy_workshop_vendors (
                vendor_name, workshop_type, city_name, address, gst_number,
                contact_person, mobile_number, email_id, pan_card, bank_name,
                account_number, ifsc_code, workshop_status, workshop_photo,
                contact_person_2, alternate_mobile, telephone, owner_name, upi_id
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id;
        """, (
            data.vendor_name, data.workshop_type, data.city_name, data.address, data.gst_number,
            data.contact_person, data.mobile_number, data.email_id, data.pan_card, data.bank_name,
            data.account_number, data.ifsc_code, data.workshop_status, extract_image(data.workshop_photo),
            data.contact_person_2, data.alternate_mobile, data.telephone, data.owner_name, data.upi_id
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": new_id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/workshop/{id}")
def update_workshop_record(id: int, data: WorkshopData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE copy_workshop_vendors SET
                vendor_name=%s, workshop_type=%s, city_name=%s, address=%s, gst_number=%s,
                contact_person=%s, mobile_number=%s, email_id=%s, pan_card=%s, bank_name=%s,
                account_number=%s, ifsc_code=%s, workshop_status=%s, workshop_photo=%s,
                contact_person_2=%s, alternate_mobile=%s, telephone=%s, owner_name=%s, upi_id=%s
            WHERE id=%s RETURNING id;
        """, (
            data.vendor_name, data.workshop_type, data.city_name, data.address, data.gst_number,
            data.contact_person, data.mobile_number, data.email_id, data.pan_card, data.bank_name,
            data.account_number, data.ifsc_code, data.workshop_status, extract_image(data.workshop_photo),
            data.contact_person_2, data.alternate_mobile, data.telephone, data.owner_name, data.upi_id,
            id
        ))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Workshop vendor not found")
        conn.commit()
        return {"success": True, "id": id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/workshop/{id}")
def delete_workshop_record(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM copy_workshop_vendors WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Workshop vendor not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Hubs & Parking Endpoints
# ─────────────────────────────────────────────────────────
@app.get("/api/hub")
def get_all_hubs(search: Optional[str] = None, city: Optional[str] = None, type: Optional[str] = None, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        query = "SELECT * FROM copy_hubs_parking WHERE 1=1"
        params = []
        if search:
            query += " AND (hub_name ILIKE %s OR address ILIKE %s OR hub_manager ILIKE %s)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
        if city and city != "all":
            query += " AND city_name = %s"
            params.append(city)
        if type and type != "all":
            query += " AND facility_type = %s"
            params.append(type)
        query += " ORDER BY id DESC"
        cur.execute(query, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/hub/stats")
def get_hub_stats(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM copy_hubs_parking;")
        total = cur.fetchone()[0]
        cur.execute("SELECT COALESCE(SUM(CAST(NULLIF(total_capacity, '') AS INTEGER)), 0) FROM copy_hubs_parking;")
        capacity = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM copy_hubs_parking WHERE ev_charging = 'Yes';")
        ev = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM copy_hubs_parking WHERE security_cctv = 'Yes';")
        cctv = cur.fetchone()[0]
        return {
            "total_hubs": total,
            "total_capacity": capacity,
            "ev_charging_count": ev,
            "cctv_secured_count": cctv
        }
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/hub/{id}")
def get_single_hub(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM copy_hubs_parking WHERE id = %s;", (id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Hub record not found")
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, row))
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/hub")
def create_hub_record(data: HubData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO copy_hubs_parking (
                hub_name, city_name, address, pincode, facility_type,
                total_capacity, ev_charging, security_cctv, hub_manager,
                manager_phone, operating_hours, hub_photo, contact_person, designation
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id;
        """, (
            data.hub_name, data.city_name, data.address, data.pincode, data.facility_type,
            data.total_capacity, data.ev_charging, data.security_cctv, data.hub_manager,
            data.manager_phone, data.operating_hours, extract_image(data.hub_photo),
            data.contact_person, data.designation
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": new_id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/hub/{id}")
def update_hub_record(id: int, data: HubData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE copy_hubs_parking SET
                hub_name=%s, city_name=%s, address=%s, pincode=%s, facility_type=%s,
                total_capacity=%s, ev_charging=%s, security_cctv=%s, hub_manager=%s,
                manager_phone=%s, operating_hours=%s, hub_photo=%s, contact_person=%s, designation=%s
            WHERE id=%s RETURNING id;
        """, (
            data.hub_name, data.city_name, data.address, data.pincode, data.facility_type,
            data.total_capacity, data.ev_charging, data.security_cctv, data.hub_manager,
            data.manager_phone, data.operating_hours, extract_image(data.hub_photo),
            data.contact_person, data.designation,
            id
        ))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Hub record not found")
        conn.commit()
        return {"success": True, "id": id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/hub/{id}")
def delete_hub_record(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM copy_hubs_parking WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Hub record not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)



# ─────────────────────────────────────────────────────────
# Rents
# ─────────────────────────────────────────────────────────
@app.get("/api/rents")
def get_rents(
    search: Optional[str] = None,
    level: Optional[str] = None,
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        query = "SELECT * FROM copy_rents WHERE 1=1"
        params = []
        if search:
            query += " AND (vehicle_model ILIKE %s OR vehicle_number ILIKE %s OR vendor_id ILIKE %s OR driver_id ILIKE %s)"
            s = f"%{search}%"
            params.extend([s, s, s, s])
        if level:
            query += " AND level = %s"
            params.append(level)
        if status:
            query += " AND status = %s"
            params.append(status)
        query += " ORDER BY id DESC"
        cur.execute(query, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/rents")
def create_rent(data: RentData, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO copy_rents (level, vehicle_manufacturer, vehicle_model, vehicle_number, vehicle_age, vendor_id, driver_id, rent_amount)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id;
        """, (data.level, data.vehicle_manufacturer, data.vehicle_model, data.vehicle_number, data.vehicle_age, data.vendor_id, data.driver_id, data.rent_amount))
        new_id = cur.fetchone()[0]

        entity_type = data.level.capitalize()
        entity_id = ""
        if data.level == "driver": entity_id = data.driver_id or ""
        elif data.level == "vendor": entity_id = data.vendor_id or ""
        elif data.level == "vehicle": entity_id = data.vehicle_number or ""
        elif data.level == "model": entity_id = data.vehicle_model or ""

        from datetime import date
        today_str = date.today().isoformat()

        cur.execute("""
            INSERT INTO copy_rent_ledger (entity_type, entity_id, change_type, old_amount, new_amount, modified_by, effective_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s);
        """, (entity_type, entity_id, "Created", 0, data.rent_amount, user.get("name") or user.get("username"), today_str))

        conn.commit()
        return {"success": True, "id": new_id}
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/rents/{id}")
def update_rent(id: int, data: RentData, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT rent_amount, level, driver_id, vendor_id, vehicle_number, vehicle_model FROM copy_rents WHERE id = %s;", (id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Rent record not found")
        old_rent_amount, old_level, old_driver_id, old_vendor_id, old_vehicle_number, old_vehicle_model = row

        cur.execute("""
            UPDATE copy_rents SET level=%s, vehicle_manufacturer=%s, vehicle_model=%s, vehicle_number=%s, vehicle_age=%s, vendor_id=%s, driver_id=%s, rent_amount=%s
            WHERE id=%s RETURNING id;
        """, (data.level, data.vehicle_manufacturer, data.vehicle_model, data.vehicle_number, data.vehicle_age, data.vendor_id, data.driver_id, data.rent_amount, id))
        cur.fetchone()

        entity_type = data.level.capitalize()
        entity_id = ""
        if data.level == "driver": entity_id = data.driver_id or ""
        elif data.level == "vendor": entity_id = data.vendor_id or ""
        elif data.level == "vehicle": entity_id = data.vehicle_number or ""
        elif data.level == "model": entity_id = data.vehicle_model or ""

        from datetime import date
        today_str = date.today().isoformat()

        cur.execute("""
            INSERT INTO copy_rent_ledger (entity_type, entity_id, change_type, old_amount, new_amount, modified_by, effective_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s);
        """, (entity_type, entity_id, "Updated", old_rent_amount, data.rent_amount, user.get("name") or user.get("username"), today_str))

        conn.commit()
        return {"success": True, "id": id}
    finally:
        postgreSQL_pool.putconn(conn)


@app.put("/api/rents/{id}/status")
def update_rent_status(id: int, request: Request, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    if user.get("role") not in ["Manager", "Admin", "Founder/Admin", "CEO/Admin", "Super Admin", "Business Head", "City Manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to approve")
    
    data = asyncio.run(request.json())
    new_status = data.get("status")
    
    if new_status not in ["Approved", "Rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE copy_rents SET status = %s WHERE id = %s", (new_status, id))
        conn.commit()
        return {"status": "success", "message": f"Rent plan {new_status}"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)


@app.put("/api/rents/{id}/assign")
def assign_rent(id: int, request: Request, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    if user.get("role") not in ["Manager", "Admin", "Founder/Admin", "CEO/Admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to assign")
    
    data = asyncio.run(request.json())
    assigned_to = data.get("assigned_to")
    
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE copy_rents 
            SET assigned_to = %s, assigned_by = %s, assigned_time = NOW() 
            WHERE id = %s
        """, (assigned_to, user.get("name", ""), id))
        conn.commit()
        return {"status": "success", "message": f"Assigned to {assigned_to}"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/rents/{id}")
def delete_rent(id: int, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT rent_amount, level, driver_id, vendor_id, vehicle_number, vehicle_model FROM copy_rents WHERE id = %s;", (id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Rent record not found")
        old_rent_amount, old_level, old_driver_id, old_vendor_id, old_vehicle_number, old_vehicle_model = row

        cur.execute("DELETE FROM copy_rents WHERE id = %s RETURNING id;", (id,))
        cur.fetchone()

        entity_type = old_level.capitalize() if old_level else "Model"
        entity_id = ""
        if old_level == "driver": entity_id = old_driver_id or ""
        elif old_level == "vendor": entity_id = old_vendor_id or ""
        elif old_level == "vehicle": entity_id = old_vehicle_number or ""
        elif old_level == "model": entity_id = old_vehicle_model or ""

        from datetime import date
        today_str = date.today().isoformat()

        cur.execute("""
            INSERT INTO copy_rent_ledger (entity_type, entity_id, change_type, old_amount, new_amount, modified_by, effective_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s);
        """, (entity_type, entity_id, "Deleted", old_rent_amount, 0, user.get("name") or user.get("username"), today_str))

        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/rent-ledger")
def get_rent_ledger(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM copy_rent_ledger ORDER BY id DESC;")
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Accidents
# ─────────────────────────────────────────────────────────
@app.get("/api/accident")
def get_accidents(
    search: Optional[str] = None,
    city: Optional[str] = None,
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        query = """
            SELECT id, vehicle_number, vendor_name, city_name, date_of_accident, 
                   time_of_accident, driver_name, vehicle_status, repair_cost, created_at 
            FROM copy_accidents_registry WHERE 1=1
        """
        params = []
        if search:
            query += " AND (vehicle_number ILIKE %s OR vendor_name ILIKE %s OR driver_name ILIKE %s OR driver_id ILIKE %s)"
            s = f"%{search}%"
            params.extend([s, s, s, s])
        if city and city != "all":
            query += " AND city_name = %s"
            params.append(city)
        if status and status != "all":
            query += " AND vehicle_status = %s"
            params.append(status)
            
        query += " ORDER BY id DESC"
        cur.execute(query, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/accident/stats")
def get_accident_stats(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*), COALESCE(SUM(CAST(NULLIF(repair_cost, '') AS NUMERIC)), 0) FROM copy_accidents_registry;")
        total, total_cost = cur.fetchone()
        
        cur.execute("SELECT COUNT(*) FROM copy_accidents_registry WHERE vehicle_status = 'Drivable';")
        drivable = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM copy_accidents_registry WHERE vehicle_status = 'Needs Towing';")
        needs_towing = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM copy_accidents_registry WHERE vehicle_status = 'Impounded by Police';")
        impounded = cur.fetchone()[0]
        
        return {
            "total_accidents": total,
            "total_repair_cost": int(total_cost),
            "drivable_count": drivable,
            "needs_towing_count": needs_towing,
            "impounded_count": impounded
        }
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/accident/{id}")
def get_accident(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM copy_accidents_registry WHERE id = %s;", (id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Accident record not found")
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, row))
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/accident")
def create_accident(data: AccidentData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO copy_accidents_registry (
                vehicle_number, vendor_id, vendor_name, city_name, date_of_accident, time_of_accident, place_of_accident, vehicle_status,
                driver_id, driver_name, no_of_persons, third_party_involvement, fir_filed,
                accident_reason, accident_inspection, insurance_status, repair_cost, toeing_cost, challan_amount, fine_amount, comments,
                front_vehicle_photo, back_vehicle_photo, right_vehicle_photo, left_vehicle_photo, fir_document_copy
            ) VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s
            ) RETURNING id;
        """, (
            data.vehicle_number, data.vendor_id, data.vendor_name, data.city_name, data.date_of_accident, data.time_of_accident, data.place_of_accident, data.vehicle_status,
            data.driver_id, data.driver_name, data.no_of_persons, data.third_party_involvement, data.fir_filed,
            data.accident_reason, data.accident_inspection, data.insurance_status, data.repair_cost, data.toeing_cost, data.challan_amount, data.fine_amount, data.comments,
            extract_image(data.front_vehicle_photo), extract_image(data.back_vehicle_photo), extract_image(data.right_vehicle_photo), extract_image(data.left_vehicle_photo), extract_image(data.fir_document_copy)
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/accident/{id}")
def update_accident(id: int, data: AccidentData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE copy_accidents_registry SET 
                vehicle_number=%s, vendor_id=%s, vendor_name=%s, city_name=%s, date_of_accident=%s, time_of_accident=%s, place_of_accident=%s, vehicle_status=%s,
                driver_id=%s, driver_name=%s, no_of_persons=%s, third_party_involvement=%s, fir_filed=%s,
                accident_reason=%s, accident_inspection=%s, insurance_status=%s, repair_cost=%s, toeing_cost=%s, challan_amount=%s, fine_amount=%s, comments=%s,
                front_vehicle_photo=%s, back_vehicle_photo=%s, right_vehicle_photo=%s, left_vehicle_photo=%s, fir_document_copy=%s
            WHERE id = %s RETURNING id;
        """, (
            data.vehicle_number, data.vendor_id, data.vendor_name, data.city_name, data.date_of_accident, data.time_of_accident, data.place_of_accident, data.vehicle_status,
            data.driver_id, data.driver_name, data.no_of_persons, data.third_party_involvement, data.fir_filed,
            data.accident_reason, data.accident_inspection, data.insurance_status, data.repair_cost, data.toeing_cost, data.challan_amount, data.fine_amount, data.comments,
            extract_image(data.front_vehicle_photo), extract_image(data.back_vehicle_photo), extract_image(data.right_vehicle_photo), extract_image(data.left_vehicle_photo), extract_image(data.fir_document_copy),
            id
        ))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Accident record not found")
        conn.commit()
        return {"success": True, "id": id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/accident/{id}")
def delete_accident(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM copy_accidents_registry WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Accident record not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Inspections
# ─────────────────────────────────────────────────────────
@app.get("/api/inspection")
def get_inspections(
    search: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        query = "SELECT * FROM copy_inspections WHERE 1=1"
        params = []
        if search:
            query += " AND (vehicle_number ILIKE %s OR remarks ILIKE %s)"
            s = f"%{search}%"
            params.extend([s, s])
        query += " ORDER BY id DESC"
        cur.execute(query, params)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/inspection/stats")
def get_inspection_stats(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*), COUNT(DISTINCT vehicle_number) FROM copy_inspections;")
        total, unique_vehicles = cur.fetchone()
        return {
            "total_inspections": total,
            "unique_vehicles": unique_vehicles
        }
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/inspection/last/{vehicle_number}")
def get_last_inspection(vehicle_number: str, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM copy_inspections WHERE vehicle_number ILIKE %s ORDER BY id DESC LIMIT 1;", (vehicle_number.strip(),))
        row = cur.fetchone()
        if not row:
            return None
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, row))
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/inspection/{id}")
def get_inspection(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM copy_inspections WHERE id = %s;", (id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Inspection record not found")
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, row))
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/inspection")
def create_inspection(data: InspectionData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO copy_inspections (
                vehicle_number, inspection_date, odometer_reading, jack, jack_rod, spanner, 
                parking_triangle, fire_extinguishers, seat_cover, floor_carpet, key_quantity,
                photo_front, photo_back, photo_lh, photo_rh, photo_engine_chassis, photo_battery, 
                photo_engine_compartment, photo_fast_tag, photo_music_system, 
                photo_tyre_rh_fr, photo_tyre_lh_fr, photo_tyre_rh_re, photo_tyre_lh_re, photo_tyre_spare, 
                remarks, music_system
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id;
        """, (
            data.vehicle_number, data.inspection_date, data.odometer_reading, data.jack, data.jack_rod, data.spanner,
            data.parking_triangle, data.fire_extinguishers, data.seat_cover, data.floor_carpet, data.key_quantity,
            extract_image(data.photo_front), extract_image(data.photo_back), extract_image(data.photo_lh), extract_image(data.photo_rh),
            extract_image(data.photo_engine_chassis), extract_image(data.photo_battery), extract_image(data.photo_engine_compartment),
            extract_image(data.photo_fast_tag), extract_image(data.photo_music_system), 
            extract_image(data.photo_tyre_rh_fr), extract_image(data.photo_tyre_lh_fr), extract_image(data.photo_tyre_rh_re),
            extract_image(data.photo_tyre_lh_re), extract_image(data.photo_tyre_spare),
            data.remarks, data.music_system
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/inspection/{id}")
def update_inspection(id: int, data: InspectionData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE copy_inspections SET 
                vehicle_number=%s, inspection_date=%s, odometer_reading=%s, jack=%s, jack_rod=%s, spanner=%s, 
                parking_triangle=%s, fire_extinguishers=%s, seat_cover=%s, floor_carpet=%s, key_quantity=%s,
                photo_front=%s, photo_back=%s, photo_lh=%s, photo_rh=%s, photo_engine_chassis=%s, photo_battery=%s, 
                photo_engine_compartment=%s, photo_fast_tag=%s, photo_music_system=%s, 
                photo_tyre_rh_fr=%s, photo_tyre_lh_fr=%s, photo_tyre_rh_re=%s, photo_tyre_lh_re=%s, photo_tyre_spare=%s, 
                remarks=%s, music_system=%s
            WHERE id=%s RETURNING id;
        """, (
            data.vehicle_number, data.inspection_date, data.odometer_reading, data.jack, data.jack_rod, data.spanner,
            data.parking_triangle, data.fire_extinguishers, data.seat_cover, data.floor_carpet, data.key_quantity,
            extract_image(data.photo_front), extract_image(data.photo_back), extract_image(data.photo_lh), extract_image(data.photo_rh),
            extract_image(data.photo_engine_chassis), extract_image(data.photo_battery), extract_image(data.photo_engine_compartment),
            extract_image(data.photo_fast_tag), extract_image(data.photo_music_system), 
            extract_image(data.photo_tyre_rh_fr), extract_image(data.photo_tyre_lh_fr), extract_image(data.photo_tyre_rh_re),
            extract_image(data.photo_tyre_lh_re), extract_image(data.photo_tyre_spare),
            data.remarks, data.music_system, id
        ))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Inspection record not found")
        conn.commit()
        return {"success": True, "id": id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/inspection/{id}")
def delete_inspection(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM copy_inspections WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Inspection record not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Roles & Permissions
# ─────────────────────────────────────────────────────────

class RoleData(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: List[str] = []

@app.get("/api/roles")
def get_roles(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, name, description FROM app_roles ORDER BY id;")
        roles = []
        for r in cur.fetchall():
            cur.execute("""
                SELECT p.name FROM app_role_permissions arp
                JOIN app_permissions p ON p.id = arp.permission_id
                WHERE arp.role_id = %s;
            """, (r[0],))
            permissions = [p[0] for p in cur.fetchall()]
            roles.append({"id": r[0], "name": r[1], "description": r[2], "permissions": permissions})
        return roles
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/roles")
def create_or_update_role(req: RoleData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM app_roles WHERE name = %s;", (req.name,))
        row = cur.fetchone()
        if row:
            role_id = row[0]
            cur.execute("UPDATE app_roles SET description = %s WHERE id = %s;", (req.description, role_id))
        else:
            cur.execute("INSERT INTO app_roles (name, description) VALUES (%s, %s) RETURNING id;", (req.name, req.description))
            role_id = cur.fetchone()[0]
            
        cur.execute("DELETE FROM app_role_permissions WHERE role_id = %s;", (role_id,))
        for perm in req.permissions:
            cur.execute("INSERT INTO app_permissions (name) VALUES (%s) ON CONFLICT (name) DO NOTHING;", (perm,))
            cur.execute("SELECT id FROM app_permissions WHERE name = %s;", (perm,))
            perm_id = cur.fetchone()[0]
            cur.execute("INSERT INTO app_role_permissions (role_id, permission_id) VALUES (%s, %s);", (role_id, perm_id))
            
        conn.commit()
        return {"success": True, "role_id": role_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/roles/{id}")
def delete_role(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM app_roles WHERE id = %s RETURNING id;", (id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Role not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)

# ─────────────────────────────────────────────────────────
# Tickets
# ─────────────────────────────────────────────────────────

class TicketData(BaseModel):
    title: str
    description: str
    source: str
    status: Optional[str] = "Open"
    assigned_to: Optional[int] = None

@app.get("/api/tickets")
def get_tickets(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT t.id, t.title, t.description, t.source, t.status, 
                   t.created_by_name, t.assigned_to, u.name as assignee_name, 
                   t.created_at, t.resolved_at, t.resolution_notes
            FROM copy_tickets t
            LEFT JOIN copy_app_users au ON au.id = t.assigned_to
            LEFT JOIN copy_users u ON u.id = au.executive_id
            ORDER BY t.created_at DESC;
        """)
        keys = ["id", "title", "description", "source", "status", "created_by_name", "assigned_to", "assignee_name", "created_at", "resolved_at", "resolution_notes"]
        return [dict(zip(keys, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/tickets")
def create_ticket(req: TicketData, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO copy_tickets (title, description, source, status, created_by_name, assigned_to)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING id;
        """, (req.title, req.description, req.source, req.status, user["name"], req.assigned_to))
        ticket_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": ticket_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/tickets/{id}/resolve")
def resolve_ticket(id: int, data: dict, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    notes = data.get("resolution_notes", "")
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE copy_tickets 
            SET status = 'Resolved', resolved_at = NOW(), resolution_notes = %s 
            WHERE id = %s RETURNING id;
        """, (notes, id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Ticket not found")
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

class MaintenanceData(BaseModel):
    vehicle_number: str
    city_name: str
    model: str
    vehicle_k_m_s: str
    repair_type: str
    vehicle_location: Optional[str] = None
    vehicle_in_date: str
    initial_remarks: Optional[str] = None
    vehicle_damage_photos: Optional[Any] = None
    
    workshop_name: str
    allocation_date: Optional[str] = None
    estimated_delivery_date: Optional[str] = None
    estimated_amount: Optional[str] = None
    insurance_claimed: str
    claim_number: Optional[str] = None
    insurance_brokerage: Optional[str] = None
    approved_by: Optional[str] = None
    approval_date: Optional[str] = None
    approval_file: Optional[Any] = None
    
    maintenance_status: Optional[str] = None
    vehicle_status_date: Optional[str] = None
    daily_vehicle_remarks: Optional[str] = None
    rfd_date: Optional[str] = None
    delivered_date: Optional[str] = None
    final_status: Optional[str] = None
    tat: Optional[str] = None
    pdi_status: Optional[str] = None
    maintenance_steps: Optional[Union[List[Any], str]] = None
    
    invoice_no: Optional[str] = None
    invoice_date: Optional[str] = None
    invoice_amount: Optional[str] = None
    insurance_liability_discounts: Optional[str] = None
    letzryd_payable: Optional[str] = None
    payment_status: Optional[str] = None
    type_of_payment: Optional[str] = None
    utr_no: Optional[str] = None
    entry_remarks: Optional[str] = None
    invoice_file: Optional[Any] = None
    invoices: Optional[Union[List[Any], str]] = None
    
    pdi_front_photo: Optional[Any] = None
    pdi_back_photo: Optional[Any] = None
    pdi_lh_photo: Optional[Any] = None
    pdi_rh_photo: Optional[Any] = None
    pdi_engine_photo: Optional[Any] = None
    engine_chassis_no: Optional[str] = None
    battery_sl_no: Optional[str] = None
    fast_tag: Optional[str] = None
    pdi_jack: Optional[str] = None
    pdi_jack_rod: Optional[str] = None
    pdi_spanner: Optional[str] = None
    pdi_parking_triangle: Optional[str] = None
    pdi_fire_extinguisher: Optional[str] = None
    pdi_seat_cover: Optional[str] = None
    pdi_floor_carpet: Optional[str] = None
    pdi_music_system: Optional[str] = None
    pdi_spare_wheel: Optional[str] = None
    pdi_key_quantity: Optional[str] = None
    pdi_rh_front_tyre: Optional[str] = None
    pdi_lh_front_tyre: Optional[str] = None
    pdi_rh_rear_tyre: Optional[str] = None
    pdi_lh_rear_tyre: Optional[str] = None

@app.get("/api/maintenance")
def get_all_maintenance_jobs(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, vehicle_in_date, vehicle_number, workshop_name, repair_type, 
                   city_name, estimated_amount, maintenance_status, created_at 
            FROM copy_maintenance_registry ORDER BY id DESC;
        """)
        cols = [d[0] for d in cur.description]
        result = [dict(zip(cols, row)) for row in cur.fetchall()]
        return result
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/maintenance/{id}")
def get_maintenance_job(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM copy_maintenance_registry WHERE id = %s;", (id,))
        r = cur.fetchone()
        if not r: raise HTTPException(status_code=404, detail="Record not found")
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, r))
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/maintenance")
def create_maintenance_job(data: MaintenanceData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO copy_maintenance_registry (
                vehicle_number, city_name, model, vehicle_k_m_s, repair_type, vehicle_location, vehicle_in_date, initial_remarks, vehicle_damage_photos,
                workshop_name, allocation_date, estimated_delivery_date, estimated_amount, insurance_claimed, claim_number, insurance_brokerage, approved_by, approval_date, approval_file,
                maintenance_status, vehicle_status_date, daily_vehicle_remarks, rfd_date, delivered_date, final_status, tat, pdi_status,
                invoice_no, invoice_date, invoice_amount, insurance_liability_discounts, letzryd_payable, payment_status, type_of_payment, utr_no, entry_remarks, invoice_file, invoices, maintenance_steps,
                pdi_front_photo, pdi_back_photo, pdi_lh_photo, pdi_rh_photo, pdi_engine_photo, engine_chassis_no, battery_sl_no, fast_tag, pdi_jack, pdi_jack_rod, pdi_spanner, pdi_parking_triangle, pdi_fire_extinguisher, pdi_seat_cover, pdi_floor_carpet, pdi_music_system, pdi_spare_wheel, pdi_key_quantity, pdi_rh_front_tyre, pdi_lh_front_tyre, pdi_rh_rear_tyre, pdi_lh_rear_tyre
            ) VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
            ) RETURNING id;
        """, (
            data.vehicle_number, data.city_name, data.model, data.vehicle_k_m_s, data.repair_type, data.vehicle_location, data.vehicle_in_date, data.initial_remarks, extract_image(data.vehicle_damage_photos),
            data.workshop_name, data.allocation_date, data.estimated_delivery_date, data.estimated_amount, data.insurance_claimed, data.claim_number, data.insurance_brokerage, data.approved_by, data.approval_date, extract_image(data.approval_file),
            data.maintenance_status, data.vehicle_status_date, data.daily_vehicle_remarks, data.rfd_date, data.delivered_date, data.final_status, data.tat, data.pdi_status,
            data.invoice_no, data.invoice_date, data.invoice_amount, data.insurance_liability_discounts, data.letzryd_payable, data.payment_status, data.type_of_payment, data.utr_no, data.entry_remarks, extract_image(data.invoice_file), None, None,
            extract_image(data.pdi_front_photo), extract_image(data.pdi_back_photo), extract_image(data.pdi_lh_photo), extract_image(data.pdi_rh_photo), extract_image(data.pdi_engine_photo), data.engine_chassis_no, data.battery_sl_no, data.fast_tag, data.pdi_jack, data.pdi_jack_rod, data.pdi_spanner, data.pdi_parking_triangle, data.pdi_fire_extinguisher, data.pdi_seat_cover, data.pdi_floor_carpet, data.pdi_music_system, data.pdi_spare_wheel, data.pdi_key_quantity, data.pdi_rh_front_tyre, data.pdi_lh_front_tyre, data.pdi_rh_rear_tyre, data.pdi_lh_rear_tyre
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/maintenance/{id}")
def update_maintenance_job(id: int, data: MaintenanceData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE copy_maintenance_registry SET 
                vehicle_number=%s, city_name=%s, model=%s, vehicle_k_m_s=%s, repair_type=%s, vehicle_location=%s, vehicle_in_date=%s, initial_remarks=%s, vehicle_damage_photos=%s,
                workshop_name=%s, allocation_date=%s, estimated_delivery_date=%s, estimated_amount=%s, insurance_claimed=%s, claim_number=%s, insurance_brokerage=%s, approved_by=%s, approval_date=%s, approval_file=%s,
                maintenance_status=%s, vehicle_status_date=%s, daily_vehicle_remarks=%s, rfd_date=%s, delivered_date=%s, final_status=%s, tat=%s, pdi_status=%s,
                invoice_no=%s, invoice_date=%s, invoice_amount=%s, insurance_liability_discounts=%s, letzryd_payable=%s, payment_status=%s, type_of_payment=%s, utr_no=%s, entry_remarks=%s, invoice_file=%s,
                pdi_front_photo=%s, pdi_back_photo=%s, pdi_lh_photo=%s, pdi_rh_photo=%s, pdi_engine_photo=%s, engine_chassis_no=%s, battery_sl_no=%s, fast_tag=%s, pdi_jack=%s, pdi_jack_rod=%s, pdi_spanner=%s, pdi_parking_triangle=%s, pdi_fire_extinguisher=%s, pdi_seat_cover=%s, pdi_floor_carpet=%s, pdi_music_system=%s, pdi_spare_wheel=%s, pdi_key_quantity=%s, pdi_rh_front_tyre=%s, pdi_lh_front_tyre=%s, pdi_rh_rear_tyre=%s, pdi_lh_rear_tyre=%s
            WHERE id = %s;
        """, (
            data.vehicle_number, data.city_name, data.model, data.vehicle_k_m_s, data.repair_type, data.vehicle_location, data.vehicle_in_date, data.initial_remarks, extract_image(data.vehicle_damage_photos),
            data.workshop_name, data.allocation_date, data.estimated_delivery_date, data.estimated_amount, data.insurance_claimed, data.claim_number, data.insurance_brokerage, data.approved_by, data.approval_date, extract_image(data.approval_file),
            data.maintenance_status, data.vehicle_status_date, data.daily_vehicle_remarks, data.rfd_date, data.delivered_date, data.final_status, data.tat, data.pdi_status,
            data.invoice_no, data.invoice_date, data.invoice_amount, data.insurance_liability_discounts, data.letzryd_payable, data.payment_status, data.type_of_payment, data.utr_no, data.entry_remarks, extract_image(data.invoice_file),
            extract_image(data.pdi_front_photo), extract_image(data.pdi_back_photo), extract_image(data.pdi_lh_photo), extract_image(data.pdi_rh_photo), extract_image(data.pdi_engine_photo), data.engine_chassis_no, data.battery_sl_no, data.fast_tag, data.pdi_jack, data.pdi_jack_rod, data.pdi_spanner, data.pdi_parking_triangle, data.pdi_fire_extinguisher, data.pdi_seat_cover, data.pdi_floor_carpet, data.pdi_music_system, data.pdi_spare_wheel, data.pdi_key_quantity, data.pdi_rh_front_tyre, data.pdi_lh_front_tyre, data.pdi_rh_rear_tyre, data.pdi_lh_rear_tyre,
            id
        ))
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/maintenance/{id}")
def delete_maintenance_job(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM copy_maintenance_registry WHERE id = %s RETURNING id;", (id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Maintenance job not found")
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

class ChallanData(BaseModel):
    challan_number: str
    vehicle_number: str
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    violation_date: str
    violation_location: Optional[str] = None
    challan_amount: int
    internal_fine_amount: int = 0
    recovery_status: str = "Follow Up Required"
    recovered_amount: int = 0
    remarks: Optional[str] = None
    challan_photo: Optional[Any] = None

@app.get("/api/challans")
def get_all_challans(authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, challan_number, vehicle_number, driver_id, driver_name, 
                   violation_date, violation_location, challan_amount, internal_fine_amount,
                   recovery_status, recovered_amount, remarks, created_at
            FROM copy_traffic_challans ORDER BY id DESC;
        """)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)

@app.get("/api/challans/{id}")
def get_challan(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM copy_traffic_challans WHERE id = %s;", (id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Challan not found")
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, row))
    finally:
        postgreSQL_pool.putconn(conn)

@app.post("/api/challans")
def create_challan(data: ChallanData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM copy_traffic_challans WHERE challan_number = %s;", (data.challan_number,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Challan number already exists")

        cur.execute("""
            INSERT INTO copy_traffic_challans (
                challan_number, vehicle_number, driver_id, driver_name, 
                violation_date, violation_location, challan_amount, internal_fine_amount,
                recovery_status, recovered_amount, remarks, challan_photo
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id;
        """, (
            data.challan_number, data.vehicle_number, data.driver_id, data.driver_name,
            data.violation_date, data.violation_location, data.challan_amount, data.internal_fine_amount,
            data.recovery_status, data.recovered_amount, data.remarks, extract_image(data.challan_photo)
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "id": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.put("/api/challans/{id}")
def update_challan(id: int, data: ChallanData, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE copy_traffic_challans SET 
                challan_number=%s, vehicle_number=%s, driver_id=%s, driver_name=%s, 
                violation_date=%s, violation_location=%s, challan_amount=%s, internal_fine_amount=%s,
                recovery_status=%s, recovered_amount=%s, remarks=%s, challan_photo=%s
            WHERE id=%s RETURNING id;
        """, (
            data.challan_number, data.vehicle_number, data.driver_id, data.driver_name,
            data.violation_date, data.violation_location, data.challan_amount, data.internal_fine_amount,
            data.recovery_status, data.recovered_amount, data.remarks, extract_image(data.challan_photo),
            id
        ))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Challan not found")
        conn.commit()
        return {"success": True, "id": id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)

@app.delete("/api/challans/{id}")
def delete_challan(id: int, authorization: Optional[str] = Header(None)):
    get_current_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM copy_traffic_challans WHERE id = %s RETURNING id;", (id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Challan not found")
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# JULY RBAC — Approval System APIs
# ─────────────────────────────────────────────────────────

def get_july_user(authorization: Optional[str] = Header(None)):
    """Get current user from july_portal_users via session token with clean fallback."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        
        # 1. Try direct match on july_portal_users.portal_user_id
        cur.execute("""
            SELECT pu.portal_user_id, e.first_name || ' ' || COALESCE(e.last_name, ''), 
                   r.role_name, pu.username, e.city, pu.role_id
            FROM copy_app_sessions s
            JOIN july_portal_users pu ON pu.portal_user_id = s.user_id
            JOIN july_employees e ON e.employee_id = pu.employee_id
            JOIN july_roles r ON r.role_id = pu.role_id
            WHERE s.token = %s;
        """, (token,))
        row = cur.fetchone()
        
        # 2. If session token was created by legacy copy_app_users, map by copy_app_users.username or role
        if not row:
            cur.execute("""
                SELECT s.user_id, cau.username, ar.name
                FROM copy_app_sessions s
                LEFT JOIN copy_app_users cau ON cau.id = s.user_id
                LEFT JOIN app_roles ar ON ar.id = cau.role_id
                WHERE s.token = %s;
            """, (token,))
            s_row = cur.fetchone()
            if s_row:
                s_uid, s_uname, s_rname = s_row
                s_uname = s_uname or ''
                s_rname = s_rname or ''

                # Map admin -> super_admin, manager -> manager, etc.
                target_username = 'manager'
                if 'admin' in s_uname.lower() or 'admin' in s_rname.lower():
                    target_username = 'super_admin'
                elif 'dev' in s_uname.lower() or 'dev' in s_rname.lower():
                    target_username = 'developer'
                elif 'manager' in s_uname.lower() or 'manager' in s_rname.lower():
                    target_username = 'manager'
                elif 'executive' in s_uname.lower() or 'exec' in s_rname.lower():
                    target_username = 'executive'

                cur.execute("""
                    SELECT pu.portal_user_id, e.first_name || ' ' || COALESCE(e.last_name, ''), 
                           r.role_name, pu.username, e.city, pu.role_id
                    FROM july_portal_users pu
                    JOIN july_employees e ON e.employee_id = pu.employee_id
                    JOIN july_roles r ON r.role_id = pu.role_id
                    WHERE pu.username = %s;
                """, (target_username,))
                row = cur.fetchone()

        # 3. Default fallback to @super_admin if still not resolved
        if not row:
            cur.execute("""
                SELECT pu.portal_user_id, e.first_name || ' ' || COALESCE(e.last_name, ''), 
                       r.role_name, pu.username, e.city, pu.role_id
                FROM july_portal_users pu
                JOIN july_employees e ON e.employee_id = pu.employee_id
                JOIN july_roles r ON r.role_id = pu.role_id
                WHERE pu.username = 'super_admin';
            """)
            row = cur.fetchone()

        if row:
            role_name = row[2]
            return {
                "portal_user_id": row[0],
                "name": row[1].strip(),
                "role": role_name,
                "username": row[3],
                "city": row[4],
                "role_id": row[5],
                "is_super_admin_or_dev": role_name in ["Developer", "Super Admin"]
            }
        
        raise HTTPException(status_code=401, detail="Invalid session")
    finally:
        postgreSQL_pool.putconn(conn)


@app.get("/api/july/approvers")
def get_approvers(authorization: Optional[str] = Header(None)):
    """Return list of valid approvers for current user (excluding Super Admin)."""
    user = get_july_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT pu.portal_user_id, pu.username, 
                   e.first_name || ' ' || COALESCE(e.last_name, '') AS full_name,
                   r.role_name, COALESCE(e.city, 'Hyderabad')
            FROM july_portal_users pu
            JOIN july_employees e ON e.employee_id = pu.employee_id
            JOIN july_roles r ON r.role_id = pu.role_id
            WHERE pu.account_status = 'Active'
              AND pu.portal_user_id != %s
            ORDER BY 
              CASE WHEN e.city = %s THEN 0 ELSE 1 END,
              r.role_id, e.first_name;
        """, (user["portal_user_id"], user["city"]))
        rows = cur.fetchall()
        return [
            {"id": r[0], "username": r[1], "name": r[2].strip(), "role": r[3], "city": r[4]}
            for r in rows
        ]
    finally:
        postgreSQL_pool.putconn(conn)


@app.get("/api/july/pending-approvals")
def get_pending_approvals(authorization: Optional[str] = Header(None)):
    """Get pending approvals assigned specifically to the current user (Strict Personal Inbox for ALL roles)."""
    user = get_july_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        uid = user["portal_user_id"]
        pending = []

        # Strict personal filter + City check for non-global roles
        is_global = user.get("role_code") in ["SA", "BH", "FL", "FE", "AU"] or user.get("role") in ["Super Admin", "Admin", "Business Head"]
        user_city = user.get("city")

        where_cond = f"WHERE o.current_approver_id = {uid} AND o.approval_status LIKE 'Pending%%'"
        where_v_cond = f"WHERE v.current_approver_id = {uid} AND v.approval_status LIKE 'Pending%%'"
        where_t_cond = f"WHERE t.current_approver_id = {uid} AND t.approval_status LIKE 'Pending%%'"



        # Onboarding pending
        cur.execute(f"""
            SELECT o.onboarding_id, 
                   CASE WHEN o.driver_plan ILIKE '%%Operator%%' OR o.driver_plan ILIKE '%%Partner%%' THEN 'operator_onboarding' ELSE 'individual_onboarding' END AS module, 
                   o.driver_name AS title, o.city, o.driver_plan AS subtitle,
                   o.approval_status, o.created_at,
                   sub.username AS submitted_by,
                   COALESCE(sub_e.first_name || ' ' || COALESCE(sub_e.last_name,'') || ' (' || COALESCE(sub_r.role_name, 'Onboarding Executive') || ' — ' || COALESCE(sub_e.city, 'Hyderabad') || ')', sub.username, 'Onboarding Executive 1 (Onboarding Executive — Hyderabad)') AS submitted_by_name,
                   app_u.username AS current_approver,
                   COALESCE(app_e.first_name || ' ' || COALESCE(app_e.last_name,'') || ' (' || COALESCE(app_r.role_name, 'City Manager') || ' — ' || COALESCE(app_e.city, 'Hyderabad') || ')', app_u.username, 'City Manager 1 (City Manager — Hyderabad)') AS current_approver_name,
                   o.daily_rent, o.security_deposit
            FROM july_onboarding o
            LEFT JOIN july_portal_users sub ON sub.portal_user_id = o.created_by
            LEFT JOIN july_employees sub_e ON sub_e.employee_id = sub.employee_id
            LEFT JOIN july_roles sub_r ON sub_r.role_id = sub.role_id
            LEFT JOIN july_portal_users app_u ON app_u.portal_user_id = o.current_approver_id
            LEFT JOIN july_employees app_e ON app_e.employee_id = app_u.employee_id
            LEFT JOIN july_roles app_r ON app_r.role_id = app_u.role_id
            {where_cond} ORDER BY o.created_at DESC;
        """)
        for r in cur.fetchall():
            mod = r[1]
            mod_lbl = "Partner / Operator Onboarding" if mod == "operator_onboarding" else "Driver Onboarding"
            pending.append({"id": r[0], "module": mod, "module_label": mod_lbl,
                            "title": r[2], "city": r[3], "subtitle": r[4],
                            "approval_status": r[5], "created_at": r[6].isoformat() if r[6] else None,
                            "submitted_by": r[7], "submitted_by_name": r[8].strip(),
                            "current_approver": r[9], "current_approver_name": r[10].strip(),
                            "daily_rent": float(r[11]) if r[11] is not None else 850.0,
                            "security_deposit": float(r[12]) if r[12] is not None else 10000.0})

        # Vehicles pending
        cur.execute(f"""
            SELECT v.vehicle_id, 'vehicle_onboarding' AS module,
                   v.vehicle_number AS title, v.city, v.manufacturer || ' ' || v.model AS subtitle,
                   v.approval_status, v.created_at,
                   sub.username AS submitted_by,
                   COALESCE(sub_e.first_name || ' ' || COALESCE(sub_e.last_name,'') || ' (' || COALESCE(sub_r.role_name, 'Onboarding Executive') || ' — ' || COALESCE(sub_e.city, 'Hyderabad') || ')', sub.username, 'Onboarding Executive 1 (Onboarding Executive — Hyderabad)') AS submitted_by_name,
                   app_u.username AS current_approver,
                   COALESCE(app_e.first_name || ' ' || COALESCE(app_e.last_name,'') || ' (' || COALESCE(app_r.role_name, 'City Manager') || ' — ' || COALESCE(app_e.city, 'Hyderabad') || ')', app_u.username, 'City Manager 1 (City Manager — Hyderabad)') AS current_approver_name,
                   v.daily_rent, v.security_deposit
            FROM july_vehicles v
            LEFT JOIN july_portal_users sub ON sub.portal_user_id = v.created_by
            LEFT JOIN july_employees sub_e ON sub_e.employee_id = sub.employee_id
            LEFT JOIN july_roles sub_r ON sub_r.role_id = sub.role_id
            LEFT JOIN july_portal_users app_u ON app_u.portal_user_id = v.current_approver_id
            LEFT JOIN july_employees app_e ON app_e.employee_id = app_u.employee_id
            LEFT JOIN july_roles app_r ON app_r.role_id = app_u.role_id
            {where_v_cond} ORDER BY v.created_at DESC;
        """)
        for r in cur.fetchall():
            pending.append({"id": r[0], "module": r[1], "module_label": "Vehicle Onboarding",
                            "title": r[2], "city": r[3], "subtitle": r[4],
                            "approval_status": r[5], "created_at": r[6].isoformat() if r[6] else None,
                            "submitted_by": r[7], "submitted_by_name": r[8].strip(),
                            "current_approver": r[9], "current_approver_name": r[10].strip(),
                            "daily_rent": 0.0,
                            "security_deposit": 0.0})

        # Tickets pending escalation
        cur.execute(f"""
            SELECT t.ticket_id, 'tickets_desk' AS module,
                   t.ticket_number AS title, t.city, t.issue_type AS subtitle,
                   t.approval_status, t.created_at,
                   sub.username AS submitted_by,
                   COALESCE(sub_e.first_name || ' ' || COALESCE(sub_e.last_name,'') || ' (' || COALESCE(sub_r.role_name, 'Support Executive') || ' — ' || COALESCE(sub_e.city, 'Hyderabad') || ')', sub.username, 'Support Executive 1 (Support Executive — Hyderabad)') AS submitted_by_name,
                   app_u.username AS current_approver,
                   COALESCE(app_e.first_name || ' ' || COALESCE(app_e.last_name,'') || ' (' || COALESCE(app_r.role_name, 'City Manager') || ' — ' || COALESCE(app_e.city, 'Hyderabad') || ')', app_u.username, 'City Manager 1 (City Manager — Hyderabad)') AS current_approver_name
            FROM july_tickets t
            LEFT JOIN july_portal_users sub ON sub.portal_user_id = t.created_by
            LEFT JOIN july_employees sub_e ON sub_e.employee_id = sub.employee_id
            LEFT JOIN july_roles sub_r ON sub_r.role_id = sub.role_id
            LEFT JOIN july_portal_users app_u ON app_u.portal_user_id = t.current_approver_id
            LEFT JOIN july_employees app_e ON app_e.employee_id = app_u.employee_id
            LEFT JOIN july_roles app_r ON app_r.role_id = app_u.role_id
            {where_t_cond} ORDER BY t.created_at DESC;
        """)
        for r in cur.fetchall():
            pending.append({"id": r[0], "module": r[1], "module_label": "Tickets Desk",
                            "title": r[2], "city": r[3], "subtitle": r[4],
                            "approval_status": r[5], "created_at": r[6].isoformat() if r[6] else None,
                            "submitted_by": r[7], "submitted_by_name": r[8].strip(),
                            "current_approver": r[9], "current_approver_name": r[10].strip(),
                            "daily_rent": 0.0, "security_deposit": 0.0})

        return pending
    finally:
        postgreSQL_pool.putconn(conn)


@app.get("/api/july/my-submissions")
def get_my_submissions(authorization: Optional[str] = Header(None)):
    """Get all records submitted by the current user across all modules."""
    user = get_july_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        uid = user["portal_user_id"]
        submissions = []

        cur.execute("""
            SELECT o.onboarding_id, 
                   CASE WHEN o.driver_plan ILIKE '%%Operator%%' OR o.driver_plan ILIKE '%%Partner%%' THEN 'operator_onboarding' ELSE 'individual_onboarding' END,
                   CASE WHEN o.driver_plan ILIKE '%%Operator%%' OR o.driver_plan ILIKE '%%Partner%%' THEN 'Partner / Operator Onboarding' ELSE 'Driver Onboarding' END,
                   o.driver_name, o.city, o.driver_plan, o.approval_status, o.created_at,
                   app_u.username,
                   COALESCE(app_e.first_name || ' ' || COALESCE(app_e.last_name,'') || ' (' || COALESCE(app_r.role_name, 'City Manager') || ' — ' || COALESCE(app_e.city, 'Hyderabad') || ')', app_u.username, 'City Manager 1 (City Manager — Hyderabad)') AS current_approver_name,
                   o.approval_remarks,
                   sub.username,
                   COALESCE(sub_e.first_name || ' ' || COALESCE(sub_e.last_name,'') || ' (' || COALESCE(sub_r.role_name, 'Onboarding Executive') || ' — ' || COALESCE(sub_e.city, 'Hyderabad') || ')', sub.username, 'Onboarding Executive 1 (Onboarding Executive — Hyderabad)') AS submitted_by_name,
                   o.daily_rent, o.security_deposit
            FROM july_onboarding o
            LEFT JOIN july_portal_users app_u ON app_u.portal_user_id = o.current_approver_id
            LEFT JOIN july_employees app_e ON app_e.employee_id = app_u.employee_id
            LEFT JOIN july_roles app_r ON app_r.role_id = app_u.role_id
            LEFT JOIN july_portal_users sub ON sub.portal_user_id = o.created_by
            LEFT JOIN july_employees sub_e ON sub_e.employee_id = sub.employee_id
            LEFT JOIN july_roles sub_r ON sub_r.role_id = sub.role_id
            WHERE o.created_by = %s ORDER BY o.created_at DESC;
        """, (uid,))
        for r in cur.fetchall():
            submissions.append({"id": r[0], "module": r[1], "module_label": r[2],
                                "title": r[3], "city": r[4], "subtitle": r[5],
                                "approval_status": r[6],
                                "created_at": r[7].isoformat() if r[7] else None,
                                "current_approver": r[8], "current_approver_name": r[9].strip() if r[9] else "City Manager 1 (City Manager — Hyderabad)",
                                "approval_remarks": r[10],
                                "submitted_by": r[11], "submitted_by_name": r[12].strip() if r[12] else "Onboarding Executive 1 (Onboarding Executive — Hyderabad)",
                                "daily_rent": float(r[13]) if r[13] is not None else 850.0,
                                "security_deposit": float(r[14]) if r[14] is not None else 10000.0})

        cur.execute("""
            SELECT v.vehicle_id, 'vehicle_onboarding', 'Vehicle Onboarding',
                   v.vehicle_number, v.city, v.manufacturer || ' ' || v.model, v.approval_status, v.created_at,
                   app_u.username,
                   COALESCE(app_e.first_name || ' ' || COALESCE(app_e.last_name,'') || ' (' || COALESCE(app_r.role_name, 'City Manager') || ' — ' || COALESCE(app_e.city, 'Hyderabad') || ')', app_u.username, 'City Manager 1 (City Manager — Hyderabad)') AS current_approver_name,
                   NULL AS approval_remarks,
                   sub.username,
                   COALESCE(sub_e.first_name || ' ' || COALESCE(sub_e.last_name,'') || ' (' || COALESCE(sub_r.role_name, 'Onboarding Executive') || ' — ' || COALESCE(sub_e.city, 'Hyderabad') || ')', sub.username, 'Onboarding Executive 1 (Onboarding Executive — Hyderabad)') AS submitted_by_name,
                   v.daily_rent, v.security_deposit
            FROM july_vehicles v
            LEFT JOIN july_portal_users app_u ON app_u.portal_user_id = v.current_approver_id
            LEFT JOIN july_employees app_e ON app_e.employee_id = app_u.employee_id
            LEFT JOIN july_roles app_r ON app_r.role_id = app_u.role_id
            LEFT JOIN july_portal_users sub ON sub.portal_user_id = v.created_by
            LEFT JOIN july_employees sub_e ON sub_e.employee_id = sub.employee_id
            LEFT JOIN july_roles sub_r ON sub_r.role_id = sub.role_id
            WHERE v.created_by = %s ORDER BY v.created_at DESC;
        """, (uid,))
        for r in cur.fetchall():
            submissions.append({"id": r[0], "module": r[1], "module_label": r[2],
                                "title": r[3], "city": r[4], "subtitle": r[5],
                                "approval_status": r[6],
                                "created_at": r[7].isoformat() if r[7] else None,
                                "current_approver": r[8], "current_approver_name": r[9].strip() if r[9] else "City Manager 1 (City Manager — Hyderabad)",
                                "approval_remarks": r[10],
                                "submitted_by": r[11], "submitted_by_name": r[12].strip() if r[12] else "Onboarding Executive 1 (Onboarding Executive — Hyderabad)",
                                "daily_rent": 0.0,
                                "security_deposit": 0.0})

        return submissions
    finally:
        postgreSQL_pool.putconn(conn)


class ApprovalAction(BaseModel):
    action: str  # APPROVE, REJECT, FORWARD
    remarks: Optional[str] = None
    forward_to_user_id: Optional[int] = None


MODULE_TABLE_MAP = {
    "individual_onboarding": ("july_onboarding", "onboarding_id"),
    "operator_onboarding": ("july_onboarding", "onboarding_id"),
    "onboarding": ("july_onboarding", "onboarding_id"),
    "vehicle_onboarding": ("july_vehicles", "vehicle_id"),
    "tickets_desk": ("july_tickets", "ticket_id"),
    "adjustment_form": ("copy_rent_adjustments", "id"),
    "accidents_form": ("copy_accidents", "id"),
    "expenses_form": ("copy_expense_ledger", "id"),
    "workshops_desk": ("copy_workshops", "id"),
}


@app.post("/api/july/approval/{module}/{record_id}")
def process_approval(module: str, record_id: int, body: ApprovalAction,
                     authorization: Optional[str] = Header(None)):
    """Process an approval action: Approve, Reject, or Forward to another user."""
    user = get_july_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        uid = user["portal_user_id"]

        if module not in MODULE_TABLE_MAP:
            raise HTTPException(status_code=400, detail=f"Unknown module: {module}")

        table, pk = MODULE_TABLE_MAP[module]

        if body.action == "APPROVE":
            cur.execute(f"""
                UPDATE {table} SET approval_status = 'Approved',
                    current_approver_id = NULL, approved_by = %s, approval_remarks = %s
                WHERE {pk} = %s AND current_approver_id = %s RETURNING {pk};
            """, (uid, body.remarks, record_id, uid))
            if not cur.fetchone():
                raise HTTPException(status_code=403, detail="Not authorized or record not found")
            cur.execute("""
                INSERT INTO july_approval_chain_logs (module_name, record_id, from_user_id, to_user_id, action, remarks)
                VALUES (%s, %s, %s, NULL, 'APPROVED', %s);
            """, (module, record_id, uid, body.remarks))

        elif body.action == "REJECT":
            cur.execute(f"""
                UPDATE {table} SET approval_status = 'Rejected',
                    current_approver_id = NULL, approved_by = %s, approval_remarks = %s
                WHERE {pk} = %s AND current_approver_id = %s RETURNING {pk};
            """, (uid, body.remarks, record_id, uid))
            if not cur.fetchone():
                raise HTTPException(status_code=403, detail="Not authorized or record not found")
            cur.execute("""
                INSERT INTO july_approval_chain_logs (module_name, record_id, from_user_id, to_user_id, action, remarks)
                VALUES (%s, %s, %s, NULL, 'REJECTED', %s);
            """, (module, record_id, uid, body.remarks))

        elif body.action == "FORWARD":
            if not body.forward_to_user_id:
                raise HTTPException(status_code=400, detail="forward_to_user_id is required")
            cur.execute(f"""
                UPDATE {table} SET current_approver_id = %s, approval_remarks = %s
                WHERE {pk} = %s AND current_approver_id = %s RETURNING {pk};
            """, (body.forward_to_user_id, body.remarks, record_id, uid))
            if not cur.fetchone():
                raise HTTPException(status_code=403, detail="Not authorized or record not found")
            cur.execute("""
                INSERT INTO july_approval_chain_logs (module_name, record_id, from_user_id, to_user_id, action, remarks)
                VALUES (%s, %s, %s, %s, 'FORWARDED', %s);
            """, (module, record_id, uid, body.forward_to_user_id, body.remarks))

        elif body.action == "SEND_BACK":
            cur.execute(f"""
                UPDATE {table} SET approval_status = 'Changes Requested',
                    current_approver_id = created_by, approval_remarks = %s
                WHERE {pk} = %s AND current_approver_id = %s RETURNING {pk};
            """, (body.remarks, record_id, uid))
            if not cur.fetchone():
                raise HTTPException(status_code=403, detail="Not authorized or record not found")
            cur.execute("""
                INSERT INTO july_approval_chain_logs (module_name, record_id, from_user_id, to_user_id, action, remarks)
                VALUES (%s, %s, %s, NULL, 'SENT_BACK', %s);
            """, (module, record_id, uid, body.remarks))

        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {body.action}")

        conn.commit()
        return {"success": True, "action": body.action}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)


@app.get("/api/july/approval-logs/{module}/{record_id}")
def get_approval_logs(module: str, record_id: int, authorization: Optional[str] = Header(None)):
    """Get full approval chain history for a specific record, including initial SUBMITTED log."""
    get_july_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        logs = []

        # 1. Synthesize initial SUBMITTED log by creator if record exists
        if module in MODULE_TABLE_MAP:
            table, pk = MODULE_TABLE_MAP[module]
            cur.execute(f"""
                SELECT r.created_at, r.created_by,
                       COALESCE(sub_e.first_name || ' ' || COALESCE(sub_e.last_name,''), sub_u.username) AS sub_name, sub_u.username,
                       COALESCE(app_e.first_name || ' ' || COALESCE(app_e.last_name,''), app_u.username) AS app_name, app_u.username
                FROM {table} r
                LEFT JOIN july_portal_users sub_u ON sub_u.portal_user_id = r.created_by
                LEFT JOIN july_employees sub_e ON sub_e.employee_id = sub_u.employee_id
                LEFT JOIN july_portal_users app_u ON app_u.portal_user_id = r.current_approver_id
                LEFT JOIN july_employees app_e ON app_e.employee_id = app_u.employee_id
                WHERE r.{pk} = %s;
            """, (record_id,))
            rec = cur.fetchone()
            if rec:
                logs.append({
                    "action": "SUBMITTED",
                    "remarks": "Submitted for onboarding review & approval",
                    "action_at": rec[0].isoformat() if rec[0] else None,
                    "from_name": rec[2].strip() if rec[2] else "Neha Singh",
                    "from_user": rec[3],
                    "to_name": rec[4].strip() if rec[4] else "Mohan Kumar",
                    "to_user": rec[5]
                })

        # 2. Fetch all subsequent chain logs (FORWARDED, APPROVED, REJECTED, etc.)
        cur.execute("""
            SELECT l.action, l.remarks, l.action_at,
                   fe.first_name || ' ' || COALESCE(fe.last_name,'') AS from_name, fu.username AS from_user,
                   te.first_name || ' ' || COALESCE(te.last_name,'') AS to_name, tu.username AS to_user
            FROM july_approval_chain_logs l
            LEFT JOIN july_portal_users fu ON fu.portal_user_id = l.from_user_id
            LEFT JOIN july_employees fe ON fe.employee_id = fu.employee_id
            LEFT JOIN july_portal_users tu ON tu.portal_user_id = l.to_user_id
            LEFT JOIN july_employees te ON te.employee_id = tu.employee_id
            WHERE (l.module_name = %s OR (l.module_name IN ('individual_onboarding', 'operator_onboarding', 'onboarding') AND %s IN ('individual_onboarding', 'operator_onboarding', 'onboarding'))) AND l.record_id = %s
            ORDER BY l.action_at ASC;
        """, (module, module, record_id))
        for r in cur.fetchall():
            logs.append({
                "action": r[0],
                "remarks": r[1],
                "action_at": r[2].isoformat() if r[2] else None,
                "from_name": r[3].strip() if r[3] else r[4],
                "from_user": r[4],
                "to_name": r[5].strip() if r[5] else r[6],
                "to_user": r[6]
            })

        return logs
    finally:
        postgreSQL_pool.putconn(conn)


class BatchApprovalAction(BaseModel):
    items: list[dict] # list of {"module": "individual_onboarding", "id": 8}
    action: str = "APPROVE"
    remarks: Optional[str] = "Batch Approved"

@app.post("/api/july/batch-approval")
def process_batch_approval(body: BatchApprovalAction, authorization: Optional[str] = Header(None)):
    """Approve multiple pending records at once."""
    user = get_july_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        uid = user["portal_user_id"]
        processed_count = 0
        for item in body.items:
            mod = item.get("module")
            rec_id = item.get("id")
            if mod in MODULE_TABLE_MAP and rec_id:
                table, pk = MODULE_TABLE_MAP[mod]
                cur.execute(f"""
                    UPDATE {table} SET approval_status = 'Approved',
                        current_approver_id = NULL, approved_by = %s, approval_remarks = %s
                    WHERE {pk} = %s AND current_approver_id = %s RETURNING {pk};
                """, (uid, body.remarks, rec_id, uid))
                if cur.fetchone():
                    processed_count += 1
                    cur.execute("""
                        INSERT INTO july_approval_chain_logs (module_name, record_id, from_user_id, to_user_id, action, remarks)
                        VALUES (%s, %s, %s, NULL, 'APPROVED', %s);
                    """, (mod, rec_id, uid, body.remarks))
        conn.commit()
        return {"success": True, "count": processed_count}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        postgreSQL_pool.putconn(conn)


@app.get("/api/july/record-details/{module}/{record_id}")
def get_record_details(module: str, record_id: int, authorization: Optional[str] = Header(None)):
    """Fetch all columns from a specific record table dynamically."""
    get_july_user(authorization)
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        if module not in MODULE_TABLE_MAP:
            raise HTTPException(status_code=400, detail="Invalid module")
        table, pk = MODULE_TABLE_MAP[module]
        cur.execute(f"SELECT * FROM {table} WHERE {pk} = %s;", (record_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Record not found")
        colnames = [desc[0] for desc in cur.description]
        return dict(zip(colnames, row))
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Static files — only mounted when dist/ exists (production build)
# During development the React dev server (npm run dev) serves the frontend
# ─────────────────────────────────────────────────────────
if os.path.isdir("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="static")
else:
    print("[INFO] dist/ not found — skipping static file mount (run 'npm run build' for production)")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)