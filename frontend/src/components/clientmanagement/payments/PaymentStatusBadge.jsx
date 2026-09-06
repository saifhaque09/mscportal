"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  Paid: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-800",
  Cancelled: "bg-rose-100 text-rose-700",
};

function normalizeStatus(status) {
  if (!status) return status;
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export default function PaymentStatusBadge({ status, className }) {
  const normalized = normalizeStatus(status);
  return (
    <Badge
      className={cn(
        "border-transparent font-medium",
        STATUS_STYLES[normalized] ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      {normalized ?? "--"}
    </Badge>
  );
}
