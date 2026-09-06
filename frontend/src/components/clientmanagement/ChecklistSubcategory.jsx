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
import { Checkbox } from "@/components/ui/checkbox";
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
} from "lucide-react";
import BackLink from "@/components/global/BackLink";
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
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import Toolbar from "@/components/layout/Toolbar";
import { ROUTES } from "@/config/routes";

export default function ChecklistSubcategory() {

  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const router = useRouter();
  const param = useSearchParams();
  const [selectedDocument, setSelectedDocument] = useState(null);
  const checkId = param.get("id");
  const firmId = param.get("firmId");
  const category = param.get("category");
  const currentMonthName = new Date().toLocaleString("default", {
    month: "long",
  });
  const { viewChecklists, getClientChecklist, viewLoader } =
    useClientManagementApi();
  const [staticSwitches, setStaticSwitches] = useState({});
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

  // Fetch checklist items
  const fetchChecklist = useCallback(() => {
    getClientChecklist(currentPage, "rows", checkId, firmId,);
  }, [firmId, currentPage, checkId]);

  useEffect(() => {
    fetchChecklist();
  }, [currentPage, checkId]);

  // Auto-refresh every 30 seconds

  // Handle select all
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(checklistItems.map((item) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  // Handle individual selection
  const handleSelectItem = (itemId, checked) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, itemId]);
    } else {
      setSelectedItems((prev) => prev.filter((id) => id !== itemId));
    }
  };

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

    // 🔗 Call API here
    // updateChecklistSetting(payload);
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
    router.push(`${ROUTES.documents.view}?id=${item}`);
    // later: open upload modal / route
  };

  const handleViewClick = (item) => {
    console.log("View clicked for:", item);
    router.push(
      `${ROUTES.business.checklistDocAdmin}?id=${item.code}&firmId=${firmId}&checklistId=${checkId}&categoryId=${category}`,
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

  const goBack = () => {
    router.back();
  };

  if (viewLoader && checklistItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  console.log(viewChecklists, "checkdata");




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
          {(() => {
            const eyebrow = (
              <BackLink onClick={goBack} className="mb-3">
                Back
              </BackLink>
            );
            const addButton = (
              <Button onClick={() => { resetForm(); setAddDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Subcategory
              </Button>
            );
            return (
          <ListingPageLayout
            eyebrow={eyebrow}
            title="Current Year Documents"
            subtitle={viewChecklists?.name ? viewChecklists?.name : undefined}
            toolbar={<Toolbar right={addButton} />}
          >
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

                      <TableHead>Subcategory Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Document</TableHead>
                      {/* <TableHead>All Document Listing</TableHead> */}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
           {Object.keys(viewChecklists?.children).length===0? (
  <>

    <TableRow>
      <TableCell
        colSpan={7}
        className="text-center py-8 text-muted-foreground"
      >
        No checklist items found
      </TableCell>
    </TableRow>
  </>
) : (
                      viewChecklists?.children?.map((item) => {
                        console.log(item, "itemschecking");
                        const hasFiles = item?.files && item.files.length > 0;
                        return (
                          <TableRow
                            key={item.id}
                            className={hasFiles ? "cursor-pointer hover:bg-muted/50" : ""}
                            onClick={() => hasFiles && handleViewClick(item)}
                          >
                            <TableCell>
                              {/* <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={(checked) =>
                            handleSelectItem(item.id, checked)
                          }
                        /> */}
                            </TableCell>

                            <TableCell>
                              {item.name}
                              {(item.is_required === "1" || item.is_required === 1) && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {item?.details ? item?.details : "N/A"}
                            </TableCell>
                            <TableCell>
                              {item?.files && item?.files?.length > 0 ? (
                                <span className="font-medium">
                                  {item.files.length} Document{item.files.length > 1 ? "s" : ""}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  0 Documents
                                </span>
                              )}
                            </TableCell>
                            {/* <TableCell onClick={(e) => e.stopPropagation()}>
                              <Switch
                                checked={staticSwitches[item.id] ?? false}
                                onCheckedChange={(checked) =>
                                  setStaticSwitches((prev) => ({
                                    ...prev,
                                    [item.id]: checked,
                                  }))
                                }
                              />
                            </TableCell> */}

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
                                {/* <Button
                                  size="sm"
                                  variant="default"
                                  className='cursor-pointer'
                                  onClick={() => handleUploadClick(item.code)}
                                >
                                  Upload
                                </Button> */}

                                {/* View Button */}
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className={(!item?.files || item.files.length === 0) ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                                  disabled={!item?.files || item.files.length === 0}
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
                                      onClick={() => downloadDocument(item.code)}
                                    >
                                      <Download className="mr-2 h-4 w-4" />
                                      Download Zip
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
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

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
          </ListingPageLayout>
            );
          })()}
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
