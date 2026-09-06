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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquareMore, Pencil, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, Download } from "lucide-react";
import useDocumentApi from "@/api/useDocumentApi";
import { useRouter } from "next/navigation";
import useTaxfilerApi from "@/api/useTaxfilerApi";
import BackLink from "@/components/global/BackLink";
import StatusBadge from "@/app/(authenticated)/documents/documentslisting/StatusBadge";
import { AlertDialog, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,AlertDialogDescription,AlertDialogCancel,AlertDialogAction } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import { ROUTES } from "@/config/routes";

export default function CategoryDocuments({
 id
}) {
  const {
    addDocumentRemark,
    changeDocumentStatus,
    viewDocument
  } = useDocumentApi();
  const {getCategoryDocuments,individualDocuments,editDocuments,categoryName,documentLoader,deleteDocuments}=useTaxfilerApi()
  const router = useRouter();
  const [openRemarkModal, setOpenRemarkModal] = useState(false);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState({});
  const [documentToDelete, setDocumentToDelete] = useState(null);
const [deleting, setDeleting] = useState({});
const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  useEffect(()=>{
getCategoryDocuments(id)
  },[id])
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
  //     fileHash: doc.file_hash,
  //   });
  // };

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
    const handleConfirmDelete = async () => {
    if (!documentToDelete) return;

    setDeleting({ [documentToDelete.id]: true });

    const result = await deleteDocuments(id, documentToDelete.file_hash);

    if (result) {
      await getCategoryDocuments(id);

    }

    setDeleting({ [documentToDelete.id]: false });
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

console.log(individualDocuments,'individual')
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
    const docChecklistGuid = currentDoc?.pivot?.checklist_id;

    if (!docChecklistGuid) {
      toast.error("Checklist ID missing for this document");
      setSubmitting(false);
      return;
    }

    const result = await addDocumentRemark(docChecklistGuid, fileHash, remark);

    if (result) {
      getCategoryDocuments(id);
      handleCloseRemarkModal();
    }
    setSubmitting(false);
  };
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

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
      const result = await editDocuments(id,documentToEdit.file_hash, editedTitle);
      console.log(result)
      if (result) {
        // Refresh the list
        if (id) {

      
            getCategoryDocuments(
id
            );
          
        } else {
          getCategoryDocuments(id);
        }
        handleCloseEditDialog();
      }
    } catch (error) {
      console.error("Error updating title:", error);
    } finally {
      setIsSavingTitle(false);
    }
  };
  const handleStatusChange = async (doc, newStatus) => {
    setStatusUpdating({ [doc.id]: true });

    const fileHash = doc.file_hash;
    const docChecklistGuid = doc?.pivot?.checklist_id;

    if (!docChecklistGuid) {
      toast.error("Checklist ID missing for this document");
      setStatusUpdating({ [doc.id]: false });
      return;
    }

    const result = await changeDocumentStatus(
      docChecklistGuid,
      fileHash,
      newStatus
    );

    if (result) {
      getCategoryDocuments(id);
    }

    setStatusUpdating({ [doc.id]: false });
  };

  if (documentLoader && (individualDocuments ?? []).length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
    const handleOpenDeleteDialog = (doc) => {
    if (doc?.status === "approved") {
      toast.error("Cannot delete approved documents");
      return;
    }
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleViewDocument = async(doc) => {
    console.log(doc,'doc')
    try{
      viewDocument(doc?.file_hash)
    router.push(
      ROUTES.documents.viewer + `?uri=${encodeURIComponent(doc.file_path)}&name=${encodeURIComponent(
        doc.file_name
      )}&title=${encodeURIComponent(doc.title ?? "")}&type=${encodeURIComponent(doc.file_type)}`
    );
  }catch(err){
    console.log(err)
  }
  };
  const documents = Array.isArray(individualDocuments)
    ? individualDocuments
    : (individualDocuments?.documents ?? individualDocuments?.files ?? []);
  const eyebrow = (
    <BackLink
      onClick={() => router.back()}
      className="mb-3"
    />
  );

  return (
    <ListingPageLayout
      eyebrow={eyebrow}
      title={`${categoryName?.category_name} Documents`}
      subtitle={`${documents.length} documents found`}
    >
        {/* Mobile: cards */}
        <div className="space-y-3 md:hidden">
          {documents.length === 0 ? (
            <div className="rounded-md border p-6 text-center text-muted-foreground">
              No documents found
            </div>
          ) : (
            documents.map((item, index) => (
              <div key={index} className="rounded-md border p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {item?.title ? item?.title : item?.file_name}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {item?.comments ? item?.comments : "No remark"}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={item?.status ?? "N/A"} />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button size="sm" className="flex-1" onClick={() => handleViewDocument(item)}>
                      Viewer
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleOpenEditDialog(item)}
                      disabled={item?.status === "approved"}
                    >
                      Edit title
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleOpenDeleteDialog(item)}
                      disabled={item?.status === "approved" || deleting[item.id]}
                    >
                      {deleting[item.id] ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop/tablet: table */}
        <div className="hidden rounded-md border md:block">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remark</TableHead>
                  <TableHead>View</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No documents found
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((item, index) => (
                    <TableRow
                      key={index}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewDocument(item)}
                    >
                      <TableCell className="max-w-[420px] truncate">
                        {item?.title ? item?.title : item?.file_name}
                      </TableCell>

                      <TableCell>
                        <StatusBadge status={item?.status ?? "N/A"} />
                      </TableCell>

                      <TableCell className="max-w-[420px] truncate text-sm">
                        {item?.comments ? item?.comments : "N/A"}
                      </TableCell>

                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" onClick={() => handleViewDocument(item)}>
                          Viewer
                        </Button>
                      </TableCell>

                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDeleteDialog(item)}
                          className={item?.status === "approved" ? "cursor-not-allowed opacity-50" : ""}
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
                          disabled={item?.status === "approved"}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

 {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{documentToDelete?.file_name}&quot;? This action cannot be undone and will permanently remove the document from the checklist.
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
    </ListingPageLayout>
  );
}
