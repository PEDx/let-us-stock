"use client";

import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { useAuth } from "~/lib/firebase/auth-context";
import { useI18n } from "~/lib/i18n";
import {
  LogOut,
  Loader2,
  Cloud,
  CloudOff,
  Download,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { exportData } from "~/lib/export";
import { cn } from "~/lib/utils";

export function GitHubLogin() {
  const { user, isLoading, loginWithGithub, loginWithGoogle, logout } = useAuth();
  const { t } = useI18n();
  const [loginMenuOpen, setLoginMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className='flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground'>
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
            render={(props) => (
              <button
                {...props}
                className='flex items-center gap-2 rounded-xs border px-2 py-1 text-xs hover:bg-muted'>
                <div className='flex items-center gap-1.5'>
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || user.id}
                      className='size-4 rounded-full'
                    />
                  ) : (
                    <div className='size-4 rounded-full bg-muted flex items-center justify-center text-xs'>
                      {user.email?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <span className='max-w-20 truncate'>
                    {user.displayName || user.email || t.sync.user}
                  </span>
                  {/* 登录方式图标 */}
                  {user.provider === "github" ? (
                    <FaGithub className='size-3 text-muted-foreground' />
                  ) : (
                    <FcGoogle className='size-3' />
                  )}
                </div>

                {/* 连接状态 */}
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs h-full border-l pl-2",
                    "text-green-600",
                  )}
                  title={t.sync.connected}>
                  <Cloud className='size-3' />
                </div>
              </button>
            )}
            nativeButton={false}
          />
          <Popover.Portal>
            <Popover.Positioner sideOffset={4}>
              <Popover.Popup className='min-w-32 rounded-xs border bg-background p-1 shadow-lg'>
                <div className='px-2 py-1 text-xs text-muted-foreground'>
                  {user.email}
                </div>
                <hr className='my-1' />
                <button
                  onClick={exportData}
                  className='flex w-full items-center gap-2 rounded-xs px-2 py-1 text-xs hover:bg-muted'>
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
        render={(props) => (
          <button
            {...props}
            className={cn(
              "flex items-center gap-1.5 rounded-xs border px-2 py-1 text-xs",
              "hover:bg-muted transition-colors",
            )}>
            <CloudOff className='size-3 text-muted-foreground' />
            <span>{t.sync.login}</span>
          </button>
        )}
        nativeButton={false}
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={4}>
          <Popover.Popup className='min-w-40 rounded-xs border bg-background p-1 shadow-lg'>
            <div className='px-2 py-1.5 text-xs text-muted-foreground'>
              {t.sync.chooseProvider}
            </div>
            {/* GitHub 登录 */}
            <button
              onClick={() => {
                setLoginMenuOpen(false);
                loginWithGithub();
              }}
              className='flex w-full items-center gap-2 rounded-xs px-2 py-1.5 text-xs hover:bg-muted'>
              <FaGithub className='size-4' />
              <span>GitHub</span>
            </button>
            {/* Google 登录 */}
            <button
              onClick={() => {
                setLoginMenuOpen(false);
                loginWithGoogle();
              }}
              className='flex w-full items-center gap-2 rounded-xs px-2 py-1.5 text-xs hover:bg-muted'>
              <FcGoogle className='size-4' />
              <span>Google</span>
            </button>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
