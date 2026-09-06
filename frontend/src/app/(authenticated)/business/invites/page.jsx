"use client";

import { useSearchParams } from "next/navigation";
import InviteTable from "@/components/createorganisation/InviteTable";
import ProtectedRoute from "@/components/ProtectedRoute";

import { Suspense } from "react";
import { PageLoader } from "@/components/ui/spinner";

function InvitesContent() {
    const searchParams = useSearchParams();
    const firmGuid = searchParams.get("firmId");

    return (
        <ProtectedRoute allowedRoles={["accountant", "admin", "client"]}>
            {firmGuid ? (
                <InviteTable firmGuid={firmGuid} />
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    No Organisation GUID provided.
                </div>
            )}
        </ProtectedRoute>
    );
}

export default function InvitesPage() {
    return (
        <Suspense fallback={<PageLoader />}>
            <InvitesContent />
        </Suspense>
    );
}
