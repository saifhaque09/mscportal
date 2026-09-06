import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

function Spinner({
  className,
  ...props
}) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props} />
  );
}

/**
 * Full-section/page loading placeholder — the standard replacement for a
 * bare "Loading..." Suspense fallback or route-level loading state.
 */
function PageLoader({ label = "Loading...", className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground", className)}>
      <Spinner className="size-8" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export { Spinner, PageLoader }
