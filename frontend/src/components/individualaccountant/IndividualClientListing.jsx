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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MoreVertical,
  Trash2,
  Loader2,
  RefreshCw,
  LogIn,
  Eye,
  Mail,
} from "lucide-react";
import useOrganisationApi from "@/api/useOrganisationApi";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/config/routes";

export default function IndividualClientListing() {
  const [selectedClients, setSelectedClients] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const router = useRouter();

  const {
    getAllBusinessClients,
    deleteBusinessClient,
    loading,
    businessClients,
    meta,
  } = useOrganisationApi();

  useEffect(() => {
    getAllBusinessClients({ currentPage, rowsPerPage });

  }, [currentPage, rowsPerPage]);
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
      getAllBusinessClients({ currentPage, rowsPerPage });
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, currentPage, getAllBusinessClients]);



  const handleSelectAll = (checked) => {
    if (!checked) return setSelectedClients([]);

    setSelectedClients(
      businessClients.map((c) => ({
        id: c.id,
        email: c.contact_email,
      }))
    );
  };

  const handleSelectClient = (client, checked) => {
    setSelectedClients((prev) =>
      checked
        ? [...prev, { id: client.id, email: client.contact_email }]
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
      await getAllBusinessClients({ currentPage, rowsPerPage });
      setSelectedClients([]);
    }

    setDeleteDialogOpen(false);
    setClientToDelete(null);
  };

  const handleInvitesClick = (client) => {
    router.push(`${ROUTES.business.invites}?firmId=${client.guid}`);
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

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold">
            Business Clients
          </CardTitle>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                getAllBusinessClients({ currentPage, rowsPerPage });
                toast.info("Table refreshed");
              }}
              disabled={loading}
            >
              <RefreshCw className={loading ? "animate-spin" : ""} />
            </Button>

            <Button
              className="min-w-[150px]"
              onClick={() =>
                router.push(ROUTES.business.create)
              }
            >
              Create Organisation
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
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
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      router.push(
                        `${ROUTES.business.dashboardAdmin}?firmId=${client.guid}`
                      )
                    }
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
                    <TableCell>{client.firm_name}</TableCell>
                    <TableCell>{client.contact_email}</TableCell>
                    <TableCell>{client?.reminder_date?client?.reminder_date:"N/A"}</TableCell>

                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `${ROUTES.business.dashboardAdmin}?firmId=${client.guid}`
                              )
                            }
                          >
                            <LogIn className="mr-2 h-4 w-4" />
                            Access Client
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `${ROUTES.business.view}?firmId=${client.guid}`
                              )
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleInvitesClick(client)}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Invites
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteClick(client)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

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
      </CardContent>

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
    </Card>
  );
}
