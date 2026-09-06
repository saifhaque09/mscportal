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
import { Loader2, Send, Trash2 } from "lucide-react";
import useOrganisationApi from "@/api/useOrganisationApi";
import { Input } from "@/components/ui/input";
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
import TablePagination from "@/app/(authenticated)/documents/TablePagination";
import InviteTaxFilerDialog from "@/components/individualaccountant/invitation/InviteTaxFilerDialog";
import { useRouter } from "next/navigation";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import BackLink from "@/components/global/BackLink";
import Toolbar from "@/components/layout/Toolbar";
export default function TaxFilersInvitations({ firmGuid }) {
    const router = useRouter();
    const {
        getAllIndividualUsers,
        getAllAccountantInvites,
        individualUsers,
        individualUsersMeta,
        resendInviteAccountant,
        accountantInvitesData,
        deleteAccountantInvite,
        loading,
        meta
    } = useOrganisationApi();
  const [invites, setInvites] = useState([]);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [localSearch, setLocalSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteToDelete, setInviteToDelete] = useState(null);
    const [actionLoading, setActionLoading] = useState(null); // 'resend' or 'delete'
    const [bulkActionLoading, setBulkActionLoading] = useState(null); // 'resend' or 'delete'
    const [selectedEmails, setSelectedEmails] = useState([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(localSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [localSearch]);

  useEffect(() => {
    (async () => {
      await getAllIndividualUsers({
        search: debouncedSearch || undefined,
        page: currentPage,
        resultsPerPage: rowsPerPage,
      });
    })();
  }, [ debouncedSearch, currentPage, rowsPerPage]);

  useEffect(() => {
    setInvites(Array.isArray(accountantInvitesData) ? accountantInvitesData : []);
  }, [accountantInvitesData]);

  const totalRows = meta?.total_results ?? invites.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

    const handleRefresh = async () => {
        await getAllIndividualUsers({
          search: debouncedSearch || undefined,
          page: currentPage,
          resultsPerPage: rowsPerPage,
        });
    };

    const handleResend = async (email) => {
        setActionLoading(email + "_resend");
        await resendInviteAccountant( email);
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

    const confirmDelete = async () => {
        if (!inviteToDelete && selectedEmails.length === 0) return;

        if (inviteToDelete) {
            setActionLoading(inviteToDelete.email + "_delete"); // Just for state check if needed
            const success = await deleteAccountantInvite( inviteToDelete.email);
            if (success) {
              await handleRefresh();
              setSelectedEmails([]);
            }
            setActionLoading(null);
        } else {
            setBulkActionLoading("delete");
            await deleteAccountantInvite(selectedEmails);
            await handleRefresh();
            setSelectedEmails([]);
            setBulkActionLoading(null);
        }
        setDeleteDialogOpen(false);
        setInviteToDelete(null);
    };

    const handleInvite = async () => {
        await handleRefresh();
        setSelectedEmails([]);
        return true;
    };

    // if (!firmGuid) return null;
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
    const displayedInvites = individualUsers;

    const allFilteredSelected =
        displayedInvites.length > 0 &&
        displayedInvites.every((invite) => selectedEmails.includes(invite.email));

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedEmails(displayedInvites.map((invite) => invite.email));
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
        await resendInviteAccountant(selectedEmails);
        setBulkActionLoading(null);
    };
    const eyebrow = (
        <BackLink onClick={() => router.back()} className="mb-3" />
    );

    const searchBox = (
        <Input
            placeholder="Search"
            value={localSearch}
            onChange={(event) => {
                setLocalSearch(event.target.value);
                setCurrentPage(1);
            }}
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
                Invite New Tax Filers
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
                            <TableHead>Tax Filers Name</TableHead>
                            <TableHead>Email</TableHead>
                            {/* <TableHead>Role</TableHead> */}
                            <TableHead>Invited On</TableHead>
                            <TableHead >Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && displayedInvites.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : displayedInvites.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No invites found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            displayedInvites.map((invite,index) => (
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
                                    {/* <TableCell>
                                                    <span className="text-[#71717A]">
                                                {invite?.role} 
                                            </span>
                                    </TableCell> */}
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

            <InviteTaxFilerDialog
                open={inviteDialogOpen}
                onOpenChange={setInviteDialogOpen}
                loading={loading}
                onInvite={handleInvite}
            />
        </ListingPageLayout>
    );
}
