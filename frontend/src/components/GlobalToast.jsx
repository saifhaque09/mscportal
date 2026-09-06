"use client";

import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function GlobalToast() {
    const [theme, setTheme] = useState("light");

    useEffect(() => {
        if (typeof window !== "undefined") {
            const isDark = document.documentElement.classList.contains("dark");
            setTheme(isDark ? "dark" : "light");

            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === "class" || mutation.attributeName === "data-theme") {
                        setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
                    }
                });
            });

            observer.observe(document.documentElement, { attributes: true });
            return () => observer.disconnect();
        }
    }, []);

    return <ToastContainer position="top-right" autoClose={3000} theme={theme} />;
}
