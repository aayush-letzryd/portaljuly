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

const PRESET_TAGS: Record<string, string[]> = {
  Driver: [
    "Payment / Payout Dispute",
    "Plan Inquiry (Drive to Rent/Own)",
    "Vehicle Swap / Issue",
    "App / Login Technical Issue",
    "Fastag / Toll Balance Query",
    "Penalty / Fine Waiver Request",
    "Shift Timing Change",
    "Document Resubmission"
  ],
  Operator: [
    "Multi-Vehicle Remittance",
    "Fleet Expansion / Adding Cars",
    "Sub-Driver Assignment / Swap",
    "Operator Commission Payout",
    "Hisaab Settlement",
    "Fleet Security / GPS Issue"
  ],
  Vendor: [
    "Garage Repair Invoice Settlement",
    "CNG Fuel Vendor Payout",
    "Spare Parts Supply",
    "Fastag Tag Installation",
    "Insurance Claim Processing"
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
  const [viewRecord, setViewRecord] = useState<any | null>(null);

  const applyRecordAutoFill = (match: any) => {
    setFirstName(match.first_name || match.person_name?.split(" ")[0] || "");
    setLastName(match.last_name || match.person_name?.split(" ").slice(1).join(" ") || "");
    if (match.dl_number) setDlNumber(match.dl_number);
    if (match.aadhaar_number) setAadhaarNumber(match.aadhaar_number);
    if (match.city) setCity(normalizeCity(match.city));
    if (match.aadhaar_image) setAadhaarImage(match.aadhaar_image);
    if (match.dl_image) setDlImage(match.dl_image);
    if (match.visitor_type) setInterestedPosition(match.visitor_type);
    
    const isOnboardedOrExisting = match.joined_status === "Successfully Onboarded" || match.is_existing_partner || Boolean(match.dl_number);
    setIsExistingPartner(isOnboardedOrExisting);
    if (match.partner_type) setPartnerType(match.partner_type);
    if (match.partner_code) setPartnerCode(match.partner_code);

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
          const match = data[0]; // Most recent visit record
          applyRecordAutoFill(match);
          setCandidateHistory(data);
          setFetchBannerMsg(`Found: ${match.person_name || 'Driver'} (${data.length} prior visit${data.length > 1 ? 's' : ''})`);
          setIsDuplicate(false);
          setDuplicateMsg("");
        } else {
          setCandidateHistory([]);
          setFetchBannerMsg(`No prior visits found for ${cleanPhone}`);
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
              applyRecordAutoFill(match);
              setCandidateHistory(data);
              setFetchBannerMsg(`Found: ${match.person_name || 'Driver'} (${data.length} prior visit${data.length > 1 ? 's' : ''})`);
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
  }, [searchQuery, filterCity, filterType, filterStatus, filterTimePeriod, customStartDate, customEndDate, page]);

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
      if (!leadChannel) {
        alert("Please select a Lead Channel.");
        return;
      }
      if (!leadChannelDetails || !leadChannelDetails.trim()) {
        alert("Please enter Lead Channel Name / Details.");
        return;
      }

      if (visitingReason === "Onboarding" || cleanPhone) {
          if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
              alert("Please enter a valid 10-digit Indian phone number.");
              return;
          }
      }
    }

    let cleanAadhaar = aadhaarNumber ? aadhaarNumber.replace(/\s/g, "") : "";
    if (!isDraft) {
      if (visitingReason === "Onboarding" && cleanAadhaar) {
          if (!/^[0-9]{12}$/.test(cleanAadhaar)) {
              alert("Aadhaar Card must be exactly 12 digits.");
              return;
          }
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

      if (!res.ok) throw new Error("Failed to save record");

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
  };

  const fetchRecordDetailsForEdit = async (id: number) => {
    if (isReadOnly) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/walkins/${id}`, { headers: { "Authorization": `Bearer ${token}` }});
      if (!res.ok) throw new Error("Failed to load details");
      const data = await res.json();
      loadRecordIntoForm(data, id);
      setSearchRetrieveQuery("");
      setRetrieveResults([]);
      setIsRetrieveFocused(false);
    } catch (e) {
      alert("Error loading record details");
    }
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

  const loadRecordIntoForm = (record: any, id: number) => {
    setEditingId(id);
    setInterestedPosition(record.visitor_type || "Driver");
    setEnquiryDate(record.event_date || "");
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
    setVisitingReason(record.visiting_reason || "Onboarding");
    setLeadChannel(record.lead_channel || record.mode_of_enquiry || "Direct Walk-in");
    setLeadChannelDetails(record.lead_channel_details || "");
    setLeadSource(record.lead_channel || record.mode_of_enquiry || "Direct Walk-in");
    setReferredByName(record.referred_by_name || "");
    setReferredByPhone(record.referred_by_phone || "");
    setJoinedStatus(record.joined_status || "Onboarding Process Initiated");
    setRemarks(record.remarks || "");

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

  const handleExportCSV = () => {
    if (records.length === 0) {
      alert("No entries available to export.");
      return;
    }

    const headers = [
      "Walk-in ID", "Enquiry Date", "Enquiry Time", "City Hub", "First Name", "Last Name",
      "Phone Number", "Driving License", "Aadhaar Number", "Interested Position", 
      "Visiting Reason", "Lead Source", "Outcome Status", "Executive Name"
    ];

    const rows = records.map((r) => [
      r.id, r.event_date, r.enquiry_time, `"${r.city_name}"`, `"${r.first_name || ''}"`, `"${r.last_name || ''}"`,
      r.person_number, r.dl_number, maskSensitiveID(r.aadhaar_number), r.visitor_type,
      `"${r.visiting_reason}"`, `"${r.mode_of_enquiry}"`, r.joined_status, `"${r.executive_name}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `walkin_records_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                Walk-In Form
              </button>
            )}
            {!isReadOnly && (
              <button
                onClick={() => setActiveTab("drafts")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "drafts" ? "bg-amber-600 text-white shadow-sm shadow-amber-600/20" : "text-text-muted hover:bg-slate-100 hover:text-amber-600" }`}
              >
                <Clock className="h-4 w-4" />
                Saved Drafts
                {draftCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-extrabold">
                    {draftCount}
                  </span>
                )}
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
              <span className="font-mono text-xs font-extrabold text-primary">{currentTime}</span>
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
                      LetzRyd Desk
                    </span>
                  </div>
                  <h1 className="font-sans text-2xl font-bold tracking-tight text-white">{editingId ? `Edit Walk-in #${editingId}` : "Walk-In Form"}</h1>
                </div>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="rounded-2xl border border-border bg-white p-6 shadow-xs md:p-8 flex flex-col gap-8">
              
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
                        {personNumber && (
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
                        <button
                          type="button"
                          onClick={handleFetchByPhone}
                          className="px-3 h-full bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Search className="w-3.5 h-3.5" />
                          Fetch
                        </button>
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
                    {candidateHistory.length > 0 && (
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Partner Type & Visit Reasons */}
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-sans text-xs font-semibold text-slate-700">Partner Category *</label>
                        <select
                          value={partnerType}
                          onChange={(e) => setPartnerType(e.target.value as any)}
                          className="h-11 rounded-lg border border-border px-3 text-xs bg-white text-slate-800 outline-none focus:border-primary font-medium cursor-pointer"
                        >
                          <option value="Driver">Individual Driver Partner</option>
                          <option value="Operator">Fleet Operator Partner</option>
                          <option value="Vendor">Vendor / Service Partner</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="font-sans text-xs font-semibold text-slate-700">Visiting Reason *</label>
                        <select
                          required
                          value={visitingReason}
                          onChange={(e) => setVisitingReason(e.target.value)}
                          className="h-11 rounded-lg border border-border px-3 text-xs bg-white text-slate-800 outline-none focus:border-primary font-medium cursor-pointer"
                        >
                          <option value="Onboarding Inquiry">Onboarding Inquiry</option>
                          <option value="Complaint">Complaint</option>
                          <option value="Driver Manager (DM) Meet">Driver Manager (DM) Meet</option>
                          <option value="Maintenance Related Issue">Maintenance Issue</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-sans text-xs font-semibold text-slate-700">Enquiry Date *</label>
                        <input type="date" required value={enquiryDate} onChange={(e) => setEnquiryDate(e.target.value)} className="h-11 rounded-lg border border-border px-3 text-xs bg-white text-slate-800 outline-none focus:border-primary" />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="font-sans text-xs font-semibold text-slate-700">Enquiry Time *</label>
                        <input type="time" required value={enquiryTime} onChange={(e) => setEnquiryTime(e.target.value)} className="h-11 rounded-lg border border-border px-3 text-xs bg-white text-slate-800 outline-none focus:border-primary" />
                      </div>
                    </div>

                    {isExistingPartner && (
                      <div className="flex flex-col gap-1.5">
                        <label className="font-sans text-xs font-semibold text-slate-700">Visit Outcome Status *</label>
                        <select required value={joinedStatus} onChange={(e) => setJoinedStatus(e.target.value as OnboardingOutcome)} className="h-11 rounded-lg border border-border px-3 text-xs bg-white text-slate-800 outline-none focus:border-primary font-normal cursor-pointer">
                            <option value="Onboarding Process Initiated">Onboarding Process Initiated</option>
                            <option value="Successfully Onboarded">Successfully Onboarded</option>
                            <option value="Follow Up Required">Follow Up Required</option>
                            <option value="No Follow Up Required / Closed">No Follow Up Required / Closed</option>
                            <option value="Others">Others</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Simple Category Tags Dropdown */}
                  <div className="flex flex-col gap-2.5 p-4 bg-white border border-border rounded-xl">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Category Tags</span>
                      <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {selectedTags.length} Selected
                      </span>
                    </label>

                    {/* Standard Select Dropdown */}
                    <select
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__OTHERS__") {
                          setShowCustomTagInput(true);
                        } else if (val && !selectedTags.includes(val)) {
                          setSelectedTags([...selectedTags, val]);
                        }
                      }}
                      className="h-11 rounded-lg border border-border px-3 text-xs bg-white outline-none focus:border-primary font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="" disabled>+ Add {partnerType} Category Tag...</option>
                      {(PRESET_TAGS[partnerType] || PRESET_TAGS["Driver"]).map((tag) => (
                        <option key={tag} value={tag} disabled={selectedTags.includes(tag)}>
                          {selectedTags.includes(tag) ? `✓ ${tag} (Selected)` : tag}
                        </option>
                      ))}
                      <option value="__OTHERS__">＋ Others (Enter Custom Tag...)</option>
                    </select>

                    {/* Custom Tag Input Box */}
                    {showCustomTagInput && (
                      <div className="flex gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                        <input
                          type="text"
                          placeholder="Type custom tag name..."
                          value={customTagInput}
                          onChange={(e) => setCustomTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddCustomTag();
                            }
                          }}
                          className="h-9 flex-1 rounded-lg border border-border px-3 text-xs bg-white outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomTag}
                          className="h-9 px-3 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                        >
                          Add Tag
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCustomTagInput(false)}
                          className="h-9 px-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Selected Tags Display Pills */}
                    {selectedTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1 max-h-28 overflow-y-auto">
                        {selectedTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                              className="hover:text-red-600 focus:outline-none cursor-pointer text-emerald-700"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Free-Text Context Notes (200-300 words max) */}
                <div className="flex flex-col gap-1.5 mt-2">
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
              </div>

              {/* 3. Identity & Document Uploads (ONLY rendered for NEW Candidates; Suppressed for Existing Partners) */}
              {!isExistingPartner && (
                <div className="flex flex-col gap-5 bg-slate-50/60 p-5 rounded-2xl border border-border">
                  <div className="flex items-center gap-2 border-b border-border pb-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white font-bold text-xs">3</div>
                    <h3 className="font-sans text-xs font-bold text-slate-800 uppercase tracking-wider">Identity & Document Uploads (New Candidate Onboarding)</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Aadhaar group */}
                    <div className="flex flex-col gap-2.5 p-4 bg-white border border-border rounded-xl">
                      <label className="font-sans text-xs font-semibold text-slate-700">1. Aadhaar Card</label>
                      <div className="relative w-full">
                        <input
                          type={showAadhaar ? "text" : "password"}
                          placeholder="Enter 12-digit Aadhaar Number"
                          value={aadhaarNumber}
                          onChange={(e) => setAadhaarNumber(e.target.value)}
                          className="h-11 w-full rounded-lg border border-border pl-3 pr-9 text-xs bg-white text-slate-800 outline-none focus:border-primary font-normal"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAadhaar(!showAadhaar)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                        >
                          {showAadhaar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {aadhaarImage ? (
                        <div className="relative">
                          <img src={aadhaarImage} alt="Aadhaar" className="w-full h-16 object-cover rounded-lg border border-border" />
                          <button type="button" onClick={() => setAadhaarImage(null)} className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow cursor-pointer text-red-500 hover:bg-red-50"><X className="w-3 h-3"/></button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setCameraActiveField("aadhaar")} className="flex-1 bg-slate-50 hover:bg-slate-100 text-xs py-2 rounded-lg text-center border border-border font-semibold text-slate-700 cursor-pointer transition-colors flex items-center justify-center gap-1.5"><Camera className="w-3.5 h-3.5 text-primary"/> Camera</button>
                          <label className="flex-1 bg-slate-50 hover:bg-slate-100 text-xs py-2 rounded-lg text-center border border-border font-semibold text-slate-700 cursor-pointer transition-colors flex items-center justify-center gap-1.5">
                            <Upload className="w-3.5 h-3.5 text-primary"/> File <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "aadhaar")} />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* DL group */}
                    <div className="flex flex-col gap-2.5 p-4 bg-white border border-border rounded-xl">
                      <label className="font-sans text-xs font-semibold text-slate-700">2. Driving License</label>
                      <div className="relative w-full">
                        <input
                          type={showDl ? "text" : "password"}
                          placeholder="Enter Driving License Number"
                          value={dlNumber}
                          onChange={(e) => setDlNumber(e.target.value)}
                          className="h-11 w-full rounded-lg border border-border pl-3 pr-9 text-xs bg-white text-slate-800 outline-none focus:border-primary font-normal"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDl(!showDl)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                        >
                          {showDl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="font-sans text-xs font-semibold text-slate-700">Interested Position</label>
                            <select value={interestedPosition} onChange={(e) => setInterestedPosition(e.target.value)} className="h-11 rounded-lg border border-border px-3 text-xs bg-white text-slate-800 outline-none focus:border-primary font-normal cursor-pointer">
                              <option value="Driver">Driver</option>
                              <option value="Operator">Operator</option>
                              <option value="Enquiry">Enquiry</option>
                            </select>
                          </div>
                          
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
                {isDuplicate && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-bold">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{duplicateMsg || "Already filled."}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  {editingId && <button type="button" onClick={() => { resetForm(); setActiveTab("registry"); }} className="h-11 rounded-lg border border-border bg-white px-5 font-sans text-sm font-semibold text-text-muted hover:bg-slate-100 cursor-pointer">Cancel Edit</button>}
                  <button
                    type="button"
                    disabled={isDuplicate}
                    onClick={(e) => handleFormSubmit(e as any, true)}
                    className="h-11 rounded-lg border border-border bg-white px-5 font-sans text-sm font-semibold text-text-muted hover:bg-slate-100 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save as Draft
                  </button>
                  <button 
                    type="submit" 
                    className="h-11 rounded-lg bg-primary hover:bg-primary-hover text-white px-6 font-sans text-sm font-semibold shadow-md cursor-pointer transition-colors"
                  >
                    {editingId ? "Update Entry" : "Submit Visit"}
                  </button>
                </div>
              </div>

            </form>
          </div>
        )}

        {/* TAB 3: DRAFTS */}
        {activeTab === "drafts" && !isReadOnly && (
          <div className="flex flex-col gap-8">
            <div className="rounded-2xl border border-border bg-white shadow-xs overflow-hidden">
              <div className="border-b border-border p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-sans text-lg font-bold text-slate-900 tracking-tight">Drafts</h3>
                  <p className="font-sans text-xs text-text-muted mt-1">Incomplete walk-in entries saved as drafts</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border/60">
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Draft ID</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Candidate Name</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">City</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Created By</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date & Time Created</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Edited At</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Edited By</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {draftRecords.length === 0 ? (
                      <tr><td colSpan={9} className="px-6 py-12 text-center text-text-muted font-sans bg-slate-50/50 text-[11px]">No drafts found.</td></tr>
                    ) : (
                      draftRecords.map((r) => {
                        const createdDate = r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : (r.event_date || "—");
                        const createdTime = r.created_at ? new Date(r.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : (r.enquiry_time || "—");
                        
                        const updatedDate = r.updated_at ? new Date(r.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : createdDate;
                        const updatedTime = r.updated_at ? new Date(r.updated_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : createdTime;

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors text-[11px] font-sans">
                            <td className="px-4 py-3 font-mono font-bold text-slate-900">#{r.id}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">
                              {r.first_name ? `${r.first_name} ${r.last_name}`.trim() : (r.person_name || 'N/A')}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700">{normalizeCity(r.city || r.city_name)}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{r.person_number || 'N/A'}</td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900">{r.executive_name || 'Onboarding Executive 1'}</div>
                              <div className="text-slate-400 text-[10px] font-medium">ID: {r.executive_id || 26}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-800">{createdDate}</div>
                              <div className="text-slate-400 text-[10px] font-medium">{createdTime}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-800">{updatedDate}</div>
                              <div className="text-slate-400 text-[10px] font-medium">{updatedTime}</div>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-800">
                              {r.updated_by_name || r.executive_name || '—'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex gap-1.5 justify-center">
                                <button type="button" onClick={() => setViewRecord(r)} className="rounded-lg p-1 border border-border bg-white text-slate-600 hover:text-primary hover:bg-slate-50 transition-all cursor-pointer" title="View Full Details"><Eye className="h-3.5 w-3.5" /></button>
                                <button type="button" onClick={() => fetchRecordDetailsForEdit(r.id)} className="rounded-lg px-2 py-1 border border-border bg-white text-slate-700 hover:text-primary hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1 font-semibold text-[11px]"><Edit className="h-3.5 w-3.5" /> Edit</button>
                                <button type="button" onClick={() => { if (window.confirm('Delete this draft?')) handleDeleteRecord(r.id); }} className="rounded-lg p-1 border border-border bg-white text-slate-600 hover:text-rose-500 hover:bg-rose-50 border-rose-200 transition-all cursor-pointer" title="Delete Draft"><Trash2 className="h-3.5 w-3.5" /></button>
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
          </div>
        )}

        {/* TAB 2: REGISTRY */}
        {activeTab === "registry" && (
          <div className="flex flex-col gap-8">

            {/* Filter Toolbars */}
            <div className="bg-white rounded-xl shadow-xs border border-border p-4 grid grid-cols-1 gap-3 sm:grid-cols-5 items-center">
              <div className="relative col-span-2">
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

              <div className="relative">
                <select value={filterStatus} onChange={(e) => {setFilterStatus(e.target.value); setPage(1);}} className="h-10 w-full rounded-lg border border-border px-3 font-sans text-xs text-text bg-white outline-none focus:border-primary cursor-pointer">
                  <option value="all">All Statuses</option>
                  <option value="Onboarding Process Initiated">Onboarding Process Initiated</option>
                  <option value="Follow Up Required">Follow Up Required</option>
                  <option value="Successfully Onboarded">Successfully Onboarded</option>
                  <option value="No Follow Up Required / Closed">No Follow Up Required / Closed</option>
                  <option value="Others">Others</option>
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

            {/* Bento Grid Metrics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-text-dim">Total Walk-Ins</span>
                  <span className="font-sans text-3xl font-extrabold text-slate-900 mt-1">{metrics.total}</span>
                </div>
                <div className="rounded-xl bg-slate-100 text-slate-600 p-3"><User className="h-6 w-6" /></div>
              </div>
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-text-dim">Successful onboardings</span>
                  <span className="font-sans text-3xl font-extrabold text-primary mt-1">{metrics.joined}</span>
                </div>
                <div className="rounded-xl bg-green-50 text-primary p-3"><CheckCircle className="h-6 w-6" /></div>
              </div>
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex justify-between items-center">
                <div className="flex-grow flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-text-dim">Conversion Rate</span>
                  <span className="font-sans text-3xl font-extrabold text-slate-900 mt-1">{metrics.conversionRate}%</span>
                </div>
                <div className="rounded-xl bg-slate-100 text-slate-600 p-3"><ShieldCheck className="h-6 w-6" /></div>
              </div>
              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-text-dim">Pending Follow-Ups</span>
                  <span className="font-sans text-3xl font-extrabold text-amber-500 mt-1">{metrics.pending}</span>
                </div>
                <div className="rounded-xl bg-amber-50 text-amber-500 p-3"><Clock className="h-6 w-6" /></div>
              </div>
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
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Outcome Status</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {records.length === 0 ? (
                      <tr><td colSpan={11} className="px-6 py-12 text-center text-text-muted font-sans bg-slate-50/50 text-[11px]">No records found.</td></tr>
                    ) : (
                      records.map((r) => {
                        const displayStatus = r.joined_status || "Onboarding Process Initiated";
                        let statusColor = "bg-blue-50 text-blue-700 border-blue-200";
                        if (displayStatus === "Successfully Onboarded" || displayStatus === "Joined" || displayStatus === "Onboarded") statusColor = "bg-green-50 border-green-200 text-primary";
                        else if (displayStatus === "Follow Up Required" || displayStatus === "Pending") statusColor = "bg-amber-50 text-amber-700 border-amber-200";
                        else if (displayStatus === "No Follow Up Required / Closed" || displayStatus === "Not Interested") statusColor = "bg-red-50 border-red-100 text-red-600";

                        const createdDate = r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : (r.event_date || "—");
                        const createdTime = r.created_at ? new Date(r.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : (r.enquiry_time || "—");
                        
                        const updatedDate = r.updated_at ? new Date(r.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : createdDate;
                        const updatedTime = r.updated_at ? new Date(r.updated_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : createdTime;

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors text-[11px] font-sans">
                            <td className="px-4 py-3 font-mono font-bold text-slate-900">#{r.id}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">
                              {r.first_name ? `${r.first_name} ${r.last_name}`.trim() : (r.person_name || 'N/A')}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700">{normalizeCity(r.city || r.city_name)}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{r.person_number || 'N/A'}</td>
                            <td className="px-4 py-3">
                              <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700">{r.visitor_type}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900">{r.executive_name}</div>
                              <div className="text-slate-400 text-[10px] font-medium">ID: {r.executive_id}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-800">{createdDate}</div>
                              <div className="text-slate-400 text-[10px] font-medium">{createdTime}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-800">{updatedDate}</div>
                              <div className="text-slate-400 text-[10px] font-medium">{updatedTime}</div>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-800">
                              {r.updated_by_name || r.executive_name || '—'}
                            </td>
                            <td className="px-4 py-3"><span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusColor}`}>{displayStatus}</span></td>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex gap-1.5 justify-center">
                                <button type="button" onClick={() => setViewRecord(r)} className="rounded-lg p-1 border border-border bg-white text-slate-600 hover:text-primary hover:bg-slate-50 transition-all cursor-pointer" title="View Full Details"><Eye className="h-3.5 w-3.5" /></button>
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
              {candidateHistory.map((v, idx) => (
                <div key={v.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-xs font-bold text-slate-900">Visit #{candidateHistory.length - idx}</span>
                      <span className="text-xs font-mono font-medium text-slate-500">(ID: #{v.id})</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      v.joined_status === 'Successfully Onboarded' ? 'bg-emerald-100 text-emerald-800' :
                      v.joined_status === 'Follow Up Required' ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {v.joined_status || 'Initiated'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-400 uppercase">Reason</span>
                      <span className="font-medium text-slate-800">{v.visiting_reason || 'Enquiry'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-400 uppercase">Partner Type</span>
                      <span className="font-medium text-slate-800">{v.partner_type || 'Driver'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-400 uppercase">City</span>
                      <span className="font-medium text-slate-800">{v.city || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-400 uppercase">Recorded By</span>
                      <span className="font-medium text-slate-800">{v.executive_name || 'Executive'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-[10px] font-semibold text-slate-400 uppercase">Date & Time</span>
                      <span className="font-medium text-slate-800">{v.event_date || v.created_at?.slice(0, 10)} {v.enquiry_time || ''}</span>
                    </div>
                  </div>

                  {v.visit_tags && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(typeof v.visit_tags === 'string' ? (v.visit_tags.startsWith('[') ? JSON.parse(v.visit_tags) : [v.visit_tags]) : v.visit_tags).map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {(v.visit_notes || v.remarks) && (
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed">
                      <span className="font-semibold text-slate-900 block mb-0.5 text-[11px]">Visit Notes / Remarks:</span>
                      {v.visit_notes || v.remarks}
                    </div>
                  )}
                </div>
              ))}
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

      {viewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="font-sans text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Walk-In Entry #{viewRecord.id} Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewRecord(null)}
                className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-5">
              {/* Section 1: Candidate Info */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">Candidate Details</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase">Full Name</span>
                    <span className="font-semibold text-slate-900">{viewRecord.first_name ? `${viewRecord.first_name} ${viewRecord.last_name}`.trim() : (viewRecord.person_name || 'N/A')}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase">Contact Phone</span>
                    <span className="font-semibold text-slate-900">{viewRecord.person_number || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase">Operating City</span>
                    <span className="font-semibold text-slate-900">{viewRecord.city || viewRecord.city_name || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Visit & Enquiry Details */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">Visit & Outcome Details</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase">Partner Category</span>
                    <span className="font-semibold text-slate-900">{viewRecord.partner_type || viewRecord.visitor_type || 'Driver'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase">Visiting Reason</span>
                    <span className="font-semibold text-slate-900">{viewRecord.visiting_reason || 'Enquiry'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase">Outcome Status</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      viewRecord.joined_status === 'Successfully Onboarded' ? 'bg-emerald-100 text-emerald-800' :
                      viewRecord.joined_status === 'Follow Up Required' ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>{viewRecord.joined_status || 'Initiated'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase">Enquiry Date & Time</span>
                    <span className="font-medium text-slate-800">{viewRecord.event_date || viewRecord.created_at?.slice(0, 10)} {viewRecord.enquiry_time || ''}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase">Recorded By</span>
                    <span className="font-medium text-slate-800">{viewRecord.executive_name || 'Executive'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase">Last Updated By</span>
                    <span className="font-medium text-slate-800">{viewRecord.updated_by_name || viewRecord.executive_name || '—'}</span>
                  </div>
                </div>

                {viewRecord.visit_tags && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block w-full">Category Tags:</span>
                    {(typeof viewRecord.visit_tags === 'string' ? (viewRecord.visit_tags.startsWith('[') ? JSON.parse(viewRecord.visit_tags) : [viewRecord.visit_tags]) : viewRecord.visit_tags).map((tag: string) => (
                      <span key={tag} className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {(viewRecord.visit_notes || viewRecord.remarks) && (
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed mt-1">
                    <span className="font-semibold text-slate-900 block mb-0.5">Visit Notes & Executive Summary:</span>
                    {viewRecord.visit_notes || viewRecord.remarks}
                  </div>
                )}
              </div>

              {/* Section 3: Identity & Documents (If Present) */}
              {(viewRecord.aadhaar_number || viewRecord.dl_number) && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col gap-3">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">KYC & Document Records</span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {viewRecord.aadhaar_number && (
                      <div>
                        <span className="block text-[10px] font-semibold text-slate-400 uppercase">Aadhaar Card</span>
                        <span className="font-semibold text-slate-900">{viewRecord.aadhaar_number}</span>
                      </div>
                    )}
                    {viewRecord.dl_number && (
                      <div>
                        <span className="block text-[10px] font-semibold text-slate-400 uppercase">Driving License</span>
                        <span className="font-semibold text-slate-900">{viewRecord.dl_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-border bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setViewRecord(null)}
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