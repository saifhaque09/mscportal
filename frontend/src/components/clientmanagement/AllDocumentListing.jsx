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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
// import TablePagination from "../TablePagination";
// import TablePagination from "./TablePagination";
import useClientManagementApi from "@/api/useClientManagementApi";
import BackLink from "@/components/global/BackLink";
import { Loader2 } from "lucide-react";
import StatusBadge from "@/app/(authenticated)/documents/documentslisting/StatusBadge";
import { useSearchParams } from "next/navigation";
import DocumentViewer from "./DocumentViewer";
import { ROUTES } from "@/config/routes";

const AllDocumentsListing = ({ firmId }) => {
  //   const totalRows = 100
  const [page, setPage] = useState(1);
  //   const [rowsPerPage, setRowsPerPage] = useState(10)
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const searchParams = useSearchParams();
  const documentId = searchParams.get("did");
  const [localSearch, setLocalSearch] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [openRemarkModal, setOpenRemarkModal] = useState(false);
  const [currentDoc, setCurrentDoc] = useState(null);
  console.log(documentId, "did");
  const {
    getAllDocuments,
    documentData,
    checklistLoader,
    searchKeyword,
    setSearchKeyword,
    meta,
    viewBusinessDocuments,
    viewDocument,
  } = useClientManagementApi();
  //   const totalPages = Math.ceil(totalRows / rowsPerPage)

  //
  useEffect(() => {
    if (documentId) {
      viewBusinessDocuments(documentId, firmId);
    } else {
      getAllDocuments(firmId);
    }
  }, [documentId, searchKeyword, currentPage, rowsPerPage, firmId]);

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
  const tableData = documentId ? viewDocument ?? [] : documentData ?? [];
  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const handleViewDocument = (doc) => {
    setSelectedDocument({
      uri: doc.file_path,
      fileName: doc.file_name,
      fileType: doc.file_type,
      title: doc.title,
    });
  };
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">All Documents</h1>
      </div>

      {selectedDocument ? (
        <div className="space-y-4">
          <BackLink onClick={() => setSelectedDocument(null)}>
            Back to List
          </BackLink>
          <DocumentViewer documents={[selectedDocument]} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {checklistLoader ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            ) : (
              <>
                {/* <div className="flex gap-3 items-center">
            <Input
              placeholder="Search Document"
              className="w-64"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
            <Button variant="outline">Status</Button>
          </div> */}

                <div className="rounded-md border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {/* <TableHead className="w-10">
                    <Checkbox />
                  </TableHead> */}
                        <TableHead>Name</TableHead>
                        <TableHead>Uploaded Date</TableHead>
                        <TableHead>Status</TableHead>
                        {/* <TableHead>Document</TableHead> */}
                        <TableHead>Remark</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {!checklistLoader && tableData.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center py-8 text-sm text-muted-foreground"
                          >
                            No results found
                          </TableCell>
                        </TableRow>
                      ) : (
                        tableData.map((item, index) => (
                          <TableRow
                            key={index}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleViewDocument(item)}
                          >
                            {/* <TableCell>
                        <Checkbox />
                      </TableCell> */}

                            <TableCell className="max-w-[210px]">
                              <div className="flex flex-col gap-1 text-sm">
                                {/* File name */}
                                <button
                                  type="button"
                                  className="text-primary underline truncate max-w-[210px] text-left"
                                  title={item.file_name}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewDocument(item);
                                  }}
                                >
                                  {item.file_name}
                                </button>

                                {/* File meta info */}
                                <div className="text-xs text-muted-foreground flex gap-2">
                                  <span>
                                    Type - {getFileType(item.file_name)}
                                  </span>

                                  <span>|</span>
                                  <span>{formatFileSize(item.file_size)}</span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="text-sm text-muted-foreground max-w-[320px]">
                              {formatDate(item?.updated_at ?? "N/A")}
                            </TableCell>

                            <TableCell>
                              <StatusBadge
                                status={item.pivot?.status ?? "N/A"}
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
                              {item.pivot?.comments ?? "N/A"}
                            </TableCell>

                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                onClick={() => handleViewDocument(item)}
                              >
                                Document Viewer
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Footer */}
                {/* <TablePagination
            totalRows={totalRows}
            page={currentPage}
            rowsPerPage={rowsPerPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          /> */}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default AllDocumentsListing;
