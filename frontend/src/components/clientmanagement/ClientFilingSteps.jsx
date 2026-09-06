"use client";

import { Fragment } from "react";

// Client-facing view of the same filing lifecycle the accountant sees as
// draft/sent/signed/filed in FilingStatusTracker.jsx — worded from the
// client's side of each action instead of the accountant's.
const STEPS = [
  { id: 1, label: "Filing form generated" },
  { id: 2, label: "Awaiting Your Signature" },
  { id: 3, label: "Sent to Accountant" },
  { id: 4, label: "Filed with CRA" },
];

function stepForFilingStatus(status) {
  switch (status) {
    case "draft":
      return 1;
    case "sent":
      return 2;
    case "signed":
      return 3;
    case "filed":
      return 4;
    default:
      return 1;
  }
}

export default function ClientFilingSteps({ status }) {
  const activeStep = stepForFilingStatus(status);

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
