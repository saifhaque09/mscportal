"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import BackLink from "@/components/global/BackLink";

const TAX_CATEGORIES = [
  { id: "resident", title: "Resident", description: "Lives in Canada" },
  { id: "non-resident", title: "Non-Resident", description: "Lives outside Canada; files only on Canadian income." },
  { id: "newcomer", title: "Newcomer", description: "Recently moved to Canada; first-year residency rules apply" },
  { id: "student", title: "Student", description: "Canadian or international student; may claim tuition and education amounts" },
  { id: "self-employed", title: "Self-Employed", description: "Works for self; must report business income and expenses." },
  { id: "senior", title: "Senior", description: "Age 65+; may claim pension income and age credit." },
  { id: "deceased", title: "Deceased Taxpayer", description: "Final return handled by legal representative or executor" },
  { id: "indigenous", title: "Indigenous Person", description: "May have tax-exempt income under specific conditions (e.g., work on reserve)" },
  { id: "investor", title: "Investor", description: "Earns investment income such as dividends, interest, or capital gains." },
  { id: "part-year", title: "Part-Year Resident", description: "Lived in Canada for part of the year; partial residency rules apply." },
  { id: "quebec", title: "Quebec", description: "For Quebec residents (provincial equivalents)" },
  { id: "tradesperson", title: "Tradesperson and Professional", description: "For tradespersons" },
  { id: "northern", title: "Northern resident", description: "Northern Residents Deductions" },
  { id: "eirrsp", title: "EI/RRSP Withdraw", description: "--" },
  { id: "profession", title: "Profession or Union", description: "--" },
];

export default function TaxCategory() {
  const router = useRouter();
  const [selectedCategories, setSelectedCategories] = useState([]);

  const toggleCategory = (id) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    console.log("Selected Categories:", selectedCategories);
    // Add save logic here
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <div className="space-y-3">
        {TAX_CATEGORIES.map((category) => {
          const isSelected = selectedCategories.includes(category.id);
          return (
            <div
              key={category.id}
              className={`flex items-center justify-between p-4 rounded-md border cursor-pointer transition-colors ${
                isSelected ? "border-black bg-gray-50/50" : "border-gray-200 bg-white hover:bg-gray-50/30"
              }`}
              onClick={() => toggleCategory(category.id)}
            >
              <div className="flex items-center gap-4 flex-1">
                <Checkbox
                  id={category.id}
                  checked={isSelected}
                  onCheckedChange={() => toggleCategory(category.id)}
                  // Prevent the double toggle when clicking the checkbox itself as the parent div also has an onClick
                  onClick={(e) => e.stopPropagation()}
                />
                <label
                  htmlFor={category.id}
                  className="text-sm font-medium leading-none cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {category.title}
                </label>
              </div>
              <div className="text-sm text-gray-500 text-right flex-1 select-none">
                {category.description}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4 pb-8">
        <BackLink onClick={() => router.back()} />
        <Button onClick={handleSave} className="bg-black text-white hover:bg-black/90">
          Save
        </Button>
      </div>
    </div>
  );
}
