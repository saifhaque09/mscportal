"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "react-toastify";
import {
    MapPin,
    Calendar,
    Mail,
    Pencil,
    Camera,
    Trash2,
    User as UserIcon,
} from "lucide-react";

import useUserApi from "@/api/useUserApi";
import { ROUTES } from "@/config/routes";
import UserActivityLog from "@/components/user/UserActivityLog";
import BackLink from "@/components/global/BackLink";
import { PageLoader } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useRouter, useSearchParams } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import useTaxfilerApi from "@/api/useTaxfilerApi";
import { cn } from "@/lib/utils";
import ListingPageLayout from "@/components/layout/ListingPageLayout";

const TAX_FILER_CATEGORIES = [
    {
        key: "resident",
        title: "Resident",
        description: "Lives in Canada",
    },
    {
        key: "non_resident",
        title: "Non-Resident",
        description: "Lives outside Canada; files only on Canadian income.",
    },
    {
        key: "newcomer",
        title: "Newcomer",
        description: "Recently moved to Canada; first-year residency rules apply",
    },
    {
        key: "student",
        title: "Student",
        description: "Canadian or international student; may claim tuition and education amounts",
    },
    {
        key: "self_employed",
        title: "Self-Employed",
        description: "Works for self; must report business income and expenses.",
    },
    {
        key: "senior",
        title: "Senior",
        description: "Age 65+; may claim pension income and age credit.",
    },
    {
        key: "deceased_taxpayer",
        title: "Deceased Taxpayer",
        description: "Final return handled by legal representative or executor",
    },
    {
        key: "indigenous_person",
        title: "Indigenous Person",
        description: "May have tax-exempt income under specific conditions (e.g., work on reserve)",
    },
    {
        key: "investor",
        title: "Investor",
        description: "Earns investment income such as dividends, interest, or capital gains.",
    },
    {
        key: "part_year_resident",
        title: "Part-Year Resident",
        description: "Lived in Canada for part of the year; partial residency rules apply.",
    },
    {
        key: "quebec",
        title: "Quebec",
        description: "For Quebec residents (provincial equivalents)",
    },
    {
        key: "tradesperson_professional",
        title: "Tradesperson and Professional",
        description: "For tradespersons",
    },
    {
        key: "northern_resident",
        title: "Northern resident",
        description: "Northern Residents Deductions",
    },
    {
        key: "disability_widow",
        title: "Disability/ Widow",
        description: "--",
    },
    {
        key: "profession_union",
        title: "Profession or Union",
        description: "--",
    },
];
// Backend shape for `/users/profile-image/get` isn't fully pinned down yet — handle
// a plain URL string, a base64/data URI string, or an object carrying url/path.
function resolveProfileImageSrc(payload) {
    if (!payload) return null;
    if (typeof payload === "string") return payload;
    return payload.url || payload.path || payload.file_url || payload.profile_image_url || null;
}

// Digit grouping per selected Country Code; the stored form value always stays raw digits.
const PHONE_FORMAT_BY_COUNTRY_CODE = {
    "+1": { digits: 10, groups: [3, 3, 4] }, // Canada (NANP)
    "+1-us": { digits: 10, groups: [3, 3, 4] }, // USA (NANP)
    "+61": { digits: 9, groups: [3, 3, 3] }, // Australia
};
const DEFAULT_PHONE_FORMAT = { digits: 10, groups: [3, 3, 4] };

function getPhoneFormat(countryCode) {
    return PHONE_FORMAT_BY_COUNTRY_CODE[countryCode] || DEFAULT_PHONE_FORMAT;
}

function formatPhoneNumber(value, countryCode) {
    const { digits, groups } = getPhoneFormat(countryCode);
    const raw = String(value ?? "").replace(/\D/g, "").slice(0, digits);
    const parts = [];
    let cursor = 0;
    for (const size of groups) {
        parts.push(raw.slice(cursor, cursor + size));
        cursor += size;
    }
    return parts.filter(Boolean).join(" ");
}

// e.g. "+1-us" -> "+1"; used for the "(+1)" display prefix, separate from the stored country_code value.
function getDisplayCountryPrefix(countryCode) {
    const match = String(countryCode ?? "").match(/^\+\d+/);
    return match ? match[0] : "";
}

// Renders "(+1) 742 159 8456": the country-code prefix is a fixed decoration, not part of the
// editable text, so parsing the raw digits back out never has to worry about stripping it.
function PhoneInput({ value, onChange, countryCode, placeholder, hasError }) {
    const prefix = getDisplayCountryPrefix(countryCode);
    const format = getPhoneFormat(countryCode);
    return (
        <div
            className={cn(
                "flex h-9 w-full items-center gap-2 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] focus-within:ring-[3px] md:text-sm",
                hasError
                    ? "border-destructive ring-destructive/20"
                    : "border-input focus-within:border-ring focus-within:ring-ring/50"
            )}
        >
            {prefix && <span className="shrink-0 text-muted-foreground">({prefix})</span>}
            <input
                className="w-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                value={formatPhoneNumber(value, countryCode)}
                onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, format.digits))}
                placeholder={placeholder}
                inputMode="numeric"
            />
        </div>
    );
}

// Tabs are shown for accountant, client, and staff (role "employee") users; taxfiler
// users never reach this sidebar since they render through the earlier taxfiler branch.
const EXTRA_TABS_ROLES = ["accountant", "client", "employee"];

// Tier-1 (system) roles an Admin may switch a user between on this page — always
// within the same group. Firm-management roles never cross into client-facing
// roles or vice versa; tier-2 org-scoped roles (Lead Accountant, Data Loader,
// etc.) are a separate concept handled by the organization member-assignment
// pages, not this dropdown.
const ROLE_GROUPS = [
    ["Admin", "Accountant", "Staff"],
    ["Client", "Employee"],
];

function roleGroupFor(roleName) {
    return ROLE_GROUPS.find((group) => group.includes(roleName)) ?? (roleName ? [roleName] : []);
}

const COUNTRY_OPTIONS = ["Canada"];

const TIME_ZONE_OPTIONS = {
    Canada: [
        { value: "America/Vancouver", label: "Pacific (Vancouver, BC)" },
        { value: "America/Edmonton", label: "Mountain (Edmonton, AB)" },
        { value: "America/Winnipeg", label: "Central (Winnipeg, MB)" },
        { value: "America/Toronto", label: "Eastern (Toronto, ON)" },
        { value: "America/Halifax", label: "Atlantic (Halifax, NS)" },
        { value: "America/St_Johns", label: "Newfoundland (St. John's, NL)" },
    ],
    USA: [
        { value: "America/Los_Angeles", label: "Pacific (Los Angeles, CA)" },
        { value: "America/Denver", label: "Mountain (Denver, CO)" },
        { value: "America/Chicago", label: "Central (Chicago, IL)" },
        { value: "America/New_York", label: "Eastern (New York, NY)" },
        { value: "America/Anchorage", label: "Alaska (Anchorage, AK)" },
        { value: "Pacific/Honolulu", label: "Hawaii (Honolulu, HI)" },
    ],
};

export default function UserProfile() {
    const {
        viewUser,
        editUser,
        updatePassword,
        sendResetLink,
        uploadProfileImage,
        removeProfileImage,
        getProfileImage,
        loading: apiLoading,
    } = useUserApi();
    const { getAllCategories, categoryData, saveUserCategory, updateCategory, getUserCategories, userCategoryData, getSelectedCategories,
        selectedCategory } = useTaxfilerApi()
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("profile");
    const [userRole, setUserRole] = useState("");
    const [loggedInRole, setLoggedInRole] = useState("");
    const [taxFilerStep, setTaxFilerStep] = useState(1); // 1: Personal Details, 2: Tax Categories
    const [taxFilerSection, setTaxFilerSection] = useState("basic"); // basic | bank
    const [incomeInfoEnabled, setIncomeInfoEnabled] = useState(false);
    const [selectedTaxCategories, setSelectedTaxCategories] = useState([]);
    const [selectedTaxYear, setSelectedTaxYear] = useState(String(new Date().getFullYear()));
    // SIN is returned masked (e.g. "******789") by the backend, never raw — display-only,
    // never bound to the editable form so it can never be round-tripped back on save.
    const [sinMasked, setSinMasked] = useState("");
    const [isEditingSin, setIsEditingSin] = useState(false);
    const [profileImageUrl, setProfileImageUrl] = useState(null);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const hasHydratedTaxCategories = useRef(false);
    const searchParams = useSearchParams();
    const taxStepParam = searchParams.get("taxStep") || searchParams.get("step");
    const loggedInGuid = typeof window !== "undefined" ? localStorage.getItem("userGuid") : null;
    const userGuid = searchParams.get("userGuid") || loggedInGuid;
    // True when this page is showing the logged-in user's own profile, as opposed
    // to an Admin/Accountant viewing someone else's via ?userGuid=. Email and role
    // are only ever editable in the latter case, and only for Admin.
    const isSelf = userGuid === loggedInGuid;
    const incompleteFlag = searchParams.get("incomplete");
    const missingParam = searchParams.get("missing");
    const hasShownIncomplete = useRef(false);
    // Profile Form
    const { register, handleSubmit, setValue, control, watch, formState: { errors } } = useForm();

    // Password Form
    const {
        register: registerPassword,
        handleSubmit: handleSubmitPassword,
        reset: resetPasswordForm,
        formState: { errors: passwordErrors }
    } = useForm();

    useEffect(() => {
        fetchUserData();
        // Intentionally omit `fetchUserData` from deps to avoid refiring due to function identity changes.
        // `userGuid` itself must stay a dep — otherwise navigating from one user's profile to
        // another's (e.g. clicking a different row in AllUsers/AccountantUser) reuses this mounted
        // component and the URL changes, but the previously-loaded user's data stays on screen.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userGuid]);
    useEffect(() => {
        getSelectedCategories()
    }, [])
    useEffect(() => {
        if (!userGuid) return;
        let cancelled = false;
        (async () => {
            const payload = await getProfileImage(userGuid);
            if (cancelled) return;
            setProfileImageUrl(resolveProfileImageSrc(payload));
        })();
        return () => {
            cancelled = true;
        };
        // Intentionally omit `getProfileImage` from deps to avoid refiring due to function identity changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userGuid]);
    console.log(selectedCategory,)
    useEffect(() => {
        setLoggedInRole(
            typeof window !== "undefined" ? (localStorage.getItem("userRole") || "") : ""
        );
    }, []);

    useEffect(() => {
        if (userRole === "taxfiler" && loggedInRole !== "taxfiler") {
            // Accountant viewing a taxfiler profile: keep them on personal details only.
            setTaxFilerStep(1);
            return;
        }
        if (userRole === "taxfiler") return;
        if (!taxStepParam) return;
        const normalized = String(taxStepParam).toLowerCase();
        if (normalized === "2" || normalized === "tax" || normalized === "tax-categories" || normalized === "categories") {
            setTaxFilerStep(2);
        }
    }, [taxStepParam, userRole, loggedInRole]);

    useEffect(() => {
        if (incompleteFlag && !hasShownIncomplete.current) {
            const missingText = missingParam ? ` Missing: ${missingParam}.` : "";
            toast.warning(
                `Please complete your profile details before proceeding further.${missingText}`
            );
            hasShownIncomplete.current = true;
        }
    }, [incompleteFlag, missingParam]);
    useEffect(() => {
        getAllCategories();
        // Intentionally omit `getAllCategories` from deps to avoid refiring due to function identity changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (userRole !== "taxfiler") return;
        if (loggedInRole !== "taxfiler") return;
        if (taxFilerStep !== 2) return;
        getUserCategories(undefined, undefined, undefined, selectedTaxYear);
        // Intentionally omit `getUserCategories` from deps to avoid re-calling on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taxFilerStep, userRole, loggedInRole, selectedTaxYear]);

    useEffect(() => {
        if (userRole !== "taxfiler") return;
        if (loggedInRole !== "taxfiler") return;
        if (taxFilerStep !== 2) return;
        if (hasHydratedTaxCategories.current) return;
        if (!Array.isArray(userCategoryData) || userCategoryData.length === 0) return;

        setSelectedTaxCategories(selectedCategory.map((c) => String(c.tax_category_id
        )));
        hasHydratedTaxCategories.current = true;
    }, [taxFilerStep, userCategoryData, userRole, loggedInRole, selectedCategory]);

    useEffect(() => {
        hasHydratedTaxCategories.current = false;
        setSelectedTaxCategories([]);
    }, [userGuid]);

    useEffect(() => {
        hasHydratedTaxCategories.current = false;
        setSelectedTaxCategories([]);
    }, [selectedTaxYear]);

    const fetchUserData = async () => {
        setLoading(true);

        if (!userGuid) {
            toast.error("User GUID not found");
            setLoading(false);
            return;
        }

        const userData = await viewUser(userGuid);
        console.log("userData", userData);
        if (userData) {
            setUser(userData);
            setSinMasked(userData.meta?.sin_number_masked ?? "");

            // Determine Role
            const role = userData.roles && userData.roles.length > 0 ? userData.roles[0].name.toLowerCase() : "";
            setUserRole(role);
            const hasPersonalProfile = role === "client" || role === "employee" || role === "taxfiler";

            // Populate form common fields
            setValue("first_name", userData.first_name);
            setValue("last_name", userData.last_name);
            setValue("email", userData.email);
            setValue("mobile", userData.mobile);
            setValue("alternate_mobile", userData.alternate_mobile ?? userData.meta?.alternate_mobile);
            setValue("alternate_email", userData.alternate_email ?? userData.meta?.alternate_email);
            setValue("country", (userData.country ?? userData.meta?.country) || "Canada");
            setValue("country_code", (userData.country_code ?? userData.meta?.country_code) || "+1");
            setValue("time_zone", userData.time_zone ?? userData.meta?.time_zone);

            // Display Role Name properly
            setValue("role", userData.roles && userData.roles.length > 0 ? userData.roles[0].name : "");

            if (hasPersonalProfile) {
                setValue("address", userData?.meta?.address ?? userData.address);
                setValue("dob", userData.meta?.dob ?? userData.dob);
                setValue("marital_status", userData.meta?.marital?.status ?? userData.marital?.status);
                setValue("spouse_full_name", userData.meta?.marital?.spouse_name ?? userData.marital?.spouse_name);
                setValue("spouse_dob", userData.meta?.marital?.spouse_dob ?? userData.marital?.spouse_dob);
                setValue("spouse_sin_number", userData.meta?.marital?.spouse_sin_number ?? userData.marital?.spouse_sin_number);
                setValue("marital_spouse_status", userData.meta?.marital?.spouse_status ?? userData.marital?.spouse_status);
                const bank =
                    userData.bank_detail ||
                    (Array.isArray(userData.bank_details) ? userData.bank_details[0] : null) ||
                    (Array.isArray(userData.meta?.bank_details) ? userData.meta.bank_details[0] : null) ||
                    null;
                setValue("bank_detail.institution_number", bank?.institution_number ?? "");
                setValue("bank_detail.transit_number", bank?.transit_number ?? "");
                setValue("bank_detail.account_number", bank?.account_number ?? "");
                setValue("firm_name", userData.business?.firm_name);
            } else {
                // Admin specific or fallback fields if any
                // Admin checks usually just have contact number which is mapped to mobile
            }

            // Tax filer categories are hydrated via `getUserCategories` when opening step 2
        }
        setLoading(false);
    };
    const router = useRouter()
    const onSubmit = async (data) => {
        console.log(data, 'datain')
        if (!userGuid) return;

        const hasPersonalProfile = userRole === "client" || userRole === "employee" || userRole === "taxfiler";
        const payload = {
            first_name: data.first_name,
            last_name: data.last_name,
            mobile: data.mobile,
            alternate_mobile: data.alternate_mobile,
            alternate_email: data.alternate_email,
            country: data.country,
            country_code: data.country_code,
            time_zone: data.time_zone,
            dob: data.dob,
            // sin_number is only included when the user explicitly opened the SIN edit
            // field and typed a value — otherwise the key is omitted (not sent as "" or
            // the masked string) so the backend preserves the stored SIN.
        };

        if (isEditingSin && data.sin_number) {
            payload.sin_number = data.sin_number;
        }

        // Email/role are Admin-editing-someone-else only — omitted entirely
        // otherwise so a locked field's stale form value is never submitted.
        if (canEditRestricted) {
            payload.email = data.email;
            payload.role = data.role;
        }

        if (hasPersonalProfile) {
            payload.address = data.address;
            // For taxfiler role, backend expects bracketed `bank_details[0][...]` fields in FormData.
            // Keep legacy `bank_detail` for other roles.
            if (userRole === "taxfiler") {
                payload["bank_details[0][institution_number]"] =
                    data.bank_detail?.institution_number ?? "";
                payload["bank_details[0][transit_number]"] =
                    data.bank_detail?.transit_number ?? "";
                payload["bank_details[0][account_number]"] =
                    data.bank_detail?.account_number ?? "";
            } else {
                payload.bank_detail = data.bank_detail;
            }
            payload["marital[status]"] = data.marital_status;
            payload["marital[spouse_name]"] = data.spouse_full_name;
            payload["marital[spouse_dob]"] = data.spouse_dob;
            payload["marital[spouse_sin_number]"] = data.spouse_sin_number;
            payload["marital[spouse_status]"] = data.marital_spouse_status;
            payload.firm_name = data.firm_name;
        }

        if (userRole === "taxfiler") {
            payload.tax_categories = selectedTaxCategories;
        }

        const result = await editUser(userGuid, payload);

        if (result) {

            window.dispatchEvent(new Event("refresh-user"));

            toast.success("Profile updated successfully");

            if (isEditingSin) {
                setIsEditingSin(false);
                setValue("sin_number", "");
            }

            fetchUserData(); // refresh profile page data
            return true;
        }

        return false;
    };

    const onPasswordSubmit = async (data) => {
        if (data.password !== data.password_confirmation) {
            toast.error("New Password and Confirmation do not match");
            return;
        }
        const result = await updatePassword({
            current_password: data.current_password,
            password: data.password,
            password_confirmation: data.password_confirmation
        });

        if (result) {
            resetPasswordForm();
        }
    };

    const handleSendResetLink = async () => {
        if (!user?.email) {
            toast.error("User email not found");
            return;
        }
        await sendResetLink(user.email);
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleCameraClick = () => {
        cameraInputRef.current?.click();
    };

    const handleProfileImageChange = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || !userGuid) return;

        const result = await uploadProfileImage(file, userGuid);
        if (result) {
            setProfileImageUrl(resolveProfileImageSrc(result) || URL.createObjectURL(file));
        }
    };

    const handleRemoveProfileImage = async () => {
        const ok = await removeProfileImage();
        if (ok) {
            setProfileImageUrl(null);
        }
    };

    if (loading) {
        return <PageLoader />;
    }

    const hasPersonalProfile = userRole === "client" || userRole === "employee" || userRole === "taxfiler";
    const isClient = userRole === "client";
    const canShowExtraTabs = EXTRA_TABS_ROLES.includes(userRole);
    // Email and role are only editable when an Admin is viewing someone else's
    // profile — never self-service, even for Admin's own profile.
    const canEditRestricted = loggedInRole === "admin" && !isSelf;
    const currentRoleName = user?.roles?.[0]?.name ?? "";
    const roleOptions = canEditRestricted
        ? roleGroupFor(currentRoleName)
        : (user?.roles?.length ? user.roles.map((roleItem) => roleItem.name) : ["Employee", "Client", "Accountant"]);

    if (userRole === "taxfiler") {
        const canShowTaxCategories = loggedInRole === "taxfiler";
        const toggleCategory = (key) => {
            const normalizedKey = String(key);
            setSelectedTaxCategories((prev) =>
                prev.includes(normalizedKey)
                    ? prev.filter((k) => k !== normalizedKey)
                    : [...prev, normalizedKey]
            );
        };

        const saveTaxCategories = async (id) => {
            if (!userGuid) return;
            const hasExistingCategories = Array.isArray(userCategoryData) && userCategoryData.length > 0;
            if (hasExistingCategories) {
                await updateCategory(id, selectedTaxYear);
            } else {
                await saveUserCategory(id, selectedTaxYear);
            }
            fetchUserData();
            router.push(ROUTES.taxfiler.dashboard)
            // getUserCategories(undefined, undefined, undefined, selectedTaxYear);
            getSelectedCategories()
            // setSelectedTaxCategories([]);

        };

        const taxFilerEyebrow = (
            <BackLink onClick={() => router.back()} className="mb-3" />
        );

        return (
            <ListingPageLayout
                eyebrow={taxFilerEyebrow}
                title={`${user?.first_name} ${user?.last_name}`}
                bordered={false}
            >
                <div className="rounded-lg border bg-card p-6">
                    {/* Stepper */}
                    <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center">
                        <button
                            type="button"
                            onClick={() => setTaxFilerStep(1)}
                            className={`flex items-center gap-4 rounded-md border p-4 text-left md:w-[320px] ${taxFilerStep === 1 ? "border-primary" : "border-input"}`}
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-sm border bg-card text-sm font-semibold">
                                01
                            </div>
                            <div className="text-sm font-semibold">Personal Details</div>
                        </button>

                        {canShowTaxCategories ? (
                            <>
                                <div className="hidden h-px flex-1 bg-input md:block" />

                                <button
                                    type="button"
                                    onClick={() => setTaxFilerStep(2)}
                                    className={`flex items-center gap-4 rounded-md border p-4 text-left md:w-[320px] ${taxFilerStep === 2 ? "border-primary" : "border-input"}`}
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-sm border bg-card text-sm font-semibold">
                                        02
                                    </div>
                                    <div className="text-sm font-semibold">Tax Categories</div>
                                </button>
                            </>
                        ) : null}
                    </div>

                    {canShowTaxCategories && taxFilerStep === 2 ? (
                        <div className="mt-6 rounded-md border bg-card">
                            <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
                                <div className="text-sm font-semibold">Tax Categories</div>
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm">Select Year</Label>
                                    <Select value={selectedTaxYear} onValueChange={setSelectedTaxYear}>
                                        <SelectTrigger className="w-[120px]">
                                            <SelectValue placeholder="Select Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i).map(year => (
                                                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2 p-4">
                                {categoryData.map((item) => {
                                    const checked = selectedTaxCategories.includes(String(item.id));
                                    return (

                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => toggleCategory(item.id)}
                                            className={`flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition-colors hover:bg-muted/20 ${checked ? "border-primary" : "border-input"}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={() => toggleCategory(item.id)}
                                                className="h-4 w-4"
                                            />
                                            <div className="flex flex-1 items-center justify-between gap-6">
                                                <div className="text-sm font-medium">{item.name}</div>
                                                <div className="text-xs text-muted-foreground md:text-sm">
                                                    {item.description}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-between border-t p-4">
                                <BackLink onClick={() => setTaxFilerStep(1)} />
                                <Button type="button" disabled={apiLoading} onClick={() => saveTaxCategories(selectedTaxCategories)}>
                                    {apiLoading ? "Saving..." : "Save"}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-6 grid grid-cols-12 gap-6">
                            {/* Left section nav */}
                            <div className="col-span-12 md:col-span-3">
                                <div className="rounded-md border p-2">
                                    <Button
                                        type="button"
                                        variant={taxFilerSection === "basic" ? "secondary" : "ghost"}
                                        className="w-full justify-start"
                                        onClick={() => setTaxFilerSection("basic")}
                                    >
                                        Basic Info
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={taxFilerSection === "bank" ? "secondary" : "ghost"}
                                        className="w-full justify-start"
                                        onClick={() => setTaxFilerSection("bank")}
                                    >
                                        Bank Info
                                    </Button>
                                </div>
                            </div>

                            {/* Form */}
                            <div className="col-span-12 md:col-span-9">
                                <div className="rounded-md border p-6">
                                    <form
                                        onSubmit={handleSubmit(async (data) => {
                                            const ok = await onSubmit(data);
                                            if (ok) setTaxFilerStep(2);
                                        })}
                                        className="space-y-6"
                                    >
                                        {taxFilerSection === "bank" ? (
                                            <>
                                                <div className="text-sm font-semibold text-muted-foreground">Bank Info</div>
                                                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Institution Number</label>
                                                        <Input {...register("bank_detail.institution_number")} placeholder="Institution No." />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Transit Number</label>
                                                        <Input {...register("bank_detail.transit_number")} placeholder="Transit No." />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Account Number</label>
                                                        <Input {...register("bank_detail.account_number")} placeholder="Account No." />
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-sm font-semibold text-muted-foreground">Basic Info</div>

                                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">
                                                            Full Name <span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="grid grid-cols-2 gap-0">
                                                            <Input
                                                                {...register("first_name", { required: "First name is required" })}
                                                                placeholder="First name"
                                                                className="rounded-r-none"
                                                            />
                                                            <Input
                                                                {...register("last_name", { required: "Last name is required" })}
                                                                placeholder="Last name"
                                                                className="rounded-l-none border-l-0"
                                                            />
                                                        </div>
                                                        {(errors.first_name || errors.last_name) && (
                                                            <p className="text-xs text-red-500">
                                                                {errors.first_name?.message || errors.last_name?.message}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Date Of Birth *</label>
                                                        <Input type="date" {...register("dob")} required max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]} min="1900-01-01" />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Email</label>
                                                        <Input {...register("email")} disabled placeholder="Email" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-sm font-medium">SIN</label>
                                                            {isEditingSin ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setIsEditingSin(false);
                                                                        setValue("sin_number", "");
                                                                    }}
                                                                    className="text-xs font-medium text-muted-foreground hover:underline"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        // The read-only display below reuses this same input's DOM
                                                                        // node; clear it explicitly or the "Not set"/masked text
                                                                        // carries over into the editable field.
                                                                        setValue("sin_number", "");
                                                                        setIsEditingSin(true);
                                                                    }}
                                                                    className="text-xs font-medium text-primary hover:underline"
                                                                >
                                                                    {sinMasked ? "Edit" : "Add"}
                                                                </button>
                                                            )}
                                                        </div>
                                                        {isEditingSin ? (
                                                            <>
                                                                <Input 
                                                                    {...register("sin_number", { 
                                                                        required: "SIN is required",
                                                                        pattern: { value: /^\d{9}$/, message: "SIN must be 9 digits" }
                                                                    })} 
                                                                    placeholder="Enter SIN" 
                                                                />
                                                                {errors.sin_number && <p className="text-xs text-red-500 mt-1">{errors.sin_number.message}</p>}
                                                            </>
                                                        ) : (
                                                            <Input value={sinMasked || "Not set"} disabled readOnly />
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Address *</label>
                                                    <Input {...register("address")} placeholder="Add your address" required />
                                                    {errors.address && (
                                                        <p className="text-xs text-red-500">{errors.address.message}</p>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between rounded-md border p-4">
                                                    <div className="text-sm font-medium">Are you married ?</div>
                                                    <Switch
                                                        checked={watch("marital_status") === "married"}
                                                        onCheckedChange={(checked) => {
                                                            setValue("marital_status", checked ? "married" : "unmarried");
                                                        }}
                                                    />
                                                </div>

                                                {watch("marital_status") === "married" && (
                                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">Spouse&apos;s full Name</label>
                                                            <Input {...register("spouse_full_name")} placeholder="Spouse name" />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">Date Of Birth</label>
                                                            <Input type="date" {...register("spouse_dob")} max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]} min="1900-01-01" />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">Status</label>
                                                            <Controller
                                                                name="marital_spouse_status"
                                                                control={control}
                                                                render={({ field }) => (
                                                                    <Select value={field.value} onValueChange={field.onChange}>
                                                                        <SelectTrigger className="w-full">
                                                                            <SelectValue placeholder="Select status" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="divorce">Divorce</SelectItem>
                                                                            <SelectItem value="live-in">Live in</SelectItem>
                                                                            <SelectItem value="separated">Separated</SelectItem>
                                                                            <SelectItem value="deceased">Deceased</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">SIN*</label>
                                                            <Input {...register("spouse_sin_number")} placeholder="SIN" />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-3 pt-2">
                                                    <Switch checked={incomeInfoEnabled} onCheckedChange={setIncomeInfoEnabled} />
                                                    <div className="text-sm text-muted-foreground">Income information</div>
                                                </div>
                                            </>
                                        )}

                                        <div className="pt-2">
                                            <Button type="submit" disabled={apiLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                                {apiLoading ? "Saving..." : "Save"}
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </ListingPageLayout>
        );
    }

    const profileEyebrow = (
        <BackLink onClick={() => router.back()} className="mb-3" />
    );

    return (
        <ListingPageLayout
            eyebrow={profileEyebrow}
            title="Profile"
            bordered={false}
            contentClassName="flex flex-col space-y-6"
        >
            {/* Header Card */}
            <Card className="bg-muted/20">
                <CardContent className="flex flex-col items-center p-6 text-center">
                    <div className="relative mb-2 h-24 w-24">
                        <div className="h-24 w-24 overflow-hidden rounded-full bg-muted p-1">
                            {profileImageUrl ? (
                                <img
                                    src={profileImageUrl}
                                    alt="Profile"
                                    className="h-full w-full rounded-full object-cover"
                                    onError={() => setProfileImageUrl(null)}
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                                    <UserIcon className="h-10 w-10 text-muted-foreground" />
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleAvatarClick}
                            disabled={apiLoading}
                            title="Upload photo"
                            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90"
                        >
                            <Pencil className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleCameraClick}
                            disabled={apiLoading}
                            title="Take photo with camera"
                            className="absolute bottom-0 left-0 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow hover:bg-secondary/80"
                        >
                            <Camera className="h-4 w-4" />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleProfileImageChange}
                        />
                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="user"
                            className="hidden"
                            onChange={handleProfileImageChange}
                        />
                    </div>
                    {profileImageUrl && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveProfileImage}
                            disabled={apiLoading}
                            className="mb-2 h-auto p-1 text-xs text-red-500 hover:text-red-600"
                        >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Remove Photo
                        </Button>
                    )}
                    <h1 className="text-2xl font-bold">{user?.first_name} {user?.last_name}</h1>

                    <div className="mt-4 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            <span>{user?.email}</span>
                        </div>
                        {(user?.meta?.address || user?.address) && (
                            <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                <span>{user?.meta?.address || user?.address}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'N/A'}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-12 gap-6">
                {/* Sidebar Menu */}
                <div className="col-span-12 md:col-span-3">
                    <Card>
                        <div className="flex flex-col p-2">
                            <Button
                                variant={activeTab === 'profile' ? "secondary" : "ghost"}
                                className={`justify-start font-medium ${activeTab === 'profile' ? 'bg-secondary/50' : 'text-muted-foreground'}`}
                                onClick={() => setActiveTab('profile')}
                            >
                                Profile
                            </Button>
                            <Button
                                variant={activeTab === 'reset_password' ? "secondary" : "ghost"}
                                className={`justify-start font-medium ${activeTab === 'reset_password' ? 'bg-secondary/50' : 'text-muted-foreground'}`}
                                onClick={() => setActiveTab('reset_password')}
                            >
                                Reset Password
                            </Button>
                            {canShowExtraTabs && (
                                <>
                                    <Button
                                        variant={activeTab === 'activity_log' ? "secondary" : "ghost"}
                                        className={`justify-start font-medium ${activeTab === 'activity_log' ? 'bg-secondary/50' : 'text-muted-foreground'}`}
                                        onClick={() => setActiveTab('activity_log')}
                                    >
                                        Activity Log
                                    </Button>
                                </>
                            )}
                        </div>
                    </Card>
                </div>

                {/* content */}
                <div className="col-span-12 md:col-span-9">
                    <Card>
                        {/* <CardHeader className="pb-4"> */}
                        {/* <h3 className="text-lg font-semibold">
                                {activeTab === 'profile' ? "Basic Details" : "Reset Password"}
                            </h3> */}
                        {/* </CardHeader> */}
                        <CardContent>
                            {activeTab === 'profile' ? (
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                                    {/* Common Fields */}
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">First Name <span className="text-red-500">*</span></label>
                                            <Input {...register("first_name", { required: "First name is required" })} placeholder="First Name" />
                                            {errors.first_name && <p className="text-xs text-red-500">{errors.first_name.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Last Name <span className="text-red-500">*</span></label>
                                            <Input {...register("last_name", { required: "Last name is required" })} placeholder="Last Name" />
                                            {errors.last_name && <p className="text-xs text-red-500">{errors.last_name.message}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Email <span className="text-red-500">*</span></label>
                                            <Input
                                                {...register("email", { 
                                                    required: "Email is required", 
                                                    pattern: { value: /\S+@\S+\.\S+/, message: "Invalid email format" } 
                                                })}
                                                readOnly={!canEditRestricted}
                                                className={!canEditRestricted ? "bg-muted/50" : ""}
                                            />
                                            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Date of Birth</label>
                                            <div className="relative">
                                                <Input
                                                    type="date"
                                                    {...register("dob")}
                                                    className="pr-10"
                                                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                                                    min="1900-01-01"
                                                />
                                                <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Role</label>
                                            <Controller
                                                name="role"
                                                control={control}
                                                render={({ field }) => (
                                                    <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={!canEditRestricted}>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select role" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {roleOptions.map((roleOption) => (
                                                                <SelectItem key={roleOption} value={roleOption}>
                                                                    {roleOption}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">SIN</label>
                                            <Input value={sinMasked || "Not set"} disabled readOnly />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Country Code</label>
                                            <Controller
                                                name="country_code"
                                                control={control}
                                                render={({ field }) => (
                                                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select Country Code" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="+1">Canada (+1)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Phone Number <span className="text-red-500">*</span></label>
                                            <Controller
                                                name="mobile"
                                                control={control}
                                                rules={{
                                                    required: "Phone number is required",
                                                    validate: (value) => {
                                                        const { digits } = getPhoneFormat(watch("country_code"));
                                                        const raw = String(value ?? "").replace(/\D/g, "");
                                                        return raw.length === digits || `Phone number must be ${digits} digits`;
                                                    },
                                                }}
                                                render={({ field }) => (
                                                    <PhoneInput
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        countryCode={watch("country_code")}
                                                        placeholder="Phone Number"
                                                        hasError={!!errors.mobile}
                                                    />
                                                )}
                                            />
                                            {errors?.mobile && (
                                                <p className="text-xs text-red-500">
                                                    {errors.mobile.message}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Alternate Contact & Location */}
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Alternate Mobile</label>
                                            <Controller
                                                name="alternate_mobile"
                                                control={control}
                                                render={({ field }) => (
                                                    <PhoneInput
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        countryCode={watch("country_code")}
                                                        placeholder="Alternate Mobile"
                                                    />
                                                )}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Alternate Email</label>
                                            <Input {...register("alternate_email")} placeholder="Alternate Email" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Country</label>
                                            <Controller
                                                name="country"
                                                control={control}
                                                render={({ field }) => (
                                                    <Select
                                                        value={field.value ?? ""}
                                                        onValueChange={(value) => {
                                                            field.onChange(value);
                                                            const zonesForCountry = TIME_ZONE_OPTIONS[value] || [];
                                                            if (!zonesForCountry.some((zone) => zone.value === watch("time_zone"))) {
                                                                setValue("time_zone", "");
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select Country" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {COUNTRY_OPTIONS.map((option) => (
                                                                <SelectItem key={option} value={option}>
                                                                    {option}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Time Zone</label>
                                            <Controller
                                                name="time_zone"
                                                control={control}
                                                render={({ field }) => {
                                                    const zoneOptions = TIME_ZONE_OPTIONS[watch("country") || "Canada"] || [];
                                                    return (
                                                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder="Select Time Zone" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {zoneOptions.map((zone) => (
                                                                    <SelectItem key={zone.value} value={zone.value}>
                                                                        {zone.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    );
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {hasPersonalProfile && (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Firm Name</label>
                                                <Input {...register("firm_name")} placeholder="Firm Name" />
                                            </div>

                                            <div className="space-y-4 rounded-md border p-4">
                                                <h3 className="font-medium">Bank Details</h3>
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Institution Number</label>
                                                        <Input {...register("bank_detail.institution_number")} placeholder="Institution No." />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Transit Number</label>
                                                        <Input {...register("bank_detail.transit_number")} placeholder="Transit No." />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Account Number</label>
                                                        <Input {...register("bank_detail.account_number")} placeholder="Account No." />
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Address</label>
                                        <Input {...register("address")} placeholder="Address" />
                                    </div>
                                    {hasPersonalProfile && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium mb-2">
                                                    Marital Status
                                                </label>

                                                <Controller
                                                    name="marital_status"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <RadioGroup
                                                            value={field.value}
                                                            onValueChange={field.onChange}
                                                            className="flex items-center gap-6"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <RadioGroupItem value="married" id="married" />
                                                                <Label htmlFor="married">Married</Label>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <RadioGroupItem value="unmarried" id="unmarried" />
                                                                <Label htmlFor="unmarried">Unmarried</Label>
                                                            </div>
                                                        </RadioGroup>
                                                    )}
                                                />
                                            </div>

                                            {watch("marital_status") === "married" && (
                                                <>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">
                                                            Spouse&apos;s Full Name <span className="text-red-500">*</span>
                                                        </label>
                                                        <Input {...register("spouse_full_name")} placeholder="Spouse&apos;s Full Name" />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Date of Birth</label>
                                                        <div className="relative">
                                                            <Input
                                                                type="date"
                                                                {...register("spouse_dob")}
                                                                className="pr-10"
                                                                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                                                                min="1900-01-01"
                                                            />
                                                            <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">
                                                            SIN <span className="text-red-500">*</span>
                                                        </label>
                                                        <Input {...register("spouse_sin_number")} placeholder="SIN" />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Status</label>
                                                        <Controller
                                                            name="marital_spouse_status"
                                                            control={control}
                                                            render={({ field }) => (
                                                                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                                                                    <SelectTrigger className='w-full'>
                                                                        <SelectValue placeholder="Select status" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="live-in">Living</SelectItem>
                                                                        <SelectItem value="married">Married</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}

                                    <div className="pt-4">
                                        <Button type="submit" disabled={apiLoading} className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                                            {apiLoading ? "Saving..." : "Save"}
                                        </Button>
                                    </div>

                                </form>
                            ) : activeTab === 'activity_log' ? (
                                <UserActivityLog onBack={() => setActiveTab('profile')} />
                            ) : (
                                <>

                                    {/* Reset Password Form */}
                                    {/* <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Current Password</label>
                                            <Input
                                                type="password"
                                                {...registerPassword("current_password", { required: true })}
                                                placeholder="Enter current password"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">New Password</label>
                                            <Input
                                                type="password"
                                                {...registerPassword("password", { required: true, minLength: 6 })}
                                                placeholder="Enter new password"
                                            />
                                            {passwordErrors.password && <p className="text-xs text-red-500">Password must be at least 6 characters</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Confirm New Password</label>
                                            <Input
                                                type="password"
                                                {...registerPassword("password_confirmation", { required: true })}
                                                placeholder="Confirm new password"
                                            />
                                        </div>
                                        <Button type="submit" disabled={apiLoading}>
                                            {apiLoading ? "Updating..." : "Update Password"}
                                        </Button>
                                    </form> */}

                                    {/* <Separator /> */}

                                    {/* Reset Password Section */}
                                    <div className="px-4 py-3">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <h4 className="text-sm font-semibold">Reset Password Using Email</h4>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    We&apos;ll send a password reset link to your registered email address. Click the link in the email to set a new password.
                                                </p>
                                            </div>
                                            <Button
                                                onClick={handleSendResetLink}
                                                disabled={apiLoading}
                                                className="self-start bg-primary text-primary-foreground hover:bg-primary/90 sm:self-auto"
                                            >
                                                Send Link
                                            </Button>
                                        </div>
                                    </div>

                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </ListingPageLayout>
    );
}
