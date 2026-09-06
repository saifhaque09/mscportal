"use client";

import useOtpGuard from "@/api/useOtpGaurd";
import OtpVerifyCard from "./OtpVerifyCard";
import {Spinner } from "@/components/ui/spinner";

export default function OtpProtected({ children }) {
  const { verified, loading, markVerified } = useOtpGuard();

  // Show loader while OTP is being requested
  if (loading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4">
        <Spinner />
        <p className="text-sm text-gray-500">Sending OTP to your email...</p>
      </div>
    );
  }

  if (!verified) {
    return <OtpVerifyCard onSuccess={markVerified} />;
  }

  return children;
}
