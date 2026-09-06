"use client";

import ChecklistDocuments from "@/components/clientmanagement/ChecklistDocuments";
import ProtectedRoute from "@/components/ProtectedRoute";
import React, { useEffect,useState } from "react";
import { useSearchParams } from "next/navigation";
import ClientChecklistDocuments from "@/components/clientmanagement/ClientChecklistDocuments";
import ClientAllDocumentListing from "@/components/individualclient/documents/AllDocumentsListings";
// import ClientAllD
import { Suspense } from "react";
import CategoryDocuments from "@/components/individualclient/documents/CategoryDocuments";
import AccountantAllDocumentListing from "@/components/individualaccountant/documents/AllDocumentsListings";
import { PageLoader } from "@/components/ui/spinner";
const ClientSubcategories = () => {
  

//   const checklistGuid = searchParams.get("checklistGuid");
//   const firmGuid = searchParams.get("firmGuid");
const [userRole, setUserRole] = useState(null);
useEffect(() => {
    setUserRole(localStorage.getItem("userRole"));
    
  }, []);
  return (
    <>
        {userRole === "accountant" || userRole === "admin" ? (
              <AccountantAllDocumentListing />
            ) : (
              <ClientAllDocumentListing />
            )}
            </>
  );
};

const page = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <ClientSubcategories />
    </Suspense>
  );
};

export default page;
