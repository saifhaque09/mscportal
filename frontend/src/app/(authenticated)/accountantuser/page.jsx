import AccountantUser from '@/components/accountantUser/AccountantUser'

import React, { Suspense } from 'react'
import { PageLoader } from "@/components/ui/spinner";

const page = () => {
    return (
        <Suspense fallback={<PageLoader />}>
            <AccountantUser />
        </Suspense>
    )
}

export default page