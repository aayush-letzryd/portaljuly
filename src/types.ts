export type VisitorType = "Individual" | "Operator";
export type OnboardingOutcome = "Onboarding Process Initiated" | "Successfully Onboarded" | "Follow Up Required" | "No Follow Up Required / Closed" | "Others" | "Joined" | "Pending" | "Not Interested" | "Onboarding process initiated" | "Follow up required" | "No follow up required / Closed";

// LetzRyd RBAC Role Codes
export type RoleCode = "SA" | "BH" | "CM" | "DM" | "OB" | "SP" | string;

export interface WalkInRecord {
  id: number;
  visitor_type: VisitorType;
  event_date: string; 
  city: string;
  operating_place?: string;
  person_name: string;
  person_number: string;
  dl_number: string;
  aadhaar_number?: string;
  aadhaar_image?: string; 
  dl_image?: string; 
  visiting_reason: string;
  joined_status: OnboardingOutcome;
  remarks?: string;
  executive_name: string;
  executive_id: string;
}

export interface OnboardingRecord {
  id: number;
  driver_name: string;
  phone_number: string;
  whatsapp_number?: string;
  dob: string;
  city: string;
  operating_place?: string;
  present_address: string;
  permanent_address: string;
  emergency_name: string;
  emergency_phone: string;
  emergency_relationship?: string;
  dl_number?: string;
  dl_expiry_date?: string;
  lead_source?: string;
  pan_number: string;
  aadhaar_number: string;
  pan_aadhaar_linked?: string;
  selfie_photo?: string;
  dl_front?: string;
  dl_back?: string;
  pan_card_photo?: string;
  aadhaar_card_photo?: string;
  vendor_name?: string; 
  vendor_id?: string;
  father_name: string; 
  bank_name?: string;
  other_bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  upi_id?: string;
  documents_verified?: boolean;
  custom_rental_plan?: boolean;
  custom_rent_amount?: string;
  cancelled_cheque_photo?: string;
  signature_photo?: string;
  platform_details?: string | Record<string, any>;
  created_at: string;
}

export interface AdjustmentRecord {
  id: number;
  partner_name: string;
  partner_code: string;
  driver_id?: string;
  partner_number: string;
  vehicle_number?: string;
  city_name: string;
  partner_type: "Individual" | "Fleet" | "Rental";
  adjustment_level?: string;
  adjustment_nature?: string;
  time_duration?: string;
  adjustment_type: "Credit" | "Debit" | "Waiver";
  adjustment_date: string;
  enter_amount: string;
  remittance_towards?: string;
  adjustment_related_to?: string;
  remarks?: string;
  first_level_approval_by?: string;
  finance_team_status: "Approved" | "Pending" | "Rejected";
  finance_team_remarks?: string;
  final_level_approval_by?: string;
  status: "Completed" | "Hold" | "Declined";
  photo?: string;
  created_at: string;
  // NEW LETZRYD DOCUMENT FIELDS
  hisaab_number?: string;
  contested_line_items?: string;
  severity_level?: string;
  cost_level?: string;
  escalate_to?: string;
  submitter_comments?: string;
  sent_for_approval?: string;
}

export interface AllocationRecord {
  id: number;
  allocation_date: string;
  allocation_type: "New Allocation" | "Car Swap" | "Reallocation";
  city_name: string;
  driver_id: string;
  driver_name: string;
  driver_phone: string;
  driver_plan?: string;
  type_of_plan?: string;
  car_model?: string;
  vehicle_number: string;
  old_vehicle_number?: string;
  dropoff_odometer?: string;
  dropoff_remarks?: string;
  dropoff_photo?: string;
  is_migrated?: boolean;
  created_at: string;
}

export interface ExpenseRecord {
  id: number;
  expense_date: string;
  driver_name: string;
  phone_number: string;
  vehicle_number: string;
  expenses_type: string;
  amount_paid: string;
  reference_photo?: string;
  is_migrated?: boolean;
  created_at: string;
}

export interface User {
  username: string;
  name: string;
  role: string;
  executive_id: string;
  role_id?: number;
  role_code?: RoleCode; // RBAC integration
  permissions?: string[];
}

export interface CityOption {
  value: string;
  text: string;
}

export const CITIES: CityOption[] = [
  { value: "Hyderabad", text: "Hyderabad" },
  { value: "Bangalore", text: "Bangalore" },
  { value: "Mumbai", text: "Mumbai" }
];

export const MOCK_USERS: Record<string, { name: string; role: string; executive_id: string; password: string; role_code: RoleCode }> = {
  dshiva: {
    name: "D Shiva",
    role: "On-boarding Executive",
    executive_id: "EX-4091",
    password: "password",
    role_code: "OB"
  },
  anurag: {
    name: "Anurag Prasad",
    role: "Driver Manager",
    executive_id: "FM-1024",
    password: "password",
    role_code: "DM"
  },
  admin: {
    name: "Admin User",
    role: "Super Admin",
    executive_id: "AD-0001",
    password: "password",
    role_code: "SA"
  },
  support: {
    name: "Support Staff",
    role: "Support Executive",
    executive_id: "SP-1001",
    password: "password",
    role_code: "SP" // Read-only testing account
  }
};

export interface VehicleRecord {
  id: number;
  vehicle_number: string;
  letzryd_unique_no?: string;
  city_name: string;
  model: string;
  received_allocated: string;
  delivery_month?: string;
  registration_date: string;
  rto_tax_validity?: string;
  permit_validity?: string;
  fitness_validity: string;
  pollution_validity?: string;
  insurance_validity: string;
  authorization_certificate?: string;
  insurance_mapping?: string;
  kms_reading: string;
  tracking_device_vendor?: string;
  tracking_device_type?: string;
  cng_installed: string;
  cng_plate?: string;
  cng_installation_date?: string;
  jack?: string;
  jack_rod?: string;
  spanner?: string;
  parking_triangle?: string;
  fire_extinguishers?: string;
  seat_cover?: string;
  floor_carpet?: string;
  image_front?: string;
  image_lh?: string;
  image_back?: string;
  image_rh?: string;
  engine_chasis_no_img?: string;
  battery_sl_no_img?: string;
  engine_compartment_img?: string;
  fast_tag_img?: string;
  music_system_img?: string;
  key_quantity?: number;
  rc_document?: string;
  insurance_document?: string;
  authorization_certificate_doc?: string;
  rto_tax_receipt?: string;
  rh_fr_tyre_img?: string;
  lh_fr_tyre_img?: string;
  rh_rear_tyre_img?: string;
  lh_rear_tyre_img?: string;
  spare_wheel_img?: string;
  created_at: string;
}

export interface WorkshopRecord {
  id: number;
  vendor_name: string;
  workshop_type: string;
  city_name: string;
  address: string;
  gst_number: string;
  contact_person: string;
  mobile_number: string;
  email_id: string;
  pan_card: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  workshop_status: string;
  workshop_photo?: string;
  contact_person_2?: string;
  alternate_mobile?: string;
  telephone?: string;
  owner_name?: string;
  upi_id?: string;
  created_at: string;
}

export interface HubRecord {
  id: number;
  hub_name: string;
  city_name: string;
  address: string;
  pincode: string;
  facility_type: string;
  total_capacity: string;
  ev_charging?: string;
  security_cctv?: string;
  hub_manager?: string;
  manager_phone?: string;
  operating_hours?: string;
  hub_photo?: string;
  designation?: string;
  created_at: string;
}

export interface RentRecord {
  id: number;
  level: string;
  vehicle_manufacturer?: string;
  vehicle_model?: string;
  vehicle_number?: string;
  vehicle_age?: string;
  vendor_id?: string;
  driver_id?: string;
  rent_amount: number;
  status?: string;
  created_at?: string;
}

export interface AccidentRecord {
  id: number;
  vehicle_number: string;
  vendor_id?: string;
  vendor_name: string;
  city_name: string;
  date_of_accident: string;
  time_of_accident: string;
  place_of_accident: string;
  vehicle_status: "Drivable" | "Needs Towing" | "Impounded by Police";
  driver_id: string;
  driver_name: string;
  no_of_persons: string;
  third_party_involvement: "Yes" | "No";
  fir_filed: "Yes" | "No";
  accident_reason: string;
  accident_inspection: string;
  insurance_status: "Claimed" | "Pending" | "Rejected" | "N/A";
  repair_cost?: string;
  toeing_cost?: string;
  challan_amount?: string;
  fine_amount?: string;
  comments?: string;
  front_vehicle_photo?: string;
  back_vehicle_photo?: string;
  right_vehicle_photo?: string;
  left_vehicle_photo?: string;
  fir_document_copy?: string;
  created_at?: string;
}

export interface MaintenanceRecord {
  id: number;
  vehicle_number: string;
  city_name: string;
  model: string;
  vehicle_k_m_s: string;
  repair_type: string;
  vehicle_location?: string;
  vehicle_in_date: string;
  initial_remarks?: string;
  vehicle_damage_photos?: string;
  workshop_name: string;
  allocation_date?: string;
  estimated_delivery_date?: string;
  estimated_amount?: string;
  insurance_claimed: string;
  claim_number?: string;
  insurance_brokerage?: string;
  approved_by?: string;
  approval_date?: string;
  approval_file?: string;
  maintenance_status?: string;
  vehicle_status_date?: string;
  daily_vehicle_remarks?: string;
  rfd_date?: string;
  delivered_date?: string;
  final_status?: string;
  tat?: string;
  pdi_status?: string;
  maintenance_steps?: any[] | string;
  invoice_no?: string;
  invoice_date?: string;
  invoice_amount?: string;
  insurance_liability_discounts?: string;
  letzryd_payable?: string;
  payment_status?: string;
  type_of_payment?: string;
  utr_no?: string;
  entry_remarks?: string;
  invoice_file?: string;
  invoices?: any[] | string;
  pdi_front_photo?: string;
  pdi_back_photo?: string;
  pdi_lh_photo?: string;
  pdi_rh_photo?: string;
  pdi_engine_photo?: string;
  engine_chassis_no?: string;
  battery_sl_no?: string;
  fast_tag?: string;
  pdi_jack?: string;
  pdi_jack_rod?: string;
  pdi_spanner?: string;
  pdi_parking_triangle?: string;
  pdi_fire_extinguisher?: string;
  pdi_seat_cover?: string;
  pdi_floor_carpet?: string;
  pdi_music_system?: string;
  pdi_spare_wheel?: string;
  pdi_key_quantity?: string;
  pdi_rh_front_tyre?: string;
  pdi_lh_front_tyre?: string;
  pdi_rh_rear_tyre?: string;
  pdi_lh_rear_tyre?: string;
  created_at?: string;
}

export interface RentLedgerRecord {
  id: number;
  entity_type: "Driver" | "Vendor" | "Vehicle" | "Model";
  entity_id: string;
  change_type: "Created" | "Updated" | "Deleted";
  old_amount: number;
  new_amount: number;
  modified_by: string;
  effective_date: string;
  created_at: string;
}

export interface ChallanRecord {
  id: number;
  challan_number: string;
  vehicle_number: string;
  driver_id?: string;
  driver_name?: string;
  violation_date: string;
  violation_location?: string;
  challan_amount: number;
  internal_fine_amount: number;
  recovery_status: "Pending" | "Recovered" | "Disputed" | "Waived";
  recovered_amount: number;
  remarks?: string;
  challan_photo?: string;
  created_at?: string;
}