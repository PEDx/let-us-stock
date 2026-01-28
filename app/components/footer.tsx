import { ArrowUp } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSelector } from "./language-selector";
import { useI18n } from "~/lib/i18n";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className='page-area'>
      <div className='flex items-center justify-between py-1'>
        <p className='text-muted-foreground text-xs'>
          &copy; {new Date().getFullYear()} {t.common.copyright}
        </p>
        <div className='flex items-center gap-2'>
          <ThemeToggle />
          <LanguageSelector />
          <a
            href='#'
            className='got-to-top text-muted-foreground flex items-center gap-2 rounded-xs border px-1.5 py-0.5 text-xs'>
            <ArrowUp className='size-4' />
          </a>
        </div>
      </div>
    </footer>
  );
}
