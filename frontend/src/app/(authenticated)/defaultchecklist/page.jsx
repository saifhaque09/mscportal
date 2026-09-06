import DefaultChecklist from '@/components/clientmanagement/DefaultChecklist'
import React, { Suspense } from 'react'
import { PageLoader } from "@/components/ui/spinner";

const page = () => {
    return (
        <Suspense fallback={<PageLoader />}>
            <DefaultChecklist />
        </Suspense>
    )
}

export default page