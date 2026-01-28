import { useState } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { useI18n } from "~/lib/i18n";
import { useBook } from "~/lib/accounting";
import { cn } from "~/lib/utils";
import { Loader2 } from "lucide-react";
import { AssetsOverview } from "./overview";
import { AccountsManager } from "./accounts-manager";

/**
 * 资产页面主组件
 */
export function AssetsPage() {
  const { t } = useI18n();
  const { book, isLoading } = useBook();
  const [activeTab, setActiveTab] = useState<string>("overview");

  if (isLoading) {
    return (
      <div className='flex h-40 items-center justify-center'>
        <Loader2 className='text-muted-foreground size-4 animate-spin' />
      </div>
    );
  }

  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={setActiveTab}
      className='flex flex-col gap-2'>
      <Tabs.List className='flex gap-4 border-b'>
        <Tabs.Tab
          value='overview'
          className={cn(
            "pb-1 text-xs transition-colors",
            activeTab === "overview"
              ? "border-primary text-foreground border-b-2 font-medium"
              : "text-muted-foreground hover:text-foreground",
          )}>
          {t.assets.overview}
        </Tabs.Tab>
        <Tabs.Tab
          value='accounts'
          className={cn(
            "pb-1 text-xs transition-colors",
            activeTab === "accounts"
              ? "border-primary text-foreground border-b-2 font-medium"
              : "text-muted-foreground hover:text-foreground",
          )}>
          {t.assets.accounts}
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value='overview' className='outline-none'>
        <AssetsOverview />
      </Tabs.Panel>

      <Tabs.Panel value='accounts' className='outline-none'>
        <AccountsManager />
      </Tabs.Panel>
    </Tabs.Root>
  );
}
