"use client";

import TaxFilersInvitations from '@/components/individualaccountant/invitation/TaxFilersInvitations'
import React, { Suspense } from 'react'
import { PageLoader } from "@/components/ui/spinner";

function TaxInvitations() {
    return <TaxFilersInvitations />;
}
export default function InvitesPage() {
    return (
        <Suspense fallback={<PageLoader />}>
            <TaxInvitations />
        </Suspense>
    );


}
