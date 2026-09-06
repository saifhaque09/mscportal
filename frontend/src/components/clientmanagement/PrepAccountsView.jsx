"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Trash2,
  Search,
  Loader2,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  Check,
} from "lucide-react";
import { toast } from "react-toastify";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import useClientManagementApi from "@/api/useClientManagementApi";
import useOrganisationApi from "@/api/useOrganisationApi";
import useDocumentApi from "@/api/useDocumentApi";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import TablePagination from "@/app/(authenticated)/documents/TablePagination";
import PrepAccountSteps from "./PrepAccountSteps";
import BackLink from "@/components/global/BackLink";
import { ROUTES } from "@/config/routes";
import {
  EMPTY_CODE_ROW,
  hasCodeRowErrors,
  isCodeRowEmpty,
  toDateInputValue,
  toEditableRow,
  validateCodeRow,
} from "@/utils/subcategoryCode";

export default function PrepAccountsView() {
  const param = useSearchParams();
  const router = useRouter();
  const firmId = param.get("firmId");

  const {
    getAllChecklistItems,
    parentItems,
    checklistLoader,
    getClientChecklist,
    viewChecklists,
    viewLoader,
    listFirmCodesByChecklistItem,
    saveFirmCode,
    updateFirmCode,
    deleteFirmCode,
    firmCodes,
    firmCodesLoader,
  } = useClientManagementApi();

  const { viewOrganisation, viewOrganisationData } = useOrganisationApi();

  const { viewDocument, downloadDocument, loading: downloadLoading } =
    useDocumentApi();

  const [step, setStep] = useState(1);
  // Step 1 is a two-level drill: all checklist categories (matching the
  // checklist page's "Current Year Checklists" list) first, then the
  // selected category's own subcategories.
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchDoc, setSearchDoc] = useState("");
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear())
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [activeSubcategory, setActiveSubcategory] = useState(null);

  // Business codes have no predefined CRA taxonomy to pick from (that's an
  // individual-taxpayer concept — sub_tax_categories only holds personal tax
  // slip types like T4/T2202 and has no business-relevant rows) so entry is
  // a free-text code/value pair scoped directly to the checklist item picked
  // in Step 1.
  // Each row also carries the optional invoice detail fields the backend
  // stores alongside the code/value pair.
  const [codeValues, setCodeValues] = useState([{ ...EMPTY_CODE_ROW }]);
  // Per-row { field: message } maps, aligned by index with codeValues.
  const [codeErrors, setCodeErrors] = useState([{}]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [updating, setUpdating] = useState(false);
  const [docSearch, setDocSearch] = useState("");
  const [confirmNextOpen, setConfirmNextOpen] = useState(false);

  const firmNumericId = viewOrganisationData?.payload?.id ?? null;

  useEffect(() => {
    if (firmId) {
      getAllChecklistItems(firmId);
      viewOrganisation({ firmGuid: firmId });
    }
  }, [firmId]);

  useEffect(() => {
    if (selectedCategory?.code && firmId) {
      getClientChecklist(1, null, selectedCategory.code, firmId);
    }
  }, [selectedCategory, firmId]);

  useEffect(() => {
    if (step === 2 && firmNumericId && activeSubcategory) {
      listFirmCodesByChecklistItem(firmNumericId, activeSubcategory.id);
    }
  }, [step, firmNumericId, activeSubcategory]);

  const activeSubcategoryKey = activeSubcategory?.id ?? activeSubcategory?.code ?? null;

  const yearOptions = useMemo(
    () => [
      String(new Date().getFullYear()),
      String(new Date().getFullYear() - 1),
      String(new Date().getFullYear() - 2),
    ],
    []
  );

  // Step 1, level 1: every checklist category for this firm (mirrors the
  // checklist page's "Current Year Checklists" list), with an aggregate
  // document count across each category's own subcategories.
  const categories = parentItems ?? [];
  // Step 1, level 2: the subcategories that belong to the selected category.
  const subcategories = viewChecklists?.children ?? [];

  const currentRows = selectedCategory ? subcategories : categories;
  const rowsLoading = selectedCategory ? viewLoader : checklistLoader;

  const filteredRows = useMemo(() => {
    if (!searchDoc) return currentRows;
    const term = searchDoc.toLowerCase();
    return currentRows.filter((row) =>
      (row.name ?? "").toLowerCase().includes(term)
    );
  }, [currentRows, searchDoc]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / rowsPerPage)
  );
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleSearchChange = (value) => {
    setSearchDoc(value);
    setCurrentPage(1);
  };

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  const openCategory = (category) => {
    setSelectedCategory(category);
    setSearchDoc("");
    setCurrentPage(1);
  };

  const backToCategories = () => {
    setSelectedCategory(null);
    setSearchDoc("");
    setCurrentPage(1);
  };

  // Switching the active subcategory (via a Step 1 row click or the Step 2
  // slider) starts its code entry form and document search fresh rather
  // than carrying over unsaved input from the previous subcategory.
  const switchToSubcategory = (sub) => {
    setActiveSubcategory(sub);
    setCodeValues([{ ...EMPTY_CODE_ROW }]);
    setCodeErrors([{}]);
    setEditingId(null);
    setEditingRow(null);
    setEditErrors({});
    setDocSearch("");
  };

  const openSubcategory = (sub) => {
    switchToSubcategory(sub);
    setStep(2);
  };

  const backToSubcategories = () => {
    setStep(1);
    setActiveSubcategory(null);
  };

  // Step 2 slider: steps through every subcategory of the currently
  // selected category without leaving Step 2.
  const subcategoryIndex = subcategories.findIndex(
    (s) => (s.id ?? s.code) === activeSubcategoryKey
  );

  const goToAdjacentSubcategory = (direction) => {
    const nextIndex = subcategoryIndex + direction;
    if (subcategoryIndex === -1 || nextIndex < 0 || nextIndex >= subcategories.length) {
      return;
    }
    switchToSubcategory(subcategories[nextIndex]);
  };

  const filteredDocuments = useMemo(() => {
    const files = activeSubcategory?.files ?? [];
    if (!docSearch) return files;
    const term = docSearch.toLowerCase();
    return files.filter((doc) =>
      (doc.file_name ?? doc.title ?? "").toLowerCase().includes(term)
    );
  }, [activeSubcategory, docSearch]);

  const handleDownloadSubcategoryZip = () => {
    if (activeSubcategory?.code) downloadDocument(activeSubcategory.code);
  };

  // `firmId` keeps meaning the guid (the shared headers read it); the numeric
  // id the review step needs for `filing/start` travels as `firmNumericId`.
  const handleConfirmedNext = () => {
    setConfirmNextOpen(false);
    router.push(
      `${ROUTES.business.prepAccountsReview}?firmId=${firmId}&firmNumericId=${firmNumericId}`
    );
  };

  const openDocumentViewer = (doc) => {
    if (doc.file_hash) viewDocument(doc.file_hash);
    const url = `${ROUTES.documents.viewer}?uri=${encodeURIComponent(
      doc.file_path
    )}&name=${encodeURIComponent(
      doc.file_name ?? ""
    )}&title=${encodeURIComponent(doc.title ?? "")}&type=${encodeURIComponent(
      doc.file_type ?? ""
    )}`;
    router.push(url);
  };

  const handleDownloadAll = () => {
    if (selectedCategory?.code) downloadDocument(selectedCategory.code);
  };

  const addCodeValueRow = () => {
    setCodeValues((prev) => [...prev, { ...EMPTY_CODE_ROW }]);
    setCodeErrors((prev) => [...prev, {}]);
  };

  const removeCodeValueRow = (index) => {
    if (codeValues.length === 1) return;
    setCodeValues((prev) => prev.filter((_, i) => i !== index));
    setCodeErrors((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCodeValue = (index, field, val) => {
    setCodeValues((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: val } : row))
    );
    // Clear the field's error as soon as it's touched; it's re-checked on save.
    setCodeErrors((prev) =>
      prev.map((errors, i) => {
        if (i !== index || !errors?.[field]) return errors;
        const { [field]: _removed, ...rest } = errors;
        return rest;
      })
    );
  };

  const handleSaveCodes = async () => {
    if (!firmNumericId || !activeSubcategory) return;

    // Every field is mandatory. A trailing untouched row is dropped rather
    // than blocking the save, but at least one row must be filled in.
    const filledIndexes = codeValues
      .map((row, index) => (isCodeRowEmpty(row) ? -1 : index))
      .filter((index) => index !== -1);

    const nextErrors = codeValues.map((row, index) =>
      filledIndexes.length === 0 && index === 0
        ? validateCodeRow(row)
        : filledIndexes.includes(index)
        ? validateCodeRow(row)
        : {}
    );
    setCodeErrors(nextErrors);

    if (nextErrors.some(hasCodeRowErrors)) {
      toast.error("Please fill in all fields before saving");
      return;
    }

    const validRows = filledIndexes.map((index) => codeValues[index]);

    setSaving(true);
    // The save endpoint takes one flat record per call, so send the rows
    // sequentially and tally what the backend accepted vs. already had.
    let savedCount = 0;
    let existingCount = 0;
    let anyFailed = false;

    for (const row of validRows) {
      const result = await saveFirmCode(
        firmNumericId,
        activeSubcategory.id,
        row,
        new Date().getFullYear()
      );
      if (result) {
        savedCount += result.saved_count ?? 0;
        existingCount += result.existing_count ?? 0;
      } else {
        anyFailed = true;
      }
    }
    setSaving(false);

    if (savedCount > 0) {
      toast.success(`${savedCount} code${savedCount > 1 ? "s" : ""} saved`);
    }
    if (existingCount > 0) {
      toast.info(
        `${existingCount} code${existingCount > 1 ? "s" : ""} already existed`
      );
    }

    if (!anyFailed) {
      setCodeValues([{ ...EMPTY_CODE_ROW }]);
      setCodeErrors([{}]);
    }
    listFirmCodesByChecklistItem(firmNumericId, activeSubcategory.id);
  };

  const startEditCode = (row) => {
    setEditingId(row.id);
    setEditingRow(toEditableRow(row));
    setEditErrors({});
  };

  const cancelEditCode = () => {
    setEditingId(null);
    setEditingRow(null);
    setEditErrors({});
  };

  const updateEditingField = (field, val) => {
    setEditingRow((prev) => ({ ...prev, [field]: val }));
    setEditErrors((prev) => {
      if (!prev?.[field]) return prev;
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handleUpdateCode = async () => {
    if (!firmNumericId || !activeSubcategory || !editingRow) return;

    // Same mandatory-field rule as the add form.
    const errors = validateCodeRow(editingRow);
    setEditErrors(errors);
    if (hasCodeRowErrors(errors)) {
      toast.error("Please fill in all fields before updating");
      return;
    }

    setUpdating(true);
    const result = await updateFirmCode(
      firmNumericId,
      activeSubcategory.id,
      editingId,
      editingRow
    );
    setUpdating(false);

    if (result) {
      cancelEditCode();
      listFirmCodesByChecklistItem(firmNumericId, activeSubcategory.id);
    }
  };

  // Mandatory-field affordances shared by the add form and the inline editor.
  const errorClass = (message) =>
    message ? " border-red-500 focus-visible:ring-red-500" : "";
  const fieldError = (message) =>
    message ? <p className="text-[11px] text-red-600">{message}</p> : null;
  const requiredLabel = (text) => (
    <label className="text-xs font-medium">
      {text} <span className="text-red-600">*</span>
    </label>
  );

  const handleDeleteCode = (codeId) => {
    if (!firmNumericId) return;
    if (editingId === codeId) cancelEditCode();
    deleteFirmCode(codeId, firmNumericId);
  };

  if (checklistLoader && categories.length === 0 && !selectedCategory) {
    return (
      <ListingPageLayout title="Prep Account" bordered={false}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ListingPageLayout>
    );
  }

  const headerRow = (
    <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Prep Account - Step {step}
        </h1>
        {(selectedCategory || activeSubcategory) && (
          <p className="text-sm text-muted-foreground mt-1">
            {step === 2 ? activeSubcategory?.name : selectedCategory?.name}
          </p>
        )}
      </div>
      <div className="flex items-center gap-5 pt-1 flex-shrink-0">
        <BackLink onClick={() => router.back()}>
          Back
        </BackLink>
        <span className="text-sm font-medium text-foreground underline decoration-2 underline-offset-8">
          Prep Account
        </span>
        <button
          type="button"
          disabled={!firmNumericId}
          onClick={() =>
            router.push(
              `${ROUTES.business.prepAccountsReview}?firmId=${firmId}&firmNumericId=${firmNumericId}`
            )
          }
          className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:no-underline"
        >
          Review CRA Codes
        </button>
      </div>
    </div>
  );

  return (
    <ListingPageLayout eyebrow={headerRow} bordered={false}>
      <PrepAccountSteps activeStep={step} />

      {step === 1 && (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-lg font-semibold">
              {selectedCategory ? selectedCategory.name : "Current Year Documents"}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Pick a year
              </span>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[110px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Name"
                className="pl-8 h-9"
                value={searchDoc}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <Button
              className="gap-2"
              disabled={downloadLoading || !selectedCategory}
              onClick={handleDownloadAll}
            >
              {downloadLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download All Files
            </Button>
          </div>

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Documents</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsLoading && paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="py-8 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {selectedCategory
                        ? "No subcategories found"
                        : "No categories found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row) => (
                    <TableRow
                      key={row.id ?? row.code}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        selectedCategory ? openSubcategory(row) : openCategory(row)
                      }
                    >
                      <TableCell className="font-medium text-blue-600 hover:underline">
                        {row.name}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {selectedCategory
                          ? (row.files ?? []).length
                          : row.fileCount ?? (row.files ?? []).length}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            totalRows={filteredRows.length}
            rowsPerPage={rowsPerPage}
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={handleRowsPerPageChange}
          />

          <div className="mt-2 flex items-center justify-between">
            <BackLink onClick={() => (selectedCategory ? backToCategories() : router.back())} />
            <Button
              className="px-8"
              disabled={!firmNumericId}
              onClick={() => setConfirmNextOpen(true)}
            >
              Next
            </Button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-lg font-semibold">{selectedCategory?.name}</h2>
            <div className="flex items-center gap-2">
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Doc Name"
                  className="pl-8 h-9"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                />
              </div>
              <Button
                className="gap-2"
                disabled={downloadLoading || !activeSubcategory?.code}
                onClick={handleDownloadSubcategoryZip}
              >
                {downloadLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download Zip
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="w-full md:w-[30%]">
            {/* Slider: page through every subcategory of the selected
                category without leaving Step 2. */}
            <div className="flex items-center justify-between gap-3 rounded-t-md border border-b-0 bg-card px-4 py-3">
              <button
                type="button"
                aria-label="Previous subcategory"
                onClick={() => goToAdjacentSubcategory(-1)}
                disabled={subcategoryIndex <= 0}
                className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium text-center truncate">
                {activeSubcategory?.name}
              </span>
              <button
                type="button"
                aria-label="Next subcategory"
                onClick={() => goToAdjacentSubcategory(1)}
                disabled={
                  subcategoryIndex === -1 || subcategoryIndex >= subcategories.length - 1
                }
                className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="rounded-b-md border bg-card p-4">
            <h3 className="text-sm font-medium mb-3">Documents</h3>
            {filteredDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                {docSearch
                  ? "No documents match your search."
                  : "No documents uploaded yet."}
              </p>
            ) : (
              <div className="space-y-1">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded border"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-red-600 flex-shrink-0" />
                      <span className="text-sm truncate">
                        {doc.file_name ?? doc.title ?? "Untitled"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-shrink-0 gap-1.5"
                      onClick={() => openDocumentViewer(doc)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>

          <div className="rounded-md border bg-card p-4 w-full md:w-[70%]">
            {/* Entry form — one block per new code, matching the invoice
                detail fields the save endpoint accepts. */}
            {codeValues.map((row, index) => {
              const rowErrors = codeErrors[index] ?? {};
              return (
              <div
                key={index}
                className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 pb-4 ${
                  index > 0 ? "border-t pt-4" : ""
                }`}
              >
                <div className="space-y-1">
                  {requiredLabel("Name of vendor")}
                  <Input
                    placeholder="Enter name of vendor"
                    value={row.vendor_name}
                    onChange={(e) =>
                      updateCodeValue(index, "vendor_name", e.target.value)
                    }
                    className={`h-9 text-sm${errorClass(rowErrors.vendor_name)}`}
                  />
                  {fieldError(rowErrors.vendor_name)}
                </div>
                <div className="space-y-1">
                  {requiredLabel("Date of invoice")}
                  <Input
                    type="date"
                    value={row.invoice_date}
                    onChange={(e) =>
                      updateCodeValue(index, "invoice_date", e.target.value)
                    }
                    className={`h-9 text-sm${errorClass(
                      rowErrors.invoice_date
                    )}`}
                  />
                  {fieldError(rowErrors.invoice_date)}
                </div>
                <div className="space-y-1">
                  {requiredLabel("Invoice Number")}
                  <Input
                    placeholder="Enter Invoice Number"
                    value={row.invoice_number}
                    onChange={(e) =>
                      updateCodeValue(index, "invoice_number", e.target.value)
                    }
                    className={`h-9 text-sm${errorClass(
                      rowErrors.invoice_number
                    )}`}
                  />
                  {fieldError(rowErrors.invoice_number)}
                </div>
                <div className="space-y-1">
                  {requiredLabel("Code")}
                  <Input
                    placeholder="Enter Code"
                    value={row.code}
                    onChange={(e) =>
                      updateCodeValue(index, "code", e.target.value)
                    }
                    className={`h-9 text-sm${errorClass(rowErrors.code)}`}
                  />
                  {fieldError(rowErrors.code)}
                </div>
                <div className="space-y-1">
                  {requiredLabel("GST/HST Tax")}
                  <Input
                    placeholder="Enter GST/HST Tax"
                    value={row.gst_hst_tax}
                    onChange={(e) =>
                      updateCodeValue(index, "gst_hst_tax", e.target.value)
                    }
                    className={`h-9 text-sm${errorClass(rowErrors.gst_hst_tax)}`}
                  />
                  {fieldError(rowErrors.gst_hst_tax)}
                </div>
                <div className="space-y-1">
                  {requiredLabel("Value")}
                  <div className="flex items-center gap-1">
                    <Input
                      placeholder="Enter Value"
                      value={row.value}
                      onChange={(e) =>
                        updateCodeValue(index, "value", e.target.value)
                      }
                      className={`h-9 text-sm${errorClass(rowErrors.value)}`}
                    />
                    <button
                      type="button"
                      aria-label="Remove row"
                      onClick={() => removeCodeValueRow(index)}
                      disabled={codeValues.length === 1}
                      className="flex-shrink-0 p-1 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Add row"
                      onClick={addCodeValueRow}
                      className="flex-shrink-0 p-1 text-muted-foreground hover:text-blue-600 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {fieldError(rowErrors.value)}
                </div>
              </div>
              );
            })}

            <Button
              className="w-full"
              onClick={handleSaveCodes}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Codes"}
            </Button>

            <div className="border-t mt-4 pt-4">
              <h3 className="text-sm font-medium mb-3">Saved Codes</h3>

              {firmCodesLoader ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : firmCodes.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Invoice date</TableHead>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>GST/HST</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {firmCodes.map((row) =>
                        editingId === row.id ? (
                          <TableRow key={row.id}>
                            <TableCell className="align-top">
                              <Input
                                value={editingRow.vendor_name}
                                onChange={(e) =>
                                  updateEditingField(
                                    "vendor_name",
                                    e.target.value
                                  )
                                }
                                className={`h-8 text-sm min-w-[120px]${errorClass(
                                  editErrors.vendor_name
                                )}`}
                              />
                              {fieldError(editErrors.vendor_name)}
                            </TableCell>
                            <TableCell className="align-top">
                              <Input
                                type="date"
                                value={editingRow.invoice_date}
                                onChange={(e) =>
                                  updateEditingField(
                                    "invoice_date",
                                    e.target.value
                                  )
                                }
                                className={`h-8 text-sm min-w-[140px]${errorClass(
                                  editErrors.invoice_date
                                )}`}
                              />
                              {fieldError(editErrors.invoice_date)}
                            </TableCell>
                            <TableCell className="align-top">
                              <Input
                                value={editingRow.invoice_number}
                                onChange={(e) =>
                                  updateEditingField(
                                    "invoice_number",
                                    e.target.value
                                  )
                                }
                                className={`h-8 text-sm min-w-[110px]${errorClass(
                                  editErrors.invoice_number
                                )}`}
                              />
                              {fieldError(editErrors.invoice_number)}
                            </TableCell>
                            <TableCell className="align-top">
                              <Input
                                value={editingRow.code}
                                onChange={(e) =>
                                  updateEditingField("code", e.target.value)
                                }
                                className={`h-8 text-sm min-w-[90px]${errorClass(
                                  editErrors.code
                                )}`}
                              />
                              {fieldError(editErrors.code)}
                            </TableCell>
                            <TableCell className="align-top">
                              <Input
                                value={editingRow.gst_hst_tax}
                                onChange={(e) =>
                                  updateEditingField(
                                    "gst_hst_tax",
                                    e.target.value
                                  )
                                }
                                className={`h-8 text-sm min-w-[90px]${errorClass(
                                  editErrors.gst_hst_tax
                                )}`}
                              />
                              {fieldError(editErrors.gst_hst_tax)}
                            </TableCell>
                            <TableCell className="align-top">
                              <Input
                                value={editingRow.value}
                                onChange={(e) =>
                                  updateEditingField("value", e.target.value)
                                }
                                className={`h-8 text-sm min-w-[90px]${errorClass(
                                  editErrors.value
                                )}`}
                              />
                              {fieldError(editErrors.value)}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <button
                                type="button"
                                aria-label="Save changes"
                                onClick={handleUpdateCode}
                                disabled={updating}
                                className="p-1 text-muted-foreground hover:text-green-600 transition-colors disabled:opacity-40"
                              >
                                {updating ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                aria-label="Cancel edit"
                                onClick={cancelEditCode}
                                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ) : (
                          <TableRow key={row.id}>
                            <TableCell>{row.vendor_name ?? "—"}</TableCell>
                            <TableCell>
                              {toDateInputValue(row.invoice_date) || "—"}
                            </TableCell>
                            <TableCell>{row.invoice_number ?? "—"}</TableCell>
                            <TableCell>{row.code}</TableCell>
                            <TableCell>{row.gst_hst_tax ?? "—"}</TableCell>
                            <TableCell>{row.value}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <button
                                type="button"
                                aria-label="Edit code"
                                onClick={() => startEditCode(row)}
                                className="p-1 text-muted-foreground hover:text-blue-600 transition-colors"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                aria-label="Delete code"
                                onClick={() => handleDeleteCode(row.id)}
                                className="p-1 text-muted-foreground hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No codes saved yet for this subcategory.
                </p>
              )}
            </div>
          </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <BackLink onClick={backToSubcategories} />
            <Button
              disabled={!firmNumericId}
              onClick={() => setConfirmNextOpen(true)}
            >
              Next
            </Button>
          </div>
        </>
      )}

      <AlertDialog open={confirmNextOpen} onOpenChange={setConfirmNextOpen}>
        <AlertDialogContent>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setConfirmNextOpen(false)}
            className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-hidden"
          >
            <X className="h-4 w-4" />
          </button>
          <AlertDialogHeader>
            <AlertDialogTitle>Proceed to Code Summary?</AlertDialogTitle>
            <AlertDialogDescription>
              This will take you to the Code Summary review. Make sure
              you&apos;ve assigned code values to all categories before
              continuing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmNextOpen(false);
                if (step === 2) backToSubcategories();
              }}
            >
              {step === 2 ? "Go to Step 1" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedNext}>
              Next
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ListingPageLayout>
  );
}
