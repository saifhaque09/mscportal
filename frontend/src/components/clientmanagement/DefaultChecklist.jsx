"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useDocumentApi from "@/api/useDocumentApi";
import useClientManagementApi from "@/api/useClientManagementApi";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import TablePagination from "@/app/(authenticated)/documents/TablePagination";
import { useSearchParams } from "next/navigation";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import Toolbar from "@/components/layout/Toolbar";
import { ROUTES } from "@/config/routes";
export default function DefaultChecklist() {
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Separate Dialog States
  const [addParentDialogOpen, setAddParentDialogOpen] = useState(false);
  const [addSubDialogOpen, setAddSubDialogOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Hierarchy States
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [selectedParent, setSelectedParent] = useState(null);
  const searchParams = useSearchParams();
  const firmId = searchParams.get("firmId");
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    year: "2026",
    is_required: "0",
    category: "",
    details: "",
  });

  const [yearTouched, setYearTouched] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [localSearch, setLocalSearch] = useState("");

  const {
    getAllDefaultChecklistItems,
    createDefaultChecklist,
    deleteDefaultChecklistItem,
    updateDefaultChecklistItem,
    defaultChecklistItems,
    meta,
    loading,
    checklistLoader
  } = useClientManagementApi();

  const { downloadDocument } = useDocumentApi();

  // Validate Year (Only for Parent)
  const isYearValid =
    !formData.year || (formData.year.length === 4 && /^\d+$/.test(formData.year));

  // Handle year change specifically to restrict non-numeric
  const handleYearChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 4) {
      handleFormChange("year", value);
    }
  };

  const fetchChecklist = useCallback(() => {
    getAllDefaultChecklistItems(firmId, currentPage, rowsPerPage, searchKeyword);
  }, [firmId, currentPage, rowsPerPage, searchKeyword]);

  useEffect(() => {
    if (meta?.total_results) {
      setTotalPages(Math.ceil(meta.total_results / rowsPerPage));
    }
  }, [meta, rowsPerPage]);

  useEffect(() => {
    const hasZeroChildren = defaultChecklistItems.some(item => parseInt(item.children_count) === 0);
    if (hasZeroChildren) {
      toast.warning("Some items have 0 subcategories, kindly add.");
    }
  }, [defaultChecklistItems]);

  useEffect(() => {
    fetchChecklist();
  }, [currentPage]);

  useEffect(() => {
    const delay = setTimeout(() => {
      setSearchKeyword(localSearch);
    }, 500);

    return () => clearTimeout(delay);
  }, [localSearch, setSearchKeyword]);

  // Handle Select All (Parent Items mostly)
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(checklistItems.map((item) => item.code));
    } else {
      setSelectedItems([]);
    }
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      year: "2026",
      is_required: "0",
      category: "",
      details: "",
    });
    setYearTouched(false);
  };

  // Toggle Row Expansion
  const toggleRow = (code) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpandedRows(newExpanded);
  };

  // Open Subcategory Dialog
  const openAddSubDialog = (parentItem) => {
    resetForm();
    setSelectedParent(parentItem);
    setFormData((prev) => ({ ...prev, category: parentItem.id }));
    setAddSubDialogOpen(true);
  };

  // Join Add Item (Parent or Sub)
  const handleAddItem = async () => {
    const isParent = !formData.category;

    // Validation
    if (!formData.name) {
      toast.error("Name is required");
      return;
    }
    if (isParent && (!formData.year || !isYearValid)) {
      toast.error("Valid year is required for parent categories");
      return;
    }

    try {
      const payload = { ...formData };
      await createDefaultChecklist(payload);

      setAddParentDialogOpen(false);
      setAddSubDialogOpen(false);
      resetForm();
      fetchChecklist();
    } catch (error) {
      console.error("Error adding checklist item:", error);
    }
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || "",
      year: item.year || "2026",
      is_required: (item.is_required === "1" || item.is_required === true) ? "1" : "0",
      category: item.category || "",
      details: item.details || "",
    });
    setEditDialogOpen(true);
  };
  const handleRowClick = (code, id) => {
    router.push(`${ROUTES.admin.defaultChecklistSubcategory}?id=${code}&category=${id}`);
  };

  const searchBox = (
    <Input
      placeholder="Search Category"
      className="w-64"
      value={localSearch}
      onChange={(e) => setLocalSearch(e.target.value)}
    />
  );

  const actionButtons = (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => fetchChecklist()}
        disabled={loading}
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      </Button>
      <Button onClick={() => {
        resetForm();
        setAddParentDialogOpen(true);
      }}>
        <Plus className="mr-2 h-4 w-4" />
        Add Checklist Items
      </Button>
    </>
  );

  return (
    <>
      <ListingPageLayout
        title="Create Default Checklist"
        subtitle="Default Checklist"
        toolbar={<Toolbar left={searchBox} right={actionButtons} />}
      >
              {checklistLoader ? (
                <div className="p-4 space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow >
                      <TableHead>Category Name</TableHead>
                      <TableHead >Subcategory</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {defaultChecklistItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center py-8 text-sm text-muted-foreground"
                        >
                          No results found
                        </TableCell>
                      </TableRow>
                    ) : (
                      defaultChecklistItems.map((item) => (
                        <TableRow key={item.code}
                          onClick={() => handleRowClick(item.code, item.id)}
                          className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium underline underline-offset-4">
                            {item.name}
                          </TableCell>

                          <TableCell className="font-medium">
                            {parseInt(item.children_count) === 0 ? (
                              <span className="text-red-500 font-semibold cursor-pointer">Add subcategory to the Item</span>
                            ) : (
                              item.children_count
                            )}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">

                                <DropdownMenuItem onClick={() => handleEditClick(item)}>Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setItemToDelete(item); setDeleteDialogOpen(true); }} className="text-red-600">Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}

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
      </ListingPageLayout>

      {/* Add Parent Dialog */}
      <Dialog open={addParentDialogOpen} onOpenChange={setAddParentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Document Title<span className="text-red-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                placeholder="e.g. Bank & Cash Statements"
              />
            </div>
            <div className="space-y-2">
              <Label>Select Year</Label>
              <Select value={formData.year} onValueChange={(val) => handleFormChange("year", val)}>
                <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i).map(year => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={loading} onClick={() => setAddParentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddItem} disabled={!formData.name || !formData.year || loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subcategory Dialog */}
      <Dialog open={addSubDialogOpen} onOpenChange={setAddSubDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Document To Checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Document Category</Label>
              <div className="p-2 border rounded-md bg-muted text-muted-foreground text-sm">
                {selectedParent?.name}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Document Title<span className="text-red-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                placeholder="e.g. Loan statements"
              />
            </div>
            <div className="space-y-2">
              <Label>Document Details</Label>
              <Textarea
                value={formData.details}
                onChange={(e) => handleFormChange("details", e.target.value)}
                className="h-24"
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
            <Button variant="outline" onClick={() => setAddSubDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddItem} disabled={!formData.name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Checklist Item</DialogTitle>
            <DialogDescription>Update the checklist item details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name<span className="text-red-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
              />
            </div>
            {!formData.category ? (
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={formData.year} onValueChange={(val) => handleFormChange("year", val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i).map(year => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              const result = await updateDefaultChecklistItem(editingItem.code, formData);
              if (result) {
                setEditDialogOpen(false);
                setEditingItem(null);
                resetForm();
                fetchChecklist();
              }
            }} disabled={loading}>Update</Button>
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (itemToDelete) {
                  const itemCode = itemToDelete.code || itemToDelete.id;
                  const success = await deleteDefaultChecklistItem(itemCode);
                  if (success) {
                    fetchChecklist();
                    setSelectedItems((prev) => prev.filter((id) => id !== itemToDelete.id));
                  }
                }
                setDeleteDialogOpen(false);
                setItemToDelete(null);
              }}
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
