"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

// The `?firmId=` query param carries the business **GUID** (e.g. `W0M5KMUD1A`)
// everywhere in this app — `getAllChecklistItems`, `viewOrganisation`, and every
// `clients/business/{…}/…` endpoint expect it. A few routes spell the same value
// `?firmGuid=` instead (the Prep Account review/filing steps, the checklist
// document pages), and `/business/prep-accounts/review` briefly used `firmId`
// for the *numeric* DB id, which leaked that id into the shared headers — both
// read `?firmId=` blindly and then rebuilt every nav link with it.
//
// This is the single reader for "which firm is this page about". It prefers a
// non-numeric `firmId`, falls back to `firmGuid`, and never hands back a numeric
// id when a real guid is present, so old bookmarked review URLs still resolve.
const isNumericId = (value) => /^\d+$/.test(String(value ?? "").trim());

export function resolveFirmGuidFromParams(searchParams) {
  const firmId = searchParams?.get("firmId");
  const firmGuid = searchParams?.get("firmGuid");

  if (firmId && !isNumericId(firmId)) return firmId;
  if (firmGuid && !isNumericId(firmGuid)) return firmGuid;
  return null;
}

// The numeric business id, used only by endpoints that take an `int $firm_id`
// (`clients/business/filing/start`, `clients/business/{id}/filing/latest`).
// Reads `?firmNumericId=`, falling back to a legacy `?firmId=<number>`.
export function resolveFirmNumericIdFromParams(searchParams) {
  const explicit = searchParams?.get("firmNumericId");
  if (explicit) return explicit;

  const firmId = searchParams?.get("firmId");
  return isNumericId(firmId) ? firmId : null;
}

export default function useFirmGuid() {
  const searchParams = useSearchParams();
  const firmId = searchParams.get("firmId");
  const firmGuid = searchParams.get("firmGuid");

  return useMemo(
    () => resolveFirmGuidFromParams(searchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [firmId, firmGuid]
  );
}
