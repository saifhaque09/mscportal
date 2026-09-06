import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DomainSettings = () => {
    const [domainName, setDomainName] = useState('MSC Portal');

    const handleSave = () => {
        console.log('Domain settings saved:', {
            domainName,
        });
        // Add your save logic here
    };

    return (
        <Card className="w-full max-w-4xl">
            <CardContent className="p-6 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-semibold">Domain</h1>
                </div>

                <div className="border-t" />

                {/* Domain Name Section */}
                <div className="space-y-3">
                    <Label htmlFor="domainName" className="text-base font-medium">
                        Domain Name
                    </Label>
                    <Input
                        id="domainName"
                        type="text"
                        value={domainName}
                        onChange={(e) => setDomainName(e.target.value)}
                        placeholder="MSC Portal"
                        className="w-full"
                    />
                    <p className="text-sm text-gray-500">Add your Domain Name</p>
                </div>

                {/* Save Button */}
                <div className="pt-2">
                    <Button
                        onClick={handleSave}
                        className="bg-black text-white hover:bg-gray-800 px-6"
                    >
                        Save & Next
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default DomainSettings;
