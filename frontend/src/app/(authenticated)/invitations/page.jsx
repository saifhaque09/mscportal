"use client";

import { Suspense } from "react";
import Invitations from "@/components/invitations/Invitations";
import { PageLoader } from "@/components/ui/spinner";

function Inviations() {
    return <Invitations />;
}

export default function InvitesPage() {
    return (
        <Suspense fallback={<PageLoader />}>
            <Inviations />
        </Suspense>
    );
}
