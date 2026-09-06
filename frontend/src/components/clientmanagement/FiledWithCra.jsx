"use client";

import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import useFilingApi from "@/api/useFilingApi";
import { getFileSizeError, MAX_UPLOAD_SIZE_MB } from "@/utils/fileSize";
import CraDocumentsTable from "@/components/clientmanagement/CraDocumentsTable";
import DocumentViewer from "@/components/clientmanagement/DocumentViewer";

/**
 * Step 5 ("Filed with CRA") — self-contained and rendered *instead of* the
 * step 4 UI, not below it. Owns its own filing-API instance, fetch, and
 * document viewer so neither side has to thread CRA state through.
 *
 * Accountant gets the upload card; the client passes `readOnly` and only
 * sees the list.
 */
export default function FiledWithCra({
  filingId,
  confirmationNumber,
  readOnly = false,
}) {
  const inputRef = useRef(null);
  const { uploadCraDocument, getCraDocuments, craDocuments, craDocsLoading } =
    useFilingApi();

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  useEffect(() => {
    if (filingId) getCraDocuments(filingId);
  }, [filingId]);

  const handleUpload = async () => {
    if (!file || !filingId) return;
    setUploading(true);
    const result = await uploadCraDocument(filingId, file);
    setUploading(false);
    if (result) {
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      getCraDocuments(filingId);
    }
  };

  // CRA rows carry `doc_name`, not the `file_name` the filing's own documents
  // use. Opens in-page rather than navigating away, matching the other
  // document screens.
  const openDocumentViewer = (doc) => {
    setSelectedDocument({
      uri: doc.file_url ?? doc.file_path ?? "",
      fileName: doc.doc_name,
      fileType: doc.file_type ?? "application/pdf",
      title: doc.doc_name,
    });
  };

  return (
    <>
      <div className="rounded-lg border p-4 bg-green-50 border-green-200 mb-6">
        <p className="text-sm font-medium text-green-800">Filed with CRA</p>
        {confirmationNumber ? (
          <p className="text-xs text-green-700 mt-1">
            Confirmation number: {confirmationNumber}
          </p>
        ) : null}
      </div>

      {!readOnly && (
        <div className="rounded-xl border bg-card p-6 space-y-3">
          <Label htmlFor="cra-document" className="text-sm font-medium">
            Upload CRA document
          </Label>
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              id="cra-document"
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
                setFile(selected);
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex-1 flex items-center gap-2 h-10 px-3 rounded-md border bg-background text-sm text-left hover:border-muted-foreground/40 transition-colors"
            >
              <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className={file ? "truncate" : "text-muted-foreground"}>
                {file
                  ? file.name
                  : "Choose the CRA confirmation or filed return PDF"}
              </span>
            </button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-6"
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Max size: {MAX_UPLOAD_SIZE_MB}MB
          </p>
        </div>
      )}

      <div className={readOnly ? "" : "mt-6"}>
        <h3 className="text-base font-semibold mb-3">CRA documents</h3>
        <CraDocumentsTable
          documents={craDocuments}
          loading={craDocsLoading}
          emptyMessage={
            readOnly
              ? "Your accountant hasn't uploaded any CRA documents yet."
              : "No CRA document uploaded yet."
          }
          onView={openDocumentViewer}
        />
      </div>

      <Dialog
        open={!!selectedDocument}
        onOpenChange={(v) => !v && setSelectedDocument(null)}
      >
        <DialogContent className="max-w-5xl w-[92vw] h-[85vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-5 py-3 border-b">
            <DialogTitle className="text-[15px] font-semibold truncate pr-8">
              {selectedDocument?.title ?? "Document"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            {selectedDocument && <DocumentViewer documents={[selectedDocument]} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
