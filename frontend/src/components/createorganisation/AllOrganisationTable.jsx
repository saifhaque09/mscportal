"use client";
import TablePagination from "@/app/(authenticated)/documents/TablePagination";
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Badge } from "@/components/ui/badge";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import Toolbar from "@/components/layout/Toolbar";
import {
  MoreVertical,
  Trash2,
  Loader2,
  RefreshCw,
  LogIn,
  Eye,
  Mail,
  Search,
  X,
  ArrowRightCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import useOrganisationApi from "@/api/useOrganisationApi";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/config/routes";

export default function AllClientsTable() {
  const [selectedClients, setSelectedClients] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  // Firms::delete() requires the raw firms.delete permission, which only
  // Admin holds (via the Gate::before bypass) — Accountant/Staff never do.
  const [isAdmin] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("userRole") === "admin"
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const router = useRouter();

  const {
    getAllBusinessClients,
    deleteBusinessClient,
    loading,
    businessClients,
    meta,
  } = useOrganisationApi();

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    getAllBusinessClients({ currentPage, rowsPerPage, search: searchQuery || undefined });
  }, [currentPage, rowsPerPage, searchQuery]);
  useEffect(() => {
    if (meta?.total_results) {
      setTotalPages(Math.ceil(meta.total_results / rowsPerPage));
    }
  }, [meta, rowsPerPage]);

  useEffect(() => {
    if (meta?.total_results) {
      setTotalPages(Math.ceil(meta.total_results / rowsPerPage));
    }
  }, [meta, rowsPerPage]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      getAllBusinessClients({ currentPage, rowsPerPage, search: searchQuery || undefined });
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, currentPage, rowsPerPage, searchQuery, getAllBusinessClients]);



  const handleSelectAll = (checked) => {
    if (!checked) return setSelectedClients([]);

    setSelectedClients(
      businessClients.map((c) => ({
        id: c.id,
        email: c.client_email,
      }))
    );
  };

  const handleSelectClient = (client, checked) => {
    setSelectedClients((prev) =>
      checked
        ? [...prev, { id: client.id, email: client.client_email }]
        : prev.filter((c) => c.id !== client.id)
    );
  };

  const isClientSelected = (id) =>
    selectedClients.some((c) => c.id === id);



  const handleDeleteClick = (client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    const success = await deleteBusinessClient(clientToDelete.guid);
    if (success) {
      await getAllBusinessClients({ currentPage, rowsPerPage, search: searchQuery || undefined });
      setSelectedClients([]);
    }

    setDeleteDialogOpen(false);
    setClientToDelete(null);
  };
  const formatDate = (isoDate) => {
    if (!isoDate) return "";

    return new Date(isoDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTaxReturnDate = (taxReturn) => {
    if (!taxReturn || !taxReturn.month || !taxReturn.day) return "N/A";
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = parseInt(taxReturn.month, 10) - 1;
    const monthName = monthNames[monthIndex];
    if (!monthName) return "N/A";
    
    const day = parseInt(taxReturn.day, 10);
    if (isNaN(day)) return "N/A";
    
    const getOrdinalSuffix = (d) => {
      if (d > 3 && d < 21) return 'th';
      switch (d % 10) {
        case 1:  return "st";
        case 2:  return "nd";
        case 3:  return "rd";
        default: return "th";
      }
    };
    
    return `${day}${getOrdinalSuffix(day)} ${monthName}`;
  };
  const handleInvitesClick = (client) => {
    router.push(`${ROUTES.business.invites}?firmId=${client.guid}`);
  };

  const handleRowClick = (client) => {
    if (client.status === "draft") {
      router.push(`${ROUTES.business.create}?firmId=${client.guid}`);
    } else {
      router.push(`${ROUTES.business.board}?firmId=${client.guid}`);
    }
  };



  if (loading && businessClients.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }


  // useEffect(() => {
  //   if (meta?.total_results) {
  //     setTotalPages(Math.ceil(meta.total_results / rowsPerPage));
  //   }
  // }, [meta, rowsPerPage]);

  const searchBox = (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        placeholder="Search by firm name or email..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="pl-9 pr-9"
      />
      {searchInput && (
        <button
          onClick={() => setSearchInput("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <ListingPageLayout title="Business Clients" toolbar={<Toolbar left={searchBox} />}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  {/* <Checkbox
                    checked={
                      businessClients.length > 0 &&
                      selectedClients.length === businessClients.length
                    }
                    onCheckedChange={handleSelectAll}
                  /> */}
                </TableHead>
                {/* <TableHead>GUID</TableHead> */}
                <TableHead>Firm Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tax Returns Due Date</TableHead>
                <TableHead>New Doc</TableHead>
                <TableHead>User Count</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {businessClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    No business clients found
                  </TableCell>
                </TableRow>
              ) : (
                businessClients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer"
                    onClick={() => handleRowClick(client)}
                  >
                    <TableCell>
                      {/* <Checkbox
                        checked={isClientSelected(client.id)}
                        onCheckedChange={(checked) =>
                          handleSelectClient(client, checked)
                        }
                      /> */}
                    </TableCell>
                    {/* <TableCell>{client.guid}</TableCell> */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {client.firm_name}
                        {client.status === "draft" && (
                          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                            Draft
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{client.client_email}</TableCell>
                    <TableCell>{formatTaxReturnDate(client?.tax_return)}</TableCell>
                    <TableCell>{client.new_files}</TableCell>
                    <TableCell>{client.usercount}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <MoreVertical />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          {client.status === "draft" && (
                            <DropdownMenuItem className="cursor-pointer font-medium text-amber-700"
                              onClick={() =>
                                router.push(
                                  `${ROUTES.business.create}?firmId=${client.guid}`
                                )
                              }
                            >
                              <ArrowRightCircle className="mr-2 h-4 w-4" />
                              Continue Setup
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem className="cursor-pointer"
                            onClick={() =>
                              router.push(
                                `${ROUTES.business.board}?firmId=${client.guid}`
                              )
                            }
                          >
                            <LogIn className="mr-2 h-4 w-4" />
                            Access Client
                          </DropdownMenuItem>

                          <DropdownMenuItem className="cursor-pointer"
                            onClick={() =>
                              router.push(
                                `${ROUTES.business.view}?firmId=${client.guid}`
                              )
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>

                          <DropdownMenuItem className="cursor-pointer"
                            onClick={() => handleInvitesClick(client)}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Invites
                          </DropdownMenuItem>

                          {isAdmin && (
                            <DropdownMenuItem
                              className="cursor-pointer text-red-600"
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

        {/* Pagination */}
        <TablePagination
          totalRows={meta?.total_results}
          page={currentPage}
          rowsPerPage={rowsPerPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={(rows) => {
            setRowsPerPage(rows);
            setCurrentPage(1);
          }}
        />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{clientToDelete?.firm_name}</strong>.
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
    </ListingPageLayout>
  );
}
