import React, { useState, useMemo, useEffect } from "react";
import { 
  MapPin, Calendar, User, Phone, FileText, CheckCircle, 
  Clock, ArrowLeft, Download, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, Plus, ChevronLeft, Database, Info, Shield, Zap
} from "lucide-react";
import { HubRecord, User as UserSession, CITIES } from "../types";
import CameraCapture from "./CameraCapture";

interface HubsParkingFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

export default function HubsParkingForm({ 
  user, 
  onBackToSelector, 
  onLogout
}: HubsParkingFormProps) {
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
  const [hubName, setHubName] = useState("");
  const [cityName, setCityName] = useState("Hyderabad");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [facilityType, setFacilityType] = useState("Open Parking");
  const [totalCapacity, setTotalCapacity] = useState("");
  const [evCharging, setEvCharging] = useState("No");
  const [securityCctv, setSecurityCctv] = useState("No");
  const [hubManager, setHubManager] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [operatingHours, setOperatingHours] = useState("24/7");
  const [hubPhoto, setHubPhoto] = useState<string | null>(null);

  // Exhaustive fields
  const [contactPerson, setContactPerson] = useState("");
  const [designation, setDesignation] = useState("");

  const [cameraActive, setCameraActive] = useState(false);

  // Registry Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterType, setFilterType] = useState("all");
  
  // Top header quick search
  const [retrieveIdInput, setRetrieveIdInput] = useState("");

  const [records, setRecords] = useState<HubRecord[]>([]);
  const [stats, setStats] = useState({
    total_hubs: 0,
    total_capacity: 0,
    ev_charging_count: 0,
    cctv_secured_count: 0
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
      const res = await fetch("/api/hub/stats", {
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
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      if (filterCity !== "all") queryParams.append("city", filterCity);
      if (filterType !== "all") queryParams.append("type", filterType);

      const res = await fetch(`/api/hub?${queryParams.toString()}`, {
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
  }, [searchQuery, filterCity, filterType]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setHubPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const loadRecordForEdit = async (id: number) => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/hub/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Hub record not found");
      const data = await res.json();
      
      setEditingId(data.id);
      setHubName(data.hub_name || "");
      setCityName(data.city_name || "Hyderabad");
      setAddress(data.address || "");
      setPincode(data.pincode || "");
      setFacilityType(data.facility_type || "Open Parking");
      setTotalCapacity(data.total_capacity || "");
      setEvCharging(data.ev_charging || "No");
      setSecurityCctv(data.security_cctv || "No");
      setHubManager(data.hub_manager || "");
      setManagerPhone(data.manager_phone || "");
      setOperatingHours(data.operating_hours || "24/7");
      setHubPhoto(data.hub_photo || null);
      
      // Exhaustive fields
      setContactPerson(data.contact_person || "");
      setDesignation(data.designation || "");
      
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
    setHubName("");
    setCityName("Hyderabad");
    setAddress("");
    setPincode("");
    setFacilityType("Open Parking");
    setTotalCapacity("");
    setEvCharging("No");
    setSecurityCctv("No");
    setHubManager("");
    setManagerPhone("");
    setOperatingHours("24/7");
    setHubPhoto(null);
    setContactPerson("");
    setDesignation("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hubName.trim()) return alert("Hub Name is required");
    if (!cityName.trim()) return alert("City Name is required");
    if (!address.trim()) return alert("Address is required");
    if (!pincode.trim()) return alert("Pin Code is required");
    if (!totalCapacity.trim()) return alert("Total Capacity is required");

    const payload = {
      hub_name: hubName.trim(),
      city_name: cityName,
      address: address.trim(),
      pincode: pincode.trim(),
      facility_type: facilityType,
      total_capacity: totalCapacity.trim(),
      ev_charging: evCharging,
      security_cctv: securityCctv,
      hub_manager: hubManager.trim() || undefined,
      manager_phone: managerPhone.trim() || undefined,
      operating_hours: operatingHours.trim() || undefined,
      hub_photo: hubPhoto || undefined,
      contact_person: contactPerson.trim() || undefined,
      designation: designation.trim() || undefined
    };

    try {
      const token = localStorage.getItem("lr_token");
      const url = editingId ? `/api/hub/${editingId}` : "/api/hub";
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
        throw new Error(errorText || "Failed to submit hub record");
      }

      alert(editingId ? "Hub details updated successfully!" : "New Hub registered successfully!");
      resetForm();
      await fetchRecords();
      await fetchStats();
      setActiveTab("registry");
    } catch (err: any) {
      alert(err.message || "Error submitting form");
    }
  };

  const handleDeleteRecord = async (id: number) => {
    if (!window.confirm(`Are you sure you want to delete hub record #${id}?`)) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/hub/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchRecords();
        await fetchStats();
      } else {
        alert("Failed to delete hub record");
      }
    } catch (err) {
      console.error("Error deleting record:", err);
    }
  };

  const exportCSV = () => {
    if (records.length === 0) return alert("No records to export");
    const headers = [
      "ID", "Hub Name", "City", "Address", "Pin Code", "Facility Type",
      "Total Capacity", "EV Charging", "CCTV Secured", "Manager Name", "Manager Phone",
      "Operating Hours", "Contact Person", "Designation", "Created At"
    ];
    const rows = records.map(r => [
      r.id, r.hub_name, r.city_name, `"${r.address.replace(/"/g, '""')}"`, r.pincode, r.facility_type,
      r.total_capacity, r.ev_charging || "No", r.security_cctv || "No", r.hub_manager || "", r.manager_phone || "",
      r.operating_hours || "", r.contact_person || "", r.designation || "", r.created_at
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `letzryd_hubs_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      
      {/* HEADER: Sticky Google/LetzRyd inspired header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo & Portal Info */}
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
            <span className="hidden font-sans text-xs font-medium text-text-muted sm:inline-block">
              Hubs Form
            </span>
          </div>

          {/* Navigation Tab Pills */}
          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab("form")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "form" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <FileText className="h-4 w-4" />
              Registration Form
            </button>
            <button
              onClick={() => setActiveTab("registry")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "registry" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <Plus className="h-4 w-4" />
              Hubs Registry
            </button>
          </nav>

          {/* Clock & Profile Pill */}
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
                <span className="font-sans text-xs font-semibold leading-none text-text">{user.name || user.username || "User"}</span>
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
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 1: FORM CHECK-IN */}
        {activeTab === "form" && (
          <div className="w-full flex flex-col gap-6">
            
            {/* Dark Brand Header */}
            <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-white shadow-sm md:p-8">
              <div className="absolute inset-0 bg-radial-gradient from-green/10 to-transparent pointer-events-none" />
              
              <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[9px] font-bold text-white tracking-widest">
                      LetzRyd Desk
                    </span>
                    <span className="text-white/40 text-xs">•</span>
                    <span className="text-white/60 text-xs font-medium">Operations Portal</span>
                  </div>
                  <h1 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                    {editingId ? `Edit Record #${editingId}` : "Operational Hubs & Parking Lots"}
                  </h1>
                  <p className="font-sans text-xs text-white/70 mt-1 max-w-xl">
                    {editingId ? "Modifying existing hub entry. Submit form to update database." : "Register new hubs, update parking capacities, and manage facility charging & security details."}
                  </p>
                </div>

                {/* Retrieve block */}
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
              <div className="rounded-2xl bg-yellow-50 px-6 py-3 border border-yellow-200 flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-yellow-800 text-sm font-semibold">
                  <Edit className="h-4 w-4" />
                  Editing Hub Record #{editingId}
                </div>
                <button type="button" onClick={() => { resetForm(); setEditingId(null); }} className="text-xs text-yellow-700 hover:text-yellow-900 font-bold underline cursor-pointer">
                  Cancel Edit
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-white p-6 shadow-xs md:p-8 flex flex-col gap-8">
              
              {/* Panel 1: Hub Details */}
              <div className="space-y-4">
                <h3 className="font-sans text-xs font-bold text-primary mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">1</span>
                  Hub Details & Location
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">Hub Name *</label>
                    <input
                      type="text"
                      required
                      value={hubName}
                      onChange={(e) => setHubName(e.target.value)}
                      placeholder="e.g. Koramangala Parking Hub"
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">City *</label>
                    <select
                      value={cityName}
                      onChange={(e) => setCityName(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    >
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="Bangalore">Bangalore</option>
                      <option value="Mumbai">Mumbai</option>
                      <option value="Chennai">Chennai</option>
                      <option value="Delhi">Delhi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">Pin Code *</label>
                    <input
                      type="text"
                      required
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="e.g. 560034"
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">Full Address *</label>
                    <textarea
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Full street address..."
                      rows={2}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Panel 2: Capacity & Facilities */}
              <div className="space-y-4">
                <h3 className="font-sans text-xs font-bold text-primary mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-2 mt-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">2</span>
                  Capacity & Facilities
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">Facility Type *</label>
                    <select
                      value={facilityType}
                      onChange={(e) => setFacilityType(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    >
                      <option value="Open Parking">Open Parking</option>
                      <option value="Covered Parking">Covered Parking</option>
                      <option value="Maintenance Hub">Maintenance Hub</option>
                      <option value="Charging Station">Charging Station</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">Total Parking Capacity (Cars) *</label>
                    <input
                      type="number"
                      required
                      value={totalCapacity}
                      onChange={(e) => setTotalCapacity(e.target.value)}
                      placeholder="e.g. 45"
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">EV Charging Available?</label>
                    <div className="flex gap-4 mt-2">
                      {["Yes", "No"].map((choice) => (
                        <label key={choice} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                          <input
                            type="radio"
                            name="evCharging"
                            value={choice}
                            checked={evCharging === choice}
                            onChange={() => setEvCharging(choice)}
                            className="text-primary focus:ring-primary"
                          />
                          {choice}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">CCTV / Security Guard Active?</label>
                    <div className="flex gap-4 mt-2">
                      {["Yes", "No"].map((choice) => (
                        <label key={choice} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                          <input
                            type="radio"
                            name="securityCctv"
                            value={choice}
                            checked={securityCctv === choice}
                            onChange={() => setSecurityCctv(choice)}
                            className="text-primary focus:ring-primary"
                          />
                          {choice}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel 3: Operations & Contact */}
              <div className="space-y-4">
                <h3 className="font-sans text-xs font-bold text-primary mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-2 mt-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">3</span>
                  Operations & Contact
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">Hub Manager Name</label>
                    <input
                      type="text"
                      value={hubManager}
                      onChange={(e) => setHubManager(e.target.value)}
                      placeholder="Manager full name..."
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">Manager Phone Number</label>
                    <input
                      type="tel"
                      value={managerPhone}
                      onChange={(e) => setManagerPhone(e.target.value)}
                      placeholder="e.g. 9848022338"
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">Operating Hours</label>
                    <input
                      type="text"
                      value={operatingHours}
                      onChange={(e) => setOperatingHours(e.target.value)}
                      placeholder="e.g. 24/7 or 8 AM - 8 PM"
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">Contact Person (Optional)</label>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="Name of contact..."
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">Designation (Optional)</label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Area Lead, Shift Manager"
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Photo Upload / Verification */}
              <div className="border-t border-border/60 pt-6 mt-4">
                <h3 className="font-sans text-xs font-bold text-primary mb-2 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">4</span>
                  Secure Document Uploads (Optional)
                </h3>
                <p className="font-sans text-[11px] text-text-muted mb-4 max-w-xl">
                  Capture a live photo of the hub parking or gate, or upload a document file.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Hub Verification Photo Card */}
                  <div className="flex flex-col gap-2.5 rounded-xl border-2 border-dashed border-border bg-slate-50/50 p-4 relative">
                    <span className="font-sans text-xs font-semibold text-text-muted">Hub Verification Photo</span>
                    
                    {hubPhoto ? (
                      <div className="relative flex flex-col items-center justify-center bg-slate-100 rounded-lg p-3 min-h-[140px]">
                        <img 
                          src={hubPhoto} 
                          alt="Hub Thumbnail" 
                          className="max-h-28 w-auto object-contain rounded-md shadow-xs border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => setHubPhoto(null)}
                          className="absolute top-2 right-2 rounded-full bg-rose-50 border border-rose-200 p-1.5 text-rose-500 hover:bg-rose-100 transition-all cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-6 min-h-[140px] gap-3">
                        <div className="rounded-full bg-primary/10 p-3 text-primary">
                          <Camera className="h-5 w-5" />
                        </div>
                        <span className="font-sans text-xs text-text-dim">No photo captured yet</span>
                        <div className="flex gap-2.5">
                          <button
                            type="button"
                            onClick={() => setCameraActive(true)}
                            className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-[11px] font-semibold px-3.5 py-2 transition-colors cursor-pointer"
                          >
                            <Camera className="h-3.5 w-3.5" />
                            Capture Photo
                          </button>
                          <label className="flex items-center gap-1.5 rounded-lg border border-border bg-white hover:bg-slate-100 text-text-muted text-[11px] font-semibold px-3.5 py-2 transition-colors cursor-pointer">
                            <Upload className="h-3.5 w-3.5" />
                            Upload File
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleImageUpload}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                  
                </div>
              </div>

              {/* Form Actions Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 border-t border-border/40 pt-6">
                <div className="flex flex-col gap-1 max-w-sm">
                  <p className="text-[10px] font-bold text-red-500">* means mandatory</p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="h-11 rounded-lg border border-border bg-white px-5 font-sans text-sm font-semibold text-text-muted hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Clear Form
                  </button>
                  <button
                    type="submit"
                    className="h-11 rounded-lg bg-primary hover:bg-primary-hover text-white px-6 font-sans text-sm font-semibold shadow-md shadow-primary/10 transition-colors cursor-pointer"
                  >
                    {editingId ? "Save Changes" : "Register Hub"}
                  </button>
                </div>
              </div>

            </form>
          </div>
        )}

        {/* Tab 2: Registry View */}
        {activeTab === "registry" && (
          <div className="space-y-8">
            
            {/* KPI Metrics */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              
              <div className="rounded-xl border border-border bg-white p-5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block font-sans text-[10px] font-bold text-text-muted">Total Hubs</span>
                    <span className="block font-mono text-xl font-extrabold text-text leading-none mt-1">{stats.total_hubs}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-light text-green">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block font-sans text-[10px] font-bold text-text-muted">Total Capacity</span>
                    <span className="block font-mono text-xl font-extrabold text-text leading-none mt-1">{stats.total_capacity} Cars</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-light text-amber-600">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block font-sans text-[10px] font-bold text-text-muted">EV Charging Hubs</span>
                    <span className="block font-mono text-xl font-extrabold text-text leading-none mt-1">{stats.ev_charging_count} Hubs</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block font-sans text-[10px] font-bold text-text-muted">CCTV Secured</span>
                    <span className="block font-mono text-xl font-extrabold text-text leading-none mt-1">{stats.cctv_secured_count} Secured</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute top-2.5 left-3 h-4 w-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search by hub, address, manager..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 rounded-lg border border-border py-1.5 pr-3 pl-9 font-sans text-xs font-semibold focus:border-primary focus:outline-hidden transition-colors"
                  />
                </div>
                
                <select
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="rounded-lg border border-border bg-white px-3 py-1.5 font-sans text-xs font-semibold text-text-muted focus:border-primary focus:outline-hidden cursor-pointer"
                >
                  <option value="all">All Cities</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Bangalore">Bangalore</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Delhi">Delhi</option>
                </select>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="rounded-lg border border-border bg-white px-3 py-1.5 font-sans text-xs font-semibold text-text-muted focus:border-primary focus:outline-hidden cursor-pointer"
                >
                  <option value="all">All Facility Types</option>
                  <option value="Open Parking">Open Parking</option>
                  <option value="Covered Parking">Covered Parking</option>
                  <option value="Maintenance Hub">Maintenance Hub</option>
                  <option value="Charging Station">Charging Station</option>
                </select>
              </div>

              <button
                onClick={exportCSV}
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 font-sans text-xs font-bold text-text-muted hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="h-4 w-4 text-primary" />
                Export CSV
              </button>
            </div>

            {/* List Table */}
            <div className="overflow-hidden border border-border rounded-xl bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-slate-50 text-[10px] font-bold text-text-muted select-none">
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Hub Name</th>
                      <th className="py-3 px-4">City & Address</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Capacity</th>
                      <th className="py-3 px-4">EV Charging / CCTV</th>
                      <th className="py-3 px-4">Manager / Contact</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-sans text-xs">
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-text-muted font-medium">
                          No hubs registered found matching the filters.
                        </td>
                      </tr>
                    ) : (
                      records.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4 font-mono font-bold text-text-muted">#{record.id}</td>
                          <td className="py-4 px-4">
                            <div className="font-bold text-gray-900">{record.hub_name}</div>
                            <div className="text-[10px] text-text-muted mt-0.5">PIN: {record.pincode}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-text">{record.city_name}</div>
                            <div className="text-[10px] text-text-muted mt-0.5 line-clamp-1">{record.address}</div>
                          </td>
                          <td className="py-4 px-4 font-semibold text-text-muted">{record.facility_type}</td>
                          <td className="py-4 px-4 font-bold text-gray-900">{record.total_capacity} Cars</td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center w-fit rounded-full px-2 py-0.5 text-[9px] font-bold ${ record.ev_charging === "Yes" ? "bg-green-light text-green" : "bg-slate-100 text-slate-500" }`}>
                                EV: {record.ev_charging || "No"}
                              </span>
                              <span className={`inline-flex items-center w-fit rounded-full px-2 py-0.5 text-[9px] font-bold ${ record.security_cctv === "Yes" ? "bg-green-light text-green" : "bg-slate-100 text-slate-500" }`}>
                                Security: {record.security_cctv || "No"}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-text">{record.hub_manager || record.contact_person || "-"}</div>
                            {record.manager_phone && (
                              <div className="text-[10px] text-text-muted mt-0.5">{record.manager_phone}</div>
                            )}
                            {record.designation && (
                              <div className="text-[9px] text-primary font-bold mt-1">{record.designation}</div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => loadRecordForEdit(record.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-white text-text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(record.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-white text-text-muted hover:border-red-200 hover:text-red-600 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Reusable Camera Overlay */}
      {cameraActive && (
        <CameraCapture
          title="Capture Hub Photo"
          onCapture={(img) => {
            setHubPhoto(img);
            setCameraActive(false);
          }}
          onClose={() => setCameraActive(false)}
        />
      )}

      {/* Footer */}
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
