"use client";

import AllClientsTable from "@/components/createorganisation/AllOrganisationTable";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, FilePlusCorner, FileText, Users } from "lucide-react";
// import ClientTabs from "../clientmanagement/clientdashboard/page";

import DocumentListing from "@/app/(authenticated)/documents/documentslisting/DocumentListing";
import { Button } from "@/components/ui/button";
import useClientManagementApi from "@/api/useClientManagementApi";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";


import ViewChecklist from "@/components/clientmanagement/ViewClientChecklist";
export default function DashboardPage() {
  // const {
  //   getAllChecklistItems,
  //   checklistItems,
  //   meta,
  //   getAllChecklistDocuments,
  //   documentMeta,
  //   getAllBusinessUsers,
  //   userMeta,
  //   parentItems,
  // } = useClientManagementApi();
  // useEffect(() => {

  //   getAllChecklistItems();
  //   getAllChecklistDocuments();
  //   getAllBusinessUsers();

  // }, []);



  return (
    <ProtectedRoute allowedRoles={["client","employee"]}>
      <div>

        <div>

          <ViewChecklist />
        </div>
      </div>
    </ProtectedRoute>
  );
}
