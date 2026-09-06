"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import BackLink from "@/components/global/BackLink";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Plus,
  Trash2,
  Edit,
  Loader2,
  RefreshCw,
  MoreVertical,
  Download,
  ChevronRight,
  Home,
  Lock,
  UploadCloud,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useClientManagementApi from "@/api/useClientManagementApi";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import DocumentViewer from "./DocumentViewer";
import useDocumentApi from "@/api/useDocumentApi";
import useTaxfilerApi from "@/api/useTaxfilerApi";
import TablePagination from "@/app/(authenticated)/documents/TablePagination";
import { ROUTES } from "@/config/routes";

export default function AllDocumentListing() {
const {userCategoryData,getUserCategories,loader,subCategoryMeta,subCategorystatusUpdate,downloadDocumentsSubcategory,downloadAllZip}=useTaxfilerApi()
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear()),
  );
  const [totalPages, setTotalPages] = useState(1);
   const [localSearch, setLocalSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const router = useRouter();
  const param = useSearchParams();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const checkId = param.get("id");
  const firmId = param.get("firmId");
  const category = param.get("category");
  const yearOptions = [
    String(new Date().getFullYear()),
    String(new Date().getFullYear() - 1),
    String(new Date().getFullYear() - 2),
  ];
  const currentMonthName = new Date().toLocaleString("default", {
    month: "long",
  });
  const { viewChecklists, getClientChecklist, viewLoader } =
    useClientManagementApi();
  const [lockedById, setLockedById] = useState({});
  const [switchUpdating, setSwitchUpdating] = useState({});
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    is_required: "0",
    category: category || "",
    details: "",
  });

  const {
    getAllChecklistItems,
    createChecklistItemSubcategory,
    deleteChecklistItem,
    updateChecklistItemSubcategory,
    loading,
    checklistItems,
    meta,
  } = useClientManagementApi();

  const { downloadDocument } = useDocumentApi();

  const hasDocuments = (item) => {
    if (!item) return false;
    const count = Number(item.document_count ?? item.documents_count ?? 0);
    const names = Array.isArray(item.document_names)
      ? item.document_names.filter(Boolean)
      : [];
    return count > 0 || names.length > 0;
  };

  const isLocked = (item) =>
    String(item?.lock_status || "").toLowerCase() === "locked";

  const handleRowsPerPageChange = (rows) => {
    setRowsPerPage(rows);
    setCurrentPage(1); // Reset to the first page when changing rows per page
  };
  // Fetch checklist items
  const fetchChecklist = useCallback(() => {
    getClientChecklist(currentPage, "rows", checkId, firmId,);
  }, [firmId, currentPage, checkId]);
useEffect(()=>{
  getUserCategories(     currentPage,
      rowsPerPage,
      searchKeyword,selectedYear)
},[     currentPage,
      rowsPerPage,
      searchKeyword,selectedYear])

  useEffect(() => {
    // Always sync from server payload so lock state stays authoritative
    setLockedById((prev) => {
      const next = { ...prev };
      (userCategoryData || []).forEach((item) => {
        if (!item?.id) return;
        next[item.id] = isLocked(item);
      });
      return next;
    });
  }, [userCategoryData]);
  // useEffect(() => {
  //   fetchChecklist();
  // }, [currentPage, checkId]);

  // Auto-refresh every 30 seconds

  // Handle select all
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(checklistItems.map((item) => item.id));
    } else {
      setSelectedItems([]);
    }
  };
 useEffect(() => {
    if (subCategoryMeta?.total_results) {
      setTotalPages(Math.ceil(subCategoryMeta.total_results / rowsPerPage));
    }
  }, [subCategoryMeta, rowsPerPage]);

  // Handle individual selection
  const handleSelectItem = (itemId, checked) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, itemId]);
    } else {
      setSelectedItems((prev) => prev.filter((id) => id !== itemId));
    }
  };
  useEffect(() => {
    const delay = setTimeout(() => {
      setSearchKeyword(localSearch);
    }, 500);

    return () => clearTimeout(delay);
  }, [localSearch, setSearchKeyword]);

  // Handle form change
  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleToggleAllDocumentListing = (item, checked) => {
    console.log("Checklist:", item.id);
    console.log("New value:", checked ? "1" : "0");

    // Example payload
    const payload = {
      checklist_id: item.id,
      is_required: checked ? "1" : "0",
    };

    //  Call API here
    // updateChecklistSetting(payload);
  };

  const handleLockSwitchChange = async (item, checked) => {
    const id = item?.id;
    if (!id) return;
console.log(checked,'checking')
    setSwitchUpdating((prev) => ({ ...prev, [id]: true }));
    const prevChecked = lockedById[id] ?? false;

    // optimistic UI
    setLockedById((prev) => ({ ...prev, [id]: checked }));

    const status = checked ? "locked" : "unlocked";
    const result = await subCategorystatusUpdate(id, selectedYear, status);

    if (!result) {
      // rollback on failure
      setLockedById((prev) => ({ ...prev, [id]: prevChecked }));
    } else {
      // keep list in sync (server might change counts/status)
      getUserCategories(currentPage, rowsPerPage, searchKeyword, selectedYear);
    }

    setSwitchUpdating((prev) => ({ ...prev, [id]: false }));
  };
  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      is_required: "0",
      category: category || "",
      details: "",
    });
  };

  // Handle add item
  const handleAddItem = async () => {
    const isParent = !formData.category;

    // Validation

    if (!formData.name) {
      toast.error("Please fill in required fields");
      return;
    }
    try {
      const payload = { ...formData, category: category };
      await createChecklistItemSubcategory(firmId, payload);
      setAddDialogOpen(false);
      resetForm();
      fetchChecklist();
    } catch (error) {
      console.error("Error adding checklist item:", error);
    }
  };
  // Handle edit click
  const handleEditClick = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: item.code,
      is_required: (item.is_required === "1" || item.is_required === true) ? "1" : "0",
      category: item.category || category,
      details: item.details || item.detail || "",
    });
    setEditDialogOpen(true);
  };

  // Handle update item
  // Handle update item
  const handleUpdateItem = async () => {
    if (!formData.name) {
      toast.error("Please fill in required fields");
      return;
    }

    const idToUpdate = editingItem.code || editingItem.id;
    const result = await updateChecklistItemSubcategory(firmId, idToUpdate, formData);
    if (result) {
      setEditDialogOpen(false);
      setEditingItem(null);
      resetForm();
      fetchChecklist();
    }
  };

  // Handle delete single item
  const handleDeleteClick = (item) => {
    console.log(item);
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };
const downloadAllfiles=async()=>{
await downloadAllZip()
}
  // Confirm delete
  const confirmDelete = async () => {
    if (itemToDelete) {
      const itemCode = itemToDelete.code;
      const success = await deleteChecklistItem(firmId, itemCode);
      if (success) {
        fetchChecklist();
        setSelectedItems((prev) =>
          prev.filter((code) => code !== itemToDelete.code),
        );
      }
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };
  const handleUploadClick = (item) => {
    console.log("Upload clicked for:", item);
    router.push(ROUTES.taxfiler.clientView + `?id=${item?.id}&userCategory=${item?.user_id}`);
    // later: open upload modal / route
  };

  const handleViewClick = (item) => {
    console.log("View clicked for:", item);
    router.push(
      ROUTES.taxfiler.clientDocumentView + `?id=${item?.id}`,
    );
    // later: navigate or open drawer
  };
  const handleViewDocument = (doc) => {
    console.log(doc, "document");
    setSelectedDocument({
      uri: doc.file_path,
      fileName: doc.file_name,
      fileType: doc.file_type,
      title: doc.title,
    });
  };
  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please select items to delete");
      return;
    }

    const confirmBulk = window.confirm(
      `Are you sure you want to delete ${selectedItems.length} item(s)?`,
    );

    if (confirmBulk) {
      for (const itemId of selectedItems) {
        await deleteChecklistItem(firmId, itemId);
      }
      fetchChecklist();
      setSelectedItems([]);
    }
  };

  // Handle manual refresh
  const handleManualRefresh = () => {
    fetchChecklist();
    toast.info("Checklist refreshed");
  };

  // Pagination
  const handleNextPage = () => {
    if (meta && currentPage < meta.last_page) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  // if (viewLoader && checklistItems.length === 0) {
  //   return (
  //     <div className="flex items-center justify-center h-64">
  //       <Loader2 className="h-8 w-8 animate-spin" />
  //     </div>
  //   );
  // }
  console.log(loader, "checkdata");




  return (
    <>
      {selectedDocument ? (
        <div className="space-y-4 ">
          <BackLink onClick={() => setSelectedDocument(null)}>
            Back to List
          </BackLink>
          <DocumentViewer documents={[selectedDocument]} />
        </div>
      ) : (
        <>
          <Card className="w-full" style={{border:'none'}}>

            {/* <nav className="flex items-center text-sm text-muted-foreground mb-6 ml-6">

              <button
                onClick={() =>
                  router.push(
                    `/clientmanagement/clientdashboard/admin?firmId=${firmId}`
                  )
                }
                className="hover:text-foreground transition-colors"
              >
                Current Checklist
              </button>
              <ChevronRight className="h-4 w-4 mx-2" />
              <span className="font-medium text-foreground">Checklist Subcategory</span>
            </nav> */}
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-2xl font-bold">
                    Current Year Documents ({selectedYear})
                  </CardTitle>

                  <p className="text-sm text-muted-foreground">
                    {viewChecklists?.name ? viewChecklists?.name : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">
                    Pick a year
                  </Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="h-9 w-[120px]">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                              placeholder="Search Category"
                              className="w-full sm:w-64"
                              value={localSearch}
                              onChange={(e) => setLocalSearch(e.target.value)}
                            />
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm">
                    Income Tax Returns
                  </Button>
                  <Button size="sm" onClick={downloadAllfiles}>
                    <Download className="mr-2 h-4 w-4" />
                    Download All Files
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
                        checklistItems.length > 0 &&
                        selectedItems.length === checklistItems.length
                      }
                      onCheckedChange={handleSelectAll}
                    /> */}
                      </TableHead>

                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                        <TableHead>Documents</TableHead>
                      <TableHead>Lock</TableHead>
                      {/* <TableHead>All Document Listing</TableHead> */}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loader ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10">
                          <div className="flex w-full items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : userCategoryData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No Record found
                        </TableCell>
                      </TableRow>
                    ) : (
                       userCategoryData?.map((item) => {
                         console.log(item, "itemschecking");
                         const rowHasDocuments = hasDocuments(item);
                         // A required subcategory the client hasn't uploaded to yet
                         // reads red, so the outstanding items stand out in the list.
                         const isRequired =
                           item.is_required === "1" || item.is_required === 1 || item.is_required === true;
                         const isMissingRequired = isRequired && !rowHasDocuments;
                         return (
                           <TableRow
                             key={item.id}
                             className={rowHasDocuments ? "cursor-pointer" : ""}
                             onClick={() => {
                               if (!rowHasDocuments) return;
                               handleViewClick(item);
                             }}
                           >
                            <TableCell>
                              {/* <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={(checked) =>
                            handleSelectItem(item.id, checked)
                          }
                        /> */}
                            </TableCell>

                            <TableCell className={isMissingRequired ? "text-red-600 dark:text-red-400 font-medium" : undefined}>
                              {item.name}
                              {isRequired && <span className="text-red-500 ml-1">*</span>}
                            </TableCell>
                            <TableCell>
                              {item?.description ? item?.description : "N/A"}
                            </TableCell>
                             <TableCell
                               onClick={() => {
                                 if (!rowHasDocuments) return;
                                 handleViewClick(item);
                               }}
                               className={
                                 rowHasDocuments
                                   ? "cursor-pointer"
                                   : "cursor-not-allowed opacity-70"
                               }
                             >
                              {(() => {
                                const docs = Array.isArray(item.document_names)
                                  ? item.document_names.filter(Boolean)
                                  : [];
                                const visibleDocs = docs.slice(0, 2);
                                const hasMore = docs.length > 2;
                                const isLocked = lockedById[item.id] ?? false;

                                if (docs.length === 0) {
                                  return (
                                    <span className="text-muted-foreground text-sm">
                                      ---
                                    </span>
                                  );
                                }

                                return (
                                  <div className="flex flex-col gap-1">
                                    {/* {isLocked ? (
                                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <Lock className="h-3.5 w-3.5" />
                                        Locked
                                      </span>
                                    ) : null} */}
                                    {visibleDocs.map((doc, index) => (
                                      <span
                                        key={`${doc}-${index}`}
                                        className={
                                          isLocked
                                            ? "text-muted-foreground text-sm opacity-70"
                                            : "text-muted-foreground text-sm"
                                        }
                                      >
                                        {doc}
                                      </span>
                                    ))}
                                    {hasMore ? (
                                      <button
                                        type="button"
                                        className="w-fit text-sm text-blue-600 underline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewClick(item);
                                        }}
                                      >
                                        More
                                      </button>
                                    ) : null}
                                  </div>
                                );
                              })()}
                             </TableCell>
                             <TableCell onClick={(e) => e.stopPropagation()}>
                               <Switch
                                  checked={lockedById[item.id] ?? false}
                                 disabled={!!switchUpdating[item.id]}
                                 onCheckedChange={(checked) =>
                                   handleLockSwitchChange(item, checked)
                                 }
                               />
                             </TableCell>

                            {/* <TableCell >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `${ROUTES.business.checklistDocAdmin}?checklistGuid=${item.code}&firmGuid=${firmId}`
                                )
                              }
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              View Documents
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEditClick(item)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(item)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell> */}
                            <TableCell
                              onClick={(e) => e.stopPropagation()} //
                            >
                              <div className="flex items-center gap-2">
                                {/* Upload Button */}
                                <Button
                                  size="sm"
                                  variant="default"
                                  className={
                                    lockedById[item.id]
                                      ? "cursor-not-allowed opacity-60"
                                      : "cursor-pointer"
                                  }
                                  disabled={!!lockedById[item.id]}
                                  onClick={() => handleUploadClick(item)}
                                >
                                  {lockedById[item.id] ? (
                                    <>
                                      <Lock className="mr-2 h-4 w-4" />
                                      Locked
                                    </>
                                  ) : (
                                    <>
                                      <UploadCloud className="mr-2 h-4 w-4" />
                                      Upload
                                    </>
                                  )}
                                </Button>

                                {/* View Button */}
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className={
                                    rowHasDocuments
                                      ? "cursor-pointer"
                                      : "cursor-not-allowed opacity-50"
                                  }
                                  disabled={!rowHasDocuments}
                                  onClick={() => handleViewClick(item)}
                                >
                                  View
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => downloadDocumentsSubcategory(item.id,selectedYear)}
                                    >
                                      <Download className="mr-2 h-4 w-4" />
                                      Download Zip
                                    </DropdownMenuItem>
                                    {/* <DropdownMenuItem
                                      onClick={() => handleEditClick(item)}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteClick(item)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem> */}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {/* {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {checklistItems.length} of {meta.total_results} results
                (Page {meta.current_page} of {meta.last_page})
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={handleNextPage}
                  disabled={currentPage === meta.last_page || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )} */}
            </CardContent>
            <TablePagination
              totalRows={subCategoryMeta?.total_results}
              page={currentPage}
              rowsPerPage={rowsPerPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={handleRowsPerPageChange}
            />
          </Card>
        </>
      )}


      {/* Add Item Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subcategory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name<span className="text-red-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                placeholder="e.g. Loan statements"
              />
            </div>
            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea
                value={formData.details}
                onChange={(e) => handleFormChange("details", e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_required === "1" || formData.is_required === true}
                onCheckedChange={(checked) => handleFormChange("is_required", checked ? "1" : "0")}
              />
              <Label>Required</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={loading} onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddItem} disabled={!formData.name || loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subcategory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name<span className="text-red-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea
                value={formData.details}
                onChange={(e) => handleFormChange("details", e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_required === "1" || formData.is_required === true}
                onCheckedChange={(checked) => handleFormChange("is_required", checked ? "1" : "0")}
              />
              <Label>Required</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={loading} onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateItem} disabled={loading}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-semibold">{itemToDelete?.name}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
