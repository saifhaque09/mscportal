"use client";

import TaxFilerDashboard from "@/components/individualclient/TaxFilerDashboard";
import ProtectedRoute from "@/components/ProtectedRoute";
import useUserApi from "@/api/useUserApi";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { ROUTES } from "@/config/routes";

const page = () => {
  const router = useRouter();
  const { viewUser } = useUserApi();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const check = async () => {
      const role = localStorage.getItem("userRole") || "";
      if (role !== "taxfiler") {
        setReady(true);
        return;
      }

      const guid = localStorage.getItem("userGuid") || "";
      if (!guid) {
        setReady(true);
        return;
      }

      const userData = await viewUser(guid);
      const requiredFields = [
        { key: "first_name", label: "First name" },
        { key: "last_name", label: "Last name" },
        { key: "dob", label: "Date of birth" },
        { key: "sin_number", label: "SIN number" },
        // { key: "mobile", label: "Mobile" },
        { key: "address", label: "Address" },
        // { key: "country", label: "Country" },
        // { key: "time_zone", label: "Time zone" },
      ];

       const missing = requiredFields
  .filter((f) => {
    let val;

    // First check root level
    if (userData?.[f.key] !== undefined) {
      val = userData[f.key];
    }
    // Then check inside meta — the API returns SIN as sin_number_masked,
    // never the raw sin_number key, so that field needs its own lookup.
    else if (userData?.meta?.[f.key] !== undefined) {
      val = userData.meta[f.key];
    } else if (f.key === "sin_number" && userData?.meta?.sin_number_masked !== undefined) {
      val = userData.meta.sin_number_masked;
    }

    return val === undefined || val === null || String(val).trim() === "";
  })
  .map((f) => f.label);


      if (missing.length > 0) {
        toast.error(
          `Please fill out all the required fields before proceeding: ${missing.join(", ")}`,
        );
        console.log(missing,'missing')
        const missingParam = encodeURIComponent(missing.join(", "));
        router.replace(ROUTES.account.profile + `?incomplete=1&missing=${missingParam}`);
        return;
      }

      setReady(true);
    };

    check();
    // `viewUser` is stable enough for this gate; avoid endless rechecks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <ProtectedRoute allowedRoles={["taxfiler", "accountant", "admin"]}>
      {ready ? <TaxFilerDashboard /> : null}
    </ProtectedRoute>
  );
};

export default page
