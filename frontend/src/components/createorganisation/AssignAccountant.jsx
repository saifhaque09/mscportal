"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserCog } from "lucide-react";
import useOrganisationApi from "@/api/useOrganisationApi";
import useUserApi from "@/api/useUserApi";

function getInitials(firstName, lastName) {
  return `${(firstName ?? "").charAt(0)}${(lastName ?? "").charAt(0)}`.toUpperCase();
}

export default function AssignAccountant({ firmGuid, onSuccess }) {
  const { getAllOrganizationRoles, organizationRoles, assignFirmMember, loading: assigning } = useOrganisationApi();
  const { getAllAccountantUser, accountantUser, loading: searching } = useUserApi();

  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [assigned, setAssigned] = useState(false);

  useEffect(() => {
    getAllOrganizationRoles({ resultsPerPage: 100 });
  }, [getAllOrganizationRoles]);

  useEffect(() => {
    const timer = setTimeout(() => {
      getAllAccountantUser(1, 20, search || undefined, ["Accountant"]);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Lead Accountant is the default/expected role for the accountant
  // assigned at org-creation time — the same org roles used by the
  // separate Client & Accountant Enrolment screen.
  const leadAccountantRoleId = useMemo(
    () => organizationRoles.find((r) => r.code === "lead_acc")?.id,
    [organizationRoles]
  );

  const handleAssign = async () => {
    if (!selectedUser || !leadAccountantRoleId || !firmGuid) return;
    const result = await assignFirmMember({
      guid: firmGuid,
      user_id: selectedUser.id,
      organization_role_id: leadAccountantRoleId,
    });
    if (result) {
      setAssigned(true);
      if (onSuccess) onSuccess();
    }
  };

  // Always available, not just when no Accountant exists yet — Admin can
  // pick up ownership of an organisation themselves at any time. Builds a
  // synthetic "user" from what login already stored, so the rest of the
  // assign flow (handleAssign, the success message) works unchanged.
  const handleAssignMyself = () => {
    const id = localStorage.getItem("userId");
    if (!id) return;
    setSelectedUser({
      id: Number(id),
      first_name: localStorage.getItem("user") || "You",
      last_name: "",
      email: localStorage.getItem("email") || "",
    });
  };

  const isSelf = selectedUser?.id === Number(typeof window !== "undefined" ? localStorage.getItem("userId") : NaN);

  if (assigned) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          {isSelf
            ? "You have been assigned as Lead Accountant for this organisation."
            : `${selectedUser?.first_name} ${selectedUser?.last_name} has been assigned as Lead Accountant for this organisation.`}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Accountant</CardTitle>
        <CardDescription>
          Pick the accountant responsible for this organisation, or assign it to yourself. They&apos;ll be assigned as Lead Accountant and are the only accountant who&apos;ll see this organisation until more team members are added. This organisation stays in draft until someone is assigned.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          type="button"
          variant={isSelf ? "default" : "outline"}
          className="w-full justify-start gap-2"
          onClick={handleAssignMyself}
        >
          <UserCog className="h-4 w-4" />
          Assign this organisation to me
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or pick an accountant</span>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search accountants by name or email"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="border rounded-md overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            {searching ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Searching...</div>
            ) : accountantUser.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No accountants found</div>
            ) : (
              accountantUser.map((u) => {
                const fullName = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
                const isSelected = selectedUser?.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`flex items-center gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer transition-colors ${
                      isSelected ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {getInitials(u.first_name, u.last_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fullName || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email || "—"}</p>
                    </div>
                    {isSelected && (
                      <span className="text-xs text-primary font-medium flex-shrink-0">Selected</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleAssign} disabled={!selectedUser || !leadAccountantRoleId || assigning}>
            {assigning ? "Assigning..." : "Assign Accountant"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
