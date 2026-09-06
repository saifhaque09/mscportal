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
import { MessageSquareMore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, Trash } from "lucide-react";
import BackLink from "@/components/global/BackLink";
import useDocumentApi from "@/api/useDocumentApi";
import DocumentViewer from "./DocumentViewer";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import { ROUTES } from "@/config/routes";

export default function ClientChecklistDocuments({ checklistGuid, firmGuid }) {
  const router = useRouter();
  const {
    loading,
    checklistDocuments,
    viewChecklistDocument,
    addDocumentRemark,
    changeDocumentStatus,
    deleteDocument,
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



  useEffect(() => {
    viewChecklistDocument(checklistGuid, firmGuid);
  }, [checklistGuid, firmGuid]);
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
    await viewDocument(doc?.file_path);
    router.push(
      `${ROUTES.documents.viewer}?uri=${encodeURIComponent(doc.file_path)}&name=${encodeURIComponent(
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
    const result = await addDocumentRemark(
      checklistGuid,
      currentDoc.file_name,
      remark
    );

    if (result) {
      await viewChecklistDocument(checklistGuid, firmGuid);
      handleCloseRemarkModal();
    }
    setSubmitting(false);
  };

  const handleStatusChange = async (doc, newStatus) => {
    setStatusUpdating({ [doc.id]: true });

    const result = await changeDocumentStatus(
      checklistGuid,
      doc.file_name,
      newStatus
    );

    if (result) {
      await viewChecklistDocument(checklistGuid, firmGuid);
    }

    setStatusUpdating({ [doc.id]: false });
  };

  if (loading && checklistDocuments.length === 0) {
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

    const result = await deleteDocument(checklistGuid, documentToDelete.file_name);

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



  const goBack = () => {
    router.back();
  };

  const documents = checklistDocuments || [];

  const eyebrow = (
    <BackLink onClick={goBack} className="mb-3" />
  );

  return (
    <ListingPageLayout
      eyebrow={eyebrow}
      title="Checklist Documents"
      subtitle={`${documents.length} documents found`}
    >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Remark</TableHead>
                <TableHead className="text-right">Action</TableHead>
                <TableHead className="text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
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
                      {doc.title}
                    </TableCell>
                    <TableCell>
                      {format(new Date(doc.created_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>{doc?.pivot?.status}</TableCell>
                    <TableCell className="max-w-xs">
                      {doc.pivot?.comments || "N/A"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDeleteDialog(doc)}
                        disabled={doc.pivot.status === "approved" || deleting[doc.id]}
                        className={
                          doc.pivot.status === "approved"
                            ? "cursor-not-allowed opacity-50"
                            : ""
                        }
                      >
                        {deleting[doc.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash className="h-4 w-4 text-destructive" />
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
}
