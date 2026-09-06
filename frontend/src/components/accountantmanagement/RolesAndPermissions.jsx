"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import useOrganisationApi from "@/api/useOrganisationApi";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import Toolbar from "@/components/layout/Toolbar";

export default function RolesAndPermissions() {
  const {
    getAllOrganizationRoles,
    organizationRoles,
    organizationRolesMeta,
    createOrganizationRole,
    editOrganizationRole,
    deleteOrganizationRole,
    getAllOrganizationPermissions,
    organizationPermissions,
    loading,
  } = useOrganisationApi();

  const PROTECTED_ROLE_CODES = ["lead_acc", "senior", "dataloader"];

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [hoveredRow, setHoveredRow] = useState(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [permissionsDropdownOpen, setPermissionsDropdownOpen] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editSelectedPermissions, setEditSelectedPermissions] = useState([]);
  const [editPermissionsDropdownOpen, setEditPermissionsDropdownOpen] = useState(false);

  const createDropdownRef = useRef(null);
  const editDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (createDropdownRef.current && !createDropdownRef.current.contains(e.target)) {
        setPermissionsDropdownOpen(false);
      }
      if (editDropdownRef.current && !editDropdownRef.current.contains(e.target)) {
        setEditPermissionsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchRoles = useCallback(() => {
    getAllOrganizationRoles({
      page: currentPage,
      resultsPerPage: rowsPerPage,
      search: debouncedSearch || undefined,
    });
  }, [getAllOrganizationRoles, currentPage, rowsPerPage, debouncedSearch]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const totalPages = organizationRolesMeta?.last_page ?? 1;
  const totalResults = organizationRolesMeta?.total_results ?? 0;

  const handleOpenCreateModal = () => {
    getAllOrganizationPermissions();
    setIsCreateModalOpen(true);
  };

  const handleCreateRole = async () => {
    if (!newRoleName) return;
    const generatedCode = newRoleName.toLowerCase().replace(/[^a-z0-9_]+/g, "_");
    const payload = await createOrganizationRole({
      name: newRoleName,
      code: generatedCode,
      permissions: selectedPermissions,
    });
    if (payload) {
      setNewRoleName("");
      setSelectedPermissions([]);
      setPermissionsDropdownOpen(false);
      setIsCreateModalOpen(false);
      fetchRoles();
    }
  };

  const handleCancelCreate = () => {
    setIsCreateModalOpen(false);
    setNewRoleName("");
    setSelectedPermissions([]);
    setPermissionsDropdownOpen(false);
  };

  const togglePermission = (id) => {
    setSelectedPermissions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleEditPermission = (id) => {
    setEditSelectedPermissions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleOpenEditModal = (role) => {
    getAllOrganizationPermissions();
    setRoleToEdit(role);
    setEditRoleName(role.name);
    setEditSelectedPermissions(role.permissions.map((p) => p.id));
    setEditPermissionsDropdownOpen(false);
    setIsEditModalOpen(true);
  };

  const handleEditRole = async () => {
    if (!editRoleName || !roleToEdit) return;
    const result = await editOrganizationRole({
      id: roleToEdit.id,
      name: editRoleName,
      permissions: editSelectedPermissions,
    });
    if (result !== null) {
      setIsEditModalOpen(false);
      setRoleToEdit(null);
      setEditRoleName("");
      setEditSelectedPermissions([]);
      setEditPermissionsDropdownOpen(false);
      fetchRoles();
    }
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setRoleToEdit(null);
    setEditRoleName("");
    setEditSelectedPermissions([]);
    setEditPermissionsDropdownOpen(false);
  };

  const searchBox = (
    <div>
      <p className="text-sm text-muted-foreground mb-2">
        Manage team roles and responsibilities
      </p>
      <div className="relative max-w-sm w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search Role"
          className="pl-10 bg-background border-border"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
    </div>
  );

  const createButton = (
    <Button
      onClick={handleOpenCreateModal}
      className="bg-gray-800 hover:bg-gray-700 text-white"
    >
      <Plus className="h-4 w-4 mr-2" />
      Create New Role
    </Button>
  );

  return (
    <ListingPageLayout
      title="Roles & Permission"
      subtitle="All Role"
      toolbar={<Toolbar left={searchBox} right={createButton} />}
    >
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground font-medium py-3 w-[250px] pl-6">
                  Role Name
                </TableHead>
                <TableHead className="text-muted-foreground font-medium py-3">
                  Permission
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={2} className="py-10 text-center text-muted-foreground">
                    <Spinner className="mx-auto size-6" />
                  </TableCell>
                </TableRow>
              ) : organizationRoles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="py-10 text-center text-muted-foreground">
                    No roles found.
                  </TableCell>
                </TableRow>
              ) : (
                organizationRoles.map((role) => {
                  const isProtected = PROTECTED_ROLE_CODES.includes(role.code);
                  return (
                  <TableRow
                    key={role.id}
                    className={`border-border hover:bg-muted/30 transition-colors group h-16 ${isProtected ? "" : "cursor-pointer"}`}
                    onMouseEnter={() => setHoveredRow(role.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={() => !isProtected && handleOpenEditModal(role)}
                  >
                    <TableCell className="py-4 pl-6 align-top">
                      <span className="font-medium underline decoration-border underline-offset-4 text-sm text-foreground">
                        {role.name}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 align-top">
                      <div className="flex items-start justify-between">
                        <div className="flex flex-wrap gap-2 max-w-[600px]">
                          {role.permissions.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No permissions assigned</span>
                          ) : (
                            <>
                              {role.permissions.map((permission) => (
                                <Badge
                                  key={permission.id}
                                  variant="secondary"
                                  className="bg-blue-100/50 hover:bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 dark:text-blue-300 font-normal rounded-md px-3 py-1 text-xs flex items-center gap-1"
                                >
                                  {permission.name}
                                </Badge>
                              ))}

                            </>
                          )}
                        </div>
                        {hoveredRow === role.id && !isProtected && (
                          <div className="flex items-center gap-2 mr-4" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => handleOpenEditModal(role)}
                            >
                              <Pencil className="h-3 w-3 mr-2" /> Edit Role
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="bg-gray-800 hover:bg-gray-700 text-white h-8"
                              onClick={() => {
                                setRoleToDelete(role);
                                setIsDeleteModalOpen(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-2" /> Trash Role
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 mt-2">
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

      {/* Create Role Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Create New Role</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Role Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Tax Consultant"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Permissions <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={createDropdownRef}>
                <button
                  type="button"
                  onClick={() => setPermissionsDropdownOpen((o) => !o)}
                  className="flex items-center justify-between w-full h-9 rounded-md border border-input bg-background px-3 py-2 text-sm text-left shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <span className="text-muted-foreground truncate">
                    {selectedPermissions.length === 0
                      ? "Select permissions"
                      : `${selectedPermissions.length} permission${selectedPermissions.length > 1 ? "s" : ""} selected`}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                </button>
                {permissionsDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-md max-h-48 overflow-y-auto">
                    {loading ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2"><Spinner className="size-4" />Loading...</p>
                    ) : organizationPermissions.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No permissions available</p>
                    ) : (
                      organizationPermissions.map((perm) => (
                        <div
                          key={perm.id}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer"
                          onClick={() => togglePermission(perm.id)}
                        >
                          <Checkbox
                            checked={selectedPermissions.includes(perm.id)}
                            onCheckedChange={() => togglePermission(perm.id)}
                          />
                          <span className="text-sm">{perm.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-red-500">
              Note — * These are required fields
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelCreate}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={!newRoleName || selectedPermissions.length === 0 || loading}
              className="bg-black text-white hover:bg-black/90"
            >
              {loading ? "Creating..." : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Role</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Role Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Tax Consultant"
                value={editRoleName}
                onChange={(e) => setEditRoleName(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Permissions <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={editDropdownRef}>
                <button
                  type="button"
                  onClick={() => setEditPermissionsDropdownOpen((o) => !o)}
                  className="flex items-center justify-between w-full h-9 rounded-md border border-input bg-background px-3 py-2 text-sm text-left shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <span className="text-muted-foreground truncate">
                    {editSelectedPermissions.length === 0
                      ? "Select permissions"
                      : `${editSelectedPermissions.length} permission${editSelectedPermissions.length > 1 ? "s" : ""} selected`}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                </button>
                {editPermissionsDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-md max-h-48 overflow-y-auto">
                    {loading ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2"><Spinner className="size-4" />Loading...</p>
                    ) : organizationPermissions.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No permissions available</p>
                    ) : (
                      organizationPermissions.map((perm) => (
                        <div
                          key={perm.id}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer"
                          onClick={() => toggleEditPermission(perm.id)}
                        >
                          <Checkbox
                            checked={editSelectedPermissions.includes(perm.id)}
                            onCheckedChange={() => toggleEditPermission(perm.id)}
                          />
                          <span className="text-sm">{perm.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-red-500">
              Note — * These are required fields
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button
              onClick={handleEditRole}
              disabled={!editRoleName || editSelectedPermissions.length === 0 || loading}
              className="bg-black text-white hover:bg-black/90"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Delete Role Confirmation</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {roleToDelete && (
              <p className="text-sm font-medium">
                Role: <span className="text-foreground">{roleToDelete.name}</span>
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Deleting this role will remove all associated permissions and
              access settings. Please ensure no active users depend on this
              role before proceeding.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 sm:justify-end">
            <Button variant="outline" onClick={() => { setIsDeleteModalOpen(false); setRoleToDelete(null); }}>
              Keep Role
            </Button>
            <Button
              disabled={loading}
              className="bg-black text-white hover:bg-black/90"
              onClick={async () => {
                const result = await deleteOrganizationRole({
                  id: roleToDelete?.id,
                  name: roleToDelete?.name,
                  code: roleToDelete?.code,
                });
                if (result) { setIsDeleteModalOpen(false); setRoleToDelete(null); fetchRoles(); }
              }}
            >
              {loading ? "Deleting..." : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ListingPageLayout>
  );
}
