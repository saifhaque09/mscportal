"use client";

import React, { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BackLink from "@/components/global/BackLink";
import { toast } from "react-toastify";
import { getFileSizeError, MAX_UPLOAD_SIZE_MB } from "@/utils/fileSize";
import { UploadCloud, FileText, XCircle, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const YEAR_OPTIONS = [
  String(new Date().getFullYear()),
  String(new Date().getFullYear() - 1),
  String(new Date().getFullYear() - 2),
];

const Step4TaxReturnForm = ({ onBack, onUpload, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState(YEAR_OPTIONS[0]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const applyFile = (selected) => {
    if (!selected) return;

    const sizeError = getFileSizeError(selected);
    if (sizeError) {
      toast.error(sizeError);
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    if (!title) setTitle(selected.name.replace(/\.[^.]+$/, ""));
  };

  const handleFileChange = (e) => applyFile(e.target.files?.[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    applyFile(e.dataTransfer.files?.[0]);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const handleRemove = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setTitle("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) return;
    setUploading(true);
    const result = await onUpload?.(file, title.trim(), year);
    setUploading(false);
    if (result?.success) {
      handleRemove();
      onSuccess?.();
    }
  };

  const isImage = file?.type?.startsWith("image/");
  const isPdf = file?.type === "application/pdf";

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">Tax Return Form</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left — Upload */}
        <div className="relative border rounded-xl bg-card p-6 shadow-sm flex flex-col gap-6">


          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 text-center transition-colors ${dragging ? "border-foreground bg-muted" : "border-border bg-muted/30"
              }`}
          >
            <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <UploadCloud className="h-6 w-6 text-muted-foreground" />
            </div>
            <h4 className="text-lg font-bold mb-1">Attach File</h4>
            <p className="text-sm text-muted-foreground mb-1">Drag & drop files here</p>
            <p className="text-xs text-muted-foreground mb-4">Max size: {MAX_UPLOAD_SIZE_MB}MB</p>
            <p className="text-sm text-muted-foreground mb-4">or</p>
            <Button variant="outline" className="h-9 font-medium" onClick={() => inputRef.current?.click()}>
              Browse File
            </Button>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
            />
          </div>

          {/* Selected file info */}
          {file && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-5 w-5 text-red-500 shrink-0" />
                  <span className="text-sm font-semibold truncate">{file.name}</span>
                </div>
                <button className="text-red-500 hover:text-red-700 shrink-0 ml-2" onClick={handleRemove}>
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter document title"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Year</label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEAR_OPTIONS.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Right — Preview */}
        <div className="relative border rounded-xl bg-card p-6 shadow-sm flex flex-col items-center justify-center min-h-[400px]">


          {!previewUrl ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <FileText className="h-12 w-12 opacity-30" />
              <p className="text-sm">No file selected</p>
            </div>
          ) : isPdf ? (
            <iframe
              src={previewUrl}
              title="PDF Preview"
              className="w-full h-full min-h-[400px] rounded border"
            />
          ) : isImage ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-[450px] object-contain rounded border"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <FileText className="h-12 w-12 opacity-30" />
              <p className="text-sm">No preview available for this file type</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <BackLink onClick={onBack} />
        <Button className="h-9 gap-2" onClick={handleUpload} disabled={!file || !title.trim() || uploading}>
          {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </div>
    </div>
  );
};

export default Step4TaxReturnForm;
