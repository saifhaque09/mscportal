"use client";

import InviteUserCard from '@/components/clientmanagement/InviteUserCard'
import ProtectedRoute from '@/components/ProtectedRoute'
import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageLoader } from "@/components/ui/spinner";

const InviteUserPageContent = () => {
  const searchParams = useSearchParams();
  const firmId = searchParams.get("firmId");
  return (
    <ProtectedRoute allowedRoles={["client", "accountant", "admin"]}>
      <InviteUserCard firmId={firmId} />
    </ProtectedRoute>
  )
}

const Page = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <InviteUserPageContent />
    </Suspense>
  )
}

export default Page