"use client";

import AllUsers from '@/components/clientmanagement/AllUsers'
import ProtectedRoute from '@/components/ProtectedRoute';
import React, { Suspense } from 'react'
import { PageLoader } from "@/components/ui/spinner";


const page = () => {


    return (
            <ProtectedRoute allowedRoles={["client","accountant","admin","staff"]}>
        <Suspense fallback={<PageLoader />}>
            <AllUsers />
        </Suspense>
        </ProtectedRoute>
    )
}

export default page