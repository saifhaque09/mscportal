import React, { Suspense } from 'react'
import ChecklistSubcategory from '@/components/clientmanagement/ChecklistSubcategory'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Loader2 } from 'lucide-react'

const page = () => {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>}>
            <ProtectedRoute allowedRoles={["accountant", "admin", "staff"]}>
                <ChecklistSubcategory />
            </ProtectedRoute>
        </Suspense>
    )
}

export default page