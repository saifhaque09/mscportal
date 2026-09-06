"use client";
import { Suspense } from "react";
import { usePathname } from "next/navigation";



import ClientHorizontalHeader from "@/components/global/ClientHorizontalHeader";
import ClientHeader from "@/components/clientmanagement/ClientHeader";
import { PageLoader } from "@/components/ui/spinner";
import { ROUTES } from "@/config/routes";

export default function ClientLayout({ children }) {
    const pathname = usePathname();

    const hiddenHorizontalHeaderPaths = [
        ROUTES.dashboard.businessClients,
        ROUTES.business.payments,
        ROUTES.business.accountants,
        ROUTES.business.create,
    ];

    const shouldShowHorizontalHeader = !hiddenHorizontalHeaderPaths.some(
        (path) => pathname === path || pathname?.startsWith(`${path}/`)
    );

    const shouldShowClientHeader = [
        ROUTES.business.checklist,
        ROUTES.business.checklistSubcategory,
        ROUTES.business.allDocuments,
        `${ROUTES.business.checklist}/documents`,
        ROUTES.business.prepAccounts,
    ].some(path => pathname?.startsWith(path));

    return (
        <>
            {shouldShowHorizontalHeader && (
                <Suspense fallback={<PageLoader />}>
                    <ClientHorizontalHeader />
                </Suspense>
            )}
            {shouldShowClientHeader && (
                <Suspense fallback={<PageLoader />}>
                    <ClientHeader />
                </Suspense>
            )}
            <main className="flex-1 overflow-auto p-4">{children}</main>

        </>
    );
}