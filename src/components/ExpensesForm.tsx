import React, { useState, useMemo, useEffect } from "react";
import { 
  Calendar, MapPin, User, Phone, FileText, CheckCircle, 
  Clock, ArrowLeft, ChevronLeft, Download, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, Key, Plus, Settings, Database, IndianRupee
} from "lucide-react";
import { ExpenseRecord, User as UserSession } from "../types";
import CameraCapture from "./CameraCapture";

interface ExpensesFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

export default function ExpensesForm({ 
  user, 
  onBackToSelector, 
  onLogout
}: ExpensesFormProps) {
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
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [driverName, setDriverName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [expensesType, setExpensesType] = useState("CNG");
  const [amountPaid, setAmountPaid] = useState("");
  const [referencePhoto, setReferencePhoto] = useState<string | null>(null);

  const [cameraActive, setCameraActive] = useState(false);

  // Registry Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  
  // Top header quick search
  const [retrieveIdInput, setRetrieveIdInput] = useState("");

  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [stats, setStats] = useState({
    total_expenses: 0,
    cng_total: 0,
    toll_total: 0,
    other_total: 0
  });

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
      const res = await fetch("/api/expense/stats", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/expense", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error("Error fetching records:", err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchRecords();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setReferencePhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const loadRecordForEdit = async (id: number) => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/expense/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Record not found");
      const data = await res.json();
      
      setEditingId(data.id);
      setExpenseDate(data.expense_date || "");
      setDriverName(data.driver_name || "");
      setPhoneNumber(data.phone_number || "");
      setVehicleNumber(data.vehicle_number || "");
      setExpensesType(data.expenses_type || "CNG");
      setAmountPaid(data.amount_paid || "");
      setReferencePhoto(data.reference_photo || null);
      
      setActiveTab("form");
      setRetrieveIdInput("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRetrieveId = async () => {
    const id = parseInt(retrieveIdInput);
    if (!id || id <= 0) return alert("Please enter a valid numeric ID");
    await loadRecordForEdit(id);
  };

  const resetForm = () => {
    setEditingId(null);
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setDriverName("");
    setPhoneNumber("");
    setVehicleNumber("");
    setExpensesType("CNG");
    setAmountPaid("");
    setReferencePhoto(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim()) return alert("Driver Name is required");
    if (!phoneNumber.trim()) return alert("Phone Number is required");
    if (!vehicleNumber.trim()) return alert("Vehicle Number is required");
    if (!amountPaid.trim()) return alert("Amount Paid is required");
    if (!referencePhoto) return alert("Proof photo / receipt is required");

    const payload = {
      expense_date: expenseDate,
      driver_name: driverName.trim(),
      phone_number: phoneNumber.trim(),
      vehicle_number: vehicleNumber.trim(),
      expenses_type: expensesType,
      amount_paid: amountPaid.trim(),
      reference_photo: referencePhoto
    };

    try {
      const token = localStorage.getItem("lr_token");
      const url = editingId ? `/api/expense/${editingId}` : "/api/expense";
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
        throw new Error(errorText || "Failed to submit expense record");
      }

      alert(editingId ? "Expense Record Updated Successfully!" : "Expense Record Saved Successfully!");
      resetForm();
      fetchStats();
      fetchRecords();
      setActiveTab("registry");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the expense record for ${name}?`)) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/expense/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Delete failed");
      alert("Expense deleted successfully");
      fetchStats();
      fetchRecords();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterType !== "all" && r.expenses_type !== filterType) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (r.driver_name || "").toLowerCase().includes(q) ||
          (r.phone_number || "").includes(q) ||
          (r.vehicle_number || "").toLowerCase().includes(q) ||
          String(r.id).includes(q)
        );
      }
      return true;
    });
  }, [records, searchQuery, filterType]);

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return alert("No records to export");
    const headers = [
      "ID", "Expense Date", "Driver Name", "Phone Number", 
      "Vehicle Number", "Expenses Type", "Amount Paid (INR)", "Created At"
    ];

    const rows = filteredRecords.map((r) => [
      r.id,
      r.expense_date,
      `"${r.driver_name.replace(/"/g, '""')}"`,
      r.phone_number,
      r.vehicle_number,
      `"${r.expenses_type.replace(/"/g, '""')}"`,
      r.amount_paid,
      r.created_at
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `letzryd_expenses_${new Date().toISOString().split("T")[0]}.csv`);
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
              Expenses
            </span>
          </div>

          {/* Navigation Pills */}
          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab("form")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "form" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <FileText className="h-4 w-4" />
              Expenses Form
            </button>
            <button
              onClick={() => {
                setActiveTab("registry");
                fetchStats();
                fetchRecords();
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "registry" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <Database className="h-4 w-4" />
              Expenses Registry
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
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden w-full">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20 pointer-events-none"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <img src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" className="h-8 brightness-0 invert" alt="LetzRyd" referrerPolicy="no-referrer" />
                      <span className="px-2 py-0.5 rounded border border-white/30 bg-white/20 text-white text-[10px] font-bold tracking-widest backdrop-blur-sm">
                        LetzRyd Expenses
                      </span>
                    </div>
                    <h1 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                      {editingId ? `Edit Expense Record #${editingId}` : "Expenses Form"}
                    </h1>
                  </div>

                  {/* Header Search bar */}
                  <div className="relative z-10 flex w-full sm:w-auto mt-2 sm:mt-0">
                    <div className="relative flex w-full sm:w-72 items-center">
                      <Search className="absolute left-3 h-4 w-4 text-white/60" />
                      <input 
                        type="number" 
                        placeholder="Edit existing expense (ID)..." 
                        value={retrieveIdInput}
                        onChange={(e) => setRetrieveIdInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRetrieveId()}
                        className="h-10 w-full rounded-l-xl border border-white/20 bg-white/10 py-2 pl-10 pr-3 text-sm text-white placeholder-white/50 backdrop-blur-md outline-none transition-all focus:border-white focus:bg-white/20 focus:ring-2 focus:ring-white/20"
                      />
                      <button 
                        onClick={handleRetrieveId}
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
                    Editing Expense Record #{editingId}
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
                  
                  {/* COLUMN 1: DRIVER & VEHICLE INFO */}
                  <div className="space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                        Driver & Vehicle Info
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Log Date <span className="text-red-500">*</span></label>
                        <input 
                          type="date" 
                          value={expenseDate}
                          onChange={(e) => setExpenseDate(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Driver Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          placeholder="Enter driver's full name..."
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Phone Number <span className="text-red-500">*</span></label>
                        <input 
                          type="tel" 
                          placeholder="+91 10-digit mobile..."
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Vehicle Number <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          placeholder="e.g. KA03 CD 1234..."
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 2: EXPENSE DETAILS */}
                  <div className="space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                        Expense Details
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Expenses Type <span className="text-red-500">*</span></label>
                        <select 
                          value={expensesType}
                          onChange={(e) => setExpensesType(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                        >
                          <option value="CNG">CNG</option>
                          <option value="Toll">Toll</option>
                          <option value="OLA - CL Balance">OLA - CL Balance</option>
                          <option value="Paid to Company">Paid to Company</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Amount Paid (₹) <span className="text-red-500">*</span></label>
                        <div className="relative flex items-center">
                          <IndianRupee className="absolute left-3.5 h-4 w-4 text-text-muted pointer-events-none" />
                          <input 
                            type="number" 
                            placeholder="0.00"
                            value={amountPaid}
                            onChange={(e) => setAmountPaid(e.target.value)}
                            required
                            className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 3: REFERENCE PHOTO */}
                  <div className="space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                        Reference Photo <span className="text-red-500">*</span>
                      </h3>
                    </div>

                    <div>
                      <div className="w-full rounded-2xl border border-dashed border-border bg-bg/30 p-6 text-center hover:bg-bg/50 transition-all shadow-2xs">
                        {referencePhoto ? (
                          <div className="relative inline-block">
                            <img 
                              src={referencePhoto} 
                              alt="Receipt Proof" 
                              className="h-48 w-auto object-cover rounded-xl border border-border shadow-xs"
                            />
                            <button 
                              type="button"
                              onClick={() => setReferencePhoto(null)}
                              className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white border border-white hover:bg-red-700 shadow-xs cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <Upload className="h-5 w-5" />
                            </div>
                            <p className="font-sans text-xs font-bold text-text-muted">Upload receipt / bill proof photo</p>
                            <div className="flex gap-2 justify-center">
                              <button
                                type="button"
                                onClick={() => setCameraActive(true)}
                                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 font-sans text-xs font-bold text-white hover:bg-primary-hover shadow-xs cursor-pointer"
                              >
                                <Camera className="h-3 w-3" />
                                Capture
                              </button>
                              <label className="flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 font-sans text-xs font-bold text-text-muted hover:bg-bg cursor-pointer transition-colors shadow-2xs">
                                <Upload className="h-3 w-3" />
                                Upload
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={handleImageUpload} 
                                  className="hidden" 
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* FORM ACTIONS */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-border pt-8">
                  <div className="flex flex-col gap-1 text-left w-full sm:w-auto">
                    <p className="text-[10px] font-bold text-red-500">* means mandatory</p>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto justify-end">
                    <button 
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl border border-border bg-white px-6 py-3 font-sans text-xs font-bold text-text hover:bg-bg transition-colors shadow-2xs cursor-pointer"
                    >
                      Reset Form
                    </button>
                    <button 
                      type="submit"
                      className="rounded-xl bg-primary px-6 py-3 font-sans text-sm font-bold text-white hover:bg-primary-hover shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      {editingId ? "Save Changes" : "Submit Expense"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* REGISTRY LOG */
          <div className="space-y-10">
            
            {/* 4 STATS CARDS */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              
              {/* CARD 1: Total Expenses */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="font-sans text-[10px] font-bold text-text-muted tracking-widest block">Total Expenses</span>
                  <span className="font-sans text-3xl font-extrabold text-primary tracking-tight block mt-1">₹{stats.total_expenses}</span>
                  <span className="font-sans text-[10px] text-text-muted block mt-0.5">Overall logged expenses</span>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-primary">
                  <Settings className="h-6 w-6" />
                </div>
              </div>

              {/* CARD 2: CNG Total */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="font-sans text-[10px] font-bold text-text-muted tracking-widest block">CNG Logs</span>
                  <span className="font-sans text-3xl font-extrabold text-green tracking-tight block mt-1">₹{stats.cng_total}</span>
                  <span className="font-sans text-[10px] text-text-muted block mt-0.5">Gas logs</span>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-light text-green">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </div>

              {/* CARD 3: Toll Total */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="font-sans text-[10px] font-bold text-text-muted tracking-widest block">Toll Total</span>
                  <span className="font-sans text-3xl font-extrabold text-amber-600 tracking-tight block mt-1">₹{stats.toll_total}</span>
                  <span className="font-sans text-[10px] text-text-muted block mt-0.5">Toll costs</span>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-light text-amber-600">
                  <Plus className="h-6 w-6" />
                </div>
              </div>

              {/* CARD 4: Other Total */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="font-sans text-[10px] font-bold text-text-muted tracking-widest block">Other Payments</span>
                  <span className="font-sans text-3xl font-extrabold text-indigo-600 tracking-tight block mt-1">₹{stats.other_total}</span>
                  <span className="font-sans text-[10px] text-text-muted block mt-0.5">OLA & directly to company</span>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Key className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* TABLE & FILTER CARD */}
            <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border bg-white px-6 py-5">
                <div>
                  <h2 className="font-sans text-lg font-extrabold text-text tracking-tight">Expenses Registry</h2>
                  <p className="font-sans text-xs text-text-muted mt-0.5">Audit log of CNG refills, toll fees, company adjustments, and reference photo links.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-4 py-2 font-sans text-xs font-bold text-text hover:bg-bg transition-colors shadow-2xs cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </button>
                  <button 
                    onClick={() => {
                      resetForm();
                      setActiveTab("form");
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-green px-4 py-2 font-sans text-xs font-bold text-white hover:bg-green-hover transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Expense
                  </button>
                </div>
              </div>

              {/* SEARCH & FILTERS BAR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-border bg-bg/30 px-6 py-4">
                
                <div className="relative flex items-center">
                  <Search className="absolute left-3.5 h-4 w-4 text-text-muted pointer-events-none" />
                  <input 
                    type="text" 
                    placeholder="Search name, phone, vehicle..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs"
                  />
                </div>

                <div className="relative">
                  <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="all">All Expenses Types</option>
                    <option value="CNG">CNG</option>
                    <option value="Toll">Toll</option>
                    <option value="OLA - CL Balance">OLA - CL Balance</option>
                    <option value="Paid to Company">Paid to Company</option>
                  </select>
                </div>
              </div>

              {/* TABLE CONTAINER */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-bg/50 select-none">
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-left w-16">ID</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-left">Date</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-left">Driver & Vehicle</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-left">Expense details</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-left w-24">Proof Photo</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-right w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <div className="p-16 text-center">
                            <IndianRupee className="h-12 w-12 text-border mx-auto mb-3" />
                            <h3 className="font-sans text-sm font-bold text-text">No Expenses Found</h3>
                            <p className="font-sans text-xs text-text-muted mt-1">Try adjusting your filters or log a new expense entry above.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((r) => {
                        return (
                          <tr key={r.id} className="hover:bg-bg/10 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs font-bold text-primary">#{r.id}</td>
                            <td className="px-6 py-4 font-mono text-xs text-text-muted">{r.expense_date}</td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-xs font-bold text-text">{r.driver_name}</div>
                              <div className="font-mono text-[10px] text-text-muted mt-0.5">Phone: {r.phone_number}</div>
                              <div className="font-mono text-[10px] text-primary mt-0.5">{r.vehicle_number}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-block rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold ${ r.expenses_type === "CNG" ? "bg-green-light text-green" : r.expenses_type === "Toll" ? "bg-yellow-light text-amber-600 border border-yellow-100" : r.expenses_type === "OLA - CL Balance" ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-rose-50 text-rose-600 border border-rose-100" }`}>
                                {r.expenses_type}
                              </span>
                              <div className="font-sans text-xs font-bold text-text mt-1.5">₹{r.amount_paid}</div>
                            </td>
                            <td className="px-6 py-4">
                              {r.reference_photo ? (
                                <a 
                                  href={r.reference_photo} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="block w-12 h-8 rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity"
                                >
                                  <img 
                                    src={r.reference_photo} 
                                    alt="Receipt" 
                                    className="w-full h-full object-cover"
                                  />
                                </a>
                              ) : (
                                <span className="font-sans text-[10px] text-text-muted">No photo</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button 
                                  onClick={() => loadRecordForEdit(r.id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg hover:bg-primary hover:text-white transition-colors cursor-pointer"
                                  title="Edit Expense"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(r.id, r.driver_name)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg text-red-600 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                                  title="Delete Expense"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* FOOTER STATS */}
              <div className="flex items-center justify-between border-t border-border bg-bg/20 px-6 py-4 font-sans text-xs text-text-muted">
                <span>Showing {filteredRecords.length} of {records.length} database entries</span>
                <span className="font-mono">Database Engine: PostgreSQL</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Camera Capture Modal */}
      {cameraActive && (
        <CameraCapture 
          onCapture={(base64) => {
            setReferencePhoto(base64);
            setCameraActive(false);
          }}
          onClose={() => setCameraActive(false)}
        />
      )}

      {/* FOOTER SECTION */}
      <footer className="bg-primary py-8 text-center text-xs text-white border-t border-primary-hover font-sans mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <img 
            src="/letzryd_logo.png" 
            alt="LetzRyd" 
            className="h-11 w-auto object-contain brightness-0 invert" 
          />
          <span className="font-semibold text-white">LetzRyd © Copyright 2026 | All Rights Reserved</span>
        </div>
      </footer>
    </div>
  );
}
