"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getInitials, getAvatarStyle } from "./paymentsData";
import useOrganisationApi from "@/api/useOrganisationApi";

export default function ClientCombobox({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const { getAllTaxFilersUsers, taxFilerData } = useOrganisationApi();

  useEffect(() => {
    getAllTaxFilersUsers({ page: 1, resultsPerPage: 50, search });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clients = taxFilerData || [];
  const selectedClient = clients.find((c) => String(c.id) === String(value)) ?? null;

  const handleSelect = (client) => {
    onChange?.(client.id);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors outline-none",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          disabled ? "cursor-not-allowed opacity-50 bg-muted" : "cursor-pointer hover:bg-accent/50"
        )}
      >
        {selectedClient ? (
          <span className="flex items-center gap-2 truncate">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                getAvatarStyle(clients.indexOf(selectedClient))
              )}
            >
              {getInitials(selectedClient.first_name, selectedClient.last_name)}
            </span>
            <span className="truncate">
              {selectedClient.first_name} {selectedClient.last_name}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">Select Client</span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          <div className="relative border-b border-border p-2">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search by Client Name"
              className="pl-8 h-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {clients.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No clients found</p>
            ) : (
              clients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => handleSelect(client)}
                  className="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      getAvatarStyle(clients.indexOf(client))
                    )}
                  >
                    {getInitials(client.first_name, client.last_name)}
                  </span>
                  <span className="block font-medium">
                    {client.first_name} {client.last_name}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
