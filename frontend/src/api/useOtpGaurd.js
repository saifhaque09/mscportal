"use client";

import { useEffect, useState } from "react";
import api from "@/utils/axiosInstance";

export default function useOtpGuard() {
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem("email");

    if (!email) {
      setLoading(false);
      return;
    }

    sendOtp(email);
  }, []);

  const sendOtp = async (email) => {
    try {
      await api.post("/send-otp", { email });
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const markVerified = () => {
    setVerified(true);
  };

  return { loading, verified, markVerified };
}
