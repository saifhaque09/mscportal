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
import { Loader2, MoreHorizontal, MoreVertical, Download, Edit, Trash2, SendToBack, File } from "lucide-react";
import { useSearchParams } from "next/navigation";
import useUserApi from "@/api/useUserApi";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import Toolbar from "@/components/layout/Toolbar";
import { ROUTES } from "@/config/routes";
const AllUsers = () => {
  //   const totalRows = 100
  const [page, setPage] = useState(1);
  //   const [rowsPerPage, setRowsPerPage] = useState(10)
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const searchParams = useSearchParams();
  // Client/Employee reach this page from the sidebar with no query string at
  // all — fall back to the firmGuid stored at login, same as
  // getAllBusinessUsers() does internally below, so the toolbar buttons and
  // the listed users always agree on which firm they're scoped to.
  const firmId =
    searchParams.get("firmId") ||
    (typeof window !== "undefined" ? localStorage.getItem("firmGuid") : null);
  const { sendResetLink, } = useUserApi();
  const [localSearch, setLocalSearch] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  
  const {
    getAllChecklistItems,
    checklistItems,
    checklistLoader,
    searchKeyword,
    setSearchKeyword,
    userMeta,
    getAllBusinessUsers,
    handleUserDelete,
    userData,
    
  } = useClientManagementApi();
  //   const totalPages = Math.ceil(totalRows / rowsPerPage)
  useEffect(() => {
    getAllBusinessUsers(firmId, currentPage, rowsPerPage);
  }, [searchKeyword, currentPage, rowsPerPage]);
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchKeyword(localSearch); // Only set search keyword after delay
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn); // Cleanup the timeout
  }, [localSearch, setSearchKeyword]);
  useEffect(() => {
    const dataSource = userMeta;

    console.warn(dataSource.total_results, "tin");

    if (dataSource && dataSource?.total_results) {
      setTotalPages(Math.ceil(dataSource.total_results / rowsPerPage));
    }
  }, [userMeta, rowsPerPage]);

  const router = useRouter();
  const handleDocument = (code) => {
    router.push(`${ROUTES.documents.view}?id=${code}`);
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
  userData.length > 0 && selectedRows.length === userData.length;

const isIndeterminate =
  selectedRows.length > 0 && selectedRows.length < userData.length;

const toggleSelectAll = (checked) => {
  if (checked) {
    setSelectedRows(userData.map((item) => item.id));
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
const DeleteUser=async()=>{
await handleUserDelete(userToDelete)
   await getAllBusinessUsers(firmId, currentPage, rowsPerPage);
}
const handleEditUser=(item)=>{
router.push(`${ROUTES.account.profile}?userGuid=${item.guid}`)
}
  const searchBox = (
    <Input
      placeholder="Search Users"
      className="w-64"
      value={localSearch}
      onChange={(e) => setLocalSearch(e.target.value)}
    />
  );

  const toolbarActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={() => router.push(`${ROUTES.business.inviteUser}?firmId=${firmId}`)}
        className="rounded-md"
      >
        Invite User
      </Button>
      <Button onClick={() => router.push(`${ROUTES.business.invites}?firmId=${firmId}`)} className="rounded-md">
        All Invites
      </Button>
    </div>
  );

  return (
    <ListingPageLayout title="Users" toolbar={<Toolbar left={searchBox} right={toolbarActions} />}>
        {checklistLoader ? (
          <Loader2 className="h-6 w-6 animate-spin mx-auto my-8" />
        ) : (
          <>
              <Table>
                <TableHeader>
                  <TableRow>
                        {/* <TableHead className="w-10">
      <Checkbox
        checked={isAllSelected}
        indeterminate={isIndeterminate}
        onCheckedChange={toggleSelectAll}
      />
    </TableHead> */}
                    {/* <TableHead className="w-10">
                    <Checkbox />
                  </TableHead> */}
                    <TableHead>Client Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead >Action</TableHead>
                    
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {!checklistLoader && userData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-sm text-muted-foreground"
                      >
                        No results found
                      </TableCell>
                    </TableRow>
                  ) : (
                    userData.map((item, index) => (
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
                            {/* Role is not in the API response provided, assuming N/A or mapping if available later */}
                     {item.roles?.[0]?.name ?? "N/A"}
                          </span>
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground">
                          {item?.mobile ?? "N/A"}
                        </TableCell>
   <TableCell className="text-sm text-muted-foreground">
                          {item?.last_login ?? "N/A"}
                        </TableCell>

                        <TableCell
                          onClick={(e) => e.stopPropagation()}
                        >




                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                onClick={() => handleEditUser(item)}
                              >
                                <File className="mr-2 h-4 w-4" />
                              Edit 
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleSendResetLink(item.email)}
                              >
                                <SendToBack className="mr-2 h-4 w-4" />
                                Reset Password
                              </DropdownMenuItem>
             
                                           <DropdownMenuItem
                                onClick={() => handleOpenDeleteDialog(item)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                              {/* <DropdownMenuItem
                               disabled
                               
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem

                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem> */}
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
          </>
        )}

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
export default AllUsers;
