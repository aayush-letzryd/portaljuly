import React, { useState, useEffect } from "react";
import { Users, ArrowLeft, RefreshCw, Plus, Trash2, Search, Edit, X, CheckCircle, Info, Phone, Mail, Building, MapPin, Calendar, BadgeCheck, UserCircle, ChevronLeft, FileText } from "lucide-react";
import { User as UserSession, CITIES } from "../types";

interface EmployeesFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

interface Employee {
  id: number;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  company_email: string | null;
  department: string | null;
  city: string | null;
  joining_date: string | null;
  employee_id: string | null;
  status: string;
}

const DEPARTMENTS = [
  "Operations",
  "Driver Relations",
  "Fleet Management",
  "Finance & Accounts",
  "Partner Onboarding",
  "Technology",
  "Human Resources",
  "Customer Support",
  "Administration",
];

const ROLES = [
  "Executive",
  "Driver Relations Manager",
  "Onboarding Specialist",
  "Partner Onboarding Lead",
  "Regional Operations Manager",
  "Fleet Manager",
  "Finance Team",
  "Administrator",
  "Customer Support Agent",
  "HR Manager",
];

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-green-50 text-green-700 ring-green-600/20",
  Inactive: "bg-red-50 text-red-700 ring-red-600/20",
};

export default function EmployeesForm({
  user,
  onBackToSelector,
  onLogout,
}: EmployeesFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "registry">("form");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [city, setCity] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [status, setStatus] = useState("Active");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clock
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: true })
  );
  useEffect(() => {
    const t = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: true }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const displayName = user.name || user.username || "User";
  const initials = displayName.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
  const token = localStorage.getItem("lr_token");

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/employees", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setEmployees(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "registry") fetchEmployees();
  }, [activeTab]);

  const resetForm = () => {
    setName(""); setRole("");
    setPhone(""); setEmail(""); setCompanyEmail(""); setDepartment(""); setCity("");
    setJoiningDate(""); setEmployeeId(""); setStatus("Active");
    setEditingEmployee(null);
  };

  const loadForEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setRole(emp.role);
    setPhone(emp.phone || "");
    setEmail(emp.email || "");
    setCompanyEmail(emp.company_email || "");
    setDepartment(emp.department || "");
    setCity(emp.city || "");
    setJoiningDate(emp.joining_date || "");
    setEmployeeId(emp.employee_id || "");
    setStatus(emp.status || "Active");
    setActiveTab("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Full Name is required.");
    if (!role.trim()) return alert("Role is required.");

    setIsSubmitting(true);
    const payload = {
      name: name.trim(),
      role: role.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      company_email: companyEmail.trim() || null,
      department: department || null,
      city: city || null,
      joining_date: joiningDate || null,
      employee_id: employeeId.trim() || null,
      status: status || "Active"
    };

    try {
      const url = editingEmployee ? `/api/employees/${editingEmployee.id}` : "/api/employees";
      const method = editingEmployee ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert(editingEmployee ? "Employee updated successfully!" : "Employee added successfully!");
        resetForm();
        setActiveTab("registry");
      } else {
        const d = await res.json();
        alert(d.detail || "Failed to save employee");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (emp: Employee) => {
    const msg = emp.status === "Active"
      ? `Remove/deactivate "${emp.name}"? If they have a portal login, they will be deactivated instead of deleted.`
      : `Permanently delete "${emp.name}"?`;
    if (!confirm(msg)) return;

    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (res.ok) {
        alert(d.message || "Employee removed.");
        fetchEmployees();
      } else {
        alert(d.detail || "Failed to remove employee");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const filtered = employees.filter((e) => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q
      || e.name.toLowerCase().includes(q)
      || (e.role || "").toLowerCase().includes(q)
      || (e.department || "").toLowerCase().includes(q)
      || (e.employee_id || "").toLowerCase().includes(q)
      || (e.phone || "").includes(q);
    const matchStatus = statusFilter === "All" || e.status === statusFilter;
    return matchQ && matchStatus;
  });

  const activeCount = employees.filter(e => e.status === "Active").length;
  const inactiveCount = employees.filter(e => e.status === "Inactive").length;

  return (
    <div className="min-h-screen bg-bg">
      {/* HEADER */}
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
              Employees Desk
            </span>
          </div>


          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === 'form' ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'text-text-muted hover:bg-slate-100 hover:text-primary' }`}
            >
              <FileText className="h-4 w-4" />
              Employees Desk
            </button>
            <button
              onClick={() => setActiveTab('registry')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === 'registry' ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'text-text-muted hover:bg-slate-100 hover:text-primary' }`}
            >
              <UserCircle className="h-4 w-4" />
              Employees Registry
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
          /* ─── ADD / EDIT FORM ─── */
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
                  <h2 className="font-sans text-2xl font-extrabold tracking-tight">Employees Desk</h2>
                  <p className="font-sans text-xs text-white/70 mt-1 max-w-xl leading-relaxed">
                    Manage internal LetzRyd team members, designations, and contact details.
                  </p>
                </div>
              </div>
            </div>


            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {/* ── Basic Info ── */}
              <div>
                <h3 className="font-sans text-xs font-bold text-violet-600 mb-4 flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4" /> Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. LR-EMP-0042"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Designation / Role <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      list="roles-list"
                      placeholder="e.g. Operations Intern"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all"
                    />
                    <datalist id="roles-list">
                      {ROLES.map((r) => (
                        <option key={r} value={r} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Department
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">— Select Department —</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Joining Date
                    </label>
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* ── Contact Info ── */}
              <div className="border-t border-border/60 pt-6">
                <h3 className="font-sans text-xs font-bold text-violet-600 mb-4 flex items-center gap-1.5">
                  <Phone className="h-4 w-4" /> Contact & Location
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      Personal Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. rahul@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      LetzRyd Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. rahul@letzryd.com"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                      City / Base Location
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">— Select City —</option>
                      {CITIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.text}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Actions ── */}
              <div className="border-t border-border pt-5 flex gap-3">
                {editingEmployee && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 rounded-xl border border-border bg-white px-4 py-3 font-sans text-sm font-bold text-text hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-primary hover:bg-primary-hover px-4 py-3 font-sans text-sm font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {editingEmployee ? "Save Changes" : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ─── REGISTRY TABLE ─── */
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border bg-white p-4 shadow-xs">
                <p className="font-sans text-[10px] font-bold text-text-muted">Total Staff</p>
                <p className="font-sans text-2xl font-extrabold text-text mt-1">{employees.length}</p>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-xs">
                <p className="font-sans text-[10px] font-bold text-green-600">Active</p>
                <p className="font-sans text-2xl font-extrabold text-green-700 mt-1">{activeCount}</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-xs">
                <p className="font-sans text-[10px] font-bold text-red-600">Inactive</p>
                <p className="font-sans text-2xl font-extrabold text-red-700 mt-1">{inactiveCount}</p>
              </div>
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 shadow-xs">
                <p className="font-sans text-[10px] font-bold text-violet-600">Departments</p>
                <p className="font-sans text-2xl font-extrabold text-violet-700 mt-1">
                  {new Set(employees.filter(e => e.department).map(e => e.department)).size}
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="rounded-xl border border-border bg-white p-4 shadow-xs flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-52">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search name, role, department, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white pl-9 pr-4 py-2 font-sans text-xs focus:border-violet-500 focus:outline-none transition-all"
                />
              </div>
              <div className="flex gap-2">
                {["All", "Active", "Inactive"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-lg px-3 py-1.5 font-sans text-xs font-bold border transition-all cursor-pointer ${statusFilter === s ? "bg-violet-600 text-white border-violet-600" : "bg-white text-text-muted border-border hover:border-violet-300"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={fetchEmployees}
                disabled={isLoading}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-bg text-text transition-all cursor-pointer disabled:opacity-50 ml-auto"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw className="h-8 w-8 animate-spin text-violet-600" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-20 text-center">
                  <UserCircle className="h-12 w-12 text-border mx-auto mb-3" />
                  <h3 className="font-sans text-sm font-bold text-text">No Employees Found</h3>
                  <p className="font-sans text-xs text-text-muted mt-1">Add employees using the form.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-border bg-slate-50/70">
                        <th className="px-5 py-3.5 font-sans text-[10px] font-bold text-text-muted">Employee</th>
                        <th className="px-5 py-3.5 font-sans text-[10px] font-bold text-text-muted">Role / Dept</th>
                        <th className="px-5 py-3.5 font-sans text-[10px] font-bold text-text-muted">Contact</th>
                        <th className="px-5 py-3.5 font-sans text-[10px] font-bold text-text-muted">Location</th>
                        <th className="px-5 py-3.5 font-sans text-[10px] font-bold text-text-muted">Joined</th>
                        <th className="px-5 py-3.5 font-sans text-[10px] font-bold text-text-muted">Status</th>
                        <th className="px-5 py-3.5 font-sans text-[10px] font-bold text-text-muted text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filtered.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 font-sans text-xs font-extrabold text-violet-600">
                                {emp.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-sans text-sm font-bold text-text">{emp.name}</p>
                                {emp.employee_id && (
                                  <p className="font-mono text-[10px] text-text-muted">{emp.employee_id}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-sans text-xs font-semibold text-text">{emp.role}</p>
                            {emp.department && (
                              <p className="font-sans text-[11px] text-text-muted mt-0.5">{emp.department}</p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {emp.phone && (
                              <p className="font-sans text-xs text-text flex items-center gap-1">
                                <Phone className="h-3 w-3 text-text-muted" /> {emp.phone}
                              </p>
                            )}
                            {emp.email && (
                              <p className="font-sans text-xs text-text-muted flex items-center gap-1 mt-0.5">
                                <Mail className="h-3 w-3" /> {emp.email} (P)
                              </p>
                            )}
                            {emp.company_email && (
                              <p className="font-sans text-xs text-violet-600 flex items-center gap-1 mt-0.5">
                                <Mail className="h-3 w-3" /> {emp.company_email} (W)
                              </p>
                            )}
                            {!emp.phone && !emp.email && !emp.company_email && <span className="text-xs text-text-muted italic">—</span>}
                          </td>
                          <td className="px-5 py-4 font-sans text-xs text-text">
                            {emp.city ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-text-muted" /> {emp.city}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-5 py-4 font-sans text-xs text-text-muted">
                            {emp.joining_date
                              ? new Date(emp.joining_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                              : "—"}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset ${STATUS_STYLES[emp.status] || STATUS_STYLES.Active}`}>
                              {emp.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => loadForEdit(emp)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 hover:bg-violet-500 hover:text-white text-violet-600 border border-violet-200/40 transition-all cursor-pointer"
                                title="Edit Employee"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(emp)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 hover:bg-red-500 hover:text-white text-red-500 border border-red-200/40 transition-all cursor-pointer"
                                title="Remove Employee"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="border-t border-border bg-slate-50/50 px-6 py-4 flex items-center justify-between text-xs text-text-muted">
                <span>Showing {filtered.length} of {employees.length} employees</span>
                <span className="flex items-center gap-1">
                  <Info className="h-3.5 w-3.5 text-violet-500" />
                  Employees with portal logins are deactivated instead of deleted.
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
