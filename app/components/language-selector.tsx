;

import { Select } from "@base-ui/react/select";
import { Languages, ChevronDown, Check } from "lucide-react";
import { useI18n } from "~/lib/i18n";
import type { Language } from "~/locales";

const languages: { code: Language; nativeName: string }[] = [
  { code: "zh", nativeName: "中文" },
  { code: "en", nativeName: "English" },
];

export function LanguageSelector() {
  const { language, setLanguage, t } = useI18n();

  return (
    <Select.Root value={language} onValueChange={(value) => setLanguage(value as Language)}>
      <Select.Trigger
        className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 rounded-xs border px-1.5 py-0.5 text-xs transition-colors outline-none"
        aria-label={t.common.changeLanguage}>
        <Languages className="size-3" />
        <Select.Value />
        <Select.Icon>
          <ChevronDown className="size-3" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={4}>
          <Select.Popup className="rounded-xs border bg-popover text-xs shadow-md">
            {languages.map((lang) => (
              <Select.Item
                key={lang.code}
                value={lang.code}
                className="flex cursor-pointer items-center gap-2 px-2 py-1 outline-none data-[highlighted]:bg-muted">
                <Select.ItemIndicator className="inline-flex w-3">
                  <Check className="size-3" />
                </Select.ItemIndicator>
                <Select.ItemText>{lang.nativeName}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
