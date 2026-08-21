import { compressImage } from "../utils/imageCompressor";
import React, { useState, useMemo } from "react";
import { 
  Calendar, MapPin, User, Phone, FileText, CheckCircle, 
  Clock, ArrowLeft, Download, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, AlertTriangle, ShieldCheck, Filter, Plus, ChevronLeft, IndianRupee, Settings, DollarSign
} from "lucide-react";
import { AdjustmentRecord, User as UserSession, CITIES } from "../types";
import CameraCapture from "./CameraCapture";

interface AdjustmentFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

const CONTESTED_OPTIONS = ["Base Rent", "Tolls", "Penalties", "Vehicle Damage", "Device Deposit", "Others"];

export default function AdjustmentForm({ 
  user, 
  onBackToSelector, 
  onLogout
}: AdjustmentFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "registry">("form");
  const [formMode, setFormMode] = useState<"new" | "edit">("new");
  
  // Header clock state
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true
  }));

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: true
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // LetzRyd Document State Fields
  const [editingId, setEditingId] = useState<number | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [partnerCode, setPartnerCode] = useState("");
  const [driverId, setDriverId] = useState("");
  
  // New Fields
  const [hisaabNumber, setHisaabNumber] = useState("");
  const [adjustmentLevel, setAdjustmentLevel] = useState<"Operator" | "Driver">("Operator");
  const [adjustmentType, setAdjustmentType] = useState<"Credit" | "Debit" | "Waiver">("Credit");
  const [adjustmentDate, setAdjustmentDate] = useState(new Date().toISOString().split("T")[0]); // Hardcoded today
  const [enterAmount, setEnterAmount] = useState("");
  const [contestedLineItems, setContestedLineItems] = useState<string[]>([]);
  
  // Approvals & Proof
  const [severityLevel, setSeverityLevel] = useState("Low");
  const [costLevel, setCostLevel] = useState("Minor (<₹1k)");
  const [escalateTo, setEscalateTo] = useState("");
  const [submitterComments, setSubmitterComments] = useState("");
  const [sentForApproval, setSentForApproval] = useState<"Yes" | "No">("Yes");
  const [approvalStatus, setApprovalStatus] = useState<string>("Draft");
  const [approversList, setApproversList] = useState<any[]>([]);
  const [approverSearchQuery, setApproverSearchQuery] = useState("");
  const [isApproverDropdownOpen, setIsApproverDropdownOpen] = useState(false);

  React.useEffect(() => {
    const token = localStorage.getItem("lr_token");
    // Fetch all approvers list
    fetch("/api/july/approvers", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setApproversList(data); })
      .catch(() => {});

    // Fetch submitter's designated approval chain
    const uid = (user as any).portal_user_id || (user as any).id || (user as any).user_id;
    if (uid) {
      fetch(`/api/approval-chain/${uid}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(chain => {
          if (Array.isArray(chain) && chain.length > 0) {
            const l1 = chain.find((c: any) => c.level === 1) || chain[0];
            if (l1 && l1.approver_name) {
              setEscalateTo(String(l1.approver_id || ""));
              setApproverSearchQuery(`${l1.approver_name} (${l1.approver_role_name || l1.approver_role_code})`);
            }
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Legacy fields (kept in state for backend compatibility)
  const [financeTeamStatus, setFinanceTeamStatus] = useState<"Approved" | "Pending" | "Rejected">("Pending");
  const [status, setStatus] = useState<"Completed" | "Hold" | "Declined">("Hold");
  
  const [stats, setStats] = useState({
    total_adjustments: 0,
    total_amount: 0,
    approved_count: 0,
    completed_count: 0
  });

  // Proof Image State
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Registry Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterAdjType, setFilterAdjType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  
  const [retrieveSearchInput, setRetrieveSearchInput] = useState("");

  const displayName = user.name || user.username || "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const [records, setRecords] = useState<AdjustmentRecord[]>([]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/adjustment/stats", {
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
      const res = await fetch("/api/adjustment", {
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

  React.useEffect(() => {
    fetchStats();
    fetchRecords();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file).then(setPhoto);
    }
  };

  const handleContestedToggle = (item: string) => {
    setContestedLineItems(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const loadRecordForEdit = async (id: number) => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/adjustment/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Record not found");
      const data = await res.json();
      
      setEditingId(data.id);
      setPartnerName(data.partner_name || "");
      setPartnerCode(data.partner_code || "");
      setDriverId(data.driver_id || "");
      
      setHisaabNumber(data.hisaab_number || "");
      setAdjustmentLevel((data.adjustment_level === "Driver" || data.adjustment_level === "Operator") ? data.adjustment_level : "Operator");
      setAdjustmentType(data.adjustment_type || "Credit");
      setAdjustmentDate(data.adjustment_date || new Date().toISOString().split("T")[0]);
      setEnterAmount(data.enter_amount || "");
      
      if (data.contested_line_items) {
        try {
          setContestedLineItems(JSON.parse(data.contested_line_items));
        } catch {
          setContestedLineItems(data.contested_line_items.split(','));
        }
      } else {
        setContestedLineItems([]);
      }

      setSeverityLevel(data.severity_level || "Low");
      setCostLevel(data.cost_level || "Minor (<₹1k)");
      setEscalateTo(data.escalate_to || "");
      setSubmitterComments(data.submitter_comments || data.remarks || "");
      setSentForApproval(data.sent_for_approval || "No");
      setApprovalStatus(data.approval_status || "Draft");

      setFinanceTeamStatus(data.finance_team_status || "Pending");
      setStatus(data.status || "Hold");
      setPhoto(data.photo || null);
      
      setFormMode("edit");
      setActiveTab("form");
      setRetrieveSearchInput("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormMode("new");
    setPartnerName("");
    setPartnerCode("");
    setDriverId("");
    
    setHisaabNumber("");
    setAdjustmentLevel("Operator");
    setAdjustmentType("Credit");
    setAdjustmentDate(new Date().toISOString().split("T")[0]);
    setEnterAmount("");
    setContestedLineItems([]);
    
    setSeverityLevel("Low");
    setCostLevel("Minor (<₹1k)");
    setEscalateTo("");
    setSubmitterComments("");
    setSentForApproval("No");
    setApprovalStatus("Draft");

    setFinanceTeamStatus("Pending");
    setStatus("Hold");
    setPhoto(null);
  };

  const handleSaveAndSubmit = async (sendForApproval: boolean) => {
    if (!enterAmount || parseFloat(enterAmount) <= 0) {
      return alert("Please enter a valid Amount");
    }

    if (!partnerName.trim()) {
      return alert("Please enter Partner Name");
    }

    const payload = {
      partner_name: partnerName.trim(),
      partner_code: partnerCode.trim(),
      driver_id: driverId.trim() || null,
      
      // Legacy overrides to satisfy backend Pydantic schema
      partner_number: null,
      vehicle_number: null,
      city_name: (user as any).city || "Bangalore",
      partner_type: null,
      adjustment_nature: "Monetary",
      time_duration: null,
      remittance_towards: null,
      adjustment_related_to: null,
      first_level_approval_by: user.name,
      finance_team_remarks: null,
      final_level_approval_by: null,

      adjustment_level: adjustmentLevel,
      adjustment_type: adjustmentType,
      adjustment_date: adjustmentDate,
      enter_amount: enterAmount,
      
      hisaab_number: hisaabNumber.trim(),
      contested_line_items: JSON.stringify(contestedLineItems),
      severity_level: severityLevel,
      cost_level: costLevel,
      escalate_to: String(escalateTo || ""),
      submitter_comments: submitterComments.trim(),
      sent_for_approval: sendForApproval ? "Yes" : "No",
      remarks: submitterComments.trim(),

      finance_team_status: financeTeamStatus,
      status: status,
      photo: photo
    };

    try {
      const token = localStorage.getItem("lr_token");
      const url = editingId ? `/api/adjustment/${editingId}` : "/api/adjustment";
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
        throw new Error(errorText || "Failed to save adjustment request");
      }

      const resData = await res.json();
      const targetId = editingId || resData.id;

      if (sendForApproval && targetId) {
        const sendRes = await fetch(`/api/adjustment/send-for-approval/${targetId}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!sendRes.ok) {
          const sendErr = await sendRes.json();
          throw new Error(sendErr.detail || "Saved as draft, but failed to send for approval");
        }
        alert("🚀 Hisaab Adjustment Submitted & Sent for Approval Successfully!");
      } else {
        alert(editingId ? "💾 Hisaab Adjustment Updated as Draft!" : "💾 Hisaab Adjustment Saved as Draft!");
      }

      resetForm();
      fetchStats();
      fetchRecords();
      setActiveTab("registry");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveAndSubmit(true);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the adjustment request for ${name}?`)) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/adjustment/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Delete failed");
      alert("Adjustment deleted successfully");
      fetchStats();
      fetchRecords();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendForApproval = async (id: number) => {
    if (!window.confirm(`Send Adjustment #${id} for approval?`)) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/adjustment/send-for-approval/${id}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to send for approval");
      }
      alert("Sent for approval successfully!");
      fetchRecords();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filter and Search logic
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterCity !== "all" && r.city_name !== filterCity) return false;
      if (filterAdjType !== "all" && r.adjustment_type !== filterAdjType) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (r.partner_name || "").toLowerCase().includes(q) ||
          (r.partner_code || "").toLowerCase().includes(q) ||
          (r.driver_id || "").toLowerCase().includes(q) ||
          (r.hisaab_number || "").toLowerCase().includes(q) ||
          String(r.id).includes(q)
        );
      }
      return true;
    });
  }, [records, searchQuery, filterCity, filterAdjType, filterStatus]);

  // Searchable Dropdown Logic
  const handleRetrieveSearchSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRetrieveSearchInput(val);
    const match = records.find(r => `[#${r.id}] ${r.partner_name} - ${r.hisaab_number || r.partner_code}` === val);
    if (match) {
      loadRecordForEdit(match.id);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return alert("No records to export");
    const headers = [
      "ID", "Partner Name", "Partner Code", "Driver ID", "Hisaab Number", 
      "Adj Level", "Adjustment Type", "Date", 
      "Amount", "Contested Items", "Severity", "Cost Level", "Escalated To", "Submitter Comments", 
      "Sent For Approval", "Finance Status", "Status", "Created At"
    ];

    const rows = filteredRecords.map((r) => [
      r.id,
      `"${r.partner_name.replace(/"/g, '""')}"`,
      `"${r.partner_code.replace(/"/g, '""')}"`,
      r.driver_id || "",
      r.hisaab_number || "",
      r.adjustment_level || "",
      r.adjustment_type,
      r.adjustment_date,
      r.enter_amount,
      `"${(r.contested_line_items || "").replace(/"/g, '""')}"`,
      r.severity_level || "",
      r.cost_level || "",
      r.escalate_to || "",
      `"${(r.submitter_comments || r.remarks || "").replace(/"/g, '""')}"`,
      r.sent_for_approval || "",
      r.finance_team_status,
      r.status,
      r.created_at
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `letzryd_hisaab_adjustments_${new Date().toISOString().split("T")[0]}.csv`);
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
              src="/letzryd_icon.png" 
              alt="LetzRyd logo" 
              className="h-9 w-auto object-contain cursor-pointer"
              onClick={onBackToSelector}
            />
            <span className="hidden h-5 border-l border-border sm:inline-block" />
            <span className="hidden font-sans text-xs font-semibold text-text-muted sm:inline-block">
              Fleet Portal
            </span>
          </div>

          {/* Navigation Pills */}
          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab("form")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "form" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <FileText className="h-4 w-4" />
              Adjustment Form
            </button>
            <button
              onClick={() => {
                setActiveTab("registry");
                fetchStats();
                fetchRecords();
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "registry" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <Settings className="h-4 w-4" />
              Adjustment Registry
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
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {activeTab === "form" ? (
          <div>
            {/* Form card header */}
            <div className="rounded-2xl border border-border bg-white shadow-xl overflow-hidden mb-10 transition-all">
              <div className="bg-primary text-white px-8 py-6 relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-hover via-primary to-primary opacity-60" />
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden w-full">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20 pointer-events-none"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <img src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" className="h-8 brightness-0 invert" alt="LetzRyd" referrerPolicy="no-referrer" />
                      <span className="px-2 py-0.5 rounded border border-white/30 bg-white/20 text-white text-[10px] font-bold tracking-widest backdrop-blur-sm">
                        Hisaab Management
                      </span>
                    </div>
                    <h1 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                      {editingId ? `Edit Adjustment Record #${editingId}` : "Hisaab Adjustments Application"}
                    </h1>
                  </div>
                </div>
              </div>

              {editingId && (
                <div className="bg-yellow-50 px-8 py-3 border-b border-yellow-200 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-yellow-800 text-sm font-semibold">
                    <Edit className="h-4 w-4" />
                    Editing Adjustment Record #{editingId}
                  </div>
                  <button type="button" onClick={resetForm} className="text-xs text-yellow-700 hover:text-yellow-900 font-bold underline cursor-pointer">
                    Cancel Edit
                  </button>
                </div>
              )}

              {/* Approval Workflow Progress Banner */}
              <div className="bg-slate-50 border-b border-border px-8 py-3.5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Approval Workflow</span>
                    <h3 className="text-xs font-bold text-slate-800">Two-Level Verification Hierarchy</h3>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="flex items-center gap-1 text-slate-700 font-bold">1. Draft</span>
                    <span className="text-slate-300">➔</span>
                    <span className="flex items-center gap-1 text-blue-600 font-bold">2. L1 (Manager)</span>
                    <span className="text-slate-300">➔</span>
                    <span className="flex items-center gap-1 text-purple-600 font-bold">3. L2 (City Head)</span>
                    <span className="text-slate-300">➔</span>
                    <span className="flex items-center gap-1 text-emerald-600 font-bold">4. Approved</span>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-8 space-y-10">
                
                {/* 2 COLUMN GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  
                  {/* COLUMN 1: TARGET DETAILS */}
                  <div className="space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                        Target Details
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Adjustment Level <span className="text-red-500">*</span></label>
                        <select 
                          value={adjustmentLevel}
                          onChange={(e) => setAdjustmentLevel(e.target.value as any)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                        >
                          <option value="Operator">Operator</option>
                          <option value="Driver">Driver</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Partner / Driver Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          placeholder="Enter full name..."
                          value={partnerName}
                          onChange={(e) => setPartnerName(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                        />
                      </div>
                      
                      {adjustmentLevel === "Operator" && (
                        <div>
                          <label className="block font-sans text-xs font-bold text-text-muted mb-2">Partner Code <span className="text-red-500">*</span></label>
                          <input 
                            type="text" 
                            placeholder="Unique LetzRyd ID..."
                            value={partnerCode}
                            onChange={(e) => setPartnerCode(e.target.value)}
                            required
                            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                          />
                        </div>
                      )}

                      {adjustmentLevel === "Driver" && (
                        <div>
                          <label className="block font-sans text-xs font-bold text-text-muted mb-2">Driver ID <span className="text-red-500">*</span></label>
                          <input 
                            type="text" 
                            placeholder="Enter Driver ID..."
                            value={driverId}
                            onChange={(e) => setDriverId(e.target.value)}
                            required
                            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Hisaab Number <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          placeholder="Reference Hisaab Bill No..."
                          value={hisaabNumber}
                          onChange={(e) => setHisaabNumber(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 2: ADJUSTMENT DETAILS */}
                  <div className="space-y-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                        Adjustment Details
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Adjustment Type <span className="text-red-500">*</span></label>
                        <div className="flex gap-4">
                          {["Credit", "Debit", "Waiver"].map((type) => (
                            <label key={type} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-bg cursor-pointer transition-all shadow-2xs">
                              <input 
                                type="radio" 
                                name="adjustmentType" 
                                checked={adjustmentType === type}
                                onChange={() => setAdjustmentType(type as any)}
                                className="text-primary focus:ring-primary cursor-pointer"
                              />
                              {type}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block font-sans text-xs font-bold text-text-muted mb-2">Enter Amount (₹) <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                            <input 
                              type="number" 
                              placeholder="0.00"
                              value={enterAmount}
                              onChange={(e) => setEnterAmount(e.target.value)}
                              required
                              className="w-full pl-9 rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs"
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="block font-sans text-xs font-bold text-text-muted mb-2">Date of Application</label>
                          <input 
                            type="date" 
                            value={adjustmentDate}
                            disabled
                            className="w-full rounded-xl border border-border bg-slate-50 px-4 py-2.5 font-sans text-sm outline-none transition-all shadow-2xs cursor-not-allowed opacity-70"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Contested Hisaab Line Items <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-2 gap-2">
                          {CONTESTED_OPTIONS.map(option => (
                            <label key={option} className="flex items-center gap-2 text-sm text-text cursor-pointer hover:bg-slate-50 p-1.5 rounded border border-transparent hover:border-border">
                              <input 
                                type="checkbox"
                                checked={contestedLineItems.includes(option)}
                                onChange={() => handleContestedToggle(option)}
                                className="rounded text-primary focus:ring-primary"
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                        {contestedLineItems.length === 0 && <p className="text-[10px] text-red-500 mt-1">Please select at least one contested item.</p>}
                      </div>

                    </div>
                  </div>

                  {/* COLUMN 3: APPROVALS & ESCALATIONS */}
                  <div className="space-y-6 lg:col-span-2 border-t border-border pt-6">
                    <div className="border-b border-border pb-3">
                      <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                        Approvals & Escalations
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Severity Level</label>
                        <select 
                          value={severityLevel}
                          onChange={(e) => setSeverityLevel(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Critical">Critical</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">Cost Level</label>
                        <select 
                          value={costLevel}
                          onChange={(e) => setCostLevel(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                        >
                          <option value="Minor (<₹1k)">Minor (&lt;₹1,000)</option>
                          <option value="Moderate (₹1k-₹5k)">Moderate (₹1,000 - ₹5,000)</option>
                          <option value="Major (>₹5k)">Major (&gt;₹5,000)</option>
                        </select>
                      </div>

                      <div className="md:col-span-3">
                        <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                          Submitter Comments & Justification <span className="text-red-500">*</span>
                        </label>
                        <textarea 
                          placeholder="Provide detailed reason or justification for this adjustment request..."
                          value={submitterComments}
                          onChange={(e) => setSubmitterComments(e.target.value)}
                          required
                          rows={2}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-2xs resize-none"
                        />
                      </div>

                    </div>
                  </div>
                </div>

                {/* ATTACHMENT SECTION */}
                <div className="border-t border-border pt-10">
                  <div className="border-b border-border pb-3 mb-6">
                    <h3 className="font-sans text-sm font-bold text-primary">
                      4. Attachments & Proof (Optional)
                    </h3>
                    <p className="font-sans text-xs text-text-muted mt-1">Upload any receipts, bills, or proof related to this adjustment.</p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Capture Card */}
                    <div className="w-full md:w-80 rounded-2xl border border-dashed border-border bg-bg/30 p-6 text-center hover:bg-bg/50 transition-all shadow-2xs">
                      {photo ? (
                        <div className="relative inline-block">
                          <img 
                            src={photo} 
                            alt="Attachment Proof" 
                            className="h-32 w-auto object-cover rounded-xl border border-border shadow-xs"
                          />
                          <button 
                            type="button"
                            onClick={() => setPhoto(null)}
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
                          <p className="font-sans text-xs font-bold text-text-muted">No photo uploaded</p>
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

                {/* FORM ACTIONS */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-border pt-8">
                  <div className="flex flex-col gap-1 text-left w-full sm:w-auto">
                    <p className="text-[10px] font-bold text-red-500">* means mandatory</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-end">
                    {/* Searchable Approver Selector */}
                    <div className="relative w-full sm:w-72">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search & select approver..."
                          value={approverSearchQuery}
                          onFocus={() => setIsApproverDropdownOpen(true)}
                          onChange={(e) => { setApproverSearchQuery(e.target.value); setIsApproverDropdownOpen(true); }}
                          required
                          className="w-full pl-8 pr-3 py-2 bg-white border border-border rounded-xl text-xs outline-none focus:border-primary shadow-2xs font-semibold"
                        />
                      </div>
                      
                      {isApproverDropdownOpen && (
                        <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto z-50 p-1">
                          {approversList
                            .filter(a => !approverSearchQuery || a.name?.toLowerCase().includes(approverSearchQuery.toLowerCase()) || a.role?.toLowerCase().includes(approverSearchQuery.toLowerCase()) || a.city?.toLowerCase().includes(approverSearchQuery.toLowerCase()))
                            .map(a => (
                              <div
                                key={a.id}
                                onClick={() => {
                                  setEscalateTo(a.id);
                                  setApproverSearchQuery(`${a.name} (${a.role})`);
                                  setIsApproverDropdownOpen(false);
                                }}
                                className="p-2 hover:bg-slate-100 rounded-lg cursor-pointer text-xs"
                              >
                                <p className="font-bold text-slate-900">{a.name} <span className="text-emerald-600 font-normal">({a.role})</span></p>
                                <p className="text-[10px] text-slate-500">{a.city}</p>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleSaveAndSubmit(false)}
                      className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-5 py-2.5 font-sans text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer"
                    >
                      💾 Save as Draft
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleSaveAndSubmit(true)}
                      className="rounded-xl bg-primary hover:bg-primary-hover px-6 py-2.5 font-sans text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
                    >
                      🚀 {editingId ? "Update & Send for Approval" : "Submit & Send for Approval"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* REGISTRY REGISTRATION */
          <div className="space-y-10">
            
            {/* 4 STATS CARDS */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              
              {/* CARD 1: Total Adjustments */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="font-sans text-[10px] font-bold text-text-muted tracking-widest block">Total Adjustments</span>
                  <span className="font-sans text-3xl font-extrabold text-primary tracking-tight block mt-1">{stats.total_adjustments}</span>
                  <span className="font-sans text-[10px] text-text-muted block mt-0.5">Requests processed</span>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-primary">
                  <Settings className="h-6 w-6" />
                </div>
              </div>

              {/* CARD 2: Total Amount */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="font-sans text-[10px] font-bold text-text-muted tracking-widest block">Total Amount</span>
                  <span className="font-sans text-3xl font-extrabold text-amber-600 tracking-tight block mt-1">₹{stats.total_amount.toLocaleString("en-IN")}</span>
                  <span className="font-sans text-[10px] text-text-muted block mt-0.5">Net adjustment value</span>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-50 text-amber-600">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>

              {/* CARD 3: Approved By Finance */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="font-sans text-[10px] font-bold text-text-muted tracking-widest block">Approved By Finance</span>
                  <span className="font-sans text-3xl font-extrabold text-green tracking-tight block mt-1">{stats.approved_count}</span>
                  <span className="font-sans text-[10px] text-text-muted block mt-0.5">Ready for settlement</span>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green/10 text-green">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </div>

              {/* CARD 4: Completed Status */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="font-sans text-[10px] font-bold text-text-muted tracking-widest block">Completed Status</span>
                  <span className="font-sans text-3xl font-extrabold text-indigo-600 tracking-tight block mt-1">{stats.completed_count}</span>
                  <span className="font-sans text-[10px] text-text-muted block mt-0.5">Fully closed adjustments</span>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* TABLE & FILTER CARD */}
            <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border bg-white px-6 py-5">
                <div>
                  <h2 className="font-sans text-lg font-extrabold text-text tracking-tight">Adjustment Registry</h2>
                  <p className="font-sans text-xs text-text-muted mt-0.5">Audit log of all adjustment requests, approval states, and proofs.</p>
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
                    className="flex items-center gap-1.5 rounded-xl bg-green px-4 py-2 font-sans text-xs font-bold text-white hover:bg-green/90 transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Adjustment
                  </button>
                </div>
              </div>

              {/* SEARCH & FILTERS BAR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-b border-border bg-bg/30 px-6 py-4">
                
                <div className="relative flex items-center">
                  <Search className="absolute left-3.5 h-4 w-4 text-text-muted pointer-events-none" />
                  <input 
                    type="text" 
                    placeholder="Search name, code, Hisaab..." 
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
                    value={filterAdjType}
                    onChange={(e) => setFilterAdjType(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="all">All Types</option>
                    <option value="Credit">Credit</option>
                    <option value="Debit">Debit</option>
                    <option value="Waiver">Waiver</option>
                  </select>
                </div>

                <div className="relative">
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2 font-sans text-xs focus:border-primary focus:outline-none transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="all">All Outcomes</option>
                    <option value="Completed">Completed</option>
                    <option value="Hold">Hold</option>
                    <option value="Declined">Declined</option>
                  </select>
                </div>
              </div>

              {/* TABLE CONTAINER */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-bg/50 select-none">
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-left w-16">ID</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-left">Partner / Hisaab</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-left">Adj. Details</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-left">Amount & Type</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-left">Approvals</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-left">Status</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-left">Approval Status</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-muted text-right w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-text-muted font-sans text-xs">
                          No matching adjustment records found in the database.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((r) => {
                        const appStatus = r.approval_status || "Draft";
                        const isDraft = appStatus === "Draft" || !appStatus;
                        let appBadge = <span className="inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">Draft</span>;
                        if (appStatus.includes("Pending")) {
                          appBadge = <span className="inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">⏳ {appStatus}</span>;
                        } else if (appStatus.includes("Approved")) {
                          appBadge = <span className="inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold bg-green-100 text-green-800 border border-green-200">✅ Approved</span>;
                        } else if (appStatus.includes("Reject")) {
                          appBadge = <span className="inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold bg-red-100 text-red-800 border border-red-200">❌ Rejected</span>;
                        }
                        return (
                          <tr key={r.id} className="hover:bg-bg/10 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs font-bold text-primary">#{r.id}</td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-xs font-bold text-text">{r.partner_name}</div>
                              <div className="font-mono text-[10px] text-text-muted mt-0.5">{r.partner_code} · {r.adjustment_level}</div>
                              {r.hisaab_number && <div className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded w-max mt-1 text-bold">Hisaab: {r.hisaab_number}</div>}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-[10px] font-bold text-text">Severity: {r.severity_level || "N/A"}</div>
                              {r.driver_id && <div className="font-mono text-[10px] text-text-muted mt-0.5">Driver ID: #{r.driver_id}</div>}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-sans text-xs font-extrabold text-primary">₹{parseFloat(r.enter_amount).toLocaleString("en-IN")}</div>
                              <span data-name="hisaab_line_items" className={`inline-block rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold mt-1 ${ r.adjustment_type === "Credit" ? "bg-green/10 text-green" : r.adjustment_type === "Debit" ? "bg-red-50 text-red-600 border border-red-100" : "bg-amber-50 text-amber-600 border border-amber-100" }`}>
                                {r.adjustment_type}
                              </span>
                              <div className="font-sans text-[9px] text-text-muted mt-1">{r.adjustment_date}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span data-name="sent_for_approval" className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold ${ r.finance_team_status === "Approved" ? "bg-green/10 text-green" : r.finance_team_status === "Rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700" }`}>
                                {r.finance_team_status}
                              </span>
                              {r.escalate_to && (
                                <div className="font-sans text-[9px] text-text-muted mt-1">To: {r.escalate_to}</div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold ${ r.status === "Completed" ? "bg-green-500 text-white" : r.status === "Declined" ? "bg-red-600 text-white" : "bg-yellow-500 text-white" }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {appBadge}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isDraft && (
                                  <button
                                    onClick={() => handleSendForApproval(r.id)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-sans text-[10px] font-bold transition-colors cursor-pointer"
                                    title="Send for Approval"
                                  >
                                    ✉ Send
                                  </button>
                                )}
                                <button 
                                  onClick={() => loadRecordForEdit(r.id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg hover:bg-primary hover:text-white transition-colors cursor-pointer"
                                  title="Edit Adjustment"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(r.id, r.partner_name)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg text-red-600 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                                  title="Delete Adjustment"
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
            setPhoto(base64);
            setCameraActive(false);
          }}
          onClose={() => setCameraActive(false)}
        />
      )}

      {/* FOOTER SECTION */}
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