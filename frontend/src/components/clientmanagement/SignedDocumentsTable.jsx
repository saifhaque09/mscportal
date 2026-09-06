"use client";

import { useState } from "react";
import { Loader2, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDownloadUrl } from "@/utils/documentUrl";

export const SIGNED_DOC_STATUSES = ["pending", "approved", "rejected"];

const STATUS_STYLES = {
  approved: "text-green-600",
  rejected: "text-red-600",
  pending: "text-amber-600",
  required: "text-blue-600",
};

/**
 * The accountant's signed-copy review list. Also rendered read-only on the
 * client side so they can track where each copy they sent back has landed —
 * pass `onStatusChange` only for the reviewer.
 */
export default function SignedDocumentsTable({
  documents = [],
  loading = false,
  emptyMessage = "No signed copy uploaded yet.",
  onView,
  onStatusChange,
}) {
  const editable = typeof onStatusChange === "function";
  // Holds the status picked in each row's dropdown until "Update" is pressed,
  // so choosing one doesn't fire the API before a comment can be written.
  const [draftStatuses, setDraftStatuses] = useState({});

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Doc name</TableHead>
            <TableHead>Doc status</TableHead>
            <TableHead>Upload time</TableHead>
            <TableHead>Comment</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && documents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              </TableCell>
            </TableRow>
          ) : documents.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-8 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            documents.map((doc) => {
              const status = String(doc.status ?? "pending").toLowerCase();
              const draft = draftStatuses[doc.id] ?? status;
              const downloadUrl = getDownloadUrl(doc.file_url);
              return (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium max-w-[220px] truncate">
                    {doc.doc_name}
                  </TableCell>
                  <TableCell
                    className={`capitalize ${STATUS_STYLES[status] ?? "text-muted-foreground"}`}
                  >
                    {status}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {doc.uploaded_at
                      ? new Date(doc.uploaded_at).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {doc.comment || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        title="View"
                        aria-label={`View ${doc.doc_name}`}
                        onClick={() => onView?.(doc)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        title="Download"
                        aria-label={`Download ${doc.doc_name}`}
                        asChild
                        disabled={!downloadUrl}
                      >
                        <a href={downloadUrl ?? "#"} download={doc.doc_name}>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      {editable && (
                        <>
                          <Select
                            value={draft}
                            onValueChange={(next) =>
                              setDraftStatuses((prev) => ({ ...prev, [doc.id]: next }))
                            }
                          >
                            <SelectTrigger className="h-8 w-[120px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SIGNED_DOC_STATUSES.map((s) => (
                                <SelectItem key={s} value={s} className="capitalize">
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            onClick={() => onStatusChange(doc, draft)}
                          >
                            Update
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
