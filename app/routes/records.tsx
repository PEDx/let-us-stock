import { useMemo, useState } from "react";
import { useI18n } from "~/lib/i18n";
import {
  buildEntryRows,
  buildPeriodSummary,
  getCurrentMonthRange,
} from "~/lib/accounting/view";
import { useLedgerData } from "~/lib/accounting/use-ledger";
import { useAuth } from "~/lib/firebase/auth-context";
import { EntryFormDialog } from "~/components/accounting/entry-form-dialog";
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

  if (isLoading) {
    return (
      <main className='page-area my-2'>
        <div className='text-muted-foreground flex h-40 items-center justify-center border border-dashed text-sm'>
          {t.common.loading}
        </div>
      </main>
    );
  }

  if (!ledger) {
    return (
      <main className='page-area my-2'>
        <div className='text-muted-foreground flex h-40 items-center justify-center border border-dashed text-sm'>
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
    <main className='page-area space-y-4 py-4'>
      <header className='flex items-center justify-between gap-3'>
        <div className='space-y-1'>
          <p className='text-muted-foreground text-[10px] tracking-[0.2em] uppercase'>
            {t.records.flow}
          </p>
          <div className='flex flex-wrap items-center gap-2'>
            <h1 className='text-foreground text-lg font-semibold'>
              {t.nav.records}
            </h1>
            <Badge variant={sourceVariant} className='text-[10px]'>
              {sourceLabel}
            </Badge>
          </div>
          <p className='text-muted-foreground text-xs'>{t.records.thisMonth}</p>
        </div>
        <Button disabled={!user} onClick={() => setIsFormOpen(true)}>
          {t.records.newEntry}
        </Button>
      </header>
      {error ? (
        <div className='border-destructive/50 bg-destructive/5 text-destructive rounded-xs border px-3 py-2 text-xs'>
          {error}
        </div>
      ) : null}
      <EntryFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        accountOptions={accountOptions}
        defaultDebitId={defaultDebitId}
        defaultCreditId={defaultCreditId}
        userId={user?.id}
        onCreated={reload}
      />

      <section className='grid gap-3 md:grid-cols-3'>
        <SummaryCard title={t.records.incomeTotal} value={summary.income} />
        <SummaryCard title={t.records.expenseTotal} value={summary.expenses} />
        <SummaryCard title={t.records.balance} value={summary.netChange} />
      </section>

      <section className='bg-card rounded-xs border p-3 shadow-sm'>
        <div className='flex items-center justify-between'>
          <h2 className='text-foreground text-xs font-semibold'>
            {t.records.flow}
          </h2>
          <Badge variant='secondary' className='text-[10px]'>
            {t.records.filter}
          </Badge>
        </div>

        <div className='mt-3 space-y-2'>
          {entries.length === 0 ? (
            <div className='text-muted-foreground flex h-20 items-center justify-center rounded-xs border border-dashed text-xs'>
              {t.records.noEntries}
            </div>
          ) : null}
          {entries.map((entry) => (
            <div
              key={entry.id}
              className='flex flex-col gap-2 rounded-xs border px-3 py-2 md:flex-row md:items-start md:justify-between'>
              <div className='space-y-1'>
                <div className='flex items-center gap-2'>
                  <span className='text-foreground text-xs font-medium'>
                    {entry.description}
                  </span>
                  <Badge variant='outline'>
                    {categoryLabels[entry.category]}
                  </Badge>
                </div>
                <p className='text-muted-foreground text-xs'>
                  {entry.date}
                  {entry.payee ? ` · ${entry.payee}` : ""}
                </p>
                <div className='text-muted-foreground flex flex-wrap gap-2 text-xs'>
                  {entry.accounts.map((account) => (
                    <span
                      key={`${entry.id}-${account}`}
                      className='rounded-full border px-2 py-0.5 text-[10px]'>
                      {account}
                    </span>
                  ))}
                </div>
              </div>
              <div className='flex flex-col items-end gap-2'>
                <span
                  className={cn(
                    "text-xs font-semibold",
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
    <div className='bg-card rounded-xs border px-3 py-2 shadow-sm'>
      <p className='text-muted-foreground text-[10px] tracking-[0.2em] uppercase'>
        {title}
      </p>
      <p className='text-foreground mt-2 text-xs font-semibold'>
        {value.formatted}
      </p>
    </div>
  );
}
