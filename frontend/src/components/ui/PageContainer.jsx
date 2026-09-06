import React from 'react';
import { cn } from "@/lib/utils";

export default function PageContainer({ children, className }) {
  return (
    <div className={cn("p-6 md:p-8 w-full max-w-screen-2xl mx-auto", className)}>
      {children}
    </div>
  );
}
