"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import BackLink from "@/components/global/BackLink";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { X, Upload, FileText } from "lucide-react";
import { useRef } from "react";
import useClientManagementApi from "@/api/useClientManagementApi";
import { Card, CardContent } from "@/components/ui/card";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import { toast } from "react-toastify";
import { filterOversizedFiles, getFileSizeError, MAX_UPLOAD_SIZE_MB } from "@/utils/fileSize";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function UploadDocuments({ id }) {
  const [title, setTitle] = useState("");
  const [open, setOpen] = useState(true);
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const router = useRouter();
  const { uploadChecklistDocument, loading } = useClientManagementApi();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth()));
  const yearOptions = Array.from({ length: 5 }, (_, i) =>
    String(now.getFullYear() - i)
  );
  const monthOptions = [
    { label: "January", value: "1" },
    { label: "February", value: "2" },
    { label: "March", value: "3" },
    { label: "April", value: "4" },
    { label: "May", value: "5" },
    { label: "June", value: "6" },
    { label: "July", value: "7" },
    { label: "August", value: "8" },
    { label: "September", value: "9" },
    { label: "October", value: "10" },
    { label: "November", value: "11" },
    { label: "December", value: "12" },
  ];

  // Prevent navigation during upload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isUploading) {
        e.preventDefault();
        e.returnValue = "Upload in progress. Are you sure you want to leave?";
        toast.warning("Please wait for the upload to complete");
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isUploading]);

  const handleBrowse = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    handleFile(selectedFile);

    // allow re-upload of same file
    e.target.value = null;
  };

  const removeFile = (id) => {
    if (isUploading) {
      toast.error("Cannot remove file during upload");
      return;
    }

    setFiles((prev) => prev.filter((file) => file.id !== id));

    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const handleFile = (file) => {
    const sizeError = getFileSizeError(file);
    if (sizeError) {
      toast.error(sizeError);
      return;
    }

    const fileItem = {
      id: `${file.name}-${file.lastModified}`,
      file,
      name: file.name,
      progress: 0,
      status: "Inprogress",
    };

    // Replace existing file (only one allowed)
    setFiles([fileItem]);

    simulateUpload(fileItem);
  };

  const handleFiles = (fileList) => {
    const { allowed, error } = filterOversizedFiles(fileList);
    if (error) toast.error(error);

    const newFiles = allowed.map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      file,
      name: file.name,
      progress: 0,
      status: "Inprogress",
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // simulate upload progress (replace with API later)
    newFiles.forEach(simulateUpload);
  };

  const openFilePicker = () => {
    if (isUploading) {
      toast.error("Please wait for current upload to complete");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (isUploading) {
      toast.error("Please wait for current upload to complete");
      return;
    }
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const simulateUpload = (fileItem) => {
    let progress = 0;

    const interval = setInterval(() => {
      progress += 10;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileItem.id
            ? {
              ...f,
              progress,
              status: progress >= 100 ? "Completed" : "Inprogress",
            }
            : f
        )
      );

      if (progress >= 100) clearInterval(interval);
    }, 300);
  };

  const handleUpload = async () => {
    setIsUploading(true);
    toast.info("Upload in progress. Please do not refresh or navigate away.");

    try {
      for (const fileItem of files) {
        await uploadChecklistDocument(id, fileItem.file, title, selectedYear, selectedMonth);
      }
      // toast.success("Files uploaded successfully!");
      router.back();
      setOpen(false);
    } catch (error) {
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleBack = () => {
    if (isUploading) {
      toast.warning("Upload in progress. Please wait before navigating away.");
      return;
    }
    router.back();
  };
  console.log(selectedYear, selectedMonth)
  return (
    <ListingPageLayout title="Upload Files" subtitle="Kindly upload your file." bordered={false}>
      <Card className="p-4 sm:p-6 lg:p-12">
        <CardContent>
          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Select Year and Month</div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* <div className="flex items-center gap-2">
              <Label className="text-sm">Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div> */}
              <div className="flex items-center gap-2">
                <Label className="text-sm">Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-8 w-[140px]">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Left: Upload box */}
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.png,.jpeg,.gif,.mp4"
              className="hidden"
              onChange={handleBrowse}
              disabled={isUploading}
            />

            {/* Upload Box */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 min-h-[220px] sm:min-h-[280px] flex flex-col items-center justify-center text-center gap-3 bg-muted/40 ${isUploading ? "opacity-50 pointer-events-none" : ""
                }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Upload className="w-5 h-5 text-muted-foreground" />
              </div>

              <h3 className="font-semibold">Attach File</h3>
              <p className="text-xs text-muted-foreground">
                Drag & drop files here <br />
                Max size: {MAX_UPLOAD_SIZE_MB}MB, Formats: PDF , Image and Doc
              </p>

              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={openFilePicker}
                disabled={isUploading}
              >
                Browse File
              </Button>
            </div>

            {/* Right: Uploaded file list */}
            <div className="space-y-4">
              {files.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No files added yet.
                </p>
              )}

              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 border rounded-md p-3"
                >
                  <FileText className="w-5 h-5 text-red-500" />

                  <div className="flex-1">
                    <div className="text-sm font-medium truncate">
                      {file.name}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs w-10">{file.progress}%</span>

                      <Progress
                        value={file.progress}
                        className={`h-2 flex-1 ${file.status === "Completed"
                          ? "[&>div]:bg-green-500"
                          : "[&>div]:bg-yellow-500"
                          }`}
                      />

                      <span
                        className={`text-xs ${file.status === "Completed"
                          ? "text-green-600"
                          : "text-yellow-600"
                          }`}
                      >
                        {file.status}
                      </span>
                    </div>

                    <div className="text-sm font-medium truncate">
                      <Label>Add Title</Label>
                      <Input
                        className="mt-2"
                        placeholder="Enter title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex sm:justify-end">
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-red-500 hover:text-red-600 disabled:opacity-50"
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-6">
            <BackLink onClick={handleBack} disabled={isUploading} />
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || isUploading}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </ListingPageLayout>
  );
}
