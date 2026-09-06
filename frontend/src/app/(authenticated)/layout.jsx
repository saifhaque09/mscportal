"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import ThemeWrapper from "@/components/ThemeWrapper";
import { AppSidebar } from "@/components/global/appsidebar";
import DynamicSidebar from "@/components/global/DynamicSidebar";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import TaxFilerSidebar from "@/components/global/TaxFilerSidebar";
import TaxFilerGlobalHeader from "@/components/global/TaxFilerGlobalHeader";
import GlobalFooter from "@/components/global/GlobalFooter";
import { PageLoader } from "@/components/ui/spinner";
import IdleLogoutGuard from "@/components/global/IdleLogoutGuard";
function DashboardLayoutContent({ children, pathname, role }) {
const searchParams = useSearchParams();

  const taxFilerGuid = searchParams.get("taxFilerGuid");

  const hasTaxFilerContext =
    Boolean(taxFilerGuid) ||
    (typeof window !== "undefined" &&
      Boolean(sessionStorage.getItem("activeTaxFilerGuid")));

  const hasTaxFilerContextOnProfile = Boolean(taxFilerGuid);

  const isTaxFilerArea =
    pathname === ROUTES.taxfiler.dashboard ||
    pathname?.startsWith(`${ROUTES.taxfiler.dashboard}/`) ||
    pathname === ROUTES.account.profile ||
    pathname?.startsWith(`${ROUTES.account.profile}/`) ||
    pathname === "/taxfiling" ||
    pathname?.startsWith("/taxfiling/") ||
    pathname === ROUTES.account.myDocuments ||
    pathname?.startsWith(`${ROUTES.account.myDocuments}/`) ||
    pathname === "/documents" ||
    pathname?.startsWith("/documents/") ||
    pathname === "/individualaccountant/document" ||
    pathname?.startsWith("/individualaccountant/document/") ||
    pathname === ROUTES.taxfiler.finalize ||
    pathname?.startsWith(`${ROUTES.taxfiler.finalize}/`) ||
    pathname?.startsWith(ROUTES.individual.taxfilerView)
    ||pathname?.startsWith(ROUTES.taxfiler.clientSubcategories)||pathname.startsWith(ROUTES.taxfiler.clientDocumentView)

  const showTaxFilerHeader =
    isTaxFilerArea &&
    (role === "taxfiler" ||
      ((role === "accountant" || role === "admin") &&
        (pathname === "/profile" || pathname?.startsWith("/profile/")
          ? hasTaxFilerContextOnProfile
          : hasTaxFilerContext)));

  useEffect(() => {
    if (pathname && !pathname.includes(ROUTES.documents.viewer)) {
      const search = searchParams.toString();
      sessionStorage.setItem("lastPathBeforeDocViewer", search ? `${pathname}?${search}` : pathname);
    }
  }, [pathname, searchParams]);

  return (
    <>
      {/* Header */}
      {showTaxFilerHeader && <TaxFilerGlobalHeader />}

      {/* Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </>
  );
}
export default function DashboardLayout({ children }) {
  const [userRole, setUserRole] = useState("client");
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Every page under this layout is otherwise unguarded, so this is the one
  // place all of them route through — without it, an unauthenticated visitor
  // can load any internal page directly and each feature hook fails its API
  // call silently, rendering a stray "not found" instead of being sent to login.
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!localStorage.getItem("access_token")) {
      router.replace(ROUTES.auth.login);
      return;
    }

    setUserRole((localStorage.getItem("userRole") || "client").toLowerCase());
    setIsAuthChecked(true);
  }, [router]);

  const [role] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("userRole") || "";
    }
    return "";
  });

  if (!isAuthChecked) {
    return <PageLoader className="min-h-screen" />;
  }

  return (
    <ThemeWrapper>
      <IdleLogoutGuard />
      <div className="flex h-svh w-full flex-col overflow-hidden">
        <div className="min-h-0 flex-1">
          <SidebarProvider defaultOpen={true} className="h-full min-h-0">
            {userRole === "taxfiler" ? (
              <TaxFilerSidebar pathname={pathname} role={role} />
            ) : (
              <DynamicSidebar />
            )}
            <SidebarInset>
              {/* Content Area */}
              <Suspense fallback={null}>
                <DashboardLayoutContent pathname={pathname} role={role}>
                  {children}
                </DashboardLayoutContent>
              </Suspense>
            </SidebarInset>
          </SidebarProvider>
        </div>
        <GlobalFooter />
      </div>
    </ThemeWrapper>
  );
}
