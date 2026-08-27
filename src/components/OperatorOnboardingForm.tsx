import { compressImage } from "../utils/imageCompressor";
import React, { useState, useEffect } from "react";
import { 
  User, FileText, CheckCircle, 
  ChevronLeft, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, Plus, UserCheck, Database, IndianRupee, MapPin, CreditCard, Users, Eye, EyeOff
} from "lucide-react";
import { OnboardingRecord, User as UserSession, CITIES } from "../types";
import CameraCapture from "./CameraCapture";

interface OperatorOnboardingFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
  initialEditId?: number;
  initialStep?: number;
  isReviewMode?: boolean;
}

interface DriverSubForm {
  driver_name: string;
  father_name: string;
  phone_number: string;
  whatsapp_number: string;
  dob: string;
  present_address: string;
  permanent_address: string;
  sameAsPresentAddress: boolean;
  emergency_name: string;
  emergency_phone: string;
  emergency_contact_aadhaar_number?: string;
  emergency_contact_aadhaar_doc?: string | null;
  dl_number: string;
  dl_expiry_date: string;
  pan_number: string;
  aadhaar_number: string;
  pan_aadhaar_linked: string;
  custom_rent_amount: string;
  driver_id: string;
  selfie_photo: string | null;
  dl_front: string | null;
  dl_back: string | null;
  pan_card_photo: string | null;
  aadhaar_card_photo: string | null;
}

export default function OperatorOnboardingForm({ 
  user, 
  onBackToSelector, 
  onLogout,
  initialEditId,
  initialStep,
  isReviewMode
}: OperatorOnboardingFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "registry">("form");
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true
  }));

  // Wizard & Mode State
  const [currentStep, setCurrentStep] = useState(1);
  const [entryMode, setEntryMode] = useState<"new" | "walkin" | "edit">("new");
  const [retrieveIdInput, setRetrieveIdInput] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    if (initialEditId) {
      loadRecordForEdit(initialEditId).then(() => {
        if (initialStep) setCurrentStep(Math.min(initialStep, 4));
      });
    }
  }, [initialEditId, initialStep]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: true
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Operator (Vendor) State
  const [vendorName, setVendorName] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isWhatsappSame, setIsWhatsappSame] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  
  const getUserNormalizedCity = (uCity?: string) => {
    if (!uCity) return "Bengaluru";
    const s = uCity.trim().toLowerCase();
    if (["bangalore", "bengaluru", "blr"].includes(s)) return "Bengaluru";
    if (["hyderabad", "hyd"].includes(s)) return "Hyderabad";
    if (["mumbai", "bom"].includes(s)) return "Mumbai";
    if (["delhi", "del"].includes(s)) return "Delhi";
    if (["chennai", "maa"].includes(s)) return "Chennai";
    return uCity;
  };

  const [city, setCity] = useState(getUserNormalizedCity(user?.city));
  const [operatingPlace, setOperatingPlace] = useState("");
  
  // Driver Manager Assignment (City-filtered)
  const [driverManagerId, setDriverManagerId] = useState<number | null>(null);
  const [driverManagerName, setDriverManagerName] = useState("");
  const [driverManagersList, setDriverManagersList] = useState<any[]>([]);

  const isSameCity = (c1?: string, c2?: string) => {
    if (!c1 || !c2) return true;
    const norm = (s: string) => {
      const v = s.trim().toLowerCase();
      if (["bangalore", "bengaluru", "blr"].includes(v)) return "bangalore";
      if (["hyderabad", "hyd"].includes(v)) return "hyderabad";
      if (["mumbai", "bom"].includes(v)) return "mumbai";
      if (["delhi", "del"].includes(v)) return "delhi";
      if (["chennai", "maa"].includes(v)) return "chennai";
      return v;
    };
    return norm(c1) === norm(c2);
  };

  const filteredDriverManagers = useMemo(() => {
    const activeCity = city || user?.city || "";
    if (!activeCity) return driverManagersList;
    return driverManagersList.filter((dm: any) => isSameCity(dm.city, activeCity));
  }, [driverManagersList, city, user?.city]);

  const fetchDriverManagersForCity = async (selectedCity: string) => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/driver-managers?city=${encodeURIComponent(selectedCity)}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDriverManagersList(data);
        if (data.length > 0) {
          if (!data.some((d: any) => d.id === driverManagerId)) {
            setDriverManagerId(data[0].id);
            setDriverManagerName(data[0].name);
          }
        } else {
          setDriverManagerId(null);
          setDriverManagerName("");
        }
      }
    } catch (e) {
      console.error("Error fetching driver managers", e);
    }
  };

  useEffect(() => {
    const activeCity = city || user?.city || "Hyderabad";
    fetchDriverManagersForCity(activeCity);
  }, [city, user?.city]);
  
  // Business Address State
  const [businessLine1, setBusinessLine1] = useState("");
  const [businessLine2, setBusinessLine2] = useState("");
  const [businessArea, setBusinessArea] = useState("");
  const [businessCity, setBusinessCity] = useState("Hyderabad");
  const [businessPincode, setBusinessPincode] = useState("");
  
  // Bank Details State
  const [isAccountNameSame, setIsAccountNameSame] = useState(true);
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("Current");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");
  
  // Operator Documents
  const [operatorSelfie, setOperatorSelfie] = useState<string | null>(null);
  const [operatorPanPhoto, setOperatorPanPhoto] = useState<string | null>(null);
  const [operatorAadhaarPhoto, setOperatorAadhaarPhoto] = useState<string | null>(null);
  const [operatorPan, setOperatorPan] = useState("");
  const [operatorAadhaar, setOperatorAadhaar] = useState("");
  const [showOperatorPan, setShowOperatorPan] = useState(false);
  const [showOperatorAadhaar, setShowOperatorAadhaar] = useState(false);
  const [showDDlNum, setShowDDlNum] = useState(false);
  const [showDPanNum, setShowDPanNum] = useState(false);
  const [showDAadhaarNum, setShowDAadhaarNum] = useState(false);
  const [documentsVerified, setDocumentsVerified] = useState(false);

  // 2. Drivers List
  const [drivers, setDrivers] = useState<DriverSubForm[]>([]);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [editingDriverIdx, setEditingDriverIdx] = useState<number | null>(null);

  // 3. Driver Sub-Form State
  const [dName, setDName] = useState("");
  const [dFather, setDFather] = useState("");
  const [dPhone, setDPhone] = useState("");
  const [dWhatsapp, setDWhatsapp] = useState("");
  const [dDob, setDDob] = useState("");
  const [dPresentAddr, setDPresentAddr] = useState("");
  const [dPermanentAddr, setDPermanentAddr] = useState("");
  const [dSameAsPresent, setDSameAsPresent] = useState(false);
  const [dEmergName, setDEmergName] = useState("");
  const [dEmergPhone, setDEmergPhone] = useState("");
  const [dEmergAadhaarNum, setDEmergAadhaarNum] = useState("");
  const [showDEmergAadhaarNum, setShowDEmergAadhaarNum] = useState(false);
  const [dEmergAadhaarDoc, setDEmergAadhaarDoc] = useState<string | null>(null);
  const [dDlNum, setDDlNum] = useState("");
  const [dDlExpiry, setDDlExpiry] = useState("");
  const [dPanNum, setDPanNum] = useState("");
  const [dAadhaarNum, setDAadhaarNum] = useState("");
  const [dPanAadhaarLinked, setDPanAadhaarLinked] = useState("Yes");
  const [dCustomRent, setDCustomRent] = useState("");
  const [dDriverId, setDDriverId] = useState("");

  // Driver Uploads
  const [dSelfie, setDSelfie] = useState<string | null>(null);
  const [dDlFront, setDDlFront] = useState<string | null>(null);
  const [dDlBack, setDDlBack] = useState<string | null>(null);
  const [dPanPhoto, setDPanPhoto] = useState<string | null>(null);
  const [dAadhaarPhoto, setDAadhaarPhoto] = useState<string | null>(null);

  // Active Camera Capture Field
  const [cameraActiveField, setCameraActiveField] = useState<string | null>(null);

  // Registry & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [records, setRecords] = useState<OnboardingRecord[]>([]);
  const [stats, setStats] = useState({
    total_onboarded: 0,
    vendor_count: 0,
    latest_onboarding: "-",
    last_7_days_count: 0
  });

  const displayName = user.name || user.username || "User";
  const initials = displayName.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/stats/onboarding", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      if (filterCity !== "all") queryParams.append("city", filterCity);
      queryParams.append("limit", "15");

      const res = await fetch(`/api/onboarding?${queryParams.toString()}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data.filter((r: any) => r.vendor_type === "Operator"));
      }
      fetchStats();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === "registry") {
      fetchData();
    }
  }, [activeTab, searchQuery, filterCity]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImage(file, 1920, 1920, 0.85, "operator-docs").then((url) => {
      if (typeof url === "string") {
        setter(url);
      }
    })
    .catch((err) => { alert("Photo upload failed: " + (err && err.message ? err.message : "Check your connection and retry.")); })
  };

  const resetOperatorForm = () => {
    setVendorName("");
    setVendorId("");
    setPhoneNumber("");
    setIsWhatsappSame(true);
    setWhatsappNumber("");
    setOperatingPlace("");
    setBusinessLine1("");
    setBusinessLine2("");
    setBusinessArea("");
    setBusinessPincode("");
    setOperatorSelfie(null);
    setOperatorPanPhoto(null);
    setOperatorAadhaarPhoto(null);
    setOperatorPan("");
    setOperatorAadhaar("");
    setDocumentsVerified(false);
    setIsAccountNameSame(true);
    setAccountName("");
    setAccountType("Current");
    setBankName("");
    setAccountNumber("");
    setIfscCode("");
    setUpiId("");
    setCity(getUserNormalizedCity(user?.city));
    setDriverManagerId(null);
    setDriverManagerName("");
    setDrivers([]);
    setEditingId(null);
    setCurrentStep(1);
    setEntryMode("new");
  };

  const loadRecordForEdit = async (id: number) => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/onboarding/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Operator record not found");
      const data = await res.json();

      if (data.vendor_type !== "Operator") {
        alert("This record is not an Operator. Please use Partner Onboarding for this ID.");
        return;
      }

      setEditingId(data.id);
      setEntryMode("edit");
      setVendorName(data.driver_name || data.vendor_name || "");
      setVendorId(data.vendor_id || "");
      setPhoneNumber(data.phone_number || "");
      setWhatsappNumber(data.whatsapp_number || "");
      setIsWhatsappSame(data.phone_number === data.whatsapp_number);
      setCity(data.city || "Hyderabad");
      setOperatingPlace(data.operating_place || "");
      if (data.driver_manager_id) {
        setDriverManagerId(data.driver_manager_id);
        setDriverManagerName(data.driver_manager_name || "");
      }
      
      // Attempt to split address back into fields
      if (data.present_address) {
        const parts = data.present_address.split(", ");
        setBusinessLine1(parts[0] || data.present_address);
        setBusinessLine2(parts[1] || "");
        setBusinessArea(parts[2] || "");
      }

      setOperatorPan(data.pan_number || "");
      setOperatorAadhaar(data.aadhaar_number || "");
      setOperatorSelfie(data.selfie_photo || null);
      setOperatorPanPhoto(data.pan_card_photo || null);
      setOperatorAadhaarPhoto(data.aadhaar_card_photo || null);
      
      setBankName(data.bank_name || "");
      setAccountNumber(data.account_number || "");
      setIfscCode(data.ifsc_code || "");
      setUpiId(data.upi_id || "");
      if (data.operator_drivers && Array.isArray(data.operator_drivers) && data.operator_drivers.length > 0) {
        setDrivers(data.operator_drivers.map((d: any) => ({
          driver_name: d.driver_name || "",
          father_name: d.father_name || "",
          phone_number: d.phone_number || "",
          whatsapp_number: d.whatsapp_number || d.phone_number || "",
          dob: d.dob || "",
          present_address: d.present_address || "",
          permanent_address: d.permanent_address || "",
          sameAsPresentAddress: d.present_address === d.permanent_address,
          emergency_name: d.emergency_name || "",
          emergency_phone: d.emergency_phone || "",
          emergency_contact_aadhaar_number: d.emergency_contact_aadhaar_number || "",
          emergency_contact_aadhaar_doc: d.emergency_contact_aadhaar_doc || null,
          dl_number: d.dl_number || "",
          dl_expiry_date: d.dl_expiry_date || "",
          pan_number: d.pan_number || "",
          aadhaar_number: d.aadhaar_number || "",
          pan_aadhaar_linked: d.pan_aadhaar_linked || "Yes",
          custom_rent_amount: d.custom_rent_amount || "",
          driver_id: d.driver_id || "",
          selfie_photo: d.selfie_photo || null,
          dl_front: d.dl_front || null,
          dl_back: d.dl_back || null,
          pan_card_photo: d.pan_card_photo || null,
          aadhaar_card_photo: d.aadhaar_card_photo || null
        })));
      } else {
        setDrivers([]);
      }

      setActiveTab("form");
      setCurrentStep(1);
      setRetrieveIdInput("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRetrieveId = async () => {
    const id = parseInt(retrieveIdInput);
    if (!id || id <= 0) return alert("Please enter a valid numeric Operator record ID");
    await loadRecordForEdit(id);
  };

  const handleAddDriver = () => {
    if (!dName || !dPhone || !dPanNum || !dAadhaarNum || !dDriverId) {
      alert("Please fill mandatory driver fields: Name, Phone, Driver ID, PAN, Aadhaar.");
      return;
    }
    const newDriver: DriverSubForm = {
      driver_name: dName,
      father_name: dFather,
      phone_number: dPhone,
      whatsapp_number: dWhatsapp || dPhone,
      dob: dDob,
      present_address: dPresentAddr,
      permanent_address: dSameAsPresent ? dPresentAddr : dPermanentAddr,
      sameAsPresentAddress: dSameAsPresent,
      emergency_name: dEmergName,
      emergency_phone: dEmergPhone,
      emergency_contact_aadhaar_number: dEmergAadhaarNum,
      emergency_contact_aadhaar_doc: dEmergAadhaarDoc,
      dl_number: dDlNum,
      dl_expiry_date: dDlExpiry,
      pan_number: dPanNum,
      aadhaar_number: dAadhaarNum,
      pan_aadhaar_linked: dPanAadhaarLinked,
      custom_rent_amount: dCustomRent,
      driver_id: dDriverId,
      selfie_photo: dSelfie,
      dl_front: dDlFront,
      dl_back: dDlBack,
      pan_card_photo: dPanPhoto,
      aadhaar_card_photo: dAadhaarPhoto
    };

    if (editingDriverIdx !== null) {
      const updated = [...drivers];
      updated[editingDriverIdx] = newDriver;
      setDrivers(updated);
      setEditingDriverIdx(null);
    } else {
      setDrivers([...drivers, newDriver]);
    }
    resetDriverForm();
    setShowDriverForm(false);
  };

  const openEditDriver = (idx: number) => {
    const d = drivers[idx];
    setDName(d.driver_name);
    setDFather(d.father_name);
    setDPhone(d.phone_number);
    setDWhatsapp(d.whatsapp_number);
    setDDob(d.dob);
    setDPresentAddr(d.present_address);
    setDPermanentAddr(d.permanent_address);
    setDSameAsPresent(d.sameAsPresentAddress);
    setDEmergName(d.emergency_name);
    setDEmergPhone(d.emergency_phone);
    setDEmergAadhaarNum(d.emergency_contact_aadhaar_number || "");
    setDEmergAadhaarDoc(d.emergency_contact_aadhaar_doc || null);
    setDDlNum(d.dl_number);
    setDDlExpiry(d.dl_expiry_date);
    setDPanNum(d.pan_number);
    setDAadhaarNum(d.aadhaar_number);
    setDPanAadhaarLinked(d.pan_aadhaar_linked);
    setDCustomRent(d.custom_rent_amount);
    setDDriverId(d.driver_id);
    setDSelfie(d.selfie_photo);
    setDDlFront(d.dl_front);
    setDDlBack(d.dl_back);
    setDPanPhoto(d.pan_card_photo);
    setDAadhaarPhoto(d.aadhaar_card_photo);
    setEditingDriverIdx(idx);
    setShowDriverForm(true);
  };

  const resetDriverForm = () => {
    setDName("");
    setDFather("");
    setDPhone("");
    setDWhatsapp("");
    setDDob("");
    setDPresentAddr("");
    setDPermanentAddr("");
    setDSameAsPresent(false);
    setDEmergName("");
    setDEmergPhone("");
    setDEmergAadhaarNum("");
    setDEmergAadhaarDoc(null);
    setDDlNum("");
    setDDlExpiry("");
    setDPanNum("");
    setDAadhaarNum("");
    setDPanAadhaarLinked("Yes");
    setDCustomRent("");
    setDDriverId("");
    setDSelfie(null);
    setDDlFront(null);
    setDDlBack(null);
    setDPanPhoto(null);
    setDAadhaarPhoto(null);
    setEditingDriverIdx(null);
  };

  const handleRemoveDriver = (idx: number) => {
    setDrivers(drivers.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName || !vendorId || !phoneNumber) {
      return alert("Operator Name, Operator ID, and Phone Number are required.");
    }
    if (drivers.length === 0) {
      return alert("Please add at least one driver under this Operator.");
    }

    const fullBusinessAddress = `${businessLine1}, ${businessLine2}, ${businessArea}, ${businessCity}, ${businessPincode}`.replace(/(^[,\s]+)|([,\s]+$)/g, '');

    try {
      const token = localStorage.getItem("lr_token");

      const payload = {
        driver_name: vendorName, 
        phone_number: phoneNumber,
        whatsapp_number: isWhatsappSame ? phoneNumber : whatsappNumber,
        dob: "1970-01-01",
        city,
        operating_place: operatingPlace,
        present_address: fullBusinessAddress,
        permanent_address: fullBusinessAddress,
        emergency_name: "N/A",
        emergency_phone: "0000000000",
        pan_number: operatorPan || "PENDING",
        aadhaar_number: operatorAadhaar || "PENDING",
        selfie_photo: operatorSelfie || null,
        pan_card_photo: operatorPanPhoto || null,
        aadhaar_card_photo: operatorAadhaarPhoto || null,
        vendor_name: vendorName,
        vendor_id: vendorId,
        vendor_type: "Operator",
        candidate_role: "Operator",
        driver_manager_id: driverManagerId || null,
        driver_manager_name: driverManagerName || null,
        father_name: "N/A",
        bank_name: bankName,
        account_number: accountNumber || null,
        ifsc_code: ifscCode || null,
        upi_id: upiId || null,
        operator_drivers: drivers.map(d => ({
          driver_name: d.driver_name,
          phone_number: d.phone_number,
          dl_number: d.dl_number,
          custom_rent_amount: d.custom_rent_amount,
          driver_id: d.driver_id,
          whatsapp_number: d.whatsapp_number,
          dob: d.dob,
          present_address: d.present_address,
          permanent_address: d.permanent_address,
          emergency_name: d.emergency_name,
          emergency_phone: d.emergency_phone,
          emergency_contact_aadhaar_number: d.emergency_contact_aadhaar_number || null,
          emergency_contact_aadhaar_doc: d.emergency_contact_aadhaar_doc || null,
          pan_number: d.pan_number,
          aadhaar_number: d.aadhaar_number,
          father_name: d.father_name,
          dl_expiry_date: d.dl_expiry_date,
          pan_aadhaar_linked: d.pan_aadhaar_linked,
          selfie_photo: d.selfie_photo || null,
          dl_front: d.dl_front || null,
          dl_back: d.dl_back || null,
          pan_card_photo: d.pan_card_photo || null,
          aadhaar_card_photo: d.aadhaar_card_photo || null
        }))
      };

      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/onboarding/${editingId}` : "/api/onboarding";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Onboarding submission failed");
      alert(editingId ? "Operator record updated successfully!" : "Operator and Drivers Onboarded successfully!");
      
      resetOperatorForm();
      setActiveTab("registry");
    } catch (err: any) {
      alert(err.message || "An error occurred");
    }
  };

  const renderDocCard = (id: string, label: string, value: string | null, setter: (val: string | null) => void, acceptPdf = false) => {
    return (
      <div className="flex flex-col gap-2.5 rounded-xl border-2 border-dashed border-border bg-slate-50/50 p-4 relative">
        <span className="font-sans text-xs font-semibold text-text-muted">{label}</span>
        
        {value ? (
          <div className="relative flex flex-col items-center justify-center bg-slate-100 rounded-lg p-3 min-h-[140px]">
            {value.startsWith("data:application/pdf") ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-10 w-10 text-primary" />
                <span className="text-xs text-primary font-semibold">PDF Uploaded</span>
              </div>
            ) : (
              <img 
                src={value} 
                alt={`${label} Thumbnail`} 
                className="max-h-28 w-auto object-contain rounded-md shadow-xs border border-border"
              />
            )}
            <button
              type="button"
              onClick={() => setter(null)}
              className="absolute top-2 right-2 rounded-full bg-rose-50 border border-rose-200 p-1.5 text-rose-500 hover:bg-rose-100 transition-all cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 min-h-[140px] gap-3 border border-border/50 bg-white rounded-lg">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Camera className="h-5 w-5" />
            </div>
            <span className="font-sans text-xs text-text-dim">No file uploaded</span>
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => setCameraActiveField(id)}
                className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-[10px] font-semibold px-3 py-1.5 transition-colors cursor-pointer"
              >
                <Camera className="h-3 w-3" />
                Capture
              </button>
              <label className="flex items-center gap-1.5 rounded-lg border border-border bg-white hover:bg-slate-100 text-text-muted text-[10px] font-semibold px-3 py-1.5 transition-colors cursor-pointer">
                <Upload className="h-3 w-3" />
                Upload
                <input 
                  type="file" 
                  accept={acceptPdf ? "image/*,application/pdf" : "image/*"} 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e, setter)}
                />
              </label>
            </div>
            {acceptPdf && (
              <span className="text-[9px] text-text-dim">Supports JPG, PNG, PDF</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-border bg-white shadow-xs">
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
              alt="LetzRyd logo"
              className="h-8 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="hidden h-5 border-l border-border sm:inline-block" />
            <span className="hidden font-sans text-xs font-medium text-text-muted sm:inline-block">
              Operator Onboarding
            </span>
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-2">
            <button 
              onClick={() => setActiveTab("form")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "form" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <FileText className="h-4 w-4" />
              Onboarding Form
            </button>
            <button 
              onClick={() => setActiveTab("registry")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "registry" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <Database className="h-4 w-4" />
              Operator Registry
            </button>
          </nav>

          {/* Clock & Profile */}
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
                <span className="font-mono text-[10px] text-text-muted mt-0.5 leading-none">{user.role || "Executive"}</span>
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

      <main className="flex-grow mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === "form" && (
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-border/40 overflow-hidden relative">
            
            {/* CARD HEADER */}
            <div className="bg-primary px-8 py-6 flex flex-col relative overflow-hidden text-white">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20 pointer-events-none"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <img src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" className="h-8 brightness-0 invert" alt="LetzRyd" referrerPolicy="no-referrer" />
                  <span className="px-2 py-0.5 rounded border border-white/30 bg-white/20 text-white text-[10px] font-bold tracking-widest backdrop-blur-sm">
                    Operator Desk
                  </span>
                </div>
                <h1 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                  Operator Onboarding Form
                </h1>
              </div>
            </div>

            {/* ENTRY MODE TOGGLES */}
            <div className="bg-slate-50 border-b border-border p-4">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-2xl mx-auto bg-white p-1 rounded-xl shadow-sm border border-border">
                <button type="button" onClick={() => {setEntryMode("new"); setEditingId(null);}} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${entryMode === 'new' && !editingId ? 'bg-slate-100 text-primary' : 'text-text-muted hover:text-text'}`}>New Entry</button>
                <button type="button" onClick={() => {setEntryMode("walkin"); setEditingId(null);}} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${entryMode === 'walkin' && !editingId ? 'bg-slate-100 text-primary' : 'text-text-muted hover:text-text'}`}>Link Walk-in</button>
                <button type="button" onClick={() => setEntryMode("edit")} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${entryMode === 'edit' || editingId ? 'bg-slate-100 text-primary' : 'text-text-muted hover:text-text'}`}>Retrieve Unverified</button>
              </div>

              {/* Retrieve Bar (Only shows when entry mode is edit/retrieve) */}
              {(entryMode === 'edit' || entryMode === 'walkin') && !editingId && (
                <div className="mt-4 flex max-w-xl mx-auto items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green" />
                    <input type="text" placeholder={entryMode === 'walkin' ? "Link to Walk-in Record (Name, Phone, ID)..." : "Retrieve Unverified Record (ID)..."} value={retrieveIdInput} onChange={(e) => setRetrieveIdInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRetrieveId()} className="h-11 w-full rounded-l-xl border border-green border-r-0 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:ring-1 focus:ring-green" />
                  </div>
                  <button type="button" onClick={handleRetrieveId} className="h-11 rounded-r-xl bg-green px-6 text-xs font-bold text-white hover:bg-green-hover transition-colors">Search</button>
                </div>
              )}
            </div>

            {/* WIZARD PROGRESS BAR */}
            <div className="px-8 pt-8 pb-4">
              <div className="flex items-center justify-between relative w-full">
                <div className="absolute left-[12.5%] right-[12.5%] top-[16px] -translate-y-1/2 h-0.5 bg-slate-100 -z-10"></div>
                <div className="absolute left-[12.5%] top-[16px] -translate-y-1/2 h-0.5 bg-primary -z-10 transition-all duration-300" style={{ width: `calc(${((currentStep - 1) / 3) * 75}%)` }}></div>
                
                {[
                  { step: 1, label: "Operator Info", icon: User },
                  { step: 2, label: "Documents", icon: FileText },
                  { step: 3, label: "Drivers", icon: Users },
                  { step: 4, label: "Bank & Verify", icon: CreditCard }
                ].map((s) => (
                  <div 
                    key={s.step} 
                    onClick={() => setCurrentStep(s.step)}
                    className="flex-1 flex flex-col items-center gap-2 px-1 relative z-10 cursor-pointer group"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${currentStep >= s.step ? 'bg-primary border-primary text-white shadow-md' : 'bg-white border-border text-text-muted group-hover:border-primary group-hover:text-primary'}`}>
                      {currentStep > s.step ? <CheckCircle className="w-4 h-4" /> : s.step}
                    </div>
                    <span className={`text-[10px] sm:text-xs font-bold text-center leading-none h-6 flex items-center justify-center max-w-[110px] ${currentStep >= s.step ? 'text-primary' : 'text-text-muted group-hover:text-primary'}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 pb-10">
              <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* STEP 1: OPERATOR PROFILE & ADDRESS */}
                {currentStep === 1 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">Operator's Name *</label>
                        <input type="text" required value={vendorName} disabled={!!editingId} onChange={(e) => setVendorName(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-60" placeholder="Full legal name" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">Operator's Company Name (Optional)</label>
                        <input type="text" value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Fleet Agency Name" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">Phone Number *</label>
                        <input type="tel" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="10-digit mobile" maxLength={10}/>
                        <p className="text-[10px] text-text-muted italic leading-tight mt-1">This is the primary number we will be contacting you via text messages and whatsapp if possible.</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-text-muted">WhatsApp Number</label>
                          <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer hover:text-primary">
                            <input type="checkbox" checked={isWhatsappSame} onChange={(e) => setIsWhatsappSame(e.target.checked)} className="rounded border-border text-primary" />
                            Same as Phone
                          </label>
                        </div>
                        <input type="tel" disabled={isWhatsappSame} value={isWhatsappSame ? phoneNumber : whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50" placeholder="10-digit mobile" maxLength={10} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">Operating City *</label>
                        <select required value={city} onChange={(e) => setCity(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                          {CITIES.map(c => <option key={c.value} value={c.value}>{c.text}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">Operating Place / Hub</label>
                        <input type="text" value={operatingPlace} onChange={(e) => setOperatingPlace(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g. HITEC Hub" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted">Assigned Driver Manager *</label>
                        <select
                          value={driverManagerId || ""}
                          onChange={(e) => {
                            const id = e.target.value ? Number(e.target.value) : null;
                            setDriverManagerId(id);
                            const dm = driverManagersList.find(d => d.id === id);
                            setDriverManagerName(dm ? dm.name : "");
                          }}
                          className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
                        >
                          <option value="">Select Driver Manager for {city}...</option>
                          {filteredDriverManagers.map((dm: any) => (
                            <option key={dm.id} value={dm.id}>
                              {dm.name} ({dm.city} - {dm.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="border-t border-border pt-6 mt-6">
                      <h4 className="text-sm font-bold text-primary mb-4 flex items-center gap-2"><MapPin className="w-4 h-4" /> Operator's Office/Present Address</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-bold text-text-muted">Address Line 1 *</label>
                          <input type="text" required value={businessLine1} onChange={(e) => setBusinessLine1(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none" placeholder="Flat, House no., Building, Company" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-bold text-text-muted">Address Line 2</label>
                          <input type="text" value={businessLine2} onChange={(e) => setBusinessLine2(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none" placeholder="Area, Street, Sector, Village" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Locality / Area *</label>
                          <input type="text" required value={businessArea} onChange={(e) => setBusinessArea(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none" placeholder="e.g. Madhapur" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">City / Town *</label>
                          <input type="text" required value={businessCity} onChange={(e) => setBusinessCity(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none" placeholder="City Name" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Pincode *</label>
                          <input type="text" required pattern="[0-9]{6}" value={businessPincode} onChange={(e) => setBusinessPincode(e.target.value.replace(/\D/g, '').slice(0,6))} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none" placeholder="6-digit pincode" maxLength={6} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: KYC & DOCUMENTS */}
                {currentStep === 2 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-1 gap-8">
                      {/* PAN Section */}
                      <div className="bg-slate-50 border border-border p-6 rounded-xl flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex-1 w-full space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted">PAN Number *</label>
                            <div className="relative">
                              <input
                                type={showOperatorPan ? "text" : "password"}
                                required
                                value={operatorPan}
                                onChange={(e) => setOperatorPan(e.target.value.toUpperCase())}
                                className="w-full h-11 pl-4 pr-10 bg-white border border-border rounded-xl text-sm focus:border-primary outline-none uppercase font-mono"
                                placeholder="ABCDE1234F"
                              />
                              <button
                                type="button"
                                onClick={() => setShowOperatorPan(!showOperatorPan)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                              >
                                {showOperatorPan ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="w-full md:w-72 shrink-0">
                          {renderDocCard("operator_pan", "Upload PAN Image", operatorPanPhoto, setOperatorPanPhoto, true)}
                        </div>
                      </div>

                      {/* Aadhaar Section */}
                      <div className="bg-slate-50 border border-border p-6 rounded-xl flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex-1 w-full space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted">Aadhaar Number *</label>
                            <div className="relative">
                              <input
                                type={showOperatorAadhaar ? "text" : "password"}
                                required
                                value={operatorAadhaar}
                                onChange={(e) => setOperatorAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                className="w-full h-11 pl-4 pr-10 bg-white border border-border rounded-xl text-sm focus:border-primary outline-none font-mono"
                                placeholder="12-digit Aadhaar No."
                              />
                              <button
                                type="button"
                                onClick={() => setShowOperatorAadhaar(!showOperatorAadhaar)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                              >
                                {showOperatorAadhaar ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="w-full md:w-72 shrink-0">
                          {renderDocCard("operator_aadhaar", "Upload Aadhaar Image", operatorAadhaarPhoto, setOperatorAadhaarPhoto, true)}
                        </div>
                      </div>

                      {/* Selfie Section */}
                      <div className="bg-slate-50 border border-border p-6 rounded-xl flex flex-col items-center justify-center max-w-sm mx-auto w-full">
                        {renderDocCard("operator_selfie", "Operator Live Selfie", operatorSelfie, setOperatorSelfie)}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: DRIVERS ATTACHED */}
                {currentStep === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-between items-center bg-slate-50 p-4 border border-border rounded-xl">
                      <div>
                        <h3 className="font-sans text-sm font-bold text-primary flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          Drivers attached to this Operator ({drivers.length})
                        </h3>
                        <p className="text-xs text-text-muted mt-1">Add drivers manually or link existing profiles.</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          className="hidden sm:flex items-center gap-1.5 bg-white border border-border text-text text-xs font-bold px-4 py-2 rounded-xl hover:bg-slate-100 transition-all cursor-not-allowed opacity-60"
                          title="Feature pending API integration"
                        >
                          <Search className="h-4 w-4" /> Search Existing Driver
                        </button>
                        <button 
                          type="button" 
                          onClick={() => { resetDriverForm(); setShowDriverForm(true); }} 
                          className="flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary-hover shadow-sm transition-all active:scale-95 cursor-pointer"
                        >
                          <Plus className="h-4 w-4" /> Add Driver
                        </button>
                      </div>
                    </div>

                    {drivers.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {drivers.map((drv, index) => (
                          <div key={index} className="flex justify-between items-start p-4 bg-white border border-border rounded-xl shadow-xs relative hover:border-primary/50 transition-colors">
                            <div className="flex-1">
                              <p className="font-bold text-sm text-text">{drv.driver_name}</p>
                              <p className="text-xs text-text-muted mt-0.5">ID: <span className="font-mono font-bold text-primary">{drv.driver_id}</span> | Phone: {drv.phone_number}</p>
                              {drv.dl_number && <p className="text-xs text-text-muted mt-0.5">DL: {drv.dl_number} {drv.dl_expiry_date ? `(Exp: ${drv.dl_expiry_date})` : ""}</p>}
                            </div>
                            <div className="flex gap-1 bg-slate-50 rounded-lg p-1 border border-border/50">
                              <button type="button" onClick={() => openEditDriver(index)} className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors cursor-pointer" title="Edit Driver"><Edit className="h-4 w-4" /></button>
                              <button type="button" onClick={() => handleRemoveDriver(index)} className="p-1.5 rounded-md text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer" title="Remove Driver"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-text-dim text-xs bg-slate-50/50 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3">
                        <Users className="h-10 w-10 opacity-30 text-primary" />
                        <span className="text-sm">No drivers attached yet.</span>
                        <span>Click <strong>Add Driver</strong> to begin onboarding fleet members.</span>
                      </div>
                    )}

                    {/* DRIVER ADDER BOX (SLIDE-DOWN SUBFORM) */}
                    {showDriverForm && (
                      <div className="p-6 border border-primary/30 rounded-2xl bg-white shadow-xl space-y-6 relative mt-6">
                        <div className="absolute -top-3 left-8 w-6 h-6 bg-white border-t border-l border-primary/30 rotate-45"></div>
                        <div className="flex justify-between items-center border-b border-border pb-3 relative z-10">
                          <h4 className="font-sans text-sm font-bold text-primary">
                            {editingDriverIdx !== null ? `Edit Driver #${editingDriverIdx + 1}` : "New Driver Details"}
                          </h4>
                          <button type="button" onClick={() => { setShowDriverForm(false); resetDriverForm(); }} className="p-1.5 rounded-full bg-slate-100 text-text-muted hover:text-text hover:bg-slate-200 cursor-pointer transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Driver Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted">Driver Name *</label>
                            <input type="text" value={dName} onChange={(e) => setDName(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none" placeholder="Full Name" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted">Father's Name</label>
                            <input type="text" value={dFather} onChange={(e) => setDFather(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none" placeholder="Father's Name" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted">Phone Number *</label>
                            <input type="tel" value={dPhone} onChange={(e) => setDPhone(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none" placeholder="10-digit phone" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted">WhatsApp Number</label>
                            <input type="tel" value={dWhatsapp} onChange={(e) => setDWhatsapp(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none" placeholder="Same as phone if blank" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted">Driver ID *</label>
                            <input type="text" value={dDriverId} onChange={(e) => setDDriverId(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none" placeholder="e.g. DR-HYD-001" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted">DL Number</label>
                            <div className="relative">
                              <input
                                type={showDDlNum ? "text" : "password"}
                                value={dDlNum}
                                onChange={(e) => setDDlNum(e.target.value.toUpperCase())}
                                className="w-full h-11 pl-4 pr-10 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none font-mono"
                                placeholder="Driving Licence No."
                              />
                              <button
                                type="button"
                                onClick={() => setShowDDlNum(!showDDlNum)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                              >
                                {showDDlNum ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted">PAN Number *</label>
                            <div className="relative">
                              <input
                                type={showDPanNum ? "text" : "password"}
                                value={dPanNum}
                                onChange={(e) => setDPanNum(e.target.value.toUpperCase())}
                                className="w-full h-11 pl-4 pr-10 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none font-mono"
                                placeholder="PAN Card No."
                              />
                              <button
                                type="button"
                                onClick={() => setShowDPanNum(!showDPanNum)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                              >
                                {showDPanNum ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted">Aadhaar Number *</label>
                            <div className="relative">
                              <input
                                type={showDAadhaarNum ? "text" : "password"}
                                value={dAadhaarNum}
                                onChange={(e) => setDAadhaarNum(e.target.value)}
                                className="w-full h-11 pl-4 pr-10 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none font-mono"
                                placeholder="Aadhaar No."
                              />
                              <button
                                type="button"
                                onClick={() => setShowDAadhaarNum(!showDAadhaarNum)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                              >
                                {showDAadhaarNum ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted">Emergency Contact Name</label>
                            <input type="text" value={dEmergName} onChange={(e) => setDEmergName(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none" placeholder="Contact Person" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted">Emergency Phone</label>
                            <input type="tel" value={dEmergPhone} onChange={(e) => setDEmergPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none" placeholder="10-digit number" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted">Emergency Aadhaar No.</label>
                            <div className="relative">
                              <input
                                type={showDEmergAadhaarNum ? "text" : "password"}
                                value={dEmergAadhaarNum}
                                onChange={(e) => setDEmergAadhaarNum(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                className="w-full h-11 pl-4 pr-10 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none font-mono"
                                placeholder="12-digit Aadhaar No."
                              />
                              <button
                                type="button"
                                onClick={() => setShowDEmergAadhaarNum(!showDEmergAadhaarNum)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                              >
                                {showDEmergAadhaarNum ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Driver KYC Images */}
                        <div className="border-t border-border pt-4 relative z-10">
                          <label className="text-xs font-bold text-text-muted block mb-3">Driver KYC & Emergency Documents</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            {renderDocCard("d_selfie", "Driver Selfie", dSelfie, setDSelfie)}
                            {renderDocCard("d_dl_front", "DL Front", dDlFront, setDDlFront, true)}
                            {renderDocCard("d_pan", "PAN Card", dPanPhoto, setDPanPhoto, true)}
                            {renderDocCard("d_aadhaar", "Aadhaar Card", dAadhaarPhoto, setDAadhaarPhoto, true)}
                            {renderDocCard("d_emerg_aadhaar", "Emergency Aadhaar", dEmergAadhaarDoc, setDEmergAadhaarDoc, true)}
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-border relative z-10">
                          <button type="button" onClick={() => { setShowDriverForm(false); resetDriverForm(); }} className="px-5 py-2.5 bg-slate-100 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer transition-colors">Cancel</button>
                          <button type="button" onClick={handleAddDriver} className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover shadow-md cursor-pointer transition-colors">
                            {editingDriverIdx !== null ? "Update Driver" : "Save Driver to Fleet"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 4: BANK DETAILS & VERIFICATION */}
                {currentStep === 4 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    
                    {/* SECTION 2: OPERATOR BANK ACCOUNT */}
                    <div className="flex flex-col gap-5 border-b border-border/40 pb-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-text-muted">Account Holder Name *</label>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-primary cursor-pointer hover:underline">
                              <input type="checkbox" checked={isAccountNameSame} onChange={(e) => setIsAccountNameSame(e.target.checked)} className="rounded border-border text-primary" />
                              Same as Operator's Name
                            </label>
                          </div>
                          <input type="text" disabled={isAccountNameSame} value={isAccountNameSame ? vendorName : accountName} onChange={(e) => setAccountName(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none disabled:opacity-60" placeholder="Name on Bank Account" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Account Type *</label>
                          <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none">
                            <option value="Current">Current Account</option>
                            <option value="Savings">Savings Account</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Account Number *</label>
                          <input type="text" required value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none" placeholder="Account No" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">IFSC Code *</label>
                          <input type="text" required value={ifscCode} onChange={(e) => setIfscCode(e.target.value.toUpperCase())} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none" placeholder="IFSC Code" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-text-muted">Bank Name & Branch *</label>
                          <input type="text" required value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-border rounded-xl text-sm focus:bg-white focus:border-primary outline-none" placeholder="SBI, HDFC, ICICI..." />
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-xl">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          required 
                          checked={documentsVerified}
                          onChange={(e) => setDocumentsVerified(e.target.checked)}
                          className="mt-1 w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-600"
                        />
                        <span className="text-sm text-blue-900 font-medium leading-snug">
                          I verify that the Operator's name matches exactly across all uploaded KYC documents and bank details, and all attached drivers have been cross-verified.
                        </span>
                      </label>
                    </div>

                  </div>
                )}

                {/* FORM ACTIONS / NAVIGATION */}
                <div className="pt-6 border-t border-border flex justify-between items-center">
                  {currentStep > 1 ? (
                    <button type="button" onClick={() => setCurrentStep(prev => prev - 1)} className="px-6 py-3 border border-border rounded-xl text-sm font-bold text-text hover:bg-slate-50 transition-all cursor-pointer">
                      Back
                    </button>
                  ) : (
                    <button type="button" onClick={resetOperatorForm} className="px-6 py-3 border border-border rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-50 transition-all cursor-pointer">
                      Clear Form
                    </button>
                  )}

                  {currentStep < 4 ? (
                    <button type="button" onClick={() => setCurrentStep(prev => prev + 1)} className="px-8 py-3 bg-text text-white rounded-xl text-sm font-bold hover:bg-black transition-all cursor-pointer shadow-md">
                      Next Step
                    </button>
                  ) : (
                    <button type="submit" disabled={!documentsVerified} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-white hover:bg-primary-hover shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                      <CheckCircle className="h-5 w-5" />
                      {editingId ? "Update Operator Record" : "Submit Operator Onboarding"}
                    </button>
                  )}
                </div>

              </form>
            </div>

          </div>
        )}

        {/* REGISTRY VIEW */}
        {activeTab === "registry" && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
                <p className="text-[10px] text-text-muted font-bold tracking-wider uppercase">Total Operators</p>
                <p className="text-3xl font-extrabold text-primary mt-1">{records.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
                <p className="text-[10px] text-text-muted font-bold tracking-wider uppercase">Last 7 Days</p>
                <p className="text-3xl font-extrabold text-green mt-1">{stats.last_7_days_count}</p>
              </div>
              <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
                <p className="text-[10px] text-text-muted font-bold tracking-wider uppercase">Latest Onboarding</p>
                <p className="text-lg font-extrabold text-text mt-2 truncate">{stats.latest_onboarding || "—"}</p>
              </div>
              <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
                <p className="text-[10px] text-text-muted font-bold tracking-wider uppercase">Total Vendor Count</p>
                <p className="text-3xl font-extrabold text-amber-600 mt-1">{stats.vendor_count}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-green" />
                    Operator Onboardings Registry
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">Review and manage fleet operator agencies.</p>
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto">
                  <div className="relative flex-1 lg:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <input 
                      type="text" 
                      placeholder="Search operator name, ID..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 w-full lg:w-64 pl-9 pr-3 rounded-lg border border-border text-xs focus:border-primary outline-none"
                    />
                  </div>
                  <select
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className="h-9 px-2 rounded-lg border border-border text-xs focus:border-primary outline-none"
                  >
                    <option value="all">All Cities</option>
                    {CITIES.map(c => <option key={c.value} value={c.value}>{c.text}</option>)}
                  </select>
                  <button onClick={fetchData} className="p-2 text-text-muted hover:text-primary hover:bg-primary/5 rounded-lg border border-border bg-white transition-colors" title="Refresh">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap border-collapse">
                  <thead className="bg-slate-50 border-b border-border">
                    <tr>
                      <th className="px-5 py-3.5 font-sans text-[10px] uppercase font-bold text-text-muted">ID</th>
                      <th className="px-5 py-3.5 font-sans text-[10px] uppercase font-bold text-text-muted">Operator Name</th>
                      <th className="px-5 py-3.5 font-sans text-[10px] uppercase font-bold text-text-muted">Vendor ID</th>
                      <th className="px-5 py-3.5 font-sans text-[10px] uppercase font-bold text-text-muted">City</th>
                      <th className="px-5 py-3.5 font-sans text-[10px] uppercase font-bold text-text-muted">Phone</th>
                      <th className="px-5 py-3.5 font-sans text-[10px] uppercase font-bold text-text-muted">Rental Plan</th>
                      <th className="px-5 py-3.5 font-sans text-[10px] uppercase font-bold text-text-muted">Bank</th>
                      <th className="px-5 py-3.5 font-sans text-[10px] uppercase font-bold text-text-muted">Onboarding Date</th>
                      <th className="px-5 py-3.5 font-sans text-[10px] uppercase font-bold text-text-muted text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 text-xs font-mono text-text-dim">#{r.id}</td>
                        <td className="px-5 py-4 text-sm font-bold">{r.driver_name || r.vendor_name}</td>
                        <td className="px-5 py-4 text-xs font-mono font-bold text-primary bg-primary/5 rounded px-2">{r.vendor_id || "—"}</td>
                        <td className="px-5 py-4 text-xs font-semibold">{r.city}</td>
                        <td className="px-5 py-4 text-xs text-text-muted">{r.phone_number}</td>
                        <td className="px-5 py-4 text-xs font-bold text-text-dim">N/A</td>
                        <td className="px-5 py-4 text-xs text-text-muted">
                          {r.bank_name ? `${r.bank_name}` : "—"}
                          {(r as any).account_number ? ` (${String((r as any).account_number).slice(-4).padStart(String((r as any).account_number).length, '*')})` : ""}
                        </td>
                        <td className="px-5 py-4 text-xs text-text-muted">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => loadRecordForEdit(r.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-text-dim text-xs">
                          <div className="flex flex-col items-center gap-3">
                            <UserCheck className="h-10 w-10 opacity-30 text-primary" />
                            <span>No operator onboarding records found.</span>
                            <button
                              onClick={() => setActiveTab("form")}
                              className="mt-1 text-primary font-bold hover:underline cursor-pointer"
                            >
                              Onboard your first Operator
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Camera Capture Modal */}
      {cameraActiveField && (
        <CameraCapture 
          title={`Capture ${cameraActiveField.replace(/_/g, ' ')}`}
          onClose={() => setCameraActiveField(null)}
          onCapture={(dataUrl) => {
            if (cameraActiveField === "operator_selfie") setOperatorSelfie(dataUrl);
            if (cameraActiveField === "operator_pan") setOperatorPanPhoto(dataUrl);
            if (cameraActiveField === "operator_aadhaar") setOperatorAadhaarPhoto(dataUrl);
            if (cameraActiveField === "d_selfie") setDSelfie(dataUrl);
            if (cameraActiveField === "d_dl_front") setDDlFront(dataUrl);
            if (cameraActiveField === "d_dl_back") setDDlBack(dataUrl);
            if (cameraActiveField === "d_pan") setDPanPhoto(dataUrl);
            if (cameraActiveField === "d_aadhaar") setDAadhaarPhoto(dataUrl);
            setCameraActiveField(null);
          }}
        />
      )}
    </div>
  );
}