"use client";

import { Popover } from "@base-ui/react/popover";
import { useAuth } from "~/lib/auth";
import { useI18n } from "~/lib/i18n";
import { Github, LogOut, Loader2, Cloud, CloudOff } from "lucide-react";
import { cn } from "~/lib/utils";

interface GitHubLoginProps {
  onSyncStatusChange?: (syncing: boolean) => void;
}

export function GitHubLogin({ onSyncStatusChange }: GitHubLoginProps) {
  const { user, isLoading, login, logout } = useAuth();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {/* 同步状态 */}
        <div className="flex items-center gap-1 text-xs text-green-600" title={t.sync.connected}>
          <Cloud className="size-3" />
        </div>

        {/* 用户头像和菜单 */}
        <Popover.Root>
          <Popover.Trigger
            render={(props) => (
              <button
                {...props}
                className="flex items-center gap-1.5 rounded-xs border px-2 py-1 text-xs hover:bg-muted">
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="size-4 rounded-full"
                />
                <span className="max-w-16 truncate">{user.login}</span>
              </button>
            )}
            nativeButton={false}
          />
          <Popover.Portal>
            <Popover.Positioner sideOffset={4}>
              <Popover.Popup className="min-w-32 rounded-xs border bg-background p-1 shadow-lg">
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  {user.name || user.login}
                </div>
                <hr className="my-1" />
                <Popover.Close
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-xs px-2 py-1 text-xs text-red-600 hover:bg-red-500/10">
                  <LogOut className="size-3" />
                  {t.sync.logout}
                </Popover.Close>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className={cn(
        "flex items-center gap-1.5 rounded-xs border px-2 py-1 text-xs",
        "hover:bg-muted transition-colors",
      )}>
      <Github className="size-3" />
      <span>{t.sync.login}</span>
      <CloudOff className="size-3 text-muted-foreground" />
    </button>
  );
}
