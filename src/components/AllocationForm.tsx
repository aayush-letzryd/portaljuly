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
  initialEditId?: number;
  isReviewMode?: boolean;
}

const PLAN_MAPPING: Record<string, { typeOfPlan: string; carModel: string }> = {
  "Drive to Rent": { typeOfPlan: "Subscription (Daily)", carModel: "Tata Xpres-T EV" },
  "Drive to Own": { typeOfPlan: "Lease to Own", carModel: "Tata Tigor EV" },
  "LetzOwn": { typeOfPlan: "Lease to Own (Premium)", carModel: "Tata Nexon EV" },
  "Salary Model": { typeOfPlan: "Employment Contract", carModel: "Hyundai Kona EV" }
};

export default function AllocationForm({ 
  user, 
  onBackToSelector, 
  onLogout,
  initialEditId,
  isReviewMode
}: AllocationFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "drafts" | "registry">("form");
  
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

  // Vehicle Allocation Form Fields State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [allocationDate, setAllocationDate] = useState(new Date().toISOString().split("T")[0]);
  const [transactionType, setTransactionType] = useState<"New Allocation" | "Reallocation" | "Rejoining" | "Swap">("New Allocation");

  // New allocation fields state
  const [olaNegativeBalance, setOlaNegativeBalance] = useState("");
  const [olaNegativeBalanceProof, setOlaNegativeBalanceProof] = useState<string | null>(null);
  const [gpsActive, setGpsActive] = useState("Yes");
  const [odometerReading, setOdometerReading] = useState("");
  const [odometerPhoto, setOdometerPhoto] = useState<string | null>(null);
  const [batteryPhoto, setBatteryPhoto] = useState<string | null>(null);
  
  const [photoLhSide, setPhotoLhSide] = useState<string | null>(null);
  const [photoRhSide, setPhotoRhSide] = useState<string | null>(null);
  const [photoFrontSide, setPhotoFrontSide] = useState<string | null>(null);
  const [photoBackSide, setPhotoBackSide] = useState<string | null>(null);

  // Driver Fetch / Lookup state
  const [driverLookupStatus, setDriverLookupStatus] = useState<string>("");
  const [isDriverLookupLoading, setIsDriverLookupLoading] = useState<boolean>(false);

  // Vehicle Autocomplete State
  const [vehicleSuggestions, setVehicleSuggestions] = useState<any[]>([]);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState<boolean>(false);

  // New checklist items
  const [musicSystem, setMusicSystem] = useState("Available");
  const [oldMusicSystem, setOldMusicSystem] = useState("Available");

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

  const handleFetchDriver = async (searchVal?: string) => {
    const term = searchVal || driverPhone || driverId;
    if (!term || !term.trim()) {
      alert("Please enter a Driver Phone Number or Driver ID to fetch details.");
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
          
          // Case-insensitive match against PLAN_MAPPING options
          let matchedPlan = "Drive to Rent";
          const rawPlan = (d.driver_plan || d.rental_model || "").trim();
          if (rawPlan) {
            const foundKey = Object.keys(PLAN_MAPPING).find(
              k => k.toLowerCase() === rawPlan.toLowerCase()
            );
            if (foundKey) matchedPlan = foundKey;
          }
          setDriverPlan(matchedPlan);
          
          // Auto-populate contract & car model
          const contractType = d.type_of_plan || PLAN_MAPPING[matchedPlan]?.typeOfPlan || "Subscription (Daily)";
          const modelType = d.car_model || PLAN_MAPPING[matchedPlan]?.carModel || "Tata Xpres-T EV";
          setTypeOfPlan(contractType);
          setCarModel(modelType);

          setDriverLookupStatus(`Found: ${d.driver_name || "Driver"} (${d.driver_id || "ID"})`);
        } else {
          setDriverLookupStatus("No onboarded driver record found.");
        }
      }
    } catch (err) {
      setDriverLookupStatus("Failed to lookup driver details.");
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

  const [cameraActive, setCameraActive] = useState(false);
  const [activeCameraTarget, setActiveCameraTarget] = useState<
    "lhSide" | "rhSide" | "frontSide" | "backSide" | "olaProof" | "odometer" | "battery" | null
  >(null);

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

  useEffect(() => {
    if (initialEditId) {
      loadRecordForEdit(initialEditId);
    }
  }, [initialEditId]);

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
      setTransactionType(data.allocation_type || "New Allocation");
      setCityName(data.city_name || "Hyderabad");
      setDriverId(data.driver_id || "");
      setDriverName(data.driver_name || "");
      setDriverPhone(data.driver_phone || "");
      setDriverPlan(data.driver_plan || "");
      setTypeOfPlan(data.type_of_plan || "");
      setCarModel(data.car_model || "");
      setVehicleNumber(data.vehicle_number || "");
      setOdometerReading(data.odometer_reading ? String(data.odometer_reading) : "");
      setOdometerPhoto(data.odometer_photo || null);
      setBatteryPhoto(data.battery_photo || null);
      setOlaNegativeBalance(data.ola_negative_balance || "");
      setOlaNegativeBalanceProof(data.ola_negative_balance_proof || null);
      setGpsActive(data.gps_active || "Yes");
      setPhotoLhSide(data.photo_lh_side || null);
      setPhotoRhSide(data.photo_rh_side || null);
      setPhotoFrontSide(data.photo_front_side || null);
      setPhotoBackSide(data.photo_back_side || null);
      
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
    setTransactionType("New Allocation");
    setCityName("Hyderabad");
    setDriverId("");
    setDriverName("");
    setDriverPhone("");
    setDriverPlan("");
    setTypeOfPlan("");
    setCarModel("");
    setVehicleNumber("");
    setOdometerReading("");
    setOdometerPhoto(null);
    setBatteryPhoto(null);
    setOlaNegativeBalance("");
    setOlaNegativeBalanceProof(null);
    setGpsActive("Yes");
    setPhotoLhSide(null);
    setPhotoRhSide(null);
    setPhotoFrontSide(null);
    setPhotoBackSide(null);

    // Vehicle Inspection States Reset
    setJack("Available");
    setJackRod("Available");
    setSpanner("Available");
    setParkingTriangle("Available");
    setFireExtinguishers("Available");
    setSeatCover("Available");
    setFloorCarpet("Available");
    setMusicSystem("Available");
    setInspectionRemarks("");
    setDriverLookupStatus("");
    setShowVehicleDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent, targetStatus: "Draft" | "Submitted" = "Submitted") => {
    e.preventDefault();
    const isDraft = targetStatus === "Draft";

    if (!isDraft) {
      if (!driverId.trim()) return alert("Driver ID is required");
      if (!driverName.trim()) return alert("Driver Name is required");
      
      const cleanPhone = driverPhone.replace(/\D/g, "");
      if (cleanPhone.length !== 10) {
        return alert("Please enter a valid 10-digit Indian mobile number.");
      }

      if (!vehicleNumber.trim()) return alert("Vehicle Number is required");
      if (!odometerReading.trim()) return alert("Odometer Reading is required");

      if (!editingId) {
        if (!photoLhSide) return alert("Left-Hand (LH) Side photo is required");
        if (!photoRhSide) return alert("Right-Hand (RH) Side photo is required");
        if (!photoFrontSide) return alert("Front Side photo is required");
        if (!photoBackSide) return alert("Back Side photo is required");
      }
    }

    const token = localStorage.getItem("lr_token");

    try {
      if (!isDraft) {
        await fetch("/api/inspection", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            vehicle_number: vehicleNumber.trim().toUpperCase(),
            inspection_date: allocationDate,
            odometer_reading: odometerReading || "0",
            jack,
            jack_rod: jackRod,
            spanner,
            parking_triangle: parkingTriangle,
            fire_extinguishers: fireExtinguishers,
            seat_cover: seatCover,
            floor_carpet: floorCarpet,
            music_system: musicSystem,
            remarks: inspectionRemarks
          })
        });
      }

      // Submit Allocation Payload
      const payload = {
        allocation_date: allocationDate,
        allocation_type: transactionType,
        sub_type: transactionType,
        city_name: cityName,
        driver_id: driverId.trim(),
        driver_name: driverName.trim(),
        driver_phone: driverPhone.trim(),
        driver_plan: driverPlan.trim() || null,
        type_of_plan: typeOfPlan.trim() || null,
        car_model: carModel.trim() || null,
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        odometer_reading: odometerReading ? parseFloat(odometerReading) : null,
        odometer_photo: odometerPhoto,
        battery_photo: batteryPhoto,
        gps_active: gpsActive,
        ola_negative_balance: olaNegativeBalance.trim() || null,
        ola_negative_balance_proof: olaNegativeBalanceProof,
        photo_lh_side: photoLhSide,
        photo_rh_side: photoRhSide,
        photo_front_side: photoFrontSide,
        photo_back_side: photoBackSide,
        status: targetStatus
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

      alert(editingId ? "Vehicle Allocation Record Updated Successfully!" : "Vehicle Allocation Saved Successfully!");
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
              Vehicle Allocation
            </span>
          </div>

          {/* Navigation Pills */}
          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab("form")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "form" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <FileText className="h-4 w-4" />
              Vehicle Allocation Form
            </button>
            <button
              onClick={() => setActiveTab("drafts")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "drafts" ? "bg-amber-600 text-white shadow-sm shadow-amber-600/20" : "text-text-muted hover:bg-slate-100 hover:text-amber-600" }`}
            >
              <Clock className="h-4 w-4" />
              Saved Drafts
              {records.filter(r => r.approval_status === "Draft").length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-extrabold">
                  {records.filter(r => r.approval_status === "Draft").length}
                </span>
              )}
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
        
        {activeTab === "form" && (
          <div>
            {/* Form card header */}
            <div className="rounded-2xl border border-border bg-white shadow-xl overflow-hidden mb-10">
              
              <div className="bg-primary text-white px-8 py-6 relative">
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <img src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" className="h-8 brightness-0 invert" alt="LetzRyd" referrerPolicy="no-referrer" />
                      <span className="px-2 py-0.5 rounded border border-white/30 bg-white/20 text-white text-[10px] font-bold tracking-widest backdrop-blur-sm">
                        LetzRyd Desk
                      </span>
                    </div>
                    <h1 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                      {editingId ? `Edit Vehicle Allocation Record #${editingId}` : "Vehicle Allocation Form"}
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
              <form onSubmit={(e) => handleSubmit(e, "Submitted")} className="p-8 space-y-10">
                
                {/* 3 COLUMN DETAILS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
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
                        <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">Transaction Type <span className="text-red-500">*</span></label>
                        <select
                          value={transactionType}
                          onChange={(e) => setTransactionType(e.target.value as any)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer font-semibold"
                        >
                          <option value="New Allocation">New Allocation</option>
                          <option value="Reallocation">Reallocation</option>
                          <option value="Rejoining">Rejoining</option>
                          <option value="Swap">Swap</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">Date of Allocation <span className="text-red-500">*</span></label>
                        <input 
                          type="date" 
                          value={allocationDate}
                          onChange={(e) => setAllocationDate(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">Operating City <span className="text-red-500">*</span></label>
                        <select 
                          value={cityName}
                          onChange={(e) => setCityName(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer font-semibold"
                        >
                          {CITIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.text}</option>
                          ))}
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
                            className="flex-1 rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs font-mono font-semibold"
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
                            className="flex-1 rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs font-mono"
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
                          placeholder="Enter full name..."
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">Driver Rental Plan <span className="text-red-500">*</span></label>
                        <select 
                          value={driverPlan}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDriverPlan(val);
                            if (PLAN_MAPPING[val]) {
                              setTypeOfPlan(PLAN_MAPPING[val].typeOfPlan);
                              setCarModel(PLAN_MAPPING[val].carModel);
                            } else {
                              setTypeOfPlan("");
                              setCarModel("");
                            }
                          }}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer font-semibold"
                        >
                          <option value="">Select Plan...</option>
                          <option value="Drive to Rent">Drive to Rent</option>
                          <option value="Drive to Own">Drive to Own</option>
                          <option value="LetzOwn">LetzOwn</option>
                          <option value="Salary Model">Salary Model</option>
                        </select>
                      </div>

                      {/* OLA Negative Balance Input */}
                      <div>
                        <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">OLA Negative Balance (₹)</label>
                        <input 
                          type="number"
                          placeholder="e.g. 1500 (if any)..."
                          value={olaNegativeBalance}
                          onChange={(e) => setOlaNegativeBalance(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs font-semibold"
                        />
                      </div>

                      {/* OLA Balance Proof Photo Card */}
                      <div>
                        <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">OLA Balance Proof Photo</label>
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 shadow-2xs">
                          {olaNegativeBalanceProof ? (
                            <div className="relative flex items-center justify-center bg-white rounded-lg p-1 border border-slate-200">
                              <img src={olaNegativeBalanceProof} alt="OLA Balance Proof" className="max-h-20 object-contain rounded" />
                              <button type="button" onClick={() => setOlaNegativeBalanceProof(null)} className="absolute top-1 right-1 rounded-full bg-rose-50 text-rose-500 p-1 hover:bg-rose-100 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => setActiveCameraTarget("olaProof")} className="flex-1 flex items-center justify-center gap-1 rounded bg-primary text-white text-[11px] font-bold py-1.5 hover:bg-primary-dark cursor-pointer transition-colors"><Camera className="h-3 w-3" /> Capture</button>
                              <label className="flex-1 flex items-center justify-center gap-1 rounded border border-slate-300 bg-white text-slate-700 text-[11px] font-bold py-1.5 hover:bg-slate-100 cursor-pointer transition-colors">
                                <Upload className="h-3 w-3 text-primary" /> Upload
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

                  {/* COLUMN 3: VEHICLE & ODOMETER SELECTION */}
                  <div className="space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                        Vehicle &amp; Odometer Details
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {/* Vehicle Autocomplete Field */}
                      <div className="relative">
                        <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">Vehicle Number <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          placeholder="Type vehicle number e.g. TS09..."
                          value={vehicleNumber}
                          onChange={(e) => handleVehicleInputChange(e.target.value.toUpperCase())}
                          onFocus={() => vehicleNumber.trim().length >= 1 && handleVehicleInputChange(vehicleNumber)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs font-mono font-bold uppercase"
                        />

                        {/* Autocomplete Dropdown Suggestions */}
                        {showVehicleDropdown && vehicleSuggestions.length > 0 && (
                          <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                            {vehicleSuggestions.map((v) => (
                              <button
                                key={v.vehicle_number}
                                type="button"
                                onClick={() => {
                                  setVehicleNumber(v.vehicle_number);
                                  if (v.car_model) setCarModel(v.car_model);
                                  setShowVehicleDropdown(false);
                                }}
                                className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                              >
                                <div>
                                  <span className="font-mono font-extrabold text-xs text-slate-900 block">{v.vehicle_number}</span>
                                  <span className="text-[10px] text-slate-500 font-medium">{v.car_model} · {v.city_name}</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  v.status === 'Ready for Deployment' 
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                  {v.status}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Odometer Reading Input */}
                      <div>
                        <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">Odometer Reading (in KM) <span className="text-red-500">*</span></label>
                        <input 
                          type="number"
                          placeholder="e.g. 14250..."
                          value={odometerReading}
                          onChange={(e) => setOdometerReading(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs font-mono font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">GPS Active <span className="text-red-500">*</span></label>
                        <select
                          value={gpsActive}
                          onChange={(e) => setGpsActive(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer font-semibold"
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      {/* Odometer Photo Card */}
                      <div className="flex flex-col gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 shadow-2xs mt-2">
                        <span className="font-sans text-xs font-bold text-slate-800 text-center">Odometer Photo *</span>
                        {odometerPhoto ? (
                          <div className="relative flex items-center justify-center bg-white rounded-lg p-1 border border-slate-200">
                            <img src={odometerPhoto} alt="Odometer" className="max-h-24 object-contain rounded" />
                            <button type="button" onClick={() => setOdometerPhoto(null)} className="absolute top-1 right-1 rounded-full bg-rose-50 text-rose-500 p-1 hover:bg-rose-100 cursor-pointer shadow-xs"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setActiveCameraTarget("odometer")} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary text-white text-xs font-bold py-2 hover:bg-primary-dark cursor-pointer transition-colors shadow-xs"><Camera className="h-3.5 w-3.5" /> Capture</button>
                            <label className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold py-2 hover:bg-slate-100 cursor-pointer transition-colors shadow-2xs">
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

                {/* 4. CAR CONDITION PHOTOS */}
                <div className="border-t border-border pt-10 space-y-6">
                  <div className="border-b border-border pb-3">
                    <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
                      Car Condition Photos <span className="text-red-500">*</span>
                    </h3>
                    <p className="font-sans text-xs text-text-muted mt-1">Upload mandatory photos recording the vehicle's condition prior to handover.</p>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                    {[
                      { label: "Left-Hand (LH) Side", state: photoLhSide, setState: setPhotoLhSide, target: "lhSide" },
                      { label: "Right-Hand (RH) Side", state: photoRhSide, setState: setPhotoRhSide, target: "rhSide" },
                      { label: "Front Side", state: photoFrontSide, setState: setPhotoFrontSide, target: "frontSide" },
                      { label: "Back Side", state: photoBackSide, setState: setPhotoBackSide, target: "backSide" },
                      { label: "Battery Photo Upload", state: batteryPhoto, setState: setBatteryPhoto, target: "battery" }
                    ].map((ph) => (
                      <div key={ph.label} className="space-y-2">
                        <span className="block font-sans text-xs font-bold text-text-muted">{ph.label} <span className="text-red-500">*</span></span>
                        <div className="w-full rounded-2xl border border-dashed border-border bg-bg/30 p-4 text-center hover:bg-bg/50 transition-all shadow-2xs">
                          {ph.state ? (
                            <div className="relative inline-block">
                              <img 
                                src={ph.state} 
                                alt={ph.label} 
                                className="h-28 w-auto object-cover rounded-xl border border-border shadow-xs"
                              />
                              <button 
                                type="button"
                                onClick={() => ph.setState(null)}
                                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white border border-white hover:bg-red-700 shadow-xs cursor-pointer"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3 py-2">
                              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Upload className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col gap-2 justify-center items-center">
                                <button
                                  type="button"
                                  onClick={() => setActiveCameraTarget(ph.target as any)}
                                  className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 font-sans text-[10px] font-bold text-white hover:bg-primary-hover shadow-xs cursor-pointer"
                                >
                                  <Camera className="h-3 w-3" />
                                  Capture
                                </button>
                                <label className="flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 font-sans text-[10px] font-bold text-text-muted hover:bg-bg cursor-pointer transition-colors shadow-2xs">
                                  <Upload className="h-3 w-3" />
                                  Upload
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const r = new FileReader();
                                        r.onloadend = () => { if (typeof r.result === "string") ph.setState(r.result); };
                                        r.readAsDataURL(file);
                                      }
                                    }} 
                                    className="hidden" 
                                  />
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. GIVEN VEHICLE INSPECTION CHECKLIST */}
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

                      <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-slate-50/50">
                        <span className="font-sans text-xs font-bold text-text">Music System</span>
                        <div className="flex gap-2">
                          {["Available", "Not Available"].map((opt) => (
                            <button key={opt} type="button" onClick={() => setMusicSystem(opt)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${musicSystem === opt ? "bg-green-light border-green/30 text-green" : "bg-white border-border text-text-muted"}`}>{opt}</button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block font-sans text-[10px] font-bold text-text-muted mb-1">Inspection Remarks (Allocated Car)</label>
                        <input type="text" value={inspectionRemarks} onChange={(e) => setInspectionRemarks(e.target.value)} placeholder="Condition details..." className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs focus:outline-none focus:border-primary font-semibold" />
                      </div>
                    </div>
                  </div>
                </div>



                {/* FORM ACTIONS */}
                <div className="flex items-center justify-between border-t border-border pt-6 mt-8">
                  <p className="text-[10px] font-bold text-red-500">* Mandatory Fields</p>
                  <div className="flex gap-3">
                    {editingId ? (
                      <button 
                        type="button" 
                        onClick={() => { resetForm(); setActiveTab("registry"); }} 
                        className="h-11 rounded-lg border border-border bg-white px-5 font-sans text-sm font-semibold text-text-muted hover:bg-slate-100 cursor-pointer transition-colors"
                      >
                        Cancel Edit
                      </button>
                    ) : (
                      <button 
                        type="button" 
                        onClick={resetForm} 
                        className="h-11 rounded-lg border border-border bg-white px-5 font-sans text-sm font-semibold text-text-muted hover:bg-slate-100 cursor-pointer transition-colors"
                      >
                        Reset Form
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleSubmit(e, "Draft")}
                      className="h-11 rounded-lg border border-border bg-white px-5 font-sans text-sm font-semibold text-text-muted hover:bg-slate-100 cursor-pointer transition-colors"
                    >
                      Save as Draft
                    </button>
                    <button 
                      type="submit" 
                      onClick={(e) => handleSubmit(e, "Submitted")}
                      className="h-11 rounded-lg bg-primary hover:bg-primary-hover text-white px-6 font-sans text-sm font-semibold shadow-md cursor-pointer transition-colors"
                    >
                      {editingId ? "Update Allocation Entry" : "Save Allocation Entry"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 1.5: SAVED DRAFTS */}
        {activeTab === "drafts" && (
          <div className="space-y-6">
            
            {/* Bento Grid Metrics for Drafts */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-amber-800 uppercase tracking-wider">Total Saved Drafts</span>
                  <span className="font-sans text-3xl font-extrabold text-amber-700 mt-1">
                    {records.filter(r => r.status === "Draft").length}
                  </span>
                  <span className="font-sans text-[10px] text-amber-600 mt-1">Unsent allocation forms saved locally</span>
                </div>
                <div className="rounded-xl bg-amber-100 text-amber-700 p-3">
                  <Clock className="h-6 w-6" />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-text-dim uppercase tracking-wider">In Progress Allocations</span>
                  <span className="font-sans text-3xl font-extrabold text-primary mt-1">
                    {records.filter(r => r.status === "Draft").length}
                  </span>
                  <span className="font-sans text-[10px] text-text-muted mt-1">Saved as draft entries</span>
                </div>
                <div className="rounded-xl bg-blue-50 text-primary p-3">
                  <Settings className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Drafts List Table */}
            <div className="bg-surface rounded-2xl shadow-sm border border-border/60 overflow-hidden relative">
              <div className="bg-white p-6 border-b border-border/40 flex justify-between items-center">
                <div>
                  <h2 className="font-display text-xl font-bold text-primary flex items-center gap-2">
                    <Clock className="h-6 w-6 text-amber-600" />
                    Saved Draft Records
                  </h2>
                  <p className="font-sans text-sm text-text-muted mt-1">Unsent vehicle allocations. Click 'Edit Draft' to complete and save entry.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { resetForm(); setActiveTab("form"); }}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-green hover:bg-green/95 px-4 font-sans text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" /> New Allocation Entry
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap border-collapse">
                  <thead className="bg-slate-50 border-b border-border/60">
                    <tr>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim text-left">Draft ID</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim text-left">Driver Name</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim text-left">Vehicle No &amp; City</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim text-left">Type &amp; Plan</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim text-left">Status</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {records.filter(r => r.status === "Draft").length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-text-muted font-sans bg-slate-50/50">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <CheckCircle className="h-8 w-8 text-emerald-500 mb-2 opacity-60" />
                            <p className="font-semibold text-slate-800">No saved drafts found!</p>
                            <p className="text-xs">All records have been saved to registry.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      records.filter(r => r.status === "Draft").map((r) => {
                        const appStatus = r.status || "Draft";

                        return (
                          <tr key={r.id} className="hover:bg-amber-50/20 transition-colors group">
                            <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900">
                              #{r.id}
                            </td>
                            <td className="px-6 py-4 font-sans text-sm font-bold text-slate-900">
                              {r.driver_name || "—"}
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-sans text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                                {r.vehicle_number || "—"} · <strong className="text-slate-600">{r.city || "—"}</strong>
                              </span>
                            </td>
                            <td className="px-6 py-4 font-sans text-xs font-semibold text-text">
                              {r.allocation_type || "Allocation"} · <strong className="text-slate-500">{r.plan_name || "—"}</strong>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                {appStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => loadRecordForEdit(r.id)}
                                  className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-amber-50 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                  title="Edit / Open Draft"
                                >
                                  <Edit className="w-3.5 h-3.5 text-amber-600" /> Edit Draft
                                </button>
                                <button 
                                  onClick={() => handleDelete(r.id, r.driver_name)}
                                  className="h-8 w-8 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete Draft"
                                >
                                  <Trash2 className="h-4 w-4" />
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
            </div>
          </div>
        )}

        {activeTab === "registry" && (
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
            <div className="rounded-2xl border border-border bg-white shadow-xs overflow-hidden">
              
              <div className="border-b border-border p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-sans text-lg font-bold text-slate-900 tracking-tight">Allocation Registry</h3>
                  <p className="font-sans text-xs text-text-muted mt-1">Audit log of all vehicle allocations, swaps, and returns</p>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={handleExportCSV}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-white hover:bg-slate-50 px-4 font-sans text-xs font-semibold text-text-muted transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                  <button 
                    onClick={() => {
                      resetForm();
                      setActiveTab("form");
                    }}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary hover:bg-primary-hover px-4 font-sans text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="h-4 w-4" />
                    Add Allocation
                  </button>
                </div>
              </div>

              {/* FILTER TOOLBAR */}
              <div className="bg-white border-b border-border p-4 grid grid-cols-1 gap-3 sm:grid-cols-3 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
                  <input 
                    type="text" 
                    placeholder="Search name, code, phone, vehicle..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border pl-9 pr-4 font-sans text-xs text-text bg-white outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="relative">
                  <select 
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border px-3 font-sans text-xs text-text bg-white outline-none focus:border-primary cursor-pointer"
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
                    className="h-10 w-full rounded-lg border border-border px-3 font-sans text-xs text-text bg-white outline-none focus:border-primary cursor-pointer"
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
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border/60">
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Driver Name</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Driver ID</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">City</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Car Allocated</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Allocation Type</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Time</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Allocated By</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-6 py-12 text-center text-text-muted font-sans bg-slate-50/50 text-[11px]">
                          No matching allocation records found in the database.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((r: any) => {
                        const formattedTime = r.created_at 
                          ? new Date(r.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) 
                          : "10:30 AM";
                        const allocatedBy = r.created_by || r.allocated_by || r.executive_name || user.name || user.username || "Admin";
                        
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3.5 font-sans text-xs font-semibold text-slate-700">#{r.id}</td>
                            <td className="px-4 py-3.5 font-sans text-xs font-semibold text-slate-900">{r.driver_name || "-"}</td>
                            <td className="px-4 py-3.5 font-sans text-xs text-slate-600">{r.driver_id || "-"}</td>
                            <td className="px-4 py-3.5 font-sans text-xs text-slate-600">{r.driver_phone || "-"}</td>
                            <td className="px-4 py-3.5 font-sans text-xs font-medium text-slate-800">{r.city_name || "-"}</td>
                            <td className="px-4 py-3.5 font-sans text-xs font-bold text-slate-900">{r.vehicle_number || "-"}</td>
                            <td className="px-4 py-3.5 font-sans text-xs font-medium text-slate-700">
                              {r.allocation_type || "New Allocation"}
                            </td>
                            <td className="px-4 py-3.5 font-sans text-xs text-slate-700">{r.driver_plan || r.type_of_plan || "-"}</td>
                            <td className="px-4 py-3.5 font-sans text-xs text-slate-600">{r.allocation_date || "-"}</td>
                            <td className="px-4 py-3.5 font-sans text-xs text-slate-600">{formattedTime}</td>
                            <td className="px-4 py-3.5 font-sans text-xs text-slate-700 font-medium">{allocatedBy}</td>
                            <td className="px-4 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button 
                                  onClick={() => loadRecordForEdit(r.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Edit Allocation"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(r.id, r.driver_name)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete Allocation"
                                >
                                  <Trash2 className="h-4 w-4" />
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
              <div className="flex items-center justify-between border-t border-border/60 bg-slate-50/50 px-6 py-3 font-sans text-xs text-slate-500">
                <span>Showing {filteredRecords.length} of {records.length} database entries</span>
                <span className="font-mono text-[11px]">Database Engine: PostgreSQL</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Camera Capture Modal */}
      {(cameraActive || activeCameraTarget) && (
        <CameraCapture 
          title="Capture Photo"
          onCapture={(base64) => {
            if (activeCameraTarget === "olaProof") setOlaNegativeBalanceProof(base64);
            else if (activeCameraTarget === "odometer") setOdometerPhoto(base64);
            else if (activeCameraTarget === "battery") setBatteryPhoto(base64);
            else if (activeCameraTarget === "lhSide") setPhotoLhSide(base64);
            else if (activeCameraTarget === "rhSide") setPhotoRhSide(base64);
            else if (activeCameraTarget === "frontSide") setPhotoFrontSide(base64);
            else if (activeCameraTarget === "backSide") setPhotoBackSide(base64);
            
            setCameraActive(false);
            setActiveCameraTarget(null);
          }}
          onClose={() => {
            setCameraActive(false);
            setActiveCameraTarget(null);
          }}
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
