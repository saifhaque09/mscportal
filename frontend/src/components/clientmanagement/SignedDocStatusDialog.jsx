"use client";

import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import useFilingApi from "@/api/useFilingApi";

const COPY = {
  approved: {
    title: "Approve signed copy",
    description: "Mark this signed document as approved. A comment is optional.",
    confirm: "Approve",
  },
  rejected: {
    title: "Reject signed copy",
    description:
      "Tell the client what's wrong with this document so they can send a corrected copy.",
    confirm: "Reject",
  },
  pending: {
    title: "Move back to pending",
    description: "Put this document back under review. A comment is optional.",
    confirm: "Set to pending",
  },
};

/**
 * Comment + status confirmation for one signed copy. Mounted unconditionally
 * and driven by `open`, matching MarkFiledDialog — and the comment is owned by
 * the parent so this stays a controlled component with no state to seed.
 */
export default function SignedDocStatusDialog({
  open,
  onClose,
  filingId,
  doc,
  status,
  comment,
  onCommentChange,
  onUpdated,
}) {
  const { updateSignedDocumentStatus, loading } = useFilingApi();

  const copy = COPY[status] ?? COPY.approved;
  // A rejection without a reason leaves the client with nothing to act on.
  const canSubmit = status !== "rejected" || (comment ?? "").trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !filingId || !doc?.id) return;
    const result = await updateSignedDocumentStatus(
      filingId,
      doc.id,
      status,
      (comment ?? "").trim()
    );
    if (!result) return;
    onUpdated?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[460px] p-6 gap-0">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-[17px] font-bold text-foreground">
            {copy.title}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground mt-0.5">
            {copy.description}
          </DialogDescription>
        </DialogHeader>

        {doc && (
          <p className="text-[13px] font-medium truncate mb-3">{doc.doc_name}</p>
        )}

        <div className="mb-2">
          <Label htmlFor="signed-doc-comment" className="text-[13px] mb-1.5 block">
            Comment{" "}
            {status === "rejected" ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-muted-foreground">(optional)</span>
            )}
          </Label>
          <Textarea
            id="signed-doc-comment"
            rows={3}
            placeholder={
              status === "rejected"
                ? "e.g. Page 3 is missing a signature"
                : "Add a note for your records"
            }
            value={comment ?? ""}
            onChange={(e) => onCommentChange(e.target.value)}
            className="text-sm resize-none"
          />
        </div>

        <DialogFooter className="flex flex-row justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2 text-[13px] font-medium border border-border rounded-lg bg-background text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className={`flex items-center gap-1.5 px-5 py-2 text-[13px] font-semibold rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${
              status === "rejected"
                ? "bg-red-600 text-white hover:opacity-90"
                : "bg-foreground text-background hover:opacity-90"
            }`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {copy.confirm}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
