"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import useFilingApi from "@/api/useFilingApi";

export default function MarkFiledDialog({ open, onClose, filingId, onFiled }) {
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const { markFiled, loading } = useFilingApi();

  const handleClose = () => {
    setConfirmationNumber("");
    onClose();
  };

  const handleMarkFiled = async () => {
    const result = await markFiled(filingId, confirmationNumber.trim() || undefined);
    if (!result) return;
    onFiled?.(result);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-[420px] p-6 gap-0">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-[17px] font-bold text-foreground">
            Mark as filed
          </DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground mt-0.5">
            The signed copy is already on file — record the CRA confirmation
            once it&apos;s been filed.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-2">
          <Label htmlFor="cra-confirmation-only" className="text-[13px] mb-1.5 block">
            CRA confirmation number (optional)
          </Label>
          <Input
            id="cra-confirmation-only"
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
            onClick={handleMarkFiled}
            disabled={loading}
            className="flex items-center gap-1.5 px-5 py-2 text-[13px] font-semibold rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Mark as filed
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
