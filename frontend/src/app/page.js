"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/spinner";
import { ROUTES } from "@/config/routes";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const role = (localStorage.getItem("userRole") || "").toLowerCase();
    if (role === "client" || role === "employee") {
      router.replace(ROUTES.business.dashboard);
    } else if (role === "taxfiler") {
      router.replace(ROUTES.taxfiler.dashboard);
    } else {
      router.replace(ROUTES.dashboard.root);
    }
  }, [router]);

  return <PageLoader className="min-h-screen" />;
}
