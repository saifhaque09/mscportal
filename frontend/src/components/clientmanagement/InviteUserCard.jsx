"use client";
import React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useOrganisationApi from "@/api/useOrganisationApi";
import { toast } from "react-toastify";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import BackLink from "@/components/global/BackLink";

const InviteUserCard = ({ firmId, onSuccess }) => {
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [userRole, setUserRole] = useState("Client");
  const router = useRouter()
  const { sendInvite, loading } = useOrganisationApi();

  const handleInviteUser = async (e) => {
    e.preventDefault();

    const success = await sendInvite(firmId, {
      email: newUserEmail,
      first_name: newUserFirstName,
      last_name: newUserLastName,
      role: userRole,
    });

    if (success) {
      setNewUserEmail("");
      setNewUserFirstName("");
      setNewUserLastName("");
      toast.success("Invitation sent successfully");


      setTimeout(() => {

        router.back()
      }, 1500);
    }
  };

  const eyebrow = (
    <BackLink onClick={() => router.back()} className="mb-3" />
  );

  return (
    <ListingPageLayout
      eyebrow={eyebrow}
      title="Invite User"
      subtitle="Enter the email address and select a role to invite a new user"
      bordered={false}
    >
      <Card>
        <CardContent>
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="space-y-2">
                <Label htmlFor="firstName">Enter User First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={newUserFirstName}
                  onChange={(e) => setNewUserFirstName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Enter User Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={newUserLastName}
                  onChange={(e) => setNewUserLastName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Enter User Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Select Role</Label>
                <Select
                  value={userRole}
                  onValueChange={setUserRole}
                  disabled={loading}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Client">Client</SelectItem>
                    <SelectItem value="Employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full md:w-auto"
              disabled={loading}
            >
              {loading ? "Sending Invite..." : "Invite User"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </ListingPageLayout>
  );
};

export default InviteUserCard;
