"use client";

import React, { useState } from "react";
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
import BackLink from "@/components/global/BackLink";
import { ROUTES } from "@/config/routes";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Use the sendResetLink from useUserApi as requested
    const { sendResetLink, loading, error } = useUserApi();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        // Call the API
        const result = await sendResetLink(email);

        // If successful (response is 200/success from the hook), update UI
        if (result) {
            setIsSubmitted(true);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-6 bg-muted/20">
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
                        {isSubmitted ? "Check your email" : "Reset Password"}
                    </CardTitle>
                    <CardDescription className="text-center">
                        {isSubmitted
                            ? `We have sent a password reset link to ${email}`
                            : "Enter your email address and we'll send you a link to reset your password."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!isSubmitted ? (
                        <form onSubmit={handleSubmit}>
                            <div className="flex flex-col gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>

                                {error && (
                                    <p className="text-sm text-red-500 mt-1">
                                        {typeof error === "string" ? error : "Failed to send reset link. Please check the email address."}
                                    </p>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full bg-black text-white hover:bg-gray-800"
                                    disabled={loading}
                                >
                                    {loading ? "Sending..." : "Send Reset Link"}
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
        </div>
    );
}
