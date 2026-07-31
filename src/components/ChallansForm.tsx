import React, { useState, useEffect, useMemo } from "react";
import { 
  AlertTriangle, Calendar, MapPin, User, Phone, FileText, CheckCircle, 
  Clock, ArrowLeft, Download, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, Plus, ChevronLeft, Database, Info, Shield
} from "lucide-react";
import { ChallanRecord, User as UserSession, CITIES } from "../types";
import CameraCapture from "./CameraCapture";

interface ChallansFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

const RECOVERY_STATUSES = ["Pending", "Recovered", "Disputed", "Waived"];

export default function ChallansForm({ 
  user, 
  onBackToSelector, 
  onLogout 
}: ChallansFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "registry">("form");
  
  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata", hour12: true
  }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [challanNumber, setChallanNumber] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverId, setDriverId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [violationDate, setViolationDate] = useState("");
  const [violationLocation, setViolationLocation] = useState("");
  const [challanAmount, setChallanAmount] = useState("");
  const [internalFineAmount, setInternalFineAmount] = useState("");
  const [recoveryStatus, setRecoveryStatus] = useState("Pending");
  const [recoveredAmount, setRecoveredAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [challanPhoto, setChallanPhoto] = useState<string | null>(null);

  // Camera & Loading States
  const [cameraActive, setCameraActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Registry state
  const [records, setRecords] = useState<ChallanRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [retrieveIdInput, setRetrieveIdInput] = useState("");

  const displayName = user.name || user.username || "User";
  const initials = displayName.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/challans", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setRecords(await res.json());
    } catch (e) {
      console.error("Error fetching challans", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "registry") {
      fetchRecords();
    }
  }, [activeTab]);

  // Metrics
  const stats = useMemo(() => {
    let totalFine = 0;
    let totalRecovered = 0;
    let pendingRecovery = 0;
    let disputedCount = 0;

    records.forEach(r => {
      totalFine += Number(r.challan_amount || 0);
      totalRecovered += Number(r.recovered_amount || 0);
      if (r.recovery_status === "Pending") {
        pendingRecovery += (Number(r.challan_amount || 0) - Number(r.recovered_amount || 0));
      }
      if (r.recovery_status === "Disputed") {
        disputedCount++;
      }
    });

    return { totalFine, totalRecovered, pendingRecovery, disputedCount };
  }, [records]);

  const resetForm = () => {
    setEditingId(null);
    setChallanNumber("");
    setVehicleNumber("");
    setDriverId("");
    setDriverName("");
    setViolationDate("");
    setViolationLocation("");
    setChallanAmount("");
    setInternalFineAmount("");
    setRecoveryStatus("Pending");
    setRecoveredAmount("");
    setRemarks("");
    setChallanPhoto(null);
    setRetrieveIdInput("");
  };

  const handleRetrieve = async () => {
    if (!retrieveIdInput.trim()) return alert("Please enter a valid Challan ID.");
    const id = parseInt(retrieveIdInput.trim(), 10);
    if (isNaN(id)) return alert("Challan ID must be numeric.");

    setIsLoading(true);
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/challans/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEditingId(data.id);
        setChallanNumber(data.challan_number || "");
        setVehicleNumber(data.vehicle_number || "");
        setDriverId(data.driver_id || "");
        setDriverName(data.driver_name || "");
        setViolationDate(data.violation_date || "");
        setViolationLocation(data.violation_location || "");
        setChallanAmount(String(data.challan_amount || ""));
        setInternalFineAmount(String(data.internal_fine_amount || ""));
        setRecoveryStatus(data.recovery_status || "Pending");
        setRecoveredAmount(String(data.recovered_amount || ""));
        setRemarks(data.remarks || "");
        setChallanPhoto(data.challan_photo || null);
        alert(`Loaded Challan #${data.id}`);
      } else {
        alert("Challan not found in database.");
      }
    } catch (e: any) {
      alert("Error loading record: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setChallanPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challanNumber.trim()) return alert("Challan Number is required.");
    if (!vehicleNumber.trim()) return alert("Vehicle Number is required.");
    if (!challanAmount || Number(challanAmount) <= 0) return alert("Fine amount must be greater than zero.");

    setIsSubmitting(true);
    const payload = {
      challan_number: challanNumber.toUpperCase().trim(),
      vehicle_number: vehicleNumber.toUpperCase().trim(),
      driver_id: driverId.trim() || null,
      driver_name: driverName.trim() || null,
      violation_date: violationDate,
      violation_location: violationLocation.trim() || null,
      challan_amount: parseInt(challanAmount, 10),
      internal_fine_amount: internalFineAmount ? parseInt(internalFineAmount, 10) : 0,
      recovery_status: recoveryStatus,
      recovered_amount: recoveredAmount ? parseInt(recoveredAmount, 10) : 0,
      remarks: remarks.trim() || null,
      challan_photo: challanPhoto
    };

    try {
      const token = localStorage.getItem("lr_token");
      const url = editingId ? `/api/challans/${editingId}` : "/api/challans";
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
        alert(editingId ? "Challan updated successfully!" : "Challan logged successfully!");
        resetForm();
        setActiveTab("registry");
      } else {
        const error = await res.json();
        alert(error.detail || "Failed to save challan record.");
      }
    } catch (e: any) {
      alert("Error occurred: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`Are you sure you want to delete challan #${id}?`)) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/challans/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Challan record deleted.");
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
    const headers = ["ID", "Challan Number", "Vehicle Number", "Driver ID", "Driver Name", "Violation Date", "Govt. Fine Amount (₹)", "Internal Fine (₹)", "Status", "Recovered (₹)"];
    const csvContent = [
      headers.join(","),
      ...records.map(r => [
        r.id,
        r.challan_number,
        r.vehicle_number,
        r.driver_id || "N/A",
        r.driver_name || "N/A",
        r.violation_date,
        r.challan_amount,
        r.internal_fine_amount || 0,
        r.recovery_status,
        r.recovered_amount || 0
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "Traffic_Challans_Export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = records.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || 
      (r.challan_number || "").toLowerCase().includes(q) ||
      (r.vehicle_number || "").toLowerCase().includes(q) ||
      (r.driver_name || "").toLowerCase().includes(q) ||
      (r.driver_id || "").toLowerCase().includes(q) ||
      String(r.id).includes(q);
    
    const matchesStatus = filterStatus === "all" || r.recovery_status === filterStatus;

    return matchesQuery && matchesStatus;
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
              Traffic Challans Desk
            </span>
          </div>

          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab("form")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "form" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <FileText className="h-4 w-4" />
              Challan Form
            </button>
            <button
              onClick={() => setActiveTab("registry")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "registry" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <Database className="h-4 w-4" />
              Challans Registry
            </button>
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <div className="text-right">
              <span className="block text-[9px] font-bold text-text-dim">Current Time (IST)</span>
              <span className="font-mono text-xs font-extrabold text-green">{currentTime}</span>
            </div>
            
            <span className="h-5 border-l border-border" />
            
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">{initials}</div>
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
          <div className="mx-auto max-w-2xl flex flex-col gap-6">
            
            {/* Banner Header */}
            <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-white shadow-sm md:p-8">
              <div className="absolute inset-0 bg-radial-gradient from-red-600/10 to-transparent pointer-events-none" />
              
              <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[9px] font-bold text-white tracking-widest">
                      Traffic Compliance
                    </span>
                    <span className="text-white/40 text-xs">•</span>
                    <span className="text-white/60 text-xs font-medium">Fine & Recovery Registry</span>
                  </div>
                  <h1 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                    {editingId ? `Edit Challan Record #${editingId}` : "Log Traffic Challan"}
                  </h1>
                  <p className="font-sans text-xs text-white/70 mt-1 max-w-xl">
                    {editingId 
                      ? "Modifying active challan information, fine amounts, or wallet recovery settings." 
                      : "Record traffic tickets, upload copies, assign to drivers, and track internal recoveries."}
                  </p>
                </div>

                <div className="flex flex-col gap-2 items-start md:items-end">
                  <div className="relative flex w-full sm:w-72 items-center">
                    <Search className="absolute left-3 h-4 w-4 text-white/60" />
                    <input
                      type="number"
                      placeholder="Edit existing ID..."
                      value={retrieveIdInput}
                      onChange={(e) => setRetrieveIdInput(e.target.value)}
                      className="h-10 w-full rounded-l-xl border border-white/20 bg-white/10 pl-9 pr-3 text-sm text-white placeholder-white/50 outline-none focus:bg-white/20 focus:ring-2 focus:ring-white/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleRetrieve}
                      className="h-10 rounded-r-xl border border-white/20 border-l-0 bg-white px-4 text-xs font-bold text-green hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Retrieve
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* FORM CONTAINER */}
            {editingId && (
              <div className="rounded-2xl bg-yellow-50 border border-yellow-200 px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2 text-yellow-800 text-sm font-semibold">
                  <Edit className="h-4 w-4" />
                  Editing Challan Record #{editingId}
                </div>
                <button
                  type="button"
                  onClick={() => { resetForm(); setEditingId(null); }}
                  className="text-xs text-yellow-700 hover:text-yellow-900 font-bold underline cursor-pointer"
                >
                  Cancel Edit
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs md:p-8 space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Challan Reference Number <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. CHL-9988112"
                      value={challanNumber}
                      onChange={(e) => setChallanNumber(e.target.value.toUpperCase())}
                      required
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-mono text-sm tracking-wide focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Vehicle Plate Number <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. TS09 EA 9999"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                      required
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-mono text-sm tracking-wide focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Driver ID Override (Optional)
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. DR-9001"
                      value={driverId}
                      onChange={(e) => setDriverId(e.target.value.toUpperCase())}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Driver Name
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Suresh Kumar"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Violation Date <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="date" 
                      value={violationDate}
                      onChange={(e) => setViolationDate(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Violation Location / Landmark
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Gachibowli X Roads, HYD"
                      value={violationLocation}
                      onChange={(e) => setViolationLocation(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Challan Fine Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={challanAmount}
                      onChange={(e) => setChallanAmount(e.target.value)}
                      required
                      min={0}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Internal LetzRyd Fine (₹)
                    </label>
                    <input 
                      type="number" 
                      placeholder="0 — additional penalty due to recklessness, damage, etc."
                      value={internalFineAmount}
                      onChange={(e) => setInternalFineAmount(e.target.value)}
                      min={0}
                      className="w-full rounded-xl border border-rose-200 bg-rose-50/30 px-4 py-2.5 font-sans text-sm focus:border-rose-400 focus:ring-1 focus:ring-rose-300 focus:outline-none transition-all shadow-2xs"
                    />
                    <p className="text-[10px] text-text-muted mt-1.5">Charged by LetzRyd on top of the government challan. Use for reckless driving, vehicle damage, or policy violations.</p>
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Recovered Amount (₹)
                    </label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={recoveredAmount}
                      onChange={(e) => setRecoveredAmount(e.target.value)}
                      min={0}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Internal Recovery Status
                    </label>
                    <div className="grid grid-cols-2 gap-3 mt-1 sm:grid-cols-4">
                      {RECOVERY_STATUSES.map(status => (
                        <label key={status} className={`flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer transition-all ${recoveryStatus === status ? 'bg-primary/5 border-primary text-primary shadow-xs' : 'border-border bg-white text-text-muted hover:bg-bg'}`}>
                          <input type="radio" name="recovery_status" value={status} checked={recoveryStatus === status} onChange={() => setRecoveryStatus(status)} className="sr-only" />
                          {status}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Upload Challan Copy / Evidence
                    </label>
                    <div className="flex items-center gap-3 mt-1">
                      <input 
                        type="file" 
                        accept="image/*" 
                        id="challan-copy-upload" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                      <label htmlFor="challan-copy-upload" className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-4 font-sans text-xs font-semibold text-text hover:bg-bg transition-colors cursor-pointer shadow-2xs">
                        <Upload className="h-4 w-4 text-text-muted" /> Upload Copy
                      </label>
                      <button 
                        type="button" 
                        onClick={() => setCameraActive(true)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-text hover:bg-bg transition-colors cursor-pointer shadow-2xs"
                      >
                        <Camera className="h-4 w-4 text-text-muted" />
                      </button>
                      {challanPhoto && (
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-slate-100 overflow-hidden">
                          <img src={challanPhoto} alt="Challan copy" className="h-full w-full object-cover" />
                          <button type="button" onClick={() => setChallanPhoto(null)} className="absolute top-0 right-0 rounded-bl bg-black/70 p-0.5 text-white hover:bg-red-600 transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                    Operational Remarks / Dispute Reasons
                  </label>
                  <textarea 
                    placeholder="Log police remarks, dispute arguments, or details on recovery timeline..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-white px-4 py-3 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

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
                  className={`rounded-xl py-3.5 font-sans text-sm font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${editingId ? 'flex-1 bg-amber-500 hover:bg-amber-600' : 'w-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/10'}`}
                >
                  {isSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {editingId ? "Update Challan Record" : "Log Traffic Challan"}
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
                  <span className="block text-[9px] font-bold text-text-dim tracking-widest">Total Fine Accrued</span>
                  <span className="text-2xl font-extrabold text-primary leading-tight mt-1 block">₹ {stats.totalFine.toLocaleString("en-IN")}</span>
                </div>
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-xs border border-border flex items-center justify-between">
                <div>
                  <span className="block text-[9px] font-bold text-text-dim tracking-widest">Total Recovered</span>
                  <span className="text-2xl font-extrabold text-green leading-tight mt-1 block">₹ {stats.totalRecovered.toLocaleString("en-IN")}</span>
                </div>
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-green">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-xs border border-border flex items-center justify-between">
                <div>
                  <span className="block text-[9px] font-bold text-text-dim tracking-widest">Pending Recovery</span>
                  <span className="text-2xl font-extrabold text-amber-500 leading-tight mt-1 block">₹ {stats.pendingRecovery.toLocaleString("en-IN")}</span>
                </div>
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                  <Clock className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-xs border border-border flex items-center justify-between">
                <div>
                  <span className="block text-[9px] font-bold text-text-dim tracking-widest">Disputed Tickets</span>
                  <span className="text-2xl font-extrabold text-indigo-600 leading-tight mt-1 block">{stats.disputedCount} Tickets</span>
                </div>
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Shield className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* TABLE DATAGRID CARD */}
            <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
              <div className="border-b border-border bg-slate-50/50 px-8 py-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="font-sans text-lg font-extrabold text-primary tracking-tight">Challan Registry</h2>
                    <p className="font-sans text-xs text-text-muted mt-0.5">Audit log of all registered police traffic tickets</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px] md:max-w-xs">
                      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="text" 
                        placeholder="Search vehicle, driver, challan..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-border bg-white pl-9 pr-4 py-2 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs"
                      />
                    </div>

                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="rounded-xl border border-border bg-white px-3 py-2 font-sans text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Stages</option>
                      {RECOVERY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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
                  <AlertTriangle className="h-12 w-12 text-border mx-auto mb-3" />
                  <h3 className="font-sans text-sm font-bold text-text">No Challans Logged</h3>
                  <p className="font-sans text-xs text-text-muted mt-1">Try adapting your filters or log a new traffic fine entry.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-border bg-slate-50/70">
                        <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">ID</th>
                        <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Violation Date</th>
                        <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Challan Number</th>
                        <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Vehicle Plate</th>
                        <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Driver Details</th>
                        <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Govt. Challan (₹)</th>
                        <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-rose-500">Internal Fine (₹)</th>
                        <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Status</th>
                        <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredRecords.map((r) => {
                        let statusColor = "bg-rose-50 text-rose-700 ring-rose-600/20";
                        if (r.recovery_status === "Recovered") {
                          statusColor = "bg-green-50 text-green-700 ring-green-600/20";
                        } else if (r.recovery_status === "Disputed") {
                          statusColor = "bg-indigo-50 text-indigo-700 ring-indigo-600/20";
                        } else if (r.recovery_status === "Waived") {
                          statusColor = "bg-slate-50 text-slate-700 ring-slate-600/20";
                        }
                        
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs font-semibold text-text-muted">#{r.id}</td>
                            <td className="px-6 py-4 font-sans text-xs text-text">{r.violation_date || "—"}</td>
                            <td className="px-6 py-4 font-mono text-xs font-bold text-primary tracking-wide">{r.challan_number}</td>
                            <td className="px-6 py-4 font-mono text-xs font-bold text-primary tracking-wide">{r.vehicle_number}</td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-xs font-bold text-text">{r.driver_name || "Unallocated"}</div>
                              <div className="font-mono text-[10px] text-text-muted mt-0.5">{r.driver_id ? `ID: ${r.driver_id}` : "N/A"}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-xs font-bold text-rose-600">₹ {Number(r.challan_amount || 0).toLocaleString("en-IN")}</div>
                              {r.recovered_amount > 0 && (
                                <div className="font-sans text-[10px] text-green mt-0.5 font-bold">Recovered: ₹ {r.recovered_amount}</div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {Number(r.internal_fine_amount) > 0 ? (
                                <div className="inline-flex flex-col">
                                  <span className="font-sans text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2 py-0.5">₹ {Number(r.internal_fine_amount).toLocaleString("en-IN")}</span>
                                  <span className="text-[10px] text-rose-400 mt-0.5">LetzRyd Penalty</span>
                                </div>
                              ) : (
                                <span className="text-text-dim text-xs">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${statusColor}`}>
                                {r.recovery_status}
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
                                      const res = await fetch(`/api/challans/${r.id}`, {
                                        headers: { "Authorization": `Bearer ${token}` }
                                      });
                                      if (res.ok) {
                                        const data = await res.json();
                                        setChallanNumber(data.challan_number || "");
                                        setVehicleNumber(data.vehicle_number || "");
                                        setDriverId(data.driver_id || "");
                                        setDriverName(data.driver_name || "");
                                        setViolationDate(data.violation_date || "");
                                        setViolationLocation(data.violation_location || "");
                                        setChallanAmount(String(data.challan_amount || ""));
                                        setRecoveryStatus(data.recovery_status || "Pending");
                                        setRecoveredAmount(String(data.recovered_amount || ""));
                                        setRemarks(data.remarks || "");
                                        setChallanPhoto(data.challan_photo || null);
                                        setActiveTab("form");
                                      }
                                    } catch (err: any) {
                                      alert("Error loading record: " + err.message);
                                    } finally {
                                      setIsLoading(false);
                                    }
                                  }}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 hover:bg-primary hover:text-white text-text-muted transition-all cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(r.id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 hover:bg-red-500 hover:text-white text-red-500 border border-red-200/40 transition-all cursor-pointer"
                                  title="Delete"
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
                <span>Showing {filteredRecords.length} of {records.length} challans</span>
                <span className="flex items-center gap-1">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  Link and reconcile all traffic tickets to their active driver leases.
                </span>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Camera Capture Modal */}
      {cameraActive && (
        <CameraCapture
          onCapture={(photoData) => {
            setChallanPhoto(photoData);
            setCameraActive(false);
          }}
          onClose={() => setCameraActive(false)}
        />
      )}
    </div>
  );
}
