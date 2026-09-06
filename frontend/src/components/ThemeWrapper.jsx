"use client";

import { ThemeProvider } from "@/context/ThemeContext";

export default function ThemeWrapper({ children }) {
    return <ThemeProvider>{children}</ThemeProvider>;
}
