"use client";

import { cn } from "@/lib/utils";

/**
 * Action row for a ListingPageLayout page — search/filters on the left,
 * buttons (Add/Invite/Export/etc.) on the right. Either side is optional;
 * pass whatever controls the page needs as `left`/`right`.
 */
export default function Toolbar({ left, right, className }) {
  if (!left && !right) return null;

  return (
    <div className={cn("mb-6 flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex flex-wrap items-center gap-3">{left}</div>
      <div className="flex flex-wrap items-center gap-2">{right}</div>
    </div>
  );
}
