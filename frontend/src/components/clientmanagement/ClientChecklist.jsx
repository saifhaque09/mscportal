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
  Calendar,
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
import TablePagination from "@/app/(authenticated)/documents/TablePagination";
import { useSearchParams } from "next/navigation";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import Toolbar from "@/components/layout/Toolbar";
import { ROUTES } from "@/config/routes";
export default function ClientChecklist() {
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Separate Dialog States
  const [addParentDialogOpen, setAddParentDialogOpen] = useState(false);
  const [addSubDialogOpen, setAddSubDialogOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Import Dialog States
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [defaultItems, setDefaultItems] = useState([]);
  const [selectedDefaultItems, setSelectedDefaultItems] = useState([]);
  const [defaultItemsLoading, setDefaultItemsLoading] = useState(false);

  // Hierarchy States
  const [expandedRows, setExpandedRows] = new Set();
  const [selectedParent, setSelectedParent] = useState(null);
  const searchParams = useSearchParams();
  const firmId = searchParams.get("firmId");
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    year: "2026",
    // month: String(new Date().getMonth() + 1).padStart(2, "0"),
    is_required: "0",
    category: "",
    details: "",
  });

  const [yearTouched, setYearTouched] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [localSearch, setLocalSearch] = useState("");
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth()));
  const monthOptions = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const yearOptions = Array.from({ length: 5 }, (_, i) =>
    String(now.getFullYear() - i)
  );

  const {
    getAllChecklistItems,
    createChecklistItem,
    deleteChecklistItem,
    updateChecklistItem,
    loading,
    checklistItems,
    checklistLoader,
    meta,
    getAllDefaultChecklistItems,
    importDefaultChecklistItems,
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
    getAllChecklistItems(
      firmId,
      currentPage,
      rowsPerPage,
      searchKeyword,
      selectedYear,
      // String(Number(selectedMonth) + 1).padStart(2, "0")
    );
  }, [firmId, currentPage, rowsPerPage, searchKeyword, selectedYear, selectedMonth]);

  useEffect(() => {
    if (meta?.total_results) {
      setTotalPages(Math.ceil(meta.total_results / rowsPerPage));
    }
  }, [meta, rowsPerPage]);

  useEffect(() => {
    const hasZeroChildren = checklistItems.some(item => parseInt(item.children_count) === 0);
    if (hasZeroChildren) {
      toast.warning("Some items have 0 subcategories, kindly add.");
    }
  }, [checklistItems]);

  useEffect(() => {
    fetchChecklist();
  }, [currentPage, selectedYear, selectedMonth, searchKeyword, rowsPerPage]);

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
  const getWordCount = (value) => {
    if (!value) return 0;
    return String(value)
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  };
  const nameWordCount = getWordCount(formData.name);
  const isNameWordCountValid = nameWordCount <= 150;
  const handleRowsPerPageChange = (rows) => {
    setRowsPerPage(rows);
    setCurrentPage(1); // Reset to the first page when changing rows per page
  };
  const resetForm = () => {
    setFormData({
      name: "",
      year: "2026",
      // month: String(new Date().getMonth() + 1).padStart(2, "0"),
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
    if (!isNameWordCountValid) {
      toast.error("Document title must be 150 words or fewer");
      return;
    }
    if (isParent && (!formData.year || !isYearValid)) {
      toast.error("Valid year is required for parent categories");
      return;
    }

    try {
      const payload = { ...formData };
      await createChecklistItem(firmId, payload);

      setAddParentDialogOpen(false);
      setAddSubDialogOpen(false);
      resetForm();
      fetchChecklist();
      window.dispatchEvent(new Event("checklist-updated"));
    } catch (error) {
      console.log(12345)
      console.error("Error adding checklist item:", error);
      // setAddParentDialogOpen(true)
      // setAddSubDialogOpen(true);
    }
  };

  const normalizeMonth = (value) => {
    if (!value && value !== 0) {
      return String(new Date().getMonth() + 1).padStart(2, "0");
    }
    const raw = String(value).trim();
    if (/^\d{1,2}$/.test(raw)) {
      return raw.padStart(2, "0");
    }
    const index = monthOptions.findIndex(
      (month) => month.toLowerCase() === raw.toLowerCase()
    );
    if (index >= 0) {
      return String(index + 1).padStart(2, "0");
    }
    return String(new Date().getMonth() + 1).padStart(2, "0");
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || "",
      year: item.year ? String(item.year) : "2026",
      // month: normalizeMonth(item.month),
      is_required: (item.is_required === "1" || item.is_required === true) ? "1" : "0",
      category: item.category || "",
      details: item.details || "",
    });
    setEditDialogOpen(true);
  };
  const handleRowClick = (code, id) => {
    router.push(`${ROUTES.business.checklistSubcategory}?id=${code}&firmId=${firmId}&category=${id}`);
  };

  const handleOpenImportDialog = async () => {
    setImportDialogOpen(true);
    setDefaultItemsLoading(true);
    try {
      // Fetch default items (fetching 100 for now to cover most without pagination in modal)
      const data = await getAllDefaultChecklistItems(firmId, 1, 100, "");
      if (data) {
        setDefaultItems(data);
      }
    } catch (error) {
      console.error("Error fetching default checklist items:", error);
    } finally {
      setDefaultItemsLoading(false);
    }
  };
  console.log(formData, 'formdaa')
  const handleImportDefaultItems = async () => {
    if (selectedDefaultItems.length === 0) return;

    const result = await importDefaultChecklistItems(selectedDefaultItems, firmId, selectedYear);
    if (result) {
      setImportDialogOpen(false);
      setSelectedDefaultItems([]);
      fetchChecklist();
      window.dispatchEvent(new Event("checklist-updated"));
    }
  };


  const searchAndYear = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input
        placeholder="Search Category"
        className="w-full sm:w-64"
        value={localSearch}
        onChange={(e) => setLocalSearch(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <Label htmlFor="year">Year</Label>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="h-9 w-[130px]">
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
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

      <Button onClick={handleOpenImportDialog}>
        <Plus className="mr-2 h-4 w-4" />
        Add Default Checklist Items
      </Button>
    </>
  );

  return (
    <>
      <ListingPageLayout
        title="Document Checklists"
        subtitle={`${selectedYear} Checklist`}
        toolbar={<Toolbar left={searchAndYear} right={actionButtons} />}
      >
              {checklistLoader ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin" />
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
                    {checklistItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center py-8 text-sm text-muted-foreground"
                        >
                          No results found
                        </TableCell>
                      </TableRow>
                    ) : (
                      checklistItems.map((item) => (
                        <TableRow key={item.code}
                          onClick={() => handleRowClick(item.code, item.id)}
                          className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium underline underline-offset-4">
                            <span className="truncate">{item.name} </span>
                            {item.new_files > 0 && (
                              <span >
                                ({item.new_files})
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="font-medium">
                            {parseInt(item.children_count) === 0 ? (
                              <span className="text-destructive font-semibold cursor-pointer">Add subcategory to the Item</span>
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
                                <DropdownMenuItem onClick={() => { setItemToDelete(item); setDeleteDialogOpen(true); }} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
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
              onRowsPerPageChange={handleRowsPerPageChange}
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
              <Label>Document Title<span className="text-destructive">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                placeholder="e.g. Bank & Cash Statements"
              />
            </div>
            <div className="space-y-2">
              <Label>Select Year</Label>
              <Select value={formData.year} onValueChange={(val) => handleFormChange("year", val)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select Year" /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i).map(year => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* <div className="space-y-2">
              <Label>Select Month</Label>
              <Select value={formData.month} onValueChange={(val) => handleFormChange("month", val)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select Month" /></SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month, index) => (
                    <SelectItem key={month} value={String(index + 1).padStart(2, "0")}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div> */}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={loading} onClick={() => setAddParentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddItem} disabled={!formData.name || !formData.year || loading || !isNameWordCountValid}>Save</Button>
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
              <Label>Document Title<span className="text-destructive">*</span></Label>
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
            <Button onClick={handleAddItem} disabled={!formData.name || !isNameWordCountValid}>Save</Button>
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
              <Label>Name<span className="text-destructive">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
              />
            </div>
            {!formData.category ? (
              <>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select value={formData.year} onValueChange={(val) => handleFormChange("year", val)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i).map(year => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* <div className="space-y-2">
                  <Label>Month</Label>
                  <Select value={formData.month} onValueChange={(val) => handleFormChange("month", val)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((month, index) => (
                        <SelectItem key={month} value={String(index + 1).padStart(2, "0")}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div> */}
              </>
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
              if (!isNameWordCountValid) {
                toast.error("Name must be 150 words or fewer");
                return;
              }
              const result = await updateChecklistItem(firmId, editingItem.code, formData);
              if (result) {
                setEditDialogOpen(false);
                setEditingItem(null);
                resetForm();
                fetchChecklist();
              }
            }} disabled={loading || !isNameWordCountValid}>Update</Button>
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
                  const success = await deleteChecklistItem(firmId, itemCode);
                  if (success) {
                    fetchChecklist();
                    setSelectedItems((prev) => prev.filter((id) => id !== itemToDelete.id));
                  }
                }
                setDeleteDialogOpen(false);
                setItemToDelete(null);
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Default Checklist Items Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import Default Checklist Items</DialogTitle>
            <DialogDescription>
              Select items from the default checklist to import into this client&apos;s checklist.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto border rounded-md">
            {defaultItemsLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          defaultItems.length > 0 &&
                          selectedDefaultItems.length === defaultItems.length
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDefaultItems(defaultItems.map(item => item.code));
                          } else {
                            setSelectedDefaultItems([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Category Name</TableHead>
                    <TableHead>Subcategories</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defaultItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4">No default items found</TableCell>
                    </TableRow>
                  ) : (
                    defaultItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedDefaultItems.includes(item.code)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedDefaultItems(prev => [...prev, item.code]);
                              } else {
                                setSelectedDefaultItems(prev => prev.filter(id => id !== item.code));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.children_count}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleImportDefaultItems}
              disabled={selectedDefaultItems.length === 0 || loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import Selected ({selectedDefaultItems.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
