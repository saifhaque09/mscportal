"use client";

import { useEffect, useState } from "react";
import useClientManagementApi from "@/api/useClientManagementApi";
import useOrganisationApi from "@/api/useOrganisationApi";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors ClientHorizontalHeader's resolveClientLogoSrc — backend shape for
// `/clients/business/{firmId}/logo/get` isn't pinned down yet.
function resolveClientLogoSrc(payload) {
  if (!payload) return null;
  if (typeof payload === "string") return payload;
  return payload.url || payload.path || payload.file_url || payload.logo_url || null;
}

const ClientSidebarLogo = () => {
  const [firmGuid, setFirmGuid] = useState(null);
  const [logoSrc, setLogoSrc] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | loaded | error
  const { getClientLogo } = useClientManagementApi();
  const { viewOrganisation, viewOrganisationData } = useOrganisationApi();

  useEffect(() => {
    setFirmGuid(localStorage.getItem("firmGuid") || "");
  }, []);

  useEffect(() => {
    if (firmGuid === null) return;

    if (!firmGuid) {
      setStatus("error");
      return;
    }

    let cancelled = false;

    const fetchLogo = async () => {
      const payload = await getClientLogo(firmGuid);
      if (cancelled) return;

      const src = resolveClientLogoSrc(payload);
      if (src) {
        setLogoSrc(src);
        setStatus("loaded");
      } else {
        setStatus("error");
      }
    };

    fetchLogo();
    viewOrganisation({ firmGuid });

    return () => {
      cancelled = true;
    };
  }, [firmGuid]);

  const firmName = viewOrganisationData?.payload?.firm_name;

  if (status === "loading") {
    return <Skeleton className="h-8 w-32" />;
  }

  if (status === "loaded" && logoSrc) {
    return (
      <img
        src={logoSrc}
        alt={firmName ? `${firmName} logo` : "Client logo"}
        loading="lazy"
        onError={() => setStatus("error")}
        className="h-8 max-w-[160px] object-contain"
      />
    );
  }

  return (
    <h1 className="text-lg font-bold text-foreground truncate max-w-[180px]">
      {firmName || "MSC Portal"}
    </h1>
  );
};

export default ClientSidebarLogo;
