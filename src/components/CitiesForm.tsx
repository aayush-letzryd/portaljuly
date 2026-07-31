import React, { useState, useEffect } from "react";
import { Plus, Trash2, Search, ArrowLeft, RefreshCw, MapPin, Info, Settings, ChevronLeft, FileText, Edit, X } from "lucide-react";
import { User as UserSession } from "../types";

interface CitiesFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

interface OperatingCity {
  id: number;
  name: string;
  state: string;
  country: string;
  status: string;
  value: string;
  text: string;
}

export default function CitiesForm({ 
  user, 
  onBackToSelector,
  onLogout
}: CitiesFormProps) {
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
  const [cityName, setCityName] = useState("");
  const [stateName, setStateName] = useState("");
  const [countryName, setCountryName] = useState("India");
  const [status, setStatus] = useState("Active");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Registry Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [records, setRecords] = useState<OperatingCity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const displayName = user.name || user.username || "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/cities", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error("Error fetching cities:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "registry") {
      fetchRecords();
    }
  }, [activeTab]);

  const resetForm = () => {
    setCityName("");
    setStateName("");
    setCountryName("India");
    setStatus("Active");
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityName.trim()) return alert("City Name is required");

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("lr_token");
      const url = editingId ? `/api/cities/${editingId}` : "/api/cities";
      const method = editingId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: cityName.trim(),
          state: stateName.trim() || null,
          country: countryName.trim() || "India",
          status: status || "Active"
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(editingId ? "City details updated successfully!" : "City registered successfully!");
        resetForm();
        setActiveTab("registry");
      } else {
        alert(data.detail || "Failed to submit city data");
      }
    } catch (err: any) {
      alert("Error occurred: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.name || "").toLowerCase().includes(q) ||
      (r.state || "").toLowerCase().includes(q) ||
      (r.country || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-bg">
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-40 border-b border-border bg-white shadow-xs">
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
              alt="LetzRyd" 
              className="h-7 w-auto object-contain cursor-pointer"
              onClick={onBackToSelector}
              referrerPolicy="no-referrer"
            />
            <span className="hidden h-5 border-l border-border sm:inline-block" />
            <span className="hidden font-sans text-xs font-medium text-text-muted sm:inline-block">
              Operating Cities Desk
            </span>
          </div>


          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === 'form' ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'text-text-muted hover:bg-slate-100 hover:text-primary' }`}
            >
              <FileText className="h-4 w-4" />
              Operating Cities Desk
            </button>
            <button
              onClick={() => setActiveTab('registry')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === 'registry' ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'text-text-muted hover:bg-slate-100 hover:text-primary' }`}
            >
              <MapPin className="h-4 w-4" />
              Cities Registry
            </button>
          </nav>

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

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === "form" ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            
            {/* Dark Brand Header */}
            <div className="relative overflow-hidden bg-primary p-6 text-white md:p-8">
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
                  <h2 className="font-sans text-2xl font-extrabold tracking-tight">Operating Cities Desk</h2>
                  <p className="font-sans text-xs text-white/70 mt-1 max-w-xl leading-relaxed">
                    Manage cities where LetzRyd operates and track operational status.
                  </p>
                </div>
              </div>
            </div>

             <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* City Name */}
              <div>
                <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                  City Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Hyderabad, Bangalore, Pune..."
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  required
                  disabled={editingId !== null && editingId <= 5}
                  className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                />
              </div>

              {/* State */}
              <div>
                <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                  State / Province
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Telangana, Maharashtra..."
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                />
              </div>

              {/* Country & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                    Country
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. India"
                    value={countryName}
                    onChange={(e) => setCountryName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                    Operational Status
                  </label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                {editingId !== null && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 rounded-xl border border-border hover:bg-bg px-4 py-3 font-sans text-sm font-bold text-text transition-all cursor-pointer text-center"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`rounded-xl px-4 py-3 font-sans text-sm font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${editingId ? 'flex-1 bg-amber-500 hover:bg-amber-600' : 'w-full bg-primary hover:bg-primary-hover'}`}
                >
                  {isSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {editingId ? "Update City" : "Register Operating City"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="border-b border-border bg-slate-50/50 px-8 py-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-sans text-lg font-extrabold text-primary tracking-tight">Cities Database</h2>
                  <p className="font-sans text-xs text-text-muted mt-0.5">Active operational locations for LetzRyd portal</p>
                </div>

                <div className="flex flex-1 items-center max-w-md gap-3 md:justify-end">
                  <div className="relative w-full">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input 
                      type="text" 
                      placeholder="Search cities..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white pl-9 pr-4 py-2 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <button 
                    onClick={fetchRecords}
                    disabled={isLoading}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-bg text-text transition-all cursor-pointer disabled:opacity-50"
                    title="Refresh Data"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="p-16 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-16 text-center">
                <MapPin className="h-12 w-12 text-border mx-auto mb-3" />
                <h3 className="font-sans text-sm font-bold text-text">No Operational Cities Found</h3>
                <p className="font-sans text-xs text-text-muted mt-1">Try modifying your query or register a new city.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-slate-50/70">
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">ID</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">City Name</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">State</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Country</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Status</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredRecords.map((r) => {
                      const isPreExisting = r.id <= 3;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-semibold text-text-muted">#{r.id}</td>
                          <td className="px-6 py-4 font-sans text-sm font-bold text-text">{r.name}</td>
                          <td className="px-6 py-4 font-sans text-xs text-text-muted">{r.state || "—"}</td>
                          <td className="px-6 py-4 font-sans text-xs text-text-muted">{r.country || "India"}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${ r.status === "Active" ? "bg-green-50 text-green-700 ring-green-600/20" : "bg-red-50 text-red-700 ring-red-600/20" }`}>
                              {r.status || "Active"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {!isPreExisting ? (
                              <button
                                onClick={() => {
                                  setEditingId(r.id);
                                  setCityName(r.name);
                                  setStateName(r.state || "");
                                  setCountryName(r.country || "India");
                                  setStatus(r.status || "Active");
                                  setActiveTab("form");
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-500 border border-amber-200/40 transition-all cursor-pointer"
                                title="Edit Operational City"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-text-muted italic px-2">Locked</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="border-t border-border bg-slate-50/50 px-8 py-4 flex items-center justify-between text-xs text-text-muted">
              <span>Showing {filteredRecords.length} of {records.length} locations</span>
              <span className="flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-primary" />
                These cities will populate all dropdowns dynamically.
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
