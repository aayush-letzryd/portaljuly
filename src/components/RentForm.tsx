import React, { useState, useEffect } from "react";
import { 
  IndianRupee, Search, Trash2, Edit, RefreshCw, Car, User, 
  ChevronLeft, FileText, Database, X, CheckCircle, History, Info,
  Building2, Sliders, ShieldCheck, Plus, Calendar, Tag, Check, ArrowRight
} from "lucide-react";
import { User as UserSession, RentRecord, RentalConfigType, RentLedgerRecord, CITIES } from "../types";

interface RentFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

// Business-friendly operational plan categories for portal staff
interface PlanTypeOption {
  type: RentalConfigType;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  activeBorder: string;
  activeBg: string;
}

const PLAN_TYPE_OPTIONS: PlanTypeOption[] = [
  {
    type: "PARTNER_DEAL",
    title: "Operator Agreement",
    subtitle: "Custom flat rate assigned to an operator or vendor",
    badge: "Operator Deal",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    activeBorder: "border-primary",
    activeBg: "bg-primary/5"
  },
  {
    type: "EXCEPTION_OVERRIDE",
    title: "Vehicle Concession",
    subtitle: "Temporary rate adjustment or courtesy waiver for a vehicle",
    badge: "Concession",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    activeBorder: "border-rose-500",
    activeBg: "bg-rose-50/40"
  },
  {
    type: "RATE_SLAB",
    title: "Trip Milestone Slabs",
    subtitle: "Reducing rate tiers based on weekly trips completed",
    badge: "Trip Slabs",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    activeBorder: "border-purple-500",
    activeBg: "bg-purple-50/40"
  },
  {
    type: "MODEL_BASELINE",
    title: "Model Standard Rate",
    subtitle: "Default baseline rate for all vehicles of a model",
    badge: "Model Rate",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    activeBorder: "border-amber-500",
    activeBg: "bg-amber-50/40"
  },
  {
    type: "FEE_WAIVER",
    title: "Indemnity Policy & Waiver",
    subtitle: "City-wide indemnity rule or driver fee waiver",
    badge: "Fee Policy",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    activeBorder: "border-teal-500",
    activeBg: "bg-teal-50/40"
  },
  {
    type: "CORE_PLAN",
    title: "Master City Plan",
    subtitle: "Standard city catalogue plan definitions",
    badge: "Master Plan",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    activeBorder: "border-emerald-500",
    activeBg: "bg-emerald-50/40"
  }
];

const POPULAR_MODELS = [
  "WagonR", "Dzire", "Hyundai Aura", "Tigor EV", "Tata Nexon EV", "EC3", "Toyota Etios", "Hyundai Xcent", "ALL"
];

const KNOWN_OPERATORS = [
  { id: "LETZBLR_HAMZA", name: "Hamza Moidu", city: "Bangalore" },
  { id: "LETZBLRIP7026684292", name: "Subhan Khan M N", city: "Bangalore" },
  { id: "LETZBLRIP7356813050", name: "Rishan R", city: "Bangalore" },
  { id: "LETZBLRIP7306249935", name: "Muhammed Sarbas A T", city: "Bangalore" },
  { id: "LETZBLRIP9656907001", name: "Rishad P V", city: "Bangalore" },
  { id: "LETZBLRIP8075280208", name: "Mohamed Ramees A", city: "Bangalore" },
  { id: "LETZHYDIP9701685282", name: "Shaik Kareem", city: "Hyderabad" },
  { id: "LETZHYDIP9885838038", name: "Shaik Kareem Fleet 2", city: "Hyderabad" },
  { id: "LETZBLRIP9036461336", name: "Nisamudeen K P", city: "Bangalore" }
];

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

  // Registry state
  const [records, setRecords] = useState<RentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterPlanType, setFilterPlanType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form Field State
  const [planType, setPlanType] = useState<RentalConfigType>("PARTNER_DEAL");
  const [city, setCity] = useState<string>("Bangalore");
  
  // Entity & Vehicle targeting
  const [partnerId, setPartnerId] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [customerType, setCustomerType] = useState<"Individual" | "Operator" | "ALL">("Operator");
  const [vehicleManufacturer, setVehicleManufacturer] = useState("Maruti Suzuki");
  const [vehicleModel, setVehicleModel] = useState("WagonR");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleAge, setVehicleAge] = useState("");

  // Plan code & metadata
  const [planCode, setPlanCode] = useState("");
  const [planName, setPlanName] = useState("");
  const [calculationType, setCalculationType] = useState("FLAT_RATE");

  // Dynamic Slab parameters (when planType === "RATE_SLAB")
  const [metricType, setMetricType] = useState<"UBER_TRIPS" | "OLA_TRIPS" | "TOTAL_TRIPS">("UBER_TRIPS");
  const [conditionRule, setConditionRule] = useState<string>("NONE");
  const [tripMin, setTripMin] = useState<number>(0);
  const [tripMax, setTripMax] = useState<string>("54");

  // Pricing & Fees
  const [dailyRent, setDailyRent] = useState<number>(870);
  const [dailyFee, setDailyFee] = useState<number>(30);
  const [isFeeWaiver, setIsFeeWaiver] = useState<boolean>(false);
  const [allPlatformFlatRent, setAllPlatformFlatRent] = useState<number>(1050);

  // Validity & Approvals
  const [validFrom, setValidFrom] = useState<string>(new Date().toISOString().split("T")[0]);
  const [validTo, setValidTo] = useState<string>("9999-12-31");
  const [reasonOrNotes, setReasonOrNotes] = useState<string>("");
  const [evidenceSource, setEvidenceSource] = useState<string>("");
  const [approvedBy, setApprovedBy] = useState<string>("Operations Head");
  const [status, setStatus] = useState<string>("Active");

  const displayName = user.name || user.username || "User";
  const initials = displayName.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();

  // Automatic indemnity fee policy for Mumbai
  useEffect(() => {
    if (city === "Mumbai") {
      setDailyFee(0);
      setIsFeeWaiver(true);
    } else if (planType !== "FEE_WAIVER" && !isFeeWaiver) {
      if (dailyFee === 0) setDailyFee(30);
    }
  }, [city]);

  const handleSelectPlanType = (t: RentalConfigType) => {
    setPlanType(t);
    if (t === "PARTNER_DEAL") {
      setDailyRent(870);
      setDailyFee(city === "Mumbai" ? 0 : 30);
      setIsFeeWaiver(city === "Mumbai");
      setCustomerType("Operator");
      setCalculationType("FLAT_RATE");
    } else if (t === "EXCEPTION_OVERRIDE") {
      setDailyRent(0);
      setDailyFee(0);
      setIsFeeWaiver(true);
      setReasonOrNotes("Approved maintenance concession (3-day courtesy waiver)");
      setApprovedBy("Fleet Operations Head");
    } else if (t === "RATE_SLAB") {
      setDailyRent(840);
      setTripMin(55);
      setTripMax("64");
      setMetricType("UBER_TRIPS");
      setCalculationType("SLAB_TIERED");
    } else if (t === "MODEL_BASELINE") {
      setDailyRent(989);
      setAllPlatformFlatRent(1050);
      setCalculationType("MODEL_FALLBACK");
    } else if (t === "FEE_WAIVER") {
      setDailyRent(0);
      setDailyFee(0);
      setIsFeeWaiver(true);
      setReasonOrNotes("Policy waiver for specific driver cohort");
    } else if (t === "CORE_PLAN") {
      setPlanCode("BLR_UBER_TBS");
      setPlanName("Bangalore Uber TBS Reducing Plan");
      setDailyRent(929);
      setDailyFee(30);
      setCalculationType("SLAB_TIERED");
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("lr_token");
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (filterCity !== "all") params.append("city", filterCity);
      if (filterPlanType !== "all") params.append("config_type", filterPlanType);
      if (filterStatus !== "all") params.append("status", filterStatus);

      const res = await fetch(`/api/rents?${params.toString()}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (e) {
      console.error("Error fetching rents", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Ledger state
  const [ledgerRecords, setLedgerRecords] = useState<RentLedgerRecord[]>([]);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState("");

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

  useEffect(() => {
    if (activeTab === "registry") {
      const t = setTimeout(fetchData, 200);
      return () => clearTimeout(t);
    } else if (activeTab === "ledger") {
      fetchLedger();
    }
  }, [activeTab, searchQuery, filterCity, filterPlanType, filterStatus]);

  const resetForm = () => {
    setEditingId(null);
    setPlanType("PARTNER_DEAL");
    setCity("Bangalore");
    setPlanCode("");
    setPlanName("");
    setPartnerId("");
    setPartnerName("");
    setVehicleManufacturer("Maruti Suzuki");
    setVehicleModel("WagonR");
    setVehicleNumber("");
    setVehicleAge("");
    setDailyRent(870);
    setDailyFee(30);
    setIsFeeWaiver(false);
    setTripMin(0);
    setTripMax("54");
    setReasonOrNotes("");
    setEvidenceSource("");
    setStatus("Active");
  };

  const loadRecordForEdit = (record: RentRecord) => {
    setEditingId(record.id);
    const recType = (record.config_type as RentalConfigType) || "PARTNER_DEAL";
    setPlanType(recType);
    setCity(record.city || "Bangalore");
    setPlanCode(record.plan_code || "");
    setPlanName(record.plan_name || "");
    setCalculationType(record.calculation_type || "FLAT_RATE");
    setPartnerId(record.partner_id || record.vendor_id || record.driver_id || "");
    setPartnerName(record.partner_name || "");
    setCustomerType((record.customer_type as any) || "Operator");
    setVehicleManufacturer(record.vehicle_manufacturer || "");
    setVehicleModel(record.vehicle_model || "ALL");
    setVehicleNumber(record.vehicle_number || "");
    setVehicleAge(record.vehicle_age || "");
    setMetricType((record.metric_type as any) || "UBER_TRIPS");
    setConditionRule(record.condition_rule || "NONE");
    setTripMin(record.trip_min ?? 0);
    setTripMax(record.trip_max !== null && record.trip_max !== undefined ? String(record.trip_max) : "");
    setDailyRent(record.daily_rent ?? record.rent_amount ?? 800);
    setDailyFee(record.daily_fee ?? (record.city === "Mumbai" ? 0 : 30));
    setIsFeeWaiver(record.is_fee_waiver || false);
    setAllPlatformFlatRent(record.all_platform_flat_rent ?? 1050);
    setValidFrom(record.valid_from ? record.valid_from.split("T")[0] : new Date().toISOString().split("T")[0]);
    setValidTo(record.valid_to ? record.valid_to.split("T")[0] : "9999-12-31");
    setReasonOrNotes(record.reason_or_notes || "");
    setEvidenceSource(record.evidence_source || "");
    setApprovedBy(record.approved_by || "Operations Head");
    setStatus(record.status || "Active");
    setActiveTab("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (planType !== "EXCEPTION_OVERRIDE" && planType !== "FEE_WAIVER" && dailyRent < 0) {
      return alert("Rent amount must be greater than or equal to zero.");
    }

    const payload = {
      config_type: planType,
      city,
      plan_code: planCode || undefined,
      plan_name: planName || undefined,
      calculation_type: calculationType,
      partner_id: partnerId || undefined,
      partner_name: partnerName || undefined,
      customer_type: customerType,
      vehicle_manufacturer: vehicleManufacturer || undefined,
      vehicle_model: vehicleModel || "ALL",
      vehicle_number: vehicleNumber ? vehicleNumber.toUpperCase().trim() : undefined,
      vehicle_age: vehicleAge || undefined,
      metric_type: metricType,
      condition_rule: conditionRule,
      trip_min: tripMin,
      trip_max: tripMax === "" || tripMax === "9999" ? null : parseInt(tripMax),
      daily_rent: dailyRent,
      daily_fee: isFeeWaiver ? 0 : dailyFee,
      is_fee_waiver: isFeeWaiver,
      all_platform_flat_rent: allPlatformFlatRent,
      valid_from: validFrom,
      valid_to: validTo || "9999-12-31",
      reason_or_notes: reasonOrNotes || undefined,
      evidence_source: evidenceSource || undefined,
      approved_by: approvedBy || "Operations Head",
      status: status || "Active"
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
      fetchData();
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

  const currentOption = PLAN_TYPE_OPTIONS.find(o => o.type === planType) || PLAN_TYPE_OPTIONS[0];
  const netDailyTotal = Number(dailyRent || 0) + (isFeeWaiver ? 0 : Number(dailyFee || 0));

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
            <span className="hidden font-sans text-xs font-semibold text-text-muted sm:inline-block">
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

          {/* Clock & User Profile */}
          <div className="hidden items-center gap-4 lg:flex">
            <div className="text-right">
              <span className="block text-[9px] font-bold text-text-dim">Current Time (IST)</span>
              <span className="font-sans text-xs font-bold text-primary tracking-tight">{currentTime}</span>
            </div>
            <span className="h-5 border-l border-border" />
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-white shadow-xs">{initials}</div>
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

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TAB 1: NEW RENT PLAN FORM                                  */}
        {/* ─────────────────────────────────────────────────────────── */}
        {activeTab === "form" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-border/60 overflow-hidden">
              
              {/* Card Header (Matches LetzRyd Form Brand Standard) */}
              <div className="bg-primary px-8 py-6 relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20 pointer-events-none" />
                <div className="relative z-10 flex items-center gap-3 mb-2">
                  <img 
                    src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" 
                    className="h-8 brightness-0 invert" 
                    alt="LetzRyd" 
                    referrerPolicy="no-referrer" 
                  />
                  <span className="px-2 py-0.5 rounded border border-white/30 bg-white/20 text-white text-[10px] font-bold tracking-widest backdrop-blur-sm">
                    Rent Configuration
                  </span>
                </div>
                <h1 className="relative z-10 font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                  {editingId ? `Edit Rent Plan #${editingId}` : "Create New Rent Plan"}
                </h1>
                <p className="text-xs text-white/80 mt-1 max-w-xl">
                  Configure driver rent plans, operator agreements, concessions, and trip slabs for fleet billing.
                </p>
              </div>

              {editingId && (
                <div className="bg-amber-50 px-8 py-3 border-b border-amber-200 flex justify-between items-center text-xs text-amber-900">
                  <span className="font-bold flex items-center gap-2">
                    <Edit className="h-4 w-4 text-amber-700" />
                    Editing Rent Plan #{editingId} ({currentOption.title})
                  </span>
                  <button onClick={resetForm} className="font-bold underline text-amber-800 hover:text-amber-950 cursor-pointer">
                    Cancel Edit & Create New
                  </button>
                </div>
              )}

              <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">

                  {/* 1. PLAN TYPE SELECTOR */}
                  <div className="space-y-3">
                    <label className="block font-sans text-xs font-bold text-text-muted">
                      Select Plan Type *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {PLAN_TYPE_OPTIONS.map((opt) => {
                        const isSelected = planType === opt.type;
                        return (
                          <button
                            key={opt.type}
                            type="button"
                            onClick={() => handleSelectPlanType(opt.type)}
                            className={`flex flex-col items-start p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                              isSelected 
                                ? `${opt.activeBorder} ${opt.activeBg} shadow-xs` 
                                : "border-border bg-slate-50/50 hover:border-primary/40 hover:bg-white"
                            }`}
                          >
                            <span className={`text-xs font-bold mb-1 ${isSelected ? "text-primary" : "text-text"}`}>
                              {opt.title}
                            </span>
                            <span className="text-[11px] text-text-muted leading-tight">
                              {opt.subtitle}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. OPERATIONAL CITY */}
                  <div className="space-y-3">
                    <label className="block font-sans text-xs font-bold text-text-muted">
                      City *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {["Bangalore", "Hyderabad", "Mumbai", "ALL"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCity(c)}
                          className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            city === c 
                              ? "bg-primary text-white border-primary shadow-xs" 
                              : "bg-white text-slate-700 border-border hover:border-primary/40 hover:bg-slate-50"
                          }`}
                        >
                          {c === "ALL" ? "All Cities (Universal)" : c}
                        </button>
                      ))}
                    </div>
                    {city === "Mumbai" && (
                      <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                        <Info className="h-4 w-4 shrink-0 text-amber-600" />
                        <span><b>Mumbai Fleet Policy:</b> Indemnity fee is waived (₹0/day) across all vehicles in Mumbai.</span>
                      </div>
                    )}
                  </div>

                  {/* 3. TARGETING DETAILS (OPERATOR, VEHICLE, MODEL) */}
                  <div className="space-y-4">
                    <label className="block font-sans text-xs font-bold text-text-muted border-b border-border pb-1.5">
                      Target & Vehicle Details
                    </label>

                    {/* Operator ID & Operator Name (Shown for Operator Agreement, Concession, Trip Slabs, Fee Waiver) */}
                    {(planType === "PARTNER_DEAL" || planType === "EXCEPTION_OVERRIDE" || planType === "RATE_SLAB" || planType === "FEE_WAIVER") && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="block font-sans text-xs font-bold text-text-muted">
                            Operator / Partner ID {planType === "PARTNER_DEAL" && "*"}
                          </label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                            <input
                              type="text"
                              list="known-operator-list"
                              value={partnerId}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPartnerId(val);
                                const match = KNOWN_OPERATORS.find(o => o.id.toLowerCase() === val.toLowerCase());
                                if (match) {
                                  setPartnerName(match.name);
                                  setCity(match.city);
                                }
                              }}
                              placeholder="e.g. LETZBLR_HAMZA, LETZHYDIP9701685282"
                              className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-2xs"
                            />
                            <datalist id="known-operator-list">
                              {KNOWN_OPERATORS.map(o => (
                                <option key={o.id} value={o.id}>{o.name} ({o.city})</option>
                              ))}
                              <option value="ALL">ALL (Universal Fleet)</option>
                            </datalist>
                          </div>
                          <span className="text-[10px] text-text-muted">Type or select known operator or enter custom ID.</span>
                        </div>

                        <div className="space-y-2">
                          <label className="block font-sans text-xs font-bold text-text-muted">
                            Operator / Partner Name
                          </label>
                          <input
                            type="text"
                            value={partnerName}
                            onChange={(e) => setPartnerName(e.target.value)}
                            placeholder="e.g. Hamza Moidu, Subhan Khan"
                            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-2xs"
                          />
                        </div>
                      </div>
                    )}

                    {/* Vehicle Model & Registration Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="block font-sans text-xs font-bold text-text-muted">Vehicle Model</label>
                        <select
                          value={vehicleModel}
                          onChange={(e) => setVehicleModel(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-2xs"
                        >
                          {POPULAR_MODELS.map(m => (
                            <option key={m} value={m}>{m === "ALL" ? "All Models (Any Vehicle)" : m}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block font-sans text-xs font-bold text-text-muted">
                          Vehicle Registration Number {planType === "EXCEPTION_OVERRIDE" && "*"}
                        </label>
                        <div className="relative">
                          <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                          <input
                            type="text"
                            required={planType === "EXCEPTION_OVERRIDE"}
                            value={vehicleNumber}
                            onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                            placeholder="e.g. TS09 EA 1001, KA01 AB 1234"
                            className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2.5 font-mono text-sm font-semibold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-2xs"
                          />
                        </div>
                        <span className="text-[10px] text-text-muted">
                          {planType === "EXCEPTION_OVERRIDE" ? "Required for specific vehicle concession." : "Optional: Leave blank to apply to all vehicles under this operator."}
                        </span>
                      </div>
                    </div>

                    {/* Master Plan details (Shown for Master City Plan) */}
                    {planType === "CORE_PLAN" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="space-y-2">
                          <label className="block font-sans text-xs font-bold text-text-muted">Plan Code *</label>
                          <input
                            type="text"
                            required
                            value={planCode}
                            onChange={(e) => setPlanCode(e.target.value.toUpperCase())}
                            placeholder="e.g. BLR_MASTER_IND, HYD_UBER_TBS"
                            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-mono text-sm font-bold focus:border-primary outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block font-sans text-xs font-bold text-text-muted">Plan Name *</label>
                          <input
                            type="text"
                            required
                            value={planName}
                            onChange={(e) => setPlanName(e.target.value)}
                            placeholder="e.g. Bangalore Master Individual Plan"
                            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Trip Slab Range (Shown for Trip Milestone Slabs) */}
                    {planType === "RATE_SLAB" && (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                        <span className="text-xs font-bold text-text block">Weekly Completed Trips Milestone</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-text-muted">Platform Metric</label>
                            <select
                              value={metricType}
                              onChange={(e) => setMetricType(e.target.value as any)}
                              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold focus:border-primary outline-none"
                            >
                              <option value="UBER_TRIPS">Uber Trips</option>
                              <option value="OLA_TRIPS">Ola Trips</option>
                              <option value="TOTAL_TRIPS">Total Combined Trips</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-text-muted">Min Trips</label>
                            <input
                              type="number"
                              min="0"
                              value={tripMin}
                              onChange={(e) => setTripMin(parseInt(e.target.value) || 0)}
                              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs font-bold font-mono focus:border-primary outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-text-muted">Max Trips (Empty for 9999+)</label>
                            <input
                              type="text"
                              value={tripMax}
                              onChange={(e) => setTripMax(e.target.value)}
                              placeholder="e.g. 54, 64"
                              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs font-bold font-mono focus:border-primary outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. RENT PRICING & INDEMNITY FEE */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-1.5">
                      <label className="font-sans text-xs font-bold text-text-muted">
                        Rent Pricing & Daily Fees
                      </label>
                      <span className="font-sans text-xs font-bold text-primary">
                        Total Net Daily: ₹ {netDailyTotal} / Day
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Daily Rent */}
                      <div className="space-y-2">
                        <label className="block font-sans text-xs font-bold text-text-muted">
                          Rent Amount (₹ / Day) *
                        </label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                          <input
                            type="number"
                            required
                            min="0"
                            value={dailyRent}
                            onChange={(e) => setDailyRent(parseFloat(e.target.value) || 0)}
                            className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2.5 font-sans text-base font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-2xs"
                          />
                        </div>
                        <span className="text-[10px] text-text-muted">
                          {planType === "EXCEPTION_OVERRIDE" ? "Set to ₹0 for full rent courtesy waiver." : "Base daily rent rate before indemnity fee."}
                        </span>
                      </div>

                      {/* Daily Indemnity Fee */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="font-sans text-xs font-bold text-text-muted">
                            Indemnity Fee (₹ / Day)
                          </label>
                          <label className="flex items-center gap-1.5 text-xs font-bold text-primary cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isFeeWaiver}
                              onChange={(e) => {
                                setIsFeeWaiver(e.target.checked);
                                if (e.target.checked) setDailyFee(0);
                                else if (city !== "Mumbai") setDailyFee(30);
                              }}
                              className="rounded text-primary focus:ring-primary"
                            />
                            Waive Fee (₹0)
                          </label>
                        </div>
                        <div className="relative">
                          <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                          <input
                            type="number"
                            min="0"
                            disabled={isFeeWaiver}
                            value={isFeeWaiver ? 0 : dailyFee}
                            onChange={(e) => setDailyFee(parseFloat(e.target.value) || 0)}
                            className={`w-full rounded-xl border border-border pl-10 pr-4 py-2.5 font-sans text-base font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-2xs ${
                              isFeeWaiver ? "bg-slate-100 text-slate-400" : "bg-white text-slate-900"
                            }`}
                          />
                        </div>
                        <span className="text-[10px] text-text-muted">
                          Standard indemnity fee is ₹30/day; ₹0 for Mumbai and waived partners.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 5. VALIDITY & APPROVALS */}
                  <div className="space-y-4">
                    <label className="block font-sans text-xs font-bold text-text-muted border-b border-border pb-1.5">
                      Validity Period & Authorization
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="block font-sans text-xs font-bold text-text-muted">Effective From *</label>
                        <div className="relative">
                          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                          <input
                            type="date"
                            required
                            value={validFrom}
                            onChange={(e) => setValidFrom(e.target.value)}
                            className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2.5 font-sans text-sm focus:border-primary outline-none shadow-2xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block font-sans text-xs font-bold text-text-muted">Effective Till</label>
                        <div className="relative">
                          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                          <input
                            type="date"
                            value={validTo === "9999-12-31" ? "" : validTo}
                            placeholder="Leave blank for ongoing"
                            onChange={(e) => setValidTo(e.target.value || "9999-12-31")}
                            className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2.5 font-sans text-sm focus:border-primary outline-none shadow-2xs"
                          />
                        </div>
                        <span className="text-[10px] text-text-muted">Leave empty for ongoing long-term agreement.</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="block font-sans text-xs font-bold text-text-muted">
                          Reason / Concession Notes {planType === "EXCEPTION_OVERRIDE" && "*"}
                        </label>
                        <input
                          type="text"
                          required={planType === "EXCEPTION_OVERRIDE"}
                          value={reasonOrNotes}
                          onChange={(e) => setReasonOrNotes(e.target.value)}
                          placeholder={planType === "EXCEPTION_OVERRIDE" ? "e.g. 3-day breakdown courtesy waiver" : "e.g. Operator negotiated contract 2026"}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary outline-none shadow-2xs"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block font-sans text-xs font-bold text-text-muted">Approved By</label>
                        <input
                          type="text"
                          value={approvedBy}
                          onChange={(e) => setApprovedBy(e.target.value)}
                          placeholder="e.g. Operations Head, City Manager"
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary outline-none shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* FORM ACTIONS */}
                  <div className="pt-4 flex items-center justify-between border-t border-border">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-xs text-text-muted hover:text-text font-semibold px-4 py-2.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Clear Form
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-primary text-white text-sm font-bold px-6 py-3 rounded-xl hover:bg-primary-hover shadow-sm transition-all cursor-pointer active:scale-98"
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

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TAB 2: RENT REGISTRY                                       */}
        {/* ─────────────────────────────────────────────────────────── */}
        {activeTab === "registry" && (
          <div className="space-y-6">

            {/* Registry Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-green" />
                    Rent Plans Registry
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Configure and manage active rent plans, operator agreements, concessions, and trip slabs.
                  </p>
                </div>
                
                <button
                  onClick={() => { resetForm(); setActiveTab("form"); }}
                  className="flex items-center gap-2 bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-primary-hover shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Create New Rent Plan
                </button>
              </div>

              {/* Filter Controls Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 bg-slate-50/70 rounded-xl border border-slate-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search model, operator, vehicle..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-white focus:border-primary outline-none"
                  />
                </div>

                <select
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-border bg-white focus:border-primary outline-none cursor-pointer"
                >
                  <option value="all">All Cities</option>
                  <option value="Bangalore">Bangalore</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="ALL">Universal (All Cities)</option>
                </select>

                <select
                  value={filterPlanType}
                  onChange={(e) => setFilterPlanType(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-border bg-white focus:border-primary outline-none cursor-pointer"
                >
                  <option value="all">All Plan Types</option>
                  <option value="PARTNER_DEAL">Operator Agreements</option>
                  <option value="EXCEPTION_OVERRIDE">Vehicle Concessions</option>
                  <option value="RATE_SLAB">Trip Milestone Slabs</option>
                  <option value="MODEL_BASELINE">Model Standards</option>
                  <option value="FEE_WAIVER">Indemnity Fee Waivers</option>
                  <option value="CORE_PLAN">Master City Plans</option>
                </select>

                <div className="flex items-center gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-border bg-white focus:border-primary outline-none cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                  <button 
                    onClick={fetchData} 
                    className="p-2 text-text-muted hover:text-primary hover:bg-slate-100 rounded-lg border border-border bg-white transition-colors cursor-pointer"
                    title="Refresh"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-border">
                    <tr>
                      <th className="px-5 py-3.5 font-sans font-bold text-text-muted">ID</th>
                      <th className="px-5 py-3.5 font-sans font-bold text-text-muted">Plan Type</th>
                      <th className="px-5 py-3.5 font-sans font-bold text-text-muted">City</th>
                      <th className="px-5 py-3.5 font-sans font-bold text-text-muted">Applies To</th>
                      <th className="px-5 py-3.5 font-sans font-bold text-text-muted">Vehicle Model</th>
                      <th className="px-5 py-3.5 font-sans font-bold text-text-muted">Rent / Day</th>
                      <th className="px-5 py-3.5 font-sans font-bold text-text-muted">Indemnity Fee</th>
                      <th className="px-5 py-3.5 font-sans font-bold text-text-muted">Total Net / Day</th>
                      <th className="px-5 py-3.5 font-sans font-bold text-text-muted">Effective Period</th>
                      <th className="px-5 py-3.5 font-sans font-bold text-text-muted">Status</th>
                      <th className="px-5 py-3.5 font-sans font-bold text-text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {records.map((rec) => {
                      const opt = PLAN_TYPE_OPTIONS.find(o => o.type === rec.config_type) || PLAN_TYPE_OPTIONS[0];
                      const rentVal = rec.daily_rent ?? rec.rent_amount ?? 0;
                      const feeVal = rec.is_fee_waiver ? 0 : (rec.daily_fee ?? 30);
                      const netVal = Number(rentVal) + Number(feeVal);

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-4 font-mono text-text-muted">#{rec.id}</td>
                          <td className="px-5 py-4">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${opt.badgeColor}`}>
                              {opt.title}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-semibold text-text">{rec.city || "Bangalore"}</td>
                          <td className="px-5 py-4">
                            {rec.partner_id ? (
                              <div>
                                <span className="font-mono font-semibold text-primary block">{rec.partner_id}</span>
                                {rec.partner_name && <span className="text-[10px] text-text-muted">{rec.partner_name}</span>}
                              </div>
                            ) : rec.vehicle_number ? (
                              <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                {rec.vehicle_number}
                              </span>
                            ) : (
                              <span className="text-text-muted">All Fleet</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-medium text-text">{rec.vehicle_model || "ALL"}</span>
                            {rec.config_type === "RATE_SLAB" && (
                              <span className="block text-[10px] text-purple-700 font-mono mt-0.5">
                                {rec.trip_min} - {rec.trip_max || "9999+"} trips
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 font-mono font-bold text-text">₹ {rentVal}</td>
                          <td className="px-5 py-4 font-mono">
                            {rec.is_fee_waiver ? (
                              <span className="text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded text-[10px]">
                                Waived (₹0)
                              </span>
                            ) : (
                              <span className="text-slate-600">₹ {feeVal}</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm font-extrabold font-mono text-green flex items-center gap-0.5">
                              <IndianRupee className="h-3.5 w-3.5" />{netVal}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-[11px] font-mono text-text-muted">
                            {rec.valid_from ? rec.valid_from.split("T")[0] : "2026-01-01"}
                            <span className="mx-1 text-slate-300">→</span>
                            {rec.valid_to && rec.valid_to !== "9999-12-31" ? rec.valid_to.split("T")[0] : "Ongoing"}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              rec.status === "Active" 
                                ? "bg-green-50 text-green-700 border-green-200" 
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}>
                              {rec.status || "Active"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => loadRecordForEdit(rec)}
                                className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(rec.id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {records.length === 0 && (
                      <tr>
                        <td colSpan={11} className="text-center py-12 text-text-dim text-xs">
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

              <div className="border-t border-border mt-4 pt-4 text-text-dim text-[11px] flex items-center justify-between">
                <span>Showing {records.length} rent plan records</span>
                <span className="font-mono text-text-muted">All changes audited</span>
              </div>
            </div>

          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TAB 3: AUDIT LEDGER                                        */}
        {/* ─────────────────────────────────────────────────────────── */}
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

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="border-b border-border bg-slate-50/50">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-text-muted">Log ID</th>
                      <th className="px-6 py-3 font-semibold text-text-muted">Timestamp</th>
                      <th className="px-6 py-3 font-semibold text-text-muted">Plan Type</th>
                      <th className="px-6 py-3 font-semibold text-text-muted">Identifier</th>
                      <th className="px-6 py-3 font-semibold text-text-muted">Action</th>
                      <th className="px-6 py-3 font-semibold text-text-muted">Old Rate</th>
                      <th className="px-6 py-3 font-semibold text-text-muted">New Rate</th>
                      <th className="px-6 py-3 font-semibold text-text-muted">Authorized By</th>
                      <th className="px-6 py-3 font-semibold text-text-muted">Effective Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {ledgerRecords
                      .filter(l => {
                        const q = ledgerSearch.toLowerCase().trim();
                        return !q || (l.entity_id || "").toLowerCase().includes(q) || (l.modified_by || "").toLowerCase().includes(q);
                      })
                      .map((log) => {
                        let badgeColor = "bg-blue-50 text-blue-700 border-blue-100";
                        if (log.change_type === "Updated") badgeColor = "bg-amber-50 text-amber-700 border-amber-100";
                        if (log.change_type === "Deleted") badgeColor = "bg-red-50 text-red-700 border-red-100";

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-3.5 font-mono text-text-muted">#{log.id}</td>
                            <td className="px-6 py-3.5 font-mono text-[10px] text-text-muted">
                              {log.created_at ? new Date(log.created_at).toLocaleString("en-IN") : "—"}
                            </td>
                            <td className="px-6 py-3.5 font-bold text-text">{log.entity_type}</td>
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
                    {ledgerRecords.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-text-dim text-xs">
                          No audit logs recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-border bg-slate-50/50 px-8 py-3.5 text-text-dim text-[11px] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  Audit logs comply with financial audit compliance and are locked against manual edits.
                </span>
                <span className="font-mono text-text-muted">Showing {ledgerRecords.length} log entries</span>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
