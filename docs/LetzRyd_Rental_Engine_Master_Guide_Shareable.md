# LetzRyd Rental Plans: Complete Guide to Calculation Logic, Plans & Edge Cases

This guide explains how daily vehicle rental is calculated across **Bangalore, Hyderabad, and Mumbai** in the automated Hisaab system. It covers every plan, trip slab, fee rule, operator deal, and edge case in simple, direct language with all technical and numerical details included.

---

## Table of Contents
1. [The Problem with Spreadsheets & Why We Automated This](#1-the-problem-with-spreadsheets--why-we-automated-this)
2. [Core Concepts Explained Simply](#2-core-concepts-explained-simply)
3. [City 1: Bangalore (BLR) Deep-Dive](#3-city-1-bangalore-blr-deep-dive)
4. [City 2: Hyderabad (HYD) Deep-Dive](#4-city-2-hyderabad-hyd-deep-dive)
5. [City 3: Mumbai (MUM) Deep-Dive](#5-city-3-mumbai-mum-deep-dive)
6. [The Calculation Algorithm (Step-by-Step Decision Tree)](#6-the-calculation-algorithm-step-by-step-decision-tree)
7. [The 7 Database Tables](#7-the-7-database-tables)
8. [Fleet Scorecard & The 24 Remaining Discrepancies in Bangalore](#8-fleet-scorecard--the-24-remaining-discrepancies-in-bangalore)
9. [Summary of Guidance Needed from Operations](#9-summary-of-guidance-needed-from-operations)

---

## 1. The Problem with Spreadsheets & Why We Automated This

When managing 930+ vehicles across multiple cities in Google Sheets or Excel, several recurring problems happen every week:

1. **Formula Pasting Errors:** When dragging down formulas, standard retail formulas often get accidentally pasted over special fleet operators. For example, in Bangalore, an operator with an agreed ₹800/day rate had an Excel formula pasted over their vehicle that calculated ₹929/day.
2. **Multi-Model Lookup Blind Spots:** Standard Excel formulas like `XLOOKUP(Partner_ID, ...)` match **only on Partner ID**. If an operator in Hyderabad has both Dzire sedans and WagonR hatchbacks, the formula tries to charge the higher Dzire rate (₹1,070) for all cars. To fix this, operations had to manually type numbers like `970.0` into individual cells week after week.
3. **Manual Overwrite Fatigue on 0-Trip Days:** Under company policy, if an active car does 0 trips, it is charged full daily rent (₹1,050). But because the spreadsheet formula automatically gave a discount for `< 89 trips`, team members had to hand-type `1050` across 80+ rows every single Monday. Missing just a few rows led to billing errors.
4. **No Date Tracking for Contract Changes:** When a driver's contract rate was updated mid-year (e.g. transitioning between June and September), changing the rate card in Excel broke historical audits for earlier weeks.

### How Automated Hisaab Fixes This
* **100% Table-Driven:** There are zero hardcoded numbers in code. Every rate, slab, discount, fee, and agreement is stored in clean database tables.
* **Model-Aware & Date-Aware:** The engine automatically checks **who** the partner is, **what vehicle model** they are driving, and **what date** the trip occurred on.
* **Full Audit Lineage:** For every vehicle on every single day, the system records the exact Plan ID, Slab ID, and rule it matched, along with a human-readable explanation.

---

## 2. Core Concepts Explained Simply

### 1. Base Rent vs. Gross Rent vs. Net Settlement
* **Base Daily Rent:** The vehicle rental charge itself (e.g., ₹970, ₹929, ₹800).
* **Daily Indemnity Fee:** A daily insurance and accidental protection fee. The standard company-wide rate is **₹30/day**, unless specifically waived or discounted.
* **Gross Daily Rent:** The total daily rent charged to the partner:
  $$\text{Gross Daily Rent} = \text{Base Daily Rent} + \text{Daily Indemnity Fee}$$
  *(For example: ₹970 Base + ₹30 Fee = ₹1,000 Gross Daily Rent).*
* **Weekly Rent:** `Gross Daily Rent × On-Road Days`.
* **Net Settlement:** The final amount paid to or collected from the driver after factoring in toll challans, fuel/advances, and platform trip earnings.

### 2. What Counts as an On-Road Day?
* Rent is charged **only for days the vehicle is on-road/active** in the Central Daily Vehicle Status (CDVS).
* **Trip Override Rule:** If CDVS says a vehicle was "Breakdown" or "Idle", but platform data shows the car completed trips on Uber or Ola that day, the system automatically overrides the status to active and bills the vehicle.

### 3. Settlement Cycle
* Settlements are calculated on a strict **ISO Calendar Week** (Monday 00:00:00 to Sunday 23:59:59).

### 4. Date-Effective Validity (`valid_from` to `valid_to`)
* Contracts and rate cards can change over time. Every agreement in the database has a valid start date and end date. Historical settlement audits for June use June rates, while September settlements automatically use September rates.

---

## 3. City 1: Bangalore (BLR) Deep-Dive

Bangalore has 611 vehicles in the fleet. It combines dynamic trip-reducing curves for individual retail drivers with flat-rate agreements for fleet operators.

### 1. The Core Bangalore Plans

| Plan Code | Plan Name | Target Audience | Calculation Type | Standard Base Rate | Default Fee |
| :--- | :--- | :--- | :--- | :---: | :---: |
| `BLR_MASTER_IND` | Bangalore Master Individual | Individual retail drivers | Dynamic Reducing Slabs | ₹929.00 | ₹30.00 |
| `BLR_MASTER_OP` | Bangalore Master Operator | Fleet operators without custom deal | Dynamic Reducing Slabs | ₹900.00 | ₹30.00 |
| `BLR_UBER_TBS` | Bangalore Uber TBS | Legacy Uber Trip-Based Slab | Dynamic Reducing Slabs | ₹929.00 | ₹30.00 |
| `BLR_ALL_PLATFORM`| Bangalore Dual-Platform Flat | Drivers active across multiple apps | Flat Rate | ₹1,050.00 | ₹30.00 |
| `BLR_FALLBACK` | Bangalore General Fallback | Default safety fallback | Model Baseline | ₹1,050.00 | ₹30.00 |

---

### 2. The Bangalore Reducing Curves

#### A. Master Individual Curve (`BLR_MASTER_IND`)

| Weekly Trip Range | Daily Base Rent | Daily Indemnity Fee | Gross Daily Rent | Operational Context |
| :---: | :---: | :---: | :---: | :--- |
| **0 Trips (Idle)** | **₹1,050.00** | **₹30.00** | **₹1,080.00** | **Zero-Trip Rule:** Vehicles sitting idle pay full standard rent. |
| **1 to 89 Trips** | **₹929.00** | **₹30.00** | **₹959.00** | Standard baseline operating tier. |
| **90 to 109 Trips** | **₹665.00** | **₹30.00** | **₹695.00** | Tier 1 performance incentive (-₹264/day discount). |
| **110 to 129 Trips** | **₹525.00** | **₹30.00** | **₹555.00** | Tier 2 performance incentive (-₹404/day discount). |
| **130+ Trips** | **₹400.00** | **₹30.00** | **₹430.00** | Elite volume tier (-₹529/day discount). Max vehicle utilization. |

#### B. Master Operator Curve (`BLR_MASTER_OP`)
Operators managing multiple vehicles without a custom contract receive a baseline discount:

| Weekly Trip Range | Daily Base Rent | Daily Indemnity Fee | Gross Daily Rent |
| :---: | :---: | :---: | :---: |
| **0 Trips (Idle)** | **₹1,050.00** | **₹30.00** | **₹1,080.00** |
| **1 to 89 Trips** | **₹900.00** | **₹30.00** | **₹930.00** |
| **90 to 109 Trips** | **₹645.00** | **₹30.00** | **₹675.00** |
| **110 to 129 Trips** | **₹500.00** | **₹30.00** | **₹530.00** |
| **130+ Trips** | **₹365.00** | **₹30.00** | **₹395.00** |

---

### 3. The Multi-Platform Rule (Dual-App Drivers)
* **The Rule:** If a driver is on an Uber slab plan but completes **1 or more trips on Ola**, the Uber trip discount is cancelled.
* **Result:** The driver is charged the flat **`BLR_ALL_PLATFORM` rate of ₹1,050/day**.
* **Why:** Dynamic discount slabs are funded by Uber volume incentives. Splitting trips across apps deprives the fleet of meeting target brackets, so dual-app drivers forfeit the discounted curve and pay the flat standard rate.
* **Real Example (Row 11):** Vehicle `KA05AP7491` (Driver: Muhammed Rahees M) completed 61 Ola trips and 1 Uber trip. Under this rule, the engine charges the flat ₹1,050/day rate.

---

### 4. Bangalore Operator Master Agreements
The database stores contracted agreements for fleet operators:

* **Rishad P V (`LETZBLRIP9656907001`):** Contracted at **₹800.00/day** base rent with a special fee concession of **₹20.00/day** (Gross: ₹820/day).
* **Mohammed Irshad / Rishan R (`LETZBLRIP7356813050`):** Contracted at **₹900.00/day** base rent + ₹30.00 fee (Gross: ₹930/day).
* **Hamza Moidu (`LETZBLRIP9633600609`):** Contracted 4-tier curve starting at ₹870.00 base.
* **Subhan Khan M N (`LETZBLR8105051939`):** Contracted 4-tier curve starting at ₹850.00 base.
* **Mohamed Ramees A (`LETZBLRIP9845345799`):** Contracted at ₹900.00 base rent.

---

### 5. Bangalore Fee Rules & Concessions
While standard indemnity fee is ₹30/day, specific rules are stored in the database:
* **Nisamudeen K P (`LETZBLRIP9947932622`):** Fee concession of **₹15.00/day**.
* **Rishad P V (`LETZBLRIP9656907001`):** Fee concession of **₹20.00/day**.
* **Shaik Kareem (`LETZHYDIP9701685282`):** Fee waiver to **₹0.00/day**.

---

## 4. City 2: Hyderabad (HYD) Deep-Dive

Hyderabad (146 vehicles) calculates rent based on specific vehicle models (WagonR, Dzire, EC3) across two primary retail structures: **TBS (Trip Based Slab)** and **EBS (Earnings Based Slab)**.

### 1. Vehicle Model Baselines

| Vehicle Model | Baseline Daily Rent | Daily Indemnity Fee | Gross Daily Rent | Role |
| :--- | :---: | :---: | :---: | :--- |
| **Maruti Wagonr Tour H3 CNG** | **₹1,050.00** | **₹30.00** | **₹1,080.00** | Core fleet hatchback. Standard fixed plan baseline. |
| **Dzire Tour S CNG** | **₹1,200.00** | **₹30.00** | **₹1,230.00** | Commercial sedan baseline. |
| **EC3 (Citroen Electric)** | **₹1,400.00** | **₹30.00** | **₹1,430.00** | Electric vehicle fleet baseline. |
| **Hyundai Xcent** | **₹0.00** | **₹0.00** | **₹0.00** | Legacy retired fleet (Zero rent, zero fee). |

---

### 2. The Hyderabad Trip Curves

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
In the Hyderabad spreadsheet (`Plans` sheet, Columns G to I, Rows 4 to 19), a dedicated table titled **`Expectation Case Fixed Revenue Share`** held contracted flat rates. The spreadsheet formula checked this table **first** before evaluating trip slabs:

```excel
=ARRAY_CONSTRAIN(ARRAYFORMULA(
  IF(G63="", 0,
  IF(AND(OR($E63="Maruti Wagonr Tour H3 CNG",$E63="EC3",$E63="Dzire Tour S CNG"), 
         ISNUMBER(MATCH($G63, Plans!$H$6:$H$100, 0))),
     XLOOKUP($G63, Plans!$H$6:$H$100, Plans!$I$6:$I$100),
     ... [Generic TBS / EBS Slabs] ...
```

All 14 partners from this table are stored in our database:

| # | Partner Name | Partner ID | Contracted Daily Rent | Vehicle Details |
| :-: | :--- | :--- | :---: | :--- |
| 1 | Khaja Abdul Mujeeb | `LETZHYD8897187692` | **₹970.00** | Maruti WagonR |
| 2 | C Yeswanth Kumar Raju | `LETZHYDIP9346939240` | **₹970.00** | Maruti WagonR |
| 3 | Gundawar Ramesh | `LETZHYD9985560206` | **₹1,000.00** | Maruti WagonR |
| 4 | Mohd Abdul Muneeb | `LETZHYDIP6301998819` | **₹920.00** | Maruti WagonR |
| 5 | Goli Nitish Kumar | `LETZHYDIP9381891907` | **₹970.00** | Maruti WagonR |
| 6 | Shaik Khalleel Basha | `LETZHYDIP9052136251` | **₹1,050.00** | Maruti WagonR |
| 7 | Rayapalli Naga Yaswanth | `LETZHYDIP9391757100` | **₹1,050.00** | Maruti WagonR |
| 8 | Doneti Tarun Kumar | `LETZHYDIP8143524398` | **₹1,400.00** | EC3 Electric |
| 9 | **Mohd Abdul Qadir** | `LETZHYDIP7569776283` | **Multi-Model** | Dzire: ₹1,070 \| WagonR: ₹970 \| EC3: ₹1,400 |
| 10 | **Mohammed Zubair** | `LETZHYD9849106470` | **Multi-Model** | Dzire: ₹1,070 \| WagonR: ₹970 |
| 11 | **Shaik Kareem** | `LETZHYDIP9701685282` | **Multi-Model** | Dzire: ₹1,200 \| WagonR: ₹900 (Fee = ₹0 waiver) |
| 12 | **Pasupureddy Karthik** | `LETZHYDIP9640404017` | **₹900.00** | Maruti WagonR (25+ vehicles) |
| 13 | **Mudupu Sai Baba** | `LETZHYDIP9390599335` | **₹940.00** | Maruti WagonR (6+ vehicles) |
| 14 | Syed Qutubuddin | `LETZHYDIP9866941379` | **₹1,200.00** | Dzire Tour S CNG |

---

### 4. Multi-Model Operator Contracts Explained
* **Why Excel Struggled:** In the spreadsheet, `XLOOKUP` only searched by Partner ID. For Mohd Abdul Qadir (`LETZHYDIP7569776283`), the table listed ₹1,070. But ₹1,070 was his rate for **Dzires** (`TG07T3211`, `TG07T6473`, `TG07T6475`). When he also took WagonRs (`TG07V0572`, `TG07V3815`), the spreadsheet formula attempted to charge ₹1,070 on the WagonRs too. Operations had to manually type `970.0` into the spreadsheet cells week after week to prevent overcharging.
* **How Automated Hisaab Solves This:** In PostgreSQL, agreements are stored by **both** `partner_id` AND `vehicle_model`. The engine automatically applies ₹1,070 to his Dzires and ₹970 to his WagonRs.
* **Result:** Hyderabad achieved **146 / 146 (100.00%) perfect match with zero mismatches**.

---

## 5. City 3: Mumbai (MUM) Deep-Dive

Mumbai (177 vehicles) operates on a clean 2-tier high-level retail structure and an underlying 6-tier production curve.

### 1. The Standard Retail Slabs

#### A. The High-Level 2-Tier Curve
* **Plan 1 (0 to 99 Trips):** **₹970.00 Base + ₹30.00 Fee = ₹1,000.00 Gross Daily Rent**
* **Plan 2 (100+ Trips):** **₹850.00 Base + ₹30.00 Fee = ₹880.00 Gross Daily Rent**

#### B. The Detailed 6-Tier Production Curve (`MUM_UBER_REDUCING`)

| Weekly Trip Range | Daily Base Rent | Daily Indemnity Fee | Gross Daily Rent |
| :---: | :---: | :---: | :---: |
| **0 to 64 Trips** | **₹970.00** | **₹30.00** | **₹1,000.00** |
| **65 to 79 Trips** | **₹759.00** | **₹30.00** | **₹789.00** |
| **80 to 109 Trips** | **₹659.00** | **₹30.00** | **₹689.00** |
| **110 to 124 Trips** | **₹569.00** | **₹30.00** | **₹599.00** |
| **125 to 139 Trips** | **₹439.00** | **₹30.00** | **₹469.00** |
| **140+ Trips** | **₹339.00** | **₹30.00** | **₹369.00** |

---

### 2. Date-Effective Contract Transitions
A major breakthrough occurred when we inspected both June (Week 26/27) and September (Week 37) sheets. Two key drivers had contract updates:

* **Ashish Kumar Tiwari (`LETZMUM8009895827`, Vehicle `MH03ES2583`):**
  - **June & July (W26 & W27):** Rate was **₹999 Base + ₹30 Fee = ₹1,029 Gross**.
  - **September (W37):** Updated to **₹970 Base + ₹30 Fee = ₹1,000 Gross**.
* **Dinesh Prasad Prajapati (`LETZMUMIP8169447128`, Vehicle `MH03ES4925`):**
  - **June & July (W26 & W27):** Standard retail Plan 1 = **₹1,000 Gross**.
  - **September (W37):** Received a custom deal of **₹999 Base + ₹30 Fee = ₹1,029 Gross**.

By using date ranges (`valid_from` to `valid_to`), automated Hisaab matches both historical weeks at **100.00% parity (0 mismatches)**.

---

### 3. Mumbai Multi-Model Fleet Operator (Gaadylo Enterprises)
In September (Week 37), **Gaadylo Enterprises (`LETZMUMIP9004200105`)** operates multiple vehicle models:
* **Maruti WagonR:** Contracted at **₹900 Base + ₹30 Fee = ₹930 Gross**.
* **Hyundai Aura / Sedan (`MH03FC...` series):** Contracted at **₹1,100 Base + ₹30 Fee = ₹1,130 Gross**.
The database resolves both models automatically.

---

## 6. The Calculation Algorithm (Step-by-Step Decision Tree)

Whenever automated Hisaab runs for a vehicle on any given date, it executes the stored procedure `sp_calculate_daily_rent` following this **5-Step Waterfall**:

```
[Vehicle, Partner, Date, Trips, Model, City]
                     │
                     ▼
  Step 1: Check Temporary Exceptions (rental_exceptions)
          ├── Match? ──> Apply Concession Rate & Fee
          └── No Match?
                     │
                     ▼
  Step 2: Check Custom Partner Agreements (rental_custom_partner_plans)
          ├── Match (by Partner + Model + Date Range)? ──> Apply Contract Rate
          └── No Match?
                     │
                     ▼
  Step 3: Check Dynamic Trip Slabs (rental_rate_slabs)
          ├── 0 Trips? ──> Apply ₹1,050 Idle Rate (Path B)
          ├── Ola >= 1 on Uber plan? ──> Apply ₹1,050 Flat Dual-App Rate
          ├── Standard Trip Bracket Match? ──> Apply Tiered Slab Rate
          └── No Match?
                     │
                     ▼
  Step 4: Check Vehicle Model Baselines (rental_model_baselines)
          ├── Match (e.g. WagonR ₹1,050, Dzire ₹1,200, EC3 ₹1,400)? ──> Apply
          └── No Match?
                     │
                     ▼
  Step 5: Apply City Fallback Rate (core_rental_plans)
                     │
                     ▼
  Final Step: Apply Daily Indemnity Fee (rental_fee_rules)
          └── Base Rent + Resolved Fee (₹30, ₹20, ₹15, or ₹0) = Gross Daily Rent
                     │
                     ▼
  Persist Full Audit Lineage into daily_rent_log
```

---

## 7. The 7 Database Tables

All rental logic is governed by 7 relational tables in PostgreSQL:

| Table Name | Purpose | Key Columns |
| :--- | :--- | :--- |
| **`core_rental_plans`** | Catalogue of all standard and custom plans. | `plan_id`, `plan_code`, `city`, `default_daily_rent`, `default_daily_fee` |
| **`rental_rate_slabs`** | Brackets and thresholds for dynamic reducing curves. | `slab_id`, `plan_id`, `trip_min`, `trip_max`, `base_daily_rent` |
| **`rental_custom_partner_plans`** | Negotiated partner rate cards with model & date validity. | `custom_plan_id`, `partner_id`, `vehicle_model`, `custom_daily_rent`, `valid_from`, `valid_to` |
| **`rental_model_baselines`** | Standard fallbacks by vehicle model. | `baseline_id`, `city`, `vehicle_model`, `default_base_rent` |
| **`rental_fee_rules`** | Indemnity fee rules and partner waivers. | `fee_rule_id`, `partner_id`, `vehicle_model`, `daily_indemnity_fee` |
| **`rental_exceptions`** | Temporary emergency concession overrides. | `exception_id`, `vehicle_number`, `discount_amount`, `valid_from`, `valid_to` |
| **`daily_rent_log`** | Nightly audit ledger recording calculation lineage. | `matched_plan_id`, `matched_slab_id`, `matched_custom_plan_id`, `gross_rent` |

---

## 8. Fleet Scorecard & The 24 Remaining Discrepancies in Bangalore

### Current Fleet Parity Scorecard

| City | Total Fleet Vehicles | Automated Matches | Remaining Differences | Match % | Status |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Mumbai** | **177** | **177** | **0** | **100.00%** | **100% Perfect Match** |
| **Hyderabad** | **146** | **146** | **0** | **100.00%** | **100% Perfect Match** |
| **Bangalore** | **611** | **587** | **24** | **96.07%** | 20 zero-trip misses, 3 operator skips, 1 override |
| **TOTAL FLEET** | **934** | **910** | **24** | **97.43%** | **Production Ready** |

---

### Exactly What Causes the 24 Remaining Bangalore Discrepancies

Across the entire 934-vehicle fleet, **only 24 items remain**, and all are in Bangalore:

#### 1. Missed 0-Trip Manual Overwrites in the Sheet (20 Vehicles)
* **What Happened:** Under company policy, active vehicles with 0 trips are charged full rent (**₹1,050**). In the Week 26 sheet, operations successfully hand-typed `1050` on 81 rows. However, they missed doing so on these 20 rows! Because the formula remained active, it outputted ₹929 for 14 individual drivers and ₹900 for 6 operators.
* **What Automated Hisaab Does:** The engine applies the standard ₹1,050 full rent.
* **Impact:** Automating this rule reduced manual typing discrepancies from **101 potential errors down to just 20**.
* **Sample Vehicles:** `KA51AL1130` (Row 42), `KA51AL1486` (Row 85), `KA51AM1061` (Row 312).

#### 2. Operator Contract vs. Generic Formula Pasting (3 Vehicles)
* **What Happened:**
  - **Row 245 (`KA51AL1870` — Partner: Rishad `LETZBLRIP9656907001`):** Rishad's signed contract rate is **₹800/day**. In the sheet, someone pasted a generic TBS formula that calculated ₹929. Automated Hisaab applies his contracted rate of ₹800.
  - **Rows 315 & 589 (`KA51AM1076` & `KA51AM7861` — Partner: Mohammed Irshad `LETZBLRIP7356813050`):** His signed contract rate is **₹900/day**. In the sheet, someone pasted a formula that calculated ₹879. Automated Hisaab applies his contracted rate of ₹900.

#### 3. Active Driver Manual Override (1 Vehicle)
* **What Happened:**
  - **Row 506 (`KA51AM6314` — Partner: Kaja Hussain `LETZBLR8884242699`):** Completed 13 Uber trips. Under standard slab policy, 13 trips qualifies for the ₹929 tier. However, someone hand-typed `1050` in the sheet with no formula. Automated Hisaab applies the standard slab rate of ₹929.

---

## 9. Summary of Guidance Needed from Operations

To finalize the remaining 24 Bangalore vehicles, operations only needs to confirm three items:

1. **Confirm the Zero-Trip Rule:** Confirm that all 20 zero-trip vehicles should be billed at **₹1,050 full rent** (as automated Hisaab currently does), correcting the spreadsheet omission.
2. **Confirm Operator Agreements:** Confirm that Rishad (₹800) and Mohammed Irshad (₹900) should be billed at their master contract rates rather than the pasted spreadsheet formulas.
3. **Clarify Row 506 (Kaja Hussain):** Confirm whether charging ₹1,050 for 13 trips was an intentional one-off disciplinary penalty or should remain at the standard ₹929 slab rate.
