"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { getFileSizeError, MAX_UPLOAD_SIZE_MB } from "@/utils/fileSize";
import MarkFiledDialog from "@/components/clientmanagement/MarkFiledDialog";
import SignedDocStatusDialog from "@/components/clientmanagement/SignedDocStatusDialog";
import SignedDocumentsTable from "@/components/clientmanagement/SignedDocumentsTable";
import FilingFormsTable from "@/components/clientmanagement/FilingFormsTable";
import FiledWithCra from "@/components/clientmanagement/FiledWithCra";
import DocumentViewer from "@/components/clientmanagement/DocumentViewer";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import PrepAccountSteps from "@/components/clientmanagement/PrepAccountSteps";
import BackLink from "@/components/global/BackLink";

// Step 4 ("Tax Return Form") owns the entire form round trip: the accountant
// provides the form, the client sends back a signed copy, and the accountant
// reviews it. Only once it's filed does the pipeline move to step 5.
function outerStepForFilingStatus(status) {
  return status === "filed" ? 5 : 4;
}

export default function FilingStatusTracker({ filingId }) {
  const router = useRouter();
  const formInputRef = useRef(null);
  const {
    loading,
    filingStatus,
    getFilingStatus,
    uploadFilingForm,
    sendFilingLink,
    signedDocuments,
    signedDocsLoading,
    getSignedDocuments,
  } = useFilingApi();
  const [markFiledOpen, setMarkFiledOpen] = useState(false);
  // An already-filed return opens on step 4 (its records live there) with a
  // prompt offering to jump to step 5. `null` = undecided, so the prompt shows;
  // "stay" keeps step 4, "next" switches to the Filed with CRA screen.
  const [filedChoice, setFiledChoice] = useState(null);
  // The accountant sends the form one way or the other, never both — the two
  // checkboxes are mutually exclusive and disable the path not chosen.
  const [formMode, setFormMode] = useState("upload");
  const [formFile, setFormFile] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formLink, setFormLink] = useState("");
  const [sendingForm, setSendingForm] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewComment, setReviewComment] = useState("");

  useEffect(() => {
    if (filingId) {
      getFilingStatus(filingId);
      getSignedDocuments(filingId);
    }
  }, [filingId]);

  const uploadMode = formMode === "upload";

  // Switching paths discards whatever was typed into the other one, so a
  // half-filled field can't linger behind a disabled control.
  const chooseMode = (mode) => {
    if (mode === formMode) return;
    setFormMode(mode);
    if (mode === "upload") {
      setFormLink("");
    } else {
      setFormFile(null);
      setFormTitle("");
    }
  };

  const refresh = () => {
    if (!filingId) return;
    getFilingStatus(filingId);
    getSignedDocuments(filingId);
  };

  const handleSendForm = async () => {
    if (!uploadMode || !formFile || !formTitle.trim()) return;
    setSendingForm(true);
    const result = await uploadFilingForm(filingId, formFile, formTitle.trim());
    setSendingForm(false);
    if (result) {
      setFormFile(null);
      setFormTitle("");
      refresh();
    }
  };

  const handleSendFormLink = async () => {
    if (uploadMode || !formLink.trim()) return;
    setSendingLink(true);
    const result = await sendFilingLink(filingId, formLink.trim());
    setSendingLink(false);
    if (result) {
      setFormLink("");
      refresh();
    }
  };

  // "Update" opens the comment modal rather than saving straight away, so a
  // rejection always carries a reason. Re-selecting the status a doc already
  // has is still allowed — that's how a comment gets added on its own.
  const openReview = (doc, status) => {
    setReviewComment(doc.comment ?? "");
    setReviewTarget({ doc, status });
  };

  // Opens in an in-page modal rather than navigating away, matching the
  // `<DocumentViewer documents={[selectedDocument]} />` convention used by the
  // document listing screens.
  const openDocumentViewer = (doc) => {
    setSelectedDocument({
      uri: doc.file_url ?? doc.file_path ?? "",
      fileName: doc.file_name ?? doc.doc_name,
      fileType: doc.file_type ?? "application/pdf",
      title: doc.title ?? doc.file_name ?? doc.doc_name,
    });
  };

  if (loading && !filingStatus) {
    return (
      <ListingPageLayout title="Filing Status" bordered={false}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ListingPageLayout>
    );
  }

  if (!filingStatus) {
    return (
      <ListingPageLayout title="Filing Status" bordered={false}>
        <p className="text-muted-foreground">Filing not found.</p>
      </ListingPageLayout>
    );
  }

  const { filing, documents } = filingStatus;
  // More than one form can be sent (a corrected version, a re-send); the API
  // returns every `generated` row, so list them all rather than only the newest.
  const generatedDocs = documents.filter((d) => d.document_type === "generated");
  const generatedDoc = generatedDocs[0];
  // Set when the form was sent as a link rather than an upload. Field name is
  // unconfirmed against a live response.
  const sentLink = filing.document_link ?? filing.link ?? generatedDoc?.link ?? null;
  const isFiled = filing.status === "filed";
  // A filed return still has records on step 4 (the form that was sent and the
  // signed copies with their statuses), so it now lands there and offers to
  // move on, rather than jumping straight past them. Step 4 is read-only in
  // that case — a filed return must not be re-sent or re-reviewed.
  const outerStep = isFiled && filedChoice !== "next" ? 4 : outerStepForFilingStatus(filing.status);
  const filedReadOnly = isFiled;

  // Once the return is filed the pipeline is on step 5, which is its own
  // screen — the form-sending card and signed-copy review belong to step 4
  // and are replaced, not stacked underneath.
  if (outerStep === 5) {
    return (
      <ListingPageLayout
        title={`${filing.year} ${filing.filing_type.replace(/_/g, " ")}`}
        subtitle={filing.firm_name}
        bordered={false}
        contentClassName="max-w-4xl"
        intro={<PrepAccountSteps activeStep={5} />}
      >
        <FiledWithCra
          filingId={filingId}
          confirmationNumber={filing.cra_confirmation_number}
        />

        <div className="mt-6 flex items-center">
          <BackLink onClick={() => router.back()} />
        </div>
      </ListingPageLayout>
    );
  }

  return (
    <ListingPageLayout
      title={`${filing.year} ${filing.filing_type.replace(/_/g, " ")}`}
      subtitle={filing.firm_name}
      bordered={false}
      contentClassName="max-w-4xl"
      intro={<PrepAccountSteps activeStep={outerStep} />}
    >
      <div className="rounded-xl border bg-card p-6 space-y-6">
        <p className="text-sm text-muted-foreground">
          {filedReadOnly
            ? "This return has been filed with CRA. The form that was sent is kept here for reference and can no longer be changed."
            : "Send the tax return form to the client — either upload the document or share a link to it."}
        </p>

        {generatedDocs.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">
              Forms sent to the client
            </h4>
            <FilingFormsTable
              documents={generatedDocs}
              onView={openDocumentViewer}
            />
          </div>
        )}

        {sentLink && (
          <div className="flex items-center gap-3 border rounded-lg p-3">
            <ExternalLink className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <a
                href={sentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:underline break-all"
              >
                {sentLink}
              </a>
              <p className="text-xs text-muted-foreground">Link shared with client</p>
            </div>
          </div>
        )}

        {!filedReadOnly && (
          <>
        <div className={uploadMode ? "space-y-3" : "space-y-3 opacity-50"}>
          <div className="flex items-center gap-2">
            <Checkbox
              id="mode-upload"
              checked={uploadMode}
              onCheckedChange={() => chooseMode("upload")}
            />
            <Label htmlFor="mode-upload" className="text-sm font-medium cursor-pointer">
              Upload Tax return Form
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={formInputRef}
              id="tax-return-form"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files?.[0] ?? null;
                const sizeError = getFileSizeError(selected);
                if (sizeError) {
                  toast.error(sizeError);
                  e.target.value = "";
                  return;
                }
                setFormFile(selected);
              }}
            />
            <button
              type="button"
              disabled={!uploadMode}
              onClick={() => formInputRef.current?.click()}
              className="flex-1 flex items-center gap-2 h-10 px-3 rounded-md border bg-background text-sm text-left hover:border-muted-foreground/40 transition-colors disabled:cursor-not-allowed disabled:hover:border-border"
            >
              <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className={formFile ? "truncate" : "text-muted-foreground"}>
                {formFile ? formFile.name : "Choose a PDF to send to the client"}
              </span>
            </button>
            <Button
              onClick={handleSendForm}
              disabled={!uploadMode || !formFile || !formTitle.trim() || sendingForm}
              className="px-6"
            >
              {sendingForm ? "Uploading..." : "Upload"}
            </Button>
          </div>
          <Input
            id="tax-return-title"
            placeholder="Document title (required)"
            value={formTitle}
            disabled={!uploadMode}
            onChange={(e) => setFormTitle(e.target.value)}
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">
            Max size: {MAX_UPLOAD_SIZE_MB}MB
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground uppercase">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className={uploadMode ? "space-y-3 opacity-50" : "space-y-3"}>
          <div className="flex items-center gap-2">
            <Checkbox
              id="mode-link"
              checked={!uploadMode}
              onCheckedChange={() => chooseMode("link")}
            />
            <Label htmlFor="mode-link" className="text-sm font-medium cursor-pointer">
              Provide Document Link
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Input
              id="tax-return-link"
              placeholder="https://..."
              value={formLink}
              disabled={uploadMode}
              onChange={(e) => setFormLink(e.target.value)}
              className="h-10"
            />
            <Button
              variant="outline"
              onClick={handleSendFormLink}
              disabled={uploadMode || !formLink.trim() || sendingLink}
              className="px-6"
            >
              {sendingLink ? "Sending..." : "Send link"}
            </Button>
          </div>
        </div>
          </>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-base font-semibold mb-3">
          Review the signed Tax return Form
        </h3>
        <SignedDocumentsTable
          documents={signedDocuments}
          loading={signedDocsLoading}
          emptyMessage="No signed copy received from the client yet."
          onView={openDocumentViewer}
          // Omitting `onStatusChange` renders the table read-only — a filed
          // return's approvals are a record and must not be re-decided.
          onStatusChange={filedReadOnly ? undefined : openReview}
        />
      </div>

      {filedReadOnly && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-lg border p-4">
          <span className="text-sm text-muted-foreground">
            This return is filed with CRA — the confirmation and CRA documents
            are on the next step.
          </span>
          <Button onClick={() => setFiledChoice("next")}>
            Go to Filed with CRA
          </Button>
        </div>
      )}

      {filing.status === "signed" && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-lg border p-4">
          <span className="text-sm text-muted-foreground">
            Signed copy received — file it with CRA, then record the confirmation number
          </span>
          <Button onClick={() => setMarkFiledOpen(true)}>Mark as filed</Button>
        </div>
      )}

      <div className="mt-6 flex items-center">
        <BackLink onClick={() => router.back()} />
      </div>

      <AlertDialog open={isFiled && filedChoice === null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>This tax filing is already complete</AlertDialogTitle>
            <AlertDialogDescription>
              The {filing.year} {filing.filing_type.replace(/_/g, " ")} for{" "}
              {filing.firm_name} was filed with CRA
              {filing.cra_confirmation_number
                ? ` (confirmation ${filing.cra_confirmation_number})`
                : ""}
              . You can stay on this step to look back at the tax return form and
              the signed copies, or move on to the Filed with CRA step.
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

      <MarkFiledDialog
        open={markFiledOpen}
        onClose={() => setMarkFiledOpen(false)}
        filingId={filingId}
        onFiled={refresh}
      />

      <SignedDocStatusDialog
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        filingId={filingId}
        doc={reviewTarget?.doc}
        status={reviewTarget?.status}
        comment={reviewComment}
        onCommentChange={setReviewComment}
        onUpdated={refresh}
      />

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
