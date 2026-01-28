import { useState, useRef, useEffect } from "react";
import { Menu } from "@base-ui/react/menu";
import { ChevronDown, Plus, Check, X, BookOpen } from "lucide-react";
import { useI18n } from "~/lib/i18n";
import type { LedgerData } from "~/lib/double-entry/types";
import { cn } from "~/lib/utils";

interface LedgerSelectorProps {
  ledgers: LedgerData[];
  currentLedgerId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string, description?: string) => Promise<void>;
}

/**
 * 账本选择器
 */
export function LedgerSelector({
  ledgers,
  currentLedgerId,
  onSelect,
  onCreate,
}: LedgerSelectorProps) {
  const { t } = useI18n();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const currentLedger = ledgers.find((l) => l.id === currentLedgerId);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreate = async () => {
    if (newName.trim()) {
      await onCreate(newName.trim());
      setNewName("");
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreate();
    } else if (e.key === "Escape") {
      setNewName("");
      setIsCreating(false);
    }
  };

  return (
    <div className='flex items-center gap-1'>
      <BookOpen className='text-muted-foreground size-3' />
      <span className='text-muted-foreground text-xs'>
        {t.records.selectLedger}:
      </span>

      <Menu.Root>
        <Menu.Trigger className='hover:bg-muted flex items-center gap-1 rounded-xs border px-1.5 py-0.5 text-xs'>
          <span className='text-xs'>{currentLedger?.icon || "📒"}</span>
          <span>{currentLedger?.name || t.records.defaultLedger}</span>
          <ChevronDown className='text-muted-foreground size-3' />
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner sideOffset={4}>
            <Menu.Popup className='bg-popover min-w-32 rounded-xs border p-1 shadow-md'>
              {ledgers.map((ledger) => (
                <Menu.Item
                  key={ledger.id}
                  onClick={() => onSelect(ledger.id)}
                  className={cn(
                    "hover:bg-muted flex cursor-pointer items-center gap-1 rounded-xs px-1.5 py-0.5 text-xs outline-none",
                    ledger.id === currentLedgerId && "bg-muted",
                  )}>
                  <span className='text-xs'>{ledger.icon || "📒"}</span>
                  <span className='flex-1'>{ledger.name}</span>
                  {ledger.id === currentLedgerId && (
                    <Check className='text-primary size-3' />
                  )}
                </Menu.Item>
              ))}

              <Menu.Separator className='bg-border my-1 h-px' />

              {isCreating ? (
                <div
                  className='flex items-center gap-1 px-1.5 py-0.5'
                  onClick={(e) => e.stopPropagation()}>
                  <input
                    ref={inputRef}
                    type='text'
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t.records.ledgerName}
                    className='bg-background focus:border-primary flex-1 rounded-xs border px-1 py-0.5 text-xs outline-none'
                  />
                  <button
                    onClick={handleCreate}
                    className='text-primary hover:bg-primary/10 rounded-xs p-0.5'>
                    <Check className='size-3' />
                  </button>
                  <button
                    onClick={() => {
                      setNewName("");
                      setIsCreating(false);
                    }}
                    className='text-muted-foreground hover:bg-muted rounded-xs p-0.5'>
                    <X className='size-3' />
                  </button>
                </div>
              ) : (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCreating(true);
                  }}
                  className='text-muted-foreground hover:bg-muted hover:text-foreground flex cursor-pointer items-center gap-1 rounded-xs px-1.5 py-0.5 text-xs'>
                  <Plus className='size-3' />
                  <span>{t.records.newLedger}</span>
                </div>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
