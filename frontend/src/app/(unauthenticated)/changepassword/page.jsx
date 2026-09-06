"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import Image from "next/image";
import Link from "next/link";
import useUserApi from "@/api/useUserApi";
import { toast } from "react-toastify";
import BackLink from "@/components/global/BackLink";
import { PageLoader } from "@/components/ui/spinner";
import { ROUTES } from "@/config/routes";

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const emailParam = searchParams.get("email");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [isValidating, setIsValidating] = useState(true);
    const [isLinkValid, setIsLinkValid] = useState(true);
    const [linkMessage, setLinkMessage] = useState("");

    const { resetPassword, validateResetLink, loading, error } = useUserApi();

    useEffect(() => {
        const validateLink = async () => {
            if (!token || !emailParam) {
                setIsLinkValid(false);
                setLinkMessage("The password reset link is invalid or missing required parameters.");
                setIsValidating(false);
                return;
            }

            setEmail(emailParam);

            const result = await validateResetLink(token, emailParam);
            if (!result?.ok) {
                setIsLinkValid(false);
                setLinkMessage(result?.message || "Password link expired");
            }
            setIsValidating(false);
        };

        validateLink();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, emailParam]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!token) {
            toast.error("Invalid or missing reset token.");
            return;
        }

        if (password !== passwordConfirmation) {
            toast.error("Passwords do not match.");
            return;
        }





        const result = await resetPassword(token, email, password, passwordConfirmation);

        if (result) {
            setIsSuccess(true);
        }
    };

    if (!token || !emailParam || !isLinkValid) {
        return (
            <div className="text-center p-6">
                <h2 className="text-xl font-semibold text-red-600">Password Link Expired</h2>
                <p className="mt-2 text-gray-600">
                    {linkMessage || "The password reset link is invalid or has expired."}
                </p>
                <Button asChild className="mt-4 bg-black text-white hover:bg-gray-800">
                    <Link href={ROUTES.auth.login}>Return to Login</Link>
                </Button>
            </div>
        );
    }

    if (isValidating) {
        return (
            <div className="text-center p-6">
                <h2 className="text-xl font-semibold">Validating Link...</h2>
                <p className="mt-2 text-gray-600">Please wait while we verify your reset link.</p>
            </div>
        );
    }

    return (
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
                    {isSuccess ? "Password Reset Complete" : "Set New Password"}
                </CardTitle>
                <CardDescription className="text-center">
                    {isSuccess
                        ? "Your password has been successfully updated."
                        : "Enter your email and new password to reset your account access."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!isSuccess ? (
                    <form onSubmit={handleSubmit}>
                        <div className="flex flex-col gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading || !!emailParam}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">New Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="New Password"
                                    required
                                    minLength={6}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">Confirm Password</Label>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    placeholder="Confirm New Password"
                                    required
                                    minLength={6}
                                    value={passwordConfirmation}
                                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-500 mt-1">{error}</p>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-black text-white hover:bg-gray-800"
                                disabled={loading}
                            >
                                {loading ? "Resetting Password..." : "Reset Password"}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="flex flex-col gap-4">
                        <Button asChild className="w-full bg-black text-white hover:bg-gray-800">
                            <Link href={ROUTES.auth.login}>Go to Login</Link>
                        </Button>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-start border-t p-4">
                <BackLink href={ROUTES.auth.login}>Back to Login</BackLink>
            </CardFooter>
        </Card>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="flex min-h-screen items-center justify-center p-6 bg-muted/20">
            <Suspense fallback={<PageLoader />}>
                <ResetPasswordContent />
            </Suspense>
        </div>
    );
}
