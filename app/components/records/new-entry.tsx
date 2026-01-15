"use client";

import { useState, useMemo } from "react";
import { useI18n } from "~/lib/i18n";
import { useBook } from "~/lib/accounting";
import { getCurrencySymbol } from "~/lib/accounting/constants";
import { getMainLedger, findAccountsByType } from "~/lib/double-entry";
import { AccountType } from "~/lib/double-entry/types";
import { cn } from "~/lib/utils";
import { Check } from "lucide-react";
import { CategorySelector } from "./category-selector";

type EntryType = "expense" | "income" | "transfer";

/**
 * 记账表单组件
 */
export function NewEntry() {
  const { t } = useI18n();
  const {
    book,
    addSimpleEntry,
    expenseCategories,
    incomeCategories,
    addCategory,
    updateCategory,
    archiveCategory,
  } = useBook();

  // 表单状态
  const [entryType, setEntryType] = useState<EntryType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [payee, setPayee] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 获取主账本
  const mainLedger = useMemo(() => {
    if (!book) return null;
    return getMainLedger(book);
  }, [book]);

  const defaultCurrency = mainLedger?.defaultCurrency ?? "CNY";

  // 获取账户列表（用于支付账户选择）
  const paymentAccounts = useMemo(() => {
    if (!mainLedger) return [];
    const assets = findAccountsByType(mainLedger.accounts, AccountType.ASSETS).filter(
      (a) => a.parentId !== null && !a.archived,
    );
    const liabilities = findAccountsByType(
      mainLedger.accounts,
      AccountType.LIABILITIES,
    ).filter((a) => a.parentId !== null && !a.archived);
    return [...assets, ...liabilities];
  }, [mainLedger]);

  // 当前分类列表
  const categories = entryType === "expense" ? expenseCategories : incomeCategories;

  // 处理标签添加
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    if (entryType !== "transfer" && !categoryId) return;
    if (!paymentAccountId) return;
    if (entryType === "transfer" && !toAccountId) return;

    setIsSubmitting(true);
    try {
      await addSimpleEntry({
        type: entryType,
        amount: parseFloat(amount),
        currency: defaultCurrency,
        categoryAccountId: categoryId,
        paymentAccountId,
        toAccountId: entryType === "transfer" ? toAccountId : undefined,
        description: description || getCategoryLabel(categoryId),
        date,
        tags: tags.length > 0 ? tags : undefined,
        payee: payee || undefined,
      });

      // 重置表单
      setAmount("");
      setDescription("");
      setTags([]);
      setPayee("");
      setCategoryId("");

      // 显示成功提示
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取分类标签
  const getCategoryLabel = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    return cat?.name || "";
  };

  // 添加分类
  const handleAddCategory = async (params: { name: string; icon?: string }) => {
    await addCategory({ type: entryType as "expense" | "income", ...params });
  };

  return (
    <div className='space-y-3'>
      {/* 记账类型 */}
      <div className='flex gap-1'>
        {(["expense", "income", "transfer"] as EntryType[]).map((type) => (
          <button
            key={type}
            onClick={() => {
              setEntryType(type);
              setCategoryId(""); // 切换类型时清空分类
            }}
            className={cn(
              "flex-1 rounded-xs border px-1.5 py-0.5 text-xs transition-colors",
              entryType === type
                ? type === "expense"
                  ? "border-red-500 bg-red-500/10 text-red-600"
                  : type === "income"
                    ? "border-green-500 bg-green-500/10 text-green-600"
                    : "border-blue-500 bg-blue-500/10 text-blue-600"
                : "hover:bg-muted",
            )}>
            {t.records[type]}
          </button>
        ))}
      </div>

      {/* 金额输入 */}
      <div>
        <label className='mb-1 block text-xs text-muted-foreground'>
          {t.records.amount}
        </label>
        <div className='flex items-center gap-1'>
          <span className='text-sm text-muted-foreground'>
            {getCurrencySymbol(defaultCurrency)}
          </span>
          <input
            type='number'
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className='flex-1 border-b bg-transparent py-1 text-lg font-bold outline-none focus:border-primary'
            placeholder='0.00'
            step='0.01'
          />
        </div>
      </div>

      {/* 分类选择（支出/收入时显示） */}
      {entryType !== "transfer" && (
        <div>
          <label className='mb-1 block text-xs text-muted-foreground'>
            {t.records.category}
          </label>
          <CategorySelector
            categories={categories}
            selectedId={categoryId}
            onSelect={setCategoryId}
            onAdd={handleAddCategory}
            onUpdate={updateCategory}
            onArchive={archiveCategory}
            type={entryType as "expense" | "income"}
          />
        </div>
      )}

      {/* 账户选择 */}
      <div className='grid gap-2 sm:grid-cols-2'>
        <div>
          <label className='mb-1 block text-xs text-muted-foreground'>
            {entryType === "transfer" ? t.records.fromAccount : t.records.account}
          </label>
          <select
            value={paymentAccountId}
            onChange={(e) => setPaymentAccountId(e.target.value)}
            className='w-full rounded-xs border bg-background px-1.5 py-0.5 text-xs outline-none focus:border-primary'>
            <option value=''>{t.records.account}</option>
            {paymentAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.icon} {acc.name}
              </option>
            ))}
          </select>
        </div>

        {entryType === "transfer" && (
          <div>
            <label className='mb-1 block text-xs text-muted-foreground'>
              {t.records.toAccount}
            </label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className='w-full rounded-xs border bg-background px-1.5 py-0.5 text-xs outline-none focus:border-primary'>
              <option value=''>{t.records.toAccount}</option>
              {paymentAccounts
                .filter((acc) => acc.id !== paymentAccountId)
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.icon} {acc.name}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* 描述 */}
      <div>
        <label className='mb-1 block text-xs text-muted-foreground'>
          {t.records.description}
        </label>
        <input
          type='text'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className='w-full rounded-xs border bg-background px-1.5 py-0.5 text-xs outline-none focus:border-primary'
          placeholder={t.records.description}
        />
      </div>

      {/* 日期和商家 */}
      <div className='grid gap-2 sm:grid-cols-2'>
        <div>
          <label className='mb-1 block text-xs text-muted-foreground'>
            {t.records.date}
          </label>
          <input
            type='date'
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className='w-full rounded-xs border bg-background px-1.5 py-0.5 text-xs outline-none focus:border-primary'
          />
        </div>
        <div>
          <label className='mb-1 block text-xs text-muted-foreground'>
            {t.records.payee}
          </label>
          <input
            type='text'
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
            className='w-full rounded-xs border bg-background px-1.5 py-0.5 text-xs outline-none focus:border-primary'
            placeholder={t.records.payee}
          />
        </div>
      </div>

      {/* 标签 */}
      <div>
        <label className='mb-1 block text-xs text-muted-foreground'>
          {t.records.tags}
        </label>
        <div className='flex flex-wrap items-center gap-1'>
          {tags.map((tag) => (
            <span
              key={tag}
              className='flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs'>
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className='text-muted-foreground hover:text-foreground'>
                ×
              </button>
            </span>
          ))}
          <input
            type='text'
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={handleAddTag}
            className='min-w-16 flex-1 bg-transparent text-xs outline-none'
            placeholder='+ 添加标签'
          />
        </div>
      </div>

      {/* 提交按钮 */}
      <div className='flex items-center gap-2'>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
          className='flex-1 rounded-xs border border-primary bg-primary/10 px-1.5 py-1 text-xs text-primary hover:bg-primary/20 disabled:opacity-50'>
          {isSubmitting ? t.common.loading : t.common.save}
        </button>
        {showSuccess && (
          <span className='flex items-center gap-0.5 text-xs text-green-600'>
            <Check className='size-3' />
            保存成功
          </span>
        )}
      </div>
    </div>
  );
}
