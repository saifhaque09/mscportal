"use client";

import { cn } from "@/lib/utils";

/**
 * Shared page shell matching dashboard/deadlines' layout: page title,
 * optional sub-headline, an optional toolbar row (search/filters/actions),
 * then the page content. For table-listing pages (the default), content
 * renders inside a bordered/rounded container — pass the table + its
 * pagination directly, without wrapping in a Card, since this layout
 * supplies that border/background itself. Pass `bordered={false}` for
 * non-table content (dashboards, forms, tab/wizard containers) that
 * shouldn't be forced into that box.
 */
export default function ListingPageLayout({
  title,
  eyebrow,
  subtitle,
  intro,
  toolbar,
  children,
  footer,
  className,
  contentClassName,
  bordered = true,
}) {
  return (
    <div className={cn("flex-1 bg-white dark:bg-zinc-950 p-8 min-h-screen", className)}>
      <div className="max-w-6xl mx-auto">
        {eyebrow}
        {title && (
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">{title}</h1>
        )}
        {subtitle && (
          <h2 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-4">
            {subtitle}
          </h2>
        )}
        {intro}
        {toolbar}
        {bordered ? (
          <div
            className={cn(
              "border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900",
              contentClassName
            )}
          >
            {children}
          </div>
        ) : (
          <div className={contentClassName}>{children}</div>
        )}
        {footer}
      </div>
    </div>
  );
}
