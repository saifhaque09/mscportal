import AllTaxFilersListing from '@/components/individualaccountant/AlltaxFilersListing'
import ProtectedRoute from '@/components/ProtectedRoute'
import React from 'react'

function page(){
    return (
<ProtectedRoute allowedRoles={["accountant", "admin", "staff"]}>
<AllTaxFilersListing/>
</ProtectedRoute>
)}
export default page