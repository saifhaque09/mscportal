import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';
import useUserApi from '@/api/useUserApi';
import { toast } from 'react-toastify';
import { Skeleton } from '@/components/ui/skeleton';

const AppSettings = () => {
    const { getAppName, uploadFile, getFile, deleteFile, updateAppName, loading, } = useUserApi();
    const [appName, setAppName] = useState('');
    const [initialLoad, setInitialLoad] = useState(true);

    // Logo state
    const [logoPreview, setLogoPreview] = useState(null);
    const [logoFile, setLogoFile] = useState(null);

    // Favicon state
    const [faviconPreview, setFaviconPreview] = useState(null);
    const [faviconFile, setFaviconFile] = useState(null);

    const handleAppNameUpdate = async () => {
        try {
            const result = await updateAppName(appName);
            if (result && result.success) {
                toast.success(result.message || "App name updated successfully");
            }
        } catch (error) {
            console.error('Error updating app name:', error);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            setInitialLoad(true);
            try {
                // Fetch App Name
                const appNameData = await getAppName();
                if (appNameData && appNameData.app_name) {
                    setAppName(appNameData.app_name);
                }

                // Fetch Files
                const logoData = await getFile('logo');
                if (logoData) {
                    const logoUrl = typeof logoData === 'string' ? logoData : logoData.file_url;
                    setLogoPreview(logoUrl);
                }

                const faviconData = await getFile('favicon');
                if (faviconData) {
                    const faviconUrl = typeof faviconData === 'string' ? faviconData : faviconData.file_url;
                    setFaviconPreview(faviconUrl);
                }
            } catch (error) {
                console.error('Error fetching initial data:', error);
            } finally {
                setInitialLoad(false);
            }
        };

        loadInitialData();
    }, []);

    // Handle logo file selection
    const onLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                alert('Please select a valid image file (JPG, PNG, or GIF)');
                return;
            }

            // Validate file size (800KB = 800 * 1024 bytes)
            if (file.size > 800 * 1024) {
                alert('File size must be less than 800KB');
                return;
            }

            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    // Handle favicon file selection
    const onFaviconChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                alert('Please select a valid image file (JPG, PNG, or GIF)');
                return;
            }

            // Validate file size (800KB)
            if (file.size > 800 * 1024) {
                alert('File size must be less than 800KB');
                return;
            }

            setFaviconFile(file);
            setFaviconPreview(URL.createObjectURL(file));
        }
    };

    // Upload logo to server
    const handleLogoUpload = async () => {
        if (!logoFile) {
            alert('Please select a logo file first');
            return;
        }

        try {
            const result = await uploadFile(logoFile, 'logo');
            if (result && result.success) {
                // Fetch the uploaded file to get the server URL
                const uploadedLogo = await getFile('logo');
                if (uploadedLogo) {
                    const logoUrl = typeof uploadedLogo === 'string' ? uploadedLogo : uploadedLogo.url;
                    setLogoPreview(logoUrl);
                    setLogoFile(logoUrl); // Clear the file after successful upload
                    window.location.reload();

                    // Clear the file input
                    const fileInput = document.getElementById('logo-upload');
                    if (fileInput) fileInput.value = '';
                }
            }
        } catch (error) {
            console.error('Error uploading logo:', error);
        }
    };

    // Upload favicon to server
    const handleFaviconUpload = async () => {
        if (!faviconFile) {
            alert('Please select a favicon file first');
            return;
        }

        try {
            const result = await uploadFile(faviconFile, 'favicon');
            if (result && result.success) {
                // Fetch the uploaded file to get the server URL
                const uploadedFavicon = await getFile('favicon');
                if (uploadedFavicon) {
                    const faviconUrl = typeof uploadedFavicon === 'string' ? uploadedFavicon : uploadedFavicon.url;
                    setFaviconPreview(faviconUrl);
                    window.location.reload();
                    // Clear the file input
                    const fileInput = document.getElementById('favicon-upload');
                    if (fileInput) fileInput.value = '';
                }
            }
        } catch (error) {
            console.error('Error uploading favicon:', error);
        }
    };

    // Delete logo from server
    const handleLogoReset = async () => {
        const confirmed = window.confirm('Are you sure you want to delete the logo?');
        if (!confirmed) return;

        try {
            const success = await deleteFile('logo');
            if (success) {
                setLogoPreview(null);
                setLogoFile(null);

                // Clear the file input
                const fileInput = document.getElementById('logo-upload');
                if (fileInput) fileInput.value = '';
            }
        } catch (error) {
            console.error('Error deleting logo:', error);
        }
    };

    // Delete favicon from server
    const handleFaviconReset = async () => {
        const confirmed = window.confirm('Are you sure you want to delete the favicon?');
        if (!confirmed) return;

        try {
            const success = await deleteFile('favicon');
            if (success) {
                setFaviconPreview(null);
                setFaviconFile(null);

                // Clear the file input
                const fileInput = document.getElementById('favicon-upload');
                if (fileInput) fileInput.value = '';
            }
        } catch (error) {
            console.error('Error deleting favicon:', error);
        }
    };

    const handleSave = () => {
        console.log('Settings saved:', {
            appName,
            logo: logoPreview,
            favicon: faviconPreview,
        });
        // Add your save logic here for app name if needed
    };

    if (initialLoad) {
        return (
            <Card className="w-full max-w-4xl">
                <CardContent className="p-6 space-y-8">
                    <Skeleton className="h-8 w-48" />
                    <div className="border-t pt-6" />
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-36" />
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="h-6 w-16" />
                        <div className="flex gap-4">
                            <Skeleton className="h-28 w-28 rounded-lg" />
                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <Skeleton className="h-10 w-32" />
                                    <Skeleton className="h-10 w-24" />
                                    <Skeleton className="h-10 w-24" />
                                </div>
                                <Skeleton className="h-4 w-64" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="h-6 w-20" />
                        <div className="flex gap-4">
                            <Skeleton className="h-28 w-28 rounded-lg" />
                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <Skeleton className="h-10 w-32" />
                                    <Skeleton className="h-10 w-24" />
                                    <Skeleton className="h-10 w-24" />
                                </div>
                                <Skeleton className="h-4 w-64" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-4xl">
            <CardContent className="p-6 space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-semibold">App Information</h1>
                </div>

                <div className="border-t pt-6" />

                {/* App Name Section */}
                <div className="space-y-3">
                    <Label htmlFor="appName" className="text-base font-medium">
                        App Name
                    </Label>
                    <Input
                        id="appName"
                        type="text"
                        value={appName}
                        onChange={(e) => setAppName(e.target.value)}
                        placeholder="App Name"
                        className="w-full"
                    />
                    <Button onClick={handleAppNameUpdate} disabled={loading}>Update App Name</Button>
                </div>

                {/* Logo Section */}
                <div className="space-y-4">
                    <Label className="text-xl font-medium">Logo</Label>
                    <div className="flex items-start gap-4">
                        {/* Logo Preview */}
                        <div className="w-28 h-28 border-2 border-gray-200 rounded-lg flex items-center justify-center bg-gray-50">
                            {logoPreview ? (
                                <img
                                    src={logoPreview}
                                    alt="Logo preview"
                                    className="w-full h-full object-cover rounded-lg"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center text-gray-400">
                                    <svg
                                        className="w-12 h-12"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <rect x="3" y="3" width="18" height="18" rx="2" />
                                        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                                        <path d="M21 15l-5-5L5 21" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Upload and Reset Buttons */}
                        <div className="flex flex-col gap-3">
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    className="bg-black text-white hover:bg-gray-800"
                                    onClick={() => document.getElementById('logo-upload').click()}
                                    disabled={loading}
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Select Logo
                                </Button>
                                <input
                                    id="logo-upload"
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif"
                                    className="hidden"
                                    onChange={onLogoChange}
                                />
                                <Button
                                    variant="outline"
                                    onClick={handleLogoUpload}
                                    className="border-gray-300"
                                    disabled={!logoFile || loading}
                                >
                                    Upload
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleLogoReset}
                                    className="border-gray-300"
                                    disabled={!logoPreview || loading}
                                >
                                    Reset
                                </Button>
                            </div>
                            <p className="text-sm text-gray-500">
                                Allowed JPG, GIF or PNG. Max size of 800KB
                            </p>
                        </div>
                    </div>
                </div>

                {/* Favicon Section */}
                <div className="space-y-4">
                    <Label className="text-xl font-medium">Favicon</Label>
                    <div className="flex items-start gap-4">
                        {/* Favicon Preview */}
                        <div className="w-28 h-28 border-2 border-gray-200 rounded-lg flex items-center justify-center bg-gray-50">
                            {faviconPreview ? (
                                <img
                                    src={faviconPreview}
                                    alt="Favicon preview"
                                    className="w-full h-full object-cover rounded-lg"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center text-gray-400">
                                    <svg
                                        className="w-12 h-12"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <rect x="3" y="3" width="18" height="18" rx="2" />
                                        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                                        <path d="M21 15l-5-5L5 21" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Upload and Reset Buttons */}
                        <div className="flex flex-col gap-3">
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    className="bg-black text-white hover:bg-gray-800"
                                    onClick={() => document.getElementById('favicon-upload').click()}
                                    disabled={loading}
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Select Favicon
                                </Button>
                                <input
                                    id="favicon-upload"
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif"
                                    className="hidden"
                                    onChange={onFaviconChange}
                                />
                                <Button
                                    variant="outline"
                                    onClick={handleFaviconUpload}
                                    className="border-gray-300"
                                    disabled={!faviconFile || loading}
                                >
                                    Upload
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleFaviconReset}
                                    className="border-gray-300"
                                    disabled={!faviconPreview || loading}
                                >
                                    Reset
                                </Button>
                            </div>
                            <p className="text-sm text-gray-500">
                                Allowed JPG, GIF or PNG. Max size of 800KB
                            </p>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                {/* <div className="pt-4">
                    <Button
                        onClick={handleSave}
                        className="bg-black text-white hover:bg-gray-800 px-6"
                        disabled={loading}
                    >
                        Save & Next
                    </Button>
                </div> */}
            </CardContent>
        </Card>
    );
};

export default AppSettings;
