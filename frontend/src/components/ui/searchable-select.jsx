"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * A Select with a filter input pinned to the top of the dropdown — same
 * Radix Select underneath (keyboard/a11y behavior, trigger styling) as
 * every other dropdown in the app, just with client-side search added for
 * lists too long to scan (countries, provinces, phone codes).
 *
 * options: [{ value, label, searchText? }] — searchText defaults to label.
 */
export default function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  triggerClassName,
  contentClassName,
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => (o.searchText ?? o.label).toLowerCase().includes(q));
  }, [search, options]);

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      onOpenChange={(open) => {
        if (!open) setSearch("");
      }}
    >
      <SelectTrigger className={cn("w-full", triggerClassName)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={cn("min-w-[10rem]", contentClassName)}>
        <div className="flex items-center gap-2 px-2 pb-1.5 sticky top-0 bg-popover z-10">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground py-1"
          />
        </div>
        {filtered.length === 0 ? (
          <div className="px-2 py-2 text-sm text-muted-foreground">No matches</div>
        ) : (
          filtered.map((o) => (
            <SelectItem key={o.value} value={o.value} className="whitespace-nowrap">
              {o.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
