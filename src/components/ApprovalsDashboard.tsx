import React, { useState, useEffect } from "react";
import {
  CheckCircle, XCircle, ArrowRight, ArrowDown, Clock, ChevronLeft, ChevronRight,
  RefreshCw, User, Building2, Calendar, AlertTriangle,
  FileText, Send, RotateCcw, Eye, Filter, Inbox, ClipboardList,
  ChevronDown, X, Loader2, Search, UserCheck, Truck, TicketIcon,
  Wrench, Settings, IndianRupee, Layers, CheckSquare, Square, MessageSquare,
  MapPin, ShieldCheck, PauseCircle, DollarSign, Edit
} from "lucide-react";

interface Props {
  user: any;
  onBackToSelector: () => void;
  onLogout: () => void;
  onEditRecord?: (module: string, id: number, isReview?: boolean, fromTab?: "pending" | "my-submissions" | "revisions") => void;
  initialTab?: "pending" | "my-submissions" | "revisions";
}

const MODULE_CONFIG: Record<string, { label: string; textClass: string }> = {
  individual_onboarding: { label: "Driver Onboarding", textClass: "text-blue-600 font-semibold" },
  operator_onboarding: { label: "Operator Onboarding", textClass: "text-indigo-600 font-semibold" },
  vehicle_onboarding: { label: "Vehicle Onboarding", textClass: "text-purple-600 font-semibold" },
  adjustment_form: { label: "Adjustment Form", textClass: "text-orange-600 font-semibold" },
};

const STATUS_TEXT_CLASSES: Record<string, string> = {
  "Pending Approval": "text-amber-600 font-bold",
  "Pending L1 Approval": "text-amber-600 font-bold",
  "Pending L2 Approval": "text-orange-600 font-bold",
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

function parseNameDetails(str?: string) {
  if (!str) return { name: "N/A", details: "" };
  if (str.includes("(") && str.includes(")")) {
    const parts = str.split("(");
    const name = parts[0].trim();
    const details = parts[1].replace(")", "").replace(/—/g, "·").replace(/-/g, "·").trim();
    return { name, details };
  }
  return { name: str, details: "" };
}

export default function ApprovalsDesk({ user, onBackToSelector, onLogout, onEditRecord, initialTab }: Props) {
  const [activeTab, setActiveTab] = useState<"pending" | "my-submissions" | "revisions">(initialTab || "pending");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [approvers, setApprovers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedCategory, searchQuery]);
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

  // Dedicated Return for Revision Modal state
  const [returnRevisionModalItem, setReturnRevisionModalItem] = useState<any | null>(null);
  const [selectedRevisionTypes, setSelectedRevisionTypes] = useState<string[]>(["rent"]);
  const [suggestedRent, setSuggestedRent] = useState("");
  const [suggestedDeposit, setSuggestedDeposit] = useState("");
  const [revisionComment, setRevisionComment] = useState("");

  // Dedicated Revision Instructions View Modal state
  const [viewInstructionsModalText, setViewInstructionsModalText] = useState<{ title: string; subtitle: string; remarks: string } | null>(null);

  const toggleRevisionType = (type: string) => {
    if (selectedRevisionTypes.includes(type)) {
      if (selectedRevisionTypes.length > 1) {
        setSelectedRevisionTypes(selectedRevisionTypes.filter(t => t !== type));
      }
    } else {
      setSelectedRevisionTypes([...selectedRevisionTypes, type]);
    }
  };

  // Dedicated Reject Modal state
  const [rejectModalItem, setRejectModalItem] = useState<any | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  // Multi-select state for Batch Approval
  const [selectedItemKeys, setSelectedItemKeys] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  // Row action modal/overlay states
  const [actionModal, setActionModal] = useState<{
    type: "APPROVE" | "REJECT" | "FORWARD" | "SEND_BACK" | "SUGGEST" | "HOLD" | null;
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

  // Execute Return for Revision from Return for Revision Modal
  const handleConfirmReturnRevision = async () => {
    if (!returnRevisionModalItem) return;
    if (selectedRevisionTypes.includes("rent") && !suggestedRent.trim()) {
      showToast("Please enter a suggested rent amount", "error");
      return;
    }
    if (selectedRevisionTypes.includes("deposit") && !suggestedDeposit.trim()) {
      showToast("Please enter a suggested deposit amount", "error");
      return;
    }
    if (!revisionComment.trim()) {
      showToast("Please enter detailed revision instructions", "error");
      return;
    }

    setActionLoading(true);
    try {
      const parts = [];
      if (selectedRevisionTypes.includes("rent") && suggestedRent) parts.push(`[Suggested Rent: ₹${suggestedRent}/day]`);
      if (selectedRevisionTypes.includes("deposit") && suggestedDeposit) parts.push(`[Suggested Deposit: ₹${suggestedDeposit}]`);
      if (selectedRevisionTypes.includes("docs")) parts.push(`[Document Revision Required]`);
      if (selectedRevisionTypes.includes("vehicle_details")) parts.push(`[Vehicle / RC Details Revision Required]`);
      parts.push(revisionComment.trim());

      const finalRemarks = parts.join(" ");

      const res = await fetch(`/api/july/approval/${returnRevisionModalItem.module}/${returnRevisionModalItem.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          action: "SEND_BACK",
          remarks: finalRemarks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Return for revision failed");
      showToast("Application returned for revision to executive!");
      setReturnRevisionModalItem(null);
      setRevisionComment("");
      setSuggestedRent("");
      setSuggestedDeposit("");
      loadAll();
    } catch (e: any) {
      showToast(e.message || "Return for revision failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Rejection from Reject Modal
  const handleConfirmReject = async () => {
    if (!rejectModalItem) return;
    if (!rejectComment.trim()) {
      showToast("Please enter a reason for rejection", "error");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/july/approval/${rejectModalItem.module}/${rejectModalItem.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          action: "REJECT",
          remarks: rejectComment.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Rejection failed");
      showToast("Application rejected successfully!");
      setRejectModalItem(null);
      setRejectComment("");
      loadAll();
    } catch (e: any) {
      showToast(e.message || "Rejection failed", "error");
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
      let finalRemarks = remarks;
      let actionName = actionModal.type;

      if (actionModal.type === "SUGGEST") {
        actionName = "FORWARD";
        const parts = [];
        if (suggestedRent) parts.push(`Suggested Rent: ₹${suggestedRent}/day`);
        if (suggestedDeposit) parts.push(`Suggested Deposit: ₹${suggestedDeposit}`);
        if (remarks) parts.push(`Remarks: ${remarks}`);
        finalRemarks = parts.join(" | ");
      } else if (actionModal.type === "HOLD") {
        actionName = "FORWARD";
        finalRemarks = `[ON HOLD] ${remarks || "Application placed on hold"}`;
      }

      const res = await fetch(`/api/july/approval/${selectedRecord.module}/${selectedRecord.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          action: actionName,
          remarks: finalRemarks || null,
          forward_to_user_id: forwardToId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Action failed");
      showToast(`${actionModal.type === "APPROVE" ? "Approved" : actionModal.type === "REJECT" ? "Rejected" : actionModal.type === "HOLD" ? "Placed on hold" : actionModal.type === "SUGGEST" ? "Rent/Deposit suggestion submitted" : "Updated"} successfully!`);
      setSelectedRecord(null);
      setActionModal({ type: null });
      loadAll();
    } catch (e: any) {
      showToast(e.message || "Action failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const ensureISOIST = (dateStr?: string): string | undefined => {
    if (!dateStr) return undefined;
    let str = dateStr.trim();
    if (str.includes(" ") && !str.includes("T")) {
      str = str.replace(" ", "T");
    }
    if (!str.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(str)) {
      str = str + "+05:30";
    }
    return str;
  };

  const formatDateTimeComponents = (dateStr?: string) => {
    const isoStr = ensureISOIST(dateStr);
    if (!isoStr) return { date: "—", time: "" };
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return { date: dateStr || "—", time: "" };
      const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
      const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toLowerCase();
      return { date, time };
    } catch {
      return { date: dateStr || "—", time: "" };
    }
  };

  const formatDateTime = (dateStr?: string): string => {
    const { date, time } = formatDateTimeComponents(dateStr);
    if (!time || time === "") return date;
    return `${date} ${time}`;
  };

  const getStatusBadge = (statusStr: string) => {
    const s = (statusStr || "").toLowerCase();
    if (s.includes("approved") || s.includes("completed")) {
      return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">Approved</span>;
    }
    if (s.includes("reject")) {
      return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">Rejected</span>;
    }
    if (s.includes("requested")) {
      return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200/80">Revision Req.</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">Pending</span>;
  };

  // Batch approve selection handler
  const handleBatchApprove = async () => {
    if (selectedItemKeys.size === 0) return;
    setBatchLoading(true);
    try {
      const batchItems = Array.from(selectedItemKeys).map(key => {
        const [module, idStr] = (key as string).split(":");
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
  const revisionItems = mySubmissions.filter(item => item.approval_status?.includes("Requested"));
  const rawList = activeTab === "pending" ? pendingItems
    : activeTab === "revisions" ? revisionItems
    : mySubmissions;
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

  // Sort items by Submitted At / Created At in DESCENDING order (Newest First)
  filteredList.sort((a, b) => {
    const timeA = a.submitted_at || a.created_at ? new Date(a.submitted_at || a.created_at).getTime() : 0;
    const timeB = b.submitted_at || b.created_at ? new Date(b.submitted_at || b.created_at).getTime() : 0;
    return timeB - timeA;
  });

  // Pagination parameters
  const totalItems = filteredList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedList = filteredList.slice(startIndex, endIndex);

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

      {/* Top Header — matches home screen exactly */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="mx-auto flex h-16 max-w-[98%] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Back chevron */}
            <button
              onClick={onBackToSelector}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Brand — same as home */}
            <img
              src="/letzryd_icon.png"
              alt="LetzRyd logo"
              className="h-9 w-auto object-contain"
            />
            <span className="hidden h-5 border-l border-slate-200 sm:inline-block" />
            <span className="hidden font-sans text-xs font-semibold text-slate-500 sm:inline-block">
              Fleet Portal
            </span>

            {/* Divider + page title */}
            <span className="hidden h-5 border-l border-slate-200 sm:inline-block" />
            <div>
              <h1 className="text-sm font-extrabold text-slate-900 tracking-tight">Approvals &amp; Submissions</h1>
              <p className="text-[10px] text-slate-400">{user.name} · <span className="font-semibold text-emerald-600">{user.role}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {pendingItems.length > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-rose-500 text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-xs">
                <Inbox className="w-3.5 h-3.5" />
                {pendingItems.length} Pending
              </span>
            )}
            {/* User chip — same as home */}
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-xs font-bold text-white">
                {user.name?.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase() || "U"}
              </div>
              <div className="flex flex-col">
                <span className="font-sans text-xs font-semibold text-slate-800 leading-tight">{user.name}</span>
                <span className="font-mono text-[10px] text-slate-400 mt-0.5 leading-none">{user.role}</span>
              </div>
            </div>
            <button
              onClick={loadAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Container: aligned with header max-width */}
      <div className="mx-auto w-full max-w-[98%] px-4 sm:px-6 py-6 flex-1 flex flex-col md:flex-row gap-6">
        
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
              onClick={() => { setActiveTab("revisions"); setSelectedCategory("all"); }}
              className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${activeTab === "revisions" ? "bg-orange-500 text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                <span>Returned for Revision</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === "revisions" ? "bg-white/20 text-white" : revisionItems.length > 0 ? "bg-orange-100 text-orange-700 font-bold" : "bg-slate-100 text-slate-600"}`}>
                {revisionItems.length}
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
                    <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                      <span className="text-[11px] font-semibold text-left truncate">{conf.label}</span>
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
          
          {/* Top Control Bar with Category Tabs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
            {/* Category Sub-Navigation Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  selectedCategory === "all" ? "bg-slate-900 text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>All Forms</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${selectedCategory === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"}`}>
                  {getCategoryCount("all")}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory("individual_onboarding")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  selectedCategory === "individual_onboarding" ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Driver Onboarding</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${selectedCategory === "individual_onboarding" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"}`}>
                  {getCategoryCount("individual_onboarding")}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory("operator_onboarding")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  selectedCategory === "operator_onboarding" ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Operator Onboarding</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${selectedCategory === "operator_onboarding" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"}`}>
                  {getCategoryCount("operator_onboarding")}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory("vehicle_onboarding")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  selectedCategory === "vehicle_onboarding" ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Vehicle Onboarding</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${selectedCategory === "vehicle_onboarding" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"}`}>
                  {getCategoryCount("vehicle_onboarding")}
                </span>
              </button>
            </div>

            {/* Actions Bar & Search Input */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
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
                  : activeTab === "revisions"
                  ? "No records have been returned for revision. All submissions are progressing normally."
                  : "No submissions recorded under this category."}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {activeTab === "pending" && <th className="py-3.5 px-4 w-[4%] text-center">Select</th>}
                    {selectedCategory === "all" && <th className="py-3.5 px-4 w-[12%]">Form Type</th>}
                    <th className="py-3.5 px-4 w-[20%]">
                      {selectedCategory === "vehicle_onboarding"
                        ? "Vehicle Reg. & Model"
                        : selectedCategory === "individual_onboarding"
                        ? "Driver & Plan"
                        : selectedCategory === "operator_onboarding"
                        ? "Operator & Details"
                        : "Subject / Details"}
                    </th>

                    {/* DEDICATED REVISION INSTRUCTIONS COLUMN for Returned for Revision & My Submissions */}
                    {(activeTab === "revisions" || activeTab === "my-submissions") && (
                      <th className="py-3.5 px-4 w-[22%]">Revision Instructions</th>
                    )}

                    <th className="py-3.5 px-4 w-[12%]">Submitted By</th>
                    <th className="py-3.5 px-4 w-[11%]">Submitted At</th>
                    <th className="py-3.5 px-4 w-[14%]">Pending With</th>
                    <th className="py-3.5 px-4 w-[9%] text-center">Status</th>
                    <th className="py-3.5 px-4 w-[12%] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedList.map(item => {
                    const conf = MODULE_CONFIG[item.module] || { label: item.module_label || "Form", textClass: "text-slate-600 font-semibold" };
                    const itemKey = `${item.module}:${item.id}`;
                    const isSelected = selectedItemKeys.has(itemKey);

                    return (
                      <tr 
                        key={itemKey} 
                        onClick={() => {
                          if (onEditRecord) {
                            onEditRecord(item.module, item.id, true, activeTab);
                          } else {
                            openRecord(item);
                          }
                        }}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${isSelected ? "bg-emerald-50/10" : ""}`}
                      >
                        {/* Select */}
                        {activeTab === "pending" && (
                          <td className="py-4 px-4 text-center" onClick={(e) => toggleSelectItem(itemKey, e)}>
                            <button className="text-slate-400 hover:text-emerald-600 transition-colors">
                              {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                            </button>
                          </td>
                        )}

                        {/* Form Type (only when All Forms is selected) */}
                        {selectedCategory === "all" && (
                          <td className="py-3 px-4 whitespace-nowrap font-sans">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/60">
                              {conf.label}
                            </span>
                          </td>
                        )}

                        {/* Subject / Details */}
                        <td className="py-3 px-4 font-sans">
                          <p className="font-bold text-slate-900 text-xs tracking-tight">{item.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.subtitle} · <span className="font-semibold text-slate-600">{item.city}</span></p>

                          {/* EXPLICIT RENT & DEPOSIT DISPLAY (Excluding Vehicle Onboarding) */}
                          {item.module !== "vehicle_onboarding" && (item.daily_rent > 0 || item.security_deposit > 0) && (
                            <div className="mt-1.5 inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/60 text-[10px] font-bold text-slate-700">
                              <span>₹{item.daily_rent?.toLocaleString('en-IN')}/day (Rent)</span>
                              <span className="text-slate-300">·</span>
                              <span>₹{item.security_deposit?.toLocaleString('en-IN')} (Deposit)</span>
                            </div>
                          )}
                        </td>

                        {/* DEDICATED REVISION INSTRUCTIONS CELL (Compact 1-line & Clickable) */}
                        {(activeTab === "revisions" || activeTab === "my-submissions") && (
                          <td className="py-3 px-4 font-sans" onClick={(e) => e.stopPropagation()}>
                            {item.approval_remarks ? (
                              <button
                                type="button"
                                onClick={() => setViewInstructionsModalText({ title: item.title, subtitle: `${item.subtitle} · ${item.city}`, remarks: item.approval_remarks })}
                                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-900 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer max-w-[240px] shadow-2xs group"
                                title="Click to view full instructions in detail"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                                <span className="truncate text-[11px]">{item.approval_remarks}</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 font-medium">—</span>
                            )}
                          </td>
                        )}

                        {/* Submitted By */}
                        <td className="py-3 px-4 whitespace-nowrap font-sans">
                          {(() => {
                            const parsed = parseNameDetails(item.submitted_by_name || "Onboarding Executive 1 (Onboarding Executive — Hyderabad)");
                            return (
                              <div>
                                <div className="font-bold text-slate-800 text-xs">{parsed.name}</div>
                                <div className="text-slate-400 text-[10px] font-medium mt-0.5">{parsed.details || "Onboarding Executive"}</div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Submitted At */}
                        <td className="py-3 px-4 whitespace-nowrap font-sans">
                          {(() => {
                            const { date, time } = formatDateTimeComponents(item.created_at);
                            return (
                              <div>
                                <div className="font-bold text-slate-800 text-xs">{date}</div>
                                <div className="text-slate-400 text-[10px] font-medium mt-0.5">{time}</div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Pending With / Sent To */}
                        <td className="py-3 px-4 whitespace-nowrap font-sans">
                          {(() => {
                            const parsed = parseNameDetails(item.current_approver_name || item.current_approver || "City Manager 1 (City Manager — Hyderabad)");
                            return (
                              <div>
                                <div className="font-bold text-slate-800 text-xs">{parsed.name}</div>
                                <div className="text-slate-400 text-[10px] font-medium mt-0.5">{parsed.details || "City Manager"}</div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap text-center font-sans">
                          {getStatusBadge(item.approval_status)}
                        </td>

                        {/* Actions (Uniform Primary Button Per View) */}
                        <td className="py-4 px-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5 shrink-0">
                            {activeTab === "pending" && !item.isMySubmission && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleDirectApprove(item.module, item.id)}
                                  className="h-8 w-8 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200/80 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                                  title="Quick Approve Application"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReturnRevisionModalItem(item);
                                    setSelectedRevisionTypes(item.module === "vehicle_onboarding" ? ["docs"] : ["rent"]);
                                    setSuggestedRent("");
                                    setSuggestedDeposit("");
                                    setRevisionComment("");
                                  }}
                                  className="h-8 w-8 rounded-lg bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white border border-amber-200/80 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                                  title="Return for Revision"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectModalItem(item);
                                    setRejectComment("");
                                  }}
                                  className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200/80 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                                  title="Reject Application"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {activeTab === "revisions" ? (
                              <button
                                type="button"
                                onClick={() => onEditRecord ? onEditRecord(item.module, item.id, false, activeTab) : openRecord(item)}
                                className="h-8 px-3.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" /> Edit &amp; Resubmit
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onEditRecord) {
                                    onEditRecord(item.module, item.id, true, activeTab);
                                  } else {
                                    openRecord(item);
                                  }
                                }}
                                className="h-8 px-3.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination Bar */}
              {totalItems > 0 && (
                <div className="bg-slate-50/80 border-t border-slate-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans text-slate-500">
                  <div>
                    Showing <span className="font-bold text-slate-800">{startIndex + 1}</span> to{" "}
                    <span className="font-bold text-slate-800">{endIndex}</span> of{" "}
                    <span className="font-bold text-slate-800">{totalItems}</span> applications
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      First
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Previous
                    </button>
                    
                    <span className="px-3 py-1 font-bold text-slate-700">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* DEDICATED FULL REVISION INSTRUCTIONS MODAL */}
      {viewInstructionsModalText && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setViewInstructionsModalText(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-50/60">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Revision Instructions</h3>
              </div>
              <button
                onClick={() => setViewInstructionsModalText(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs font-sans">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                <p className="font-bold text-slate-900 text-xs">{viewInstructionsModalText.title}</p>
                <p className="text-[11px] text-slate-500">{viewInstructionsModalText.subtitle}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Full Instructions</label>
                <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-xl text-amber-950 text-xs font-medium leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                  {viewInstructionsModalText.remarks}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => setViewInstructionsModalText(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED FORWARD POPUP MODAL */}
      {forwardModalItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Approve & Forward Request</h3>
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
              {/* Dynamic Approval Progress Ticket Cards (Most Recent First) */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                
                {/* 1. Most Recent Forwarded Steps (Step N, Step N-1...) */}
                {approvalLogs.filter(l => l.action === "FORWARDED").length > 0 && 
                  [...approvalLogs.filter(l => l.action === "FORWARDED")].reverse().map((log, revIdx, arr) => {
                    const originalStepNum = arr.length - revIdx + 1;
                    return (
                      <React.Fragment key={revIdx}>
                        <div className="bg-blue-50/40 border border-blue-200/80 rounded-xl p-4 space-y-2 text-slate-700 shadow-2xs">
                          <div className="flex items-center justify-between border-b border-blue-200/60 pb-2 mb-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full border border-blue-300/50">
                              Step {originalStepNum} · Forwarded Request {revIdx === 0 ? "(Most Recent)" : ""}
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

                        {/* Connector Arrow Down to Next Card */}
                        <div className="flex items-center justify-center gap-2 py-0.5 text-blue-500">
                          <ArrowDown className="w-4 h-4 text-blue-500 opacity-60" />
                        </div>
                      </React.Fragment>
                    );
                  })
                }

                {/* 2. Step 1: Original Submission Card (At Bottom) */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-slate-700 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Step 1 · Original Submission (Creator)
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {formatDateTime(forwardModalItem.created_at)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[11px]">
                    <div>
                      <span className="text-slate-400 font-semibold block">Created By:</span>
                      <strong className="text-slate-900 font-bold">{forwardModalItem.submitted_by_name || "Onboarding Executive 1 (Onboarding Executive — Hyderabad)"}</strong>
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

      {/* DEDICATED RETURN FOR REVISION MODAL */}
      {returnRevisionModalItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-orange-50/50">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-orange-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Return for Revision &amp; Suggestions</h3>
              </div>
              <button
                onClick={() => setReturnRevisionModalItem(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                <p className="font-bold text-slate-900 text-xs">{returnRevisionModalItem.title}</p>
                <p className="text-[11px] text-slate-500">{returnRevisionModalItem.subtitle} · <strong className="text-slate-700">{returnRevisionModalItem.city}</strong></p>
                <p className="text-[11px] text-slate-500">Submitted by: <strong className="text-slate-700">{returnRevisionModalItem.submitted_by_name || "Onboarding Executive 1 (Onboarding Executive — Hyderabad)"}</strong></p>
              </div>

              {/* Revision Category Tabs (Multi-Select, Tailored per module) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Select Suggestion / Reason Types *</label>
                  <span className="text-[10px] font-semibold text-slate-400">Select all that apply</span>
                </div>
                
                {returnRevisionModalItem?.module === "vehicle_onboarding" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => toggleRevisionType("docs")}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                        selectedRevisionTypes.includes("docs") ? "bg-orange-600 text-white border-orange-600 shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 shrink-0" /> Unclear Docs
                      </div>
                      {selectedRevisionTypes.includes("docs") && <CheckCircle className="w-3.5 h-3.5 shrink-0 text-white" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleRevisionType("vehicle_details")}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                        selectedRevisionTypes.includes("vehicle_details") ? "bg-orange-600 text-white border-orange-600 shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 shrink-0" /> Incorrect Vehicle Details
                      </div>
                      {selectedRevisionTypes.includes("vehicle_details") && <CheckCircle className="w-3.5 h-3.5 shrink-0 text-white" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleRevisionType("other")}
                      className={`col-span-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                        selectedRevisionTypes.includes("other") ? "bg-orange-600 text-white border-orange-600 shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" /> Other Changes
                      </div>
                      {selectedRevisionTypes.includes("other") && <CheckCircle className="w-3.5 h-3.5 shrink-0 text-white" />}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => toggleRevisionType("rent")}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                        selectedRevisionTypes.includes("rent") ? "bg-orange-600 text-white border-orange-600 shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5 shrink-0" /> Suggest Rent
                      </div>
                      {selectedRevisionTypes.includes("rent") && <CheckCircle className="w-3.5 h-3.5 shrink-0 text-white" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRevisionType("deposit")}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                        selectedRevisionTypes.includes("deposit") ? "bg-orange-600 text-white border-orange-600 shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 shrink-0" /> Suggest Deposit
                      </div>
                      {selectedRevisionTypes.includes("deposit") && <CheckCircle className="w-3.5 h-3.5 shrink-0 text-white" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRevisionType("docs")}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                        selectedRevisionTypes.includes("docs") ? "bg-orange-600 text-white border-orange-600 shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 shrink-0" /> Unclear Docs
                      </div>
                      {selectedRevisionTypes.includes("docs") && <CheckCircle className="w-3.5 h-3.5 shrink-0 text-white" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRevisionType("other")}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                        selectedRevisionTypes.includes("other") ? "bg-orange-600 text-white border-orange-600 shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" /> Other Changes
                      </div>
                      {selectedRevisionTypes.includes("other") && <CheckCircle className="w-3.5 h-3.5 shrink-0 text-white" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Dynamic Numeric Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Rent Input */}
                {selectedRevisionTypes.includes("rent") && (
                  <div className="space-y-1.5 animate-in fade-in duration-150">
                    <label className="text-xs font-bold text-slate-800">Suggested Daily Rent (₹/day) *</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        value={suggestedRent}
                        onChange={(e) => setSuggestedRent(e.target.value)}
                        placeholder="e.g. 750"
                        className="w-full h-10 pl-8 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                )}

                {/* Deposit Input */}
                {selectedRevisionTypes.includes("deposit") && (
                  <div className="space-y-1.5 animate-in fade-in duration-150">
                    <label className="text-xs font-bold text-slate-800">Suggested Security Deposit (₹) *</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        value={suggestedDeposit}
                        onChange={(e) => setSuggestedDeposit(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full h-10 pl-8 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Revision Instructions Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Detailed Revision Instructions *</label>
                <textarea
                  rows={3}
                  value={revisionComment}
                  onChange={(e) => setRevisionComment(e.target.value)}
                  placeholder="Explain clearly what the executive needs to fix before resubmitting..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-orange-500 resize-none font-medium"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => setReturnRevisionModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReturnRevision}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Confirm &amp; Return for Revision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED REJECT MODAL */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50/50">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Reject Application</h3>
              </div>
              <button
                onClick={() => setRejectModalItem(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                <p className="font-bold text-slate-900 text-xs">{rejectModalItem.title}</p>
                <p className="text-[11px] text-slate-500">{rejectModalItem.subtitle} · <strong className="text-slate-700">{rejectModalItem.city}</strong></p>
                <p className="text-[11px] text-slate-500">Submitted by: <strong className="text-slate-700">{rejectModalItem.submitted_by_name || "Onboarding Executive 1 (Onboarding Executive — Hyderabad)"}</strong></p>
              </div>

              {/* Rejection Reason Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Reason for Rejection *</label>
                <textarea
                  rows={3}
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="Specify why this application is rejected..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-rose-500 resize-none font-medium"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Confirm Rejection
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
                    <p className="text-xs text-slate-500 flex justify-between"><span>Created At:</span> <strong className="text-slate-800">{formatDateTimeComponents(selectedRecord.created_at).date} {formatDateTimeComponents(selectedRecord.created_at).time}</strong></p>
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
                        {approvalLogs.map((log, i) => {
                          const { date: lDate, time: lTime } = formatDateTimeComponents(log.action_at);
                          return (
                            <div key={i} className="bg-white p-3 rounded-xl border border-slate-200/60 text-xs shadow-xs">
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                <span className="font-bold uppercase tracking-wider">{log.action}</span>
                                <span>{lDate} {lTime}</span>
                              </div>
                              <p className="font-semibold text-slate-800">
                                {log.from_name || "System"} {log.action.toLowerCase()} {log.to_name && `to ${log.to_name}`}
                              </p>
                              {log.remarks && <p className="text-[11px] text-slate-500 italic mt-1 font-medium">"{log.remarks}"</p>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Highlight Manager's Return Reason if Changes Requested */}
                  {selectedRecord.approval_status?.includes("Requested") && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 shadow-xs mt-4">
                      <p className="text-[10px] font-extrabold text-orange-800 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                        <AlertTriangle className="w-3 h-3" /> Reason for Return
                      </p>
                      <p className="text-xs text-orange-900 font-medium italic">
                        "{selectedRecord.approval_remarks || approvalLogs[0]?.remarks || "Please review and resubmit."}"
                      </p>
                      {onEditRecord && (
                        <button
                          onClick={() => onEditRecord(selectedRecord.module, selectedRecord.id)}
                          className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Edit Form &amp; Resubmit
                        </button>
                      )}
                    </div>
                  )}
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
                    <div className="space-y-2">
                      {actionModal.type === "SUGGEST" && (
                        <div className="bg-blue-50/50 border border-blue-200 p-3 rounded-xl space-y-2 animate-in slide-in-from-bottom-2">
                          <p className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-blue-600" /> Suggest Rent or Security Deposit Amount
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Recommended Rent (₹/day)</label>
                              <input
                                type="number"
                                value={suggestedRent}
                                onChange={(e) => setSuggestedRent(e.target.value)}
                                placeholder="e.g. 750"
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Recommended Deposit (₹)</label>
                              <input
                                type="number"
                                value={suggestedDeposit}
                                onChange={(e) => setSuggestedDeposit(e.target.value)}
                                placeholder="e.g. 5000"
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              onClick={handleAction}
                              disabled={actionLoading}
                              className="px-4 py-1.5 bg-blue-600 text-white font-bold text-[11px] rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Submit Suggestion
                            </button>
                            <button
                              onClick={() => setActionModal({ type: null })}
                              className="px-3 py-1.5 border border-slate-200 text-slate-600 text-[11px] font-semibold rounded-lg hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => { setActionModal({ type: "APPROVE" }); handleAction(); }}
                          disabled={actionLoading}
                          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all shadow-xs"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                        <button
                          onClick={() => { setActionModal({ type: "HOLD" }); handleAction(); }}
                          disabled={actionLoading}
                          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition-all shadow-xs"
                        >
                          <PauseCircle className="w-4 h-4" /> Hold
                        </button>
                        <button
                          onClick={() => { setActionModal({ type: "REJECT" }); handleAction(); }}
                          disabled={actionLoading}
                          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-rose-200 text-rose-600 font-bold text-xs hover:bg-rose-50 transition-all"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setActionModal({ type: "SUGGEST" })}
                          className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-blue-600 text-blue-600 font-semibold text-[11px] hover:bg-blue-50 transition-all"
                        >
                          <IndianRupee className="w-3.5 h-3.5" /> Suggest Rent
                        </button>
                        <button
                          onClick={() => setActionModal({ type: "SUGGEST" })}
                          className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-indigo-600 text-indigo-600 font-semibold text-[11px] hover:bg-indigo-50 transition-all"
                        >
                          <DollarSign className="w-3.5 h-3.5" /> Suggest Deposit
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setForwardModalItem(selectedRecord);
                          setApprovalLogs(selectedRecord.approval_logs || []);
                          setSelectedRecord(null);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-all shadow-xs"
                      >
                        <ArrowRight className="w-4 h-4" /> Approve & Forward
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
