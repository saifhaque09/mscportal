"use client";

import { Fragment } from "react";

// Full pipeline the Prep Account flow covers. Step 4 owns the whole tax
// return form round trip — the accountant provides the form, the client
// returns a signed copy, and the accountant reviews it — so the filing only
// leaves step 4 once it's actually been filed with CRA.
const STEPS = [
  { id: 1, label: "All Subcategory" },
  { id: 2, label: "All Documents" },
  { id: 3, label: "Code Summary" },
  { id: 4, label: "Tax Return Form" },
  { id: 5, label: "Filed with CRA" },
];

export default function PrepAccountSteps({ activeStep }) {
  return (
    <div className="flex w-full items-center mb-8 overflow-x-auto pb-2 hide-scrollbar">
      {STEPS.map((s, idx) => {
        const isActive = s.id === activeStep;
        const isCompleted = s.id < activeStep;
        return (
          <Fragment key={s.id}>
            <div
              className={`relative flex flex-1 flex-col items-start rounded-md border bg-card pl-4 pr-10 py-3 text-left ${
                isActive || isCompleted
                  ? "border-foreground"
                  : "border-input opacity-60"
              }`}
            >
              <div className="text-2xl font-bold leading-none">
                {String(s.id).padStart(2, "0")}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {s.label}
              </div>
              <span
                className={`absolute right-4 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border ${
                  isActive || isCompleted
                    ? "bg-foreground border-foreground"
                    : "bg-card border-muted-foreground"
                }`}
              />
            </div>
            {idx < STEPS.length - 1 && (
              <div className="flex flex-1 justify-center px-4">
                <div
                  className={`h-px w-full ${
                    isCompleted ? "bg-foreground" : "bg-border"
                  }`}
                />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
