"use client";

import { NextIntlClientProvider } from "next-intl";
import { useEffect, useState, createContext, useContext } from "react";
import { loadMessages } from "@/lib/i18n";

const LocaleContext = createContext({
  locale: "en",
  setLocale: () => {},
});

export default function ClientLocaleProvider({ children }) {
  const [locale, setLocale] = useState("en");
  const [messages, setMessages] = useState(loadMessages("en"));

  const updateLocale = (newLocale) => {
    setLocale(newLocale);
    setMessages(loadMessages(newLocale));
    localStorage.setItem("locale", newLocale);
  };

  useEffect(() => {
    const saved = localStorage.getItem("locale") || "en";
    if (saved !== locale) {
      updateLocale(saved);
    }
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale: updateLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within ClientLocaleProvider");
  }
  return context;
};
