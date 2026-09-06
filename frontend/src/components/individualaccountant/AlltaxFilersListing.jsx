"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
import TablePagination from "../../app/(authenticated)/documents/TablePagination";
import { MoreVertical, Edit, Trash2, Loader2, ArrowLeft } from "lucide-react";
import useOrganisationApi from "@/api/useOrganisationApi";
import useClientManagementApi from "@/api/useClientManagementApi";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import Toolbar from "@/components/layout/Toolbar";
import { ROUTES } from "@/config/routes";
const AllTaxFilersListing = () => {
  const {   getAllTaxFilersUsers,
    taxFilerData,
    taxFilerMeta,
    loading }=useOrganisationApi()
      const { handleUserDelete } = useClientManagementApi();
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [localSearch, setLocalSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  // const [currentPage, setCurrentPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);
  // const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();
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

  }, [ currentPage, rowsPerPage, debouncedSearch]);
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
    

  
  }, [ currentPage, rowsPerPage, debouncedSearch]);
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
  const handleOpenDeleteDialog = (user) => {
    setUserToDelete(user.guid);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };
  const DeleteUser = async() => {
    setDeleteDialogOpen(false);
   await handleUserDelete(userToDelete)
   await getAllTaxFilersUsers()
    setUserToDelete(null);
  };
  const handleEditUser = (item) => {
    router.push(ROUTES.account.profile + `?userGuid=${item.guid}`)
  }

  const totalRows = taxFilerMeta?.total_results ?? taxFilerData?.length ?? 0;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const eyebrow = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => router.back()}
      aria-label="Go back"
      className="mb-3"
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );

  const searchBox = (
    <Input
      placeholder="Search Users"
      className="w-64"
      value={localSearch}
      onChange={(e) => {
        setLocalSearch(e.target.value);
        setCurrentPage(1);
      }}
    />
  );

  const allInvitesButton = (
    <Button onClick={() => router.push(ROUTES.individual.invitation)} className="rounded-md">
      All Invites
    </Button>
  );

  return (
    <ListingPageLayout
      eyebrow={eyebrow}
      title="All Tax Filers"
      toolbar={<Toolbar left={searchBox} right={allInvitesButton} />}
    >
              <Table>
              <TableHeader>
                <TableRow>
                  {/* <TableHead className="w-10">

                  </TableHead> */}
                  {/* <TableHead className="w-10">
                    <Checkbox />
                  </TableHead> */}
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  {/* <TableHead>Role</TableHead> */}
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>


                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : taxFilerData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-sm text-muted-foreground"
                    >
                      No results found
                    </TableCell>
                  </TableRow>
                ) : (
                  taxFilerData.map((item, index) => (
                    <TableRow
                      key={index}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEditUser(item)}
                    >
                      {/* <TableCell className="w-10">
                        <Checkbox
                          checked={selectedRows.includes(item.id)}
                          onCheckedChange={() => toggleRow(item.id)}
                        />
                      </TableCell> */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div
                            className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium ${getAvatarColor(index)}`}
                          >
                            {getInitials(item.first_name, item.last_name)}
                          </div>

                          {/* Name */}
                          <span className="font-medium text-sm">
                            {item.first_name} {item.last_name}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {item.email}
                        </span>
                      </TableCell>


                      <TableCell className="text-sm text-muted-foreground">
                        {item?.mobile ?? "N/A"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item?.last_login_at ?? "N/A"}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(item)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleOpenDeleteDialog(item)}
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

          {/* Footer */}
          <TablePagination
            totalRows={totalRows}
            page={currentPage}
            rowsPerPage={rowsPerPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              User will be deleted permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseDeleteDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={DeleteUser}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ListingPageLayout>
  );
};
export default AllTaxFilersListing;
