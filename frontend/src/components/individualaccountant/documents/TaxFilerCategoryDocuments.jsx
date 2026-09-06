"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
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

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DownloadIcon, MessageSquareMore } from "lucide-react";
import BackLink from "@/components/global/BackLink";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, Trash } from "lucide-react";
import useDocumentApi from "@/api/useDocumentApi";
import DocumentViewer from "./DocumentViewer";
import useTaxfilerApi from "@/api/useTaxfilerApi";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import Toolbar from "@/components/layout/Toolbar";
import { ROUTES } from "@/config/routes";

export default function TaxFilerCategoryDocuments({ id, UserId, taxFilerGuid }) {
  const router = useRouter();
  const {
    loading,
    checklistDocuments,
    viewChecklistDocument,
    addDocumentRemark,
    changeDocumentStatus,
    // deleteDocument,
    viewDocument,
  } = useDocumentApi();
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [openRemarkModal, setOpenRemarkModal] = useState(false);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState({});
  const [deleting, setDeleting] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [downloadingDocs, setDownloadingDocs] = useState({});
const {gettaxFilerDocuments,individualDocuments,categoryName,documentLoader,docsLoads,deleteDocuments,addCommentDocuments,updateDocumentStatus,getDocuments,subcategoryName}=useTaxfilerApi()


  // useEffect(() => {
  //   viewChecklistDocument(checklistGuid, firmGuid);
  // }, [checklistGuid, firmGuid]);
  useEffect(() => {
    gettaxFilerDocuments(UserId,id);
  }, [ UserId,id]);
  console.log(1234)
  const getStatusBadge = (status) => {
    const variants = {
      pending: "secondary",
      approved: "default",
      reupload: "destructive",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </Badge>
    );
  };

  // const handleViewDocument = (doc) => {
  //   setSelectedDocument({
  //     uri: doc.file_path,
  //     fileName: doc.file_name,
  //     fileType: doc.file_type,
  //   });
  // };
  const handleViewDocument = async (doc) => {
    console.log(doc,'docs')
    await viewDocument(doc?.file_hash);
    router.push(
      ROUTES.documents.viewer + `?uri=${encodeURIComponent(doc.file_path)}&name=${encodeURIComponent(
        doc.file_name
      )}&title=${encodeURIComponent(doc.title ?? "")}&type=${encodeURIComponent(doc.file_type)}`
    );
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
    const result = await addCommentDocuments(
      id,
      currentDoc.file_hash,
      remark,
      UserId
    );

    if (result) {
      await gettaxFilerDocuments(UserId,id);
      handleCloseRemarkModal();
    }
    setSubmitting(false);
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
  const handleStatusChange = async (doc, newStatus) => {
    setStatusUpdating({ [doc.id]: true });

    const result = await updateDocumentStatus(
      id,
      doc.file_hash,
      newStatus,
      UserId
    );

    if (result) {
      await  gettaxFilerDocuments(UserId,id);
    }

    setStatusUpdating({ [doc.id]: false });
  };

  if (docsLoads && getDocuments.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleOpenDeleteDialog = (doc) => {
    if (doc.pivot.status === "approved") {
      toast.error("Cannot delete approved documents");
      return;
    }
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!documentToDelete) return;

    setDeleting({ [documentToDelete.id]: true });

    const result = await deleteDocuments(id, documentToDelete.file_name);

    if (result) {
      await viewChecklistDocument(checklistGuid, firmGuid);
    }

    setDeleting({ [documentToDelete.id]: false });
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };



  const documents = checklistDocuments || [];

  const backButton = (
    <BackLink onClick={() => router.back()} />
  );

  return (
    <ListingPageLayout
      title={`${subcategoryName} Documents`}
      subtitle={`${getDocuments?.length} documents found`}
      toolbar={<Toolbar right={backButton} />}
    >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Remark</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getDocuments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    No documents found
                  </TableCell>
                </TableRow>
              ) : (
                getDocuments.map((doc) => (
                  <TableRow
                    key={doc.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDocument(doc)}
                  >
                    <TableCell className="font-medium">
                      {doc?.title}
                    </TableCell>
                    <TableCell>
                      {format(new Date(doc.created_at), "dd MMM yyyy")}
                    </TableCell>
                       <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={doc?.status}
                        onValueChange={(value) =>
                          handleStatusChange(doc, value)
                        }
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
                          {doc?.comments || "No remark"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenRemarkModal(doc)}
                        >
                          <MessageSquareMore className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDocument(doc)}
                      >
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
                {currentDoc?.title??'N/A'}
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
            <Button
              variant="outline"
              onClick={handleCloseRemarkModal}
              disabled={submitting}
            >
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{documentToDelete?.title}&quot;? This action cannot be undone and will permanently remove the document from the checklist.
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
}
