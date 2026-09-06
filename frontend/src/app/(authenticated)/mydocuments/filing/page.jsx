"use client";

import FilingReviewSign from "@/components/clientmanagement/FilingReviewSign";
import ProtectedRoute from "@/components/ProtectedRoute";

const page = () => {
  return (
    <ProtectedRoute allowedRoles={["client"]}>
      <FilingReviewSign />
    </ProtectedRoute>
  );
};

export default page;
