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
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import { ROUTES } from "@/config/routes";

export default function ViewChecklist({ firmId }) {
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
  const checklistId = param.get("id");
  const { viewChecklists, getClientChecklist, viewLoader } =
    useClientManagementApi();
  const [staticSwitches, setStaticSwitches] = useState({});
  const [formData, setFormData] = useState({
    name: "",

    is_required: "0",
    category: "Tax",
    details: "",
  });

  const {
    getAllChecklistItems,
    createChecklistItem,
    deleteChecklistItem,
    updateChecklistItem,
    loading,
    checklistItems,
    meta,
  } = useClientManagementApi();

  // Fetch checklist items
  const fetchChecklist = useCallback(() => {
    getClientChecklist(currentPage, "rows", checklistId);
  }, [firmId, currentPage, checklistId]);
  const currentMonthName = new Date().toLocaleString("default", {
    month: "long",
  });
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const yearOptions = Array.from({ length: 5 }, (_, i) =>
    String(now.getFullYear() - i)
  );
  useEffect(() => {
    fetchChecklist();
  }, [currentPage, checklistId]);

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
      category: "Tax",
      details: "",
    });
  };

  // Handle add item
  const handleAddItem = async () => {
    if (!formData.name) {
      toast.error("Please fill in required fields");
      return;
    }
    try {
      await createChecklistItem(firmId, formData);
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
      is_required: item.is_required,
      category: item.category,
      details: item.details || "",
    });
    setEditDialogOpen(true);
  };

  // Handle update item
  const handleUpdateItem = async () => {
    if (!formData.name || !formData.code) {
      toast.error("Please fill in required fields");
      return;
    }

    const result = await updateChecklistItem(firmId, editingItem.id, formData);
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
      `${ROUTES.business.allDocuments}?id=${item.code}&name=${item.name}&checklistId=${checklistId}`,
    );
    // later: navigate or open drawer
  };
  // const handleViewDocument = (doc) => {
  //   console.log(doc, "document");
  //   setSelectedDocument({
  //     uri: doc.file_path,
  //     fileName: doc.file_name,
  //     fileType: doc.file_type,
  //   });
  // };
  const handleViewDocument = (doc) => {
    router.push(
      `${ROUTES.documents.viewer}?uri=${encodeURIComponent(doc.file_path)}&name=${encodeURIComponent(
        doc.file_name
      )}&title=${encodeURIComponent(doc.title ?? "")}&type=${encodeURIComponent(doc.file_type)}`
    );
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

  if (viewLoader && checklistItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  const goBack = () => {
    router.back();
  }
  console.log(selectedDocument, "checkdata");
  const eyebrow = (
    <BackLink onClick={goBack} className="mb-3">
      Back
    </BackLink>
  );

  return (
    <ListingPageLayout
      eyebrow={eyebrow}
      title={`Current Month (${currentMonthName}) Documents`}
      subtitle={viewChecklists?.name}
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
                    <TableHead>Required</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewChecklists?.children?.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No checklist items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    viewChecklists?.children?.map((item) => {
                      console.log(item, "itemschecking");
                      const hasFiles = item?.files && item.files.length > 0;
                      // A required subcategory the client hasn't uploaded to yet
                      // reads red, so the outstanding items stand out in the list.
                      const isRequired =
                        item.is_required === "1" || item.is_required === 1 || item.is_required === true;
                      const isMissingRequired = isRequired && !hasFiles;
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

                          <TableCell className={isMissingRequired ? "text-red-600 dark:text-red-400 font-medium" : undefined}>
                            {item.name}
                            {isRequired && <span className="text-red-500 ml-1">*</span>}
                          </TableCell>
                          <TableCell>
                            {item?.detail ? item?.detail : "N/A"}
                          </TableCell>
                          <TableCell>
                            {item?.files && item?.files?.length > 0 ? (
                              <div className="space-y-1">
                                {item.files.slice(0, 2).map((file) => (
                                  <div
                                    key={file.id}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <span
                                      className="text-blue-600 underline cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // viewHandle(file);
                                        handleViewDocument(file);
                                      }}
                                    >
                                      {file.file_name}
                                    </span>

                                    {/* <Trash2
          className="h-4 w-4 text-muted-foreground hover:text-red-600 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteFile(file);
          }}
        /> */}
                                  </div>
                                ))}

                                {item.files.length > 2 && (
                                  <span
                                    className="text-black-600 underline text-sm cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewClick(item);
                                    }}
                                  >
                                    More
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                ---
                              </span>
                            )}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <span>{item?.is_required == 0 ? "Optional" : "Yes"}</span>
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
                                className='cursor-pointer'
                                onClick={() => handleUploadClick(item.code)}
                              >
                                Upload
                              </Button>

                              {/* View Button */}
                              {item?.files && item?.files?.length > 0 ?
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className='cursor-pointer'
                                  onClick={() => handleViewClick(item)}
                                >
                                  View Documents
                                </Button>
                                : ''}
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
}
