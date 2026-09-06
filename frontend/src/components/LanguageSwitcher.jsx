"use client";

import { useLocale } from "./ClientLocaleProvider";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setLocale("en")}
        className={`px-2 py-1 ${locale === "en" ? "font-bold" : ""}`}
        disabled
      >
        EN
      </button>
      <button
        onClick={() => setLocale("fr")}
        className={`px-2 py-1 ${locale === "fr" ? "font-bold" : ""}`}
        disabled
      >
        FR
      </button>
    </div>
  );
}
