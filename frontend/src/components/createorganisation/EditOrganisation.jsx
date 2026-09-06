"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import BackLink from "@/components/global/BackLink";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2Icon, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { filterOversizedFiles, MAX_UPLOAD_SIZE_MB } from "@/utils/fileSize";
import useOrganisationApi from "@/api/useOrganisationApi";
import useClientManagementApi from "@/api/useClientManagementApi";
import useLocationsApi from "@/api/useLocationsApi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import SearchableSelect from "@/components/ui/searchable-select";
import ListingPageLayout from "@/components/layout/ListingPageLayout";

// Backend shape for `/clients/business/{firmId}/logo/get` isn't pinned down yet — handle
// a plain URL string, a base64/data URI string, or an object carrying url/path.
function resolveClientLogoSrc(payload) {
  if (!payload) return null;
  if (typeof payload === "string") return payload;
  return payload.url || payload.path || payload.file_url || payload.logo_url || null;
}

const MAX_LOGO_SIZE_BYTES = 800 * 1024;

const getDaysInMonth = (month) => {
  if (!month) return 31;
  const days30 = ['April', 'June', 'September', 'November'];
  if (month === 'February') return 29;
  if (days30.includes(month)) return 30;
  return 31;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Tax returns are due three months after the financial year end. This only
// pre-fills the due date whenever the year end changes — the field itself
// stays editable so an accountant can override it.
const dueDateFromFinancialYearEnd = (monthName, day) => {
  const monthIndex = MONTH_NAMES.indexOf(monthName);
  if (monthIndex < 0 || !day) return "";
  const dayNum = Number(day);
  const d = new Date(new Date().getFullYear(), monthIndex + 3, dayNum);
  // e.g. a 31st year-end landing in a 30-day month rolls over — pull it back
  // to the last valid day of the intended month.
  if (d.getDate() !== dayNum) d.setDate(0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function EditOrganisation({ firmGuid, onSuccess }) {
  const [activeTab, setActiveTab] = useState("org-info");
  const [formData, setFormData] = useState({
    // Organization Info
    organisationName: "",
    countryIso: "",
    countryName: "",
    countryCode: "",
    phoneCountryIso: "", // tracks which country's dial code is picked — separate from countryIso since e.g. CA and US share "+1"
    contactNumber: "",
    postalCode: "",
    province: "",
    city: "",
    address: "",

    // Business Info
    businessAccount: "",
    gstNumber: "",
    hstNumber: "",
    pstNumber: "",
    businessType: "",

    tax_return_occurrence: "",
    tax_return_month: "",
    tax_return_day: "",
    taxReturnsDueDate: "",
    financial_year_end_month: "",
    financial_year_end_day: "",

    payment_type: "",
    weekly_day: "",
    weekly_month: "",

    // Tax Return Closing Date
    changeDueDate: false,
    taxReturnClosingDate: "",
  });

  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [currentLogo, setCurrentLogo] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const logoInputRef = useRef(null);

  const [agreementFiles, setAgreementFiles] = useState([]);
  const [isAgreementUploading, setIsAgreementUploading] = useState(false);
  const agreementFileInputRef = useRef(null);

  const {
    editOrganisation,
    viewOrganisation,
    loading,
    error,
    viewOrganisationData,
    getTaxReturnOccurrences,
    occurrenceOptions,
  } = useOrganisationApi();
  const { uploadClientLogo, getClientLogo, deleteClientLogo, uploadAgreementDocument } = useClientManagementApi();
  const { countries, provinces, getCountries, getProvinces } = useLocationsApi();


  // Fetch organisation data on mount
  useEffect(() => {
    const fetchOrganisationData = async () => {
      if (!firmGuid) {
        toast.error("Firm GUID is required");
        setIsLoadingData(false);
        return;
      }

      setIsLoadingData(true);
      await viewOrganisation({ firmGuid });
      setIsLoadingData(false);
    };

    fetchOrganisationData();
  }, [firmGuid]);

  // `firmGuid` prop is the URL's business code (e.g. "DIN4"), not the real database
  // GUID — logo endpoints need the actual guid, same as CreateOrganisation.jsx's
  // `createdOrgGuid`. Resolve it from the fetched organisation record once available.
  const resolvedLogoFirmId =
    viewOrganisationData?.payload?.guid ||
    viewOrganisationData?.message?.guid ||
    firmGuid;

  useEffect(() => {
    let cancelled = false;

    const fetchLogo = async () => {
      const payload = await getClientLogo(resolvedLogoFirmId);
      if (cancelled) return;
      setCurrentLogo(resolveClientLogoSrc(payload));
    };

    if (!isLoadingData && resolvedLogoFirmId) {
      fetchLogo();
    }

    return () => {
      cancelled = true;
    };
  }, [resolvedLogoFirmId, isLoadingData]);

  // Helper for Month Name <-> Number conversion
  const monthMap = {
    "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
    "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12
  };

  const getMonthName = (monthNumber) => {
    if (!monthNumber) return "";
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return months[monthNumber - 1] || "";
  };

  // Populate form with fetched data
  useEffect(() => {
    if (viewOrganisationData?.payload || viewOrganisationData?.message) {
      const orgData = viewOrganisationData.payload || viewOrganisationData.message;

      const formatApiDate = (dateStr) => {
        if (!dateStr) return "";
        try {
          return new Date(dateStr).toISOString().split('T')[0];
        } catch (e) {
          return dateStr;
        }
      };

      setFormData({
        // Organisation Details
        organisationName: orgData.firm_name || "",
        countryIso: "", // resolved once the countries list loads, see effect below
        countryName: orgData.country_name || "Canada",
        countryCode: orgData.country_code || "+1",
        contactNumber: orgData.contact_mobile || "",
        postalCode: orgData.postal || "",
        province: orgData.province || "",
        city: orgData.city || "",
        address: orgData.address || "",

        // Business Details
        businessAccount: Array.isArray(orgData.business_account_details) && orgData.business_account_details.length > 0 ? orgData.business_account_details[0] : (orgData.business_account_details || ""),
        gstNumber: orgData.gst_number || "",
        hstNumber: orgData.hst_number || "",
        pstNumber: orgData.pst_number || "",
        businessType: Array.isArray(orgData.business_categories) && orgData.business_categories.length > 0 ? orgData.business_categories[0] : (orgData.business_categories || ""),

        tax_return_occurrence: orgData.tax_return_occurrence || (orgData.tax_return && orgData.tax_return.month ? "Yearly" : ""),
        tax_return_month: (orgData.tax_return && orgData.tax_return.month) ? getMonthName(Number(orgData.tax_return.month)) : (typeof orgData.tax_return_month === 'number' ? getMonthName(orgData.tax_return_month) : (orgData.tax_return_month || "")),
        tax_return_day: (orgData.tax_return && orgData.tax_return.day) ? orgData.tax_return.day : (orgData.tax_return_day || ""),
        taxReturnsDueDate: formatApiDate(orgData.tax_returns_due_date),

        financial_year_end_month: (orgData.financial_year_end && orgData.financial_year_end.month) ? getMonthName(Number(orgData.financial_year_end.month)) : (typeof orgData.financial_year_end_month === 'number' ? getMonthName(orgData.financial_year_end_month) : (orgData.financial_year_end_month || "")),
        financial_year_end_day: (orgData.financial_year_end && orgData.financial_year_end.day) ? orgData.financial_year_end.day : (orgData.financial_year_end_day || ""),

        payment_type: orgData.payment_type || "",
        weekly_day: orgData.weekly_day ? String(orgData.weekly_day) : "",
        weekly_month: orgData.weekly_month || "",

        changeDueDate: false,
        taxReturnClosingDate: "",
      });
    }
  }, [viewOrganisationData]);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleSelectChange = (field, value) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        [field]: value,
        ...(field === "businessType" ? { tax_return_occurrence: "", tax_return_month: "", tax_return_day: "" } : {}),
      };
      if (field === "financial_year_end_month" || field === "financial_year_end_day") {
        const due = dueDateFromFinancialYearEnd(next.financial_year_end_month, next.financial_year_end_day);
        if (due) next.taxReturnsDueDate = due;
      }
      return next;
    });
  };

  const handleCountryChange = (iso) => {
    const country = countries.find((c) => c.code === iso);
    setFormData((prev) => ({
      ...prev,
      countryIso: iso,
      countryName: country?.name || "",
      countryCode: country?.dial_code || prev.countryCode,
      phoneCountryIso: iso, // default the phone code to match — user can still override it below
      province: "", // province list depends on country — clear the stale selection
    }));
  };

  // Phone dial code is picked independently of the mailing-address Country
  // (e.g. an Ontario org with a US contact number) — dial codes aren't
  // unique per country (CA and US both "+1"), so this is tracked by ISO
  // code, not by the dial code string itself.
  const handlePhoneCountryChange = (iso) => {
    const country = countries.find((c) => c.code === iso);
    if (!country) return;
    setFormData((prev) => ({
      ...prev,
      phoneCountryIso: iso,
      countryCode: country.dial_code,
    }));
  };

  useEffect(() => {
    getCountries();
  }, []);

  // Resolve the saved country_name (a plain string from the backend) to an
  // ISO code once the countries list has loaded, so the Country dropdown can
  // show the right selection and the Province list can be fetched for it.
  // Only runs once (countryIso starts empty and is set here) — doesn't touch
  // the already-saved province value, unlike the interactive handleCountryChange.
  // phoneCountryIso defaults to the same country (dial codes aren't stored
  // with enough info to know which country they originally came from).
  useEffect(() => {
    if (countries.length && formData.countryName && !formData.countryIso) {
      const country = countries.find((c) => c.name === formData.countryName);
      if (country) {
        setFormData((prev) => ({ ...prev, countryIso: country.code, phoneCountryIso: country.code }));
      }
    }
  }, [countries, formData.countryName]);

  useEffect(() => {
    if (formData.countryIso) {
      getProvinces(formData.countryIso);
    }
  }, [formData.countryIso]);

  // Default-select the first province once the list loads, same as Country
  // — only when nothing's picked yet (e.g. an older record saved without
  // one), so this never overwrites an already-saved province.
  useEffect(() => {
    if (provinces.length && !formData.province) {
      setFormData((prev) => (prev.province ? prev : { ...prev, province: provinces[0].code }));
    }
  }, [provinces]);

  useEffect(() => {
    if (formData.businessType) {
      getTaxReturnOccurrences(formData.businessType);
    }
  }, [formData.businessType]);

  const calculateClosingDate = (dueDate) => {
    if (!dueDate) return "";
    const date = new Date(dueDate);
    date.setDate(date.getDate() - 15);
    return date.toISOString().split("T")[0];
  };

  const handleAgreementFile = (file) => {
    const fileItem = {
      id: `${file.name}-${file.lastModified}`,
      file,
      displayName: file.name,
      title: "",
      altText: "",
      previewUrl: URL.createObjectURL(file),
    };

    setAgreementFiles((prev) => {
      const exists = prev.some((item) => item.id === fileItem.id);
      return exists ? prev : [...prev, fileItem];
    });
  };
  const handleAgreementBrowse = (e) => {
    const { allowed: selectedFiles, error } = filterOversizedFiles(e.target.files);
    if (error) toast.error(error);

    selectedFiles.forEach(handleAgreementFile);
    e.target.value = null;
  };
  const handleAgreementPreview = (fileItem) => {
    if (fileItem?.previewUrl) {
      window.open(fileItem.previewUrl, "_blank");
    }
  };
  const handleAgreementRename = (id, value) => {
    setAgreementFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, displayName: value } : item))
    );
  };
  const handleAgreementTitleChange = (id, value) => {
    setAgreementFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title: value } : item))
    );
  };
  const handleAgreementAltTextChange = (id, value) => {
    setAgreementFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, altText: value } : item))
    );
  };
  const handleAgreementRemove = (id) => {
    setAgreementFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };
  const handleAgreementReset = () => {
    setAgreementFiles((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
    if (agreementFileInputRef.current) {
      agreementFileInputRef.current.value = "";
    }
  };
  const handleAgreementUpload = async () => {
    if (!agreementFiles.length || !resolvedLogoFirmId) return;
    setIsAgreementUploading(true);
    toast.info("Upload in progress. Please do not refresh or navigate away.");

    try {
      for (const fileItem of agreementFiles) {
        const originalFile = fileItem.file;
        const desiredName = fileItem.displayName?.trim() || originalFile.name;
        const safeName = desiredName.toLowerCase().endsWith(".pdf")
          ? desiredName
          : `${desiredName}.pdf`;
        const fileToUpload =
          safeName === originalFile.name
            ? originalFile
            : new File([originalFile], safeName, {
              type: originalFile.type,
              lastModified: originalFile.lastModified,
            });

        await uploadAgreementDocument(resolvedLogoFirmId, fileToUpload, {
          title: fileItem.title?.trim(),
          altText: fileItem.altText?.trim(),
        });
      }
      handleAgreementReset();
    } finally {
      setIsAgreementUploading(false);
    }
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = null;
    if (!file) return;

    if (!["image/jpeg", "image/jpg", "image/png", "image/gif"].includes(file.type)) {
      toast.error("Logo must be a JPG, PNG, or GIF image.");
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      toast.error("Logo must be smaller than 800Kb.");
      return;
    }

    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };
  const handleLogoReset = async () => {
    if (logoFile) {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoFile(null);
      setLogoPreview(null);
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    } else if (currentLogo) {
      if (!resolvedLogoFirmId) return;
      
      const confirmMsg = "Are you sure you want to delete the organisation logo?";
      if (!window.confirm(confirmMsg)) return;

      setIsLogoUploading(true);
      try {
        const success = await deleteClientLogo(resolvedLogoFirmId);
        if (success) {
          setCurrentLogo(null);
        }
      } finally {
        setIsLogoUploading(false);
      }
    }
  };
  const handleLogoUpload = async () => {
    if (!logoFile || !resolvedLogoFirmId) return;
    setIsLogoUploading(true);
    try {
      const result = await uploadClientLogo(resolvedLogoFirmId, logoFile);
      if (result) {
        setCurrentLogo(logoPreview);
        setLogoFile(null);
        setLogoPreview(null);
        if (logoInputRef.current) {
          logoInputRef.current.value = "";
        }
      }
    } finally {
      setIsLogoUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowSuccessAlert(false);

    if (!formData.organisationName) {
      toast.error("Please fill in Organisation Name");
      return;
    }

    const result = await editOrganisation({
      firmGuid: firmGuid,
      firm_name: formData.organisationName,
      contact_mobile: formData.contactNumber,
      province: formData.province,
      city: formData.city,
      postal: formData.postalCode,
      country_code: formData.countryCode,
      country_name: formData.countryName,
      address: formData.address,

      gst_number: formData.gstNumber,
      hst_number: formData.hstNumber,
      pst_number: formData.pstNumber,
      business_account_details: formData.businessAccount,

      tax_returns_due_date: formData.taxReturnsDueDate,
      tax_return_occurrence: formData.tax_return_occurrence,
      tax_return_month: monthMap[formData.tax_return_month] || formData.tax_return_month,
      tax_return_day: formData.tax_return_day,
      financial_year_end_month: monthMap[formData.financial_year_end_month] || formData.financial_year_end_month,
      financial_year_end_day: formData.financial_year_end_day,

      business_categories: formData.businessType,
      payment_type: formData.payment_type,
      weekly_day: formData.weekly_day,
      weekly_month: formData.weekly_month,
    });

    if (result !== null) {
      setShowSuccessAlert(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2000);
    }
  };

  const isOrgInfoValid =
    formData.organisationName &&
    formData.countryName &&
    formData.countryCode &&
    formData.contactNumber &&
    formData.postalCode &&
    formData.province &&
    formData.city &&
    formData.address;

  if (isLoadingData) {
    return (
      <ListingPageLayout title="Edit Organisation" bordered={false}>
        <Card className="w-full">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading organisation data...</span>
          </CardContent>
        </Card>
      </ListingPageLayout>
    );
  }

  return (
    <ListingPageLayout title="Edit Organisation" bordered={false}>
      <Card className="w-full">
      <CardContent>
        {showSuccessAlert && (
          <Alert className="mb-6 border-green-500 bg-green-50">
            <CheckCircle2Icon className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">
              Success! Your changes have been saved
            </AlertTitle>
            <AlertDescription className="text-green-700">
              Organisation updated successfully.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-4 bg-white">
            <TabsTrigger value="org-info">Organization Information</TabsTrigger>
            <TabsTrigger value="business-info">Business Information</TabsTrigger>
            <TabsTrigger value="logo">Agreement & Logo</TabsTrigger>
          </TabsList>

          {/* TAB 1: ORGANIZATION INFORMATION */}
          <TabsContent value="org-info">
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Organisation Name */}
                <div className="space-y-2">
                  <Label htmlFor="organisationName">
                    Organisation Legal Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="organisationName"
                    value={formData.organisationName}
                    onChange={handleChange("organisationName")}
                    placeholder="Client's Organisation Name"
                  />
              
                </div>

                {/* Contact Number */}
                <div className="space-y-2">
                  <Label htmlFor="contactNumber">Contact Number <span className="text-red-500">*</span></Label>
                  <div className="flex gap-2">
                    <div className="flex items-center justify-center w-16 h-10 border rounded-md bg-gray-100 text-sm text-gray-500">
                      +1
                    </div>
                    <Input
                      id="contactNumber"
                      value={formData.contactNumber}
                      onChange={handleChange("contactNumber")}
                      placeholder="1234567890"
                      className="flex-1"
                      type="number"
                    />
                  </div>
                </div>

                {/* Country */}
                <div className="space-y-2">
                  <Label htmlFor="countryName">Country <span className="text-red-500">*</span></Label>
                  <SearchableSelect
                    value={formData.countryIso}
                    onValueChange={handleCountryChange}
                    placeholder="Select Country"
                    searchPlaceholder="Search country..."
                    options={countries.filter((c) => c.code === 'CA').map((c) => ({ value: c.code, label: c.name, searchText: `${c.name} ${c.code}` }))}
                    disabled={true}
                  />
                </div>

                {/* Province */}
                <div className="space-y-2">
                  <Label htmlFor="province">Province <span className="text-red-500">*</span></Label>
                  <SearchableSelect
                    value={formData.province}
                    onValueChange={(value) => handleSelectChange("province", value)}
                    disabled={!formData.countryIso || provinces.length === 0}
                    placeholder={provinces.length ? "Select Province" : "Select a country first"}
                    searchPlaceholder="Search province..."
                    options={provinces.map((p) => ({ value: p.code, label: `${p.name} (${p.code})`, searchText: `${p.name} ${p.code}` }))}
                  />
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={handleChange("city")}
                    placeholder="Toronto"
                  />
                </div>

                {/* Postal Code */}
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code <span className="text-red-500">*</span></Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange("postalCode")}
                    placeholder="M5V 2T6"
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Organisation Address <span className="text-red-500">*</span></Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={handleChange("address")}
                    placeholder="123 Main St, Suite 100"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="button"
                  onClick={() => setActiveTab("business-info")}
                  disabled={!isOrgInfoValid}
                  className={!isOrgInfoValid ? "opacity-50 cursor-not-allowed" : ""}
                >
                  Next: Business Information
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: BUSINESS INFORMATION */}
          <TabsContent value="business-info">
            <form onSubmit={handleSubmit} className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="businessAccount">Business Accountant Number</Label>
                <Input
                  id="businessAccount"
                  value={formData.businessAccount}
                  onChange={handleChange("businessAccount")}
                  placeholder="123456789"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gstNumber">GST Account Number (IF any)</Label>
                  <Input
                    id="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleChange("gstNumber")}
                    placeholder="12345 6789 RT0001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hstNumber">HST Number</Label>
                  <Input
                    id="hstNumber"
                    value={formData.hstNumber}
                    onChange={handleChange("hstNumber")}
                    placeholder="12345 6789 RT0001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pstNumber">PST Number</Label>
                  <Input
                    id="pstNumber"
                    value={formData.pstNumber}
                    onChange={handleChange("pstNumber")}
                    placeholder="PST-1234-5678"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessType">Business Type <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.businessType}
                  onValueChange={(value) => handleSelectChange("businessType", value)}
                >
                  <SelectTrigger className="w-[33%]">
                    <SelectValue placeholder="Select Business Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Self Employed">Self Employed</SelectItem>
                    <SelectItem value="Corporation">Corporation</SelectItem>
                    <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                    <SelectItem value="Partnership">Partnership</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="financial_year_end_month">Financial Year End</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    value={formData.financial_year_end_month}
                    onValueChange={(value) => handleSelectChange("financial_year_end_month", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"
                      ].map((month) => (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={formData.financial_year_end_day}
                    onValueChange={(value) => handleSelectChange("financial_year_end_day", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: getDaysInMonth(formData.financial_year_end_month) }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={String(day)}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="taxReturnsDueDate">Tax Returns Due Date</Label>
                  <Input
                    id="taxReturnsDueDate"
                    type="date"
                    value={formData.taxReturnsDueDate}
                    onChange={handleChange("taxReturnsDueDate")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_return_occurrence">Sales Tax</Label>
                  <Select
                    value={formData.tax_return_occurrence}
                    onValueChange={(value) => handleSelectChange("tax_return_occurrence", value)}
                    disabled={!formData.businessType || occurrenceOptions.length === 0}
                  >
                    <SelectTrigger className="w-[33%]">
                      <SelectValue placeholder={formData.businessType ? "Select Occurrence" : "Select Business Type first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {occurrenceOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                      <SelectItem value="NA">NA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.tax_return_occurrence === "Yearly" && (
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <Label htmlFor="tax_return_month">Tax Return Date  <span className="text-red-500">*</span></Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Select
                        value={formData.tax_return_month}
                        onValueChange={(value) => handleSelectChange("tax_return_month", value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "January", "February", "March", "April", "May", "June",
                            "July", "August", "September", "October", "November", "December"
                          ].map((month) => (
                            <SelectItem key={month} value={month}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={formData.tax_return_day}
                        onValueChange={(value) => handleSelectChange("tax_return_day", value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Day" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={String(day)}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_type">Salary Payment Type</Label>
                <Select
                  value={formData.payment_type}
                  onValueChange={(value) => handleSelectChange("payment_type", value)}
                >
                  <SelectTrigger className="w-[33%]">
                    <SelectValue placeholder="Select Payment Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                    <SelectItem value="Bi-Monthly">Bi-Monthly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {["Weekly", "Bi-Weekly", "Quarterly"].includes(formData.payment_type) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Select
                      value={formData.weekly_month}
                      onValueChange={(value) => handleSelectChange("weekly_month", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "January", "February", "March", "April", "May", "June",
                          "July", "August", "September", "October", "November", "December"
                        ].map((month) => (
                          <SelectItem key={month} value={month}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Day</Label>
                    <Select
                      value={formData.weekly_day}
                      onValueChange={(value) => handleSelectChange("weekly_day", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Day" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: getDaysInMonth(formData.weekly_month) }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={String(day)}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {error && <div className="text-red-500 text-sm">{error}</div>}

              <div className="flex items-center justify-between pt-4">
                <BackLink onClick={() => setActiveTab("org-info")} />
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !formData.businessType ||
                    (formData.tax_return_occurrence === "Yearly" && (!formData.tax_return_month || !formData.tax_return_day))
                  }
                  className={
                    loading ||
                      !formData.businessType ||
                      (formData.tax_return_occurrence === "Yearly" && (!formData.tax_return_month || !formData.tax_return_day))
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }
                >
                  {loading ? "Updating..." : "Update Organisation"}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* TAB 3: AGREEMENT & LOGO */}
          <TabsContent value="logo">
            <div className="space-y-4 py-4">
              <Label htmlFor="editClientAgreement">Upload Client Document</Label>

              <div className="flex items-center gap-3">
                <Input
                  ref={agreementFileInputRef}
                  id="editClientAgreement"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleAgreementBrowse}
                  multiple
                  disabled={isAgreementUploading}
                />

                <Button
                  type="button"
                  onClick={() => agreementFileInputRef.current?.click()}
                  disabled={isAgreementUploading}
                >
                  Import Document
                </Button>
              </div>

              <p className="text-xs text-gray-500">
                Allowed: pdf. Max size: {MAX_UPLOAD_SIZE_MB}MB
              </p>
            </div>

            {agreementFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <Label>Uploaded Documents</Label>
                <div className="space-y-2">
                  {agreementFiles.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center"
                    >
                      <Input
                        value={item.displayName}
                        readOnly
                        className="md:flex-1"
                        placeholder="File name"
                      />
                      <Input
                        value={item.title}
                        onChange={(e) => handleAgreementTitleChange(item.id, e.target.value)}
                        disabled={isAgreementUploading}
                        className="md:flex-1"
                        placeholder="Document title"
                      />
                      <Input
                        value={item.altText}
                        onChange={(e) => handleAgreementAltTextChange(item.id, e.target.value)}
                        disabled={isAgreementUploading}
                        className="md:flex-1"
                        placeholder="Alt text"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleAgreementPreview(item)}
                        >
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleAgreementRemove(item.id)}
                          disabled={isAgreementUploading}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-col items-start gap-3">
              <Button
                onClick={handleAgreementUpload}
                disabled={agreementFiles.length === 0 || isAgreementUploading}
                className="w-auto"
              >
                {isAgreementUploading ? "Uploading..." : "Upload"}
              </Button>
            </div>

            <div className="mt-8 space-y-4 border-t pt-6">
              <Label htmlFor="editClientLogo">Logo</Label>

              <div className="flex items-center gap-4">
                {(logoPreview || currentLogo) && (
                  <img
                    src={logoPreview || currentLogo}
                    alt="Logo preview"
                    className="h-16 w-16 rounded-md border object-contain"
                  />
                )}

                <Input
                  ref={logoInputRef}
                  id="editClientLogo"
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif"
                  className="hidden"
                  onChange={handleLogoSelect}
                  disabled={isLogoUploading}
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isLogoUploading}
                >
                  Choose Logo
                </Button>

                <Button
                  type="button"
                  onClick={handleLogoUpload}
                  disabled={!logoFile || isLogoUploading}
                >
                  {isLogoUploading ? "Uploading..." : "Upload New Logo"}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleLogoReset}
                  disabled={(!logoFile && !currentLogo) || isLogoUploading}
                >
                  Reset
                </Button>
              </div>

              <p className="text-xs text-gray-500">Allowed: jpg, jpeg, png, gif. Max size 800Kb.</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      </Card>
    </ListingPageLayout>
  );
}
