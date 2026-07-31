import React, { useState, useEffect } from "react";
import { ShieldCheck, ArrowLeft, RefreshCw, Plus, Trash2, Shield, Info, Check, X, ChevronLeft, FileText } from "lucide-react";
import { User as UserSession } from "../types";

interface RolesPermissionsFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

const AVAILABLE_PERMISSIONS = [
  "view_walkins", "edit_walkins",
  "view_onboarding", "edit_onboarding",
  "view_operator", "edit_operator",
  "view_adjustments", "edit_adjustments",
  "view_allocations", "edit_allocations",
  "view_expenses", "edit_expenses",
  "view_vehicle_onboarding", "edit_vehicle_onboarding",
  "view_workshops", "edit_workshops",
  "view_hubs", "edit_hubs",
  "view_rents", "edit_rents",
  "view_accidents", "edit_accidents",
  "view_inspections", "edit_inspections",
  "view_users", "edit_users",
  "view_vehicles", "edit_vehicles",
  "view_cities", "edit_cities",
  "view_roles", "edit_roles",
  "view_tickets", "edit_tickets"
];

export default function RolesPermissionsForm({ 
  user, 
  onBackToSelector,
  onLogout
}: RolesPermissionsFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "registry">("form");
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const displayName = user.name || user.username || "User";
  const initials = displayName.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/roles", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "registry") {
      fetchRoles();
    }
  }, [activeTab]);

  const togglePermission = (perm: string) => {
    if (selectedPermissions.includes(perm)) {
      setSelectedPermissions(prev => prev.filter(p => p !== perm));
    } else {
      setSelectedPermissions(prev => [...prev, perm]);
    }
  };

  const selectAll = () => {
    setSelectedPermissions([...AVAILABLE_PERMISSIONS]);
  };

  const clearAll = () => {
    setSelectedPermissions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return alert("Role Name is required");

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: roleName.trim(),
          description: roleDescription.trim(),
          permissions: selectedPermissions
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert("Role saved successfully!");
        setRoleName("");
        setRoleDescription("");
        setSelectedPermissions([]);
        setActiveTab("registry");
      } else {
        alert(data.detail || "Failed to save role");
      }
    } catch (err: any) {
      alert("Error occurred: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (name === "Admin") return alert("Cannot delete Admin role.");
    if (!confirm(`Are you sure you want to delete the role "${name}"?`)) return;

    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/roles/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Role deleted successfully!");
        fetchRoles();
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to delete role");
      }
    } catch (err: any) {
      alert("Error deleting role: " + err.message);
    }
  };

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
              ROLES & PERMISSIONS
            </span>
          </div>


          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === 'form' ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'text-text-muted hover:bg-slate-100 hover:text-primary' }`}
            >
              <FileText className="h-4 w-4" />
              Roles & Permissions
            </button>
            <button
              onClick={() => setActiveTab('registry')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === 'registry' ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'text-text-muted hover:bg-slate-100 hover:text-primary' }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Roles List
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
          <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            
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
                  <h2 className="font-sans text-2xl font-extrabold tracking-tight">Roles & Permissions</h2>
                  <p className="font-sans text-xs text-white/70 mt-1 max-w-xl leading-relaxed">
                    Configure RBAC, roles, and form-level access permissions.
                  </p>
                </div>
              </div>
            </div>


            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                    Role Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Vendor Manager, Read-Only Operator..."
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                    Description
                  </label>
                  <input 
                    type="text" 
                    placeholder="Short summary of responsibilities..."
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block font-sans text-xs font-bold text-text-muted">
                    Permissions ({selectedPermissions.length} selected)
                  </label>
                  <div className="flex gap-3">
                    <button type="button" onClick={selectAll} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer">Select All</button>
                    <button type="button" onClick={clearAll} className="text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer">Clear All</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {AVAILABLE_PERMISSIONS.map(perm => {
                    const isSelected = selectedPermissions.includes(perm);
                    return (
                      <button
                        key={perm}
                        type="button"
                        onClick={() => togglePermission(perm)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${ isSelected ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" : "border-border bg-white text-text-muted hover:border-indigo-300 hover:bg-slate-50" }`}
                      >
                        {perm}
                        {isSelected && <Check className="h-4 w-4 text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-primary hover:bg-primary-hover px-4 py-3 font-sans text-sm font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  Save Role & Permissions
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="border-b border-border bg-slate-50/50 px-8 py-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-sans text-lg font-extrabold text-indigo-600 tracking-tight">Roles Database</h2>
                  <p className="font-sans text-xs text-text-muted mt-0.5">Manage existing roles and their assigned access levels</p>
                </div>
                <button 
                  onClick={fetchRoles}
                  disabled={isLoading}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-bg text-text transition-all cursor-pointer disabled:opacity-50"
                  title="Refresh Data"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="p-16 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : roles.length === 0 ? (
              <div className="p-16 text-center">
                <Shield className="h-12 w-12 text-border mx-auto mb-3" />
                <h3 className="font-sans text-sm font-bold text-text">No Roles Found</h3>
                <p className="font-sans text-xs text-text-muted mt-1">Register a new role to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-slate-50/70">
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">ID</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Role Name</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Description</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Permissions</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {roles.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-text-muted">#{r.id}</td>
                        <td className="px-6 py-4 font-sans text-sm font-bold text-text">{r.name}</td>
                        <td className="px-6 py-4 font-sans text-xs text-text-muted">{r.description || "—"}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {r.permissions.length > 0 ? (
                              r.permissions.slice(0, 3).map(p => (
                                <span key={p} className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                                  {p}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-text-muted italic">None</span>
                            )}
                            {r.permissions.length > 3 && (
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                                +{r.permissions.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(r.id, r.name)}
                            disabled={r.name === "Admin"}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 hover:bg-red-500 hover:text-white text-red-500 border border-red-200/40 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Delete Role"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="border-t border-border bg-slate-50/50 px-8 py-4 flex items-center justify-between text-xs text-text-muted">
              <span>Showing {roles.length} roles</span>
              <span className="flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-indigo-500" />
                These roles can be assigned to users in the Portal Users Desk.
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
