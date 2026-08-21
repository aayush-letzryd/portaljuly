import { compressImage } from "../utils/imageCompressor";
import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar, MapPin, User, Phone, FileText, CheckCircle,
  Clock, ArrowLeft, Download, Search, Trash2, Camera, Edit,
  Upload, X, RefreshCw, ChevronLeft, ChevronRight, Database,
  Plus, AlertTriangle
} from "lucide-react";
import { User as UserSession, CITIES } from "../types";
import CameraCapture from "./CameraCapture";

interface DropOffFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

const REASON_COLORS: Record<string, string> = {
  "Voluntary Return": "bg-emerald-50 text-emerald-800 border-emerald-200/60",
  "Contract Completion": "bg-blue-50 text-blue-800 border-blue-200/60",
  "Non-payment / Default": "bg-red-50 text-red-800 border-red-200/60",
  "Vehicle Breakdown / Maintenance": "bg-amber-50 text-amber-800 border-amber-200/60",
  "Other": "bg-slate-100 text-slate-700 border-slate-200/60",
};

export default function DropOffForm({ user, onBackToSelector, onLogout }: DropOffFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "drafts" | "registry">("form");

  // Clock
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: true }));
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: true })), 1000);
    return () => clearInterval(timer);
  }, []);

  // Edit mode
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [dropoffDate, setDropoffDate] = useState(new Date().toISOString().split("T")[0]);
  const [dropoffReason, setDropoffReason] = useState("Voluntary Return");
  const [cityName, setCityName] = useState(user.city || "Hyderabad");
  const [dropoffLocation, setDropoffLocation] = useState("Hub");
  const [manualDropoffLocation, setManualDropoffLocation] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [driverId, setDriverId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverLookupStatus, setDriverLookupStatus] = useState("");
  const [isDriverLookupLoading, setIsDriverLookupLoading] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleSuggestions, setVehicleSuggestions] = useState<any[]>([]);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [olaNegativeBalance, setOlaNegativeBalance] = useState("");
  const [olaNegativeBalanceProof, setOlaNegativeBalanceProof] = useState<string | null>(null);
  const [odometerReading, setOdometerReading] = useState("");
  const [odometerPhoto, setOdometerPhoto] = useState<string | null>(null);
  const [batteryPhoto, setBatteryPhoto] = useState<string | null>(null);
  const [photoLhSide, setPhotoLhSide] = useState<string | null>(null);
  const [photoRhSide, setPhotoRhSide] = useState<string | null>(null);
  const [photoFrontSide, setPhotoFrontSide] = useState<string | null>(null);
  const [photoBackSide, setPhotoBackSide] = useState<string | null>(null);
  const [duplicateKeyStatus, setDuplicateKeyStatus] = useState("Yes");
  const [pendingDues, setPendingDues] = useState("");
  const [damagePenalty, setDamagePenalty] = useState("");
  const [depositRefundStatus, setDepositRefundStatus] = useState("Pending Assessment");
  const [fastagBalanceAmount, setFastagBalanceAmount] = useState("");
  const [fastagBalanceProof, setFastagBalanceProof] = useState<string | null>(null);
  const [dropoffNotes, setDropoffNotes] = useState("");

  // Inspection Checklist State (Returned Car)
  const [jack, setJack] = useState("Available");
  const [jackRod, setJackRod] = useState("Available");
  const [spanner, setSpanner] = useState("Available");
  const [parkingTriangle, setParkingTriangle] = useState("Available");
  const [fireExtinguishers, setFireExtinguishers] = useState("Available");
  const [seatCover, setSeatCover] = useState("Available");
  const [floorCarpet, setFloorCarpet] = useState("Available");
  const [musicSystem, setMusicSystem] = useState("Available");
  const [stepney, setStepney] = useState("Available");
  const [stepneyPhoto, setStepneyPhoto] = useState<string | null>(null);

  // Camera
  const [cameraActive, setCameraActive] = useState(false);
  const [activeCameraTarget, setActiveCameraTarget] = useState<
    "odometer" | "battery" | "lhSide" | "rhSide" | "frontSide" | "backSide" | "fastag" | "ola" | "stepney" | null
  >(null);

  // Records
  const [records, setRecords] = useState<any[]>([]);
  const [draftRecords, setDraftRecords] = useState<any[]>([]);

  // Registry filters & pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterReason, setFilterReason] = useState("all");
  const [filterTime, setFilterTime] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [draftPage, setDraftPage] = useState(1);
  const PAGE_SIZE = 10;

  const displayName = user.name || user.username || "Executive";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const [resReg, resDraft] = await Promise.all([
        fetch("/api/dropoffs", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/dropoffs?status=Draft", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (resReg.ok) setRecords(await resReg.json());
      if (resDraft.ok) setDraftRecords(await resDraft.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const handleFetchDriver = async (searchVal?: string) => {
    const term = searchVal || driverPhone || driverId || vehicleNumber;
    if (!term?.trim()) { alert("Please enter a Driver Phone Number, Driver ID, or Vehicle Number."); return; }
    setIsDriverLookupLoading(true);
    setDriverLookupStatus("");
    try {
      const token = localStorage.getItem("lr_token");
      
      // 1. Fetch driver details
      const res = await fetch(`/api/allocation/lookup-driver?query=${encodeURIComponent(term.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const d = Array.isArray(data) ? data[0] : data;
        if (d && (d.found || d.driver_id || d.driver_name)) {
          if (d.driver_id) setDriverId(d.driver_id);
          if (d.driver_name) setDriverName(d.driver_name);
          if (d.driver_phone) setDriverPhone(d.driver_phone);
          if (d.city_name || d.city) setCityName(d.city_name || d.city);
          setDriverLookupStatus(`✓ Found Driver: ${d.driver_name || "Driver"} (${d.driver_id || "ID"})`);
        } else {
          setDriverLookupStatus("No matching driver found.");
        }
      }

      // 2. Fetch Active Allocation for full End-to-End Linking
      const resActive = await fetch(`/api/allocation/active?query=${encodeURIComponent(term.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resActive.ok) {
        const act = await resActive.json();
        if (act && act.found) {
          if (act.vehicle_number) setVehicleNumber(act.vehicle_number);
          if (act.driver_name) setDriverName(act.driver_name);
          if (act.driver_id) setDriverId(act.driver_id);
          if (act.driver_phone) setDriverPhone(act.driver_phone);
          if (act.city_name) setCityName(act.city_name);
          if (act.customer_address) setCustomerAddress(act.customer_address);
          if (act.insp_stepney) setStepney(act.insp_stepney);
          if (act.insp_stepney_photo) setStepneyPhoto(act.insp_stepney_photo);
          setDriverLookupStatus(`✓ Linked Active Allocation #${act.allocation_id}: ${act.driver_name} (${act.vehicle_number})`);
        }
      }
    } catch {
      setDriverLookupStatus("Lookup failed.");
    } finally {
      setIsDriverLookupLoading(false);
    }
  };

  const handleVehicleInputChange = async (val: string) => {
    setVehicleNumber(val);
    if (val.trim().length >= 1) {
      try {
        const token = localStorage.getItem("lr_token");
        const res = await fetch(`/api/allocation/lookup-vehicle?query=${encodeURIComponent(val.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) { setVehicleSuggestions(await res.json()); setShowVehicleDropdown(true); }
      } catch { /* ignore */ }
    } else {
      setShowVehicleDropdown(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setDropoffDate(new Date().toISOString().split("T")[0]);
    setDropoffReason("Voluntary Return");
    setCityName(user.city || "Hyderabad");
    setDropoffLocation("Hub");
    setManualDropoffLocation("");
    setCustomerAddress("");
    setDriverId(""); setDriverName(""); setDriverPhone("");
    setVehicleNumber(""); setOdometerReading("");
    setOdometerPhoto(null); setBatteryPhoto(null);
    setPhotoLhSide(null); setPhotoRhSide(null); setPhotoFrontSide(null); setPhotoBackSide(null);
    setOlaNegativeBalance(""); setOlaNegativeBalanceProof(null);
    setPendingDues(""); setDamagePenalty("");
    setDepositRefundStatus("Pending Assessment");
    setFastagBalanceAmount(""); setFastagBalanceProof(null);
    setDropoffNotes(""); setDriverLookupStatus("");
    setJack("Available"); setJackRod("Available"); setSpanner("Available"); setParkingTriangle("Available");
    setFireExtinguishers("Available"); setSeatCover("Available"); setFloorCarpet("Available"); setMusicSystem("Available");
    setStepney("Available"); setStepneyPhoto(null);
  };

  const loadForEdit = async (id: number) => {
    try {
      const token = localStorage.getItem("lr_token");
      // Fetch single record from all dropoffs
      const res = await fetch("/api/dropoffs?status=all_including_draft", { headers: { Authorization: `Bearer ${token}` } });
      const all = res.ok ? await res.json() : [...records, ...draftRecords];
      const r = (all as any[]).find((x) => x.id === id) || [...records, ...draftRecords].find((x) => x.id === id);
      if (!r) { alert("Could not load record."); return; }
      setEditingId(id);
      setDropoffDate(r.dropoff_date?.split("T")[0] || new Date().toISOString().split("T")[0]);
      setDropoffReason(r.dropoff_reason || "Voluntary Return");
      setCityName(r.city_name || "Hyderabad");
      setDropoffLocation(r.dropoff_location || "Hub");
      setManualDropoffLocation(r.manual_dropoff_location || "");
      setCustomerAddress(r.customer_address || "");
      setDriverId(r.driver_id || "");
      setDriverName(r.driver_name || "");
      setDriverPhone(r.driver_phone || "");
      setVehicleNumber(r.vehicle_number || "");
      setOdometerReading(r.odometer_reading ? String(r.odometer_reading) : "");
      setPendingDues(r.pending_dues ? String(r.pending_dues) : "");
      setDropoffNotes(r.dropoff_notes || "");
      setStepney(r.insp_stepney || "Available");
      setStepneyPhoto(r.insp_stepney_photo || null);
      setActiveTab("form");
    } catch (err) {
      alert("Failed to load record for editing.");
    }
  };

  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    if (!isDraft) {
      if (!vehicleNumber.trim()) return alert("Please specify the vehicle number.");
      if (!driverPhone.trim() && !driverId.trim()) return alert("Please enter Driver ID or Phone Number.");
      if (dropoffLocation === "Forced Recovery" && !customerAddress.trim()) {
        return alert("Customer Address is mandatory for Forced Recovery.");
      }
      if (!odometerReading.trim()) return alert("Please enter Odometer Reading.");
      if (!odometerPhoto) return alert("Please upload or capture Odometer Photo.");
    }

    const targetStatus = isDraft ? "Draft" : "Submitted";
    try {
      const token = localStorage.getItem("lr_token");
      const payload = {
        dropoff_date: dropoffDate,
        dropoff_reason: dropoffReason,
        city_name: cityName,
        dropoff_location: dropoffLocation,
        manual_dropoff_location: dropoffLocation === "Manual Entry" ? manualDropoffLocation.trim() : null,
        customer_address: customerAddress.trim(),
        driver_id: driverId.trim(),
        driver_name: driverName.trim(),
        driver_phone: driverPhone.trim(),
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        odometer_reading: odometerReading ? parseFloat(odometerReading) : null,
        odometer_photo: odometerPhoto,
        battery_photo: batteryPhoto,
        photo_lh_side: photoLhSide,
        photo_rh_side: photoRhSide,
        photo_front_side: photoFrontSide,
        photo_back_side: photoBackSide,
        ola_negative_balance: olaNegativeBalance || null,
        ola_negative_balance_proof: olaNegativeBalanceProof,
        pending_dues: pendingDues ? parseFloat(pendingDues) : null,
        damage_penalty: damagePenalty ? parseFloat(damagePenalty) : null,
        deposit_refund_status: depositRefundStatus,
        insp_jack: jack,
        insp_jack_rod: jackRod,
        insp_spanner: spanner,
        insp_parking_triangle: parkingTriangle,
        insp_fire_extinguishers: fireExtinguishers,
        insp_seat_cover: seatCover,
        insp_floor_carpet: floorCarpet,
        insp_music_system: musicSystem,
        insp_stepney: stepney,
        insp_stepney_photo: stepneyPhoto,
        dropoff_notes: dropoffNotes,
        status: targetStatus,
      };

      const url = editingId ? `/api/dropoffs/${editingId}` : "/api/dropoffs";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(t || "Failed to submit"); }

      alert(isDraft
        ? (editingId ? "Draft Updated Successfully!" : "Draft Saved Successfully!")
        : (editingId ? "Drop-Off Record Updated!" : "Vehicle Drop-Off Submitted Successfully!"));
      resetForm();
      fetchRecords();
      setActiveTab(isDraft ? "drafts" : "registry");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete drop-off record for ${name}?`)) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/dropoffs/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Delete failed");
      alert("Record deleted.");
      fetchRecords();
    } catch (err: any) { alert(err.message); }
  };

  // Filtered & paginated registry
  const filteredRecords = useMemo(() => {
    const now = new Date();
    return records
      .filter((r) => {
        if (filterCity !== "all" && (r.city_name || "").toLowerCase() !== filterCity.toLowerCase()) return false;
        if (filterReason !== "all" && (r.dropoff_reason || "") !== filterReason) return false;
        if (filterTime !== "all") {
          const d = new Date(r.created_at || r.updated_at || 0);
          if (filterTime === "today" && d.toDateString() !== now.toDateString()) return false;
          if (filterTime === "week") { const w = new Date(now); w.setDate(now.getDate() - 7); if (d < w) return false; }
          if (filterTime === "month") { const m = new Date(now); m.setMonth(now.getMonth() - 1); if (d < m) return false; }
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            (r.driver_name || "").toLowerCase().includes(q) ||
            (r.driver_id || "").toLowerCase().includes(q) ||
            (r.driver_phone || "").includes(q) ||
            (r.vehicle_number || "").toLowerCase().includes(q) ||
            String(r.id).includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.created_at || b.updated_at || 0).getTime() - new Date(a.created_at || a.updated_at || 0).getTime());
  }, [records, searchQuery, filterCity, filterReason, filterTime]);

  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const draftTotalPages = Math.ceil(draftRecords.length / PAGE_SIZE) || 1;
  const paginatedDrafts = draftRecords.slice((draftPage - 1) * PAGE_SIZE, draftPage * PAGE_SIZE);

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return alert("No records to export");
    const headers = ["ID", "Date", "Reason", "City", "Driver ID", "Driver Name", "Phone", "Vehicle No", "Odometer", "Notes", "Created At"];
    const rows = filteredRecords.map((r) => [
      r.id, r.dropoff_date, r.dropoff_reason, r.city_name, r.driver_id, r.driver_name,
      r.driver_phone, r.vehicle_number, r.odometer_reading, `"${(r.dropoff_notes || "").replace(/"/g, '""')}"`, r.created_at,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `dropoff_registry_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  const PaginationBar = ({ page, totalPgs, setPage, total }: { page: number; totalPgs: number; setPage: (p: number) => void; total: number }) => (
    <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between font-sans text-xs text-slate-500">
      <span>
        Showing {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} records
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
          className="h-8 px-3 rounded-lg border border-slate-200 bg-white disabled:opacity-40 flex items-center gap-1 cursor-pointer hover:bg-slate-100 transition-colors text-slate-600">
          <ChevronLeft className="w-3 h-3" /> Prev
        </button>
        {Array.from({ length: totalPgs }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPgs || Math.abs(p - page) <= 1)
          .reduce<(number | string)[]>((acc, p, idx, arr) => {
            if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
            acc.push(p); return acc;
          }, [])
          .map((p, i) =>
            typeof p === "string" ? (
              <span key={`e${i}`} className="px-1 text-slate-400">…</span>
            ) : (
              <button key={p} onClick={() => setPage(p)}
                className={`h-8 w-8 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${page === p ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}>
                {p}
              </button>
            )
          )}
        <button onClick={() => setPage(Math.min(totalPgs, page + 1))} disabled={page === totalPgs || total === 0}
          className="h-8 px-3 rounded-lg border border-slate-200 bg-white disabled:opacity-40 flex items-center gap-1 cursor-pointer hover:bg-slate-100 transition-colors text-slate-600">
          Next <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  const RegistryTable = ({ rows, isLoading }: { rows: any[]; isLoading?: boolean }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse whitespace-nowrap">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {["ID", "DRIVER NAME", "DRIVER ID", "CONTACT", "CITY", "VEHICLE NO", "REASON", "RECORDED BY", "DATE & TIME", "ACTION"].map((h) => (
              <th key={h} className={`px-4 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 ${h === "ACTION" ? "text-center" : "text-left"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-500 font-sans bg-slate-50/50 text-xs">No records found.</td></tr>
          ) : (
            rows.map((r: any) => {
              const rawDate = r.updated_at || r.created_at;
              const datePart = rawDate ? new Date(rawDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
              const timePart = rawDate ? new Date(rawDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase() : "—";
              const recBy = r.created_by_name || user.name || "Executive";
              const reasonColor = REASON_COLORS[r.dropoff_reason] || REASON_COLORS["Other"];
              return (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 font-sans text-xs font-semibold text-slate-700">#{r.id}</td>
                  <td className="px-4 py-3.5 font-sans text-xs font-bold text-slate-900">{r.driver_name || "—"}</td>
                  <td className="px-4 py-3.5 font-sans text-xs font-medium text-slate-600">{r.driver_id || "—"}</td>
                  <td className="px-4 py-3.5 font-sans text-xs text-slate-600">{r.driver_phone || "—"}</td>
                  <td className="px-4 py-3.5 font-sans text-xs font-semibold text-slate-800">{r.city_name || "—"}</td>
                  <td className="px-4 py-3.5 font-sans text-xs font-bold text-slate-900">{r.vehicle_number || "—"}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-1 rounded-lg border font-semibold text-[11px] ${reasonColor}`}>
                      {r.dropoff_reason || "Voluntary Return"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-sans text-xs text-slate-800">
                    <span className="font-bold text-slate-900 block">{recBy}</span>
                    <span className="text-[10px] text-slate-400 font-medium block">ID: {r.created_by || "—"}</span>
                  </td>
                  <td className="px-4 py-3.5 font-sans text-xs text-slate-800">
                    <span className="font-bold text-slate-900 block">{datePart}</span>
                    <span className="text-[10px] text-slate-400 font-medium block">{timePart}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => loadForEdit(r.id)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200" title="Edit">
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(r.id, r.driver_name)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-rose-200/60" title="Delete">
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
  );

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-border bg-white shadow-xs">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBackToSelector}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-slate-100 hover:text-primary transition-all cursor-pointer"
              title="Back to Form Selector">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <img
              src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png"
              alt="LetzRyd logo"
              className="h-8 w-auto object-contain"
            />
            <span className="hidden h-5 border-l border-border sm:inline-block" />
            <span className="hidden font-sans text-xs font-medium text-text-muted sm:inline-block">
              Vehicle Drop-Off
            </span>
          </div>

          {/* Navigation Pills — exact same style as AllocationForm */}
          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab("form")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "form" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary"
              }`}>
              <FileText className="h-4 w-4" />
              Vehicle Drop-Off Form
            </button>
            <button
              onClick={() => { setActiveTab("drafts"); fetchRecords(); }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "drafts" ? "bg-amber-600 text-white shadow-sm shadow-amber-600/20" : "text-text-muted hover:bg-slate-100 hover:text-amber-600"
              }`}>
              <Clock className="h-4 w-4" />
              Saved Drafts
              {draftRecords.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-extrabold">
                  {draftRecords.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab("registry"); fetchRecords(); }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "registry" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary"
              }`}>
              <Database className="h-4 w-4" />
              Drop-Off Registry
            </button>
          </nav>

          {/* Clock & User Profile — exact same as AllocationForm */}
          <div className="hidden items-center gap-4 lg:flex">
            <div className="text-right">
              <span className="block text-[9px] font-bold text-text-dim">Current Time (IST)</span>
              <span className="font-sans text-xs font-bold text-primary tracking-tight">{currentTime}</span>
            </div>
            <span className="h-5 border-l border-border" />
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">{initials}</div>
              <div className="flex flex-col">
                <span className="font-sans text-xs font-semibold leading-none text-text">{displayName}</span>
                {user.executive_id && <span className="font-mono text-[9px] text-text-muted mt-1 leading-none">ID: {user.executive_id}</span>}
              </div>
            </div>
            <span className="h-5 border-l border-border" />
            <button
              onClick={onLogout}
              className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-2.5 font-sans text-xs font-medium text-text-muted hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors cursor-pointer">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* FORM TAB */}
        {activeTab === "form" && (
          <div className="rounded-2xl border border-border bg-white shadow-xl overflow-hidden mb-10">
            <div className="bg-primary text-white px-8 py-6 relative">
              <div className="flex items-center gap-3 mb-2">
                <img src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" className="h-8 brightness-0 invert" alt="LetzRyd" referrerPolicy="no-referrer" />
                <span className="px-2 py-0.5 rounded border border-white/30 bg-white/20 text-white text-[10px] font-bold tracking-widest backdrop-blur-sm">
                  {editingId ? `Editing #${editingId}` : "Drop-Off Desk"}
                </span>
              </div>
              <h1 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                {editingId ? `Edit Drop-Off Record #${editingId}` : "Vehicle Drop-Off Form"}
              </h1>
              <p className="text-white/80 text-xs mt-1">Record vehicle return details, meter readings, OLA balances &amp; settlements.</p>
            </div>

            <form onSubmit={(e) => handleSubmit(e, false)} className="p-8 space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                {/* COL 1: Drop-Off Logistics */}
                <div className="space-y-5">
                  <div className="border-b border-slate-200 pb-2.5">
                    <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">1</span>
                      Drop-Off Logistics
                    </h3>
                  </div>
                  <div className="space-y-3.5">
                    <div>
                      <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Date of Drop-Off <span className="text-red-500">*</span></label>
                      <input type="date" value={dropoffDate} onChange={(e) => setDropoffDate(e.target.value)} required
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs cursor-pointer" />
                    </div>
                    <div>
                      <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Drop-Off Reason <span className="text-red-500">*</span></label>
                      <select value={dropoffReason} onChange={(e) => setDropoffReason(e.target.value)} required
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs cursor-pointer">
                        <option>Voluntary Return</option>
                        <option>Non-payment / Default</option>
                        <option>Vehicle Breakdown / Maintenance</option>
                        <option>Contract Completion</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Drop-Off Location <span className="text-red-500">*</span></label>
                      <select value={dropoffLocation} onChange={(e) => setDropoffLocation(e.target.value)} required
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs cursor-pointer">
                        <option value="Hub">Hub Desk</option>
                        <option value="Service Station">Service Station</option>
                        <option value="Forced Recovery">Forced Recovery</option>
                        <option value="Manual Entry">Manual Entry (Enter Location)</option>
                      </select>
                    </div>
                    {dropoffLocation === "Manual Entry" && (
                      <div>
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Enter Manual Drop-Off Location <span className="text-red-500">*</span></label>
                        <input type="text" placeholder="Specify drop-off location..." value={manualDropoffLocation} onChange={(e) => setManualDropoffLocation(e.target.value)} required
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs" />
                      </div>
                    )}
                    {dropoffLocation === "Forced Recovery" && (
                      <div>
                        <label className="block font-sans text-xs font-bold text-rose-700 mb-1">Customer Address (Mandatory for Forced Recovery) <span className="text-red-500">*</span></label>
                        <textarea placeholder="Enter full address for forced recovery..." value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} required rows={2}
                          className="w-full rounded-xl border border-rose-300 bg-rose-50/50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-rose-600 focus:ring-1 focus:ring-rose-600/20 outline-none transition-all shadow-2xs resize-none" />
                      </div>
                    )}
                    <div>
                      <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Operating City <span className="text-red-500">*</span></label>
                      <select value={cityName} onChange={(e) => setCityName(e.target.value)} required
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs cursor-pointer">
                        {CITIES.map((c) => <option key={c.value} value={c.value}>{c.text}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* COL 2: Driver & Vehicle */}
                <div className="space-y-5">
                  <div className="border-b border-slate-200 pb-2.5">
                    <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">2</span>
                      Driver &amp; Vehicle Info
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {driverLookupStatus && (
                      <div className={`p-2.5 rounded-lg text-xs font-semibold ${driverLookupStatus.startsWith("✓") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
                        {isDriverLookupLoading ? "Searching..." : driverLookupStatus}
                      </div>
                    )}
                    {[{ label: "Driver Phone Number *", value: driverPhone, set: setDriverPhone, fetchKey: "phone", type: "tel", transform: (v: string) => v.replace(/\D/g, "").slice(0, 10) },
                       { label: "Operator / Driver ID *", value: driverId, set: setDriverId, fetchKey: "id", type: "text", transform: (v: string) => v },
                    ].map(({ label, value, set, fetchKey, type, transform }) => (
                      <div key={label}>
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">{label}</label>
                        <div className="flex gap-2">
                          <input type={type} placeholder={fetchKey === "phone" ? "10-digit phone..." : "e.g. LR-4091..."} value={value}
                            onChange={(e) => set(transform(e.target.value))}
                            onBlur={() => { if (fetchKey === "phone" && value.length === 10) handleFetchDriver(value); if (fetchKey === "id" && value.trim().length >= 3) handleFetchDriver(value); }}
                            className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs" />
                          <button type="button" onClick={() => handleFetchDriver(value)}
                            className="h-10 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors">Fetch</button>
                        </div>
                      </div>
                    ))}
                    <div>
                      <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Driver Name <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="Driver full name..." value={driverName} onChange={(e) => setDriverName(e.target.value)} required
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs" />
                    </div>
                    <div className="relative">
                      <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">Vehicle Number *</label>
                      <input type="text" placeholder="e.g. TS09EV1234..." value={vehicleNumber}
                        onChange={(e) => handleVehicleInputChange(e.target.value.toUpperCase())} required
                        className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none shadow-2xs font-bold uppercase" />
                      {showVehicleDropdown && vehicleSuggestions.length > 0 && (
                        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                          {vehicleSuggestions.map((v) => (
                            <button key={v.vehicle_number} type="button" onClick={() => { setVehicleNumber(v.vehicle_number); setShowVehicleDropdown(false); }}
                              className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between cursor-pointer">
                              <div>
                                <span className="font-sans font-extrabold text-xs text-slate-900 block">{v.vehicle_number}</span>
                                <span className="text-[10px] text-slate-500">{v.car_model} · {v.city_name}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700">{v.status}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border/60 pt-4 mt-2 space-y-4">
                      <div>
                        <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">OLA Negative Balance (₹)</label>
                        <input type="number" placeholder="e.g. 1500..." value={olaNegativeBalance} onChange={(e) => setOlaNegativeBalance(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-sm focus:border-primary focus:outline-none shadow-2xs font-semibold" />
                      </div>
                      <div>
                        <label className="block font-sans text-xs font-bold text-slate-800 mb-1.5">OLA Balance Proof Photo</label>
                        {olaNegativeBalanceProof ? (
                          <div className="relative inline-block bg-white rounded-lg p-1 border border-border">
                            <img src={olaNegativeBalanceProof} alt="OLA Proof" className="max-h-24 object-contain rounded" />
                            <button type="button" onClick={() => setOlaNegativeBalanceProof(null)} className="absolute top-1 right-1 rounded-full bg-rose-50 text-rose-500 p-1 hover:bg-rose-100 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => { setActiveCameraTarget("ola"); setCameraActive(true); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold py-2.5 cursor-pointer"><Camera className="h-3.5 w-3.5" /> Capture</button>
                            <label className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-bold py-2.5 hover:bg-slate-50 cursor-pointer">
                              <Upload className="h-3.5 w-3.5 text-primary" /> Upload
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { compressImage(f).then(setOlaNegativeBalanceProof); } }} />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* COL 3: Odometer */}
                <div className="space-y-5">
                  <div className="border-b border-slate-200 pb-2.5">
                    <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">3</span>
                      Odometer Details
                    </h3>
                  </div>
                  <div className="space-y-3.5">
                    <div>
                      <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Odometer Reading (KM) <span className="text-red-500">*</span></label>
                      <input type="number" placeholder="Current reading..." value={odometerReading} onChange={(e) => setOdometerReading(e.target.value)}
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs" />
                    </div>
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 space-y-3">
                      <span className="block font-sans text-xs font-bold text-slate-800 text-center">Odometer Photo *</span>
                      {odometerPhoto ? (
                        <div className="relative flex items-center justify-center bg-white rounded-lg p-2 border border-slate-200">
                          <img src={odometerPhoto} alt="Odometer" className="max-h-36 object-contain rounded" />
                          <button type="button" onClick={() => setOdometerPhoto(null)} className="absolute top-2 right-2 rounded-full bg-rose-50 text-rose-500 p-1 hover:bg-rose-100 cursor-pointer"><X className="h-4 w-4" /></button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setActiveCameraTarget("odometer"); setCameraActive(true); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary text-white text-xs font-bold py-2.5 hover:bg-primary-hover cursor-pointer"><Camera className="h-3.5 w-3.5" /> Capture</button>
                          <label className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-bold py-2.5 hover:bg-slate-50 cursor-pointer">
                            <Upload className="h-3.5 w-3.5 text-primary" /> Upload
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { compressImage(f).then(setOdometerPhoto); } }} />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4 */}
              <div className="border-t border-slate-200 pt-8 space-y-5">
                <div className="border-b border-slate-200 pb-2.5">
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">4</span>
                    Car Condition Photos
                  </h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { label: "LH Side", state: photoLhSide, setState: setPhotoLhSide, target: "lhSide" },
                    { label: "RH Side", state: photoRhSide, setState: setPhotoRhSide, target: "rhSide" },
                    { label: "Front Side", state: photoFrontSide, setState: setPhotoFrontSide, target: "frontSide" },
                    { label: "Back Side", state: photoBackSide, setState: setPhotoBackSide, target: "backSide" },
                    { label: "Battery Photo", state: batteryPhoto, setState: setBatteryPhoto, target: "battery" },
                  ].map((ph) => (
                    <div key={ph.label} className="space-y-2">
                      <span className="block font-sans text-xs font-bold text-slate-800">{ph.label}</span>
                      <div className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center">
                        {ph.state ? (
                          <div className="relative inline-block">
                            <img src={ph.state} alt={ph.label} className="h-28 w-auto object-cover rounded-lg border border-slate-200" />
                            <button type="button" onClick={() => ph.setState(null)} className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white"><X className="h-3 w-3" /></button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 items-center justify-center py-2">
                            <button type="button" onClick={() => { setActiveCameraTarget(ph.target as any); setCameraActive(true); }} className="w-full flex items-center justify-center gap-1 rounded-lg bg-primary text-white text-[11px] font-bold py-2 hover:bg-primary-hover cursor-pointer"><Camera className="h-3.5 w-3.5" /> Capture</button>
                            <label className="w-full flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-[11px] font-bold py-2 hover:bg-slate-100 cursor-pointer">
                              <Upload className="h-3.5 w-3.5 text-primary" /> Upload
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { compressImage(f).then(ph.setState); } }} />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 5: RETURNED VEHICLE INSPECTION CHECKLIST */}
              <div className="border-t border-slate-200 pt-8 space-y-5">
                <div className="border-b border-slate-200 pb-2.5 flex items-center justify-between">
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">5</span>
                    Returned Vehicle Inspection Checklist
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Jack", val: jack, set: setJack },
                    { label: "Jack Rod", val: jackRod, set: setJackRod },
                    { label: "Spanner", val: spanner, set: setSpanner },
                    { label: "Parking Triangle", val: parkingTriangle, set: setParkingTriangle },
                    { label: "Fire Extinguisher", val: fireExtinguishers, set: setFireExtinguishers },
                    { label: "Seat Covers", val: seatCover, set: setSeatCover },
                    { label: "Floor Carpets", val: floorCarpet, set: setFloorCarpet },
                    { label: "Music System", val: musicSystem, set: setMusicSystem },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                      <span className="font-sans text-xs font-bold text-slate-800">{item.label}</span>
                      <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200">
                        <button type="button" onClick={() => item.set("Available")}
                          className={`px-3 py-1 rounded-md text-[11px] font-extrabold cursor-pointer transition-all ${item.val === "Available" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-500 hover:text-slate-800"}`}>
                          Available
                        </button>
                        <button type="button" onClick={() => item.set("Not Available")}
                          className={`px-3 py-1 rounded-md text-[11px] font-extrabold cursor-pointer transition-all ${item.val === "Not Available" ? "bg-rose-600 text-white shadow-2xs" : "text-slate-500 hover:text-slate-800"}`}>
                          Not Available
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Stepney / Spare Tire */}
                  <div className="flex flex-col gap-2.5 p-3 rounded-xl border border-emerald-300 bg-emerald-50/30 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-sans text-xs font-bold text-emerald-950 block">Stepney / Spare Tire</span>
                        <span className="text-[10px] text-emerald-800 font-medium">Verify returned spare tire condition</span>
                      </div>
                      <div className="flex gap-1 bg-white p-1 rounded-lg border border-emerald-200">
                        <button type="button" onClick={() => setStepney("Available")}
                          className={`px-3 py-1 rounded-md text-[11px] font-extrabold cursor-pointer transition-all ${stepney === "Available" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-500 hover:text-slate-800"}`}>
                          Available
                        </button>
                        <button type="button" onClick={() => setStepney("Not Available")}
                          className={`px-3 py-1 rounded-md text-[11px] font-extrabold cursor-pointer transition-all ${stepney === "Not Available" ? "bg-rose-600 text-white shadow-2xs" : "text-slate-500 hover:text-slate-800"}`}>
                          Not Available
                        </button>
                      </div>
                    </div>
                    {stepney === "Available" && (
                      <div className="flex items-center justify-between border-t border-emerald-200/60 pt-2 mt-1">
                        <span className="font-sans text-xs font-bold text-slate-700">Stepney Photo <span className="text-red-500">*</span></span>
                        {stepneyPhoto ? (
                          <div className="relative flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200">
                            <img src={stepneyPhoto} alt="Stepney" className="h-10 w-10 object-cover rounded" />
                            <button type="button" onClick={() => setStepneyPhoto(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer p-1"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => { setActiveCameraTarget("stepney"); setCameraActive(true); }} className="flex items-center gap-1.5 rounded-lg bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 hover:bg-emerald-800 cursor-pointer shadow-2xs"><Camera className="h-3.5 w-3.5" /> Capture</button>
                            <label className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-[11px] font-bold px-3 py-1.5 hover:bg-slate-100 cursor-pointer shadow-2xs">
                              <Upload className="h-3.5 w-3.5 text-emerald-700" /> Upload
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { compressImage(f).then(setStepneyPhoto); } }} />
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 6 */}
              <div className="border-t border-slate-200 pt-8 space-y-5">
                <div className="border-b border-slate-200 pb-2.5">
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">5</span>
                    Dues, Penalties &amp; Refund Settlement
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Pending Dues (₹)</label>
                    <input type="number" placeholder="e.g. 1200..." value={pendingDues} onChange={(e) => setPendingDues(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs" />
                  </div>
                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Damage Penalty (₹)</label>
                    <input type="number" placeholder="e.g. 500..." value={damagePenalty} onChange={(e) => setDamagePenalty(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs" />
                  </div>
                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Deposit Refund Status</label>
                    <select value={depositRefundStatus} onChange={(e) => setDepositRefundStatus(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs cursor-pointer">
                      <option>Pending Assessment</option>
                      <option>Refund Approved</option>
                      <option>Deductions Applied</option>
                      <option>Forfeited</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Hub Handover Notes / Vehicle Inspection Summary</label>
                  <textarea placeholder="Remarks about damages, battery, driver reason..." value={dropoffNotes} onChange={(e) => setDropoffNotes(e.target.value)} rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs resize-none" />
                </div>
              </div>

              {/* FORM ACTIONS */}
              <div className="flex items-center justify-between border-t border-border pt-6 mt-8">
                <p className="text-[10px] font-bold text-red-500">* Mandatory Fields</p>
                <div className="flex gap-3">
                  {editingId ? (
                    <button type="button" onClick={() => { resetForm(); setActiveTab("registry"); }}
                      className="h-11 rounded-lg border border-border bg-white px-5 font-sans text-sm font-semibold text-text-muted hover:bg-slate-100 cursor-pointer transition-colors">
                      Cancel Edit
                    </button>
                  ) : (
                    <button type="button" onClick={resetForm}
                      className="h-11 rounded-lg border border-border bg-white px-5 font-sans text-sm font-semibold text-text-muted hover:bg-slate-100 cursor-pointer transition-colors">
                      Reset Form
                    </button>
                  )}
                  <button type="button" onClick={(e) => handleSubmit(e, true)}
                    className="h-11 rounded-lg border border-border bg-white px-5 font-sans text-sm font-semibold text-text-muted hover:bg-slate-100 cursor-pointer transition-colors">
                    Save as Draft
                  </button>
                  <button type="submit"
                    className="h-11 rounded-lg bg-primary px-6 font-sans text-sm font-bold text-white shadow-md hover:bg-primary-hover cursor-pointer transition-all">
                    {editingId ? "Update Drop-Off Record" : "Submit Drop-Off Record"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* DRAFTS TAB */}
        {activeTab === "drafts" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="border-b border-slate-200 p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-sans text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-600" /> Saved Draft Records
                  </h3>
                  <p className="font-sans text-xs text-slate-500 mt-1">Unsent drop-off drafts. Click edit to complete entry.</p>
                </div>
                <button type="button" onClick={() => { resetForm(); setActiveTab("form"); }}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 font-sans text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs">
                  <Plus className="h-4 w-4" /> New Drop-Off Entry
                </button>
              </div>
              <RegistryTable rows={paginatedDrafts} />
              <PaginationBar page={draftPage} totalPgs={draftTotalPages} setPage={setDraftPage} total={draftRecords.length} />
            </div>
          </div>
        )}

        {/* REGISTRY TAB */}
        {activeTab === "registry" && (
          <div className="space-y-6">
            {/* Filter Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
              <div className="relative sm:col-span-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search driver, phone, vehicle, ID..." value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-4 font-sans text-xs text-slate-900 bg-white outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20" />
              </div>
              <select value={filterReason} onChange={(e) => { setFilterReason(e.target.value); setCurrentPage(1); }}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 font-sans text-xs text-slate-800 bg-white outline-none focus:border-emerald-600 cursor-pointer">
                <option value="all">All Reasons</option>
                <option>Voluntary Return</option>
                <option>Non-payment / Default</option>
                <option>Vehicle Breakdown / Maintenance</option>
                <option>Contract Completion</option>
                <option>Other</option>
              </select>
              <select value={filterTime} onChange={(e) => { setFilterTime(e.target.value); setCurrentPage(1); }}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 font-sans text-xs text-slate-800 bg-white outline-none focus:border-emerald-600 cursor-pointer">
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              <select value={filterCity} onChange={(e) => { setFilterCity(e.target.value); setCurrentPage(1); }}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 font-sans text-xs text-slate-800 bg-white outline-none focus:border-emerald-600 cursor-pointer">
                <option value="all">All Cities</option>
                {CITIES.map((c) => <option key={c.value} value={c.value}>{c.text}</option>)}
              </select>
            </div>

            {/* Table Card */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="border-b border-slate-200 p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-sans text-xl font-bold text-slate-900 tracking-tight">Drop-Off Registry</h3>
                  <p className="font-sans text-xs text-slate-500 mt-1">Search, edit, and review all vehicle return records</p>
                </div>
                <div className="flex gap-2.5">
                  <button onClick={handleExportCSV}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 font-sans text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs">
                    <Download className="h-4 w-4" /> Export CSV
                  </button>
                  <button onClick={() => { resetForm(); setActiveTab("form"); }}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 font-sans text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs">
                    <Plus className="h-4 w-4" /> Add Drop-Off
                  </button>
                </div>
              </div>
              <RegistryTable rows={paginatedRecords} />
              <PaginationBar page={currentPage} totalPgs={totalPages} setPage={setCurrentPage} total={filteredRecords.length} />
            </div>
          </div>
        )}
      </main>

      {/* CAMERA MODAL */}
      {cameraActive && activeCameraTarget && (
        <CameraCapture
          title="Capture Drop-Off Photo"
          onCapture={(dataUrl) => {
            if (activeCameraTarget === "odometer") setOdometerPhoto(dataUrl);
            if (activeCameraTarget === "battery") setBatteryPhoto(dataUrl);
            if (activeCameraTarget === "lhSide") setPhotoLhSide(dataUrl);
            if (activeCameraTarget === "rhSide") setPhotoRhSide(dataUrl);
            if (activeCameraTarget === "frontSide") setPhotoFrontSide(dataUrl);
            if (activeCameraTarget === "backSide") setPhotoBackSide(dataUrl);
            if (activeCameraTarget === "ola") setOlaNegativeBalanceProof(dataUrl);
            if (activeCameraTarget === "fastag") setFastagBalanceProof(dataUrl);
            if (activeCameraTarget === "stepney") setStepneyPhoto(dataUrl);
            setCameraActive(false); setActiveCameraTarget(null);
          }}
          onClose={() => { setCameraActive(false); setActiveCameraTarget(null); }}
        />
      )}
    </div>
  );
}
