import React, { useState, useEffect } from "react";
import { Plus, Trash2, Search, ArrowLeft, RefreshCw, Car, Info, Settings, ChevronLeft, FileText, Truck } from "lucide-react";
import { User as UserSession } from "../types";

interface VehicleModelsFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

interface VehicleModel {
  id: number;
  brand: string;
  model_name: string;
  variant: string;
  fuel_type: string;
  make_year: number;
  created_at: string | null;
}

export default function VehicleModelsForm({ 
  user, 
  onBackToSelector,
  onLogout
}: VehicleModelsFormProps) {
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
  const [brand, setBrand] = useState("Maruti Suzuki");
  const [customBrand, setCustomBrand] = useState("");
  const [modelName, setModelName] = useState("");
  const [variant, setVariant] = useState("");
  const [fuelType, setFuelType] = useState("CNG");
  const [makeYear, setMakeYear] = useState<number>(new Date().getFullYear());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Registry Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [records, setRecords] = useState<VehicleModel[]>([]);
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
      const res = await fetch("/api/vehicle-models", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error("Error fetching vehicle models:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "registry") {
      fetchRecords();
    }
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalBrand = brand === "Other" ? customBrand.trim() : brand;
    if (!finalBrand) return alert("Brand/Manufacturer is required");
    if (!modelName.trim()) return alert("Model Name is required");
    if (!variant.trim()) return alert("Variant is required");

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/vehicle-models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          brand: finalBrand,
          model_name: modelName.trim(),
          variant: variant.trim().toUpperCase(),
          fuel_type: fuelType,
          make_year: makeYear
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert("Vehicle model registered successfully!");
        // Reset form
        setBrand("Maruti Suzuki");
        setCustomBrand("");
        setModelName("");
        setVariant("");
        setFuelType("CNG");
        setMakeYear(new Date().getFullYear());
        setActiveTab("registry");
      } else {
        alert(data.detail || "Failed to register model");
      }
    } catch (err: any) {
      alert("Error occurred: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, desc: string) => {
    if (!confirm(`Are you sure you want to delete vehicle model "${desc}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/vehicle-models/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Vehicle model deleted successfully!");
        fetchRecords();
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to delete model");
      }
    } catch (err: any) {
      alert("Error deleting model: " + err.message);
    }
  };

  const filteredRecords = records.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.brand.toLowerCase().includes(q) ||
      r.model_name.toLowerCase().includes(q) ||
      r.variant.toLowerCase().includes(q) ||
      r.fuel_type.toLowerCase().includes(q) ||
      r.make_year.toString().includes(q)
    );
  });

  const yearsList = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear + 1; y >= 2015; y--) {
    yearsList.push(y);
  }

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
              Vehicle Models Desk
            </span>
          </div>


          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === 'form' ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'text-text-muted hover:bg-slate-100 hover:text-primary' }`}
            >
              <FileText className="h-4 w-4" />
              Vehicle Models Desk
            </button>
            <button
              onClick={() => setActiveTab('registry')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === 'registry' ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'text-text-muted hover:bg-slate-100 hover:text-primary' }`}
            >
              <Truck className="h-4 w-4" />
              Fleet Models Registry
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
                  <h2 className="font-sans text-2xl font-extrabold tracking-tight">Vehicle Models Registry</h2>
                  <p className="font-sans text-xs text-white/70 mt-1 max-w-xl leading-relaxed">
                    Manage fleet makes, models, variants and fuel types.
                  </p>
                </div>
              </div>
            </div>


            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Brand */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                    Manufacturer / Brand <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="Maruti Suzuki">Maruti Suzuki</option>
                    <option value="Hyundai">Hyundai</option>
                    <option value="Tata">Tata</option>
                    <option value="Mahindra">Mahindra</option>
                    <option value="Honda">Honda</option>
                    <option value="Toyota">Toyota</option>
                    <option value="Kia">Kia</option>
                    <option value="BYD">BYD</option>
                    <option value="Other">Other (Custom)</option>
                  </select>
                </div>

                {brand === "Other" && (
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Custom Brand Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. MG Motors..."
                      value={customBrand}
                      onChange={(e) => setCustomBrand(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>
                )}
              </div>

              {/* Model Name */}
              <div>
                <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                  Model Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. WagonR, Nexon, Aura..."
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                />
              </div>

              {/* Variant / Trim */}
              <div>
                <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                  Variant / Trim <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. LXI, VXI, ZXI+, XM..."
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                />
              </div>

              {/* Fuel Type & Make Year */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                    Fuel Type <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="CNG">CNG</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="EV">EV (Electric)</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                    Make Year <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={makeYear}
                    onChange={(e) => setMakeYear(parseInt(e.target.value) || currentYear)}
                    required
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                  >
                    {yearsList.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-primary hover:bg-primary-hover px-4 py-3 font-sans text-sm font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Register Vehicle Model
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="border-b border-border bg-slate-50/50 px-8 py-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-sans text-lg font-extrabold text-primary tracking-tight">Registered Models Database</h2>
                  <p className="font-sans text-xs text-text-muted mt-0.5">List of verified specifications for vehicle onboarding selection</p>
                </div>

                <div className="flex flex-1 items-center max-w-md gap-3 md:justify-end">
                  <div className="relative w-full">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input 
                      type="text" 
                      placeholder="Search models by name, fuel, make, brand..."
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
                <Car className="h-12 w-12 text-border mx-auto mb-3" />
                <h3 className="font-sans text-sm font-bold text-text">No Vehicle Models Found</h3>
                <p className="font-sans text-xs text-text-muted mt-1">Try modifying your query or register a new model.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-slate-50/70">
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">ID</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Brand</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Model Name</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Variant / Trim</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Fuel Type</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Make Year</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredRecords.map((r) => {
                      const desc = `${r.brand} ${r.model_name} ${r.variant} (${r.fuel_type} - ${r.make_year})`;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-semibold text-text-muted">#{r.id}</td>
                          <td className="px-6 py-4 font-sans text-sm font-bold text-text">{r.brand}</td>
                          <td className="px-6 py-4 font-sans text-sm font-semibold text-primary">{r.model_name}</td>
                          <td className="px-6 py-4 font-mono text-xs text-text-muted font-bold">{r.variant}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${ r.fuel_type === "EV" ? "bg-green-50 text-green-600 border border-green-200/50" : r.fuel_type === "CNG" ? "bg-blue-50 text-blue-600 border border-blue-200/50" : "bg-slate-100 text-slate-700" }`}>
                              {r.fuel_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-sans text-sm text-text font-bold">{r.make_year}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDelete(r.id, desc)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 hover:bg-red-500 hover:text-white text-red-500 border border-red-200/40 transition-all cursor-pointer"
                              title="Delete Model Specification"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="border-t border-border bg-slate-50/50 px-8 py-4 flex items-center justify-between text-xs text-text-muted">
              <span>Showing {filteredRecords.length} of {records.length} specifications</span>
              <span className="flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-primary" />
                These models will populate onboarding forms dynamically.
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
