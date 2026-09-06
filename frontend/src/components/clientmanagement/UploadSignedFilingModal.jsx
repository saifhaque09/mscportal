"use client";

import React, { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "react-toastify";
import useFilingApi from "@/api/useFilingApi";
import { getFileSizeError, MAX_UPLOAD_SIZE_MB } from "@/utils/fileSize";

export default function UploadSignedFilingModal({ open, onClose, filingId, onUploaded }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const { uploadSignedFiling, markFiled, loading } = useFilingApi();

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
    setConfirmationNumber("");
    onClose();
  };

  const canSubmit = !!selectedFile && !!filingId;

  const handleUpload = async () => {
    if (!canSubmit) return;

    const result = await uploadSignedFiling(filingId, selectedFile);
    if (!result) return;

    if (confirmationNumber.trim()) {
      await markFiled(filingId, confirmationNumber.trim());
    }

    onUploaded?.(result);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-[480px] p-6 gap-0">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-[17px] font-bold text-foreground">
            Upload signed filing
          </DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground mt-0.5">
            Drag the signed PDF here, or click to browse
          </DialogDescription>
        </DialogHeader>

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
            <p className="text-[13px] text-muted-foreground">PDF only, up to {MAX_UPLOAD_SIZE_MB}MB</p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="mb-2">
          <Label htmlFor="cra-confirmation" className="text-[13px] mb-1.5 block">
            CRA confirmation number (optional, add once filed)
          </Label>
          <Input
            id="cra-confirmation"
            placeholder="e.g. 2026-04519823"
            value={confirmationNumber}
            onChange={(e) => setConfirmationNumber(e.target.value)}
            className="h-9 text-sm"
          />
        </div>

        <DialogFooter className="flex flex-row justify-end gap-2 mt-4">
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
            Upload & mark filed
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
