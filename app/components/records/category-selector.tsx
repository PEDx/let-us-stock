import { useState, useRef, useEffect } from "react";
import { Plus, Settings, X, Check, Pencil } from "lucide-react";
import { useI18n } from "~/lib/i18n";
import { cn } from "~/lib/utils";
import type { AccountData } from "~/lib/double-entry/types";
import { ConfirmPopover } from "~/components/confirm-popover";
import { ACCOUNT_ICONS } from "~/lib/accounting/constants";

interface CategorySelectorProps {
  categories: AccountData[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: (params: { name: string; icon?: string }) => Promise<void>;
  onUpdate: (
    id: string,
    updates: { name?: string; icon?: string },
  ) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  type: "expense" | "income";
}

/**
 * 分类选择器（可添加/编辑/删除）
 */
export function CategorySelector({
  categories,
  selectedId,
  onSelect,
  onAdd,
  onUpdate,
  onArchive,
  type,
}: CategorySelectorProps) {
  const { t } = useI18n();
  const [isManaging, setIsManaging] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📦");
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAdding]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const handleAdd = async () => {
    if (newName.trim()) {
      await onAdd({ name: newName.trim(), icon: newIcon });
      setNewName("");
      setNewIcon("📦");
      setIsAdding(false);
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd();
    } else if (e.key === "Escape") {
      setNewName("");
      setIsAdding(false);
    }
  };

  const handleStartEdit = (cat: AccountData) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon || "📦");
  };

  const handleSaveEdit = async () => {
    if (editingId && editName.trim()) {
      await onUpdate(editingId, { name: editName.trim(), icon: editIcon });
    }
    setEditingId(null);
    setEditName("");
    setEditIcon("");
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      setEditingId(null);
      setEditName("");
      setEditIcon("");
    }
  };

  return (
    <div className='space-y-1'>
      <div className='flex flex-wrap items-center gap-1'>
        {categories.map((cat) => {
          if (editingId === cat.id) {
            // 编辑模式
            return (
              <div
                key={cat.id}
                className='border-primary flex items-center gap-0.5 rounded-xs border px-1 py-0.5'>
                <button
                  type='button'
                  onClick={() => {
                    const icons = ACCOUNT_ICONS;
                    const currentIndex = icons.indexOf(editIcon);
                    const nextIndex = (currentIndex + 1) % icons.length;
                    setEditIcon(icons[nextIndex]);
                  }}
                  className='text-xs'>
                  {editIcon}
                </button>
                <input
                  ref={editInputRef}
                  type='text'
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  className='w-12 bg-transparent text-xs outline-none'
                />
                <button
                  onClick={handleSaveEdit}
                  className='text-primary hover:opacity-70'>
                  <Check className='size-3' />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className='text-muted-foreground hover:text-foreground'>
                  <X className='size-3' />
                </button>
              </div>
            );
          }

          // 正常模式
          return (
            <div key={cat.id} className='flex items-center'>
              <button
                onClick={() =>
                  isManaging ? handleStartEdit(cat) : onSelect(cat.id)
                }
                className={cn(
                  "flex items-center gap-0.5 rounded-xs border px-1.5 py-0.5 text-xs transition-colors",
                  selectedId === cat.id && !isManaging
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted",
                  isManaging && "cursor-text",
                )}>
                <span className='text-xs'>{cat.icon || "📦"}</span>
                <span>{cat.name}</span>
              </button>
              {isManaging && (
                <ConfirmPopover onConfirm={() => onArchive(cat.id)}>
                  <button className='text-muted-foreground ml-0.5 hover:text-red-500'>
                    <X className='size-3' />
                  </button>
                </ConfirmPopover>
              )}
            </div>
          );
        })}

        {/* 添加新分类 */}
        {isAdding ? (
          <div className='border-primary flex items-center gap-0.5 rounded-xs border border-dashed px-1 py-0.5'>
            <button
              type='button'
              onClick={() => {
                const icons = ACCOUNT_ICONS;
                const currentIndex = icons.indexOf(newIcon);
                const nextIndex = (currentIndex + 1) % icons.length;
                setNewIcon(icons[nextIndex]);
              }}
              className='text-xs'>
              {newIcon}
            </button>
            <input
              ref={addInputRef}
              type='text'
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleAddKeyDown}
              placeholder={t.records.category}
              className='placeholder:text-muted-foreground w-12 bg-transparent text-xs outline-none'
            />
            <button
              onClick={handleAdd}
              className='text-primary hover:opacity-70'>
              <Check className='size-3' />
            </button>
            <button
              onClick={() => {
                setNewName("");
                setIsAdding(false);
              }}
              className='text-muted-foreground hover:text-foreground'>
              <X className='size-3' />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className='text-muted-foreground hover:text-foreground flex items-center gap-0.5 rounded-xs border border-dashed px-1 py-0.5 text-xs hover:border-solid'>
            <Plus className='size-3' />
          </button>
        )}

        {/* 管理按钮 */}
        <button
          onClick={() => setIsManaging(!isManaging)}
          className={cn(
            "flex items-center rounded-xs border px-1 py-0.5 text-xs transition-colors",
            isManaging
              ? "border-primary bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground border-transparent",
          )}
          title={isManaging ? t.groups.doneManaging : t.groups.manageGroups}>
          <Settings className='size-3' />
        </button>
      </div>
    </div>
  );
}
