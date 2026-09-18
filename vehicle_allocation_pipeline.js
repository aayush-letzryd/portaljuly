/**
 * ==============================================================================
 * LETZRYD - VEHICLE ALLOCATION PIPELINE (PAN INDIA MASTER SYNC)
 * ==============================================================================
 * 
 * Master Source Sheet : 'Pan India Master Sheet' (View-Only Access)
 *   URL : https://docs.google.com/spreadsheets/d/1Lww1a0MaYtjhn1qG5w7luzrqOidDzdTyPDK7bGk4ULM/edit#gid=1886507521
 *   Tab : 'Onboarding form_V2' / Allocation Tab
 * 
 * Destination Sheet   : 'sheet_allocations' (Editable Google Sheet with Apps Script)
 *   URL : https://docs.google.com/spreadsheets/d/1o3rYoEHdeFbOlK6sEtXOWlMLGF-YINXZJRbljOQG-Ig/edit#gid=937501892
 *   Tab : 'sheet_vehicle_allocations'
 * 
 * Destination Database: PostgreSQL
 *   Host : 35.200.196.113:5432
 *   Table: public.sheet_vehicle_allocations
 * 
 * KEY ARCHITECTURE FOR VIEWER-ONLY SOURCE:
 * - Since the account has View-Only access to the Master Source Sheet, triggers 
 *   (onEdit / onFormSubmit) cannot be added to the Master Sheet directly.
 * - This Google Apps Script is hosted in an editable standalone sheet (Destination Sheet).
 * - A time-driven trigger (e.g. 1-minute interval) executes `syncAllocationData()`.
 * - It uses `SpreadsheetApp.openByUrl()` to read from the view-only master sheet,
 *   standardizes/cleans the allocation records, updates the destination sheet, 
 *   and upserts the data into PostgreSQL (`public.sheet_vehicle_allocations`).
 * ==============================================================================
 */

function getDbConfig() {
  let props = null;
  try {
    props = PropertiesService.getScriptProperties();
  } catch(e) {}

  return {
    host: (props && props.getProperty("DB_HOST")) || "35.200.196.113",
    port: (props && props.getProperty("DB_PORT")) || "5432",
    database: (props && props.getProperty("DB_NAME")) || "postgres",
    user: (props && props.getProperty("DB_USER")) || "postgres",
    password: (props && props.getProperty("DB_PASSWORD")) || "8S5]U3@L^Xz)\\FH}",
    
    // Master Source Sheet (Pan India Master Sheet - Read Only Viewer Access)
    sourceSpreadsheetUrl: (props && props.getProperty("SOURCE_SPREADSHEET_URL")) || "https://docs.google.com/spreadsheets/d/1Lww1a0MaYtjhn1qG5w7luzrqOidDzdTyPDK7bGk4ULM/edit#gid=1886507521",
    
    // Destination Sheet (Editable Sheet running Apps Script)
    targetSpreadsheetUrl: (props && props.getProperty("TARGET_SPREADSHEET_URL")) || "https://docs.google.com/spreadsheets/d/1o3rYoEHdeFbOlK6sEtXOWlMLGF-YINXZJRbljOQG-Ig/edit#gid=937501892",
    targetSheetName: (props && props.getProperty("TARGET_SHEET_NAME")) || "sheet_vehicle_allocations"
  };
}

/**
 * Main execution function set on a 1-minute Time-driven Trigger
 */
function syncAllocationData() {
  const config = getDbConfig();
  Logger.log("Starting Vehicle Allocation Sync...");

  // 1. Open Source Sheet (View-Only Mode)
  const sourceSs = SpreadsheetApp.openByUrl(config.sourceSpreadsheetUrl);
  const sourceSheet = sourceSs.getSheets()[0];
  const sourceData = sourceSheet.getDataRange().getValues();

  if (sourceData.length <= 1) {
    Logger.log("No data rows found in source sheet.");
    return;
  }

  // 2. Open Target Editable Sheet
  const targetSs = SpreadsheetApp.openByUrl(config.targetSpreadsheetUrl);
  let targetSheet = targetSs.getSheetByName(config.targetSheetName);
  if (!targetSheet) {
    targetSheet = targetSs.insertSheet(config.targetSheetName);
  }

  Logger.log("Fetched " + (sourceData.length - 1) + " allocation rows from source sheet.");

  // 3. PostgreSQL Database Connection via JDBC
  const connUrl = "jdbc:postgresql://" + config.host + ":" + config.port + "/" + config.database;
  let conn = null;
  try {
    conn = Jdbc.getConnection(connUrl, config.user, config.password);
    conn.setAutoCommit(false);

    const upsertSql = `
      INSERT INTO public.sheet_vehicle_allocations (
        submission_timestamp, submitter_email, city, reason_to_visit, allocation_date,
        operator_driver_id, allocation_type, driver_name, driver_phone, driver_plan,
        type_of_plan, car_model, vehicle_number, ola_negative_amount, odometer_reading,
        upload_agreement, ola_negative_amount_ss, driver_with_car_photo, front_car_photo,
        lh_car_photo, rh_car_photo, back_car_photo, battery_photo, stepney_tyre,
        spanner_pana, jack, jack_rod_tommy, parking_triangle, fire_extinguishers,
        floor_carpet, seat_cover, music_system, vehicle_manager_poc, partner_type,
        rental_plan, sheet_row_number, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON CONFLICT (sheet_row_number) DO UPDATE SET
        submission_timestamp = EXCLUDED.submission_timestamp,
        submitter_email = EXCLUDED.submitter_email,
        city = EXCLUDED.city,
        reason_to_visit = EXCLUDED.reason_to_visit,
        allocation_date = EXCLUDED.allocation_date,
        operator_driver_id = EXCLUDED.operator_driver_id,
        allocation_type = EXCLUDED.allocation_type,
        driver_name = EXCLUDED.driver_name,
        driver_phone = EXCLUDED.driver_phone,
        driver_plan = EXCLUDED.driver_plan,
        type_of_plan = EXCLUDED.type_of_plan,
        car_model = EXCLUDED.car_model,
        vehicle_number = EXCLUDED.vehicle_number,
        ola_negative_amount = EXCLUDED.ola_negative_amount,
        odometer_reading = EXCLUDED.odometer_reading,
        upload_agreement = EXCLUDED.upload_agreement,
        ola_negative_amount_ss = EXCLUDED.ola_negative_amount_ss,
        driver_with_car_photo = EXCLUDED.driver_with_car_photo,
        front_car_photo = EXCLUDED.front_car_photo,
        lh_car_photo = EXCLUDED.lh_car_photo,
        rh_car_photo = EXCLUDED.rh_car_photo,
        back_car_photo = EXCLUDED.back_car_photo,
        battery_photo = EXCLUDED.battery_photo,
        stepney_tyre = EXCLUDED.stepney_tyre,
        spanner_pana = EXCLUDED.spanner_pana,
        jack = EXCLUDED.jack,
        jack_rod_tommy = EXCLUDED.jack_rod_tommy,
        parking_triangle = EXCLUDED.parking_triangle,
        fire_extinguishers = EXCLUDED.fire_extinguishers,
        floor_carpet = EXCLUDED.floor_carpet,
        seat_cover = EXCLUDED.seat_cover,
        music_system = EXCLUDED.music_system,
        vehicle_manager_poc = EXCLUDED.vehicle_manager_poc,
        partner_type = EXCLUDED.partner_type,
        rental_plan = EXCLUDED.rental_plan,
        updated_at = NOW();
    `;

    const stmt = conn.prepareStatement(upsertSql);

    for (let i = 1; i < sourceData.length; i++) {
      const row = sourceData[i];
      const sheetRowNumber = i + 1;

      stmt.setObject(1, row[0] || null);
      stmt.setString(2, row[1] || "");
      stmt.setString(3, row[2] || "");
      stmt.setString(4, row[3] || "");
      stmt.setObject(5, row[4] || null);
      stmt.setString(6, row[5] || "");
      stmt.setString(7, row[6] || "");
      stmt.setString(8, row[7] || "");
      stmt.setString(9, String(row[8] || ""));
      stmt.setString(10, row[9] || "");
      stmt.setString(11, row[10] || "");
      stmt.setString(12, row[11] || "");
      stmt.setString(13, row[13] || "");
      stmt.setDouble(14, parseFloat(row[14]) || 0.0);
      stmt.setInt(15, parseInt(String(row[22]).replace(/,/g, '')) || 0);
      stmt.setString(16, row[12] || "");
      stmt.setString(17, row[15] || "");
      stmt.setString(18, row[16] || "");
      stmt.setString(19, row[17] || "");
      stmt.setString(20, row[18] || "");
      stmt.setString(21, row[19] || "");
      stmt.setString(22, row[20] || "");
      stmt.setString(23, row[21] || "");
      stmt.setString(24, row[23] || "");
      stmt.setString(25, row[24] || "");
      stmt.setString(26, row[25] || "");
      stmt.setString(27, row[26] || "");
      stmt.setString(28, row[27] || "");
      stmt.setString(29, row[28] || "");
      stmt.setString(30, row[29] || "");
      stmt.setString(31, row[30] || "");
      stmt.setString(32, row[31] || "");
      stmt.setString(33, row[32] || "");
      stmt.setString(34, row[33] || "");
      stmt.setString(35, row[34] || "");
      stmt.setInt(36, sheetRowNumber);

      stmt.addBatch();
    }

    stmt.executeBatch();
    conn.commit();
    stmt.close();
    Logger.log("Vehicle Allocation Sync completed successfully.");
  } catch(e) {
    if (conn) conn.rollback();
    Logger.log("Error during JDBC Sync: " + e.toString());
  } finally {
    if (conn) conn.close();
  }
}
