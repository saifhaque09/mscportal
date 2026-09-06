"use client";

import React, { Suspense } from "react";
import ViewOrganisation from "@/components/createorganisation/ViewOrganisation";
import { PageLoader } from "@/components/ui/spinner";

function ViewOrganisationPage() {
    return (
        <Suspense fallback={<PageLoader />}>
            <ViewOrganisation />
        </Suspense>
    );
}

export default ViewOrganisationPage;
