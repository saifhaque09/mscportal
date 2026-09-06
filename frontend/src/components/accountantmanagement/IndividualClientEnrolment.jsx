"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Plus,
  X,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BackLink from "@/components/global/BackLink";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useOrganisationApi from "@/api/useOrganisationApi";
import useUserApi from "@/api/useUserApi";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import Toolbar from "@/components/layout/Toolbar";

const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-700",
  "bg-cyan-100 text-cyan-700",
  "bg-pink-100 text-pink-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
  "bg-gray-100 text-gray-700",
];

function getInitials(firstName, lastName) {
  return `${(firstName ?? "").charAt(0)}${(lastName ?? "").charAt(0)}`.toUpperCase();
}

function getAvatarColor(id = 0) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function normalizeMembers(payload, roleLabels = {}) {
  if (!payload) return [];
  const members = [];
  Object.entries(payload).forEach(([key, roleMembers]) => {
    if (!Array.isArray(roleMembers)) return;
    const fallbackLabel = roleLabels[key] || key;
    roleMembers.forEach((m) => {
      members.push({
        id: m.id,
        guid: m.guid,
        name: `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim(),
        email: m.email || "—",
        role: m.role_name || fallbackLabel,
        initials: getInitials(m.first_name, m.last_name),
        bgColor: getAvatarColor(m.id),
      });
    });
  });
  return members;
}

export default function IndividualClientEnrolment({ taxfilerGuid, onBack }) {
  const {
    getIndividualMembers,
    individualMembers,
    individualMembersMeta,
    loading,
    assignIndividualMember,
    updateIndividualMemberRole,
    removeIndividualMember,
    getAllOrganizationRoles,
    organizationRoles,
  } = useOrganisationApi();

  const { getAllAccountantUser, accountantUser, loading: userLoading } = useUserApi();

  // Members list state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editRoleId, setEditRoleId] = useState("");

  // Remove confirm state
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState(null);

  // Add accountant: modal (user picker) + inline row (role assignment)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [debouncedModalSearch, setDebouncedModalSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRoleId, setNewRoleId] = useState("");
  const [saving, setSaving] = useState(false);

  // Debounce member list search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Debounce modal user search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedModalSearch(modalSearch);
    }, 350);
    return () => clearTimeout(timer);
  }, [modalSearch]);

  // Fetch accountant users when modal search changes
  useEffect(() => {
    if (!isAddModalOpen) return;
    getAllAccountantUser(1, 20, debouncedModalSearch || undefined);
  }, [debouncedModalSearch, isAddModalOpen]);

  const fetchMembers = useCallback(() => {
    getIndividualMembers({
      guid: taxfilerGuid,
      page: currentPage,
      resultsPerPage: rowsPerPage,
      search: debouncedSearch || undefined,
    });
  }, [getIndividualMembers, taxfilerGuid, currentPage, rowsPerPage, debouncedSearch]);

  useEffect(() => {
    getAllOrganizationRoles({ resultsPerPage: 100 });
  }, [getAllOrganizationRoles]);

  const roleOptions = useMemo(() => {
    if (!organizationRoles) return [];
    return organizationRoles.map((r) => ({ label: r.name, id: r.id }));
  }, [organizationRoles]);

  const roleLabels = useMemo(() => {
    if (!organizationRoles) return {};
    return organizationRoles.reduce((acc, r) => {
      acc[r.code] = r.name;
      return acc;
    }, {});
  }, [organizationRoles]);

  useEffect(() => {
    if (taxfilerGuid) fetchMembers();
  }, [fetchMembers, taxfilerGuid]);

  const members = normalizeMembers(individualMembers, roleLabels);
  const totalPages = individualMembersMeta?.last_page ?? 1;
  const totalResults = individualMembersMeta?.total_results ?? 0;

  // True when a Lead Accountant is already assigned to this client
  const hasLeadAccountant = members.some((m) => m.role === "Lead Accountant");

  // IDs of users already assigned any role on this client
  const assignedUserIds = new Set(members.map((m) => m.id));

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
    setModalSearch("");
    setDebouncedModalSearch("");
    getAllAccountantUser(1, 20);
  };

  // User clicked in modal → close modal, open inline row
  const handleSelectFromModal = (u) => {
    setSelectedUser(u);
    setIsAddModalOpen(false);
    setNewRoleId("");
    setIsAdding(true);
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setSelectedUser(null);
    setNewRoleId("");
  };

  const handleSaveAdd = async () => {
    if (!selectedUser || !newRoleId) return;
    setSaving(true);
    const result = await assignIndividualMember({
      guid: taxfilerGuid,
      user_id: selectedUser.id,
      organization_role_id: newRoleId,
    });
    setSaving(false);
    if (result) {
      handleCancelAdd();
      fetchMembers();
    }
  };

  const eyebrow = onBack && (
    <BackLink onClick={onBack} className="mb-3">
      Back to All Clients
    </BackLink>
  );

  const intro = (
    <Card className="border-border shadow-sm mb-6">
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="flex">
            <span className="font-medium w-48">Client Name:</span>
            <span className="text-muted-foreground">
              {`${individualMembers?.first_name ?? ""} ${individualMembers?.last_name ?? ""}`.trim() || "—"}
            </span>
          </div>
          <div className="flex">
            <span className="font-medium w-48">Client GUID:</span>
            <span className="text-muted-foreground">
              {individualMembers?.guid ?? taxfilerGuid ?? "—"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const searchBox = (
    <div className="relative max-w-sm w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        placeholder="Search by name, email and role"
        className="pl-10 bg-background border-border"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  );

  const addButton = (
    <Button
      onClick={handleOpenAddModal}
      className="bg-gray-800 hover:bg-gray-700 text-white"
    >
      <Plus className="h-4 w-4 mr-2" />
      Add Accountant
    </Button>
  );

  return (
    <ListingPageLayout
      eyebrow={eyebrow}
      title="Client & Accountant Enrolment"
      subtitle="Team Members — all team members attached to the client"
      intro={intro}
      toolbar={<Toolbar left={searchBox} right={addButton} />}
    >
            <Table className="overflow-visible">
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-gray-100">
                  <TableHead className="text-muted-foreground font-medium py-3">Name</TableHead>
                  <TableHead className="text-muted-foreground font-medium py-3">Email</TableHead>
                  <TableHead className="text-muted-foreground font-medium py-3">Role</TableHead>
                  <TableHead className="text-muted-foreground font-medium py-3">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && !isAdding ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      <Spinner className="mx-auto size-6" />
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {members.map((member) => (
                      <TableRow
                        key={`${member.guid}-${member.role}`}
                        className="border-border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setEditingMember(member);
                          setEditRoleId(roleOptions.find((r) => r.label === member.role)?.id ?? "");
                          setIsEditModalOpen(true);
                        }}
                      >
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full ${member.bgColor} flex items-center justify-center font-bold text-xs`}
                            >
                              {member.initials}
                            </div>
                            <span className="font-medium text-sm">{member.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground">
                          {member.email}
                        </TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground">
                          {member.role}
                        </TableCell>
                        <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingMember(member);
                                  setEditRoleId(roleOptions.find((r) => r.label === member.role)?.id ?? "");
                                  setIsEditModalOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" /> Edit Permissions
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => { setRemovingMember(member); setIsRemoveModalOpen(true); }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!loading && members.length === 0 && !isAdding && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                          No team members found.
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Inline add row — shown after a user is picked from the modal */}
                    {isAdding && selectedUser && (
                      <TableRow className="border-border bg-muted/20">
                        {/* Name */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full ${getAvatarColor(selectedUser.id)} flex items-center justify-center font-bold text-xs flex-shrink-0`}
                            >
                              {getInitials(selectedUser.first_name, selectedUser.last_name)}
                            </div>
                            <span className="font-medium text-sm">
                              {`${selectedUser.first_name ?? ""} ${selectedUser.last_name ?? ""}`.trim()}
                            </span>
                            <X
                              className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                              onClick={handleCancelAdd}
                            />
                          </div>
                        </TableCell>

                        {/* Email */}
                        <TableCell className="py-3 text-sm text-muted-foreground">
                          {selectedUser.email ?? "—"}
                        </TableCell>

                        {/* Role dropdown */}
                        <TableCell className="py-3">
                          <Select
                            value={String(newRoleId)}
                            onValueChange={(val) => setNewRoleId(Number(val))}
                          >
                            <SelectTrigger className="h-9 w-[180px]">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {roleOptions.map((r) => {
                                const isLeadTaken = r.label === "Lead Accountant" && hasLeadAccountant;
                                return (
                                  <SelectItem
                                    key={r.id}
                                    value={String(r.id)}
                                    disabled={isLeadTaken}
                                  >
                                    {r.label}
                                    {isLeadTaken && " (already assigned)"}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Save / Cancel */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-4 rounded-full"
                              onClick={handleCancelAdd}
                              disabled={saving}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 px-4 bg-black text-white hover:bg-black/90 rounded-full"
                              onClick={handleSaveAdd}
                              disabled={!newRoleId || saving}
                            >
                              {saving ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
          <div className="text-sm text-muted-foreground">
            Total results: {totalResults}
          </div>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page</span>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(val) => { setRowsPerPage(Number(val)); setCurrentPage(1); }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

      {/* Add Accountant Modal — user picker only */}
      <Dialog open={isAddModalOpen} onOpenChange={(open) => { if (!open) setIsAddModalOpen(false); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Select Accountant</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-10"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
              />
            </div>

            <div className="border border-border rounded-md overflow-hidden">
              <div className="max-h-72 overflow-y-auto">
                {userLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Searching...
                  </div>
                ) : accountantUser.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No accountants found
                  </div>
                ) : (
                  accountantUser.map((u) => {
                    const fullName = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
                    const alreadyAssigned = assignedUserIds.has(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => !alreadyAssigned && handleSelectFromModal(u)}
                        className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 transition-colors ${
                          alreadyAssigned
                            ? "opacity-50 cursor-not-allowed bg-muted/30"
                            : "cursor-pointer hover:bg-muted/50"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-full ${getAvatarColor(u.id)} flex items-center justify-center font-bold text-xs flex-shrink-0`}
                        >
                          {getInitials(u.first_name, u.last_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{fullName || "—"}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email || "—"}</p>
                        </div>
                        {alreadyAssigned && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
                            Already assigned
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Click a user to select them and assign a role in the table.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Permission Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Permission</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Change Permission <span className="text-red-500">*</span>
            </label>
            <Select value={String(editRoleId)} onValueChange={(val) => setEditRoleId(Number(val))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => {
                  // Disable Lead Accountant only when another member already holds it
                  const isLeadTaken =
                    r.label === "Lead Accountant" &&
                    hasLeadAccountant &&
                    editingMember?.role !== "Lead Accountant";
                  return (
                    <SelectItem key={r.id} value={String(r.id)} disabled={isLeadTaken}>
                      {r.label}
                      {isLeadTaken && " (already assigned)"}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-red-500 mt-6">
              Note — * This is a required field
            </p>
          </div>
          <div className="flex justify-end gap-2 pb-2 px-1">
            <Button variant="outline" onClick={() => { setIsEditModalOpen(false); setEditingMember(null); setEditRoleId(""); }}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const result = await updateIndividualMemberRole({
                  guid: taxfilerGuid,
                  user_id: editingMember?.id,
                  organization_role_id: editRoleId,
                });
                if (result) { setIsEditModalOpen(false); setEditingMember(null); setEditRoleId(""); fetchMembers(); }
              }}
              className="bg-black text-white hover:bg-black/90"
              disabled={!editRoleId || loading}
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Confirm Modal */}
      <Dialog open={isRemoveModalOpen} onOpenChange={setIsRemoveModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Remove Member</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            {removingMember && (
              <p className="text-sm font-medium">
                Member: <span className="text-foreground">{removingMember.name}</span>
                <span className="text-muted-foreground ml-2">({removingMember.role})</span>
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              This will remove the member from this client. This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-2 pb-2 px-1">
            <Button
              variant="outline"
              onClick={() => { setIsRemoveModalOpen(false); setRemovingMember(null); }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={loading}
              onClick={async () => {
                const roleId = roleOptions.find((r) => r.label === removingMember?.role)?.id;
                const result = await removeIndividualMember({
                  guid: taxfilerGuid,
                  user_id: removingMember?.id,
                  organization_role_id: roleId,
                });
                if (result) { setIsRemoveModalOpen(false); setRemovingMember(null); fetchMembers(); }
              }}
            >
              {loading ? "Removing..." : "Yes, Remove"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ListingPageLayout>
  );
}
