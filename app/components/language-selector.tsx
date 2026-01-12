"use client";

import { Languages } from "lucide-react";
import { useEffect, useState } from "react";

export type Language = "zh" | "en" | "fr" | "de" | "es" | "ja";

const languages: { code: Language; name: string; nativeName: string }[] = [
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "en", name: "English", nativeName: "English" },
];

export function LanguageSelector() {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    // 从 localStorage 读取语言设置，如果没有则使用浏览器语言
    const savedLanguage = localStorage.getItem("language") as Language | null;
    const browserLanguage = navigator.language.split("-")[0] as Language;
    const initialLanguage =
      savedLanguage ||
      (languages.some((lang) => lang.code === browserLanguage)
        ? browserLanguage
        : "en");
    setLanguage(initialLanguage);
    applyLanguage(initialLanguage);
  }, []);

  const applyLanguage = (newLanguage: Language) => {
    document.documentElement.lang = newLanguage;
    localStorage.setItem("language", newLanguage);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value as Language;
    setLanguage(newLanguage);
    applyLanguage(newLanguage);
  };

  return (
    <div className='flex items-center gap-1.5 text-xs text-muted-foreground border rounded-xs px-2'>
      <Languages className='size-3.5' />
      <select
        className='bg-transparent border-none outline-none cursor-pointer appearance-none focus:outline-none hover:text-foreground transition-colors'
        value={language}
        onChange={handleLanguageChange}
        aria-label='change language'>
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
