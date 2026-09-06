"use client";

import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Send, Trash2 } from "lucide-react";
import useOrganisationApi from "@/api/useOrganisationApi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import TablePagination from "@/app/(authenticated)/documents/TablePagination";
import { useRouter } from "next/navigation";
import BackLink from "@/components/global/BackLink";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import Toolbar from "@/components/layout/Toolbar";
export default function InviteTable({ firmGuid }) {
    const router = useRouter();
    const {
        getAllInvites,
        resendInvite,
        deleteInvite,
        sendInvite,
        allInvites,
        loading,
        meta
    } = useOrganisationApi();
 const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteToDelete, setInviteToDelete] = useState(null);
    const [actionLoading, setActionLoading] = useState(null); // 'resend' or 'delete'
    const [bulkActionLoading, setBulkActionLoading] = useState(null); // 'resend' or 'delete'
    const [selectedEmails, setSelectedEmails] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [inviteForm, setInviteForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        dateOfBirth: "",
        role: "Employee",
        sin: "",
        phoneNumber: "",
        countryCode: "+1",
        address: "",
        maritalStatus: "married",
        spouseFullName: "",
        spouseDateOfBirth: "",
        spouseSin: "",
        status: "married",
    });
    useEffect(() => {

        getAllInvites(firmGuid);

    }, [firmGuid]);

    const handleRefresh = () => {
        getAllInvites(firmGuid);
    };

    const handleResend = async (email) => {
        setActionLoading(email + "_resend");
        await resendInvite(firmGuid, email);
        setActionLoading(null);
    };
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  const handleRowsPerPageChange = (rows) => {
    setRowsPerPage(rows);
    setCurrentPage(1); // Reset to the first page when changing rows per page
  };
    const handleDeleteClick =async (invite) => {
        setInviteToDelete(invite);
        setDeleteDialogOpen(true);
    
    };
  useEffect(() => {
    const dataSource = meta;
console.log(dataSource,'data')
    console.warn(dataSource?.total_results, "tin");

    if (dataSource && dataSource?.total_results) {
      setTotalPages(Math.ceil(dataSource.total_results / rowsPerPage));
    }
  }, [meta, rowsPerPage]);

    const confirmDelete = async () => {
        if (!inviteToDelete && selectedEmails.length === 0) return;

        if (inviteToDelete) {
            setActionLoading(inviteToDelete.email + "_delete"); // Just for state check if needed
            const success = await deleteInvite(firmGuid, inviteToDelete.email);
            console.log(success,'success')
            if (success) {
              await getAllInvites(firmGuid); // Refresh list
            }
            setActionLoading(null);
        } else {
            setBulkActionLoading("delete");
            await deleteInvite(firmGuid, selectedEmails);
            await getAllInvites(firmGuid);
            setSelectedEmails([]);
            setBulkActionLoading(null);
        }
        setDeleteDialogOpen(false);
        setInviteToDelete(null);
    };

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

    const resetInviteForm = () => {
        setInviteForm({
            firstName: "",
            lastName: "",
            email: "",
            dateOfBirth: "",
            role: "Employee",
            sin: "",
            phoneNumber: "",
            countryCode: "+1",
            address: "",
            maritalStatus: "married",
            spouseFullName: "",
            spouseDateOfBirth: "",
            spouseSin: "",
            status: "married",
        });
    };

    const handleInviteSubmit = async (event) => {
        event.preventDefault();
        const countryCode = inviteForm.countryCode || "+1";
        const rawPhone = inviteForm.phoneNumber?.trim() ?? "";
        const normalizedPhone = rawPhone ? `${countryCode}${rawPhone}` : "";
        const success = await sendInvite(firmGuid, {
            email: inviteForm.email,
            mobile: normalizedPhone,
            first_name: inviteForm.firstName,
            last_name: inviteForm.lastName,
            role: inviteForm.role,
            dob: inviteForm.dateOfBirth,
            sin_number: inviteForm.sin,
            address: inviteForm.address,
            marital: {
                status: inviteForm.maritalStatus,
                spouse_name: inviteForm.spouseFullName,
                spouse_dob: inviteForm.spouseDateOfBirth,
                spouse_sin_number: inviteForm.spouseSin,
                spouse_status: inviteForm.status,
            },
        });

        if (success) {
            setInviteDialogOpen(false);
            resetInviteForm();
            getAllInvites(firmGuid);
        }
    };
    const countryCodes = [
        { value: "+1", label: "+1" },
        { value: "+44", label: "+44" },
        { value: "+61", label: "+61" },
        { value: "+91", label: "+91" },
    ];

    if (!firmGuid) return null;
      const getInitials = (firstName = "", lastName = "") => {
  const first = firstName?.charAt(0)?.toUpperCase() ?? "";
  const last = lastName?.charAt(0)?.toUpperCase() ?? "";
  return `${first}${last}`;
};
const avatarColors = [
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
];

const getAvatarColor = (index = 0) => {
  return avatarColors[Math.abs(index) % avatarColors.length];
};
    const filteredInvites = allInvites.filter((invite) => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        const fullName = `${invite?.first_name ?? ""} ${invite?.last_name ?? ""}`.toLowerCase();
        const email = String(invite?.email ?? "").toLowerCase();
        const phone = String(invite?.mobile ?? invite?.phone_number ?? "").toLowerCase();
        return (
            fullName.includes(query) ||
            email.includes(query) ||
            phone.includes(query)
        );
    });

    const allFilteredSelected =
        filteredInvites.length > 0 &&
        filteredInvites.every((invite) => selectedEmails.includes(invite.email));

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedEmails(filteredInvites.map((invite) => invite.email));
        } else {
            setSelectedEmails([]);
        }
    };

    const handleSelectRow = (email) => {
        setSelectedEmails((prev) =>
            prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
        );
    };

    const handleBulkResend = async () => {
        if (selectedEmails.length === 0) return;
        setBulkActionLoading("resend");
        await resendInvite(firmGuid, selectedEmails);
        setBulkActionLoading(null);
    };
      const totalRows = meta?.total_results;

    const eyebrow = (
        <BackLink onClick={() => router.back()} className="mb-3" />
    );

    const searchBox = (
        <Input
            placeholder="Search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full md:max-w-sm"
        />
    );

    const toolbarRight = (
        <>
            <Button
                variant="outline"
                onClick={() => {
                    setInviteToDelete(null);
                    setDeleteDialogOpen(true);
                }}
                disabled={selectedEmails.length === 0 || bulkActionLoading === "delete"}
            >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
            </Button>
            <Button
                variant="outline"
                onClick={handleBulkResend}
                disabled={selectedEmails.length === 0 || bulkActionLoading === "resend"}
            >
                <Send className="h-4 w-4 mr-2" />
                Resend
            </Button>
            <Button variant="default" onClick={() => setInviteDialogOpen(true)} disabled={loading}>
                Invite New User
            </Button>
        </>
    );

    return (
        <ListingPageLayout
            eyebrow={eyebrow}
            title="Manage Invites"
            toolbar={<Toolbar left={searchBox} right={toolbarRight} />}
        >
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">
                                <input
                                    type="checkbox"
                                    aria-label="Select all"
                                    checked={allFilteredSelected}
                                    onChange={(event) => handleSelectAll(event.target.checked)}
                                />
                            </TableHead>
                            <TableHead>Client Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Invited On</TableHead>
                            <TableHead >Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && allInvites.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : filteredInvites.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No invites found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredInvites.map((invite,index) => (
                                <TableRow key={invite.id}>
                                    <TableCell>
                                        <input
                                            type="checkbox"
                                            aria-label={`Select ${invite?.first_name ?? ""} ${invite?.last_name ?? ""}`}
                                            checked={selectedEmails.includes(invite.email)}
                                            onChange={() => handleSelectRow(invite.email)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                    <div className="flex items-center gap-3">
                                               <div
  className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium ${getAvatarColor(index)}`}
>
  {getInitials(invite?.first_name, invite?.last_name)}
</div>
                                            <span className="font-medium">
                                                {invite?.first_name} {invite?.last_name}
                                            </span>
                                            {/* <span className="text-xs text-muted-foreground">{invite.email}</span> */}
                                        </div>
                                    </TableCell>
                      <TableCell>
  <div className="flex flex-col">
  <span className="text-[#71717A]">
      {invite.email}
    </span>
  </div>
</TableCell>
                                    <TableCell>
                                                    <span className="text-[#71717A]">
                                                {invite?.role} 
                                            </span>
                                    </TableCell>
                                    {/* <TableCell className="text-sm">
                                        {new Date(invite.created_at).toLocaleDateString()}
                                    </TableCell> */}
                                    <TableCell className="text-sm">
                                         <span className="text-[#71717A]">
                                    {invite?.created_at
    ? (() => {
        const d = new Date(invite.created_at); // converts UTC → local (IST)
        const months = [
          "Jan","Feb","Mar","Apr","May","Jun",
          "Jul","Aug","Sep","Oct","Nov","Dec"
        ];

        const day = String(d.getDate()).padStart(2, "0");
        const month = months[d.getMonth()];
        const year = d.getFullYear();

        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        const seconds = String(d.getSeconds()).padStart(2, "0");

        return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
      })()
    : "N/A"}</span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                                         <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-[#71717A]-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDeleteClick(invite)}
                                                disabled={actionLoading === invite.email + "_delete" || bulkActionLoading === "delete"}
                                                title="Delete Invite"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className="text-[#71717A]"
                                                size="icon"
                                                onClick={() => handleResend(invite.email)}
                                                disabled={actionLoading === invite.email + "_resend" || bulkActionLoading === "resend"}
                                                title="Resend Invite"
                                            >
                                                {actionLoading === invite.email + "_resend" ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Send className="h-4 w-4" />
                                                )}
                                            </Button>
                               
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                 <TablePagination
              totalRows={totalRows}
              page={currentPage}
              rowsPerPage={rowsPerPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Invite?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {inviteToDelete ? (
                                <>Are you sure you want to delete the invite for <strong>{inviteToDelete?.email}</strong>? This action cannot be undone.</>
                            ) : (
                                <>Are you sure you want to delete <strong>{selectedEmails.length}</strong> selected invite(s)? This action cannot be undone.</>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={bulkActionLoading === "delete"}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Invite</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleInviteSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="invite-first-name">First Name <span className="text-red-500">*</span></Label>
                                <Input
                                    id="invite-first-name"
                                    placeholder="Enter First Names"
                                    value={inviteForm.firstName}
                                    onChange={handleInviteInputChange("firstName")}
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invite-last-name">Last Name</Label>
                                <Input
                                    id="invite-last-name"
                                    placeholder="Enter Last Name"
                                    value={inviteForm.lastName}
                                    onChange={handleInviteInputChange("lastName")}
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invite-email">Email <span className="text-red-500">*</span></Label>
                                <Input
                                    id="invite-email"
                                    type="email"
                                    placeholder="Enter Email"
                                    value={inviteForm.email}
                                    onChange={handleInviteInputChange("email")}
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invite-dob">Date Of Birth</Label>
                                <Input
                                    id="invite-dob"
                                    type="date"
                                    value={inviteForm.dateOfBirth}
                                    onChange={handleInviteInputChange("dateOfBirth")}
                                    disabled={loading}
                                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invite-role">Role</Label>
                                <Select
                                    value={inviteForm.role}
                                    onValueChange={handleInviteSelectChange("role")}
                                    disabled={loading}
                                >
                                    <SelectTrigger id="invite-role" className="w-full">
                                        <SelectValue placeholder="Select Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Employee">Employee</SelectItem>
                                        <SelectItem value="Client">Client</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invite-sin">SIN </Label>
                                <Input
                                    id="invite-sin"
                                    placeholder="Enter SIN Number"
                                    value={inviteForm.sin}
                                    onChange={handleInviteInputChange("sin")}
                                    disabled={loading}
                                    // required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invite-phone">Phone Number</Label>
                                <div className="flex gap-2">
                                    <Select
                                        value={inviteForm.countryCode}
                                        onValueChange={handleInviteSelectChange("countryCode")}
                                        disabled={loading}
                                    >
                                        <SelectTrigger id="invite-phone-country" className="w-20">
                                            <SelectValue placeholder="Code" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {countryCodes.map((code) => (
                                                <SelectItem key={code.value} value={code.value}>
                                                    {code.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        id="invite-phone"
                                        type="tel"
                                        placeholder="63214567"
                                        value={inviteForm.phoneNumber}
                                        onChange={handleInviteInputChange("phoneNumber")}
                                        disabled={loading}
                                        
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
                                disabled={loading}
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
                                        disabled={loading}
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
                                        disabled={loading}
                                    />
                                    Unmarried
                                </label>
                            </div>
                        </div>

                        {inviteForm.maritalStatus === "married" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="invite-spouse-name">Spouse's Full Name </Label>
                                    <Input
                                        id="invite-spouse-name"
                                        placeholder="Enter Full Name"
                                        value={inviteForm.spouseFullName}
                                        onChange={handleInviteInputChange("spouseFullName")}
                                        disabled={loading}
                                        // required={inviteForm.maritalStatus === "married"}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="invite-spouse-dob">Date Of Birth</Label>
                                    <Input
                                        id="invite-spouse-dob"
                                        type="date"
                                        value={inviteForm.spouseDateOfBirth}
                                        onChange={handleInviteInputChange("spouseDateOfBirth")}
                                        disabled={loading}
                                        max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="invite-spouse-sin">SIN </Label>
                                    <Input
                                        id="invite-spouse-sin"
                                        placeholder="Enter SIN Number"
                                        value={inviteForm.spouseSin}
                                        onChange={handleInviteInputChange("spouseSin")}
                                        disabled={loading}
                                        // required={inviteForm.maritalStatus === "married"}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="invite-status">Status</Label>
                                    <Select
                                        value={inviteForm.status}
                                        onValueChange={handleInviteSelectChange("status")}
                                        disabled={loading}
                                    >
                                        <SelectTrigger id="invite-status">
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
                                onClick={() => {
                                    setInviteDialogOpen(false);
                                    resetInviteForm();
                                }}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Sending..." : "Send"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </ListingPageLayout>
    );
}
