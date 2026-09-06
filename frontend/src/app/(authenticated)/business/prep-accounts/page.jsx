import React, { Suspense } from "react";
import PrepAccountsView from "@/components/clientmanagement/PrepAccountsView";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";

const page = () => {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="animate-spin" />
        </div>
      }
    >
      <ProtectedRoute allowedRoles={["accountant", "admin"]}>
        <PrepAccountsView />
      </ProtectedRoute>
    </Suspense>
  );
};

export default page;
