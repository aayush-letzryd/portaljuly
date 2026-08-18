import React, { useState, useMemo, useEffect } from "react";
import { 
  Calendar, MapPin, User, Phone, FileText, CheckCircle, 
  Clock, ArrowLeft, Download, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, Key, Plus, ChevronLeft, ChevronRight, Settings, Database
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
  const [stepney, setStepney] = useState("Available");
  const [stepneyPhoto, setStepneyPhoto] = useState<string | null>(null);
  const [inspectionRemarks, setInspectionRemarks] = useState("");

  // Additional Allocation / Audit Requirements
  const [hubName, setHubName] = useState("Miyapur Hub");
  const [customerAddress, setCustomerAddress] = useState("");
  const [jamaFormFilled, setJamaFormFilled] = useState(true);
  const [pdiCompleted, setPdiCompleted] = useState(false);

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
    "lhSide" | "rhSide" | "frontSide" | "backSide" | "olaProof" | "odometer" | "battery" | "stepney" | null
  >(null);

  // Registry Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterTime, setFilterTime] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [draftPage, setDraftPage] = useState(1);
  const PAGE_SIZE = 10;
  
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

  const [draftRecords, setDraftRecords] = useState<any[]>([]);

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const [resReg, resDrafts] = await Promise.all([
        fetch("/api/allocation", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("/api/allocation?status=Draft", { headers: { "Authorization": `Bearer ${token}` } })
      ]);
      if (resReg.ok) {
        const data = await resReg.json();
        setRecords(data);
      }
      if (resDrafts.ok) {
        const drafts = await resDrafts.json();
        setDraftRecords(drafts);
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
      setDriverId(data.driver_id != null ? String(data.driver_id) : "");
      setDriverName(data.driver_name != null ? String(data.driver_name) : "");
      setDriverPhone(data.driver_phone != null ? String(data.driver_phone) : "");
      setDriverPlan(data.driver_plan != null ? String(data.driver_plan) : "");
      setTypeOfPlan(data.type_of_plan != null ? String(data.type_of_plan) : "");
      setCarModel(data.car_model != null ? String(data.car_model) : "");
      setVehicleNumber(data.vehicle_number != null ? String(data.vehicle_number) : "");
      setOdometerReading(data.odometer_reading != null ? String(data.odometer_reading) : "");
      setOdometerPhoto(data.odometer_photo || null);
      setBatteryPhoto(data.battery_photo || null);
      setOlaNegativeBalance(data.ola_negative_balance != null ? String(data.ola_negative_balance) : "");
      setOlaNegativeBalanceProof(data.ola_negative_balance_proof || null);
      setGpsActive(data.gps_active || "Yes");
      setPhotoLhSide(data.photo_lh_side || null);
      setPhotoRhSide(data.photo_rh_side || null);
      setPhotoFrontSide(data.photo_front_side || null);
      setPhotoBackSide(data.photo_back_side || null);

      // Populate Vehicle Inspection States from draft/allocation record
      setJack(data.insp_jack || "Available");
      setJackRod(data.insp_jack_rod || "Available");
      setSpanner(data.insp_spanner || "Available");
      setParkingTriangle(data.insp_parking_triangle || "Available");
      setFireExtinguishers(data.insp_fire_extinguishers || "Available");
      setSeatCover(data.insp_seat_cover || "Available");
      setFloorCarpet(data.insp_floor_carpet || "Available");
      setMusicSystem(data.insp_music_system || "Available");
      setStepney(data.insp_stepney || "Available");
      setStepneyPhoto(data.insp_stepney_photo || null);
      setInspectionRemarks(data.insp_remarks || "");
      
      setHubName(data.hub_name || "Miyapur Hub");
      setCustomerAddress(data.customer_address || "");
      setJamaFormFilled(data.jama_form_filled !== undefined ? data.jama_form_filled : true);
      setPdiCompleted(data.pdi_completed !== undefined ? data.pdi_completed : false);

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
    setStepney("Available");
    setStepneyPhoto(null);
    setInspectionRemarks("");
    setHubName("Miyapur Hub");
    setCustomerAddress("");
    setJamaFormFilled(true);
    setPdiCompleted(false);
    setDriverLookupStatus("");
    setShowVehicleDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent, targetStatus: "Draft" | "Submitted" = "Submitted") => {
    e.preventDefault();
    const isDraft = targetStatus === "Draft";

    if (!isDraft) {
      if (!String(driverId || "").trim()) return alert("Driver ID is required");
      if (!String(driverName || "").trim()) return alert("Driver Name is required");
      
      const cleanPhone = String(driverPhone || "").replace(/\D/g, "");
      if (!cleanPhone || cleanPhone.length < 10) return alert("Please enter a valid 10-digit driver phone number");
      if (!String(vehicleNumber || "").trim()) return alert("Vehicle registration number is required");

      if (!jamaFormFilled) {
        return alert("Allocation cannot happen until the Jama Form is filled.");
      }

      if (!customerAddress || !customerAddress.trim()) {
        return alert("Customer address is mandatory for recovery and allocation.");
      }

      if (!pdiCompleted && stepney === "Available" && !stepneyPhoto) {
        return alert("Stepney photo is required for vehicle inspection before allocation.");
      }
    }

    try {
      const token = localStorage.getItem("lr_token");

      // Optional Inspection Log Creation
      if (vehicleNumber && !isDraft) {
        await fetch("/api/inspection", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            vehicle_number: String(vehicleNumber).trim().toUpperCase(),
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
            stepney,
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
        driver_id: String(driverId || "").trim(),
        driver_name: String(driverName || "").trim(),
        driver_phone: String(driverPhone || "").trim(),
        driver_plan: String(driverPlan || "").trim() || null,
        type_of_plan: String(typeOfPlan || "").trim() || null,
        car_model: String(carModel || "").trim() || null,
        vehicle_number: String(vehicleNumber || "").trim().toUpperCase(),
        odometer_reading: odometerReading ? parseFloat(String(odometerReading)) : null,
        odometer_photo: odometerPhoto,
        battery_photo: batteryPhoto,
        gps_active: gpsActive,
        ola_negative_balance: String(olaNegativeBalance || "").trim() || null,
        ola_negative_balance_proof: olaNegativeBalanceProof,
        photo_lh_side: photoLhSide,
        photo_rh_side: photoRhSide,
        photo_front_side: photoFrontSide,
        photo_back_side: photoBackSide,
        insp_jack: jack,
        insp_jack_rod: jackRod,
        insp_spanner: spanner,
        insp_parking_triangle: parkingTriangle,
        insp_fire_extinguishers: fireExtinguishers,
        insp_seat_cover: seatCover,
        insp_floor_carpet: floorCarpet,
        insp_music_system: musicSystem,
        insp_stepney: stepney,
        insp_stepney_photo: stepneyPhoto,
        insp_remarks: inspectionRemarks,
        hub_name: hubName,
        customer_address: customerAddress,
        jama_form_filled: jamaFormFilled,
        pdi_completed: pdiCompleted,
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

      alert(isDraft ? (editingId ? "Draft Allocation Updated Successfully!" : "Draft Allocation Saved Successfully!") : (editingId ? "Vehicle Allocation Record Updated Successfully!" : "Vehicle Allocation Saved Successfully!"));
      resetForm();
      fetchStats();
      fetchRecords();
      setActiveTab(isDraft ? "drafts" : "registry");
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
    const now = new Date();
    return records
      .filter((r) => {
        // City filter (case-insensitive)
        if (filterCity !== "all" && (r.city_name || "").toLowerCase() !== filterCity.toLowerCase()) return false;
        // Type filter (case-insensitive)
        if (filterType !== "all" && (r.allocation_type || "").toLowerCase() !== filterType.toLowerCase()) return false;
        // Time filter
        if (filterTime !== "all") {
          const recDate = new Date(r.created_at || r.updated_at || 0);
          if (filterTime === "today") {
            if (recDate.toDateString() !== now.toDateString()) return false;
          } else if (filterTime === "week") {
            const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
            if (recDate < weekAgo) return false;
          } else if (filterTime === "month") {
            const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1);
            if (recDate < monthAgo) return false;
          }
        }
        // Search query
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
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.updated_at || 0).getTime();
        const dateB = new Date(b.created_at || b.updated_at || 0).getTime();
        return dateB - dateA;
      });
  }, [records, searchQuery, filterCity, filterType, filterTime]);

  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const draftTotalPages = Math.ceil(draftRecords.length / PAGE_SIZE) || 1;
  const paginatedDrafts = draftRecords.slice((draftPage - 1) * PAGE_SIZE, draftPage * PAGE_SIZE);

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
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
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
              {draftRecords.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-extrabold">
                  {draftRecords.length}
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
      <main className="flex-grow max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
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
                  <div className="space-y-5">
                    <div className="border-b border-slate-200 pb-2.5">
                      <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">1</span>
                        Allocation Details
                      </h3>
                    </div>

                    <div className="space-y-3.5">
                      <div>
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Transaction Type <span className="text-red-500">*</span></label>
                        <select
                          value={transactionType}
                          onChange={(e) => setTransactionType(e.target.value as any)}
                          required
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs cursor-pointer"
                        >
                          <option value="New Allocation">New Allocation</option>
                          <option value="Reallocation">Reallocation</option>
                          <option value="Rejoining">Rejoining</option>
                          <option value="Swap">Swap</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Date of Allocation <span className="text-red-500">*</span></label>
                        <input 
                          type="date" 
                          value={allocationDate}
                          onChange={(e) => setAllocationDate(e.target.value)}
                          required
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Operating City <span className="text-red-500">*</span></label>
                        <select 
                          value={cityName}
                          onChange={(e) => setCityName(e.target.value)}
                          required
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs cursor-pointer"
                        >
                          {CITIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.text}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Hub Name <span className="text-red-500">*</span></label>
                        <select 
                          value={hubName}
                          onChange={(e) => setHubName(e.target.value)}
                          required
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs cursor-pointer"
                        >
                          <option value="Miyapur Hub">Miyapur Hub</option>
                          <option value="Kukatpally Hub">Kukatpally Hub</option>
                          <option value="Secunderabad Hub">Secunderabad Hub</option>
                          <option value="LB Nagar Hub">LB Nagar Hub</option>
                          <option value="Gachibowli Hub">Gachibowli Hub</option>
                          <option value="Other Hub">Other Hub</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 2: DRIVER INFORMATION */}
                  <div className="space-y-5">
                    <div className="border-b border-slate-200 pb-2.5">
                      <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">2</span>
                        Driver Information
                      </h3>
                    </div>

                    <div className="space-y-3.5">
                      {driverLookupStatus && (
                        <div className={`p-2.5 rounded-lg text-xs font-medium ${driverLookupStatus.includes("Found") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
                          {driverLookupStatus}
                        </div>
                      )}

                      {/* Jama Form Status Check Banner */}
                      <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70">
                        <div>
                          <span className="block font-sans text-xs font-bold text-slate-900">Jama Form Filled <span className="text-red-500">*</span></span>
                          <span className="block text-[10px] text-slate-500">Must be completed before vehicle allocation</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={jamaFormFilled} 
                            onChange={(e) => setJamaFormFilled(e.target.checked)} 
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Customer Address (Mandatory for Recovery) <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          placeholder="Complete address for recovery..."
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          required
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Driver Phone Number <span className="text-red-500">*</span></label>
                        <div className="flex gap-2">
                          <input 
                            type="tel" 
                            placeholder="10-digit phone number..."
                            maxLength={10}
                            value={driverPhone}
                            onChange={(e) => setDriverPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            onBlur={() => driverPhone.length === 10 && handleFetchDriver(driverPhone)}
                            required
                            className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleFetchDriver(driverPhone)}
                            className="px-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                          >
                            Fetch
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Operator / Driver ID <span className="text-red-500">*</span></label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="e.g. LR-4091..."
                            value={driverId}
                            onChange={(e) => setDriverId(e.target.value)}
                            onBlur={() => driverId.trim().length >= 3 && handleFetchDriver(driverId)}
                            required
                            className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleFetchDriver(driverId)}
                            className="px-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                          >
                            Fetch
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Driver Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          placeholder="Enter full name..."
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          required
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Driver Rental Plan <span className="text-red-500">*</span></label>
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
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs cursor-pointer"
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
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">OLA Negative Balance (₹)</label>
                        <input 
                          type="number"
                          placeholder="e.g. 1500 (if any)..."
                          value={olaNegativeBalance}
                          onChange={(e) => setOlaNegativeBalance(e.target.value)}
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs"
                        />
                      </div>

                      {/* OLA Balance Proof Photo Card */}
                      <div>
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">OLA Balance Proof Photo</label>
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3 shadow-2xs">
                          {olaNegativeBalanceProof ? (
                            <div className="relative flex items-center justify-center bg-white rounded-lg p-1 border border-slate-200">
                              <img src={olaNegativeBalanceProof} alt="OLA Balance Proof" className="max-h-20 object-contain rounded" />
                              <button type="button" onClick={() => setOlaNegativeBalanceProof(null)} className="absolute top-1 right-1 rounded-full bg-rose-50 text-rose-500 p-1 hover:bg-rose-100 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => setActiveCameraTarget("olaProof")} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-600 text-white text-[11px] font-medium py-1.5 hover:bg-emerald-700 cursor-pointer transition-colors shadow-2xs"><Camera className="h-3 w-3" /> Capture</button>
                              <label className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-[11px] font-medium py-1.5 hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs">
                                <Upload className="h-3 w-3 text-emerald-600" /> Upload
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
                  <div className="space-y-5">
                    <div className="border-b border-slate-200 pb-2.5">
                      <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">3</span>
                        Vehicle &amp; Odometer Details
                      </h3>
                    </div>

                    <div className="space-y-3.5">
                      {/* Vehicle Autocomplete Field */}
                      <div className="relative">
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Vehicle Number <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          placeholder="Type vehicle number e.g. TS09..."
                          value={vehicleNumber}
                          onChange={(e) => handleVehicleInputChange(e.target.value.toUpperCase())}
                          onFocus={() => vehicleNumber.trim().length >= 1 && handleVehicleInputChange(vehicleNumber)}
                          required
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium uppercase text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs"
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
                                  <span className="font-sans font-bold text-xs text-slate-900 block">{v.vehicle_number}</span>
                                  <span className="text-[10px] text-slate-500 font-medium">{v.car_model} · {v.city_name}</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
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
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Odometer Reading (in KM) <span className="text-red-500">*</span></label>
                        <input 
                          type="number"
                          placeholder="e.g. 14250..."
                          value={odometerReading}
                          onChange={(e) => setOdometerReading(e.target.value)}
                          required
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">GPS Active <span className="text-red-500">*</span></label>
                        <select
                          value={gpsActive}
                          onChange={(e) => setGpsActive(e.target.value)}
                          required
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs cursor-pointer"
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      {/* Odometer Photo Card */}
                      <div className="flex flex-col gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3 shadow-2xs mt-2">
                        <span className="font-sans text-xs font-medium text-slate-700 text-center">Odometer Photo *</span>
                        {odometerPhoto ? (
                          <div className="relative flex items-center justify-center bg-white rounded-lg p-1 border border-slate-200">
                            <img src={odometerPhoto} alt="Odometer" className="max-h-24 object-contain rounded" />
                            <button type="button" onClick={() => setOdometerPhoto(null)} className="absolute top-1 right-1 rounded-full bg-rose-50 text-rose-500 p-1 hover:bg-rose-100 cursor-pointer shadow-xs"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setActiveCameraTarget("odometer")} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-600 text-white text-[11px] font-medium py-1.5 hover:bg-emerald-700 cursor-pointer transition-colors shadow-2xs"><Camera className="h-3.5 w-3.5" /> Capture</button>
                            <label className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-[11px] font-medium py-1.5 hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs">
                              <Upload className="h-3.5 w-3.5 text-emerald-600" /> Upload
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
                <div className="border-t border-slate-200 pt-8 space-y-5">
                  <div className="border-b border-slate-200 pb-2.5">
                    <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">4</span>
                      Car Condition Photos <span className="text-red-500">*</span>
                    </h3>
                    <p className="font-sans text-xs text-slate-500 mt-1">Upload mandatory photos recording the vehicle's condition prior to handover.</p>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                      { label: "Left-Hand (LH) Side", state: photoLhSide, setState: setPhotoLhSide, target: "lhSide" },
                      { label: "Right-Hand (RH) Side", state: photoRhSide, setState: setPhotoRhSide, target: "rhSide" },
                      { label: "Front Side", state: photoFrontSide, setState: setPhotoFrontSide, target: "frontSide" },
                      { label: "Back Side", state: photoBackSide, setState: setPhotoBackSide, target: "backSide" },
                      { label: "Battery Photo Upload", state: batteryPhoto, setState: setBatteryPhoto, target: "battery" }
                    ].map((ph) => (
                      <div key={ph.label} className="space-y-1.5">
                        <span className="block font-sans text-xs font-medium text-slate-700">{ph.label} <span className="text-red-500">*</span></span>
                        <div className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3 text-center hover:bg-slate-100/50 transition-all shadow-2xs">
                          {ph.state ? (
                            <div className="relative inline-block">
                              <img 
                                src={ph.state} 
                                alt={ph.label} 
                                className="h-28 w-auto object-cover rounded-xl border border-slate-200 shadow-xs"
                              />
                              <button 
                                type="button"
                                onClick={() => ph.setState(null)}
                                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white border border-white hover:bg-rose-700 shadow-xs cursor-pointer"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2 py-1">
                              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                <Upload className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col gap-1.5 justify-center items-center">
                                <button
                                  type="button"
                                  onClick={() => setActiveCameraTarget(ph.target as any)}
                                  className="w-full flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 font-sans text-[11px] font-medium text-white hover:bg-emerald-700 shadow-2xs cursor-pointer"
                                >
                                  <Camera className="h-3 w-3" />
                                  Capture
                                </button>
                                <label className="w-full flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 font-sans text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs">
                                  <Upload className="h-3 w-3 text-emerald-600" />
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
                <div className="border-t border-slate-200 pt-8 space-y-5">
                  <div className="border-b border-slate-200 pb-2.5 flex items-center justify-between">
                    <div>
                      <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">5</span>
                        Inspection Checklist: Allocated Car ({vehicleNumber || "No vehicle entered"})
                      </h3>
                    </div>

                    {/* First allocation after PDI / Showroom audit auto-bypass banner */}
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={pdiCompleted}
                          onChange={(e) => setPdiCompleted(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        First Allocation After PDI (Auto-Bypass Inspection)
                      </label>
                    </div>
                  </div>

                  {pdiCompleted ? (
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-900 flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div className="text-xs">
                        <span className="font-bold block">Pre-Delivery Inspection (PDI) Completed at Showroom</span>
                        <span>This vehicle is new and its audit form is already complete. Re-inspection before allocation is automatically bypassed.</span>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                        <span className="font-sans text-xs font-medium text-slate-800">Jack</span>
                        <div className="flex gap-2">
                          {["Available", "Not Available"].map((opt) => (
                            <button key={opt} type="button" onClick={() => setJack(opt)} className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${jack === opt ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-white border-slate-200 text-slate-600"}`}>{opt}</button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                        <span className="font-sans text-xs font-medium text-slate-800">Jack Rod</span>
                        <div className="flex gap-2">
                          {["Available", "Not Available"].map((opt) => (
                            <button key={opt} type="button" onClick={() => setJackRod(opt)} className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${jackRod === opt ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-white border-slate-200 text-slate-600"}`}>{opt}</button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                        <span className="font-sans text-xs font-medium text-slate-800">Spanner</span>
                        <div className="flex gap-2">
                          {["Available", "Not Available"].map((opt) => (
                            <button key={opt} type="button" onClick={() => setSpanner(opt)} className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${spanner === opt ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-white border-slate-200 text-slate-600"}`}>{opt}</button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                        <span className="font-sans text-xs font-medium text-slate-800">Parking Triangle</span>
                        <div className="flex gap-2">
                          {["Available", "Not Available"].map((opt) => (
                            <button key={opt} type="button" onClick={() => setParkingTriangle(opt)} className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${parkingTriangle === opt ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-white border-slate-200 text-slate-600"}`}>{opt}</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                        <span className="font-sans text-xs font-medium text-slate-800">Fire Extinguisher</span>
                        <div className="flex gap-2">
                          {["Available", "Not Available"].map((opt) => (
                            <button key={opt} type="button" onClick={() => setFireExtinguishers(opt)} className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${fireExtinguishers === opt ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-white border-slate-200 text-slate-600"}`}>{opt}</button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                        <span className="font-sans text-xs font-medium text-slate-800">Seat Covers</span>
                        <div className="flex gap-2">
                          {["Available", "Not Available"].map((opt) => (
                            <button key={opt} type="button" onClick={() => setSeatCover(opt)} className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${seatCover === opt ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-white border-slate-200 text-slate-600"}`}>{opt}</button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                        <span className="font-sans text-xs font-medium text-slate-800">Floor Carpets</span>
                        <div className="flex gap-2">
                          {["Available", "Not Available"].map((opt) => (
                            <button key={opt} type="button" onClick={() => setFloorCarpet(opt)} className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${floorCarpet === opt ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-white border-slate-200 text-slate-600"}`}>{opt}</button>
                          ))}
                        </div>
                      </div>

                      {/* Stepney / Spare Tire Selection & Mandatory Photo */}
                      <div className="flex flex-col gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                        <div className="flex items-center justify-between">
                          <span className="font-sans text-xs font-medium text-slate-800">Stepney / Spare Tire</span>
                          <div className="flex gap-2">
                            {["Available", "Not Available"].map((opt) => (
                              <button key={opt} type="button" onClick={() => setStepney(opt)} className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${stepney === opt ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-white border-slate-200 text-slate-600"}`}>{opt}</button>
                            ))}
                          </div>
                        </div>

                        {stepney === "Available" && (
                          <div className="mt-1 pt-2 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-[11px] font-medium text-slate-700">Stepney Photo <span className="text-red-500">*</span></span>
                            {stepneyPhoto ? (
                              <div className="relative flex items-center gap-2 bg-white rounded-lg p-1 border border-slate-200">
                                <img src={stepneyPhoto} alt="Stepney Photo" className="h-10 w-12 object-cover rounded" />
                                <button type="button" onClick={() => setStepneyPhoto(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button type="button" onClick={() => setActiveCameraTarget("stepney")} className="flex items-center gap-1 rounded-lg bg-emerald-600 text-white text-[10px] font-medium px-2.5 py-1 hover:bg-emerald-700 cursor-pointer shadow-2xs transition-colors"><Camera className="h-3 w-3" /> Capture</button>
                                <label className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-[10px] font-medium px-2.5 py-1 hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs">
                                  <Upload className="h-3 w-3 text-emerald-600" /> Upload
                                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const r = new FileReader();
                                      r.onloadend = () => { if (typeof r.result === "string") setStepneyPhoto(r.result); };
                                      r.readAsDataURL(file);
                                    }
                                  }} />
                                </label>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                        <span className="font-sans text-xs font-medium text-slate-800">Music System</span>
                        <div className="flex gap-2">
                          {["Available", "Not Available"].map((opt) => (
                            <button key={opt} type="button" onClick={() => setMusicSystem(opt)} className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${musicSystem === opt ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-white border-slate-200 text-slate-600"}`}>{opt}</button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Inspection Remarks (Allocated Car)</label>
                        <input type="text" value={inspectionRemarks} onChange={(e) => setInspectionRemarks(e.target.value)} placeholder="Condition details..." className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20" />
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
            {/* Drafts List Table Card */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="border-b border-slate-200 p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-sans text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-600" />
                    Saved Draft Records
                  </h3>
                  <p className="font-sans text-xs text-slate-500 mt-1">Audit log of all unsent vehicle allocation drafts. Click edit button to complete entry.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { resetForm(); setActiveTab("form"); }}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 font-sans text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" /> New Allocation Entry
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">DRAFT ID</th>
                      <th className="px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">DRIVER NAME</th>
                      <th className="px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">DRIVER ID</th>
                      <th className="px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">CITY</th>
                      <th className="px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">CONTACT</th>
                      <th className="px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">VEHICLE NO</th>
                      <th className="px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">TRANSACTION TYPE</th>
                      <th className="px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">RECORDED BY</th>
                      <th className="px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">DATE &amp; TIME SAVED</th>
                      <th className="px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {draftRecords.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-slate-500 font-sans bg-slate-50/50 text-xs">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <CheckCircle className="h-8 w-8 text-emerald-500 mb-2 opacity-60" />
                            <p className="font-semibold text-slate-800">No saved drafts found!</p>
                            <p className="text-xs text-slate-500">All vehicle allocation records have been submitted to registry.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedDrafts.map((r: any) => {
                        const rawDate = r.updated_at || r.created_at || r.allocation_date;
                        const datePart = rawDate ? new Date(rawDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        }) : (r.allocation_date || "—");

                        const timePart = rawDate ? new Date(rawDate).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true
                        }).toLowerCase() : "—";

                        // Format Recorded By with line break + ID
                        let rawAllocatedBy = r.allocated_by || r.executive_name;
                        if (!rawAllocatedBy || rawAllocatedBy === "26" || rawAllocatedBy === "20") {
                          rawAllocatedBy = rawAllocatedBy === "20" ? "City Manager 1" : "Onboarding Executive 1";
                        }
                        const creatorId = r.created_by ? `ID: ${r.created_by}` : "ID: 26";

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3.5 font-sans text-xs font-semibold text-slate-700">#{r.id}</td>
                            <td className="px-4 py-3.5 font-sans text-xs font-bold text-slate-900">{r.driver_name || "—"}</td>
                            <td className="px-4 py-3.5 font-sans text-xs font-medium text-slate-600">{r.driver_id || "—"}</td>
                            <td className="px-4 py-3.5 font-sans text-xs font-semibold text-slate-800">{r.city_name || r.city || "—"}</td>
                            <td className="px-4 py-3.5 font-sans text-xs text-slate-600">{r.driver_phone || "—"}</td>
                            <td className="px-4 py-3.5 font-sans text-xs font-bold text-slate-900">{r.vehicle_number || "—"}</td>
                            <td className="px-4 py-3.5 font-sans text-xs font-medium text-slate-700">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-semibold text-[11px]">
                                {r.sub_type || r.allocation_type || "New Allocation"}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-sans text-xs text-slate-800">
                              <span className="font-bold text-slate-900 block">{rawAllocatedBy}</span>
                              <span className="text-[10px] text-slate-400 font-medium block">{creatorId}</span>
                            </td>
                            <td className="px-4 py-3.5 font-sans text-xs text-slate-800">
                              <span className="font-bold text-slate-900 block">{datePart}</span>
                              <span className="text-[10px] text-slate-400 font-medium block">{timePart}</span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button 
                                  onClick={() => loadRecordForEdit(r.id)}
                                  className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
                                  title="Edit / Open Draft"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(r.id, r.driver_name)}
                                  className="h-7 w-7 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-rose-200/60"
                                  title="Delete Draft"
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

              {/* PAGINATION FOOTER */}
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between font-sans text-xs text-slate-500">
                <span>
                  Showing {draftRecords.length === 0 ? 0 : (draftPage - 1) * PAGE_SIZE + 1}–{Math.min(draftPage * PAGE_SIZE, draftRecords.length)} of {draftRecords.length} records
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setDraftPage(p => Math.max(1, p - 1))}
                    disabled={draftPage === 1}
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white disabled:opacity-40 flex items-center gap-1 cursor-pointer hover:bg-slate-100 transition-colors text-slate-600"
                  >
                    <ChevronLeft className="w-3 h-3" /> Prev
                  </button>
                  {Array.from({ length: draftTotalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === draftTotalPages || Math.abs(p - draftPage) <= 1)
                    .reduce<(number | string)[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      typeof p === "string" ? (
                        <span key={`de-${i}`} className="px-1 text-slate-400">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setDraftPage(p)}
                          className={`h-8 w-8 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                            draftPage === p
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )
                  }
                  <button
                    onClick={() => setDraftPage(p => Math.min(draftTotalPages, p + 1))}
                    disabled={draftPage === draftTotalPages || draftRecords.length === 0}
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white disabled:opacity-40 flex items-center gap-1 cursor-pointer hover:bg-slate-100 transition-colors text-slate-600"
                  >
                    Next <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "registry" && (
          /* REGISTRY LOG - WALKIN REGISTRY EXACT LAYOUT MATCH */
          <div className="space-y-6">
            
            {/* TOP SEARCH & FILTER TOOLBAR CARD (EXACT WALKIN REGISTRY MATCH) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
              <div className="relative sm:col-span-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search candidate, phone, DL, ID..." 
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-4 font-sans text-xs text-slate-900 bg-white outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
                />
              </div>

              <div>
                <select 
                  value={filterType}
                  onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 font-sans text-xs text-slate-800 bg-white outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 cursor-pointer"
                >
                  <option value="all">All Allocation Types</option>
                  <option value="New Allocation">New Allocation</option>
                  <option value="Reallocation">Reallocation</option>
                  <option value="Swap">Swap</option>
                  <option value="Rejoining">Rejoining</option>
                </select>
              </div>

              <div>
                <select 
                  value={filterTime}
                  onChange={(e) => { setFilterTime(e.target.value); setCurrentPage(1); }}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 font-sans text-xs text-slate-800 bg-white outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 cursor-pointer"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>

              <div>
                <select 
                  value={filterCity}
                  onChange={(e) => { setFilterCity(e.target.value); setCurrentPage(1); }}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 font-sans text-xs text-slate-800 bg-white outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 cursor-pointer"
                >
                  <option value="all">All Cities</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Bengaluru">Bengaluru</option>
                  <option value="Mumbai">Mumbai</option>
                </select>
              </div>
            </div>

            {/* TABLE CARD */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              
              <div className="border-b border-slate-200 p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-sans text-xl font-bold text-slate-900 tracking-tight">Allocation Registry</h3>
                  <p className="font-sans text-xs text-slate-500 mt-1">Search, Edit, Follow up and review on vehicle allocations</p>
                </div>

                <div className="flex gap-2.5">
                  <button 
                    onClick={handleExportCSV}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 font-sans text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                  <button 
                    onClick={() => {
                      resetForm();
                      setActiveTab("form");
                    }}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 font-sans text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="h-4 w-4" />
                    Add Allocation
                  </button>
                </div>
              </div>

              {/* TABLE CONTAINER */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">ALLOCATION ID</th>
                      <th className="px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">DRIVER NAME</th>
                      <th className="px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">DRIVER ID</th>
                      <th className="px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">CITY</th>
                      <th className="px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">CONTACT</th>
                      <th className="px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">VEHICLE NO</th>
                      <th className="px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">TRANSACTION TYPE</th>
                      <th className="px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">RECORDED BY</th>
                      <th className="px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">DATE &amp; TIME CREATED</th>
                      <th className="px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-slate-500 font-sans bg-slate-50/50 text-xs">
                          No matching allocation records found in the database.
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((r: any) => {
                        const rawDate = r.updated_at || r.created_at || r.allocation_date;
                        const datePart = rawDate ? new Date(rawDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        }) : (r.allocation_date || "—");

                        const timePart = rawDate ? new Date(rawDate).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true
                        }).toLowerCase() : "—";

                        // Format Recorded By with line break + ID
                        let rawAllocatedBy = r.allocated_by || r.executive_name;
                        if (!rawAllocatedBy || rawAllocatedBy === "26" || rawAllocatedBy === "20") {
                          rawAllocatedBy = rawAllocatedBy === "20" ? "City Manager 1" : "Onboarding Executive 1";
                        }
                        const creatorId = r.created_by ? `ID: ${r.created_by}` : "ID: 26";
                        
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3.5 font-sans text-xs font-semibold text-slate-700">#{r.id}</td>
                            <td className="px-4 py-3.5 font-sans text-xs font-bold text-slate-900">{r.driver_name || "—"}</td>
                            <td className="px-4 py-3.5 font-sans text-xs font-medium text-slate-600">{r.driver_id || "—"}</td>
                            <td className="px-4 py-3.5 font-sans text-xs font-semibold text-slate-800">{r.city_name || r.city || "—"}</td>
                            <td className="px-4 py-3.5 font-sans text-xs text-slate-600">{r.driver_phone || "—"}</td>
                            <td className="px-4 py-3.5 font-sans text-xs font-bold text-slate-900">{r.vehicle_number || "—"}</td>
                            <td className="px-4 py-3.5 font-sans text-xs font-medium text-slate-700">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-semibold text-[11px]">
                                {r.sub_type || r.allocation_type || "New Allocation"}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-sans text-xs text-slate-800">
                              <span className="font-bold text-slate-900 block">{rawAllocatedBy}</span>
                              <span className="text-[10px] text-slate-400 font-medium block">{creatorId}</span>
                            </td>
                            <td className="px-4 py-3.5 font-sans text-xs text-slate-800">
                              <span className="font-bold text-slate-900 block">{datePart}</span>
                              <span className="text-[10px] text-slate-400 font-medium block">{timePart}</span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button 
                                  onClick={() => loadRecordForEdit(r.id)}
                                  className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
                                  title="Edit Allocation"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(r.id, r.driver_name)}
                                  className="h-7 w-7 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-rose-200/60"
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

              {/* PAGINATION FOOTER */}
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between font-sans text-xs text-slate-500">
                <span>
                  Showing {filteredRecords.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRecords.length)} of {filteredRecords.length} records
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white disabled:opacity-40 flex items-center gap-1 cursor-pointer hover:bg-slate-100 transition-colors text-slate-600"
                  >
                    <ChevronLeft className="w-3 h-3" /> Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce<(number | string)[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      typeof p === "string" ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-slate-400">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`h-8 w-8 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                            currentPage === p
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )
                  }
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || filteredRecords.length === 0}
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white disabled:opacity-40 flex items-center gap-1 cursor-pointer hover:bg-slate-100 transition-colors text-slate-600"
                  >
                    Next <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
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
            else if (activeCameraTarget === "stepney") setStepneyPhoto(base64);
            
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
