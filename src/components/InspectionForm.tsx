import React, { useState, useMemo, useEffect } from "react";
import { 
  Calendar, MapPin, User, Phone, FileText, CheckCircle, 
  Clock, ArrowLeft, Download, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, ChevronLeft, Settings, Plus
} from "lucide-react";
import { User as UserSession, CITIES } from "../types";
import CameraCapture from "./CameraCapture";
import { compressImage } from "../utils/imageCompressor";

interface InspectionFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

export default function InspectionForm({ 
  user, 
  onBackToSelector, 
  onLogout
}: InspectionFormProps) {
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
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split("T")[0]);
  const [odometerReading, setOdometerReading] = useState("");
  
  // Checklist State
  const [jack, setJack] = useState("Available");
  const [jackRod, setJackRod] = useState("Available");
  const [spanner, setSpanner] = useState("Available");
  const [parkingTriangle, setParkingTriangle] = useState("Available");
  const [fireExtinguishers, setFireExtinguishers] = useState("Available");
  const [seatCover, setSeatCover] = useState("Available");
  const [floorCarpet, setFloorCarpet] = useState("Available");
  const [stepney, setStepney] = useState("Available");
  const [hubName, setHubName] = useState("Miyapur Hub");

  // 15 PDI Photos
  const [photoFront, setPhotoFront] = useState<string | null>(null);
  const [photoBack, setPhotoBack] = useState<string | null>(null);
  const [photoLh, setPhotoLh] = useState<string | null>(null);
  const [photoRh, setPhotoRh] = useState<string | null>(null);
  const [photoEngineChassis, setPhotoEngineChassis] = useState<string | null>(null);
  const [photoBattery, setPhotoBattery] = useState<string | null>(null);
  const [photoEngineCompartment, setPhotoEngineCompartment] = useState<string | null>(null);
  const [photoFastTag, setPhotoFastTag] = useState<string | null>(null);
  const [photoMusicSystem, setPhotoMusicSystem] = useState<string | null>(null);
  const [keyQuantity, setKeyQuantity] = useState<number | "">("");
  const [photoTyreRhFr, setPhotoTyreRhFr] = useState<string | null>(null);
  const [photoTyreLhFr, setPhotoTyreLhFr] = useState<string | null>(null);
  const [photoTyreRhRe, setPhotoTyreRhRe] = useState<string | null>(null);
  const [photoTyreLhRe, setPhotoTyreLhRe] = useState<string | null>(null);
  const [photoTyreSpare, setPhotoTyreSpare] = useState<string | null>(null);

  const [remarks, setRemarks] = useState("");

  // Camera State
  const [cameraActiveField, setCameraActiveField] = useState<string | null>(null);

  // Registry Search & Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [retrieveIdInput, setRetrieveIdInput] = useState("");

  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState({ total_inspections: 0, unique_vehicles: 0 });

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
      const res = await fetch("/api/inspection/stats", {
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
      const res = await fetch("/api/inspection", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setRecords(await res.json());
      }
    } catch (err) {
      console.error("Error fetching records:", err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchRecords();
  }, []);

  const handleImageUpload = (field: string, file: File) => {
    compressImage(file, 1920, 1920, 0.85, "inspections").then((url) => {
      if (typeof url === "string") {
        setPhotoByField(field, url);
      }
    });
  };

  const setPhotoByField = (field: string, val: string | null) => {
    if (field === "front") setPhotoFront(val);
    else if (field === "back") setPhotoBack(val);
    else if (field === "lh") setPhotoLh(val);
    else if (field === "rh") setPhotoRh(val);
    else if (field === "engine_chassis") setPhotoEngineChassis(val);
    else if (field === "battery") setPhotoBattery(val);
    else if (field === "engine_compartment") setPhotoEngineCompartment(val);
    else if (field === "fast_tag") setPhotoFastTag(val);
    else if (field === "music_system") setPhotoMusicSystem(val);
    else if (field === "tyre_rh_fr") setPhotoTyreRhFr(val);
    else if (field === "tyre_lh_fr") setPhotoTyreLhFr(val);
    else if (field === "tyre_rh_re") setPhotoTyreRhRe(val);
    else if (field === "tyre_lh_re") setPhotoTyreLhRe(val);
    else if (field === "tyre_spare") setPhotoTyreSpare(val);
  };

  const loadRecordForEdit = async (id: number) => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/inspection/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Inspection record not found");
      const data = await res.json();
      
      setEditingId(data.id);
      setVehicleNumber(data.vehicle_number || "");
      setInspectionDate(data.inspection_date || "");
      setOdometerReading(data.odometer_reading || "");
      setJack(data.jack || "Available");
      setJackRod(data.jack_rod || "Available");
      setSpanner(data.spanner || "Available");
      setParkingTriangle(data.parking_triangle || "Available");
      setFireExtinguishers(data.fire_extinguishers || "Available");
      setSeatCover(data.seat_cover || "Available");
      setFloorCarpet(data.floor_carpet || "Available");
      
      setPhotoFront(data.photo_front || null);
      setPhotoBack(data.photo_back || null);
      setPhotoLh(data.photo_lh || null);
      setPhotoRh(data.photo_rh || null);
      setPhotoEngineChassis(data.photo_engine_chassis || null);
      setPhotoBattery(data.photo_battery || null);
      setPhotoEngineCompartment(data.photo_engine_compartment || null);
      setPhotoFastTag(data.photo_fast_tag || null);
      setPhotoMusicSystem(data.photo_music_system || null);
      setKeyQuantity(data.key_quantity || "");
      setPhotoTyreRhFr(data.photo_tyre_rh_fr || null);
      setPhotoTyreLhFr(data.photo_tyre_lh_fr || null);
      setPhotoTyreRhRe(data.photo_tyre_rh_re || null);
      setPhotoTyreLhRe(data.photo_tyre_lh_re || null);
      setPhotoTyreSpare(data.photo_tyre_spare || null);
      
      setRemarks(data.remarks || "");
      
      setActiveTab("form");
      setRetrieveIdInput("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setVehicleNumber("");
    setInspectionDate(new Date().toISOString().split("T")[0]);
    setOdometerReading("");
    setJack("Available");
    setJackRod("Available");
    setSpanner("Available");
    setParkingTriangle("Available");
    setFireExtinguishers("Available");
    setSeatCover("Available");
    setFloorCarpet("Available");
    
    setPhotoFront(null);
    setPhotoBack(null);
    setPhotoLh(null);
    setPhotoRh(null);
    setPhotoEngineChassis(null);
    setPhotoBattery(null);
    setPhotoEngineCompartment(null);
    setPhotoFastTag(null);
    setPhotoMusicSystem(null);
    setKeyQuantity("");
    setPhotoTyreRhFr(null);
    setPhotoTyreLhFr(null);
    setPhotoTyreRhRe(null);
    setPhotoTyreLhRe(null);
    setPhotoTyreSpare(null);
    
    setRemarks("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber.trim()) return alert("Vehicle Number is required");
    if (!odometerReading.trim()) return alert("Odometer Reading is required");

    const payload = {
      vehicle_number: vehicleNumber.trim().toUpperCase(),
      inspection_date: inspectionDate,
      odometer_reading: odometerReading.trim(),
      jack,
      jack_rod: jackRod,
      spanner,
      parking_triangle: parkingTriangle,
      fire_extinguishers: fireExtinguishers,
      seat_cover: seatCover,
      floor_carpet: floorCarpet,
      
      photo_front: photoFront,
      photo_back: photoBack,
      photo_lh: photoLh,
      photo_rh: photoRh,
      photo_engine_chassis: photoEngineChassis,
      photo_battery: photoBattery,
      photo_engine_compartment: photoEngineCompartment,
      photo_fast_tag: photoFastTag,
      photo_music_system: photoMusicSystem,
      key_quantity: typeof keyQuantity === "number" ? keyQuantity : undefined,
      photo_tyre_rh_fr: photoTyreRhFr,
      photo_tyre_lh_fr: photoTyreLhFr,
      photo_tyre_rh_re: photoTyreRhRe,
      photo_tyre_lh_re: photoTyreLhRe,
      photo_tyre_spare: photoTyreSpare,
      
      remarks: remarks.trim() || null
    };

    try {
      const token = localStorage.getItem("lr_token");
      const url = editingId ? `/api/inspection/${editingId}` : "/api/inspection";
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
        throw new Error(errorText || "Failed to submit inspection");
      }

      alert(editingId ? "Inspection Updated Successfully!" : "Inspection Logged Successfully!");
      resetForm();
      fetchStats();
      fetchRecords();
      setActiveTab("registry");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number, vehicle: string) => {
    if (!window.confirm(`Are you sure you want to delete inspection for ${vehicle}?`)) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/inspection/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Delete failed");
      alert("Inspection deleted successfully");
      fetchStats();
      fetchRecords();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const loadLastInspection = async (num: string) => {
    if (!num.trim()) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/inspection/last/${num}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setOdometerReading(data.odometer_reading || "");
          setJack(data.jack || "Available");
          setJackRod(data.jack_rod || "Available");
          setSpanner(data.spanner || "Available");
          setParkingTriangle(data.parking_triangle || "Available");
          setFireExtinguishers(data.fire_extinguishers || "Available");
          setSeatCover(data.seat_cover || "Available");
          setFloorCarpet(data.floor_carpet || "Available");
          
          setPhotoFront(data.photo_front || null);
          setPhotoBack(data.photo_back || null);
          setPhotoLh(data.photo_lh || null);
          setPhotoRh(data.photo_rh || null);
          setPhotoEngineChassis(data.photo_engine_chassis || null);
          setPhotoBattery(data.photo_battery || null);
          setPhotoEngineCompartment(data.photo_engine_compartment || null);
          setPhotoFastTag(data.photo_fast_tag || null);
          setPhotoMusicSystem(data.photo_music_system || null);
          setPhotoKeys(data.photo_keys || null);
          setPhotoTyreRhFr(data.photo_tyre_rh_fr || null);
          setPhotoTyreLhFr(data.photo_tyre_lh_fr || null);
          setPhotoTyreRhRe(data.photo_tyre_rh_re || null);
          setPhotoTyreLhRe(data.photo_tyre_lh_re || null);
          setPhotoTyreSpare(data.photo_tyre_spare || null);
          
          setRemarks(data.remarks || "");
          
          alert("Last inspection parameters & photo captures loaded successfully!");
        } else {
          alert("No previous inspection record found for this vehicle number.");
        }
      }
    } catch (err) {
      console.error("Error loading last inspection:", err);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (r.vehicle_number || "").toLowerCase().includes(q) ||
          (r.remarks || "").toLowerCase().includes(q) ||
          String(r.id).includes(q)
        );
      }
      return true;
    });
  }, [records, searchQuery]);

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return alert("No records to export");
    const headers = [
      "ID", "Vehicle Number", "Inspection Date", "Odometer Reading", 
      "Jack", "Jack Rod", "Spanner", "Parking Triangle", 
      "Fire Extinguishers", "Seat Cover", "Floor Carpet", "Remarks", "Created At"
    ];

    const rows = filteredRecords.map((r) => [
      r.id,
      r.vehicle_number,
      r.inspection_date,
      r.odometer_reading,
      r.jack,
      r.jack_rod,
      r.spanner,
      r.parking_triangle,
      r.fire_extinguishers,
      r.seat_cover,
      r.floor_carpet,
      `"${(r.remarks || "").replace(/"/g, '""')}"`,
      r.created_at || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `letzryd_inspections_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderChecklistOption = (label: string, value: string, setter: (val: string) => void) => {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-slate-50/50 shadow-2xs">
        <span className="font-sans text-xs font-bold text-text">{label}</span>
        <div className="flex gap-2">
          {["Available", "Not Available"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setter(opt)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${ value === opt ? opt === "Available" ? "bg-green-light border-green/30 text-green" : "bg-red-50 border-red-200 text-red-600" : "bg-white border-border text-text-muted hover:bg-slate-50" }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderPhotoCard = (label: string, fieldName: string, stateVal: string | null) => {
    return (
      <div className="rounded-xl border border-dashed border-border bg-bg/30 p-4 text-center flex flex-col items-center justify-center">
        <span className="text-[10px] font-bold text-text-muted mb-2">{label}</span>
        {stateVal ? (
          <div className="relative">
            <img src={stateVal} className="h-24 w-24 object-cover rounded-lg border border-border shadow-xs" />
            <button type="button" onClick={() => setPhotoByField(fieldName, null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0.5 shadow-md hover:bg-red-700 cursor-pointer"><X className="h-3 w-3" /></button>
          </div>
        ) : (
          <div className="space-y-2">
            <button type="button" onClick={() => setCameraActiveField(fieldName)} className="flex items-center gap-1 bg-primary text-white px-2 py-1 rounded text-xs hover:bg-primary-hover shadow-xs cursor-pointer justify-center w-full"><Camera className="h-3 w-3" /> Camera</button>
            <label className="flex items-center gap-1 bg-white border border-border text-text px-2 py-1 rounded text-xs hover:bg-slate-50 shadow-xs cursor-pointer justify-center"><Upload className="h-3 w-3" /> Upload <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(fieldName, e.target.files[0])} /></label>
          </div>
        )}
      </div>
    );
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
              Vehicle Inspection
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
              Inspection Form
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
              Inspection Registry
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
                        Fleet Operations
                      </span>
                    </div>
                    <h1 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                      {editingId ? `Edit Inspection Record #${editingId}` : "Vehicle Inspection Form"}
                    </h1>
                  </div>

                  {/* Header Search bar */}
                  <div className="relative z-10 flex w-full sm:w-auto mt-2 sm:mt-0">
                    <div className="relative flex w-full sm:w-72 items-center">
                      <Search className="absolute left-3 h-4 w-4 text-white/60" />
                      <input 
                        type="text" 
                        inputMode="numeric"
                        placeholder="Edit existing record (ID)..." 
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
                    Editing Inspection Record #{editingId}
                  </div>
                  <button type="button" onClick={resetForm} className="text-xs text-yellow-700 hover:text-yellow-900 font-bold underline cursor-pointer">
                    Cancel Edit
                  </button>
                </div>
              )}

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-8 space-y-10">
                
                {/* 2 COLUMN GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  
                  {/* LEFT COLUMN: VEHICLE & INFO */}
                  <div className="space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-primary">
                        Vehicle & Inspection Details
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block font-sans text-xs font-bold text-text-muted">Vehicle Number <span className="text-red-500">*</span></label>
                          <button
                            type="button"
                            onClick={() => loadLastInspection(vehicleNumber)}
                            disabled={!vehicleNumber.trim()}
                            className="text-[10px] font-bold text-primary hover:underline cursor-pointer disabled:text-text-muted disabled:pointer-events-none"
                          >
                            Load Last Inspection Data
                          </button>
                        </div>
                        <input 
                          type="text" 
                          placeholder="e.g. TS09 EA 1111..."
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value)}
                          onBlur={() => loadLastInspection(vehicleNumber)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Inspection Date <span className="text-red-500">*</span></label>
                        <input 
                          type="date" 
                          value={inspectionDate}
                          onChange={(e) => setInspectionDate(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Odometer Reading (Kms) <span className="text-red-500">*</span></label>
                        <input 
                          type="number" 
                          placeholder="Current mileage..."
                          value={odometerReading}
                          onChange={(e) => setOdometerReading(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">General Remarks</label>
                        <textarea 
                          placeholder="Add comments about vehicle damage, cleanliness, or pending items..."
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          rows={4}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: ACCESSORIES CHECKLIST */}
                  <div className="space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-primary">
                        Asset & Accessory Checklist
                      </h3>
                    </div>

                    <div className="space-y-3.5">
                      {renderChecklistOption("Jack", jack, setJack)}
                      {renderChecklistOption("Jack Rod", jackRod, setJackRod)}
                      {renderChecklistOption("Spanner", spanner, setSpanner)}
                      {renderChecklistOption("Parking Triangle", parkingTriangle, setParkingTriangle)}
                      {renderChecklistOption("Fire Extinguisher", fireExtinguishers, setFireExtinguishers)}
                      {renderChecklistOption("Seat Covers", seatCover, setSeatCover)}
                      {renderChecklistOption("Floor Carpet", floorCarpet, setFloorCarpet)}
                      {renderChecklistOption("Stepney / Spare Tire", stepney, setStepney)}
                      <div className="flex items-center justify-between border border-border bg-slate-50/50 p-2.5 rounded-xl shadow-xs">
                        <span className="font-sans text-sm font-semibold text-text-muted">Key Quantity</span>
                        <input
                          type="number"
                          min="1"
                          value={keyQuantity}
                          onChange={(e) => setKeyQuantity(parseInt(e.target.value) || 0)}
                          className="w-24 rounded-lg border border-border bg-white px-2 py-1.5 font-sans text-sm text-center outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
                          placeholder="e.g. 2"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* PHOTOS ATTACHMENT (15 PDI PHOTOS) */}
                <div className="border-t border-border pt-10">
                  <div className="border-b border-border pb-3 mb-6">
                    <h3 className="font-sans text-sm font-bold text-primary">
                      Photographic Verification (All Sides & Accessory Checkpoints)
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {renderPhotoCard("Front View", "front", photoFront)}
                    {renderPhotoCard("Back View", "back", photoBack)}
                    {renderPhotoCard("LH View", "lh", photoLh)}
                    {renderPhotoCard("RH View", "rh", photoRh)}
                    {renderPhotoCard("Engine/Chassis No.", "engine_chassis", photoEngineChassis)}
                    {renderPhotoCard("Battery Sl No.", "battery", photoBattery)}
                    {renderPhotoCard("Engine Compartment", "engine_compartment", photoEngineCompartment)}
                    {renderPhotoCard("Fast Tag", "fast_tag", photoFastTag)}
                    {renderPhotoCard("Music System", "music_system", photoMusicSystem)}
                    {renderPhotoCard("RH Front Tyre", "tyre_rh_fr", photoTyreRhFr)}
                    {renderPhotoCard("LH Front Tyre", "tyre_lh_fr", photoTyreLhFr)}
                    {renderPhotoCard("RH Rear Tyre", "tyre_rh_re", photoTyreRhRe)}
                    {renderPhotoCard("LH Rear Tyre", "tyre_lh_re", photoTyreLhRe)}
                    {renderPhotoCard("Spare Wheel", "tyre_spare", photoTyreSpare)}
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
                    {editingId ? "Update Inspection" : "Save Inspection Record"}
                  </button>
                </div>

              </form>

            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {/* METRICS DASHBOARD */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
              
              {/* Card 1: Total Inspections */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="block font-sans text-[10px] font-extrabold text-text-muted mb-1">Total Inspections Logged</span>
                  <span className="block font-sans text-3xl font-extrabold text-brand-blue">{stats.total_inspections}</span>
                  <span className="block font-sans text-[10px] text-text-dim mt-2">Historical audit logs</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-brand-blue">
                  <FileText className="h-6 w-6" />
                </div>
              </div>

              {/* Card 2: Unique Vehicles */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="block font-sans text-[10px] font-extrabold text-text-muted mb-1">Unique Vehicles Audited</span>
                  <span className="block font-sans text-3xl font-extrabold text-green">{stats.unique_vehicles}</span>
                  <span className="block font-sans text-[10px] text-text-dim mt-2">Active checked fleet</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-green-light flex items-center justify-center text-green">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </div>

            </div>

            {/* REGISTRY CARD TABLE */}
            <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
              <div className="border-b border-border bg-white px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-sans text-lg font-bold text-gray-900 leading-tight">Inspection Logs Database</h3>
                  <p className="font-sans text-xs text-text-muted mt-1">Audit trail of all vehicle checklists and odometer readings.</p>
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
                    New Inspection
                  </button>
                </div>
              </div>

              {/* SEARCH BAR */}
              <div className="border-b border-border bg-slate-50/50 px-8 py-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
                  <input 
                    type="text" 
                    placeholder="Search by Vehicle Number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-white pl-10 pr-4 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* TABLE ELEMENT */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-4xl border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-slate-50 text-[10px] font-bold text-text-muted">
                      <th className="px-8 py-3.5 w-16">ID</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Vehicle Number</th>
                      <th className="px-5 py-3.5">Odometer (Kms)</th>
                      <th className="px-5 py-3.5">Checked Assets Status</th>
                      <th className="px-5 py-3.5">Remarks</th>
                      <th className="px-8 py-3.5 text-right w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-sans text-xs">
                    {filteredRecords.length > 0 ? (
                      filteredRecords.map((r) => {
                        const items = [r.jack, r.jack_rod, r.spanner, r.parking_triangle, r.fire_extinguishers, r.seat_cover, r.floor_carpet];
                        const availableCount = items.filter(i => i === "Available").length;
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-4 font-mono font-bold text-text">#{r.id}</td>
                            <td className="px-5 py-4 font-bold text-text">{r.inspection_date}</td>
                            <td className="px-5 py-4 font-bold text-primary">{r.vehicle_number}</td>
                            <td className="px-5 py-4 font-semibold text-text">{parseInt(r.odometer_reading || "0").toLocaleString()}</td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${ availableCount === 7 ? "bg-green-light text-green" : availableCount >= 5 ? "bg-yellow-light text-amber-700" : "bg-red-50 text-red-600" }`}>
                                {availableCount} / 7 Available
                              </span>
                            </td>
                            <td className="px-5 py-4 text-text-muted max-w-xs truncate">{r.remarks || "—"}</td>
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
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-8 py-10 text-center text-text-muted font-medium">
                          No inspections recorded.
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
            setPhotoByField(cameraActiveField, img);
            setCameraActiveField(null);
          }}
          onCancel={() => setCameraActiveField(null)}
        />
      )}

      {/* FOOTER */}
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
