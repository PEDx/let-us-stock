import { useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Select } from "@base-ui/react/select";
import { Book, ChevronDown, Check, Plus, UserPlus } from "lucide-react";
import { useI18n } from "~/lib/i18n";
import type { BookInvite, BookSummary } from "~/lib/firebase/repository";
import { Button } from "./ui/button";
import { cn } from "~/lib/utils";

interface BookSelectorProps {
  books: BookSummary[];
  invites: BookInvite[];
  selectedBookId: string | null;
  canManage?: boolean;
  onSelect: (bookId: string) => void;
  onCreateBook: (params: { name: string }) => Promise<BookSummary>;
  onInvite: (params: { bookId: string; email: string }) => Promise<BookInvite>;
  onAcceptInvite: (invite: BookInvite) => Promise<void>;
}

export function BookSelector({
  books,
  invites,
  selectedBookId,
  canManage = true,
  onSelect,
  onCreateBook,
  onInvite,
  onAcceptInvite,
}: BookSelectorProps) {
  const { t } = useI18n();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [bookName, setBookName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => books.find((b) => b.id === selectedBookId),
    [books, selectedBookId],
  );
  const canInvite =
    canManage && (selected?.role === "owner" || selected?.role === "editor");

  const pendingInvites = invites.filter((invite) => invite.status === "pending");

  const resetError = () => setError(null);

  const handleCreate = async () => {
    if (!bookName.trim()) return;
    setIsBusy(true);
    resetError();
    try {
      await onCreateBook({ name: bookName.trim() });
      setBookName("");
      setIsCreateOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setIsBusy(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !selectedBookId) return;
    setIsBusy(true);
    resetError();
    try {
      await onInvite({ bookId: selectedBookId, email: inviteEmail.trim() });
      setInviteEmail("");
      setIsInviteOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Select.Root
        value={selectedBookId ?? ""}
        onValueChange={(value) => onSelect(value as string)}>
        <Select.Trigger
          className='text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 rounded-xs border px-1.5 py-0.5 text-xs transition-colors outline-none'
          aria-label={t.books.selectBook}>
          <Book className='size-3' />
          {selected ? (
            <Select.Value />
          ) : (
            <span className='text-muted-foreground'>{t.books.selectBook}</span>
          )}
          <Select.Icon>
            <ChevronDown className='size-3' />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner sideOffset={4}>
            <Select.Popup className='bg-popover min-w-40 rounded-xs border text-xs shadow-md'>
              {books.map((book) => (
                <Select.Item
                  key={book.id}
                  value={book.id}
                  className='data-[highlighted]:bg-muted flex cursor-pointer items-center gap-2 px-2 py-1 outline-none'>
                  <Select.ItemIndicator className='inline-flex w-3'>
                    <Check className='size-3' />
                  </Select.ItemIndicator>
                  <Select.ItemText>{book.name}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>

      <Dialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <Dialog.Trigger
          className={cn(
            "text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-xs border px-1.5 py-0.5 text-xs",
            !canManage && "pointer-events-none opacity-50",
          )}>
          <Plus className='size-3' />
          {t.books.newBook}
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className='fixed inset-0 bg-black/40 backdrop-blur-sm' />
          <Dialog.Popup className='bg-popover fixed top-1/2 left-1/2 w-[min(90vw,360px)] -translate-x-1/2 -translate-y-1/2 rounded-xs border p-4 text-xs shadow-lg'>
            <Dialog.Title className='text-foreground text-sm font-medium'>
              {t.books.newBook}
            </Dialog.Title>
            <Dialog.Description className='text-muted-foreground mt-1 text-xs'>
              {t.books.newBookDescription}
            </Dialog.Description>

            <div className='mt-4 space-y-2'>
              <label className='text-muted-foreground text-xs font-medium'>
                {t.books.bookName}
              </label>
              <input
                value={bookName}
                onChange={(event) => setBookName(event.target.value)}
                className='border-input bg-background h-8 w-full rounded-xs border px-2 text-xs'
                placeholder={t.books.bookNamePlaceholder}
              />
            </div>

            {error ? <p className='text-destructive mt-2 text-xs'>{error}</p> : null}

            <div className='flex items-center justify-end gap-2 pt-4'>
              <Dialog.Close className='text-muted-foreground hover:bg-muted rounded-xs border px-2 py-1 text-xs'>
                {t.common.cancel}
              </Dialog.Close>
              <Button type='button' onClick={handleCreate} disabled={isBusy}>
                {t.common.create}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <Dialog.Trigger
          className={cn(
            "text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-xs border px-1.5 py-0.5 text-xs",
            !canManage && "pointer-events-none opacity-50",
          )}>
          <UserPlus className='size-3' />
          {t.books.invite}
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className='fixed inset-0 bg-black/40 backdrop-blur-sm' />
          <Dialog.Popup className='bg-popover fixed top-1/2 left-1/2 w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-xs border p-4 text-xs shadow-lg'>
            <Dialog.Title className='text-foreground text-sm font-medium'>
              {t.books.invite}
            </Dialog.Title>
            <Dialog.Description className='text-muted-foreground mt-1 text-xs'>
              {t.books.inviteDescription}
            </Dialog.Description>

            <div className='mt-4 space-y-2'>
              <label className='text-muted-foreground text-xs font-medium'>
                {t.books.inviteEmail}
              </label>
              <input
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                type='email'
                className='border-input bg-background h-8 w-full rounded-xs border px-2 text-xs'
                placeholder={t.books.inviteEmailPlaceholder}
              />
              {!canInvite ? (
                <p className='text-muted-foreground text-[10px]'>
                  {t.books.invitePermission}
                </p>
              ) : null}
              {!selectedBookId ? (
                <p className='text-muted-foreground text-[10px]'>
                  {t.books.selectBook}
                </p>
              ) : null}
            </div>

            {pendingInvites.length > 0 ? (
              <div className='mt-4 space-y-2'>
                <p className='text-muted-foreground text-xs font-medium'>
                  {t.books.pendingInvites}
                </p>
                <div className='space-y-1'>
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className='flex items-center justify-between rounded-xs border px-2 py-1'>
                      <div className='min-w-0'>
                        <p className='text-foreground truncate text-xs'>
                          {invite.bookName}
                        </p>
                        <p className='text-muted-foreground truncate text-[10px]'>
                          {invite.inviteeEmail}
                        </p>
                      </div>
                      <Button
                        type='button'
                        size='xs'
                        disabled={isBusy}
                        onClick={async () => {
                          setIsBusy(true);
                          resetError();
                          try {
                            await onAcceptInvite(invite);
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : t.common.error,
                            );
                          } finally {
                            setIsBusy(false);
                          }
                        }}>
                        {t.books.accept}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? <p className='text-destructive mt-2 text-xs'>{error}</p> : null}

            <div className='flex items-center justify-end gap-2 pt-4'>
              <Dialog.Close className='text-muted-foreground hover:bg-muted rounded-xs border px-2 py-1 text-xs'>
                {t.common.cancel}
              </Dialog.Close>
              <Button
                type='button'
                onClick={handleInvite}
                disabled={isBusy || !selectedBookId || !canInvite}>
                {t.common.send}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
