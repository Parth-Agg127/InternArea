import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

import en from "./locales/en.json";
import es from "./locales/es.json";
import hi from "./locales/hi.json";
import pt from "./locales/pt.json";
import zh from "./locales/zh.json";
import fr from "./locales/fr.json";

export type Locale = "en" | "es" | "hi" | "pt" | "zh" | "fr";

const locales: Record<Locale, any> = { en, es, hi, pt, zh, fr };

export const LANGUAGE_OPTIONS: { code: Locale; flag: string; label: string }[] = [
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "es", flag: "🇪🇸", label: "Español" },
  { code: "hi", flag: "🇮🇳", label: "हिन्दी" },
  { code: "pt", flag: "🇧🇷", label: "Português" },
  { code: "zh", flag: "🇨🇳", label: "中文" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
];

interface LanguageContextType {
  locale: Locale;
  setLocale: (code: Locale) => void;
  t: (key: string) => string;
  requestFrench: () => void;
  showFrenchModal: boolean;
  setShowFrenchModal: (v: boolean) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key: string) => key,
  requestFrench: () => {},
  showFrenchModal: false,
  setShowFrenchModal: () => {},
});

export const useTranslation = () => useContext(LanguageContext);

// Deep get helper: t("navbar.internships") → locales[locale].navbar.internships
function deepGet(obj: any, path: string): string {
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current === undefined || current === null) return path;
    current = current[key];
  }
  return typeof current === "string" ? current : path;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [showFrenchModal, setShowFrenchModal] = useState(false);

  // Load saved language on mount
  useEffect(() => {
    const saved = localStorage.getItem("preferredLanguage") as Locale | null;
    if (saved && locales[saved]) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((code: Locale) => {
    if (code === "fr") {
      // French requires OTP verification — open the modal
      setShowFrenchModal(true);
      return;
    }
    setLocaleState(code);
    localStorage.setItem("preferredLanguage", code);
  }, []);

  // Called only after French OTP is verified
  const requestFrench = useCallback(() => {
    setLocaleState("fr");
    localStorage.setItem("preferredLanguage", "fr");
    setShowFrenchModal(false);
  }, []);

  const t = useCallback(
    (key: string): string => {
      return deepGet(locales[locale], key);
    },
    [locale]
  );

  return (
    <LanguageContext.Provider
      value={{ locale, setLocale, t, requestFrench, showFrenchModal, setShowFrenchModal }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
