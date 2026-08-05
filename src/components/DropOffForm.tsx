import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar, MapPin, User, Phone, FileText, CheckCircle, 
  Clock, ArrowLeft, Download, Search, Trash2, Camera, 
  Upload, X, RefreshCw, ChevronLeft, Database, ShieldAlert, AlertTriangle
} from "lucide-react";
import { User as UserSession, CITIES } from "../types";
import CameraCapture from "./CameraCapture";

interface DropOffFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

export default function DropOffForm({ user, onBackToSelector, onLogout }: DropOffFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "registry">("form");

  // Clock
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

  // Form state
  const [dropoffDate, setDropoffDate] = useState(new Date().toISOString().split("T")[0]);
  const [dropoffReason, setDropoffReason] = useState("Voluntary Return");
  const [cityName, setCityName] = useState("Hyderabad");
  const [dropoffLocation, setDropoffLocation] = useState("Hub");
  
  // Driver Details
  const [driverId, setDriverId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverLookupStatus, setDriverLookupStatus] = useState("");
  const [isDriverLookupLoading, setIsDriverLookupLoading] = useState(false);

  // Vehicle Details
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleSuggestions, setVehicleSuggestions] = useState<any[]>([]);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);

  // OLA Negative Balance
  const [olaNegativeBalance, setOlaNegativeBalance] = useState("");
  const [olaNegativeBalanceProof, setOlaNegativeBalanceProof] = useState<string | null>(null);

  // Odometer & Photos
  const [odometerReading, setOdometerReading] = useState("");
  const [odometerPhoto, setOdometerPhoto] = useState<string | null>(null);
  const [batteryPhoto, setBatteryPhoto] = useState<string | null>(null);
  const [photoLhSide, setPhotoLhSide] = useState<string | null>(null);
  const [photoRhSide, setPhotoRhSide] = useState<string | null>(null);
  const [photoFrontSide, setPhotoFrontSide] = useState<string | null>(null);
  const [photoBackSide, setPhotoBackSide] = useState<string | null>(null);

  // Key, Dues & Settlement
  const [duplicateKeyStatus, setDuplicateKeyStatus] = useState("Yes");
  const [pendingDues, setPendingDues] = useState("");
  const [damagePenalty, setDamagePenalty] = useState("");
  const [depositRefundStatus, setDepositRefundStatus] = useState("Pending Assessment");
  const [fastagBalanceAmount, setFastagBalanceAmount] = useState("");
  const [fastagBalanceProof, setFastagBalanceProof] = useState<string | null>(null);
  const [dropoffNotes, setDropoffNotes] = useState("");

  // Camera Modal
  const [cameraActive, setCameraActive] = useState(false);
  const [activeCameraTarget, setActiveCameraTarget] = useState<
    "odometer" | "battery" | "lhSide" | "rhSide" | "frontSide" | "backSide" | "fastag" | "ola" | null
  >(null);

  // Drop-off Records
  const [dropoffRecords, setDropoffRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");

  const displayName = user.name || user.username || "Executive";
  const initials = displayName
    ? displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "EX";

  const fetchDropoffRecords = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/dropoffs", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDropoffRecords(data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDropoffRecords();
  }, []);

  const handleFetchDriver = async (searchVal?: string) => {
    const term = searchVal || driverPhone || driverId;
    if (!term || !term.trim()) {
      alert("Please enter a Driver Phone Number or Driver ID.");
      return;
    }
    setIsDriverLookupLoading(true);
    setDriverLookupStatus("");
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/allocation/lookup-driver?query=${encodeURIComponent(term.trim())}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const d = Array.isArray(data) ? data[0] : data;
        if (d && (d.found || d.driver_id || d.driver_name)) {
          if (d.driver_id) setDriverId(d.driver_id);
          if (d.driver_name) setDriverName(d.driver_name);
          if (d.driver_phone) setDriverPhone(d.driver_phone);
          if (d.city_name || d.city) setCityName(d.city_name || d.city);
          setDriverLookupStatus(`Found driver: ${d.driver_name || "Driver"} (${d.driver_id || "ID"})`);
        } else {
          setDriverLookupStatus("No matching onboarded driver found.");
        }
      }
    } catch (err) {
      setDriverLookupStatus("Lookup failed.");
    } finally {
      setIsDriverLookupLoading(false);
    }
  };

  const handleVehicleInputChange = async (val: string) => {
    setVehicleNumber(val);
    if (val.trim().length >= 1) {
      try {
        const token = localStorage.getItem("lr_token");
        const res = await fetch(`/api/allocation/lookup-vehicle?query=${encodeURIComponent(val.trim())}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setVehicleSuggestions(data || []);
          setShowVehicleDropdown(true);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      setShowVehicleDropdown(false);
    }
  };

  const resetForm = () => {
    setDropoffDate(new Date().toISOString().split("T")[0]);
    setDropoffReason("Voluntary Return");
    setCityName("Hyderabad");
    setDropoffLocation("Hub");
    setDriverId("");
    setDriverName("");
    setDriverPhone("");
    setVehicleNumber("");
    setOdometerReading("");
    setOdometerPhoto(null);
    setBatteryPhoto(null);
    setPhotoLhSide(null);
    setPhotoRhSide(null);
    setPhotoFrontSide(null);
    setPhotoBackSide(null);
    setOlaNegativeBalance("");
    setOlaNegativeBalanceProof(null);
    setDuplicateKeyStatus("Yes");
    setPendingDues("");
    setDamagePenalty("");
    setDepositRefundStatus("Pending Assessment");
    setFastagBalanceAmount("");
    setFastagBalanceProof(null);
    setDropoffNotes("");
    setDriverLookupStatus("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber.trim()) return alert("Please specify the vehicle number.");
    if (!driverPhone.trim() && !driverId.trim()) return alert("Please enter Driver ID or Phone Number.");
    if (!odometerReading.trim()) return alert("Please enter Odometer Reading.");
    if (!odometerPhoto) return alert("Please upload or capture Odometer Photo.");

    try {
      const token = localStorage.getItem("lr_token");
      const payload = {
        dropoff_date: dropoffDate,
        dropoff_reason: dropoffReason,
        city_name: cityName,
        driver_id: driverId.trim(),
        driver_name: driverName.trim(),
        driver_phone: driverPhone.trim(),
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        odometer_reading: parseFloat(odometerReading),
        odometer_photo: odometerPhoto,
        battery_photo: batteryPhoto,
        photo_lh_side: photoLhSide,
        photo_rh_side: photoRhSide,
        photo_front_side: photoFrontSide,
        photo_back_side: photoBackSide,
        ola_negative_balance: olaNegativeBalance,
        ola_negative_balance_proof: olaNegativeBalanceProof,
        pending_dues: pendingDues ? parseFloat(pendingDues) : 0,
        damage_penalty: damagePenalty ? parseFloat(damagePenalty) : 0,
        deposit_refund_status: depositRefundStatus,
        dropoff_notes: dropoffNotes
      };

      const res = await fetch("/api/dropoffs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to submit dropoff record");

      alert("Vehicle Drop-Off Record Submitted Successfully!");
      resetForm();
      fetchDropoffRecords();
      setActiveTab("registry");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredDropoffs = useMemo(() => {
    return dropoffRecords.filter((r) => {
      if (filterCity !== "all" && r.city_name !== filterCity) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (r.vehicle_number || "").toLowerCase().includes(q) ||
          (r.driver_name || "").toLowerCase().includes(q) ||
          (r.driver_id || "").toLowerCase().includes(q) ||
          (r.driver_phone || "").includes(q)
        );
      }
      return true;
    });
  }, [dropoffRecords, searchQuery, filterCity]);

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
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <img 
              src="/letzryd_icon.png" 
              alt="LetzRyd logo" 
              className="h-8 w-auto object-contain"
            />
            <span className="hidden h-5 border-l border-border sm:inline-block" />
            <span className="hidden font-sans text-xs font-semibold text-slate-700 sm:inline-block">
              Vehicle Drop-Off Desk
            </span>
          </div>

          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab("form")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${ activeTab === "form" ? "bg-primary text-white shadow-xs" : "text-text-muted hover:bg-slate-100" }`}
            >
              <FileText className="h-4 w-4" />
              Vehicle Drop-Off Form
            </button>
            <button
              onClick={() => { setActiveTab("registry"); fetchDropoffRecords(); }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${ activeTab === "registry" ? "bg-primary text-white shadow-xs" : "text-text-muted hover:bg-slate-100" }`}
            >
              <Database className="h-4 w-4" />
              Drop-Off Registry ({dropoffRecords.length})
            </button>
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <div className="text-right">
              <span className="block text-[9px] font-bold text-text-dim">Current Time (IST)</span>
              <span className="font-sans text-xs font-bold text-primary tracking-tight">{currentTime}</span>
            </div>
            <span className="h-5 border-l border-border" />
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">
                {initials}
              </div>
              <div className="flex flex-col">
                <span className="font-sans text-xs font-semibold text-text">{displayName}</span>
                {user.executive_id && <span className="font-mono text-[9px] text-text-muted">ID: {user.executive_id}</span>}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {activeTab === "form" && (
          <div className="rounded-2xl border border-border bg-white shadow-xl overflow-hidden mb-10">
            <div className="bg-primary text-white px-8 py-6 relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <img src="/letzryd_icon.png" className="h-7 brightness-0 invert" alt="LetzRyd" />
                    <span className="px-2 py-0.5 rounded border border-white/30 bg-white/20 text-white text-[10px] font-bold tracking-widest backdrop-blur-sm">
                      Drop-Off Desk
                    </span>
                  </div>
                  <h1 className="font-sans text-2xl font-extrabold tracking-tight text-white leading-tight">
                    Vehicle Drop-Off Form
                  </h1>
                  <p className="text-white/90 text-xs mt-1 font-sans">Record vehicle return details, meter readings, OLA balances &amp; settlements prior to new allocation.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                
                {/* COLUMN 1: DROP-OFF REASON & LOGISTICS */}
                <div className="space-y-6">
                  <div className="border-b border-border pb-3">
                    <h3 className="font-sans text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-800 text-xs font-bold">1</span>
                      Drop-Off Logistics
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block font-sans text-xs font-bold text-slate-800 mb-2">Date of Drop-Off <span className="text-red-500">*</span></label>
                      <input 
                        type="date" 
                        value={dropoffDate}
                        onChange={(e) => setDropoffDate(e.target.value)}
                        required
                        className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none shadow-2xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block font-sans text-xs font-bold text-slate-800 mb-2">Drop-Off Reason <span className="text-red-500">*</span></label>
                      <select
                        value={dropoffReason}
                        onChange={(e) => setDropoffReason(e.target.value)}
                        required
                        className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none shadow-2xs cursor-pointer font-semibold"
                      >
                        <option value="Voluntary Return">Voluntary Return</option>
                        <option value="Non-payment / Default">Non-payment / Default</option>
                        <option value="Vehicle Breakdown / Maintenance">Vehicle Breakdown / Maintenance</option>
                        <option value="Contract Completion">Contract Completion</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-sans text-xs font-bold text-slate-800 mb-2">Drop-Off Location <span className="text-red-500">*</span></label>
                      <select 
                        value={dropoffLocation}
                        onChange={(e) => setDropoffLocation(e.target.value)}
                        required
                        className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none shadow-2xs cursor-pointer font-semibold"
                      >
                        <option value="Hub">Hub Desk</option>
                        <option value="Service Station">Service Station</option>
                        <option value="Customer Address">Customer Address</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-sans text-xs font-bold text-slate-800 mb-2">Operating City <span className="text-red-500">*</span></label>
                      <select 
                        value={cityName}
                        onChange={(e) => setCityName(e.target.value)}
                        required
                        className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none shadow-2xs cursor-pointer font-semibold"
                      >
                        {CITIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.text}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: DRIVER & VEHICLE IDENTIFICATION + OLA BALANCE */}
                <div className="space-y-6">
                  <div className="border-b border-border pb-3">
                    <h3 className="font-sans text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-800 text-xs font-bold">2</span>
                      Driver &amp; Vehicle Info
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {driverLookupStatus && (
                      <div className={`p-2.5 rounded-lg text-xs font-semibold ${driverLookupStatus.includes("Found") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
                        {driverLookupStatus}
                      </div>
                    )}

                    <div>
                      <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">Driver Phone Number <span className="text-red-500">*</span></label>
                      <div className="flex gap-2">
                        <input 
                          type="tel" 
                          placeholder="10-digit phone number..."
                          maxLength={10}
                          value={driverPhone}
                          onChange={(e) => setDriverPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          onBlur={() => driverPhone.length === 10 && handleFetchDriver(driverPhone)}
                          required
                          className="flex-1 rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none shadow-2xs font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => handleFetchDriver(driverPhone)}
                          className="px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                        >
                          Fetch
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">Operator / Driver ID <span className="text-red-500">*</span></label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="e.g. LR-4091..."
                          value={driverId}
                          onChange={(e) => setDriverId(e.target.value)}
                          onBlur={() => driverId.trim().length >= 3 && handleFetchDriver(driverId)}
                          required
                          className="flex-1 rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none shadow-2xs font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => handleFetchDriver(driverId)}
                          className="px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                        >
                          Fetch
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">Driver Name <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        placeholder="Driver full name..."
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        required
                        className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none shadow-2xs font-semibold"
                      />
                    </div>

                    <div className="relative">
                      <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">Vehicle Number <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        placeholder="Search vehicle number e.g. TS09..."
                        value={vehicleNumber}
                        onChange={(e) => handleVehicleInputChange(e.target.value.toUpperCase())}
                        required
                        className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none shadow-2xs font-bold uppercase"
                      />

                      {showVehicleDropdown && vehicleSuggestions.length > 0 && (
                        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                          {vehicleSuggestions.map((v) => (
                            <button
                              key={v.vehicle_number}
                              type="button"
                              onClick={() => {
                                setVehicleNumber(v.vehicle_number);
                                setShowVehicleDropdown(false);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <div>
                                <span className="font-sans font-extrabold text-xs text-slate-900 block">{v.vehicle_number}</span>
                                <span className="text-[10px] text-slate-500 font-medium">{v.car_model} · {v.city_name}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700">
                                {v.status}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* OLA NEGATIVE BALANCE & PROOF PHOTO */}
                    <div className="border-t border-border/60 pt-4 mt-4 space-y-4">
                      <div>
                        <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">OLA Negative Balance (₹)</label>
                        <input 
                          type="number"
                          placeholder="e.g. 1500..."
                          value={olaNegativeBalance}
                          onChange={(e) => setOlaNegativeBalance(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none shadow-2xs font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">OLA Balance Proof Photo</label>
                        {olaNegativeBalanceProof ? (
                          <div className="relative inline-block bg-white rounded-lg p-1 border border-border">
                            <img src={olaNegativeBalanceProof} alt="OLA Balance Proof" className="max-h-24 object-contain rounded" />
                            <button type="button" onClick={() => setOlaNegativeBalanceProof(null)} className="absolute top-1 right-1 rounded-full bg-rose-50 text-rose-500 p-1 hover:bg-rose-100 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => { setActiveCameraTarget("ola"); setCameraActive(true); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold py-2.5 cursor-pointer transition-colors">
                              <Camera className="h-3.5 w-3.5" /> Capture
                            </button>
                            <label className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-bold py-2.5 hover:bg-slate-50 cursor-pointer transition-colors">
                              <Upload className="h-3.5 w-3.5 text-primary" /> Upload
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const r = new FileReader();
                                  r.onloadend = () => { if (typeof r.result === "string") setOlaNegativeBalanceProof(r.result); };
                                  r.readAsDataURL(file);
                                }
                              }} />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* COLUMN 3: ODOMETER & READING PROOF */}
                <div className="space-y-6">
                  <div className="border-b border-border pb-3">
                    <h3 className="font-sans text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-800 text-xs font-bold">3</span>
                      Odometer Details
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">Drop-Off Odometer Reading (in KM) <span className="text-red-500">*</span></label>
                      <input 
                        type="number" 
                        placeholder="Current reading..."
                        value={odometerReading}
                        onChange={(e) => setOdometerReading(e.target.value)}
                        required
                        className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none shadow-2xs font-semibold"
                      />
                    </div>

                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 space-y-3">
                      <span className="block font-sans text-xs font-bold text-slate-800 text-center">Odometer Photo Upload *</span>
                      {odometerPhoto ? (
                        <div className="relative flex items-center justify-center bg-white rounded-lg p-2 border border-slate-200">
                          <img src={odometerPhoto} alt="Odometer" className="max-h-36 object-contain rounded" />
                          <button type="button" onClick={() => setOdometerPhoto(null)} className="absolute top-2 right-2 rounded-full bg-rose-50 text-rose-500 p-1 hover:bg-rose-100 cursor-pointer"><X className="h-4 w-4" /></button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setActiveCameraTarget("odometer"); setCameraActive(true); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary text-white text-xs font-bold py-2.5 hover:bg-primary-hover cursor-pointer transition-colors"><Camera className="h-3.5 w-3.5" /> Capture</button>
                          <label className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-bold py-2.5 hover:bg-slate-50 cursor-pointer transition-colors">
                            <Upload className="h-3.5 w-3.5 text-primary" /> Upload
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const r = new FileReader();
                                r.onloadend = () => { if (typeof r.result === "string") setOdometerPhoto(r.result); };
                                r.readAsDataURL(file);
                              }
                            }} />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* CAR CONDITION PHOTOS (SECTION 4 INCLUDING BATTERY) */}
              <div className="border-t border-border pt-8 space-y-6">
                <div className="border-b border-border pb-3">
                  <h3 className="font-sans text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-800 text-xs font-bold">4</span>
                    Car Condition Photos *
                  </h3>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { label: "Left-Hand (LH) Side", state: photoLhSide, setState: setPhotoLhSide, target: "lhSide" },
                    { label: "Right-Hand (RH) Side", state: photoRhSide, setState: setPhotoRhSide, target: "rhSide" },
                    { label: "Front Side", state: photoFrontSide, setState: setPhotoFrontSide, target: "frontSide" },
                    { label: "Back Side", state: photoBackSide, setState: setPhotoBackSide, target: "backSide" },
                    { label: "Battery Photo Upload", state: batteryPhoto, setState: setBatteryPhoto, target: "battery" }
                  ].map((ph) => (
                    <div key={ph.label} className="space-y-2">
                      <span className="block font-sans text-xs font-bold text-slate-800">{ph.label}</span>
                      <div className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center">
                        {ph.state ? (
                          <div className="relative inline-block">
                            <img src={ph.state} alt={ph.label} className="h-28 w-auto object-cover rounded-lg border border-slate-200" />
                            <button type="button" onClick={() => ph.setState(null)} className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white"><X className="h-3 w-3" /></button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 items-center justify-center py-2">
                            <button type="button" onClick={() => { setActiveCameraTarget(ph.target as any); setCameraActive(true); }} className="w-full flex items-center justify-center gap-1 rounded-lg bg-primary text-white text-[11px] font-bold py-2 hover:bg-primary-hover cursor-pointer"><Camera className="h-3.5 w-3.5" /> Capture</button>
                            <label className="w-full flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-[11px] font-bold py-2 hover:bg-slate-100 cursor-pointer">
                              <Upload className="h-3.5 w-3.5 text-primary" /> Upload
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const r = new FileReader();
                                  r.onloadend = () => { if (typeof r.result === "string") ph.setState(r.result); };
                                  r.readAsDataURL(file);
                                }
                              }} />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FINANCIAL & DUES SETTLEMENT SECTION */}
              <div className="border-t border-border pt-8 space-y-6">
                <div className="border-b border-border pb-3">
                  <h3 className="font-sans text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-800 text-xs font-bold">5</span>
                    Dues, Penalties &amp; Refund Settlement
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">Pending Dues Amount (₹)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 1200..."
                      value={pendingDues}
                      onChange={(e) => setPendingDues(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none shadow-2xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">Damage Penalty Amount (₹)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 500..."
                      value={damagePenalty}
                      onChange={(e) => setDamagePenalty(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none shadow-2xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">Deposit Refund Status</label>
                    <select 
                      value={depositRefundStatus}
                      onChange={(e) => setDepositRefundStatus(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none shadow-2xs cursor-pointer font-semibold"
                    >
                      <option value="Pending Assessment">Pending Assessment</option>
                      <option value="Refund Approved">Refund Approved</option>
                      <option value="Deductions Applied">Deductions Applied</option>
                      <option value="Forfeited">Forfeited</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">Hub Handover Notes / Vehicle Inspection Summary</label>
                  <textarea 
                    placeholder="Enter any additional remarks regarding damages, battery condition, or driver reason..."
                    value={dropoffNotes}
                    onChange={(e) => setDropoffNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none shadow-2xs resize-none font-semibold"
                  />
                </div>
              </div>

              {/* FORM ACTIONS */}
              <div className="flex items-center justify-between border-t border-border pt-6 mt-8">
                <p className="text-[10px] font-bold text-red-500">* Mandatory Fields</p>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={resetForm}
                    className="h-11 rounded-lg border border-border bg-white px-5 font-sans text-sm font-semibold text-text-muted hover:bg-slate-100 cursor-pointer"
                  >
                    Reset Form
                  </button>
                  <button 
                    type="submit"
                    className="h-11 rounded-lg bg-primary px-6 font-sans text-sm font-bold text-white shadow-md hover:bg-primary-hover cursor-pointer transition-all"
                  >
                    Submit Drop-Off Record
                  </button>
                </div>
              </div>

            </form>
          </div>
        )}

        {/* REGISTRY TAB */}
        {activeTab === "registry" && (
          <div className="rounded-2xl border border-border bg-white shadow-sm p-6 space-y-6">
            
            {/* REGISTRY TOOLBAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-grow max-w-md">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search driver name, phone, vehicle number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border pl-10 pr-4 font-sans text-xs text-text bg-white outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="h-10 rounded-lg border border-border px-3 font-sans text-xs text-text bg-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="all">All Cities</option>
                  {CITIES.map(c => <option key={c.value} value={c.value}>{c.text}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setActiveTab("form")}
                  className="h-10 px-4 bg-primary hover:bg-primary-hover text-white font-sans text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  + Add Drop-Off
                </button>
              </div>
            </div>

            {/* TABLE CONTAINER */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-border/60">
                    <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Driver Name</th>
                    <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Driver ID</th>
                    <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</th>
                    <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">City</th>
                    <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Car Returned</th>
                    <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                    <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredDropoffs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-text-muted font-sans bg-slate-50/50 text-[11px]">
                        No matching drop-off records found in the database.
                      </td>
                    </tr>
                  ) : (
                    filteredDropoffs.map((r: any) => {
                      const formattedTime = r.created_at 
                        ? new Date(r.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) 
                        : "05:15 PM";
                      const loggedBy = r.created_by_name || r.executive_name || user.name || user.username || "Executive";
                      
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 font-sans text-xs font-semibold text-slate-700">#{r.id}</td>
                          <td className="px-4 py-3.5 font-sans text-xs font-semibold text-slate-900">{r.driver_name || "-"}</td>
                          <td className="px-4 py-3.5 font-sans text-xs text-slate-600">{r.driver_id || "-"}</td>
                          <td className="px-4 py-3.5 font-sans text-xs text-slate-600">{r.driver_phone || "-"}</td>
                          <td className="px-4 py-3.5 font-sans text-xs font-medium text-slate-800">{r.city_name || "-"}</td>
                          <td className="px-4 py-3.5 font-sans text-xs font-bold text-slate-900">{r.vehicle_number || "-"}</td>
                          <td className="px-4 py-3.5 font-sans text-xs font-medium text-slate-700">{r.dropoff_reason || "Voluntary Return"}</td>
                          <td className="px-4 py-3.5 font-sans text-xs text-slate-600">{r.dropoff_date || "-"}</td>
                          <td className="px-4 py-3.5 font-sans text-xs text-slate-600">{formattedTime}</td>
                          <td className="px-4 py-3.5 font-sans text-xs text-slate-700 font-medium">{loggedBy}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            {/* FOOTER STATS */}
            <div className="flex items-center justify-between border-t border-border/60 bg-slate-50/50 px-6 py-3 font-sans text-xs text-slate-500">
              <span>Showing {filteredDropoffs.length} of {dropoffRecords.length} database entries</span>
              <span>Database Engine: PostgreSQL</span>
            </div>

          </div>
        )}

      </main>

      {/* CAMERA CAPTURE MODAL */}
      {cameraActive && activeCameraTarget && (
        <CameraCapture 
          title="Capture Drop-Off Photo"
          onCapture={(dataUrl) => {
            if (activeCameraTarget === "odometer") setOdometerPhoto(dataUrl);
            if (activeCameraTarget === "battery") setBatteryPhoto(dataUrl);
            if (activeCameraTarget === "lhSide") setPhotoLhSide(dataUrl);
            if (activeCameraTarget === "rhSide") setPhotoRhSide(dataUrl);
            if (activeCameraTarget === "frontSide") setPhotoFrontSide(dataUrl);
            if (activeCameraTarget === "backSide") setPhotoBackSide(dataUrl);
            if (activeCameraTarget === "ola") setOlaNegativeBalanceProof(dataUrl);
            setCameraActive(false);
            setActiveCameraTarget(null);
          }}
          onClose={() => {
            setCameraActive(false);
            setActiveCameraTarget(null);
          }}
        />
      )}
    </div>
  );
}
