import { Popover } from "@base-ui/react/popover";
import { useI18n } from "~/lib/i18n";

interface ConfirmPopoverProps {
  children: React.ReactElement;
  onConfirm: () => void;
  title?: string;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmPopover({
  children,
  onConfirm,
  title,
  confirmText,
  cancelText,
}: ConfirmPopoverProps) {
  const { t } = useI18n();

  return (
    <Popover.Root>
      <Popover.Trigger render={children} />
      <Popover.Portal>
        <Popover.Positioner sideOffset={4}>
          <Popover.Popup className='bg-popover rounded-xs border p-2 text-xs shadow-md'>
            <p className='text-muted-foreground mb-2'>
              {title || t.confirm.deleteMessage}
            </p>
            <div className='flex items-center justify-end gap-1'>
              <Popover.Close className='text-muted-foreground hover:bg-muted rounded-xs border px-2 py-0.5'>
                {cancelText || t.confirm.cancel}
              </Popover.Close>
              <Popover.Close
                className='rounded-xs border border-red-500/50 bg-red-500/10 px-2 py-0.5 text-red-600 hover:bg-red-500/20'
                onClick={onConfirm}>
                {confirmText || t.confirm.delete}
              </Popover.Close>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
