"use client";

import { createContext, useContext, useEffect, useState } from "react";
import useUserApi from "@/api/useUserApi";

const fontMap = {
    'inter': 'var(--font-inter)',
    'poppins': 'var(--font-poppins)',
    'lato': 'var(--font-lato)',
    'montserrat': 'var(--font-montserrat)',
    'roboto': 'var(--font-roboto)',
    'times new roman': '"Times New Roman", serif'
};

const CUSTOM_COLOR_PROPERTIES = [
    "--text-body",
    "--card-foreground",
    "--popover-foreground",
    "--foreground",
    "--sidebar-foreground",
    "--sidebar-accent-foreground",
    "--text-heading",
    "--btn-bg",
    "--btn-text",
];

function applyToDOM(settings) {
    const root = document.documentElement;

    if (settings.theme === "custom") {
        if (settings.text_color_body) {
            root.style.setProperty("--text-body", settings.text_color_body);
            root.style.setProperty("--card-foreground", settings.text_color_body);
            root.style.setProperty("--popover-foreground", settings.text_color_body);
            root.style.setProperty("--foreground", settings.text_color_body);
            root.style.setProperty("--sidebar-foreground", settings.text_color_body);
            root.style.setProperty("--sidebar-accent-foreground", settings.text_color_body);
        }
        if (settings.text_color_heading) {
            root.style.setProperty("--text-heading", settings.text_color_heading);
        }
        if (settings.button_color_background_normal) {
            root.style.setProperty("--btn-bg", settings.button_color_background_normal);
        }
        if (settings.button_color_text_normal) {
            root.style.setProperty("--btn-text", settings.button_color_text_normal);
        }
        if (settings.button_color_background_hover) {
            root.style.setProperty("--btn-bg-hover", settings.button_color_background_hover);
        }
        if (settings.button_color_text_hover) {
            root.style.setProperty("--btn-text-hover", settings.button_color_text_hover);
        }
    } else {
        // Light/Dark themes use the built-in palette — clear any custom overrides
        CUSTOM_COLOR_PROPERTIES.forEach((prop) => root.style.removeProperty(prop));
    }

    if (settings.font_family) {
        const fontValue = fontMap[settings.font_family.toLowerCase()] || fontMap['inter'];
        root.style.setProperty("--font-primary", fontValue);
    }
    if (settings.theme) {
        root.setAttribute("data-theme", settings.theme);
        root.classList.toggle("dark", settings.theme === "dark");
    }
}

function normalizeSettings(data) {
    return {
        theme: data.theme || 'light',
        font_family: data.font_family || 'inter',
        text_color_body: data.text_color_body || '',
        text_color_heading: data.text_color_heading || '',
        button_color_background_normal: data.button_color_background_normal || '',
        button_color_text_normal: data.button_color_text_normal || '',
        button_color_background_hover: data.button_color_background_hover || '',
        button_color_text_hover: data.button_color_text_hover || '',
        theme_color: data.theme_color || '',
        app_name: data.app_name || '',
    };
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const { getGeneralSettings, updateGeneralSettings } = useUserApi();

    const [settings, setSettings] = useState({
        theme: 'light',
        font_family: 'inter',
        text_color_body: '',
        text_color_heading: '',
        button_color_background_normal: '',
        button_color_text_normal: '',
        button_color_background_hover: '',
        button_color_text_hover: '',
        theme_color: '',
        app_name: '',
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            const data = await getGeneralSettings();
            if (data) {
                const normalized = normalizeSettings(data);
                setSettings(normalized);
                applyToDOM(normalized);
                localStorage.setItem('app_appearance_settings', JSON.stringify(normalized));
            }
            setIsLoading(false);
        };
        fetchSettings();
    }, []);

    // Live preview: update state + immediately apply to DOM
    const updateSettings = (partial) => {
        setSettings(prev => {
            const next = { ...prev, ...partial };
            applyToDOM(next);
            return next;
        });
    };

    // Persist: call API, update localStorage, update state
    const saveSettings = async (newSettings) => {
        setIsSaving(true);
        const result = await updateGeneralSettings(newSettings);
        if (result?.success) {
            setSettings(newSettings);
            applyToDOM(newSettings);
            localStorage.setItem('app_appearance_settings', JSON.stringify(newSettings));
        }
        setIsSaving(false);
        return result;
    };

    // Discard unsaved live-preview edits by re-fetching the last persisted settings
    const resetSettings = async () => {
        const data = await getGeneralSettings();
        if (data) {
            const normalized = normalizeSettings(data);
            setSettings(normalized);
            applyToDOM(normalized);
            localStorage.setItem('app_appearance_settings', JSON.stringify(normalized));
        }
        return data;
    };

    return (
        <ThemeContext.Provider value={{ settings, updateSettings, saveSettings, resetSettings, isLoading, isSaving }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
