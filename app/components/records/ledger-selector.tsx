"use client";

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
      <BookOpen className='size-3 text-muted-foreground' />
      <span className='text-xs text-muted-foreground'>{t.records.selectLedger}:</span>

      <Menu.Root>
        <Menu.Trigger className='flex items-center gap-1 rounded-xs border px-1.5 py-0.5 text-xs hover:bg-muted'>
          <span className='text-xs'>{currentLedger?.icon || "📒"}</span>
          <span>{currentLedger?.name || t.records.defaultLedger}</span>
          <ChevronDown className='size-3 text-muted-foreground' />
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner sideOffset={4}>
            <Menu.Popup className='min-w-32 rounded-xs border bg-popover p-1 shadow-md'>
              {ledgers.map((ledger) => (
                <Menu.Item
                  key={ledger.id}
                  onClick={() => onSelect(ledger.id)}
                  className={cn(
                    "flex cursor-pointer items-center gap-1 rounded-xs px-1.5 py-0.5 text-xs outline-none hover:bg-muted",
                    ledger.id === currentLedgerId && "bg-muted",
                  )}>
                  <span className='text-xs'>{ledger.icon || "📒"}</span>
                  <span className='flex-1'>{ledger.name}</span>
                  {ledger.id === currentLedgerId && (
                    <Check className='size-3 text-primary' />
                  )}
                </Menu.Item>
              ))}

              <Menu.Separator className='my-1 h-px bg-border' />

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
                    className='flex-1 rounded-xs border bg-background px-1 py-0.5 text-xs outline-none focus:border-primary'
                  />
                  <button
                    onClick={handleCreate}
                    className='rounded-xs p-0.5 text-primary hover:bg-primary/10'>
                    <Check className='size-3' />
                  </button>
                  <button
                    onClick={() => {
                      setNewName("");
                      setIsCreating(false);
                    }}
                    className='rounded-xs p-0.5 text-muted-foreground hover:bg-muted'>
                    <X className='size-3' />
                  </button>
                </div>
              ) : (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCreating(true);
                  }}
                  className='flex cursor-pointer items-center gap-1 rounded-xs px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground'>
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
