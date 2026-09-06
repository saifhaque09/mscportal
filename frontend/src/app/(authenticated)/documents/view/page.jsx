import React from 'react'
import ViewDocument from './viewDocument/ViewDocument'

import { Suspense } from 'react'
import { PageLoader } from "@/components/ui/spinner";

const page = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <ViewDocument />
    </Suspense>
  )
}

export default page