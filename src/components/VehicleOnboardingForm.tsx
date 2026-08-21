import React, { useState, useEffect } from "react";
import { 
  Truck, Calendar, MapPin, User, Phone, FileText, CheckCircle, Check,
  Clock, ArrowLeft, Download, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, Plus, ChevronLeft, ChevronRight, Database, Info, AlertTriangle, ShieldCheck, Scan, ScanLine, Eye, EyeOff
} from "lucide-react";
import { VehicleRecord, User as UserSession, CITIES } from "../types";
import CameraCapture from "./CameraCapture";
import { compressImage } from "../utils/imageCompressor";

interface VehicleOnboardingFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
  initialEditId?: number;
  initialStep?: number;
  isReviewMode?: boolean;
}

const ensureISOIST = (dateStr?: string): string | undefined => {
  if (!dateStr) return undefined;
  let str = dateStr.trim();
  if (str.includes(" ") && !str.includes("T")) {
    str = str.replace(" ", "T");
  }
  if (!str.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    str = str + "Z";
  }
  return str;
};

const formatDisplayDate = (createdAt?: string, fallbackDate?: string): string => {
  const isoStr = ensureISOIST(createdAt);
  if (isoStr) {
    try {
      const d = new Date(isoStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
      }
    } catch (e) {}
  }
  if (fallbackDate && fallbackDate !== "1970-01-01") {
    try {
      const cleanDate = fallbackDate.trim();
      const parts = cleanDate.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
      }
    } catch (e) {}
    return fallbackDate;
  }
  return "—";
};

const formatDisplayTime = (createdAt?: string, fallbackTime?: string): string => {
  const isoStr = ensureISOIST(createdAt);
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

  useEffect(() => {
    if (selectedId) {
      const match = approvers.find(a => a.id === selectedId);
      if (match) setSearch(`${match.name} (${match.role})`);
    } else {
      setSearch("");
    }
  }, [selectedId, approvers]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedMatch = selectedId ? approvers.find(a => a.id === selectedId) : null;
  const isExactSelectedDisplay = selectedMatch && search === `${selectedMatch.name} (${selectedMatch.role})`;

  const filtered = ((search.trim() === "" || isExactSelectedDisplay)
    ? approvers
    : approvers.filter(a =>
        a.name?.toLowerCase().includes(search.toLowerCase()) ||
        a.role?.toLowerCase().includes(search.toLowerCase()) ||
        a.city?.toLowerCase().includes(search.toLowerCase())
      )
  ).sort((a, b) => {
    if (!search.trim() || isExactSelectedDisplay) return 0;
    const s = search.toLowerCase();
    const aStarts = a.name?.toLowerCase().startsWith(s) ? 0 : 1;
    const bStarts = b.name?.toLowerCase().startsWith(s) ? 0 : 1;
    return aStarts - bStarts;
  });

  return (
    <div ref={containerRef} className="space-y-1.5 relative w-full text-left">
      <label className="text-xs font-bold text-slate-800">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Type to search approver..."
          className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-600 shadow-inner"
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

export default function VehicleOnboardingForm({ 
  user, 
  onBackToSelector, 
  onLogout,
  initialEditId,
  initialStep,
  isReviewMode
}: VehicleOnboardingFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "drafts" | "registry">("form");
  
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
  const [currentStep, setCurrentStep] = useState(1);

  // Approval states
  const [approversList, setApproversList] = useState<any[]>([]);
  const [approvalRequestedTo, setApprovalRequestedTo] = useState<number | null>(null);
  const [approvalRemarks, setApprovalRemarks] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [approvalSubmissionNote, setApprovalSubmissionNote] = useState("");

  const fetchApprovers = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/july/approvers", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const validApprovers = (Array.isArray(data) ? data : []).filter((a: any) => a.id !== (user.portal_user_id || user.id));
        setApproversList(validApprovers);
        
        // Auto-select preferred default approver based on role hierarchy or approval chain
        if (validApprovers.length > 0) {
          try {
            const uid = user.portal_user_id || user.id;
            const chainRes = await fetch(`/api/approval-chain/${uid}`, {
              headers: { "Authorization": `Bearer ${token}` }
            });
            if (chainRes.ok) {
              const chainData = await chainRes.json();
              if (chainData.l1 && chainData.l1.portal_user_id) {
                setApprovalRequestedTo(chainData.l1.portal_user_id);
                return;
              }
            }
          } catch (e) {}

          const uRole = (user.role || "").toLowerCase();
          let preferred = null;
          if (uRole.includes("city manager") || uRole.includes("cm")) {
            preferred = validApprovers.find((a: any) => a.role?.toLowerCase().includes("general manager") || a.role_code === "GM" || a.role_code === "CH") ||
                        validApprovers.find((a: any) => a.role?.toLowerCase().includes("business head") || a.role_code === "BH");
          } else if (uRole.includes("general manager") || uRole.includes("gm") || uRole.includes("ch")) {
            preferred = validApprovers.find((a: any) => a.role?.toLowerCase().includes("business head") || a.role_code === "BH");
          } else {
            preferred = validApprovers.find((a: any) => a.role_code === "SOM" || a.role_code === "OM" || a.role_code === "CH" || a.role?.toLowerCase().includes("city manager") || a.role_code === "CM");
          }
          
          if (preferred) {
            setApprovalRequestedTo(preferred.id);
          } else {
            setApprovalRequestedTo(validApprovers[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching approvers:", err);
    }
  };

  useEffect(() => {
    fetchApprovers();
  }, []);

  useEffect(() => {
    if (initialEditId) {
      loadRecordForEdit(initialEditId).then(() => {
        if (initialStep) setCurrentStep(Math.min(initialStep, 5));
      });
    }
  }, [initialEditId, initialStep]);
  
  // Panel 1: Identity & Status
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [letzrydUniqueNo, setLetzrydUniqueNo] = useState("");
  const [cityName, setCityName] = useState("Hyderabad");
  const [brand, setBrand] = useState("");
  const [modelName, setModelName] = useState("");
  const [makeYear, setMakeYear] = useState("");
  const [manufacturerMonth, setManufacturerMonth] = useState("");
  const [receivedAllocated, setReceivedAllocated] = useState("In Process");
  const [fuelType, setFuelType] = useState("Electric");
  const [insuranceType, setInsuranceType] = useState("Comprehensive / First Party");
  const [showVehicleNumber, setShowVehicleNumber] = useState(false);
  const [showGpsId, setShowGpsId] = useState(false);
  const [showCngPlate, setShowCngPlate] = useState(false);

  // Panel 2: Compliance & Validities (UPDATED PER MEETING NOTES)
  const [registrationDate, setRegistrationDate] = useState("");
  const [rtoTaxValidity, setRtoTaxValidity] = useState("");
  const [permitValidity, setPermitValidity] = useState("");
  const [fitnessValidity, setFitnessValidity] = useState("");
  const [pollutionValidity, setPollutionValidity] = useState("");
  const [authorizationCertificate, setAuthorizationCertificate] = useState("");
  
  // New Insurance Fields & Covers
  const [insuranceBroker, setInsuranceBroker] = useState("");
  const [insuranceUnderwriter, setInsuranceUnderwriter] = useState("");
  const [insuranceStartDate, setInsuranceStartDate] = useState("");
  const [insuranceEndDate, setInsuranceEndDate] = useState("");
  const [insuranceIdv, setInsuranceIdv] = useState("");
  const [coverEngineProtect, setCoverEngineProtect] = useState(false);
  const [coverConsumables, setCoverConsumables] = useState(false);
  const [coverZeroDep, setCoverZeroDep] = useState(false);
  const [coverRsa, setCoverRsa] = useState(false);

  // New Identity & RC Text Fields
  const [chassisNumber, setChassisNumber] = useState("");
  const [engineNumber, setEngineNumber] = useState("");
  const [cngTankNumber, setCngTankNumber] = useState("");

  // Panel 3: Asset & Accessory Checklist
  const [kmsReading, setKmsReading] = useState("");
  const [gpsVendor, setGpsVendor] = useState("");
  const [gpsId, setGpsId] = useState("");
  const [cngInstalled, setCngInstalled] = useState("No");
  const [cngPlate, setCngPlate] = useState("");
  const [cngInstallationDate, setCngInstallationDate] = useState("");
  
  const [jack, setJack] = useState("Available");
  const [jackRod, setJackRod] = useState("Available");
  const [spanner, setSpanner] = useState("Available");
  const [parkingTriangle, setParkingTriangle] = useState("Available");
  const [fireExtinguishers, setFireExtinguishers] = useState("Available");
  const [seatCover, setSeatCover] = useState("Available");
  const [floorCarpet, setFloorCarpet] = useState("Available");
  const [fastTag, setFastTag] = useState("Available");
  const [fastTagNumber, setFastTagNumber] = useState("");
  const [fastTagVendor, setFastTagVendor] = useState("");
  const [musicSystem, setMusicSystem] = useState("Available");
  const [keyQuantity, setKeyQuantity] = useState<number | "">("");

  // Documents
  const [rcDocument, setRcDocument] = useState<string | null>(null);
  const [insuranceDocument, setInsuranceDocument] = useState<string | null>(null);
  const [authorizationCertificateDoc, setAuthorizationCertificateDoc] = useState<string | null>(null);
  const [rtoTaxReceipt, setRtoTaxReceipt] = useState<string | null>(null);

  // Panel 4: PDI Photographic Verification
  const [imageFront, setImageFront] = useState<string | null>(null);
  const [imageLh, setImageLh] = useState<string | null>(null);
  const [imageBack, setImageBack] = useState<string | null>(null);
  const [imageRh, setImageRh] = useState<string | null>(null);
  const [engineChasisNoImg, setEngineChasisNoImg] = useState<string | null>(null);
  const [batterySlNoImg, setBatterySlNoImg] = useState<string | null>(null);
  const [engineCompartmentImg, setEngineCompartmentImg] = useState<string | null>(null);
  const [fastTagImg, setFastTagImg] = useState<string | null>(null);
  const [musicSystemImg, setMusicSystemImg] = useState<string | null>(null);
  const [rhFrTyreImg, setRhFrTyreImg] = useState<string | null>(null);
  const [lhFrTyreImg, setLhFrTyreImg] = useState<string | null>(null);
  const [rhRearTyreImg, setRhRearTyreImg] = useState<string | null>(null);
  const [lhRearTyreImg, setLhRearTyreImg] = useState<string | null>(null);
  const [spareWheelImg, setSpareWheelImg] = useState<string | null>(null);

  // OCR Extracted Text State
  const [ocrData, setOcrData] = useState<Record<string, string>>({});
  const [isScanning, setIsScanning] = useState<string | null>(null);

  // Registered Models State
  const [registeredModels, setRegisteredModels] = useState<{ id: number; brand: string; model_name: string; variant: string; fuel_type: string; make_year: number }[]>([]);

  // Camera State
  const [cameraActiveField, setCameraActiveField] = useState<string | null>(null);

  // Registry Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("All Cities");
  const [filterType, setFilterType] = useState("All Statuses");
  
  // Top header quick search & auto-suggest
  const [searchRetrieveQuery, setSearchRetrieveQuery] = useState("");
  const [debouncedRetrieveQuery, setDebouncedRetrieveQuery] = useState("");
  const [retrieveResults, setRetrieveResults] = useState<any[]>([]);
  const [isRetrieveFocused, setIsRetrieveFocused] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedRetrieveQuery(searchRetrieveQuery), 300);
    return () => clearTimeout(handler);
  }, [searchRetrieveQuery]);

  useEffect(() => {
    if (debouncedRetrieveQuery.trim().length > 1) {
      const token = localStorage.getItem("lr_token");
      fetch(`/api/vehicle?search=${encodeURIComponent(debouncedRetrieveQuery)}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setRetrieveResults(data || []))
      .catch(() => setRetrieveResults([]));
    } else {
      setRetrieveResults([]);
    }
  }, [debouncedRetrieveQuery]);

  const [records, setRecords] = useState<VehicleRecord[]>([]);
  const [stats, setStats] = useState({
    total_fleet: 0,
    receiving_count: 0,
    allocation_count: 0,
    cng_count: 0
  });

  const isReadOnly = user.role_code === "SP";
  const displayName = user.name || user.username || "User";
  const initials = displayName.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/vehicle/stats", {
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
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      
      // FIXED FILTER BUG: Map "All Cities" and "All Statuses" back to "all" for the backend
      if (filterCity !== "All Cities") queryParams.append("city", filterCity);
      if (filterType !== "All Statuses") queryParams.append("type", filterType);

      const res = await fetch(`/api/vehicle?${queryParams.toString()}`, {
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

  const fetchModels = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/vehicle-models", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRegisteredModels(data);
      }
    } catch (err) {
      console.error("Error fetching vehicle models:", err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchRecords();
    fetchModels();
  }, [searchQuery, filterCity, filterType]);

  // OCR MOCK SIMULATION (UPDATED: Now includes Insurance Dates extraction)
  const simulateOCR = (field: string) => {
    const ocrFields = ["engine_chasis_no_img", "rh_fr_tyre_img", "lh_fr_tyre_img", "rh_rear_tyre_img", "lh_rear_tyre_img", "spare_wheel_img", "insurance_document"];
    if (ocrFields.includes(field)) {
      setIsScanning(field);
      setTimeout(() => {
        if (field === "insurance_document") {
          // Simulate extracting coverage dates from an insurance doc
          const today = new Date().toISOString().split('T')[0];
          const nextYear = new Date();
          nextYear.setFullYear(nextYear.getFullYear() + 1);
          setInsuranceStartDate(today);
          setInsuranceEndDate(nextYear.toISOString().split('T')[0]);
        } else {
          let extracted = "";
          if (field === "engine_chasis_no_img") extracted = "VIN" + Math.floor(Math.random() * 10000000000).toString();
          else extracted = "TYRE-" + Math.floor(Math.random() * 10000).toString();
          setOcrData(prev => ({ ...prev, [field]: extracted }));
        }
        setIsScanning(null);
      }, 1800); // 1.8 second delay to show the scanning animation
    }
  };

  const handlePhotoCaptured = (img: string) => {
    if (!cameraActiveField) return;
    const setters: Record<string, React.Dispatch<React.SetStateAction<string | null>>> = {
      image_front: setImageFront,
      image_lh: setImageLh,
      image_back: setImageBack,
      image_rh: setImageRh,
      engine_chasis_no_img: setEngineChasisNoImg,
      battery_sl_no_img: setBatterySlNoImg,
      engine_compartment_img: setEngineCompartmentImg,
      fast_tag_img: setFastTagImg,
      music_system_img: setMusicSystemImg,
      rh_fr_tyre_img: setRhFrTyreImg,
      lh_fr_tyre_img: setLhFrTyreImg,
      rh_rear_tyre_img: setRhRearTyreImg,
      lh_rear_tyre_img: setLhRearTyreImg,
      spare_wheel_img: setSpareWheelImg
    };
    if (setters[cameraActiveField]) {
      setters[cameraActiveField](img);
      simulateOCR(cameraActiveField);
    }
    setCameraActiveField(null);
  };

  const triggerUpload = (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file).then((result) => {
        if (typeof result === "string") {
          const setters: Record<string, React.Dispatch<React.SetStateAction<string | null>>> = {
            image_front: setImageFront,
            image_lh: setImageLh,
            image_back: setImageBack,
            image_rh: setImageRh,
            engine_chasis_no_img: setEngineChasisNoImg,
            battery_sl_no_img: setBatterySlNoImg,
            engine_compartment_img: setEngineCompartmentImg,
            fast_tag_img: setFastTagImg,
            music_system_img: setMusicSystemImg,
            rh_fr_tyre_img: setRhFrTyreImg,
            lh_fr_tyre_img: setLhFrTyreImg,
            rh_rear_tyre_img: setRhRearTyreImg,
            lh_rear_tyre_img: setLhRearTyreImg,
            spare_wheel_img: setSpareWheelImg,
            rc_document: setRcDocument,
            insurance_document: setInsuranceDocument,
            authorization_certificate_doc: setAuthorizationCertificateDoc,
            rto_tax_receipt: setRtoTaxReceipt
          };
          if (setters[field]) {
            setters[field](result);
            simulateOCR(field); // Triggers date extraction for insurance
          }
        }
      });
    }
  };

  const loadRecordForEdit = async (id: number) => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/vehicle/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Vehicle onboarding record not found");
      const data = await res.json();
      
      setEditingId(data.id);
      setVehicleNumber(data.vehicle_number || "");
      setLetzrydUniqueNo(data.letzryd_unique_no || "");
      setCityName(data.city_name || "Hyderabad");
      
      const modelTokens = (data.model || "").split(" ").filter(Boolean);
      if (modelTokens.length > 0) {
        setBrand(modelTokens[0]);
        if (modelTokens.length > 2 && /^\d{4}$/.test(modelTokens[modelTokens.length - 1])) {
          setMakeYear(modelTokens[modelTokens.length - 1]);
          setModelName(modelTokens.slice(1, -1).join(" "));
        } else {
          setMakeYear("");
          setModelName(modelTokens.slice(1).join(" "));
        }
      } else {
        setBrand("");
        setModelName("");
        setMakeYear("");
      }
      
      setReceivedAllocated(data.received_allocated || "In Process");
      setFuelType(data.fuel_type || "Electric");
      setInsuranceType(data.insurance_mapping || "Comprehensive / First Party");
      setManufacturerMonth(data.delivery_month || "");
      
      setRegistrationDate(data.registration_date && data.registration_date !== "1970-01-01" ? data.registration_date : "");
      setRtoTaxValidity(data.rto_tax_validity && data.rto_tax_validity !== "1970-01-01" ? data.rto_tax_validity : "");
      setPermitValidity(data.permit_validity && data.permit_validity !== "1970-01-01" ? data.permit_validity : "");
      setFitnessValidity(data.fitness_validity && data.fitness_validity !== "1970-01-01" ? data.fitness_validity : "");
      setPollutionValidity(data.pollution_validity && data.pollution_validity !== "1970-01-01" ? data.pollution_validity : "");
      setAuthorizationCertificate(data.authorization_certificate || "");
      
      setInsuranceEndDate(data.insurance_validity && data.insurance_validity !== "1970-01-01" ? data.insurance_validity : "");
      setInsuranceBroker(data.insurance_broker || "");
      setInsuranceUnderwriter(data.insurance_underwriter || "");
      setInsuranceStartDate(data.insurance_start_date && data.insurance_start_date !== "1970-01-01" ? data.insurance_start_date : "");
      setInsuranceIdv(data.insurance_idv || "");
      setCoverEngineProtect(data.cover_engine_protect === true || data.cover_engine_protect === "true" || data.cover_engine_protect === "True");
      setCoverConsumables(data.cover_consumables === true || data.cover_consumables === "true" || data.cover_consumables === "True");
      setCoverZeroDep(data.cover_zero_dep === true || data.cover_zero_dep === "true" || data.cover_zero_dep === "True");
      setCoverRsa(data.cover_rsa === true || data.cover_rsa === "true" || data.cover_rsa === "True");
      
      setChassisNumber(data.chassis_number || "");
      setEngineNumber(data.engine_number || "");
      setCngTankNumber(data.cng_tank_number || "");
      setFastTagNumber(data.fast_tag_number || "");
      setFastTagVendor(data.fast_tag_vendor || "");

      setKmsReading(data.kms_reading || "");
      setGpsVendor(data.tracking_device_vendor || "");
      setGpsId(data.tracking_device_type || "");
      setCngInstalled(data.cng_installed || "No");
      setCngPlate(data.cng_plate || "");
      setCngInstallationDate(data.cng_installation_date && data.cng_installation_date !== "1970-01-01" ? data.cng_installation_date : "");
      
      setJack(data.jack || "Available");
      setJackRod(data.jack_rod || "Available");
      setSpanner(data.spanner || "Available");
      setParkingTriangle(data.parking_triangle || "Available");
      setFireExtinguishers(data.fire_extinguishers || "Available");
      setSeatCover(data.seat_cover || "Available");
      setFloorCarpet(data.floor_carpet || "Available");
      setFastTag(data.fast_tag || "Available");
      setMusicSystem(data.music_system || "Available");

      setImageFront(data.image_front || null);
      setImageLh(data.image_lh || null);
      setImageBack(data.image_back || null);
      setImageRh(data.image_rh || null);
      setEngineChasisNoImg(data.engine_chasis_no_img || null);
      setBatterySlNoImg(data.battery_sl_no_img || null);
      setEngineCompartmentImg(data.engine_compartment_img || null);
      setFastTagImg(data.fast_tag_img || null);
      setMusicSystemImg(data.music_system_img || null);
      setKeyQuantity(data.key_quantity || "");
      setRhFrTyreImg(data.rh_fr_tyre_img || null);
      setLhFrTyreImg(data.lh_fr_tyre_img || null);
      setRhRearTyreImg(data.rh_rear_tyre_img || null);
      setLhRearTyreImg(data.lh_rear_tyre_img || null);
      setSpareWheelImg(data.spare_wheel_img || null);

      setRcDocument(data.rc_document || null);
      setInsuranceDocument(data.insurance_document || null);
      setAuthorizationCertificateDoc(data.authorization_certificate_doc || null);
      setRtoTaxReceipt(data.rto_tax_receipt || null);
      setApprovalStatus(data.approval_status || null);
      setApprovalRemarks(data.approval_remarks || null);
      setApprovalRequestedTo(data.current_approver_id || null);
      setApprovalSubmissionNote(data.approval_remarks || "");

      setActiveTab("form");
      setCurrentStep(1);
      setSearchRetrieveQuery("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRetrieveId = async () => {
    const id = parseInt(searchRetrieveQuery);
    if (!id || id <= 0) return alert("Please enter a valid numeric ID");
    await loadRecordForEdit(id);
  };

  const resetForm = () => {
    setEditingId(null);
    setCurrentStep(1);
    setVehicleNumber("");
    setLetzrydUniqueNo("");
    setCityName("Hyderabad");
    setBrand("");
    setModelName("");
    setMakeYear("");
    setManufacturerMonth("");
    setReceivedAllocated("In Process");
    setFuelType("Electric");
    setInsuranceType("Comprehensive / First Party");
    setRegistrationDate("");
    setRtoTaxValidity("");
    setPermitValidity("");
    setFitnessValidity("");
    setPollutionValidity("");
    setAuthorizationCertificate("");
    
    setInsuranceBroker("");
    setInsuranceUnderwriter("");
    setInsuranceStartDate("");
    setInsuranceEndDate("");
    setInsuranceIdv("");
    setCoverEngineProtect(false);
    setCoverConsumables(false);
    setCoverZeroDep(false);
    setCoverRsa(false);

    setChassisNumber("");
    setEngineNumber("");
    setCngTankNumber("");
    setFastTagNumber("");
    setFastTagVendor("");

    setKmsReading("");
    setGpsVendor("");
    setGpsId("");
    setCngInstalled("No");
    setCngPlate("");
    setCngInstallationDate("");
    setJack("Available");
    setJackRod("Available");
    setSpanner("Available");
    setParkingTriangle("Available");
    setFireExtinguishers("Available");
    setSeatCover("Available");
    setFloorCarpet("Available");
    setFastTag("Available");
    setMusicSystem("Available");
    setImageFront(null);
    setImageLh(null);
    setImageBack(null);
    setImageRh(null);
    setEngineChasisNoImg(null);
    setBatterySlNoImg(null);
    setEngineCompartmentImg(null);
    setFastTagImg(null);
    setMusicSystemImg(null);
    setKeyQuantity("");
    setRhFrTyreImg(null);
    setLhFrTyreImg(null);
    setRhRearTyreImg(null);
    setLhRearTyreImg(null);
    setSpareWheelImg(null);
    setRcDocument(null);
    setInsuranceDocument(null);
    setAuthorizationCertificateDoc(null);
    setRtoTaxReceipt(null);
    setApprovalStatus(null);
    setApprovalRemarks(null);
    setApprovalSubmissionNote("");
    setOcrData({});
  };

  const handleSubmit = async (e: React.FormEvent, isDraft: boolean = false) => {
    e.preventDefault();
    
    if (!isDraft) {
      if (!vehicleNumber.trim()) return alert("Vehicle Reg Number is required");
      if (!cityName.trim()) return alert("City is required");
      if (!modelName.trim()) return alert("Model Name is required");
      if (!registrationDate.trim()) return alert("Registration Date is required");
      if (!fitnessValidity.trim()) return alert("Fitness Validity is required");
      if (!insuranceEndDate.trim()) return alert("Coverage End Date is required");
      if (!kmsReading.trim()) return alert("KMs Reading is required");
    } else {
      if (!vehicleNumber.trim()) return alert("At least a Vehicle Reg Number is required to save a draft.");
    }

    const compositeModel = `${brand} ${modelName} ${makeYear}`.trim();

    const payload = {
      vehicle_number: vehicleNumber.trim().toUpperCase(),
      letzryd_unique_no: letzrydUniqueNo.trim() || undefined,
      city_name: cityName,
      model: compositeModel,
      received_allocated: receivedAllocated,
      fuel_type: fuelType,
      delivery_month: manufacturerMonth || undefined,
      registration_date: registrationDate.trim() || undefined,
      rto_tax_validity: rtoTaxValidity.trim() || undefined,
      permit_validity: permitValidity.trim() || undefined,
      fitness_validity: fitnessValidity.trim() || undefined,
      pollution_validity: pollutionValidity.trim() || undefined,
      
      insurance_validity: insuranceEndDate.trim() || undefined, 
      insurance_broker: insuranceBroker.trim() || undefined,
      insurance_underwriter: insuranceUnderwriter.trim() || undefined,
      insurance_start_date: insuranceStartDate.trim() || undefined,
      insurance_mapping: insuranceType,
      insurance_idv: insuranceIdv.trim() || undefined,
      cover_engine_protect: coverEngineProtect,
      cover_consumables: coverConsumables,
      cover_zero_dep: coverZeroDep,
      cover_rsa: coverRsa,
      chassis_number: chassisNumber.trim() || undefined,
      engine_number: engineNumber.trim() || undefined,
      cng_tank_number: cngTankNumber.trim() || undefined,
      fast_tag_number: fastTagNumber.trim() || undefined,
      fast_tag_vendor: fastTagVendor.trim() || undefined,

      authorization_certificate: authorizationCertificate.trim() || undefined,
      kms_reading: kmsReading.trim() || "0",
      tracking_device_vendor: gpsVendor.trim() || undefined,
      tracking_device_type: gpsId.trim() || undefined, 
      cng_installed: cngInstalled,
      cng_plate: cngInstalled === "Yes" ? cngPlate.trim() : undefined,
      cng_installation_date: cngInstalled === "Yes" ? cngInstallationDate : undefined,
      jack,
      jack_rod: jackRod,
      spanner,
      parking_triangle: parkingTriangle,
      fire_extinguishers: fireExtinguishers,
      seat_cover: seatCover,
      floor_carpet: floorCarpet,
      fast_tag: fastTag,
      music_system: musicSystem,
      image_front: imageFront || null,
      image_lh: imageLh || null,
      image_back: imageBack || null,
      image_rh: imageRh || null,
      engine_chasis_no_img: engineChasisNoImg || null,
      battery_sl_no_img: batterySlNoImg || null,
      engine_compartment_img: engineCompartmentImg || null,
      fast_tag_img: fastTagImg || null,
      music_system_img: musicSystemImg || null,
      key_quantity: typeof keyQuantity === "number" ? keyQuantity : null,
      rh_fr_tyre_img: rhFrTyreImg || null,
      lh_fr_tyre_img: lhFrTyreImg || null,
      rh_rear_tyre_img: rhRearTyreImg || null,
      lh_rear_tyre_img: lhRearTyreImg || null,
      spare_wheel_img: spareWheelImg || null,
      rc_document: rcDocument || null,
      insurance_document: insuranceDocument || null,
      authorization_certificate_doc: authorizationCertificateDoc || null,
      rto_tax_receipt: rtoTaxReceipt || null,
      approval_status: isDraft ? "Draft" : (approvalStatus === "Changes Requested" ? "Pending Approval" : "Pending Approval"),
      current_approver_id: isDraft ? undefined : (approvalRequestedTo || undefined),
      approval_remarks: approvalSubmissionNote.trim() || undefined,
      created_by: user.portal_user_id || undefined
    };

    try {
      const token = localStorage.getItem("lr_token");
      const url = editingId ? `/api/vehicle/${editingId}` : "/api/vehicle";
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
        throw new Error(errorText || "Failed to submit vehicle record");
      }

      if (isDraft) {
        alert("Vehicle draft saved successfully! You can retrieve it later.");
      } else {
        alert(editingId ? "Vehicle compliance details updated!" : "Vehicle onboarded successfully!");
      }
      
      resetForm();
      await fetchRecords();
      await fetchStats();
      setActiveTab("registry");
    } catch (err: any) {
      alert(err.message || "Error submitting vehicle details");
    }
  };

  const handleDeleteRecord = async (id: number) => {
    if (!window.confirm(`Are you sure you want to delete vehicle record #${id}?`)) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/vehicle/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchRecords();
        await fetchStats();
      } else {
        alert("Failed to delete vehicle record");
      }
    } catch (err) {
      console.error("Error deleting record:", err);
    }
  };

  const exportCSV = () => {
    if (records.length === 0) return alert("No records to export");
    const headers = [
      "ID", "Vehicle Number", "Unique Asset ID", "City", "Model", "Operational Type",
      "Registration Date", "Fitness Validity", "Insurance Validity", "KMs Reading",
      "CNG Installed", "CNG Plate", "Jack Status", "Spare Wheel Photo", "Created At"
    ];
    const rows = records.map(r => [
      r.id, r.vehicle_number, r.letzryd_unique_no || "", r.city_name, r.model, r.received_allocated,
      r.registration_date, r.fitness_validity, r.insurance_validity, r.kms_reading,
      r.cng_installed, r.cng_plate || "", r.jack || "Available", r.spare_wheel_img ? "Yes" : "No", r.created_at
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `letzryd_fleet_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const photoFields = [
    { label: "Vehicle Front", key: "image_front", state: imageFront },
    { label: "Vehicle LH Side", key: "image_lh", state: imageLh },
    { label: "Vehicle Back", key: "image_back", state: imageBack },
    { label: "Vehicle RH Side", key: "image_rh", state: imageRh },
    { label: "Engine & Chasis No", key: "engine_chasis_no_img", state: engineChasisNoImg },
    { label: "Battery SL No", key: "battery_sl_no_img", state: batterySlNoImg },
    { label: "Engine Compartment", key: "engine_compartment_img", state: engineCompartmentImg },
    { label: "Fast Tag (Inside)", key: "fast_tag_img", state: fastTagImg },
    { label: "Music System", key: "music_system_img", state: musicSystemImg },
    { label: "RH Front Tyre", key: "rh_fr_tyre_img", state: rhFrTyreImg },
    { label: "LH Front Tyre", key: "lh_fr_tyre_img", state: lhFrTyreImg },
    { label: "RH Rear Tyre", key: "rh_rear_tyre_img", state: rhRearTyreImg },
    { label: "LH Rear Tyre", key: "lh_rear_tyre_img", state: lhRearTyreImg },
    { label: "Spare Wheel", key: "spare_wheel_img", state: spareWheelImg }
  ];

  const documentFields = [
    { label: "RC Document", key: "rc_document", state: rcDocument },
    { label: "Insurance Document", key: "insurance_document", state: insuranceDocument },
    { label: "Authorization Certificate", key: "authorization_certificate_doc", state: authorizationCertificateDoc },
    { label: "RTO Tax Receipt", key: "rto_tax_receipt", state: rtoTaxReceipt },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      
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
              Vehicle Onboarding
            </span>
          </div>

          <nav className="flex gap-2">
            {!isReadOnly && (
              <button
                onClick={() => setActiveTab("form")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "form" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
              >
                <FileText className="h-4 w-4" />
                Vehicle Form
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
              Fleet Registry
            </button>
          </nav>

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

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 1: FORM CHECK-IN */}
        {activeTab === "form" && (
          <div className="w-full flex flex-col gap-6">
            
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
                  <h1 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                    {editingId ? `Edit Record #${editingId}` : "Vehicle Onboarding Form"}
                  </h1>
                </div>

                {!editingId && (
                  <div className="relative w-full max-w-sm z-40">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                      <input
                        type="text"
                        placeholder="Search to edit... (Reg No, Model, ID)"
                        value={searchRetrieveQuery}
                        onChange={(e) => setSearchRetrieveQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const numericId = parseInt(searchRetrieveQuery);
                            if (numericId) loadRecordForEdit(numericId);
                          }
                        }}
                        onFocus={() => setIsRetrieveFocused(true)}
                        onBlur={() => setTimeout(() => setIsRetrieveFocused(false), 200)}
                        className="h-10 w-full rounded-lg bg-white/20 border border-white/35 pl-9 pr-4 text-sm font-semibold text-white placeholder:text-white/70 outline-none focus:bg-white focus:text-slate-900 focus:placeholder:text-slate-400 transition-all"
                      />
                    </div>
                    {isRetrieveFocused && retrieveResults.length > 0 && (
                      <div className="absolute top-12 left-0 w-full bg-white rounded-lg shadow-2xl border border-border z-50 overflow-hidden flex flex-col max-h-64 overflow-y-auto">
                        {retrieveResults.map((r: any) => (
                          <button
                            key={r.id}
                            type="button"
                            onMouseDown={() => { loadRecordForEdit(r.id); setRetrieveResults([]); setSearchRetrieveQuery(""); }}
                            className="flex flex-col items-start px-4 py-3 border-b border-border hover:bg-green-50 transition-colors text-left cursor-pointer"
                          >
                            <div className="flex justify-between w-full">
                              <span className="font-bold text-sm text-slate-900">{r.vehicle_number} - {r.model}</span>
                              <span className="text-xs font-mono text-text-dim">#{r.id} ({r.city_name})</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {editingId && (
              <div className="bg-amber-50 px-6 py-3 border border-amber-200 rounded-xl flex justify-between items-center">
                <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
                  <Edit className="h-4 w-4 text-amber-700" />
                  Editing existing Vehicle Record #{editingId}
                </div>
                <button 
                  onClick={() => { resetForm(); }}
                  className="text-xs text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                >
                  Cancel Edit
                </button>
              </div>
            )}

            <form onSubmit={(e) => e.preventDefault()} className="rounded-2xl border border-border bg-white p-6 shadow-xs md:p-8 flex flex-col gap-8">
              
              {(isReviewMode || approvalStatus === "Changes Requested") && approvalRemarks && (
                <div className="mb-2 p-4 bg-orange-50 border-2 border-orange-300 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-extrabold text-orange-900 uppercase tracking-wider mb-1">Manager's Revision Instructions</p>
                      <p className="text-sm font-semibold text-orange-800">{approvalRemarks}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* MULTI-STEP PROGRESS BAR (5 STEPS) */}
              <div className="mb-4">
                <div className="flex items-center justify-between relative w-full">
                  <div className="absolute left-[10%] right-[10%] top-[16px] -translate-y-1/2 h-1 bg-slate-100 rounded-full z-0"></div>
                  <div className="absolute left-[10%] top-[16px] -translate-y-1/2 h-1 bg-primary rounded-full z-0 transition-all duration-500" style={{ width: `calc(${((currentStep - 1) / 4) * 80}%)` }}></div>
                  
                  {[
                    { step: 1, label: "Identity & RC" },
                    { step: 2, label: "Insurance" },
                    { step: 3, label: "PDI Checklist" },
                    { step: 4, label: "PDI Photos" },
                    { step: 5, label: "Status & Review" }
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

              {/* STEP 1: IDENTITY & RC */}
              <div className={`${currentStep === 1 ? 'block' : 'hidden'} space-y-6 animate-in fade-in duration-300`}>
                <h3 className="font-sans text-sm font-bold text-primary border-b border-slate-100 pb-2">
                  1. Vehicle Identity & Registration (RC / RTO)
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Vehicle Reg Number *</label>
                    <div className="relative">
                      <input
                        type={showVehicleNumber ? "text" : "password"}
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        placeholder="e.g. TS09EA1234"
                        className="w-full rounded-lg border border-border pl-3 pr-8 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowVehicleNumber(!showVehicleNumber)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showVehicleNumber ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Fuel Type *</label>
                    <select
                      value={fuelType}
                      onChange={(e) => setFuelType(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden bg-white transition-colors"
                    >
                      <option value="Electric">Electric</option>
                      <option value="CNG">CNG</option>
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Operational City *</label>
                    <select
                      value={cityName}
                      onChange={(e) => setCityName(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden bg-white transition-colors"
                    >
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="Bangalore">Bangalore</option>
                      <option value="Mumbai">Mumbai</option>
                      <option value="Chennai">Chennai</option>
                      <option value="Delhi">Delhi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Brand *</label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="e.g. Tata"
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Model Name *</label>
                    <input
                      type="text"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="e.g. Nexon EV"
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Make Year *</label>
                    <input
                      type="number"
                      value={makeYear}
                      onChange={(e) => setMakeYear(e.target.value)}
                      placeholder="e.g. 2024"
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Chassis Number *</label>
                    <input
                      type="text"
                      value={chassisNumber}
                      onChange={(e) => setChassisNumber(e.target.value.toUpperCase())}
                      placeholder="Enter 17-digit Chassis No"
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs font-mono focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Engine Number *</label>
                    <input
                      type="text"
                      value={engineNumber}
                      onChange={(e) => setEngineNumber(e.target.value.toUpperCase())}
                      placeholder="Enter Engine No"
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs font-mono focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  {(fuelType === "CNG" || cngInstalled === "Yes") && (
                    <div>
                      <label className="block text-xs font-bold text-text mb-1">CNG Tank Number</label>
                      <input
                        type="text"
                        value={cngTankNumber}
                        onChange={(e) => setCngTankNumber(e.target.value.toUpperCase())}
                        placeholder="Enter CNG Tank Serial No"
                        className="w-full rounded-lg border border-border px-3 py-2 text-xs font-mono focus:border-primary focus:outline-hidden transition-colors"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Registration Date *</label>
                    <input
                      type="date"
                      value={registrationDate}
                      onChange={(e) => setRegistrationDate(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">RTO Tax Validity</label>
                    <input
                      type="date"
                      value={rtoTaxValidity}
                      onChange={(e) => setRtoTaxValidity(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>

                {/* RC & RTO Documents Grouped Together */}
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 mb-3">RC & RTO Document Uploads</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {documentFields.filter(f => f.key !== "insurance_document").map((field) => (
                      <div key={field.key} className="flex flex-col gap-2.5 rounded-xl border-2 border-dashed border-border bg-slate-50/50 p-4 relative overflow-hidden">
                        <span className="font-sans text-[11px] font-semibold text-text-muted text-center">
                          {field.label}
                        </span>
                        {field.state ? (
                          <div className="relative flex flex-col items-center justify-center bg-slate-100 rounded-lg p-2 min-h-[90px]">
                            {field.state.includes("application/pdf") ? (
                              <FileText className="h-8 w-8 text-primary mb-1" />
                            ) : (
                              <img src={field.state} alt={field.label} className="max-h-16 w-auto object-contain rounded border border-border" />
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const setters: Record<string, any> = { rc_document: setRcDocument, authorization_certificate_doc: setAuthorizationCertificateDoc, rto_tax_receipt: setRtoTaxReceipt };
                                setters[field.key](null);
                              }}
                              className="absolute top-1 right-1 rounded-full bg-rose-50 border border-rose-200 p-1 text-rose-500 hover:bg-rose-100 transition-all cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-3 min-h-[90px] gap-2">
                            <div className="rounded-full bg-primary/10 p-2 text-primary">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="relative w-full">
                              <input type="file" accept="image/*,.pdf" onChange={(e) => triggerUpload(field.key, e)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                              <div className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white text-[10px] font-medium text-text-muted py-1.5 shadow-xs hover:bg-slate-50 pointer-events-none">
                                <Upload className="h-3 w-3" /> Upload PDF/Image
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* STEP 2: INSURANCE & POLICY */}
              <div className={`${currentStep === 2 ? 'block' : 'hidden'} space-y-6 animate-in fade-in duration-300`}>
                <h3 className="font-sans text-sm font-bold text-primary border-b border-slate-100 pb-2">
                  2. Insurance Details & Document Upload
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Insurance Broker</label>
                    <input
                      type="text"
                      value={insuranceBroker}
                      onChange={(e) => setInsuranceBroker(e.target.value)}
                      placeholder="e.g. PolicyBazaar"
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Insurance Underwriter</label>
                    <input
                      type="text"
                      value={insuranceUnderwriter}
                      onChange={(e) => setInsuranceUnderwriter(e.target.value)}
                      placeholder="e.g. ICICI Lombard"
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1 flex justify-between">
                      <span>Coverage Start Date</span>
                      {isScanning === 'insurance_document' && <span className="text-[9px] text-primary italic">Extracting...</span>}
                    </label>
                    <input
                      type="date"
                      value={insuranceStartDate}
                      onChange={(e) => setInsuranceStartDate(e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-hidden transition-colors ${isScanning === 'insurance_document' ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-border'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1 flex justify-between">
                      <span>Coverage End Date *</span>
                      {isScanning === 'insurance_document' && <span className="text-[9px] text-primary italic">Extracting...</span>}
                    </label>
                    <input
                      type="date"
                      value={insuranceEndDate}
                      onChange={(e) => setInsuranceEndDate(e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-hidden transition-colors ${isScanning === 'insurance_document' ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-border'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Insurance IDV (Insured Declared Value ₹)</label>
                    <input
                      type="number"
                      value={insuranceIdv}
                      onChange={(e) => setInsuranceIdv(e.target.value)}
                      placeholder="e.g. 650000"
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>

                {/* Insurance Add-on Covers */}
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 mb-2">Insurance Add-on Coverages</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-border p-3.5 rounded-xl">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={coverEngineProtect} onChange={(e) => setCoverEngineProtect(e.target.checked)} className="rounded border-border text-primary focus:ring-primary/20 w-4 h-4" />
                      <span className="text-xs font-bold text-slate-800">Engine Protect (EP)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={coverConsumables} onChange={(e) => setCoverConsumables(e.target.checked)} className="rounded border-border text-primary focus:ring-primary/20 w-4 h-4" />
                      <span className="text-xs font-bold text-slate-800">Consumables (CM)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={coverZeroDep} onChange={(e) => setCoverZeroDep(e.target.checked)} className="rounded border-border text-primary focus:ring-primary/20 w-4 h-4" />
                      <span className="text-xs font-bold text-slate-800">Zero Dep (ZD)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={coverRsa} onChange={(e) => setCoverRsa(e.target.checked)} className="rounded border-border text-primary focus:ring-primary/20 w-4 h-4" />
                      <span className="text-xs font-bold text-slate-800">Roadside Assist (RSA)</span>
                    </label>
                  </div>
                </div>

                {/* Insurance Document Upload Grouped Right With Insurance Details */}
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    Insurance Document <ScanLine className="w-3.5 h-3.5 text-primary" title="OCR Active" />
                  </h4>
                  <p className="text-[11px] text-text-muted mb-3">Upload your insurance policy. Coverage dates will be automatically extracted.</p>
                  
                  <div className="max-w-md">
                    <div className="flex flex-col gap-2.5 rounded-xl border-2 border-dashed border-border bg-slate-50/50 p-4 relative overflow-hidden">
                      {isScanning === 'insurance_document' && (
                         <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                            <div className="flex items-center gap-1.5 text-xs text-primary font-bold animate-pulse">
                               <RefreshCw className="w-4 h-4 animate-spin" /> Extracting Dates...
                            </div>
                         </div>
                      )}
                      
                      {insuranceDocument ? (
                        <div className="relative flex flex-col items-center justify-center bg-slate-100 rounded-lg p-3 min-h-[100px]">
                          {insuranceDocument.includes("application/pdf") ? (
                            <FileText className="h-10 w-10 text-primary mb-1" />
                          ) : (
                            <img src={insuranceDocument} alt="Insurance" className="max-h-24 w-auto object-contain rounded border border-border" />
                          )}
                          <button
                            type="button"
                            onClick={() => setInsuranceDocument(null)}
                            className="absolute top-1 right-1 rounded-full bg-rose-50 border border-rose-200 p-1 text-rose-500 hover:bg-rose-100 transition-all cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-4 min-h-[100px] gap-2">
                          <div className="rounded-full bg-primary/10 p-2 text-primary">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="relative w-full">
                            <input type="file" accept="image/*,.pdf" onChange={(e) => triggerUpload('insurance_document', e)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <div className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white text-xs font-medium text-text-muted py-2 shadow-xs hover:bg-slate-50 pointer-events-none">
                              <Upload className="h-3.5 w-3.5" /> Upload Insurance Document
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 3: PDI CHECKLIST & ACCESSORIES */}
              <div className={`${currentStep === 3 ? 'block' : 'hidden'} space-y-6 animate-in fade-in duration-300`}>
                <h3 className="font-sans text-sm font-bold text-primary border-b border-slate-100 pb-2">
                  3. PDI Physical Checklist & Accessories
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Fitness Validity *</label>
                    <input
                      type="date"
                      value={fitnessValidity}
                      onChange={(e) => setFitnessValidity(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Permit Validity</label>
                    <input
                      type="date"
                      value={permitValidity}
                      onChange={(e) => setPermitValidity(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Odometer Reading *</label>
                    <input
                      type="number"
                      value={kmsReading}
                      onChange={(e) => setKmsReading(e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">GPS Device Vendor</label>
                    <input
                      type="text"
                      value={gpsVendor}
                      onChange={(e) => setGpsVendor(e.target.value)}
                      placeholder="e.g. Roadcast"
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">GPS ID Number</label>
                    <div className="relative">
                      <input
                        type={showGpsId ? "text" : "password"}
                        value={gpsId}
                        onChange={(e) => setGpsId(e.target.value)}
                        placeholder="e.g. AIS-9938"
                        className="w-full rounded-lg border border-border pl-3 pr-8 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGpsId(!showGpsId)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showGpsId ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">CNG Kit Installed?</label>
                    <select
                      value={cngInstalled}
                      onChange={(e) => setCngInstalled(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden bg-white transition-colors"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                  {cngInstalled === "Yes" && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-text mb-1">CNG Cylinder Plate No *</label>
                        <div className="relative">
                          <input
                            type={showCngPlate ? "text" : "password"}
                            value={cngPlate}
                            onChange={(e) => setCngPlate(e.target.value)}
                            placeholder="Plate details..."
                            className="w-full rounded-lg border border-border pl-3 pr-8 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors font-mono font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCngPlate(!showCngPlate)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                          >
                            {showCngPlate ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-text mb-1">CNG Installation Date *</label>
                        <input
                          type="date"
                          value={cngInstallationDate}
                          onChange={(e) => setCngInstallationDate(e.target.value)}
                          className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Accessories checklist */}
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 mb-3">Vehicle Accessories Checklist</h4>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
                    {[
                      { label: "Jack", state: jack, setter: setJack },
                      { label: "Jack Rod", state: jackRod, setter: setJackRod },
                      { label: "Spanner", state: spanner, setter: setSpanner },
                      { label: "Triangle", state: parkingTriangle, setter: setParkingTriangle },
                      { label: "Fire Ext.", state: fireExtinguishers, setter: setFireExtinguishers },
                      { label: "Seat Cover", state: seatCover, setter: setSeatCover },
                      { label: "Floor Carpet", state: floorCarpet, setter: setFloorCarpet },
                      { label: "FASTag", state: fastTag, setter: setFastTag },
                      { label: "Music System", state: musicSystem, setter: setMusicSystem },
                    ].map((chk) => (
                      <div key={chk.label}>
                        <span className="block text-[10px] font-bold text-text mb-1">{chk.label}</span>
                        <select
                          value={chk.state}
                          onChange={(e) => chk.setter(e.target.value)}
                          className="w-full rounded-lg border border-border px-2 py-1.5 text-[10px] focus:border-primary focus:outline-hidden bg-white transition-colors font-semibold text-slate-700"
                        >
                          <option value="Available">Available</option>
                          <option value="Missing">Missing</option>
                        </select>
                      </div>
                    ))}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-sans text-[10px] font-bold text-text">Key Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={keyQuantity}
                        onChange={(e) => setKeyQuantity(parseInt(e.target.value) || 0)}
                        className="w-full rounded-lg border border-border bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 outline-none focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  {fastTag === "Available" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 bg-slate-50 border border-border p-4 rounded-xl">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">Fast Tag Serial / Barcode Number</label>
                        <input
                          type="text"
                          value={fastTagNumber}
                          onChange={(e) => setFastTagNumber(e.target.value)}
                          placeholder="e.g. 60143521098472"
                          className="w-full rounded-lg border border-border px-3 py-2 text-xs font-mono focus:border-primary focus:outline-hidden transition-colors bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">Fast Tag Vendor / Issuing Bank</label>
                        <input
                          type="text"
                          value={fastTagVendor}
                          onChange={(e) => setFastTagVendor(e.target.value)}
                          placeholder="e.g. ICICI Bank / IDFC First"
                          className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 4: PDI PHOTOS & OCR */}
              <div className={`${currentStep === 4 ? 'block' : 'hidden'} space-y-6 animate-in fade-in duration-300`}>
                <h3 className="font-sans text-sm font-bold text-primary border-b border-slate-100 pb-2">
                  4. PDI Photographic Verification & OCR Scans
                </h3>
                <p className="font-sans text-xs text-text-muted mb-4">Capture vehicle credentials. Chassis and Tyre numbers will be automatically extracted via OCR.</p>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  {photoFields.map((field) => {
                    const isOcrField = ["engine_chasis_no_img", "rh_fr_tyre_img", "lh_fr_tyre_img", "rh_rear_tyre_img", "lh_rear_tyre_img", "spare_wheel_img"].includes(field.key);
                    return (
                      <div key={field.key} className="flex flex-col gap-2.5 rounded-xl border-2 border-dashed border-border bg-slate-50/50 p-4 relative">
                        <span className="font-sans text-[11px] font-semibold text-text-muted text-center flex items-center justify-center gap-1">
                          {field.label} {isOcrField && <ScanLine className="w-3 h-3 text-primary" title="OCR Active" />}
                        </span>
                        {field.state ? (
                          <div className="relative flex flex-col items-center justify-center bg-slate-100 rounded-lg p-2 min-h-[90px]">
                            <img src={field.state} alt={field.label} className="max-h-20 w-auto object-contain rounded-md shadow-xs border border-border" />
                            <button
                              type="button"
                              onClick={() => {
                                const setters: Record<string, any> = {
                                  image_front: setImageFront, image_lh: setImageLh, image_back: setImageBack, image_rh: setImageRh,
                                  engine_chasis_no_img: setEngineChasisNoImg, battery_sl_no_img: setBatterySlNoImg,
                                  engine_compartment_img: setEngineCompartmentImg, fast_tag_img: setFastTagImg,
                                  music_system_img: setMusicSystemImg, rh_fr_tyre_img: setRhFrTyreImg,
                                  lh_fr_tyre_img: setLhFrTyreImg, rh_rear_tyre_img: setRhRearTyreImg,
                                  lh_rear_tyre_img: setLhRearTyreImg, spare_wheel_img: setSpareWheelImg
                                };
                                setters[field.key](null);
                                setOcrData(prev => ({...prev, [field.key]: ""}));
                              }}
                              className="absolute top-1 right-1 rounded-full bg-rose-50 border border-rose-200 p-1 text-rose-500 hover:bg-rose-100 transition-all cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-3 min-h-[90px] gap-2">
                            <div className="rounded-full bg-primary/10 p-2 text-primary">
                              <Camera className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col gap-1.5 w-full mt-1">
                              <button type="button" onClick={() => setCameraActiveField(field.key)} className="flex items-center justify-center gap-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-[10px] font-semibold py-1.5 transition-colors cursor-pointer w-full">
                                <Camera className="h-3 w-3" /> Capture
                              </button>
                              <label className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white hover:bg-slate-100 text-text-muted text-[10px] font-semibold py-1.5 transition-colors cursor-pointer w-full">
                                <Upload className="h-3 w-3" /> Upload
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => triggerUpload(field.key, e)} />
                              </label>
                            </div>
                          </div>
                        )}
                        {isOcrField && field.state && (
                          <div className="mt-2 w-full">
                            {isScanning === field.key ? (
                              <div className="flex items-center justify-center gap-1 py-1 text-[10px] text-primary animate-pulse font-bold">
                                <RefreshCw className="w-3 h-3 animate-spin" /> Scanning...
                              </div>
                            ) : (
                              <input
                                type="text"
                                placeholder="OCR Extracted No."
                                value={ocrData[field.key] || ""}
                                onChange={(e) => setOcrData(prev => ({...prev, [field.key]: e.target.value}))}
                                className="w-full rounded border-2 border-primary/20 bg-primary/5 px-2 py-1.5 text-[10px] font-bold text-center outline-none focus:border-primary transition-all text-slate-700"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STEP 5: STATUS & REVIEW */}
              <div className={`${currentStep === 5 ? 'block' : 'hidden'} space-y-6 animate-in fade-in duration-300`}>
                <h3 className="font-sans text-sm font-bold text-primary border-b border-slate-100 pb-2">
                  5. Vehicle Status & Final Review
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Status Type *</label>
                    <select
                      value={receivedAllocated}
                      onChange={(e) => setReceivedAllocated(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden bg-white transition-colors font-semibold"
                    >
                      <option value="In Process">In Process</option>
                      <option value="PDI Done">PDI Done</option>
                      <option value="Ready for Delivery">Ready for Delivery</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">Manufacturer Month</label>
                    <input
                      type="month"
                      value={manufacturerMonth}
                      onChange={(e) => setManufacturerMonth(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>

                {/* APPROVER & NOTES SUBMISSION */}
                <div className="mt-6 border-t border-slate-100 pt-6 space-y-6">
                  <h4 className="font-sans text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Approval Workflow
                  </h4>
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
                        placeholder="Add notes for approver regarding compliance, registration, or physical condition..."
                        rows={2}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 resize-none shadow-inner"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form footer step navigation & actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 border-t border-border/40 pt-6">
                <div className="text-xs text-text-muted font-medium">
                  * Mandatory fields required for onboarding
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                  {currentStep > 1 && (
                    <button 
                      type="button" 
                      onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs active:scale-98"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous Step
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    className="flex items-center justify-center gap-1.5 h-11 rounded-lg border border-border bg-white px-5 font-sans text-sm font-semibold text-text-muted hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer shadow-xs active:scale-98"
                  >
                    <Database className="w-4 h-4 text-slate-500" />
                    Save Draft
                  </button>

                  {currentStep < 5 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
                      className="flex items-center justify-center gap-2 h-11 rounded-lg bg-primary hover:bg-primary-dark text-white px-6 font-sans text-sm font-bold shadow-md shadow-primary/10 transition-all cursor-pointer active:scale-98"
                    >
                      Next Step <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleSubmit(e, false)}
                      className="flex items-center justify-center gap-2 h-11 rounded-lg bg-green hover:bg-emerald-600 text-white px-6 font-sans text-sm font-bold shadow-md shadow-green/10 transition-all cursor-pointer active:scale-98"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {approvalStatus === "Changes Requested" ? "Resubmit for Approval" : (editingId ? "Save Changes" : "Submit Vehicle Onboarding")}
                    </button>
                  )}
                </div>
              </div>

            </form>
          </div>
        )}

        {/* TAB 1.5: SAVED DRAFTS */}
        {activeTab === "drafts" && (
          <div className="space-y-6">
            
            {/* Bento Grid Metrics for Drafts */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-amber-800 uppercase tracking-wider">Total Saved Drafts</span>
                  <span className="font-sans text-3xl font-extrabold text-amber-700 mt-1">
                    {records.filter(r => r.approval_status === "Draft").length}
                  </span>
                  <span className="font-sans text-[10px] text-amber-600 mt-1">Unsent vehicle forms saved locally</span>
                </div>
                <div className="rounded-xl bg-amber-100 text-amber-700 p-3">
                  <Clock className="h-6 w-6" />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-5 shadow-xs flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-sans text-[10px] font-bold text-text-dim uppercase tracking-wider">In Progress Forms</span>
                  <span className="font-sans text-3xl font-extrabold text-primary mt-1">
                    {records.filter(r => r.approval_status === "Draft").length}
                  </span>
                  <span className="font-sans text-[10px] text-text-muted mt-1">Waiting to be submitted for approval</span>
                </div>
                <div className="rounded-xl bg-blue-50 text-primary p-3">
                  <Truck className="h-6 w-6" />
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
                  <p className="font-sans text-sm text-text-muted mt-1">Unsent vehicle onboarding forms. Click 'Edit Draft' to complete and submit for approval.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { resetForm(); setActiveTab("form"); }}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-green hover:bg-green/95 px-4 font-sans text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" /> New Vehicle Entry
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap border-collapse">
                  <thead className="bg-slate-50 border-b border-border/60">
                    <tr>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim text-left">Draft ID</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim text-left">Vehicle Reg No</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim text-left">Model & City</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim text-left">Fuel Type</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim text-left">Status</th>
                      <th className="px-6 py-3.5 font-sans text-[10px] font-bold text-text-dim text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {records.filter(r => r.approval_status === "Draft").length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-text-muted font-sans bg-slate-50/50">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <CheckCircle className="h-8 w-8 text-emerald-500 mb-2 opacity-60" />
                            <p className="font-semibold text-slate-800">No saved drafts found!</p>
                            <p className="text-xs">All records have been sent for approval or fully onboarded.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      records.filter(r => r.approval_status === "Draft").map((r) => {
                        const appStatus = r.approval_status || "Draft";

                        return (
                          <tr key={r.id} className="hover:bg-amber-50/20 transition-colors group">
                            <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900">
                              #{r.id}
                            </td>
                            <td className="px-6 py-4 font-sans text-sm font-bold text-slate-900">
                              {r.vehicle_number}
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-sans text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                                {r.model} · <strong className="text-slate-600">{r.city_name || r.city}</strong>
                              </span>
                            </td>
                            <td className="px-6 py-4 font-sans text-xs font-semibold text-text">
                              {r.fuel_type}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                {appStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => loadRecordForEdit(r.id)}
                                  className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-amber-50 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                  title="Edit / Open Draft"
                                >
                                  <Edit className="w-3.5 h-3.5 text-amber-600" /> Edit Draft
                                </button>
                                <button 
                                  onClick={() => handleDeleteRecord(r.id)}
                                  className="h-8 w-8 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete Draft"
                                >
                                  <Trash2 className="h-4 w-4" />
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

        {/* Tab 2: Registry View */}
        {activeTab === "registry" && (
          <div className="space-y-8">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              
              <div className="rounded-xl border border-border bg-white p-5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 animate-pulse">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block font-sans text-[10px] font-bold text-text-muted">Total Onboarded</span>
                    <span className="block font-mono text-xl font-extrabold text-text leading-none mt-1">{stats.total_fleet}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block font-sans text-[10px] font-bold text-text-muted">CNG Enabled</span>
                    <span className="block font-mono text-xl font-extrabold text-text leading-none mt-1">{stats.cng_count}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block font-sans text-[10px] font-bold text-text-muted">Receiving Split</span>
                    <span className="block font-mono text-xl font-extrabold text-text leading-none mt-1">{stats.receiving_count}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block font-sans text-[10px] font-bold text-text-muted">Allocated Split</span>
                    <span className="block font-mono text-xl font-extrabold text-text leading-none mt-1">{stats.allocation_count}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Filters panel */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute top-2.5 left-3 h-4 w-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search vehicle number or model..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 rounded-lg border border-border py-1.5 pr-3 pl-9 font-sans text-xs font-semibold focus:border-primary focus:outline-hidden transition-colors"
                  />
                </div>
                
                <select
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="rounded-lg border border-border bg-white px-3 py-1.5 font-sans text-xs font-semibold text-text-muted focus:border-primary focus:outline-hidden cursor-pointer"
                >
                  <option value="All Cities">All Cities</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Bangalore">Bangalore</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Delhi">Delhi</option>
                </select>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="rounded-lg border border-border bg-white px-3 py-1.5 font-sans text-xs font-semibold text-text-muted focus:border-primary focus:outline-hidden cursor-pointer"
                >
                  <option value="All Statuses">All Statuses</option>
                  <option value="Receiving">Receiving</option>
                  <option value="Allocation">Allocation</option>
                  <option value="Ready for Delivery">Ready for Delivery</option>
                </select>
              </div>

              <button
                onClick={exportCSV}
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 font-sans text-xs font-bold text-text-muted hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="h-4 w-4 text-primary" />
                Export CSV
              </button>
            </div>

            {/* List Table */}
            <div className="overflow-hidden border border-border rounded-xl bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-slate-50 text-[10px] font-bold text-text-muted select-none">
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Vehicle Reg No</th>
                      <th className="py-3 px-4">Model & Asset ID</th>
                      <th className="py-3 px-4">City</th>
                      <th className="py-3 px-4">Compliance Dates</th>
                      <th className="py-3 px-4">Odometer</th>
                      <th className="py-3 px-4">Checklist Status</th>
                      <th className="py-3 px-4">Operation Status</th>
                      <th className="py-3 px-4">Created At (IST)</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-sans text-xs">
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-text-muted font-medium">
                          No vehicle records found matching the filters.
                        </td>
                      </tr>
                    ) : (
                      records.map((record) => {
                        let statusColor = "bg-blue-50 text-blue-600";
                        if (record.received_allocated === "PDI Done") statusColor = "bg-green-50 text-green-700";
                        if (record.received_allocated === "Ready for Delivery") statusColor = "bg-emerald-100 text-emerald-900";
                        if (record.received_allocated === "In Process") statusColor = "bg-amber-50 text-amber-700";

                        const createdDate = formatDisplayDate(record.created_at);
                        const createdTime = formatDisplayTime(record.created_at);
                        
                        const fitnessDisplay = record.fitness_validity && record.fitness_validity !== "1970-01-01" ? record.fitness_validity : "—";
                        const insuranceDisplay = record.insurance_validity && record.insurance_validity !== "1970-01-01" ? record.insurance_validity : "—";

                        return (
                          <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-4 font-mono font-bold text-text-muted">#{record.id}</td>
                            <td className="py-4 px-4 font-bold text-gray-900">{record.vehicle_number}</td>
                            <td className="py-4 px-4">
                              <div className="font-semibold text-text">{record.model}</div>
                              {record.letzryd_unique_no && (
                                <div className="text-[9px] text-text-muted font-mono mt-0.5">{record.letzryd_unique_no}</div>
                              )}
                            </td>
                            <td className="py-4 px-4 font-semibold text-text-muted">{record.city_name || record.city}</td>
                            <td className="py-4 px-4 font-mono text-[10px]">
                              <div>Fitness: <span className="font-bold text-text">{fitnessDisplay}</span></div>
                              <div className="mt-0.5">Insurance: <span className="font-bold text-text">{insuranceDisplay}</span></div>
                            </td>
                            <td className="py-4 px-4 font-mono font-bold text-text-muted">{record.kms_reading} KMs</td>
                            <td className="py-4 px-4">
                              <div className="flex flex-col gap-0.5 text-[9px] font-bold text-text-muted">
                                <div>Jack: <span className={record.jack === "Available" ? "text-green-600" : "text-red-500"}>{record.jack || "Available"}</span></div>
                                <div>CNG: <span className={record.cng_installed === "Yes" ? "text-green-600" : "text-slate-400"}>{record.cng_installed || "No"}</span></div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${statusColor}`}>
                                {record.received_allocated}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="font-bold text-slate-800">{createdDate}</div>
                              <div className="text-slate-400 text-[10px] font-medium">{createdTime}</div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => loadRecordForEdit(record.id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-white text-text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer"
                                  title="Edit Record"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRecord(record.id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-white text-text-muted hover:border-red-200 hover:text-red-600 transition-colors cursor-pointer"
                                  title="Delete Record"
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

      </main>

      {cameraActiveField && (
        <CameraCapture
          title={`Capture ${photoFields.find(f => f.key === cameraActiveField)?.label || "PDI"} Photo`}
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