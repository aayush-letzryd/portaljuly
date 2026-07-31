import React, { useState, useEffect, useMemo } from "react";
import { 
  Wrench, Calendar, MapPin, User, Phone, FileText, CheckCircle, 
  Clock, ArrowLeft, Download, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, Plus, ChevronLeft, Database, Info, Shield, AlertTriangle
} from "lucide-react";
import { MaintenanceRecord, User as UserSession, CITIES } from "../types";
import CameraCapture from "./CameraCapture";

interface MaintenanceFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

const REPAIR_TYPES = ["General Service", "Running Repair", "Accidental", "Breakdown", "Warranty"];
const MAINTENANCE_STATUSES = ["Inward", "Estimation", "Approval", "Repairing", "QC", "Ready", "Delivered", "Hold"];
const FINAL_STATUSES = ["Completed", "Total Loss", "Scrapped"];
const PAYMENT_STATUSES = ["Pending", "Partial", "Paid"];
const PAYMENT_TYPES = ["UPI", "NEFT/RTGS", "Credit/Ledger", "Cash"];
const PDI_INVENTORY_STATES = ["Intact", "Missing", "Damaged"];
const TYRE_STATES = ["Good", "Worn", "Replaced"];

export default function MaintenanceForm({ 
  user, 
  onBackToSelector, 
  onLogout
}: MaintenanceFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "registry">("form");
  
  // Header clock state
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true
  }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: true
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Form Fields State
  const [editingId, setEditingId] = useState<number | null>(null);

  // Panel 1: Vehicle Intake & Diagnostics
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [cityName, setCityName] = useState("Hyderabad");
  const [model, setModel] = useState("");
  const [vehicleKms, setVehicleKms] = useState("");
  const [repairType, setRepairType] = useState("General Service");
  const [vehicleLocation, setVehicleLocation] = useState("");
  const [vehicleInDate, setVehicleInDate] = useState("");
  const [initialRemarks, setInitialRemarks] = useState("");
  const [vehicleDamagePhotos, setVehicleDamagePhotos] = useState<string | null>(null);

  // Panel 2: Workshop Allocation & Estimates
  const [workshopName, setWorkshopName] = useState("");
  const [allocationDate, setAllocationDate] = useState("");
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("");
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [insuranceClaimed, setInsuranceClaimed] = useState("No");
  const [claimNumber, setClaimNumber] = useState("");
  const [insuranceBrokerage, setInsuranceBrokerage] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [approvalDate, setApprovalDate] = useState("");
  const [approvalFile, setApprovalFile] = useState<string | null>(null);

  // Panel 3: Job Lifecycle & Status Tracking
  const [maintenanceStatus, setMaintenanceStatus] = useState("Inward");
  const [vehicleStatusDate, setVehicleStatusDate] = useState("");
  const [dailyVehicleRemarks, setDailyVehicleRemarks] = useState("");
  const [rfdDate, setRfdDate] = useState("");
  const [deliveredDate, setDeliveredDate] = useState("");
  const [finalStatus, setFinalStatus] = useState("");
  const [tat, setTat] = useState("");
  const [pdiStatus, setPdiStatus] = useState("Pending");
  const [maintenanceSteps, setMaintenanceSteps] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  // Panel 4: Invoicing & Financial Settlement
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [insuranceLiabilityDiscounts, setInsuranceLiabilityDiscounts] = useState("");
  const [letzrydPayable, setLetzrydPayable] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [typeOfPayment, setTypeOfPayment] = useState("UPI");
  const [utrNo, setUtrNo] = useState("");
  const [entryRemarks, setEntryRemarks] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<string | null>(null);

  // Panel 5: PDI Visuals
  const [pdiFrontPhoto, setPdiFrontPhoto] = useState<string | null>(null);
  const [pdiBackPhoto, setPdiBackPhoto] = useState<string | null>(null);
  const [pdiLhPhoto, setPdiLhPhoto] = useState<string | null>(null);
  const [pdiRhPhoto, setPdiRhPhoto] = useState<string | null>(null);
  const [pdiEnginePhoto, setPdiEnginePhoto] = useState<string | null>(null);

  // Panel 5: PDI Identifiers & Toolkit
  const [engineChassisNo, setEngineChassisNo] = useState("");
  const [batterySlNo, setBatterySlNo] = useState("");
  const [fastTag, setFastTag] = useState("");
  const [pdiJack, setPdiJack] = useState("Intact");
  const [pdiJackRod, setPdiJackRod] = useState("Intact");
  const [pdiSpanner, setPdiSpanner] = useState("Intact");
  const [pdiParkingTriangle, setPdiParkingTriangle] = useState("Intact");
  const [pdiFireExtinguisher, setPdiFireExtinguisher] = useState("Intact");
  const [pdiSeatCover, setPdiSeatCover] = useState("Intact");
  const [pdiFloorCarpet, setPdiFloorCarpet] = useState("Intact");
  const [pdiMusicSystem, setPdiMusicSystem] = useState("Intact");
  const [pdiSpareWheel, setPdiSpareWheel] = useState("Intact");
  const [pdiKeyQuantity, setPdiKeyQuantity] = useState("");

  // Panel 5: PDI Tyres
  const [pdiRhFrontTyre, setPdiRhFrontTyre] = useState("Good");
  const [pdiLhFrontTyre, setPdiLhFrontTyre] = useState("Good");
  const [pdiRhRearTyre, setPdiRhRearTyre] = useState("Good");
  const [pdiLhRearTyre, setPdiLhRearTyre] = useState("Good");

  // Camera State
  const [cameraActiveField, setCameraActiveField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Registry & Statistics States
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [retrieveIdInput, setRetrieveIdInput] = useState("");

  const displayName = user.name || user.username || "User";
  const initials = displayName.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/maintenance", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setRecords(await res.json());
      }
    } catch (err) {
      console.error("Error fetching maintenance jobs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "registry") {
      fetchRecords();
    }
  }, [activeTab]);

  // Statistics Computations
  const stats = useMemo(() => {
    const total = records.length;
    let pendingApproval = 0;
    let activeRepairs = 0;
    let completed = 0;

    records.forEach(r => {
      if (r.maintenance_status === "Approval") pendingApproval++;
      if (["Repairing", "QC", "Estimation"].includes(r.maintenance_status)) activeRepairs++;
      if (r.maintenance_status === "Delivered") completed++;
    });

    return { total, pendingApproval, activeRepairs, completed };
  }, [records]);

  
  const addMaintenanceStep = () => {
    setMaintenanceSteps([...maintenanceSteps, { status: "", date: "", remarks: "" }]);
  };
  const removeMaintenanceStep = (index: number) => {
    setMaintenanceSteps(maintenanceSteps.filter((_, i) => i !== index));
  };
  const updateMaintenanceStep = (index: number, field: string, value: string) => {
    const updated = [...maintenanceSteps];
    updated[index][field] = value;
    setMaintenanceSteps(updated);
  };

  const addInvoice = () => {
    setInvoices([...invoices, { invoiceNo: "", invoiceDate: "", invoiceAmount: "", file: null }]);
  };
  const removeInvoice = (index: number) => {
    setInvoices(invoices.filter((_, i) => i !== index));
  };
  const updateInvoice = (index: number, field: string, value: any) => {
    const updated = [...invoices];
    updated[index][field] = value;
    setInvoices(updated);
  };
  
  const handleFetchLastInspection = async () => {
    if (!vehicleNumber) {
      alert("Please enter a vehicle number first.");
      return;
    }
    try {
      const res = await fetch(`/api/inspection/last/${vehicleNumber}`);
      if (!res.ok) throw new Error("No previous inspection found for this vehicle.");
      const data = await res.json();
      
      // Populate PDI/Inspection fields
      setPdiFrontPhoto(data.pdi_front_photo || data.front_photo || null);
      setPdiBackPhoto(data.pdi_back_photo || data.back_photo || null);
      setPdiLhPhoto(data.pdi_lh_photo || data.lh_photo || null);
      setPdiRhPhoto(data.pdi_rh_photo || data.rh_photo || null);
      setPdiEnginePhoto(data.pdi_engine_photo || data.engine_photo || null);
      alert("Last inspection data fetched successfully!");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setVehicleNumber("");
    setCityName("Hyderabad");
    setModel("");
    setVehicleKms("");
    setRepairType("General Service");
    setVehicleLocation("");
    setVehicleInDate("");
    setInitialRemarks("");
    setVehicleDamagePhotos(null);

    setWorkshopName("");
    setAllocationDate("");
    setEstimatedDeliveryDate("");
    setEstimatedAmount("");
    setInsuranceClaimed("No");
    setClaimNumber("");
    setInsuranceBrokerage("");
    setApprovedBy("");
    setApprovalDate("");
    setApprovalFile(null);

    setMaintenanceStatus("Inward");
    setVehicleStatusDate("");
    setDailyVehicleRemarks("");
    setRfdDate("");
    setDeliveredDate("");
    setFinalStatus("");
    setTat("");
    setPdiStatus("Pending");
    setMaintenanceSteps([]);
    setInvoices([]);

    setInvoiceNo("");
    setInvoiceDate("");
    setInvoiceAmount("");
    setInsuranceLiabilityDiscounts("");
    setLetzrydPayable("");
    setPaymentStatus("Pending");
    setTypeOfPayment("UPI");
    setUtrNo("");
    setEntryRemarks("");
    setInvoiceFile(null);

    setPdiFrontPhoto(null);
    setPdiBackPhoto(null);
    setPdiLhPhoto(null);
    setPdiRhPhoto(null);
    setPdiEnginePhoto(null);
    setEngineChassisNo("");
    setBatterySlNo("");
    setFastTag("");
    setPdiJack("Intact");
    setPdiJackRod("Intact");
    setPdiSpanner("Intact");
    setPdiParkingTriangle("Intact");
    setPdiFireExtinguisher("Intact");
    setPdiSeatCover("Intact");
    setPdiFloorCarpet("Intact");
    setPdiMusicSystem("Intact");
    setPdiSpareWheel("Intact");
    setPdiKeyQuantity("");

    setPdiRhFrontTyre("Good");
    setPdiLhFrontTyre("Good");
    setPdiRhRearTyre("Good");
    setPdiLhRearTyre("Good");
  };

  const handleRetrieve = async () => {
    if (!retrieveIdInput.trim()) return alert("Please enter a valid Job ID.");
    const id = parseInt(retrieveIdInput.trim(), 10);
    if (isNaN(id)) return alert("Job ID must be numeric.");

    setIsLoading(true);
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/maintenance/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEditingId(data.id);
        setVehicleNumber(data.vehicle_number || "");
        setCityName(data.city_name || "Hyderabad");
        setModel(data.model || "");
        setVehicleKms(data.vehicle_k_m_s || "");
        setRepairType(data.repair_type || "General Service");
        setVehicleLocation(data.vehicle_location || "");
        setVehicleInDate(data.vehicle_in_date || "");
        setInitialRemarks(data.initial_remarks || "");
        setVehicleDamagePhotos(data.vehicle_damage_photos || null);

        setWorkshopName(data.workshop_name || "");
        setAllocationDate(data.allocation_date || "");
        setEstimatedDeliveryDate(data.estimated_delivery_date || "");
        setEstimatedAmount(data.estimated_amount || "");
        setInsuranceClaimed(data.insurance_claimed || "No");
        setClaimNumber(data.claim_number || "");
        setInsuranceBrokerage(data.insurance_brokerage || "");
        setApprovedBy(data.approved_by || "");
        setApprovalDate(data.approval_date || "");
        setApprovalFile(data.approval_file || null);

        setMaintenanceStatus(data.maintenance_status || "Inward");
        setVehicleStatusDate(data.vehicle_status_date || "");
        setDailyVehicleRemarks(data.daily_vehicle_remarks || "");
        setRfdDate(data.rfd_date || "");
        setDeliveredDate(data.delivered_date || "");
        setFinalStatus(data.final_status || "");
        setTat(data.tat || "");
        setPdiStatus(data.pdi_status || "Pending");

        setInvoiceNo(data.invoice_no || "");
        setInvoiceDate(data.invoice_date || "");
        setInvoiceAmount(data.invoice_amount || "");
        setInsuranceLiabilityDiscounts(data.insurance_liability_discounts || "");
        setLetzrydPayable(data.letzryd_payable || "");
        setPaymentStatus(data.payment_status || "Pending");
        setTypeOfPayment(data.type_of_payment || "UPI");
        setUtrNo(data.utr_no || "");
        setEntryRemarks(data.entry_remarks || "");
        setInvoiceFile(data.invoice_file || null);

        setPdiFrontPhoto(data.pdi_front_photo || null);
        setPdiBackPhoto(data.pdi_back_photo || null);
        setPdiLhPhoto(data.pdi_lh_photo || null);
        setPdiRhPhoto(data.pdi_rh_photo || null);
        setPdiEnginePhoto(data.pdi_engine_photo || null);
        setEngineChassisNo(data.engine_chassis_no || "");
        setBatterySlNo(data.battery_sl_no || "");
        setFastTag(data.fast_tag || "");
        setPdiJack(data.pdi_jack || "Intact");
        setPdiJackRod(data.pdi_jack_rod || "Intact");
        setPdiSpanner(data.pdi_spanner || "Intact");
        setPdiParkingTriangle(data.pdi_parking_triangle || "Intact");
        setPdiFireExtinguisher(data.pdi_fire_extinguisher || "Intact");
        setPdiSeatCover(data.pdi_seat_cover || "Intact");
        setPdiFloorCarpet(data.pdi_floor_carpet || "Intact");
        setPdiMusicSystem(data.pdi_music_system || "Intact");
        setPdiSpareWheel(data.pdi_spare_wheel || "Intact");
        setPdiKeyQuantity(data.pdi_key_quantity || "");

        setPdiRhFrontTyre(data.pdi_rh_front_tyre || "Good");
        setPdiLhFrontTyre(data.pdi_lh_front_tyre || "Good");
        setPdiRhRearTyre(data.pdi_rh_rear_tyre || "Good");
        setPdiLhRearTyre(data.pdi_lh_rear_tyre || "Good");

        alert(`Loaded maintenance job record #${data.id}`);
      } else {
        alert("Record not found.");
      }
    } catch (e: any) {
      alert("Error loading record: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber.trim()) return alert("Vehicle Number is required.");
    if (!workshopName.trim()) return alert("Workshop Name is required.");

    setIsSubmitting(true);
    const payload = {
      vehicle_number: vehicleNumber.trim(),
      city_name: cityName,
      model: model.trim(),
      vehicle_k_m_s: vehicleKms.trim(),
      repair_type: repairType,
      vehicle_location: vehicleLocation.trim() || null,
      vehicle_in_date: vehicleInDate,
      initial_remarks: initialRemarks.trim() || null,
      vehicle_damage_photos: vehicleDamagePhotos,

      workshop_name: workshopName.trim(),
      allocation_date: allocationDate || null,
      estimated_delivery_date: estimatedDeliveryDate || null,
      estimated_amount: estimatedAmount || null,
      insurance_claimed: insuranceClaimed,
      claim_number: claimNumber.trim() || null,
      insurance_brokerage: insuranceBrokerage.trim() || null,
      approved_by: approvedBy.trim() || null,
      approval_date: approvalDate || null,
      approval_file: approvalFile,

      maintenance_status: maintenanceStatus,
      vehicle_status_date: vehicleStatusDate || null,
      daily_vehicle_remarks: dailyVehicleRemarks.trim() || null,
      rfd_date: rfdDate || null,
      delivered_date: deliveredDate || null,
      final_status: finalStatus || null,
      tat: tat || null,
            pdi_status: pdiStatus,
      maintenance_steps: maintenanceSteps,
      invoices: invoices,

      invoice_no: invoiceNo.trim() || null,
      invoice_date: invoiceDate || null,
      invoice_amount: invoiceAmount || null,
      insurance_liability_discounts: insuranceLiabilityDiscounts || null,
      letzryd_payable: letzrydPayable || null,
      payment_status: paymentStatus || null,
      type_of_payment: typeOfPayment || null,
      utr_no: utrNo.trim() || null,
      entry_remarks: entryRemarks.trim() || null,
      invoice_file: invoiceFile,

      pdi_front_photo: pdiFrontPhoto,
      pdi_back_photo: pdiBackPhoto,
      pdi_lh_photo: pdiLhPhoto,
      pdi_rh_photo: pdiRhPhoto,
      pdi_engine_photo: pdiEnginePhoto,
      engine_chassis_no: engineChassisNo.trim() || null,
      battery_sl_no: batterySlNo.trim() || null,
      fast_tag: fastTag.trim() || null,
      pdi_jack: pdiJack,
      pdi_jack_rod: pdiJackRod,
      pdi_spanner: pdiSpanner,
      pdi_parking_triangle: pdiParkingTriangle,
      pdi_fire_extinguisher: pdiFireExtinguisher,
      pdi_seat_cover: pdiSeatCover,
      pdi_floor_carpet: pdiFloorCarpet,
      pdi_music_system: pdiMusicSystem,
      pdi_spare_wheel: pdiSpareWheel,
      pdi_key_quantity: pdiKeyQuantity || null,
      pdi_rh_front_tyre: pdiRhFrontTyre,
      pdi_lh_front_tyre: pdiLhFrontTyre,
      pdi_rh_rear_tyre: pdiRhRearTyre,
      pdi_lh_rear_tyre: pdiLhRearTyre
    };

    try {
      const token = localStorage.getItem("lr_token");
      const url = editingId ? `/api/maintenance/${editingId}` : "/api/maintenance";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(editingId ? "Job details updated successfully!" : "New Maintenance Job logged successfully!");
        resetForm();
        setActiveTab("registry");
      } else {
        const error = await res.json();
        alert(error.detail || "Failed to save record.");
      }
    } catch (e: any) {
      alert("Error occurred: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`Are you sure you want to delete maintenance job record #${id}?`)) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/maintenance/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Record deleted successfully.");
        fetchRecords();
      } else {
        alert("Failed to delete record.");
      }
    } catch (e: any) {
      alert("Error occurred: " + e.message);
    }
  };

  const exportCSV = () => {
    if (records.length === 0) return alert("No records available to export.");
    const headers = ["Job ID", "Vehicle In Date", "Vehicle Number", "Workshop Name", "Repair Type", "City", "Estimated Amount", "Status"];
    const csvContent = [
      headers.join(","),
      ...records.map(r => [
        r.id,
        r.vehicle_in_date,
        r.vehicle_number,
        r.workshop_name,
        r.repair_type,
        r.city_name,
        r.estimated_amount || "0",
        r.maintenance_status
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "LetzRyd_Maintenance_Export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = records.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || 
      (r.vehicle_number || "").toLowerCase().includes(q) ||
      (r.workshop_name || "").toLowerCase().includes(q) ||
      (r.repair_type || "").toLowerCase().includes(q) ||
      String(r.id).includes(q);
    
    const matchesCity = filterCity === "all" || r.city_name === filterCity;
    const matchesStatus = filterStatus === "all" || r.maintenance_status === filterStatus;

    return matchesQuery && matchesCity && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-bg">
      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 border-b border-border bg-white shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={onBackToSelector}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-slate-100 hover:text-primary transition-all cursor-pointer"
              title="Back to Form Selector"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <img 
              src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" 
              alt="LetzRyd" 
              className="h-7 w-auto object-contain cursor-pointer"
              onClick={onBackToSelector}
              referrerPolicy="no-referrer"
            />
            <span className="hidden h-5 border-l border-border sm:inline-block" />
            <span className="hidden font-sans text-xs font-semibold text-text-muted sm:inline-block">
              Partner Maintenance Desk
            </span>
          </div>

          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab("form")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "form" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <FileText className="h-4 w-4" />
              Maintenance Form
            </button>
            <button
              onClick={() => setActiveTab("registry")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "registry" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <Database className="h-4 w-4" />
              Maintenance Registry
            </button>
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <div className="text-right">
              <span className="block text-[9px] font-bold text-text-dim">Current Time (IST)</span>
              <span className="font-mono text-xs font-extrabold text-green">{currentTime}</span>
            </div>
            
            <span className="h-5 border-l border-border" />
            
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">
                {initials}
              </div>
              <div className="flex flex-col">
                <span className="font-sans text-xs font-semibold leading-none text-text">{displayName}</span>
                {user.executive_id && <span className="font-mono text-[9px] text-text-muted mt-1 leading-none">ID: {user.executive_id}</span>}
              </div>
            </div>

            <span className="h-5 border-l border-border" />

            <button 
              onClick={onLogout}
              className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-2.5 font-sans text-xs font-medium text-text-muted hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>

        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {activeTab === "form" ? (
          <div className="mx-auto max-w-4xl flex flex-col gap-6">
            
            {/* Banner Header */}
            <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-white shadow-sm md:p-8">
              <div className="absolute inset-0 bg-radial-gradient from-green/10 to-transparent pointer-events-none" />
              
              <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[9px] font-bold text-white tracking-widest">
                      LetzRyd Desk
                    </span>
                    <span className="text-white/40 text-xs">•</span>
                    <span className="text-white/60 text-xs font-medium">Fleet Servicing Portal</span>
                  </div>
                  <h1 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                    {editingId ? `Edit Job Record #${editingId}` : "Log Vehicle Maintenance"}
                  </h1>
                  <p className="font-sans text-xs text-white/70 mt-1 max-w-xl">
                    {editingId 
                      ? "Modifying active maintenance, servicing status, PDI items, or billing details." 
                      : "Log inward vehicle breakdowns, allocations, lifecycle updates, invoicing, and toolkit check sheets."}
                  </p>
                </div>

                {/* Retrieve block */}
                <div className="flex flex-col gap-2 items-start md:items-end">
                  <div className="flex gap-2 w-full max-w-xs">
                    <input
                      type="number"
                      placeholder="Edit existing ID..."
                      value={retrieveIdInput}
                      onChange={(e) => setRetrieveIdInput(e.target.value)}
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 font-mono text-sm text-white placeholder-white/40 focus:bg-white focus:text-text focus:outline-none transition-all shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={handleRetrieve}
                      className="rounded-xl bg-green hover:bg-green-hover px-4 py-2 font-sans text-sm font-bold text-white shadow-sm transition-all cursor-pointer whitespace-nowrap"
                    >
                      Retrieve
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* FORM CONTAINER */}
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Panel 1: Intake & Diagnostics */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs md:p-8">
                <h3 className="font-sans text-sm font-bold text-primary mb-6 pb-2 border-b border-border/80 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary font-bold">1</span>
                  Vehicle Intake & Diagnostics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Vehicle Plate Number <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. TS09 EA 1111"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                      required
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-mono text-sm tracking-wide focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      City / Operational Hub <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={cityName}
                      onChange={(e) => setCityName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                    >
                      {CITIES.map(c => <option key={c.value} value={c.value}>{c.text}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Vehicle Model Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Tata Tigor EV, Citroen eC3..."
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Odometer (KMs Reading) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number" 
                      placeholder="Enter mileage..."
                      value={vehicleKms}
                      onChange={(e) => setVehicleKms(e.target.value)}
                      required
                      min={0}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Repair Classification <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3 mt-1 sm:grid-cols-3">
                      {REPAIR_TYPES.map(type => (
                        <label key={type} className={`flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer transition-all ${repairType === type ? 'bg-primary/5 border-primary text-primary shadow-xs' : 'border-border bg-white text-text-muted hover:bg-bg'}`}>
                          <input type="radio" name="repair_type" value={type} checked={repairType === type} onChange={() => setRepairType(type)} className="sr-only" />
                          {type}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Breakdown/Current Location
                    </label>
                    <input 
                      type="text" 
                      placeholder="Hub name or GPS coordinates..."
                      value={vehicleLocation}
                      onChange={(e) => setVehicleLocation(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Vehicle Inward Date & Time <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="datetime-local" 
                      value={vehicleInDate}
                      onChange={(e) => setVehicleInDate(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Inward Damage Photos (Visual Evidence)
                    </label>
                    <div className="flex items-center gap-3 mt-1">
                      <input 
                        type="file" 
                        accept="image/*" 
                        id="damage-upload" 
                        onChange={(e) => handleFileUpload(e, setVehicleDamagePhotos)} 
                        className="hidden" 
                      />
                      <label htmlFor="damage-upload" className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-4 font-sans text-xs font-semibold text-text hover:bg-bg transition-colors cursor-pointer shadow-2xs">
                        <Upload className="h-4 w-4 text-text-muted" /> Upload Image
                      </label>
                      <button 
                        type="button" 
                        onClick={() => setCameraActiveField("damage")}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-text hover:bg-bg transition-colors cursor-pointer shadow-2xs"
                      >
                        <Camera className="h-4 w-4 text-text-muted" />
                      </button>
                      {vehicleDamagePhotos && (
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-slate-100 overflow-hidden">
                          <img src={vehicleDamagePhotos} alt="Damage" className="h-full w-full object-cover" />
                          <button type="button" onClick={() => setVehicleDamagePhotos(null)} className="absolute top-0 right-0 rounded-bl bg-black/70 p-0.5 text-white hover:bg-red-600 transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                    Initial Symptoms & Diagnostics Remarks
                  </label>
                  <textarea 
                    placeholder="Describe specific issues, complaints, or visual observations..."
                    value={initialRemarks}
                    onChange={(e) => setInitialRemarks(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-white px-4 py-3 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Panel 2: Workshop Allocation & Estimates */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs md:p-8">
                <h3 className="font-sans text-sm font-bold text-primary mb-6 pb-2 border-b border-border/80 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary font-bold">2</span>
                  Workshop Allocation & Estimates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Workshop Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Zypp Auto Center, ZoomRx..."
                      value={workshopName}
                      onChange={(e) => setWorkshopName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Allocation Date
                    </label>
                    <input 
                      type="date" 
                      value={allocationDate}
                      onChange={(e) => setAllocationDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Estimated Cost (₹)
                    </label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={estimatedAmount}
                      onChange={(e) => setEstimatedAmount(e.target.value)}
                      min={0}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Expected Delivery Date
                    </label>
                    <input 
                      type="date" 
                      value={estimatedDeliveryDate}
                      onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Insurance Claim Initiated? <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4 mt-2">
                      {["Yes", "No"].map(option => (
                        <label key={option} className="flex items-center gap-2 font-sans text-sm text-text cursor-pointer">
                          <input 
                            type="radio" 
                            name="insurance_claimed" 
                            value={option} 
                            checked={insuranceClaimed === option}
                            onChange={() => setInsuranceClaimed(option)}
                            className="h-4 w-4 border-border text-primary focus:ring-primary"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>

                  {insuranceClaimed === "Yes" && (
                    <>
                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                          Insurance Claim Reference Number
                        </label>
                        <input 
                          type="text" 
                          placeholder="e.g. CLM-998871..."
                          value={claimNumber}
                          onChange={(e) => setClaimNumber(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>
                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                          Insurance Brokerage / Company
                        </label>
                        <input 
                          type="text" 
                          placeholder="e.g. HDFC Ergo, ICICI..."
                          value={insuranceBrokerage}
                          onChange={(e) => setInsuranceBrokerage(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Approved By (Operations Manager)
                    </label>
                    <input 
                      type="text" 
                      placeholder="Manager name..."
                      value={approvedBy}
                      onChange={(e) => setApprovedBy(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Approval Date
                    </label>
                    <input 
                      type="date" 
                      value={approvalDate}
                      onChange={(e) => setApprovalDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Upload Estimate / Approval Doc
                    </label>
                    <div className="flex items-center gap-3 mt-1">
                      <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        id="approval-upload" 
                        onChange={(e) => handleFileUpload(e, setApprovalFile)} 
                        className="hidden" 
                      />
                      <label htmlFor="approval-upload" className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-4 font-sans text-xs font-semibold text-text hover:bg-bg transition-colors cursor-pointer shadow-2xs">
                        <Upload className="h-4 w-4 text-text-muted" /> Upload Document
                      </label>
                      <button 
                        type="button" 
                        onClick={() => setCameraActiveField("approval")}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-text hover:bg-bg transition-colors cursor-pointer shadow-2xs"
                      >
                        <Camera className="h-4 w-4 text-text-muted" />
                      </button>
                      {approvalFile && (
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-slate-100 overflow-hidden">
                          {approvalFile.startsWith("data:application/pdf") ? (
                            <FileText className="h-6 w-6 text-primary" />
                          ) : (
                            <img src={approvalFile} alt="Approval" className="h-full w-full object-cover" />
                          )}
                          <button type="button" onClick={() => setApprovalFile(null)} className="absolute top-0 right-0 rounded-bl bg-black/70 p-0.5 text-white hover:bg-red-600 transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel 3: Job Lifecycle & Status Tracking */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs md:p-8">
                <h3 className="font-sans text-sm font-bold text-primary mb-6 pb-2 border-b border-border/80 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary font-bold">3</span>
                  Job Lifecycle & Status Tracking
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Current Servicing Stage <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
                      {MAINTENANCE_STATUSES.map(status => (
                        <label key={status} className={`flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer transition-all ${maintenanceStatus === status ? 'bg-primary/5 border-primary text-primary shadow-xs' : 'border-border bg-white text-text-muted hover:bg-bg'}`}>
                          <input type="radio" name="maintenance_status" value={status} checked={maintenanceStatus === status} onChange={() => setMaintenanceStatus(status)} className="sr-only" />
                          {status}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Status Update Date
                    </label>
                    <input 
                      type="date" 
                      value={vehicleStatusDate}
                      onChange={(e) => setVehicleStatusDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Ready For Delivery (RFD) Date
                    </label>
                    <input 
                      type="date" 
                      value={rfdDate}
                      onChange={(e) => setRfdDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Delivered Back to Active Fleet Date
                    </label>
                    <input 
                      type="date" 
                      value={deliveredDate}
                      onChange={(e) => setDeliveredDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Final Service Status
                    </label>
                    <div className="grid grid-cols-3 gap-3 mt-1">
                      {FINAL_STATUSES.map(status => (
                        <label key={status} className={`flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer transition-all ${finalStatus === status ? 'bg-primary/5 border-primary text-primary shadow-xs' : 'border-border bg-white text-text-muted hover:bg-bg'}`}>
                          <input type="radio" name="final_status" value={status} checked={finalStatus === status} onChange={() => setFinalStatus(status)} className="sr-only" />
                          {status}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Turn-Around Time (TAT Days)
                    </label>
                    <input 
                      type="number" 
                      placeholder="e.g. 3"
                      value={tat}
                      onChange={(e) => setTat(e.target.value)}
                      min={0}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Inspection Status <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4 mt-2">
                      {["Pending", "Completed"].map(option => (
                        <label key={option} className="flex items-center gap-2 font-sans text-sm text-text cursor-pointer">
                          <input 
                            type="radio" 
                            name="pdi_status" 
                            value={option} 
                            checked={pdiStatus === option}
                            onChange={() => setPdiStatus(option)}
                            className="h-4 w-4 border-border text-primary focus:ring-primary"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                    Daily Service & Progress Remarks
                  </label>
                  <textarea 
                    placeholder="Log daily updates from workshop mechanics or operations leads..."
                    value={dailyVehicleRemarks}
                    onChange={(e) => setDailyVehicleRemarks(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-white px-4 py-3 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Panel 4: Invoicing & Financial Settlement */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs md:p-8">
                <h3 className="font-sans text-sm font-bold text-primary mb-6 pb-2 border-b border-border/80 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary font-bold">4</span>
                  Invoicing & Financial Settlement
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Invoice Number
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. INV-9908"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Invoice Date
                    </label>
                    <input 
                      type="date" 
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Invoice Total Amount (₹)
                    </label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value)}
                      min={0}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      LetzRyd Share Payable (₹)
                    </label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={letzrydPayable}
                      onChange={(e) => setLetzrydPayable(e.target.value)}
                      min={0}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Insurance Liability / Discounts (₹)
                    </label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={insuranceLiabilityDiscounts}
                      onChange={(e) => setInsuranceLiabilityDiscounts(e.target.value)}
                      min={0}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Payment Settlement Status
                    </label>
                    <div className="grid grid-cols-3 gap-3 mt-1">
                      {PAYMENT_STATUSES.map(status => (
                        <label key={status} className={`flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer transition-all ${paymentStatus === status ? 'bg-primary/5 border-primary text-primary shadow-xs' : 'border-border bg-white text-text-muted hover:bg-bg'}`}>
                          <input type="radio" name="payment_status" value={status} checked={paymentStatus === status} onChange={() => setPaymentStatus(status)} className="sr-only" />
                          {status}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Payment Mode
                    </label>
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      {PAYMENT_TYPES.map(type => (
                        <label key={type} className={`flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer transition-all ${typeOfPayment === type ? 'bg-primary/5 border-primary text-primary shadow-xs' : 'border-border bg-white text-text-muted hover:bg-bg'}`}>
                          <input type="radio" name="type_of_payment" value={type} checked={typeOfPayment === type} onChange={() => setTypeOfPayment(type)} className="sr-only" />
                          {type}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      UTR / Bank Transaction Reference
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. UTR-9908123A..."
                      value={utrNo}
                      onChange={(e) => setUtrNo(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Invoice File Document
                    </label>
                    <div className="flex items-center gap-3 mt-1">
                      <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        id="invoice-upload" 
                        onChange={(e) => handleFileUpload(e, setInvoiceFile)} 
                        className="hidden" 
                      />
                      <label htmlFor="invoice-upload" className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-4 font-sans text-xs font-semibold text-text hover:bg-bg transition-colors cursor-pointer shadow-2xs">
                        <Upload className="h-4 w-4 text-text-muted" /> Upload Invoice
                      </label>
                      <button 
                        type="button" 
                        onClick={() => setCameraActiveField("invoice")}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-text hover:bg-bg transition-colors cursor-pointer shadow-2xs"
                      >
                        <Camera className="h-4 w-4 text-text-muted" />
                      </button>
                      {invoiceFile && (
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-slate-100 overflow-hidden">
                          {invoiceFile.startsWith("data:application/pdf") ? (
                            <FileText className="h-6 w-6 text-primary" />
                          ) : (
                            <img src={invoiceFile} alt="Invoice" className="h-full w-full object-cover" />
                          )}
                          <button type="button" onClick={() => setInvoiceFile(null)} className="absolute top-0 right-0 rounded-bl bg-black/70 p-0.5 text-white hover:bg-red-600 transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                    Internal Financial Remarks
                  </label>
                  <textarea 
                    placeholder="Describe payment tracking details, exceptions, or finance notes..."
                    value={entryRemarks}
                    onChange={(e) => setEntryRemarks(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-white px-4 py-3 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Panel 5: PDI Inventory Check Sheet (Conditional) */}
              {pdiStatus === "Pending" && (
                <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs md:p-8">
                  <h3 className="font-sans text-sm font-bold text-primary mb-6 pb-2 border-b border-border/80 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary font-bold">5</span>
                    PDI (Post-Delivery Inspection) Checklist
                  </h3>

                  {/* Visual Verification Images */}
                  <h4 className="font-sans text-xs font-bold text-violet-600 mb-4">A. Visual Condition Photographic Logs</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    {[
                      { label: "FRONT VIEW", state: pdiFrontPhoto, setter: setPdiFrontPhoto, key: "pdi_front" },
                      { label: "REAR VIEW", state: pdiBackPhoto, setter: setPdiBackPhoto, key: "pdi_back" },
                      { label: "LH SIDE", state: pdiLhPhoto, setter: setPdiLhPhoto, key: "pdi_lh" },
                      { label: "RH SIDE", state: pdiRhPhoto, setter: setPdiRhPhoto, key: "pdi_rh" },
                      { label: "ENGINE/BATTERY", state: pdiEnginePhoto, setter: setPdiEnginePhoto, key: "pdi_engine" }
                    ].map(item => (
                      <div key={item.key} className="flex flex-col items-center justify-between border border-border rounded-xl p-3 bg-bg/50">
                        <span className="text-[10px] font-bold text-text-muted text-center mb-2">{item.label}</span>
                        {item.state ? (
                          <div className="relative h-20 w-full rounded-lg border border-border overflow-hidden">
                            <img src={item.state} alt={item.label} className="h-full w-full object-cover" />
                            <button type="button" onClick={() => item.setter(null)} className="absolute top-0 right-0 rounded-bl bg-black/70 p-1 text-white hover:bg-red-600 transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex h-20 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-white text-text-muted hover:bg-bg cursor-pointer transition-colors" onClick={() => setCameraActiveField(item.key)}>
                            <Camera className="h-6 w-6 mb-1 text-text-muted" />
                            <span className="text-[9px] font-semibold text-text-muted">Capture</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Asset Identifiers */}
                  <h4 className="font-sans text-xs font-bold text-violet-600 mb-4 border-t border-border/60 pt-6">B. Asset Identifiers (Security Check)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div>
                      <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                        Engine & Chassis Number
                      </label>
                      <input 
                        type="text" 
                        placeholder="Verify serial..."
                        value={engineChassisNo}
                        onChange={(e) => setEngineChassisNo(e.target.value)}
                        className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                        Battery Serial ID
                      </label>
                      <input 
                        type="text" 
                        placeholder="Verify serial..."
                        value={batterySlNo}
                        onChange={(e) => setBatterySlNo(e.target.value)}
                        className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                        FastTag ID Number
                      </label>
                      <input 
                        type="text" 
                        placeholder="Verify ID..."
                        value={fastTag}
                        onChange={(e) => setFastTag(e.target.value)}
                        className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Toolkit & Accessories Check List */}
                  <h4 className="font-sans text-xs font-bold text-violet-600 mb-4 border-t border-border/60 pt-6">C. Toolkit & Inventory Checks</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 mb-8">
                    {[
                      { label: "Jack", state: pdiJack, setter: setPdiJack },
                      { label: "Jack Rod", state: pdiJackRod, setter: setPdiJackRod },
                      { label: "Spanner", state: pdiSpanner, setter: setPdiSpanner },
                      { label: "Parking Triangle", state: pdiParkingTriangle, setter: setPdiParkingTriangle },
                      { label: "Fire Extinguisher", state: pdiFireExtinguisher, setter: setPdiFireExtinguisher },
                      { label: "Seat Cover", state: pdiSeatCover, setter: setPdiSeatCover },
                      { label: "Floor Carpet", state: pdiFloorCarpet, setter: setPdiFloorCarpet },
                      { label: "Music System", state: pdiMusicSystem, setter: setPdiMusicSystem },
                      { label: "Spare Wheel (Stepney)", state: pdiSpareWheel, setter: setPdiSpareWheel }
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/30">
                        <span className="font-sans text-sm font-semibold text-text">{item.label}</span>
                        <div className="flex gap-2">
                          {PDI_INVENTORY_STATES.map(option => (
                            <label key={option} className={`flex items-center justify-center rounded-lg border px-3 py-1 text-[10px] font-bold cursor-pointer transition-all ${item.state === option ? 'bg-primary/5 border-primary text-primary shadow-xs' : 'border-border bg-white text-text-muted hover:bg-bg'}`}>
                              <input type="radio" name={`pdi_${item.label.toLowerCase().replace(/ /g, '_')}`} value={option} checked={item.state === option} onChange={() => item.setter(option)} className="sr-only" />
                              {option}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-2 border-b border-border/30">
                      <span className="font-sans text-sm font-semibold text-text">Keys Quantity</span>
                      <input 
                        type="number" 
                        placeholder="0"
                        value={pdiKeyQuantity}
                        onChange={(e) => setPdiKeyQuantity(e.target.value)}
                        min={0}
                        className="w-24 rounded-lg border border-border bg-white px-2.5 py-1 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs text-center"
                      />
                    </div>
                  </div>

                  {/* Tyres checks */}
                  <h4 className="font-sans text-xs font-bold text-violet-600 mb-4 border-t border-border/60 pt-6">D. Tyre State Logs</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "RH FRONT TYRE", state: pdiRhFrontTyre, setter: setPdiRhFrontTyre },
                      { label: "LH FRONT TYRE", state: pdiLhFrontTyre, setter: setPdiLhFrontTyre },
                      { label: "RH REAR TYRE", state: pdiRhRearTyre, setter: setPdiRhRearTyre },
                      { label: "LH REAR TYRE", state: pdiLhRearTyre, setter: setPdiLhRearTyre }
                    ].map(item => (
                      <div key={item.label} className="border border-border rounded-xl p-3.5 bg-bg/50">
                        <label className="block text-[9px] font-bold text-text-muted mb-2 text-center">{item.label}</label>
                        <select 
                          value={item.state} 
                          onChange={(e) => item.setter(e.target.value)}
                          className="w-full rounded-lg border border-border bg-white px-2 py-1.5 font-sans text-xs focus:border-primary focus:outline-none transition-all cursor-pointer text-center font-semibold"
                        >
                          {TYRE_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-4">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 rounded-xl border border-border bg-white py-3.5 font-sans text-sm font-bold text-text shadow-sm hover:bg-slate-50 transition-all cursor-pointer text-center"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`rounded-xl py-3.5 font-sans text-sm font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${editingId ? 'flex-1 bg-amber-500 hover:bg-amber-600' : 'w-full bg-primary hover:bg-primary-hover'}`}
                >
                  {isSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {editingId ? "Update Maintenance Log" : "Log Maintenance Job"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            
            {/* METRICS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="bg-white p-6 rounded-2xl shadow-xs border border-border flex items-center justify-between">
                <div>
                  <span className="block text-[9px] font-bold text-text-dim tracking-widest">Total Maintenance Logs</span>
                  <span className="text-3xl font-extrabold text-primary leading-tight mt-1 block">{stats.total}</span>
                </div>
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-primary">
                  <Wrench className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-xs border border-border flex items-center justify-between">
                <div>
                  <span className="block text-[9px] font-bold text-text-dim tracking-widest">Awaiting Approval</span>
                  <span className="text-3xl font-extrabold text-amber-500 leading-tight mt-1 block">{stats.pendingApproval}</span>
                </div>
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                  <Shield className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-xs border border-border flex items-center justify-between">
                <div>
                  <span className="block text-[9px] font-bold text-text-dim tracking-widest">Active Servicing / QC</span>
                  <span className="text-3xl font-extrabold text-rose-500 leading-tight mt-1 block">{stats.activeRepairs}</span>
                </div>
                <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                  <Clock className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-xs border border-border flex items-center justify-between">
                <div>
                  <span className="block text-[9px] font-bold text-text-dim tracking-widest">Completed & Released</span>
                  <span className="text-3xl font-extrabold text-green leading-tight mt-1 block">{stats.completed}</span>
                </div>
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-green">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* TABLE DATAGRID CARD */}
            <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
              <div className="border-b border-border bg-slate-50/50 px-8 py-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="font-sans text-lg font-extrabold text-primary tracking-tight">Maintenance Registry</h2>
                    <p className="font-sans text-xs text-text-muted mt-0.5">Log sheets of all vehicle inward service entries</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px] md:max-w-xs">
                      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="text" 
                        placeholder="Search vehicle, workshop..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-border bg-white pl-9 pr-4 py-2 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs"
                      />
                    </div>
                    
                    <select
                      value={filterCity}
                      onChange={(e) => setFilterCity(e.target.value)}
                      className="rounded-xl border border-border bg-white px-3 py-2 font-sans text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Cities</option>
                      {CITIES.map(c => <option key={c.value} value={c.value}>{c.text}</option>)}
                    </select>

                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="rounded-xl border border-border bg-white px-3 py-2 font-sans text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Stages</option>
                      {MAINTENANCE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <button 
                      onClick={exportCSV}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-3 font-sans text-xs font-semibold text-text hover:bg-bg transition-all cursor-pointer"
                      title="Export to CSV"
                    >
                      <Download className="h-4 w-4 text-text-muted" /> Export CSV
                    </button>

                    <button 
                      onClick={fetchRecords}
                      disabled={isLoading}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-bg text-text transition-all cursor-pointer disabled:opacity-50"
                      title="Refresh Logs"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="p-16 flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="p-16 text-center">
                  <Wrench className="h-12 w-12 text-border mx-auto mb-3" />
                  <h3 className="font-sans text-sm font-bold text-text">No Maintenance Records Found</h3>
                  <p className="font-sans text-xs text-text-muted mt-1">Try adapting your filters or log a new vehicle servicing entry.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-border bg-slate-50/70">
                        <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Job ID</th>
                        <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">In Date</th>
                        <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Vehicle & Workshop</th>
                        <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Type & Hub</th>
                        <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Estimated Cost</th>
                        <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Lifecycle Status</th>
                        <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredRecords.map((r) => {
                        let statusColor = "bg-green-50 text-green-700 ring-green-600/20";
                        if (["Inward", "Estimation", "Approval"].includes(r.maintenance_status)) {
                          statusColor = "bg-amber-50 text-amber-700 ring-amber-600/20";
                        } else if (["Hold", "Repairing", "QC"].includes(r.maintenance_status)) {
                          statusColor = "bg-rose-50 text-rose-700 ring-rose-600/20";
                        }
                        
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs font-semibold text-text-muted">#{r.id}</td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-xs font-bold text-text">
                                {r.vehicle_in_date ? r.vehicle_in_date.split("T")[0] : "—"}
                              </div>
                              <div className="font-mono text-[10px] text-text-muted mt-0.5">
                                {r.vehicle_in_date && r.vehicle_in_date.split("T")[1] ? r.vehicle_in_date.split("T")[1] : "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-mono text-xs font-bold text-primary tracking-wide">{r.vehicle_number}</div>
                              <div className="font-sans text-[11px] text-text-muted mt-0.5">Workshop: {r.workshop_name || "—"}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-xs text-text">{r.repair_type}</div>
                              <div className="font-sans text-[11px] text-text-muted mt-0.5">City: {r.city_name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-xs font-bold text-rose-600">₹ {Number(r.estimated_amount || 0).toLocaleString("en-IN")}</div>
                              <div className="font-sans text-[10px] text-text-muted mt-0.5">Est. Value</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${statusColor}`}>
                                {r.maintenance_status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={async () => {
                                    setEditingId(r.id);
                                    setRetrieveIdInput(String(r.id));
                                    setIsLoading(true);
                                    try {
                                      const token = localStorage.getItem("lr_token");
                                      const res = await fetch(`/api/maintenance/${r.id}`, {
                                        headers: { "Authorization": `Bearer ${token}` }
                                      });
                                      if (res.ok) {
                                        const data = await res.json();
                                        setVehicleNumber(data.vehicle_number || "");
                                        setCityName(data.city_name || "Hyderabad");
                                        setModel(data.model || "");
                                        setVehicleKms(data.vehicle_k_m_s || "");
                                        setRepairType(data.repair_type || "General Service");
                                        setVehicleLocation(data.vehicle_location || "");
                                        setVehicleInDate(data.vehicle_in_date || "");
                                        setInitialRemarks(data.initial_remarks || "");
                                        setVehicleDamagePhotos(data.vehicle_damage_photos || null);
                                
                                        setWorkshopName(data.workshop_name || "");
                                        setAllocationDate(data.allocation_date || "");
                                        setEstimatedDeliveryDate(data.estimated_delivery_date || "");
                                        setEstimatedAmount(data.estimated_amount || "");
                                        setInsuranceClaimed(data.insurance_claimed || "No");
                                        setClaimNumber(data.claim_number || "");
                                        setInsuranceBrokerage(data.insurance_brokerage || "");
                                        setApprovedBy(data.approved_by || "");
                                        setApprovalDate(data.approval_date || "");
                                        setApprovalFile(data.approval_file || null);
                                
                                        setMaintenanceStatus(data.maintenance_status || "Inward");
                                        setVehicleStatusDate(data.vehicle_status_date || "");
                                        setDailyVehicleRemarks(data.daily_vehicle_remarks || "");
                                        setRfdDate(data.rfd_date || "");
                                        setDeliveredDate(data.delivered_date || "");
                                        setFinalStatus(data.final_status || "");
                                        setTat(data.tat || "");
                                        setPdiStatus(data.pdi_status || "Pending");
                                
                                        setInvoiceNo(data.invoice_no || "");
                                        setInvoiceDate(data.invoice_date || "");
                                        setInvoiceAmount(data.invoice_amount || "");
                                        setInsuranceLiabilityDiscounts(data.insurance_liability_discounts || "");
                                        setLetzrydPayable(data.letzryd_payable || "");
                                        setPaymentStatus(data.payment_status || "Pending");
                                        setTypeOfPayment(data.type_of_payment || "UPI");
                                        setUtrNo(data.utr_no || "");
                                        setEntryRemarks(data.entry_remarks || "");
                                        setInvoiceFile(data.invoice_file || null);
                                
                                        setPdiFrontPhoto(data.pdi_front_photo || null);
                                        setPdiBackPhoto(data.pdi_back_photo || null);
                                        setPdiLhPhoto(data.pdi_lh_photo || null);
                                        setPdiRhPhoto(data.pdi_rh_photo || null);
                                        setPdiEnginePhoto(data.pdi_engine_photo || null);
                                        setEngineChassisNo(data.engine_chassis_no || "");
                                        setBatterySlNo(data.battery_sl_no || "");
                                        setFastTag(data.fast_tag || "");
                                        setPdiJack(data.pdi_jack || "Intact");
                                        setPdiJackRod(data.pdi_jack_rod || "Intact");
                                        setPdiSpanner(data.pdi_spanner || "Intact");
                                        setPdiParkingTriangle(data.pdi_parking_triangle || "Intact");
                                        setPdiFireExtinguisher(data.pdi_fire_extinguisher || "Intact");
                                        setPdiSeatCover(data.pdi_seat_cover || "Intact");
                                        setPdiFloorCarpet(data.pdi_floor_carpet || "Intact");
                                        setPdiMusicSystem(data.pdi_music_system || "Intact");
                                        setPdiSpareWheel(data.pdi_spare_wheel || "Intact");
                                        setPdiKeyQuantity(data.pdi_key_quantity || "");
                                
                                        setPdiRhFrontTyre(data.pdi_rh_front_tyre || "Good");
                                        setPdiLhFrontTyre(data.pdi_lh_front_tyre || "Good");
                                        setPdiRhRearTyre(data.pdi_rh_rear_tyre || "Good");
                                        setPdiLhRearTyre(data.pdi_lh_rear_tyre || "Good");
                                        
                                        setActiveTab("form");
                                      }
                                    } catch (err: any) {
                                      alert("Error: " + err.message);
                                    } finally {
                                      setIsLoading(false);
                                    }
                                  }}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 hover:bg-primary hover:text-white text-text-muted transition-all cursor-pointer"
                                  title="Edit Log"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(r.id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 hover:bg-red-500 hover:text-white text-red-500 border border-red-200/40 transition-all cursor-pointer"
                                  title="Delete Log"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="border-t border-border bg-slate-50/50 px-8 py-4 flex items-center justify-between text-xs text-text-muted">
                <span>Showing {filteredRecords.length} of {records.length} jobs</span>
                <span className="flex items-center gap-1">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  Track full inward diagnostic workflows here.
                </span>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Camera Capture Modal */}
      {cameraActiveField && (
        <CameraCapture
          onCapture={(photoData) => {
            if (cameraActiveField === "damage") setVehicleDamagePhotos(photoData);
            if (cameraActiveField === "approval") setApprovalFile(photoData);
            if (cameraActiveField === "invoice") setInvoiceFile(photoData);
            if (cameraActiveField === "pdi_front") setPdiFrontPhoto(photoData);
            if (cameraActiveField === "pdi_back") setPdiBackPhoto(photoData);
            if (cameraActiveField === "pdi_lh") setPdiLhPhoto(photoData);
            if (cameraActiveField === "pdi_rh") setPdiRhPhoto(photoData);
            if (cameraActiveField === "pdi_engine") setPdiEnginePhoto(photoData);
            setCameraActiveField(null);
          }}
          onClose={() => setCameraActiveField(null)}
        />
      )}
    </div>
  );
}
