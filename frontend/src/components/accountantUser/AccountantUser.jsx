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
import { Checkbox } from "@/components/ui/checkbox";
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
// import TablePagination from "./TablePagination";
import useClientManagementApi from "@/api/useClientManagementApi";
import { MoreHorizontal, MoreVertical, Download, Edit, Trash2, SendToBack, File } from "lucide-react";
import { useSearchParams } from "next/navigation";
import useUserApi from "@/api/useUserApi";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import Toolbar from "@/components/layout/Toolbar";
import { ROUTES } from "@/config/routes";
const AccountantUser = () => {
  //   const totalRows = 100
  const [page, setPage] = useState(1);
  //   const [rowsPerPage, setRowsPerPage] = useState(10)
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const searchParams = useSearchParams();
  const firmId = searchParams.get("firmId");
  const { sendResetLink, } = useUserApi();
  const [localSearch, setLocalSearch] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");


  const {
    getAllAccountantUser,
    accountantUser,
    userMeta,
    loading


  } = useUserApi();
  const { handleUserDelete } = useClientManagementApi();


  //   const totalPages = Math.ceil(totalRows / rowsPerPage)
  useEffect(() => {
    getAllAccountantUser(currentPage, rowsPerPage, searchKeyword);
  }, [currentPage, rowsPerPage, searchKeyword]);
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchKeyword(localSearch); // Only set search keyword after delay
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn); // Cleanup the timeout
  }, [localSearch, setSearchKeyword]);
  useEffect(() => {
    const dataSource = userMeta;



    if (dataSource && dataSource?.total_results) {
      setTotalPages(Math.ceil(dataSource.total_results / rowsPerPage));
    }
  }, [userMeta, rowsPerPage]);

  const router = useRouter();
  const handleDocument = (code) => {
    router.push(ROUTES.documents.view + `?id=${code}`);
  };
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  const handleRowsPerPageChange = (rows) => {
    setRowsPerPage(rows);
    setCurrentPage(1); // Reset to the first page when changing rows per page
  };
  const totalRows = userMeta?.total_results;



  const handleSendResetLink = (email) => {
    sendResetLink(email);
  };
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
  const isAllSelected =
    accountantUser.length > 0 && selectedRows.length === accountantUser.length;

  const isIndeterminate =
    selectedRows.length > 0 && selectedRows.length < accountantUser.length;

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(accountantUser.map((item) => item.id));
    } else {
      setSelectedRows([]);
    }
  };

  const toggleRow = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id)
        ? prev.filter((rowId) => rowId !== id)
        : [...prev, id]
    );
  };

  const handleOpenDeleteDialog = (user) => {
    setUserToDelete(user.guid);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };
  const DeleteUser = async () => {
    await handleUserDelete(userToDelete);
    await getAllAccountantUser(currentPage, rowsPerPage, searchKeyword);
  }
  const handleEditUser = (item) => {
    router.push(ROUTES.account.profile + `?userGuid=${item.guid}`)
  }
  const searchBox = (
    <Input
      placeholder="Search Users"
      className="w-64"
      value={localSearch}
      onChange={(e) => setLocalSearch(e.target.value)}
    />
  );

  const allInvitesButton = (
    <Button onClick={() => router.push(ROUTES.admin.invitations)} className="rounded-md">
      All Invites
    </Button>
  );

  return (
    <ListingPageLayout title="Users" toolbar={<Toolbar left={searchBox} right={allInvitesButton} />}>
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
                  <TableHead>Role</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>


                </TableRow>
              </TableHeader>

              <TableBody>
                {!loading && accountantUser.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-sm text-muted-foreground"
                    >
                      No results found
                    </TableCell>
                  </TableRow>
                ) : (
                  accountantUser.map((item, index) => (
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

                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {item.roles?.[0]?.name ?? "N/A"}
                        </span>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {item?.mobile ?? "N/A"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item?.last_login ?? "N/A"}
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
export default AccountantUser;
