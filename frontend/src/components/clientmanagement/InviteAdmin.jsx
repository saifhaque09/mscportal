"use client";
import React from "react";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import useOrganisationApi from "@/api/useOrganisationApi";
import { toast } from "react-toastify";

const InviteAdmin = ({ organisationGuid, onSuccess }) => {
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [userRole, setUserRole] = useState("Client");
  const { sendInvite, loading } = useOrganisationApi();

  const handleInviteUser = async (e) => {
    e.preventDefault();

const success = await sendInvite(organisationGuid, {
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
      onSuccess();
    }
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Invite User</CardTitle>
          <CardDescription>
            Enter the email address and select a role to invite a new user
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="space-y-2">
                <Label htmlFor="firstName">Enter Admin First Name</Label>
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
                <Label htmlFor="lastName">Enter Admin Last Name</Label>
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
                <Label htmlFor="email">Enter Admin Email</Label>
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
    </div>
  );
};

export default InviteAdmin;
