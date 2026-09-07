import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  Clock,
  FileText,
  Wrench,
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
  CheckCircle,
  ShieldCheck,
  Plus
} from "lucide-react";
import { User as UserSession, MaintenanceInRecord, CITIES } from "../types";
import CameraCapture from "./CameraCapture";
import { compressImage } from "../utils/imageCompressor";
import { formatIndianDateTime, formatIndianDate } from "../utils/dateFormatter";

/**
 * Safely parse vehicle damage photos from array, JSON string, or single string.
 */
const safeParsePhotos = (photosData: unknown): string[] => {
  try {
    if (!photosData) return [];
    if (Array.isArray(photosData)) {
      return photosData
        .filter((p): p is string => typeof p === "string" && p.trim() !== "")
        .map(p => p.trim());
    }
    if (typeof photosData === "string") {
      const trimmed = photosData.trim();
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((p): p is string => typeof p === "string" && p.trim() !== "")
            .map(p => p.trim());
        }
      }
      return trimmed ? [trimmed] : [];
    }
    return [];
  } catch (err) {
    console.error("Failed to parse photos data safely:", err, photosData);
    return [];
  }
};

/**
 * Helper to safely format current date-time for datetime-local inputs
 */
const getNowDateTimeString = (): string => {
  try {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  } catch (e) {
    console.error("Failed to generate current date time string:", e);
    return new Date().toISOString().slice(0, 16);
  }
};

/**
 * Helper to safely extract user initials
 */
const getSafeInitials = (name: string): string => {
  try {
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "ST";
  } catch (e) {
    console.error("Failed to calculate user initials:", e);
    return "ST";
  }
};

/**
 * Safe wrappers for Indian date & time formatting
 */
const safeFormatIndianDateTime = (dateStr?: string | null): string => {
  try {
    return formatIndianDateTime(dateStr);
  } catch (e) {
    console.error("Error in safeFormatIndianDateTime:", e, dateStr);
    return dateStr || "—";
  }
};

const safeFormatIndianDate = (dateStr?: string | null): string => {
  try {
    return formatIndianDate(dateStr);
  } catch (e) {
    console.error("Error in safeFormatIndianDate:", e, dateStr);
    return dateStr || "—";
  }
};

interface MaintenanceInFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

export default function MaintenanceInForm({ user, onBackToSelector, onLogout }: MaintenanceInFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "registry">("form");

  // Real-time IST Clock
  const [currentTime, setCurrentTime] = useState(() => {
    try {
      return new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: true });
    } catch (e) {
      console.error("Failed to format initial IST clock time", e);
      return new Date().toLocaleTimeString();
    }
  });

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    try {
      timer = setInterval(() => {
        try {
          setCurrentTime(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: true }));
        } catch (e) {
          console.error("Failed to update clock tick", e);
        }
      }, 1000);
    } catch (err) {
      console.error("Failed to set clock interval", err);
    }
    return () => {
      try {
        if (timer) clearInterval(timer);
      } catch (err) {
        console.error("Failed to clear clock interval", err);
      }
    };
  }, []);

  const displayName = user.name || user.username || "Staff";
  const initials = getSafeInitials(displayName);

  // Form states
  const [cityName, setCityName] = useState(user.city || "Hyderabad");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleLocation, setVehicleLocation] = useState("");
  const [vehicleInDateTime, setVehicleInDateTime] = useState(getNowDateTimeString);
  const [vehicleKms, setVehicleKms] = useState("");
  const [repairType, setRepairType] = useState("");
  const [workshopName, setWorkshopName] = useState("");
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("");
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [insuranceClaimed, setInsuranceClaimed] = useState("No");
  const [insuranceBrokerage, setInsuranceBrokerage] = useState("");
  const [claimNumber, setClaimNumber] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [approvalDate, setApprovalDate] = useState("");
  const [approvalFile, setApprovalFile] = useState<string | null>(null);
  const [damagePhotos, setDamagePhotos] = useState<string[]>([]);
  const [remarks, setRemarks] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingApproval, setUploadingApproval] = useState(false);
  const [activeCameraTarget, setActiveCameraTarget] = useState<"damage" | "approval" | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Active Inward Ticket Check (Vehicle already in workshop)
  const [activeTicketFound, setActiveTicketFound] = useState<MaintenanceInRecord | null>(null);
  const [isCheckingActive, setIsCheckingActive] = useState(false);

  // Edit and View state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingRecord, setViewingRecord] = useState<MaintenanceInRecord | null>(null);

  // Portal Users for Approver Dropdown
  const [portalUsers, setPortalUsers] = useState<Array<{ id: number; username: string; name: string; role: string; city?: string }>>([]);

  const fetchPortalUsers = async () => {
    try {
      let token: string | null = null;
      try {
        token = localStorage.getItem("token") || localStorage.getItem("lr_token") || localStorage.getItem("auth_token") || sessionStorage.getItem("token");
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
      console.error("Error filtering approvers by city in MaintenanceInForm:", err);
      return portalUsers;
    }
  }, [portalUsers, cityName]);

  // Registry states
  const [registryRecords, setRegistryRecords] = useState<MaintenanceInRecord[]>([]);
  const [isRegistryLoading, setIsRegistryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [cityFilter, setCityFilter] = useState("All");

  // Check if entered vehicle has an active open ticket
  const checkActiveInwardTicket = async (vnum: string) => {
    try {
      const trimmed = vnum.trim().toUpperCase();
      if (!trimmed || trimmed.length < 4 || editingId !== null) {
        setActiveTicketFound(null);
        return;
      }
      setIsCheckingActive(true);
      let token: string | null = null;
      try {
        token = localStorage.getItem("lr_token");
      } catch (tErr) {
        console.error("Token read error in checkActiveInwardTicket", tErr);
      }
      const res = await fetch(`/api/maintenance-in/check-active?vehicle_number=${encodeURIComponent(trimmed)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        let data: any = {};
        try {
          data = await res.json();
        } catch (jsonErr) {
          console.error("Error parsing check-active JSON", jsonErr);
        }
        if (data?.active && data?.record) {
          setActiveTicketFound(data.record);
        } else {
          setActiveTicketFound(null);
        }
      } else {
        setActiveTicketFound(null);
      }
    } catch (err) {
      console.error("Error checking active inward ticket:", err);
      setActiveTicketFound(null);
    } finally {
      setIsCheckingActive(false);
    }
  };

  useEffect(() => {
    try {
      if (editingId !== null) {
        setActiveTicketFound(null);
        return;
      }
      const trimmed = vehicleNumber.trim().toUpperCase();
      if (trimmed.length < 4) {
        setActiveTicketFound(null);
        return;
      }
      const timer = setTimeout(() => {
        checkActiveInwardTicket(trimmed);
      }, 400);
      return () => clearTimeout(timer);
    } catch (err) {
      console.error("Error in vehicleNumber debounce check:", err);
    }
  }, [vehicleNumber, editingId]);

  const loadRecordForEdit = (r: MaintenanceInRecord) => {
    try {
      setEditingId(r.id);
      setActiveTicketFound(null);
      setCityName(r.city_name || "Hyderabad");
      setVehicleNumber(r.vehicle_number || "");
      setVehicleLocation(r.vehicle_location || "");
      setVehicleInDateTime(r.vehicle_in_date_time || getNowDateTimeString());
      setVehicleKms(r.vehicle_k_m_s || "");
      setRepairType(r.repair_type || "");
      setWorkshopName(r.workshop_name || "");
      setEstimatedDeliveryDate(r.estimated_delivery_date || "");
      setEstimatedAmount(r.estimated_amount || "");
      setInsuranceClaimed(r.insurance_claimed || "No");
      setInsuranceBrokerage(r.insurance_brokerage || "");
      setClaimNumber(r.claim_number || "");
      setApprovedBy(r.approved_by || "");
      setApprovalDate(r.approval_date || "");
      setApprovalFile(r.approval_file || null);

      const parsedPhotos = safeParsePhotos(r.vehicle_damage_photos);
      setDamagePhotos(parsedPhotos);
      setRemarks(r.remarks || "");
      setActiveTab("form");
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (scrollErr) {
        console.error("Window scroll failed in loadRecordForEdit", scrollErr);
      }
    } catch (err: any) {
      console.error("Failed to load record for editing", err);
      try {
        alert("Failed to load record for editing: " + (err?.message || "Unknown error"));
      } catch (aErr) {
        console.error("Alert error in loadRecordForEdit", aErr);
      }
    }
  };

  const cancelEdit = () => {
    try {
      setEditingId(null);
      setActiveTicketFound(null);
      setVehicleNumber("");
      setVehicleLocation("");
      setVehicleKms("");
      setRepairType("");
      setWorkshopName("");
      setEstimatedDeliveryDate("");
      setEstimatedAmount("");
      setInsuranceClaimed("No");
      setInsuranceBrokerage("");
      setClaimNumber("");
      setApprovedBy("");
      setApprovalDate("");
      setApprovalFile(null);
      setDamagePhotos([]);
      setRemarks("");
      setVehicleInDateTime(getNowDateTimeString());
    } catch (err) {
      console.error("Failed to reset edit form state", err);
    }
  };

  const handleDeleteRecord = async (id: number, vnum: string) => {
    try {
      let confirmed = false;
      try {
        confirmed = window.confirm(`Are you sure you want to delete Inward Ticket #${id} for vehicle ${vnum}?`);
      } catch (cErr) {
        console.error("Confirm dialog error in handleDeleteRecord", cErr);
        confirmed = true;
      }
      if (!confirmed) return;

      let token: string | null = null;
      try {
        token = localStorage.getItem("lr_token");
      } catch (tErr) {
        console.error("Failed to read token from localStorage in handleDeleteRecord", tErr);
      }

      const res = await fetch(`/api/maintenance-in/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        let detail = "Failed to delete record";
        try {
          const d = await res.json();
          detail = d.detail || detail;
        } catch (jsonErr) {
          console.error("Failed to parse delete error JSON", jsonErr);
        }
        throw new Error(detail);
      }

      try {
        alert(`Inward Ticket #${id} deleted successfully.`);
      } catch (aErr) {
        console.error("Alert error after delete", aErr);
      }

      await fetchRegistry();
    } catch (err: any) {
      console.error(`Failed to delete record #${id}:`, err);
      try {
        alert("Delete failed: " + (err?.message || "Unknown error"));
      } catch (aErr) {
        console.error("Alert error on delete failure", aErr);
      }
    }
  };

  // Load registry
  const fetchRegistry = async () => {
    setIsRegistryLoading(true);
    try {
      let token: string | null = null;
      try {
        token = localStorage.getItem("lr_token");
      } catch (tErr) {
        console.error("Failed to read token from localStorage in fetchRegistry", tErr);
      }

      const params = new URLSearchParams();
      try {
        if (searchQuery.trim()) params.append("search", searchQuery.trim());
        if (statusFilter !== "all") params.append("status", statusFilter);
        if (cityFilter !== "All") params.append("city", cityFilter);
      } catch (pErr) {
        console.error("Failed to build search params in fetchRegistry", pErr);
      }

      const res = await fetch(`/api/maintenance-in?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        let data: unknown = [];
        try {
          data = await res.json();
        } catch (jErr) {
          console.error("Failed to parse registry JSON", jErr);
        }
        setRegistryRecords(Array.isArray(data) ? data : []);
      } else {
        let errorMsg = `Server returned status ${res.status}`;
        try {
          const errData = await res.json();
          errorMsg = errData.detail || errorMsg;
        } catch {
          // ignore non-json error responses
        }
        console.error("Failed to fetch inward registry:", errorMsg);
        setSubmitError("Failed to fetch inward registry: " + errorMsg);
      }
    } catch (err: any) {
      console.error("Failed to load inward registry", err);
      setSubmitError("Failed to load inward registry: " + (err?.message || "Network error"));
    } finally {
      setIsRegistryLoading(false);
    }
  };

  useEffect(() => {
    try {
      if (activeTab === "registry") {
        fetchRegistry().catch(err => console.error("Unhandled error in fetchRegistry effect:", err));
      }
    } catch (err) {
      console.error("Error in tab change effect:", err);
    }
  }, [activeTab, statusFilter, cityFilter]);

  // Handle Photo Upload (up to 5 photos)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      if (damagePhotos.length + files.length > 5) {
        try {
          alert("You can upload a maximum of 5 vehicle damage photos.");
        } catch (aErr) {
          console.error("Alert error in handlePhotoUpload", aErr);
        }
        return;
      }

      setUploadingPhoto(true);
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        try {
          const file = files[i];
          const url = await compressImage(file, undefined, undefined, undefined, "maintenance_in");
          if (url) uploadedUrls.push(url);
        } catch (fileErr: any) {
          console.error(`Failed to compress/upload image ${files[i]?.name || i}:`, fileErr);
          try {
            alert(`Failed to upload photo ${files[i]?.name || i + 1}: ${fileErr?.message || "Unknown error"}`);
          } catch (aErr) {
            console.error("Alert error for file upload", aErr);
          }
        }
      }

      if (uploadedUrls.length > 0) {
        setDamagePhotos(prev => [...prev, ...uploadedUrls].slice(0, 5));
      }
    } catch (err: any) {
      console.error("Failed in handlePhotoUpload:", err);
      try {
        alert("Failed to upload photo: " + (err?.message || "Unknown error"));
      } catch (aErr) {
        console.error("Alert error in handlePhotoUpload catch", aErr);
      }
    } finally {
      setUploadingPhoto(false);
      try {
        e.target.value = "";
      } catch (targetErr) {
        console.error("Failed to reset photo input target value", targetErr);
      }
    }
  };

  const handleCameraCapture = (url: string) => {
    try {
      if (!url) return;
      if (activeCameraTarget === "damage") {
        if (damagePhotos.length >= 5) {
          try {
            alert("Maximum 5 photos reached.");
          } catch (aErr) {
            console.error("Alert error in handleCameraCapture", aErr);
          }
        } else {
          setDamagePhotos(prev => [...prev, url].slice(0, 5));
        }
      } else if (activeCameraTarget === "approval") {
        setApprovalFile(url);
      }
    } catch (err: any) {
      console.error("Failed to handle camera capture:", err);
      try {
        alert("Failed to process captured image: " + (err?.message || "Unknown error"));
      } catch (aErr) {
        console.error("Alert error in handleCameraCapture catch", aErr);
      }
    } finally {
      setActiveCameraTarget(null);
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
        }
      } catch (err: any) {
        console.error("Approval upload failed:", err);
        try {
          alert("Approval upload failed: " + (err?.message || "Unknown error"));
        } catch (aErr) {
          console.error("Alert error in handleApprovalFileUpload", aErr);
        }
      }
    } catch (outerErr: any) {
      console.error("Unexpected error in handleApprovalFileUpload:", outerErr);
      try {
        alert("Approval upload error: " + (outerErr?.message || "Unknown error"));
      } catch (aErr) {
        console.error("Alert error in handleApprovalFileUpload outer catch", aErr);
      }
    } finally {
      setUploadingApproval(false);
      try {
        e.target.value = "";
      } catch (targetErr) {
        console.error("Failed to reset approval input target value", targetErr);
      }
    }
  };

  const removeDamagePhoto = (index: number) => {
    try {
      setDamagePhotos(prev => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error("Failed to remove damage photo at index", index, err);
    }
  };

  // Submit Inward Form
  const handleSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault();
    } catch (prevErr) {
      console.error("e.preventDefault error", prevErr);
    }
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      if (!vehicleNumber.trim()) {
        setSubmitError("Vehicle Number is required.");
        return;
      }
      if (!editingId && activeTicketFound) {
        setSubmitError(`Vehicle ${vehicleNumber.trim().toUpperCase()} already has an active inward ticket (#${activeTicketFound.id}). A new ticket cannot be submitted until checked out via Maintenance Out. Please edit the active ticket instead.`);
        return;
      }
      if (!cityName.trim()) {
        setSubmitError("City is required.");
        return;
      }
      if (!vehicleInDateTime.trim()) {
        setSubmitError("Vehicle IN Date & Time is required.");
        return;
      }
      if (!vehicleKms.trim()) {
        setSubmitError("Inward Odometer Reading (KMs) is required.");
        return;
      }
      if (!workshopName.trim()) {
        setSubmitError("Workshop Name is required.");
        return;
      }

      setIsSubmitting(true);
      let token: string | null = null;
      try {
        token = localStorage.getItem("lr_token");
      } catch (tErr) {
        console.error("Failed to read token from localStorage in handleSubmit", tErr);
      }

      const payload = {
        city_name: cityName.trim(),
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        vehicle_location: vehicleLocation.trim() || null,
        vehicle_in_date_time: vehicleInDateTime.trim(),
        vehicle_k_m_s: vehicleKms.trim(),
        repair_type: repairType.trim() || null,
        workshop_name: workshopName.trim(),
        estimated_delivery_date: estimatedDeliveryDate.trim() || null,
        estimated_amount: estimatedAmount.trim() || null,
        insurance_claimed: insuranceClaimed.trim() || "No",
        insurance_brokerage: insuranceBrokerage.trim() || null,
        claim_number: claimNumber.trim() || null,
        approved_by: approvedBy.trim() || null,
        approval_date: approvalDate.trim() || null,
        approval_file: approvalFile || null,
        vehicle_damage_photos: damagePhotos,
        remarks: remarks.trim() || null,
      };

      const url = editingId ? `/api/maintenance-in/${editingId}` : "/api/maintenance-in";
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
        console.error("Failed to parse submit response JSON", jsonErr);
      }

      if (!res.ok) {
        throw new Error(data.detail || (editingId ? "Failed to update inward record." : "Failed to create inward record."));
      }

      setSubmitSuccess(
        editingId
          ? `Inward Ticket #${editingId} updated successfully!`
          : `Inward Entry #${data.id || ""} created successfully for ${payload.vehicle_number}!`
      );
      cancelEdit();
      await fetchRegistry();
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (scrollErr) {
        console.error("Window scroll error after submit", scrollErr);
      }
    } catch (err: any) {
      console.error("Failed to submit maintenance in form", err);
      setSubmitError(err?.message || "An error occurred while submitting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // CSV Export
  const exportCSV = () => {
    try {
      if (registryRecords.length === 0) {
        try {
          alert("No records to export.");
        } catch (aErr) {
          console.error("Alert error in exportCSV", aErr);
        }
        return;
      }
      const headers = [
        "Inward ID", "Status", "Vehicle Number", "City", "Location",
        "In Date/Time", "In KMs", "Repair Type", "Workshop Name",
        "Est. Delivery Date", "Est. Amount (₹)", "Insurance Claimed",
        "Brokerage", "Claim No", "Approved By", "Approval Date", "Remarks"
      ];
      const rows = registryRecords.map(r => {
        try {
          return [
            r.id,
            r.is_closed ? "Closed" : "Open in Workshop",
            r.vehicle_number || "",
            r.city_name || "",
            r.vehicle_location || "",
            r.vehicle_in_date_time || "",
            r.vehicle_k_m_s || "",
            r.repair_type || "",
            r.workshop_name || "",
            r.estimated_delivery_date || "",
            r.estimated_amount || "",
            r.insurance_claimed || "No",
            r.insurance_brokerage || "",
            r.claim_number || "",
            r.approved_by || "",
            r.approval_date || "",
            (r.remarks || "").replace(/[\r\n]+/g, " ")
          ];
        } catch (rowErr) {
          console.error("Error creating CSV row for record:", rowErr, r);
          return [r.id || "", "", r.vehicle_number || "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""];
        }
      });

      const csvContent = "\uFEFF" + [
        headers.join(","),
        ...rows.map(e => e.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      let blobUrl: string | null = null;
      try {
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        blobUrl = URL.createObjectURL(blob);
      } catch (blobErr) {
        console.error("Blob URL creation failed, falling back to data URI:", blobErr);
        try {
          blobUrl = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
        } catch (dataUriErr) {
          console.error("Data URI creation failed:", dataUriErr);
        }
      }

      if (!blobUrl) {
        throw new Error("Unable to create file link for CSV export.");
      }

      const link = document.createElement("a");
      link.setAttribute("href", blobUrl);

      let dateSuffix = "export";
      try {
        dateSuffix = new Date().toISOString().split("T")[0];
      } catch (dErr) {
        console.error("Failed to generate date suffix for CSV filename:", dErr);
      }

      link.setAttribute("download", `LetzRyd_Maintenance_Inward_${dateSuffix}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up object URL safely if created as blob
      try {
        if (blobUrl.startsWith("blob:")) {
          URL.revokeObjectURL(blobUrl);
        }
      } catch (revokeErr) {
        console.error("Failed to revoke blob URL:", revokeErr);
      }
    } catch (err: any) {
      console.error("Failed to export CSV:", err);
      try {
        alert("Failed to export CSV: " + (err?.message || "Unknown error"));
      } catch (aErr) {
        console.error("Alert error in exportCSV catch:", aErr);
      }
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
                  console.error("Error clicking Back to Form Selector", err);
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
                  console.error("Error clicking LetzRyd logo", err);
                }
              }}
              referrerPolicy="no-referrer"
            />
            <span className="hidden h-5 border-l border-border sm:inline-block" />
            <span className="hidden font-sans text-xs font-semibold text-text-muted sm:inline-block">
              Vehicle Maintenance In
            </span>
          </div>

          {/* Navigation Pills */}
          <nav className="flex gap-2">
            <button
              onClick={() => {
                try {
                  setActiveTab("form");
                } catch (err) {
                  console.error("Error switching to form tab", err);
                }
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "form"
                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                  : "text-text-muted hover:bg-slate-100 hover:text-primary"
              }`}
            >
              <FileText className="h-4 w-4" />
              Maintenance In Form
            </button>
            <button
              onClick={() => {
                try {
                  setActiveTab("registry");
                  fetchRegistry().catch(err => console.error("fetchRegistry error on tab switch", err));
                } catch (err) {
                  console.error("Error switching to registry tab", err);
                }
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "registry"
                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                  : "text-text-muted hover:bg-slate-100 hover:text-primary"
              }`}
            >
              <Wrench className="h-4 w-4" />
              Inward Registry
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
                  console.error("Error during onLogout click", err);
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
              console.error("Error closing CameraCapture modal", err);
            }
          }}
          title={activeCameraTarget === "damage" ? "Capture Vehicle Damage Photo" : "Capture Approval Document Photo"}
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
              console.error("Error closing preview overlay", err);
            }
          }}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl p-2"
            onClick={e => {
              try {
                e.stopPropagation();
              } catch (err) {
                console.error("Error stopping propagation on preview modal", err);
              }
            }}
          >
            <button
              onClick={() => {
                try {
                  setPreviewImage(null);
                } catch (err) {
                  console.error("Error clicking close preview button", err);
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

      {/* Record Details View Modal */}
      {viewingRecord && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => {
            try {
              setViewingRecord(null);
            } catch (err) {
              console.error("Error closing viewing record overlay", err);
            }
          }}
        >
          <div
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-8"
            onClick={e => {
              try {
                e.stopPropagation();
              } catch (err) {
                console.error("Error stopping propagation on viewing record modal", err);
              }
            }}
          >
            {/* Modal Header */}
            <div className="bg-primary px-6 py-4 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                    Ticket #{viewingRecord.id}
                  </span>
                  <span className="font-mono font-bold tracking-wider text-base">{viewingRecord.vehicle_number}</span>
                </div>
                <p className="text-[11px] text-white/80 mt-0.5">
                  Maintenance Inward Details · {viewingRecord.city_name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const rec = viewingRecord;
                      setViewingRecord(null);
                      if (rec) loadRecordForEdit(rec);
                    } catch (err) {
                      console.error("Error loading record for edit from modal", err);
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
                      console.error("Error closing modal via close icon", err);
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
                  <span className="text-slate-500 font-medium">Ticket Status: </span>
                  {viewingRecord.is_closed ? (
                    <span className="inline-flex items-center gap-1 font-bold text-slate-700 ml-1">
                      <CheckCircle className="w-3.5 h-3.5 text-slate-500" /> Closed (Outward Completed)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-700 ml-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Open in Workshop
                    </span>
                  )}
                </div>
                {viewingRecord.created_at && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    Logged: {safeFormatIndianDateTime(viewingRecord.created_at)}
                  </span>
                )}
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-medium">City &amp; Location</span>
                  <span className="font-bold text-slate-800">{viewingRecord.city_name}</span>
                  {viewingRecord.vehicle_location && (
                    <span className="text-[11px] text-slate-600 block mt-0.5">{viewingRecord.vehicle_location}</span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-medium">In Date &amp; Time</span>
                  <span className="font-mono font-bold text-slate-800">{safeFormatIndianDateTime(viewingRecord.vehicle_in_date_time)}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-medium">Inward Odometer</span>
                  <span className="font-mono font-bold text-slate-800">{viewingRecord.vehicle_k_m_s} KMs</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-medium">Workshop Name</span>
                  <span className="font-bold text-slate-800">{viewingRecord.workshop_name}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-medium">Repair Type</span>
                  <span className="font-semibold text-slate-800">{viewingRecord.repair_type || "—"}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-medium">Estimated Amount</span>
                  <span className="font-mono font-bold text-primary">{viewingRecord.estimated_amount ? `₹${viewingRecord.estimated_amount}` : "—"}</span>
                  {viewingRecord.estimated_delivery_date && (
                    <span className="text-[10px] text-slate-500 block mt-0.5">ETA: {safeFormatIndianDate(viewingRecord.estimated_delivery_date)}</span>
                  )}
                </div>
              </div>

              {/* Insurance & Approval Info */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Insurance &amp; Intake Approvals
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Insurance Claimed</span>
                    <span className="font-semibold text-slate-800">{viewingRecord.insurance_claimed || "No"}</span>
                  </div>
                  {viewingRecord.insurance_brokerage && (
                    <div>
                      <span className="text-[11px] text-slate-400 block">Brokerage</span>
                      <span className="font-semibold text-slate-800">{viewingRecord.insurance_brokerage}</span>
                    </div>
                  )}
                  {viewingRecord.claim_number && (
                    <div>
                      <span className="text-[11px] text-slate-400 block">Claim Number</span>
                      <span className="font-mono font-bold text-slate-800">{viewingRecord.claim_number}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-[11px] text-slate-400 block">Approved By</span>
                    <span className="font-semibold text-slate-800">{viewingRecord.approved_by || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Approval Date</span>
                    <span className="font-mono text-slate-800">{safeFormatIndianDate(viewingRecord.approval_date)}</span>
                  </div>
                </div>

                {/* Document Thumbnail */}
                {viewingRecord.approval_file && (
                  <div className="pt-2 border-t border-slate-200 flex items-center gap-3">
                    <span className="text-[11px] text-slate-500 font-medium">Document:</span>
                    <div
                      onClick={() => {
                        try {
                          if (viewingRecord.approval_file?.toLowerCase().endsWith(".pdf")) {
                            window.open(viewingRecord.approval_file, "_blank");
                          } else if (viewingRecord.approval_file) {
                            setPreviewImage(viewingRecord.approval_file);
                          }
                        } catch (err) {
                          console.error("Error opening approval proof file", err);
                        }
                      }}
                      className="flex items-center gap-2 px-2.5 py-1 bg-white border border-slate-300 rounded-lg hover:border-primary cursor-pointer shadow-2xs transition-colors"
                    >
                      {viewingRecord.approval_file.toLowerCase().endsWith(".pdf") ? (
                        <span className="text-[10px] font-bold text-rose-600">PDF</span>
                      ) : (
                        <img
                          src={viewingRecord.approval_file}
                          alt="Approval thumbnail"
                          className="w-6 h-6 object-cover rounded"
                        />
                      )}
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] font-bold text-primary">View Document</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Photos Gallery */}
              {(() => {
                const photos = safeParsePhotos(viewingRecord.vehicle_damage_photos);
                return (
                  <div>
                    <span className="text-xs font-bold text-slate-800 block mb-2">
                      Damage &amp; Intake Photos ({photos.length})
                    </span>
                    {photos.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {photos.map((p, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              try {
                                setPreviewImage(p);
                              } catch (err) {
                                console.error("Error clicking damage photo preview", err);
                              }
                            }}
                            className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer group shadow-2xs"
                          >
                            <img src={p} alt={`Damage ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
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
                      <p className="text-xs text-slate-400 italic">No photos uploaded for this ticket.</p>
                    )}
                  </div>
                );
              })()}

              {/* Remarks */}
              {viewingRecord.remarks && (
                <div>
                  <span className="text-xs font-bold text-slate-800 block mb-1">Remarks / Complaints</span>
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
                    console.error("Error closing viewing record modal footer", err);
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
              <h3 className="text-xs font-bold text-emerald-800">Inward Submission Success</h3>
              <p className="text-xs text-emerald-700 mt-0.5">{submitSuccess}</p>
            </div>
            <button
              onClick={() => {
                try {
                  setSubmitSuccess(null);
                } catch (err) {
                  console.error("Error dismissing success alert", err);
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
                  console.error("Error dismissing error alert", err);
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
                <h4 className="text-xs font-bold text-amber-900">Editing Inward Ticket #{editingId}</h4>
                <p className="text-[11px] text-amber-700">Modifying details. Click 'Update Inward Entry' below to save changes.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                try {
                  cancelEdit();
                } catch (err) {
                  console.error("Error clicking cancel edit button", err);
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
                  Maintenance Inward Desk
                </span>
              </div>
              <h1 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                Vehicle Maintenance Inward Form
              </h1>
              <p className="text-white/80 text-xs mt-1">
                Record vehicle check-in, workshop intake, odometer readings, repair estimates, and damage condition photos.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Section 1: Vehicle & Location Details */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs">
                <div className="border-b border-border/80 pb-3 mb-6 flex items-center justify-between">
                  <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                    Vehicle &amp; Location Identification
                  </h3>
                  <span className="text-[11px] font-semibold text-text-muted">* Mandatory intake details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      City <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={cityName}
                      onChange={e => {
                        try {
                          setCityName(e.target.value);
                        } catch (err) {
                          console.error("Error setting city name", err);
                        }
                      }}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs cursor-pointer"
                      required
                    >
                      <option value="" disabled>Select Operating City</option>
                      {CITIES.map(c => (
                        <option key={c.value} value={c.value}>
                          {c.text}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Vehicle Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vehicleNumber}
                      onChange={e => {
                        try {
                          setVehicleNumber(e.target.value.toUpperCase());
                        } catch (err) {
                          console.error("Error setting vehicle number", err);
                        }
                      }}
                      placeholder="e.g. TS09UB1234"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono font-bold tracking-wider text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Vehicle Location
                    </label>
                    <input
                      type="text"
                      value={vehicleLocation}
                      onChange={e => {
                        try {
                          setVehicleLocation(e.target.value);
                        } catch (err) {
                          console.error("Error setting vehicle location", err);
                        }
                      }}
                      placeholder="e.g. Miyapur Hub, Breakdown Spot NH44"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Vehicle IN Date &amp; Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={vehicleInDateTime}
                      onChange={e => {
                        try {
                          setVehicleInDateTime(e.target.value);
                        } catch (err) {
                          console.error("Error setting vehicle in date time", err);
                        }
                      }}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs cursor-pointer"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Inward Odometer Reading (KMs) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vehicleKms}
                      onChange={e => {
                        try {
                          setVehicleKms(e.target.value);
                        } catch (err) {
                          console.error("Error setting vehicle kms", err);
                        }
                      }}
                      placeholder="e.g. 45200"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono font-semibold text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Repair Classification / Type
                    </label>
                    <input
                      type="text"
                      value={repairType}
                      onChange={e => {
                        try {
                          setRepairType(e.target.value);
                        } catch (err) {
                          console.error("Error setting repair type", err);
                        }
                      }}
                      placeholder="e.g. Accidental, Battery Failure, Periodic Service"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* Active Inward Warning Banner */}
                {activeTicketFound && !editingId && (
                  <div className="mt-4 rounded-xl bg-amber-50 border border-amber-300 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-amber-900">
                            Active Inward Ticket #{activeTicketFound.id} Already Exists for {vehicleNumber}
                          </h4>
                          {isCheckingActive && <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />}
                        </div>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Workshop: <span className="font-semibold">{activeTicketFound.workshop_name}</span> · In Date: <span className="font-semibold">{formatIndianDateTime(activeTicketFound.vehicle_in_date_time)}</span> · Odometer: <span className="font-semibold">{activeTicketFound.vehicle_k_m_s} KMs</span>
                        </p>
                        <p className="text-[11px] text-amber-800 font-semibold mt-1">
                          A vehicle in Maintenance In cannot be entered again until it is checked out via Maintenance Out. You can only edit this active ticket.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          loadRecordForEdit(activeTicketFound);
                        } catch (err) {
                          console.error("Error loading active record for edit:", err);
                        }
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 shadow-xs cursor-pointer transition-colors"
                    >
                      Edit Active Ticket #{activeTicketFound.id}
                    </button>
                  </div>
                )}
              </div>

              {/* Section 2: Workshop & Estimation */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs">
                <div className="border-b border-border/80 pb-3 mb-6 flex items-center justify-between">
                  <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                    Workshop &amp; Repair Estimation
                  </h3>
                  <span className="text-[11px] font-semibold text-text-muted">Vendor &amp; turnaround commitments</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Workshop Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={workshopName}
                      onChange={e => {
                        try {
                          setWorkshopName(e.target.value);
                        } catch (err) {
                          console.error("Error setting workshop name", err);
                        }
                      }}
                      placeholder="e.g. Bosch Car Service, GoMechanic Miyapur"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Estimated Delivery Date
                    </label>
                    <input
                      type="date"
                      value={estimatedDeliveryDate}
                      onChange={e => {
                        try {
                          setEstimatedDeliveryDate(e.target.value);
                        } catch (err) {
                          console.error("Error setting estimated delivery date", err);
                        }
                      }}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Estimated Repair Amount (₹)
                    </label>
                    <input
                      type="text"
                      value={estimatedAmount}
                      onChange={e => {
                        try {
                          setEstimatedAmount(e.target.value);
                        } catch (err) {
                          console.error("Error setting estimated amount", err);
                        }
                      }}
                      placeholder="e.g. 12000"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Insurance & Approval */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs">
                <div className="border-b border-border/80 pb-3 mb-6 flex items-center justify-between">
                  <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                    Insurance Claim &amp; Estimate Approval
                  </h3>
                  <span className="text-[11px] font-semibold text-text-muted">Financial authorization</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Insurance Claimed? <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={insuranceClaimed}
                      onChange={e => {
                        try {
                          setInsuranceClaimed(e.target.value);
                        } catch (err) {
                          console.error("Error setting insurance claimed", err);
                        }
                      }}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Insurance Brokerage
                    </label>
                    <input
                      type="text"
                      value={insuranceBrokerage}
                      onChange={e => {
                        try {
                          setInsuranceBrokerage(e.target.value);
                        } catch (err) {
                          console.error("Error setting insurance brokerage", err);
                        }
                      }}
                      placeholder="e.g. ICICI Lombard, Digit Insurance"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Claim Number
                    </label>
                    <input
                      type="text"
                      value={claimNumber}
                      onChange={e => {
                        try {
                          setClaimNumber(e.target.value);
                        } catch (err) {
                          console.error("Error setting claim number", err);
                        }
                      }}
                      placeholder="e.g. CLM-2026-9810"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Approved by (Estimate)
                    </label>
                    <select
                      value={approvedBy}
                      onChange={e => {
                        try {
                          setApprovedBy(e.target.value);
                        } catch (err) {
                          console.error("Error setting approved by", err);
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
                          console.error("Error setting approval date", err);
                        }
                      }}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs cursor-pointer"
                    />
                  </div>
                </div>

                {/* Dedicated Document Section */}
                <div className="pt-6 mt-6 border-t border-slate-100">
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-primary" />
                      Document
                    </h4>
                    <span className="text-[11px] text-text-muted">Attach approval screenshot, estimate quotation, or related document</span>
                  </div>

                  <div className="max-w-xl">
                    <label className="block font-sans text-xs font-bold text-slate-700 mb-2">
                      Document
                    </label>
                    {approvalFile ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 flex items-center justify-between gap-3 shadow-2xs min-h-[96px]">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            onClick={() => {
                              try {
                                if (approvalFile.toLowerCase().endsWith(".pdf")) {
                                  window.open(approvalFile, "_blank");
                                } else {
                                  setPreviewImage(approvalFile);
                                }
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
                                alt="Approval thumbnail"
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
                                    if (approvalFile.toLowerCase().endsWith(".pdf")) {
                                      window.open(approvalFile, "_blank");
                                    } else {
                                      setPreviewImage(approvalFile);
                                    }
                                  } catch (err) {
                                    console.error("Error opening approval file viewer link", err);
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
                                    console.error("Error removing approval file", err);
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
                        <span className="text-[10px] text-slate-400 mb-2.5">Upload document, image, or PDF</span>
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
                                console.error("Error opening camera for approval", err);
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

              {/* Section 4: Damage Photos & Remarks */}
              <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs">
                <div className="border-b border-border/80 pb-3 mb-6 flex items-center justify-between">
                  <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
                    Vehicle Damage Photos (Up to 5 Photos) &amp; Intake Remarks
                  </h3>
                  <span className="font-mono text-xs font-bold text-text-muted">
                    {damagePhotos.length} / 5 photos attached
                  </span>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <label className={`flex items-center gap-2 h-10 px-4 text-xs font-semibold rounded-xl border transition-colors shadow-2xs cursor-pointer ${
                        damagePhotos.length >= 5
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                          : "bg-primary/5 text-primary border-primary/30 hover:bg-primary/10"
                      }`}>
                        <Upload className="w-4 h-4" />
                        <span>{uploadingPhoto ? "Uploading..." : "Add Photos from Files"}</span>
                        <input
                          type="file"
                          multiple
                          disabled={damagePhotos.length >= 5}
                          onChange={handlePhotoUpload}
                          className="hidden"
                          accept="image/*"
                        />
                      </label>

                      <button
                        type="button"
                        disabled={damagePhotos.length >= 5}
                        onClick={() => {
                          try {
                            setActiveCameraTarget("damage");
                          } catch (err) {
                            console.error("Error opening camera for damage photos", err);
                          }
                        }}
                        className={`flex items-center gap-2 h-10 px-4 text-xs font-semibold rounded-xl border transition-colors shadow-2xs cursor-pointer ${
                          damagePhotos.length >= 5
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-primary/5 text-primary border-primary/30 hover:bg-primary/10"
                        }`}
                      >
                        <Camera className="w-4 h-4" />
                        <span>Capture Photo</span>
                      </button>
                    </div>

                    {/* Photos Grid */}
                    {damagePhotos.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {damagePhotos.map((url, idx) => (
                          <div key={idx} className="relative group border border-border rounded-xl overflow-hidden bg-slate-50 aspect-square shadow-2xs">
                            <img
                              src={url}
                              alt={`Damage photo ${idx + 1}`}
                              className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform"
                              onClick={() => {
                                try {
                                  setPreviewImage(url);
                                } catch (err) {
                                  console.error("Error opening damage photo preview", err);
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    setPreviewImage(url);
                                  } catch (err) {
                                    console.error("Error previewing image from button", err);
                                  }
                                }}
                                className="p-1.5 bg-white text-slate-800 rounded-full hover:bg-slate-100 cursor-pointer shadow"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    removeDamagePhoto(idx);
                                  } catch (err) {
                                    console.error("Error removing photo from thumbnail", err);
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
                        <p className="font-sans text-xs font-semibold text-slate-600">No damage photos attached yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Upload up to 5 photos of vehicle condition, damages, or odometer</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-sans text-xs font-medium text-slate-700 mb-1.5">
                      Remarks / Reported Complaints
                    </label>
                    <textarea
                      rows={3}
                      value={remarks}
                      onChange={e => {
                        try {
                          setRemarks(e.target.value);
                        } catch (err) {
                          console.error("Error setting remarks", err);
                        }
                      }}
                      placeholder="Enter reported issues, driver complaints, or initial intake diagnosis..."
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      if (editingId) {
                        cancelEdit();
                      } else {
                        onBackToSelector();
                      }
                    } catch (err) {
                      console.error("Error in cancel button click", err);
                    }
                  }}
                  className="rounded-xl border border-border bg-white px-6 py-3 font-sans text-xs font-semibold text-text-muted hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
                >
                  {editingId ? "Cancel Edit" : "Cancel"}
                </button>
                {!editingId && !!activeTicketFound && (
                  <span className="text-xs text-amber-700 font-bold mr-auto">
                    ⚠️ Active Ticket #{activeTicketFound.id} exists. Duplicates blocked — click &quot;Edit Active Ticket&quot; above.
                  </span>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || (!editingId && !!activeTicketFound)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-sans text-xs font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!editingId && !!activeTicketFound ? `Vehicle already has active ticket #${activeTicketFound.id}` : undefined}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{editingId ? "Updating Inward Entry..." : "Submitting Inward Entry..."}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingId ? "Update Inward Entry" : "Submit Maintenance In"}</span>
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
                  value={searchQuery}
                  onChange={e => {
                    try {
                      setSearchQuery(e.target.value);
                    } catch (err) {
                      console.error("Error setting search query", err);
                    }
                  }}
                  onKeyDown={e => {
                    try {
                      if (e.key === "Enter") {
                        fetchRegistry().catch(err => console.error("Error on search enter key", err));
                      }
                    } catch (err) {
                      console.error("Error handling search input onKeyDown", err);
                    }
                  }}
                  placeholder="Search by Vehicle Number, Workshop, or Repair Type..."
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <select
                  value={statusFilter}
                  onChange={e => {
                    try {
                      setStatusFilter(e.target.value as any);
                    } catch (err) {
                      console.error("Error setting status filter", err);
                    }
                  }}
                  className="h-10 px-3.5 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:border-primary outline-none transition-all shadow-2xs cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">🟢 Open in Workshop</option>
                  <option value="closed">⚪ Outward Done (Closed)</option>
                </select>

                <select
                  value={cityFilter}
                  onChange={e => {
                    try {
                      setCityFilter(e.target.value);
                    } catch (err) {
                      console.error("Error setting city filter", err);
                    }
                  }}
                  className="h-10 px-3.5 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:border-primary outline-none transition-all shadow-2xs cursor-pointer"
                >
                  <option value="All">All Cities</option>
                  {CITIES.map(c => (
                    <option key={c.value} value={c.value}>
                      {c.text}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    try {
                      fetchRegistry().catch(err => console.error("Error refreshing inward registry", err));
                    } catch (err) {
                      console.error("Error clicking refresh registry button", err);
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
                      console.error("Error exporting CSV", err);
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
                    <th className="px-4 py-3.5">ID</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Vehicle Number</th>
                    <th className="px-4 py-3.5">City &amp; Location</th>
                    <th className="px-4 py-3.5">In Date &amp; Time</th>
                    <th className="px-4 py-3.5">Inward KMs</th>
                    <th className="px-4 py-3.5">Repair Type</th>
                    <th className="px-4 py-3.5">Workshop</th>
                    <th className="px-4 py-3.5">Est. Cost &amp; ETA</th>
                    <th className="px-4 py-3.5">Photos</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {isRegistryLoading ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-16 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                        <span>Loading inward records...</span>
                      </td>
                    </tr>
                  ) : registryRecords.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-16 text-center text-slate-400">
                        <Wrench className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">No inward maintenance tickets found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Try changing filters or search terms</p>
                      </td>
                    </tr>
                  ) : (
                    registryRecords.map(r => {
                      const parsedPhotos = safeParsePhotos(r.vehicle_damage_photos);

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">#{r.id}</td>
                          <td className="px-4 py-3">
                            {r.is_closed ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
                                Closed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Open in Workshop
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 tracking-wider">
                            {r.vehicle_number}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{r.city_name}</div>
                            {r.vehicle_location && (
                              <div className="text-[11px] text-slate-400 truncate max-w-[140px]">{r.vehicle_location}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">{safeFormatIndianDateTime(r.vehicle_in_date_time)}</td>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-800">{r.vehicle_k_m_s} KMs</td>
                          <td className="px-4 py-3">{r.repair_type || "-"}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{r.workshop_name}</td>
                          <td className="px-4 py-3">
                            {r.estimated_amount && (
                              <div className="font-mono font-bold text-primary">₹{r.estimated_amount}</div>
                            )}
                            {r.estimated_delivery_date && (
                              <div className="text-[11px] text-slate-400">ETA: {safeFormatIndianDate(r.estimated_delivery_date)}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {parsedPhotos.length > 0 ? (
                              <div className="flex items-center gap-1">
                                {parsedPhotos.slice(0, 3).map((p, i) => (
                                  <img
                                    key={i}
                                    src={p}
                                    alt="preview"
                                    onClick={() => {
                                      try {
                                        setPreviewImage(p);
                                      } catch (err) {
                                        console.error("Error previewing table thumbnail image", err);
                                      }
                                    }}
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
                              <span className="text-slate-400">-</span>
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
                                    console.error("Error setting viewingRecord from table", err);
                                  }
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-primary hover:border-primary/40 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                                title="View Full Ticket Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    loadRecordForEdit(r);
                                  } catch (err) {
                                    console.error("Error calling loadRecordForEdit from table", err);
                                  }
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-amber-600 hover:border-amber-400 hover:bg-amber-50 transition-colors shadow-2xs cursor-pointer"
                                title="Edit Inward Ticket"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    handleDeleteRecord(r.id, r.vehicle_number).catch(err => console.error("Delete record handler error", err));
                                  } catch (err) {
                                    console.error("Error invoking handleDeleteRecord", err);
                                  }
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-rose-600 hover:border-rose-400 hover:bg-rose-50 transition-colors shadow-2xs cursor-pointer"
                                title="Delete Inward Ticket"
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
