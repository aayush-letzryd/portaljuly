import React, { useState, useEffect } from "react";
import { 
  IndianRupee, Search, Trash2, Edit, RefreshCw, Car, User, 
  ChevronLeft, FileText, Database, X, CheckCircle, History, Info
} from "lucide-react";
import { User as UserSession, RentRecord, RentLedgerRecord, CITIES } from "../types";

interface RentFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

const LEVEL_OPTIONS = [
  { value: "model",    label: "Model Level",    desc: "Rate applies to all vehicles of this model" },
  { value: "vehicle",  label: "Vehicle Level",   desc: "Rate applies to a specific vehicle number" },
  { value: "driver",   label: "Driver Level",    desc: "Override rate for a specific driver ID" },
  { value: "operator", label: "Operator Level",  desc: "Override rate for an operator / vendor ID" },
];

const LEVEL_COLORS: Record<string, string> = {
  model:    "bg-blue-50 text-blue-700 border-blue-200",
  vehicle:  "bg-purple-50 text-purple-700 border-purple-200",
  driver:   "bg-green-50 text-green-700 border-green-200",
  operator: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function RentForm({ 
  user, 
  onBackToSelector,
  onLogout
}: RentFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "registry" | "ledger">("form");
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata", hour12: true
  }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [records, setRecords] = useState<RentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [level, setLevel] = useState("model");
  const [vehicleManufacturer, setVehicleManufacturer] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleAge, setVehicleAge] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [rentAmount, setRentAmount] = useState<number>(800);

  const displayName = user.name || user.username || "User";
  const initials = displayName.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (filterLevel !== "all") params.append("level", filterLevel);
      const res = await fetch(`/api/rents?${params.toString()}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setRecords(await res.json());
    } catch (e) {
      console.error("Error fetching rents", e);
    }
  };

  const [ledgerRecords, setLedgerRecords] = useState<RentLedgerRecord[]>([]);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState("all");

  const fetchLedger = async () => {
    setIsLedgerLoading(true);
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/rent-ledger", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setLedgerRecords(await res.json());
    } catch (e) {
      console.error("Error fetching rent ledger", e);
    } finally {
      setIsLedgerLoading(false);
    }
  };

  const filteredLedger = ledgerRecords.filter(log => {
    const q = ledgerSearch.toLowerCase().trim();
    const matchesSearch = !q ||
      (log.entity_id || "").toLowerCase().includes(q) ||
      (log.entity_type || "").toLowerCase().includes(q) ||
      (log.modified_by || "").toLowerCase().includes(q);
    const matchesType = ledgerTypeFilter === "all" || log.entity_type === ledgerTypeFilter;
    return matchesSearch && matchesType;
  });

  useEffect(() => {
    if (activeTab === "registry") {
      const t = setTimeout(fetchData, 300);
      return () => clearTimeout(t);
    } else if (activeTab === "ledger") {
      fetchLedger();
    }
  }, [activeTab, searchQuery, filterLevel]);

  const resetForm = () => {
    setEditingId(null);
    setLevel("model");
    setVehicleManufacturer("");
    setVehicleModel("");
    setVehicleNumber("");
    setVehicleAge("");
    setVendorId("");
    setDriverId("");
    setRentAmount(800);
  };

  const loadRecordForEdit = (record: RentRecord) => {
    setEditingId(record.id);
    setLevel(record.level || "model");
    setVehicleManufacturer(record.vehicle_manufacturer || "");
    setVehicleModel(record.vehicle_model || "");
    setVehicleNumber(record.vehicle_number || "");
    setVehicleAge(record.vehicle_age || "");
    setVendorId(record.vendor_id || "");
    setDriverId(record.driver_id || "");
    setRentAmount(record.rent_amount || 0);
    setActiveTab("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rentAmount || rentAmount <= 0) return alert("Rent amount must be greater than zero.");

    const payload = {
      level,
      vehicle_manufacturer: vehicleManufacturer || undefined,
      vehicle_model: vehicleModel || undefined,
      vehicle_number: vehicleNumber || undefined,
      vehicle_age: vehicleAge || undefined,
      vendor_id: vendorId || undefined,
      driver_id: driverId || undefined,
      rent_amount: rentAmount
    };

    try {
      const token = localStorage.getItem("lr_token");
      const url = editingId ? `/api/rents/${editingId}` : "/api/rents";
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
        const err = await res.json();
        throw new Error(err.detail || "Error saving record");
      }

      alert(`Rent plan ${editingId ? "updated" : "created"} successfully!`);
      resetForm();
      setActiveTab("registry");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Delete rent plan #${id}?`)) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/rents/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete");
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const getLevelInfo = (l: string) => LEVEL_OPTIONS.find(o => o.value === l);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      
      {/* HEADER */}
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
              referrerPolicy="no-referrer"
            />
            <span className="hidden h-5 border-l border-border sm:inline-block" />
            <span className="hidden font-sans text-xs font-medium text-text-muted sm:inline-block">
              Rent Plans
            </span>
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-2">
            <button 
              onClick={() => setActiveTab("form")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "form" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <FileText className="h-4 w-4" />
              {editingId ? `Editing #${editingId}` : "New Rent Plan"}
            </button>
            <button 
              onClick={() => { setActiveTab("registry"); fetchData(); }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "registry" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <Database className="h-4 w-4" />
              Rent Registry
            </button>
            <button 
              onClick={() => setActiveTab("ledger")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "ledger" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <History className="h-4 w-4" />
              Rent Audit Ledger
            </button>
          </nav>

          {/* Clock & User */}
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
                <span className="font-mono text-[10px] text-text-muted mt-0.5 leading-none">{user.role || "Executive"}</span>
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

      <main className="flex-grow mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">

        {/* FORM TAB */}
        {activeTab === "form" && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-border/40 overflow-hidden">
              
              {/* Card header */}
              <div className="bg-primary px-8 py-6 relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20 pointer-events-none" />
                <div className="relative z-10 flex items-center gap-3 mb-2">
                  <img src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" className="h-8 brightness-0 invert" alt="LetzRyd" referrerPolicy="no-referrer" />
                  <span className="px-2 py-0.5 rounded border border-white/30 bg-white/20 text-white text-[10px] font-bold tracking-widest backdrop-blur-sm">
                    Rent Configuration
                  </span>
                </div>
                <h1 className="relative z-10 font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                  {editingId ? `Edit Rent Plan #${editingId}` : "Create New Rent Plan"}
                </h1>
              </div>

              {editingId && (
                <div className="bg-yellow-50 px-8 py-3 border-b border-yellow-200 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-yellow-800 text-sm font-semibold">
                    <Edit className="h-4 w-4" />
                    Editing Rent Plan #{editingId}
                  </div>
                  <button onClick={resetForm} className="text-xs text-yellow-700 hover:text-yellow-900 font-bold underline cursor-pointer">
                    Cancel Edit
                  </button>
                </div>
              )}

              <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* Level Selector */}
                  <div className="space-y-2">
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">Rent Level *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {LEVEL_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setLevel(opt.value); setVehicleManufacturer(""); setVehicleModel(""); setVehicleNumber(""); setVendorId(""); setDriverId(""); }}
                          className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${ level === opt.value ? "border-primary bg-primary/5" : "border-border bg-slate-50 hover:border-primary/40" }`}
                        >
                          <span className={`text-xs font-bold mb-1 ${level === opt.value ? "text-primary" : "text-text"}`}>
                            {opt.label}
                          </span>
                          <span className="text-[10px] text-text-muted leading-tight">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conditional fields based on level */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {(level === "model" || level === "vehicle") && (
                      <>
                        <div className="space-y-2">
                          <label className="block font-sans text-xs font-bold text-text-muted mb-2">Vehicle Manufacturer</label>
                          <input
                            type="text"
                            value={vehicleManufacturer}
                            onChange={(e) => setVehicleManufacturer(e.target.value)}
                            placeholder="e.g. Maruti Suzuki, Tata"
                            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block font-sans text-xs font-bold text-text-muted mb-2">Vehicle Model</label>
                          <input
                            type="text"
                            value={vehicleModel}
                            onChange={(e) => setVehicleModel(e.target.value)}
                            placeholder="e.g. WagonR, Swift, Ertiga"
                            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                          />
                        </div>
                      </>
                    )}

                    {level === "vehicle" && (
                      <div className="space-y-2">
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Vehicle Number *</label>
                        <input
                          type="text"
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                          placeholder="e.g. TS09 EA 1001"
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>
                    )}

                    {(level === "model" || level === "vehicle") && (
                      <div className="space-y-2">
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Vehicle Age (Optional)</label>
                        <select
                          value={vehicleAge}
                          onChange={(e) => setVehicleAge(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        >
                          <option value="">Any Age</option>
                          <option value="0-2 Years">0-2 Years</option>
                          <option value="3-5 Years">3-5 Years</option>
                          <option value=">5 Years">&gt;5 Years</option>
                        </select>
                      </div>
                    )}

                    {level === "operator" && (
                      <div className="space-y-2 sm:col-span-2">
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Operator / Vendor ID *</label>
                        <input
                          type="text"
                          value={vendorId}
                          onChange={(e) => setVendorId(e.target.value)}
                          placeholder="e.g. VND-HYD-001"
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>
                    )}

                    {level === "driver" && (
                      <div className="space-y-2 sm:col-span-2">
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Driver ID *</label>
                        <input
                          type="text"
                          value={driverId}
                          onChange={(e) => setDriverId(e.target.value)}
                          placeholder="e.g. DR-HYD-001"
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* Rent Amount */}
                  <div className="space-y-2">
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">Rent Amount (₹ / Day) *</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                      <input
                        type="number"
                        required
                        min="1"
                        value={rentAmount}
                        onChange={(e) => setRentAmount(parseInt(e.target.value) || 0)}
                        className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-border">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-xs text-text-muted hover:text-text font-semibold px-4 py-2 rounded-lg hover:bg-slate-100 cursor-pointer"
                    >
                      Clear Form
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-primary text-white text-sm font-bold px-6 py-3 rounded-xl hover:bg-primary-hover shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {editingId ? "Update Rent Plan" : "Save Rent Plan"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* REGISTRY TAB */}
        {activeTab === "registry" && (
          <div className="space-y-6">

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {LEVEL_OPTIONS.map(opt => {
                const count = records.filter(r => r.level === opt.value).length;
                return (
                  <div key={opt.value} className={`rounded-xl border p-4 shadow-xs ${LEVEL_COLORS[opt.value]}`}>
                    <p className="text-[10px] font-bold opacity-70">{opt.label}</p>
                    <p className="text-2xl font-bold mt-1">{count}</p>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-green" />
                    Rent Plans Registry
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">Configure rent rates at model, vehicle, driver, or operator level.</p>
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto">
                  <div className="relative flex-1 lg:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Search model, vehicle no, ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 w-full lg:w-64 pl-9 pr-3 rounded-lg border border-border text-xs focus:border-primary outline-none"
                    />
                  </div>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="h-9 px-2 rounded-lg border border-border text-xs focus:border-primary outline-none"
                  >
                    <option value="all">All Levels</option>
                    {LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <button onClick={fetchData} className="p-2 text-text-muted hover:text-primary hover:bg-primary/5 rounded-lg border border-border bg-white transition-colors" title="Refresh">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap border-collapse">
                  <thead className="bg-slate-50 border-b border-border">
                    <tr>
                      <th className="px-5 py-3.5 font-sans text-xs font-bold text-text-muted">ID</th>
                      <th className="px-5 py-3.5 font-sans text-xs font-bold text-text-muted">Level</th>
                      <th className="px-5 py-3.5 font-sans text-xs font-bold text-text-muted">Applies To</th>
                      <th className="px-5 py-3.5 font-sans text-xs font-bold text-text-muted">Age Filter</th>
                      <th className="px-5 py-3.5 font-sans text-xs font-bold text-text-muted">Rent / Day</th>
                      <th className="px-5 py-3.5 font-sans text-xs font-bold text-text-muted">Created</th>
                      <th className="px-5 py-3.5 font-sans text-xs font-bold text-text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(record => (
                      <tr key={record.id} className="border-b border-border hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 text-xs font-mono text-text-muted">#{record.id}</td>
                        <td className="px-5 py-4">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${LEVEL_COLORS[record.level] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                            {getLevelInfo(record.level)?.label || record.level}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs">
                          {record.level === "model" && (
                            <div className="flex flex-col">
                              <span className="font-semibold text-text">{record.vehicle_model || "—"}</span>
                              {record.vehicle_manufacturer && <span className="text-[10px] text-text-muted">{record.vehicle_manufacturer}</span>}
                            </div>
                          )}
                          {record.level === "vehicle" && (
                            <div>
                              <span className="font-semibold text-text">{record.vehicle_number || "—"}</span>
                              {(record.vehicle_model || record.vehicle_manufacturer) && (
                                <span className="text-text-muted ml-1 text-[10px]">
                                  ({[record.vehicle_manufacturer, record.vehicle_model].filter(Boolean).join(" ")})
                                </span>
                              )}
                            </div>
                          )}
                          {record.level === "driver" && (
                            <span className="font-mono text-text">{record.driver_id || "—"}</span>
                          )}
                          {record.level === "operator" && (
                            <span className="font-mono text-text">{record.vendor_id || "—"}</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-text-muted">{record.vehicle_age || "—"}</td>
                        <td className="px-5 py-4">
                          <span className="text-base font-extrabold text-green flex items-center gap-0.5">
                            <IndianRupee className="h-3.5 w-3.5" />{record.rent_amount}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-text-muted">
                          {record.created_at ? new Date(record.created_at).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => loadRecordForEdit(record)}
                              className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(record.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-text-dim text-xs">
                          <div className="flex flex-col items-center gap-2">
                            <IndianRupee className="h-8 w-8 opacity-20 text-primary" />
                            <span>No rent plans found.</span>
                            <button
                              onClick={() => setActiveTab("form")}
                              className="mt-1 text-primary font-bold underline cursor-pointer"
                            >
                              Create your first rent plan
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "ledger" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-border/60 overflow-hidden">
              <div className="border-b border-border bg-slate-50/50 px-8 py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-sans text-sm font-extrabold text-primary">Rent Modification Audit Logs</h2>
                  <p className="font-sans text-xs text-text-muted mt-0.5">Search by Driver ID, Vehicle Number, Model name, or Vendor ID</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      placeholder="e.g. DR-9001, TS09 EA 9999..."
                      value={ledgerSearch}
                      onChange={e => setLedgerSearch(e.target.value)}
                      className="w-56 rounded-xl border border-border bg-white pl-8 pr-4 py-2 font-sans text-xs focus:border-primary focus:outline-none transition-all"
                    />
                  </div>
                  <select
                    value={ledgerTypeFilter}
                    onChange={e => setLedgerTypeFilter(e.target.value)}
                    className="rounded-xl border border-border bg-white px-3 py-2 font-sans text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Types</option>
                    <option value="Model">Model</option>
                    <option value="Vehicle">Vehicle</option>
                    <option value="Driver">Driver</option>
                    <option value="Vendor">Vendor</option>
                  </select>
                  <button
                    onClick={fetchLedger}
                    disabled={isLedgerLoading}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white hover:bg-slate-50 text-text-muted transition-colors cursor-pointer"
                    title="Refresh"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLedgerLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {isLedgerLoading ? (
                <div className="p-16 flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredLedger.length === 0 ? (
                <div className="p-16 text-center text-text-muted text-xs">
                  <History className="h-8 w-8 opacity-25 mx-auto mb-2 text-primary" />
                  {ledgerRecords.length === 0 ? "No rent configuration adjustments logged yet." : `No entries match "${ledgerSearch}". Try a different identifier.`}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-slate-50/50">
                        <th className="px-6 py-3 font-semibold text-text-muted">Log ID</th>
                        <th className="px-6 py-3 font-semibold text-text-muted">Timestamp</th>
                        <th className="px-6 py-3 font-semibold text-text-muted">Level</th>
                        <th className="px-6 py-3 font-semibold text-text-muted">Identifier</th>
                        <th className="px-6 py-3 font-semibold text-text-muted">Modification</th>
                        <th className="px-6 py-3 font-semibold text-text-muted">Old Rate</th>
                        <th className="px-6 py-3 font-semibold text-text-muted">New Rate</th>
                        <th className="px-6 py-3 font-semibold text-text-muted">Authorized By</th>
                        <th className="px-6 py-3 font-semibold text-text-muted">Effective Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredLedger.map((log) => {
                        let badgeColor = "bg-blue-50 text-blue-700 border-blue-100";
                        if (log.change_type === "Updated") badgeColor = "bg-amber-50 text-amber-700 border-amber-100";
                        if (log.change_type === "Deleted") badgeColor = "bg-red-50 text-red-700 border-red-100";

                        let typeColor = "bg-slate-50 text-slate-700 border-slate-200";
                        if (log.entity_type === "Driver") typeColor = "bg-green-50 text-green-700 border-green-200";
                        if (log.entity_type === "Vendor") typeColor = "bg-yellow-50 text-yellow-700 border-yellow-200";
                        if (log.entity_type === "Vehicle") typeColor = "bg-purple-50 text-purple-700 border-purple-200";

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-3.5 font-mono text-text-muted">#{log.id}</td>
                            <td className="px-6 py-3.5 font-mono text-[10px] text-text-muted">
                              {log.created_at ? new Date(log.created_at).toLocaleString("en-IN") : "—"}
                            </td>
                            <td className="px-6 py-3.5">
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${typeColor}`}>
                                {log.entity_type}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 font-bold text-primary font-mono">{log.entity_id || "—"}</td>
                            <td className="px-6 py-3.5">
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${badgeColor}`}>
                                {log.change_type}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 font-mono text-text-muted">₹ {log.old_amount}</td>
                            <td className="px-6 py-3.5 font-mono font-bold text-green">₹ {log.new_amount}</td>
                            <td className="px-6 py-3.5 font-semibold text-text">{log.modified_by}</td>
                            <td className="px-6 py-3.5 font-mono text-text-muted">{log.effective_date}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="border-t border-border bg-slate-50/50 px-8 py-3.5 text-text-dim text-[11px] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  This log is compiled dynamically from rent adjustments and is locked for auditing compliance.
                </span>
                <span className="font-mono text-text-muted">Showing {filteredLedger.length} of {ledgerRecords.length} entries</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
