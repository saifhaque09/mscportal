"use client";

import { Mail } from "lucide-react";
import AppLogo from "@/components/global/AppLogo";

const GlobalFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-border bg-background px-6 py-3">
      <AppLogo />

      <p className="flex-1 text-center text-xs text-muted-foreground">
        @{year} MSC Accountants. All rights reserved.
      </p>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="cursor-default">Support</span>
        <span className="cursor-default">Documentation</span>
        <button
          type="button"
          aria-label="Contact support"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-border hover:bg-accent transition-colors"
        >
          <Mail className="h-3.5 w-3.5" />
        </button>
      </div>
    </footer>
  );
};

export default GlobalFooter;
