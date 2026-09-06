"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppearanceSettings from "@/components/settings/AppearanceSettings";
import AppSettings from "@/components/settings/AppSettings";
import DomainSettings from "@/components/settings/DomainSettings";

import EmailTemplateSettings from "@/components/settings/EmailTemplateSettings";
import DefaultChecklist from "@/components/clientmanagement/DefaultChecklist";
import ListingPageLayout from "@/components/layout/ListingPageLayout";

function SettingsPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [userRole, setUserRole] = useState(null);
    const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "appearance");

    useEffect(() => {
        const role = localStorage.getItem("userRole");
        setUserRole(role);

        if (!searchParams.get("tab")) {
            const storedTab = localStorage.getItem("settingsActiveTab");
            if (storedTab) {
                setActiveTab(storedTab);
            }
        }
    }, []);

    useEffect(() => {
        const urlTab = searchParams.get("tab");
        if (urlTab) {
            setActiveTab(urlTab);
        }
    }, [searchParams]);

    const handleTabChange = (value) => {
        setActiveTab(value);
        localStorage.setItem("settingsActiveTab", value);
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", value);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    return (
        <ListingPageLayout title="Settings" bordered={false}>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col md:flex-row">
                <TabsList className="flex flex-col items-stretch justify-start w-full md:w-64 bg-transparent p-0 gap-1 rounded-none border-r border-border">
                    <TabsTrigger
                        value="appearance"
                        className="justify-start px-4 py-2 data-[state=active]:bg-muted data-[state=active]:text-foreground rounded-none border-r-2 border-transparent data-[state=active]:border-foreground transition-none shadow-none"
                    >
                        Appearance
                    </TabsTrigger>

                    {userRole === 'admin' && (
                        <TabsTrigger
                            value="app-information"
                            className="justify-start px-4 py-2 data-[state=active]:bg-muted data-[state=active]:text-foreground rounded-none border-r-2 border-transparent data-[state=active]:border-foreground transition-none shadow-none"
                        >
                            App information
                        </TabsTrigger>
                    )}

                    {/* <TabsTrigger
                        value="domain"
                        className="justify-start px-4 py-2 data-[state=active]:bg-muted data-[state=active]:text-foreground rounded-none border-r-2 border-transparent data-[state=active]:border-foreground transition-none shadow-none"
                    >
                        Domain
                    </TabsTrigger> */}
                    {/* <TabsTrigger
                        value="permissions"
                        className="justify-start px-4 py-2 data-[state=active]:bg-muted data-[state=active]:text-foreground rounded-none border-r-2 border-transparent data-[state=active]:border-foreground transition-none shadow-none"
                    >
                        Permissions
                    </TabsTrigger> */}



                    {(userRole === 'admin' || userRole === 'accountant') && (
                        <>
                            <TabsTrigger
                                value="default-checklist"
                                className="justify-start px-4 py-2 data-[state=active]:bg-muted data-[state=active]:text-foreground rounded-none border-r-2 border-transparent data-[state=active]:border-foreground transition-none shadow-none"
                            >
                                Default Checklist
                            </TabsTrigger>
                            {/* <TabsTrigger
                            value="email-templates"
                            className="justify-start px-4 py-2 data-[state=active]:bg-muted data-[state=active]:text-foreground rounded-none border-r-2 border-transparent data-[state=active]:border-foreground transition-none shadow-none"
                        >
                        Email Templates
                        </TabsTrigger> */}
                        </>
                    )}

                    {/* <TabsTrigger
                        value="email-templates"
                        className="justify-start px-4 py-2 data-[state=active]:bg-muted data-[state=active]:text-foreground rounded-none border-r-2 border-transparent data-[state=active]:border-foreground transition-none shadow-none"
                    >
                        Email Templates
                    </TabsTrigger> */}

                </TabsList>

                <div className="flex-grow">
                    <TabsContent value="appearance" className="mt-0 border-none p-0">
                        <AppearanceSettings />
                    </TabsContent>

                    {userRole === 'admin' && (
                        <TabsContent value="app-information">
                            <AppSettings />
                        </TabsContent>
                    )}

                    <TabsContent value="domain">
                        <DomainSettings />
                    </TabsContent>
                    <TabsContent value="permissions">
                        <div className="p-4 text-gray-500">Permissions Settings (Placeholder)</div>
                    </TabsContent>



                    {(userRole === 'admin' || userRole === 'accountant') && (
                        <TabsContent value="default-checklist">
                            <DefaultChecklist />
                        </TabsContent>
                    )}

                    <TabsContent value="email-templates">
                        <EmailTemplateSettings />
                    </TabsContent>
                </div>
            </Tabs>
        </ListingPageLayout>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={<ListingPageLayout title="Settings" bordered={false} />}>
            <SettingsPageContent />
        </Suspense>
    );
}
