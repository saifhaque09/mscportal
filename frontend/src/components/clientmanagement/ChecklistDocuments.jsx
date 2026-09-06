"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "react-toastify";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquareMore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, DownloadIcon, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { filterOversizedFiles, MAX_UPLOAD_SIZE_MB } from "@/utils/fileSize";
import BackLink from "@/components/global/BackLink";
import useDocumentApi from "@/api/useDocumentApi";
import useClientManagementApi from "@/api/useClientManagementApi";
import { useRouter } from "next/navigation";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import Toolbar from "@/components/layout/Toolbar";
import { ROUTES } from "@/config/routes";

const monthOptions = [
  { label: "Jan", value: 1, full: "January" },
  { label: "Feb", value: 2, full: "February" },
  { label: "Mar", value: 3, full: "March" },
  { label: "Apr", value: 4, full: "April" },
  { label: "May", value: 5, full: "May" },
  { label: "Jun", value: 6, full: "June" },
  { label: "Jul", value: 7, full: "July" },
  { label: "Aug", value: 8, full: "August" },
  { label: "Sep", value: 9, full: "September" },
  { label: "Oct", value: 10, full: "October" },
  { label: "Nov", value: 11, full: "November" },
  { label: "Dec", value: 12, full: "December" },
];


export default function ChecklistDocuments({
  checklistGuid,
  firmGuid,
  checklistId,
  categoryId,
}) {
  const { addDocumentRemark, changeDocumentStatus, viewDocument } = useDocumentApi();
  const { getBusinessChecklistView, businessCheckData, viewLoader, bulkUploadChecklistDocuments } =
    useClientManagementApi();
  const router = useRouter();

  const [openRemarkModal, setOpenRemarkModal] = useState(false);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState({});
  const [downloadingDocs, setDownloadingDocs] = useState({});
  const [activeTab, setActiveTab] = useState("all");
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkYear, setBulkYear] = useState("");
  const [bulkMonth, setBulkMonth] = useState("");
  const [bulkUploading, setBulkUploading] = useState(false);

  const goBack = () => {
    router.back();
  };

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const yearOptions = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i));

  useEffect(() => {
    if (!checklistGuid || !firmGuid) return;
    const month = activeTab === "all" ? null : Number(activeTab);
    getBusinessChecklistView(firmGuid, checklistGuid, selectedYear, month);
  }, [checklistGuid, firmGuid, selectedYear, activeTab]);

  const handleYearChange = (year) => {
    setSelectedYear(year);
    setActiveTab("all");
  };

  const documents = [
    ...(businessCheckData?.files ?? []),
    ...(businessCheckData?.children ?? []).flatMap((child) => child.files ?? []),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const activeTabLabel =
    activeTab === "all"
      ? "All Documents"
      : (monthOptions.find((m) => m.value === Number(activeTab))?.full ?? "") + " Documents";

  // Accountant uploads on the client's behalf. Year/month default to whatever
  // the listing is filtered to; "All" months falls back to the current month
  // since the endpoint requires a specific one.
  const handleOpenBulkModal = () => {
    setBulkFiles([]);
    setBulkYear(selectedYear);
    setBulkMonth(activeTab === "all" ? String(now.getMonth() + 1) : activeTab);
    setBulkModalOpen(true);
  };

  const handleBulkFilesSelected = (e) => {
    const { allowed, error } = filterOversizedFiles(e.target.files);
    if (error) toast.error(error);
    // Appending rather than replacing lets files be picked in several goes.
    if (allowed.length) setBulkFiles((prev) => [...prev, ...allowed]);
    e.target.value = "";
  };

  const handleRemoveBulkFile = (index) => {
    setBulkFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) {
      toast.error("Please choose at least one document");
      return;
    }
    if (!bulkYear || !bulkMonth) {
      toast.error("Please select a year and month");
      return;
    }
    setBulkUploading(true);
    try {
      const result = await bulkUploadChecklistDocuments(checklistGuid, bulkFiles, {
        year: bulkYear,
        month: bulkMonth,
      });
      if (result) {
        setBulkModalOpen(false);
        setBulkFiles([]);
        const month = activeTab === "all" ? null : Number(activeTab);
        await getBusinessChecklistView(firmGuid, checklistGuid, selectedYear, month);
      }
    } finally {
      setBulkUploading(false);
    }
  };

  const handleOpenRemarkModal = (doc) => {
    setCurrentDoc(doc);
    setRemark(doc.pivot?.comments || "");
    setOpenRemarkModal(true);
  };

  const handleCloseRemarkModal = () => {
    setOpenRemarkModal(false);
    setCurrentDoc(null);
    setRemark("");
  };

  const handleSubmitRemark = async () => {
    if (!remark.trim()) {
      toast.error("Please enter a remark");
      return;
    }
    if (!currentDoc) {
      toast.error("No document selected");
      return;
    }
    setSubmitting(true);
    const fileHash = currentDoc.file_hash;
    const docChecklistGuid = currentDoc?.pivot?.checklist_id || checklistGuid;
    await addDocumentRemark(docChecklistGuid, fileHash, remark);
    const month = activeTab === "all" ? null : Number(activeTab);
    await getBusinessChecklistView(firmGuid, checklistGuid, selectedYear, month);
    handleCloseRemarkModal();
    setSubmitting(false);
  };

  const handleStatusChange = async (doc, newStatus) => {
    setStatusUpdating({ [doc.id]: true });
    const fileHash = doc.file_hash;
    const docChecklistGuid = doc?.pivot?.checklist_id || checklistGuid;
    await changeDocumentStatus(docChecklistGuid, fileHash, newStatus);
    const month = activeTab === "all" ? null : Number(activeTab);
    await getBusinessChecklistView(firmGuid, checklistGuid, selectedYear, month);
    setStatusUpdating({ [doc.id]: false });
  };

  const handleViewDocument = async (doc) => {
    try {
      viewDocument(doc?.file_hash);
      router.push(
        `${ROUTES.documents.viewer}?uri=${encodeURIComponent(doc.file_path)}&name=${encodeURIComponent(
          doc.file_name
        )}&title=${encodeURIComponent(doc.title ?? "")}&type=${encodeURIComponent(doc.file_type)}`
      );
    } catch (err) {
      console.log(err);
    }
  };

  const downloadDocument = async (doc) => {
    setDownloadingDocs((prev) => ({ ...prev, [doc.id]: true }));
    try {
      const proxyUrl = `/api/proxy-document?url=${encodeURIComponent(doc.file_path)}&download=true`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`Proxy error: ${response.status}`);
      const blob = await response.blob();

      // file_path has no extension (signed stream URL); take extension from file_hash
      let filename = doc.file_name || "download";
      if (!/\.[^.]+$/.test(filename) && doc.file_hash) {
        const hashExt = doc.file_hash.match(/\.([a-zA-Z0-9]{1,5})$/);
        if (hashExt) filename = `${filename}.${hashExt[1]}`;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download the document. Please try again.");
    } finally {
      setDownloadingDocs((prev) => ({ ...prev, [doc.id]: false }));
    }
  };

  const eyebrow = (
    <BackLink onClick={goBack} className="mb-3">
      Back
    </BackLink>
  );

  const yearSelect = null;

  const monthTabs = (
    <div className="mb-4 flex items-center gap-2 flex-wrap">
      {/* All tab */}
      <button
          type="button"
          className={`px-4 py-1.5 rounded-md border text-sm font-medium transition-colors ${activeTab === "all"
              ? ""
              : "border-border text-muted-foreground hover:bg-accent"
            }`}
          style={
            activeTab === "all"
              ? {
                backgroundColor: "var(--btn-bg)",
                color: "var(--btn-text)",
                borderColor: "var(--btn-bg)",
              }
              : undefined
          }
          onClick={() => setActiveTab("all")}
        >
          All
        </button>

        {/* All 12 month tabs — API filters by selected month */}
        {monthOptions.map((month) => (
          <button
            key={month.value}
            type="button"
            className={`px-4 py-1.5 rounded-md border text-sm font-medium transition-colors ${
              activeTab === String(month.value)
                ? ""
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
            style={
              activeTab === String(month.value)
                ? {
                    backgroundColor: "var(--btn-bg)",
                    color: "var(--btn-text)",
                    borderColor: "var(--btn-bg)",
                  }
                : undefined
            }
            title={month.full}
            onClick={() => setActiveTab(String(month.value))}
          >
            {month.label}
          </button>
        ))}
    </div>
  );

  return (
    <ListingPageLayout
      eyebrow={eyebrow}
      title={activeTabLabel}
      subtitle={
        Object.keys(businessCheckData).length > 0
          ? businessCheckData?.name
          : `${documents.length} documents found`
      }
      toolbar={
        <Toolbar
          left={monthTabs}
          right={
            <Button onClick={handleOpenBulkModal} className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </Button>
          }
        />
      }
    >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Remark</TableHead>
              <TableHead className="text-center">Download</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {viewLoader ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading documents...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No documents found
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow
                  key={doc.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewDocument(doc)}
                >
                  <TableCell className="font-medium">
                    {doc?.title ? doc?.title : doc.file_name}
                  </TableCell>
                  <TableCell>
                    {format(new Date(doc.created_at), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={doc.pivot.status}
                      onValueChange={(value) => handleStatusChange(doc, value)}
                      disabled={statusUpdating[doc.id]}
                    >
                      <SelectTrigger className="w-[140px]">
                        {statusUpdating[doc.id] ? (
                          <div className="flex items-center">
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            <span>Updating...</span>
                          </div>
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="reupload">Reupload</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="max-w-xs" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm text-muted-foreground">
                        {doc.pivot?.comments || "No remark"}
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => handleOpenRemarkModal(doc)}>
                        <MessageSquareMore className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadDocument(doc)}
                      disabled={downloadingDocs[doc.id]}
                    >
                      {downloadingDocs[doc.id] ? (
                        <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                      ) : (
                        <DownloadIcon className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => handleViewDocument(doc)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Document Viewer
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

      <Dialog open={openRemarkModal} onOpenChange={setOpenRemarkModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentDoc?.pivot?.comments ? "Edit Remark" : "Add Remark"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="document-name">Document Name</Label>
              <div className="text-sm text-muted-foreground">
                {currentDoc?.title ?? "N/A"}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remark">Remark</Label>
              <Textarea
                id="remark"
                placeholder="Enter remark..."
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseRemarkModal} disabled={submitting}>
              Close
            </Button>
            <Button onClick={handleSubmitRemark} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Bulk Upload Documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Uploading on behalf of the client into
              <span className="font-medium text-foreground"> {businessCheckData?.name || "this subcategory"}</span>.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-year">Year</Label>
                <Select value={bulkYear} onValueChange={setBulkYear}>
                  <SelectTrigger id="bulk-year" className="w-full">
                    <SelectValue placeholder="Select year" />
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
              <div className="space-y-2">
                <Label htmlFor="bulk-month">Month</Label>
                <Select value={bulkMonth} onValueChange={setBulkMonth}>
                  <SelectTrigger id="bulk-month" className="w-full">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month.value} value={String(month.value)}>
                        {month.full}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-files">Documents</Label>
              <Input
                id="bulk-files"
                type="file"
                multiple
                onChange={handleBulkFilesSelected}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Max size: {MAX_UPLOAD_SIZE_MB}MB per file. Pick files more than once to add to the list.
              </p>
            </div>

            {bulkFiles.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto rounded-md border p-2">
                {bulkFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 cursor-pointer"
                      onClick={() => handleRemoveBulkFile(index)}
                      disabled={bulkUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkModalOpen(false)}
              disabled={bulkUploading}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkUpload}
              disabled={bulkUploading || bulkFiles.length === 0}
              className="cursor-pointer"
            >
              {bulkUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                `Upload ${bulkFiles.length || ""}`.trim()
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ListingPageLayout>
  );
}
