import React, { useState, useEffect } from "react";
import { TicketIcon, ArrowLeft, RefreshCw, Plus, CheckCircle, Clock, Search, Filter, ChevronDown, X, AlertCircle, Users, Building, Wrench, MessageSquare, ChevronLeft, FileText } from "lucide-react";
import { User as UserSession } from "../types";

interface TicketsFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

interface Ticket {
  id: number;
  title: string;
  description: string;
  source: string;
  status: string;
  created_by_name: string;
  assigned_to: number | null;
  assignee_name: string | null;
  created_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
}

interface AppUser {
  id: number;
  username: string;
  name: string;
}

const SOURCE_OPTIONS = [
  { value: "Internal", label: "Internal (LetzRyd Team)", icon: Building },
  { value: "Driver", label: "Driver", icon: Users },
  { value: "Operator", label: "Operator / Partner", icon: Users },
  { value: "Vendor", label: "External Vendor", icon: Wrench },
];

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Resolved: "bg-green-50 text-green-700 ring-green-600/20",
  "In Progress": "bg-blue-50 text-blue-700 ring-blue-600/20",
};

const SOURCE_COLORS: Record<string, string> = {
  Internal: "bg-purple-50 text-purple-700",
  Driver: "bg-sky-50 text-sky-700",
  Operator: "bg-orange-50 text-orange-700",
  Vendor: "bg-teal-50 text-teal-700",
};

export default function TicketsForm({
  user,
  onBackToSelector,
  onLogout,
}: TicketsFormProps) {
  const [activeTab, setActiveTab] = useState<"list" | "new">("list");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");

  // Resolve modal
  const [resolvingTicket, setResolvingTicket] = useState<Ticket | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  // Detail expand
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // New ticket form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSource, setFormSource] = useState("Internal");
  const [formAssignedTo, setFormAssignedTo] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Header clock
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

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/tickets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTickets(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAppUsers(data.map((u: any) => ({ id: u.id, username: u.username, name: u.name || u.username })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeTab === "list") fetchTickets();
  }, [activeTab]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) {
      return alert("Title and Description are required.");
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim(),
          source: formSource,
          assigned_to: formAssignedTo || null,
        }),
      });
      if (res.ok) {
        setFormTitle("");
        setFormDescription("");
        setFormSource("Internal");
        setFormAssignedTo("");
        setActiveTab("list");
      } else {
        const d = await res.json();
        alert(d.detail || "Failed to create ticket");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!resolvingTicket) return;
    setIsResolving(true);
    try {
      const res = await fetch(`/api/tickets/${resolvingTicket.id}/resolve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resolution_notes: resolutionNotes }),
      });
      if (res.ok) {
        setResolvingTicket(null);
        setResolutionNotes("");
        fetchTickets();
      } else {
        const d = await res.json();
        alert(d.detail || "Failed to resolve ticket");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsResolving(false);
    }
  };

  const filtered = tickets.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || (t.created_by_name || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || t.status === statusFilter;
    const matchSource = sourceFilter === "All" || t.source === sourceFilter;
    return matchQ && matchStatus && matchSource;
  });

  const openCount = tickets.filter((t) => t.status === "Open").length;
  const resolvedCount = tickets.filter((t) => t.status === "Resolved").length;

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
              Tickets Desk
            </span>
          </div>


          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === 'list' ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'text-text-muted hover:bg-slate-100 hover:text-primary' }`}
            >
              <TicketIcon className="h-4 w-4" />
              All Tickets
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === 'new' ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'text-text-muted hover:bg-slate-100 hover:text-primary' }`}
            >
              <Plus className="h-4 w-4" />
              Raise Ticket
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
        {activeTab === "new" ? (
          /* ─────────── NEW TICKET FORM ─────────── */
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
            
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
                  <h2 className="font-sans text-2xl font-extrabold tracking-tight">Raise a Ticket</h2>
                  <p className="font-sans text-xs text-white/70 mt-1 max-w-xl leading-relaxed">
                    Log and manage support tickets across Driver, Operator, Vendor, or Internal sources.
                  </p>
                </div>
              </div>
            </div>


            <form onSubmit={handleCreateTicket} className="p-8 space-y-6">
              <div>
                <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                  Ticket Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Brief summary of the issue..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe the issue in detail..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                    Ticket Source <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {SOURCE_OPTIONS.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFormSource(value)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all cursor-pointer ${ formSource === value ? "border-rose-500 bg-rose-50 text-rose-700" : "border-border bg-white text-text-muted hover:border-rose-300" }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                    Assign To (Optional)
                  </label>
                  <select
                    value={formAssignedTo}
                    onChange={(e) => setFormAssignedTo(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none transition-all"
                  >
                    <option value="">Unassigned</option>
                    {appUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-primary hover:bg-primary-hover px-4 py-3 font-sans text-sm font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ─────────── TICKETS LIST ─────────── */
          <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border bg-white p-4 shadow-xs">
                <p className="font-sans text-[10px] font-bold text-text-muted">Total</p>
                <p className="font-sans text-2xl font-extrabold text-text mt-1">{tickets.length}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-xs">
                <p className="font-sans text-[10px] font-bold text-amber-600">Open</p>
                <p className="font-sans text-2xl font-extrabold text-amber-700 mt-1">{openCount}</p>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-xs">
                <p className="font-sans text-[10px] font-bold text-green-600">Resolved</p>
                <p className="font-sans text-2xl font-extrabold text-green-700 mt-1">{resolvedCount}</p>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 shadow-xs">
                <p className="font-sans text-[10px] font-bold text-purple-600">Sources</p>
                <p className="font-sans text-2xl font-extrabold text-purple-700 mt-1">{new Set(tickets.map(t => t.source)).size}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="rounded-xl border border-border bg-white p-4 shadow-xs flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search by title, description, requester..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white pl-9 pr-4 py-2 font-sans text-xs focus:border-rose-500 focus:outline-none transition-all"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {["All", "Open", "Resolved"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-lg px-3 py-1.5 font-sans text-xs font-bold border transition-all cursor-pointer ${statusFilter === s ? "bg-rose-600 text-white border-rose-600" : "bg-white text-text-muted border-border hover:border-rose-300"}`}
                  >
                    {s}
                  </button>
                ))}
                <div className="h-5 w-px bg-border self-center" />
                {["All", ...SOURCE_OPTIONS.map((s) => s.value)].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSourceFilter(s)}
                    className={`rounded-lg px-3 py-1.5 font-sans text-xs font-bold border transition-all cursor-pointer ${sourceFilter === s ? "bg-slate-700 text-white border-slate-700" : "bg-white text-text-muted border-border hover:border-slate-400"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={fetchTickets}
                disabled={isLoading}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-bg text-text transition-all cursor-pointer disabled:opacity-50 ml-auto"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Ticket Cards */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="h-8 w-8 animate-spin text-rose-600" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-border bg-white py-20 text-center">
                <TicketIcon className="h-12 w-12 text-border mx-auto mb-3" />
                <h3 className="font-sans text-sm font-bold text-text">No Tickets Found</h3>
                <p className="font-sans text-xs text-text-muted mt-1">Adjust your filters or raise a new ticket.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="rounded-2xl border border-border bg-white shadow-xs hover:shadow-sm transition-all overflow-hidden"
                  >
                    <div
                      className="flex items-start gap-4 p-5 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
                    >
                      {/* Status Icon */}
                      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ticket.status === "Resolved" ? "bg-green-100" : "bg-amber-100"}`}>
                        {ticket.status === "Resolved"
                          ? <CheckCircle className="h-5 w-5 text-green-600" />
                          : <Clock className="h-5 w-5 text-amber-600" />
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-sans text-sm font-bold text-text truncate">{ticket.title}</h3>
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold ring-1 ring-inset ${STATUS_COLORS[ticket.status] || STATUS_COLORS.Open}`}>
                            {ticket.status}
                          </span>
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${SOURCE_COLORS[ticket.source] || "bg-slate-50 text-slate-700"}`}>
                            {ticket.source}
                          </span>
                        </div>
                        <p className="font-sans text-xs text-text-muted mt-1 line-clamp-2">{ticket.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                          <span>By: <span className="font-semibold text-text">{ticket.created_by_name || "—"}</span></span>
                          {ticket.assignee_name && <span>Assigned: <span className="font-semibold text-text">{ticket.assignee_name}</span></span>}
                          <span>{new Date(ticket.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {ticket.status === "Open" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setResolvingTicket(ticket); setResolutionNotes(""); }}
                            className="flex items-center gap-1.5 rounded-lg bg-green-50 hover:bg-green-500 hover:text-white text-green-700 border border-green-200/60 px-3 py-1.5 font-sans text-xs font-bold transition-all cursor-pointer"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Resolve
                          </button>
                        )}
                        <ChevronDown className={`h-4 w-4 text-text-muted transition-transform ${expandedId === ticket.id ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {expandedId === ticket.id && (
                      <div className="border-t border-border bg-slate-50/50 px-5 py-4 space-y-3">
                        <div>
                          <p className="font-sans text-[10px] font-bold text-text-muted mb-1">Full Description</p>
                          <p className="font-sans text-sm text-text whitespace-pre-wrap">{ticket.description}</p>
                        </div>
                        {ticket.resolution_notes && (
                          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                            <p className="font-sans text-[10px] font-bold text-green-600 mb-1">Resolution Notes</p>
                            <p className="font-sans text-sm text-green-800">{ticket.resolution_notes}</p>
                            {ticket.resolved_at && (
                              <p className="font-sans text-xs text-green-600 mt-2">
                                Resolved on {new Date(ticket.resolved_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                              </p>
                            )}
                          </div>
                        )}
                        <div className="flex gap-6 text-xs text-text-muted">
                          <span>Ticket #{ticket.id}</span>
                          <span>Created: {new Date(ticket.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* RESOLVE MODAL */}
      {resolvingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-green-600 px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="font-sans text-base font-extrabold text-white">Resolve Ticket</h3>
                <p className="font-sans text-xs text-green-100 mt-0.5 line-clamp-1">{resolvingTicket.title}</p>
              </div>
              <button
                onClick={() => setResolvingTicket(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-all cursor-pointer"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block font-sans text-xs font-bold text-text-muted mb-2">
                  Resolution Notes
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe how the issue was resolved..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none transition-all resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setResolvingTicket(null)}
                  className="flex-1 rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm font-bold text-text hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  disabled={isResolving}
                  className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 px-4 py-2.5 font-sans text-sm font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isResolving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Mark Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
