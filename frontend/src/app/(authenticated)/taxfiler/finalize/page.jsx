import React from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import FinalizeAccount from "@/components/taxfiler/FinalizeAccount";

const page = () => {
  return (
    <ProtectedRoute allowedRoles={["taxfiler", "accountant", "admin"]}>
      <FinalizeAccount />
    </ProtectedRoute>
  );
};

export default page;

