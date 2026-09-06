"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Calendar, FileText, Building, MapPin, Mail, Phone, Pencil, Eye, UserPlus, Users as UsersIcon } from "lucide-react";
import useOrganisationApi from "@/api/useOrganisationApi";
import BackLink from "@/components/global/BackLink";
import useClientManagementApi from "@/api/useClientManagementApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import Toolbar from "@/components/layout/Toolbar";
import { ROUTES } from "@/config/routes";

// Backend shape for `/clients/business/{firmId}/logo/get` isn't pinned down yet — handle
// a plain URL string, a base64/data URI string, or an object carrying url/path.
function resolveClientLogoSrc(payload) {
  if (!payload) return null;
  if (typeof payload === "string") return payload;
  return payload.url || payload.path || payload.file_url || payload.logo_url || null;
}

export default function ViewOrganisation({ firmGuid }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const guid = firmGuid || searchParams.get("firmId");
  const [role, setRole] = useState("");
  const [editTarget, setEditTarget] = useState(null); // { file_hash, file_name }
  const [newDocument, setNewDocument] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [clientLogo, setClientLogo] = useState(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", first_name: "", last_name: "", role: "Client" });
  const [isInviting, setIsInviting] = useState(false);
    const {
      viewOrganisation, viewOrganisationData, loading, error, viewAgreementsFile, AgreementfileData, editAgreement,
      getFirmUsers, firmUsers, sendInvite,
    } = useOrganisationApi();
    const { getClientLogo } = useClientManagementApi();

    // `firmGuid`/`guid` may be the URL's short business code — prefer the real
    // database guid returned by `viewOrganisation` once it resolves, same as
    // EditOrganisation.jsx's `resolvedLogoFirmId`.
    const resolvedLogoFirmId = viewOrganisationData?.payload?.guid || guid;

    useEffect(() => {
        if (guid) {
            viewOrganisation({ firmGuid: guid });
            viewAgreementsFile({ firmGuid: guid})
            getFirmUsers({ firmGuid: guid });
        }
    }, [guid]);

    const handleSendInvite = async (e) => {
        e.preventDefault();
        setIsInviting(true);
        const success = await sendInvite(guid, inviteForm);
        setIsInviting(false);
        if (success) {
            setIsInviteOpen(false);
            setInviteForm({ email: "", first_name: "", last_name: "", role: "Client" });
            getFirmUsers({ firmGuid: guid });
        }
    };
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("userRole");
      setRole(storedRole);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchLogo = async () => {
      const payload = await getClientLogo(resolvedLogoFirmId);
      if (cancelled) return;
      setClientLogo(resolveClientLogoSrc(payload));
    };
    if (resolvedLogoFirmId) {
      fetchLogo();
    }
    return () => {
      cancelled = true;
    };
  }, [resolvedLogoFirmId]);

  const handleEditSave = async () => {
    if (!newDocument || !editTarget) return;
    setIsEditing(true);
    const result = await editAgreement({
      firmGuid: guid,
      document: newDocument,
      file_hash: editTarget.file_hash,
      title: newTitle,
    });
    setIsEditing(false);
    if (result) {
      setEditTarget(null);
      setNewDocument(null);
      setNewTitle("");
      viewAgreementsFile({ firmGuid: guid });
    }
  };

    if (loading) {
        return (
            <ListingPageLayout title="Organisation" bordered={false}>
                <Skeleton className="h-[600px] w-full" />
            </ListingPageLayout>
        );
    }

    if (error) {
        return (
            <ListingPageLayout title="Organisation" bordered={false}>
                <p className="text-red-500">Error loading organisation details.</p>
            </ListingPageLayout>
        );
    }

    if (!viewOrganisationData || !viewOrganisationData.payload) {
        return (
            <ListingPageLayout title="Organisation" bordered={false}>
                <p>No organisation data found.</p>
            </ListingPageLayout>
        );
    }

    const org = viewOrganisationData.payload;
    const agreements = Array.isArray(AgreementfileData) ? AgreementfileData : [];
    const pdfAgreements = agreements.filter((file) => {
        const name = (file?.file_name || file?.title || "").toLowerCase();
        const type = (file?.file_type || "").toLowerCase();
        return type.includes("pdf") || name.endsWith(".pdf");
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const fullMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const getOrdinalSuffix = (d) => {
        if (d > 3 && d < 21) return 'th';
        switch (d % 10) {
            case 1:  return "st";
            case 2:  return "nd";
            case 3:  return "rd";
            default: return "th";
        }
    };

    // `month` may arrive as a number (1-12) or a month name string (e.g. "January"/"Jan")
    // depending on the endpoint — normalize both before formatting.
    const formatMonthDay = (month, day) => {
        if (!month || !day) return null;
        let monthName;
        if (typeof month === "string" && isNaN(Number(month))) {
            const idx = fullMonthNames.findIndex((m) => m.toLowerCase() === month.toLowerCase());
            monthName = idx !== -1 ? monthNames[idx] : (monthNames.includes(month) ? month : null);
        } else {
            monthName = monthNames[parseInt(month, 10) - 1];
        }
        if (!monthName) return null;

        const dayNum = parseInt(day, 10);
        if (isNaN(dayNum)) return null;

        return `${dayNum}${getOrdinalSuffix(dayNum)} ${monthName}`;
    };

    const formatTaxReturnDate = (taxReturn) => formatMonthDay(taxReturn?.month, taxReturn?.day);

    // The backend's `tax_return` object uses the misspelled `occurance` key, not `occurrence`.
    const getTaxOccurrence = (taxReturn) => taxReturn?.occurance ?? taxReturn?.occurrence ?? null;

    const eyebrow = (
        <BackLink onClick={() => router.back()} className="mb-3" />
    );

    const titleNode = (
        <span className="flex items-center gap-3">
            {clientLogo && (
                <img
                    src={clientLogo}
                    alt="Organisation logo"
                    loading="lazy"
                    onError={() => setClientLogo(null)}
                    className="h-9 w-9 rounded-md object-contain border border-border"
                />
            )}
            <span>{org.firm_name}</span>
            {org.status === "draft" && (
                <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                    Draft
                </Badge>
            )}
        </span>
    );

    const editButton = (role === "admin" || role === "accountant") && (
        <Button onClick={() => router.push(`${ROUTES.business.edit}?firmId=${guid}`)}>
            Edit Organization
        </Button>
    );

    return (
        <ListingPageLayout
            eyebrow={eyebrow}
            title={titleNode}
            subtitle="View organisation details"
            toolbar={editButton && <Toolbar right={editButton} />}
            bordered={false}
        >
            <div className="grid gap-6 md:grid-cols-2">
                {/* Organization Information */}
                <Card className="col-span-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-medium flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            Organization Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-1">
                        <div className="grid grid-cols-[1fr_2fr] items-center py-2 border-b last:border-0">
                            <span className="font-medium text-sm text-muted-foreground">Business Name:</span>
                            <span>{org.firm_name}</span>
                        </div>
                        <div className="grid grid-cols-[1fr_2fr] items-center py-2 border-b last:border-0">
                            <span className="font-medium text-sm text-muted-foreground">Business Contact Number:</span>
                            <span>{org.country_code} {org.contact_mobile}</span>
                        </div>
                        <div className="grid grid-cols-[1fr_2fr] items-center py-2 border-b last:border-0">
                            <span className="font-medium text-sm text-muted-foreground">Client Email:</span>
                            <span>{org.client_email}</span>
                        </div>
                        <div className="grid grid-cols-[1fr_2fr] items-center py-2 border-b last:border-0">
                            <span className="font-medium text-sm text-muted-foreground">Province:</span>
                            <span>{org.province}</span>
                        </div>
                        <div className="grid grid-cols-[1fr_2fr] items-center py-2 border-b last:border-0">
                            <span className="font-medium text-sm text-muted-foreground">Business Address:</span>
                            <span>{org.address || "N/A"}</span>
                        </div>
                        <div className="grid grid-cols-[1fr_2fr] items-center py-2 border-b last:border-0">
                            <span className="font-medium text-sm text-muted-foreground">City:</span>
                            <span>{org.city}</span>
                        </div>
                        <div className="grid grid-cols-[1fr_2fr] items-center py-2 border-b last:border-0">
                            <span className="font-medium text-sm text-muted-foreground">Country:</span>
                            <span>{org.country_name}</span>
                        </div>
                        <div className="grid grid-cols-[1fr_2fr] items-center py-2 border-b last:border-0">
                            <span className="font-medium text-sm text-muted-foreground">Postal Code:</span>
                            <span>{org.postal}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Business Information */}
                <Card className="col-span-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-medium flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Business Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid grid-cols-[1fr_2fr] items-center py-2 border-b">
                            <span className="font-medium text-sm text-muted-foreground">Business Account:</span>
                            <span>{org.business_account_details?.[0] || "N/A"}</span>
                        </div>
                        <div>
                            <span className="font-medium text-sm text-muted-foreground block mb-2">GST Account:</span>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-3 rounded-md">
                                <div>
                                    <span className="text-xs text-muted-foreground block">GST</span>
                                    <span className="font-medium">{org.gst_number || "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground block">HST</span>
                                    <span className="font-medium">{org.hst_number || "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground block">PST</span>
                                    <span className="font-medium">{org.pst_number || "N/A"}</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-[1fr_2fr] items-center py-2 border-b">
                            <span className="font-medium text-sm text-muted-foreground">Business Type:</span>
                            <span>{org.business_categories?.[0] || "N/A"}</span>
                        </div>
                        <div className="grid grid-cols-[1fr_2fr] items-center py-2">
                            <span className="font-medium text-sm text-muted-foreground">Payment Type:</span>
                            <span>
                                {org.payment_type || "N/A"}
                                {(org.payment_type === "Weekly" || org.payment_type === "Bi-Weekly") && (org.weekly_day || org.weekly_month) && (
                                    <span className="text-muted-foreground">
                                        {" "}— {[org.weekly_day, org.weekly_month].filter(Boolean).join(", ")}
                                    </span>
                                )}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Due Dates */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Due Date</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold text-red-600">
                                    {/* Display logic for new tax fields or fallback to old date if present */}
                                    {formatTaxReturnDate(org.tax_return) ? (
                                        <span>{formatTaxReturnDate(org.tax_return)}</span>
                                    ) : getTaxOccurrence(org.tax_return) || org.tax_returns_due_date ? (
                                        <span>
                                            {getTaxOccurrence(org.tax_return) === 'Yearly'
                                                ? `${org.tax_return?.month} ${org.tax_return?.year}`
                                                : getTaxOccurrence(org.tax_return) || new Date(org.tax_returns_due_date).toLocaleDateString("en-GB", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                })
                                            }
                                        </span>
                                    ) : "N/A"}
                                </div>
                                {getTaxOccurrence(org.tax_return) && <div className="text-xs text-gray-500 font-normal">{getTaxOccurrence(org.tax_return)}</div>}
                            </div>
                            <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Annual CRA closing date</p>
                    </CardContent>
                </Card>

                {formatMonthDay(org.financial_year_end?.month, org.financial_year_end?.day) && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Financial Year End</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="text-2xl font-bold text-red-600">
                                    {formatMonthDay(org.financial_year_end.month, org.financial_year_end.day)}
                                </div>
                                <Calendar className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {org.reminder_date && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Reminder Date</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="text-2xl font-bold text-amber-600">
                                    {new Date(org.reminder_date).toLocaleDateString("en-GB", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                    })}
                                </div>
                                <Calendar className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Reminder ahead of the closing date</p>
                        </CardContent>
                    </Card>
                )}

                {/* Users */}
                <Card className="col-span-2">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-medium flex items-center gap-2">
                                <UsersIcon className="h-5 w-5" />
                                Users
                            </CardTitle>
                            {role !== 'employee' && (
                                <Button size="sm" onClick={() => setIsInviteOpen(true)}>
                                    <UserPlus className="h-4 w-4 mr-1" />
                                    Invite User
                                </Button>
                            )}
                        </div>
                        <CardDescription>Client, Employee, and Taxfiler users belonging to this organisation.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!firmUsers || firmUsers.length === 0 ? (
                            <span className="text-sm text-muted-foreground">No users found for this organisation.</span>
                        ) : (
                            <div className="space-y-1">
                                {firmUsers.map((u) => (
                                    <div key={u.id} className="grid grid-cols-[2fr_2fr_1fr_1fr] items-center py-2 border-b last:border-0 text-sm">
                                        <span>{`${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "—"}</span>
                                        <span className="text-muted-foreground">{u.email}</span>
                                        <span className="text-muted-foreground">{u.roles?.map((r) => r.name).join(", ") || "—"}</span>
                                        <span className="text-muted-foreground capitalize">{u.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Client Agreement */}
                <Card className="col-span-2">
                    <CardContent className="p-6">
                        <div>
                            <h3 className="font-medium text-red-600">Client Agreement</h3>
                            <p className="text-sm text-muted-foreground">
                                Uploaded agreement files for this organisation.
                            </p>
                        </div>
                        <div className="mt-4 space-y-2 text-sm">
                            {pdfAgreements.length === 0 ? (
                                <span className="text-muted-foreground">No agreement files found.</span>
                            ) : (
                                pdfAgreements.map((file) => (
                                    <div key={file.id} className="flex items-center justify-between gap-2 py-1">
                                        <span className="text-foreground truncate">
                                            {file.title || file.file_name || "Untitled"}
                                        </span>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    router.push(
                                                        `${ROUTES.documents.viewer}?uri=${encodeURIComponent(
                                                            file.file_path
                                                        )}&name=${encodeURIComponent(
                                                            file.file_name ?? ""
                                                        )}&title=${encodeURIComponent(
                                                            file.title ?? file.file_name ?? ""
                                                        )}&type=${encodeURIComponent(file.file_type ?? "")}`
                                                    )
                                                }
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                View
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setEditTarget({ file_hash: file.file_hash, file_name: file.title || file.file_name || "Untitled" });
                                                    setNewDocument(null);
                                                    setNewTitle(file.title || file.file_name || "");
                                                }}
                                            >
                                                <Pencil className="h-3.5 w-3.5 mr-1" />
                                                Edit
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

            </div>

            <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) { setEditTarget(null); setNewDocument(null); setNewTitle(""); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Replace Agreement</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-sm text-muted-foreground">
                            Replacing: <span className="font-medium text-foreground">{editTarget?.file_name}</span>
                        </p>
                        <div className="space-y-1.5">
                            <Label htmlFor="agreement-title">Title</Label>
                            <Input
                                id="agreement-title"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Agreement title"
                            />
                        </div>
                        <Input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => setNewDocument(e.target.files?.[0] || null)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setEditTarget(null); setNewDocument(null); setNewTitle(""); }}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditSave} disabled={!newDocument || isEditing}>
                            {isEditing ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isInviteOpen} onOpenChange={(open) => { setIsInviteOpen(open); if (!open) setInviteForm({ email: "", first_name: "", last_name: "", role: "Client" }); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite User</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSendInvite} className="space-y-3 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="invite-first-name">First Name</Label>
                                <Input
                                    id="invite-first-name"
                                    value={inviteForm.first_name}
                                    onChange={(e) => setInviteForm((prev) => ({ ...prev, first_name: e.target.value }))}
                                    required
                                    disabled={isInviting}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="invite-last-name">Last Name</Label>
                                <Input
                                    id="invite-last-name"
                                    value={inviteForm.last_name}
                                    onChange={(e) => setInviteForm((prev) => ({ ...prev, last_name: e.target.value }))}
                                    disabled={isInviting}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="invite-email">Email</Label>
                            <Input
                                id="invite-email"
                                type="email"
                                value={inviteForm.email}
                                onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                                required
                                disabled={isInviting}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="invite-role">Role</Label>
                            <Select
                                value={inviteForm.role}
                                onValueChange={(value) => setInviteForm((prev) => ({ ...prev, role: value }))}
                                disabled={isInviting}
                            >
                                <SelectTrigger id="invite-role" className="w-full">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Client">Client</SelectItem>
                                    <SelectItem value="Employee">Employee</SelectItem>
                                    <SelectItem value="Taxfiler">Taxfiler</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)} disabled={isInviting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isInviting}>
                                {isInviting ? "Sending..." : "Send Invite"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

        </ListingPageLayout>
    );
}
