"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import useOrganisationApi from "@/api/useOrganisationApi";
import useClientManagementApi from "@/api/useClientManagementApi";
import useFirmGuid from "@/hooks/useFirmGuid";
import { ROUTES } from "@/config/routes";

// Backend shape for `/clients/business/{firmId}/logo/get` isn't pinned down yet — handle
// a plain URL string, a base64/data URI string, or an object carrying url/path.
function resolveClientLogoSrc(payload) {
  if (!payload) return null;
  if (typeof payload === "string") return payload;
  return payload.url || payload.path || payload.file_url || payload.logo_url || null;
}

const ClientHorizontalHeader = ({ clientName = "", firmId }) => {
  const pathname = usePathname();
  // Always the guid — never the numeric id the review step also carries.
  const paramsFirmId = useFirmGuid();

  const [effectiveFirmId, setEffectiveFirmId] = useState(firmId || paramsFirmId);
  const { getFirmContext } = useOrganisationApi();
  const { viewOrganisation, viewOrganisationData, organizationViewData } =
    useOrganisationApi();
  const { getClientLogo, getAllChecklistItems } = useClientManagementApi();
  const [showBanner, setShowBanner] = useState(true);
  const [clientLogo, setClientLogo] = useState(null);
  const [firstCategoryParams, setFirstCategoryParams] = useState(null);

  useEffect(() => {
    const fetchContext = async () => {
      if (!effectiveFirmId) {
        const guid = await getFirmContext();
        if (guid) setEffectiveFirmId(guid);
      }
    };

    if (firmId || paramsFirmId) {
      setEffectiveFirmId(firmId || paramsFirmId);
    } else {
      fetchContext();
    }
  }, [firmId, paramsFirmId]);

  const [role, setRole] = useState("");

  useEffect(() => {
    const storedRole = localStorage.getItem("userRole");
    setRole(storedRole);
  }, []);

  useEffect(() => {
    const fetchFirstCategory = async () => {
      if (!effectiveFirmId) return;
      const data = await getAllChecklistItems(
        effectiveFirmId,
        1,
        10,
        "",
        new Date().getFullYear().toString(),
        undefined,
        { suppressNoRecordsToast: true }
      );
      if (data && data.length > 0) {
        const firstChecklist = data[0];
        setFirstCategoryParams({
          id: firstChecklist.code,
          checklistId: firstChecklist.code,
          categoryId: firstChecklist.id
        });
      }
    };
    if (role === "accountant" || role === "admin" || role === "staff") {
      fetchFirstCategory();
    }
  }, [effectiveFirmId, role]);

  useEffect(() => {
    sessionStorage.removeItem("clientHeaderBannerRemindUntil");
  }, []);

  useEffect(() => {
    if (effectiveFirmId) {
      viewOrganisation({ firmGuid: effectiveFirmId });
    }
  }, [effectiveFirmId]);

  useEffect(() => {
    let cancelled = false;

    const fetchLogo = async () => {
      const payload = await getClientLogo(effectiveFirmId);
      if (cancelled) return;
      setClientLogo(resolveClientLogoSrc(payload));
    };

    if (effectiveFirmId) {
      fetchLogo();
    }

    return () => {
      cancelled = true;
    };
  }, [effectiveFirmId]);
  console.log(effectiveFirmId, "effective");

  const navItems = [
    {
      label: "Checklist",
      href:
        role === "accountant" || role === "admin" || role === "staff"
          ? `${ROUTES.business.dashboardAdmin}?firmId=${effectiveFirmId}`
          : ROUTES.business.dashboard,
    },
    ...(role === "accountant" || role === "admin" || role === "staff"
      ? [
          {
            label: "Access Document",
            href: firstCategoryParams
              ? `${ROUTES.business.checklistDocAdmin}?id=${firstCategoryParams.id}&firmId=${effectiveFirmId}&checklistId=${firstCategoryParams.checklistId}&categoryId=${firstCategoryParams.categoryId}`
              : "#",
          },
        ]
      : []),
    ...(role !== "employee"
      ? [{ label: "Users", href: `${ROUTES.business.users}?firmId=${effectiveFirmId}` }]
      : []),
    {
      label: "Organization Details",
      href: `${ROUTES.business.view}?firmId=${effectiveFirmId}`,
    },
  ];
  console.log(viewOrganisationData, organizationViewData, "rolesss");
  const reminderDate = viewOrganisationData?.payload?.reminder_date;

  if (!role) return null;
  const formatDate = (isoDate) => {
    if (!isoDate) return "";

    return new Date(isoDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleRemindLater = () => {
    const remindUntil = Date.now() + 45 * 1000;
    sessionStorage.setItem("clientHeaderBannerRemindUntil", String(remindUntil));
    setShowBanner(false);
    setTimeout(() => {
      const storedUntil = sessionStorage.getItem("clientHeaderBannerRemindUntil");
      if (storedUntil && Number(storedUntil) <= Date.now()) {
        setShowBanner(true);
        sessionStorage.removeItem("clientHeaderBannerRemindUntil");
      }
    }, 45 * 1000);
  };

  const handleClose = () => {
    handleRemindLater();
  };
  // if (viewOrganisationData) return null;
  // const reminderDate = viewOrganisationData?.payload?.reminder_date;
  return (
    <>

      <div className="w-full bg-background">
        {reminderDate && showBanner && (
          <div className="w-full bg-emerald-100 border-b border-emerald-200">
            <div className="flex items-center justify-between px-6 py-1">
              <p className="text-sm text-gray-800 whitespace-nowrap">
                Closing Date: {formatDate(viewOrganisationData?.payload?.reminder_date)}
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRemindLater}
                  className="px-3 py-1 text-xs font-semibold text-black bg-amber-400 rounded-md hover:bg-amber-300"
                >
                  Remind Me Later
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-1 text-xs font-semibold text-foreground bg-background border border-border rounded-md hover:bg-accent"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="text-lg leading-none text-foreground hover:text-foreground/80"
                  aria-label="Dismiss"
                >
                  x
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center px-4 py-6 border-b border-border w-full">
          <div className="flex items-center gap-3">
            {clientLogo && (
              <img
                src={clientLogo}
                alt="Client logo"
                loading="lazy"
                onError={() => setClientLogo(null)}
                className="h-8 w-8 rounded-md object-contain border border-border"
              />
            )}
            <h1 className="text-lg font-bold text-foreground leading-none">{viewOrganisationData?.payload?.firm_name}</h1>
            {/* <p className="text-xs text-gray-600 leading-none mt-0.5">{viewOrganisationData?.payload?.firm_name}</p> */}
          </div>
          <div className="flex gap-5">
            {navItems.map((item) => {
              const itemPath = item.href.split("?")[0];
              const isActive =
                pathname === itemPath || pathname?.startsWith(`${itemPath}/`);

              if (item.disabled) {
                return (
                  <span
                    key={item.label}
                    className="text-sm font-medium text-muted-foreground cursor-not-allowed"
                  >
                    {item.label}
                  </span>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`text-sm font-medium ${isActive
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

    </>
  );
};

export default ClientHorizontalHeader;
