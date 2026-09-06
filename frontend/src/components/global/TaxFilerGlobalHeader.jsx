"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import useUserApi from "@/api/useUserApi";
import { ROUTES } from "@/config/routes";

const TaxFilerGlobalHeader = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [role, setRole] = useState("");
  const [userName, setUserName] = useState("");
  const [persistedTaxFilerGuid, setPersistedTaxFilerGuid] = useState("");
  const [persistedUserId, setPersistedUserId] = useState("");
  const { viewUser } = useUserApi();

  const taxFilerGuid = searchParams.get("taxFilerGuid");
  const userId = searchParams.get("userId");
  const taxStepParam = searchParams.get("taxStep") || searchParams.get("step");

  useEffect(() => {
    const storedRole = localStorage.getItem("userRole") || "";
    setRole(storedRole);
    // Avoid showing accountant/admin name on taxfiler-context pages; prefer fetching the taxfiler's name.
    setUserName(
      storedRole === "accountant" || storedRole === "admin"
        ? ""
        : localStorage.getItem("user") || "",
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (taxFilerGuid) {
      const guid = String(taxFilerGuid);
      sessionStorage.setItem("activeTaxFilerGuid", guid);
      setPersistedTaxFilerGuid(guid);
      return;
    }

    const stored = sessionStorage.getItem("activeTaxFilerGuid") || "";
    if (stored) setPersistedTaxFilerGuid(stored);
  }, [taxFilerGuid]);

  const effectiveTaxFilerGuid = taxFilerGuid || persistedTaxFilerGuid || "";

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (userId) {
      const nextUserId = String(userId);
      sessionStorage.setItem("activeTaxFilerUserId", nextUserId);
      setPersistedUserId(nextUserId);
      return;
    }

    const stored = sessionStorage.getItem("activeTaxFilerUserId") || "";
    if (stored) setPersistedUserId(stored);
  }, [userId]);

  const effectiveUserId = userId || persistedUserId || "";

  useEffect(() => {
    const loadUserName = async () => {
      const storedRole = localStorage.getItem("userRole") || "";
      const localUserGuid = localStorage.getItem("userGuid") || "";
      const guidToUse =
        (storedRole === "accountant" || storedRole === "admin") && effectiveTaxFilerGuid
          ? effectiveTaxFilerGuid
          : localUserGuid;

      if (!guidToUse) return;

      const user = await viewUser(guidToUse);
      const fullName = [user?.first_name, user?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (fullName) setUserName(fullName);
    };

    loadUserName();
    // `viewUser` is stable enough for this usage; avoid re-running on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTaxFilerGuid]);

  useEffect(() => {
    const handleRefreshUser = () => {
      const localUserGuid = localStorage.getItem("userGuid") || "";
      if (!localUserGuid) return;
      viewUser(localUserGuid).then((user) => {
        const fullName = [user?.first_name, user?.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        if (fullName) setUserName(fullName);
      });
    };

    window.addEventListener("refresh-user", handleRefreshUser);
    return () => window.removeEventListener("refresh-user", handleRefreshUser);
  }, [viewUser]);

  const navItems = useMemo(() => {
    if (!role) return [];
    const dashboardHref = (() => {
      const params = new URLSearchParams();
      if (effectiveTaxFilerGuid) {
        params.set("taxFilerGuid", String(effectiveTaxFilerGuid));
      }
      if (effectiveUserId) {
        params.set("userId", String(effectiveUserId));
      }
      const query = params.toString();
      return query ? `${ROUTES.taxfiler.dashboard}?${query}` : ROUTES.taxfiler.dashboard;
    })();

    const profileHref =
      (role === "accountant" || role === "admin") && effectiveTaxFilerGuid
        ? `${ROUTES.account.profile}?userGuid=${encodeURIComponent(
            String(effectiveTaxFilerGuid),
          )}&taxFilerGuid=${encodeURIComponent(
            String(effectiveTaxFilerGuid),
          )}${
            effectiveUserId
              ? `&userId=${encodeURIComponent(String(effectiveUserId))}`
              : ""
          }`
        : ROUTES.account.profile;

    const taxCategoriesHref = (() => {
      const [base, queryString] = profileHref.split("?");
      const params = new URLSearchParams(queryString || "");
      params.set("taxStep", "2");
      const query = params.toString();
      return query ? `${base}?${query}` : base;
    })();

    const finalizeHref = (() => {
      const params = new URLSearchParams();
      if (effectiveTaxFilerGuid) params.set("taxFilerGuid", String(effectiveTaxFilerGuid));
      if (effectiveUserId) params.set("userId", String(effectiveUserId));
      const query = params.toString();
      return query ? `${ROUTES.taxfiler.finalize}?${query}` : ROUTES.taxfiler.finalize;
    })();
const accountantsubcategory=(() => {
      const params = new URLSearchParams();
      if (effectiveTaxFilerGuid) params.set("taxFilerGuid", String(effectiveTaxFilerGuid));
      if (effectiveUserId) params.set("userId", String(effectiveUserId));
      const query = params.toString();
      return query ? `${ROUTES.taxfiler.clientSubcategories}?${query}` : ROUTES.taxfiler.finalize;
    })();
    if (role === "taxfiler") {
      return [
        {
          label: "Tax Categories",
          href: taxCategoriesHref,
          matchPath: ROUTES.account.profile,
          matchMode: "tax-categories",
        },
        {
          label: "My Profile",
          href: profileHref,
          matchPath: ROUTES.account.profile,
          matchMode: "profile-details",
        },
      ];
    }

    if (role === "accountant" || role === "admin") {
      return [
        {
          label: "Tax Filers Categorization",
          href: accountantsubcategory,
          matchPath: ROUTES.taxfiler.clientSubcategories,
        },
        { label: "Finalize Account", href: finalizeHref, matchPath: ROUTES.taxfiler.finalize },
        { label: "Profile Details", href: profileHref },
      ];
    }

    return [{ label: "Profile Details", href: profileHref }];
  }, [role, effectiveTaxFilerGuid, effectiveUserId]);

  if (!role) return null;

  return (
    <div className="w-full bg-background">
      <div className="flex justify-between items-center px-4 py-3 border-b border-border w-full">
        <div>
          {/* <h1 className="text-lg font-bold text-foreground leading-none">Dashboard</h1> */}
          {userName ? (
            <h1 className="text-lg font-bold text-foreground leading-none">
              {userName
                .split(" ")
                .filter(Boolean)
                .map((part) =>
                  part.length > 0
                    ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}`
                    : part,
                )
                .join(" ")}
            </h1>
          ) : null}
        </div>
        <div className="flex gap-5">
          {navItems.map((item) => {
            const itemPath = item.href.split("?")[0];
            const matchPath = item.matchPath || itemPath;

            let isActive =
              pathname === matchPath || pathname?.startsWith(`${matchPath}/`);

            if (matchPath === ROUTES.account.profile && item.matchMode) {
              const normalized = String(taxStepParam || "").toLowerCase();
              const isTaxCategories =
                normalized === "2" ||
                normalized === "tax" ||
                normalized === "tax-categories" ||
                normalized === "categories";

              if (item.matchMode === "tax-categories") isActive = isActive && isTaxCategories;
              if (item.matchMode === "profile-details") isActive = isActive && !isTaxCategories;
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`text-sm font-medium ${
                  isActive
                    ? "text-blue-600 underline decoration-2 underline-offset-8"
                    : "text-foreground hover:text-blue-600 hover:underline hover:decoration-2 hover:underline-offset-8"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TaxFilerGlobalHeader;
