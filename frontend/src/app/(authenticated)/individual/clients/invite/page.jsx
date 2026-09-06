"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import SearchableSelect from "@/components/ui/searchable-select";
import { Card, CardContent } from "@/components/ui/card";
import useOrganisationApi from "@/api/useOrganisationApi";
import useLocationsApi from "@/api/useLocationsApi";
import { guessCountryFromTimezone } from "@/utils/guessCountry";
import ProtectedRoute from "@/components/ProtectedRoute";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import BackLink from "@/components/global/BackLink";
import { ROUTES } from "@/config/routes";

function buildDefaultForm() {
  const defaultCountryIso = guessCountryFromTimezone();
  return {
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "",
    role: "Taxfiler",
    sin: "",
    phoneNumber: "",
    countryIso: defaultCountryIso,
    countryName: defaultCountryIso === "CA" ? "Canada" : "",
    countryCode: defaultCountryIso === "CA" ? "+1" : "",
    phoneCountryIso: defaultCountryIso, // tracks which country's dial code is picked — separate from countryIso since e.g. CA and US share "+1"
    province: "",
    address: "",
    maritalStatus: "married",
    spouseFullName: "",
    spouseDateOfBirth: "",
    spouseSin: "",
    status: "married",
  };
}

function InviteTaxFilerPage() {
  const router = useRouter();
  const [form, setForm] = useState(buildDefaultForm);
  const { inviteTaxFiler, loading } = useOrganisationApi();
  const { countries, provinces, getCountries, getProvinces } = useLocationsApi();

  const canSubmit = useMemo(
    () => Boolean(form.firstName?.trim() && form.lastName?.trim() && form.email?.trim()),
    [form.firstName, form.lastName, form.email]
  );

  const handleInputChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSelectChange = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCountryChange = (iso) => {
    const country = countries.find((c) => c.code === iso);
    setForm((prev) => ({
      ...prev,
      countryIso: iso,
      countryName: country?.name || "",
      countryCode: country?.dial_code || prev.countryCode,
      phoneCountryIso: iso, // default the phone code to match — user can still override it below
      province: "", // province list depends on country — clear the stale selection
    }));
  };

  // Phone dial code is picked independently of the mailing-address Country —
  // dial codes aren't unique per country (CA and US both "+1"), so this is
  // tracked by ISO code, not by the dial code string itself.
  const handlePhoneCountryChange = (iso) => {
    const country = countries.find((c) => c.code === iso);
    if (!country) return;
    setForm((prev) => ({
      ...prev,
      phoneCountryIso: iso,
      countryCode: country.dial_code,
    }));
  };

  useEffect(() => {
    getCountries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once the country list loads, resolve the timezone-guessed ISO code into
  // a display name/dial code if that didn't already happen synchronously at
  // init (only the "CA" guess is known up front, everything else needs the
  // fetched list).
  useEffect(() => {
    if (countries.length && form.countryIso && !form.countryName) {
      const country = countries.find((c) => c.code === form.countryIso);
      if (country) {
        setForm((prev) => ({ ...prev, countryName: country.name, countryCode: country.dial_code }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries]);

  useEffect(() => {
    if (form.countryIso) {
      getProvinces(form.countryIso);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.countryIso]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    const firstName = form.firstName?.trim();
    const lastName = form.lastName?.trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const rawPhone = form.phoneNumber?.trim();
    const mobile = rawPhone
      ? `${form.countryCode ?? ""}${rawPhone}`.replace(/\s+/g, "")
      : "";

    const inviteData = {
      email: form.email?.trim(),
      mobile: mobile || undefined,
      name: fullName || firstName,
      role: form.role,
      dob: form.dateOfBirth || undefined,
      sin_number: form.sin || undefined,
      address: form.address || undefined,
      country: form.countryName || undefined,
      country_code: form.countryCode || undefined,
      province: form.province || undefined,
      first_name: firstName,
      last_name: lastName,
      marital: {
        status: form.maritalStatus,
        spouse_name:
          form.maritalStatus === "married" ? form.spouseFullName || undefined : undefined,
        spouse_dob:
          form.maritalStatus === "married" ? form.spouseDateOfBirth || undefined : undefined,
        spouse_sin_number:
          form.maritalStatus === "married" ? form.spouseSin || undefined : undefined,
        spouse_status:
          form.maritalStatus === "married" ? form.status || undefined : undefined,
      },
    };

    const success = await inviteTaxFiler(undefined, inviteData);
    if (success) {
      router.push(ROUTES.dashboard.individualClients);
    }
  };

  const eyebrow = (
    <BackLink
      onClick={() => router.back()}
      className="mb-3"
    />
  );

  return (
    <ProtectedRoute allowedRoles={["accountant", "admin"]}>
      <ListingPageLayout eyebrow={eyebrow} title="Invite Tax Filer" bordered={false}>
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="first-name"
                    placeholder="Enter First Name"
                    value={form.firstName}
                    onChange={handleInputChange("firstName")}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last-name">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="last-name"
                    placeholder="Enter Last Name"
                    value={form.lastName}
                    onChange={handleInputChange("lastName")}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter Email"
                    value={form.email}
                    onChange={handleInputChange("email")}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob">Date Of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={handleInputChange("dateOfBirth")}
                    disabled={loading}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={form.role}
                    onValueChange={handleSelectChange("role")}
                    disabled={loading}
                  >
                    <SelectTrigger id="role" className="w-full">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Taxfiler">TaxFiler</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sin">SIN</Label>
                  <Input
                    id="sin"
                    placeholder="Enter SIN Number"
                    value={form.sin}
                    onChange={handleInputChange("sin")}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex gap-2">
                    <SearchableSelect
                      value={form.phoneCountryIso}
                      onValueChange={handlePhoneCountryChange}
                      placeholder="+1"
                      searchPlaceholder="Search country..."
                      disabled={loading}
                      triggerClassName="w-28"
                      options={countries.map((c) => ({
                        value: c.code,
                        label: `${c.dial_code} ${c.code}`,
                        searchText: `${c.dial_code} ${c.code} ${c.name}`,
                      }))}
                    />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="6324567"
                      value={form.phoneNumber}
                      onChange={handleInputChange("phoneNumber")}
                      disabled={loading}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="Enter Address"
                    value={form.address}
                    onChange={handleInputChange("address")}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="countryName">Country</Label>
                  <SearchableSelect
                    value={form.countryIso}
                    onValueChange={handleCountryChange}
                    placeholder="Select Country"
                    searchPlaceholder="Search country..."
                    disabled={loading}
                    options={countries.map((c) => ({ value: c.code, label: c.name, searchText: `${c.name} ${c.code}` }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
                  <SearchableSelect
                    value={form.province}
                    onValueChange={handleSelectChange("province")}
                    disabled={loading || !form.countryIso || provinces.length === 0}
                    placeholder={provinces.length ? "Select Province" : "Select a country first"}
                    searchPlaceholder="Search province..."
                    options={provinces.map((p) => ({ value: p.code, label: `${p.name} (${p.code})`, searchText: `${p.name} ${p.code}` }))}
                  />
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="text-sm font-medium">Marital Status?</div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="maritalStatus"
                      value="married"
                      checked={form.maritalStatus === "married"}
                      onChange={handleInputChange("maritalStatus")}
                      disabled={loading}
                    />
                    Married
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="maritalStatus"
                      value="unmarried"
                      checked={form.maritalStatus === "unmarried"}
                      onChange={handleInputChange("maritalStatus")}
                      disabled={loading}
                    />
                    Unmarried
                  </label>
                </div>
              </div>

              {form.maritalStatus === "married" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="spouse-name">Spouse's Full Name</Label>
                    <Input
                      id="spouse-name"
                      placeholder="Enter Full Name"
                      value={form.spouseFullName}
                      onChange={handleInputChange("spouseFullName")}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spouse-dob">Date Of Birth</Label>
                    <Input
                      id="spouse-dob"
                      type="date"
                      value={form.spouseDateOfBirth}
                      onChange={handleInputChange("spouseDateOfBirth")}
                      disabled={loading}
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spouse-sin">SIN</Label>
                    <Input
                      id="spouse-sin"
                      placeholder="Enter SIN Number"
                      value={form.spouseSin}
                      onChange={handleInputChange("spouseSin")}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spouse-status">Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={handleSelectChange("status")}
                      disabled={loading}
                    >
                      <SelectTrigger id="spouse-status" className="w-full">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="live-in">Live in</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(ROUTES.dashboard.individualClients)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !canSubmit}>
                  {loading ? "Sending..." : "Send Invite"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </ListingPageLayout>
    </ProtectedRoute>
  );
}

export default function InviteTaxFilerPageWrapper() {
  return <InviteTaxFilerPage />;
}
