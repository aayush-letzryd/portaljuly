import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  Calendar, MapPin, User, Phone, FileText, CheckCircle, 
  Clock, ArrowLeft, Download, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, AlertTriangle, ShieldCheck, Filter, Plus, ChevronLeft, ChevronRight, Eye, EyeOff, Database, ChevronDown
} from "lucide-react";
import { WalkInRecord, User as UserSession, CITIES, OnboardingOutcome } from "../types";
import CameraCapture from "./CameraCapture";

interface WalkInFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

// Minimal hook to debounce search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

// MASKING FUNCTION: Masks all but the last 4 digits of sensitive IDs
const maskSensitiveID = (idString: string | null | undefined) => {
  if (!idString) return "—";
  const cleanStr = idString.replace(/\s/g, ''); // Remove spaces
  if (cleanStr.length <= 4) return cleanStr;
  return "*".repeat(cleanStr.length - 4) + cleanStr.slice(-4);
};

const normalizeCity = (cityVal: string): string => {
  if (!cityVal) return "Hyderabad";
  const c = cityVal.toLowerCase().trim();
  if (c === "blr" || c === "bangalore" || c === "bengaluru") return "Bangalore";
  if (c === "hyd" || c === "hyderabad") return "Hyderabad";
  if (c === "mum" || c === "mumbai") return "Mumbai";
  return "Hyderabad"; // Fallback
};

const ensureISOUTC = (dateStr?: string): string | undefined => {
  if (!dateStr) return undefined;
  let str = dateStr.trim();
  if ((str.includes("T") || str.includes(" ")) && !str.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    str = str.replace(" ", "T") + "Z";
  }
  return str;
};

const formatDisplayDate = (createdAt?: string, fallbackDate?: string): string => {
  const isoStr = ensureISOUTC(createdAt);
  if (isoStr) {
    try {
      const d = new Date(isoStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
      }
    } catch (e) {}
  }
  return fallbackDate || "—";
};

const formatDisplayTime = (createdAt?: string, fallbackTime?: string): string => {
  const isoStr = ensureISOUTC(createdAt);
  if (isoStr) {
    try {
      const d = new Date(isoStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toLowerCase();
      }
    } catch (e) {}
  }
  return fallbackTime || "—";
};

const PRESET_TAGS: Record<string, string[]> = {
  Driver: [
    "Driver Manager (DM) Meet",
    "Complaint",
    "Payout & Earnings",
    "Vehicle Issue & Repair",
    "Vehicle Return / Swap",
    "App & Login Issue",
    "Fastag & Toll Issue",
    "Challan & Fine Issue",
    "Document Update",
    "Shift / Hub Transfer"
  ],
  Operator: [
    "Driver Manager (DM) Meet",
    "Complaint",
    "Hisaab & Payout",
    "Adding New Vehicle to Fleet",
    "Vehicle Offboarding / Return",
    "Vehicle Related Issue",
    "Driver Related Issue",
    "GPS & Device Issue",
    "Maintenance Related Issue",
    "Account & Contract Issue"
  ]
};

export default function WalkInForm({ 
  user, 
  onBackToSelector, 
  onLogout
}: WalkInFormProps) {
  
  // RBAC Security Lock & City Scoping
  const isReadOnly = user.role_code === "SP";
  const isGlobalRole = ["SA", "BH", "FL", "FE", "AU"].includes(user.role_code);
  const userAssignedCity = normalizeCity(user.city || "Hyderabad");
  
  // Default to registry if user is read-only
  const [activeTab, setActiveTab] = useState<"form" | "registry" | "drafts">(isReadOnly ? "registry" : "form");
  
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
  
  const [enquiryDate, setEnquiryDate] = useState<string>("");
  const [enquiryTime, setEnquiryTime] = useState<string>("");
  const [visitingReason, setVisitingReason] = useState<string>("Onboarding");
  
  const [city, setCity] = useState("Hyderabad");
  const [personNumber, setPersonNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dlNumber, setDlNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [showDl, setShowDl] = useState(false);
  
  const [interestedPosition, setInterestedPosition] = useState<string>("Driver");
  // Tracking Lead Channel & Details
  const [leadChannel, setLeadChannel] = useState<string>("Direct Walk-in");
  const [leadChannelDetails, setLeadChannelDetails] = useState<string>("");
  const [leadSource, setLeadSource] = useState<string>("Direct Walk-in");
  
  const [referredByName, setReferredByName] = useState("");
  const [referredByPhone, setReferredByPhone] = useState("");
  const [operatingPlace, setOperatingPlace] = useState("");
  // Partner & Visit Logger state
  const [partnerType, setPartnerType] = useState<"Driver" | "Operator" | "Vendor">("Driver");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [visitNotes, setVisitNotes] = useState<string>("");
  const [isExistingPartner, setIsExistingPartner] = useState<boolean>(false);
  const [partnerCode, setPartnerCode] = useState<string>("");
  const [isTagsDropdownOpen, setIsTagsDropdownOpen] = useState<boolean>(false);
  const [customTagInput, setCustomTagInput] = useState<string>("");
  const [showCustomTagInput, setShowCustomTagInput] = useState<boolean>(false);

  const handleAddCustomTag = () => {
    const tagToAdd = customTagInput.trim();
    if (tagToAdd && !selectedTags.includes(tagToAdd)) {
      setSelectedTags([...selectedTags, tagToAdd]);
    }
    setCustomTagInput("");
    setShowCustomTagInput(false);
  };

  // Candidate Visit History & Profile Auto-fill state
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateMsg, setDuplicateMsg] = useState("");
  const [foundWalkinRecord, setFoundWalkinRecord] = useState<any | null>(null);
  const [autoFillApplied, setAutoFillApplied] = useState(false);
  const [candidateHistory, setCandidateHistory] = useState<any[]>([]);
  const [fetchBannerMsg, setFetchBannerMsg] = useState<string>("");
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [isFormReadOnly, setIsFormReadOnly] = useState<boolean>(false);

  const applyRecordAutoFill = (match: any) => {
    setFirstName(match.first_name || match.person_name?.split(" ")[0] || "");
    setLastName(match.last_name || match.person_name?.split(" ").slice(1).join(" ") || "");
    if (match.dl_number) setDlNumber(match.dl_number);
    if (match.aadhaar_number) setAadhaarNumber(match.aadhaar_number);
    if (match.city) setCity(normalizeCity(match.city));
    if (match.aadhaar_image) setAadhaarImage(match.aadhaar_image);
    if (match.dl_image) setDlImage(match.dl_image);
    if (match.visitor_type) setInterestedPosition(match.visitor_type);
    
    const isOnboardedOrExisting = Boolean(
      match.is_existing_partner ||
      match.record_type === 'existing' ||
      match.id?.startsWith('O-') ||
      match.joined_status === "Successfully Onboarded"
    );
    setIsExistingPartner(isOnboardedOrExisting);
    if (match.partner_type || match.visitor_type) setPartnerType((match.partner_type || match.visitor_type).includes("Operator") ? "Operator" : "Driver");

    // For non-partner candidates, load existing record ID for inline edit (1 record rule)
    if (!isOnboardedOrExisting && match.id && (match.id.startsWith?.("N") || typeof match.id === "number")) {
      setEditingId(match.id);
    } else {
      setEditingId(null);
    }

    setFoundWalkinRecord(match);
    setAutoFillApplied(true);
  };

  const applyWalkinAutoFill = () => {
    if (foundWalkinRecord) applyRecordAutoFill(foundWalkinRecord);
  };

  // Fetch button handler — fetches candidate profile & prior visits, auto-fills into NEW visit form
  const handleFetchByPhone = async () => {
    const cleanPhone = personNumber.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      alert("Please enter a valid 10-digit Indian phone number.");
      return;
    }
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/walkins/search?q=${cleanPhone}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const match = data[0];
          const priorVisits = data.filter((r: any) => r.id && (r.id.startsWith("E") || r.id.startsWith("N")));
          applyRecordAutoFill(match);
          setCandidateHistory(priorVisits);

          const isEx = Boolean(match.is_existing_partner || match.record_type === "existing" || match.id?.startsWith("O") || match.id?.startsWith("E"));
          const name = match.person_name || "Partner";
          if (isEx) {
            setFetchBannerMsg(priorVisits.length > 0 ? `Found Onboarded Partner: ${name} (${priorVisits.length} prior visit${priorVisits.length > 1 ? 's' : ''})` : `Found Onboarded Partner: ${name}`);
          } else {
            setFetchBannerMsg(priorVisits.length > 0 ? `Found Candidate: ${name} (${priorVisits.length} prior visit${priorVisits.length > 1 ? 's' : ''})` : `Found Candidate: ${name}`);
          }
          setIsDuplicate(false);
          setDuplicateMsg("");
        } else {
          setCandidateHistory([]);
          setFetchBannerMsg(`No prior records found for ${cleanPhone}`);
          setIsDuplicate(false);
          setDuplicateMsg("");
        }
      } else {
        console.warn("Search API returned non-OK status", res.status);
      }
    } catch (e) {
      console.error("Fetch error", e);
    }
  };

  const [joinedStatus, setJoinedStatus] = useState<OnboardingOutcome>("Onboarding Process Initiated");
  const [remarks, setRemarks] = useState("");

  // Document Uploads / Camera State
  const [aadhaarImage, setAadhaarImage] = useState<string | null>(null);
  const [dlImage, setDlImage] = useState<string | null>(null);
  const [cameraActiveField, setCameraActiveField] = useState<"aadhaar" | "dl" | null>(null);

  // Registry Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterRecordType, setFilterRecordType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTimePeriod, setFilterTimePeriod] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Quick Search for "Retrieve"
  const [searchRetrieveQuery, setSearchRetrieveQuery] = useState("");
  const debouncedRetrieveQuery = useDebounce(searchRetrieveQuery, 500);
  const [retrieveResults, setRetrieveResults] = useState<any[]>([]);
  const [isRetrieveFocused, setIsRetrieveFocused] = useState(false);

  // Initials for avatar
  const displayName = user.name || user.username || "User";
  const initials = displayName.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();

  const [records, setRecords] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ total: 0, joined: 0, pending: 0, individuals: 0, operators: 0, conversionRate: 0 });

  // Init defaults
  useEffect(() => {
    if (!editingId && !enquiryDate) {
      const now = new Date();
      setEnquiryDate(now.toISOString().split("T")[0]);
      setEnquiryTime(now.toTimeString().slice(0, 5));
    }
  }, [editingId, enquiryDate]);

  // AUTO-FILL & CANDIDATE LOOKUP LOGIC
  useEffect(() => {
    const checkExistingPhone = async () => {
      const cleanPhone = personNumber.replace(/\D/g, "");
      if (cleanPhone.length === 10 && !editingId && !isReadOnly) {
        try {
          const token = localStorage.getItem("lr_token");
          const res = await fetch(`/api/walkins/search?q=${cleanPhone}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              const match = data[0]; 
              const priorVisits = data.filter((r: any) => r.id && (r.id.startsWith("E") || r.id.startsWith("N")));
              applyRecordAutoFill(match);
              setCandidateHistory(priorVisits);

              const isEx = Boolean(match.is_existing_partner || match.record_type === "existing" || match.id?.startsWith("O") || match.id?.startsWith("E"));
              const name = match.person_name || "Partner";
              if (isEx) {
                setFetchBannerMsg(priorVisits.length > 0 ? `Found Onboarded Partner: ${name} (${priorVisits.length} prior visit${priorVisits.length > 1 ? 's' : ''})` : `Found Onboarded Partner: ${name}`);
              } else {
                setFetchBannerMsg(priorVisits.length > 0 ? `Found Candidate: ${name} (${priorVisits.length} prior visit${priorVisits.length > 1 ? 's' : ''})` : `Found Candidate: ${name}`);
              }
              setIsDuplicate(false);
              setDuplicateMsg("");
            } else {
              setIsDuplicate(false);
              setDuplicateMsg("");
              setCandidateHistory([]);
              setFoundWalkinRecord(null);
              setFetchBannerMsg("");
              setAutoFillApplied(false);
            }
          }
        } catch (e) {
          console.error("Error checking candidate details", e);
        }
      } else if (personNumber.replace(/\D/g, "").length < 10) {
        setIsDuplicate(false);
        setDuplicateMsg("");
        setCandidateHistory([]);
        setFoundWalkinRecord(null);
        setFetchBannerMsg("");
        setAutoFillApplied(false);
      }
    };
    
    const timeoutId = setTimeout(() => {
      checkExistingPhone();
    }, 400);
    
    return () => clearTimeout(timeoutId);
  }, [personNumber, editingId, isReadOnly]);

  const fetchData = async (pageNum = 1) => {
    try {
      const token = localStorage.getItem("lr_token");
      const headers = { "Authorization": `Bearer ${token}` };
      
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      if (filterCity !== "all") queryParams.append("city", filterCity);
      if (filterType !== "all") queryParams.append("visitor_type", filterType);
      if (filterRecordType !== "all") queryParams.append("record_type", filterRecordType);
      if (filterStatus !== "all") queryParams.append("status", filterStatus);
      if (filterTimePeriod !== "all") queryParams.append("time_period", filterTimePeriod);
      if (filterTimePeriod === "custom") {
        if (customStartDate) queryParams.append("from_date", customStartDate);
        if (customEndDate) queryParams.append("to_date", customEndDate);
      }
      queryParams.append("page", pageNum.toString());
      queryParams.append("limit", "10");
      
      const [recordsRes, statsRes] = await Promise.all([
        fetch(`/api/walkins?${queryParams.toString()}`, { headers }),
        fetch(`/api/stats?${queryParams.toString()}`, { headers })
      ]);
      
      if (recordsRes.ok) {
        const data = await recordsRes.json();
        setRecords(data.items || []);
        setTotalRecords(data.total || 0);
      }
      if (statsRes.ok) {
        const s = await statsRes.json();
        setMetrics({
          total: s.total,
          joined: s.joined,
          pending: s.pending,
          individuals: s.individuals,
          operators: s.operators,
          conversionRate: s.conversion_rate
        });
      }
    } catch (e) {
      console.error("Error fetching data", e);
    }
  };

  const [draftRecords, setDraftRecords] = useState<any[]>([]);
  const [draftCount, setDraftCount] = useState(0);

  const fetchDrafts = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/walkins?status=Draft&time_period=all&limit=100`, { headers: { "Authorization": `Bearer ${token}` }});
      if (res.ok) {
        const data = await res.json();
        setDraftRecords(data.items || []);
        setDraftCount(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!isReadOnly) fetchDrafts();
  }, [activeTab, isReadOnly]);

  useEffect(() => {
    fetchData(page);
  }, [searchQuery, filterCity, filterType, filterRecordType, filterStatus, filterTimePeriod, customStartDate, customEndDate, page]);

  useEffect(() => {
    if (debouncedRetrieveQuery.trim().length > 1 && !isReadOnly) {
      fetch(`/api/walkins/search?q=${encodeURIComponent(debouncedRetrieveQuery)}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("lr_token")}` }
      })
      .then(res => res.json())
      .then(data => setRetrieveResults(data || []))
      .catch(() => setRetrieveResults([]));
    } else {
      setRetrieveResults([]);
    }
  }, [debouncedRetrieveQuery, isReadOnly]);

  const handleDeleteRecord = async (id: number) => {
    if (isReadOnly) return;
    try {
      const res = await fetch(`/api/walkins/${id}`, {
        method: 'DELETE',
        headers: { "Authorization": `Bearer ${localStorage.getItem("lr_token")}` }
      });
      if (!res.ok) throw new Error("Failed to delete record");
      await fetchData(page);
      if (activeTab === "drafts") await fetchDrafts();
    } catch (e: any) {
      alert(e.message || "Error deleting record");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent | null, isDraft = false) => {
    if (e) e.preventDefault();
    if (isReadOnly) return;

    let cleanPhone = personNumber ? personNumber.trim() : "";
    
    if (!isDraft) {
      // Only validate Lead Channel & docs for NEW candidates, not existing partners
      if (!isExistingPartner) {
        if (!leadChannel) {
          alert("Please select a Lead Channel.");
          return;
        }
        if (!leadChannelDetails || !leadChannelDetails.trim()) {
          alert("Please enter Lead Channel Name / Details.");
          return;
        }
      }

      if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
        alert("Please enter a valid 10-digit Indian phone number.");
        return;
      }
    }

    let cleanAadhaar = aadhaarNumber ? aadhaarNumber.replace(/\s/g, "") : "";
    if (!isDraft && !isExistingPartner) {
      if (cleanAadhaar && !/^[0-9]{12}$/.test(cleanAadhaar)) {
        alert("Aadhaar Card must be exactly 12 digits.");
        return;
      }
    }

    const payload = {
      visitor_type: partnerType || interestedPosition || 'Driver',
      event_date: enquiryDate,
      enquiry_time: enquiryTime,
      city: city,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      person_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      person_number: cleanPhone || undefined,
      dl_number: dlNumber ? dlNumber.trim().toUpperCase() : undefined,
      aadhaar_number: cleanAadhaar ? cleanAadhaar.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3") : undefined,
      aadhaar_image: aadhaarImage || undefined,
      dl_image: dlImage || undefined,
      visiting_reason: visitingReason,
      operating_place: operatingPlace.trim() || undefined,
      mode_of_enquiry: leadChannel || 'Direct Walk-in',
      lead_channel: leadChannel || 'Direct Walk-in',
      lead_channel_details: leadChannelDetails.trim() || undefined,
      referred_by_name: leadChannel === "Driver Referral" ? (referredByName.trim() || undefined) : undefined,
      joined_status: isExistingPartner ? "Successfully Onboarded" : joinedStatus,
      submission_status: isDraft ? "Draft" : "Submitted",
      remarks: visitNotes.trim() || remarks.trim() || undefined,
      is_existing_partner: isExistingPartner,
      record_type: isExistingPartner ? 'existing' : 'new',
      partner_type: partnerType,
      partner_code: partnerCode,
      visit_tags: selectedTags,
      visit_notes: visitNotes.trim()
    };

    const url = editingId ? `/api/walkins/${editingId}` : "/api/walkins";
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("lr_token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || "Failed to save record");
      }

      resetForm();
      if (isDraft) {
        alert("Walk-in entry saved as draft!");
      } else {
        alert(editingId ? "Walk-In record updated successfully!" : "New Walk-In recorded successfully!");
      }
      
      await fetchData(1);
      setActiveTab(isDraft ? "drafts" : "registry");
    } catch (err: any) {
      alert(err.message || "Error saving record");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    const now = new Date();
    setEnquiryDate(now.toISOString().split("T")[0]);
    setEnquiryTime(now.toTimeString().slice(0, 5));
    setVisitingReason("Onboarding");
    setCity("Hyderabad");
    setOperatingPlace("");
    setFirstName("");
    setLastName("");
    setPersonNumber("");
    setDlNumber("");
    setAadhaarNumber("");
    setAadhaarImage(null);
    setDlImage(null);
    setInterestedPosition("Driver");
    setLeadChannel("Direct Walk-in");
    setLeadChannelDetails("");
    setLeadSource("Direct Walk-in");
    setReferredByName("");
    setReferredByPhone("");
    setJoinedStatus("Onboarding Process Initiated");
    setRemarks("");
    setIsDuplicate(false);
    setDuplicateMsg("");
    setCandidateHistory([]);
    setFetchBannerMsg("");
    setIsExistingPartner(false);
    setPartnerType("Driver");
    setPartnerCode("");
    setSelectedTags([]);
    setVisitNotes("");
    setIsTagsDropdownOpen(false);
    setCustomTagInput("");
    setShowCustomTagInput(false);
    setIsFormReadOnly(false);
  };

  const fetchRecordDetailsForEdit = async (id: number) => {
    if (isReadOnly) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/walkins/${id}`, { headers: { "Authorization": `Bearer ${token}` }});
      if (!res.ok) throw new Error("Failed to load details");
      const data = await res.json();
      setIsFormReadOnly(false);
      loadRecordIntoForm(data, id);
      setSearchRetrieveQuery("");
      setRetrieveResults([]);
      setIsRetrieveFocused(false);
    } catch (e) {
      alert("Error loading record details");
    }
  };

  const viewRecordInline = async (r: any) => {
    setIsFormReadOnly(true);
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/walkins/${r.id}`, { headers: { "Authorization": `Bearer ${token}` }});
      if (res.ok) {
        const fullData = await res.json();
        loadRecordIntoForm(fullData, r.id);
        const name = fullData.first_name ? `${fullData.first_name} ${fullData.last_name}`.trim() : fullData.person_name;
        setFetchBannerMsg(`Viewing record: ${name}`);
        return;
      }
    } catch (e) {}
    loadRecordIntoForm(r, r.id);
    const name = r.first_name ? `${r.first_name} ${r.last_name}`.trim() : r.person_name;
    setFetchBannerMsg(`Viewing record: ${name}`);
  };

  const formatTimeForInput = (timeStr: string) => {
    if (!timeStr) return "";
    const cleaned = timeStr.trim();
    if (/^\d{2}:\d{2}$/.test(cleaned)) return cleaned;
    const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const ampm = match[3] ? match[3].toUpperCase() : null;
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, "0")}:${minutes}`;
    }
    return timeStr;
  };

  // Map legacy visiting_reason values (saved before rename) to current dropdown values
  const normalizeLegacyVisitingReason = (reason: string, isExisting: boolean, pType: string): string => {
    if (!reason || reason === "None" || reason === "null") {
      return isExisting ? "Hisaab & Payout" : "Onboarding Inquiry";
    }
    // Legacy operator reasons → new simplified ones
    const operatorMap: Record<string, string> = {
      "Fleet Commission & Payout": "Hisaab & Payout",
      "Adding New Vehicles to Fleet": "Adding New Vehicle to Fleet",
      "Vehicle Offboarding / Return": "Vehicle Offboarding / Return",
      "Sub-Driver Assignment & Change": "Driver Related Issue",
      "GPS Tracker & Device Issue": "GPS & Device Issue",
      "Scheduled Fleet Maintenance": "Maintenance Related Issue",
      "Account & Contract Settlement": "Account & Contract Issue",
      "Vehicle Related Issue": "Vehicle Related Issue",
    };
    // Legacy driver reasons → new ones
    const driverMap: Record<string, string> = {
      "Payout & Earnings Issue": "Payout & Earnings",
      "Vehicle Breakdown / Repair": "Vehicle Issue & Repair",
      "Vehicle Return / Exchange": "Vehicle Return / Swap",
      "App Issue / Login": "App & Login Issue",
      "Fastag / Toll Issue": "Fastag & Toll Issue",
      "Challan / Fine": "Challan & Fine Issue",
      "Document Update / Submission": "Document Update",
      "Driver Manager (DM) Meet": "Others",
      "Onboarding Inquiry": "Onboarding Inquiry",
    };
    const map = pType === "Operator" ? operatorMap : driverMap;
    return map[reason] || reason;
  };

  const loadRecordIntoForm = (record: any, id: number) => {
    setEditingId(id);
    // Python booleans serialize as "True"/"False" strings, not JSON true/false
    const rawFlag = record.is_existing_partner;
    const isExisting = Boolean(
      record.record_type === 'existing' ||
      rawFlag === true ||
      rawFlag === "True" ||
      rawFlag === "true" ||
      record.partner_code ||
      (record.visit_notes && String(record.visit_notes).trim().length > 0 && record.visit_notes !== "None")
    );
    setIsExistingPartner(isExisting);
    
    const pType = (record.partner_type || record.visitor_type || "Driver").includes("Operator") ? "Operator" : "Driver";
    setPartnerType(pType as any);
    setInterestedPosition(pType as any);
    
    setEnquiryDate(record.event_date || record.created_at?.slice(0, 10) || "");
    setEnquiryTime(formatTimeForInput(record.enquiry_time || "10:30 AM"));
    setCity(normalizeCity(record.city || record.city_name));
    setOperatingPlace(record.operating_place || "");
    setFirstName(record.first_name || record.person_name?.split(" ")[0] || "");
    setLastName(record.last_name || record.person_name?.split(" ").slice(1).join(" ") || "");
    setPersonNumber(record.person_number || "");
    setDlNumber(record.dl_number || "");
    setAadhaarNumber(record.aadhaar_number || "");
    setAadhaarImage(record.aadhaar_image || null);
    setDlImage(record.dl_image || null);
    const rawReason = record.visiting_reason && record.visiting_reason !== "None" ? record.visiting_reason : "";
    setVisitingReason(normalizeLegacyVisitingReason(rawReason, isExisting, pType));
    const rawNotes = record.visit_notes && record.visit_notes !== "None" ? record.visit_notes : "";
    setVisitNotes(rawNotes || record.remarks || "");
    const rawLeadChannel = record.lead_channel && record.lead_channel !== "None" ? record.lead_channel : "Direct Walk-in";
    setLeadChannel(rawLeadChannel);
    const rawLeadDetails = record.lead_channel_details && record.lead_channel_details !== "None" ? record.lead_channel_details : "";
    setLeadChannelDetails(rawLeadDetails);
    setLeadSource(rawLeadChannel);
    setReferredByName(record.referred_by_name || "");
    setReferredByPhone(record.referred_by_phone || "");
    setJoinedStatus(record.joined_status || "Onboarding Process Initiated");
    setRemarks(record.remarks && record.remarks !== "None" ? record.remarks : "");

    setActiveTab("form");
  };

  const handlePhotoCaptured = (base64: string) => {
    if (cameraActiveField === "aadhaar") {
      setAadhaarImage(base64);
    } else if (cameraActiveField === "dl") {
      setDlImage(base64);
    }
    setCameraActiveField(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "aadhaar" | "dl") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          if (field === "aadhaar") {
            setAadhaarImage(reader.result);
          } else {
            setDlImage(reader.result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const headers = { "Authorization": `Bearer ${token}` };
      
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      if (filterCity !== "all") queryParams.append("city", filterCity);
      if (filterType !== "all") queryParams.append("visitor_type", filterType);
      if (filterRecordType !== "all") queryParams.append("record_type", filterRecordType);
      if (filterStatus !== "all") queryParams.append("status", filterStatus);
      if (filterTimePeriod !== "all") queryParams.append("time_period", filterTimePeriod);
      if (filterTimePeriod === "custom") {
        if (customStartDate) queryParams.append("from_date", customStartDate);
        if (customEndDate) queryParams.append("to_date", customEndDate);
      }
      queryParams.append("page", "1");
      queryParams.append("limit", "10000");

      const res = await fetch(`/api/walkins?${queryParams.toString()}`, { headers });
      if (!res.ok) {
        alert("Failed to fetch full dataset for export.");
        return;
      }
      const data = await res.json();
      const exportItems = data.items || [];

      if (exportItems.length === 0) {
        alert("No entries available to export.");
        return;
      }

      const escapeCSV = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const csvHeaders = [
        "Walk-in ID",
        "Record Category",
        "Candidate Full Name",
        "First Name",
        "Last Name",
        "Phone Number",
        "Operating City",
        "Operating Place / Hub",
        "Position / Category",
        "Driving License",
        "Aadhaar Number",
        "Visiting Reason",
        "Lead Channel / Source",
        "Lead Channel Details",
        "Referred By Name",
        "Referred By Phone",
        "Outcome Status",
        "Submission Status",
        "Visit Notes & Summary",
        "Date Created (IST)",
        "Time Created (IST)",
        "Recorded By Name",
        "Recorded By User ID",
        "Last Edited Date (IST)",
        "Last Edited Time (IST)",
        "Last Edited By Name",
        "Last Edited By User ID"
      ];

      const csvRows = exportItems.map((r: any) => {
        const cDate = r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : (r.event_date || "");
        const cTime = r.created_at ? new Date(r.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : (r.enquiry_time || "");
        const uDate = r.updated_at ? new Date(r.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : cDate;
        const uTime = r.updated_at ? new Date(r.updated_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : cTime;

        return [
          escapeCSV(r.id),
          escapeCSV(r.record_type === 'existing' ? 'Existing Partner' : 'New Walk-In'),
          escapeCSV(r.person_name || `${r.first_name || ''} ${r.last_name || ''}`.trim()),
          escapeCSV(r.first_name || ''),
          escapeCSV(r.last_name || ''),
          escapeCSV(r.person_number || ''),
          escapeCSV(r.city || r.city_name || ''),
          escapeCSV(r.operating_place || ''),
          escapeCSV(r.visitor_type || ''),
          escapeCSV(r.dl_number || ''),
          escapeCSV(r.aadhaar_number || ''),
          escapeCSV(r.visiting_reason || ''),
          escapeCSV(r.lead_channel || r.mode_of_enquiry || ''),
          escapeCSV(r.lead_channel_details || ''),
          escapeCSV(r.referred_by_name || ''),
          escapeCSV(r.referred_by_phone || ''),
          escapeCSV(r.joined_status || ''),
          escapeCSV(r.submission_status || 'Submitted'),
          escapeCSV(r.visit_notes || r.remarks || ''),
          escapeCSV(cDate),
          escapeCSV(cTime),
          escapeCSV(r.executive_name || ''),
          escapeCSV(r.executive_id || ''),
          escapeCSV(uDate),
          escapeCSV(uTime),
          escapeCSV(r.updated_by_name || r.executive_name || ''),
          escapeCSV(r.updated_by || r.executive_id || '')
        ].join(",");
      });

      const csvString = [csvHeaders.join(","), ...csvRows].join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `walkin_leads_complete_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting CSV:", err);
      alert("An error occurred while generating CSV export.");
    }
  };

  const totalPages = Math.ceil(totalRecords / 10) || 1;

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-border bg-white shadow-xs">
        <div className="mx-auto flex h-16 max-w-[1650px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={onBackToSelector}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-slate-100 hover:text-primary transition-all cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <img 
              src="/letzryd_icon.png" 
              alt="LetzRyd" 
              className="h-9 w-auto object-contain cursor-pointer"
              onClick={onBackToSelector}
            />
            <span className="hidden h-5 border-l border-border sm:inline-block" />
            <span className="hidden font-sans text-xs font-semibold text-slate-700 sm:inline-block">
              Walk-In Form
            </span>
          </div>

          <nav className="flex gap-2">
            {!isReadOnly && (
              <button
                onClick={() => setActiveTab("form")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "form" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
              >
                <FileText className="h-4 w-4" />
                Walkin & Leads Form
              </button>
            )}

            <button
              onClick={() => setActiveTab("registry")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "registry" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <Database className="h-4 w-4" />
              Walk-In Registry
            </button>
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <div className="text-right">
              <span className="block text-[9px] font-bold text-text-dim">Current Time (IST)</span>
              <span className="font-sans text-xs font-bold text-primary tracking-tight">{currentTime}</span>
            </div>
            <span className="h-5 border-l border-border" />
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">{initials}</div>
              <div className="flex flex-col">
                <span className="font-sans text-xs font-semibold leading-none text-text">{user.name}</span>
                {isReadOnly ? (
                  <span className="font-mono text-[9px] text-red-500 mt-1 leading-none font-bold">Read Only</span>
                ) : (
                  <span className="font-mono text-[9px] text-text-muted mt-1 leading-none">ID: {user.executive_id || "-"}</span>
                )}
              </div>
            </div>
            <span className="h-5 border-l border-border" />
            <button onClick={onLogout} className="flex h-8 items-center px-3 text-xs border border-slate-200 rounded-lg bg-white text-text-muted hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer">Sign Out</button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-grow w-full max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 1: FORM */}
        {activeTab === "form" && !isReadOnly && (
          <div className="mx-auto max-w-5xl flex flex-col gap-6">
            
            <div className="relative z-30 overflow-visible rounded-2xl bg-primary p-6 text-white shadow-sm md:p-8">
              <div className="absolute inset-0 bg-radial-gradient from-white/20 to-transparent pointer-events-none" />
              <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <img src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" className="h-7 brightness-0 invert" alt="LetzRyd" referrerPolicy="no-referrer" />
                    <span className="px-2 py-0.5 rounded border border-white/30 bg-white/20 text-white text-[10px] font-bold tracking-widest backdrop-blur-sm">
                      {isFormReadOnly ? "View Only" : "LetzRyd Desk"}
                    </span>
                  </div>
                  <h1 className="font-sans text-2xl font-bold tracking-tight text-white">{isFormReadOnly ? `Walk-In Entry #${editingId}` : editingId ? `Edit Walk-in #${editingId}` : "Walkin & Leads Form"}</h1>
                </div>

                {isFormReadOnly && (
                  <button
                    type="button"
                    onClick={() => { resetForm(); setActiveTab("registry"); }}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-xl text-xs font-bold transition-all cursor-pointer backdrop-blur-xs flex items-center gap-1.5 shadow-2xs"
                  >
                    ← Back to Registry
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className={`rounded-2xl border border-border bg-white p-6 shadow-xs md:p-8 flex flex-col gap-8 ${isFormReadOnly ? "opacity-90 bg-slate-50/40" : ""}`}>
              
              {/* 1. Candidate Information (Top Section) */}
              <div className="flex flex-col gap-5 bg-slate-50/60 p-5 rounded-2xl border border-border">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white font-bold text-xs">1</div>
                  <h3 className="font-sans text-xs font-bold text-slate-800 uppercase tracking-wider">Candidate Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Row 1: Phone Number & Operating City */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-xs font-semibold text-slate-700">Phone Number *</label>
                    <div className="relative flex items-center">
                      <input type="tel" placeholder="Enter 10-digit number" required value={personNumber} onChange={(e) => setPersonNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full h-11 rounded-lg border border-border pl-3 pr-32 text-xs bg-white outline-none focus:border-primary text-slate-800" />
                      <div className="absolute right-1.5 top-1.5 bottom-1.5 flex items-center gap-1">
                        {personNumber && !isFormReadOnly && (
                          <button
                            type="button"
                            onClick={() => resetForm()}
                            className="px-2 h-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer"
                            title="Clear & Reset Form for New Candidate"
                          >
                            <X className="w-3.5 h-3.5" />
                            Clear
                          </button>
                        )}
                        {!isFormReadOnly && (
                          <button
                            type="button"
                            onClick={handleFetchByPhone}
                            className="px-3 h-full bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Search className="w-3.5 h-3.5" />
                            Fetch
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-xs font-semibold text-slate-700">Operating City *</label>
                    <select required value={city} onChange={(e) => setCity(e.target.value)} className="h-11 rounded-lg border border-border px-3 text-xs bg-white text-slate-800 outline-none focus:border-primary">
                      {CITIES.map((c) => <option key={c.value} value={c.value}>{c.text}</option>)}
                    </select>
                  </div>

                  {/* Row 2: First Name & Last Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-xs font-semibold text-slate-700">First Name *</label>
                    <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-11 rounded-lg border border-border px-3 text-xs bg-white text-slate-800 outline-none focus:border-primary" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-xs font-semibold text-slate-700">Last Name *</label>
                    <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-11 rounded-lg border border-border px-3 text-xs bg-white text-slate-800 outline-none focus:border-primary" />
                  </div>
                </div>

                {fetchBannerMsg && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div className="flex items-center gap-2.5 text-slate-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-semibold text-slate-800">{fetchBannerMsg}</span>
                    </div>
                    {candidateHistory.length > 0 && !isFormReadOnly && (
                      <button
                        type="button"
                        onClick={() => setShowHistoryModal(true)}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        View {candidateHistory.length} Prior Visit{candidateHistory.length > 1 ? 's' : ''} →
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Enquiry & Visit Details Section */}
              <div className="flex flex-col gap-5 bg-slate-50/60 p-5 rounded-2xl border border-border">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white font-bold text-xs">2</div>
                    <h3 className="font-sans text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Visit Details
                    </h3>
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="flex flex-col gap-1.5 md:col-span-3">
                      <label className="font-sans text-xs font-semibold text-slate-700">{isExistingPartner ? "Partner Category *" : "Interested Position *"}</label>
                      <select
                        value={partnerType}
                        onChange={(e) => setPartnerType(e.target.value as any)}
                        className="h-11 rounded-lg border border-border px-3 text-xs bg-white text-slate-800 outline-none focus:border-primary font-medium cursor-pointer"
                      >
                        <option value="Driver">Driver</option>
                        <option value="Operator">Operator</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5 md:col-span-5">
                      <label className="font-sans text-xs font-semibold text-slate-700">Visiting Reason *</label>
                      <select
                        required
                        value={visitingReason}
                        onChange={(e) => setVisitingReason(e.target.value)}
                        className="h-11 rounded-lg border border-border px-3 text-xs bg-white text-slate-800 outline-none focus:border-primary font-medium cursor-pointer"
                      >
                        {isExistingPartner ? (
                          <>
                            <option value="" disabled>Select Visiting Reason / Tag...</option>
                            {(PRESET_TAGS[partnerType] || PRESET_TAGS["Driver"]).map((tag) => (
                              <option key={tag} value={tag}>{tag}</option>
                            ))}
                            <option value="Others">Others</option>
                          </>
                        ) : (
                          <>
                            <option value="Onboarding Inquiry">Onboarding Inquiry</option>
                            <option value="Complaint">Complaint</option>
                            <option value="Driver Manager (DM) Meet">Driver Manager (DM) Meet</option>
                            <option value="Maintenance Related Issue">Maintenance Issue</option>
                            <option value="Others">Others</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="font-sans text-xs font-semibold text-slate-700">Enquiry Date *</label>
                      <input 
                        type="date" 
                        required 
                        readOnly
                        value={enquiryDate} 
                        className="h-11 rounded-lg border border-border px-3 text-xs bg-slate-100 text-slate-600 outline-none font-semibold cursor-not-allowed" 
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="font-sans text-xs font-semibold text-slate-700">Enquiry Time *</label>
                      <input 
                        type="time" 
                        required 
                        readOnly
                        value={enquiryTime} 
                        className="h-11 rounded-lg border border-border px-3 text-xs bg-slate-100 text-slate-600 outline-none font-semibold cursor-not-allowed" 
                      />
                    </div>

                    <div className="md:col-span-12 -mt-2">
                      <p className="font-sans text-[10px] font-normal text-slate-500">
                        This is the current date and time. The final submission timestamp will be recorded when you submit the form.
                      </p>
                    </div>
                  </div>

                  {/* Visit Notes & Summary for Existing Partners */}
                  {isExistingPartner && (
                    <div className="flex flex-col gap-1.5 pt-3 border-t border-slate-200">
                      <label className="font-sans text-xs font-semibold text-slate-700 flex justify-between">
                        <span>Visit Notes & Executive Summary (Max ~300 words) *</span>
                        <span className="text-[10px] text-slate-400">{visitNotes.length} / 1500 chars</span>
                      </label>
                      <textarea
                        rows={3}
                        maxLength={1500}
                        placeholder="Record detailed notes of discussion, complaint description, or resolution provided during this visit..."
                        value={visitNotes}
                        onChange={(e) => setVisitNotes(e.target.value)}
                        className="w-full rounded-xl border border-border p-3 text-xs bg-white outline-none focus:border-primary font-sans leading-relaxed"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Identity & Document Uploads (ONLY rendered for NEW Candidates; Suppressed for Existing Partners) */}
              {!isExistingPartner && (
                <div className="flex flex-col gap-5 bg-slate-50/60 p-5 rounded-2xl border border-border">
                  <div className="flex items-center gap-2 border-b border-border pb-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white font-bold text-xs">3</div>
                    <h3 className="font-sans text-xs font-bold text-slate-800 uppercase tracking-wider">Documents</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Aadhaar group */}
                    <div className="flex flex-col gap-2.5 p-4 bg-white border border-border rounded-xl">
                      <label className="font-sans text-xs font-semibold text-slate-700">1. Aadhaar Card</label>
                      <div className="relative w-full">
                        <input
                          type={showAadhaar ? "text" : "password"}
                          readOnly={isFormReadOnly || isReadOnly}
                          placeholder="Enter 12-digit Aadhaar Number"
                          value={aadhaarNumber}
                          onChange={(e) => setAadhaarNumber(e.target.value)}
                          className="h-11 w-full rounded-lg border border-border pl-3 pr-9 text-xs bg-white text-slate-800 outline-none focus:border-primary font-normal"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAadhaar(!showAadhaar)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-1"
                          title={showAadhaar ? "Mask Number" : "Unmask Number"}
                        >
                          {showAadhaar ? <EyeOff className="w-4 h-4 text-primary" /> : <Eye className="w-4 h-4 text-slate-500" />}
                        </button>
                      </div>

                      {aadhaarImage ? (
                        <div className="relative">
                          <img src={aadhaarImage} alt="Aadhaar" className="w-full h-16 object-cover rounded-lg border border-border" />
                          {!isFormReadOnly && <button type="button" onClick={() => setAadhaarImage(null)} className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow cursor-pointer text-red-500 hover:bg-red-50"><X className="w-3 h-3"/></button>}
                        </div>
                      ) : !isFormReadOnly ? (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setCameraActiveField("aadhaar")} className="flex-1 bg-slate-50 hover:bg-slate-100 text-xs py-2 rounded-lg text-center border border-border font-semibold text-slate-700 cursor-pointer transition-colors flex items-center justify-center gap-1.5"><Camera className="w-3.5 h-3.5 text-primary"/> Camera</button>
                          <label className="flex-1 bg-slate-50 hover:bg-slate-100 text-xs py-2 rounded-lg text-center border border-border font-semibold text-slate-700 cursor-pointer transition-colors flex items-center justify-center gap-1.5">
                            <Upload className="w-3.5 h-3.5 text-primary"/> File <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "aadhaar")} />
                          </label>
                        </div>
                      ) : null}
                    </div>

                    {/* DL group */}
                    <div className="flex flex-col gap-2.5 p-4 bg-white border border-border rounded-xl">
                      <label className="font-sans text-xs font-semibold text-slate-700">2. Driving License</label>
                      <div className="relative w-full">
                        <input
                          type={showDl ? "text" : "password"}
                          readOnly={isFormReadOnly || isReadOnly}
                          placeholder="Enter Driving License Number"
                          value={dlNumber}
                          onChange={(e) => setDlNumber(e.target.value)}
                          className="h-11 w-full rounded-lg border border-border pl-3 pr-9 text-xs bg-white text-slate-800 outline-none focus:border-primary font-normal"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDl(!showDl)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-1"
                          title={showDl ? "Mask Number" : "Unmask Number"}
                        >
                          {showDl ? <EyeOff className="w-4 h-4 text-primary" /> : <Eye className="w-4 h-4 text-slate-500" />}
                        </button>
                      </div>

                      {dlImage ? (
                        <div className="relative">
                          <img src={dlImage} alt="DL" className="w-full h-16 object-cover rounded-lg border border-border" />
                          <button type="button" onClick={() => setDlImage(null)} className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow cursor-pointer text-red-500 hover:bg-red-50"><X className="w-3 h-3"/></button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setCameraActiveField("dl")} className="flex-1 bg-slate-50 hover:bg-slate-100 text-xs py-2 rounded-lg text-center border border-border font-semibold text-slate-700 cursor-pointer transition-colors flex items-center justify-center gap-1.5"><Camera className="w-3.5 h-3.5 text-primary"/> Camera</button>
                          <label className="flex-1 bg-slate-50 hover:bg-slate-100 text-xs py-2 rounded-lg text-center border border-border font-semibold text-slate-700 cursor-pointer transition-colors flex items-center justify-center gap-1.5">
                            <Upload className="w-3.5 h-3.5 text-primary"/> File <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "dl")} />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Classifications & Outcome (ONLY rendered for NEW Candidates; Suppressed for Existing Partners) */}
              {!isExistingPartner && (
                <div className="flex flex-col gap-5 bg-slate-50/60 p-5 rounded-2xl border border-border">
                   <div className="flex items-center gap-2 border-b border-border pb-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white font-bold text-xs">4</div>
                      <h3 className="font-sans text-xs font-bold text-slate-800 uppercase tracking-wider">Classifications & Outcome</h3>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="font-sans text-xs font-semibold text-slate-700">Lead Channel *</label>
                            <select
                              required
                              value={leadChannel}
                              onChange={(e) => {
                                setLeadChannel(e.target.value);
                                setLeadSource(e.target.value);
                              }}
                              className="h-11 rounded-lg border border-border px-3 text-xs bg-white text-slate-800 outline-none focus:border-primary font-normal cursor-pointer"
                            >
                              <option value="Direct Walk-in">Direct Walk-in</option>
                              <option value="Telecaller">Telecaller</option>
                              <option value="FSE">FSE</option>
                              <option value="Vendor">Vendor</option>
                              <option value="Driver Referral">Driver Referral</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="font-sans text-xs font-semibold text-slate-700">
                            Lead Channel Name / Details *
                          </label>
                          <input
                            type="text"
                            required
                            value={leadChannelDetails}
                            onChange={(e) => setLeadChannelDetails(e.target.value)}
                            placeholder={
                              leadChannel === "Direct Walk-in" ? "Enter Walk-in Location / Branch / Hub / Notes" :
                              leadChannel === "Telecaller" ? "Enter Telecaller Name / Agent ID" :
                              leadChannel === "FSE" ? "Enter FSE Name / Agent ID" :
                              leadChannel === "Vendor" ? "Enter Vendor / Partner Agency Name" :
                              leadChannel === "Driver Referral" ? "Enter Referrer Driver Details (Name / ID / Phone)" :
                              "Enter Lead Channel Details"
                            }
                            className="h-11 rounded-lg border border-border px-3 text-xs bg-white text-slate-800 outline-none focus:border-primary font-normal"
                          />
                        </div>

                        {leadChannel === "Driver Referral" && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-xs font-semibold text-slate-700">Referred By (Name) *</label>
                              <input type="text" required value={referredByName} onChange={(e) => setReferredByName(e.target.value)} className="h-11 rounded-lg border border-border px-3 text-xs bg-white text-slate-800 outline-none focus:border-primary font-normal" placeholder="Referrer Name" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="font-sans text-xs font-semibold text-slate-700">Referred By (Phone) *</label>
                              <input type="tel" required value={referredByPhone} onChange={(e) => setReferredByPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="h-11 rounded-lg border border-border px-3 text-xs bg-white text-slate-800 outline-none focus:border-primary font-normal" placeholder="10-digit Phone" />
                            </div>
                          </div>
                        )}
                     </div>

                     <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="font-sans text-xs font-semibold text-slate-700">Status *</label>
                          <select required value={joinedStatus} onChange={(e) => setJoinedStatus(e.target.value as OnboardingOutcome)} className="h-11 rounded-lg border border-border px-3 text-xs bg-white text-slate-800 outline-none focus:border-primary font-normal cursor-pointer">
                              <option value="Onboarding Process Initiated">Onboarding Process Initiated</option>
                              <option value="Successfully Onboarded">Successfully Onboarded</option>
                              <option value="Follow Up Required">Follow Up Required</option>
                              <option value="No Follow Up Required / Closed">No Follow Up Required / Closed</option>
                              <option value="Others">Others</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="font-sans text-xs font-semibold text-slate-700">Remarks</label>
                          <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full rounded-lg border border-border p-3 text-xs bg-white text-slate-800 outline-none focus:border-primary font-normal resize-none" placeholder="Enter optional remarks..." />
                        </div>
                     </div>
                  </div>
               </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2 pt-6 border-t border-border">
                <p className="text-[10px] font-bold text-red-500">* Mandatory Fields</p>

                {/* Duplicate warning banner */}
                {isDuplicate && !isFormReadOnly && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-bold">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{duplicateMsg || "Already filled."}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  {isFormReadOnly ? (
                    <button
                      type="button"
                      onClick={() => { resetForm(); setActiveTab("registry"); }}
                      className="h-11 rounded-lg border border-border bg-slate-900 text-white px-6 font-sans text-xs font-bold hover:bg-slate-800 cursor-pointer shadow-xs transition-colors"
                    >
                      ← Back to Registry
                    </button>
                  ) : (
                    <>
                      {editingId && <button type="button" onClick={() => { resetForm(); setActiveTab("registry"); }} className="h-11 rounded-lg border border-border bg-white px-5 font-sans text-sm font-semibold text-text-muted hover:bg-slate-100 cursor-pointer">Cancel Edit</button>}

                      <button 
                        type="submit" 
                        className="h-11 rounded-lg bg-primary hover:bg-primary-hover text-white px-6 font-sans text-sm font-semibold shadow-md cursor-pointer transition-colors"
                      >
                        {editingId ? "Update Entry" : "Submit Visit"}
                      </button>
                    </>
                  )}
                </div>
              </div>

            </form>
          </div>
        )}

        {/* TAB 2: REGISTRY */}

        {activeTab === "registry" && (
          <div className="flex flex-col gap-8">

            {/* Filter Toolbars */}
            <div className="bg-white rounded-xl shadow-xs border border-border p-4 grid grid-cols-1 gap-3 sm:grid-cols-5 items-center">
              <div className="relative col-span-1 sm:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
                <input
                  type="text"
                  placeholder="Search candidate, phone, DL, ID..."
                  value={searchQuery}
                  onChange={(e) => {setSearchQuery(e.target.value); setPage(1);}}
                  className="h-10 w-full rounded-lg border border-border pl-9 pr-4 font-sans text-xs text-text bg-white outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="relative">
                <select 
                  value={filterRecordType} 
                  onChange={(e) => {setFilterRecordType(e.target.value); setPage(1);}} 
                  className="h-10 w-full rounded-lg border border-border px-3 font-sans text-xs text-text bg-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="all">All Walk-Ins</option>
                  <option value="new">New Candidate Walk-Ins</option>
                  <option value="existing">Existing Partner Visits</option>
                </select>
              </div>

              <div className="relative">
                <select value={filterTimePeriod} onChange={(e) => {setFilterTimePeriod(e.target.value); setPage(1);}} className="h-10 w-full rounded-lg border border-border px-3 font-sans text-xs text-text bg-white outline-none focus:border-primary cursor-pointer">
                  <option value="all">All Time</option>
                  <option value="beginning_of_month">This Month</option>
                  <option value="last_1_month">Last 1 Month</option>
                  <option value="this_quarter">This Quarter</option>
                  <option value="this_year">This Year</option>
                  <option value="last_1_year">Last 1 Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              <div className="relative">
                <select 
                  value={filterCity} 
                  onChange={(e) => {setFilterCity(e.target.value); setPage(1);}} 
                  className="h-10 w-full rounded-lg border border-border px-3 font-sans text-xs text-text bg-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="all">All Cities</option>
                  {CITIES.map(c => <option key={c.value} value={c.value}>{c.text}</option>)}
                </select>
              </div>



              {filterTimePeriod === "custom" && (
                <div className="col-span-1 sm:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-[10px] font-bold text-text-dim uppercase tracking-wider">From Date</label>
                    <input 
                      type="date" 
                      value={customStartDate} 
                      onChange={(e) => { setCustomStartDate(e.target.value); setPage(1); }} 
                      className="h-9 w-full rounded-lg border border-border px-3 font-sans text-xs text-text bg-white outline-none focus:border-primary cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-[10px] font-bold text-text-dim uppercase tracking-wider">To Date</label>
                    <input 
                      type="date" 
                      value={customEndDate} 
                      onChange={(e) => { setCustomEndDate(e.target.value); setPage(1); }} 
                      className="h-9 w-full rounded-lg border border-border px-3 font-sans text-xs text-text bg-white outline-none focus:border-primary cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>



            {/* Records Card */}
            <div className="rounded-2xl border border-border bg-white shadow-xs overflow-hidden">
              
              <div className="border-b border-border p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-sans text-lg font-bold text-slate-900 tracking-tight">Walk-In Registry</h3>
                  <p className="font-sans text-xs text-text-muted mt-1">Search, Edit, Follow up and review on Walk-in leads</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleExportCSV} className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-white hover:bg-slate-50 px-4 font-sans text-xs font-semibold text-text-muted transition-colors cursor-pointer shadow-2xs"><Download className="h-4 w-4" /> Export CSV</button>
                  {/* RBAC: Hide "Add Walk-In" button if user is read-only */}
                  {!isReadOnly && (
                    <button onClick={() => { resetForm(); setActiveTab("form"); }} className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary hover:bg-primary-hover px-4 font-sans text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"><Plus className="h-4 w-4" /> Add Walk-In</button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border/60">
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Walk-in ID</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Candidate Name</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">City</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Position</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Recorded By</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date & Time Created</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Edited At</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Edited By</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {records.length === 0 ? (
                      <tr><td colSpan={10} className="px-6 py-12 text-center text-text-muted font-sans bg-slate-50/50 text-[11px]">No records found.</td></tr>
                    ) : (
                      records.map((r) => {
                        const createdDate = formatDisplayDate(r.created_at, r.event_date);
                        const createdTime = formatDisplayTime(r.created_at, r.enquiry_time);
                        
                        const updatedDate = formatDisplayDate(r.updated_at || r.created_at, createdDate);
                        const updatedTime = formatDisplayTime(r.updated_at || r.created_at, createdTime);

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors text-[11px] font-sans">
                            <td className="px-4 py-3 font-mono font-bold text-slate-900">{r.id}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">
                              {r.first_name ? `${r.first_name} ${r.last_name}`.trim() : (r.person_name || 'N/A')}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700">{normalizeCity(r.city || r.city_name)}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{r.person_number || 'N/A'}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-slate-800">{r.visitor_type}</span>
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded w-max ${r.record_type === 'existing' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                  {r.record_type === 'existing' ? 'Existing Partner' : 'New Walk-In'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900">{r.executive_name || 'Admin'}</div>
                              <div className="text-slate-400 text-[10px] font-medium">ID: {r.executive_id || r.created_by || 3}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-800">{createdDate}</div>
                              <div className="text-slate-400 text-[10px] font-medium">{createdTime}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-800">{updatedDate}</div>
                              <div className="text-slate-400 text-[10px] font-medium">{updatedTime}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-800">{r.updated_by ? (r.updated_by_name || r.executive_name || 'Admin') : (r.executive_name || 'Admin')}</div>
                              <div className="text-slate-400 text-[10px] font-medium">ID: {r.updated_by ? r.updated_by : (r.executive_id || r.created_by || 3)}</div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex gap-1.5 justify-center">
                                <button type="button" onClick={() => viewRecordInline(r)} className="rounded-lg p-1 border border-border bg-white text-slate-600 hover:text-primary hover:bg-slate-50 transition-all cursor-pointer" title="View Full Details"><Eye className="h-3.5 w-3.5" /></button>
                                {!isReadOnly && (
                                  <>
                                    <button type="button" onClick={() => fetchRecordDetailsForEdit(r.id)} className="rounded-lg p-1 border border-border bg-white text-slate-600 hover:text-primary hover:bg-slate-50 transition-all cursor-pointer" title="Edit Entry"><Edit className="h-3.5 w-3.5" /></button>
                                    <button type="button" onClick={() => { if (window.confirm('Delete this record?')) handleDeleteRecord(r.id); }} className="rounded-lg p-1 border border-border bg-white text-slate-600 hover:text-rose-500 hover:bg-rose-50 border-rose-200 transition-all cursor-pointer" title="Delete Entry"><Trash2 className="h-3.5 w-3.5" /></button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="bg-slate-50 p-4 border-t border-border/40 flex items-center justify-between text-xs font-sans">
                <span className="text-text-dim">Showing {(page-1)*10 + 1} - {Math.min(page*10, totalRecords)} of {totalRecords} records</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 px-3 rounded border border-border bg-white disabled:opacity-50 flex items-center cursor-pointer transition-colors hover:bg-slate-100"><ChevronLeft className="w-3 h-3 mr-1" /> Prev</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalRecords === 0} className="h-8 px-3 rounded border border-border bg-white disabled:opacity-50 flex items-center cursor-pointer transition-colors hover:bg-slate-100">Next <ChevronRight className="w-3 h-3 ml-1" /></button>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {showHistoryModal && candidateHistory.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="font-sans text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Prior Visit History ({candidateHistory.length} Record{candidateHistory.length > 1 ? 's' : ''})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-4">
              {candidateHistory.map((v, idx) => {
                const rawDateStr = v.event_date || v.created_at || "";
                const cleanDateStr = rawDateStr.split(" ")[0].split("T")[0];
                const cleanTimeStr = v.enquiry_time || (rawDateStr.includes(" ") ? rawDateStr.split(" ")[1].slice(0, 5) : "");
                let formattedDisplayDate = cleanDateStr;
                try {
                  if (cleanDateStr && cleanDateStr.length >= 8) {
                    formattedDisplayDate = new Date(cleanDateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                  }
                } catch (e) {}

                const isExisting = v.record_type === 'existing' || v.id?.startsWith('E');

                return (
                  <div key={v.id || idx} className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col gap-3.5 shadow-2xs hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-sans text-xs font-bold text-slate-900">Visit #{candidateHistory.length - idx}</span>
                        <span className="font-sans text-xs font-medium text-slate-500">(ID: {v.id})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          isExisting ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {isExisting ? 'Existing Partner Visit' : (v.joined_status || 'Candidate Walk-in')}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setShowHistoryModal(false); viewRecordInline(v); }}
                          className="rounded-lg px-2.5 py-1 border border-slate-200 bg-white text-slate-700 hover:text-primary hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
                          title="View Record in Form"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => { setShowHistoryModal(false); fetchRecordDetailsForEdit(v.id); }}
                            className="rounded-lg px-2.5 py-1 border border-slate-200 bg-white text-slate-700 hover:text-primary hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
                            title="Edit Record in Form"
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Reason</span>
                        <span className="font-semibold text-slate-800">{v.visiting_reason || 'Hub Visit'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Partner Type</span>
                        <span className="font-semibold text-slate-800">{v.visitor_type || v.partner_type || 'Driver'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">City</span>
                        <span className="font-semibold text-slate-800">{normalizeCity(v.city)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Date & Time</span>
                        <span className="font-semibold text-slate-800">{formattedDisplayDate} {cleanTimeStr}</span>
                      </div>
                    </div>

                    {v.visit_tags && (
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          try {
                            const parsed = typeof v.visit_tags === 'string' ? (v.visit_tags.startsWith('[') ? JSON.parse(v.visit_tags) : [v.visit_tags]) : (Array.isArray(v.visit_tags) ? v.visit_tags : [String(v.visit_tags)]);
                            return (Array.isArray(parsed) ? parsed : [String(parsed)]).map((tag: string) => (
                              <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {tag}
                              </span>
                            ));
                          } catch (e) {
                            return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">{String(v.visit_tags)}</span>;
                          }
                        })()}
                      </div>
                    )}

                    {(v.visit_notes || v.remarks) && (
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
                        <span className="font-semibold text-slate-900 block mb-0.5 text-[11px]">Visit Notes / Remarks:</span>
                        {v.visit_notes || v.remarks}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-3 border-t border-border bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}



      {cameraActiveField && (
        <CameraCapture
          title={`Capture ${cameraActiveField === "aadhaar" ? "Aadhaar" : "DL"} Photo`}
          onCapture={handlePhotoCaptured}
          onClose={() => setCameraActiveField(null)}
        />
      )}

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