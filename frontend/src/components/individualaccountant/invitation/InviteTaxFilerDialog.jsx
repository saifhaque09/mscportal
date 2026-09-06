"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useOrganisationApi from "@/api/useOrganisationApi";

const DEFAULT_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  dateOfBirth: "",
  role:"Taxfiler",
  sin: "",
  phoneNumber: "",
  countryCode: "+1",
  address: "",
  maritalStatus: "married",
  spouseFullName: "",
  spouseDateOfBirth: "",
  spouseSin: "",
  status: "married",
};

const COUNTRY_CODES = [
  { value: "+1", label: "+1" },
  { value: "+44", label: "+44" },
  { value: "+61", label: "+61" },
  { value: "+91", label: "+91" },
];

export default function InviteTaxFilerDialog({
  open,
  onOpenChange,
  loading = false,
  onInvite,
}) {
  const [inviteForm, setInviteForm] = useState(DEFAULT_FORM);
  const { inviteTaxFiler, loading: apiLoading } = useOrganisationApi();
  const isLoading = loading || apiLoading;
  const canSubmit = useMemo(() => {
    return Boolean(
      inviteForm.firstName?.trim() && inviteForm.lastName?.trim() && inviteForm.email?.trim()
    );
  }, [inviteForm.firstName, inviteForm.lastName, inviteForm.email]);

  useEffect(() => {
    if (!open) setInviteForm(DEFAULT_FORM);
  }, [open]);

  const handleInviteInputChange = (field) => (event) => {
    setInviteForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleInviteSelectChange = (field) => (value) => {
    setInviteForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit) return;

    const firstName = inviteForm.firstName?.trim();
    const lastName = inviteForm.lastName?.trim();
    const fullName = `${firstName} ${lastName}`.trim();

    const rawPhone = inviteForm.phoneNumber?.trim();
    const mobile = rawPhone ? `${inviteForm.countryCode ?? ""}${rawPhone}`.replace(/\s+/g, "") : "";

    const inviteData = {
      email: inviteForm.email?.trim(),
      mobile: mobile || undefined,
      name: fullName || firstName,
      role: inviteForm.role,
      dob: inviteForm.dateOfBirth || undefined,
      sin_number: inviteForm.sin || undefined,
      address: inviteForm.address || undefined,
      first_name: firstName,
      last_name: lastName,
      marital: {
        status: inviteForm.maritalStatus,
        spouse_name:
          inviteForm.maritalStatus === "married"
            ? inviteForm.spouseFullName || undefined
            : undefined,
        spouse_dob:
          inviteForm.maritalStatus === "married"
            ? inviteForm.spouseDateOfBirth || undefined
            : undefined,
        spouse_sin_number:
          inviteForm.maritalStatus === "married" ? inviteForm.spouseSin || undefined : undefined,
        spouse_status:
          inviteForm.maritalStatus === "married" ? inviteForm.status || undefined : undefined,
      },
    };

    const success = await inviteTaxFiler(undefined, inviteData);
    if (!success) return;

    const shouldClose = onInvite ? await onInvite(inviteData) : true;
    if (shouldClose !== false) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Invite</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invite-first-name">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="invite-first-name"
                placeholder="Enter First Name"
                value={inviteForm.firstName}
                onChange={handleInviteInputChange("firstName")}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-last-name">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="invite-last-name"
                placeholder="Enter Last Name"
                value={inviteForm.lastName}
                onChange={handleInviteInputChange("lastName")}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="Enter Email"
                value={inviteForm.email}
                onChange={handleInviteInputChange("email")}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-dob">Date Of Birth</Label>
              <Input
                id="invite-dob"
                type="date"
                value={inviteForm.dateOfBirth}
                onChange={handleInviteInputChange("dateOfBirth")}
                disabled={isLoading}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
              />
            </div>
                        <div className="space-y-2">
                                <Label htmlFor="invite-role">Role</Label>
                                <Select
                                    value={inviteForm.role}
                                    onValueChange={handleInviteSelectChange("role")}
                                    disabled={isLoading}
                                >
                                    <SelectTrigger id="invite-role" className="w-full">
                                        <SelectValue placeholder="Select Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Taxfiler">TaxFiler</SelectItem>
                                        {/* <SelectItem value="Client">Client</SelectItem> */}
                                    </SelectContent>
                                </Select>
                            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-sin">SIN</Label>
              <Input
                id="invite-sin"
                placeholder="Enter SIN Number"
                value={inviteForm.sin}
                onChange={handleInviteInputChange("sin")}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-phone">Phone Number</Label>
              <div className="flex gap-2">
                <Select
                value={inviteForm.countryCode}
                onValueChange={handleInviteSelectChange("countryCode")}
                  disabled={isLoading}
                >
                  <SelectTrigger id="invite-phone-country" className="w-20">
                    <SelectValue placeholder="Code" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map((code) => (
                      <SelectItem key={code.value} value={code.value}>
                        {code.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="invite-phone"
                  type="tel"
                  placeholder="6324567"
                  value={inviteForm.phoneNumber}
                  onChange={handleInviteInputChange("phoneNumber")}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-address">Address</Label>
            <Input
              id="invite-address"
              placeholder="Enter Address"
              value={inviteForm.address}
              onChange={handleInviteInputChange("address")}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="text-sm font-medium">Marital Status ?</div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="maritalStatus"
                  value="married"
                  checked={inviteForm.maritalStatus === "married"}
                  onChange={handleInviteInputChange("maritalStatus")}
                  disabled={isLoading}
                />
                Married
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="maritalStatus"
                  value="unmarried"
                  checked={inviteForm.maritalStatus === "unmarried"}
                  onChange={handleInviteInputChange("maritalStatus")}
                  disabled={isLoading}
                />
                Unmarried
              </label>
            </div>
          </div>

          {inviteForm.maritalStatus === "married" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invite-spouse-name">Spouse's Full Name</Label>
                <Input
                  id="invite-spouse-name"
                  placeholder="Enter Full Name"
                  value={inviteForm.spouseFullName}
                  onChange={handleInviteInputChange("spouseFullName")}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-spouse-dob">Date Of Birth</Label>
                <Input
                  id="invite-spouse-dob"
                  type="date"
                  value={inviteForm.spouseDateOfBirth}
                  onChange={handleInviteInputChange("spouseDateOfBirth")}
                  disabled={isLoading}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-spouse-sin">SIN</Label>
                <Input
                  id="invite-spouse-sin"
                  placeholder="Enter SIN Number"
                  value={inviteForm.spouseSin}
                  onChange={handleInviteInputChange("spouseSin")}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-status">Status</Label>
                <Select
                  value={inviteForm.status}
                  onValueChange={handleInviteSelectChange("status")}
                  disabled={isLoading}
                >
                  <SelectTrigger id="invite-status" className="w-full">
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

          <DialogFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !canSubmit}>
              {isLoading ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
