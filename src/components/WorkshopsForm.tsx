import React, { useState, useMemo, useEffect } from "react";
import { 
  Wrench, Calendar, MapPin, User, Phone, FileText, CheckCircle, 
  Clock, ArrowLeft, Download, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, Plus, ChevronLeft, Database, Info, Briefcase
} from "lucide-react";
import { WorkshopRecord, User as UserSession, CITIES } from "../types";
import CameraCapture from "./CameraCapture";

interface WorkshopsFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

export default function WorkshopsForm({ 
  user, 
  onBackToSelector, 
  onLogout
}: WorkshopsFormProps) {
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
  const [vendorName, setVendorName] = useState("");
  const [workshopType, setWorkshopType] = useState("Multi-brand Garage");
  const [cityName, setCityName] = useState("Hyderabad");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [emailId, setEmailId] = useState("");
  const [panCard, setPanCard] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [workshopStatus, setWorkshopStatus] = useState("Active");
  const [workshopPhoto, setWorkshopPhoto] = useState<string | null>(null);

  // Exhaustive Optional Fields
  const [contactPerson2, setContactPerson2] = useState("");
  const [alternateMobile, setAlternateMobile] = useState("");
  const [telephone, setTelephone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [upiId, setUpiId] = useState("");

  const [cameraActive, setCameraActive] = useState(false);

  // Registry Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterType, setFilterType] = useState("all");
  
  // Top header quick search
  const [retrieveIdInput, setRetrieveIdInput] = useState("");

  const [records, setRecords] = useState<WorkshopRecord[]>([]);
  const [stats, setStats] = useState({
    total_workshops: 0,
    active_count: 0,
    ev_specialist_count: 0,
    onboarding_count: 0
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
      const res = await fetch("/api/workshop/stats", {
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

      const res = await fetch(`/api/workshop?${queryParams.toString()}`, {
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
          setWorkshopPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const loadRecordForEdit = async (id: number) => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/workshop/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Workshop vendor record not found");
      const data = await res.json();
      
      setEditingId(data.id);
      setVendorName(data.vendor_name || "");
      setWorkshopType(data.workshop_type || "Multi-brand Garage");
      setCityName(data.city_name || "Hyderabad");
      setAddress(data.address || "");
      setGstNumber(data.gst_number || "");
      setContactPerson(data.contact_person || "");
      setMobileNumber(data.mobile_number || "");
      setEmailId(data.email_id || "");
      setPanCard(data.pan_card || "");
      setBankName(data.bank_name || "");
      setAccountNumber(data.account_number || "");
      setIfscCode(data.ifsc_code || "");
      setWorkshopStatus(data.workshop_status || "Active");
      setWorkshopPhoto(data.workshop_photo || null);
      
      // Exhaustive fields
      setContactPerson2(data.contact_person_2 || "");
      setAlternateMobile(data.alternate_mobile || "");
      setTelephone(data.telephone || "");
      setOwnerName(data.owner_name || "");
      setUpiId(data.upi_id || "");
      
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
    setVendorName("");
    setWorkshopType("Multi-brand Garage");
    setCityName("Hyderabad");
    setAddress("");
    setGstNumber("");
    setContactPerson("");
    setMobileNumber("");
    setEmailId("");
    setPanCard("");
    setBankName("");
    setAccountNumber("");
    setIfscCode("");
    setWorkshopStatus("Active");
    setWorkshopPhoto(null);
    setContactPerson2("");
    setAlternateMobile("");
    setTelephone("");
    setOwnerName("");
    setUpiId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) return alert("Vendor Name is required");
    if (!cityName.trim()) return alert("City is required");
    if (!address.trim()) return alert("Address is required");
    if (!gstNumber.trim()) return alert("GST Number is required");
    if (!contactPerson.trim()) return alert("Contact Person is required");
    if (!mobileNumber.trim()) return alert("Mobile Number is required");
    if (!emailId.trim()) return alert("Email ID is required");
    if (!panCard.trim()) return alert("PAN Card is required");
    if (!bankName.trim()) return alert("Bank Name is required");
    if (!accountNumber.trim()) return alert("Account Number is required");
    if (!ifscCode.trim()) return alert("IFSC Code is required");

    const payload = {
      vendor_name: vendorName.trim(),
      workshop_type: workshopType,
      city_name: cityName,
      address: address.trim(),
      gst_number: gstNumber.trim().toUpperCase(),
      contact_person: contactPerson.trim(),
      mobile_number: mobileNumber.trim(),
      email_id: emailId.trim().toLowerCase(),
      pan_card: panCard.trim().toUpperCase(),
      bank_name: bankName.trim(),
      account_number: accountNumber.trim(),
      ifsc_code: ifscCode.trim().toUpperCase(),
      workshop_status: workshopStatus,
      workshop_photo: workshopPhoto || undefined,
      contact_person_2: contactPerson2.trim() || undefined,
      alternate_mobile: alternateMobile.trim() || undefined,
      telephone: telephone.trim() || undefined,
      owner_name: ownerName.trim() || undefined,
      upi_id: upiId.trim().toLowerCase() || undefined
    };

    try {
      const token = localStorage.getItem("lr_token");
      const url = editingId ? `/api/workshop/${editingId}` : "/api/workshop";
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
        throw new Error(errorText || "Failed to submit workshop record");
      }

      alert(editingId ? "Workshop details updated successfully!" : "New Workshop registered successfully!");
      resetForm();
      await fetchRecords();
      await fetchStats();
      setActiveTab("registry");
    } catch (err: any) {
      alert(err.message || "Error submitting form");
    }
  };

  const handleDeleteRecord = async (id: number) => {
    if (!window.confirm(`Are you sure you want to delete workshop record #${id}?`)) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/workshop/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchRecords();
        await fetchStats();
      } else {
        alert("Failed to delete workshop record");
      }
    } catch (err) {
      console.error("Error deleting record:", err);
    }
  };

  const exportCSV = () => {
    if (records.length === 0) return alert("No records to export");
    const headers = [
      "ID", "Vendor Name", "Workshop Type", "City", "Address", "GST Number",
      "Owner Name", "Primary Contact", "Mobile", "Contact Person 2", "Alt Mobile", "Telephone", "Email", "PAN Card",
      "Bank", "Account No", "IFSC", "UPI ID", "Status", "Created At"
    ];
    const rows = records.map(r => [
      r.id, r.vendor_name, r.workshop_type, r.city_name, `"${r.address.replace(/"/g, '""')}"`, r.gst_number,
      r.owner_name || "", r.contact_person, r.mobile_number, r.contact_person_2 || "", r.alternate_mobile || "",
      r.telephone || "", r.email_id, r.pan_card, r.bank_name, r.account_number, r.ifsc_code, r.upi_id || "", r.workshop_status, r.created_at
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `letzryd_workshops_${new Date().toISOString().split("T")[0]}.csv`);
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
              Workshops Form
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
              Workshops Registry
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
                    {editingId ? `Edit Record #${editingId}` : "Partner Workshops Registration"}
                  </h1>
                  <p className="font-sans text-xs text-white/70 mt-1 max-w-xl">
                    {editingId ? "Modifying existing workshop entry. Submit form to update database." : "Register new workshop vendors, manage GST/PAN compliance details, and track banking information."}
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
                  Editing Workshop Record #{editingId}
                </div>
                <button type="button" onClick={() => { resetForm(); setEditingId(null); }} className="text-xs text-yellow-700 hover:text-yellow-900 font-bold underline cursor-pointer">
                  Cancel Edit
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-white p-6 shadow-xs md:p-8 flex flex-col gap-8">
              
              {/* Panel 1: Identity & Location */}
              <div className="space-y-4">
                <h3 className="font-sans text-xs font-bold text-primary mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">1</span>
                  Workshop Identity & Location
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Vendor / Workshop Name *</label>
                    <input
                      type="text"
                      required
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      placeholder="e.g. Express Auto Care"
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Workshop Type *</label>
                    <select
                      value={workshopType}
                      onChange={(e) => setWorkshopType(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden bg-white transition-colors"
                    >
                      <option value="Multi-brand Garage">Multi-brand Garage</option>
                      <option value="Authorized Service Center">Authorized Service Center</option>
                      <option value="EV Specialist">EV Specialist</option>
                      <option value="Body Repair Specialist">Body Repair Specialist</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Operational City *</label>
                    <select
                      value={cityName}
                      onChange={(e) => setCityName(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden bg-white transition-colors"
                    >
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="Bangalore">Bangalore</option>
                      <option value="Mumbai">Mumbai</option>
                      <option value="Chennai">Chennai</option>
                      <option value="Delhi">Delhi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">GST Number *</label>
                    <input
                      type="text"
                      required
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      placeholder="e.g. 36AAAAA1111A1Z1"
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-text mb-1">Full Address *</label>
                    <textarea
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Full street address..."
                      rows={2}
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Panel 2: Owner & Contact Details */}
              <div className="space-y-4">
                <h3 className="font-sans text-xs font-bold text-primary mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-2 mt-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">2</span>
                  Owner & Contact Information
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Primary Contact Person Name *</label>
                    <input
                      type="text"
                      required
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="Full name..."
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Primary Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="10-digit number..."
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Owner Name (Optional)</label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Workshop owner's name..."
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Alternate Contact Person (Optional)</label>
                    <input
                      type="text"
                      value={contactPerson2}
                      onChange={(e) => setContactPerson2(e.target.value)}
                      placeholder="Secondary contact name..."
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Alternate Mobile Number (Optional)</label>
                    <input
                      type="tel"
                      value={alternateMobile}
                      onChange={(e) => setAlternateMobile(e.target.value)}
                      placeholder="Secondary mobile..."
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Telephone / Landline (Optional)</label>
                    <input
                      type="text"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder="e.g. 040-2345678"
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Official Email ID *</label>
                    <input
                      type="email"
                      required
                      value={emailId}
                      onChange={(e) => setEmailId(e.target.value)}
                      placeholder="e.g. vendor@company.com"
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">PAN Card Number *</label>
                    <input
                      type="text"
                      required
                      value={panCard}
                      onChange={(e) => setPanCard(e.target.value)}
                      placeholder="10-character code..."
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Panel 3: Banking & Operations */}
              <div className="space-y-4 col-span-1 md:col-span-2">
                <h3 className="font-sans text-xs font-bold text-primary mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-2 mt-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">3</span>
                  Banking & Operations
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Bank Name *</label>
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank, ICICI..."
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Account Number *</label>
                    <input
                      type="text"
                      required
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Full bank account number..."
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">IFSC Code *</label>
                    <input
                      type="text"
                      required
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value)}
                      placeholder="e.g. HDFC0000123"
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">UPI ID (Optional)</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. vendor@upi"
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Workshop status *</label>
                    <div className="flex gap-4 mt-2">
                      {["Active", "Onboarding", "Inactive"].map((status) => (
                        <label key={status} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                          <input
                            type="radio"
                            name="workshopStatus"
                            value={status}
                            checked={workshopStatus === status}
                            onChange={() => setWorkshopStatus(status)}
                            className="text-primary focus:ring-primary"
                          />
                          {status}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Photo Upload / Verification */}
              <div className="border-t border-border/60 pt-6 mt-4 col-span-1 md:col-span-2">
                <h3 className="font-sans text-xs font-bold text-primary mb-2 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">4</span>
                  Secure Document Uploads (Optional)
                </h3>
                <p className="font-sans text-[11px] text-text-muted mb-4 max-w-xl">
                  Capture a live photo of the workshop entrance or upload a document file.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Workshop Photo Card */}
                  <div className="flex flex-col gap-2.5 rounded-xl border-2 border-dashed border-border bg-slate-50/50 p-4 relative">
                    <span className="font-sans text-xs font-semibold text-text-muted">Workshop Verification Photo</span>
                    
                    {workshopPhoto ? (
                      <div className="relative flex flex-col items-center justify-center bg-slate-100 rounded-lg p-3 min-h-[140px]">
                        <img 
                          src={workshopPhoto} 
                          alt="Workshop Thumbnail" 
                          className="max-h-28 w-auto object-contain rounded-md shadow-xs border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => setWorkshopPhoto(null)}
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
                    {editingId ? "Save Changes" : "Register Workshop"}
                  </button>
                </div>
              </div>

            </form>
          </div>
        )}

        {/* Tab 2: Registry View */}
        {activeTab === "registry" && (
          <div className="space-y-8">
            
            {/* KPI Metrics Dashboard */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              
              <div className="rounded-xl border border-border bg-white p-5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block font-sans text-[10px] font-bold text-text-muted">Total Registered</span>
                    <span className="block font-mono text-xl font-extrabold text-text leading-none mt-1">{stats.total_workshops}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-light text-green">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block font-sans text-[10px] font-bold text-text-muted">Active Centers</span>
                    <span className="block font-mono text-xl font-extrabold text-text leading-none mt-1">{stats.active_count}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-light text-amber-600">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block font-sans text-[10px] font-bold text-text-muted">EV Specialists</span>
                    <span className="block font-mono text-xl font-extrabold text-text leading-none mt-1">{stats.ev_specialist_count}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block font-sans text-[10px] font-bold text-text-muted">In Onboarding</span>
                    <span className="block font-mono text-xl font-extrabold text-text leading-none mt-1">{stats.onboarding_count}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Filters & Actions Panel */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute top-2.5 left-3 h-4 w-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search by vendor, contact, owner..."
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
                  <option value="all">All Types</option>
                  <option value="Authorized Service Center">Authorized Service Center</option>
                  <option value="Multi-brand Garage">Multi-brand Garage</option>
                  <option value="EV Specialist">EV Specialist</option>
                  <option value="Body Repair Specialist">Body Repair Specialist</option>
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

            {/* Records list table */}
            <div className="overflow-hidden border border-border rounded-xl bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-slate-50 text-[10px] font-bold text-text-muted select-none">
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Vendor & Type</th>
                      <th className="py-3 px-4">City</th>
                      <th className="py-3 px-4">Primary Contact / Owner</th>
                      <th className="py-3 px-4">GST & PAN</th>
                      <th className="py-3 px-4">Bank & Account Details</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-sans text-xs">
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-text-muted font-medium">
                          No registered workshops found matching the filters.
                        </td>
                      </tr>
                    ) : (
                      records.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4 font-mono font-bold text-text-muted">#{record.id}</td>
                          <td className="py-4 px-4">
                            <div className="font-bold text-gray-900">{record.vendor_name}</div>
                            <div className="text-[10px] text-text-muted mt-0.5">{record.workshop_type}</div>
                          </td>
                          <td className="py-4 px-4 font-semibold text-text-muted">{record.city_name}</td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-text">{record.contact_person}</div>
                            <div className="text-[10px] text-text-muted mt-0.5">{record.mobile_number}</div>
                            {record.owner_name && (
                              <div className="text-[9px] text-primary font-bold mt-1">Owner: {record.owner_name}</div>
                            )}
                          </td>
                          <td className="py-4 px-4 font-mono text-[10px]">
                            <div>GST: <span className="font-bold text-text">{record.gst_number}</span></div>
                            <div className="mt-0.5">PAN: <span className="font-bold text-text">{record.pan_card}</span></div>
                          </td>
                          <td className="py-4 px-4 font-mono text-[10px]">
                            <div className="font-bold text-text">{record.bank_name}</div>
                            <div className="mt-0.5">A/C: <span className="font-semibold">{record.account_number}</span></div>
                            <div className="mt-0.5">IFSC: <span className="font-semibold">{record.ifsc_code}</span></div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${ record.workshop_status === "Active" ? "bg-green-light text-green" : record.workshop_status === "Onboarding" ? "bg-yellow-light text-amber-700" : "bg-red-50 text-red-600" }`}>
                              {record.workshop_status}
                            </span>
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
          title="Capture Workshop Photo"
          onCapture={(img) => {
            setWorkshopPhoto(img);
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
