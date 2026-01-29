import { useMemo, useState, memo } from "react";
import { AccountType } from "~/lib/double-entry/types";
import { useI18n } from "~/lib/i18n";
import { buildAccountGroups, buildAssetsOverview } from "~/lib/accounting/view";
import { useBookData } from "~/lib/accounting/use-book";
import { useAuth } from "~/lib/firebase/auth-context";
import { AccountFormDialog } from "~/components/accounting/account-form-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { BookSelector } from "~/components/book-selector";

export function meta() {
  return [
    { title: "Assets" },
    { name: "description", content: "Manage your assets" },
  ];
}

// Hoist static function for empty state
function createEmptyState(message: string) {
  return (
    <div className='text-muted-foreground flex h-20 items-center justify-center rounded-xs border border-dashed text-xs'>
      {message}
    </div>
  );
}

export default function Assets() {
  const { t } = useI18n();
  const { user } = useAuth();
  const {
    book,
    books,
    invites,
    selectedBookId,
    selectBook,
    createBook,
    sendInvite,
    acceptInvite,
    isLoading,
    error,
    source,
    reload,
  } = useBookData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const parentOptions = useMemo(
    () => book?.accounts.filter((account) => !account.archived) ?? [],
    [book],
  );
  const defaultParentId =
    parentOptions.find((account) => account.type === AccountType.ASSETS)?.id ??
    parentOptions[0]?.id ??
    null;

  if (isLoading) {
    return (
      <main className='page-area my-2'>
        <div className='text-muted-foreground flex h-40 items-center justify-center border border-dashed text-sm'>
          {t.common.loading}
        </div>
      </main>
    );
  }

  if (!book) {
    const pendingInvites = invites.filter((invite) => invite.status === "pending");
    return (
      <main className='page-area my-2 space-y-3'>
        <BookSelector
          books={books}
          invites={invites}
          selectedBookId={selectedBookId}
          canManage={!!user}
          onSelect={selectBook}
          onCreateBook={createBook}
          onInvite={sendInvite}
          onAcceptInvite={acceptInvite}
        />
        <div className='rounded-xs border border-dashed p-4 text-sm'>
          <p className='text-foreground font-medium'>{t.books.emptyTitle}</p>
          <p className='text-muted-foreground mt-1 text-xs'>
            {t.books.emptyDescription}
          </p>
        </div>
        {pendingInvites.length > 0 ? (
          <div className='space-y-2'>
            <p className='text-muted-foreground text-xs font-medium'>
              {t.books.pendingInvites}
            </p>
            <div className='space-y-2'>
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className='flex items-center justify-between rounded-xs border px-3 py-2 text-xs'>
                  <div className='min-w-0'>
                    <p className='text-foreground truncate'>{invite.bookName}</p>
                    <p className='text-muted-foreground truncate text-[10px]'>
                      {invite.inviteeEmail}
                    </p>
                  </div>
                  <Button
                    size='xs'
                    onClick={() => acceptInvite(invite)}
                    disabled={!user}>
                    {t.books.accept}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {error ? (
          <div className='border-destructive/50 bg-destructive/5 text-destructive rounded-xs border px-3 py-2 text-xs'>
            {error}
          </div>
        ) : null}
      </main>
    );
  }

  const overview = buildAssetsOverview(book);
  const groups = buildAccountGroups(book, [
    AccountType.ASSETS,
    AccountType.LIABILITIES,
  ]);
  const isDisconnected = source === "demo" || source === "empty";
  const sourceLabel = isDisconnected ? t.sync.disconnected : t.sync.connected;
  const sourceVariant = isDisconnected ? "secondary" : "outline";

  const typeLabels = {
    [AccountType.ASSETS]: t.assets.types.assets,
    [AccountType.LIABILITIES]: t.assets.types.liabilities,
    [AccountType.EQUITY]: t.assets.types.equity,
    [AccountType.INCOME]: t.assets.types.income,
    [AccountType.EXPENSES]: t.assets.types.expenses,
  };

  return (
    <main className='page-area space-y-4 py-4'>
      <header className='flex items-center justify-between gap-3'>
        <div className='space-y-1'>
          <p className='text-muted-foreground text-[10px] tracking-[0.2em] uppercase'>
            {t.assets.overview}
          </p>
          <div className='flex flex-wrap items-center gap-2'>
            <h1 className='text-foreground text-lg font-semibold'>
              {t.nav.assets}
            </h1>
            <Badge variant={sourceVariant} className='text-[10px]'>
              {sourceLabel}
            </Badge>
          </div>
          <p className='text-muted-foreground text-xs'>{t.assets.accounts}</p>
          <BookSelector
            books={books}
            invites={invites}
            selectedBookId={selectedBookId}
            canManage={!!user}
            onSelect={selectBook}
            onCreateBook={createBook}
            onInvite={sendInvite}
            onAcceptInvite={acceptInvite}
          />
        </div>
        <Button
          variant='outline'
          disabled={!user}
          onClick={() => setIsFormOpen(true)}>
          {t.assets.addAccount}
        </Button>
      </header>
      {error ? (
        <div className='border-destructive/50 bg-destructive/5 text-destructive rounded-xs border px-3 py-2 text-xs'>
          {error}
        </div>
      ) : null}

      <AccountFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        parentOptions={parentOptions}
        defaultParentId={defaultParentId}
        userId={user?.id}
        bookId={selectedBookId ?? undefined}
        onCreated={reload}
      />

      <section className='grid gap-3 md:grid-cols-3'>
        <OverviewCard title={t.assets.netWorth} amounts={overview.netWorth} />
        <OverviewCard title={t.assets.totalAssets} amounts={overview.assets} />
        <OverviewCard
          title={t.assets.totalLiabilities}
          amounts={overview.liabilities}
        />
      </section>

      <section className='grid gap-4 md:grid-cols-2'>
        {groups.map((group) => (
          <AccountGroupCard
            key={group.type}
            group={group}
            typeLabel={typeLabels[group.type]}
            accountsLabel={t.assets.accounts}
            archivedLabel={t.assets.archived}
            noDataLabel={t.common.noData}
          />
        ))}
      </section>
    </main>
  );
}

// Memoized account group card component to prevent unnecessary re-renders
const AccountGroupCard = memo(function AccountGroupCard({
  group,
  typeLabel,
  accountsLabel,
  archivedLabel,
  noDataLabel,
}: {
  group: ReturnType<typeof buildAccountGroups>[number];
  typeLabel: string;
  accountsLabel: string;
  archivedLabel: string;
  noDataLabel: string;
}) {
  return (
    <div className='bg-card rounded-xs border p-3 shadow-sm'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h2 className='text-foreground text-xs font-semibold'>
            {typeLabel}
          </h2>
          <p className='text-muted-foreground text-[10px]'>
            {accountsLabel}
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

      <div className='mt-3 space-y-1.5'>
        {group.rows.map((row) => (
          <AccountRow
            key={row.id}
            row={row}
            archivedLabel={archivedLabel}
          />
        ))}
        {group.rows.length === 0 ? createEmptyState(noDataLabel) : null}
      </div>
    </div>
  );
});

// Memoized account row component to prevent unnecessary re-renders
const AccountRow = memo(function AccountRow({
  row,
  archivedLabel,
}: {
  row: ReturnType<typeof buildAccountGroups>[number]["rows"][number];
  archivedLabel: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xs border px-2 py-1.5 text-xs",
        row.isRoot ? "bg-muted/30 font-medium" : "bg-background",
      )}>
      <div className='flex items-center gap-2'>
        <span
          className='block'
          style={{ paddingLeft: row.level * 14 }}>
          {row.name}
        </span>
        {row.archived ? (
          <Badge variant='secondary'>{archivedLabel}</Badge>
        ) : null}
      </div>
      <span className='text-foreground font-semibold'>
        {row.formattedBalance}
      </span>
    </div>
  );
});

const OverviewCard = memo(function OverviewCard({
  title,
  amounts,
}: {
  title: string;
  amounts: Array<{ currency: string; formatted: string }>;
}) {
  return (
    <div className='bg-card rounded-xs border px-3 py-2 shadow-sm'>
      <p className='text-muted-foreground text-[10px] tracking-[0.2em] uppercase'>
        {title}
      </p>
      <div className='mt-2 flex flex-wrap gap-2 text-xs'>
        {amounts.map((item) => (
          <Badge key={item.currency} variant='outline'>
            {item.formatted}
          </Badge>
        ))}
      </div>
    </div>
  );
});
