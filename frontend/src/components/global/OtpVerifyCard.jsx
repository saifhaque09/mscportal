"use client";

import { useRef, useState } from "react";
import api from "@/utils/axiosInstance";
import { toast } from "react-toastify";
import { Input } from "@/components/ui/input";
import {Spinner } from "@/components/ui/spinner";

export default function OtpVerifyCard({ onSuccess }) {
  const otpLength = 6;
  const [otp, setOtp] = useState(Array(otpLength).fill(""));
  const [verifying, setVerifying] = useState(false);
  const otpInputsRef = useRef([]);

  const email =
    typeof window !== "undefined" && localStorage.getItem("email");

  const handleOtpChange = (el, index) => {
    const value = el.value.replace(/[^0-9]/g, "");
    if (!value) return;

    const newOtp = [...otp];
    newOtp[index] = value[0];
    setOtp(newOtp);

    if (index < otpLength - 1) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
      if (index > 0) otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pasted)) return;

    setOtp(pasted.split(""));
    otpInputsRef.current[otpLength - 1]?.focus();
  };

  const verifyOtp = async () => {
    const finalOtp = otp.join("");

    if (finalOtp.length !== 6)
      return toast.error("Please enter complete OTP");

    setVerifying(true);

    try {
      const res = await api.post("/verify-otp", { email, otp: finalOtp });

      if (res?.data?.success) {
        toast.success("OTP Verified Successfully");
        onSuccess();
      } else {
        toast.error("Invalid OTP");
      }
    } catch (err) {
      toast.error("Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  // Fullscreen loader while verifying
  if (verifying) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4">
        <Spinner />
        <p className="text-sm text-gray-600">Sending OTP & Verifying...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="border rounded-xl p-8 shadow-lg w-[380px] space-y-6">
        <h2 className="text-xl font-semibold text-center">
          Profile OTP Verification
        </h2>

        <p className="text-sm text-center text-gray-500">
          OTP sent to your registered mail ID
        </p>

        <div className="flex justify-center gap-2" onPaste={handlePaste}>
          {otp.map((data, index) => (
            <Input
              key={index}
              className="w-10 h-10 text-center p-0 text-lg"
              type="text"
              maxLength="1"
              value={data}
              ref={(el) => (otpInputsRef.current[index] = el)}
              onChange={(e) => handleOtpChange(e.target, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onFocus={(e) => e.target.select()}
            />
          ))}
        </div>

        <button
          onClick={verifyOtp}
          className="w-full bg-red-600 text-white py-2 rounded-md flex items-center justify-center gap-2"
        >
          Verify OTP
        </button>
      </div>
    </div>
  );
}
