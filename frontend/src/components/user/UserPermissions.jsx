"use client";

import { useEffect } from "react";
import { ArrowLeft, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import useOrganisationApi from "@/api/useOrganisationApi";

export default function UserPermissions({ onBack, userGuid }) {
    const { getMyPermissions, myPermissions, permissionsLoading } = useOrganisationApi();

    useEffect(() => {
        if (!userGuid) return;
        getMyPermissions({ userGuid });
    }, [getMyPermissions, userGuid]);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">My Permissions</h2>
            </div>

            {permissionsLoading ? (
                <Card className="border-border shadow-sm">
                    <CardContent className="py-10 text-center text-muted-foreground">
                        Loading permissions...
                    </CardContent>
                </Card>
            ) : myPermissions.length === 0 ? (
                <Card className="border-border shadow-sm">
                    <CardContent className="py-10 text-center text-muted-foreground">
                        No organizations found.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {myPermissions.map((org) => (
                        <Card key={org.firm_id ?? org.guid} className="border-border shadow-sm">
                            <CardContent className="space-y-3 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{org.firm_name}</span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">Role: {org.role?.name}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(org.permissions || [])
                                        .filter((permission) => !permission.status || permission.status === "active")
                                        .map((permission) => (
                                            <Badge
                                                key={permission.id}
                                                variant="secondary"
                                                className="rounded-md bg-blue-100/50 px-3 py-1 text-xs font-normal text-blue-700 hover:bg-blue-100 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 dark:text-blue-300"
                                            >
                                                {permission.name}
                                            </Badge>
                                        ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
