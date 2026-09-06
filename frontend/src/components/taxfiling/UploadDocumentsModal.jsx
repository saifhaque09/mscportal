// src/components/taxfiling/UploadDocumentsModal.jsx
"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { filterOversizedFiles, MAX_UPLOAD_SIZE_MB } from "@/utils/fileSize";

export function UploadDocumentsModal({ open, onClose, checklistRow, onSave }) {
  const [files, setFiles] = useState([]);
  const remarkRef = useRef(null);

  const handleFiles = (fileList) => {
    const { allowed, error } = filterOversizedFiles(fileList);
    if (error) toast.error(error);

    const mapped = allowed.map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      file,
      name: file.name,
      progress: 100, // mock; wire to real upload later
      status: "Completed", // "In progress", "Error"
    }));
    setFiles((prev) => [...prev, ...mapped]);
  };

  const handleBrowse = (e) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSave = () => {
    onSave({
      checklistId: checklistRow.id,
      remark: remarkRef.current?.value || "",
      files,
    });
    setFiles([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Attach documents for:{" "}
            <span className="font-medium">{checklistRow?.category}</span>
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Left: drop zone */}
          <div
            className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center gap-3 bg-muted/40"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="w-10 h-10 rounded-full border flex items-center justify-center mb-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                className="text-muted-foreground"
              >
                <path
                  d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="font-semibold">Attach File</h3>
            <p className="text-xs text-muted-foreground">
              Drag &amp; drop files here. Max {MAX_UPLOAD_SIZE_MB}MB. Formats: PDF, DOC.
            </p>
            <div className="mt-3">
              <Label
                htmlFor="fileInput"
                className="cursor-pointer inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm"
              >
                Browse File
              </Label>
              <Input
                id="fileInput"
                type="file"
                multiple
                className="hidden"
                onChange={handleBrowse}
              />
            </div>

            <div className="w-full mt-6 text-left space-y-1">
              <Label htmlFor="remark">Remark</Label>
              <Input
                id="remark"
                placeholder="Add a remark for this document category"
                ref={remarkRef}
              />
            </div>
          </div>

          {/* Right: upload list */}
          <div className="space-y-3">
            {files.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                No files added yet. Drag files here or use &quot;Browse
                File&quot;.
              </p>
            )}
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 border rounded-md px-3 py-2 text-sm"
              >
                <div className="flex-1">
                  <div className="font-medium truncate">{file.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs w-10">{file.progress}%</span>
                    <Progress value={file.progress} className="h-2 flex-1" />
                    <span className="text-xs text-emerald-600">
                      {file.status}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Upload</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
