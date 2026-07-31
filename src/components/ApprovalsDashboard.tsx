import React, { useState, useEffect } from "react";
import {
  CheckCircle, XCircle, ArrowRight, ArrowDown, Clock, ChevronLeft,
  RefreshCw, User, Building2, Calendar, AlertTriangle,
  FileText, Send, RotateCcw, Eye, Filter, Inbox, ClipboardList,
  ChevronDown, X, Loader2, Search, UserCheck, Truck, TicketIcon,
  Wrench, Settings, IndianRupee, Layers, CheckSquare, Square, MessageSquare,
  MapPin, ShieldCheck
} from "lucide-react";

interface Props {
  user: any;
  onBackToSelector: () => void;
  onLogout: () => void;
}

const MODULE_CONFIG: Record<string, { label: string; textClass: string }> = {
  individual_onboarding: { label: "Driver Onboarding", textClass: "text-blue-600 font-semibold" },
  vehicle_onboarding: { label: "Vehicle Onboarding", textClass: "text-purple-600 font-semibold" },
  tickets_desk: { label: "Tickets Desk", textClass: "text-orange-600 font-semibold" },
  adjustment_form: { label: "Adjustments", textClass: "text-amber-600 font-semibold" },
  workshops_desk: { label: "Workshops", textClass: "text-emerald-600 font-semibold" },
  accidents_form: { label: "Accidents", textClass: "text-rose-600 font-semibold" },
  expenses_form: { label: "Expenses", textClass: "text-indigo-600 font-semibold" },
};

const STATUS_TEXT_CLASSES: Record<string, string> = {
  "Pending Approval": "text-amber-600 font-bold",
  "Approved": "text-emerald-600 font-bold",
  "Rejected": "text-rose-600 font-bold",
  "Changes Requested": "text-orange-600 font-bold",
  "Direct Resolution": "text-slate-500 font-medium",
  "Pending Escalation Approval": "text-amber-600 font-bold",
};

const ACTION_ICONS: Record<string, string> = {
  SUBMITTED: "📤",
  APPROVED: "✅",
  REJECTED: "❌",
  FORWARDED: "➡️",
  SENT_BACK: "↩️",
};

export default function ApprovalsDesk({ user, onBackToSelector, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<"pending" | "my-submissions">("pending");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [approvers, setApprovers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  
  const [recordDetails, setRecordDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [approvalLogs, setApprovalLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Dedicated Forward Modal state
  const [forwardModalItem, setForwardModalItem] = useState<any | null>(null);
  const [forwardToId, setForwardToId] = useState<number | null>(null);
  const [forwardComment, setForwardComment] = useState("");
  const [approverSearch, setApproverSearch] = useState("");
  const [isApproverOpen, setIsApproverOpen] = useState(false);

  // Multi-select state for Batch Approval
  const [selectedItemKeys, setSelectedItemKeys] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  // Row action modal/overlay states
  const [actionModal, setActionModal] = useState<{
    type: "APPROVE" | "REJECT" | "FORWARD" | "SEND_BACK" | null;
  }>({ type: null });
  const [remarks, setRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const token = () => localStorage.getItem("lr_token") || "";

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pendingRes, subRes, appRes] = await Promise.all([
        fetch("/api/july/pending-approvals", { headers: { Authorization: `Bearer ${token()}` } }),
        fetch("/api/july/my-submissions", { headers: { Authorization: `Bearer ${token()}` } }),
        fetch("/api/july/approvers", { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      if (pendingRes.ok) setPendingItems(await pendingRes.json());
      if (subRes.ok) setMySubmissions(await subRes.json());
      if (appRes.ok) setApprovers(await appRes.json());
    } catch (e) {
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (module: string, id: number) => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/july/approval-logs/${module}/${id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setApprovalLogs(await res.json());
    } finally {
      setLogsLoading(false);
    }
  };

  const loadDetails = async (module: string, id: number) => {
    setDetailsLoading(true);
    setRecordDetails(null);
    try {
      const res = await fetch(`/api/july/record-details/${module}/${id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setRecordDetails(await res.json());
    } catch (e) {
      showToast("Failed to load form details", "error");
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const openRecord = (rec: any) => {
    setSelectedRecord(rec);
    setApprovalLogs([]);
    loadLogs(rec.module, rec.id);
    loadDetails(rec.module, rec.id);
    setActionModal({ type: null });
    setRemarks("");
    setForwardToId(null);
  };

  // Execute Forwarding from Forward Modal Popup
  const handleConfirmForward = async () => {
    if (!forwardModalItem) return;
    if (!forwardToId) {
      showToast("Please select who to forward to", "error");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/july/approval/${forwardModalItem.module}/${forwardModalItem.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          action: "FORWARD",
          remarks: forwardComment.trim() || "Forwarded for approval",
          forward_to_user_id: forwardToId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Forwarding failed");
      showToast("Approval request forwarded successfully!");
      setForwardModalItem(null);
      setForwardComment("");
      setForwardToId(null);
      loadAll();
    } catch (e: any) {
      showToast(e.message || "Forwarding failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Direct Row Action (e.g. Approve)
  const handleDirectApprove = async (module: string, id: number) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/july/approval/${module}/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          action: "APPROVE",
          remarks: "Approved directly",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Approval failed");
      showToast("Approved successfully!");
      loadAll();
    } catch (e: any) {
      showToast(e.message || "Approval failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedRecord || !actionModal.type) return;
    if (actionModal.type === "FORWARD" && !forwardToId) {
      showToast("Please select who to forward to", "error"); return;
    }
    if ((actionModal.type === "REJECT" || actionModal.type === "SEND_BACK") && !remarks.trim()) {
      showToast("Please enter a reason", "error"); return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/july/approval/${selectedRecord.module}/${selectedRecord.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          action: actionModal.type,
          remarks: remarks || null,
          forward_to_user_id: forwardToId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Action failed");
      showToast(`${actionModal.type === "APPROVE" ? "Approved" : actionModal.type === "REJECT" ? "Rejected" : actionModal.type === "FORWARD" ? "Forwarded" : "Sent back"} successfully!`);
      setSelectedRecord(null);
      setActionModal({ type: null });
      loadAll();
    } catch (e: any) {
      showToast(e.message || "Action failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (statusStr: string) => {
    const s = (statusStr || "").toLowerCase();
    if (s.includes("approved") || s.includes("completed")) {
      return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Approved</span>;
    }
    if (s.includes("reject")) {
      return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Rejected</span>;
    }
    return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Pending</span>;
  };

  // Batch approve selection handler
  const handleBatchApprove = async () => {
    if (selectedItemKeys.size === 0) return;
    setBatchLoading(true);
    try {
      const batchItems = Array.from(selectedItemKeys).map(key => {
        const [module, idStr] = key.split(":");
        return { module, id: Number(idStr) };
      });

      const res = await fetch("/api/july/batch-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ items: batchItems, action: "APPROVE", remarks: "Batch approved from dashboard" })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Successfully approved ${data.count} items!`);
        setSelectedItemKeys(new Set());
        loadAll();
      } else {
        throw new Error(data.detail || "Batch approval failed");
      }
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setBatchLoading(false);
    }
  };

  const toggleSelectItem = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedItemKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedItemKeys(next);
  };

  const toggleSelectAll = () => {
    if (selectedItemKeys.size === filteredList.length) {
      setSelectedItemKeys(new Set());
    } else {
      const allKeys = new Set(filteredList.map(i => `${i.module}:${i.id}`));
      setSelectedItemKeys(allKeys);
    }
  };

  // Filter items based on activeTab, selectedCategory, and searchQuery
  const rawList = activeTab === "pending" ? pendingItems : mySubmissions;
  const filteredList = rawList.filter(item => {
    const matchesCategory = selectedCategory === "all" || item.module === selectedCategory;
    const matchesSearch = !searchQuery || 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.submitted_by_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.current_approver_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate counts per category
  const getCategoryCount = (modKey: string) => {
    if (modKey === "all") return rawList.length;
    return rawList.filter(i => i.module === modKey).length;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-800 flex flex-col">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[200] px-5 py-3 rounded-xl shadow-lg text-xs font-bold border animate-in slide-in-from-top-2 ${toast.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
          {toast.msg}
        </div>
      )}

      {/* Top Header — Full Widescreen Container */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="w-full max-w-[98%] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToSelector}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">Approvals & Submissions</h1>
              <p className="text-[11px] text-slate-500">{user.name} · <span className="font-semibold text-emerald-600">{user.role}</span></p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {pendingItems.length > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-rose-500 text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-xs">
                <Inbox className="w-3.5 h-3.5" />
                {pendingItems.length} Pending Action
              </span>
            )}
            <button
              onClick={loadAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Container: Full Widescreen Layout */}
      <div className="w-full max-w-[98%] mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col md:flex-row gap-6">
        
        {/* LEFT SIDEBAR */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-4">
          
          {/* Inbox / Submissions Switcher */}
          <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs flex flex-col gap-1">
            <button
              onClick={() => { setActiveTab("pending"); setSelectedCategory("all"); }}
              className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${activeTab === "pending" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4" />
                <span>Pending Approvals</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === "pending" ? "bg-white/20 text-white" : "bg-rose-100 text-rose-700 font-bold"}`}>
                {pendingItems.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("my-submissions"); setSelectedCategory("all"); }}
              className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${activeTab === "my-submissions" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                <span>My Submissions</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === "my-submissions" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                {mySubmissions.length}
              </span>
            </button>
          </div>

          {/* Form Modules Filter List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Filter by Form Type
            </h3>
            
            <nav className="space-y-1">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${selectedCategory === "all" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"}`}
              >
                <span>All Forms</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${selectedCategory === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {getCategoryCount("all")}
                </span>
              </button>

              {Object.keys(MODULE_CONFIG).map(modKey => {
                const conf = MODULE_CONFIG[modKey];
                const count = getCategoryCount(modKey);

                return (
                  <button
                    key={modKey}
                    onClick={() => setSelectedCategory(modKey)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${selectedCategory === modKey ? "bg-slate-900 text-white font-bold shadow-xs" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{conf.label}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${selectedCategory === modKey ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* WORKSPACE MAIN PANEL */}
        <main className="flex-1 flex flex-col gap-4 min-w-0">
          
          {/* Top Control Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {activeTab === "pending" && filteredList.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
                >
                  {selectedItemKeys.size === filteredList.length ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                  {selectedItemKeys.size === filteredList.length ? "Deselect All" : "Select All"}
                </button>
              )}

              {selectedItemKeys.size > 0 && (
                <button
                  onClick={handleBatchApprove}
                  disabled={batchLoading}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
                >
                  {batchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Approve Selected ({selectedItemKeys.size})
                </button>
              )}
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search driver, vehicle, city..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Clean Form Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-xs text-center p-6">
              <CheckCircle className="w-12 h-12 text-emerald-400 mb-3" />
              <h3 className="text-sm font-extrabold text-slate-800">No records found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {activeTab === "pending" 
                  ? "You have cleared all pending approval requests in this view."
                  : "No submissions recorded under this category."}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-[4%] text-center">Select</th>
                    <th className="py-3.5 px-4 w-[15%]">Form Type</th>
                    <th className="py-3.5 px-4 w-[23%]">Subject / Details</th>
                    <th className="py-3.5 px-4 w-[14%]">Submitted By</th>
                    <th className="py-3.5 px-4 w-[15%]">Submitted At</th>
                    <th className="py-3.5 px-4 w-[9%] text-center">Status</th>
                    <th className="py-3.5 px-4 w-[20%] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredList.map(item => {
                    const conf = MODULE_CONFIG[item.module] || { label: item.module_label || "Form", textClass: "text-slate-600 font-semibold" };
                    const itemKey = `${item.module}:${item.id}`;
                    const isSelected = selectedItemKeys.has(itemKey);

                    return (
                      <tr 
                        key={itemKey} 
                        onClick={() => openRecord(item)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${isSelected ? "bg-emerald-50/10" : ""}`}
                      >
                        {/* Select */}
                        <td className="py-4 px-4 text-center" onClick={(e) => toggleSelectItem(itemKey, e)}>
                          {activeTab === "pending" && (
                            <button className="text-slate-400 hover:text-emerald-600 transition-colors">
                              {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                            </button>
                          )}
                        </td>

                        {/* Form Type */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${conf.textClass}`}>
                            {conf.label}
                          </span>
                        </td>

                        {/* Subject / Details */}
                        <td className="py-4 px-4">
                          <p className="font-bold text-slate-900 text-xs">{item.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.subtitle} · <span className="font-semibold text-slate-600">{item.city}</span></p>
                        </td>

                        {/* Submitted By */}
                        <td className="py-4 px-4 whitespace-nowrap text-slate-700 font-medium">
                          {item.submitted_by_name || "Staff"}
                        </td>

                        {/* Submitted At */}
                        <td className="py-4 px-4 whitespace-nowrap text-slate-500 font-medium text-[11px]">
                          {formatDateTime(item.created_at)}
                        </td>

                        {/* Status (Clean Badge, No Name!) */}
                        <td className="py-4 px-4 whitespace-nowrap text-center">
                          {getStatusBadge(item.approval_status)}
                        </td>

                        {/* Actions (Approve | Forward | View as Distinct Buttons) */}
                        <td className="py-4 px-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2 shrink-0">
                            {activeTab === "pending" && !item.isMySubmission && (
                              <>
                                <button
                                  onClick={() => handleDirectApprove(item.module, item.id)}
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 rounded-xl text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 shrink-0"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setForwardModalItem(item);
                                    setForwardToId(null);
                                    setForwardComment("");
                                    setApproverSearch("");
                                    setIsApproverOpen(false);
                                    loadLogs(item.module, item.id);
                                  }}
                                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 rounded-xl text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 shrink-0"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" /> Forward
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => openRecord(item)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-800 text-slate-700 hover:text-white border border-slate-200 rounded-xl text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* DEDICATED FORWARD POPUP MODAL */}
      {forwardModalItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Forward Approval Request</h3>
              </div>
              <button
                onClick={() => setForwardModalItem(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Dynamic Approval Progress Ticket Cards */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {/* Card 1: Original Submission Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-slate-700 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Step 1 · Original Submission
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {formatDateTime(forwardModalItem.created_at)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[11px]">
                    <div>
                      <span className="text-slate-400 font-semibold block">Created By:</span>
                      <strong className="text-slate-900 font-bold">{forwardModalItem.submitted_by_name || "Staff"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">Sent for Approval To:</span>
                      <strong className="text-slate-900 font-bold">
                        {approvalLogs.find(l => l.action === "SUBMITTED")?.to_name || "Assigned Approver"}
                      </strong>
                    </div>

                    <div className="space-y-1.5">
                      <div>
                        <span className="text-slate-400 font-semibold block">Subject / Details:</span>
                        <strong className="text-slate-900 font-bold block">{forwardModalItem.title}</strong>
                        <span className="text-slate-500 block text-[10px]">{forwardModalItem.subtitle} ({forwardModalItem.city})</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block">Form Type:</span>
                        <span className="text-blue-600 font-bold">{MODULE_CONFIG[forwardModalItem.module]?.label || forwardModalItem.module_label || "Form"}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block mb-1">Comment / Notes:</span>
                      <div className="bg-white p-2 rounded-lg border border-slate-200 text-[10px]">
                        <p className="text-slate-800 font-medium italic">
                          "{approvalLogs.find(l => l.action === "SUBMITTED")?.remarks || "Submitted for review & approval"}"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subsequent Forwarding Cards (Step 2, Step 3...) */}
                {approvalLogs.filter(l => l.action === "FORWARDED").map((log, idx) => (
                  <React.Fragment key={idx}>
                    {/* Connector Arrow */}
                    <div className="flex items-center justify-center gap-2 py-0.5 text-blue-500">
                      <ArrowDown className="w-4 h-4 text-blue-500 animate-pulse" />
                      <span className="text-[10px] font-bold tracking-wider uppercase text-blue-600">Forwarded Step {idx + 2}</span>
                    </div>

                    <div className="bg-blue-50/40 border border-blue-200/80 rounded-xl p-4 space-y-2 text-slate-700 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-blue-200/60 pb-2 mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full border border-blue-300/50">
                          Step {idx + 2} · Forwarded Request
                        </span>
                        <span className="text-[10px] text-blue-600 font-medium">
                          {formatDateTime(log.action_at)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 font-semibold block">Forwarded By:</span>
                          <strong className="text-slate-900 font-bold">{log.from_name || "Approver"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold block">Forwarded To:</span>
                          <strong className="text-slate-900 font-bold">{log.to_name || "Next Approver"}</strong>
                        </div>

                        <div className="col-span-2 mt-0.5">
                          <span className="text-slate-400 font-semibold block mb-1">Forwarding Comment / Notes:</span>
                          <div className="bg-white p-2 rounded-lg border border-blue-200/80 text-[10px]">
                            <p className="text-slate-800 font-medium italic">
                              "{log.remarks || "No comment provided"}"
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* Searchable Approver Input — Floating Overlay On Focus */}
              <div className="space-y-1 relative">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Forward To Approver *</label>
                
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={approverSearch}
                    onFocus={() => setIsApproverOpen(true)}
                    onChange={(e) => {
                      setApproverSearch(e.target.value);
                      setIsApproverOpen(true);
                      if (forwardToId) setForwardToId(null);
                    }}
                    placeholder="Search approver name or role..."
                    className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-medium shadow-xs"
                  />
                </div>

                {/* Floating Dropdown Results — Only visible when active */}
                {isApproverOpen && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
                    {approvers
                      .filter(a => 
                        !approverSearch ||
                        a.name?.toLowerCase().includes(approverSearch.toLowerCase()) ||
                        a.role?.toLowerCase().includes(approverSearch.toLowerCase()) ||
                        a.city?.toLowerCase().includes(approverSearch.toLowerCase())
                      )
                      .map(a => {
                        const isSelected = forwardToId === a.id;
                        return (
                          <div
                            key={a.id}
                            onClick={() => {
                              setForwardToId(a.id);
                              setApproverSearch(`${a.name} (${a.role} — ${a.city})`);
                              setIsApproverOpen(false);
                            }}
                            className={`p-2.5 hover:bg-blue-50/70 transition-colors cursor-pointer flex items-center justify-between text-xs ${isSelected ? "bg-blue-50 font-bold text-blue-700" : "text-slate-800"}`}
                          >
                            <div>
                              <span className="font-bold block">{a.name}</span>
                              <span className="text-[10px] text-slate-500">{a.role} · <strong className="text-slate-600">{a.city}</strong></span>
                            </div>
                            {isSelected && <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />}
                          </div>
                        );
                      })}
                    {approvers.filter(a => 
                      !approverSearch ||
                      a.name?.toLowerCase().includes(approverSearch.toLowerCase()) ||
                      a.role?.toLowerCase().includes(approverSearch.toLowerCase()) ||
                      a.city?.toLowerCase().includes(approverSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="p-3 text-center text-slate-400 italic text-[11px]">No matching approvers found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Forwarding Comment */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Forwarding Comment / Notes</label>
                <textarea
                  value={forwardComment}
                  onChange={(e) => setForwardComment(e.target.value)}
                  placeholder="Enter reason for forwarding or specific review notes..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 resize-none font-medium"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setForwardModalItem(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-white text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmForward}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                Forward Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extended Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-5xl h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
              <div>
                <span className="text-[10px] font-extrabold tracking-wide px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                  {selectedRecord.module_label || MODULE_CONFIG[selectedRecord.module]?.label}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">{selectedRecord.title}</h3>
              </div>
              <button
                onClick={() => { setSelectedRecord(null); setActionModal({ type: null }); }}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Split view (Left: Full Submitted Form Fields, Right: Logs & Actions) */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              
              {/* Left Column: Full Form Details */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">FULL FORM FIELDS & SUBMISSION CONTENT</h4>
                
                {detailsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  </div>
                ) : recordDetails ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.keys(recordDetails).map(key => {
                      const val = recordDetails[key];
                      
                      // Skip only internal keys (keep driver_id, phone, dl, aadhaar, etc.!)
                      const isInternalKey = ["onboarding_id", "vehicle_id", "ticket_id", "created_by", "current_approver_id", "approved_by", "approval_remarks", "password_hash"].includes(key);
                      if (isInternalKey || val === null || val === "") return null;
                      
                      const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                      const isPhoto = (typeof val === "string" && (val.startsWith("data:image") || val.includes(".png") || val.includes(".jpg") || val.includes(".jpeg") || val.includes("/uploads/")));

                      return (
                        <div key={key} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                          {isPhoto ? (
                            <div className="mt-1">
                              <a
                                href={val}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-colors border border-emerald-100"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View Document
                              </a>
                            </div>
                          ) : (
                            <p className="text-xs font-semibold text-slate-800 break-words">{val.toString()}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No detailed fields found.</p>
                )}
              </div>

              {/* Right Column: Approval timeline logs + actions */}
              <div className="w-full lg:w-96 shrink-0 bg-slate-50/30 overflow-y-auto p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Summary Overview */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
                    <p className="text-xs text-slate-500 flex justify-between"><span>City:</span> <strong className="text-slate-800">{selectedRecord.city}</strong></p>
                    <p className="text-xs text-slate-500 flex justify-between"><span>Status:</span> <strong className="text-slate-800">{selectedRecord.approval_status}</strong></p>
                    <p className="text-xs text-slate-500 flex justify-between"><span>Submitted By:</span> <strong className="text-slate-800">{selectedRecord.submitted_by_name}</strong></p>
                    <p className="text-xs text-slate-500 flex justify-between"><span>Created At:</span> <strong className="text-slate-800">{selectedRecord.created_at ? new Date(selectedRecord.created_at).toLocaleString("en-IN") : "—"}</strong></p>
                  </div>

                  {/* History timeline */}
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Approval Chain Logs</h4>
                    {logsLoading ? (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading logs...
                      </div>
                    ) : approvalLogs.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No timeline history recorded.</p>
                    ) : (
                      <div className="space-y-2">
                        {approvalLogs.map((log, i) => (
                          <div key={i} className="bg-white p-3 rounded-xl border border-slate-200/60 text-xs shadow-xs">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                              <span className="font-bold uppercase tracking-wider">{log.action}</span>
                              <span>{log.action_at ? new Date(log.action_at).toLocaleDateString("en-IN") : ""}</span>
                            </div>
                            <p className="font-semibold text-slate-800">
                              {log.from_name || "System"} {log.action.toLowerCase()} {log.to_name && `to ${log.to_name}`}
                            </p>
                            {log.remarks && <p className="text-[11px] text-slate-500 italic mt-1 font-medium">"{log.remarks}"</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Message & Action trigger buttons */}
                <div className="mt-6 border-t border-slate-200/80 pt-4 space-y-3">
                  
                  {/* Action Message/Remarks text box */}
                  {!selectedRecord.isMySubmission && selectedRecord.approval_status?.startsWith("Pending") && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Approval / Rejection Message</label>
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Add comments, suggestions, or reason for action..."
                        rows={2}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 resize-none shadow-inner"
                      />
                    </div>
                  )}

                  {/* Actions wrapper */}
                  {actionModal.type === "FORWARD" ? (
                    <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs space-y-2 animate-in slide-in-from-bottom-2">
                      <p className="text-[11px] font-bold text-slate-700">Forward Approval Request To:</p>
                      <select
                        value={forwardToId || ""}
                        onChange={e => setForwardToId(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-emerald-600"
                      >
                        <option value="">Select approver...</option>
                        {approvers.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.role}) — {a.city}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={handleAction}
                          disabled={actionLoading}
                          className="flex-1 py-1.5 bg-emerald-600 text-white font-bold text-[11px] rounded-lg hover:bg-emerald-700"
                        >
                          Confirm Forward
                        </button>
                        <button
                          onClick={() => setActionModal({ type: null })}
                          className="px-3 py-1.5 border border-slate-200 text-slate-600 text-[11px] font-semibold rounded-lg hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : !selectedRecord.isMySubmission && selectedRecord.approval_status?.startsWith("Pending") ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setActionModal({ type: "APPROVE" }); handleAction(); }}
                        disabled={actionLoading}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all shadow-xs"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => { setActionModal({ type: "REJECT" }); handleAction(); }}
                        disabled={actionLoading}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-rose-200 text-rose-600 font-bold text-xs hover:bg-rose-50 transition-all"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                      <button
                        onClick={() => { setActionModal({ type: "SEND_BACK" }); handleAction(); }}
                        disabled={actionLoading}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-100 transition-all"
                      >
                        <RotateCcw className="w-4 h-4" /> Send Back
                      </button>
                      <button
                        onClick={() => setActionModal({ type: "FORWARD" })}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-emerald-600 text-emerald-600 font-semibold text-xs hover:bg-emerald-50 transition-all"
                      >
                        <ArrowRight className="w-4 h-4" /> Forward
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
