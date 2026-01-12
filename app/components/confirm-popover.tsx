"use client";

import { Popover } from "@base-ui/react/popover";
import { useI18n } from "~/lib/i18n";

interface ConfirmPopoverProps {
  children: React.ReactNode;
  onConfirm: () => void;
  message?: string;
}

export function ConfirmPopover({
  children,
  onConfirm,
  message,
}: ConfirmPopoverProps) {
  const { t } = useI18n();

  return (
    <Popover.Root>
      <Popover.Trigger className="cursor-pointer">{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={4}>
          <Popover.Popup className="rounded-xs border bg-popover p-2 text-xs shadow-md">
            <p className="mb-2 text-muted-foreground">
              {message || t.confirm.deleteMessage}
            </p>
            <div className="flex items-center justify-end gap-1">
              <Popover.Close className="rounded-xs border px-2 py-0.5 text-muted-foreground hover:bg-muted">
                {t.confirm.cancel}
              </Popover.Close>
              <Popover.Close
                className="rounded-xs border border-red-500/50 bg-red-500/10 px-2 py-0.5 text-red-600 hover:bg-red-500/20"
                onClick={onConfirm}>
                {t.confirm.delete}
              </Popover.Close>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
