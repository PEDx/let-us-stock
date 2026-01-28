import { useState } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { useI18n } from "~/lib/i18n";
import { useBook } from "~/lib/accounting";
import { cn } from "~/lib/utils";
import { Loader2 } from "lucide-react";
import { NewEntry } from "./new-entry";
import { EntryFlow } from "./entry-flow";
import { EntryStats } from "./entry-stats";
import { LedgerSelector } from "./ledger-selector";

/**
 * 记录页面主组件
 */
export function RecordsPage() {
  const { t } = useI18n();
  const {
    book,
    isLoading,
    currentLedger,
    setCurrentLedgerId,
    ledgers,
    createLedger,
  } = useBook();
  const [activeTab, setActiveTab] = useState<string>("entry");

  if (isLoading) {
    return (
      <div className='flex h-40 items-center justify-center'>
        <Loader2 className='text-muted-foreground size-4 animate-spin' />
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      {/* 账本选择器 */}
      <LedgerSelector
        ledgers={ledgers}
        currentLedgerId={currentLedger?.id ?? ""}
        onSelect={setCurrentLedgerId}
        onCreate={createLedger}
      />

      {/* Tab 内容 */}
      <Tabs.Root
        value={activeTab}
        onValueChange={setActiveTab}
        className='flex flex-col gap-2'>
        <Tabs.List className='flex gap-4 border-b'>
          <Tabs.Tab
            value='entry'
            className={cn(
              "pb-1 text-xs transition-colors",
              activeTab === "entry"
                ? "border-primary text-foreground border-b-2 font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}>
            {t.records.newEntry}
          </Tabs.Tab>
          <Tabs.Tab
            value='flow'
            className={cn(
              "pb-1 text-xs transition-colors",
              activeTab === "flow"
                ? "border-primary text-foreground border-b-2 font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}>
            {t.records.flow}
          </Tabs.Tab>
          <Tabs.Tab
            value='stats'
            className={cn(
              "pb-1 text-xs transition-colors",
              activeTab === "stats"
                ? "border-primary text-foreground border-b-2 font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}>
            {t.records.stats}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value='entry' className='outline-none'>
          <NewEntry />
        </Tabs.Panel>

        <Tabs.Panel value='flow' className='outline-none'>
          <EntryFlow />
        </Tabs.Panel>

        <Tabs.Panel value='stats' className='outline-none'>
          <EntryStats />
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}
