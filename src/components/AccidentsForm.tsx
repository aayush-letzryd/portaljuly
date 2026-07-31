import React, { useState, useMemo } from "react";
import { 
  Calendar, MapPin, User, Phone, FileText, CheckCircle, 
  Clock, ArrowLeft, Download, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, AlertTriangle, ShieldCheck, Filter, Plus, ChevronLeft, Settings, DollarSign
} from "lucide-react";
import { AccidentRecord, User as UserSession, CITIES } from "../types";
import CameraCapture from "./CameraCapture";

interface AccidentsFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

export default function AccidentsForm({ 
  user, 
  onBackToSelector, 
  onLogout
}: AccidentsFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "registry">("form");
  
  // Header clock state
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true
  }));

  React.useEffect(() => {
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

  // Panel 1: Incident & Vehicle
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [cityName, setCityName] = useState("Hyderabad");
  const [dateOfAccident, setDateOfAccident] = useState(new Date().toISOString().split("T")[0]);
  const [timeOfAccident, setTimeOfAccident] = useState("");
  const [placeOfAccident, setPlaceOfAccident] = useState("");
  const [vehicleStatus, setVehicleStatus] = useState<"Drivable" | "Needs Towing" | "Impounded by Police">("Drivable");

  // Panel 2: Driver & Passenger
  const [driverId, setDriverId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [noOfPersons, setNoOfPersons] = useState("1");
  const [thirdPartyInvolvement, setThirdPartyInvolvement] = useState<"Yes" | "No">("No");
  const [firFiled, setFirFiled] = useState<"Yes" | "No">("No");

  // Panel 3: Inspection & Financial
  const [accidentReason, setAccidentReason] = useState("");
  const [accidentInspection, setAccidentInspection] = useState("");
  const [insuranceStatus, setInsuranceStatus] = useState<"Claimed" | "Pending" | "Rejected" | "N/A">("N/A");
  const [repairCost, setRepairCost] = useState("");
  const [toeingCost, setToeingCost] = useState("");
  const [challanAmount, setChallanAmount] = useState("");
  const [fineAmount, setFineAmount] = useState("");
  const [comments, setComments] = useState("");

  // Panel 4: Photographic Evidence (Base64)
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [backPhoto, setBackPhoto] = useState<string | null>(null);
  const [rightPhoto, setRightPhoto] = useState<string | null>(null);
  const [leftPhoto, setLeftPhoto] = useState<string | null>(null);
  const [firDoc, setFirDoc] = useState<string | null>(null);

  // Camera capture modal state
  const [cameraActiveField, setCameraActiveField] = useState<"front" | "back" | "right" | "left" | "fir" | null>(null);

  // Stats / Registry Metrics
  const [stats, setStats] = useState({
    total_accidents: 0,
    total_repair_cost: 0,
    drivable_count: 0,
    needs_towing_count: 0,
    impounded_count: 0
  });

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [retrieveIdInput, setRetrieveIdInput] = useState("");

  const [records, setRecords] = useState<AccidentRecord[]>([]);

  const displayName = user.name || user.username || "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/accident/stats", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/accident", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setRecords(await res.json());
      }
    } catch (err) {
      console.error("Error fetching records:", err);
    }
  };

  React.useEffect(() => {
    fetchStats();
    fetchRecords();
  }, []);

  const handleImageUpload = (field: "front" | "back" | "right" | "left" | "fir", file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        if (field === "front") setFrontPhoto(reader.result);
        if (field === "back") setBackPhoto(reader.result);
        if (field === "right") setRightPhoto(reader.result);
        if (field === "left") setLeftPhoto(reader.result);
        if (field === "fir") setFirDoc(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const loadRecordForEdit = async (id: number) => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/accident/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Record not found");
      const data = await res.json();
      
      setEditingId(data.id);
      setVehicleNumber(data.vehicle_number || "");
      setVendorId(data.vendor_id || "");
      setVendorName(data.vendor_name || "");
      setCityName(data.city_name || "Hyderabad");
      setDateOfAccident(data.date_of_accident || "");
      setTimeOfAccident(data.time_of_accident || "");
      setPlaceOfAccident(data.place_of_accident || "");
      setVehicleStatus(data.vehicle_status || "Drivable");

      setDriverId(data.driver_id || "");
      setDriverName(data.driver_name || "");
      setNoOfPersons(data.no_of_persons || "1");
      setThirdPartyInvolvement(data.third_party_involvement || "No");
      setFirFiled(data.fir_filed || "No");

      setAccidentReason(data.accident_reason || "");
      setAccidentInspection(data.accident_inspection || "");
      setInsuranceStatus(data.insurance_status || "N/A");
      setRepairCost(data.repair_cost || "");
      setToeingCost(data.toeing_cost || "");
      setChallanAmount(data.challan_amount || "");
      setFineAmount(data.fine_amount || "");
      setComments(data.comments || "");

      setFrontPhoto(data.front_vehicle_photo || null);
      setBackPhoto(data.back_vehicle_photo || null);
      setRightPhoto(data.right_vehicle_photo || null);
      setLeftPhoto(data.left_vehicle_photo || null);
      setFirDoc(data.fir_document_copy || null);
      
      setActiveTab("form");
      setRetrieveIdInput("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setVehicleNumber("");
    setVendorId("");
    setVendorName("");
    setCityName("Hyderabad");
    setDateOfAccident(new Date().toISOString().split("T")[0]);
    setTimeOfAccident("");
    setPlaceOfAccident("");
    setVehicleStatus("Drivable");

    setDriverId("");
    setDriverName("");
    setNoOfPersons("1");
    setThirdPartyInvolvement("No");
    setFirFiled("No");

    setAccidentReason("");
    setAccidentInspection("");
    setInsuranceStatus("N/A");
    setRepairCost("");
    setToeingCost("");
    setChallanAmount("");
    setFineAmount("");
    setComments("");

    setFrontPhoto(null);
    setBackPhoto(null);
    setRightPhoto(null);
    setLeftPhoto(null);
    setFirDoc(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber.trim()) return alert("Vehicle Number is required");
    if (!vendorName.trim()) return alert("Vendor Name is required");
    if (!driverName.trim()) return alert("Driver Name is required");
    if (!driverId.trim()) return alert("Driver ID is required");
    if (!accidentReason.trim()) return alert("Accident Reason is required");
    if (!accidentInspection.trim()) return alert("Accident Inspection is required");

    if (!frontPhoto || !backPhoto || !rightPhoto || !leftPhoto) {
      return alert("All 4 vehicle photographs (Front, Back, Right, Left) are mandatory");
    }
    if (firFiled === "Yes" && !firDoc) {
      return alert("Police FIR copy is mandatory when FIR Filed is set to Yes");
    }

    const payload = {
      vehicle_number: vehicleNumber.trim(),
      vendor_id: vendorId.trim() || null,
      vendor_name: vendorName.trim(),
      city_name: cityName,
      date_of_accident: dateOfAccident,
      time_of_accident: timeOfAccident,
      place_of_accident: placeOfAccident.trim(),
      vehicle_status: vehicleStatus,
      driver_id: driverId.trim(),
      driver_name: driverName.trim(),
      no_of_persons: noOfPersons,
      third_party_involvement: thirdPartyInvolvement,
      fir_filed: firFiled,
      accident_reason: accidentReason.trim(),
      accident_inspection: accidentInspection.trim(),
      insurance_status: insuranceStatus,
      repair_cost: repairCost || null,
      toeing_cost: toeingCost || null,
      challan_amount: challanAmount || null,
      fine_amount: fineAmount || null,
      comments: comments.trim() || null,
      front_vehicle_photo: frontPhoto,
      back_vehicle_photo: backPhoto,
      right_vehicle_photo: rightPhoto,
      left_vehicle_photo: leftPhoto,
      fir_document_copy: firFiled === "Yes" ? firDoc : null
    };

    try {
      const token = localStorage.getItem("lr_token");
      const url = editingId ? `/api/accident/${editingId}` : "/api/accident";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to submit accident report");
      }

      alert(editingId ? "Accident Report Updated Successfully!" : "Accident Report Logged Successfully!");
      resetForm();
      fetchStats();
      fetchRecords();
      setActiveTab("registry");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number, vehicle: string) => {
    if (!window.confirm(`Are you sure you want to delete the accident report for ${vehicle}?`)) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/accident/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Delete failed");
      alert("Report deleted successfully");
      fetchStats();
      fetchRecords();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterCity !== "all" && r.city_name !== filterCity) return false;
      if (filterStatus !== "all" && r.vehicle_status !== filterStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (r.vehicle_number || "").toLowerCase().includes(q) ||
          (r.vendor_name || "").toLowerCase().includes(q) ||
          (r.driver_name || "").toLowerCase().includes(q) ||
          (r.driver_id || "").toLowerCase().includes(q) ||
          String(r.id).includes(q)
        );
      }
      return true;
    });
  }, [records, searchQuery, filterCity, filterStatus]);

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return alert("No records to export");
    const headers = [
      "ID", "Vehicle Number", "Vendor ID", "Vendor Name", "City", 
      "Date of Accident", "Time", "Place", "Vehicle Status", 
      "Driver ID", "Driver Name", "Persons in Vehicle", "Third-Party Involved", "FIR Filed", 
      "Accident Reason", "Inspection Notes", "Insurance Claim Status", "Est Repair Cost (INR)", 
      "Towing Cost (INR)", "Challan Amt (INR)", "Fine Amt (INR)", "Comments", "Created At"
    ];

    const rows = filteredRecords.map((r) => [
      r.id,
      r.vehicle_number,
      r.vendor_id || "",
      `"${r.vendor_name.replace(/"/g, '""')}"`,
      r.city_name,
      r.date_of_accident,
      r.time_of_accident,
      `"${r.place_of_accident.replace(/"/g, '""')}"`,
      r.vehicle_status,
      r.driver_id,
      `"${r.driver_name.replace(/"/g, '""')}"`,
      r.no_of_persons,
      r.third_party_involvement,
      r.fir_filed,
      `"${r.accident_reason.replace(/"/g, '""')}"`,
      `"${r.accident_inspection.replace(/"/g, '""')}"`,
      r.insurance_status,
      r.repair_cost || "0",
      r.toeing_cost || "0",
      r.challan_amount || "0",
      r.fine_amount || "0",
      `"${(r.comments || "").replace(/"/g, '""')}"`,
      r.created_at || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `letzryd_accidents_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-50 border-b border-border bg-white shadow-xs">
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
              alt="LetzRyd logo" 
              className="h-8 w-auto object-contain"
            />
            <span className="hidden h-5 border-l border-border sm:inline-block" />
            <span className="hidden font-sans text-xs font-medium text-text-muted sm:inline-block">
              Accidents & Claims
            </span>
          </div>

          {/* Navigation Pills */}
          <nav className="flex gap-2">
            <button
              onClick={() => {
                setActiveTab("form");
                resetForm();
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "form" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <FileText className="h-4 w-4" />
              Accidents Form
            </button>
            <button
              onClick={() => {
                setActiveTab("registry");
                fetchStats();
                fetchRecords();
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "registry" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <Settings className="h-4 w-4" />
              Accidents Registry
            </button>
          </nav>

          {/* Clock & User Profile */}
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

      {/* MAIN CONTAINER */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {activeTab === "form" ? (
          <div>
            {/* Form card header */}
            <div className="rounded-2xl border border-border bg-white shadow-xl overflow-hidden mb-10">
              
              <div className="bg-primary text-white px-8 py-6 relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-hover via-primary to-primary opacity-60" />
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden w-full">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20 pointer-events-none"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <img src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" className="h-8 brightness-0 invert" alt="LetzRyd" referrerPolicy="no-referrer" />
                      <span className="px-2 py-0.5 rounded border border-white/30 bg-white/20 text-white text-[10px] font-bold tracking-widest backdrop-blur-sm">
                        Fleet Safety
                      </span>
                    </div>
                    <h1 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                      {editingId ? `Edit Accident Record #${editingId}` : "Partner Accident Reporting"}
                    </h1>
                  </div>

                  {/* Header Search bar */}
                  <div className="relative z-10 flex w-full sm:w-auto mt-2 sm:mt-0">
                    <div className="relative flex w-full sm:w-72 items-center">
                      <Search className="absolute left-3 h-4 w-4 text-white/60" />
                      <input 
                        type="text" 
                        inputMode="numeric"
                        placeholder="Edit existing report (ID)..." 
                        value={retrieveIdInput}
                        onChange={(e) => setRetrieveIdInput(e.target.value.replace(/\D/g, ''))}
                        onKeyDown={(e) => e.key === "Enter" && retrieveIdInput && loadRecordForEdit(parseInt(retrieveIdInput))}
                        className="h-10 w-full rounded-l-xl border border-white/20 bg-white/10 py-2 pl-10 pr-3 text-sm text-white placeholder-white/50 backdrop-blur-md outline-none transition-all focus:border-white focus:bg-white/20 focus:ring-2 focus:ring-white/20"
                      />
                      <button 
                        onClick={() => retrieveIdInput && loadRecordForEdit(parseInt(retrieveIdInput))}
                        className="h-10 rounded-r-xl border border-white/20 border-l-0 bg-white px-4 text-xs font-bold text-green hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Retrieve
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Mode Banner */}
              {editingId && (
                <div className="bg-yellow-50 px-8 py-3 border-b border-yellow-200 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-yellow-800 text-sm font-semibold">
                    <Edit className="h-4 w-4" />
                    Editing Accident Record #{editingId}
                  </div>
                  <button type="button" onClick={resetForm} className="text-xs text-yellow-700 hover:text-yellow-900 font-bold underline cursor-pointer">
                    Cancel Edit
                  </button>
                </div>
              )}

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-8 space-y-10">
                
                {/* 3 COLUMN DETAILS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  
                  {/* COLUMN 1: VEHICLE & INCIDENT */}
                  <div className="space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                        Incident & Vehicle
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Vehicle Number <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          placeholder="e.g. TS09 EA 1111..."
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Vendor Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          placeholder="Enter vendor name..."
                          value={vendorName}
                          onChange={(e) => setVendorName(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Vendor ID (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="Enter Vendor ID..."
                          value={vendorId}
                          onChange={(e) => setVendorId(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">City Name <span className="text-red-500">*</span></label>
                        <select 
                          value={cityName}
                          onChange={(e) => setCityName(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                        >
                          {CITIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.text}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Date of Accident <span className="text-red-500">*</span></label>
                        <input 
                          type="date" 
                          value={dateOfAccident}
                          onChange={(e) => setDateOfAccident(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Time of Accident <span className="text-red-500">*</span></label>
                        <input 
                          type="time" 
                          value={timeOfAccident}
                          onChange={(e) => setTimeOfAccident(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Place of Accident <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          placeholder="Landmark or specific location..."
                          value={placeOfAccident}
                          onChange={(e) => setPlaceOfAccident(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Vehicle Status <span className="text-red-500">*</span></label>
                        <select 
                          value={vehicleStatus}
                          onChange={(e) => setVehicleStatus(e.target.value as any)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                        >
                          <option value="Drivable">Drivable</option>
                          <option value="Needs Towing">Needs Towing</option>
                          <option value="Impounded by Police">Impounded by Police</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 2: DRIVER & PASSENGERS */}
                  <div className="space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                        Driver & Passenger Info
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Driver ID <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          placeholder="e.g. DR-9001..."
                          value={driverId}
                          onChange={(e) => setDriverId(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Driver Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          placeholder="Full legal name..."
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">No. of Persons in Vehicle <span className="text-red-500">*</span></label>
                        <input 
                          type="number" 
                          min={0}
                          value={noOfPersons}
                          onChange={(e) => setNoOfPersons(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Third-Party Involvement? <span className="text-red-500">*</span></label>
                        <div className="flex gap-4">
                          {["Yes", "No"].map((v) => (
                            <label key={v} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-bg cursor-pointer transition-all shadow-2xs">
                              <input 
                                type="radio" 
                                name="thirdParty" 
                                checked={thirdPartyInvolvement === v}
                                onChange={() => setThirdPartyInvolvement(v as any)}
                                className="text-primary focus:ring-primary cursor-pointer"
                              />
                              {v}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Police FIR Filed? <span className="text-red-500">*</span></label>
                        <div className="flex gap-4">
                          {["Yes", "No"].map((v) => (
                            <label key={v} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-bg cursor-pointer transition-all shadow-2xs">
                              <input 
                                type="radio" 
                                name="firFiled" 
                                checked={firFiled === v}
                                onChange={() => setFirFiled(v as any)}
                                className="text-primary focus:ring-primary cursor-pointer"
                              />
                              {v}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 3: DAMAGES & FINANCIALS */}
                  <div className="space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                        Damages & Claims
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Accident Reason <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          placeholder="e.g. Rear-ended, Skidded..."
                          value={accidentReason}
                          onChange={(e) => setAccidentReason(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Inspection (Damage Summary) <span className="text-red-500">*</span></label>
                        <textarea 
                          placeholder="Describe the visible damage thoroughly..."
                          value={accidentInspection}
                          onChange={(e) => setAccidentInspection(e.target.value)}
                          required
                          rows={3}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs resize-none"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Insurance Claim Status <span className="text-red-500">*</span></label>
                        <select 
                          value={insuranceStatus}
                          onChange={(e) => setInsuranceStatus(e.target.value as any)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                        >
                          <option value="N/A">N/A</option>
                          <option value="Pending">Pending</option>
                          <option value="Claimed">Claimed</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-sans text-[10px] font-bold text-text-muted mb-1">Repair Cost (₹)</label>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={repairCost}
                            onChange={(e) => setRepairCost(e.target.value)}
                            className="w-full rounded-xl border border-border bg-white px-3 py-2 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs"
                          />
                        </div>
                        <div>
                          <label className="block font-sans text-[10px] font-bold text-text-muted mb-1">Towing Cost (₹)</label>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={toeingCost}
                            onChange={(e) => setToeingCost(e.target.value)}
                            className="w-full rounded-xl border border-border bg-white px-3 py-2 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-sans text-[10px] font-bold text-text-muted mb-1">Challan Amount (₹)</label>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={challanAmount}
                            onChange={(e) => setChallanAmount(e.target.value)}
                            className="w-full rounded-xl border border-border bg-white px-3 py-2 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs"
                          />
                        </div>
                        <div>
                          <label className="block font-sans text-[10px] font-bold text-text-muted mb-1">Fine Amount (₹)</label>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={fineAmount}
                            onChange={(e) => setFineAmount(e.target.value)}
                            className="w-full rounded-xl border border-border bg-white px-3 py-2 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Additional Comments</label>
                        <textarea 
                          placeholder="Other operational notes..."
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          rows={2}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ATTACHMENT SECTION */}
                <div className="border-t border-border pt-10">
                  <div className="border-b border-border pb-3 mb-6">
                    <h3 className="font-sans text-sm font-bold text-primary">
                      4. Photographic Evidence & Proof <span className="text-red-500">*</span>
                    </h3>
                    <p className="font-sans text-xs text-text-muted mt-1">Upload scene photos of all 4 vehicle sides. If FIR is filed, a copy is also mandatory.</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    
                    {/* Front Photo */}
                    <div className="rounded-xl border border-dashed border-border bg-bg/30 p-4 text-center flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-text-muted mb-2">Front Photo</span>
                      {frontPhoto ? (
                        <div className="relative">
                          <img src={frontPhoto} className="h-24 w-24 object-cover rounded-lg border border-border shadow-xs" />
                          <button type="button" onClick={() => setFrontPhoto(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0.5 shadow-md hover:bg-red-700 cursor-pointer"><X className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <button type="button" onClick={() => setCameraActiveField("front")} className="flex items-center gap-1 bg-primary text-white px-2 py-1 rounded text-xs hover:bg-primary-hover shadow-xs cursor-pointer"><Camera className="h-3 w-3" /> Camera</button>
                          <label className="flex items-center gap-1 bg-white border border-border text-text px-2 py-1 rounded text-xs hover:bg-slate-50 shadow-xs cursor-pointer justify-center"><Upload className="h-3 w-3" /> Upload <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload("front", e.target.files[0])} /></label>
                        </div>
                      )}
                    </div>

                    {/* Back Photo */}
                    <div className="rounded-xl border border-dashed border-border bg-bg/30 p-4 text-center flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-text-muted mb-2">Back Photo</span>
                      {backPhoto ? (
                        <div className="relative">
                          <img src={backPhoto} className="h-24 w-24 object-cover rounded-lg border border-border shadow-xs" />
                          <button type="button" onClick={() => setBackPhoto(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0.5 shadow-md hover:bg-red-700 cursor-pointer"><X className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <button type="button" onClick={() => setCameraActiveField("back")} className="flex items-center gap-1 bg-primary text-white px-2 py-1 rounded text-xs hover:bg-primary-hover shadow-xs cursor-pointer"><Camera className="h-3 w-3" /> Camera</button>
                          <label className="flex items-center gap-1 bg-white border border-border text-text px-2 py-1 rounded text-xs hover:bg-slate-50 shadow-xs cursor-pointer justify-center"><Upload className="h-3 w-3" /> Upload <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload("back", e.target.files[0])} /></label>
                        </div>
                      )}
                    </div>

                    {/* Right Photo */}
                    <div className="rounded-xl border border-dashed border-border bg-bg/30 p-4 text-center flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-text-muted mb-2">Right Photo</span>
                      {rightPhoto ? (
                        <div className="relative">
                          <img src={rightPhoto} className="h-24 w-24 object-cover rounded-lg border border-border shadow-xs" />
                          <button type="button" onClick={() => setRightPhoto(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0.5 shadow-md hover:bg-red-700 cursor-pointer"><X className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <button type="button" onClick={() => setCameraActiveField("right")} className="flex items-center gap-1 bg-primary text-white px-2 py-1 rounded text-xs hover:bg-primary-hover shadow-xs cursor-pointer"><Camera className="h-3 w-3" /> Camera</button>
                          <label className="flex items-center gap-1 bg-white border border-border text-text px-2 py-1 rounded text-xs hover:bg-slate-50 shadow-xs cursor-pointer justify-center"><Upload className="h-3 w-3" /> Upload <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload("right", e.target.files[0])} /></label>
                        </div>
                      )}
                    </div>

                    {/* Left Photo */}
                    <div className="rounded-xl border border-dashed border-border bg-bg/30 p-4 text-center flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-text-muted mb-2">Left Photo</span>
                      {leftPhoto ? (
                        <div className="relative">
                          <img src={leftPhoto} className="h-24 w-24 object-cover rounded-lg border border-border shadow-xs" />
                          <button type="button" onClick={() => setLeftPhoto(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0.5 shadow-md hover:bg-red-700 cursor-pointer"><X className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <button type="button" onClick={() => setCameraActiveField("left")} className="flex items-center gap-1 bg-primary text-white px-2 py-1 rounded text-xs hover:bg-primary-hover shadow-xs cursor-pointer"><Camera className="h-3 w-3" /> Camera</button>
                          <label className="flex items-center gap-1 bg-white border border-border text-text px-2 py-1 rounded text-xs hover:bg-slate-50 shadow-xs cursor-pointer justify-center"><Upload className="h-3 w-3" /> Upload <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload("left", e.target.files[0])} /></label>
                        </div>
                      )}
                    </div>

                    {/* FIR Doc Copy */}
                    <div className={`rounded-xl border border-dashed border-border bg-bg/30 p-4 text-center flex flex-col items-center justify-center ${firFiled === "No" ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}>
                      <span className="text-[10px] font-bold text-text-muted mb-2">FIR Document Copy</span>
                      {firDoc ? (
                        <div className="relative">
                          <img src={firDoc} className="h-24 w-24 object-cover rounded-lg border border-border shadow-xs" />
                          <button type="button" onClick={() => setFirDoc(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0.5 shadow-md hover:bg-red-700 cursor-pointer"><X className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <button type="button" disabled={firFiled === "No"} onClick={() => setCameraActiveField("fir")} className="flex items-center gap-1 bg-primary text-white px-2 py-1 rounded text-xs hover:bg-primary-hover shadow-xs cursor-pointer justify-center disabled:bg-slate-300 disabled:pointer-events-none"><Camera className="h-3 w-3" /> Camera</button>
                          <label className="flex items-center gap-1 bg-white border border-border text-text px-2 py-1 rounded text-xs hover:bg-slate-50 shadow-xs cursor-pointer justify-center"><Upload className="h-3 w-3" /> Upload <input type="file" accept="image/*" disabled={firFiled === "No"} className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload("fir", e.target.files[0])} /></label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* FORM ACTIONS */}
                <div className="flex justify-end gap-4 border-t border-border pt-8">
                  <button 
                    type="button" 
                    onClick={resetForm}
                    className="h-11 rounded-xl border border-border bg-white px-6 font-sans text-sm font-semibold text-text-muted hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs"
                  >
                    Clear Form
                  </button>
                  <button 
                    type="submit" 
                    className="h-11 rounded-xl bg-primary px-8 font-sans text-sm font-bold text-white hover:bg-primary-hover cursor-pointer transition-all shadow-xs shadow-primary/20"
                  >
                    {editingId ? "Update Incident Report" : "Log Accident Record"}
                  </button>
                </div>

              </form>

            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {/* METRICS DASHBOARD */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              
              {/* Card 1: Total Accidents */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="block font-sans text-[10px] font-extrabold text-text-muted mb-1">Total Accidents</span>
                  <span className="block font-sans text-3xl font-extrabold text-brand-blue">{stats.total_accidents}</span>
                  <span className="block font-sans text-[10px] text-text-dim mt-2">Active reported log</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-brand-blue">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              </div>

              {/* Card 2: Drivable */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="block font-sans text-[10px] font-extrabold text-text-muted mb-1">Drivable Vehicles</span>
                  <span className="block font-sans text-3xl font-extrabold text-green">{stats.drivable_count}</span>
                  <span className="block font-sans text-[10px] text-text-dim mt-2">Active on roads</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-green-light flex items-center justify-center text-green">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </div>

              {/* Card 3: Needs Towing */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="block font-sans text-[10px] font-extrabold text-text-muted mb-1">Needs Towing</span>
                  <span className="block font-sans text-3xl font-extrabold text-amber-500">{stats.needs_towing_count}</span>
                  <span className="block font-sans text-[10px] text-text-dim mt-2">Workshop repairs needed</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-yellow-light flex items-center justify-center text-amber-500">
                  <RefreshCw className="h-6 w-6" />
                </div>
              </div>

              {/* Card 4: Impounded */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="block font-sans text-[10px] font-extrabold text-text-muted mb-1">Impounded</span>
                  <span className="block font-sans text-3xl font-extrabold text-red-600">{stats.impounded_count}</span>
                  <span className="block font-sans text-[10px] text-text-dim mt-2">Held at police stations</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>

              {/* Card 5: Repair Cost */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="block font-sans text-[10px] font-extrabold text-text-muted mb-1">Total Repair Cost</span>
                  <span className="block font-sans text-2xl font-extrabold text-red-600">₹ {stats.total_repair_cost.toLocaleString()}</span>
                  <span className="block font-sans text-[10px] text-text-dim mt-2">Estimated damage billing</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* REGISTRY CARD TABLE */}
            <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
              <div className="border-b border-border bg-white px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-sans text-lg font-bold text-gray-900 leading-tight">Safety Incident Registry Database</h3>
                  <p className="font-sans text-xs text-text-muted mt-1">Audit trail of all recorded vehicle accidents, police FIR filings, and repair estimates.</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleExportCSV}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 font-sans text-xs font-semibold text-text-muted hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                  <button 
                    onClick={() => {
                      setActiveTab("form");
                      resetForm();
                    }}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 font-sans text-xs font-bold text-white hover:bg-primary-hover transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Report Accident
                  </button>
                </div>
              </div>

              {/* SEARCH & FILTERS BAR */}
              <div className="border-b border-border bg-slate-50/50 px-8 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
                  <input 
                    type="text" 
                    placeholder="Search by Vehicle Number, Driver, Vendor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-white pl-10 pr-4 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <select 
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-white px-4 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="all">All Cities</option>
                    {CITIES.map(c => (
                      <option key={c.value} value={c.value}>{c.text}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-white px-4 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Drivable">Drivable</option>
                    <option value="Needs Towing">Needs Towing</option>
                    <option value="Impounded by Police">Impounded by Police</option>
                  </select>
                </div>
              </div>

              {/* TABLE ELEMENT */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-4xl border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-slate-50 text-[10px] font-bold text-text-muted">
                      <th className="px-8 py-3.5 w-16">ID</th>
                      <th className="px-5 py-3.5">Date / Time</th>
                      <th className="px-5 py-3.5">Vehicle Details</th>
                      <th className="px-5 py-3.5">Driver & Location</th>
                      <th className="px-5 py-3.5">Financial Impact</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-8 py-3.5 text-right w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-sans text-xs">
                    {filteredRecords.length > 0 ? (
                      filteredRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-4 font-mono font-bold text-text">#{r.id}</td>
                          <td className="px-5 py-4">
                            <div className="font-bold text-text">{r.date_of_accident}</div>
                            <div className="text-[10px] text-text-muted mt-0.5">{r.time_of_accident || "—"}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-bold text-primary">{r.vehicle_number}</div>
                            <div className="text-[10px] text-text-muted mt-0.5">Vendor: {r.vendor_name}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-semibold text-text">{r.driver_name} ({r.driver_id})</div>
                            <div className="text-[10px] text-text-muted mt-0.5">{r.place_of_accident}, {r.city_name}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-bold text-red-600">₹ {r.repair_cost ? parseInt(r.repair_cost).toLocaleString() : "0"}</div>
                            <div className="text-[10px] text-text-muted mt-0.5">
                              Towing: ₹{r.toeing_cost || "0"} | Fines: ₹{(parseInt(r.challan_amount || "0") + parseInt(r.fine_amount || "0"))}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${ r.vehicle_status === "Drivable" ? "bg-green-light text-green" : r.vehicle_status === "Needs Towing" ? "bg-yellow-light text-amber-700" : "bg-red-50 text-red-600" }`}>
                              {r.vehicle_status}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => loadRecordForEdit(r.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-text-muted hover:bg-primary hover:text-white transition-all cursor-pointer"
                                title="Edit Record"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDelete(r.id, r.vehicle_number)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-text-muted hover:bg-red-600 hover:text-white transition-all cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-8 py-10 text-center text-text-muted font-medium">
                          No reported accidents matching the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* TABLE FOOTER */}
              <div className="border-t border-border bg-slate-50/50 px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-2 font-sans text-xs text-text-muted">
                <span>Showing {filteredRecords.length} of {records.length} database entries</span>
                <span className="font-mono text-[10px]">Database Engine: PostgreSQL</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CAMERA CAPTURE MODAL */}
      {cameraActiveField && (
        <CameraCapture 
          onCapture={(img) => {
            if (cameraActiveField === "front") setFrontPhoto(img);
            if (cameraActiveField === "back") setBackPhoto(img);
            if (cameraActiveField === "right") setRightPhoto(img);
            if (cameraActiveField === "left") setLeftPhoto(img);
            if (cameraActiveField === "fir") setFirDoc(img);
            setCameraActiveField(null);
          }}
          onCancel={() => setCameraActiveField(null)}
        />
      )}

      {/* FOOTER */}
      <footer className="bg-primary py-8 text-center text-xs text-white/50 border-t border-primary-hover font-sans mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" className="h-6 brightness-0 invert" alt="LetzRyd" />
            <span>Fleet Safety Operations</span>
          </div>
          <div className="flex gap-4">
            <span>safety@letzryd.com</span>
            <span>·</span>
            <span>+91 90352 39090</span>
          </div>
          <span>LetzRyd © {new Date().getFullYear()} · Hyderabad · Bangalore · Mumbai</span>
        </div>
      </footer>

    </div>
  );
}
