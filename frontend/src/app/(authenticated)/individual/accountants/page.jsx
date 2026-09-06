"use client";

import IndividualAccountantAssign from "@/components/accountantmanagement/IndividualAccountantAssign";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function IndividualAccountantAssignPage() {
    return (
        <ProtectedRoute allowedRoles={["accountant", "admin"]}>
            <div className="bg-gray-50 min-h-screen">
                <IndividualAccountantAssign />
            </div>
        </ProtectedRoute>
    );
}
