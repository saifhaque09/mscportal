"use client";

import React, { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import BackLink from "@/components/global/BackLink";
import { useRouter } from "next/navigation";

import Link from "next/link";
import Image from "next/image";
import useLoginApi from "../../../api/useLoginApi";
import { ROUTES } from "@/config/routes";

function getDashboardPath(role) {
  if (role === "accountant" || role === "admin") return ROUTES.dashboard.root;
  if (role === "taxfiler") return ROUTES.taxfiler.dashboard;
  return ROUTES.business.dashboard;
}

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [otp, setOtp] = React.useState(new Array(6).fill(""));
  const [showOtp, setShowOtp] = React.useState(false);
  const router = useRouter();


  const { login, verifyOtp, loading, error } = useLoginApi();

  // For OTP input focus management
  const otpInputsRef = React.useRef([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login({ email, password });

    if (result?.success && result?.otpRequired) {
      setShowOtp(true);
    }

    if (result?.success && !result?.otpRequired) {
      router.replace(getDashboardPath(result.role));
    }
  };


  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    // Focus next input
    if (element.nextSibling) {
      element.nextSibling.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        otpInputsRef.current[index - 1].focus();
      }
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const otpValue = otp.join("");

    if (otpValue.length !== 6) return;

    const result = await verifyOtp({ email, otp: otpValue, password });

    if (result?.success) {
      router.replace(getDashboardPath(result.role));
    }
  };


  const handleResend = async () => {
    // Re-trigger login to resend OTP
    await login({ email, password });
    setOtp(new Array(6).fill(""));
    otpInputsRef.current[0]?.focus();
  };

  // Focus first OTP input when showing OTP screen
  useEffect(() => {
    if (showOtp && otpInputsRef.current[0]) {
      otpInputsRef.current[0].focus();
    }
  }, [showOtp]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="MSC Accounting"
              width={150}
              height={50}
              priority
              style={{ width: "auto", height: "auto" }}
            />
          </div>
          <CardTitle className="text-2xl text-center">
            Sign in to get Started
          </CardTitle>
          <CardDescription className="text-center">
            {showOtp
              ? "Enter the OTP sent to your email"
              : "Enter your login details"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showOtp ? (
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Enter Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="demo@gmail.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter Password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                    />
                    <span>Remember Me</span>
                  </label>
                  <Link
                    href={ROUTES.auth.forgotPassword}
                    className="text-sm text-primary hover:underline text-blue-600"
                  >
                    Forgot Password?
                  </Link>
                </div>

                {error && !showOtp && (
                  <p className="text-sm text-red-500 mt-1">{error}</p>
                )}
              </div>
              <CardFooter className="mt-6 flex flex-col gap-4 px-0">
                <Button
                  type="submit"
                  className="w-full bg-black text-white hover:bg-gray-800 cursor-pointer"
                  disabled={loading}
                >
                  {loading ? "Signing In..." : "Sign In"}
                </Button>

                <div className="text-center text-xs text-gray-500 mt-4">
                  By Clicking continue, you agree to our{" "}
                  <Link href={ROUTES.auth.termsOfService} className="underline cursor-pointer hover:text-primary">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href={ROUTES.auth.privacyPolicy} className="underline cursor-pointer hover:text-primary">
                    Privacy Policy
                  </Link>
                  .
                </div>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit}>
              <div className="flex flex-col gap-4">
                <div className="mb-2">
                  <h3 className="font-medium">Enter OTP</h3>
                  <p className="text-sm text-muted-foreground">
                    Please enter the verification code sent to your Email
                  </p>
                </div>

                <div className="flex gap-2 justify-center">
                  {otp.map((data, index) => {
                    return (
                      <Input
                        className="w-10 h-10 text-center p-0"
                        type="text"
                        name="otp"
                        maxLength="1"
                        key={index}
                        value={data}
                        ref={(el) => (otpInputsRef.current[index] = el)}
                        onChange={(e) => handleOtpChange(e.target, index)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        onFocus={(e) => e.target.select()}
                      />
                    );
                  })}
                </div>

                <div className="text-sm">
                  OTP Not Received?{" "}
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-primary hover:underline text-blue-600"
                    disabled={loading}
                  >
                    Resend
                  </button>{" "}
                  <span className="text-gray-400">30sec</span>
                </div>

                {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
              </div>

              <CardFooter className="mt-6 flex justify-between px-0">
                <BackLink
                  onClick={() => {
                    setShowOtp(false);
                    setOtp(new Array(6).fill(""));
                    setEmail("");
                    setPassword("");
                  }}
                  disabled={loading}
                />
                <Button
                  type="submit"
                  className="bg-black text-white hover:bg-gray-800"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Login"}
                </Button>
              </CardFooter>
              <div className="text-center text-xs text-gray-500 mt-4">
                By Clicking continue, you agree to our{" "}
                <Link href={ROUTES.auth.termsOfService} className="underline cursor-pointer hover:text-primary">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href={ROUTES.auth.privacyPolicy} className="underline cursor-pointer hover:text-primary">Privacy Policy</Link>
                .
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="absolute bottom-6 w-full text-center text-sm text-gray-500">
        <p>36-4181 Sladeview Cres, Mississauga L5L 5R2</p>
      </div>
    </div>
  );
}
