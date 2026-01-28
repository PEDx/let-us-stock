import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useState } from "react";
import type { AccountData } from "~/lib/double-entry/types";
import { useI18n } from "~/lib/i18n";
import { Button } from "~/components/ui/button";
import { createSimpleEntryForLedger } from "~/lib/firebase/repository";

interface EntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountOptions: AccountData[];
  defaultDebitId: string;
  defaultCreditId: string;
  userId?: string;
  onCreated?: () => Promise<void> | void;
}

export function EntryFormDialog({
  open,
  onOpenChange,
  accountOptions,
  defaultDebitId,
  defaultCreditId,
  userId,
  onCreated,
}: EntryFormDialogProps) {
  const { t } = useI18n();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    debitAccountId: "",
    creditAccountId: "",
    payee: "",
    tags: "",
  });

  const debitAccount = accountOptions.find(
    (account) => account.id === form.debitAccountId,
  );
  const creditAccount = accountOptions.find(
    (account) => account.id === form.creditAccountId,
  );
  const isCurrencyMismatch =
    debitAccount &&
    creditAccount &&
    debitAccount.currency !== creditAccount.currency;

  useEffect(() => {
    if (!open) return;
    setForm((prev) => ({
      ...prev,
      debitAccountId: defaultDebitId,
      creditAccountId: defaultCreditId,
    }));
    setError(null);
  }, [open, defaultDebitId, defaultCreditId]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className='fixed inset-0 bg-black/40 backdrop-blur-sm' />
        <Dialog.Popup className='bg-popover fixed top-1/2 left-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-xs border p-4 text-xs shadow-lg'>
          <Dialog.Title className='text-foreground text-sm font-medium'>
            {t.records.newEntry}
          </Dialog.Title>
          <Dialog.Description className='text-muted-foreground mt-1 text-xs'>
            {t.records.flow}
          </Dialog.Description>

          <form
            className='mt-4 space-y-3'
            onSubmit={async (event) => {
              event.preventDefault();
              if (!userId) {
                setError(t.sync.loginRequired);
                return;
              }
              if (!form.description.trim()) {
                setError(t.common.required);
                return;
              }
              if (!form.debitAccountId || !form.creditAccountId) {
                setError(t.common.required);
                return;
              }
              const amount = Number(form.amount);
              if (!Number.isFinite(amount) || amount <= 0) {
                setError(t.records.invalidAmount);
                return;
              }
              if (isCurrencyMismatch) {
                setError(t.records.currencyMismatch);
                return;
              }
              setIsSaving(true);
              setError(null);
              try {
                const tags = form.tags
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean);
                await createSimpleEntryForLedger(userId, {
                  date: form.date,
                  description: form.description.trim(),
                  debitAccountId: form.debitAccountId,
                  creditAccountId: form.creditAccountId,
                  amount,
                  payee: form.payee.trim() || undefined,
                  tags: tags.length ? tags : undefined,
                });
                await onCreated?.();
                setForm({
                  date: new Date().toISOString().split("T")[0],
                  description: "",
                  amount: "",
                  debitAccountId: defaultDebitId,
                  creditAccountId: defaultCreditId,
                  payee: "",
                  tags: "",
                });
                onOpenChange(false);
              } catch (error) {
                setError(
                  error instanceof Error ? error.message : t.sync.syncError,
                );
              } finally {
                setIsSaving(false);
              }
            }}>
            <div className='grid gap-3 md:grid-cols-3'>
              <div className='space-y-2'>
                <label className='text-muted-foreground text-xs font-medium'>
                  {t.records.description}
                </label>
                <input
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  className='border-input bg-background h-8 w-full rounded-xs border px-2 text-xs'
                  placeholder={t.records.description}
                />
              </div>
              <div className='space-y-2'>
                <label className='text-muted-foreground text-xs font-medium'>
                  {t.records.amount}
                </label>
                <input
                  value={form.amount}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, amount: event.target.value }))
                  }
                  type='number'
                  inputMode='decimal'
                  className='border-input bg-background h-8 w-full rounded-xs border px-2 text-xs'
                  placeholder={t.records.amount}
                />
              </div>
              <div className='space-y-2'>
                <label className='text-muted-foreground text-xs font-medium'>
                  {t.records.date}
                </label>
                <input
                  value={form.date}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, date: event.target.value }))
                  }
                  type='date'
                  className='border-input bg-background h-8 w-full rounded-xs border px-2 text-xs'
                />
              </div>
            </div>

            <div className='grid gap-3 md:grid-cols-3'>
              <div className='space-y-2'>
                <label className='text-muted-foreground text-xs font-medium'>
                  {t.records.debit}
                </label>
                <select
                  value={form.debitAccountId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      debitAccountId: event.target.value,
                    }))
                  }
                  className='border-input bg-background h-8 w-full rounded-xs border px-2 text-xs'>
                  {accountOptions.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.path}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-2'>
                <label className='text-muted-foreground text-xs font-medium'>
                  {t.records.credit}
                </label>
                <select
                  value={form.creditAccountId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      creditAccountId: event.target.value,
                    }))
                  }
                  className='border-input bg-background h-8 w-full rounded-xs border px-2 text-xs'>
                  {accountOptions.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.path}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-2'>
                <label className='text-muted-foreground text-xs font-medium'>
                  {t.records.payee}
                </label>
                <input
                  value={form.payee}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, payee: event.target.value }))
                  }
                  className='border-input bg-background h-8 w-full rounded-xs border px-2 text-xs'
                  placeholder={t.records.payee}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <label className='text-muted-foreground text-xs font-medium'>
                {t.records.tags}
              </label>
              <input
                value={form.tags}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, tags: event.target.value }))
                }
                className='border-input bg-background h-8 w-full rounded-xs border px-2 text-xs'
                placeholder='tag1, tag2'
              />
            </div>

            {isCurrencyMismatch ? (
              <p className='text-destructive text-xs'>
                {t.records.currencyMismatch}
              </p>
            ) : null}
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
