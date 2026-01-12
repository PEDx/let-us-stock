"use client";

import { Languages } from "lucide-react";
import { useI18n } from "~/lib/i18n";
import type { Language } from "~/locales";

const languages: { code: Language; name: string; nativeName: string }[] = [
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "en", name: "English", nativeName: "English" },
];

export function LanguageSelector() {
  const { language, setLanguage, t } = useI18n();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value as Language;
    setLanguage(newLanguage);
  };

  return (
    <div className='text-muted-foreground flex items-center gap-1.5 rounded-xs border px-2 text-xs'>
      <Languages className='size-3.5' />
      <select
        className='hover:text-foreground cursor-pointer appearance-none border-none bg-transparent transition-colors outline-none focus:outline-none'
        value={language}
        onChange={handleLanguageChange}
        aria-label={t.common.changeLanguage}>
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
