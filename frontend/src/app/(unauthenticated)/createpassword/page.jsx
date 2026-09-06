import { Suspense } from "react";
import React from "react";
import CreatePassword from "../../../components/createpassword/CreatePassword";
import { PageLoader } from "@/components/ui/spinner";

const page = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <CreatePassword />
    </Suspense>
  );
};

export default page;
