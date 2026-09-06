"use client";

import AccountantAssign from "@/components/accountantmanagement/AccountantAssign";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function TestAccountantAssign() {
    return (
        <ProtectedRoute allowedRoles={["accountant", "admin"]}>
            <div className="bg-gray-50 min-h-screen">
                <AccountantAssign />
            </div>
        </ProtectedRoute>
    );
}
