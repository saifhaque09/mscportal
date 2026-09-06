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
 * Step 4's list of tax return forms the accountant has provided — every
 * `document_type: "generated"` row from `filing/{id}/status`, not just the
 * newest one. Read-only on both sides: the accountant uploads through the card
 * above it, the client only ever reads.
 *
 * Rows are the filing-status document shape — {id, file_name, title, file_url,
 * created_at} — which is NOT the {doc_name, uploaded_at} shape used by
 * `CraDocumentsTable`/`SignedDocumentsTable`. That mismatch is why this is its
 * own component rather than a mode of either.
 *
 * `title` is what the accountant typed when uploading and is nullable (older
 * rows predate the required-title rule), so the file name is the fallback.
 */
export default function FilingFormsTable({
  documents = [],
  loading = false,
  emptyMessage = "No tax return form provided yet.",
  actionsDisabled = false,
  onView,
}) {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Doc name</TableHead>
            <TableHead>Provided</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && documents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              </TableCell>
            </TableRow>
          ) : documents.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="py-8 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            documents.map((doc) => {
              const downloadUrl = getDownloadUrl(doc.file_url ?? doc.file_path);
              const label = doc.title || doc.file_name || "Tax return form";
              const disabled = actionsDisabled || !downloadUrl;
              return (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium max-w-[260px] truncate">
                    {doc.title || "—"}
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate text-muted-foreground">
                    {doc.file_name || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {doc.created_at
                      ? new Date(doc.created_at).toLocaleString()
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
                        aria-label={`View ${label}`}
                        disabled={actionsDisabled}
                        onClick={() => onView?.(doc)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      {/* `disabled` on an `asChild` Button renders a plain <a>,
                          which ignores it — the disabled case needs a real
                          <button>. */}
                      {disabled ? (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          title="Download"
                          aria-label={`Download ${label}`}
                          disabled
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          title="Download"
                          aria-label={`Download ${label}`}
                          asChild
                        >
                          <a href={downloadUrl} download={doc.file_name}>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
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
