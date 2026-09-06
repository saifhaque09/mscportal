"use client";

import { useSearchParams, useRouter } from "next/navigation";
import DocumentViewer from "@/components/clientmanagement/DocumentViewer";
import React, { Suspense } from "react";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import BackLink from "@/components/global/BackLink";
import { PageLoader } from "@/components/ui/spinner";

function DocumentViewerContent() {
  const params = useSearchParams();
  const router = useRouter();

  const uri = params.get("uri");
  const name = params.get("name");
  const title = params.get("title");
  const type = params.get("type");

  const handleBack = () => {
    const fallback = sessionStorage.getItem("lastPathBeforeDocViewer") || "/dashboard";
    // We use router.push instead of back because document viewers based on iframes (like react-doc-viewer)
    // often push a state to the browser history, breaking router.back().
    router.push(fallback);
  };

  const eyebrow = <BackLink onClick={handleBack} className="mb-3" />;

  if (!uri) {
    return (
      <ListingPageLayout eyebrow={eyebrow} bordered={false}>
        <p>No document provided</p>
      </ListingPageLayout>
    );
  }

  const documents = [
    {
      uri,
      fileName: title || name,
      fileType: type,
    },
  ];

  return (
    <ListingPageLayout
      eyebrow={eyebrow}
      title={title || name}
      bordered={false}
      contentClassName="min-h-0 flex-1"
    >
      <DocumentViewer documents={documents} />
    </ListingPageLayout>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <DocumentViewerContent />
    </Suspense>
  );
}
