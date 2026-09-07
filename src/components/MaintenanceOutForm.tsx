import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  Clock,
  FileText,
  CheckCircle,
  Search,
  RefreshCw,
  Download,
  Camera,
  Upload,
  X,
  Check,
  Eye,
  Trash2,
  Edit,
  AlertTriangle,
  AlertCircle,
  Receipt,
  Wrench,
  Calendar,
  IndianRupee,
  ShieldCheck,
  Plus
} from "lucide-react";
import { User as UserSession, MaintenanceInRecord, MaintenanceOutRecord } from "../types";
import CameraCapture from "./CameraCapture";
import { compressImage } from "../utils/imageCompressor";
import { formatIndianDateTime, formatIndianDate } from "../utils/dateFormatter";

interface MaintenanceOutFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

export default function MaintenanceOutForm({ user, onBackToSelector, onLogout }: MaintenanceOutFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "registry">("form");

  // Real-time IST Clock
  const [currentTime, setCurrentTime] = useState<string>(() => {
    try {
      return new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: true });
    } catch (e) {
      console.error("Failed to initialize current time:", e);
      return new Date().toLocaleTimeString();
    }
  });

  useEffect(() => {
    let timer: any = null;
    try {
      timer = setInterval(() => {
        try {
          setCurrentTime(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: true }));
        } catch (e) {
          console.error("Failed to update clock interval:", e);
          setCurrentTime(new Date().toLocaleTimeString());
        }
      }, 1000);
    } catch (err) {
      console.error("Failed to setup clock interval:", err);
    }
    return () => {
      try {
        if (timer) clearInterval(timer);
      } catch (err) {
        console.error("Failed to clear clock interval:", err);
      }
    };
  }, []);

  const displayName = user?.name || user?.username || "Staff";
  let initials = "ST";
  try {
    initials = displayName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "ST";
  } catch (err) {
    console.error("Failed to calculate user initials:", err);
    initials = "ST";
  }

  const getNowDateTimeString = (): string => {
    try {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    } catch (err) {
      console.error("Error generating now date-time string:", err);
      return "";
    }
  };

  const getTodayDateString = (): string => {
    try {
      return new Date().toISOString().split("T")[0];
    } catch (err) {
      console.error("Error generating today date string:", err);
      return "";
    }
  };

  // Safe localStorage helper
  const getAuthToken = (): string | null => {
    try {
      return localStorage.getItem("lr_token");
    } catch (err) {
      console.error("Failed to read token from localStorage:", err);
      return null;
    }
  };

  // Safe photo array / JSON parser
  const parsePhotosSafely = (photosInput: any): string[] => {
    if (!photosInput) return [];
    try {
      if (Array.isArray(photosInput)) {
        return photosInput.filter(p => typeof p === "string" && p.trim().length > 0);
      }
      if (typeof photosInput === "string") {
        const trimmed = photosInput.trim();
        if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed.filter(p => typeof p === "string" && p.trim().length > 0);
          }
          if (typeof parsed === "string" && parsed.trim().length > 0) {
            return [parsed.trim()];
          }
          return [];
        }
        if (trimmed.length > 0) {
          return [trimmed];
        }
      }
    } catch (err) {
      console.error("Error safely parsing photos:", err);
    }
    return [];
  };

  // Safe file open / preview helper
  const handleOpenFileOrPreview = (fileUrl: string | null | undefined) => {
    try {
      if (!fileUrl) return;
      const lower = fileUrl.toLowerCase();
      if (lower.endsWith(".pdf") || lower.includes("application/pdf") || lower.includes(".pdf?")) {
        window.open(fileUrl, "_blank", "noopener,noreferrer");
      } else {
        setPreviewImage(fileUrl);
      }
    } catch (err) {
      console.error("Failed to open file preview:", err);
      alert("Failed to open file preview: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const handleSafePreviewImage = (imageUrl: string | null | undefined) => {
    try {
      if (!imageUrl) return;
      setPreviewImage(imageUrl);
    } catch (err) {
      console.error("Failed to preview image:", err);
    }
  };

  // Vehicle & Associated Inward Record
  const [cityName, setCityName] = useState(user.city || "Hyderabad");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [inwardRecord, setInwardRecord] = useState<MaintenanceInRecord | null>(null);
  const [searchStatus, setSearchStatus] = useState<"idle" | "found" | "not_found">("idle");
  const [searchMessage, setSearchMessage] = useState<string>("");

  // Outward Form Fields
  const [rfdDate, setRfdDate] = useState(getTodayDateString());
  const [vehicleOutDateTime, setVehicleOutDateTime] = useState(getNowDateTimeString());
  const [vehicleOutKms, setVehicleOutKms] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(getTodayDateString());
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [approvedBy, setApprovedBy] = useState("");
  const [approvalDate, setApprovalDate] = useState("");
  const [approvalFile, setApprovalFile] = useState<string | null>(null);
  const [outwardPhotos, setOutwardPhotos] = useState<string[]>([]);
  const [finalStatus, setFinalStatus] = useState("Completed & RFD");
  const [remarks, setRemarks] = useState("");

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [uploadingApproval, setUploadingApproval] = useState(false);
  const [activeCameraTarget, setActiveCameraTarget] = useState<"photos" | "invoice" | "approval" | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Edit and View States
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingRecord, setViewingRecord] = useState<MaintenanceOutRecord | null>(null);

  // Portal Users for Approver Dropdown
  const [portalUsers, setPortalUsers] = useState<Array<{ id: number; username: string; name: string; role: string; city?: string }>>([]);

  const fetchPortalUsers = async () => {
    try {
      let token: string | null = null;
      try {
        token = localStorage.getItem("token") || localStorage.getItem("auth_token") || sessionStorage.getItem("token");
      } catch (e) {
        console.error("Failed to read token from storage:", e);
      }
      const res = await fetch("/api/portal-users", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPortalUsers(data);
        }
      } else {
        console.warn("Failed to fetch portal users:", res.status);
      }
    } catch (err) {
      console.error("Error fetching portal users:", err);
    }
  };

  useEffect(() => {
    fetchPortalUsers();
  }, []);

  // City normalization helper for reliable city matching
  const normalizeCity = (c?: string): string => {
    if (!c) return "";
    const s = c.trim().toLowerCase();
    if (s === "bengaluru" || s === "bangalore" || s === "blr") return "bangalore";
    if (s === "mumbai" || s === "bom") return "mumbai";
    if (s === "hyderabad" || s === "hyd") return "hyderabad";
    if (s === "chennai" || s === "maa") return "chennai";
    if (s === "delhi" || s === "new delhi" || s === "del") return "delhi";
    return s;
  };

  // Filter approvers strictly by the currently filled city
  const filteredApprovers = useMemo(() => {
    try {
      if (!cityName || !cityName.trim()) return portalUsers;
      const targetNorm = normalizeCity(cityName);
      const matched = portalUsers.filter(u => normalizeCity(u.city) === targetNorm);
      return matched.length > 0 ? matched : portalUsers;
    } catch (err) {
      console.error("Error filtering approvers by city in MaintenanceOutForm:", err);
      return portalUsers;
    }
  }, [portalUsers, cityName]);

  // Registry States
  const [registryRecords, setRegistryRecords] = useState<MaintenanceOutRecord[]>([]);
  const [isRegistryLoading, setIsRegistryLoading] = useState(false);
  const [registrySearch, setRegistrySearch] = useState("");

  // Search open inward record
  const handleSearchVehicle = async (vehToSearch?: string) => {
    try {
      const v = (vehToSearch !== undefined ? vehToSearch : vehicleNumber).trim().toUpperCase();
      if (!v) {
        alert("Please enter a vehicle number to check.");
        return;
      }

      setIsSearching(true);
      setSearchStatus("idle");
      setSearchMessage("");
      const token = getAuthToken();

      const res = await fetch(
        `/api/maintenance-out/search-vehicle?vehicle_number=${encodeURIComponent(v)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      let data: any = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.error("Failed to parse vehicle search response:", jsonErr);
      }

      if (res.ok && data?.found && data?.record) {
        setInwardRecord(data.record);
        if (data.record.city_name) {
          setCityName(data.record.city_name);
        }
        setSearchStatus("found");
        setSearchMessage("");
      } else {
        setInwardRecord(null);
        setSearchStatus("not_found");
        setSearchMessage(data?.message || `No active open maintenance record found for ${v}`);
      }
    } catch (err: any) {
      console.error("Error searching vehicle:", err);
      setInwardRecord(null);
      setSearchStatus("not_found");
      setSearchMessage("Error looking up vehicle: " + (err?.message || "Network error"));
    } finally {
      setIsSearching(false);
    }
  };

  // Load registry
  const fetchRegistry = async () => {
    setIsRegistryLoading(true);
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (registrySearch.trim()) params.append("search", registrySearch.trim());

      const res = await fetch(`/api/maintenance-out?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        let data: any = [];
        try {
          data = await res.json();
        } catch (jsonErr) {
          console.error("Failed to parse registry response:", jsonErr);
        }
        setRegistryRecords(Array.isArray(data) ? data : []);
      } else {
        let errMsg = `Error ${res.status}`;
        try {
          const errData = await res.json();
          if (errData?.detail) errMsg = errData.detail;
        } catch (e) {
          // ignore
        }
        console.error("Failed to load outward registry:", errMsg);
        setSubmitError(`Failed to load outward registry (${res.status}): ${errMsg}`);
      }
    } catch (err: any) {
      console.error("Failed to load outward registry:", err);
      setSubmitError("Failed to load outward registry: " + (err?.message || "Network error"));
    } finally {
      setIsRegistryLoading(false);
    }
  };

  useEffect(() => {
    try {
      if (activeTab === "registry") {
        fetchRegistry();
      }
    } catch (err) {
      console.error("Error in activeTab effect:", err);
    }
  }, [activeTab]);

  // Photo Upload (up to 5 photos)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      if (outwardPhotos.length + files.length > 5) {
        alert("You can upload a maximum of 5 completion / repair photos.");
        return;
      }

      setUploadingPhoto(true);
      try {
        const uploadedUrls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            const url = await compressImage(file, undefined, undefined, undefined, "maintenance_out");
            if (url) uploadedUrls.push(url);
          } catch (itemErr: any) {
            console.error(`Failed to upload photo #${i + 1}:`, itemErr);
            alert(`Failed to upload photo #${i + 1}: ` + (itemErr?.message || "Upload error"));
          }
        }
        if (uploadedUrls.length > 0) {
          setOutwardPhotos(prev => [...prev, ...uploadedUrls].slice(0, 5));
        }
      } catch (err: any) {
        console.error("Photo upload batch failed:", err);
        alert("Failed to upload photo: " + (err?.message || "Unknown error"));
      } finally {
        setUploadingPhoto(false);
      }
    } catch (err: any) {
      console.error("Unexpected error in handlePhotoUpload:", err);
      alert("Unexpected error during photo selection: " + (err?.message || "Unknown error"));
      setUploadingPhoto(false);
    } finally {
      try {
        if (e?.target) {
          e.target.value = "";
        }
      } catch (resetErr) {
        console.error("Error resetting photo file input:", resetErr);
      }
    }
  };

  const handleCameraCapture = (url: string) => {
    try {
      if (!url) return;
      if (activeCameraTarget === "photos") {
        if (outwardPhotos.length >= 5) {
          alert("Maximum 5 photos reached.");
        } else {
          setOutwardPhotos(prev => [...prev, url].slice(0, 5));
        }
      } else if (activeCameraTarget === "invoice") {
        setInvoiceFile(url);
      } else if (activeCameraTarget === "approval") {
        setApprovalFile(url);
      }
    } catch (err: any) {
      console.error("Error handling camera capture:", err);
      alert("Failed to process captured image: " + (err?.message || "Unknown error"));
    } finally {
      try {
        setActiveCameraTarget(null);
      } catch (err) {
        console.error("Error clearing camera target:", err);
      }
    }
  };

  const handleInvoiceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadingInvoice(true);
      try {
        const url = await compressImage(file, undefined, undefined, undefined, "maintenance_invoice");
        if (url) {
          setInvoiceFile(url);
        } else {
          throw new Error("No URL returned from server.");
        }
      } catch (err: any) {
        console.error("Invoice upload failed:", err);
        alert("Invoice upload failed: " + (err?.message || "Unknown error"));
      } finally {
        setUploadingInvoice(false);
      }
    } catch (err: any) {
      console.error("Unexpected error in handleInvoiceFileUpload:", err);
      alert("Invoice upload error: " + (err?.message || "Unknown error"));
      setUploadingInvoice(false);
    } finally {
      try {
        if (e?.target) {
          e.target.value = "";
        }
      } catch (resetErr) {
        console.error("Error resetting invoice file input:", resetErr);
      }
    }
  };

  const handleApprovalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadingApproval(true);
      try {
        const url = await compressImage(file, undefined, undefined, undefined, "maintenance_approval");
        if (url) {
          setApprovalFile(url);
        } else {
          throw new Error("No URL returned from server.");
        }
      } catch (err: any) {
        console.error("Approval upload failed:", err);
        alert("Approval upload failed: " + (err?.message || "Unknown error"));
      } finally {
        setUploadingApproval(false);
      }
    } catch (err: any) {
      console.error("Unexpected error in handleApprovalFileUpload:", err);
      alert("Approval upload error: " + (err?.message || "Unknown error"));
      setUploadingApproval(false);
    } finally {
      try {
        if (e?.target) {
          e.target.value = "";
        }
      } catch (resetErr) {
        console.error("Error resetting approval file input:", resetErr);
      }
    }
  };

  const removeOutwardPhoto = (index: number) => {
    try {
      setOutwardPhotos(prev => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error("Error removing outward photo at index " + index, err);
    }
  };

  const loadRecordForEdit = (r: MaintenanceOutRecord) => {
    try {
      if (!r) return;
      setEditingId(r.id);
      setVehicleNumber(r.vehicle_number || "");
      setVehicleOutDateTime(r.vehicle_out_date_time || getNowDateTimeString());
      setVehicleOutKms(r.vehicle_out_k_m_s || "");
      setRfdDate(r.rfd_date || getTodayDateString());
      setInvoiceNo(r.invoice_no || "");
      setInvoiceDate(r.invoice_date || getTodayDateString());
      setInvoiceAmount(r.invoice_amount || "");
      setInvoiceFile(r.invoice_file || null);
      setPaymentStatus(r.payment_status || "Pending");
      setApprovedBy(r.approved_by || "");
      setApprovalDate(r.approval_date || "");
      setApprovalFile(r.approval_file || null);
      setFinalStatus(r.final_status || "Completed & RFD");
      setRemarks(r.remarks || "");

      const parsedPhotos = parsePhotosSafely(r.vehicle_out_photos);
      setOutwardPhotos(parsedPhotos);

      if ((r as any).city_name) {
        setCityName((r as any).city_name);
      }
      if (r.vehicle_number) {
        handleSearchVehicle(r.vehicle_number);
      }
      setActiveTab("form");
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (scrollErr) {
        console.error("Window scroll error in loadRecordForEdit:", scrollErr);
      }
    } catch (err: any) {
      console.error("Failed to load outward record for edit:", err);
      alert("Failed to load record for editing: " + (err?.message || "Unknown error"));
    }
  };

  const cancelEdit = () => {
    try {
      setEditingId(null);
      setCityName(user.city || "Hyderabad");
      setInwardRecord(null);
      setSearchStatus("idle");
      setVehicleNumber("");
      setVehicleOutKms("");
      setInvoiceNo("");
      setInvoiceDate(getTodayDateString());
      setInvoiceAmount("");
      setInvoiceFile(null);
      setPaymentStatus("Pending");
      setApprovedBy("");
      setApprovalDate("");
      setApprovalFile(null);
      setOutwardPhotos([]);
      setFinalStatus("Completed & RFD");
      setRemarks("");
      setVehicleOutDateTime(getNowDateTimeString());
      setRfdDate(getTodayDateString());
    } catch (err) {
      console.error("Error resetting edit state:", err);
    }
  };

  const handleDeleteRecord = async (id: number, vnum: string) => {
    try {
      const confirmed = window.confirm(`Are you sure you want to delete Outward Record #${id} for vehicle ${vnum}? This will also reopen the linked inward ticket.`);
      if (!confirmed) return;

      const token = getAuthToken();
      const res = await fetch(`/api/maintenance-out/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        let errorDetail = "Failed to delete outward record";
        try {
          const d = await res.json();
          if (d?.detail) errorDetail = d.detail;
        } catch (jsonErr) {
          console.error("Failed to parse delete error response:", jsonErr);
        }
        throw new Error(errorDetail);
      }
      alert(`Outward Record #${id} deleted successfully.`);
      await fetchRegistry();
    } catch (err: any) {
      console.error("Delete outward record error:", err);
      alert("Delete failed: " + (err?.message || "Unknown error"));
    }
  };

  // Submit Outward Form
  const handleSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault();
    } catch (preventErr) {
      console.error("preventDefault error:", preventErr);
    }

    try {
      setSubmitError(null);
      setSubmitSuccess(null);

      if (!vehicleNumber.trim()) {
        setSubmitError("Vehicle Number is required.");
        return;
      }
      if (!editingId && !inwardRecord) {
        setSubmitError(`Cannot submit Maintenance Out: Vehicle ${vehicleNumber.trim().toUpperCase()} does not have an active open inward ticket. A vehicle cannot be Maintenance Out unless Maintenance In has been filled first.`);
        return;
      }
      if (!vehicleOutDateTime.trim()) {
        setSubmitError("Vehicle OUT Date & Time is required.");
        return;
      }
      if (!vehicleOutKms.trim()) {
        setSubmitError("Outward Odometer Reading (KMs) is required.");
        return;
      }

      setIsSubmitting(true);
      const token = getAuthToken();

      const payload = {
        inward_id: inwardRecord ? inwardRecord.id : null,
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        rfd_date: rfdDate.trim() || null,
        vehicle_out_date_time: vehicleOutDateTime.trim(),
        vehicle_out_k_m_s: vehicleOutKms.trim(),
        invoice_no: invoiceNo.trim() || null,
        invoice_date: invoiceDate.trim() || null,
        invoice_amount: invoiceAmount.trim() || null,
        insurance_liability_discounts: "0",
        letzryd_payable: null,
        invoice_file: invoiceFile || null,
        type_of_payment: null,
        payment_status: paymentStatus.trim() || "Pending",
        utr_no: null,
        approved_by: approvedBy.trim() || null,
        approval_date: approvalDate.trim() || null,
        approval_file: approvalFile || null,
        vehicle_out_photos: outwardPhotos,
        final_status: finalStatus.trim() || "Completed & RFD",
        remarks: remarks.trim() || null,
      };

      const url = editingId ? `/api/maintenance-out/${editingId}` : "/api/maintenance-out";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.error("Failed to parse submit response JSON:", jsonErr);
      }

      if (!res.ok) {
        throw new Error(data?.detail || (editingId ? "Failed to update outward record." : "Failed to create outward record."));
      }

      setSubmitSuccess(
        editingId
          ? `Maintenance Outward #${editingId} updated successfully!`
          : inwardRecord
            ? `Maintenance Outward #${data?.id || ""} recorded successfully! Inward Ticket #${inwardRecord.id} is now CLOSED.`
            : `Maintenance Outward #${data?.id || ""} recorded successfully for ${payload.vehicle_number} (Direct Outward)!`
      );
      cancelEdit();
      await fetchRegistry();
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (scrollErr) {
        console.error("Window scroll error in handleSubmit:", scrollErr);
      }
    } catch (err: any) {
      console.error("Maintenance outward submit error:", err);
      setSubmitError(err?.message || "An error occurred while submitting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // CSV Export
  const exportCSV = () => {
    try {
      if (!registryRecords || registryRecords.length === 0) {
        alert("No records to export.");
        return;
      }
      const headers = [
        "Outward ID", "Inward ID", "Vehicle Number", "Workshop", "In Date/Time",
        "Out Date/Time", "Out KMs", "RFD Date", "Invoice No", "Invoice Date",
        "Invoice Amount (₹)", "Payment Status", "Approved By", "Approval Date", "Final Status", "Remarks"
      ];
      const rows = registryRecords.map(r => {
        try {
          return [
            r?.id ?? "",
            r?.inward_id ? r.inward_id : "Direct",
            r?.vehicle_number ?? "",
            r?.workshop_name || "",
            r?.vehicle_in_date_time || "",
            r?.vehicle_out_date_time || "",
            r?.vehicle_out_k_m_s || "",
            r?.rfd_date || "",
            r?.invoice_no || "",
            r?.invoice_date || "",
            r?.invoice_amount || "",
            r?.payment_status || "Pending",
            r?.approved_by || "",
            r?.approval_date || "",
            r?.final_status || "",
            (r?.remarks || "").replace(/[\r\n]+/g, " ")
          ];
        } catch (rowErr) {
          console.error("Error mapping row for CSV:", rowErr);
          return [];
        }
      });
      const csvContent = "data:text/csv;charset=utf-8," + [
        headers.join(","),
        ...rows.filter(row => row.length > 0).map(e => e.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      ].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      let dateStr = "export";
      try {
        dateStr = new Date().toISOString().split("T")[0];
      } catch (dateErr) {
        console.error("Date formatting error in exportCSV:", dateErr);
      }
      link.setAttribute("download", `LetzRyd_Maintenance_Outward_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      try {
        document.body.removeChild(link);
      } catch (rmErr) {
        console.error("Failed to remove temporary anchor:", rmErr);
      }
    } catch (err: any) {
      console.error("Failed to export CSV:", err);
      alert("Failed to export CSV: " + (err?.message || "Unknown error"));
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text pb-16">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-border bg-white shadow-xs">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                try {
                  onBackToSelector();
                } catch (err) {
                  console.error("Error navigating back to selector:", err);
                }
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-slate-100 hover:text-primary transition-all cursor-pointer"
              title="Back to Form Selector"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <img
              src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png"
              alt="LetzRyd logo"
              className="h-8 w-auto object-contain cursor-pointer"
              onClick={() => {
                try {
                  onBackToSelector();
                } catch (err) {
                  console.error("Error navigating back via logo:", err);
                }
              }}
              referrerPolicy="no-referrer"
            />
            <span className="hidden h-5 border-l border-border sm:inline-block" />
            <span className="hidden font-sans text-xs font-semibold text-text-muted sm:inline-block">
              Vehicle Maintenance Out
            </span>
          </div>

          {/* Navigation Pills */}
          <nav className="flex gap-2">
            <button
              onClick={() => {
                try {
                  setActiveTab("form");
                } catch (err) {
                  console.error("Error switching to form tab:", err);
                }
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "form"
                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                  : "text-text-muted hover:bg-slate-100 hover:text-primary"
              }`}
            >
              <FileText className="h-4 w-4" />
              Maintenance Out Form
            </button>
            <button
              onClick={() => {
                try {
                  setActiveTab("registry");
                  fetchRegistry();
                } catch (err) {
                  console.error("Error switching to registry tab:", err);
                }
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "registry"
                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                  : "text-text-muted hover:bg-slate-100 hover:text-primary"
              }`}
            >
              <CheckCircle className="h-4 w-4" />
              Outward Registry
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
                {user.executive_id && (
                  <span className="font-mono text-[9px] text-text-muted mt-1 leading-none">
                    ID: {user.executive_id}
                  </span>
                )}
              </div>
            </div>
            <span className="h-5 border-l border-border" />
            <button
              onClick={() => {
                try {
                  onLogout();
                } catch (err) {
                  console.error("Error logging out:", err);
                }
              }}
              className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-2.5 font-sans text-xs font-medium text-text-muted hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Camera Capture Modal */}
      {activeCameraTarget && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => {
            try {
              setActiveCameraTarget(null);
            } catch (err) {
              console.error("Error closing camera capture modal:", err);
            }
          }}
          title={
            activeCameraTarget === "photos"
              ? "Capture Outward Vehicle / Repair Photo"
              : activeCameraTarget === "invoice"
              ? "Capture Workshop Invoice Bill"
              : "Capture Approval Document"
          }
        />
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => {
            try {
              setPreviewImage(null);
            } catch (err) {
              console.error("Error closing preview modal backdrop:", err);
            }
          }}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl p-2"
            onClick={e => {
              try {
                e.stopPropagation();
              } catch (err) {
                console.error("Error stopping click propagation:", err);
              }
            }}
          >
            <button
              onClick={() => {
                try {
                  setPreviewImage(null);
                } catch (err) {
                  console.error("Error closing preview button:", err);
                }
              }}
              className="absolute top-3 right-3 z-10 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full p-1.5 cursor-pointer shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewImage} alt="Enlarged preview" className="max-h-[85vh] w-auto mx-auto object-contain rounded-lg" />
          </div>
        </div>
      )}

      {/* Outward Record Details View Modal */}
      {viewingRecord && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => {
            try {
              setViewingRecord(null);
            } catch (err) {
              console.error("Error closing viewing record modal backdrop:", err);
            }
          }}
        >
          <div
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-8"
            onClick={e => {
              try {
                e.stopPropagation();
              } catch (err) {
                console.error("Error stopping modal container click propagation:", err);
              }
            }}
          >
            {/* Modal Header */}
            <div className="bg-primary px-6 py-4 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                    Outward #{viewingRecord.id}
                  </span>
                  <span className="font-mono font-bold tracking-wider text-base">{viewingRecord.vehicle_number}</span>
                  {viewingRecord.inward_id && (
                    <span className="text-[10px] font-mono bg-emerald-700/60 px-2 py-0.5 rounded text-emerald-100">
                      Linked to Inward #{viewingRecord.inward_id}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/80 mt-0.5">
                  Vehicle Maintenance Outward Completion Record
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const rec = viewingRecord;
                      setViewingRecord(null);
                      if (rec) {
                        loadRecordForEdit(rec);
                      }
                    } catch (err) {
                      console.error("Error transitioning record to edit:", err);
                    }
                  }}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      setViewingRecord(null);
                    } catch (err) {
                      console.error("Error closing modal via close button:", err);
                    }
                  }}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs">
                  <span className="text-slate-500 font-medium">Handover Status: </span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 ml-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    {viewingRecord.final_status || "Completed & RFD"}
                  </span>
                </div>
                {viewingRecord.created_at && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    Recorded: {formatIndianDateTime(viewingRecord.created_at)}
                  </span>
                )}
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-medium">Workshop</span>
                  <span className="font-bold text-slate-800">{viewingRecord.workshop_name || "—"}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-medium">In Date &amp; Time</span>
                  <span className="font-mono text-slate-800">{formatIndianDateTime(viewingRecord.vehicle_in_date_time)}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-medium">Out Date &amp; Time</span>
                  <span className="font-mono font-bold text-slate-800">{formatIndianDateTime(viewingRecord.vehicle_out_date_time)}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-medium">Outward Odometer</span>
                  <span className="font-mono font-bold text-slate-800">{viewingRecord.vehicle_out_k_m_s} KMs</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-medium">RFD Date</span>
                  <span className="font-mono text-slate-800">{formatIndianDate(viewingRecord.rfd_date)}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-medium">Invoice Amount</span>
                  <span className="font-mono font-bold text-primary">{viewingRecord.invoice_amount ? `₹${viewingRecord.invoice_amount}` : "—"}</span>
                </div>
              </div>

              {/* Invoice & Approval Info */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-primary" /> Invoice &amp; Documents
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Invoice Number</span>
                    <span className="font-mono font-semibold text-slate-800">{viewingRecord.invoice_no || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Invoice Date</span>
                    <span className="font-mono text-slate-800">{formatIndianDate(viewingRecord.invoice_date)}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Payment Status</span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      viewingRecord.payment_status === "Paid"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {viewingRecord.payment_status || "Pending"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Approved By</span>
                    <span className="font-semibold text-slate-800">{viewingRecord.approved_by || "—"}</span>
                  </div>
                </div>

                {/* Proof Thumbnails */}
                <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-4">
                  {viewingRecord.invoice_file && (
                    <div
                      onClick={() => handleOpenFileOrPreview(viewingRecord.invoice_file)}
                      className="flex items-center gap-2.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:border-primary cursor-pointer shadow-2xs transition-colors"
                    >
                      {viewingRecord.invoice_file.toLowerCase().endsWith(".pdf") ? (
                        <span className="text-[10px] font-bold text-rose-600">PDF</span>
                      ) : (
                        <img
                          src={viewingRecord.invoice_file}
                          alt="Invoice thumbnail"
                          className="w-7 h-7 object-cover rounded"
                        />
                      )}
                      <div>
                        <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> View Invoice Bill
                        </span>
                      </div>
                    </div>
                  )}

                  {viewingRecord.approval_file && (
                    <div
                      onClick={() => handleOpenFileOrPreview(viewingRecord.approval_file)}
                      className="flex items-center gap-2.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:border-primary cursor-pointer shadow-2xs transition-colors"
                    >
                      {viewingRecord.approval_file.toLowerCase().endsWith(".pdf") ? (
                        <span className="text-[10px] font-bold text-rose-600">PDF</span>
                      ) : (
                        <img
                          src={viewingRecord.approval_file}
                          alt="Approval thumbnail"
                          className="w-7 h-7 object-cover rounded"
                        />
                      )}
                      <div>
                        <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> View Document
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Completed Repair Photos Gallery */}
              {(() => {
                try {
                  const photos = parsePhotosSafely(viewingRecord.vehicle_out_photos);
                  return (
                    <div>
                      <span className="text-xs font-bold text-slate-800 block mb-2">
                        Completed Repair Photos ({photos.length})
                      </span>
                      {photos.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {photos.map((p, idx) => (
                            <div
                              key={idx}
                              onClick={() => handleSafePreviewImage(p)}
                              className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer group shadow-2xs"
                            >
                              <img src={p} alt={`Repair ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                              <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded font-mono font-bold">
                                #{idx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No repair photos attached.</p>
                      )}
                    </div>
                  );
                } catch (renderPhotosErr) {
                  console.error("Error rendering photos gallery in viewingRecord modal:", renderPhotosErr);
                  return <p className="text-xs text-rose-500 italic">Unable to load repair photos.</p>;
                }
              })()}

              {/* Remarks */}
              {viewingRecord.remarks && (
                <div>
                  <span className="text-xs font-bold text-slate-800 block mb-1">Handover &amp; Repair Remarks</span>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {viewingRecord.remarks}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  try {
                    setViewingRecord(null);
                  } catch (err) {
                    console.error("Error closing viewing record modal footer:", err);
                  }
                }}
                className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className={`mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 ${activeTab === 'registry' ? 'max-w-7xl' : 'max-w-5xl'}`}>
        {/* Alerts */}
        {submitSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 shadow-xs">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-xs font-bold text-emerald-800">Maintenance Outward Recorded</h3>
              <p className="text-xs text-emerald-700 mt-0.5">{submitSuccess}</p>
            </div>
            <button
              onClick={() => {
                try {
                  setSubmitSuccess(null);
                } catch (err) {
                  console.error("Error clearing submitSuccess:", err);
                }
              }}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {submitError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-xs font-bold text-rose-800">Submission Error</h3>
              <p className="text-xs text-rose-700 mt-0.5">{submitError}</p>
            </div>
            <button
              onClick={() => {
                try {
                  setSubmitError(null);
                } catch (err) {
                  console.error("Error clearing submitError:", err);
                }
              }}
              className="text-rose-700 hover:text-rose-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {editingId && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-200 text-amber-900 font-bold text-xs">
                ✎
              </span>
              <div>
                <h4 className="text-xs font-bold text-amber-900">Editing Outward Record #{editingId}</h4>
                <p className="text-[11px] text-amber-700">Modifying details. Click 'Update Maintenance Outward' below to save changes.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                try {
                  cancelEdit();
                } catch (err) {
                  console.error("Error canceling edit mode:", err);
                }
              }}
              className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold cursor-pointer transition-colors"
            >
              Cancel Edit
            </button>
          </div>
        )}

        {/* TAB 1: FORM */}
        {activeTab === "form" && (
          <div className="rounded-2xl border border-border bg-white shadow-xl overflow-hidden mb-10">
            {/* Form Hero Header */}
            <div className="bg-primary text-white px-8 py-6 relative">
              <div className="flex items-center gap-3 mb-2">
                <img
                  src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png"
                  className="h-8 brightness-0 invert"
                  alt="LetzRyd"
                  referrerPolicy="no-referrer"
                />
                <span className="px-2 py-0.5 rounded border border-white/30 bg-white/20 text-white text-[10px] font-bold tracking-widest backdrop-blur-sm">
                  Maintenance Outward Desk
                </span>
              </div>
              <h1 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                Vehicle Maintenance Outward Form
              </h1>
              <p className="text-white/80 text-xs mt-1">
                Vehicle check-out, billing verification, LetzRyd payable calculation &amp; ready-for-deployment handover.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Section 1: Vehicle Lookup & Open Ticket Link */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs">
                <div className="border-b border-border/80 pb-3 mb-6 flex items-center justify-between">
                  <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                    Vehicle Identification &amp; Active Ticket Lookup
                  </h3>
                  <span className="text-[11px] font-semibold text-text-muted">Requires active workshop inward ticket</span>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={vehicleNumber}
                        onChange={e => {
                          try {
                            const val = e.target.value.toUpperCase();
                            setVehicleNumber(val);
                            if (inwardRecord && inwardRecord.vehicle_number !== val) {
                              setInwardRecord(null);
                              setSearchStatus("idle");
                            }
                          } catch (err) {
                            console.error("Error setting vehicleNumber:", err);
                          }
                        }}
                        onKeyDown={e => {
                          try {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSearchVehicle();
                            }
                          } catch (err) {
                            console.error("Error in vehicleNumber onKeyDown:", err);
                          }
                        }}
                        placeholder="Enter Vehicle Plate Number (e.g. TS09UB1234)..."
                        className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-mono font-bold tracking-wider text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          handleSearchVehicle();
                        } catch (err) {
                          console.error("Error triggering handleSearchVehicle:", err);
                        }
                      }}
                      disabled={isSearching || !vehicleNumber.trim()}
                      className="flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-primary text-white font-sans text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary-hover transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSearching ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Checking Ticket...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          <span>Check Inward Ticket</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Status Banner */}
                  {searchStatus === "found" && inwardRecord && (
                    <div className="rounded-xl bg-emerald-50/90 border border-emerald-200 p-4 shadow-2xs">
                      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-emerald-200/60">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>Active Inward Ticket Found · Ticket #{inwardRecord.id}</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Linked to Workshop Ticket
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                        <div>
                          <span className="text-[11px] text-emerald-700/80 block">Workshop</span>
                          <span className="font-bold text-emerald-950">{inwardRecord.workshop_name}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-emerald-700/80 block">City</span>
                          <span className="font-bold text-emerald-950">{inwardRecord.city_name || cityName}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-emerald-700/80 block">In Date &amp; Time</span>
                          <span className="font-mono font-semibold text-emerald-950">{formatIndianDateTime(inwardRecord.vehicle_in_date_time)}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-emerald-700/80 block">Inward KMs</span>
                          <span className="font-mono font-semibold text-emerald-950">{inwardRecord.vehicle_k_m_s} KMs</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-emerald-700/80 block">Reported Repair</span>
                          <span className="font-medium text-emerald-950 truncate block">{inwardRecord.repair_type || "General Repair"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {searchStatus === "not_found" && !editingId && (
                    <div className="rounded-xl bg-rose-50 border border-rose-300 p-4 flex items-start gap-3 shadow-2xs">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-rose-900">Cannot Check Out: No Active Inward Ticket Found</h4>
                        <p className="text-xs text-rose-700 mt-1">
                          Vehicle <strong>{vehicleNumber}</strong> is not currently recorded in workshop maintenance (it has either already been checked out, or was never checked in via Maintenance In).
                        </p>
                        <p className="text-xs text-rose-800 font-semibold mt-1">
                          A vehicle cannot be Maintenance Out unless Maintenance In has been filled first.
                        </p>
                      </div>
                    </div>
                  )}

                  {searchStatus === "idle" && !inwardRecord && (
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between text-xs text-slate-600">
                      <span>
                        {vehicleNumber.trim()
                          ? "Click 'Check Inward Ticket' above to verify and link the active workshop ticket before proceeding."
                          : "Enter the vehicle plate number and click 'Check Inward Ticket' to link its active workshop ticket."}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Outward Handover & Readiness */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs">
                <div className="border-b border-border/80 pb-3 mb-6 flex items-center justify-between">
                  <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                    Outward Handover &amp; Readiness
                  </h3>
                  <span className="text-[11px] font-semibold text-text-muted">Vehicle check-out metrics</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Vehicle OUT Date &amp; Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={vehicleOutDateTime}
                      onChange={e => {
                        try {
                          setVehicleOutDateTime(e.target.value);
                        } catch (err) {
                          console.error("Error setting vehicleOutDateTime:", err);
                        }
                      }}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs cursor-pointer"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Outward Odometer Reading (KMs) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vehicleOutKms}
                      onChange={e => {
                        try {
                          setVehicleOutKms(e.target.value);
                        } catch (err) {
                          console.error("Error setting vehicleOutKms:", err);
                        }
                      }}
                      placeholder={inwardRecord ? `Inward: ${inwardRecord.vehicle_k_m_s} KMs` : "e.g. 45200"}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono font-semibold text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Ready For Deployment (RFD) Date
                    </label>
                    <input
                      type="date"
                      value={rfdDate}
                      onChange={e => {
                        try {
                          setRfdDate(e.target.value);
                        } catch (err) {
                          console.error("Error setting rfdDate:", err);
                        }
                      }}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Invoice & Approval Details (Merged & Streamlined) */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs">
                <div className="border-b border-border/80 pb-3 mb-6 flex items-center justify-between">
                  <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                    Invoice &amp; Approval Details
                  </h3>
                  <span className="text-[11px] font-semibold text-text-muted">Workshop billing &amp; approvals</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Workshop Invoice No
                    </label>
                    <input
                      type="text"
                      value={invoiceNo}
                      onChange={e => {
                        try {
                          setInvoiceNo(e.target.value);
                        } catch (err) {
                          console.error("Error setting invoiceNo:", err);
                        }
                      }}
                      placeholder="e.g. INV-2026-4402"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Invoice Date
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={e => {
                        try {
                          setInvoiceDate(e.target.value);
                        } catch (err) {
                          console.error("Error setting invoiceDate:", err);
                        }
                      }}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Total Invoice Amount (₹)
                    </label>
                    <input
                      type="text"
                      value={invoiceAmount}
                      onChange={e => {
                        try {
                          setInvoiceAmount(e.target.value);
                        } catch (err) {
                          console.error("Error setting invoiceAmount:", err);
                        }
                      }}
                      placeholder="e.g. 15000"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Payment Status
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={e => {
                        try {
                          setPaymentStatus(e.target.value);
                        } catch (err) {
                          console.error("Error setting paymentStatus:", err);
                        }
                      }}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Disputed">Disputed</option>
                      <option value="Part-Paid">Part-Paid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Approved by (Final Bill)
                    </label>
                    <select
                      value={approvedBy}
                      onChange={e => {
                        try {
                          setApprovedBy(e.target.value);
                        } catch (err) {
                          console.error("Error setting approvedBy:", err);
                        }
                      }}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="">{cityName ? `Select Approver (${cityName})` : "Select Approver"}</option>
                      {filteredApprovers.map(u => (
                        <option key={u.id} value={u.name}>
                          {u.name} ({u.role}{u.city ? ` - ${u.city}` : ""})
                        </option>
                      ))}
                      {approvedBy && !filteredApprovers.some(u => u.name === approvedBy) && (
                        <option value={approvedBy}>{approvedBy}</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Approval Date
                    </label>
                    <input
                      type="date"
                      value={approvalDate}
                      onChange={e => {
                        try {
                          setApprovalDate(e.target.value);
                        } catch (err) {
                          console.error("Error setting approvalDate:", err);
                        }
                      }}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs cursor-pointer"
                    />
                  </div>
                </div>

                {/* Dedicated Document & Proof Attachments Section */}
                <div className="pt-6 mt-6 border-t border-slate-100">
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-primary" />
                      Workshop Billing &amp; Documents
                    </h4>
                    <span className="text-[11px] text-text-muted">Attach invoice bills and related documents</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Column 1: Workshop Invoice Copy / Bill */}
                    <div className="flex flex-col">
                      <label className="block font-sans text-xs font-bold text-slate-700 mb-2">
                        Workshop Invoice Copy / Bill
                      </label>
                      {invoiceFile ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 flex items-center justify-between gap-3 shadow-2xs min-h-[96px]">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              onClick={() => {
                                try {
                                  handleOpenFileOrPreview(invoiceFile);
                                } catch (err) {
                                  console.error("Error previewing invoiceFile:", err);
                                }
                              }}
                              className="relative w-14 h-14 rounded-lg border border-emerald-300 overflow-hidden bg-white cursor-pointer group shrink-0 flex items-center justify-center shadow-xs"
                              title="Click to view full preview"
                            >
                              {invoiceFile.toLowerCase().endsWith(".pdf") ? (
                                <div className="text-[11px] font-black text-rose-600 uppercase tracking-wider">PDF</div>
                              ) : (
                                <img
                                  src={invoiceFile}
                                  alt="Invoice preview"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="text-xs font-bold text-emerald-950 truncate">Invoice Attached</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">Click thumbnail to expand preview</p>
                              <div className="flex items-center gap-2.5 mt-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    try {
                                      handleOpenFileOrPreview(invoiceFile);
                                    } catch (err) {
                                      console.error("Error viewing invoiceFile:", err);
                                    }
                                  }}
                                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" /> View
                                </button>
                                <span className="text-slate-300">·</span>
                                <label className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1">
                                  <Upload className="w-3 h-3" /> Replace
                                  <input type="file" onChange={handleInvoiceFileUpload} className="hidden" accept="image/*,.pdf" />
                                </label>
                                <span className="text-slate-300">·</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    try {
                                      setInvoiceFile(null);
                                    } catch (err) {
                                      console.error("Error removing invoiceFile:", err);
                                    }
                                  }}
                                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 cursor-pointer flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" /> Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 hover:border-primary/40 hover:bg-slate-50 transition-all flex flex-col items-center justify-center text-center min-h-[96px]">
                          <span className="text-xs font-semibold text-slate-700 mb-0.5">Attach Workshop Bill</span>
                          <span className="text-[10px] text-slate-400 mb-2.5">Upload image or PDF up to 10MB</span>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 h-8 px-3.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer transition-colors shadow-xs">
                              <Upload className="w-3 h-3" />
                              <span>{uploadingInvoice ? "Uploading..." : "Upload Bill"}</span>
                              <input type="file" onChange={handleInvoiceFileUpload} className="hidden" accept="image/*,.pdf" />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  setActiveCameraTarget("invoice");
                                } catch (err) {
                                  console.error("Error setting camera target to invoice:", err);
                                }
                              }}
                              className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer transition-colors shadow-xs"
                            >
                              <Camera className="w-3 h-3 text-slate-600" />
                              <span>Camera</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Column 2: Document */}
                    <div className="flex flex-col">
                      <label className="block font-sans text-xs font-bold text-slate-700 mb-2">
                        Document
                      </label>
                      {approvalFile ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 flex items-center justify-between gap-3 shadow-2xs min-h-[96px]">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              onClick={() => {
                                try {
                                  handleOpenFileOrPreview(approvalFile);
                                } catch (err) {
                                  console.error("Error previewing approvalFile:", err);
                                }
                              }}
                              className="relative w-14 h-14 rounded-lg border border-emerald-300 overflow-hidden bg-white cursor-pointer group shrink-0 flex items-center justify-center shadow-xs"
                              title="Click to view full preview"
                            >
                              {approvalFile.toLowerCase().endsWith(".pdf") ? (
                                <div className="text-[11px] font-black text-rose-600 uppercase tracking-wider">PDF</div>
                              ) : (
                                <img
                                  src={approvalFile}
                                  alt="Approval preview"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="text-xs font-bold text-emerald-950 truncate">Document Attached</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">Click thumbnail to expand preview</p>
                              <div className="flex items-center gap-2.5 mt-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    try {
                                      handleOpenFileOrPreview(approvalFile);
                                    } catch (err) {
                                      console.error("Error viewing approvalFile:", err);
                                    }
                                  }}
                                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" /> View
                                </button>
                                <span className="text-slate-300">·</span>
                                <label className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1">
                                  <Upload className="w-3 h-3" /> Replace
                                  <input type="file" onChange={handleApprovalFileUpload} className="hidden" accept="image/*,.pdf" />
                                </label>
                                <span className="text-slate-300">·</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    try {
                                      setApprovalFile(null);
                                    } catch (err) {
                                      console.error("Error removing approvalFile:", err);
                                    }
                                  }}
                                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 cursor-pointer flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" /> Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 hover:border-primary/40 hover:bg-slate-50 transition-all flex flex-col items-center justify-center text-center min-h-[96px]">
                          <span className="text-xs font-semibold text-slate-700 mb-0.5">Attach Document</span>
                          <span className="text-[10px] text-slate-400 mb-2.5">Upload document or screenshot</span>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 h-8 px-3.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer transition-colors shadow-xs">
                              <Upload className="w-3 h-3" />
                              <span>{uploadingApproval ? "Uploading..." : "Upload Document"}</span>
                              <input type="file" onChange={handleApprovalFileUpload} className="hidden" accept="image/*,.pdf" />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  setActiveCameraTarget("approval");
                                } catch (err) {
                                  console.error("Error setting camera target to approval:", err);
                                }
                              }}
                              className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer transition-colors shadow-xs"
                            >
                              <Camera className="w-3 h-3 text-slate-600" />
                              <span>Camera</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Completed Repair Photos & Handover Status */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs">
                <div className="border-b border-border/80 pb-3 mb-6 flex items-center justify-between">
                  <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
                    Completed Repair Photos (Up to 5 Photos) &amp; Handover Status
                  </h3>
                  <span className="font-mono text-xs font-bold text-text-muted">
                    {outwardPhotos.length} / 5 photos attached
                  </span>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <label className={`flex items-center gap-2 h-10 px-4 text-xs font-semibold rounded-xl border transition-colors shadow-2xs cursor-pointer ${
                        outwardPhotos.length >= 5
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                          : "bg-primary/5 text-primary border-primary/30 hover:bg-primary/10"
                      }`}>
                        <Upload className="w-4 h-4" />
                        <span>{uploadingPhoto ? "Uploading..." : "Add Photos from Files"}</span>
                        <input
                          type="file"
                          multiple
                          disabled={outwardPhotos.length >= 5}
                          onChange={handlePhotoUpload}
                          className="hidden"
                          accept="image/*"
                        />
                      </label>

                      <button
                        type="button"
                        disabled={outwardPhotos.length >= 5}
                        onClick={() => {
                          try {
                            setActiveCameraTarget("photos");
                          } catch (err) {
                            console.error("Error setting activeCameraTarget to photos:", err);
                          }
                        }}
                        className={`flex items-center gap-2 h-10 px-4 text-xs font-semibold rounded-xl border transition-colors shadow-2xs cursor-pointer ${
                          outwardPhotos.length >= 5
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-primary/5 text-primary border-primary/30 hover:bg-primary/10"
                        }`}
                      >
                        <Camera className="w-4 h-4" />
                        <span>Capture Photo</span>
                      </button>
                    </div>

                    {/* Photos Grid */}
                    {outwardPhotos.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {outwardPhotos.map((url, idx) => (
                          <div key={idx} className="relative group border border-border rounded-xl overflow-hidden bg-slate-50 aspect-square shadow-2xs">
                            <img
                              src={url}
                              alt={`Repair photo ${idx + 1}`}
                              className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform"
                              onClick={() => handleSafePreviewImage(url)}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSafePreviewImage(url)}
                                className="p-1.5 bg-white text-slate-800 rounded-full hover:bg-slate-100 cursor-pointer shadow"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    removeOutwardPhoto(idx);
                                  } catch (err) {
                                    console.error("Error removing photo:", err);
                                  }
                                }}
                                className="p-1.5 bg-rose-600 text-white rounded-full hover:bg-rose-700 cursor-pointer shadow"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                              #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center bg-slate-50/50">
                        <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="font-sans text-xs font-semibold text-slate-600">No completion photos attached yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Upload photos of replaced parts, repaired areas, or clean vehicle</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    <div>
                      <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                        Vehicle Readiness / Handover Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={finalStatus}
                        onChange={e => {
                          try {
                            setFinalStatus(e.target.value);
                          } catch (err) {
                            console.error("Error setting finalStatus:", err);
                          }
                        }}
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-emerald-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs cursor-pointer"
                        required
                      >
                        <option value="Completed & RFD">Completed &amp; Ready For Deployment (RFD)</option>
                        <option value="Completed - Pending Verification">Completed - Pending Verification</option>
                        <option value="Outward on Hold">Outward on Hold</option>
                        <option value="Re-Work Required">Re-Work Required</option>
                        <option value="Scrapped / Decommissioned">Scrapped / Decommissioned</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                        Handover &amp; Completion Remarks
                      </label>
                      <textarea
                        rows={3}
                        value={remarks}
                        onChange={e => {
                          try {
                            setRemarks(e.target.value);
                          } catch (err) {
                            console.error("Error setting remarks:", err);
                          }
                        }}
                        placeholder="Enter notes on repairs completed, warranty terms, or handover details..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={editingId ? cancelEdit : () => {
                    try {
                      setInwardRecord(null);
                      setVehicleNumber("");
                      setSearchStatus("idle");
                      setVehicleOutKms("");
                      setInvoiceNo("");
                      setInvoiceDate(getTodayDateString());
                      setInvoiceAmount("");
                      setInvoiceFile(null);
                      setPaymentStatus("Pending");
                      setApprovedBy("");
                      setApprovalDate("");
                      setApprovalFile(null);
                      setOutwardPhotos([]);
                      setRemarks("");
                      setVehicleOutDateTime(getNowDateTimeString());
                      setRfdDate(getTodayDateString());
                    } catch (err) {
                      console.error("Error resetting form:", err);
                    }
                  }}
                  className="rounded-xl border border-border bg-white px-6 py-3 font-sans text-xs font-semibold text-text-muted hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
                >
                  {editingId ? "Cancel Edit" : "Clear Form"}
                </button>
                {!editingId && !inwardRecord && (
                  <span className="text-xs text-rose-600 font-bold mr-auto">
                    ⚠️ Active workshop inward ticket required to submit Maintenance Out.
                  </span>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || (!editingId && !inwardRecord)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-sans text-xs font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!editingId && !inwardRecord ? "Check and link active inward ticket first" : undefined}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{editingId ? "Updating Outward Entry..." : "Submitting Outward Record..."}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingId ? "Update Maintenance Outward" : "Submit Maintenance Outward"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: REGISTRY */}
        {activeTab === "registry" && (
          <div className="rounded-2xl border border-border bg-white shadow-xl overflow-hidden mb-10">
            {/* Header Toolbar */}
            <div className="p-6 border-b border-border bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={registrySearch}
                  onChange={e => {
                    try {
                      setRegistrySearch(e.target.value);
                    } catch (err) {
                      console.error("Error setting registrySearch:", err);
                    }
                  }}
                  onKeyDown={e => {
                    try {
                      if (e.key === "Enter") {
                        fetchRegistry();
                      }
                    } catch (err) {
                      console.error("Error in registrySearch onKeyDown:", err);
                    }
                  }}
                  placeholder="Search by Vehicle Number, Invoice No, or Workshop..."
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => {
                    try {
                      fetchRegistry();
                    } catch (err) {
                      console.error("Error triggering fetchRegistry:", err);
                    }
                  }}
                  className="flex h-10 w-10 items-center justify-center text-text-muted hover:text-primary bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer shadow-2xs"
                  title="Refresh records"
                >
                  <RefreshCw className={`w-4 h-4 ${isRegistryLoading ? "animate-spin" : ""}`} />
                </button>

                <button
                  onClick={() => {
                    try {
                      exportCSV();
                    } catch (err) {
                      console.error("Error triggering exportCSV:", err);
                    }
                  }}
                  className="flex items-center gap-2 h-10 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-primary" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead className="bg-slate-50 border-b border-border text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3.5">Outward ID</th>
                    <th className="px-4 py-3.5">Inward ID</th>
                    <th className="px-4 py-3.5">Vehicle Number</th>
                    <th className="px-4 py-3.5">Workshop</th>
                    <th className="px-4 py-3.5">In Date &amp; Time</th>
                    <th className="px-4 py-3.5">Out Date &amp; Time</th>
                    <th className="px-4 py-3.5">Out KMs</th>
                    <th className="px-4 py-3.5">Invoice (₹)</th>
                    <th className="px-4 py-3.5">Payment</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Photos</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {isRegistryLoading ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-16 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                        <span>Loading outward records...</span>
                      </td>
                    </tr>
                  ) : registryRecords.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-16 text-center text-slate-400">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">No completed outward records found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Submit an outward check-out to see entries here</p>
                      </td>
                    </tr>
                  ) : (
                    registryRecords.map(r => {
                      let parsedPhotos: string[] = [];
                      try {
                        parsedPhotos = parsePhotosSafely(r?.vehicle_out_photos);
                      } catch (parseErr) {
                        console.error("Error parsing photos in registry row:", parseErr);
                        parsedPhotos = [];
                      }

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">#{r.id}</td>
                          <td className="px-4 py-3 font-mono text-slate-500">
                            {r.inward_id ? (
                              <span className="font-semibold text-emerald-800">#{r.inward_id}</span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
                                Direct
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 tracking-wider">
                            {r.vehicle_number}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{r.workshop_name || "—"}</td>
                          <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                            {formatIndianDateTime(r.vehicle_in_date_time)}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-700 text-[11px] font-medium">
                            {formatIndianDateTime(r.vehicle_out_date_time)}
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-800">{r.vehicle_out_k_m_s} KMs</td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            {r.invoice_amount ? `₹${r.invoice_amount}` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.payment_status === "Paid"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}>
                              {r.payment_status || "Pending"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              {r.final_status || "RFD"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {parsedPhotos.length > 0 ? (
                              <div className="flex items-center gap-1">
                                {parsedPhotos.slice(0, 3).map((p, i) => (
                                  <img
                                    key={i}
                                    src={p}
                                    alt="preview"
                                    onClick={() => handleSafePreviewImage(p)}
                                    className="w-7 h-7 rounded-md object-cover border border-slate-200 hover:scale-110 transition-transform cursor-pointer"
                                  />
                                ))}
                                {parsedPhotos.length > 3 && (
                                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                                    +{parsedPhotos.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    setViewingRecord(r);
                                  } catch (err) {
                                    console.error("Error opening viewing record:", err);
                                  }
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-primary hover:border-primary/40 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                                title="View Full Outward Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    loadRecordForEdit(r);
                                  } catch (err) {
                                    console.error("Error loading record for edit:", err);
                                  }
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-amber-600 hover:border-amber-400 hover:bg-amber-50 transition-colors shadow-2xs cursor-pointer"
                                title="Edit Outward Record"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    handleDeleteRecord(r.id, r.vehicle_number);
                                  } catch (err) {
                                    console.error("Error in handleDeleteRecord:", err);
                                  }
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-rose-600 hover:border-rose-400 hover:bg-rose-50 transition-colors shadow-2xs cursor-pointer"
                                title="Delete Outward Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
          </div>
        )}
      </main>
    </div>
  );
}
