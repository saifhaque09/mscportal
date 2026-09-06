"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  FileText,
  KeyRound,
  LogIn,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
  UserCog,
  UserPlus,
  UserX,
} from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import useOrganisationApi from "@/api/useOrganisationApi";
import useUserApi from "@/api/useUserApi";
import useClientManagementApi from "@/api/useClientManagementApi";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import Toolbar from "@/components/layout/Toolbar";
import { ROUTES } from "@/config/routes";

const MOCK_TAX_FILERS = [
  {
    id: "1",
    name: "Oliva Martin",
    email: "me@example.com",
    category: "Resident, Student",
    taxYear: "2025",
    status: "not_started",
    active: true,
  },
  {
    id: "2",
    name: "Liam Johnson",
    email: "me@example.com",
    category: "Resident, Student",
    taxYear: "2024",
    status: "submitted",
    active: true,
  },
  {
    id: "3",
    name: "Emma Williams",
    email: "me@example.com",
    category: "Resident, Student",
    taxYear: "2024",
    status: "in_review",
    active: true,
  },
  {
    id: "4",
    name: "Noah Brown",
    email: "me@example.com",
    category: "Resident, Student",
    taxYear: "2024",
    status: "not_started",
    active: true,
  },
  {
    id: "5",
    name: "Ava Jones",
    email: "me@example.com",
    category: "Resident, Student",
    taxYear: "2024",
    status: "submitted",
    active: true,
  },
  {
    id: "6",
    name: "Sophia Miller",
    email: "me@example.com",
    category: "Resident, Student",
    taxYear: "2023",
    status: "submitted",
    active: true,
  },
  {
    id: "7",
    name: "James Davis",
    email: "me@example.com",
    category: "Resident, Student",
    taxYear: "2023",
    status: "not_started",
    active: true,
  },
  {
    id: "8",
    name: "Sophia Miller",
    email: "me@example.com",
    category: "Resident, Student",
    taxYear: "2023",
    status: "in_review",
    active: true,
  },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "all", label: "All" },
];

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "";
  const second = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1] || "";
  return (first + second).toUpperCase();
}

const AVATAR_STYLES = [
  "bg-emerald-100 text-emerald-800",
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-slate-100 text-slate-800",
];

function getAvatarStyle(seed = "") {
  const s = String(seed);
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return AVATAR_STYLES[hash % AVATAR_STYLES.length];
}

function StatusPill({ status }) {
  if (status === "submitted") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-green-700">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        Submitted
      </span>
    );
  }

  if (status === "in_review") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-orange-700">
        <Clock3 className="h-4 w-4 text-orange-500" />
        In Review
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-red-700">
      <span className="h-3.5 w-3.5 rounded-full border-2 border-red-500" />
      Not Started
    </span>
  );
}

export default function IndividualClientsTable() {
  const router = useRouter();

  const [autoRefresh, setautoRefresh] = useState(true)
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [taxYearFilter, setTaxYearFilter] = useState("all");
  //  const [rowsPerPage, setRowsPerPage] = useState(10);
  //   const [currentPage, setCurrentPage] = useState(1);
  const [localSearch, setLocalSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canManageTeam, setCanManageTeam] = useState(false);
  const { getAllTaxFilersUsers,
    taxFilerData,
    taxFilerMeta,
    getAllIndividualUsers,
    individualUsers,
    resendInvite,
    deleteInvite,
    loading } = useOrganisationApi()
  const [inviteToCancel, setInviteToCancel] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(null);
  const individualClients = MOCK_TAX_FILERS;
  const { sendResetLink } = useUserApi()
  const { handleUserDelete } = useClientManagementApi()

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    setIsAdmin(role === "admin");
    // Manage Team (per-client role assignment) is Accountant+Admin, same
    // as the Business-side Client & Accountant Enrolment page — Staff
    // isn't included there either.
    setCanManageTeam(role === "admin" || role === "accountant");
  }, []);
  const taxYearOptions = useMemo(() => {
    const years = Array.from(new Set(individualClients.map((c) => c.taxYear)));
    years.sort((a, b) => Number(b) - Number(a));
    return ["all", ...years];
  }, [individualClients]);
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  const handleRowsPerPageChange = (rows) => {
    setRowsPerPage(rows);
    setCurrentPage(1); // Reset to the first page when changing rows per page
  };
  const getInitials = (firstName = "", lastName = "") => {
    const first = firstName?.charAt(0)?.toUpperCase() ?? "";
    const last = lastName?.charAt(0)?.toUpperCase() ?? "";
    return `${first}${last}`;
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(localSearch);
    }, 400);

    return () => clearTimeout(handle);
  }, [localSearch]);

  useEffect(() => {
    // useOrganisationApi expects { page, resultsPerPage, search }
    getAllTaxFilersUsers({
      page: currentPage,
      resultsPerPage: rowsPerPage,
      search: debouncedSearch,
    });

  }, [getAllTaxFilersUsers, currentPage, rowsPerPage, debouncedSearch]);
  useEffect(() => {
    if (taxFilerMeta?.total_results !== undefined && taxFilerMeta?.total_results !== null) {
      setTotalPages(Math.max(1, Math.ceil(taxFilerMeta.total_results / rowsPerPage)));
    }
  }, [taxFilerMeta, rowsPerPage]);



  useEffect(() => {



    getAllTaxFilersUsers({
      page: currentPage,
      resultsPerPage: rowsPerPage,
      search: debouncedSearch,
    });



  }, [currentPage, rowsPerPage, debouncedSearch]);

  const refreshPendingInvites = () => {
    getAllIndividualUsers({ page: 1, resultsPerPage: 100 });
  };

  // A sent-but-unaccepted Taxfiler invite has no User row yet, so it never
  // shows up in getAllTaxFilersUsers() above — surface it separately here so
  // it isn't just invisible until the invitee accepts.
  useEffect(() => {
    refreshPendingInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResendInvite = async (email) => {
    setResendingEmail(email);
    const success = await resendInvite("individual", email);
    if (success) refreshPendingInvites();
    setResendingEmail(null);
  };

  const handleCancelInviteClick = (invite) => {
    setInviteToCancel(invite);
    setCancelDialogOpen(true);
  };

  const confirmCancelInvite = async () => {
    if (!inviteToCancel?.email) return;
    const success = await deleteInvite("individual", inviteToCancel.email);
    if (success) refreshPendingInvites();
    setCancelDialogOpen(false);
    setInviteToCancel(null);
  };

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();

    return individualClients.filter((client) => {
      const matchesSearch =
        !q ||
        client.name.toLowerCase().includes(q) ||
        client.email.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? client.active : !client.active);

      const matchesTaxYear =
        taxYearFilter === "all" || client.taxYear === taxYearFilter;

      return matchesSearch && matchesStatus && matchesTaxYear;
    });
  }, [individualClients, search, statusFilter, taxYearFilter]);

  // const totalPages = useMemo(() => {
  //   const pages = Math.ceil(filteredClients.length / rowsPerPage);
  //   return Math.max(1, pages);
  // }, [filteredClients.length, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(localSearch);
    }, 400);

    return () => clearTimeout(handle);
  }, [localSearch]);
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, taxYearFilter, rowsPerPage]);

  const pageClients = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredClients.slice(start, start + rowsPerPage);
  }, [filteredClients, currentPage, rowsPerPage]);

  const allPageSelected =
    pageClients.length > 0 &&
    pageClients.every((c) => selectedIds.includes(c.id));

  const handleSelectAll = (checked) => {
    const isChecked = checked === true;
    if (!isChecked) {
      const pageIds = new Set(pageClients.map((c) => c.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageClients.forEach((c) => next.add(c.id));
      return Array.from(next);
    });
  };

  const handleSelectClient = (clientId, checked) => {
    const isChecked = checked === true;
    setSelectedIds((prev) =>
      isChecked
        ? Array.from(new Set([...prev, clientId]))
        : prev.filter((id) => id !== clientId)
    );
  };

  const handleDefaultDisplay = () => {
    setSearch("");
    setStatusFilter("active");
    setTaxYearFilter("all");
    setSelectedIds([]);
    toast.info("Default display applied");
  };

  const handleNavigation = () => {
    router.push(ROUTES.individual.accountantRoot);
  };
  const handleResetLink = (email) => {
    sendResetLink(email)
  }
  const editUser = (guid) => {
    router.push(ROUTES.account.profile + `?userGuid=${guid}`)
  }

  const handleDeleteClick = (client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const handleManageTeamClick = (client) => {
    router.push(ROUTES.individual.accountantEnrol + `?guid=${client.guid}`);
  };

  const confirmDelete = async () => {
    if (!clientToDelete?.guid) return;

    const response = await handleUserDelete(clientToDelete.guid);
    if (response?.data?.success) {
      getAllTaxFilersUsers({
        page: currentPage,
        resultsPerPage: rowsPerPage,
        search: debouncedSearch,
      });
    }

    setDeleteDialogOpen(false);
    setClientToDelete(null);
  };
  const searchBox = (
    <Input
      value={localSearch}
      onChange={(e) => {
        setLocalSearch(e.target.value);
        setCurrentPage(1);
      }}
      placeholder="Search by Tax Filer Name, Email and No..."
      className="md:w-[360px]"
    />
  );

  return (
    <ListingPageLayout
      title="All Individual Tax Filers"
      subtitle="List of all Tax Filers"
      toolbar={<Toolbar left={searchBox} />}
    >
          {individualUsers.length > 0 && (
            <div className="mb-4 rounded-md border">
              <div className="px-4 py-2 border-b bg-muted/30 text-sm font-medium">
                Pending Invites
              </div>
              <Table>
                <TableBody>
                  {individualUsers.map((invite) => (
                    <TableRow key={invite.email}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="font-medium">
                            {invite?.first_name
                              ? `${invite.first_name}${invite?.last_name ? ` ${invite.last_name}` : ''}`
                              : invite?.email}
                          </div>
                          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                            Draft
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invite?.email}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={resendingEmail === invite.email}
                              onClick={() => handleResendInvite(invite.email)}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Resend Invite
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleCancelInviteClick(invite)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Cancel Invite
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allPageSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tax Year</TableHead>
                <TableHead>Filling Process</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : taxFilerData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No tax filers found
                  </TableCell>
                </TableRow>
              ) : (
                taxFilerData.map((client) => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      const taxFilerGuid = client?.guid ?? client?.user_guid ?? client?.userGuid ?? client?.id;
                      const url = taxFilerGuid
                        ? ROUTES.taxfiler.dashboard + `?taxFilerGuid=${encodeURIComponent(String(taxFilerGuid))}&userId=${client?.id}`
                        : ROUTES.taxfiler.dashboard;
                      router.push(url);
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(client.id)}
                        onCheckedChange={(checked) =>
                          handleSelectClient(client.id, checked)
                        }
                        aria-label={`Select ${client.first_name}`}
                      />
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold ${getAvatarStyle(
                            client.id
                          )}`}
                        >
                          {getInitials(client?.first_name)}
                        </div>
                        <div className="font-medium">
                          {client?.first_name
                            ? `${client.first_name}${client?.last_name ? ` ${client.last_name}` : ''}`
                            : ''}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {client?.email}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {client?.categories ?? "N/A"}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {client?.year ? client?.year : 'N/A'}
                    </TableCell>

                    <TableCell>
                      <StatusPill status={client.status} />
                    </TableCell>

                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => {
                              const taxFilerGuid = client?.guid ?? client?.user_guid ?? client?.userGuid ?? client?.id;
                              const id = client?.id
                              const url = taxFilerGuid
                                ? ROUTES.taxfiler.dashboard + `?taxFilerGuid=${encodeURIComponent(String(taxFilerGuid))}&userId=${id}`
                                : ROUTES.taxfiler.dashboard;
                              router.push(url);
                            }}
                          >
                            <LogIn className="mr-2 h-4 w-4" />
                            Access Tax Filer
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => toast.info("Agreement (coming soon)")}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Agreement
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => editUser(client?.guid)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleResetLink(client?.email)}
                          >
                            <KeyRound className="mr-2 h-4 w-4" />
                            Reset Password
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="text-muted-foreground"
                            onClick={() => toast.info("Deactivate (coming soon)")}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Deactivate
                          </DropdownMenuItem>

                          {canManageTeam && (
                            <DropdownMenuItem onClick={() => handleManageTeamClick(client)}>
                              <UserCog className="mr-2 h-4 w-4" />
                              Manage Team
                            </DropdownMenuItem>
                          )}

                          {isAdmin && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteClick(client)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

        {/* Footer / Pagination */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-2 py-3 text-sm">

          <div className="text-muted-foreground">
            Total results: {taxFilerMeta?.total_results ?? 0}
          </div>

          <div className="flex items-center justify-between gap-3 md:justify-end md:gap-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Rows per page</span>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(value) => setRowsPerPage(Number(value))}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <span className="text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                aria-label="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                aria-label="Last page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>
                {clientToDelete?.first_name} {clientToDelete?.last_name}
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invite?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the pending invite for{" "}
              <strong>{inviteToCancel?.email}</strong>. They will no longer be
              able to use the invite link to create an account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelInvite}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Invite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ListingPageLayout>
  );
}
