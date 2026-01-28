import { useState, useMemo } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Plus } from "lucide-react";
import { useI18n } from "~/lib/i18n";
import { useBook } from "~/lib/accounting";
import {
  getCurrencySymbol,
  SUPPORTED_CURRENCIES,
  ACCOUNT_ICONS,
} from "~/lib/accounting/constants";
import {
  getMainLedger,
  findAccountsByType,
  getCurrencyMultiplier,
} from "~/lib/double-entry";
import { AccountType } from "~/lib/double-entry/types";
import type { CurrencyCode, AccountData } from "~/lib/double-entry/types";
import { cn } from "~/lib/utils";

/**
 * 账户管理组件
 */
export function AccountsManager() {
  const { t, language } = useI18n();
  const { book, addAccount } = useBook();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedParentType, setSelectedParentType] = useState<AccountType>(
    AccountType.ASSETS,
  );

  // 获取主账本
  const mainLedger = useMemo(() => {
    if (!book) return null;
    return getMainLedger(book);
  }, [book]);

  // 获取根账户
  const rootAccounts = useMemo((): {
    assets: AccountData | null;
    liabilities: AccountData | null;
  } => {
    if (!mainLedger) return { assets: null, liabilities: null };
    const assets =
      mainLedger.accounts.find(
        (a) => a.type === AccountType.ASSETS && a.parentId === null,
      ) ?? null;
    const liabilities =
      mainLedger.accounts.find(
        (a) => a.type === AccountType.LIABILITIES && a.parentId === null,
      ) ?? null;
    return { assets, liabilities };
  }, [mainLedger]);

  // 获取账户列表
  const { assetAccounts, liabilityAccounts } = useMemo(() => {
    if (!mainLedger) return { assetAccounts: [], liabilityAccounts: [] };
    return {
      assetAccounts: findAccountsByType(
        mainLedger.accounts,
        AccountType.ASSETS,
      ).filter((a) => a.parentId !== null),
      liabilityAccounts: findAccountsByType(
        mainLedger.accounts,
        AccountType.LIABILITIES,
      ).filter((a) => a.parentId !== null),
    };
  }, [mainLedger]);

  // 格式化金额（从最小单位转换为主单位）
  const formatAmount = (amount: number, currency: CurrencyCode) => {
    const multiplier = getCurrencyMultiplier(currency);
    const mainUnit = amount / multiplier;
    return mainUnit.toLocaleString(language === "zh" ? "zh-CN" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleAddAccount = () => {
    setSelectedParentType(AccountType.ASSETS);
    setIsAddDialogOpen(true);
  };

  return (
    <div className='space-y-3'>
      {/* 添加账户按钮 */}
      <div className='flex justify-end'>
        <button
          onClick={handleAddAccount}
          className='text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1 rounded-xs border px-1.5 py-0.5 text-xs'>
          <Plus className='size-3' />
          {t.assets.addAccount}
        </button>
      </div>

      {/* 资产账户列表 */}
      <AccountSection
        title={t.assets.types.assets}
        accounts={assetAccounts}
        formatAmount={formatAmount}
        emptyText={t.common.noData}
        colorClass='text-green-600'
      />

      {/* 负债账户列表 */}
      <AccountSection
        title={t.assets.types.liabilities}
        accounts={liabilityAccounts}
        formatAmount={formatAmount}
        emptyText={t.common.noData}
        colorClass='text-red-600'
      />

      {/* 添加账户对话框 */}
      <AddAccountDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        parentType={selectedParentType}
        onParentTypeChange={setSelectedParentType}
        rootAccounts={rootAccounts}
        onAdd={addAccount}
        defaultCurrency={mainLedger?.defaultCurrency ?? "CNY"}
      />
    </div>
  );
}

// ============================================================================
// 子组件
// ============================================================================

interface AccountSectionProps {
  title: string;
  accounts: AccountData[];
  formatAmount: (amount: number, currency: CurrencyCode) => string;
  emptyText: string;
  colorClass: string;
}

function AccountSection({
  title,
  accounts,
  formatAmount,
  emptyText,
  colorClass,
}: AccountSectionProps) {
  return (
    <div className='rounded-xs border'>
      <div className='border-b px-2 py-1'>
        <h3 className='text-xs font-medium'>{title}</h3>
      </div>
      <div className='divide-y'>
        {accounts.length === 0 ? (
          <div className='text-muted-foreground px-2 py-3 text-center text-xs'>
            {emptyText}
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className={cn(
                "flex items-center justify-between px-2 py-1",
                account.archived && "opacity-50",
              )}>
              <div className='flex items-center gap-1.5'>
                <span className='text-sm'>{account.icon || "💳"}</span>
                <div>
                  <div className='text-xs'>{account.name}</div>
                  {account.note && (
                    <div className='text-muted-foreground text-xs'>
                      {account.note}
                    </div>
                  )}
                </div>
              </div>
              <div className={cn("text-xs font-medium", colorClass)}>
                {getCurrencySymbol(account.currency)}
                {formatAmount(account.balance, account.currency)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 添加账户对话框
// ============================================================================

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentType: AccountType;
  onParentTypeChange: (type: AccountType) => void;
  rootAccounts: { assets: AccountData | null; liabilities: AccountData | null };
  onAdd: (params: {
    name: string;
    parentId: string;
    currency?: CurrencyCode;
    icon?: string;
    initialBalance?: number;
  }) => Promise<void>;
  defaultCurrency: CurrencyCode;
}

function AddAccountDialog({
  open,
  onOpenChange,
  parentType,
  onParentTypeChange,
  rootAccounts,
  onAdd,
  defaultCurrency,
}: AddAccountDialogProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [icon, setIcon] = useState("💳");
  const [initialBalance, setInitialBalance] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    const parentId =
      parentType === AccountType.ASSETS
        ? rootAccounts.assets?.id
        : rootAccounts.liabilities?.id;

    if (!parentId) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        name: name.trim(),
        parentId,
        currency,
        icon,
        initialBalance: initialBalance ? parseFloat(initialBalance) : undefined,
      });
      // 重置表单
      setName("");
      setInitialBalance("");
      setIcon("💳");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className='fixed inset-0 bg-black/50' />
        <Dialog.Popup className='bg-background fixed top-1/2 left-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xs border p-4 shadow-lg'>
          <Dialog.Title className='text-sm font-medium'>
            {t.assets.addAccount}
          </Dialog.Title>

          <div className='mt-3 space-y-3'>
            {/* 账户类型 */}
            <div>
              <label className='text-muted-foreground mb-1 block text-xs'>
                {t.assets.accountType}
              </label>
              <div className='flex gap-1'>
                <button
                  type='button'
                  onClick={() => onParentTypeChange(AccountType.ASSETS)}
                  className={cn(
                    "flex-1 rounded-xs border px-1.5 py-0.5 text-xs transition-colors",
                    parentType === AccountType.ASSETS
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted",
                  )}>
                  {t.assets.types.assets}
                </button>
                <button
                  type='button'
                  onClick={() => onParentTypeChange(AccountType.LIABILITIES)}
                  className={cn(
                    "flex-1 rounded-xs border px-1.5 py-0.5 text-xs transition-colors",
                    parentType === AccountType.LIABILITIES
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted",
                  )}>
                  {t.assets.types.liabilities}
                </button>
              </div>
            </div>

            {/* 账户名称 */}
            <div>
              <label className='text-muted-foreground mb-1 block text-xs'>
                {t.assets.accountName}
              </label>
              <input
                type='text'
                value={name}
                onChange={(e) => setName(e.target.value)}
                className='bg-background focus:border-primary w-full rounded-xs border px-1.5 py-0.5 text-xs outline-none'
                placeholder='e.g. 招商银行'
              />
            </div>

            {/* 图标选择 */}
            <div>
              <label className='text-muted-foreground mb-1 block text-xs'>
                {t.assets.icon}
              </label>
              <div className='flex flex-wrap gap-1'>
                {ACCOUNT_ICONS.map((i) => (
                  <button
                    key={i}
                    type='button'
                    onClick={() => setIcon(i)}
                    className={cn(
                      "flex size-6 items-center justify-center rounded-xs border text-sm transition-colors",
                      icon === i
                        ? "border-primary bg-primary/10"
                        : "hover:bg-muted",
                    )}>
                    {i}
                  </button>
                ))}
              </div>
            </div>

            {/* 币种 */}
            <div>
              <label className='text-muted-foreground mb-1 block text-xs'>
                {t.assets.currency}
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className='bg-background focus:border-primary w-full rounded-xs border px-1.5 py-0.5 text-xs outline-none'>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </option>
                ))}
              </select>
            </div>

            {/* 初始余额 */}
            <div>
              <label className='text-muted-foreground mb-1 block text-xs'>
                {t.assets.initialBalance}
              </label>
              <div className='flex items-center gap-1'>
                <span className='text-muted-foreground text-xs'>
                  {getCurrencySymbol(currency)}
                </span>
                <input
                  type='number'
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className='bg-background focus:border-primary flex-1 rounded-xs border px-1.5 py-0.5 text-xs outline-none'
                  placeholder='0.00'
                  step='0.01'
                />
              </div>
            </div>
          </div>

          {/* 按钮 */}
          <div className='mt-4 flex justify-end gap-1'>
            <Dialog.Close className='text-muted-foreground hover:bg-muted rounded-xs border px-1.5 py-0.5 text-xs'>
              {t.common.cancel}
            </Dialog.Close>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || isSubmitting}
              className='border-primary bg-primary/10 text-primary hover:bg-primary/20 rounded-xs border px-1.5 py-0.5 text-xs disabled:opacity-50'>
              {t.common.save}
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
