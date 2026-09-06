"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Visual step indicator for a linear wizard — numbered circles connected by
 * a progress line, replacing a plain TabsList's text-only tabs. Purely
 * presentational: it still calls onStepChange(id) for the same underlying
 * Tabs/TabsContent state the caller already owns, so step-gating logic
 * (which steps are reachable yet) stays wherever it already lives.
 *
 * @param {{id: string, label: string, disabled?: boolean}[]} steps
 * @param {string} activeStep - id of the current step
 * @param {(id: string) => void} onStepChange
 */
export default function WizardSteps({ steps, activeStep, onStepChange }) {
  const activeIndex = steps.findIndex((s) => s.id === activeStep);

  return (
    <div className="w-full">
      <div className="flex items-start">
        {steps.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isCurrent = index === activeIndex;
          const isClickable = !step.disabled;

          return (
            <div key={step.id} className={cn("flex items-center", index < steps.length - 1 && "flex-1")}>
              <button
                type="button"
                onClick={() => isClickable && onStepChange(step.id)}
                disabled={!isClickable}
                className={cn(
                  "flex flex-col items-center gap-2 shrink-0",
                  isClickable ? "cursor-pointer" : "cursor-not-allowed"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary text-primary bg-primary/10",
                    !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "max-w-[7.5rem] text-center text-xs font-medium leading-tight",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </button>

              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 flex-1 rounded-full transition-colors",
                    index < activeIndex ? "bg-primary" : "bg-muted-foreground/20"
                  )}
                  style={{ marginBottom: "1.5rem" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
