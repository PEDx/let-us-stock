import { ThemeToggle } from "./theme-toggle";
import { LanguageSelector } from "./language-selector";
import { GitHubLogin } from "./github-login";
import { useI18n } from "~/lib/i18n";

export function Header() {
  const { t } = useI18n();

  return (
    <header className='page-area flex items-center justify-between py-1'>
      <h1 className='flex items-center gap-1.5 text-base font-semibold max-md:text-sm max-md:gap-1'>
        <svg viewBox='0 0 32 32' className='size-4 max-md:size-3'>
          <circle cx='16' cy='8' r='8' fill='#173181' />
          <circle cx='16' cy='16' r='8' fill='#E1001F' />
          <rect
            x='0'
            y='26'
            width='32'
            height='6'
            rx='1'
            ry='1'
            fill='#173181'
          />
          <rect
            x='0'
            y='0'
            width='6'
            height='32'
            rx='1'
            ry='1'
            fill='#173181'
          />
          <rect
            x='26'
            y='0'
            width='6'
            height='32'
            rx='1'
            ry='1'
            fill='#173181'
          />
        </svg>
        <p>{t.common.appName}</p>
      </h1>
      <div className='flex items-center gap-2'>
        <ThemeToggle />
        <LanguageSelector />
        <GitHubLogin />
      </div>
    </header>
  );
}
