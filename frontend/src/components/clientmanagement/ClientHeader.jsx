"use client";
import useClientManagementApi from "@/api/useClientManagementApi";
import useOrganisationApi from "@/api/useOrganisationApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { List, Calculator, CheckSquare } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import useFirmGuid from "@/hooks/useFirmGuid";
import { ROUTES } from "@/config/routes";
export default function ClientHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState("");
  const param = useSearchParams();
  // The business guid, whichever param spells it on the current route. Reading
  // `?firmId=` raw would pick up the review step's numeric id and then rebuild
  // every link below with it.
  const firmId = useFirmGuid();
  const id = param.get("id");
  const checkId = param.get("checklistId");
  const category = param.get("categoryId");
  const source = param.get("source");
  const [activeYearItem, setActiveYearItem] = useState(id);
  const [activeMonthItem, setActiveMonthItem] = useState(id);
  const [activePrepItem, setActivePrepItem] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("userRole");
      setRole(storedRole);
    }
  }, []);
  const {
    getAllChecklistItems,
    checklistItems,
    meta,
    getAllChecklistDocuments,
    documentMeta,
    getAllBusinessUsers,
    userMeta,
    parentItems,
  } = useClientManagementApi();
  const { viewOrganisation, viewOrganisationData } = useOrganisationApi();
  const fetchChecklistItems = useCallback(() => {
    if (!firmId) return;
    getAllChecklistItems(firmId);
  }, [firmId, getAllChecklistItems]);

  // Keyed on firmId, not mount: the header lives in the business layout and
  // survives client-side navigation, so switching firms has to refetch.
  useEffect(() => {
    fetchChecklistItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmId]);

  useEffect(() => {
    if ((role === "accountant" || role === "admin") && firmId) {
      viewOrganisation({ firmGuid: firmId });
    }
  }, [role, firmId]);

  useEffect(() => {
    const handleChecklistUpdated = () => {
      fetchChecklistItems();
    };
    window.addEventListener("checklist-updated", handleChecklistUpdated);
    return () => {
      window.removeEventListener("checklist-updated", handleChecklistUpdated);
    };
  }, []);
  useEffect(() => {
    const isPrepAccounts = pathname?.includes(ROUTES.business.prepAccounts);
    const isAdminMonthDocuments = pathname?.includes(
      ROUTES.business.checklistDocAdmin
    );
    const isClientMonthDocuments =
      pathname?.includes(ROUTES.business.allDocuments) &&
      source === "month";
    const isMonthDocuments = isAdminMonthDocuments || isClientMonthDocuments;
    if (isPrepAccounts) {
      setActivePrepItem(id);
      setActiveYearItem(null);
      setActiveMonthItem(null);
    } else if (isMonthDocuments) {
      setActiveMonthItem(id);
      setActiveYearItem(null);
      setActivePrepItem(null);
    } else {
      setActiveYearItem(id);
      setActiveMonthItem(null);
      setActivePrepItem(null);
    }
  }, [id, pathname, source]);
  const currentMonthName = new Date().toLocaleString("default", {
    month: "long",
  });
  console.log(checklistItems, 'checklist')
  const firmNumericId = viewOrganisationData?.payload?.id;
  // `firmId` stays the guid on every route; the numeric id (needed only by
  // `filing/start`) rides along under its own name so the shared headers
  // can't mistake it for the guid.
  const reviewHref = `${ROUTES.business.prepAccountsReview}?firmId=${firmId ?? ""}&firmNumericId=${firmNumericId ?? ""}`;
  const sections = [
    {
      kind: "year",
      title: role === "client" ? "Entire Year documents" : "Current Year Checklists",
      icon: List,
      isDynamic: true,
      items: checklistItems,
    },
    {
      kind: "month",
      title: `Current Month (${currentMonthName}) Documents`,
      icon: List,
      isDynamic: true,
      items: checklistItems,
    },
    ...(role === "accountant" || role === "admin"
      ? [
          {
            kind: "prep",
            title: "Prep Accounts",
            icon: Calculator,
            isDynamic: false,
            items: [
              {
                label: "Manage Code - Step 1",
                href: `${ROUTES.business.prepAccounts}?firmId=${firmId}`,
              },
              {
                label: "Code Summary - Step 2",
                href: reviewHref,
                disabled: !firmNumericId,
              },
              {
                label: "Fiscal Year Tax Filing",
                href: reviewHref,
                disabled: !firmNumericId,
              },
            ],
          },
        ]
      : []),
    {
      title: "Finalise Accounts",
      icon: CheckSquare,
      items: [
        { label: "Client Admins", href: "#", disabled: true },
        { label: "Data Synch with QuickBooks", href: "#", disabled: true },
        { label: "Taxes & Government Filings", href: "#", disabled: true },
        { label: "Asset & Capital Expenditure", href: "#", disabled: true },
      ],
    },
  ];
  const handleYearNavigation = (code, itemId) => {
    setActiveYearItem(code);
    setActiveMonthItem(null);
    if (role === "accountant" || role === "admin" || role === "staff") {
      router.push(
        `${ROUTES.business.checklistSubcategory}?id=${code}&firmId=${firmId}&category=${itemId}`
      );
    } else {
      router.push(`${ROUTES.business.checklist}?id=${code}`);
    }
  };

  const handleMonthNavigation = (code, itemId) => {
    setActiveMonthItem(code);
    setActiveYearItem(null);
    const resolvedFirmId =
      firmId || (typeof window !== "undefined" ? localStorage.getItem("firmGuid") : "");
    const resolvedCategoryId = category || itemId;
    if (role === "accountant" || role === "admin" || role === "staff") {
      router.push(
        `${ROUTES.business.checklistDocAdmin}?id=${code}&firmId=${resolvedFirmId}&checklistId=${code}&categoryId=${resolvedCategoryId}`
      );
    } else {
      const selectedItem = checklistItems.find((item) => item.code === code);
      const selectedName = selectedItem?.name || "";
      router.push(
        `${ROUTES.business.allDocuments}?id=${code}&name=${encodeURIComponent(selectedName)}&source=month`
      );
    }
  };
  const handlePrepNavigation = (code) => {
    setActivePrepItem(code);
    setActiveYearItem(null);
    setActiveMonthItem(null);
    const resolvedFirmId =
      firmId ||
      (typeof window !== "undefined" ? localStorage.getItem("firmGuid") : "");
    router.push(
      `${ROUTES.business.prepAccounts}?id=${code}&firmId=${resolvedFirmId}`
    );
  };

  console.log("check");
  return (
    <div className="w-full p-6 bg-background">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map((section, index) => (
          <Card
            key={index}
            className="border rounded-lg shadow-sm h-[260px] flex flex-col"
          >
            {/* Fixed Header */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium">
                {section.title}
              </CardTitle>
              <section.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>

            {/* Scrollable Content */}
            <CardContent className="flex-1 overflow-y-auto pr-2">
              <nav className="flex flex-col space-y-2">
                {section.isDynamic ? (
                  section.items.length > 0 ? (
                    section.items.map((item, itemIndex) => {
                      const isActive =
                        section.kind === "prep"
                          ? activePrepItem === item.code
                          : section.kind === "month"
                          ? activeMonthItem === item.code
                          : activeYearItem === item.code;
                      return (
                        <button
                          key={item.code || itemIndex}
                          onClick={() =>
                            section.kind === "prep"
                              ? handlePrepNavigation(item.code)
                              : section.kind === "month"
                              ? handleMonthNavigation(item.code, item.id)
                              : handleYearNavigation(item.code, item.id)
                          }
                          className="text-sm text-left transition-colors truncate"
                          title={item.name}
                        >
                          <div className="flex items-center gap-2">

                            <span
                              className={`truncate ${isActive
                                  ? "text-black dark:text-white font-medium underline"
                                  : "text-blue-600 dark:text-yellow-500 hover:text-blue-800 dark:hover:text-yellow-400 underline"
                                }`}
                            >
                              {item.name}
                            </span>

                            {item.new_files > 0 && (
                              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-medium text-white">
                                {item.new_files}
                              </span>
                            )}

                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-sm text-muted-foreground italic">
                      No documents founds
                    </span>
                  )
                ) : (
                  section.items.map((item, itemIndex) => (
                    <a
                      key={itemIndex}
                      href={item.disabled ? undefined : item.href}
                      className={`text-sm transition-colors
                        ${item.disabled
                          ? "text-gray-400 cursor-not-allowed pointer-events-none"
                          : "text-blue-600 dark:text-yellow-500 hover:text-blue-800 dark:hover:text-yellow-400 hover:underline"
                        }`}
                    >
                      {item.label}
                    </a>
                  ))
                )}
              </nav>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
