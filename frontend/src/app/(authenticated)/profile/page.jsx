import UserProfile from '@/components/user/UserProfile'
import React, { Suspense } from 'react'
import { PageLoader } from "@/components/ui/spinner";

const page = () => {
    return (
        <Suspense fallback={<PageLoader />}>
            <UserProfile />
        </Suspense>
    )
}

export default page