import { Link, useLocation } from "react-router";
import { GitHubLogin } from "./github-login";
import { useI18n } from "~/lib/i18n";
import { cn } from "~/lib/utils";

export function Header() {
  const { t } = useI18n();
  const location = useLocation();

  const navItems = [
    { path: "/", label: t.nav.market },
    { path: "/assets", label: t.nav.assets },
    { path: "/records", label: t.nav.records },
  ];

  return (
    <header className='page-area flex items-center justify-between py-1'>
      <nav className='flex items-center gap-4'>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "hover:text-foreground text-xs transition-colors",
              location.pathname === item.path
                ? "text-foreground font-medium"
                : "text-muted-foreground",
            )}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className='flex items-center gap-2'>
        <GitHubLogin />
      </div>
    </header>
  );
}
