"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import BackLink from "@/components/global/BackLink";
import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2Icon } from "lucide-react";
import { toast } from "react-toastify";
import { filterOversizedFiles, MAX_UPLOAD_SIZE_MB } from "@/utils/fileSize";
import useOrganisationApi from "@/api/useOrganisationApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import SearchableSelect from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import InviteAdmin from "../clientmanagement/InviteAdmin";
import AssignAccountant from "./AssignAccountant";
import WizardSteps from "./WizardSteps";
import useClientManagementApi from "@/api/useClientManagementApi";
import useLocationsApi from "@/api/useLocationsApi";
import { guessCountryFromTimezone } from "@/utils/guessCountry";
import { useRouter, useSearchParams } from "next/navigation";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import { ROUTES } from "@/config/routes";

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

export default function CreateOrganisation({ onSuccess }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Resuming an existing draft org (e.g. from the "Continue Setup" action on
  // the All Clients table) skips straight to Assign Accountant — org/business
  // info are already saved, and that's the one step that actually matters
  // for getting a draft org published (see Organizations\Firms::assignRole()).
  const resumeGuid = searchParams.get("firmId");
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState(() => (resumeGuid ? "assign-accountant" : "org-info"));
  const [createdOrgGuid, setCreatedOrgGuid] = useState(() => resumeGuid || null);
  const [canAccessBusinessTab, setCanAccessBusinessTab] = useState(false);
  const [accountantAssigned, setAccountantAssigned] = useState(false);
  const [formData, setFormData] = useState(() => {
    const defaultCountryIso = "CA";
    return {
      // Organization Info
      organisationName: "",
      countryIso: defaultCountryIso,
      countryName: defaultCountryIso === "CA" ? "Canada" : "",
      countryCode: defaultCountryIso === "CA" ? "+1" : "",
      phoneCountryIso: defaultCountryIso, // tracks which country's dial code is picked — separate from countryIso since e.g. CA and US share "+1"
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

      businessCategories: "", // Kept from original, though not explicitly in new design images, might be useful
    };
  });

  const [clientAgreementFile, setClientAgreementFile] = useState(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const logoInputRef = useRef(null);
  const { createOrganisation, loading, error, getTaxReturnOccurrences, occurrenceOptions, viewOrganisation, viewOrganisationData } = useOrganisationApi();
  const { uploadAgreementDocument, uploadClientLogo } = useClientManagementApi()
  const { countries, provinces, getCountries, getProvinces } = useLocationsApi();

  // Resuming: fetch the existing org's name for the "continuing setup for…" line.
  useEffect(() => {
    if (resumeGuid) {
      viewOrganisation({ firmGuid: resumeGuid });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeGuid]);
  const resumeFirmName = viewOrganisationData?.payload?.firm_name;
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

  // Once the country list loads, resolve the timezone-guessed ISO code
  // (formData.countryIso) into a display name/dial code if that didn't
  // already happen synchronously at init (only the "CA" guess is known
  // up front, everything else needs the fetched list).
  useEffect(() => {
    if (countries.length && formData.countryIso && !formData.countryName) {
      const country = countries.find((c) => c.code === formData.countryIso);
      if (country) {
        setFormData((prev) => ({ ...prev, countryName: country.name, countryCode: country.dial_code }));
      }
    }
  }, [countries]);

  useEffect(() => {
    if (formData.countryIso) {
      getProvinces(formData.countryIso);
    }
  }, [formData.countryIso]);

  // Default-select the first province once the list loads, same as Country
  // defaults to Canada — only when nothing's picked yet, so this never
  // overwrites a province the user already chose.
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
  const handleBrowse = (e) => {
    const { allowed: selectedFiles, error } = filterOversizedFiles(e.target.files);
    if (error) toast.error(error);
    if (!selectedFiles.length) {
      e.target.value = null;
      return;
    }

    selectedFiles.forEach(handleFile);

    // allow re-upload of same file(s)
    e.target.value = null;
  };

  const handleCheckboxChange = (field, checked) => {
    setFormData((prev) => ({
      ...prev,
      [field]: checked,
    }));
  }
  const formatDateWithSuffix = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const day = date.getDate();

    const getDaySuffix = (day) => {
      if (day > 3 && day < 21) return "th";
      switch (day % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
      }
    };

    const suffix = getDaySuffix(day);
    const month = date.toLocaleString("en-US", { month: "long" });

    return `${day}${suffix} ${month}`;
  };
  const handleNextTab = (nextTab) => {
    if (nextTab === "business-info" && !isOrgInfoValid) return;

    setCanAccessBusinessTab(true); // unlock tab
    setActiveTab(nextTab);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowSuccessAlert(false);

    // Basic Validation for Org Info
    if (
      !formData.organisationName ||
      !formData.countryName ||
      !formData.countryCode ||
      !formData.contactNumber ||
      !formData.postalCode ||
      !formData.province ||
      !formData.city ||
      !formData.address
    ) {
      toast.error("Please fill in all mandatory fields in Organization Information marked with *");
      setActiveTab("org-info");
      return;
    }

    // Helper for Month Name -> Number conversion
    const monthMap = {
      "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
      "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12
    };

    const guid = await createOrganisation({
      firm_name: formData.organisationName,
      contact_mobile: formData.contactNumber,
      province: formData.province,
      city: formData.city,
      postal: formData.postalCode,
      country_code: formData.countryCode,
      country_name: formData.countryName,
      address: formData.address,

      business_account_details: formData.businessAccount,
      gst_number: formData.gstNumber,
      hst_number: formData.hstNumber,
      pst_number: formData.pstNumber,

      tax_returns_due_date: formData.taxReturnsDueDate,
      tax_return_occurrence: formData.tax_return_occurrence,
      // Convert to number
      tax_return_month: monthMap[formData.tax_return_month] || formData.tax_return_month,
      tax_return_day: formData.tax_return_day,
      business_categories: formData.businessType || formData.businessCategories,
      client_agreement: clientAgreementFile,
      // Convert to number
      financial_year_end_month: monthMap[formData.financial_year_end_month] || formData.financial_year_end_month,
      financial_year_end_day: formData.financial_year_end_day,
      payment_type: formData.payment_type,
      weekly_day: formData.weekly_day,
      weekly_month: formData.weekly_month,
    });

    if (guid) {
      setCreatedOrgGuid(guid);
      setShowSuccessAlert(true);
      toast.success("Organisation Created! You can add Agreement.");
      setActiveTab("agreement-upload");


      if (onSuccess) {

      }
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
  const calculateClosingDate = (dueDate) => {
    if (!dueDate) return "";

    const date = new Date(dueDate);
    date.setDate(date.getDate() - 15);

    return date.toISOString().split("T")[0]; // yyyy-mm-dd
  };
  const handleUpload = async () => {
    setIsUploading(true);
    toast.info("Upload in progress. Please do not refresh or navigate away.");

    try {
      for (const fileItem of files) {
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

        await uploadAgreementDocument(createdOrgGuid, fileToUpload, {
          title: fileItem.title?.trim(),
          altText: fileItem.altText?.trim(),
        });
      }
      toast.success("Files uploaded successfully!");
    } catch (error) {
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };
  const handleReset = () => {
    setFiles((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFile = (file) => {
    const fileItem = {
      id: `${file.name}-${file.lastModified}`,
      file,
      displayName: file.name,
      title: "",
      altText: "",
      progress: 0,
      status: "Inprogress",
      previewUrl: URL.createObjectURL(file), // 👈 important
    };

    setFiles((prev) => {
      const exists = prev.some((item) => item.id === fileItem.id);
      return exists ? prev : [...prev, fileItem];
    });
  };
  const handlePreview = (fileItem) => {
    if (fileItem?.previewUrl) {
      window.open(fileItem.previewUrl, "_blank");
    }
  };
  const handleRename = (id, value) => {
    setFiles((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, displayName: value } : item
      )
    );
  };
  const handleTitleChange = (id, value) => {
    setFiles((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, title: value } : item
      )
    );
  };
  const handleAltTextChange = (id, value) => {
    setFiles((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, altText: value } : item
      )
    );
  };
  const handleRemove = (id) => {
    setFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };
  const MAX_LOGO_SIZE_BYTES = 800 * 1024;
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
  const handleLogoReset = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };
  const handleLogoUpload = async () => {
    if (!logoFile || !createdOrgGuid) return;
    setIsLogoUploading(true);
    try {
      await uploadClientLogo(createdOrgGuid, logoFile);
    } finally {
      setIsLogoUploading(false);
    }
  };
  const handleDueDateChange = (e) => {
    const dueDate = e.target.value;

    setFormData((prev) => ({
      ...prev,
      taxReturnsDueDate: dueDate,
      taxReturnClosingDate: calculateClosingDate(dueDate),
    }));
  };
  const handleNextChange = () => {
    setActiveTab('client-admin')
  }
  const wizardSteps = [
    { id: "org-info", label: "Organization Information", disabled: !!createdOrgGuid },
    { id: "business-info", label: "Business Information", disabled: !!createdOrgGuid || !canAccessBusinessTab || !isOrgInfoValid },
    { id: "agreement-upload", label: "Agreement Upload", disabled: !createdOrgGuid },
    { id: "client-admin", label: "Client Admin", disabled: !createdOrgGuid },
    { id: "assign-accountant", label: "Assign Accountant", disabled: !createdOrgGuid },
  ];

  const titleNode = (
    <span className="flex items-center gap-3">
      <span>
        {resumeGuid
          ? `Continue Setup${resumeFirmName ? `: ${resumeFirmName}` : ""}`
          : createdOrgGuid ? "Create Organisation - Completed" : "Create Organisation"}
      </span>
      {createdOrgGuid && !accountantAssigned && (
        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
          Draft — needs an accountant assigned
        </Badge>
      )}
    </span>
  );

  return (
    <ListingPageLayout
      title={titleNode}
      subtitle="Enter organization and business details to set up a new account."
      bordered={false}
    >
      <Card className="w-full">
      <CardContent>
        {showSuccessAlert && (
          <Alert className="mb-6 border-green-500 bg-green-50">
            <CheckCircle2Icon className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">
              Success! Organisation created.
            </AlertTitle>
            {/* <AlertDescription className="text-green-700">
              Please proceed to the Client Admin tab to invite the first administrator.
            </AlertDescription> */}
          </Alert>
        )}

        <WizardSteps steps={wizardSteps} activeStep={activeTab} onStepChange={setActiveTab} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-8">
          <TabsList className="hidden">
            <TabsTrigger value="org-info" disabled={!!createdOrgGuid}>Organization Information</TabsTrigger>
            <TabsTrigger value="business-info" disabled={!!createdOrgGuid || !canAccessBusinessTab | !isOrgInfoValid}>Business Information</TabsTrigger>
            <TabsTrigger value="agreement-upload" disabled={!createdOrgGuid}>Agreement Upload</TabsTrigger>
            <TabsTrigger value="client-admin" disabled={!createdOrgGuid}>Client Admin</TabsTrigger>
            <TabsTrigger value="assign-accountant" disabled={!createdOrgGuid}>Assign Accountant</TabsTrigger>
          </TabsList>

          {/* TAB 1: ORGANIZATION INFORMATION */}
          <TabsContent value="org-info">
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      type='number'
                    />
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 pt-2">
                  <p className="text-sm font-medium text-muted-foreground">Organisation Address</p>
                </div>

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

                <div className="space-y-2">
                  <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={handleChange("city")}
                    placeholder="Toronto"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code <span className="text-red-500">*</span></Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange("postalCode")}
                    placeholder="M5V 2T6"
                  />
                </div>

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
                  onClick={() => handleNextTab("business-info")}
                  disabled={!isOrgInfoValid}
                  className={!isOrgInfoValid ? "opacity-50 cursor-not-allowed" : ""}
                >
                  Next: Business Information
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: BUSINESS INFORMATION */}
          <TabsContent value="agreement-upload">
            <div className="space-y-4 mt-4">
              <Label htmlFor="clientAgreement">Upload Client Document</Label>

              <div className="flex items-center gap-3">
                {/* Hidden file input */}
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleBrowse}
                  multiple
                  disabled={isUploading}
                />

                {/* Upload Document */}
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  Import Document
                </Button>

                {/* Reset */}
                {/* <Button
                  type="button"
                  variant="secondary"
                  onClick={handleReset}
                  disabled={files.length === 0 || isUploading}
                >
                  Reset
                </Button> */}

              </div>

              <p className="text-xs text-gray-500">
                Allowed: pdf. Max size: {MAX_UPLOAD_SIZE_MB}MB
              </p>
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <Label>Uploaded Documents</Label>
                <div className="space-y-2">
                  {files.map((item) => (
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
                        onChange={(e) => handleTitleChange(item.id, e.target.value)}
                        disabled={isUploading}
                        className="md:flex-1"
                        placeholder="Document title"
                      />
                      <Input
                        value={item.altText}
                        onChange={(e) => handleAltTextChange(item.id, e.target.value)}
                        disabled={isUploading}
                        className="md:flex-1"
                        placeholder="Alt text"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handlePreview(item)}
                        >
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleRemove(item.id)}
                          disabled={isUploading}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* <p className="text-xs text-gray-500">
                  You can rename documents before uploading. Names will be saved with .pdf extension.
                </p> */}
              </div>
            )}

            {/* Upload action */}
            <div className="mt-4 flex flex-col items-start gap-3">
              <Button
                onClick={handleUpload}
                disabled={files.length === 0 || isUploading}
                className="w-auto"
              >
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
            </div>

            {/* Logo */}
            <div className="mt-8 space-y-4 border-t pt-6">
              <Label htmlFor="clientLogo">Logo</Label>

              <div className="flex items-center gap-4">
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-16 w-16 rounded-md border object-contain"
                  />
                )}

                <Input
                  ref={logoInputRef}
                  id="clientLogo"
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
                  disabled={!logoFile || isLogoUploading}
                >
                  Reset
                </Button>
              </div>

              <p className="text-xs text-gray-500">Allowed: jpg, jpeg, png, gif. Max size 800Kb.</p>
            </div>

            <div className="mt-6 flex flex-col items-start gap-3">
              <Button
                onClick={handleNextChange}
                className="w-auto"
              >
                Next
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="business-info">
            <form onSubmit={handleSubmit} className="space-y-6 py-4">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Registration Numbers</h3>
                <div className="space-y-6">
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
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Tax Filing</h3>
              <div className="space-y-2">
                <Label htmlFor="businessType">Business Type <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.businessType}
                  onValueChange={(value) => handleSelectChange("businessType", value)}
                >
                  <SelectTrigger>
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
                    onChange={handleDueDateChange}
                  />
                  {formData.taxReturnClosingDate && (
                    <p className="text-xs text-gray-500">
                      Closing date: {formData.taxReturnClosingDate}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_return_occurrence">GST/HST Remittance </Label>
                  <Select
                    value={formData.tax_return_occurrence}
                    onValueChange={(value) => handleSelectChange("tax_return_occurrence", value)}
                    disabled={!formData.businessType || occurrenceOptions.length === 0}
                  >
                    <SelectTrigger>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">  <Select
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
                        <SelectTrigger>
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

                      <div className="space-y-2">


                      </div>
                    </div>

                  </div>
                )}

                {/* 
              <div className="space-y-2">
                <Label htmlFor="clientAgreement">Upload Client Agreement</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="clientAgreement"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setClientAgreementFile(e.target.files?.[0])}
                    className="cursor-pointer flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500">Allowed: pdf, doc, docx</p>
              </div> */}

              </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Payroll</h3>
              <div className="space-y-2">
                <Label htmlFor="payment_type">Salary Payment Type</Label>
                <Select
                  value={formData.payment_type}
                  onValueChange={(value) => handleSelectChange("payment_type", value)}
                >
                  <SelectTrigger>
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
                      <SelectTrigger>
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
                      <SelectTrigger>
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
              </div>

              {error && <div className="text-red-500 text-sm">{error}</div>}

              <div className="flex flex-col items-end pt-4">
                <div className="flex items-center justify-between w-full">
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
                    {loading ? "Saving..." : "Save Organisation"}
                  </Button>
                </div>
                {/* {(!formData.businessType || (formData.tax_return_occurrence === "Yearly" && (!formData.tax_return_month || !formData.tax_return_year))) && (
                  <p className="text-sm text-red-500 mt-2">
                    Please fill in {(!formData.businessType ? "Business Type" : "")} {(!formData.businessType && (formData.tax_return_occurrence === "Yearly" && (!formData.tax_return_month || !formData.tax_return_year))) ? "and " : ""} {(formData.tax_return_occurrence === "Yearly" && (!formData.tax_return_month || !formData.tax_return_year)) ? "Tax Return Date" : ""} to proceed.
                  </p>
                )} */}
              </div>
            </form>
          </TabsContent>
          {/* TAB 3: CLIENT ADMIN */}
          <TabsContent value="client-admin">
            <div className="py-4">
              {createdOrgGuid ? (
                <InviteAdmin
                  organisationGuid={createdOrgGuid}
                  onSuccess={() => {
                    if (onSuccess) onSuccess(createdOrgGuid);
                    setActiveTab("assign-accountant");
                  }}
                />
              ) : (
                <div className="text-center py-10 text-gray-500">
                  Please create the organisation first to invite an admin.
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 5: ASSIGN ACCOUNTANT */}
          <TabsContent value="assign-accountant">
            <div className="py-4 space-y-4">
              {createdOrgGuid ? (
                <>
                  <AssignAccountant
                    firmGuid={createdOrgGuid}
                    onSuccess={() => {
                      setAccountantAssigned(true);
                      toast.success("Organisation setup complete!");
                    }}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={() => router.push(ROUTES.dashboard.root)}
                      disabled={!accountantAssigned}
                      title={!accountantAssigned ? "Assign an accountant to finish setting up this organisation" : undefined}
                    >
                      Finish
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  Please create the organisation first to assign an accountant.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      </Card>
    </ListingPageLayout>
  );
}
