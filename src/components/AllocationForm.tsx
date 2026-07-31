import React, { useState, useMemo, useEffect } from "react";
import { 
  Calendar, MapPin, User, Phone, FileText, CheckCircle, 
  Clock, ArrowLeft, Download, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, Key, Plus, ChevronLeft, Settings, Database
} from "lucide-react";
import { AllocationRecord, User as UserSession, CITIES } from "../types";
import CameraCapture from "./CameraCapture";

interface AllocationFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

export default function AllocationForm({ 
  user, 
  onBackToSelector, 
  onLogout
}: AllocationFormProps) {
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
  const [allocationDate, setAllocationDate] = useState(new Date().toISOString().split("T")[0]);
  const [allocationType, setAllocationType] = useState<"New allocation" | "Reallocation" | "Swap" | "Dropoff">("New allocation");
  const [cityName, setCityName] = useState("Hyderabad");
  const [driverId, setDriverId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverPlan, setDriverPlan] = useState("");
  const [typeOfPlan, setTypeOfPlan] = useState("");
  const [carModel, setCarModel] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  
  // Conditional Dropoff Fields
  const [oldVehicleNumber, setOldVehicleNumber] = useState("");
  const [dropoffOdometer, setDropoffOdometer] = useState("");
  const [dropoffRemarks, setDropoffRemarks] = useState("");
  const [dropoffPhoto, setDropoffPhoto] = useState<string | null>(null);

  // Allocated Vehicle Inspection Checklist States
  const [jack, setJack] = useState("Available");
  const [jackRod, setJackRod] = useState("Available");
  const [spanner, setSpanner] = useState("Available");
  const [parkingTriangle, setParkingTriangle] = useState("Available");
  const [fireExtinguishers, setFireExtinguishers] = useState("Available");
  const [seatCover, setSeatCover] = useState("Available");
  const [floorCarpet, setFloorCarpet] = useState("Available");
  const [inspectionRemarks, setInspectionRemarks] = useState("");

  // Returned Vehicle Inspection Checklist States
  const [oldJack, setOldJack] = useState("Available");
  const [oldJackRod, setOldJackRod] = useState("Available");
  const [oldSpanner, setOldSpanner] = useState("Available");
  const [oldParkingTriangle, setOldParkingTriangle] = useState("Available");
  const [oldFireExtinguishers, setOldFireExtinguishers] = useState("Available");
  const [oldSeatCover, setOldSeatCover] = useState("Available");
  const [oldFloorCarpet, setOldFloorCarpet] = useState("Available");
  const [oldInspectionRemarks, setOldInspectionRemarks] = useState("");

  // Helper to load inspection data from backend
  const fetchLastInspectionForGiven = async (num: string) => {
    if (!num.trim()) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/inspection/last/${num}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setJack(data.jack || "Available");
          setJackRod(data.jack_rod || "Available");
          setSpanner(data.spanner || "Available");
          setParkingTriangle(data.parking_triangle || "Available");
          setFireExtinguishers(data.fire_extinguishers || "Available");
          setSeatCover(data.seat_cover || "Available");
          setFloorCarpet(data.floor_carpet || "Available");
          setInspectionRemarks(data.remarks || "");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLastInspectionForOld = async (num: string) => {
    if (!num.trim()) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/inspection/last/${num}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setOldJack(data.jack || "Available");
          setOldJackRod(data.jack_rod || "Available");
          setOldSpanner(data.spanner || "Available");
          setOldParkingTriangle(data.parking_triangle || "Available");
          setOldFireExtinguishers(data.fire_extinguishers || "Available");
          setOldSeatCover(data.seat_cover || "Available");
          setOldFloorCarpet(data.floor_carpet || "Available");
          setOldInspectionRemarks(data.remarks || "");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [cameraActive, setCameraActive] = useState(false);

  // Registry Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterType, setFilterType] = useState("all");
  
  // Top header quick search
  const [retrieveIdInput, setRetrieveIdInput] = useState("");

  const [records, setRecords] = useState<AllocationRecord[]>([]);
  const [stats, setStats] = useState({
    total_allocations: 0,
    new_allocations: 0,
    car_swaps: 0,
    reallocations: 0
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
      const res = await fetch("/api/allocation/stats", {
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
      const res = await fetch("/api/allocation", {
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
          setDropoffPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const loadRecordForEdit = async (id: number) => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/allocation/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Record not found");
      const data = await res.json();
      
      setEditingId(data.id);
      setAllocationDate(data.allocation_date || "");
      
      // Map old types to new type names if necessary
      let mappedType = data.allocation_type || "New allocation";
      if (mappedType === "New Allocation") mappedType = "New allocation";
      if (mappedType === "Car Swap") mappedType = "Swap";
      
      setAllocationType(mappedType);
      setCityName(data.city_name || "Hyderabad");
      setDriverId(data.driver_id || "");
      setDriverName(data.driver_name || "");
      setDriverPhone(data.driver_phone || "");
      setDriverPlan(data.driver_plan || "");
      setTypeOfPlan(data.type_of_plan || "");
      setCarModel(data.car_model || "");
      setVehicleNumber(data.vehicle_number || "");
      
      setOldVehicleNumber(data.old_vehicle_number || "");
      setDropoffOdometer(data.dropoff_odometer || "");
      setDropoffRemarks(data.dropoff_remarks || "");
      setDropoffPhoto(data.dropoff_photo || null);

      if (data.vehicle_number) {
        fetchLastInspectionForGiven(data.vehicle_number);
      }
      if (data.old_vehicle_number) {
        fetchLastInspectionForOld(data.old_vehicle_number);
      }
      
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
    setAllocationDate(new Date().toISOString().split("T")[0]);
    setAllocationType("New allocation");
    setCityName("Hyderabad");
    setDriverId("");
    setDriverName("");
    setDriverPhone("");
    setDriverPlan("");
    setTypeOfPlan("");
    setCarModel("");
    setVehicleNumber("");
    setOldVehicleNumber("");
    setDropoffOdometer("");
    setDropoffRemarks("");
    setDropoffPhoto(null);

    // Given Vehicle Inspection States Reset
    setJack("Available");
    setJackRod("Available");
    setSpanner("Available");
    setParkingTriangle("Available");
    setFireExtinguishers("Available");
    setSeatCover("Available");
    setFloorCarpet("Available");
    setInspectionRemarks("");

    // Returned Vehicle Inspection States Reset
    setOldJack("Available");
    setOldJackRod("Available");
    setOldSpanner("Available");
    setOldParkingTriangle("Available");
    setOldFireExtinguishers("Available");
    setOldSeatCover("Available");
    setOldFloorCarpet("Available");
    setOldInspectionRemarks("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId.trim()) return alert("Driver ID is required");
    if (!driverName.trim()) return alert("Driver Name is required");
    if (!driverPhone.trim()) return alert("Driver Phone is required");

    if (allocationType !== "Dropoff" && !vehicleNumber.trim()) {
      return alert("Vehicle Number is required");
    }

    if (allocationType === "Swap" || allocationType === "Dropoff") {
      if (!oldVehicleNumber.trim()) return alert("Returned Vehicle Number is required");
      if (!dropoffOdometer.trim()) return alert("Dropoff Odometer reading is required");
    }

    const token = localStorage.getItem("lr_token");

    try {
      // 1. Submit Inspection for Allocated Vehicle (if allocated)
      if (allocationType !== "Dropoff") {
        const inspRes = await fetch("/api/inspection", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            vehicle_number: vehicleNumber.trim().toUpperCase(),
            inspection_date: allocationDate,
            odometer_reading: dropoffOdometer || "0",
            jack,
            jack_rod: jackRod,
            spanner,
            parking_triangle: parkingTriangle,
            fire_extinguishers: fireExtinguishers,
            seat_cover: seatCover,
            floor_carpet: floorCarpet,
            remarks: inspectionRemarks
          })
        });
        if (!inspRes.ok) throw new Error("Failed to log Allocated Vehicle inspection checklist");
      }

      // 2. Submit Inspection for Returned Vehicle (if dropped off/swapped)
      if (allocationType === "Swap" || allocationType === "Dropoff") {
        const inspRes = await fetch("/api/inspection", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            vehicle_number: oldVehicleNumber.trim().toUpperCase(),
            inspection_date: allocationDate,
            odometer_reading: dropoffOdometer,
            jack: oldJack,
            jack_rod: oldJackRod,
            spanner: oldSpanner,
            parking_triangle: oldParkingTriangle,
            fire_extinguishers: oldFireExtinguishers,
            seat_cover: oldSeatCover,
            floor_carpet: oldFloorCarpet,
            remarks: oldInspectionRemarks
          })
        });
        if (!inspRes.ok) throw new Error("Failed to log Returned Vehicle inspection checklist");
      }

      // 3. Submit Allocation Payload
      const payload = {
        allocation_date: allocationDate,
        allocation_type: allocationType,
        city_name: cityName,
        driver_id: driverId.trim(),
        driver_name: driverName.trim(),
        driver_phone: driverPhone.trim(),
        driver_plan: driverPlan.trim() || null,
        type_of_plan: typeOfPlan.trim() || null,
        car_model: carModel.trim() || null,
        vehicle_number: allocationType === "Dropoff" ? oldVehicleNumber.trim() : vehicleNumber.trim(),
        old_vehicle_number: (allocationType === "Swap" || allocationType === "Dropoff") ? oldVehicleNumber.trim() : null,
        dropoff_odometer: (allocationType === "Swap" || allocationType === "Dropoff") ? dropoffOdometer.trim() : null,
        dropoff_remarks: (allocationType === "Swap" || allocationType === "Dropoff") ? dropoffRemarks.trim() : null,
        dropoff_photo: (allocationType === "Swap" || allocationType === "Dropoff") ? dropoffPhoto : null
      };

      const url = editingId ? `/api/allocation/${editingId}` : "/api/allocation";
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
        throw new Error(errorText || "Failed to submit allocation record");
      }

      alert(editingId ? "Allocation Record & Inspections Updated Successfully!" : "Allocation Record & Inspections Saved Successfully!");
      resetForm();
      fetchStats();
      fetchRecords();
      setActiveTab("registry");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the allocation record for ${name}?`)) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/allocation/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Delete failed");
      alert("Allocation deleted successfully");
      fetchStats();
      fetchRecords();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterCity !== "all" && r.city_name !== filterCity) return false;
      if (filterType !== "all" && r.allocation_type !== filterType) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (r.driver_name || "").toLowerCase().includes(q) ||
          (r.driver_id || "").toLowerCase().includes(q) ||
          (r.driver_phone || "").includes(q) ||
          (r.vehicle_number || "").toLowerCase().includes(q) ||
          (r.old_vehicle_number || "").toLowerCase().includes(q) ||
          String(r.id).includes(q)
        );
      }
      return true;
    });
  }, [records, searchQuery, filterCity, filterType]);

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return alert("No records to export");
    const headers = [
      "ID", "Allocation Date", "Allocation Type", "City", 
      "Driver ID", "Driver Name", "Driver Phone", 
      "Driver Plan", "Type of Plan", "Car Model", "Vehicle Number", 
      "Old Vehicle Number", "Dropoff Odometer", "Dropoff Remarks", "Created At"
    ];

    const rows = filteredRecords.map((r) => [
      r.id,
      r.allocation_date,
      r.allocation_type,
      r.city_name,
      `"${r.driver_id.replace(/"/g, '""')}"`,
      `"${r.driver_name.replace(/"/g, '""')}"`,
      r.driver_phone,
      `"${(r.driver_plan || "").replace(/"/g, '""')}"`,
      `"${(r.type_of_plan || "").replace(/"/g, '""')}"`,
      `"${(r.car_model || "").replace(/"/g, '""')}"`,
      r.vehicle_number,
      r.old_vehicle_number || "",
      r.dropoff_odometer || "",
      `"${(r.dropoff_remarks || "").replace(/"/g, '""')}"`,
      r.created_at
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `letzryd_allocations_${new Date().toISOString().split("T")[0]}.csv`);
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
              Allocation
            </span>
          </div>

          {/* Navigation Pills */}
          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab("form")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "form" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <FileText className="h-4 w-4" />
              Allocation Form
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
              Allocation Registry
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
                        LetzRyd Desk
                      </span>
                    </div>
                    <h1 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                      {editingId ? `Edit Allocation Record #${editingId}` : "Allocation Form"}
                    </h1>
                  </div>

                  {/* Header Search bar */}
                  <div className="relative z-10 flex w-full sm:w-auto mt-2 sm:mt-0">
                    <div className="relative flex w-full sm:w-72 items-center">
                      <Search className="absolute left-3 h-4 w-4 text-white/60" />
                      <input 
                        type="number" 
                        placeholder="Edit existing record (ID)..." 
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

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-8 space-y-10">
                
                {/* 3 COLUMN DETAILS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  
                  {/* COLUMN 1: ALLOCATION DETAILS */}
                  <div className="space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                        Allocation Details
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Date of Allocation <span className="text-red-500">*</span></label>
                        <input 
                          type="date" 
                          value={allocationDate}
                          onChange={(e) => setAllocationDate(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Allocation Type <span className="text-red-500">*</span></label>
                        <div className="flex flex-col gap-2">
                          {["New allocation", "Reallocation", "Swap", "Dropoff"].map((type) => (
                            <label key={type} className="flex items-center gap-3 rounded-xl border border-border px-4 py-2.5 text-xs font-bold hover:bg-bg cursor-pointer transition-all shadow-2xs">
                              <input 
                                type="radio" 
                                name="allocationType" 
                                checked={allocationType === type}
                                onChange={() => setAllocationType(type as any)}
                                className="text-primary focus:ring-primary cursor-pointer"
                              />
                              {type}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">City <span className="text-red-500">*</span></label>
                        <select 
                          value={cityName}
                          onChange={(e) => setCityName(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                        >
                          {CITIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.text}</option>
                          ))}
                          <option value="Chennai">Chennai</option>
                          <option value="Delhi">Delhi</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 2: DRIVER INFORMATION */}
                  <div className="space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                        Driver Information
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Operator / Driver ID <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          placeholder="Unique LetzRyd ID..."
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
                          placeholder="Enter full name..."
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Driver Phone Number <span className="text-red-500">*</span></label>
                        <input 
                          type="tel" 
                          placeholder="+91 10-digit mobile..."
                          value={driverPhone}
                          onChange={(e) => setDriverPhone(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 3: VEHICLE & PLAN */}
                  <div className="space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                        Vehicle & Plan
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Driver Plan</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Subscription, Lease..."
                          value={driverPlan}
                          onChange={(e) => setDriverPlan(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Type of Plan</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Bronze, Silver, Gold..."
                          value={typeOfPlan}
                          onChange={(e) => setTypeOfPlan(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Car Model</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Tata Nexon EV..."
                          value={carModel}
                          onChange={(e) => setCarModel(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block font-sans text-xs font-bold text-text-muted">Vehicle Number (New/Current) <span className="text-red-500">*</span></label>
                          <button
                            type="button"
                            onClick={() => fetchLastInspectionForGiven(vehicleNumber)}
                            className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                          >
                            Load Last Inspection
                          </button>
                        </div>
                        <input 
                          type="text" 
                          placeholder="e.g. TS09 EA 1234..."
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value)}
                          onBlur={() => fetchLastInspectionForGiven(vehicleNumber)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                 {/* CONDITIONAL PANEL 4: DROPOFF DETAILS */}
                {(allocationType === "Swap" || allocationType === "Dropoff") && (
                  <div className="border-t border-border pt-10 space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-amber-600 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-amber-600 text-xs font-bold">4</span>
                        Dropoff Details (Car Return)
                      </h3>
                      <p className="font-sans text-xs text-text-muted mt-1">Record details of the old vehicle being returned by the partner.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="block font-sans text-xs font-bold text-text-muted">Old Vehicle Number <span className="text-red-500">*</span></label>
                            <button
                              type="button"
                              onClick={() => fetchLastInspectionForOld(oldVehicleNumber)}
                              className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                            >
                              Load Last Inspection
                            </button>
                          </div>
                          <input 
                            type="text" 
                            placeholder="Vehicle being returned..."
                            value={oldVehicleNumber}
                            onChange={(e) => setOldVehicleNumber(e.target.value)}
                            onBlur={() => fetchLastInspectionForOld(oldVehicleNumber)}
                            required
                            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block font-sans text-xs font-bold text-text-muted mb-2">Dropoff Odometer (KM) <span className="text-red-500">*</span></label>
                          <input 
                            type="number" 
                            placeholder="Current reading..."
                            value={dropoffOdometer}
                            onChange={(e) => setDropoffOdometer(e.target.value)}
                            required
                            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block font-sans text-xs font-bold text-text-muted mb-2">Dropoff Remarks</label>
                          <textarea 
                            placeholder="Condition, damages, battery state..."
                            value={dropoffRemarks}
                            onChange={(e) => setDropoffRemarks(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs resize-none"
                          />
                        </div>
                      </div>

                      {/* Photo Capture */}
                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Vehicle Condition Photo</label>
                        <div className="w-full rounded-2xl border border-dashed border-border bg-bg/30 p-6 text-center hover:bg-bg/50 transition-all shadow-2xs">
                          {dropoffPhoto ? (
                            <div className="relative inline-block">
                              <img 
                                src={dropoffPhoto} 
                                alt="Vehicle Condition Proof" 
                                className="h-32 w-auto object-cover rounded-xl border border-border shadow-xs"
                              />
                              <button 
                                type="button"
                                onClick={() => setDropoffPhoto(null)}
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
                              <p className="font-sans text-xs font-bold text-text-muted">Upload or capture dropoff photo</p>
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
                )}

                {/* 5. GIVEN VEHICLE INSPECTION CHECKLIST */}
                {allocationType !== "Dropoff" && (
                  <div className="border-t border-border pt-10 space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">5</span>
                        Inspection Checklist: Allocated Car ({vehicleNumber || "No vehicle entered"})
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-slate-50/50">
                          <span className="font-sans text-xs font-bold text-text">Jack</span>
                          <div className="flex gap-2">
                            {["Available", "Not Available"].map((opt) => (
                              <button key={opt} type="button" onClick={() => setJack(opt)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${jack === opt ? "bg-green-light border-green/30 text-green" : "bg-white border-border text-text-muted"}`}>{opt}</button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-slate-50/50">
                          <span className="font-sans text-xs font-bold text-text">Jack Rod</span>
                          <div className="flex gap-2">
                            {["Available", "Not Available"].map((opt) => (
                              <button key={opt} type="button" onClick={() => setJackRod(opt)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${jackRod === opt ? "bg-green-light border-green/30 text-green" : "bg-white border-border text-text-muted"}`}>{opt}</button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-slate-50/50">
                          <span className="font-sans text-xs font-bold text-text">Spanner</span>
                          <div className="flex gap-2">
                            {["Available", "Not Available"].map((opt) => (
                              <button key={opt} type="button" onClick={() => setSpanner(opt)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${spanner === opt ? "bg-green-light border-green/30 text-green" : "bg-white border-border text-text-muted"}`}>{opt}</button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-slate-50/50">
                          <span className="font-sans text-xs font-bold text-text">Parking Triangle</span>
                          <div className="flex gap-2">
                            {["Available", "Not Available"].map((opt) => (
                              <button key={opt} type="button" onClick={() => setParkingTriangle(opt)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${parkingTriangle === opt ? "bg-green-light border-green/30 text-green" : "bg-white border-border text-text-muted"}`}>{opt}</button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-slate-50/50">
                          <span className="font-sans text-xs font-bold text-text">Fire Extinguisher</span>
                          <div className="flex gap-2">
                            {["Available", "Not Available"].map((opt) => (
                              <button key={opt} type="button" onClick={() => setFireExtinguishers(opt)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${fireExtinguishers === opt ? "bg-green-light border-green/30 text-green" : "bg-white border-border text-text-muted"}`}>{opt}</button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-slate-50/50">
                          <span className="font-sans text-xs font-bold text-text">Seat Covers</span>
                          <div className="flex gap-2">
                            {["Available", "Not Available"].map((opt) => (
                              <button key={opt} type="button" onClick={() => setSeatCover(opt)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${seatCover === opt ? "bg-green-light border-green/30 text-green" : "bg-white border-border text-text-muted"}`}>{opt}</button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-slate-50/50">
                          <span className="font-sans text-xs font-bold text-text">Floor Carpets</span>
                          <div className="flex gap-2">
                            {["Available", "Not Available"].map((opt) => (
                              <button key={opt} type="button" onClick={() => setFloorCarpet(opt)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${floorCarpet === opt ? "bg-green-light border-green/30 text-green" : "bg-white border-border text-text-muted"}`}>{opt}</button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block font-sans text-[10px] font-bold text-text-muted mb-1">Inspection Remarks (Allocated Car)</label>
                          <input type="text" value={inspectionRemarks} onChange={(e) => setInspectionRemarks(e.target.value)} placeholder="Condition details..." className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs focus:outline-none focus:border-primary" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. RETURNED VEHICLE INSPECTION CHECKLIST */}
                {(allocationType === "Swap" || allocationType === "Dropoff") && (
                  <div className="border-t border-border pt-10 space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-amber-600 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-amber-600 text-xs font-bold">6</span>
                        Inspection Checklist: Returned Car ({oldVehicleNumber || "No vehicle entered"})
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-slate-50/50">
                          <span className="font-sans text-xs font-bold text-text">Jack</span>
                          <div className="flex gap-2">
                            {["Available", "Not Available"].map((opt) => (
                              <button key={opt} type="button" onClick={() => setOldJack(opt)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${oldJack === opt ? "bg-green-light border-green/30 text-green" : "bg-white border-border text-text-muted"}`}>{opt}</button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-slate-50/50">
                          <span className="font-sans text-xs font-bold text-text">Jack Rod</span>
                          <div className="flex gap-2">
                            {["Available", "Not Available"].map((opt) => (
                              <button key={opt} type="button" onClick={() => setOldJackRod(opt)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${oldJackRod === opt ? "bg-green-light border-green/30 text-green" : "bg-white border-border text-text-muted"}`}>{opt}</button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-slate-50/50">
                          <span className="font-sans text-xs font-bold text-text">Spanner</span>
                          <div className="flex gap-2">
                            {["Available", "Not Available"].map((opt) => (
                              <button key={opt} type="button" onClick={() => setOldSpanner(opt)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${oldSpanner === opt ? "bg-green-light border-green/30 text-green" : "bg-white border-border text-text-muted"}`}>{opt}</button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-slate-50/50">
                          <span className="font-sans text-xs font-bold text-text">Parking Triangle</span>
                          <div className="flex gap-2">
                            {["Available", "Not Available"].map((opt) => (
                              <button key={opt} type="button" onClick={() => setOldParkingTriangle(opt)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${oldParkingTriangle === opt ? "bg-green-light border-green/30 text-green" : "bg-white border-border text-text-muted"}`}>{opt}</button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-slate-50/50">
                          <span className="font-sans text-xs font-bold text-text">Fire Extinguisher</span>
                          <div className="flex gap-2">
                            {["Available", "Not Available"].map((opt) => (
                              <button key={opt} type="button" onClick={() => setOldFireExtinguishers(opt)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${oldFireExtinguishers === opt ? "bg-green-light border-green/30 text-green" : "bg-white border-border text-text-muted"}`}>{opt}</button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-slate-50/50">
                          <span className="font-sans text-xs font-bold text-text">Seat Covers</span>
                          <div className="flex gap-2">
                            {["Available", "Not Available"].map((opt) => (
                              <button key={opt} type="button" onClick={() => setOldSeatCover(opt)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${oldSeatCover === opt ? "bg-green-light border-green/30 text-green" : "bg-white border-border text-text-muted"}`}>{opt}</button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-slate-50/50">
                          <span className="font-sans text-xs font-bold text-text">Floor Carpets</span>
                          <div className="flex gap-2">
                            {["Available", "Not Available"].map((opt) => (
                              <button key={opt} type="button" onClick={() => setOldFloorCarpet(opt)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${oldFloorCarpet === opt ? "bg-green-light border-green/30 text-green" : "bg-white border-border text-text-muted"}`}>{opt}</button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block font-sans text-[10px] font-bold text-text-muted mb-1">Inspection Remarks (Returned Car)</label>
                          <input type="text" value={oldInspectionRemarks} onChange={(e) => setOldInspectionRemarks(e.target.value)} placeholder="Condition details..." className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs focus:outline-none focus:border-primary" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
                      className="rounded-xl bg-primary hover:bg-primary-hover px-6 py-3.5 font-sans text-sm font-bold text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      {editingId ? "Save Changes" : "Submit Allocation"}
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
              
              {/* CARD 1: Total Allocations */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="font-sans text-[10px] font-bold text-text-muted tracking-widest block">Total Allocations</span>
                  <span className="font-sans text-3xl font-extrabold text-primary tracking-tight block mt-1">{stats.total_allocations}</span>
                  <span className="font-sans text-[10px] text-text-muted block mt-0.5">Fleet distributions</span>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-primary">
                  <Settings className="h-6 w-6" />
                </div>
              </div>

              {/* CARD 2: New Allocations */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="font-sans text-[10px] font-bold text-text-muted tracking-widest block">New Allocations</span>
                  <span className="font-sans text-3xl font-extrabold text-green tracking-tight block mt-1">{stats.new_allocations}</span>
                  <span className="font-sans text-[10px] text-text-muted block mt-0.5">Fresh assignments</span>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-light text-green">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </div>

              {/* CARD 3: Car Swaps */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="font-sans text-[10px] font-bold text-text-muted tracking-widest block">Car Swaps</span>
                  <span className="font-sans text-3xl font-extrabold text-amber-600 tracking-tight block mt-1">{stats.car_swaps}</span>
                  <span className="font-sans text-[10px] text-text-muted block mt-0.5">Vehicle exchanges</span>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-light text-amber-600">
                  <Plus className="h-6 w-6" />
                </div>
              </div>

              {/* CARD 4: Reallocations */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="font-sans text-[10px] font-bold text-text-muted tracking-widest block">Reallocations</span>
                  <span className="font-sans text-3xl font-extrabold text-indigo-600 tracking-tight block mt-1">{stats.reallocations}</span>
                  <span className="font-sans text-[10px] text-text-muted block mt-0.5">Redistributions</span>
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
                  <h2 className="font-sans text-lg font-extrabold text-text tracking-tight">Allocation Registry</h2>
                  <p className="font-sans text-xs text-text-muted mt-0.5">Audit log of all vehicle allocations, swaps, and returns.</p>
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
                    Add Allocation
                  </button>
                </div>
              </div>

              {/* SEARCH & FILTERS BAR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-b border-border bg-bg/30 px-6 py-4">
                
                <div className="relative flex items-center">
                  <Search className="absolute left-3.5 h-4 w-4 text-text-muted pointer-events-none" />
                  <input 
                    type="text" 
                    placeholder="Search name, code, phone, vehicle..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs"
                  />
                </div>

                <div className="relative">
                  <select 
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="all">All Cities</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Chennai">Chennai</option>
                    <option value="Delhi">Delhi</option>
                  </select>
                </div>

                <div className="relative">
                  <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="all">All Types</option>
                    <option value="New allocation">New allocation</option>
                    <option value="Reallocation">Reallocation</option>
                    <option value="Swap">Swap</option>
                    <option value="Dropoff">Dropoff</option>
                  </select>
                </div>
              </div>

              {/* TABLE CONTAINER */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-bg/50 select-none">
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-left w-16">ID</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-left">Driver Details</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-left">Allocation Details</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-left">Plan & Vehicle</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-left">Dropoff Details</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-right w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-text-muted font-sans text-xs">
                          No matching allocation records found in the database.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((r) => {
                        return (
                          <tr key={r.id} className="hover:bg-bg/10 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs font-bold text-primary">#{r.id}</td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-xs font-bold text-text">{r.driver_name}</div>
                              <div className="font-mono text-[10px] text-text-muted mt-0.5">ID: {r.driver_id} · {r.driver_phone}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-xs font-bold text-text">{r.city_name}</div>
                              <span className={`inline-block rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold mt-1 ${ (r.allocation_type === "New allocation" || r.allocation_type === "New Allocation") ? "bg-green-light text-green" : r.allocation_type === "Reallocation" ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : (r.allocation_type === "Swap" || r.allocation_type === "Car Swap") ? "bg-yellow-light text-amber-600 border border-yellow-100" : "bg-red-50 text-red-600 border border-red-100" }`}>
                                {r.allocation_type}
                              </span>
                              <div className="font-sans text-[9px] text-text-muted mt-1">{r.allocation_date}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-xs font-bold text-primary">{r.vehicle_number}</div>
                              {r.car_model && <div className="font-sans text-[10px] text-text mt-0.5">{r.car_model}</div>}
                              {(r.driver_plan || r.type_of_plan) && (
                                <div className="font-mono text-[9px] text-text-muted mt-0.5">
                                  Plan: {r.driver_plan || "-"} ({r.type_of_plan || "-"})
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {r.old_vehicle_number ? (
                                <div className="space-y-1">
                                  <div className="font-mono text-[10px] text-text">Old: <span className="font-semibold">{r.old_vehicle_number}</span></div>
                                  <div className="font-mono text-[10px] text-text-muted">Odometer: {r.dropoff_odometer} KM</div>
                                  {r.dropoff_remarks && <div className="font-sans text-[9px] text-text-muted italic">"{r.dropoff_remarks}"</div>}
                                </div>
                              ) : (
                                <span className="font-sans text-[10px] text-text-muted">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button 
                                  onClick={() => loadRecordForEdit(r.id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg hover:bg-primary hover:text-white transition-colors cursor-pointer"
                                  title="Edit Allocation"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(r.id, r.driver_name)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg text-red-600 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                                  title="Delete Allocation"
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
            setDropoffPhoto(base64);
            setCameraActive(false);
          }}
          onClose={() => setCameraActive(false)}
        />
      )}

      {/* FOOTER SECTION */}
      <footer className="bg-primary py-8 text-center text-xs text-white/50 border-t border-primary-hover font-sans mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img 
              src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" 
              alt="LetzRyd" 
              className="h-6 w-auto brightness-0 invert"
            />
            <span className="font-semibold text-white/80">LetzRyd Allocation Desk</span>
          </div>
          <span>© Copyright 2026 | All Rights Reserved</span>
        </div>
      </footer>
    </div>
  );
}
