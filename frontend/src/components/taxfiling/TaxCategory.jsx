// TaxCategory.jsx
"use client";

import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useCallback } from "react";

const TAX_CATEGORIES = [
  { id: "resident", label: "Resident", description: "Lives in the country" },
  {
    id: "newcomer",
    label: "Newcomer",
    description: "Recently moved into the country",
  },
  {
    id: "nonResident",
    label: "Non-Resident",
    description: "Does not live in country",
  },
  { id: "student", label: "Student", description: "Enrolled at a school" },
  {
    id: "selfEmployed",
    label: "Self-Employed",
    description: "Works for themselves",
  },
  { id: "senior", label: "Senior", description: "65 years or old" },
];

export function TaxCategory({ selected = [], onChange }) {
  const toggleCategory = useCallback(
    (id) => {
      const next = selected.includes(id)
        ? selected.filter((v) => v !== id)
        : [...selected, id];
      onChange?.(next);
    },
    [selected, onChange]
  );

  const isSelected = (id) => selected.includes(id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-3">
        {TAX_CATEGORIES.map((cat) => (
          <Card
            key={cat.id}
            className={`flex items-start justify-between px-4 py-3 border rounded-lg cursor-pointer ${
              isSelected(cat.id)
                ? "border-black shadow-sm"
                : "border-border bg-background"
            }`}
            onClick={() => toggleCategory(cat.id)}
          >
            <div className="flex flex-1 items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={isSelected(cat.id)}
                  onCheckedChange={() => toggleCategory(cat.id)}
                  className="mr-1"
                />
                <span className="font-medium">{cat.label}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {cat.description}
              </span>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline">Update Information</Button>
        <Button>Select Checklist</Button>
      </div>
    </div>
  );
}
