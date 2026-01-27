;

import { createContext, useContext, useState, useEffect } from "react";
import { locales, type Language, type Translations } from "~/locales";

type I18nContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
};

const defaultValue: I18nContextType = {
  language: "en",
  setLanguage: () => {},
  t: locales.en,
};

const I18nContext = createContext<I18nContextType>(defaultValue);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language | null;
    const browserLanguage = navigator.language.split("-")[0] as Language;
    const initialLanguage =
      savedLanguage || (browserLanguage in locales ? browserLanguage : "en");
    setLanguageState(initialLanguage);
    document.documentElement.lang = initialLanguage;
    setMounted(true);
  }, []);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    document.documentElement.lang = newLanguage;
    localStorage.setItem("language", newLanguage);
  };

  const t = locales[language];

  const value: I18nContextType = mounted
    ? { language, setLanguage, t }
    : { language: "en", setLanguage, t: locales.en };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
