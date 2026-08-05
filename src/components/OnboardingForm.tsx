import React, { useState, useMemo, useEffect } from "react";
import { 
  Calendar, MapPin, User, Phone, FileText, CheckCircle, 
  Clock, ArrowLeft, Download, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, AlertTriangle, ShieldCheck, Filter, Plus, ChevronLeft, UserCheck, Database, IndianRupee, ChevronRight, Check, Shield, FileSignature, Eye, EyeOff, Send, ArrowRight, RotateCcw
} from "lucide-react";
import { OnboardingRecord, User as UserSession, CITIES } from "../types";
import CameraCapture from "./CameraCapture";

interface OnboardingFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
  initialEditId?: number;
  initialStep?: number;
  isReviewMode?: boolean;
}

// MASKING FUNCTION: Masks sensitive IDs in the registry
const maskSensitiveID = (idString: string | null | undefined) => {
  if (!idString) return "—";
  const cleanStr = idString.replace(/\s/g, ''); 
  if (cleanStr.length <= 4) return cleanStr;
  return "*".repeat(cleanStr.length - 4) + cleanStr.slice(-4);
};

const formatDisplayDate = (createdAt?: string, fallbackDate?: string): string => {
  if (createdAt) {
    try {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
      }
    } catch (e) {}
  }
  if (fallbackDate) {
    try {
      const cleanDate = fallbackDate.trim();
      const parts = cleanDate.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      }
    } catch (e) {}
    return fallbackDate;
  }
  return "—";
};

const formatDisplayTime = (createdAt?: string, fallbackTime?: string): string => {
  if (createdAt) {
    try {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
      }
    } catch (e) {}
  }
  if (fallbackTime) {
    const cleaned = fallbackTime.trim();
    if (/^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)?$/i.test(cleaned)) {
      return cleaned.toUpperCase();
    }
    const match = cleaned.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const ampm = hours >= 12 ? "pm" : "am";
      hours = hours % 12 || 12;
      return `${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
    }
    return fallbackTime;
  }
  return "—";
};

function SearchableApproverSelect({ 
  approvers, 
  selectedId, 
  onSelect, 
  label 
}: { 
  approvers: any[]; 
  selectedId: number | null; 
  onSelect: (id: number) => void; 
  label: string; 
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const validApprovers = approvers;

  const selectedApprover = validApprovers.find(a => a.id === selectedId);

  useEffect(() => {
    if (selectedApprover) {
      setSearch(`${selectedApprover.name} (${selectedApprover.role})`);
    } else if (validApprovers.length > 0) {
      const preferred = validApprovers.find(a => 
        a.role?.toLowerCase().includes("city manager") || 
        a.role?.toLowerCase().includes("general manager") ||
        a.role?.toLowerCase().includes("manager") ||
        ["CM", "GM", "BH", "DM"].includes(a.role_code)
      ) || validApprovers[0];
      onSelect(preferred.id);
      setSearch(`${preferred.name} (${preferred.role})`);
    }
  }, [selectedId, validApprovers]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isExactSelectedDisplay = selectedApprover && search === `${selectedApprover.name} (${selectedApprover.role})`;

  const filtered = validApprovers
    .filter(a =>
      isExactSelectedDisplay ||
      !search.trim() ||
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.role?.toLowerCase().includes(search.toLowerCase()) ||
      a.city?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (!search.trim() || isExactSelectedDisplay) return 0;
      const s = search.toLowerCase();
      const aNameStarts = a.name?.toLowerCase().startsWith(s) ? 0 : 1;
      const bNameStarts = b.name?.toLowerCase().startsWith(s) ? 0 : 1;
      return aNameStarts - bNameStarts;
    });

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      <label className="text-xs font-bold text-slate-800">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={search}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          placeholder="Search approver name, role or city..."
          className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-600 shadow-xs"
        />
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
            {filtered.map(a => (
              <div
                key={a.id}
                onClick={() => {
                  onSelect(a.id);
                  setSearch(`${a.name} (${a.role})`);
                  setIsOpen(false);
                }}
                className={`p-3 hover:bg-emerald-50 transition-colors cursor-pointer text-xs ${a.id === selectedId ? "bg-emerald-50 font-bold text-emerald-700" : "text-slate-800"}`}
              >
                <span className="font-bold block text-slate-900">{a.name}</span>
                <span className="text-[11px] text-slate-500">{a.role}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-3 text-center text-slate-400 italic text-xs">No matching approvers found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OnboardingForm({ 
  user, 
  onBackToSelector, 
  onLogout,
  initialEditId,
  initialStep,
  isReviewMode
}: OnboardingFormProps) {
  
  // RBAC Security Lock (Force read-only if reviewing)
  const isReadOnly = user.role_code === "SP";

  const isManagerRole = (user.role || "").toLowerCase().includes("manager") || 
                        (user.role || "").toLowerCase().includes("admin") ||
                        ["SA", "BH", "CM", "DM"].includes(user.role_code);
  const isExecutiveRole = (user.role || "").toLowerCase().includes("executive") || user.role_code === "OB";

  const [recordCreatedBy, setRecordCreatedBy] = useState<number | null>(null);
  const currentUserId = user.portal_user_id || user.id || user.executive_id;
  const isOwnSubmission = recordCreatedBy !== null && Number(recordCreatedBy) === Number(currentUserId);
  const canManagerApprove = isReviewMode && isManagerRole && !isExecutiveRole && !isOwnSubmission;
  
  const [activeTab, setActiveTab] = useState<"form" | "drafts" | "registry">(isReadOnly && !isReviewMode ? "registry" : "form");
  const [currentStep, setCurrentStep] = useState(initialStep || 1);
  
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

  // Form Fields State
  const [editingId, setEditingId] = useState<number | null>(null);

  // MERGED FORM STATE: Driver vs Operator
  const [candidateRole, setCandidateRole] = useState<"Driver" | "Operator">("Driver");
  const [autoGeneratedId, setAutoGeneratedId] = useState("");
  
  const [sameAsDriver, setSameAsDriver] = useState(true);
  const [operatorDrivers, setOperatorDrivers] = useState<any[]>([]);

  const [linkedWalkinId, setLinkedWalkinId] = useState<number | null>(null);
  const [walkinSearchInput, setWalkinSearchInput] = useState("");
  const [driverName, setDriverName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [differentWhatsapp, setDifferentWhatsapp] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [dob, setDob] = useState("");
  const [city, setCity] = useState("Hyderabad");
  const [presentAddress, setPresentAddress] = useState("");
  const [presentCity, setPresentCity] = useState("");
  const [presentState, setPresentState] = useState("");
  const [presentPincode, setPresentPincode] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [permanentCity, setPermanentCity] = useState("");
  const [permanentState, setPermanentState] = useState("");
  const [permanentPincode, setPermanentPincode] = useState("");
  const [sameAsPresentAddress, setSameAsPresentAddress] = useState(false);
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [dlNumber, setDlNumber] = useState("");
  const [dlExpiryDate, setDlExpiryDate] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [sourceDetails, setSourceDetails] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [showPan, setShowPan] = useState(false);
  const [showDl, setShowDl] = useState(false);
  const [panAadhaarLinked, setPanAadhaarLinked] = useState("Yes");
  const [vendorName, setVendorName] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [bankName, setBankName] = useState("State Bank of India");
  const [otherBankName, setOtherBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");
  const [operatingPlace, setOperatingPlace] = useState("");
  const [entryMode, setEntryMode] = useState<"new" | "walkin" | "retrieve">("new");
  
  // RESTORED: Third Party Platforms
  const [thirdPartyPlatform, setThirdPartyPlatform] = useState<string>("None");
  const [platformDetails, setPlatformDetails] = useState<Record<string, {id: string, photo: string | null}>>({});
  
  const [documentsVerified, setDocumentsVerified] = useState(false);
  const [sameAsCandidateName, setSameAsCandidateName] = useState(false);
  
  // NEW LETZRYD RENTAL & DEPOSIT STATES
  const [rentalModel, setRentalModel] = useState("Drive to Rent");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [letzownCheques, setLetzownCheques] = useState("3");
  const [customRentalPlan, setCustomRentalPlan] = useState(false);
  const [customRentAmount, setCustomRentAmount] = useState("");
  
  // API SIMULATION STATES
  const [isSpringVerifyLoading, setIsSpringVerifyLoading] = useState(false);
  const [isSpringVerified, setIsSpringVerified] = useState(false);
  const [isGeneratingAgreement, setIsGeneratingAgreement] = useState(false);

  const [stats, setStats] = useState({
    driver_count: 0,
    operator_count: 0,
    last_7_days_count: 0,
    pending_approvals_count: 0
  });

  // Document Uploads / Camera State
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [dlFront, setDlFront] = useState<string | null>(null);
  const [dlBack, setDlBack] = useState<string | null>(null);
  const [panCardPhoto, setPanCardPhoto] = useState<string | null>(null);
  const [aadhaarPhoto, setAadhaarPhoto] = useState<string | null>(null);
  const [aadhaarCardFront, setAadhaarCardFront] = useState<string | null>(null);
  const [aadhaarCardBack, setAadhaarCardBack] = useState<string | null>(null);
  const [localAddressProofFiles, setLocalAddressProofFiles] = useState<string[]>([]);
  
  const removeLocalAddressFile = (index: number) => {
    setLocalAddressProofFiles(prev => prev.filter((_, idx) => idx !== index));
  };
  
  // Manager Revision Remarks State
  const [approvalRemarks, setApprovalRemarks] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  
  // LetzOwn Dynamic Info & 3 References
  const [driverEmail, setDriverEmail] = useState("");
  const [ref1Name, setRef1Name] = useState("");
  const [ref1Phone, setRef1Phone] = useState("");
  const [ref1Address, setRef1Address] = useState("");
  const [ref2Name, setRef2Name] = useState("");
  const [ref2Phone, setRef2Phone] = useState("");
  const [ref2Address, setRef2Address] = useState("");
  const [ref3Name, setRef3Name] = useState("");
  const [ref3Phone, setRef3Phone] = useState("");
  const [ref3Address, setRef3Address] = useState("");

  const [cancelledChequePhoto, setCancelledChequePhoto] = useState<string | null>(null);
  const [cheque2Photo, setCheque2Photo] = useState<string | null>(null);
  const [cheque3Photo, setCheque3Photo] = useState<string | null>(null);
  const [signaturePhoto, setSignaturePhoto] = useState<string | null>(null);
  const [cameraActiveField, setCameraActiveField] = useState<"selfie" | "dl_front" | "dl_back" | "pan" | "aadhaar" | "aadhaar_front" | "aadhaar_back" | "local_address_proof" | "cheque" | "cheque2" | "cheque3" | "signature" | string | null>(null);

  const displayName = user.name || user.username || "User";
  const initials = displayName.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();

  // Phone-based walk-in candidate lookup (explicit user auto-fill)
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [autoFillBanner, setAutoFillBanner] = useState("");
  const [foundWalkinRecord, setFoundWalkinRecord] = useState<any | null>(null);
  const [autoFillApplied, setAutoFillApplied] = useState(false);

  const [searchRetrieveQuery, setSearchRetrieveQuery] = useState("");
  const [retrieveResults, setRetrieveResults] = useState<any[]>([]);
  const [isRetrieveFocused, setIsRetrieveFocused] = useState(false);

  // Registry Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTimePeriod, setFilterTimePeriod] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [retrieveIdInput, setRetrieveIdInput] = useState("");

  // STEP 5: APPROVAL REQUEST STATES
  const [approvalRequestedTo, setApprovalRequestedTo] = useState<number | null>(null);
  const [approvalSubmissionNote, setApprovalSubmissionNote] = useState("");
  const [approversList, setApproversList] = useState<any[]>([]);

  // MANAGER REVIEW ACTIONS STATES
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [forwardToId, setForwardToId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [records, setRecords] = useState<OnboardingRecord[]>([]);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (r.driver_name || "").toLowerCase();
        const phone = (r.phone_number || "").toLowerCase();
        const dl = (r.driving_license || "").toLowerCase();
        const aadhaar = (r.aadhaar_number || "").toLowerCase();
        const id = (r.id || "").toString();
        if (!name.includes(q) && !phone.includes(q) && !dl.includes(q) && !aadhaar.includes(q) && !id.includes(q)) {
          return false;
        }
      }

      // 2. City Filter
      if (filterCity !== "all") {
        if ((r.city || "").toLowerCase() !== filterCity.toLowerCase()) {
          return false;
        }
      }

      // 3. Status Filter
      const status = r.approval_status || "Draft";
      if (filterStatus === "all") {
        if (status === "Draft") return false; // Exclude Drafts from Registry table view
      } else {
        if (filterStatus === "Draft" && status !== "Draft") return false;
        if (filterStatus === "Pending Approval" && !status.includes("Pending")) return false;
        if (filterStatus === "Approved" && !status.includes("Approved")) return false;
        if (filterStatus === "Changes Requested" && (!status.includes("Requested") && !status.includes("Counter"))) return false;
        if (filterStatus === "Rejected" && !status.includes("Reject")) return false;
      }

      // 4. Time Period Filter
      if (filterTimePeriod !== "all" && r.created_at) {
        const itemDate = new Date(r.created_at);
        const now = new Date();

        if (filterTimePeriod === "beginning_of_month") {
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          if (itemDate < firstDayOfMonth) return false;
        } else if (filterTimePeriod === "last_1_month") {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          if (itemDate < oneMonthAgo) return false;
        } else if (filterTimePeriod === "this_quarter") {
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const firstDayOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
          if (itemDate < firstDayOfQuarter) return false;
        } else if (filterTimePeriod === "this_year") {
          const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
          if (itemDate < firstDayOfYear) return false;
        } else if (filterTimePeriod === "last_1_year") {
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          if (itemDate < oneYearAgo) return false;
        } else if (filterTimePeriod === "custom" && customStartDate && customEndDate) {
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
          if (itemDate < startDate || itemDate > endDate) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
      const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return (b.id || 0) - (a.id || 0);
    });
  }, [records, searchQuery, filterCity, filterStatus, filterTimePeriod, customStartDate, customEndDate]);

  const totalPages = useMemo(() => Math.ceil(filteredRecords.length / itemsPerPage) || 1, [filteredRecords.length]);

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, page]);

  const computedStats = useMemo(() => {
    let driver_count = 0;
    let operator_count = 0;
    let last_7_days_count = 0;
    let pending_approvals_count = 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    records.forEach((r) => {
      const role = (r.candidate_role || r.vendor_type || "").toLowerCase();
      const status = (r.approval_status || "").toLowerCase();

      if (role.includes("driver")) driver_count++;
      if (role.includes("operator")) operator_count++;

      if (status.includes("pending")) pending_approvals_count++;

      if (r.created_at) {
        const createdDate = new Date(r.created_at);
        if (createdDate >= sevenDaysAgo) {
          last_7_days_count++;
        }
      }
    });

    return {
      driver_count: stats.driver_count || driver_count,
      operator_count: stats.operator_count || operator_count,
      last_7_days_count: stats.last_7_days_count || last_7_days_count,
      pending_approvals_count: stats.pending_approvals_count || pending_approvals_count,
    };
  }, [records, stats]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/stats/onboarding", { headers: { "Authorization": `Bearer ${token}` }});
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error("Error fetching stats", e);
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const headers = { "Authorization": `Bearer ${token}` };
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      if (filterCity !== "all") queryParams.append("city", filterCity);
      queryParams.append("status", "all");
      queryParams.append("limit", "500");
      
      const res = await fetch(`/api/onboarding?${queryParams.toString()}`, { headers });
      if (res.ok) setRecords(await res.json());

      const appRes = await fetch("/api/july/approvers", { headers });
      if (appRes.ok) {
        const appData = await appRes.json();
        const currentUserId = user.portal_user_id || user.id || user.executive_id;
        const validApprovers = appData.filter((a: any) => a.id !== currentUserId);
        setApproversList(validApprovers);
        // Auto-set default to first City Manager or General Manager
        if (validApprovers.length > 0) {
          const preferred = validApprovers.find((a: any) =>
            a.role?.toLowerCase().includes("city manager") ||
            a.role?.toLowerCase().includes("general manager") ||
            a.role?.toLowerCase().includes("manager") ||
            ["CM", "GM", "BH", "DM"].includes(a.role_code)
          ) || validApprovers[0];
          setApprovalRequestedTo(preferred.id);
          setForwardToId(preferred.id);
        }
      }

      fetchStats();
    } catch (e) {
      console.error("Error fetching data", e);
    }
  };

  React.useEffect(() => {
    const timer = setTimeout(() => { fetchData(); }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, filterCity]);

  // Suggestions search logic for top header search bar (edit onboarding records only)
  useEffect(() => {
    const fetchSuggestions = async () => {
      const q = searchRetrieveQuery.trim();
      if (!q) {
        setRetrieveResults([]);
        return;
      }
      try {
        const token = localStorage.getItem("lr_token");
        const headers = { "Authorization": `Bearer ${token}` };
        
        // Search exclusively from Onboarding registry for editing
        const oRes = await fetch(`/api/onboarding?search=${encodeURIComponent(q)}&limit=10`, { headers });
        const oData = oRes.ok ? await oRes.json() : [];

        const results = oData.map((item: any) => ({
          ...item,
          type: "onboarding",
          label: `[Onboarded] #${item.id} - ${item.driver_name}`,
          subtitle: item.phone_number
        }));
        setRetrieveResults(results);
      } catch (e) {
        console.error("Error fetching suggestions", e);
      }
    };
    const t = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(t);
  }, [searchRetrieveQuery]);

  const applyRecordAutoFill = (r: any) => {
    setDriverName(r.person_name || `${r.first_name || ''} ${r.last_name || ''}`.trim());
    if (r.city) {
      const matchedCity = CITIES.find(c => c.value === r.city || c.text === r.city);
      if (matchedCity) setCity(matchedCity.value);
    }
    if (r.dl_number) setDlNumber(r.dl_number);
    if (r.aadhaar_number) setAadhaarNumber(r.aadhaar_number);
    if (r.id) setLinkedWalkinId(r.id);
    setFoundWalkinRecord(r);
    setAutoFillApplied(true);
    setAutoFillBanner(`✓ Pre-filled candidate details from Walk-In record #${r.id} (${r.person_name || ''}).`);
  };

  const applyWalkinAutoFill = () => {
    if (foundWalkinRecord) applyRecordAutoFill(foundWalkinRecord);
  };

  // Fetch button handler — always calls the API directly (no reliance on cached state)
  const handleFetchByPhone = async () => {
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      alert("Please enter a 10-digit phone number first.");
      return;
    }
    try {
      const token = localStorage.getItem("lr_token");
      const headers = { "Authorization": `Bearer ${token}` };
      // First check onboarding duplicate
      const onbRes = await fetch(`/api/onboarding?search=${cleanPhone}&limit=1`, { headers });
      if (onbRes.ok) {
        const onbData = await onbRes.json();
        if (onbData.length > 0 && onbData[0].phone_number === cleanPhone) {
          setIsDuplicate(true);
          setAutoFillBanner(`Already filled — ${onbData[0].driver_name} is already in the onboarding database.`);
          return;
        }
      }
      // Then check walk-ins
      const wRes = await fetch(`/api/walkins/search?q=${cleanPhone}`, { headers });
      if (wRes.ok) {
        const wData = await wRes.json();
        if (wData && wData.length > 0) {
          applyRecordAutoFill(wData[0]);
        } else {
          setFoundWalkinRecord(null);
          alert(`No matching walk-in record found for ${cleanPhone}. You can fill in the form manually.`);
        }
      }
    } catch (e) {
      console.error("Fetch error", e);
      alert("An error occurred while searching. Please try again.");
    }
  };

  useEffect(() => {
    const checkWalkinPhone = async () => {
      const cleanPhone = phoneNumber.replace(/\D/g, "");
      if (cleanPhone.length === 10 && !editingId && !isReadOnly) {
        try {
          const token = localStorage.getItem("lr_token");
          // 1. Check onboarding registry for full duplicate
          const onbRes = await fetch(`/api/onboarding?search=${cleanPhone}&limit=1`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (onbRes.ok) {
            const onbData = await onbRes.json();
            if (onbData.length > 0 && onbData[0].phone_number === cleanPhone) {
              setIsDuplicate(true);
              setAutoFillBanner(`Already filled — ${onbData[0].driver_name} is already in the onboarding database.`);
              setFoundWalkinRecord(null);
              return;
            }
          }
          setIsDuplicate(false);
          // 2. Check walk-in for match (store record for explicit user auto-fill)
          const wRes = await fetch(`/api/walkins/search?q=${cleanPhone}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (wRes.ok) {
            const wData = await wRes.json();
            if (wData && wData.length > 0) {
              setFoundWalkinRecord(wData[0]);
            } else {
              setFoundWalkinRecord(null);
              setAutoFillBanner("");
              setAutoFillApplied(false);
            }
          }
        } catch (e) {
          console.error("Auto-fill search error", e);
        }
      } else if (cleanPhone.length < 10) {
        setIsDuplicate(false);
        setAutoFillBanner("");
        setFoundWalkinRecord(null);
        setAutoFillApplied(false);
      }
    };
    const t = setTimeout(checkWalkinPhone, 400);
    return () => clearTimeout(t);
  }, [phoneNumber, editingId, isReadOnly]);

  // SpringVerify Simulation
  const handleSpringVerify = () => {
    if (!panNumber || !aadhaarNumber) {
      alert("Please enter both PAN and Aadhaar numbers to verify.");
      return;
    }
    setIsSpringVerifyLoading(true);
    setTimeout(() => {
      setIsSpringVerifyLoading(false);
      setIsSpringVerified(true);
      setPanAadhaarLinked("Yes");
    }, 2000);
  };

  // Legality Simulation
  const handleLegalityGeneration = () => {
    setIsGeneratingAgreement(true);
    setTimeout(() => {
      setIsGeneratingAgreement(false);
      alert("Success! 99% Pre-filled Legal Agreement has been generated via Legality API and sent to candidate for signature.");
    }, 2500);
  };

  const handleDeleteRecord = async (id: number) => {
    if (isReadOnly) return;
    if (!window.confirm(`Are you sure you want to delete onboarding record #${id}?`)) return;
    try {
      const res = await fetch(`/api/onboarding/${id}`, {
        method: 'DELETE',
        headers: { "Authorization": `Bearer ${localStorage.getItem("lr_token")}` }
      });
      if (!res.ok) throw new Error("Failed to delete record");
      await fetchData();
    } catch (e: any) {
      alert(e.message || "Error deleting record");
    }
  };

  // Handle Form Submission
  const handleFormSubmit = async (e: React.FormEvent, targetStatus: "Draft" | "Pending Approval" = "Pending Approval") => {
    e.preventDefault();
    if (isReadOnly) return;

    // Block if duplicate
    if (isDuplicate) {
      alert("Already filled. This candidate is already in the onboarding database.");
      return;
    }

    const cleanPhone = phoneNumber.trim();
    if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
      alert("Please enter a valid 10-digit Indian phone number.");
      return;
    }

    if (upiId && !/^[a-zA-Z0-9.-]+@[a-zA-Z0-9.-]+$/.test(upiId)) {
      alert("Please enter a valid UPI ID (e.g. name@bank or phone@upi). It must contain '@'.");
      return;
    }

    const payload = {
      vendor_type: candidateRole, // Preserving backend mapping
      candidate_role: candidateRole,
      rental_model: rentalModel,
      security_deposit: securityDeposit,
      letzown_cheques: rentalModel === "Drive to Own" ? letzownCheques : undefined,
      driver_id: autoGeneratedId || `LR-${Math.floor(1000 + Math.random() * 9000)}`,
      custom_rent_amount: customRentAmount,
      operator_drivers: candidateRole === "Operator" ? operatorDrivers : [],

      driver_name: driverName.trim(),
      phone_number: cleanPhone,
      whatsapp_number: differentWhatsapp ? whatsappNumber.trim() : cleanPhone,
      dob: dob,
      city: city,
      present_address: `${presentAddress.trim()}, ${presentCity.trim()}, ${presentState.trim()}, India - ${presentPincode.trim()}`,
      permanent_address: `${permanentAddress.trim()}, ${permanentCity.trim()}, ${permanentState.trim()}, India - ${permanentPincode.trim()}`,
      emergency_name: emergencyName.trim(),
      emergency_relationship: emergencyRelationship.trim(),
      emergency_phone: emergencyPhone.trim(),
      dl_number: dlNumber.trim().toUpperCase() || undefined,
      dl_expiry_date: dlExpiryDate || undefined,
      lead_source: leadSource ? `${leadSource}${sourceDetails ? ' - ' + sourceDetails : ''}` : undefined,
      pan_number: panNumber.trim().toUpperCase(),
      aadhaar_number: aadhaarNumber.replace(/\s/g, "").replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3"),
      pan_aadhaar_linked: panAadhaarLinked,
      is_spring_verified: isSpringVerified,
      selfie_photo: selfiePhoto || undefined,
      dl_front: dlFront || undefined,
      dl_back: dlBack || undefined,
      pan_card_photo: panCardPhoto || undefined,
      walkin_id: linkedWalkinId || undefined,
      vendor_name: vendorName.trim() || undefined,
      vendor_id: vendorId.trim() || undefined,
      aadhaar_card_photo: aadhaarPhoto || undefined,
      aadhaar_card_front: aadhaarCardFront || undefined,
      aadhaar_card_back: aadhaarCardBack || undefined,
      driver_email: driverEmail.trim() || undefined,
      local_address_proof: localAddressProofFiles.length > 0 ? JSON.stringify(localAddressProofFiles) : undefined,
      ref1_name: ref1Name.trim() || undefined,
      ref1_phone: ref1Phone.trim() || undefined,
      ref1_address: ref1Address.trim() || undefined,
      ref2_name: ref2Name.trim() || undefined,
      ref2_phone: ref2Phone.trim() || undefined,
      ref2_address: ref2Address.trim() || undefined,
      ref3_name: ref3Name.trim() || undefined,
      ref3_phone: ref3Phone.trim() || undefined,
      ref3_address: ref3Address.trim() || undefined,
      father_name: fatherName.trim(),
      bank_name: bankName || undefined,
      other_bank_name: otherBankName.trim() || undefined,
      operating_place: operatingPlace.trim() || undefined,
      account_name: accountName.trim() || undefined,
      account_number: accountNumber.trim() || undefined,
      ifsc_code: ifscCode.trim().toUpperCase() || undefined,
      upi_id: upiId.trim().toLowerCase() || undefined,
      documents_verified: documentsVerified,
      custom_rental_plan: customRentalPlan,
      cancelled_cheque_photo: cancelledChequePhoto || undefined,
      cheque2_photo: cheque2Photo || undefined,
      cheque3_photo: cheque3Photo || undefined,
      signature_photo: signaturePhoto || undefined,
      platform_details: thirdPartyPlatform !== 'None' ? { [thirdPartyPlatform]: platformDetails[thirdPartyPlatform] || { id: "" } } : { None: { id: "" } },
      approval_status: targetStatus,
      approval_requested_to: targetStatus === "Pending Approval" ? approvalRequestedTo : undefined,
      approval_note: approvalSubmissionNote.trim() || undefined
    };

    try {
      const url = editingId ? `/api/onboarding/${editingId}` : "/api/onboarding";
      const method = editingId ? "PUT" : "POST";
      const token = localStorage.getItem("lr_token");
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to save record");
      }
      
      const recordResult = await res.json();
      const savedRecordId = editingId || recordResult.id;

      if (targetStatus === "Pending Approval") {
        await fetch(`/api/onboarding/send-for-approval/${savedRecordId}`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` 
          },
          body: JSON.stringify({ approver_id: approvalRequestedTo })
        });
        const selectedApprover = approversList.find(a => a.id === approvalRequestedTo);
        const approverName = selectedApprover ? selectedApprover.name : "the assigned manager";
        const isEditing = Boolean(editingId);
        alert(isEditing
          ? `Onboarding application updated and resubmitted to ${approverName} for approval!`
          : `Onboarding application successfully sent to ${approverName} for approval!`
        );
        resetForm();
        fetchData();
        if (isEditing) {
          onBackToSelector();
        } else {
          setActiveTab("registry");
        }
      } else {
        alert(`Onboarding form saved as Draft! You can view or edit it anytime from the Saved Drafts tab.`);
        resetForm();
        fetchData();
        setActiveTab("drafts");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleSendForApproval = async (id: number) => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/onboarding/${id}/send-for-approval`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to send for approval");
      }
      alert("Application sent to City Manager 1 for approval!");
      fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleFormSubmitSuccess = () => {
    setIsDuplicate(false);
    setAutoFillBanner("");
  };

  const resetForm = () => {
    setEditingId(null);
    setCurrentStep(1);
    setCandidateRole("Driver");
    setAutoGeneratedId("");
    setRentalModel("Drive to Rent");
    setSecurityDeposit("");
    setLetzownCheques("3");
    setCustomRentalPlan(false);
    setCustomRentAmount("");
    setOperatorDrivers([]);
    setLinkedWalkinId(null);
    setWalkinSearchInput("");
    setDriverName("");
    setPhoneNumber("");
    setDifferentWhatsapp(false);
    setWhatsappNumber("");
    setDob("");
    setCity("Hyderabad");
    setPresentAddress("");
    setPresentCity("");
    setPresentState("");
    setPresentPincode("");
    setPermanentAddress("");
    setPermanentCity("");
    setPermanentState("");
    setPermanentPincode("");
    setSameAsPresentAddress(false);
    setEmergencyName("");
    setEmergencyRelationship("");
    setEmergencyPhone("");
    setDlNumber("");
    setDlExpiryDate("");
    setLeadSource("");
    setSourceDetails("");
    setPanNumber("");
    setAadhaarNumber("");
    setPanAadhaarLinked("Yes");
    setIsSpringVerified(false);
    setSelfiePhoto(null);
    setDlFront(null);
    setDlBack(null);
    setPanCardPhoto(null);
    setAadhaarPhoto(null);
    setAadhaarCardFront(null);
    setAadhaarCardBack(null);
    setLocalAddressProofFiles([]);
    setDriverEmail("");
    setRef1Name("");
    setRef1Phone("");
    setRef1Address("");
    setRef2Name("");
    setRef2Phone("");
    setRef2Address("");
    setRef3Name("");
    setRef3Phone("");
    setRef3Address("");
    setVendorName("");
    setVendorId("");
    setFatherName("");
    setBankName("State Bank of India");
    setOtherBankName("");
    setAccountName("");
    setAccountNumber("");
    setIfscCode("");
    setUpiId("");
    setOperatingPlace("");
    setDocumentsVerified(false);
    setCancelledChequePhoto(null);
    setCheque2Photo(null);
    setCheque3Photo(null);
    setSignaturePhoto(null);
    setThirdPartyPlatform("None");
    setPlatformDetails({});
    setEntryMode("new");
    setSameAsCandidateName(false);
    setIsDuplicate(false);
    setAutoFillBanner("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "selfie" | "dl_front" | "dl_back" | "pan" | "aadhaar" | "aadhaar_front" | "aadhaar_back" | "local_address_proof" | "cheque" | "cheque2" | "cheque3" | "signature") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          if (field === "selfie") setSelfiePhoto(reader.result);
          if (field === "dl_front") setDlFront(reader.result);
          if (field === "dl_back") setDlBack(reader.result);
          if (field === "pan") setPanCardPhoto(reader.result);
          if (field === "aadhaar") setAadhaarPhoto(reader.result);
          if (field === "aadhaar_front") setAadhaarCardFront(reader.result);
          if (field === "aadhaar_back") setAadhaarCardBack(reader.result);
          if (field === "local_address_proof") {
            if (localAddressProofFiles.length < 4) {
              setLocalAddressProofFiles(prev => [...prev, reader.result as string]);
            } else {
              alert("Maximum 4 files allowed for Local Address Proof.");
            }
          }
          if (field === "cheque") setCancelledChequePhoto(reader.result);
          if (field === "cheque2") setCheque2Photo(reader.result);
          if (field === "cheque3") setCheque3Photo(reader.result);
          if (field === "signature") setSignaturePhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const loadRecordForEdit = async (id: number) => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/onboarding/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Record not found");
      const data = await res.json();
      setRecordCreatedBy(data.created_by || null);
      
      setEditingId(data.id);
      setCandidateRole(data.vendor_type || "Driver");
      setAutoGeneratedId(data.driver_id || "");
      setDriverName(data.driver_name || "");
      setPhoneNumber(data.phone_number || "");
      setWhatsappNumber(data.whatsapp_number || "");
      setDifferentWhatsapp(data.whatsapp_number && data.whatsapp_number !== data.phone_number);
      setDob(data.dob || "");
      setCity(data.city || "Hyderabad");
      const pAddr = data.present_address || "";
      const permAddr = data.permanent_address || "";
      
      setPresentAddress(pAddr.split(',')[0] || "");
      const pParts = pAddr.split(',').map((s: string) => s.trim());
      setPresentCity(pParts[1] || "");
      setPresentState(pParts[2] || "");
      setPresentPincode((pParts[3] || "").replace(/India\s*-\s*/, "").trim());
      
      setPermanentAddress(permAddr.split(',')[0] || "");
      const permParts = permAddr.split(',').map((s: string) => s.trim());
      setPermanentCity(permParts[1] || "");
      setPermanentState(permParts[2] || "");
      setPermanentPincode((permParts[3] || "").replace(/India\s*-\s*/, "").trim());

      setSameAsPresentAddress(pAddr === permAddr && pAddr !== "");
      setOperatingPlace(data.operating_place || data.city || "Hyderabad");
      setEmergencyName(data.emergency_name || "Sunita Sharma");
      setEmergencyRelationship(data.emergency_relationship || "Spouse");
      setEmergencyPhone(data.emergency_phone || "9876500991");
      setDlNumber(data.dl_number || data.driving_license || "DL-0420269988");
      setDlExpiryDate(data.dl_expiry_date || "2030-12-31");
      const [lsource, ...lsdetails] = (data.lead_source || "").split(" - ");
      setLeadSource(lsource || "Direct Lead");
      setSourceDetails(lsdetails.join(" - ") || "");
      setPanNumber(data.pan_number || "ABCDE1234F");
      setAadhaarNumber(data.aadhaar_number || "998877665544");
      setPanAadhaarLinked(data.pan_aadhaar_linked || "Yes");
      setIsSpringVerified(data.is_spring_verified ?? true);

      setRentalModel(data.rental_model || data.driver_plan || "Drive to Rent");
      setSecurityDeposit(data.security_deposit || "5000.00");
      setLetzownCheques(data.letzown_cheques?.toString() || "3");
      setCustomRentAmount(data.custom_rent_amount || "");
      
      setSelfiePhoto(data.selfie_photo || null);
      setDlFront(data.dl_front || null);
      setDlBack(data.dl_back || null);
      setPanCardPhoto(data.pan_card_photo || null);
      setAadhaarPhoto(data.aadhaar_card_photo || null);
      setAadhaarCardFront(data.aadhaar_card_front || null);
      setAadhaarCardBack(data.aadhaar_card_back || null);
      
      if (data.local_address_proof) {
        try {
          if (typeof data.local_address_proof === 'string' && data.local_address_proof.startsWith("[")) {
            setLocalAddressProofFiles(JSON.parse(data.local_address_proof));
          } else if (Array.isArray(data.local_address_proof)) {
            setLocalAddressProofFiles(data.local_address_proof);
          } else {
            setLocalAddressProofFiles([data.local_address_proof]);
          }
        } catch (e) {
          setLocalAddressProofFiles([data.local_address_proof]);
        }
      } else {
        setLocalAddressProofFiles([]);
      }
      setDriverEmail(data.driver_email || "");
      setRef1Name(data.ref1_name || "");
      setRef1Phone(data.ref1_phone || "");
      setRef1Address(data.ref1_address || "");
      setRef2Name(data.ref2_name || "");
      setRef2Phone(data.ref2_phone || "");
      setRef2Address(data.ref2_address || "");
      setRef3Name(data.ref3_name || "");
      setRef3Phone(data.ref3_phone || "");
      setRef3Address(data.ref3_address || "");
      setVendorName(data.vendor_name || "");
      setVendorId(data.vendor_id || "");
      setFatherName(data.father_name || "Rameshwar Sharma");
      setBankName(data.bank_name || "State Bank of India");
      setOtherBankName(data.other_bank_name || "");
      setAccountName(data.account_name || data.driver_name || "");
      setAccountNumber(data.account_number || "987654321098");
      setIfscCode(data.ifsc_code || "SBIN0001234");
      setUpiId(data.upi_id || "candidate@upi");
      setDocumentsVerified(data.documents_verified !== false);
      setSameAsCandidateName(data.same_as_candidate_name ?? true);
      setCustomRentalPlan(data.custom_rental_plan || false);
      setCancelledChequePhoto(data.cancelled_cheque_photo || null);
      setCheque2Photo(data.cheque2_photo || null);
      setCheque3Photo(data.cheque3_photo || null);
      setSignaturePhoto(data.signature_photo || null);
      setApprovalRemarks(data.approval_remarks || "All documents verified and physical inspection complete.");
      setApprovalStatus(data.approval_status || null);
      
      try {
        const pDetails = typeof data.platform_details === 'string' ? JSON.parse(data.platform_details) : (data.platform_details || {});
        setPlatformDetails(pDetails);
        const platforms = Object.keys(pDetails).filter(k => k !== 'selected_platforms');
        setThirdPartyPlatform(platforms.length > 0 ? platforms[0] : "None");
      } catch (e) {
        setPlatformDetails({});
        setThirdPartyPlatform("None");
      }
      
      setActiveTab("form");
      setRetrieveIdInput("");
      setCurrentStep(initialStep || 1);
    } catch (err: any) {
      alert(err.message);
    }
  };

  useEffect(() => {
    if (initialEditId) {
      loadRecordForEdit(initialEditId);
    }
  }, [initialEditId]);

  const handleReviewAction = async (actionType: "APPROVE" | "REJECT" | "FORWARD") => {
    if (actionType === "REJECT" && !reviewRemarks.trim()) {
      alert("Please enter a reason/remarks for return");
      return;
    }
    if (actionType === "FORWARD" && !forwardToId) {
      alert("Please select an approver to forward to");
      return;
    }
    setActionLoading(true);
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/july/approval/individual_onboarding/${editingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: actionType,
          remarks: reviewRemarks || null,
          forward_to_user_id: forwardToId
        })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Action failed");
      }
      alert(`Record ${actionType === "APPROVE" ? "Approved" : actionType === "REJECT" ? "Returned for Revision" : "Forwarded"} successfully!`);
      onBackToSelector();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectSuggestion = (item: any) => {
    if (item.type === "onboarding") {
      loadRecordForEdit(item.id);
    } else {
      setLinkedWalkinId(item.id);
      setDriverName(item.person_name || `${item.first_name || ""} ${item.last_name || ""}`.trim());
      setPhoneNumber(item.person_number || "");
      if (item.city) {
        const matchedCity = CITIES.find(c => c.value === item.city || c.text === item.city);
        if (matchedCity) setCity(matchedCity.value);
      }
      if (item.dl_number) setDlNumber(item.dl_number);
      if (item.aadhaar_number) setAadhaarNumber(item.aadhaar_number);
      alert(`Linked to Walk-in record #${item.id} (${item.person_name || ""}) and pre-filled candidate info.`);
    }
    setSearchRetrieveQuery("");
    setRetrieveResults([]);
  };

  const handleRetrieveId = async () => {
    const id = parseInt(retrieveIdInput);
    if (!id || id <= 0) return alert("Please enter a valid numeric ID");
    await loadRecordForEdit(id);
  };

  const handleWalkinSearch = async () => {
    if (!walkinSearchInput.trim()) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/walkins/search?q=${encodeURIComponent(walkinSearchInput)}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      
      if (data.length === 0) {
        alert("No walk-in or unverified record found for that query.");
        return;
      }
      
      const record = data[0]; 
      if (window.confirm(`Found Record: ${record.person_name} (${record.person_number}). Link and autofill?`)) {
        setLinkedWalkinId(record.id);
        if (record.person_name) setDriverName(record.person_name);
        if (record.person_number) setPhoneNumber(record.person_number.replace(/\D/g, '').slice(0, 10));
        if (record.city) {
          const matchedCity = CITIES.find(c => c.value === record.city || c.text === record.city);
          if (matchedCity) setCity(matchedCity.value);
        }
        if (record.dl_number) setDlNumber(record.dl_number);
        if (record.aadhaar_number) setAadhaarNumber(record.aadhaar_number);
        setWalkinSearchInput("");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportCSV = () => {
    if (records.length === 0) {
      alert("No entries available to export.");
      return;
    }

    const headers = [
      "ID", "Role", "Driver Name", "Phone", "DOB", "City", "DL Number", 
      "DL Expiry", "Plan", "PAN Number", "Aadhaar", "Created At"
    ];

    const rows = records.map((r) => [
      r.id,
      `"${r.vendor_type || 'Driver'}"`,
      `"${r.driver_name}"`,
      `"${r.phone_number}"`,
      r.dob,
      `"${r.city}"`,
      `"${r.dl_number}"`,
      r.dl_expiry_date,
      `"${r.custom_rental_plan ? 'Custom' : 'Standard'}"`,
      maskSensitiveID(r.pan_number),
      maskSensitiveID(r.aadhaar_number),
      r.created_at
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `driver_onboarding_export_${new Date().toISOString().substring(0,10)}.csv`;
    link.click();
  };

  const removePhoto = (field: string) => {
    if (field === "selfie") setSelfiePhoto(null);
    if (field === "dl_front") setDlFront(null);
    if (field === "dl_back") setDlBack(null);
    if (field === "pan") setPanCardPhoto(null);
    if (field === "aadhaar") setAadhaarPhoto(null);
    if (field === "aadhaar_front") setAadhaarCardFront(null);
    if (field === "aadhaar_back") setAadhaarCardBack(null);
    if (field === "local_address_proof") setLocalAddressProof(null);
    if (field === "cheque") setCancelledChequePhoto(null);
    if (field === "cheque2") setCheque2Photo(null);
    if (field === "cheque3") setCheque3Photo(null);
    if (field === "signature") setSignaturePhoto(null);
  };

  // RESTORED: Razorpay IFSC auto-fetch logic
  const handleIfscBlur = async () => {
    if (ifscCode.length === 11) {
      try {
        const res = await fetch(`https://ifsc.razorpay.com/${ifscCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data.BANK) {
            const knownBanks = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank", "IndusInd Bank", "Yes Bank", "Federal Bank", "Bank of Baroda", "Punjab National Bank", "Canara Bank", "Union Bank of India", "IDBI Bank"];
            
            const matched = knownBanks.find(b => data.BANK.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(data.BANK.toLowerCase()));
            if (matched) {
              setBankName(matched);
            } else {
              setBankName("Other");
              setOtherBankName(data.BANK);
            }
          }
        }
      } catch (err) {
        console.error("IFSC lookup failed", err);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg font-sans">
      
      {/* 1. Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white shadow-xs">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6">
          
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
              Partner Onboarding
            </span>
          </div>

          {/* Navigation Tab Pills */}
          <nav className="flex gap-2">
            {!isReadOnly && (
              <button
                onClick={() => setActiveTab("form")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "form" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
              >
                <FileText className="h-4 w-4" />
                Partner Form
              </button>
            )}
            {!isReadOnly && (
              <button
                onClick={() => setActiveTab("drafts")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "drafts" ? "bg-amber-600 text-white shadow-sm shadow-amber-600/20" : "text-text-muted hover:bg-slate-100 hover:text-amber-600" }`}
              >
                <Clock className="h-4 w-4" />
                Saved Drafts
                {records.filter(r => r.approval_status === "Draft").length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-extrabold">
                    {records.filter(r => r.approval_status === "Draft").length}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setActiveTab("registry")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "registry" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <Database className="h-4 w-4" />
              Onboarding Registry
            </button>
          </nav>

          {/* Clock & Profile Pill */}
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
                <span className="font-sans text-xs font-semibold leading-none text-text">{user.name}</span>
                {isReadOnly ? (
                  <span className="font-mono text-[9px] text-red-500 mt-1 leading-none font-bold">Read Only</span>
                ) : (
                  <span className="font-mono text-[9px] text-text-muted mt-1 leading-none">ID: {user.executive_id}</span>
                )}
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

      {/* 2. Main Content Area */}
      <main className="flex-grow mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-8">
        
        {/* --- FORM TAB --- */}
        {activeTab === "form" && (
          <div className="max-w-[1280px] mx-auto">
            
            {/* Form Card */}
            <div className="bg-surface rounded-2xl shadow-xl shadow-slate-200/50 border border-border/40 overflow-visible relative">
              
              <div className="bg-primary px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-30 overflow-visible">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20 pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <img src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" className="h-8 brightness-0 invert" alt="LetzRyd" referrerPolicy="no-referrer" />
                    <span className="px-2 py-0.5 rounded border border-white/30 bg-white/20 text-white text-[10px] font-bold tracking-widest backdrop-blur-sm">
                      LetzRyd Desk
                    </span>
                  </div>
                  <h1 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                    {editingId ? `Edit Record #${editingId}` : "Onboarding"}
                  </h1>
                </div>

                {!editingId && (
                  <div className="relative w-full max-w-sm">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                      <input
                        type="text"
                        placeholder="Search to edit/link... (Name, Phone, ID)"
                        value={searchRetrieveQuery}
                        onChange={(e) => setSearchRetrieveQuery(e.target.value)}
                        onFocus={() => setIsRetrieveFocused(true)}
                        onBlur={() => setTimeout(() => setIsRetrieveFocused(false), 200)}
                        className="h-10 w-full rounded-lg bg-white/20 border border-white/35 pl-9 pr-4 text-sm font-semibold text-white placeholder:text-white/70 outline-none focus:bg-white focus:text-slate-900 focus:placeholder:text-slate-400 transition-all"
                      />
                    </div>
                    {isRetrieveFocused && retrieveResults.length > 0 && (
                      <div className="absolute top-12 left-0 w-full bg-white rounded-lg shadow-xl border border-border z-50 overflow-hidden flex flex-col max-h-64 overflow-y-auto">
                        {retrieveResults.map((r: any, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={() => handleSelectSuggestion(r)}
                            className="flex flex-col items-start px-4 py-3 border-b border-border hover:bg-green-50 transition-colors text-left cursor-pointer"
                          >
                            <div className="flex justify-between w-full">
                              <span className="font-bold text-sm text-slate-900">{r.label}</span>
                              <span className="text-xs font-mono text-text-dim">{r.subtitle}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {editingId && (
                <div className="bg-yellow-50 px-8 py-3 border-b border-yellow-200 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-yellow-800 text-sm font-semibold">
                    <Edit className="h-4 w-4" />
                    Editing existing Record #{editingId}
                  </div>
                  <button 
                    onClick={() => { resetForm(); }}
                    className="text-xs text-yellow-700 hover:text-yellow-900 font-bold underline"
                  >
                    Cancel Edit
                  </button>
                </div>
              )}

              <div className="p-8 pb-10">
                <form onSubmit={handleFormSubmit}>
                  
                  {/* Top Status Banner */}
                  {(approvalStatus === "Changes Requested" || approvalStatus === "Revision Req.") && approvalRemarks && (
                    <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl shadow-xs">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wider mb-1">Revision Instructions</p>
                          <p className="text-sm font-semibold text-amber-900">{approvalRemarks}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {approvalStatus === "Rejected" && (
                    <div className="mb-6 p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl shadow-xs">
                      <div className="flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-extrabold text-rose-900 uppercase tracking-wider mb-1">Application Rejected</p>
                          <p className="text-sm font-semibold text-rose-900">{approvalRemarks || "This application was reviewed and rejected by the approving manager."}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {approvalStatus === "Approved" && (
                    <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl shadow-xs">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider mb-1">Application Approved</p>
                          <p className="text-sm font-semibold text-emerald-900">{approvalRemarks || "This application has been fully reviewed and approved."}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* MULTI-STEP PROGRESS BAR */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between relative w-full">
                      <div className="absolute left-[10%] right-[10%] top-[16px] -translate-y-1/2 h-1 bg-slate-100 rounded-full z-0"></div>
                      <div className="absolute left-[10%] top-[16px] -translate-y-1/2 h-1 bg-primary rounded-full z-0 transition-all duration-500" style={{ width: `calc(${((currentStep - 1) / 4) * 80}%)` }}></div>
                      
                      {[
                        { step: 1, label: "Candidate Info" },
                        { step: 2, label: "KYC & Docs" },
                        { step: 3, label: "Rent & Operator" },
                        { step: 4, label: "Bank & Verify" },
                        { step: 5, label: "Review & Approval" }
                      ].map((s) => (
                        <div 
                          key={s.step} 
                          onClick={() => setCurrentStep(s.step)}
                          className="relative z-10 flex-1 flex flex-col items-center gap-2 cursor-pointer group px-1"
                        >
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${currentStep >= s.step ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-white border-2 border-slate-200 text-slate-400 group-hover:border-primary group-hover:text-primary'}`}>
                            {currentStep > s.step ? <Check className="h-4 w-4" /> : s.step}
                          </div>
                          <span className={`text-[10px] sm:text-xs font-bold text-center leading-none h-6 flex items-center justify-center max-w-[110px] ${currentStep >= s.step ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`}>
                            {s.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ======================================= */}
                  {/* STEP 1: CANDIDATE INFO & EMERGENCY      */}
                  {/* ======================================= */}
                  <div className={`${currentStep === 1 ? 'block' : 'hidden'} space-y-6 animate-in fade-in slide-in-from-right-4 duration-500`}>
                    
                    {/* MANAGER REVISION REQUEST BANNER */}
                    {approvalRemarks && (approvalStatus === "Changes Requested" || approvalStatus === "Revision Req.") && (
                      <div className="mb-6 bg-orange-50 border-2 border-orange-300 rounded-2xl p-5 flex items-start gap-4 shadow-sm animate-in fade-in">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0 mt-0.5">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-extrabold text-orange-900 uppercase tracking-wider block">Manager Revision Request &amp; Feedback:</span>
                          <p className="text-sm font-bold text-orange-950 mt-1 bg-white/80 p-3 rounded-xl border border-orange-200 shadow-2xs leading-relaxed">{approvalRemarks}</p>
                          <p className="text-xs text-orange-800 mt-2 font-medium">Please update the form details according to the manager's instructions above, then proceed to Step 5 to click <strong>Save &amp; Resubmit for Approval</strong>.</p>
                        </div>
                      </div>
                    )}

                    {/* AUTO-FILL BANNER */}
                    {foundWalkinRecord && !autoFillApplied && !isDuplicate && (
                      <div className="mb-6 bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-primary shrink-0">
                            <UserCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">Matching Walk-In Record Found!</span>
                            <span className="text-xs text-slate-600">Walk-in #{foundWalkinRecord.id} — <strong className="text-slate-900">{foundWalkinRecord.person_name}</strong> ({foundWalkinRecord.city || 'Location'})</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={applyWalkinAutoFill}
                          className="bg-primary hover:bg-primary-dark text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-all shadow-sm cursor-pointer flex items-center gap-2 shrink-0"
                        >
                          <Download className="w-4 h-4" />
                          Click to Auto-Fill Candidate Info
                        </button>
                      </div>
                    )}

                    {autoFillBanner && (
                      <div className={`mb-6 p-4 rounded-xl text-xs font-medium flex items-start gap-3 border ${
                        isDuplicate 
                          ? 'bg-red-50 border-red-200 text-red-700' 
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      }`}>
                        <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isDuplicate ? 'text-red-500' : 'text-emerald-500'}`} />
                        <span>{autoFillBanner}</span>
                      </div>
                    )}

                    <div className="mb-6 bg-slate-50 border border-border p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Onboarding Type</h4>
                        <p className="text-[10px] text-text-muted mt-0.5">Select if you are onboarding a Driver or an Operator</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="candidateRole" value="Driver" checked={candidateRole === "Driver"} onChange={() => setCandidateRole("Driver")} className="accent-primary w-4 h-4" />
                          <span className="font-sans text-sm font-bold text-slate-800">Driver</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="candidateRole" value="Operator" checked={candidateRole === "Operator"} onChange={() => setCandidateRole("Operator")} className="accent-primary w-4 h-4" />
                          <span className="font-sans text-sm font-bold text-slate-800">Operator</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">{candidateRole} Name *</label>
                        <input type="text" required={currentStep === 1} value={driverName} onChange={(e) => {
                          setDriverName(e.target.value);
                          if (sameAsDriver && candidateRole === "Driver") setVendorName(e.target.value);
                        }} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Full Name as per Aadhaar" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">Parent's Name *</label>
                        <input type="text" required={currentStep === 1} value={fatherName} onChange={(e) => setFatherName(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Parent's Full Name" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted flex items-center justify-between">
                          <span>Phone Number *</span>
                          <span className="text-[10px] text-primary italic font-bold">Search & Auto-fill</span>
                        </label>
                        <div className="relative flex items-center">
                          <input 
                            type="tel" 
                            required={currentStep === 1} 
                            value={phoneNumber} 
                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                            className={`w-full h-11 pl-4 pr-24 bg-slate-50 border rounded-xl text-sm focus:bg-white focus:ring-2 outline-none transition-all ${isDuplicate ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-border focus:border-primary focus:ring-primary/20'}`} 
                            placeholder="10-digit mobile" 
                            maxLength={10} 
                          />
                          <button
                            type="button"
                            onClick={handleFetchByPhone}
                            className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Search className="w-3.5 h-3.5" />
                            Fetch
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-text-muted">WhatsApp Number</label>
                          <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-600 cursor-pointer hover:text-primary">
                            <input 
                              type="checkbox" 
                              checked={differentWhatsapp} 
                              onChange={(e) => {
                                setDifferentWhatsapp(e.target.checked);
                                if (!e.target.checked) setWhatsappNumber("");
                              }} 
                              className="rounded border-border text-primary focus:ring-primary/20 cursor-pointer" 
                            /> Different?
                          </label>
                        </div>
                        <input 
                          type="tel" 
                          disabled={!differentWhatsapp} 
                          value={differentWhatsapp ? whatsappNumber : phoneNumber} 
                          onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                          className={`w-full h-11 px-4 border rounded-xl text-sm outline-none transition-all ${
                            differentWhatsapp 
                              ? 'bg-white border-border text-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 font-medium' 
                              : 'bg-slate-50 border-border/80 text-slate-500 opacity-80 cursor-not-allowed'
                          }`} 
                          placeholder={differentWhatsapp ? "Enter 10-digit WhatsApp number" : "Same as phone"} 
                          maxLength={10} 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">Date of Birth *</label>
                        <input type="date" required={currentStep === 1} value={dob} onChange={(e) => setDob(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">Operating City *</label>
                        <select required={currentStep === 1} value={city} onChange={(e) => setCity(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                          {CITIES.map(c => <option key={c.value} value={c.value}>{c.text}</option>)}
                        </select>
                      </div>

                      <div className="space-y-2 lg:col-span-3">
                        <label className="text-xs font-bold text-text-muted">Present Address *</label>
                        <input type="text" required={currentStep === 1} value={presentAddress} onChange={(e) => {
                          setPresentAddress(e.target.value);
                          if (sameAsPresentAddress) setPermanentAddress(e.target.value);
                        }} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="House/Flat No, Building, Street" />
                      </div>

                      <div className="space-y-2 lg:col-span-3 pt-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-text-muted">Permanent Address *</label>
                          <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer hover:text-primary">
                            <input type="checkbox" checked={sameAsPresentAddress} onChange={(e) => {
                                setSameAsPresentAddress(e.target.checked);
                                if (e.target.checked) {
                                  setPermanentAddress(presentAddress);
                                  setPermanentCity(presentCity);
                                  setPermanentState(presentState);
                                  setPermanentPincode(presentPincode);
                                }
                              }} className="rounded border-border text-primary focus:ring-primary/20" />
                            Same as Present
                          </label>
                        </div>
                        <input type="text" required={currentStep === 1} value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} disabled={sameAsPresentAddress} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-60" placeholder="House/Flat No, Building, Street" />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-border/60">
                      <h4 className="font-sans text-sm font-bold text-text-dim mb-4">Emergency Contact Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Emergency Contact Name *</label>
                          <input type="text" required={currentStep === 1} value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Name" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Relationship *</label>
                          <select required={currentStep === 1} value={emergencyRelationship} onChange={(e) => setEmergencyRelationship(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                            <option value="">Select Relation...</option>
                            <option value="Father">Father</option>
                            <option value="Mother">Mother</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Friend">Friend</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Emergency Phone *</label>
                          <input type="tel" required={currentStep === 1} value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="10-digit number" />
                        </div>
                      </div>
                    </div>

                    </div>

                  {/* ======================================= */}
                  {/* STEP 2: DOCUMENTS & KYC                 */}
                  {/* ======================================= */}
                  <div className={`${currentStep === 2 ? 'block' : 'hidden'} space-y-8 animate-in fade-in slide-in-from-right-4 duration-500`}>
                    
                    {/* PAN & Aadhaar (SpringVerify Integration) */}
                    <div className="bg-slate-50 border border-border p-5 rounded-xl shadow-xs">
                      <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                        <h4 className="font-sans text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" /> Primary KYC
                        </h4>
                        {isSpringVerified ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-green bg-green/10 px-2 py-1 rounded">
                            <CheckCircle className="h-3 w-3" /> Verified by SpringVerify
                          </span>
                        ) : (
                          <button type="button" onClick={handleSpringVerify} disabled={isSpringVerifyLoading} className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded text-[10px] font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer">
                            {isSpringVerifyLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                            {isSpringVerifyLoading ? "Verifying..." : "Verify via SpringVerify"}
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">PAN Number *</label>
                          <div className="relative">
                            <input
                              type={showPan ? "text" : "password"}
                              required={currentStep === 2}
                              value={panNumber}
                              onChange={(e) => setPanNumber(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10))}
                              className="w-full h-11 pl-4 pr-10 border border-border rounded-xl text-sm font-mono outline-none focus:border-primary"
                              placeholder="ABCDE1234F"
                              maxLength={10}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPan(!showPan)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-1"
                              title={showPan ? "Mask PAN Number" : "Unmask PAN Number"}
                            >
                              {showPan ? <EyeOff className="w-4 h-4 text-primary" /> : <Eye className="w-4 h-4 text-slate-500" />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Aadhaar Number *</label>
                          <div className="relative">
                            <input
                              type={showAadhaar ? "text" : "password"}
                              required={currentStep === 2}
                              value={aadhaarNumber}
                              onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '').slice(0, 12);
                                setAadhaarNumber(val.replace(/(\d{4})(?=\d)/g, "$1 "));
                              }}
                              className="w-full h-11 pl-4 pr-10 border border-border rounded-xl text-sm font-mono outline-none focus:border-primary"
                              placeholder="0000 0000 0000"
                              maxLength={14}
                            />
                            <button
                              type="button"
                              onClick={() => setShowAadhaar(!showAadhaar)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-1"
                              title={showAadhaar ? "Mask Aadhaar Number" : "Unmask Aadhaar Number"}
                            >
                              {showAadhaar ? <EyeOff className="w-4 h-4 text-primary" /> : <Eye className="w-4 h-4 text-slate-500" />}
                            </button>
                          </div>
                        </div>
                      </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
                        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-white p-3">
                          <span className="font-sans text-[11px] font-bold text-slate-800 text-center">Selfie Photo *</span>
                          {selfiePhoto ? (
                            <div className="relative flex-grow flex items-center justify-center rounded-lg p-2">
                              <img src={selfiePhoto} alt="Selfie Photo" className="max-h-20 object-contain rounded shadow-xs" />
                              <button type="button" onClick={() => removePhoto("selfie")} className="absolute top-1 right-1 rounded-full bg-rose-50 text-rose-500 p-1 hover:bg-rose-100 transition-all cursor-pointer"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center flex-grow p-2 gap-2 border border-border/50 bg-slate-50 rounded-lg">
                              <div className="flex gap-1.5 w-full">
                                <button type="button" onClick={() => setCameraActiveField("selfie")} className="flex-1 flex items-center justify-center gap-1 rounded bg-primary text-white text-[10px] font-semibold py-1.5 hover:bg-primary-hover transition-colors cursor-pointer"><Camera className="h-3 w-3" /> Capture</button>
                                <label className="flex-1 flex items-center justify-center gap-1 rounded border border-border bg-white text-text-muted text-[10px] font-semibold py-1.5 hover:bg-slate-100 transition-colors cursor-pointer"><Upload className="h-3 w-3" /> Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "selfie")} /></label>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-white p-3">
                          <span className="font-sans text-[11px] font-bold text-text-muted text-center">PAN Card Photo</span>
                          {panCardPhoto ? (
                            <div className="relative flex-grow flex items-center justify-center rounded-lg p-2">
                              <img src={panCardPhoto} alt="PAN Card" className="max-h-20 object-contain rounded shadow-xs" />
                              <button type="button" onClick={() => removePhoto("pan")} className="absolute top-1 right-1 rounded-full bg-rose-50 text-rose-500 p-1 hover:bg-rose-100 transition-all cursor-pointer"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center flex-grow p-2 gap-2 border border-border/50 bg-slate-50 rounded-lg">
                              <div className="flex gap-1.5 w-full">
                                <button type="button" onClick={() => setCameraActiveField("pan")} className="flex-1 flex items-center justify-center gap-1 rounded bg-primary text-white text-[10px] font-semibold py-1.5 hover:bg-primary-hover transition-colors cursor-pointer"><Camera className="h-3 w-3" /> Capture</button>
                                <label className="flex-1 flex items-center justify-center gap-1 rounded border border-border bg-white text-text-muted text-[10px] font-semibold py-1.5 hover:bg-slate-100 transition-colors cursor-pointer"><Upload className="h-3 w-3" /> Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "pan")} /></label>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-white p-3">
                          <span className="font-sans text-[11px] font-bold text-text-muted text-center">Aadhaar Card – Front *</span>
                          {aadhaarCardFront ? (
                            <div className="relative flex-grow flex items-center justify-center rounded-lg p-2">
                              <img src={aadhaarCardFront} alt="Aadhaar Front" className="max-h-20 object-contain rounded shadow-xs" />
                              <button type="button" onClick={() => removePhoto("aadhaar_front")} className="absolute top-1 right-1 rounded-full bg-rose-50 text-rose-500 p-1 hover:bg-rose-100 transition-all cursor-pointer"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center flex-grow p-2 gap-2 border border-border/50 bg-slate-50 rounded-lg">
                              <div className="flex gap-1.5 w-full">
                                <button type="button" onClick={() => setCameraActiveField("aadhaar_front")} className="flex-1 flex items-center justify-center gap-1 rounded bg-primary text-white text-[10px] font-semibold py-1.5 hover:bg-primary-hover transition-colors cursor-pointer"><Camera className="h-3 w-3" /> Capture</button>
                                <label className="flex-1 flex items-center justify-center gap-1 rounded border border-border bg-white text-text-muted text-[10px] font-semibold py-1.5 hover:bg-slate-100 transition-colors cursor-pointer"><Upload className="h-3 w-3" /> Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "aadhaar_front")} /></label>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-white p-3">
                          <span className="font-sans text-[11px] font-bold text-text-muted text-center">Aadhaar Card – Back *</span>
                          {aadhaarCardBack ? (
                            <div className="relative flex-grow flex items-center justify-center rounded-lg p-2">
                              <img src={aadhaarCardBack} alt="Aadhaar Back" className="max-h-20 object-contain rounded shadow-xs" />
                              <button type="button" onClick={() => removePhoto("aadhaar_back")} className="absolute top-1 right-1 rounded-full bg-rose-50 text-rose-500 p-1 hover:bg-rose-100 transition-all cursor-pointer"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center flex-grow p-2 gap-2 border border-border/50 bg-slate-50 rounded-lg">
                              <div className="flex gap-1.5 w-full">
                                <button type="button" onClick={() => setCameraActiveField("aadhaar_back")} className="flex-1 flex items-center justify-center gap-1 rounded bg-primary text-white text-[10px] font-semibold py-1.5 hover:bg-primary-hover transition-colors cursor-pointer"><Camera className="h-3 w-3" /> Capture</button>
                                <label className="flex-1 flex items-center justify-center gap-1 rounded border border-border bg-white text-text-muted text-[10px] font-semibold py-1.5 hover:bg-slate-100 transition-colors cursor-pointer"><Upload className="h-3 w-3" /> Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "aadhaar_back")} /></label>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Aadhaar-PAN Linkage Status Toggle */}
                      <div className="mt-4 p-4 bg-white border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Aadhaar &amp; PAN Linked for TDS Compliance? *</span>
                          <span className="text-[11px] text-slate-500">Required to ensure valid tax deductions at source</span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                            <input type="radio" name="panAadhaarLinked" value="Yes" checked={panAadhaarLinked === "Yes"} onChange={() => setPanAadhaarLinked("Yes")} className="accent-primary w-4 h-4" />
                            <span className="text-slate-800">Yes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                            <input type="radio" name="panAadhaarLinked" value="No" checked={panAadhaarLinked === "No"} onChange={() => setPanAadhaarLinked("No")} className="accent-primary w-4 h-4" />
                            <span className="text-slate-800">No</span>
                          </label>
                        </div>
                      </div>

                      {/* Multi-Page Local Address Proof */}
                      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-border bg-white p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-sans text-xs font-bold text-slate-800">Local Address Proof (1 to 4 Pages/Files) *</span>
                          <span className="text-[11px] font-semibold text-slate-500">{localAddressProofFiles.length} / 4 Files</span>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {localAddressProofFiles.map((fileUrl, index) => (
                            <div key={index} className="relative bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col items-center">
                              <img src={fileUrl} alt={`Address Proof ${index + 1}`} className="max-h-24 object-contain rounded shadow-xs" />
                              <span className="text-[10px] font-bold text-slate-600 mt-1">Page {index + 1}</span>
                              <button type="button" onClick={() => removeLocalAddressFile(index)} className="absolute top-1 right-1 rounded-full bg-rose-50 text-rose-500 p-1 hover:bg-rose-100 transition-all cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          ))}

                          {localAddressProofFiles.length < 4 && (
                            <div className="flex flex-col items-center justify-center p-3 border border-dashed border-primary/40 bg-emerald-50/40 rounded-lg gap-2 text-center min-h-[100px]">
                              <span className="text-[11px] font-semibold text-slate-700">Add Page {localAddressProofFiles.length + 1}</span>
                              <div className="flex gap-1.5 w-full">
                                <button type="button" onClick={() => setCameraActiveField("local_address_proof")} className="flex-1 flex items-center justify-center gap-1 rounded bg-primary text-white text-[10px] font-bold py-1.5 hover:bg-primary-dark transition-colors cursor-pointer"><Camera className="h-3 w-3" /> Capture</button>
                                <label className="flex-1 flex items-center justify-center gap-1 rounded border border-border bg-white text-slate-700 text-[10px] font-bold py-1.5 hover:bg-slate-100 transition-colors cursor-pointer">
                                  <Upload className="h-3 w-3 text-primary" /> Upload
                                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "local_address_proof")} />
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <hr className="border-border/60" />

                    {/* Driving License Block */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Driving License Number {candidateRole === "Driver" && "*"}</label>
                          <div className="relative">
                            <input
                              type={showDl ? "text" : "password"}
                              required={currentStep === 2 && candidateRole === "Driver"}
                              value={dlNumber}
                              onChange={(e) => setDlNumber(e.target.value.toUpperCase())}
                              className="w-full h-11 pl-4 pr-10 bg-slate-50 border border-border rounded-xl text-sm font-mono focus:bg-white focus:border-primary outline-none transition-all"
                              placeholder="e.g. MH04 20110012345"
                            />
                            <button
                              type="button"
                              onClick={() => setShowDl(!showDl)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                            >
                              {showDl ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">DL Expiry Date {candidateRole === "Driver" && "*"}</label>
                          <input type="date" required={currentStep === 2 && candidateRole === "Driver"} value={dlExpiryDate} onChange={(e) => setDlExpiryDate(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none transition-all" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-slate-50 p-3">
                          <span className="font-sans text-[11px] font-bold text-text-muted text-center">DL Front {candidateRole === "Driver" && "*"}</span>
                          {dlFront ? (
                            <div className="relative flex-grow flex items-center justify-center bg-white rounded-lg p-2">
                              <img src={dlFront} alt="DL Front" className="max-h-20 object-contain rounded shadow-xs" />
                              <button type="button" onClick={() => removePhoto("dl_front")} className="absolute top-1 right-1 rounded-full bg-rose-50 text-rose-500 p-1 hover:bg-rose-100 transition-all cursor-pointer"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center flex-grow p-2 gap-2 border border-border/50 bg-white rounded-lg">
                              <div className="flex gap-1.5 w-full">
                                <button type="button" onClick={() => setCameraActiveField("dl_front")} className="flex-1 flex items-center justify-center gap-1 rounded bg-primary text-white text-[10px] font-semibold py-1.5 hover:bg-primary-hover transition-colors cursor-pointer"><Camera className="h-3 w-3" /> Capture</button>
                                <label className="flex-1 flex items-center justify-center gap-1 rounded border border-border bg-white text-text-muted text-[10px] font-semibold py-1.5 hover:bg-slate-100 transition-colors cursor-pointer"><Upload className="h-3 w-3" /> Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "dl_front")} /></label>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-slate-50 p-3">
                          <span className="font-sans text-[11px] font-bold text-text-muted text-center">DL Back {candidateRole === "Driver" && "*"}</span>
                          {dlBack ? (
                            <div className="relative flex-grow flex items-center justify-center bg-white rounded-lg p-2">
                              <img src={dlBack} alt="DL Back" className="max-h-20 object-contain rounded shadow-xs" />
                              <button type="button" onClick={() => removePhoto("dl_back")} className="absolute top-1 right-1 rounded-full bg-rose-50 text-rose-500 p-1 hover:bg-rose-100 transition-all cursor-pointer"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center flex-grow p-2 gap-2 border border-border/50 bg-white rounded-lg">
                              <div className="flex gap-1.5 w-full">
                                <button type="button" onClick={() => setCameraActiveField("dl_back")} className="flex-1 flex items-center justify-center gap-1 rounded bg-primary text-white text-[10px] font-semibold py-1.5 hover:bg-primary-hover transition-colors cursor-pointer"><Camera className="h-3 w-3" /> Capture</button>
                                <label className="flex-1 flex items-center justify-center gap-1 rounded border border-border bg-white text-text-muted text-[10px] font-semibold py-1.5 hover:bg-slate-100 transition-colors cursor-pointer"><Upload className="h-3 w-3" /> Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "dl_back")} /></label>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex items-start gap-3 bg-blue-50/50 border border-blue-100 p-4 rounded-xl">
                      <input type="checkbox" required={currentStep === 2} id="docs_verified" checked={documentsVerified} onChange={(e) => setDocumentsVerified(e.target.checked)} className="mt-1 h-5 w-5 rounded border-border text-primary focus:ring-primary/20" />
                      <label htmlFor="docs_verified" className="text-sm font-semibold text-text-muted cursor-pointer">
                        I verify that the candidate's name and photo match exactly across all uploaded documents (Aadhaar, PAN, DL).
                      </label>
                    </div>

                  </div>

                  {/* ======================================= */}
                  {/* STEP 3: RENT & CONFIGURATION (LetzOwn)  */}
                  {/* ======================================= */}
                  <div className={`${currentStep === 3 ? 'block' : 'hidden'} space-y-6 animate-in fade-in slide-in-from-right-4 duration-500`}>
                    
                    <h4 className="font-sans text-sm font-bold text-text-dim border-b border-border pb-2">Rental &amp; Platform Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50 border border-border p-5 rounded-xl">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800">Select Rental Model *</label>
                        <select required={currentStep === 3} value={rentalModel} onChange={(e) => setRentalModel(e.target.value)} className="w-full h-11 px-4 bg-white border border-border rounded-xl text-sm outline-none focus:border-primary">
                          <option value="Drive to Rent">Drive to Rent</option>
                          <option value="Drive to Own">Drive to Own</option>
                          <option value="LetzOwn">LetzOwn</option>
                          <option value="Salary Model">Salary Model</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800">Security Deposit Amount *</label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                          <input type="number" required={currentStep === 3} value={securityDeposit} onChange={(e) => setSecurityDeposit(e.target.value)} className="w-full h-11 pl-9 pr-4 bg-white border border-border rounded-xl text-sm outline-none focus:border-primary" placeholder="e.g. 5000" />
                        </div>
                      </div>

                      {(rentalModel === "Drive to Own" || rentalModel === "LetzOwn") && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-800">Required LetzOwn Cheques *</label>
                          <select required={currentStep === 3} value={letzownCheques} onChange={(e) => setLetzownCheques(e.target.value)} className="w-full h-11 px-4 bg-white border border-border rounded-xl text-sm outline-none focus:border-primary">
                            <option value="3">3 Cheques</option>
                            <option value="4">4 Cheques</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Section 3: Relocated Third-Party Platform Dropdown (Uber, Ola, Rapido, None) */}
                    <div className="bg-slate-50 border border-border p-5 rounded-xl space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-800">Third-Party Platform Selection</label>
                          <select
                            value={thirdPartyPlatform}
                            onChange={(e) => setThirdPartyPlatform(e.target.value)}
                            className="w-full h-11 px-4 bg-white border border-border rounded-xl text-sm outline-none focus:border-primary font-medium cursor-pointer"
                          >
                            <option value="None">None</option>
                            <option value="Uber">Uber</option>
                            <option value="Ola">Ola</option>
                            <option value="Rapido">Rapido</option>
                          </select>
                        </div>

                        {thirdPartyPlatform !== "None" && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-800">{thirdPartyPlatform} Driver ID <span className="text-slate-400 font-normal">(Optional if verified)</span></label>
                            <input
                              type="text"
                              placeholder={`e.g. ${thirdPartyPlatform.toUpperCase()}-12345`}
                              value={platformDetails[thirdPartyPlatform]?.id || ""}
                              onChange={(e) => setPlatformDetails(prev => ({
                                ...prev,
                                [thirdPartyPlatform]: { ...prev[thirdPartyPlatform], id: e.target.value }
                              }))}
                              className="w-full h-11 px-4 bg-white border border-border rounded-xl text-sm outline-none focus:border-primary font-mono"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {(rentalModel === "Drive to Own" || rentalModel === "LetzOwn") && (
                      <div className="bg-amber-50/50 border border-amber-200/80 p-5 rounded-2xl space-y-5 mt-4">
                        <div className="flex items-center gap-2 border-b border-amber-200 pb-2">
                          <UserCheck className="w-4 h-4 text-amber-700" />
                          <h4 className="font-sans text-xs font-bold text-amber-900 uppercase tracking-wider">LetzOwn Requirement: Driver Email & 3 Personal References</h4>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-800">Driver Email ID *</label>
                            <input type="email" required={currentStep === 3} value={driverEmail} onChange={(e) => setDriverEmail(e.target.value)} className="w-full h-10 px-3 bg-white border border-border rounded-lg text-sm outline-none focus:border-primary font-medium" placeholder="driver@email.com" />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Reference 1 */}
                            <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                              <span className="text-xs font-bold text-primary block border-b border-slate-100 pb-1.5">Reference 1 *</span>
                              <input type="text" required={currentStep === 3} value={ref1Name} onChange={(e) => setRef1Name(e.target.value)} placeholder="Full Name" className="w-full h-9 px-2.5 bg-slate-50 border border-border rounded-lg text-xs outline-none focus:bg-white focus:border-primary transition-all font-medium" />
                              <input type="tel" required={currentStep === 3} value={ref1Phone} onChange={(e) => setRef1Phone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit Phone" className="w-full h-9 px-2.5 bg-slate-50 border border-border rounded-lg text-xs outline-none focus:bg-white focus:border-primary transition-all font-medium" maxLength={10} />
                              <input type="text" required={currentStep === 3} value={ref1Address} onChange={(e) => setRef1Address(e.target.value)} placeholder="Local Address" className="w-full h-9 px-2.5 bg-slate-50 border border-border rounded-lg text-xs outline-none focus:bg-white focus:border-primary transition-all font-medium" />
                            </div>

                            {/* Reference 2 */}
                            <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                              <span className="text-xs font-bold text-primary block border-b border-slate-100 pb-1.5">Reference 2 *</span>
                              <input type="text" required={currentStep === 3} value={ref2Name} onChange={(e) => setRef2Name(e.target.value)} placeholder="Full Name" className="w-full h-9 px-2.5 bg-slate-50 border border-border rounded-lg text-xs outline-none focus:bg-white focus:border-primary transition-all font-medium" />
                              <input type="tel" required={currentStep === 3} value={ref2Phone} onChange={(e) => setRef2Phone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit Phone" className="w-full h-9 px-2.5 bg-slate-50 border border-border rounded-lg text-xs outline-none focus:bg-white focus:border-primary transition-all font-medium" maxLength={10} />
                              <input type="text" required={currentStep === 3} value={ref2Address} onChange={(e) => setRef2Address(e.target.value)} placeholder="Local Address" className="w-full h-9 px-2.5 border border-border rounded-lg text-xs outline-none focus:bg-white focus:border-primary transition-all font-medium" />
                            </div>

                            {/* Reference 3 */}
                            <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                              <span className="text-xs font-bold text-primary block border-b border-slate-100 pb-1.5">Reference 3 *</span>
                              <input type="text" required={currentStep === 3} value={ref3Name} onChange={(e) => setRef3Name(e.target.value)} placeholder="Full Name" className="w-full h-9 px-2.5 bg-slate-50 border border-border rounded-lg text-xs outline-none focus:bg-white focus:border-primary transition-all font-medium" />
                              <input type="tel" required={currentStep === 3} value={ref3Phone} onChange={(e) => setRef3Phone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit Phone" className="w-full h-9 px-2.5 border border-border rounded-lg text-xs outline-none focus:bg-white focus:border-primary transition-all font-medium" maxLength={10} />
                              <input type="text" required={currentStep === 3} value={ref3Address} onChange={(e) => setRef3Address(e.target.value)} placeholder="Local Address" className="w-full h-9 px-2.5 border border-border rounded-lg text-xs outline-none focus:bg-white focus:border-primary transition-all font-medium" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <input type="checkbox" id="customRent" checked={customRentalPlan} onChange={(e) => setCustomRentalPlan(e.target.checked)} className="rounded border-border text-primary focus:ring-primary/20" />
                        <label htmlFor="customRent" className="text-xs font-bold text-text-muted cursor-pointer">Enable Custom Rental Plan overrides?</label>
                      </div>
                      <div className="relative max-w-sm">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                        <input type="number" disabled={!customRentalPlan} required={currentStep === 3 && customRentalPlan} value={customRentAmount} onChange={(e) => setCustomRentAmount(e.target.value)} className="w-full h-11 pl-9 pr-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none transition-all disabled:opacity-60" placeholder="₹ per day override" />
                      </div>
                      {customRentalPlan && <p className="text-[10px] text-amber-600 italic">This will trigger a separate approval workflow for custom rates.</p>}
                    </div>

                    {candidateRole === "Driver" && (
                      <>
                        <h4 className="font-sans text-sm font-bold text-text-dim border-b border-border pb-2 mt-8">Operator Linkage</h4>
                        <div className="space-y-4">
                          <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer hover:text-primary w-max">
                            <input type="checkbox" checked={sameAsDriver} onChange={(e) => {
                              setSameAsDriver(e.target.checked);
                              if (e.target.checked) {
                                setVendorName(driverName);
                                setVendorId(autoGeneratedId || "");
                              } else {
                                setVendorName("");
                                setVendorId("");
                              }
                            }} className="rounded border-border text-primary focus:ring-primary/20" />
                            Operator details same as Driver details (Individual)
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-text-muted">Operator Name</label>
                              <input type="text" value={vendorName} onChange={(e) => setVendorName(e.target.value)} disabled={sameAsDriver} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none transition-all disabled:opacity-60" placeholder="Enter Operator Name" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-text-muted">Operator ID</label>
                              <input type="text" value={vendorId} onChange={(e) => setVendorId(e.target.value)} disabled={sameAsDriver} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none transition-all disabled:opacity-60" placeholder="Enter Operator ID" />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ======================================= */}
                  {/* STEP 4: BANK DETAILS & LEGAL AGREEMENT  */}
                  {/* ======================================= */}
                  <div className={`${currentStep === 4 ? 'block' : 'hidden'} space-y-6 animate-in fade-in slide-in-from-right-4 duration-500`}>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left: Inputs */}
                      <div className="space-y-6">
                        
                        {/* RESTORED: Full 13-Bank Dropdown List */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Bank Name</label>
                          <select value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none transition-all">
                            <option value="State Bank of India">State Bank of India (SBI)</option>
                            <option value="HDFC Bank">HDFC Bank</option>
                            <option value="ICICI Bank">ICICI Bank</option>
                            <option value="Axis Bank">Axis Bank</option>
                            <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                            <option value="IndusInd Bank">IndusInd Bank</option>
                            <option value="Yes Bank">Yes Bank</option>
                            <option value="Federal Bank">Federal Bank</option>
                            <option value="Bank of Baroda">Bank of Baroda</option>
                            <option value="Punjab National Bank">Punjab National Bank (PNB)</option>
                            <option value="Canara Bank">Canara Bank</option>
                            <option value="Union Bank of India">Union Bank of India</option>
                            <option value="IDBI Bank">IDBI Bank</option>
                            <option value="Other">Other (Specify below)</option>
                          </select>
                        </div>
                        {bankName === "Other" && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted">Specify Bank Name *</label>
                            <input type="text" required={currentStep === 4 && bankName === "Other"} value={otherBankName} onChange={(e) => setOtherBankName(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none transition-all" placeholder="Enter bank name" />
                          </div>
                        )}
                        
                        {/* RESTORED: Razorpay IFSC auto-fetch mapping (handleIfscBlur) */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">IFSC Code</label>
                          <input type="text" value={ifscCode} onChange={(e) => setIfscCode(e.target.value.toUpperCase())} onBlur={handleIfscBlur} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm font-mono focus:bg-white focus:border-primary outline-none transition-all" placeholder="e.g. IFSC0001234" maxLength={11} />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Account Number</label>
                          <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm font-mono focus:bg-white focus:border-primary outline-none transition-all" placeholder="9 to 18 digit account no." maxLength={18} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">UPI ID</label>
                          <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value.toLowerCase())} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none transition-all" placeholder="e.g. username@upi" />
                        </div>
                        <div className="pt-2">
                          <label className="flex items-center gap-2 text-sm font-bold text-text-muted cursor-pointer hover:text-primary">
                            <input type="checkbox" checked={sameAsCandidateName} onChange={(e) => setSameAsCandidateName(e.target.checked)} className="rounded border-border text-primary focus:ring-primary/20" />
                            Account Holder Name is same as Candidate's Name ({driverName || "N/A"})
                          </label>
                        </div>
                      </div>
                      
                      {/* Right: Security Cheque + Signature */}
                      <div className="space-y-4">
                        {/* Security Cheque */}
                        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-slate-50 p-3">
                          <span className="font-sans text-[11px] font-bold text-text-muted text-center">Security Cheque <span className="text-primary">*</span></span>
                          {cancelledChequePhoto ? (
                            <div className="relative h-24 flex items-center justify-center bg-white rounded-lg p-2">
                              <img src={cancelledChequePhoto} alt="Security Cheque" className="max-h-20 object-contain rounded shadow-xs" />
                              <button type="button" onClick={() => removePhoto("cheque")} className="absolute top-1 right-1 rounded-full bg-rose-50 text-rose-500 p-1 hover:bg-rose-100 transition-all cursor-pointer"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-20 border border-border/50 bg-white rounded-lg gap-1">
                              <div className="flex gap-1.5 w-full px-2">
                                <button type="button" onClick={() => setCameraActiveField("cheque")} className="flex-1 flex items-center justify-center gap-1 rounded bg-primary text-white text-[10px] font-semibold py-1.5 hover:bg-primary-hover transition-colors cursor-pointer"><Camera className="h-3 w-3" /> Capture</button>
                                <label className="flex-1 flex items-center justify-center gap-1 rounded border border-border bg-white text-text-muted text-[10px] font-semibold py-1.5 hover:bg-slate-100 transition-colors cursor-pointer"><Upload className="h-3 w-3" /> Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "cheque")} /></label>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Security Cheque 2 */}


                        {/* Signature */}
                        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-slate-50 p-3">
                          <span className="font-sans text-[11px] font-bold text-text-muted text-center">Candidate Signature</span>
                          {signaturePhoto ? (
                            <div className="relative h-20 flex items-center justify-center bg-white rounded-lg p-2">
                              <img src={signaturePhoto} alt="Signature" className="max-h-16 object-contain rounded shadow-xs" />
                              <button type="button" onClick={() => removePhoto("signature")} className="absolute top-1 right-1 rounded-full bg-rose-50 text-rose-500 p-1 hover:bg-rose-100 transition-all cursor-pointer"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-16 border border-border/50 bg-white rounded-lg gap-1">
                              <div className="flex gap-1.5 w-full px-2">
                                <button type="button" onClick={() => setCameraActiveField("signature")} className="flex-1 flex items-center justify-center gap-1 rounded bg-primary text-white text-[10px] font-semibold py-1.5 hover:bg-primary-hover transition-colors cursor-pointer"><Camera className="h-3 w-3" /> Capture</button>
                                <label className="flex-1 flex items-center justify-center gap-1 rounded border border-border bg-white text-text-muted text-[10px] font-semibold py-1.5 hover:bg-slate-100 transition-colors cursor-pointer"><Upload className="h-3 w-3" /> Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "signature")} /></label>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* ======================================= */}
                  {/* STEP 5: REVIEW & APPROVAL REQUEST       */}
                  {/* ======================================= */}
                  <div className={`${currentStep === 5 ? 'block' : 'hidden'} space-y-6 animate-in fade-in slide-in-from-right-4 duration-500`}>
                    
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-emerald-900 to-teal-800 text-white p-5 rounded-2xl shadow-sm space-y-1">
                      <h3 className="font-display text-lg font-bold flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-300" />
                        Step 5: Final Review & Approval Request
                      </h3>
                      <p className="text-xs text-emerald-100/90 font-medium">
                        Verify details below. Select the designated Primary Approver and submit for approval or save as draft.
                      </p>
                    </div>

                    {/* Summary Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      
                      {/* Card 1: Candidate Info Summary */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                        <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">1. Candidate Summary</span>
                        <p className="text-sm font-bold text-slate-900">{driverName || "N/A"} <span className="text-xs font-medium text-slate-500">({candidateRole})</span></p>
                        <div className="space-y-1 text-slate-600 text-[11px] border-t border-slate-200/60 pt-2">
                          <p><strong className="text-slate-700">Phone:</strong> {phoneNumber || "N/A"}</p>
                          <p><strong className="text-slate-700">City:</strong> {city}</p>
                          <p><strong className="text-slate-700">DL:</strong> {dlNumber || "N/A"} | <strong className="text-slate-700">Aadhaar:</strong> {aadhaarNumber || "N/A"}</p>
                          <p><strong className="text-slate-700">Father:</strong> {fatherName || "N/A"}</p>
                          <p><strong className="text-slate-700">Emergency:</strong> {emergencyName || "N/A"} ({emergencyPhone || "N/A"})</p>
                        </div>
                      </div>

                      {/* Card 2: Rental Plan Summary */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                        <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">2. Rental & Deposit Plan</span>
                        <p className="text-sm font-bold text-emerald-700">{rentalModel}</p>
                        <div className="space-y-1 text-slate-600 text-[11px] border-t border-slate-200/60 pt-2">
                          <p><strong className="text-slate-700">Security Deposit:</strong> ₹{securityDeposit || "0"}</p>
                          {customRentalPlan && (
                            <p className="text-amber-800 font-bold bg-amber-50 p-1.5 rounded-lg border border-amber-200 mt-1">
                              Custom Rent Override: ₹{customRentAmount}/day
                            </p>
                          )}
                          {candidateRole === "Operator" && vendorName && (
                            <p><strong className="text-slate-700">Operator/Fleet Partner:</strong> {vendorName} ({vendorId})</p>
                          )}
                        </div>
                      </div>

                      {/* Card 3: Bank Summary */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                        <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">3. Bank & Payout Info</span>
                        <p className="text-sm font-bold text-slate-900">{bankName === "Other" ? otherBankName : bankName}</p>
                        <div className="space-y-1 text-slate-600 text-[11px] border-t border-slate-200/60 pt-2">
                          <p><strong className="text-slate-700">Account Number:</strong> <span className="font-mono">{accountNumber || "N/A"}</span></p>
                          <p><strong className="text-slate-700">IFSC Code:</strong> <span className="font-mono">{ifscCode || "N/A"}</span></p>
                          <p><strong className="text-slate-700">UPI ID:</strong> {upiId || "N/A"}</p>
                        </div>
                      </div>

                    </div>

                    {/* Target Approver Selection Box */}
                    {!canManagerApprove && (
                      <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-xs">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                          <h4 className="font-sans text-xs font-bold text-slate-800 uppercase tracking-wider">Select Primary Approver</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <SearchableApproverSelect
                            approvers={approversList}
                            selectedId={approvalRequestedTo}
                            onSelect={(id) => setApprovalRequestedTo(id)}
                            label="Send Approval Request To *"
                          />

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-800">Executive Notes / Submission Remarks</label>
                            <textarea
                              value={approvalSubmissionNote}
                              onChange={(e) => setApprovalSubmissionNote(e.target.value)}
                              placeholder="Add notes for approver regarding custom rates, terms, or special requests..."
                              rows={2}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 resize-none shadow-inner"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Form Footer Navigation */}
                  <div className="pt-8 mt-8 border-t border-border flex flex-col gap-6">

                    {/* FULL-WIDTH MANAGER REVIEW BAR */}
                    {currentStep === 5 && canManagerApprove && (
                      <div className="w-full bg-slate-50 border border-slate-200 p-5 rounded-2xl shadow-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5 text-left">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Approval / Return Message</label>
                            <textarea
                              value={reviewRemarks}
                              onChange={(e) => setReviewRemarks(e.target.value)}
                              placeholder="Add comments, suggestions, or reason for return..."
                              rows={2}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 resize-none font-medium"
                            />
                          </div>
                          
                          <div className="space-y-1.5 text-left">
                            <SearchableApproverSelect
                              approvers={approversList}
                              selectedId={forwardToId}
                              onSelect={(id) => setForwardToId(id)}
                              label="Forward To Approver"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 mt-4 border-t border-slate-200/80">
                          <button
                            type="button"
                            onClick={() => handleReviewAction("APPROVE")}
                            disabled={actionLoading}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewAction("FORWARD")}
                            disabled={actionLoading}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <ArrowRight className="w-4 h-4" /> Forward
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewAction("REJECT")}
                            disabled={actionLoading}
                            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" /> Return for Revision
                          </button>
                        </div>
                      </div>
                    )}

                    {/* BOTTOM NAV BAR */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-xs text-text-muted font-medium">
                        By submitting, you verify all documents have been inspected physically.
                      </p>
                      
                      <div className="flex items-center gap-3">
                        {currentStep > 1 && (
                          <button 
                            type="button" 
                            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-bold text-text-muted hover:bg-slate-50 transition-colors cursor-pointer shadow-xs active:scale-98"
                          >
                            <ChevronLeft className="h-4 w-4" /> Previous Step
                          </button>
                        )}
                        
                        {currentStep < 5 && (
                          <button 
                            type="button"
                            onClick={(e) => {
                              const form = e.currentTarget.closest('form');
                              if (form && !form.checkValidity()) {
                                form.reportValidity();
                                return;
                              }
                              setCurrentStep(currentStep + 1);
                            }}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary-hover shadow-sm transition-colors cursor-pointer active:scale-98"
                          >
                            Next Step <ChevronRight className="h-4 w-4" />
                          </button>
                        )}

                        {currentStep === 5 && !canManagerApprove && (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={(e) => handleFormSubmit(e, "Draft")}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-amber-500 bg-amber-50 hover:bg-amber-100 text-amber-900 text-sm font-bold shadow-xs transition-all cursor-pointer active:scale-95"
                            >
                              <Clock className="h-4 w-4 text-amber-700" /> Save as Draft
                            </button>
                            
                            <button
                              type="button"
                              onClick={(e) => handleFormSubmit(e, "Pending Approval")}
                              disabled={isDuplicate}
                              className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg shadow-emerald-600/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Send className="h-4 w-4" /> {approvalStatus === "Changes Requested" ? "Resubmit for Approval" : "Send for Approval"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </form>
              </div>
            </div>
          </div>
        )}

        {/* --- SAVED DRAFTS TAB --- */}
        {activeTab === "drafts" && (
          <div className="space-y-6">
            
            {/* Bento Grid Metrics for Drafts */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-amber-800 uppercase tracking-wider">Total Saved Drafts</span>
                  <span className="font-sans text-3xl font-extrabold text-amber-700 mt-1">
                    {records.filter(r => r.approval_status === "Draft").length}
                  </span>
                  <span className="font-sans text-[10px] text-amber-600 mt-1">Unsent forms saved locally</span>
                </div>
                <div className="rounded-xl bg-amber-100 text-amber-700 p-3">
                  <Clock className="h-6 w-6" />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-text-dim uppercase tracking-wider">Driver Drafts</span>
                  <span className="font-sans text-3xl font-extrabold text-primary mt-1">
                    {records.filter(r => r.approval_status === "Draft" && (r.candidate_role === "Driver" || r.vendor_type === "Individual Driver")).length}
                  </span>
                  <span className="font-sans text-[10px] text-text-muted mt-1">Individual driver forms in progress</span>
                </div>
                <div className="rounded-xl bg-blue-50 text-primary p-3">
                  <User className="h-6 w-6" />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-text-dim uppercase tracking-wider">Partner / Operator Drafts</span>
                  <span className="font-sans text-3xl font-extrabold text-emerald-700 mt-1">
                    {records.filter(r => r.approval_status === "Draft" && (r.candidate_role === "Operator" || r.vendor_type?.includes("Operator"))).length}
                  </span>
                  <span className="font-sans text-[10px] text-text-muted mt-1">Fleet partner forms in progress</span>
                </div>
                <div className="rounded-xl bg-emerald-50 text-emerald-700 p-3">
                  <UserCheck className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Drafts List Table */}
            <div className="bg-surface rounded-2xl shadow-sm border border-border/60 overflow-hidden relative">
              <div className="bg-white p-6 border-b border-border/40 flex justify-between items-center">
                <div>
                  <h2 className="font-display text-xl font-bold text-primary flex items-center gap-2">
                    <Clock className="h-6 w-6 text-amber-600" />
                    Saved Draft Records
                  </h2>
                  <p className="font-sans text-sm text-text-muted mt-1">Unsent forms saved locally. Click 'Edit Draft' to complete and submit for approval.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { resetForm(); setActiveTab("form"); }}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-green hover:bg-green/95 px-4 font-sans text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" /> New Form Entry
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap border-collapse">
                  <thead className="bg-slate-50 border-b border-border/60">
                    <tr>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">ID</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Candidate Name</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Role & Type</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Contact</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">City</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date Created</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Created By</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Last Edited At</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Last Edited By</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {records.filter(r => r.approval_status === "Draft").length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-6 py-12 text-center text-text-muted font-sans bg-slate-50/50">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <CheckCircle className="h-8 w-8 text-emerald-500 mb-2 opacity-60" />
                            <p className="font-semibold text-slate-800">No saved drafts found!</p>
                            <p className="text-xs">All records have been sent for approval or fully onboarded.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      records
                        .filter(r => r.approval_status === "Draft")
                        .sort((a, b) => {
                          const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
                          const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
                          if (timeB !== timeA) return timeB - timeA;
                          return (b.id || 0) - (a.id || 0);
                        })
                        .map((r) => {
                        const role = r.vendor_type || r.candidate_role || "Driver";
                        const appStatus = r.approval_status || "Draft";
                        const createdDate = formatDisplayDate(r.created_at);
                        const createdTime = formatDisplayTime(r.created_at);
                        const updatedDate = formatDisplayDate(r.updated_at || r.created_at);
                        const updatedTime = formatDisplayTime(r.updated_at || r.created_at);

                        return (
                          <tr key={r.id} className="hover:bg-amber-50/20 transition-colors text-[11px] font-sans">
                            <td className="px-4 py-3 font-mono font-bold text-slate-900">
                              #{r.id}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900 truncate">
                              {r.driver_name}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-sans text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                {role}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-800">
                              {r.phone_number}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700">
                              {r.city}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-800">{createdDate}</div>
                              <div className="text-slate-400 text-[10px] font-medium">{createdTime}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900 truncate">{r.executive_name || user.name || 'Onboarding Exec'}</div>
                              <div className="text-slate-400 text-[10px] font-medium">ID: {r.created_by || user.executive_id || 3}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-800">{updatedDate}</div>
                              <div className="text-slate-400 text-[10px] font-medium">{updatedTime}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900 truncate">{r.updated_by ? (r.updated_by_name || r.executive_name || "Admin") : (r.executive_name || user.name || 'Admin')}</div>
                              <div className="text-slate-400 text-[10px] font-medium">ID: {r.updated_by ? r.updated_by : (r.created_by || user.executive_id || 3)}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                {appStatus}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button 
                                  onClick={() => loadRecordForEdit(r.id)}
                                  className="px-2.5 py-1 border border-slate-200 bg-white hover:bg-amber-50 text-slate-700 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                                  title="Edit / Open Draft in Step 5"
                                >
                                  <Edit className="w-3.5 h-3.5 text-amber-600" /> Edit Draft
                                </button>
                                <button 
                                  onClick={() => handleDeleteRecord(r.id)}
                                  className="p-1 rounded-lg border border-slate-200 bg-white text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete Draft"
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
            </div>
          </div>
        )}

        {/* --- REGISTRY TAB --- */}
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border pl-9 pr-4 font-sans text-xs text-text bg-white outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="relative">
                <select value={filterTimePeriod} onChange={(e) => setFilterTimePeriod(e.target.value)} className="h-10 w-full rounded-lg border border-border px-3 font-sans text-xs text-text bg-white outline-none focus:border-primary cursor-pointer">
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
                  onChange={(e) => setFilterCity(e.target.value)} 
                  className="h-10 w-full rounded-lg border border-border px-3 font-sans text-xs text-text bg-white outline-none focus:border-primary cursor-pointer"
                >
                  <option value="all">All Cities</option>
                  {CITIES.map(c => <option key={c.value} value={c.value}>{c.text}</option>)}
                </select>
              </div>

              <div className="relative">
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-10 w-full rounded-lg border border-border px-3 font-sans text-xs text-text bg-white outline-none focus:border-primary cursor-pointer">
                  <option value="all">All Statuses</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Changes Requested">Changes Requested</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {filterTimePeriod === "custom" && (
                <div className="col-span-1 sm:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-[10px] font-bold text-text-dim uppercase tracking-wider">From Date</label>
                    <input 
                      type="date" 
                      value={customStartDate} 
                      onChange={(e) => setCustomStartDate(e.target.value)} 
                      className="h-9 w-full rounded-lg border border-border px-3 font-sans text-xs text-text bg-white outline-none focus:border-primary cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-[10px] font-bold text-text-dim uppercase tracking-wider">To Date</label>
                    <input 
                      type="date" 
                      value={customEndDate} 
                      onChange={(e) => setCustomEndDate(e.target.value)} 
                      className="h-9 w-full rounded-lg border border-border px-3 font-sans text-xs text-text bg-white outline-none focus:border-primary cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>


            <div className="bg-surface rounded-2xl shadow-sm border border-border/60 overflow-hidden relative">
              <div className="bg-white p-6 border-b border-border/40 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                  <h2 className="font-display text-xl font-bold text-primary flex items-center gap-2">
                    <UserCheck className="h-6 w-6 text-green" />
                    Onboarding Database
                  </h2>
                  <p className="font-sans text-sm text-text-muted mt-1">Review securely onboarded drivers and their digital assets.</p>
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto">
                  <button onClick={handleExportCSV} className="flex-1 lg:flex-none flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 font-sans text-xs font-bold text-text-muted hover:bg-slate-50 hover:text-primary transition-colors shadow-xs cursor-pointer">
                    <Download className="h-4 w-4" /> Export CSV
                  </button>
                  <button onClick={fetchData} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-text-muted hover:bg-slate-50 hover:text-primary transition-colors shadow-xs cursor-pointer" title="Refresh Data">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => { resetForm(); setActiveTab("form"); }}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-green hover:bg-green/95 px-4 font-sans text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="h-4 w-4" />
                      Add Driver
                    </button>
                  )}
                </div>
              </div>

              {/* Minimalist Table Layout */}
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap border-collapse">
                  <thead className="bg-slate-50 border-b border-border/60">
                    <tr>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Candidate Name</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">City</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role & Status</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Recorded By</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date & Time Created</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Edited At</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Edited By</th>
                      <th className="px-4 py-3 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {paginatedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-text-muted font-sans bg-slate-50/50 text-[11px]">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Search className="h-8 w-8 text-border-strong mb-2 opacity-50" />
                            <p className="font-semibold text-slate-700">No onboarding records found matching current criteria.</p>
                            <p className="text-xs text-slate-400">Adjust your search or filters to see more results.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((r) => {
                        const rawRole = r.vendor_type || r.candidate_role || "Driver";
                        const role = rawRole.toLowerCase().includes("operator") ? "Operator" : "Driver";
                        const appStatus = r.approval_status || "Draft";
                        let statusBadge = <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded w-max bg-slate-100 text-slate-700 border border-slate-200">Draft</span>;
                        if (appStatus.includes("Pending")) {
                          statusBadge = <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded w-max bg-amber-100 text-amber-800 border border-amber-200">Pending Approval</span>;
                        } else if (appStatus.includes("Approved")) {
                          statusBadge = <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded w-max bg-emerald-100 text-emerald-800 border border-emerald-200">Approved</span>;
                        } else if (appStatus.includes("Requested") || appStatus.includes("Counter")) {
                          statusBadge = <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded w-max bg-blue-100 text-blue-800 border border-blue-200">Changes Requested</span>;
                        } else if (appStatus.includes("Reject")) {
                          statusBadge = <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded w-max bg-rose-100 text-rose-800 border border-rose-200">Rejected</span>;
                        }

                        const createdDate = formatDisplayDate(r.created_at);
                        const createdTime = formatDisplayTime(r.created_at);
                        const updatedDate = formatDisplayDate(r.updated_at || r.created_at);
                        const updatedTime = formatDisplayTime(r.updated_at || r.created_at);

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors text-[11px] font-sans">
                            <td className="px-4 py-3 font-mono font-bold text-slate-900">
                              #{r.id}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900">
                              {r.driver_name}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700">
                              {r.city}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-800">
                              {r.phone_number}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-slate-800">{role}</span>
                                {statusBadge}
                                {appStatus.includes("Pending") && (
                                  <div className="text-[10px] text-amber-700 font-medium truncate mt-0.5">
                                    Pending: {r.approver_name || 'Driver Manager 1'} <span className="text-slate-400 font-normal">(ID: {r.current_approver_id || r.approval_requested_to || 21})</span>
                                  </div>
                                )}
                                {appStatus.includes("Approved") && (
                                  <div className="text-[10px] text-emerald-700 font-medium truncate mt-0.5">
                                    Approved by: {r.approved_by_name || r.updated_by_name || 'Admin'} <span className="text-slate-400 font-normal">(ID: {r.approved_by || r.updated_by || 3})</span>
                                  </div>
                                )}
                                {(appStatus.includes("Requested") || appStatus.includes("Counter")) && (
                                  <div className="text-[10px] text-blue-700 font-medium truncate mt-0.5">
                                    Req. by: {r.approver_name || r.updated_by_name || 'City Manager 1'} <span className="text-slate-400 font-normal">(ID: {r.current_approver_id || r.updated_by || 20})</span>
                                  </div>
                                )}
                                {appStatus.includes("Reject") && (
                                  <div className="text-[10px] text-red-700 font-medium truncate mt-0.5">
                                    Rejected by: {r.approved_by_name || r.updated_by_name || 'Manager'} <span className="text-slate-400 font-normal">(ID: {r.approved_by || r.updated_by || 3})</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900">{r.executive_name || user.name || "Admin"}</div>
                              <div className="text-slate-400 text-[10px] font-medium">ID: {r.created_by || user.executive_id || 3}</div>
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
                              <div className="font-bold text-slate-800">{r.updated_by ? (r.updated_by_name || r.executive_name || "Admin") : (r.executive_name || user.name || 'Admin')}</div>
                              <div className="text-slate-400 text-[10px] font-medium">ID: {r.updated_by ? r.updated_by : (r.created_by || user.executive_id || 3)}</div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex gap-1.5 justify-center">
                                <button type="button" onClick={() => loadRecordForEdit(r.id)} className="rounded-lg p-1 border border-border bg-white text-slate-600 hover:text-primary hover:bg-slate-50 transition-all cursor-pointer" title="View / Review Record"><Eye className="h-3.5 w-3.5" /></button>
                                {!isReadOnly && (
                                  <>
                                    <button type="button" onClick={() => loadRecordForEdit(r.id)} className="rounded-lg p-1 border border-border bg-white text-slate-600 hover:text-primary hover:bg-slate-50 transition-all cursor-pointer" title="Edit Record"><Edit className="h-3.5 w-3.5" /></button>
                                    <button type="button" onClick={() => handleDeleteRecord(r.id)} className="rounded-lg p-1 border border-border bg-white text-slate-600 hover:text-rose-500 hover:bg-rose-50 border-rose-200 transition-all cursor-pointer" title="Delete Record"><Trash2 className="h-3.5 w-3.5" /></button>
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
                <span className="text-text-dim">
                  Showing {filteredRecords.length > 0 ? (page - 1) * itemsPerPage + 1 : 0} - {Math.min(page * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} records
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    disabled={page === 1} 
                    className="h-8 px-3 rounded border border-border bg-white disabled:opacity-50 flex items-center cursor-pointer transition-colors hover:bg-slate-100"
                  >
                    <ChevronLeft className="w-3 h-3 mr-1" /> Prev
                  </button>
                  <button 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                    disabled={page === totalPages || filteredRecords.length === 0} 
                    className="h-8 px-3 rounded border border-border bg-white disabled:opacity-50 flex items-center cursor-pointer transition-colors hover:bg-slate-100"
                  >
                    Next <ChevronRight className="w-3 h-3 ml-1" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
      
      {/* 3. Global Camera Capture Modal overlay */}
      {cameraActiveField && (
        <CameraCapture 
          title={`Capture ${cameraActiveField.replace('_', ' ').toUpperCase()}`}
          onClose={() => setCameraActiveField(null)}
          onCapture={(dataUrl) => {
            if (cameraActiveField === "selfie") setSelfiePhoto(dataUrl);
            if (cameraActiveField === "dl_front") setDlFront(dataUrl);
            if (cameraActiveField === "dl_back") setDlBack(dataUrl);
            if (cameraActiveField === "pan") setPanCardPhoto(dataUrl);
            if (cameraActiveField === "aadhaar") setAadhaarPhoto(dataUrl);
            if (cameraActiveField === "aadhaar_front") setAadhaarCardFront(dataUrl);
            if (cameraActiveField === "aadhaar_back") setAadhaarCardBack(dataUrl);
            if (cameraActiveField === "local_address_proof") setLocalAddressProof(dataUrl);
            if (cameraActiveField === "cheque") setCancelledChequePhoto(dataUrl);
            if (cameraActiveField === "cheque2") setCheque2Photo(dataUrl);
            if (cameraActiveField === "cheque3") setCheque3Photo(dataUrl);
            if (cameraActiveField === "signature") setSignaturePhoto(dataUrl);
            setCameraActiveField(null);
          }}
        />
      )}

    </div>
  );
}