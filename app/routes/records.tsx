import { useEffect, useMemo, useState } from "react";
import { useI18n } from "~/lib/i18n";
import {
  buildEntryRows,
  buildPeriodSummary,
  getCurrentMonthRange,
} from "~/lib/accounting/view";
import { useLedgerData } from "~/lib/accounting/use-ledger";
import { createSimpleEntryForLedger } from "~/lib/firebase/repository";
import { useAuth } from "~/lib/firebase/auth-context";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function meta() {
  return [
    { title: "Records" },
    { name: "description", content: "View your records" },
  ];
}

export default function Records() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { ledger, isLoading, error, source, reload } = useLedgerData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    debitAccountId: "",
    creditAccountId: "",
    payee: "",
    tags: "",
  });
  const accountOptions = useMemo(
    () => ledger?.accounts.filter((account) => !account.archived) ?? [],
    [ledger],
  );
  const defaultDebitId =
    accountOptions.find((account) => account.type === "expenses")?.id ??
    accountOptions[0]?.id ??
    "";
  const defaultCreditId =
    accountOptions.find((account) => account.type === "assets")?.id ??
    accountOptions[0]?.id ??
    "";
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
    if (!ledger) return;
    setForm((prev) => ({
      ...prev,
      debitAccountId: prev.debitAccountId || defaultDebitId,
      creditAccountId: prev.creditAccountId || defaultCreditId,
    }));
  }, [ledger, defaultDebitId, defaultCreditId]);

  if (isLoading) {
    return (
      <main className='page-area my-2'>
        <div className='flex h-40 items-center justify-center border border-dashed text-sm text-muted-foreground'>
          {t.common.loading}
        </div>
      </main>
    );
  }

  if (!ledger) {
    return (
      <main className='page-area my-2'>
        <div className='flex h-40 items-center justify-center border border-dashed text-sm text-muted-foreground'>
          {t.common.noData}
        </div>
      </main>
    );
  }

  const monthRange = getCurrentMonthRange();
  const summary = buildPeriodSummary(ledger, monthRange);
  const entries = buildEntryRows(ledger);
  const categoryLabels = {
    expense: t.records.expense,
    income: t.records.income,
    transfer: t.records.transfer,
    unknown: t.records.entryType,
  };
  const sourceLabel =
    source === "demo" ? t.sync.disconnected : t.sync.connected;
  const sourceVariant = source === "demo" ? "secondary" : "outline";

  return (
    <main className='page-area space-y-6 py-6'>
      <header className='flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
        <div className='space-y-1'>
          <p className='text-xs uppercase tracking-[0.2em] text-muted-foreground'>
            {t.records.flow}
          </p>
          <div className='flex flex-wrap items-center gap-2'>
            <h1 className='text-2xl font-semibold text-foreground'>
              {t.nav.records}
            </h1>
            <Badge variant={sourceVariant}>{sourceLabel}</Badge>
          </div>
          <p className='text-sm text-muted-foreground'>
            {t.records.thisMonth}
          </p>
        </div>
        <Button
          size='sm'
          disabled={!user}
          onClick={() => {
            setFormError(null);
            setIsFormOpen((prev) => !prev);
          }}>
          {t.records.newEntry}
        </Button>
      </header>
      {error ? (
        <div className='rounded-md border border-destructive/50 bg-destructive/5 px-4 py-2 text-xs text-destructive'>
          {error}
        </div>
      ) : null}
      {isFormOpen ? (
        <form
          className='rounded-lg border bg-card p-4 shadow-sm'
          onSubmit={async (event) => {
            event.preventDefault();
            if (!user) {
              setFormError(t.sync.loginRequired);
              return;
            }
            if (!form.description.trim()) {
              setFormError(t.common.required);
              return;
            }
            if (!form.debitAccountId || !form.creditAccountId) {
              setFormError(t.common.required);
              return;
            }
            const amount = Number(form.amount);
            if (!Number.isFinite(amount) || amount <= 0) {
              setFormError(t.records.invalidAmount);
              return;
            }
            if (isCurrencyMismatch) {
              setFormError(t.records.currencyMismatch);
              return;
            }
            setIsSaving(true);
            setFormError(null);
            try {
              const tags = form.tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean);
              await createSimpleEntryForLedger(user.id, {
                date: form.date,
                description: form.description.trim(),
                debitAccountId: form.debitAccountId,
                creditAccountId: form.creditAccountId,
                amount,
                payee: form.payee.trim() || undefined,
                tags: tags.length ? tags : undefined,
              });
              await reload();
              setForm({
                date: new Date().toISOString().split("T")[0],
                description: "",
                amount: "",
                debitAccountId: defaultDebitId,
                creditAccountId: defaultCreditId,
                payee: "",
                tags: "",
              });
              setIsFormOpen(false);
            } catch (error) {
              setFormError(
                error instanceof Error ? error.message : t.sync.syncError,
              );
            } finally {
              setIsSaving(false);
            }
          }}>
          <div className='grid gap-4 md:grid-cols-3'>
            <div className='space-y-2'>
              <label className='text-xs font-medium text-muted-foreground'>
                {t.records.description}
              </label>
              <input
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                className='h-9 w-full rounded-md border border-input bg-background px-3 text-sm'
                placeholder={t.records.description}
              />
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-medium text-muted-foreground'>
                {t.records.amount}
              </label>
              <input
                value={form.amount}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, amount: event.target.value }))
                }
                type='number'
                inputMode='decimal'
                className='h-9 w-full rounded-md border border-input bg-background px-3 text-sm'
                placeholder={t.records.amount}
              />
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-medium text-muted-foreground'>
                {t.records.date}
              </label>
              <input
                value={form.date}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, date: event.target.value }))
                }
                type='date'
                className='h-9 w-full rounded-md border border-input bg-background px-3 text-sm'
              />
            </div>
          </div>
          <div className='mt-4 grid gap-4 md:grid-cols-3'>
            <div className='space-y-2'>
              <label className='text-xs font-medium text-muted-foreground'>
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
                className='h-9 w-full rounded-md border border-input bg-background px-3 text-sm'>
                {accountOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.path}
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-medium text-muted-foreground'>
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
                className='h-9 w-full rounded-md border border-input bg-background px-3 text-sm'>
                {accountOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.path}
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-medium text-muted-foreground'>
                {t.records.payee}
              </label>
              <input
                value={form.payee}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, payee: event.target.value }))
                }
                className='h-9 w-full rounded-md border border-input bg-background px-3 text-sm'
                placeholder={t.records.payee}
              />
            </div>
          </div>
          <div className='mt-4 flex flex-wrap items-end justify-between gap-3'>
            <div className='flex-1 space-y-2'>
              <label className='text-xs font-medium text-muted-foreground'>
                {t.records.tags}
              </label>
              <input
                value={form.tags}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, tags: event.target.value }))
                }
                className='h-9 w-full rounded-md border border-input bg-background px-3 text-sm'
                placeholder='tag1, tag2'
              />
              {isCurrencyMismatch ? (
                <p className='text-xs text-destructive'>
                  {t.records.currencyMismatch}
                </p>
              ) : null}
            </div>
            <div className='flex items-center gap-2'>
              <Button type='submit' size='sm' disabled={isSaving}>
                {t.common.save}
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => setIsFormOpen(false)}>
                {t.common.cancel}
              </Button>
            </div>
          </div>
          {formError ? (
            <p className='mt-2 text-xs text-destructive'>{formError}</p>
          ) : null}
        </form>
      ) : null}

      <section className='grid gap-4 md:grid-cols-3'>
        <SummaryCard title={t.records.incomeTotal} value={summary.income} />
        <SummaryCard title={t.records.expenseTotal} value={summary.expenses} />
        <SummaryCard title={t.records.balance} value={summary.netChange} />
      </section>

      <section className='rounded-lg border bg-card p-4 shadow-sm'>
        <div className='flex items-center justify-between'>
          <h2 className='text-sm font-semibold text-foreground'>
            {t.records.flow}
          </h2>
          <Badge variant='secondary'>{t.records.filter}</Badge>
        </div>

        <div className='mt-4 space-y-3'>
          {entries.length === 0 ? (
            <div className='flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground'>
              {t.records.noEntries}
            </div>
          ) : null}
          {entries.map((entry) => (
            <div
              key={entry.id}
              className='flex flex-col gap-2 rounded-md border px-4 py-3 md:flex-row md:items-start md:justify-between'>
              <div className='space-y-1'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-medium text-foreground'>
                    {entry.description}
                  </span>
                  <Badge variant='outline'>
                    {categoryLabels[entry.category]}
                  </Badge>
                </div>
                <p className='text-xs text-muted-foreground'>
                  {entry.date}
                  {entry.payee ? ` · ${entry.payee}` : ""}
                </p>
                <div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
                  {entry.accounts.map((account) => (
                    <span
                      key={`${entry.id}-${account}`}
                      className='rounded-full border px-2 py-0.5'>
                      {account}
                    </span>
                  ))}
                </div>
              </div>
              <div className='flex flex-col items-end gap-2'>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    entry.category === "expense"
                      ? "text-destructive"
                      : entry.category === "income"
                        ? "text-emerald-600"
                        : "text-foreground",
                  )}>
                  {entry.formattedAmount}
                </span>
                {entry.tags && entry.tags.length > 0 ? (
                  <div className='flex flex-wrap gap-1'>
                    {entry.tags.map((tag) => (
                      <Badge key={`${entry.id}-${tag}`} variant='secondary'>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: { formatted: string };
}) {
  return (
    <div className='rounded-lg border bg-card p-4 shadow-sm'>
      <p className='text-xs uppercase tracking-[0.2em] text-muted-foreground'>
        {title}
      </p>
      <p className='mt-3 text-lg font-semibold text-foreground'>
        {value.formatted}
      </p>
    </div>
  );
}
