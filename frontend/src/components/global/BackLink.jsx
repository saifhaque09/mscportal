"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Standardized "Back" affordance used everywhere a page/panel needs a back
 * action — plain link styling (no button chrome), left-aligned, ArrowLeft
 * icon prepended. Replaces the mix of outline/ghost/secondary buttons and
 * literal "←" characters that used to be scattered across the app.
 *
 * Pass `href` to render as a Next.js Link (e.g. "Back to Login" on
 * unauthenticated pages) instead of a click-handled button.
 */
export default function BackLink({ href, onClick, children = "Back", className, ...props }) {
  const classes = cn(
    "inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        <ArrowLeft className="h-4 w-4 flex-shrink-0" />
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes} {...props}>
      <ArrowLeft className="h-4 w-4 flex-shrink-0" />
      {children}
    </button>
  );
}
