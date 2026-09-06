"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { PageLoader } from "@/components/ui/spinner";
import { ROUTES } from "@/config/routes";

export default function ProtectedRoute({ children, allowedRoles = ["accountant"] }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(null);

  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    const accessToken = localStorage.getItem("access_token");

    if (!userRole || !accessToken) {
      router.push(ROUTES.auth.login);
      return;
    }

    // Admin has full access — never gated by a page's allowedRoles list.
    if (userRole === "admin" || allowedRoles.includes(userRole)) {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
    }
  }, [router, allowedRoles]);

  if (isAuthorized === null) {
    return <PageLoader className="min-h-screen" />;
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <ShieldAlert className="h-24 w-24 text-red-500 mb-6" />
        <h1 className="text-4xl font-bold mb-2">403 - Access Denied</h1>
        <p className="text-lg text-muted-foreground mb-6">
          You don't have permission to access this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
