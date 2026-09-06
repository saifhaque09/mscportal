"use client";

import React, { useRef, useState } from "react";
import { Upload, Download, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import useReportsApi from "@/api/useReportsApi";
import { getFileSizeError, MAX_UPLOAD_SIZE_MB } from "@/utils/fileSize";

const MODAL_CONFIG = {
  pl: {
    title: "Upload P&L",
    allowedLabel: "Allowed file type is pdf",
    accept: ".pdf",
  },
  bs: {
    title: "Upload BS",
    allowedLabel: "Allowed file type is pdf",
    accept: ".pdf",
  },
  csv: {
    title: "Upload CSV",
    allowedLabel: "Allowed file type is csv",
    accept: ".csv",
    sampleName: "Sample CSV",
    sampleLink: "#",
  },
};

export default function UploadModal({ type, open, onClose, organizationId, onUploaded }) {
  const config = MODAL_CONFIG[type];
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const { uploadProfitLossPdf, uploadBalanceSheetPdf, uploadCombinedCsv, downloadCombinedSampleCsv, loading } = useReportsApi();

  const isPl = type === "pl";
  const isBs = type === "bs";

  const applyFile = (file) => {
    if (!file) return;

    const sizeError = getFileSizeError(file);
    if (sizeError) {
      toast.error(sizeError);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    applyFile(e.dataTransfer.files?.[0]);
  };

  const handleFileChange = (e) => {
    applyFile(e.target.files?.[0]);
  };

  const handleClose = () => {
    setSelectedFile(null);
    onClose();
  };

  const canSubmit = !!selectedFile && !!organizationId;

  const handleUpload = async () => {
    if (!canSubmit) return;

    if (isPl) {
      const result = await uploadProfitLossPdf({ file: selectedFile, organizationId });

      if (result !== null) {
        onUploaded?.(result);
        handleClose();
      }
    } else if (isBs) {
      const result = await uploadBalanceSheetPdf({ file: selectedFile, organizationId });

      if (result !== null) {
        onUploaded?.(result);
        handleClose();
      }
    } else if (type === "csv") {
      const result = await uploadCombinedCsv({ file: selectedFile, organizationId });

      if (result !== null) {
        onUploaded?.(result);
        handleClose();
      }
    }
  };

  const handleDownloadSample = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === "csv") {
      await downloadCombinedSampleCsv();
    } else if (config.sampleLink && config.sampleLink !== "#") {
      window.open(config.sampleLink, "_blank");
    }
  };

  if (!config) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-[480px] p-6 gap-0">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-[17px] font-bold text-foreground">
            Upload Files
          </DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground mt-0.5">
            Drag and drop files here or click to select files
          </DialogDescription>
        </DialogHeader>

        {/* Drop Zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg py-8 px-4 cursor-pointer transition-colors mb-4 ${dragging
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-muted-foreground/40"
            }`}
        >
          <Upload className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
          {selectedFile ? (
            <p className="text-[13px] text-foreground font-medium">{selectedFile.name}</p>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              {config.allowedLabel}. Max size: {MAX_UPLOAD_SIZE_MB}MB
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={config.accept}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Sample File Row */}
        {config.sampleName && (
          <div className="flex items-start gap-3 border border-border rounded-lg p-4 mb-6">
            <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center border border-border rounded-md bg-muted">
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-foreground">{config.sampleName}</span>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  disabled={loading}
                  className="flex items-center gap-1 text-[13px] font-medium text-[#3B9D82] hover:underline bg-transparent border-0 p-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Download {config.sampleName}
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[12px] text-muted-foreground leading-snug">
                Use the sample file as a reference for the required format.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-row justify-end gap-2">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-5 py-2 text-[13px] font-medium border border-border rounded-lg bg-background text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!canSubmit || loading}
            className="flex items-center gap-1.5 px-5 py-2 text-[13px] font-semibold rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Upload
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
