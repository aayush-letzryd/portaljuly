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
  const [inspectionStage, setInspectionStage] = useState("Pre-Allocation (PDI)");
  const [cityName, setCityName] = useState(user.city || "Hyderabad");
  const [hubName, setHubName] = useState("Miyapur Hub");
  const [driverId, setDriverId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [odometerReading, setOdometerReading] = useState("");
  const [fastagBalance, setFastagBalance] = useState("");

  // Vehicle & Driver Lookup State
  const [vehicleSuggestions, setVehicleSuggestions] = useState<any[]>([]);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [driverLookupStatus, setDriverLookupStatus] = useState("");
  const [isDriverLookupLoading, setIsDriverLookupLoading] = useState(false);

  // Checklist State
  const [jack, setJack] = useState("Available");
  const [jackRod, setJackRod] = useState("Available");
  const [spanner, setSpanner] = useState("Available");
  const [parkingTriangle, setParkingTriangle] = useState("Available");
  const [fireExtinguishers, setFireExtinguishers] = useState("Available");
  const [seatCover, setSeatCover] = useState("Available");
  const [floorCarpet, setFloorCarpet] = useState("Available");
  const [stepney, setStepney] = useState("Available");
  const [musicSystem, setMusicSystem] = useState("Available");
  const [keyQuantity, setKeyQuantity] = useState<number | "">("");

  // 17 Photographic Checkpoint Photos
  const [photoFront, setPhotoFront] = useState<string | null>(null);
  const [photoBack, setPhotoBack] = useState<string | null>(null);
  const [photoLh, setPhotoLh] = useState<string | null>(null);
  const [photoRh, setPhotoRh] = useState<string | null>(null);
  const [odometerPhoto, setOdometerPhoto] = useState<string | null>(null);
  const [photoEngineChassis, setPhotoEngineChassis] = useState<string | null>(null);
  const [photoBattery, setPhotoBattery] = useState<string | null>(null);
  const [photoEngineCompartment, setPhotoEngineCompartment] = useState<string | null>(null);
  const [photoFastTag, setPhotoFastTag] = useState<string | null>(null);
  const [fastagProof, setFastagProof] = useState<string | null>(null);
  const [photoMusicSystem, setPhotoMusicSystem] = useState<string | null>(null);
  const [stepneyPhoto, setStepneyPhoto] = useState<string | null>(null);
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
  const [filterCity, setFilterCity] = useState("all");
  const [filterStage, setFilterStage] = useState("all");
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

  const handleVehicleInputChange = async (val: string) => {
    setVehicleNumber(val);
    if (val.trim().length >= 1) {
      try {
        const token = localStorage.getItem("lr_token");
        const res = await fetch(`/api/allocation/lookup-vehicle?query=${encodeURIComponent(val.trim())}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) { setVehicleSuggestions(await res.json()); setShowVehicleDropdown(true); }
      } catch { /* ignore */ }
    } else {
      setShowVehicleDropdown(false);
    }
  };

  const handleFetchDriver = async (num?: string) => {
    const term = num || vehicleNumber || driverPhone || driverId;
    if (!term?.trim()) return;
    setIsDriverLookupLoading(true);
    setDriverLookupStatus("");
    try {
      const token = localStorage.getItem("lr_token");
      const resActive = await fetch(`/api/allocation/active?query=${encodeURIComponent(term.trim())}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resActive.ok) {
        const act = await resActive.json();
        if (act && act.found) {
          if (act.vehicle_number) setVehicleNumber(act.vehicle_number);
          if (act.driver_name) setDriverName(act.driver_name);
          if (act.driver_id) setDriverId(act.driver_id);
          if (act.driver_phone) setDriverPhone(act.driver_phone);
          if (act.city_name || act.city) setCityName(act.city_name || act.city);
          setDriverLookupStatus(`✓ Linked Driver: ${act.driver_name} (${act.driver_id || 'Active'})`);
        }
      }
    } catch {
      setDriverLookupStatus("Driver lookup failed.");
    } finally {
      setIsDriverLookupLoading(false);
    }
  };

  const handleImageUpload = (field: string, file: File) => {
    compressImage(file, 1920, 1920, 0.85, "inspections").then((url) => {
      if (typeof url === "string") {
        setPhotoByField(field, url);
      }
    })
    .catch((err) => { alert("Photo upload failed: " + (err && err.message ? err.message : "Check your connection and retry.")); })
  };

  const setPhotoByField = (field: string, val: string | null) => {
    if (field === "front") setPhotoFront(val);
    else if (field === "back") setPhotoBack(val);
    else if (field === "lh") setPhotoLh(val);
    else if (field === "rh") setPhotoRh(val);
    else if (field === "odometer") setOdometerPhoto(val);
    else if (field === "engine_chassis") setPhotoEngineChassis(val);
    else if (field === "battery") setPhotoBattery(val);
    else if (field === "engine_compartment") setPhotoEngineCompartment(val);
    else if (field === "fast_tag") setPhotoFastTag(val);
    else if (field === "fastag_proof") setFastagProof(val);
    else if (field === "music_system") setPhotoMusicSystem(val);
    else if (field === "stepney") setStepneyPhoto(val);
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
      setInspectionStage(data.inspection_stage || "Pre-Allocation (PDI)");
      setCityName(data.city_name || user.city || "Hyderabad");
      setHubName(data.hub_name || "Miyapur Hub");
      setDriverId(data.driver_id || "");
      setDriverName(data.driver_name || "");
      setDriverPhone(data.driver_phone || "");
      setOdometerReading(data.odometer_reading || "");
      setFastagBalance(data.fastag_balance || "");

      setJack(data.jack || "Available");
      setJackRod(data.jack_rod || "Available");
      setSpanner(data.spanner || "Available");
      setParkingTriangle(data.parking_triangle || "Available");
      setFireExtinguishers(data.fire_extinguishers || "Available");
      setSeatCover(data.seat_cover || "Available");
      setFloorCarpet(data.floor_carpet || "Available");
      setStepney(data.stepney || "Available");
      setMusicSystem(data.music_system || "Available");
      setKeyQuantity(data.key_quantity || "");
      
      setPhotoFront(data.photo_front || null);
      setPhotoBack(data.photo_back || null);
      setPhotoLh(data.photo_lh || null);
      setPhotoRh(data.photo_rh || null);
      setOdometerPhoto(data.odometer_photo || null);
      setPhotoEngineChassis(data.photo_engine_chassis || null);
      setPhotoBattery(data.photo_battery || null);
      setPhotoEngineCompartment(data.photo_engine_compartment || null);
      setPhotoFastTag(data.photo_fast_tag || null);
      setFastagProof(data.fastag_proof || null);
      setPhotoMusicSystem(data.photo_music_system || null);
      setStepneyPhoto(data.stepney_photo || null);
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
    setInspectionStage("Pre-Allocation (PDI)");
    setCityName(user.city || "Hyderabad");
    setHubName("Miyapur Hub");
    setDriverId("");
    setDriverName("");
    setDriverPhone("");
    setOdometerReading("");
    setFastagBalance("");
    setDriverLookupStatus("");

    setJack("Available");
    setJackRod("Available");
    setSpanner("Available");
    setParkingTriangle("Available");
    setFireExtinguishers("Available");
    setSeatCover("Available");
    setFloorCarpet("Available");
    setStepney("Available");
    setMusicSystem("Available");
    setKeyQuantity("");
    
    setPhotoFront(null);
    setPhotoBack(null);
    setPhotoLh(null);
    setPhotoRh(null);
    setOdometerPhoto(null);
    setPhotoEngineChassis(null);
    setPhotoBattery(null);
    setPhotoEngineCompartment(null);
    setPhotoFastTag(null);
    setFastagProof(null);
    setPhotoMusicSystem(null);
    setStepneyPhoto(null);
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
      inspection_stage: inspectionStage,
      city_name: cityName,
      hub_name: hubName,
      driver_id: driverId.trim() || null,
      driver_name: driverName.trim() || null,
      driver_phone: driverPhone.trim() || null,
      odometer_reading: odometerReading.trim(),
      fastag_balance: fastagBalance.trim() || null,

      jack,
      jack_rod: jackRod,
      spanner,
      parking_triangle: parkingTriangle,
      fire_extinguishers: fireExtinguishers,
      seat_cover: seatCover,
      floor_carpet: floorCarpet,
      stepney,
      music_system: musicSystem,
      key_quantity: typeof keyQuantity === "number" ? keyQuantity : undefined,
      
      odometer_photo: odometerPhoto,
      fastag_proof: fastagProof,
      stepney_photo: stepneyPhoto,
      photo_front: photoFront,
      photo_back: photoBack,
      photo_lh: photoLh,
      photo_rh: photoRh,
      photo_engine_chassis: photoEngineChassis,
      photo_battery: photoBattery,
      photo_engine_compartment: photoEngineCompartment,
      photo_fast_tag: photoFastTag,
      photo_music_system: photoMusicSystem,
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
          setDriverId(data.driver_id || "");
          setDriverName(data.driver_name || "");
          setDriverPhone(data.driver_phone || "");
          setCityName(data.city_name || user.city || "Hyderabad");
          setHubName(data.hub_name || "Miyapur Hub");
          setJack(data.jack || "Available");
          setJackRod(data.jack_rod || "Available");
          setSpanner(data.spanner || "Available");
          setParkingTriangle(data.parking_triangle || "Available");
          setFireExtinguishers(data.fire_extinguishers || "Available");
          setSeatCover(data.seat_cover || "Available");
          setFloorCarpet(data.floor_carpet || "Available");
          setStepney(data.stepney || "Available");
          setMusicSystem(data.music_system || "Available");
          
          setPhotoFront(data.photo_front || null);
          setPhotoBack(data.photo_back || null);
          setPhotoLh(data.photo_lh || null);
          setPhotoRh(data.photo_rh || null);
          setOdometerPhoto(data.odometer_photo || null);
          setPhotoEngineChassis(data.photo_engine_chassis || null);
          setPhotoBattery(data.photo_battery || null);
          setPhotoEngineCompartment(data.photo_engine_compartment || null);
          setPhotoFastTag(data.photo_fast_tag || null);
          setFastagProof(data.fastag_proof || null);
          setPhotoMusicSystem(data.photo_music_system || null);
          setStepneyPhoto(data.stepney_photo || null);
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
      const matchesSearch = 
        !searchQuery ||
        (r.vehicle_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.driver_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.driver_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.remarks || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(r.id).includes(searchQuery);

      const matchesCity = filterCity === "all" || r.city_name === filterCity;
      const matchesStage = filterStage === "all" || r.inspection_stage === filterStage;

      return matchesSearch && matchesCity && matchesStage;
    });
  }, [records, searchQuery, filterCity, filterStage]);

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return alert("No records to export");
    const headers = [
      "ID", "Inspection Stage", "Vehicle Number", "Inspection Date", "City", "Hub Name",
      "Driver ID", "Driver Name", "Driver Phone", "Odometer Reading", "FastTag Balance",
      "Jack", "Jack Rod", "Spanner", "Parking Triangle", "Fire Extinguishers", "Seat Cover", "Floor Carpet", "Music System", "Key Quantity", "Remarks", "Created At"
    ];

    const rows = filteredRecords.map((r) => [
      r.id,
      r.inspection_stage || "PDI",
      r.vehicle_number,
      r.inspection_date,
      r.city_name || "",
      r.hub_name || "",
      r.driver_id || "",
      `"${(r.driver_name || "").replace(/"/g, '""')}"`,
      r.driver_phone || "",
      r.odometer_reading,
      r.fastag_balance || "",
      r.jack,
      r.jack_rod,
      r.spanner,
      r.parking_triangle,
      r.fire_extinguishers,
      r.seat_cover,
      r.floor_carpet,
      r.music_system || "Available",
      r.key_quantity || "",
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
      <div className="rounded-xl border border-dashed border-border bg-bg/30 p-4 text-center flex flex-col items-center justify-between min-h-[140px]">
        <span className="text-[10px] font-bold text-text-muted mb-2">{label}</span>
        {stateVal ? (
          <div className="relative w-full">
            <img src={stateVal} className="h-24 w-full object-cover rounded-lg border border-border shadow-xs" />
            <button type="button" onClick={() => setPhotoByField(fieldName, null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0.5 shadow-md hover:bg-red-700 cursor-pointer"><X className="h-3 w-3" /></button>
          </div>
        ) : (
          <div className="space-y-2 w-full my-auto">
            <button type="button" onClick={() => setCameraActiveField(fieldName)} className="flex items-center gap-1 bg-primary text-white px-2 py-1 rounded text-xs hover:bg-primary-hover shadow-xs cursor-pointer justify-center w-full font-bold"><Camera className="h-3 w-3" /> Camera</button>
            <label className="flex items-center gap-1 bg-white border border-border text-text-muted px-2 py-1 rounded text-xs hover:bg-slate-50 shadow-2xs cursor-pointer justify-center font-bold"><Upload className="h-3 w-3" /> Upload <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(fieldName, e.target.files[0])} /></label>
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
                      <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                        Vehicle & Inspection Context
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {/* Vehicle Number Input with Autocomplete & Lookup */}
                      <div className="relative">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block font-sans text-xs font-bold text-text-muted">Vehicle Number <span className="text-red-500">*</span></label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleFetchDriver(vehicleNumber)}
                              className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
                            >
                              🔍 Fetch Driver
                            </button>
                            <button
                              type="button"
                              onClick={() => loadLastInspection(vehicleNumber)}
                              disabled={!vehicleNumber.trim()}
                              className="text-[10px] font-bold text-primary hover:underline cursor-pointer disabled:text-text-muted disabled:pointer-events-none"
                            >
                              Load Last Data
                            </button>
                          </div>
                        </div>
                        <input 
                          type="text" 
                          placeholder="e.g. TS09 EA 1111..."
                          value={vehicleNumber}
                          onChange={(e) => handleVehicleInputChange(e.target.value)}
                          onBlur={() => setTimeout(() => setShowVehicleDropdown(false), 200)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs uppercase font-bold"
                        />
                        {showVehicleDropdown && vehicleSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-48 overflow-y-auto rounded-xl border border-border bg-white shadow-lg">
                            {vehicleSuggestions.map((v: any) => (
                              <div
                                key={v.id || v.vehicle_number}
                                onMouseDown={() => {
                                  setVehicleNumber(v.vehicle_number);
                                  setShowVehicleDropdown(false);
                                  handleFetchDriver(v.vehicle_number);
                                }}
                                className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-xs flex justify-between items-center"
                              >
                                <span className="font-bold text-slate-800">{v.vehicle_number}</span>
                                <span className="text-[10px] text-slate-500">{v.model || v.city_name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {driverLookupStatus && (
                          <p className="text-[11px] font-bold text-emerald-600 mt-1">{driverLookupStatus}</p>
                        )}
                      </div>

                      {/* Inspection Stage & Date */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-sans text-xs font-bold text-text-muted mb-2">Inspection Stage <span className="text-red-500">*</span></label>
                          <select 
                            value={inspectionStage}
                            onChange={(e) => setInspectionStage(e.target.value)}
                            required
                            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer font-semibold"
                          >
                            <option value="Pre-Allocation (PDI)">Pre-Allocation (PDI)</option>
                            <option value="Post-DropOff (Return)">Post-DropOff (Return)</option>
                            <option value="Routine Audit / Maintenance">Routine Audit / Maintenance</option>
                          </select>
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
                      </div>

                      {/* City & Hub Location */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-sans text-xs font-bold text-text-muted mb-2">Operating City <span className="text-red-500">*</span></label>
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
                          <label className="block font-sans text-xs font-bold text-text-muted mb-2">Hub Location</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Miyapur Hub..."
                            value={hubName}
                            onChange={(e) => setHubName(e.target.value)}
                            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* Driver Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-sans text-xs font-bold text-text-muted mb-2">Driver ID</label>
                          <input 
                            type="text" 
                            placeholder="Driver ID (Optional)..."
                            value={driverId}
                            onChange={(e) => setDriverId(e.target.value)}
                            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block font-sans text-xs font-bold text-text-muted mb-2">Driver Name</label>
                          <input 
                            type="text" 
                            placeholder="Driver Full Name..."
                            value={driverName}
                            onChange={(e) => setDriverName(e.target.value)}
                            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* Driver Phone & Odometer */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-sans text-xs font-bold text-text-muted mb-2">Driver Phone</label>
                          <input 
                            type="tel" 
                            placeholder="Mobile number..."
                            value={driverPhone}
                            onChange={(e) => setDriverPhone(e.target.value)}
                            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
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
                            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs font-mono font-bold"
                          />
                        </div>
                      </div>

                      {/* FastTag Balance */}
                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">FastTag Balance Amount (₹)</label>
                        <input 
                          type="number" 
                          placeholder="e.g. 500.00"
                          value={fastagBalance}
                          onChange={(e) => setFastagBalance(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">General Remarks</label>
                        <textarea 
                          placeholder="Add comments about vehicle damage, cleanliness, or pending items..."
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          rows={3}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: ACCESSORIES CHECKLIST */}
                  <div className="space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                        Asset & Accessory Checklist
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {renderChecklistOption("Jack", jack, setJack)}
                      {renderChecklistOption("Jack Rod", jackRod, setJackRod)}
                      {renderChecklistOption("Spanner", spanner, setSpanner)}
                      {renderChecklistOption("Parking Triangle", parkingTriangle, setParkingTriangle)}
                      {renderChecklistOption("Fire Extinguisher", fireExtinguishers, setFireExtinguishers)}
                      {renderChecklistOption("Seat Covers", seatCover, setSeatCover)}
                      {renderChecklistOption("Floor Carpet", floorCarpet, setFloorCarpet)}
                      {renderChecklistOption("Stepney / Spare Tire", stepney, setStepney)}
                      {renderChecklistOption("Music System", musicSystem, setMusicSystem)}
                      <div className="flex items-center justify-between border border-border bg-slate-50/50 p-2.5 rounded-xl shadow-xs">
                        <span className="font-sans text-xs font-bold text-text">Key Quantity</span>
                        <input
                          type="number"
                          min="1"
                          value={keyQuantity}
                          onChange={(e) => setKeyQuantity(parseInt(e.target.value) || 0)}
                          className="w-24 rounded-lg border border-border bg-white px-2 py-1.5 font-sans text-xs text-center outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs font-bold"
                          placeholder="e.g. 2"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* PHOTOS ATTACHMENT (17 PHOTOGRAPHIC CHECKPOINTS) */}
                <div className="border-t border-border pt-10">
                  <div className="border-b border-border pb-3 mb-6">
                    <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                      Photographic Verification (All Sides, Odometer & Accessory Checkpoints)
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {renderPhotoCard("Front View", "front", photoFront)}
                    {renderPhotoCard("Back View", "back", photoBack)}
                    {renderPhotoCard("LH View", "lh", photoLh)}
                    {renderPhotoCard("RH View", "rh", photoRh)}
                    {renderPhotoCard("Odometer Photo", "odometer", odometerPhoto)}
                    {renderPhotoCard("Engine/Chassis No.", "engine_chassis", photoEngineChassis)}
                    {renderPhotoCard("Battery Sl No.", "battery", photoBattery)}
                    {renderPhotoCard("Engine Compartment", "engine_compartment", photoEngineCompartment)}
                    {renderPhotoCard("FastTag Sticker", "fast_tag", photoFastTag)}
                    {renderPhotoCard("FastTag Proof", "fastag_proof", fastagProof)}
                    {renderPhotoCard("Music System", "music_system", photoMusicSystem)}
                    {renderPhotoCard("Stepney Tire", "stepney", stepneyPhoto)}
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
                    {editingId ? "Update Inspection Record" : "Save Inspection Record"}
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
                  <p className="font-sans text-xs text-text-muted mt-1">Audit trail of all vehicle checklists, driver assignments, and odometer readings.</p>
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

              {/* SEARCH & FILTERS BAR */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-border bg-slate-50/50 px-8 py-4">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
                  <input 
                    type="text" 
                    placeholder="Search Vehicle, Driver, Remarks..."
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
                    {CITIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.text}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select 
                    value={filterStage}
                    onChange={(e) => setFilterStage(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-white px-4 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="all">All Inspection Stages</option>
                    <option value="Pre-Allocation (PDI)">Pre-Allocation (PDI)</option>
                    <option value="Post-DropOff (Return)">Post-DropOff (Return)</option>
                    <option value="Routine Audit / Maintenance">Routine Audit / Maintenance</option>
                  </select>
                </div>
              </div>

              {/* TABLE ELEMENT */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-4xl border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-slate-50 text-[10px] font-bold text-text-muted">
                      <th className="px-6 py-3.5 w-16">ID</th>
                      <th className="px-5 py-3.5">Stage & Date</th>
                      <th className="px-5 py-3.5">Vehicle Number</th>
                      <th className="px-5 py-3.5">Driver & Location</th>
                      <th className="px-5 py-3.5">Odometer (Kms)</th>
                      <th className="px-5 py-3.5">Checked Assets</th>
                      <th className="px-5 py-3.5">Remarks</th>
                      <th className="px-6 py-3.5 text-right w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-sans text-xs">
                    {filteredRecords.length > 0 ? (
                      filteredRecords.map((r) => {
                        const items = [r.jack, r.jack_rod, r.spanner, r.parking_triangle, r.fire_extinguishers, r.seat_cover, r.floor_carpet, r.music_system, r.stepney];
                        const availableCount = items.filter(i => i === "Available").length;
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-text">#{r.id}</td>
                            <td className="px-5 py-4">
                              <span className="inline-block rounded-md px-1.5 py-0.5 font-sans text-[9px] font-bold bg-primary/10 text-primary mb-1">
                                {r.inspection_stage || "PDI"}
                              </span>
                              <div className="font-bold text-slate-800">{r.inspection_date}</div>
                            </td>
                            <td className="px-5 py-4 font-bold text-primary font-mono text-sm">{r.vehicle_number}</td>
                            <td className="px-5 py-4">
                              {r.driver_name ? (
                                <div className="font-bold text-text">{r.driver_name}</div>
                              ) : (
                                <div className="text-text-muted text-[11px]">Unassigned</div>
                              )}
                              <div className="text-[10px] text-text-muted mt-0.5">{r.city_name || "Hyderabad"} · {r.hub_name || "Hub"}</div>
                            </td>
                            <td className="px-5 py-4 font-bold text-slate-900 font-mono">{parseInt(r.odometer_reading || "0").toLocaleString()} km</td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${ availableCount === 9 ? "bg-green-light text-green" : availableCount >= 6 ? "bg-yellow-light text-amber-700" : "bg-red-50 text-red-600" }`}>
                                {availableCount} / 9 Available
                              </span>
                            </td>
                            <td className="px-5 py-4 text-text-muted max-w-xs truncate">{r.remarks || "—"}</td>
                            <td className="px-6 py-4 text-right">
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
                        <td colSpan={8} className="px-8 py-10 text-center text-text-muted font-medium">
                          No vehicle inspections recorded.
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
