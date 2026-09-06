"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "react-toastify";
import useFilingApi from "@/api/useFilingApi";
import useOrganisationApi from "@/api/useOrganisationApi";
import { getFileSizeError, MAX_UPLOAD_SIZE_MB } from "@/utils/fileSize";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import ClientFilingSteps from "./ClientFilingSteps";
import DocumentViewer from "@/components/clientmanagement/DocumentViewer";
import SignedDocumentsTable from "@/components/clientmanagement/SignedDocumentsTable";
import FilingFormsTable from "@/components/clientmanagement/FilingFormsTable";
import FiledWithCra from "@/components/clientmanagement/FiledWithCra";
import BackLink from "@/components/global/BackLink";
import { ROUTES } from "@/config/routes";

export default function FilingReviewSign() {
  const inputRef = useRef(null);
  const { viewOrganisation } = useOrganisationApi();
  const {
    loading,
    filingStatus,
    getLatestFiling,
    uploadSignedFiling,
    signedDocuments,
    signedDocsLoading,
    getSignedDocuments,
  } = useFilingApi();

  const [firmNumericId, setFirmNumericId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  // A filed return opens on step 4 so the client can still see the form and
  // their signed copies, with a prompt offering to move to the filed step.
  // `null` = undecided (prompt showing), "stay" = step 4, "next" = step 5.
  const [filedChoice, setFiledChoice] = useState(null);

  useEffect(() => {
    const firmGuid = localStorage.getItem("firmGuid");
    if (!firmGuid) return;

    viewOrganisation({ firmGuid }).then((result) => {
      const numericId = result?.payload?.id;
      if (numericId) {
        setFirmNumericId(numericId);
      }
    });
  }, []);

  useEffect(() => {
    if (firmNumericId) {
      getLatestFiling(firmNumericId);
    }
  }, [firmNumericId]);

  const filingIdForDocs = filingStatus?.filing?.id;

  useEffect(() => {
    if (filingIdForDocs) {
      getSignedDocuments(filingIdForDocs);
    }
  }, [filingIdForDocs]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeError = getFileSizeError(file);
    if (sizeError) {
      toast.error(sizeError);
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile || !filingStatus?.filing?.id) return;
    setSubmitting(true);
    const result = await uploadSignedFiling(filingStatus.filing.id, selectedFile);
    setSubmitting(false);

    if (result) {
      setSelectedFile(null);
      getLatestFiling(firmNumericId);
      getSignedDocuments(filingStatus.filing.id);
    }
  };

  // Opens in an in-page modal rather than navigating away, matching the
  // `<DocumentViewer documents={[selectedDocument]} />` convention used by the
  // document listing screens.
  const openDocumentViewer = (doc) => {
    // The filing's own documents use `file_name`; the signed-copy and CRA
    // listings use `doc_name`.
    setSelectedDocument({
      uri: doc.file_url ?? doc.file_path ?? "",
      fileName: doc.file_name ?? doc.doc_name,
      fileType: doc.file_type ?? "application/pdf",
      title: doc.title ?? doc.file_name ?? doc.doc_name,
    });
  };

  if (loading && !filingStatus) {
    return (
      <ListingPageLayout title="My Filing" bordered={false}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ListingPageLayout>
    );
  }

  if (!filingStatus) {
    return (
      <ListingPageLayout title="My Filing" bordered={false}>
        <p className="text-muted-foreground">There&apos;s no tax filing to review right now.</p>
      </ListingPageLayout>
    );
  }

  const { filing, documents } = filingStatus;
  // The accountant can provide more than one form; the API returns every
  // `generated` row, so list them all rather than only the newest.
  const generatedDocs = documents.filter((d) => d.document_type === "generated");
  const generatedDoc = generatedDocs[0];
  // Only a filed return closes the door on uploading. While it's merely
  // "signed" the accountant may still reject a copy, and the client needs the
  // upload box to send a corrected one.
  const isFiled = filing.status === "filed";
  // Set when the accountant chose "Provide Document Link" instead of uploading
  // the form. Field name is unconfirmed against a live response.
  const providedLink = filing.document_link ?? filing.link ?? generatedDoc?.link ?? null;
  // The accountant sends the form either as an upload or as a link, never both
  // (`formMode` on the accountant side is mutually exclusive). When they chose
  // the link there is nothing to open or save, so the table's row actions are
  // greyed out and the link is the only way through.
  const docActionsDisabled = !!providedLink;

  // Once filed, this is its own screen — the form banner and signed-copy
  // upload belong to the earlier steps and are replaced, not stacked above.
  // A filed return still lands on step 4 first (see `filedChoice`) so the form
  // and signed copies stay reachable; only an explicit choice moves on.
  if (isFiled && filedChoice === "next") {
    return (
      <ListingPageLayout
        title={`Your ${filing.year} tax filing`}
        subtitle={filing.filing_type.replace(/_/g, " ")}
        bordered={false}
        contentClassName="max-w-3xl"
        intro={<ClientFilingSteps status={filing.status} />}
      >
        <FiledWithCra
          filingId={filing.id}
          confirmationNumber={filing.cra_confirmation_number}
          readOnly
        />

        <div className="mt-6">
          <BackLink href={ROUTES.business.board}>Back to Dashboard</BackLink>
        </div>
      </ListingPageLayout>
    );
  }

  return (
    <ListingPageLayout
      title={`Review your ${filing.year} tax filing`}
      subtitle={filing.filing_type.replace(/_/g, " ")}
      bordered={false}
      contentClassName="max-w-3xl"
      intro={<ClientFilingSteps status={filing.status} />}
    >
      <div className="rounded-lg border p-4 mb-6">
        <p className="text-sm">
          Download the doc or access the link for the tax return form which your
          accountant has provided.
        </p>
        {generatedDocs.length > 0 || providedLink ? (
          <div className="mt-3">
            <FilingFormsTable
              documents={generatedDocs}
              actionsDisabled={docActionsDisabled}
              emptyMessage="Shared as a link — use the link below."
              onView={openDocumentViewer}
            />
          </div>
        ) : null}

        {providedLink && (
          <a
            href={providedLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline mt-3 break-all"
          >
            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
            {providedLink}
          </a>
        )}

        {generatedDocs.length === 0 && !providedLink && (
          <p className="text-xs text-muted-foreground italic mt-2">
            Your accountant hasn&apos;t provided the tax return form yet.
          </p>
        )}
      </div>

      {/* A filed return can't take another signed copy — the upload box is
          dropped, but the form above and the copies below stay readable. */}
      {!isFiled && (
      <div className="rounded-xl border bg-card p-6 space-y-6">
        <div>
          <Label htmlFor="signed-form-file" className="text-sm font-medium">
            Upload signed Tax return Form
          </Label>
          <div className="flex items-center gap-3 mt-1.5">
            <input
              ref={inputRef}
              id="signed-form-file"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex-1 flex items-center gap-2 h-10 px-3 rounded-md border bg-background text-sm text-left hover:border-muted-foreground/40 transition-colors"
            >
              <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className={selectedFile ? "truncate" : "text-muted-foreground"}>
                {selectedFile
                  ? selectedFile.name
                  : "Print, sign, and choose the signed PDF"}
              </span>
            </button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedFile || submitting}
              className="px-6"
            >
              {submitting ? "Uploading..." : "Upload"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Max size: {MAX_UPLOAD_SIZE_MB}MB
          </p>
        </div>
      </div>
      )}

      <div className="mt-8">
        <h3 className="text-base font-semibold mb-3">Your signed Tax return Form</h3>
        <SignedDocumentsTable
          documents={signedDocuments}
          loading={signedDocsLoading}
          emptyMessage="You haven't uploaded a signed copy yet."
          onView={openDocumentViewer}
        />
      </div>

      {isFiled && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-lg border p-4">
          <span className="text-sm text-muted-foreground">
            This filing is complete — the CRA confirmation and documents are on
            the next step.
          </span>
          <Button onClick={() => setFiledChoice("next")}>
            Go to Filed with CRA
          </Button>
        </div>
      )}

      <div className="mt-6">
        <BackLink href={ROUTES.business.board}>Back to Dashboard</BackLink>
      </div>

      <AlertDialog open={isFiled && filedChoice === null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Your tax filing is already complete</AlertDialogTitle>
            <AlertDialogDescription>
              Your {filing.year} {filing.filing_type.replace(/_/g, " ")} was filed
              with CRA
              {filing.cra_confirmation_number
                ? ` (confirmation ${filing.cra_confirmation_number})`
                : ""}
              . You can stay on this step to look back at the tax return form and
              the copies you signed, or move on to the Filed with CRA step.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFiledChoice("stay")}>
              Stay on this step
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => setFiledChoice("next")}>
              Move to next step
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!selectedDocument}
        onOpenChange={(v) => !v && setSelectedDocument(null)}
      >
        <DialogContent className="max-w-5xl w-[92vw] h-[85vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-5 py-3 border-b">
            <DialogTitle className="text-[15px] font-semibold truncate pr-8">
              {selectedDocument?.title ?? selectedDocument?.fileName ?? "Document"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            {selectedDocument && <DocumentViewer documents={[selectedDocument]} />}
          </div>
        </DialogContent>
      </Dialog>
    </ListingPageLayout>
  );
}
