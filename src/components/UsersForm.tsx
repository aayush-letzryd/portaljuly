import React, { useState, useEffect } from "react";
import { Users, ArrowLeft, Trash2, Search, UserPlus, ShieldAlert, Info, CheckCircle, RefreshCw, Key, Eye, EyeOff, Edit, ChevronLeft, FileText, Plus } from "lucide-react";
import { User as UserSession } from "../types";

interface UsersFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

interface AppUser {
  id: number;
  username: string;
  name: string;
  role: string;
  role_id: number | null;
  created_at: string | null;
  employee_id?: string | null;
  email?: string | null;
  raw_password?: string;
}

interface AppRole {
  id: number;
  name: string;
}

export default function UsersForm({ 
  user, 
  onBackToSelector,
  onLogout
}: UsersFormProps) {
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
  const [revealedPasswordId, setRevealedPasswordId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Executive");
  const [customRole, setCustomRole] = useState("");
  const [roleId, setRoleId] = useState<number | "">("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [searchEmpId, setSearchEmpId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Registry Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [records, setRecords] = useState<AppUser[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AppRole[]>([]);
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
      const res = await fetch("/api/users", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/roles", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableRoles(data);
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleLookupEmployee = async () => {
    if (!searchEmpId.trim()) return alert("Please enter an Employee ID to search");
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/employees", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const emp = data.find((e: any) => e.employee_id && e.employee_id.toLowerCase() === searchEmpId.trim().toLowerCase());
        if (emp) {
          setName(emp.name);
          setEmployeeId(emp.employee_id || "");
          setEmail(emp.company_email || emp.email || "");
          const knownRoles = ["Executive", "Driver Relations Manager", "Onboarding Specialist", "Partner Onboarding Lead", "Regional Operations Manager", "Finance Team", "Administrator", "Other"];
          if (knownRoles.includes(emp.role)) {
            setRole(emp.role);
            setCustomRole("");
          } else {
            setRole("Other");
            setCustomRole(emp.role);
          }
          alert(`Found employee: ${emp.name} (${emp.role})`);
        } else {
          alert("No employee found with this ID.");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error looking up employee.");
    }
  };

  useEffect(() => {
    if (activeTab === "registry") {
      fetchRecords();
    }
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Full Name is required");
    if (!username.trim()) return alert("Username is required");
    if (!editingId && !password.trim()) return alert("Password is required");

    const finalRole = role === "Other" ? customRole.trim() : role;
    if (!finalRole) return alert("Role is required");

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("lr_token");
      const url = editingId ? `/api/users/${editingId}` : "/api/users";
      const method = editingId ? "PUT" : "POST";
      
      const payload: any = {
        name: name.trim(),
        role: finalRole,
        username: username.trim(),
        role_id: roleId || null,
        employee_id: employeeId.trim() || null,
        email: email.trim() || null
      };
      if (password) {
        payload.password = password;
      }

      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        alert(editingId ? "User account updated successfully!" : "User account created successfully!");
        // Reset form
        setName("");
        setRole("Executive");
        setCustomRole("");
        setRoleId("");
        setUsername("");
        setPassword("");
        setEmployeeId("");
        setEmail("");
        setSearchEmpId("");
        setEditingId(null);
        setActiveTab("registry");
      } else {
        alert(data.detail || "Failed to submit user account");
      }
    } catch (err: any) {
      alert("Error occurred: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, targetUsername: string) => {
    if (user.id === id) {
       return alert("You cannot delete your own logged-in account!");
    }
    if (!confirm(`Are you sure you want to delete user "${targetUsername}"? This will disable their access immediately.`)) {
      return;
    }

    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("User deleted successfully!");
        fetchRecords();
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to delete user");
      }
    } catch (err: any) {
      alert("Error deleting user: " + err.message);
    }
  };

  // Filtered records
  const filteredRecords = records.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.username.toLowerCase().includes(q) ||
      r.role.toLowerCase().includes(q)
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
              Portal Users
            </span>
          </div>


          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === 'form' ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'text-text-muted hover:bg-slate-100 hover:text-primary' }`}
            >
              <FileText className="h-4 w-4" />
              Portal Users
            </button>
            <button
              onClick={() => setActiveTab('registry')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === 'registry' ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'text-text-muted hover:bg-slate-100 hover:text-primary' }`}
            >
              <Users className="h-4 w-4" />
              User Accounts Registry
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
                  <h2 className="font-sans text-2xl font-extrabold tracking-tight">User Account Registry</h2>
                  <p className="font-sans text-xs text-white/70 mt-1 max-w-xl leading-relaxed">
                    Create and manage portal access credentials for executives and employees.
                  </p>
                </div>
              </div>
            </div>


            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Lookup Section */}
              {!editingId && (
                <div className="bg-slate-50 p-4 rounded-xl border border-border">
                  <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                    Auto-fill from Employee ID
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. LR-EMP-001"
                      value={searchEmpId}
                      onChange={(e) => setSearchEmpId(e.target.value)}
                      className="flex-1 rounded-xl border border-border bg-white px-4 py-2 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={handleLookupEmployee}
                      className="rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 font-sans text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      Lookup
                    </button>
                  </div>
                </div>
              )}

              {/* Employee ID & Email Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                    Employee ID
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. LR-EMP-001"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                    Email Address
                  </label>
                  <input 
                    type="email" 
                    placeholder="e.g. employee@letzryd.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Anand Kumar..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                />
              </div>

              {/* Role */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                    Designation/Role <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="Executive">Executive</option>
                    <option value="Driver Relations Manager">Driver Relations Manager</option>
                    <option value="Onboarding Specialist">Onboarding Specialist</option>
                    <option value="Partner Onboarding Lead">Partner Onboarding Lead</option>
                    <option value="Regional Operations Manager">Regional Operations Manager</option>
                    <option value="Finance Team">Finance Team</option>
                    <option value="Administrator">Administrator</option>
                    <option value="Other">Other (Custom)</option>
                  </select>
                </div>

                {role === "Other" && (
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Custom Role Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Operations Assistant..."
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                  </div>
                )}
              </div>

              {/* Portal Role (Access Control) */}
              <div>
                <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                  Portal Access Role
                  <span className="ml-2 text-[10px] font-normal text-text-muted normal-case tracking-normal">(Controls which sections this user can access)</span>
                </label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-2xs cursor-pointer"
                >
                  <option value="">— No Portal Role Assigned —</option>
                  {availableRoles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>


              <div className="border-t border-border/60 pt-6">
                <h3 className="font-sans text-xs font-bold text-primary mb-4 flex items-center gap-1.5">
                  Portal Login Credentials
                </h3>
                
                <div className="space-y-4">
                  {/* Username */}
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. anandkumar"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/\s+/g, "").toLowerCase())}
                      required
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs lowercase"
                    />
                    <p className="font-sans text-[10px] text-text-muted mt-1">Only letters/numbers, lowercase, no spaces.</p>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Password {editingId ? "(Optional)" : <span className="text-red-500">*</span>}
                    </label>
                    <input 
                      type="password" 
                      placeholder={editingId ? "Leave blank to keep existing password..." : "••••••••"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required={!editingId}
                      minLength={6}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                    />
                    <p className="font-sans text-[10px] text-text-muted mt-1">
                      {editingId ? "Leave empty to keep current password. Minimum 6 characters if editing." : "Minimum 6 characters recommended."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setName("");
                      setRole("Executive");
                      setCustomRole("");
                      setRoleId("");
                      setUsername("");
                      setPassword("");
                      setEmployeeId("");
                      setEmail("");
                      setSearchEmpId("");
                      setEditingId(null);
                    }}
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
                    <UserPlus className="h-4 w-4" />
                  )}
                  {editingId ? "Update Portal User" : "Register Portal User"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="border-b border-border bg-slate-50/50 px-8 py-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-sans text-lg font-extrabold text-primary tracking-tight">User Registry</h2>
                  <p className="font-sans text-xs text-text-muted mt-0.5">Manage existing portal login accounts and access levels</p>
                </div>

                <div className="flex flex-1 items-center max-w-md gap-3 md:justify-end">
                  <div className="relative w-full">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input 
                      type="text" 
                      placeholder="Search users by name, username, or role..."
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
                <Users className="h-12 w-12 text-border mx-auto mb-3" />
                <h3 className="font-sans text-sm font-bold text-text">No User Accounts Found</h3>
                <p className="font-sans text-xs text-text-muted mt-1">Try modifying your query or register a new user account.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-slate-50/70">
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">User ID</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Employee ID / Email</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Full Name</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Username</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Designation / Role</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Password</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted">Created On</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredRecords.map((r) => {
                      const isSelf = user.id === r.id;
                      const isRevealed = revealedPasswordId === r.id;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-semibold text-text-muted">#{r.id}</td>
                          <td className="px-6 py-4">
                            <div className="font-mono text-xs font-bold text-slate-800">{r.employee_id || "—"}</div>
                            {r.email && <div className="font-sans text-[11px] text-text-muted mt-0.5">{r.email}</div>}
                          </td>
                          <td className="px-6 py-4 font-sans text-sm font-bold text-text">{r.name}</td>
                          <td className="px-6 py-4 font-mono text-xs text-primary font-semibold">@{r.username}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${ r.role === "Administrator" ? "bg-red-50 text-red-600 border border-red-200/50" : r.role === "Finance Team" ? "bg-amber-50 text-amber-600 border border-amber-200/50" : "bg-slate-100 text-slate-700" }`}>
                              {r.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-text font-semibold">
                            <div className="flex items-center gap-1.5">
                              <span>{isRevealed ? r.raw_password : "••••••••"}</span>
                              <button 
                                onClick={() => setRevealedPasswordId(isRevealed ? null : r.id)}
                                className="text-text-muted hover:text-primary transition-all focus:outline-none cursor-pointer"
                                title={isRevealed ? "Hide Password" : "Show Password"}
                              >
                                {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-sans text-xs text-text-muted">
                            {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            }) : "-"}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setEditingId(r.id);
                                setName(r.name);
                                setUsername(r.username);
                                setEmployeeId(r.employee_id || "");
                                setEmail(r.email || "");
                                setSearchEmpId(r.employee_id || "");
                                const commonRoles = ["Executive", "Driver Relations Manager", "Onboarding Specialist", "Partner Onboarding Lead", "Regional Operations Manager", "Finance Team", "Administrator"];
                                if (commonRoles.includes(r.role)) {
                                  setRole(r.role);
                                  setCustomRole("");
                                } else {
                                  setRole("Other");
                                  setCustomRole(r.role);
                                }
                                setPassword(""); // reset password input when editing
                                setActiveTab("form");
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-500 border border-amber-200/40 transition-all cursor-pointer"
                              title="Edit User Details & Password"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(r.id, r.username)}
                              disabled={isSelf}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 hover:bg-red-500 hover:text-white text-red-500 border border-red-200/40 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed`}
                              title={isSelf ? "Cannot delete yourself" : "Delete User Account"}
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
              <span>Showing {filteredRecords.length} of {records.length} accounts</span>
              <span className="flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                Passwords are fully hashed using bcrypt.
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
