"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PasswordInput } from "@/components/PasswordInput";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import useLoginApi from "@/api/useLoginApi";
import { ROUTES } from "@/config/routes";

export default function CreatePassword() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hash = searchParams.get("hash");
  const { createPassword, getInviteDetails, loading } = useLoginApi();

  const [inviteDetails, setInviteDetails] = useState(null);
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!hash) {
        setInviteDetails(null);
        setInviteError("Invalid link has expired");
        setInviteLoading(false);
        return;
      }

      setInviteLoading(true);
      try {
        const details = await getInviteDetails(hash);
        if (details) {
          setInviteDetails(details);
          setInviteError("");
        } else {
          setInviteDetails(null);
          setInviteError("Invalid link has expired");
        }
      } finally {
        setInviteLoading(false);
      }
    };

    fetchDetails();
  }, [hash]);

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  // Password validation states
  const hasMinLength = formData.password.length >= 8;
  const hasLowercase = /[a-z]/.test(formData.password);
  const hasSpecialChar = /[$#%@!()[\]]/.test(formData.password);
  const hasUppercase = /[A-Z]/.test(formData.password);
  const hasNumber = /\d/.test(formData.password);
  const passwordsMatch =
    formData.password &&
    formData.confirmPassword &&
    formData.password === formData.confirmPassword;

  const isFormValid =
    hasMinLength &&
    hasLowercase &&
    hasSpecialChar &&
    hasUppercase &&
    hasNumber &&
    passwordsMatch;

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid) {
      toast.error("Please meet all password requirements");
      return;
    }

    if (!hash) {
      toast.error("Invalid invitation link. Hash parameter is missing.");
      return;
    }

    const success = await createPassword({
      hash: hash,
      password: formData.password,
      passwordConfirmation: formData.confirmPassword,
    });

    if (success) {
      setTimeout(() => {
        router.push(ROUTES.auth.login);
      }, 2000);
    } else {
      toast.error("Invalid link has expired");
    }
  };

  const RequirementItem = ({ met, children }) => (
    <div className="flex items-start gap-2 text-sm">
      {met ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
      ) : (
        <Circle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
      )}
      <span className={met ? "text-green-600" : "text-gray-600"}>
        {children}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      {inviteLoading ? (
        <div className="flex justify-center items-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : inviteError ? (
        <div className="text-center text-sm font-medium text-red-600">
          {inviteError}
        </div>
      ) : inviteDetails ? (
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-600">MSC Accounting</h3>
            </div>
            <CardTitle className="text-2xl font-bold">Create Password</CardTitle>
            <CardDescription>Enter your password</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !inviteDetails && !inviteError ? (
              <div className="flex justify-center items-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              inviteDetails && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3 text-sm border border-gray-100">
                  <div className="grid grid-cols-[100px_1fr] gap-2">
                    <span className="text-gray-500">Name:</span>
                    <span className="font-medium text-gray-900">
                      {inviteDetails.first_name} {inviteDetails.last_name}
                    </span>

                    <span className="text-gray-500">Email:</span>
                    <span className="font-medium text-gray-900 break-all">
                      {inviteDetails.email}
                    </span>

                    <span className="text-gray-500">Role:</span>
                    <span className="font-medium text-gray-900">
                      {inviteDetails.role}
                    </span>
{inviteDetails?.firm_name &&
<>
                    <span className="text-gray-500">Organization:</span>
                    <span className="font-medium text-gray-900">
                      {inviteDetails?.firm_name}
                    </span>
                    </>
}
                  </div>
                </div>
              )
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-red-500">*</span>
                </Label>
                <PasswordInput
                  id="password"
                  placeholder="Enter Password"
                  value={formData.password}
                  onChange={handleChange("password")}
                  required
                  disabled={loading}
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="Enter Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  required
                  disabled={loading}
                />
              </div>

              {/* Password Requirements */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Password Requirements:</h4>
                <div className="space-y-2">
                  <RequirementItem met={hasMinLength}>
                    Minimum 8 characters long - the more, the better
                  </RequirementItem>
                  <RequirementItem met={hasLowercase}>
                    At least one lowercase character
                  </RequirementItem>
                  <RequirementItem met={hasSpecialChar}>
                    At least one special character from ($, #, %, @, !, (, ), [,
                    ])
                  </RequirementItem>
                  <RequirementItem met={hasUppercase}>
                    At least one uppercase character
                  </RequirementItem>
                  <RequirementItem met={hasNumber}>
                    At least one number
                  </RequirementItem>
                  <RequirementItem met={passwordsMatch}>
                    Password and Confirm password are same
                  </RequirementItem>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-black hover:bg-gray-800"
                disabled={!isFormValid || loading}
              >
                {loading ? "Creating Password..." : "Save Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-center items-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
}
