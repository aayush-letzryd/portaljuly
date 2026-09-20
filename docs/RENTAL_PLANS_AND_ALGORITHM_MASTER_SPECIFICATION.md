# LetzRyd Multi-City Rental Plans & Calculation Engine
## Complete Technical Architecture, Operational Logic & Calculation Algorithm Specification

This specification provides the comprehensive technical and operational definition of LetzRyd's rental calculation engine across Bangalore, Hyderabad, and Mumbai. It details every rental plan, reducing slab curve, operator agreement, vehicle baseline, indemnity fee rule, database entity, and stored procedure algorithm in production.

---

## Table of Contents
1. [Executive Architecture & Mission](#1-executive-architecture--mission)
   - 1.1 Legacy Spreadsheets & The Need for Automation
   - 1.2 The 100% Data-Driven Architecture
   - 1.3 Multi-City Topology & Design Principles
2. [Core Financial Concepts & Calculation Formulas](#2-core-financial-concepts--calculation-formulas)
   - 2.1 Base Rent, Indemnity Fee & Gross Rent
   - 2.2 Centralized Daily Indemnity Fees & Accidental Protection Policy
   - 2.3 Date-Specific Custody, Attendance Status & Billable Days
   - 2.4 Platform Aggregation & Trip Metric Mechanics
   - 2.5 Reducing Slabs, Flat Rates & Model Baselines
   - 2.6 Whole-Week Dynamic Repricing Engine
   - 2.7 Open Draft Ledger vs. Immutable Settlement Lock
3. [City 1: Bangalore (BLR) — Complete Rental Specification](#3-city-1-bangalore-blr--complete-rental-specification)
   - 3.1 Plan Catalogue & Product Categories
   - 3.2 Slabs, Trip Brackets & Reducing Curves
   - 3.3 Multi-Platform Rules & The Ola Concurrency Logic
   - 3.4 The Zero-Trip Rent Policy: Path A vs. Path B
   - 3.5 Operator Master Agreements & Enrolled Plan Scoping
   - 3.6 Indemnity Fees, Waivers & Operator Concessions
   - 3.7 Mathematical Walkthroughs & Concrete Case Studies
4. [City 2: Hyderabad (HYD) — Complete Rental Specification](#4-city-2-hyderabad-hyd--complete-rental-specification)
   - 4.1 Plan Catalogue & Product Categories
   - 4.2 Vehicle Model Baselines & Fleet Hierarchy
   - 4.3 Slabs & Trip Curves (TBS vs. EBS vs. LIP)
   - 4.4 The 14 "Expectation Case Fixed Revenue Share" Partners
   - 4.5 Multi-Model Fleet Operator Nuance (Qadir & Zubair)
   - 4.6 Fee Rules, Waivers & Retired Fleet Exclusions
   - 4.7 Mathematical Walkthroughs & Concrete Case Studies
5. [City 3: Mumbai (MUM) — Complete Rental Specification](#5-city-3-mumbai-mum--complete-rental-specification)
   - 5.1 Plan Catalogue & Operational Structure
   - 5.2 The Standard 2-Tier Curve vs. The 6-Tier Slab
   - 5.3 Contract Transition Windows (Tiwari & Prajapati)
   - 5.4 Multi-Model Fleet Operator Nuance (Gaadylo Enterprises)
   - 5.5 Fee Structure & Gross Rent Display Paradigm
   - 5.6 Mathematical Walkthroughs & Concrete Case Studies
6. [The Unified Algorithm & Execution Engine](#6-the-unified-algorithm--execution-engine)
   - 6.1 Database Schema & Physical DDL Entities
   - 6.2 The 5-Tier Precedence Waterfall & Decision Tree
   - 6.3 Stored Procedure Specification: `public.sp_calculate_daily_rent`
   - 6.4 Synchronization Engine: `public.sp_sync_rent_to_hisaab`
   - 6.5 Financial Lineage, Audit Trail & Ledger Logging
   - 6.6 Comprehensive Variable & Parameter Dictionary
7. [Operational Edge Cases & Historical Reconciliation Guide](#7-operational-edge-cases--historical-reconciliation-guide)
   - 7.1 Auditing Methodology: Database vs. Historical Hisaab Workbooks
   - 7.2 The 24 Bangalore Operational Items (Root-Cause Breakdown)
   - 7.3 Multi-City Reconciliation Playbook & Troubleshooting Checklist
   - 7.4 Automated Scheduling & Production Deployment Safeguards

---

# 1. Executive Architecture & Mission

### 1.1 Legacy Spreadsheets & The Need for Automation
Prior to the rollout of LetzRyd's unified database-driven rental engine, weekly driver settlement ("Hisaab") across Bangalore, Hyderabad, and Mumbai was administered through standalone manual spreadsheets (`Uber__and__OLA_Final_Hisaab.xlsx`, `Plans.xlsx`, `Driver_Proposition.xlsx`).

These spreadsheets suffered from five systemic operational vulnerabilities:
1. **Accidental Formula Overwrites:** Operations teams dragging formulas down columns frequently pasted generic retail formulas over negotiated operator agreements (e.g. overwriting custom 4-tier ladders with standard TBS formulas).
2. **Multi-Model Blindspots:** When an operator managed multiple vehicle models (e.g. operating both Dzire Tour S and Maruti WagonR), single-key VLOOKUPs on `partner_id` failed to differentiate rates by model, forcing staff to manually type numbers across dozens of cells every Monday.
3. **Multi-Platform Concurrency Blindspots:** When drivers took trips on both Uber and Ola simultaneously, standard spreadsheet formulas evaluated only the Uber column or miscalculated the dual-app flat tier, creating revenue leakage or driver disputes.
4. **Missing Audit Trails:** Verbal concessions, temporary accident waivers, and mid-week rate adjustments were typed directly into calculated cells without timestamps, notes, or authorization records.
5. **Operational Delays:** Reconciling ~1,000 commercial vehicles across three cities consumed 36 to 48 man-hours every settlement cycle, delaying driver payouts.

The automated rental engine replaces manual spreadsheet calculations with a deterministic PostgreSQL transaction layer that executes nightly in under 8 seconds with 100% mathematical reproducibility.

### 1.2 The 100% Data-Driven Architecture
The core architectural rule of the LetzRyd engine is: **Zero magic numbers, zero hardcoded city branches, and zero business rules embedded inside application code or stored procedure control flow.**

Every tariff, reducing curve threshold, indemnity fee, waiver condition, partner override, and fallback rate is modeled as first-class structured data in relational tables:
- Standard plans live in `core_rental_plans`.
- Dynamic trip ladders live in `rental_rate_slabs`.
- Bilateral partner contracts live in `rental_custom_partner_plans`.
- Vehicle model baselines live in `rental_model_baselines`.
- Daily insurance/indemnity policies live in `rental_fee_rules`.
- Authorized operational overrides live in `rental_exceptions`.

The SQL stored procedure (`sp_calculate_daily_rent`) functions purely as an evaluation engine. To introduce a new rental plan, adjust an operator's trip bracket, or extend a temporary discount, operations teams insert or update table rows—**without altering a single line of SQL code or deploying backend changes.**

### 1.3 Multi-City Topology & Design Principles
The calculation engine unifies the divergent operating models of Bangalore, Hyderabad, and Mumbai into a single consolidated schema:

```
+----------------------------------------------------------------------------------------------------+
|                                    LETZRYD MASTER ENGINE TOPOLOGY                                   |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|    BANGALORE (BLR)                       HYDERABAD (HYD)                       MUMBAI (MUM)        |
|  - Dual-Platform (Uber + Ola)         - Model-Centric Baselines             - Gross Rent Model     |
|  - Operator Slabs (Hamza, Rishad)     - TBS vs EBS vs LIP Trip Curves       - 6-Tier Reducing Slab |
|  - Proposed Path B Zero-Trip Rent     - 14 Fixed Revenue Share Cards        - Date-Effective Deals |
|  - Negotiated Indemnity Rules         - Shaik Kareem / Xcent Waivers        - Gaadylo Multi-Model  |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                  UNIFIED 5-TIER WATERFALL PRECEDENCE                               |
+----------------------------------------------------------------------------------------------------+
|  Priority 1: Approved Audit Exceptions          -->  public.rental_exceptions                      |
|  Priority 2: Custom Bilateral Partner Cards     -->  public.rental_custom_partner_plans            |
|  Priority 3: Dynamic Trip-Reducing Slabs        -->  public.rental_rate_slabs                      |
|  Priority 4: Vehicle Model Baselines Fallback   -->  public.rental_model_baselines                 |
|  Priority 5: Canonical City Master Plan Default -->  public.core_rental_plans                      |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                  STRICT 5-TIER INDEMNITY PRECEDENCE                                |
|  Exception -> Fee Rule (where is_waiver=TRUE dominates) -> Custom Card -> Slab -> Global ₹30/day    |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                       DAILY AUDIT LEDGER & LINEAGE                                 |
|  Records calculation lineage into public.daily_rent_log with matched plan, slab, and custom IDs    |
+----------------------------------------------------------------------------------------------------+
```

Key Architectural Principles:
1. **Clean Integer Primary Keys:** All tables enforce integer `SERIAL PRIMARY KEY` identifiers (1, 2, 3...) for unambiguous foreign key referencing and indexing.
2. **Trigger-Free Batch Execution:** The engine eliminates row-level database triggers that cause concurrency deadlocks during bulk ingestion. Processing is managed deterministically via stored procedures invoked by `pg_cron`.
3. **Date-Effective Temporal Validity:** All rate rows carry `valid_from` and `valid_to` date bounds. Recalculating historical weeks reproduces the exact commercial terms in effect on that date.
4. **Idempotency & Re-entrancy:** Executing `sp_calculate_daily_rent` multiple times over any date range produces identical ledger rows via deterministic `ON CONFLICT (log_date, vehicle_number, partner_id) DO UPDATE` semantics.

---

# 2. Core Financial Concepts & Calculation Formulas

### 2.1 Base Rent, Indemnity Fee & Gross Rent
In LetzRyd's financial architecture, three distinct rental figures exist across reporting and accounting layers:

$$	ext{Gross Daily Rent} = 	ext{Base Daily Rent} + 	ext{Daily Indemnity Fee}$$

$$	ext{Net Settlement Balance} = \sum_{	ext{week}} \Big( 	ext{Gross Rent} + 	ext{Cash Collected} - 	ext{Digital Fare Earnings} + 	ext{Challans} + 	ext{Accident Recovery} - 	ext{Incentives} \Big)$$

- **Base Daily Rent (`applied_daily_rent`):** The net commercial charge assessed for vehicle usage, determined exclusively by the matched plan, slab, or partner contract.
- **Daily Indemnity Fee (`applied_daily_indemnity`):** The fixed daily insurance and accident protection charge.
- **Gross Daily Rent (`net_daily_rent` in ledger):** The total daily billable liability owed by the driver/operator for vehicle custody.
  - *City Distinction:* In Bangalore and Hyderabad, weekly settlement sheets display Base Rent and Indemnity Fees in separate columns (e.g., ₹929 base + ₹30 fee). In Mumbai, spreadsheets display Gross Rent directly (e.g., ₹1,000 gross, which internally represents ₹970 base + ₹30 indemnity fee).
- **Net Payout / Driver Receivable:** The final weekly financial settlement. When fare earnings exceed gross rent and cash collections, LetzRyd dispatches a net payout to the driver. When cash collections and gross rent exceed earnings, the driver owes LetzRyd a recovery balance.

### 2.2 Centralized Daily Indemnity Fees & Accidental Protection Policy
The daily indemnity fee provides accident damage mitigation, vehicle downtime insurance, and third-party liability coverage.
- **Global Standard Rate:** ₹30.00 per billable day across all three cities.
- **Policy Waivers & Concessions:** Governed strictly by `rental_fee_rules`.
  - *Hyundai Xcent Retired Fleet:* ₹0.00 waiver (`is_waiver = TRUE`). Older, fully amortized BS-IV fleet vehicles operating in Hyderabad do not incur daily insurance charges.
  - *Shaik Kareem Fleet (`LETZHYDIP9701685282`):* ₹0.00 negotiated fleet indemnity waiver.
  - *Nisamudeen K P (`LETZBLRIP9947932622`):* Negotiated rate of ₹15.00 per billable day.
  - *Rishad P V (`LETZBLRIP9656907001`):* Negotiated rate of ₹20.00 per billable day.

### 2.3 Date-Specific Custody, Attendance Status & Billable Days
The single source of custody truth in the database is `public.core_daily_vehicle_status` (CDVS). The calculation engine evaluates each vehicle on each calendar date to determine whether rent is due.

```
                                    +--------------------------------+
                                    | Daily CDVS Attendance Status   |
                                    +--------------------------------+
                                                    |
                      +-----------------------------+-----------------------------+
                      |                                                           |
                      v                                                           v
        +---------------------------+                               +---------------------------+
        |  Partner is NULL / Empty  |                               |    Active Partner ID      |
        |  or 'SYSTEM_ONBOARDED'    |                               |    Assigned to Vehicle    |
        +---------------------------+                               +---------------------------+
                      |                                                           |
                      v                                                           v
            is_billable_day = FALSE                       +-----------------------------------------------+
            Rent = ₹0.00, Fee = ₹0.00                     | Completed Trips on THIS EXACT DATE (day_trips)|
                                                          |                     > 0?                      |
                                                          +-----------------------------------------------+
                                                                            /                                                                                      /                                                                                  YES  /               \  NO
                                                                         v                 v
                                                          +-------------------+    +----------------------------+
                                                          | Override Status:  |    | Status IN ('Drop Off',     |
                                                          | Forced to Active. |    | 'RFD', 'Unassigned')?      |
                                                          | is_billable = TRUE|    +----------------------------+
                                                          +-------------------+        /                                                                                               YES  /               \  NO
                                                                                      v                 v
                                                                             is_billable = FALSE   +--------------------+
                                                                             Rent = ₹0.00          | Status IN          |
                                                                             Fee = ₹0.00           | ('Maintenance',    |
                                                                                                   | 'Breakdown',       |
                                                                                                   | 'Accident')?       |
                                                                                                   +--------------------+
                                                                                                       /                                                                                                           YES  /            \  NO
                                                                                                     v              v
                                                                                            billable_rent_day?  is_billable = TRUE
                                                                                                 /        \     (Standard Active)
                                                                                           TRUE /          \ FALSE
                                                                                               v            v
                                                                                          is_billable=TRUE is_billable=FALSE
```

- **Date-Specific Trip Billability (`day_trips`):** Only completed trips on that *exact calendar date* can override attendance to Active. If a vehicle drove trips on Monday, that activity confirms custody on Monday. On Thursday, if the vehicle was in the garage for maintenance with 0 trips, Thursday remains non-billable.
- **Weekly Tiering Volume (`week_trips`):** While custody and billability are evaluated day-by-day, reducing slabs are earned on *cumulative weekly volume* (Monday 00:00:00 to Sunday 23:59:59).

### 2.4 Platform Aggregation & Trip Metric Mechanics
LetzRyd vehicles operate across multiple mobility aggregators. The engine computes settlement metrics aggregated over the ISO calendar week:
- **Uber Completed Trips:** Sum of trips from `public.core_uber_daily` (`ub.completed_trips`) for the operational date between `week_start` and `week_end`.
- **Ola Completed Trips:** Sum of trips from `public.core_ola_daily` (`ol.completed_trips`) for the service date between `week_start` and `week_end`.
- **Total Completed Trips:** $	ext{Uber Trips} + 	ext{Ola Trips}$.
- **Platform Separation:** Hyderabad TBS specifically evaluates *Uber trips only* against model curves, while Bangalore evaluates total trips with specific Ola concurrency rules.

### 2.5 Reducing Slabs, Flat Rates & Model Baselines
LetzRyd utilizes three distinct calculation models:
1. **Dynamic Reducing Slabs (`SLAB_TIERED`):** An incentive-driven system where the daily base rent decreases as the vehicle achieves higher weekly trip volumes. The driver pays the lower rate for **all billable days** in that week once a trip threshold is breached.
2. **Flat Rates (`FLAT_RATE` / `PLATFORM_SPLIT`):** A fixed daily rate agreed upon by contract (e.g., Driver-to-Rent / D2R, Driver-to-Own / D2O, or custom operator contracts) that remains constant regardless of trip count.
3. **Model Baselines (`MODEL_FALLBACK`):** A protective fallback tier ensuring that if no dynamic slab or custom agreement is configured for a vehicle, the asset is billed according to its physical vehicle make and model (e.g., Dzire Tour S @ ₹1,200/day vs. WagonR @ ₹1,050/day).

### 2.6 Whole-Week Dynamic Repricing Engine
Because reducing slabs are weekly, daily scheduled execution evaluates the **entire active ISO week** (`v_week_start` to `v_week_end`).
- On Tuesday, a driver has completed 30 trips $ightarrow$ Tier 1 rate applies to Monday and Tuesday.
- On Friday, the driver reaches 100 trips $ightarrow$ Tier 2 rate is unlocked.
- When `sp_calculate_daily_rent` runs, it re-evaluates all days in the open week, automatically repricing Monday through Friday to the lower Tier 2 rate.

### 2.7 Open Draft Ledger vs. Immutable Settlement Lock
The financial lifecycle separates active recalculation from finalized settlements:
1. **Phase 1: Open Draft Recalculation:** During the current active week, `daily_rent_log` functions as a living recalculation ledger via `ON CONFLICT (log_date, vehicle_number, partner_id) DO UPDATE`. Rates update dynamically as cumulative trips progress.
2. **Phase 2: Immutable Settlement Lock:** Once the settlement week ends, accounting audits verify the numbers and trigger `sp_sync_rent_to_hisaab`. The week record in `hisaab_settlement_weeks` is updated to `is_locked = TRUE`. Once locked, `daily_rent_log` rows for that week are frozen. Any subsequent dispute, adjustment, or concession must be recorded as an explicit adjustment entry in `hisaab_adjustments_ledger`.

---

# 3. City 1: Bangalore (BLR) — Complete Rental Specification

### 3.1 Plan Catalogue & Product Categories
Bangalore operates the largest fleet in LetzRyd, characterized by dual-platform driver operations and large contracted fleet operators.

| Plan ID | Plan Code | Plan Category | Calculation Type | Default Daily Rent | Default Fee | Description / Operational Context |
|:---|:---|:---|:---|:---|:---|:---|
| **1** | `BLR_MASTER_IND` | STANDARD | `PLATFORM_SPLIT` | ₹929.00 | ₹30.00 | Bangalore Master Individual Driver Plan |
| **2** | `BLR_MASTER_OP` | STANDARD | `PLATFORM_SPLIT` | ₹900.00 | ₹30.00 | Bangalore Master Fleet Operator Plan |
| **3** | `BLR_UBER_TBS` | STANDARD | `SLAB_TIERED` | ₹929.00 | ₹30.00 | Bangalore Uber Target-Based System |
| **4** | `BLR_ALL_PLATFORM`| STANDARD | `FLAT_RATE` | ₹1,050.00 | ₹30.00 | All-Platform Flat Commercial Rent |
| **5** | `BLR_FALLBACK` | STANDARD | `MODEL_FALLBACK` | ₹929.00 | ₹30.00 | Catch-all vehicle model baseline fallback |
| **14**| `BLR_OP_HAMZA` | CUSTOM | `SLAB_TIERED` | ₹870.00 | ₹30.00 | Hamza Moidu Custom TBS Operator Ladder |
| **15**| `BLR_OP_SUBHAN` | CUSTOM | `SLAB_TIERED` | ₹850.00 | ₹30.00 | Subhan Khan M N Custom TBS Operator Ladder |
| **16**| `BLR_OP_RISHAN_SARBAS`| CUSTOM | `SLAB_TIERED` | ₹900.00 | ₹30.00 | Rishan R & Sarbas Custom EBS Operator Ladder |
| **17**| `BLR_OP_RISHAD_TBS` | CUSTOM | `SLAB_TIERED` | ₹800.00 | ₹20.00 | Rishad P V Custom TBS Ladder (Historical reference) |
| **18**| `BLR_OP_RISHAD_EBS` | CUSTOM | `SLAB_TIERED` | ₹800.00 | ₹20.00 | Rishad P V Contracted EBS Ladder (Negotiated ₹20 fee) |
| **19**| `BLR_OP_RAMEES` | CUSTOM | `SLAB_TIERED` | ₹900.00 | ₹30.00 | Mohamed Ramees A Custom EBS Operator Ladder |

### 3.2 Slabs, Trip Brackets & Reducing Curves

#### A. Master Individual Plan (`BLR_MASTER_IND` - Plan #1)
Applied to retail solo drivers (`onboarding_type = 'Individual'`). Evaluated on weekly completed trips when operating exclusively on Uber:

| Slab ID | Trip Range (Weekly) | Condition Rule | Base Daily Rent | Daily Indemnity | Gross Daily Rent | Commercial Tier Description |
|:---|:---|:---|:---|:---|:---|:---|
| — | **0 Trips (Idle)** | `Path B Proposed` | **₹1,050.00** | ₹30.00 | **₹1,080.00** | Proposed Path B Zero-Trip Policy |
| **35** | 1 – 89 trips | `OLA_ZERO` | **₹929.00** | ₹30.00 | **₹959.00** | Individual Base Operating Tier |
| **36** | 90 – 109 trips | `OLA_ZERO` | **₹665.00** | ₹30.00 | **₹695.00** | Tier 1 Productivity Discount (-₹264/day) |
| **37** | 110 – 129 trips | `OLA_ZERO` | **₹525.00** | ₹30.00 | **₹555.00** | Tier 2 High Efficiency Discount (-₹404/day)|
| **38** | 130+ trips | `OLA_ZERO` | **₹400.00** | ₹30.00 | **₹430.00** | Tier 3 Maximum Utilization (-₹529/day) |
| **34** | $\ge 1$ Ola Trip | `OLA_GE_1` | **₹1,050.00** | ₹30.00 | **₹1,080.00** | All-Platform Concurrency Flat Tier |

#### B. Master Operator Plan (`BLR_MASTER_OP` - Plan #2)
Applied to fleet operators managing multiple vehicles (`onboarding_type = 'Operator'`):

| Slab ID | Trip Range (Weekly) | Condition Rule | Base Daily Rent | Daily Indemnity | Gross Daily Rent | Commercial Tier Description |
|:---|:---|:---|:---|:---|:---|:---|
| — | **0 Trips (Idle)** | `Path B Proposed` | **₹1,050.00** | ₹30.00 | **₹1,080.00** | Proposed Path B Zero-Trip Policy |
| **40** | 1 – 89 trips | `OLA_ZERO` | **₹900.00** | ₹30.00 | **₹930.00** | Operator Wholesale Base Tier |
| **41** | 90 – 109 trips | `OLA_ZERO` | **₹645.00** | ₹30.00 | **₹675.00** | Operator Productivity Discount (-₹255/day)|
| **42** | 110 – 129 trips | `OLA_ZERO` | **₹500.00** | ₹30.00 | **₹530.00** | Operator High Efficiency Tier (-₹400/day) |
| **43** | 130+ trips | `OLA_ZERO` | **₹365.00** | ₹30.00 | **₹395.00** | Operator Maximum Volume Tier (-₹535/day) |
| **39** | $\ge 1$ Ola Trip | `OLA_GE_1` | **₹1,050.00** | ₹30.00 | **₹1,080.00** | Operator All-Platform Flat Tier |

### 3.3 Multi-Platform Rules & The Ola Concurrency Logic
In Bangalore, LetzRyd maintains an exclusive fleet partnership with Uber. The volume discount slabs (reducing rent to ₹400 or ₹365) are subsidized by Uber platform target incentives.

**The Multi-Platform Governing Rule:**
1. If a driver operates **exclusively on Uber** (`weekly_ola_trips = 0`), the vehicle is eligible for dynamic reducing slabs.
2. If an individual driver completes **1 or more trips on Ola** (`weekly_ola_trips >= 1`), the vehicle forfeits all Uber volume discounts. The lease converts to the **All-Platform Flat Rate of ₹1,050.00 Base Rent + ₹30.00 Indemnity Fee = ₹1,080.00 Gross Rent**.

#### Case Study: Row 11 `KA05AP7491`
- **Vehicle:** `KA05AP7491` | **Partner:** `LETZBLR6238809258` (MUHAMMED RAHEES M)
- **Activity:** 61 Ola Trips, 1 Uber Trip.
- **Resolution:** In stored procedure `sp_calculate_daily_rent`, `condition_rule = 'OLA_GE_1'` matches because `weekly_ola_trips >= 1`. The lateral join prioritizes `condition_rule <> 'NONE'`, deterministically assigning Slab #34 (₹1,050.00 base rent).

### 3.4 The Zero-Trip Rent Policy: Path A vs. Path B
A primary source of historical variance in Bangalore is the treatment of idle vehicles (0 completed trips during a billable week):
* **Path A (Raw Spreadsheet Formula):** The unedited Excel formula evaluated `Trips <= 89` and awarded a discounted baseline rate of ₹929 (retail) or ₹900 (operator).
* **Path B (Proposed Operational Policy):** Operations management held that drivers who keep a car idle for an entire week should not receive volume discounts, and manually hand-typed `1050` over 81 rows in Week 26. However, they missed 20 rows.
* **Engine Implementation:** Automated Hisaab implements **Path B (₹1,050 full rent)** pending formal client operational sign-off, eliminating manual cell editing.

### 3.5 Operator Master Agreements & Enrolled Plan Scoping
Contracted rate cards stored in `rental_custom_partner_plans` and partner-scoped slabs in `rental_rate_slabs`:

| Partner Name | Partner ID | Vehicle Model | Custom Daily Rent | Daily Fee | Operational Agreement |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Rishad P V** | `LETZBLRIP9656907001` | Maruti WagonR | **EBS Ladder** | **₹20.00** | Contracted EBS: 0–89 @ ₹800, 90–109 @ ₹550, 110–129 @ ₹410, 130+ @ ₹270. Fee concession ₹20. |
| **Mohammed Irshad / Rishan R** | `LETZBLRIP7356813050` | Maruti WagonR | **₹900.00** | **₹30.00** | Contracted fleet operator agreement. |
| **Hamza Moidu** | `LETZBLRIP9633600609` | Maruti WagonR | **₹870.00** | **₹30.00** | Contracted 4-tier curve starting at ₹870 base. |
| **Subhan Khan M N** | `LETZBLR8105051939` | Maruti WagonR | **₹850.00** | **₹30.00** | Contracted 4-tier curve starting at ₹850 base. |
| **Mohamed Ramees A** | `LETZBLRIP9845345799` | Maruti WagonR | **₹900.00** | **₹30.00** | Contracted operator fleet agreement. |

* **Resolving Rishad's Plan Scoping:** In legacy spreadsheets, generic TBS formulas were accidentally pasted on some of Rishad's rows. In the database, Rishad is explicitly mapped to Plan 18 (`BLR_OP_RISHAD_EBS`) via `core_partner_onboarding.driver_plan`, ensuring his contracted EBS curve applies without colliding with generic TBS slabs.

### 3.6 Indemnity Fees, Waivers & Operator Concessions
Indemnity fees in Bangalore are strictly governed by `rental_fee_rules`:
- **Default Policy (Fee Rule #1):** All vehicles incur ₹30.00/day.
- **Nisamudeen K P Concession (Fee Rule #6):** Partner `LETZBLRIP9947932622` holds an approved operational agreement capping daily indemnity at **₹15.00/day**.
- **Rishad P V Concession (Fee Rule #7):** Partner `LETZBLRIP9656907001` holds an approved operational agreement capping daily indemnity at **₹20.00/day**.

### 3.7 Mathematical Walkthroughs & Concrete Case Studies

#### Case BLR-1: Individual Driver Hitting Tier 2 Productivity
- **Driver:** Suresh K (`LETZBLR9886012345`, Individual) | **Vehicle:** `KA05AQ1122` (WagonR)
- **Activity:** On-road 7 days; completed 118 Uber trips, 0 Ola trips.
- **Execution:**
  1. Priority 3 (Slabs): Matched Plan #1 (`BLR_MASTER_IND`), Slab #37 (`trip_min = 110`, `trip_max = 129`, `condition_rule = 'OLA_ZERO'`). Base Rent = ₹525.00.
  2. Indemnity Lookup: Matched Fee Rule #1 (Standard). Fee = ₹30.00.
  3. Daily Calculation: $	ext{Net Daily Rent} = ₹525.00 + ₹30.00 = ₹555.00$.
  4. Weekly Total: $7 	imes ₹555.00 = \mathbf{₹3,885.00}$.

#### Case BLR-2: Idle Day Zero-Trip Production Penalty (Path B)
- **Driver:** Bindukumar C (`LETZBLR9591379166`, Individual) | **Vehicle:** `KA05AP6040` (WagonR)
- **Activity:** On-road 7 days; completed 0 Uber trips, 0 Ola trips.
- **Execution:**
  1. `weekly_completed_trips = 0`. Path B rule triggered.
  2. Base Rent is assigned canonical idle rent = ₹1,050.00.
  3. Fee = ₹30.00. Gross Daily Rent = ₹1,080.00.
  4. Weekly Total: $7 	imes ₹1,080.00 = \mathbf{₹7,560.00}$.

#### Case BLR-3: Operator Rishad P V on High-Trip EBS Ladder
- **Operator:** Rishad P V (`LETZBLRIP9656907001`) | **Vehicle:** `KA51AL1800` (WagonR)
- **Activity:** On-road 7 days; completed 100 Uber trips, 0 Ola trips.
- **Execution:**
  1. Priority 3 (Slabs): Matched Plan #18 (`BLR_OP_RISHAD_EBS`), Slab #77 (`trip_min = 90`, `trip_max = 109`). Base Rent = ₹550.00.
  2. Indemnity Lookup: Matched Fee Rule #7 (`partner_id = 'LETZBLRIP9656907001'`). Fee = ₹20.00.
  3. Daily Calculation: $	ext{Net Daily Rent} = ₹550.00 + ₹20.00 = ₹570.00$.
  4. Weekly Total: $7 	imes ₹570.00 = \mathbf{₹3,990.00}$.

---

# 4. City 2: Hyderabad (HYD) — Complete Rental Specification

### 4.1 Plan Catalogue & Product Categories
Hyderabad features a diverse fleet consisting of CNG hatchbacks, sedans, and commercial electric vehicles (Citroen EC3).

| Plan ID | Plan Code | Plan Category | Calculation Type | Default Daily Rent | Default Fee | Description / Operational Context |
|:---|:---|:---|:---|:---|:---|:---|
| **6** | `HYD_UBER_TBS` | STANDARD | `SLAB_TIERED` | ₹989.00 | ₹30.00 | Hyderabad Uber Target-Based System (TBS 4-tier model curves) |
| **7** | `HYD_UBER_EBS` | STANDARD | `SLAB_TIERED` | ₹989.00 | ₹30.00 | Hyderabad Uber Efficiency-Based System (EBS 5-tier model curves)|
| **8** | `HYD_ALL_PLATFORM`| STANDARD | `FLAT_RATE` | ₹1,050.00 | ₹30.00 | All-Platform Flat Commercial Rent |
| **9** | `HYD_FALLBACK` | STANDARD | `MODEL_FALLBACK` | ₹989.00 | ₹30.00 | Hyderabad Model Baseline Fallback Plan |

### 4.2 Vehicle Model Baselines & Fleet Hierarchy
When vehicles are not operating on dynamic trip ladders or custom partner agreements, the database enforces strict model-specific baselines via `rental_model_baselines`:

| Baseline ID | Vehicle Model Name | Normalized String | Default Base Rent | Daily Indemnity | All-Platform Flat Rent | Operational Lifecycle Notes |
|:---|:---|:---|:---|:---|:---|:---|
| **8** | ALL (Generic Default) | `ALL` | ₹1,050.00 | ₹30.00 | ₹1,050.00 | Catch-all city baseline |
| **9** | Maruti WagonR Tour H3 CNG | `WAGONR` | ₹1,050.00 | ₹30.00 | ₹1,050.00 | Core economy hatchback fleet |
| **10** | Dzire Tour S CNG | `DZIRE` | ₹1,200.00 | ₹30.00 | ₹1,200.00 | Commercial CNG sedan fleet |
| **11** | Citroen eC3 (Electric) | `EC3` | ₹1,400.00 | ₹30.00 | ₹1,400.00 | Commercial EV fleet |
| **12** | Hyundai Aura | `HYUNDAI AURA`| ₹1,100.00 | ₹30.00 | ₹1,200.00 | Secondary sedan fleet |
| **13** | Hyundai Xcent / Prime T | `HYUNDAI XCENT`| ₹900.00 | **₹0.00** | ₹900.00 | **Retired fleet (Indemnity waived)** |
| **14** | Tata Tigor EV | `TIGOR EV` | ₹1,300.00 | ₹30.00 | ₹1,300.00 | Mid-tier commercial EV fleet |
| **15** | Tata Nexon EV | `TATA NEXON EV`| ₹1,500.00 | ₹30.00 | ₹1,500.00 | Premium SUV EV fleet |
| **16** | Mahindra e-Verito | `E-VERITO` | ₹1,100.00 | ₹30.00 | ₹1,100.00 | Legacy commercial EV fleet |
| **26** | Toyota Etios | `TOYOTA ETIOS`| ₹1,150.00 | ₹30.00 | ₹1,200.00 | Long-wheelbase sedan fleet |

### 4.3 Slabs & Trip Curves (TBS vs. EBS vs. LIP)

#### A. Hyderabad Uber TBS Curves (`HYD_UBER_TBS` - Plan #6)

| Model Scope | 0 – 49 Trips (Base) | 50 – 59 Trips (Tier 1) | 60 – 69 Trips (Tier 2) | 70+ Trips (Tier 3 Max) | Daily Fee |
|:---|:---|:---|:---|:---|:---|
| **Maruti WagonR Tour H3 CNG** | ₹989.00 | ₹889.00 | ₹849.00 | ₹799.00 | ₹30.00 |
| **Dzire Tour S CNG** | ₹1,100.00 | ₹1,009.00 | ₹959.00 | ₹899.00 | ₹30.00 |
| **Citroen eC3 (EV)** | ₹1,400.00 | ₹1,300.00 | ₹1,260.00 | ₹1,210.00 | ₹30.00 |

#### B. Hyderabad Uber EBS & LIP Curves (`HYD_UBER_EBS` - Plan #7)

| Model Scope | 0 – 89 Trips | 90 – 104 Trips | 105 – 119 Trips | 120 – 134 Trips | 135+ Trips | Daily Fee |
|:---|:---|:---|:---|:---|:---|:---|
| **Maruti WagonR Tour H3 CNG** | ₹989.00 | ₹679.00 | ₹599.00 | ₹479.00 | ₹379.00 | ₹30.00 |
| **Dzire Tour S CNG** | ₹1,100.00 | ₹799.00 | ₹719.00 | ₹599.00 | ₹479.00 | ₹30.00 |
| **Citroen eC3 (EV)** | ₹1,400.00 | ₹1,090.00 | ₹1,010.00 | ₹890.00 | ₹790.00 | ₹30.00 |

### 4.4 The 14 "Expectation Case Fixed Revenue Share" Partners
In Hyderabad's historical Hisaab sheets (`Plans.xlsx`, Sheet `Plans`, Columns G:I, Rows 4–19), operations maintained a special roster of 14 bilateral fixed-rate partners:

| ID | Partner ID | Partner Name | Vehicle Model Scope | Custom Daily Rent | Custom Daily Fee | Net Daily Rent | Contract Label / Agreement Basis |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **156**| `LETZHYD8897187692` | Khaja Abdul Mujeeb | ALL | ₹970.00 | ₹30.00 | ₹1,000.00 | Operator Custom Flat Agreement |
| **157**| `LETZHYDIP9346939240`| C Yeswanth Kumar Raju | ALL | ₹970.00 | ₹30.00 | ₹1,000.00 | Fixed Rent Driver Agreement |
| **158**| `LETZHYD9985560206` | Gundawar Ramesh | ALL | ₹1,000.00 | ₹30.00 | ₹1,030.00 | Fixed Rent Driver Agreement |
| **159**| `LETZHYDIP6301998819`| Mohd Abdul Muneeb | ALL | ₹920.00 | ₹30.00 | ₹950.00 | Fixed Rent Driver Agreement |
| **160**| `LETZHYDIP9381891907`| Goli Nitish kumar | ALL | ₹970.00 | ₹30.00 | ₹1,000.00 | Fixed Rent Driver Agreement |
| **161**| `LETZHYDIP9052136251`| Shaik Khalleel Basha | ALL | ₹1,050.00 | ₹30.00 | ₹1,080.00 | Fixed Rent Driver Agreement |
| **162**| `LETZHYDIP9391757100`| Rayapalli Naga Yaswanth| ALL | ₹1,050.00 | ₹30.00 | ₹1,080.00 | Fixed Rent Driver Agreement |
| **163**| `LETZHYDIP8143524398`| Doneti Tarun Kumar | ALL | ₹1,400.00 | ₹30.00 | ₹1,430.00 | Fixed Rent EV Agreement |
| **219**| `LETZHYDIP7569776283`| Mohd Abdul Qadir | Dzire Tour S | ₹1,070.00 | ₹30.00 | ₹1,100.00 | Multi-Model Agreement (Dzire) |
| **220**| `LETZHYD9849106470` | Mohammed Zubair | Dzire Tour S | ₹1,070.00 | ₹30.00 | ₹1,100.00 | Multi-Model Agreement (Dzire) |
| **164**| `LETZHYDIP9701685282`| Shaik Kareem | ALL | ₹1,200.00 | **₹0.00** | ₹1,200.00 | **Shaik Kareem Waiver Card** |
| **2** | `LETZHYDIP9640404017`| Pasupureddy Karthik | ALL | ₹900.00 | ₹30.00 | ₹930.00 | Fixed Rent Driver Agreement |
| **1** | `LETZHYDIP9390599335`| Mudupu Sai Baba | ALL | ₹940.00 | ₹30.00 | ₹970.00 | Fixed Rent Driver Agreement |
| **165**| `LETZHYDIP9866941379`| Syed Qutubuddin | ALL | ₹1,200.00 | ₹30.00 | ₹1,230.00 | Fixed Rent Sedan Agreement |

### 4.5 Multi-Model Fleet Operator Nuance (Qadir & Zubair)
Both Mohd Abdul Qadir (`LETZHYDIP7569776283`) and Mohammed Zubair (`LETZHYD9849106470`) hold model-differentiated fleet agreements:
- **Maruti Dzire Tour S CNG:** Contracted rate of **₹1,070.00 / day** (plus ₹30 fee = ₹1,100).
- **Maruti WagonR Tour H3 CNG:** Contracted rate of **₹970.00 / day** (plus ₹30 fee = ₹1,000).
- **Citroen eC3 EV:** Contracted rate of **₹1,400.00 / day** (plus ₹30 fee = ₹1,430).

#### Resolution:
In the database, agreements are stored by both `partner_id` AND `vehicle_model`. Qadir's WagonR rate of **₹970** comes directly from his custom partner card in `rental_custom_partner_plans` (Card #12), while the WagonR model baseline in `rental_model_baselines` is ₹1,050. The engine applies ₹1,070 to his Dzires and ₹970 to his WagonRs automatically.

### 4.6 Fee Rules, Waivers & Retired Fleet Exclusions
- **Shaik Kareem Waiver (Fee Rules #4 & #5):** Partner IDs `LETZHYDIP9701685282` and `LETZHYDIP9885838038` operate under an executive indemnity waiver (`is_waiver = TRUE`, `fee_amount = 0.00`).
- **Hyundai Xcent Retired Fleet (Fee Rules #3 & #8):** Any vehicle with `car_model ILIKE '%Xcent%'` receives an automatic waiver of the ₹30.00 daily indemnity fee, operating at ₹0.00 fee liability.

### 4.7 Mathematical Walkthroughs & Concrete Case Studies

#### Case HYD-1: Dzire Driver on EBS Tier 3
- **Driver:** K Kutadi (`LETZHYD8123456789`) | **Vehicle:** `TG07T4455` (Dzire Tour S)
- **Activity:** On-road 7 days; completed 126 Uber trips.
- **Execution:**
  1. Matched Plan #7 (`HYD_UBER_EBS`), Dzire curve, 120–134 trips bracket.
  2. Base Rent = ₹599.00. Fee = ₹30.00.
  3. Gross Daily Rent = $₹599.00 + ₹30.00 = ₹629.00$.
  4. Weekly Total: $7 	imes ₹629.00 = \mathbf{₹4,403.00}$.

#### Case HYD-2: Mohd Abdul Qadir Operating Multi-Model Fleet
- **Operator:** Mohd Abdul Qadir (`LETZHYDIP7569776283`)
- **Vehicles:** `TG07T6473` (Dzire Tour S) and `TG07V0572` (WagonR). Both on-road 7 days.
- **Execution:**
  - For `TG07T6473`: Matched Dzire Custom Partner Card #219. Base Rent = ₹1,070.00, Fee = ₹30.00 $ightarrow$ Gross = ₹1,100.00/day ($7 	imes ₹1,100 = \mathbf{₹7,700.00}$).
  - For `TG07V0572`: Matched WagonR Custom Partner Card #12. Base Rent = ₹970.00, Fee = ₹30.00 $ightarrow$ Gross = ₹1,000.00/day ($7 	imes ₹1,000 = \mathbf{₹7,000.00}$).

---

# 5. City 3: Mumbai (MUM) — Complete Rental Specification

### 5.1 Plan Catalogue & Operational Structure
Mumbai operates primarily on Maruti WagonR and Dzire Tour S fleets, characterized by high trip densities and a financial convention where spreadsheets display Gross Daily Rent directly.

| Plan ID | Plan Code | Plan Category | Calculation Type | Default Base Rent | Default Fee | Default Gross Rent | Operational Context |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **10** | `MUM_UBER_REDUCING` | STANDARD | `SLAB_TIERED` | ₹970.00 | ₹30.00 | ₹1,000.00 | Standard Mumbai 6-tier reducing curve |
| **11** | `MUM_DZIRE_STD` | STANDARD | `FLAT_RATE` | ₹1,100.00 | ₹30.00 | ₹1,130.00 | Mumbai Dzire Sedan Flat Rate |
| **12** | `MUM_ALL_PLATFORM`| STANDARD | `FLAT_RATE` | ₹1,050.00 | ₹30.00 | ₹1,080.00 | Mumbai All-Platform Flat Commercial Rent |
| **13** | `MUM_FALLBACK` | STANDARD | `MODEL_FALLBACK` | ₹970.00 | ₹30.00 | ₹1,000.00 | Mumbai Model Baseline Fallback Plan |

### 5.2 The Standard 2-Tier Curve vs. The 6-Tier Slab
In high-level operational descriptions, Mumbai is summarized as a 2-tier curve:
- **0 – 99 Trips:** ₹970.00 base + ₹30.00 fee = **₹1,000.00 Gross / Day**
- **100+ Trips:** ₹850.00 base + ₹30.00 fee = **₹880.00 Gross / Day**

Underlying production data in `rental_rate_slabs` implements the detailed **6-Tier Dynamic Reducing Slab**:

| Slab ID | Trip Range (Weekly) | Database Base Rent | Daily Indemnity Fee | Hisaab Gross Rent | Discount vs. Base |
|:---|:---|:---|:---|:---|:---|
| **82** | 0 – 64 trips | **₹970.00** | ₹30.00 | **₹1,000.00** | Baseline Rate |
| **83** | 65 – 79 trips | **₹759.00** | ₹30.00 | **₹789.00** | -₹211.00 / day |
| **84** | 80 – 109 trips | **₹659.00** | ₹30.00 | **₹689.00** | -₹311.00 / day |
| **85** | 110 – 124 trips | **₹569.00** | ₹30.00 | **₹599.00** | -₹401.00 / day |
| **86** | 125 – 139 trips | **₹439.00** | ₹30.00 | **₹469.00** | -₹531.00 / day |
| **87** | 140+ trips | **₹339.00** | ₹30.00 | **₹369.00** | -₹631.00 / day |

### 5.3 Contract Transition Windows (Tiwari & Prajapati)
Historical settlement sheets reflect commercial contract amendments between June and September:
* **Ashish Kumar Tiwari (`LETZMUM8009895827`, Vehicle `MH03ES2583`):**
  - **June & July (Weeks 26 & 27):** Rate was **₹999 Base + ₹30 Fee = ₹1,029 Gross**.
  - **September (Week 37+):** Contracted at **₹970 Base + ₹30 Fee = ₹1,000 Gross**.
* **Dinesh Prasad Prajapati (`LETZMUMIP8169447128`, Vehicle `MH03ES4925`):**
  - **June & July (Weeks 26 & 27):** Standard retail Plan 10 = **₹1,000 Gross**.
  - **September (Week 37+):** Custom deal of **₹999 Base + ₹30 Fee = ₹1,029 Gross**.

* **Audit Transparency:** Rather than inventing an arbitrary mid-week transition date (such as July 1st, which bisects Week 27), this is documented as an **Unresolved Operational Transition Window between WK27 and WK37** pending a signed contract addendum from LetzRyd management. Both eras are preserved in `rental_custom_partner_plans` via date ranges.

### 5.4 Multi-Model Fleet Operator Nuance (Gaadylo Enterprises)
In September (Week 37), **Gaadylo Enterprises (`LETZMUMIP9004200105`)** operates multiple vehicle models:
* **Maruti WagonR:** Contracted at **₹900 Base + ₹30 Fee = ₹930 Gross**.
* **Hyundai Aura / Sedan (`MH03FC...` series):** Contracted at **₹1,100 Base + ₹30 Fee = ₹1,130 Gross**.
The database resolves both models automatically.

### 5.5 Fee Structure & Gross Rent Display Paradigm
In Mumbai's financial reporting:
- `applied_daily_rent` = Base Rate (e.g. ₹970.00)
- `applied_daily_indemnity` = Daily Indemnity Fee (₹30.00)
- `net_daily_rent` = `applied_daily_rent` + `applied_daily_indemnity` = ₹1,000.00
This matches column `M` ("Daily Revenue Share") in Mumbai Hisaab workbooks with 0 variance across 100% of the fleet.

---

# 6. The Unified Algorithm & Execution Engine

### 6.1 Database Schema & Physical DDL Entities
The relational schema comprises seven core tables in the `public` schema:

```
  public.core_rental_plans
  (plan_id SERIAL PK, plan_code VARCHAR, city VARCHAR, calculation_type VARCHAR, default_daily_rent, default_daily_fee)
         |
         +--> public.rental_rate_slabs
         |    (slab_id SERIAL PK, plan_id FK, partner_id, condition_rule, trip_min, trip_max, base_daily_rent)
         |
         +--> public.rental_custom_partner_plans
         |    (custom_plan_id SERIAL PK, partner_id, vehicle_model, custom_daily_rent, custom_daily_fee, valid_from, valid_to)
         |
         +--> public.rental_model_baselines
         |    (baseline_id SERIAL PK, city, vehicle_model, default_base_rent, default_daily_indemnity)
         |
         +--> public.rental_fee_rules
         |    (fee_rule_id SERIAL PK, city, partner_id, vehicle_model, fee_amount, is_waiver, valid_from, valid_to)
         |
         +--> public.rental_exceptions
         |    (exception_id SERIAL PK, partner_id, vehicle_number, override_daily_rent, override_fee, status)
         |
         v
  public.daily_rent_log
  (id SERIAL PK, log_date, week_id, vehicle_number, partner_id, city, vehicle_model, attendance_status,
   is_billable_day, weekly_completed_trips, applied_daily_rent, applied_daily_indemnity, net_daily_rent,
   matched_plan_id, matched_slab_id, matched_custom_plan_id, calculation_rule)
```

### 6.2 The 5-Tier Precedence Waterfall & Decision Tree
When calculating rent for vehicle $V$ assigned to partner $P$ on date $D$, the engine executes this strict 5-tier evaluation waterfall:

```
                                    +-----------------------------------+
                                    |  Step 0: Custody & Billability    |
                                    |  is_billable_day = TRUE?          |
                                    +-----------------------------------+
                                                      |
                                     +----------------+----------------+
                                     | NO                              | YES
                                     v                                 v
                            Rent = ₹0.00, Fee = ₹0.00        +-----------------------------------+
                            Rule: 'Non-billable status'      | Priority 1: rental_exceptions     |
                                                              | Approved override exists?         |
                                                              +-----------------------------------+
                                                                                |
                                                               +----------------+----------------+
                                                               | YES                             | NO
                                                               v                                 v
                                                      Apply Override Rent      +-----------------------------------+
                                                      Lineage: Exception ID    | Priority 2: Custom Partner Plans  |
                                                                               | Active Card for Partner/Model?    |
                                                                               +-----------------------------------+
                                                                                                 |
                                                                                +----------------+----------------+
                                                                                | YES                             | NO
                                                                                v                                 v
                                                                       Apply Custom Card        +-----------------------------------+
                                                                       Lineage: Custom Plan ID  | Priority 3: Dynamic Rate Slabs    |
                                                                                                | Matching Trip Min/Max & Rule?     |
                                                                                                +-----------------------------------+
                                                                                                                  |
                                                                                                 +----------------+----------------+
                                                                                                 | YES                             | NO
                                                                                                 v                                 v
                                                                                        Apply Slab Rate          +-----------------------------------+
                                                                                        Lineage: Slab ID         | Priority 4: Model Baselines       |
                                                                                                                 | Baseline exists for Model?        |
                                                                                                                 +-----------------------------------+
                                                                                                                                   |
                                                                                                                  +----------------+----------------+
                                                                                                                  | YES                             | NO
                                                                                                                  v                                 v
                                                                                                         Apply Model Baseline     +-----------------------------------+
                                                                                                         Lineage: Baseline ID     | Priority 5: Master City Default   |
                                                                                                                                  | core_rental_plans Default Rent    |
                                                                                                                                  +-----------------------------------+
```

#### Strict 5-Tier Indemnity Fee Precedence:
1. **Tier 1: Approved Exception Fee** (`rental_exceptions.override_fee`)
2. **Tier 2: Explicit Fee Rule / Waiver** (`rental_fee_rules.fee_amount` where `is_waiver = TRUE` strictly dominates)
3. **Tier 3: Custom Card Fee** (`rental_custom_partner_plans.custom_daily_fee`)
4. **Tier 4: Slab Default Fee** (`rental_rate_slabs.default_daily_fee`)
5. **Tier 5: Master Company Default** (₹30.00/day)

### 6.3 Stored Procedure Specification: `public.sp_calculate_daily_rent`
The stored procedure is defined with signature:
```sql
CREATE OR REPLACE PROCEDURE public.sp_calculate_daily_rent(
    IN p_start_date DATE DEFAULT NULL::DATE,
    IN p_end_date DATE DEFAULT NULL::DATE
)
```
- **Execution Window:** Automatically expands `p_start_date` and `p_end_date` to full ISO week boundaries (`v_week_start` to `v_week_end`) to guarantee whole-week repricing.
- **Set-Based CTE Pipeline:**
  1. `raw_status`: Normalizes vehicle numbers, joins `core_partner_onboarding` for structured `onboarding_type` (`'Operator'` vs `'Individual'`) and `enrolled_plan_id`.
  2. `daily_trips`: Computes `day_trips` (date-specific for attendance override) and `week_trips` (cumulative for slab tiering).
  3. `status_with_billability`: Evaluates date-level custody and resolves default plans.
  4. `waterfall`: Executes the 5-tier lateral joins for rent and 5-tier lateral join for indemnity.
  5. `INSERT ... ON CONFLICT (log_date, vehicle_number, partner_id) DO UPDATE`: Updates the open draft ledger with full re-entrancy.

### 6.4 Synchronization Engine: `public.sp_sync_rent_to_hisaab`
Once `daily_rent_log` is populated, the synchronization procedure pushes daily rental amounts directly into the financial settlement tables:
```sql
CREATE OR REPLACE PROCEDURE public.sp_sync_rent_to_hisaab(IN p_week_id VARCHAR DEFAULT NULL)
```
- **Guard Clause:** Verifies `is_locked = FALSE` on `hisaab_settlement_weeks`. Prevents accidental updates to closed, paid-out settlement cycles.
- **Bulk Ledger Synchronization:** Updates `public.hisaab_daily_ledger` setting `daily_rent_applied`, `daily_indemnity_fee`, `net_daily_rent`, and recomputes `daily_net_balance`.
- **Weekly Rollup Execution:** Automatically invokes `sp_sync_hisaab_vehicle_weekly` and `sp_sync_hisaab_partner_weekly` to aggregate weekly settlement summaries.

### 6.5 Financial Lineage, Audit Trail & Ledger Logging
Every calculated row in `public.daily_rent_log` captures forensic lineage columns:
- `matched_plan_id`: Integer reference to `core_rental_plans(plan_id)`.
- `matched_slab_id`: Integer reference to `rental_rate_slabs(slab_id)`.
- `matched_custom_plan_id`: Integer reference to `rental_custom_partner_plans(custom_plan_id)`.
- `calculation_rule`: Human-readable text audit string (e.g., `'Priority 3: Dynamic Slab (Plan #18: BLR_OP_RISHAD_EBS, Slab #77)'` or `'Priority 2: Custom Partner Deal (Card #219: MOHD ABDUL QADIR)'`).

### 6.6 Comprehensive Variable & Parameter Dictionary

| Variable Identifier | Data Type | Physical Source / Scope | Definition & Mathematical Role |
|:---|:---|:---|:---|
| `p_start_date` | `DATE` | Procedure Input | Beginning of calculation date range (defaults to `CURRENT_DATE - 1`) |
| `p_end_date` | `DATE` | Procedure Input | End of calculation date range (defaults to `p_start_date`) |
| `v_week_start` | `DATE` | Derived Variable | Monday of the target ISO week (expands window for weekly repricing) |
| `v_week_end` | `DATE` | Derived Variable | Sunday of the target ISO week |
| `v_curr_date` | `DATE` | Procedure Loop | Current day being processed in date series loop |
| `vehicle_number` | `VARCHAR(32)` | `CDVS.vehicle_number` | Alphanumeric registration identifier normalized to uppercase without spaces |
| `partner_id` | `VARCHAR(64)` | `CDVS.partner_id` | Unique partner/driver ID code (e.g., `LETZBLRIP9656907001`) |
| `attendance_status` | `VARCHAR(64)` | `CDVS.final_status` | Operational vehicle custody status (`Active`, `Drop Off`, `RFD`, `Maintenance`) |
| `billable_rent_day` | `BOOLEAN` | `CDVS.billable_rent_day`| Operational flag denoting whether custody is commercially billable |
| `day_trips` | `INT` | Daily Aggregation | Trips on `v_curr_date` only (evaluates custody override) |
| `weekly_completed_trips`| `INT` | Weekly Aggregation | Cumulative trips across ISO week (evaluates reducing slab tier) |
| `weekly_ola_trips` | `INT` | Weekly Aggregation | Cumulative Ola trips across ISO week |
| `customer_type` | `VARCHAR(32)` | Structured Column | Onboarding classification from `core_partner_onboarding.onboarding_type` |
| `enrolled_plan_id` | `INT` | Structured Column | Plan ID resolved from `core_partner_onboarding.driver_plan` |
| `applied_daily_rent` | `NUMERIC(10,2)` | Waterfall Output | Base vehicle rental rate per day |
| `applied_daily_indemnity`|`NUMERIC(10,2)`| Fee Rules Output | Daily accidental protection and insurance fee per day |
| `net_daily_rent` | `NUMERIC(10,2)` | Engine Output | Gross daily rental liability (`applied_daily_rent + applied_daily_indemnity`) |
| `matched_plan_id` | `INT` | Engine Output | Foreign key to `core_rental_plans` resolving lineage |
| `matched_slab_id` | `INT` | Engine Output | Foreign key to `rental_rate_slabs` resolving lineage |
| `matched_custom_plan_id`|`INT` | Engine Output | Foreign key to `rental_custom_partner_plans` resolving lineage |
| `calculation_rule` | `VARCHAR(255)` | Engine Output | Traceable textual proof string documenting waterfall decision path |

---

# 7. Operational Edge Cases & Historical Reconciliation Guide

### 7.1 Auditing Methodology: Database vs. Historical Hisaab Workbooks
To validate the mathematical engine prior to production deployment, an exhaustive audit was performed against 934 vehicle allocations from Week 26 Hisaab workbooks:
- **Overall Fleet Parity:** **910 / 934 (97.43%) Exact Matches**.
- **Mumbai:** **177 / 177 (100.00%) Matches** (0 variances).
- **Hyderabad:** **146 / 146 (100.00%) Matches** (0 variances).
- **Bangalore:** **587 / 611 (96.07%) Matches** (24 operational variances).

### 7.2 The 24 Bangalore Operational Items (Root-Cause Breakdown)
Forensic investigation of the 24 Bangalore variances revealed three clear operational categories:

1. **Category 1: 20 Zero-Trip Spreadsheet Omissions (Path B Idle Day Penalty):**
   - *Vehicles:* Rows 9, 49, 87, 119, 133, 137, 143, 153, 161, 166, 190, 211, 270, 287, 455, 459, 499, 517, 573, 574.
   - *Root Cause:* In Excel, the unedited formula checked `trips <= 89` and awarded the base discount rate (₹929 or ₹900) even when trips were 0. Operations manually hand-typed `1050` on 81 rows but missed these 20 rows.
   - *Engine Action:* The database engine applies the proposed Path B policy (₹1,050 full rent), reducing manual spreadsheet discrepancies from 101 down to 20.

2. **Category 2: 3 Operator Contract Skips (Accidental Formula Pasting):**
   - *Row 245 (`KA51AL1870`, Rishad P V):* Excel formula evaluated to ₹929.00 (Individual formula). Database correctly applied Rishad's contract rate of ₹800.00.
   - *Rows 315 & 589 (`KA51AM1076` & `KA51AM7861`, Mohammed Irshad):* Excel cell had a generic TBS formula pasted (evaluating to ₹879.00). Database correctly assigned his negotiated agreement tier of ₹900.00.

3. **Category 3: 1 Manual Hardcoding Override:**
   - *Row 506 (`KA51AM6314`, Kaja Hussain A):* Completed 13 Uber trips. Standard Individual tier is ₹929.00. The Excel sheet had hardcoded `1050.0` typed without a formula (unrecorded verbal charge). Database applies the standard slab rate of ₹929.00.

### 7.3 Multi-City Reconciliation Playbook & Troubleshooting Checklist
When investigating a variance between reported Hisaab and database output:
1. **Check Vehicle Custody in CDVS:** Run `SELECT attendance_status, billable_rent_day FROM core_daily_vehicle_status WHERE vehicle_number = :veh AND status_date = :dt`. Verify whether the day is billable.
2. **Verify Weekly Platform Trip Aggregations:** Run `SELECT SUM(completed_trips) FROM core_uber_daily` and `core_ola_daily` over the week window. Ensure no trips were dropped during ingestion.
3. **Inspect Priority 1 Overrides:** Check `SELECT * FROM rental_exceptions WHERE vehicle_number = :veh AND :dt BETWEEN valid_from AND valid_to AND status = 'APPROVED'`.
4. **Inspect Priority 2 Partner Cards:** Check `SELECT * FROM rental_custom_partner_plans WHERE partner_id = :pid AND is_active = TRUE AND :dt BETWEEN valid_from AND valid_to`.
5. **Inspect Priority 3 Slabs & Condition Rules:** If Ola trips $\ge 1$, verify if the vehicle is subject to the `OLA_GE_1` flat rate rule (₹1,050.00).
6. **Inspect Fee Rules:** Verify if the partner or vehicle model has an active waiver in `rental_fee_rules`.

### 7.4 Automated Scheduling & Production Deployment Safeguards
The engine runs autonomously within the PostgreSQL database cluster via `pg_cron`:

```sql
-- Nightly at 02:00 UTC (07:30 IST): Calculate daily rent across all active vehicles
SELECT cron.schedule('rental-daily-calculation', '0 2 * * *', 
    'CALL public.sp_calculate_daily_rent(CURRENT_DATE - 1, CURRENT_DATE);');

-- Nightly at 02:30 UTC (08:00 IST): Synchronize rent into Hisaab settlements
SELECT cron.schedule('hisaab-rent-sync', '30 2 * * *', 
    'CALL public.sp_sync_rent_to_hisaab(NULL);');
```

**Production Safeguards:**
1. **Idempotent Retries:** If the calculation job fails due to network or maintenance interruptions, rerunning `CALL public.sp_calculate_daily_rent(start_date, end_date)` cleanly overwrites `daily_rent_log` without creating duplicate records.
2. **Locked Week Immutability:** `sp_sync_rent_to_hisaab` checks `hisaab_settlement_weeks.is_locked`. Once management approves and locks a week, batch jobs automatically skip modifying historical ledgers.
3. **Foreign Key Integrity:** `matched_plan_id`, `matched_slab_id`, and `matched_custom_plan_id` utilize foreign key references preserving audit histories.
