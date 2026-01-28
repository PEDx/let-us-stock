import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { useAuth } from "~/lib/firebase/auth-context";
import { useI18n } from "~/lib/i18n";
import { LogOut, Loader2, Cloud, CloudOff, Download } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { cn } from "~/lib/utils";

export function GitHubLogin() {
  const { user, isLoading, loginWithGithub, loginWithGoogle, logout } =
    useAuth();
  const { t } = useI18n();
  const [loginMenuOpen, setLoginMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className='text-muted-foreground flex items-center gap-1 px-2 py-1 text-xs'>
        <Loader2 className='size-3 animate-spin' />
      </div>
    );
  }

  if (user) {
    return (
      <div className='flex items-center gap-2'>
        {/* 用户头像和菜单 */}
        <Popover.Root>
          <Popover.Trigger
            render={
              <button className='hover:bg-muted inline-flex items-center gap-2 rounded-xs border px-2 py-1 text-xs'>
                <div className='flex items-center gap-1.5'>
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || user.id}
                      className='size-4 rounded-full'
                    />
                  ) : (
                    <div className='bg-muted flex size-4 items-center justify-center rounded-full text-xs'>
                      {user.email?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <span className='max-w-20 truncate'>
                    {user.displayName || user.email || t.sync.user}
                  </span>
                  {/* 登录方式图标 */}
                  {user.provider === "github" ? (
                    <FaGithub className='text-muted-foreground size-3' />
                  ) : (
                    <FcGoogle className='size-3' />
                  )}
                </div>

                {/* 连接状态 */}
                <div
                  className={cn(
                    "flex h-full items-center gap-1 border-l pl-2 text-xs",
                    "text-green-600",
                  )}
                  title={t.sync.connected}>
                  <Cloud className='size-3' />
                </div>
              </button>
            }
          />
          <Popover.Portal>
            <Popover.Positioner sideOffset={4}>
              <Popover.Popup className='bg-background min-w-32 rounded-xs border p-1 shadow-lg'>
                <div className='text-muted-foreground px-2 py-1 text-xs'>
                  {user.email}
                </div>
                <hr className='my-1' />
                <button
                  onClick={() => {}}
                  className='hover:bg-muted flex w-full items-center gap-2 rounded-xs px-2 py-1 text-xs'>
                  <Download className='size-3' />
                  {t.sync.exportData}
                </button>
                <Popover.Close
                  onClick={logout}
                  className='flex w-full items-center gap-2 rounded-xs px-2 py-1 text-xs text-red-600 hover:bg-red-500/10'>
                  <LogOut className='size-3' />
                  {t.sync.logout}
                </Popover.Close>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>
    );
  }

  // 未登录状态 - 显示登录选择菜单
  return (
    <Popover.Root open={loginMenuOpen} onOpenChange={setLoginMenuOpen}>
      <Popover.Trigger
        render={
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-xs border px-2 py-1 text-xs",
              "hover:bg-muted transition-colors",
            )}>
            <CloudOff className='text-muted-foreground size-3' />
            <span>{t.sync.login}</span>
          </button>
        }
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={4}>
          <Popover.Popup className='bg-background min-w-40 rounded-xs border p-1 shadow-lg'>
            <div className='text-muted-foreground px-2 py-1.5 text-xs'>
              {t.sync.chooseProvider}
            </div>
            {/* GitHub 登录 */}
            <button
              onClick={() => {
                setLoginMenuOpen(false);
                loginWithGithub();
              }}
              className='hover:bg-muted flex w-full items-center gap-2 rounded-xs px-2 py-1.5 text-xs'>
              <FaGithub className='size-4' />
              <span>GitHub</span>
            </button>
            {/* Google 登录 */}
            <button
              onClick={() => {
                setLoginMenuOpen(false);
                loginWithGoogle();
              }}
              className='hover:bg-muted flex w-full items-center gap-2 rounded-xs px-2 py-1.5 text-xs'>
              <FcGoogle className='size-4' />
              <span>Google</span>
            </button>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
