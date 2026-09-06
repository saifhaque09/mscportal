"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TablePagination from "../TablePagination";
// import TablePagination from "./TablePagination";
import useClientManagementApi from "@/api/useClientManagementApi";
import { Loader2, Trash, Pencil, Check, X } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { useSearchParams } from "next/navigation";
import BackLink from "@/components/global/BackLink";
import DocumentViewer from "@/components/clientmanagement/DocumentViewer";
import useDocumentApi from "@/api/useDocumentApi";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
// import useDocumentApi from "@/api/useDocumentApi";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import Toolbar from "@/components/layout/Toolbar";
import { ROUTES } from "@/config/routes";
const DocumentsFilesListing = () => {
  //   const totalRows = 100
  const [page, setPage] = useState(1);
  //   const [rowsPerPage, setRowsPerPage] = useState(10)
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const searchParams = useSearchParams();
  const documentId = searchParams.get("id");
  const [localSearch, setLocalSearch] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const { viewChecklists, getClientChecklist, viewLoader, getBusinessChecklistView, businessCheckData } = useClientManagementApi()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const { editDocumentTitle, deleteDocument,viewDocument } = useDocumentApi();

  const [deleting, setDeleting] = useState({});
  console.log(documentId, "did");
  const {
    getAllChecklistDocuments,
    documentData,
    checklistLoader,
    searchKeyword,
    setSearchKeyword,
    meta,
  } = useClientManagementApi();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const monthNameByValue = (value) => {
    const match = monthOptions.find((m) => m.value === value);
    return match ? match.full : "";
  };
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [showAllDocuments, setShowAllDocuments] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserRole(localStorage.getItem("userRole") || "");
    }
  }, []);

  const yearOptions = Array.from({ length: 5 }, (_, i) =>
    String(now.getFullYear() - i)
  );
  const monthOptions = [
    { label: "J", value: 1, full: "January" },
    { label: "F", value: 2, full: "February" },
    { label: "M", value: 3, full: "March" },
    { label: "A", value: 4, full: "April" },
    { label: "M", value: 5, full: "May" },
    { label: "J", value: 6, full: "June" },
    { label: "J", value: 7, full: "July" },
    { label: "A", value: 8, full: "August" },
    { label: "S", value: 9, full: "September" },
    { label: "O", value: 10, full: "October" },
    { label: "N", value: 11, full: "November" },
    { label: "D", value: 12, full: "December" },
  ];

  //   const totalPages = Math.ceil(totalRows / rowsPerPage)
  const handleOpenDeleteDialog = (doc) => {
    if (doc.pivot.status === "approved") {
      toast.error("Cannot delete approved documents");
      return;
    }
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  //
  useEffect(() => {
    if (documentId) {
      const resolvedFirmId =
        searchParams.get("firmId") ||
        (typeof window !== "undefined" ? localStorage.getItem("firmGuid") : "");
      if (resolvedFirmId) {
        if (showAllDocuments) {
          getBusinessChecklistView(resolvedFirmId, documentId, null, null, {
            skipDateFilter: true,
          });
        } else {
          getBusinessChecklistView(
            resolvedFirmId,
            documentId,
            selectedYear,
            selectedMonth
          );
        }
      }
      return;
    }
    getAllChecklistDocuments(searchKeyword, currentPage, rowsPerPage);
  }, [
    documentId,
    searchKeyword,
    currentPage,
    rowsPerPage,
    searchParams,
    selectedYear,
    selectedMonth,
    showAllDocuments,
  ]);
  // const fetchChecklist = useCallback(() => {
  //   getClientChecklist(currentPage, 'rows', documentId);
  // }, [firmId, currentPage, checklistId]);
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchKeyword(localSearch); // Only set search keyword after delay
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn); // Cleanup the timeout
  }, [localSearch, setSearchKeyword]);
  useEffect(() => {
    const dataSource = meta;

    console.warn(dataSource.total_results, "tin");

    if (dataSource && dataSource?.total_results) {
      setTotalPages(Math.ceil(dataSource.total_results / rowsPerPage));
    }
  }, [meta, rowsPerPage]);

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
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  const totalRows = meta?.total_results;
  const getFileType = (fileName) => {
    if (!fileName) return "N/A";
    return fileName.split(".").pop().toUpperCase();
  };
  const documentsSource = documentId
    ? (businessCheckData?.children ?? []).flatMap((child) => child.files ?? [])
    : documentData ?? [];
  const filteredDocuments = showAllDocuments
    ? documentsSource
    : documentsSource.filter((doc) => {
        if (!doc?.created_at) return true;
        const createdAt = new Date(doc.created_at);
        const matchesYear = String(createdAt.getFullYear()) === selectedYear;
        const matchesMonth = createdAt.getMonth() + 1 === selectedMonth;
        return matchesYear && matchesMonth;
      });
  const tableData = filteredDocuments;
  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };
  const name = searchParams.get("name");
  console.log(meta, "checklust");

  // const handleViewDocument = (doc) => {
  //   setSelectedDocument({
  //     uri: doc?.file_path,
  //     fileName: doc?.file_name,
  //     fileType: doc?.file_type,
  //   });
  // };
  const handleViewDocument = async(doc) => {
    await viewDocument(doc?.file_hash)
    router.push(
      `${ROUTES.documents.viewer}?uri=${encodeURIComponent(doc.file_path)}&name=${encodeURIComponent(
        doc.file_name
      )}&title=${encodeURIComponent(doc.title ?? "")}&type=${encodeURIComponent(doc.file_type)}`
    );
  };
  const handleConfirmDelete = async () => {
    if (!documentToDelete) return;

    setDeleting({ [documentToDelete.id]: true });

    const result = await deleteDocument(documentId, documentToDelete.file_hash);

    if (result) {
      const resolvedFirmId =
        searchParams.get("firmId") ||
        (typeof window !== "undefined" ? localStorage.getItem("firmGuid") : "");
      if (documentId && resolvedFirmId) {
        await getBusinessChecklistView(
          resolvedFirmId,
          documentId,
          selectedYear,
          selectedMonth
        );
      }
    }

    setDeleting({ [documentToDelete.id]: false });
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };
  const goBack = () => {
    router.back();
  }

  const handleOpenEditDialog = (doc) => {
    setDocumentToEdit(doc);
    setEditedTitle(doc.title || "");
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setDocumentToEdit(null);
    setEditedTitle("");
  };

  const handleSaveEditTitle = async () => {
    if (!documentToEdit || !editedTitle.trim()) return;

    setIsSavingTitle(true);
    try {
      const result = await editDocumentTitle(documentToEdit.file_hash, editedTitle);
      if (result) {
        // Refresh the list
        if (documentId) {
          const resolvedFirmId =
            searchParams.get("firmId") ||
            (typeof window !== "undefined" ? localStorage.getItem("firmGuid") : "");
          if (resolvedFirmId) {
            getBusinessChecklistView(
              resolvedFirmId,
              documentId,
              selectedYear,
              selectedMonth
            );
          }
        } else {
          getAllChecklistDocuments(searchKeyword, currentPage, rowsPerPage);
        }
        handleCloseEditDialog();
      }
    } catch (error) {
      console.error("Error updating title:", error);
    } finally {
      setIsSavingTitle(false);
    }
  };


// documentId present: viewing one checklist item's uploads, sourced from
// businessCheckData. Otherwise: the plain "all documents" listing, which
// was already computed (and year/month-filtered) above as tableData but
// never actually rendered — this branch was silently always empty.
const documents = documentId
  ? [
      ...(businessCheckData?.files ?? []),
      ...(businessCheckData?.children ?? []).flatMap(
        (child) => child.files ?? []
      ),
    ]
  : tableData;

  const pageTitle = documentId
    ? showAllDocuments
      ? "All Documents"
      : `Current Month (${monthNameByValue(selectedMonth)}) Documents`
    : name
      ? `${name} Documents`
      : "All Documents";

  const eyebrow = (
    <BackLink onClick={goBack} className="mb-3">
      Back
    </BackLink>
  );

  const toolbarRight = (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      {userRole !== "client" && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Pick a year</span>
          <Select
            value={selectedYear}
            onValueChange={(value) => {
              setSelectedYear(value);
              setShowAllDocuments(false);
            }}
          >
            <SelectTrigger className="h-8 w-[110px]">
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
      )}

      <div className="flex items-center gap-1">
        {monthOptions.map((month) => (
          <button
            key={month.value}
            type="button"
            className={`h-6 w-6 rounded-md border text-[11px] font-medium transition-colors ${
              selectedMonth === month.value
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
            title={month.full}
            onClick={() => {
              setSelectedMonth(month.value);
              setShowAllDocuments(false);
            }}
          >
            {month.label}
          </button>
        ))}
      </div>
      <Button
        variant="outline"
        className="h-8 px-3 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
        onClick={() => {
          setShowAllDocuments(true);
          setSelectedMonth(null);
        }}
        disabled={showAllDocuments}
      >
        Display All Documents
      </Button>
    </div>
  );

  return (
    <ListingPageLayout
      eyebrow={eyebrow}
      title={pageTitle}
      toolbar={<Toolbar right={toolbarRight} />}
    >
            {(documentId ? viewLoader : checklistLoader) ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {/* <TableHead className="w-10">
                    <Checkbox />
                  </TableHead> */}
                        <TableHead>Name</TableHead>
                        {/* <TableHead>Uploaded Date</TableHead> */}
                        <TableHead>Status</TableHead>
                        {/* <TableHead>Document</TableHead> */}
                        <TableHead>Remark</TableHead>
                        <TableHead>View</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {!(documentId ? viewLoader : checklistLoader) && documents?.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center py-8 text-sm text-muted-foreground"
                          >
                            No results found
                          </TableCell>
                        </TableRow>
                      ) : (
                        documents?.map((item, index) => (
                          <TableRow
                            key={index}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleViewDocument(item)}
                          >
                            {/* <TableCell>
                        <Checkbox />
                      </TableCell> */}

                            <TableCell className="max-w-[210px]">
                              {item?.title ?item?.title:item?.file_name}
                            </TableCell>

                            {/* <TableCell className="text-sm text-muted-foreground max-w-[320px]">
                              {formatDate(item?.updated_at ?? "N/A")}
                            </TableCell> */}

                            <TableCell>
                              <StatusBadge
                                status={item?.pivot?.status ?? "N/A"}
                              />
                            </TableCell>

                            {/* <TableCell>
                        {item?.files?.length > 0 ? (
                          <div className="flex flex-col gap-1 text-sm">
                            {item.files.map((file) => (
                              <a
                                key={file.id}
                                href={file.file_path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline truncate max-w-[220px]"
                                title={file.file_name}
                              >
                                {file.file_name}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">---</span>
                        )}
                      </TableCell> */}

                            <TableCell className="text-sm">
                              {item?.pivot?.comments ?? "N/A"}
                            </TableCell>

                            <TableCell className="" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                onClick={() => handleViewDocument(item)}
                              >
                                Viewer
                              </Button>

                            </TableCell>

                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenDeleteDialog(item)}
                                disabled={item?.pivot?.status === "approved" || deleting[item.id]}
                                className={
                                  item.pivot.status === "approved"
                                    ? "cursor-not-allowed opacity-50"
                                    : ""
                                }
                              >
                                {deleting[item.id] ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEditDialog(item)}
                                disabled={item?.pivot?.status === "approved"}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
            )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document Title</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              placeholder="Enter document title"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEditTitle();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditDialog} disabled={isSavingTitle}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditTitle} disabled={isSavingTitle || !editedTitle.trim()}>
              {isSavingTitle ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

  
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Document</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{documentToDelete?.file_name}"? This action cannot be undone and will permanently remove the document from the checklist.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={handleCancelDelete} disabled={deleting[documentToDelete?.id]}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmDelete}
                    disabled={deleting[documentToDelete?.id]}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting[documentToDelete?.id] ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

    </ListingPageLayout>
  );
};
export default DocumentsFilesListing;
