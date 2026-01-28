import { useMemo, useState } from "react";
import { AccountType } from "~/lib/double-entry/types";
import { useI18n } from "~/lib/i18n";
import { buildAccountGroups, buildAssetsOverview } from "~/lib/accounting/view";
import { useLedgerData } from "~/lib/accounting/use-ledger";
import { createAccountForLedger } from "~/lib/firebase/repository";
import { useAuth } from "~/lib/firebase/auth-context";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function meta() {
  return [
    { title: "Assets" },
    { name: "description", content: "Manage your assets" },
  ];
}

export default function Assets() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { ledger, isLoading, error, source, reload } = useLedgerData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const parentOptions = useMemo(
    () => ledger?.accounts.filter((account) => !account.archived) ?? [],
    [ledger],
  );
  const defaultParentId =
    parentOptions.find((account) => account.type === AccountType.ASSETS)?.id ??
    parentOptions[0]?.id ??
    null;

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

  const overview = buildAssetsOverview(ledger);
  const groups = buildAccountGroups(ledger, [
    AccountType.ASSETS,
    AccountType.LIABILITIES,
  ]);
  const sourceLabel =
    source === "demo" ? t.sync.disconnected : t.sync.connected;
  const sourceVariant = source === "demo" ? "secondary" : "outline";

  const typeLabels = {
    [AccountType.ASSETS]: t.assets.types.assets,
    [AccountType.LIABILITIES]: t.assets.types.liabilities,
    [AccountType.EQUITY]: t.assets.types.equity,
    [AccountType.INCOME]: t.assets.types.income,
    [AccountType.EXPENSES]: t.assets.types.expenses,
  };

  return (
    <main className='page-area space-y-6 py-6'>
      <header className='flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
        <div className='space-y-1'>
          <p className='text-xs uppercase tracking-[0.2em] text-muted-foreground'>
            {t.assets.overview}
          </p>
          <div className='flex flex-wrap items-center gap-2'>
            <h1 className='text-2xl font-semibold text-foreground'>
              {t.nav.assets}
            </h1>
            <Badge variant={sourceVariant}>{sourceLabel}</Badge>
          </div>
          <p className='text-sm text-muted-foreground'>
            {t.assets.accounts}
          </p>
        </div>
        <Button
          variant='outline'
          size='sm'
          disabled={!user}
          onClick={() => {
            setFormError(null);
            setFormName("");
            setParentId(defaultParentId);
            setIsFormOpen((prev) => !prev);
          }}>
          {t.assets.addAccount}
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
            if (!formName.trim() || !parentId) {
              setFormError(t.common.required);
              return;
            }
            setIsSaving(true);
            setFormError(null);
            try {
              await createAccountForLedger(user.id, {
                name: formName.trim(),
                parentId,
              });
              await reload();
              setIsFormOpen(false);
            } catch (error) {
              setFormError(
                error instanceof Error ? error.message : t.sync.syncError,
              );
            } finally {
              setIsSaving(false);
            }
          }}>
          <div className='grid gap-4 md:grid-cols-[2fr_1fr_auto]'>
            <div className='space-y-2'>
              <label className='text-xs font-medium text-muted-foreground'>
                {t.assets.accountName}
              </label>
              <input
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                className='h-9 w-full rounded-md border border-input bg-background px-3 text-sm'
                placeholder={t.assets.accountName}
              />
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-medium text-muted-foreground'>
                {t.assets.accountType}
              </label>
              <select
                value={parentId ?? ""}
                onChange={(event) => setParentId(event.target.value)}
                className='h-9 w-full rounded-md border border-input bg-background px-3 text-sm'>
                {parentOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.path}
                  </option>
                ))}
              </select>
            </div>
            <div className='flex items-end gap-2'>
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
        <OverviewCard
          title={t.assets.netWorth}
          amounts={overview.netWorth}
        />
        <OverviewCard
          title={t.assets.totalAssets}
          amounts={overview.assets}
        />
        <OverviewCard
          title={t.assets.totalLiabilities}
          amounts={overview.liabilities}
        />
      </section>

      <section className='grid gap-6 md:grid-cols-2'>
        {groups.map((group) => (
          <div
            key={group.type}
            className='rounded-lg border bg-card p-4 shadow-sm'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <h2 className='text-sm font-semibold text-foreground'>
                  {typeLabels[group.type]}
                </h2>
                <p className='text-xs text-muted-foreground'>
                  {t.assets.accounts}
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                {group.totals.map((total) => (
                  <Badge key={total.currency} variant='outline'>
                    {total.formatted}
                  </Badge>
                ))}
              </div>
            </div>

            <div className='mt-4 space-y-2'>
              {group.rows.map((row) => (
                <div
                  key={row.id}
                  className={cn(
                    "flex items-center justify-between rounded-md border px-3 py-2 text-sm",
                    row.isRoot
                      ? "bg-muted/30 font-medium"
                      : "bg-background",
                  )}>
                  <div className='flex items-center gap-2'>
                    <span
                      className='block'
                      style={{ paddingLeft: row.level * 14 }}>
                      {row.name}
                    </span>
                    {row.archived ? (
                      <Badge variant='secondary'>{t.assets.archived}</Badge>
                    ) : null}
                  </div>
                  <span className='font-semibold text-foreground'>
                    {row.formattedBalance}
                  </span>
                </div>
              ))}
              {group.rows.length === 0 ? (
                <div className='flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground'>
                  {t.common.noData}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

function OverviewCard({
  title,
  amounts,
}: {
  title: string;
  amounts: Array<{ currency: string; formatted: string }>;
}) {
  return (
    <div className='rounded-lg border bg-card p-4 shadow-sm'>
      <p className='text-xs uppercase tracking-[0.2em] text-muted-foreground'>
        {title}
      </p>
      <div className='mt-3 flex flex-wrap gap-2'>
        {amounts.map((item) => (
          <Badge key={item.currency} variant='outline'>
            {item.formatted}
          </Badge>
        ))}
      </div>
    </div>
  );
}
