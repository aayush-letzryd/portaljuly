# LetzRyd Multi-City Rental Engine: Master Operations & Technical Guide

This document is the operational and technical guide to how daily vehicle rental is calculated across **Bangalore, Hyderabad, and Mumbai** in the automated Hisaab system. It details every rental plan, trip slab, fee rule, partner contract, calculation algorithm, and edge case across the fleet.

---

## Table of Contents
1. [Fleet Coverage & System Scope](#1-fleet-coverage--system-scope)
2. [Core Financial Concepts & Calculation Formulas](#2-core-financial-concepts--calculation-formulas)
3. [City 1: Bangalore (BLR) Deep-Dive](#3-city-1-bangalore-blr-deep-dive)
4. [City 2: Hyderabad (HYD) Deep-Dive](#4-city-2-hyderabad-hyd-deep-dive)
5. [City 3: Mumbai (MUM) Deep-Dive](#5-city-3-mumbai-mum-deep-dive)
6. [The 5-Step Waterfall Calculation Engine](#6-the-5-step-waterfall-calculation-engine)
7. [The 7 Canonical Database Tables](#7-the-7-canonical-database-tables)
8. [Audit Verification & The 24 Bangalore Items](#8-audit-verification--the-24-bangalore-items)
9. [Operational Sign-Off & Key Recommendations](#9-operational-sign-off--key-recommendations)

---

## 1. Fleet Coverage & System Scope

### Live Database Fleet Inventory
The automated rental engine is built to cover **the entire company fleet**, not just a subset of vehicles present in a single settlement sheet. Live database counts verify full coverage across all operational tables:

| Database Table | Entity Type | Verified Count | Role in Rental Engine |
| :--- | :--- | :---: | :--- |
| **`core_vehicle_onboarding`** | Total Registered Vehicles | **1,668** | Master vehicle inventory (1,647 operational + 21 unallocated yard stock). |
| **`core_daily_vehicle_status`** | Operational Vehicles on Road | **1,647** | Single source of truth for daily vehicle custody and active status. |
| **`daily_rent_log`** | Daily Vehicle Rental Records | **1,647** | **100% full coverage:** 85,474 daily logs calculated from May 28, 2026 to Sept 20, 2026. |
| **`core_partner_onboarding`** | Registered Drivers & Operators | **2,431** | Master partner registry across Bangalore, Hyderabad, and Mumbai. |
| **`rental_custom_partner_plans`**| Contracted Partner Rate Cards | **236** | Active agreements supporting model-specific rates and date ranges. |
| **`rental_model_baselines`** | Vehicle Model Rate Fallbacks | **31** | Covers every vehicle model operated in all three cities. |

### Clarifying the 934-Vehicle Audit vs. Full 1,647-Vehicle Fleet
* **The 934-Vehicle Benchmark:** During Week 26 (June 22nd–28th), exactly 934 vehicles were active in historical settlement sheets. We used this 934-vehicle dataset as a strict baseline to audit the engine against historical Excel calculations, confirming rupee-level match accuracy (achieving 100% in Mumbai, 100% in Hyderabad, and 96.1% in Bangalore).
* **The Full 1,647-Vehicle Production Scope:** The rental engine and its supporting tables (`core_rental_plans`, `rental_rate_slabs`, `rental_custom_partner_plans`, `rental_model_baselines`, `rental_fee_rules`) are system-wide tables that calculate daily rent for **all 1,647 operational vehicles** across every operating week.

### Consolidation of Legacy Tables
* The legacy table `partner_vehicle_rental_plans` was an unpopulated draft table with **0 rows**.
* All partner agreements were consolidated into the unified, model-aware, date-effective table **`rental_custom_partner_plans`** (236 active agreement records).
* Old, discarded rental tables (`core_rent`, `rents`, `rent_ledger`, `bkp_*`, etc.) were backed up with complete DDL schemas and row data into a separate repository archive (`LetzRyd_Discarded_Rental_Tables`) and dropped from PostgreSQL to keep the production schema clean.

### Automatic Handling of New Vehicles
When a new vehicle is onboarded in `core_vehicle_onboarding` and assigned in `core_daily_vehicle_status`:
1. If the driver has a contracted rate card, `rental_custom_partner_plans` applies it immediately.
2. If the driver is on standard retail, `rental_rate_slabs` evaluates their weekly trips.
3. If the vehicle is brand new with no trips recorded yet, `rental_model_baselines` catches it by model (WagonR ₹1,050, Dzire ₹1,200, EC3 ₹1,400).
No manual spreadsheet setup or code changes are required when new cars enter the fleet.

---

## 2. Core Financial Concepts & Calculation Formulas

### 1. Base Rent, Indemnity Fee & Gross Rent
* **Base Daily Rent:** The contracted vehicle rental rate (e.g. ₹970, ₹929, ₹800).
* **Daily Indemnity Fee:** A mandatory protection and insurance fee. The standard company-wide rate is **₹30.00/day**, unless specifically discounted or waived by agreement.
* **Gross Daily Rent:** The total daily charge billed to the driver:
  $$\text{Gross Daily Rent} = \text{Base Daily Rent} + \text{Daily Indemnity Fee}$$
  *(Example: ₹970 Base + ₹30 Fee = ₹1,000 Gross Daily Rent).*
* **Weekly Rental Charge:**
  $$\text{Total Weekly Rent} = \text{Gross Daily Rent} \times \text{Billable On-Road Days}$$

### 2. Date-Specific Custody vs. Weekly Slab Billability
* **Date-Specific Billability (`day_trips`):** Vehicles are billed only for days they are marked active/on-road in `core_daily_vehicle_status`. If a vehicle is marked "Maintenance", "Breakdown", or "Drop-off", it is **not billed** for that date. If platform logs show completed rides on that exact date, the system overrides the attendance to **Active** and bills rent. Crucially, trips completed on Monday **never** make a Thursday maintenance day billable.
* **Weekly Tiering (`week_trips`):** While custody is decided day-by-day, reducing slabs are earned on cumulative **weekly volume** (Monday 00:00:00 to Sunday 23:59:59).

### 3. Whole-Week Dynamic Repricing Engine & Mathematical Example
When the stored procedure `sp_calculate_daily_rent` runs daily, it automatically evaluates the **entire active ISO week** (`v_week_start` to `v_week_end`). As cumulative trips cross higher thresholds on later days of the week, earlier days in that open week are automatically repriced to the newly earned lower rate.

#### Concrete Mathematical Repricing Example:
* **Monday to Thursday Accumulation:** An operator on Rishad's TBS ladder (Plan 17) completes 15 trips per day $\times$ 4 days = **60 trips**.
  - Plan 17 Slab bracket: 55–64 trips $\rightarrow$ Base Rate = **₹760.00/day**.
  - Monday through Thursday are billed at ₹760.00 base rent + ₹20.00 indemnity = ₹780.00/day.
* **Friday Threshold Breach:** On Friday, the fleet completes another 15 trips, bringing total cumulative trips to **75 trips** (15 trips $\times$ 5 days = 75 trips).
  - Plan 17 Slab bracket: $\ge 75$ trips $\rightarrow$ Base Rate = **₹720.00/day** (top performance tier).
* **Whole-Week Retroactive Repricing:** When `sp_calculate_daily_rent` runs nightly on Friday, it detects that weekly trips reached 75. It automatically reprices Monday, Tuesday, Wednesday, Thursday, and Friday from ₹760.00 down to **₹720.00/day**, ensuring whole-week mathematical consistency.

### 4. Open Draft Ledger vs. Immutable Settlement Lock
* **Phase 1: Open Draft Recalculation:** During the current active week, `daily_rent_log` recalculates dynamically via `ON CONFLICT DO UPDATE` as daily trips accumulate.
* **Phase 2: Immutable Settlement Lock:** Once the week ends, accounts verify figures and trigger `sp_sync_rent_to_hisaab`. The week is marked `is_locked = TRUE` in `hisaab_settlement_weeks`. Once locked, historical rental records are frozen, and subsequent adjustments must be logged as separate credit/debit entries.

---

## 3. City 1: Bangalore (BLR) Deep-Dive

Bangalore has 611 vehicles in the audit fleet. It features tiered reducing curves for retail drivers, flat rate cards for fleet operators, and specific multi-platform rules.

### 1. Bangalore Plan Catalogue

| Plan Code | Plan Name | Target Audience | Calculation Type | Base Rent | Default Fee |
| :--- | :--- | :--- | :--- | :---: | :---: |
| `BLR_MASTER_IND` | Bangalore Master Individual | Retail individual drivers | Dynamic Reducing Slabs | ₹929.00 | ₹30.00 |
| `BLR_MASTER_OP` | Bangalore Master Operator | Fleet operators without custom card | Dynamic Reducing Slabs | ₹900.00 | ₹30.00 |
| `BLR_UBER_TBS` | Bangalore Uber TBS | Legacy Uber trip-based plan | Dynamic Reducing Slabs | ₹929.00 | ₹30.00 |
| `BLR_ALL_PLATFORM`| Bangalore Dual-Platform Flat | Drivers active across multiple apps | Flat Rate | ₹1,050.00 | ₹30.00 |
| `BLR_FALLBACK` | Bangalore General Fallback | Default safety fallback | Model Baseline | ₹1,050.00 | ₹30.00 |

---

### 2. Bangalore Reducing Slabs

#### A. Master Individual Slab (`BLR_MASTER_IND`)

| Weekly Trip Range | Daily Base Rent | Daily Indemnity Fee | Gross Daily Rent | Operational Rule |
| :---: | :---: | :---: | :---: | :--- |
| **0 Trips (Idle)** | **₹1,050.00** | **₹30.00** | **₹1,080.00** | **Proposed Zero-Trip Policy (Path B):** Idle cars charged full rent. |
| **1 to 89 Trips** | **₹929.00** | **₹30.00** | **₹959.00** | Standard baseline operating tier. |
| **90 to 109 Trips** | **₹665.00** | **₹30.00** | **₹695.00** | Tier 1 volume incentive (-₹264/day discount). |
| **110 to 129 Trips** | **₹525.00** | **₹30.00** | **₹555.00** | Tier 2 volume incentive (-₹404/day discount). |
| **130+ Trips** | **₹400.00** | **₹30.00** | **₹430.00** | Maximum performance tier (-₹529/day discount). |

#### B. Master Operator Slab (`BLR_MASTER_OP`)

| Weekly Trip Range | Daily Base Rent | Daily Indemnity Fee | Gross Daily Rent |
| :---: | :---: | :---: | :---: |
| **0 Trips (Idle)** | **₹1,050.00** | **₹30.00** | **₹1,080.00** |
| **1 to 89 Trips** | **₹900.00** | **₹30.00** | **₹930.00** |
| **90 to 109 Trips** | **₹645.00** | **₹30.00** | **₹675.00** |
| **110 to 129 Trips** | **₹500.00** | **₹30.00** | **₹530.00** |
| **130+ Trips** | **₹365.00** | **₹30.00** | **₹395.00** |

---

### 3. The Zero-Trip Rent Policy: Path A vs. Path B Side-by-Side
A major source of historical variance in Bangalore comes from how idle vehicles (0 completed trips) are billed. Both models are presented side-by-side for executive decision:

| Evaluation Dimension | Path A: Approved Historical Billing | Path B: Proposed Operational Idling Policy |
| :--- | :--- | :--- |
| **Core Logic** | Unedited Excel formula: Trips $\le 89 \rightarrow$ ₹929 (Individual) / ₹900 (Operator). | Hand-overwrites applied to 81 rows in Week 26: 0 trips $\rightarrow$ **₹1,050 full rent**. |
| **Commercial Rationale** | Baseline contractual tariff; driver is not penalized beyond standard rent. | Disincentivizes vehicle idling; driver keeping a commercial asset idle pays full opportunity rent. |
| **Weekly Financial Delta** | ₹929/day $\times$ 7 days = ₹6,503 base rent. | ₹1,050/day $\times$ 7 days = ₹7,350 base rent (+₹847 to +₹1,050 per vehicle/week). |
| **Fleet Impact (20 Missed Rows)** | 20 vehicles billed at ₹929 / ₹900. Total = **₹128,492**. | 20 vehicles billed at ₹1,050. Total = **₹148,652** (Net Delta: **+₹20,160.00/week**). |
| **Audit Excel Export** | Reflected in Column `Excel_Hisaab_Rent` of `LetzRyd_Row_Level_Reconciliation_Week26.xlsx`. | Reflected in Column `DB_Calculated_Rent_Path_B` of `LetzRyd_Row_Level_Reconciliation_Week26.xlsx`. |
| **System Status** | Supported via slab condition fallback. | **Engine default pending management sign-off**, eliminating all manual cell overrides. |

---

### 4. Multi-Platform Rule (Dual-App Drivers)
* **The Rule:** If an individual driver enrolled on an Uber incentive slab completes **1 or more trips on Ola**, the Uber volume discount curve is cancelled.
* **Result:** The driver is billed at the flat **`BLR_ALL_PLATFORM` rate of ₹1,050/day**.
* **Rationale:** Discount slabs are funded by Uber platform targets. Splitting trips across platforms prevents the fleet from hitting platform target tiers.
* **Case Study (Row 11):** Vehicle `KA05AP7491` (Driver: Muhammed Rahees M, `LETZBLR6238809258`) completed 61 Ola trips and 1 Uber trip. Because Ola trips $\ge 1$, the engine charges flat ₹1,050/day base rent.

---

### 5. Bangalore Operator Agreements & Canonical Partner IDs
Contracted rate cards stored in `rental_custom_partner_plans` and partner-scoped slabs in `rental_rate_slabs`:

| Partner Name | Canonical Partner ID | Vehicle Model | Custom Daily Rent | Daily Fee | Operational Agreement |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Rishad P V (TBS Fleet)** | `LETZBLRIP9656907001` | Maruti WagonR | **Plan 17 TBS Ladder** | **₹20.00** | **78 vehicles:** $\ge 75$ @ ₹720, 65–74 @ ₹740, 55–64 @ ₹760, <55 @ ₹800. Fee concession ₹20. |
| **Rishad P V (EBS Fleet)** | `LETZBLRIP9656907001` | Maruti WagonR | **Plan 18 EBS Ladder** | **₹20.00** | **44 vehicles:** 0–89 @ ₹800, 90–109 @ ₹550, 110–129 @ ₹410, 130+ @ ₹270. Fee concession ₹20. |
| **Mohammed Irshad / Rishan R** | `LETZBLRIP7356813050` | Maruti WagonR | **₹900.00** | **₹30.00** | Contracted fleet operator agreement. |
| **Hamza Moidu** | `LETZBLRIP7025077468` | Maruti WagonR | **Plan 14 TBS Ladder** | **₹30.00** | Contracted 4-tier curve starting at ₹870 base (75+ @ ₹770, 65-74 @ ₹790, 55-64 @ ₹840, <55 @ ₹870). |
| **Subhan Khan M N** | `LETZBLRIP7026684292` | Maruti WagonR | **Plan 15 TBS Ladder** | **₹30.00** | Contracted 4-tier curve starting at ₹850 base (75+ @ ₹770, 65-74 @ ₹790, 55-64 @ ₹810, <55 @ ₹850). |
| **Mohamed Ramees A** | `LETZBLRIP8075280208` | Maruti WagonR | **Plan 19 EBS Ladder** | **₹30.00** | Contracted EBS: 0-89 @ ₹900, 90-109 @ ₹615, 110-129 @ ₹465, 130+ @ ₹320. |

#### Preserving Rishad's Historical TBS vs. EBS Split Without Collisions
In Week 26 Hisaab, Rishad operated **122 total vehicles**:
- **78 vehicles** were designated `Rishad TBS` in Column `BA` and evaluated using his TBS formula:
  `=IF(AB>=75, 720, IF(AB>=65, 740, IF(AB>=55, 760, IF(AB<55, 800, ""))))` (Plan 17).  
  *Forensic Benchmark:* Row 316 (`KA51AM1078`) completed 57 Uber trips $\rightarrow$ evaluated to **₹760.00 base rent**.
- **44 vehicles** were designated `Not Found` in Column `BA` and evaluated using his EBS formula (Plan 18: 0–89 @ ₹800, 90–109 @ ₹550, 110–129 @ ₹410, 130+ @ ₹270).

**How the Database Solves the Collision:**
In PostgreSQL, Rishad's default partner plan in `core_partner_onboarding` is set to Plan 18 (`BLR_OP_RISHAD_EBS`). The 78 TBS vehicles are mapped at the vehicle level in `rental_custom_partner_plans` with `plan_id = 17`. In stored procedure `sp_calculate_daily_rent`, Priority 3 scopes slabs using `COALESCE(cp.plan_id, swb.enrolled_plan_id)`. This guarantees each vehicle resolves to its exact contracted curve without `trip_min` sorting collisions.

---

### 6. Bangalore Fee Concessions & Waivers
Standard daily indemnity fee is ₹30.00/day. Approved concessions in `rental_fee_rules`:
* **Nisamudeen K P (`LETZBLRIP9036461336` / `LETZBLRIP9947932622`):** Concession fee of **₹15.00/day** (Rule #6).
* **Rishad P V (`LETZBLRIP9656907001`):** Concession fee of **₹20.00/day** (Rule #7).
* **Shaik Kareem (`LETZHYDIP9701685282`):** Fee waiver to **₹0.00/day** (Rule #5).

---

## 4. City 2: Hyderabad (HYD) Deep-Dive

Hyderabad (146 vehicles in audit) calculates rent based on specific vehicle models (WagonR, Dzire, EC3) across two primary structures: **TBS (Trip Based Slab)** and **EBS (Earnings Based Slab)**.

### 1. Vehicle Model Baselines

| Vehicle Model | Baseline Daily Rent | Daily Indemnity Fee | Gross Daily Rent | Role |
| :--- | :---: | :---: | :---: | :--- |
| **Maruti Wagonr Tour H3 CNG** | **₹1,050.00** | **₹30.00** | **₹1,080.00** | Core fleet hatchback standard baseline. |
| **Dzire Tour S CNG** | **₹1,200.00** | **₹30.00** | **₹1,230.00** | Commercial sedan baseline. |
| **EC3 (Citroen Electric)** | **₹1,400.00** | **₹30.00** | **₹1,430.00** | Electric vehicle fleet baseline. |
| **Hyundai Xcent** | **₹0.00** | **₹0.00** | **₹0.00** | Retired fleet (Zero rent, zero fee waiver). |

---

### 2. Hyderabad Trip Curves

#### A. Hyderabad TBS Curve (`HYD_UBER_TBS`)

| Weekly Trip Range | WagonR Base Rent | Dzire Base Rent | EC3 (EV) Base Rent | Daily Fee |
| :---: | :---: | :---: | :---: | :---: |
| **0 to 49 Trips** | **₹989.00** | **₹1,100.00** | **₹1,400.00** | ₹30.00 |
| **50 to 59 Trips** | **₹889.00** | **₹1,009.00** | **₹1,300.00** | ₹30.00 |
| **60 to 69 Trips** | **₹849.00** | **₹959.00** | **₹1,260.00** | ₹30.00 |
| **70+ Trips** | **₹799.00** | **₹899.00** | **₹1,210.00** | ₹30.00 |

#### B. Hyderabad EBS & LIP Curve (`HYD_UBER_EBS` / `LIP Plan`)

| Weekly Trip Range | WagonR Base Rent | Dzire Base Rent | EC3 (EV) Base Rent | Daily Fee |
| :---: | :---: | :---: | :---: | :---: |
| **0 to 89 Trips** | **₹989.00** | **₹1,100.00** | **₹1,400.00** | ₹30.00 |
| **90 to 104 Trips** | **₹679.00** | **₹799.00** | **₹1,090.00** | ₹30.00 |
| **105 to 119 Trips** | **₹599.00** | **₹719.00** | **₹1,010.00** | ₹30.00 |
| **120 to 134 Trips** | **₹479.00** | **₹599.00** | **₹890.00** | ₹30.00 |
| **135+ Trips** | **₹379.00** | **₹479.00** | **₹790.00** | ₹30.00 |

---

### 3. The "Expectation Case" Master Table (All 14 Partners)
In the Hyderabad spreadsheet (`Plans` sheet, Columns G to I, Rows 4 to 19), operations maintained an **`Expectation Case Fixed Revenue Share`** side table. This table took precedence over generic trip slabs. All 14 partner agreements are stored in `rental_custom_partner_plans`:

| # | Partner Name | Canonical Partner ID | Contracted Daily Rent | Vehicle Model Scope | Forensic Evidence / Historical Notes |
| :-: | :--- | :--- | :---: | :--- | :--- |
| 1 | Khaja Abdul Mujeeb | `LETZHYD8897187692` | **₹970.00** | Maruti WagonR | Fixed partner contract. |
| 2 | C Yeswanth Kumar Raju | `LETZHYDIP9346939240` | **₹970.00** | Maruti WagonR | Fixed driver agreement. |
| 3 | Gundawar Ramesh | `LETZHYD9985560206` | **₹1,000.00** | Maruti WagonR | Fixed driver agreement. |
| 4 | Mohd Abdul Muneeb | `LETZHYDIP6301998819` | **₹920.00** | Maruti WagonR | Fixed driver agreement. |
| 5 | Goli Nitish Kumar | `LETZHYDIP9381891907` | **₹970.00** | Maruti WagonR | Fixed driver agreement. |
| 6 | Shaik Khalleel Basha | `LETZHYDIP9052136251` | **₹1,050.00** | Maruti WagonR | Fixed driver agreement. |
| 7 | Rayapalli Naga Yaswanth | `LETZHYDIP9391757100` | **₹1,050.00** | Maruti WagonR | Fixed driver agreement. |
| 8 | Doneti Tarun Kumar | `LETZHYDIP8143524398` | **₹1,400.00** | EC3 Electric | Fixed EV agreement. |
| 9 | **Mohd Abdul Qadir** | `LETZHYDIP7569776283` | **Multi-Model** | Dzire: ₹1,070 \| WagonR: ₹970 \| EC3: ₹1,400 | Model-specific agreement cards. |
| 10 | **Mohammed Zubair** | `LETZHYD9849106470` | **Multi-Model** | Dzire: ₹1,070 \| WagonR: ₹970 | Model-specific agreement cards. |
| 11 | **Shaik Kareem** | `LETZHYDIP9701685282` | **Multi-Model** | Dzire: ₹1,200 \| WagonR: ₹900 (Fee = ₹0 waiver) | Executive fee waiver card. |
| 12 | **Pasupureddy Karthik** | `LETZHYDIP9640404017` | **₹900.00** | Maruti WagonR (25+ vehicles) | Fleet operator agreement. |
| 13 | **Mudupu Sai Baba** | `LETZHYDIP9390599335` | **₹940.00** | Maruti WagonR (6+ vehicles) | Fleet operator agreement. |
| 14 | **Syed Qutubuddin** | `LETZHYDIP9866941379` | **₹1,200.00** | **ALL Models (Dzire Tour S & Citroen eC3)** | Rate applies across all models (evidenced by Citroen eC3 in W27 cells K132, K135, K138). |

---

### 4. Multi-Model Operator Nuance: Qadir & Zubair
* **The Problem:** In the spreadsheet, `XLOOKUP` matched by Partner ID only. Mohd Abdul Qadir (`LETZHYDIP7569776283`) was listed at **₹1,070** (his Dzire rate). When he also took WagonRs, the Excel formula tried to bill ₹1,070 on the WagonRs too, forcing ops to manually type `970.0` every week.
* **The Solution:** In `rental_custom_partner_plans`, agreements match by **both** `partner_id` AND `vehicle_model`. Qadir holds Card #219 (Dzire @ ₹1,070) and Card #235 (WagonR @ ₹970). The engine applies ₹1,070 to his Dzires and ₹970 to his WagonRs automatically.
* **Audit Parity:** Hyderabad achieved **146 / 146 (100.00%) perfect match with zero mismatches**.

---

## 5. City 3: Mumbai (MUM) Deep-Dive

Mumbai (177 vehicles in audit) features two distinct commercial structures: a high-level **Retail 2-Tier Curve** and an underlying **Production 6-Tier Slab**.

### 1. Delineation of Mumbai Plans

#### A. Mumbai Retail 2-Tier Plan (`MUM_RETAIL_2TIER`)
Designed for standard commercial leases where drivers pay a flat base rate that steps down once a weekly target of 100 trips is achieved:
* **0 to 99 Trips:** **₹970.00 Base + ₹30.00 Fee = ₹1,000.00 Gross Daily Rent**
* **100+ Trips:** **₹850.00 Base + ₹30.00 Fee = ₹880.00 Gross Daily Rent** (-₹120/day volume discount)

#### B. Mumbai Production 6-Tier Slab (`MUM_UBER_REDUCING` - Plan #10)
Underlying incentive ladder calibrated for high-density metropolitan driving across six granular trip brackets:

| Slab ID | Weekly Trip Range | Daily Base Rent | Daily Indemnity Fee | Gross Daily Rent | Discount vs. Base |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **82** | **0 to 64 Trips** | **₹970.00** | **₹30.00** | **₹1,000.00** | Baseline Rate |
| **83** | **65 to 79 Trips** | **₹759.00** | **₹30.00** | **₹789.00** | -₹211.00 / day |
| **84** | **80 to 109 Trips** | **₹659.00** | **₹30.00** | **₹689.00** | -₹311.00 / day |
| **85** | **110 to 124 Trips** | **₹569.00** | **₹30.00** | **₹599.00** | -₹401.00 / day |
| **86** | **125 to 139 Trips** | **₹439.00** | **₹30.00** | **₹469.00** | -₹531.00 / day |
| **87** | **140+ Trips** | **₹339.00** | **₹30.00** | **₹369.00** | -₹631.00 / day |

*Key Distinction:* While a 100-trip driver on the 2-Tier plan pays ₹850.00 base, a 100-trip driver on the 6-Tier plan achieves the 80–109 bracket paying **₹659.00 base**. Both plans are parameterized independently in `core_rental_plans` and `rental_rate_slabs`.

---

### 2. Contract Transition Windows: Tiwari & Prajapati
Historical workbooks show rate transitions between June and September:
* **Ashish Kumar Tiwari (`LETZMUM8009895827`, Vehicle `MH03ES2583`):**
  - **June & July (W26 & W27):** Rate was **₹999 Base + ₹30 Fee = ₹1,029 Gross**.
  - **September (W37):** Contracted at **₹970 Base + ₹30 Fee = ₹1,000 Gross**.
* **Dinesh Prasad Prajapati (`LETZMUMIP8169447128`, Vehicle `MH03ES4925`):**
  - **June & July (W26 & W27):** Standard retail Plan 10 = **₹1,000 Gross**.
  - **September (W37):** Custom deal of **₹999 Base + ₹30 Fee = ₹1,029 Gross**.

* **Audit Transparency:** Rather than inventing an arbitrary mid-week transition date (such as July 1st, which bisects Week 27), this is documented as an **Unresolved Operational Transition Window between WK27 and WK37** pending a signed contract addendum from LetzRyd management.

---

### 3. Multi-Model Operator: Gaadylo Enterprises
In September (Week 37), **Gaadylo Enterprises (`LETZMUMIP9004200105`)** operates multiple vehicle models:
* **Maruti WagonR:** Contracted at **₹900 Base + ₹30 Fee = ₹930 Gross**.
* **Hyundai Aura / Sedan (`MH03FC...` series):** Contracted at **₹1,100 Base + ₹30 Fee = ₹1,130 Gross**.
The database resolves both models automatically. Mumbai achieved **177 / 177 (100.00%) perfect match**.

---

## 6. The 5-Step Waterfall Calculation Engine

Whenever automated Hisaab runs for a vehicle on any given date, it executes the stored procedure `sp_calculate_daily_rent` following this 5-step decision tree:

```
[Input: Vehicle Number, Partner ID, Date, Completed Trips, Vehicle Model, City]
                                      │
                                      ▼
    Step 1: Check Temporary Exceptions (rental_exceptions)
            ├── Active exception? ──> Apply Concession Rate & Fee
            └── No match?
                                      │
                                      ▼
    Step 2: Check Custom Partner Card (rental_custom_partner_plans)
            ├── Matched (Partner ID + Model + Date Range)? ──> Apply Custom Rate
            └── No match?
                                      │
                                      ▼
    Step 3: Check Dynamic Trip Slabs (rental_rate_slabs)
            ├── Scoped by COALESCE(cp.plan_id, swb.enrolled_plan_id)
            ├── 0 Completed Trips? ──> Apply ₹1,050 Idle Rate (Path B)
            ├── Ola Trips >= 1 on Uber Plan? ──> Apply ₹1,050 Flat Dual-App Rate
            ├── Standard Bracket Match? ──> Apply Slab Rate
            └── No match?
                                      │
                                      ▼
    Step 4: Check Vehicle Model Baselines (rental_model_baselines)
            ├── Matched Model (WagonR ₹1,050, Dzire ₹1,200, EC3 ₹1,400)? ──> Apply
            └── No match?
                                      │
                                      ▼
    Step 5: Apply City Master Fallback Rate (core_rental_plans)
                                      │
                                      ▼
    Indemnity Fee Resolution (Strict 5-Tier Precedence):
            1. Exception Fee Override
            2. Explicit Fee Rule / Waiver (rental_fee_rules, where is_waiver=TRUE dominates)
            3. Custom Card Fee (rental_custom_partner_plans)
            4. Slab Default Fee (rental_rate_slabs)
            5. Standard Company Fallback (₹30.00)
                                      │
                                      ▼
    Write Calculation Audit Lineage into daily_rent_log
```

---

## 7. The 7 Canonical Database Tables

All rental calculations are governed by 7 clean relational tables in PostgreSQL:

| Table Name | Role in Engine | Primary Key | Key Columns |
| :--- | :--- | :--- | :--- |
| **`core_rental_plans`** | Master catalogue of all standard and custom plans. | `plan_id SERIAL` | `plan_code`, `city`, `default_daily_rent`, `default_daily_fee` |
| **`rental_rate_slabs`** | Brackets and thresholds for dynamic reducing curves. | `slab_id SERIAL` | `plan_id`, `trip_min`, `trip_max`, `base_daily_rent` |
| **`rental_custom_partner_plans`** | Contracted partner agreements (model-aware & date-effective). | `custom_plan_id SERIAL` | `partner_id`, `vehicle_model`, `custom_daily_rent`, `valid_from`, `valid_to` |
| **`rental_model_baselines`** | Standard fallbacks by vehicle model. | `baseline_id SERIAL` | `city`, `vehicle_model`, `default_base_rent` |
| **`rental_fee_rules`** | Indemnity fee policies and partner concessions. | `fee_rule_id SERIAL` | `partner_id`, `vehicle_model`, `fee_amount`, `is_waiver` |
| **`rental_exceptions`** | Temporary hardship and concession overrides. | `exception_id SERIAL` | `vehicle_number`, `override_daily_rent`, `valid_from`, `valid_to` |
| **`daily_rent_log`** | Audit ledger recording calculation lineage. | `id SERIAL` | `matched_plan_id`, `matched_slab_id`, `matched_custom_plan_id`, `net_daily_rent` |

---

## 8. Audit Verification & The 24 Bangalore Items

### Parity Audit Scorecard

| City | Fleet Vehicles | Automated Matches | Remaining Variances | Match % | Operational Status |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Mumbai** | **177** | **177** | **0** | **100.00%** | **100% Perfect Match** |
| **Hyderabad** | **146** | **146** | **0** | **100.00%** | **100% Perfect Match** |
| **Bangalore** | **611** | **587** | **24** | **96.07%** | 20 zero-trip misses, 3 operator skips, 1 override |
| **TOTAL FLEET** | **934** | **910** | **24** | **97.43%** | **Production Ready** |

*Row-Level Reconciliation Spreadsheet:* All 934 vehicles audited row-by-row are exported in **`C:\Users\anura\Downloads\LetzRyd_Row_Level_Reconciliation_Week26.xlsx`**, featuring Path A and Path B side-by-side columns.

---

### The 24 Bangalore Discrepancies Explained

All 24 remaining operational variances across the entire fleet are located in Bangalore:

#### 1. Missed 0-Trip Manual Overwrites in the Sheet (20 Vehicles)
* **What Happened:** Under management's proposed policy, active vehicles with 0 trips must pay full rent (**₹1,050**). In the Week 26 sheet, operations hand-typed `1050` on 81 rows, but missed doing so on these 20 rows. Because the unedited formula remained active, it returned ₹929 for 14 individual drivers and ₹900 for 6 operators.
* **What Automated Hisaab Does:** The engine applies standard ₹1,050 full rent (Path B), while preserving Path A for comparison.
* **Financial Delta:** The net delta across all 20 vehicles is **₹20,160.00/week** (Path A = ₹128,492 vs. Path B = ₹148,652).
* **Sample Vehicles:** `KA51AL1130` (Row 42), `KA51AL1486` (Row 85), `KA51AM1061` (Row 312).

#### 2. Operator Contract vs. Generic Formula Pasting (3 Vehicles)
* **What Happened:**
  - **Row 245 (`KA51AL1870` — Partner: Rishad `LETZBLRIP9656907001`):** Rishad's contract rate is **₹800/day**. In the sheet, someone pasted a generic TBS formula that calculated ₹929. Automated Hisaab applies his contracted rate of ₹800.
  - **Rows 315 & 589 (`KA51AM1076` & `KA51AM7861` — Partner: Mohammed Irshad `LETZBLRIP7356813050`):** His signed contract rate is **₹900/day**. In the sheet, someone pasted a formula that calculated ₹879. Automated Hisaab applies his contracted rate of ₹900.

#### 3. Active Driver Manual Override (1 Vehicle)
* **What Happened:**
  - **Row 506 (`KA51AM6314` — Partner: Kaja Hussain `LETZBLR8884242699`):** Completed 13 Uber trips. Under standard slab policy, 13 trips qualifies for the ₹929 tier. However, someone hand-typed `1050` in the sheet with no formula. Automated Hisaab applies the standard slab rate of ₹929.

---

## 9. Operational Sign-Off & Key Recommendations

To finalize automated billing for 100% of vehicles, operations only needs to confirm three operational decisions:

1. **Confirm Zero-Trip Rule:** Confirm whether all 20 zero-trip vehicles should be billed at **₹1,050 full rent** (Path B) or remain at the historical formula rate of **₹929/₹900** (Path A), resolving the ₹20,160/week delta.
2. **Confirm Operator Agreements:** Confirm that Rishad (₹800) and Mohammed Irshad (₹900) should be billed at their master contract rates rather than the pasted spreadsheet formulas.
3. **Clarify Row 506 (Kaja Hussain):** Confirm whether charging ₹1,050 for 13 trips was an intentional one-off disciplinary penalty or should remain at the standard ₹929 slab rate.
