import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import useUserApi from '@/api/useUserApi';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/context/ThemeContext';

const COLOR_PRESETS = [
    { name: 'Black', value: '#000000' },
    { name: 'Dark Grey', value: '#4B5563' },
    { name: 'Grey', value: '#9CA3AF' },
    { name: 'Light Grey', value: '#E5E7EB' },
    { name: 'White', value: '#FFFFFF' },
];

const DEFAULT_CUSTOM_COLORS = {
    text_color_body: '#4B5563',
    text_color_heading: '#000000',
    button_color_text_normal: '#FFFFFF',
    button_color_background_normal: '#E5E7EB',
};

const AppearanceSettings = () => {
    const { settings, updateSettings, saveSettings, resetSettings, isLoading, isSaving } = useTheme();
    const { deleteFile } = useUserApi();

    const [logoUrl, setLogoUrl] = useState(null);
    const [faviconUrl, setFaviconUrl] = useState(null);
    const [isResetting, setIsResetting] = useState(false);

    const isCustomTheme = settings.theme === 'custom';

    const handleDeleteFile = async (group) => {
        const success = await deleteFile(group);
        if (success) {
            if (group === 'logo') setLogoUrl(null);
            else setFaviconUrl(null);
        }
    };

    const handleSave = async () => {
        await saveSettings({
            theme: settings.theme,
            font_family: settings.font_family,
            text_color_body: settings.text_color_body,
            text_color_heading: settings.text_color_heading,
            button_color_background_normal: settings.button_color_background_normal,
            button_color_text_normal: settings.button_color_text_normal,
        });
    };

    const handleReset = async () => {
        setIsResetting(true);
        await resetSettings();
        setIsResetting(false);
    };

    // Switching into Custom pre-fills any unset color with a sensible default so the section isn't blank
    const handleThemeChange = (value) => {
        if (value === 'custom') {
            updateSettings({
                theme: value,
                text_color_body: settings.text_color_body || DEFAULT_CUSTOM_COLORS.text_color_body,
                text_color_heading: settings.text_color_heading || DEFAULT_CUSTOM_COLORS.text_color_heading,
                button_color_text_normal: settings.button_color_text_normal || DEFAULT_CUSTOM_COLORS.button_color_text_normal,
                button_color_background_normal: settings.button_color_background_normal || DEFAULT_CUSTOM_COLORS.button_color_background_normal,
            });
        } else {
            updateSettings({ theme: value });
        }
    };

    const renderColorRow = (label, colorValue, settingKey) => {
        const preset = COLOR_PRESETS.find((c) => c.value.toLowerCase() === (colorValue || '').toLowerCase());
        return (
            <div className="flex items-center justify-between">
                <span className="text-sm">{label}</span>
                <Select
                    value={preset ? preset.value : ''}
                    onValueChange={(val) => updateSettings({ [settingKey]: val })}
                    disabled={!isCustomTheme}
                >
                    <SelectTrigger className="w-44">
                        <span
                            className="w-4 h-4 rounded border shrink-0"
                            style={{ backgroundColor: colorValue || 'transparent' }}
                        />
                        <SelectValue placeholder="Select colour">
                            {preset ? preset.name : (colorValue || 'Select colour')}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {COLOR_PRESETS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                                <span
                                    className="w-4 h-4 rounded border shrink-0"
                                    style={{ backgroundColor: c.value }}
                                />
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        );
    };

    if (isLoading) {
        return (
            <Card className="w-full max-w-4xl">
                <CardContent className="p-6 space-y-8">
                    <Skeleton className="h-8 w-64" />
                    <div className="border-t pt-6" />
                    <div className="space-y-4">
                        <Skeleton className="h-6 w-32" />
                        <div className="flex gap-6">
                            <Skeleton className="w-52 h-48 rounded-lg" />
                            <Skeleton className="w-52 h-48 rounded-lg" />
                            <Skeleton className="w-52 h-48 rounded-lg" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-6">
                        <Skeleton className="h-8 w-32" />
                        <div className="space-y-4">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="space-y-4">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
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
                    <h1 className="text-2xl font-semibold">Global Settings</h1>
                </div>

                {/* Theme Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-medium">Theme</h2>
                    <div className="border-t" />
                    <RadioGroup value={settings.theme} onValueChange={handleThemeChange}>
                        <div className="flex gap-6">
                            {/* Light Theme */}
                            <div className="flex flex-col items-center gap-3">
                                <div
                                    role="radio"
                                    aria-checked={settings.theme === 'light'}
                                    tabIndex={0}
                                    onClick={() => handleThemeChange('light')}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleThemeChange('light'); } }}
                                    className={`w-52 h-40 border-2 rounded-lg bg-white p-4 flex flex-col gap-3 cursor-pointer transition-colors ${settings.theme === 'light' ? 'border-primary' : 'border-border hover:border-gray-400'}`}
                                >
                                    <div className="space-y-2">
                                        <div className="h-2 bg-gray-200 rounded w-3/4" />
                                        <div className="h-2 bg-gray-200 rounded w-1/2" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-gray-300" />
                                        <div className="h-2 bg-gray-200 rounded flex-1" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-gray-300" />
                                        <div className="h-2 bg-gray-200 rounded flex-1" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <RadioGroupItem value="light" id="light" />
                                    <Label htmlFor="light" className="cursor-pointer">
                                        Light
                                    </Label>
                                </div>
                            </div>

                            {/* Dark Theme */}
                            <div className="flex flex-col items-center gap-3">
                                <div
                                    role="radio"
                                    aria-checked={settings.theme === 'dark'}
                                    tabIndex={0}
                                    onClick={() => handleThemeChange('dark')}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleThemeChange('dark'); } }}
                                    className={`w-52 h-40 border-2 rounded-lg bg-gray-900 p-4 flex flex-col gap-3 cursor-pointer transition-colors ${settings.theme === 'dark' ? 'border-primary' : 'border-border hover:border-gray-400'}`}
                                >
                                    <div className="space-y-2">
                                        <div className="h-2 bg-gray-600 rounded w-3/4" />
                                        <div className="h-2 bg-gray-600 rounded w-1/2" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-gray-600" />
                                        <div className="h-2 bg-gray-600 rounded flex-1" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-gray-600" />
                                        <div className="h-2 bg-gray-600 rounded flex-1" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <RadioGroupItem value="dark" id="dark" />
                                    <Label htmlFor="dark" className="cursor-pointer">
                                        Dark
                                    </Label>
                                </div>
                            </div>

                            {/* Custom Theme */}
                            <div className="flex flex-col items-center gap-3">
                                <div
                                    role="radio"
                                    aria-checked={settings.theme === 'custom'}
                                    tabIndex={0}
                                    onClick={() => handleThemeChange('custom')}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleThemeChange('custom'); } }}
                                    className={`w-52 h-40 border-2 rounded-lg bg-white p-4 flex flex-col gap-3 cursor-pointer transition-colors ${settings.theme === 'custom' ? 'border-primary' : 'border-border hover:border-gray-400'}`}
                                >
                                    <div className="space-y-2">
                                        <div
                                            className="h-2 rounded w-3/4"
                                            style={{ backgroundColor: settings.text_color_heading || '#d1d5db' }}
                                        />
                                        <div
                                            className="h-2 rounded w-1/2"
                                            style={{ backgroundColor: settings.text_color_body || '#d1d5db' }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: settings.button_color_background_normal || '#d1d5db' }}
                                        />
                                        <div
                                            className="h-2 rounded flex-1"
                                            style={{ backgroundColor: settings.text_color_body || '#d1d5db' }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: settings.button_color_background_normal || '#d1d5db' }}
                                        />
                                        <div
                                            className="h-2 rounded flex-1"
                                            style={{ backgroundColor: settings.text_color_body || '#d1d5db' }}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <RadioGroupItem value="custom" id="custom" />
                                    <Label htmlFor="custom" className="cursor-pointer">
                                        Custom
                                    </Label>
                                </div>
                            </div>
                        </div>
                    </RadioGroup>
                </div>

                {/* Font Section */}
                <div className="space-y-3">
                    <h2 className="text-xl font-medium">Font</h2>
                    <div className="border-t" />
                    <Label className="text-sm font-medium">Select Font</Label>
                    <Select
                        value={settings.font_family}
                        onValueChange={(val) => updateSettings({ font_family: val })}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Font" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="inter">Inter</SelectItem>
                            <SelectItem value="poppins">Poppins</SelectItem>
                            <SelectItem value="lato">Lato</SelectItem>
                            <SelectItem value="montserrat">Montserrat</SelectItem>
                            <SelectItem value="roboto">Roboto</SelectItem>
                            <SelectItem value="times new roman">Times New Roman</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Choose font from this dropdown</p>
                </div>

                {/* Colour Section */}
                <div className="space-y-6">
                    <h2 className="text-xl font-medium">Colour</h2>
                    <div className="border-t" />

                    {/* Text Colour */}
                    <div className="space-y-4">
                        <h3 className="text-base font-medium">Text Colour</h3>
                        {renderColorRow("Normal Text", settings.text_color_body, "text_color_body")}
                        {renderColorRow("Heading Text", settings.text_color_heading, "text_color_heading")}
                    </div>

                    {/* Button Colour */}
                    <div className="space-y-4">
                        <h3 className="text-base font-medium">Button Colour</h3>
                        {renderColorRow("Text Colour", settings.button_color_text_normal, "button_color_text_normal")}
                        {renderColorRow("Background Colour", settings.button_color_background_normal, "button_color_background_normal")}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex items-center gap-3">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || isResetting}
                        className="px-6"
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleReset}
                        disabled={isSaving || isResetting}
                        className="px-6 border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                        {isResetting ? "Resetting..." : "Reset"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default AppearanceSettings;
