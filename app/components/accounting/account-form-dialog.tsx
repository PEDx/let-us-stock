import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useState, useCallback } from "react";
import type { AccountData } from "~/lib/double-entry/types";
import { useI18n } from "~/lib/i18n";
import { Button } from "~/components/ui/button";
import { createAccountForLedger } from "~/lib/firebase/repository";

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentOptions: AccountData[];
  defaultParentId: string | null;
  userId?: string;
  onCreated?: () => Promise<void> | void;
}

export function AccountFormDialog({
  open,
  onOpenChange,
  parentOptions,
  defaultParentId,
  userId,
  onCreated,
}: AccountFormDialogProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setParentId(defaultParentId);
    setError(null);
  }, [open, defaultParentId]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  }, []);

  const handleParentChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setParentId(e.target.value);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId) {
      setError(t.sync.loginRequired);
      return;
    }
    if (!name.trim() || !parentId) {
      setError(t.common.required);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await createAccountForLedger(userId, {
        name: name.trim(),
        parentId,
      });
      await onCreated?.();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.sync.syncError,
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className='fixed inset-0 bg-black/40 backdrop-blur-sm' />
        <Dialog.Popup className='bg-popover fixed top-1/2 left-1/2 w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-xs border p-4 text-xs shadow-lg'>
          <Dialog.Title className='text-foreground text-sm font-medium'>
            {t.assets.addAccount}
          </Dialog.Title>
          <Dialog.Description className='text-muted-foreground mt-1 text-xs'>
            {t.assets.accountName}
          </Dialog.Description>

          <form
            className='mt-4 space-y-3'
            onSubmit={handleSubmit}>
            <div className='space-y-2'>
              <label className='text-muted-foreground text-xs font-medium'>
                {t.assets.accountName}
              </label>
              <input
                value={name}
                onChange={handleNameChange}
                className='border-input bg-background h-8 w-full rounded-xs border px-2 text-xs'
                placeholder={t.assets.accountName}
              />
            </div>
            <div className='space-y-2'>
              <label className='text-muted-foreground text-xs font-medium'>
                {t.assets.accountType}
              </label>
              <select
                value={parentId ?? ""}
                onChange={handleParentChange}
                className='border-input bg-background h-8 w-full rounded-xs border px-2 text-xs'>
                {parentOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.path}
                  </option>
                ))}
              </select>
            </div>
            {error ? <p className='text-destructive text-xs'>{error}</p> : null}
            <div className='flex items-center justify-end gap-2 pt-2'>
              <Dialog.Close className='text-muted-foreground hover:bg-muted rounded-xs border px-2 py-1 text-xs'>
                {t.common.cancel}
              </Dialog.Close>
              <Button type='submit' disabled={isSaving}>
                {t.common.save}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
