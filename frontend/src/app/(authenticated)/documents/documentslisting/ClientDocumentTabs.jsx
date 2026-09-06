"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ClientDocumentTabs({
  activeTab,
  onTabChange,
}) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="h-full">
      <TabsList
        className="
          flex flex-col
          w-64
          h-24
          gap-1
          p-3
          rounded-none
          border-r
          bg-white
          mt-6
        "
      >
        <TabsTrigger
          value="checklist"
          className="
            w-full justify-start
            px-4 py-2
            text-sm font-medium
            rounded-md
            text-black
            hover:bg-muted
            data-[state=active]:bg-muted
            data-[state=active]:text-foreground
            data-[state=active]:shadow-none
          "
        >
          Document Checklists
        </TabsTrigger>

        <TabsTrigger
          value="docs"
          className="
            w-full justify-start
            px-4 py-2
            text-sm font-medium
            rounded-md
            text-black
            hover:bg-muted
            data-[state=active]:bg-muted
            data-[state=active]:text-foreground
            data-[state=active]:shadow-none
          "
        >
          Documents
        </TabsTrigger>

        <TabsTrigger
          value="users"
          className="
            w-full justify-start
            px-4 py-2
            text-sm font-medium
            rounded-md
            text-black
            hover:bg-muted
            data-[state=active]:bg-muted
            data-[state=active]:text-foreground
            data-[state=active]:shadow-none
          "
        >
          Users
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
