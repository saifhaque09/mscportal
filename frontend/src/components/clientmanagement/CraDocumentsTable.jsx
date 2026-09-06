"use client";

import { Loader2, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDownloadUrl } from "@/utils/documentUrl";

/**
 * Step 5's "Filed with CRA" document list. Read-only on both sides — the
 * accountant uploads through the card above it, the client only ever reads.
 * Rows are {id, doc_name, file_url, uploaded_by, uploaded_at}; unlike the
 * signed-copy list these carry no status or comment.
 */
export default function CraDocumentsTable({
  documents = [],
  loading = false,
  emptyMessage = "No CRA document uploaded yet.",
  onView,
}) {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Doc name</TableHead>
            <TableHead>Upload time</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && documents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="py-8 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              </TableCell>
            </TableRow>
          ) : documents.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="py-8 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            documents.map((doc) => {
              const downloadUrl = getDownloadUrl(doc.file_url);
              return (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium max-w-[280px] truncate">
                    {doc.doc_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {doc.uploaded_at
                      ? new Date(doc.uploaded_at).toLocaleString()
                      : "—"}
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
