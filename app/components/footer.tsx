import { ArrowUp } from "lucide-react";
import { useI18n } from "~/lib/i18n";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className='page-area'>
      <div className='flex items-center justify-between py-1'>
        <p className='text-muted-foreground text-xs'>
          &copy; {new Date().getFullYear()} {t.common.copyright}
        </p>
        <a
          href='#'
          className='got-to-top text-muted-foreground flex items-center gap-2 text-xs'>
          <ArrowUp className='size-4' />
          {t.common.goToTop}
        </a>
      </div>
    </footer>
  );
}
