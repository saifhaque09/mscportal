import DefaultChecklistSubcategory from '@/components/clientmanagement/DefaultChecklistSubcategory'
import React, { Suspense } from 'react'
import { PageLoader } from "@/components/ui/spinner";

const page = () => {
    return (
        <Suspense fallback={<PageLoader />}>
            <DefaultChecklistSubcategory />
        </Suspense>
    )
}

export default page