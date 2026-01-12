"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Settings, X, GripVertical, Check } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "~/lib/utils";
import { useI18n } from "~/lib/i18n";
import type { Group } from "~/lib/stock-store";
import { ConfirmPopover } from "./confirm-popover";

interface GroupTabsProps {
  groups: Group[];
  activeGroupId: string;
  onSelectGroup: (groupId: string) => void;
  onAddGroup: (name: string) => void;
  onRemoveGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, newName: string) => void;
  onReorderGroups: (newOrder: string[]) => void;
}

function SortableTab({
  group,
  isActive,
  isManaging,
  onSelect,
  onRemove,
  onRename,
  canDelete,
}: {
  group: Group;
  isActive: boolean;
  isManaging: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onRename: (newName: string) => void;
  canDelete: boolean;
}) {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id, disabled: !isManaging });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmitRename = () => {
    if (editName.trim() && editName !== group.name) {
      onRename(editName.trim());
    } else {
      setEditName(group.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmitRename();
    } else if (e.key === "Escape") {
      setEditName(group.name);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1 px-2 py-1 text-xs rounded-xs border transition-colors shrink-0",
        isActive
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-border hover:bg-muted",
        isDragging && "opacity-50",
      )}>
      {isManaging && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground -ml-1">
          <GripVertical className="size-3" />
        </button>
      )}

      {isEditing ? (
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSubmitRename}
            onKeyDown={handleKeyDown}
            className="w-16 px-1 py-0 text-xs leading-none bg-transparent border-b border-current h-3 outline-none"
          />
          <button
            onClick={handleSubmitRename}
            className="text-current hover:opacity-70">
            <Check className="size-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => (isManaging ? setIsEditing(true) : onSelect())}
          className={cn("truncate max-w-20 leading-none", isManaging && "cursor-text")}>
          {group.name}
        </button>
      )}

      {isManaging && canDelete && (
        <ConfirmPopover
          title={t.groups.deleteConfirm}
          onConfirm={onRemove}
          confirmText={t.confirm.delete}
          cancelText={t.confirm.cancel}>
          <button className="text-muted-foreground hover:text-destructive -mr-1">
            <X className="size-3" />
          </button>
        </ConfirmPopover>
      )}
    </div>
  );
}

export function GroupTabs({
  groups,
  activeGroupId,
  onSelectGroup,
  onAddGroup,
  onRemoveGroup,
  onRenameGroup,
  onReorderGroups,
}: GroupTabsProps) {
  const { t } = useI18n();
  const [isManaging, setIsManaging] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAdding]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = groups.findIndex((g) => g.id === active.id);
      const newIndex = groups.findIndex((g) => g.id === over.id);
      const newOrder = arrayMove(
        groups.map((g) => g.id),
        oldIndex,
        newIndex,
      );
      onReorderGroups(newOrder);
    }
  };

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      onAddGroup(newGroupName.trim());
      setNewGroupName("");
      setIsAdding(false);
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddGroup();
    } else if (e.key === "Escape") {
      setNewGroupName("");
      setIsAdding(false);
    }
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}>
        <SortableContext
          items={groups.map((g) => g.id)}
          strategy={horizontalListSortingStrategy}>
          {groups.map((group) => (
            <SortableTab
              key={group.id}
              group={group}
              isActive={group.id === activeGroupId}
              isManaging={isManaging}
              onSelect={() => onSelectGroup(group.id)}
              onRemove={() => onRemoveGroup(group.id)}
              onRename={(newName) => onRenameGroup(group.id, newName)}
              canDelete={groups.length > 1}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* 添加新分组 */}
      {isAdding ? (
        <div className="flex items-center gap-1 px-2 leading-none text-xs rounded-xs border border-dashed border-primary bg-background shrink-0">
          <input
            ref={addInputRef}
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onBlur={() => {
              if (!newGroupName.trim()) {
                setIsAdding(false);
              }
            }}
            onKeyDown={handleAddKeyDown}
            placeholder={t.groups.newGroupPlaceholder}
            className="w-24 px-1 py-0.5 text-xs bg-transparent outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={handleAddGroup}
            className="text-primary hover:opacity-70">
            <Check className="size-3" />
          </button>
          <button
            onClick={() => {
              setNewGroupName("");
              setIsAdding(false);
            }}
            className="text-muted-foreground hover:text-foreground">
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-0.5 px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground rounded-xs border border-dashed hover:border-solid transition-colors shrink-0"
          title={t.groups.addGroup}>
          <Plus className="size-3" />
        </button>
      )}

      {/* 管理按钮 */}
      <button
        onClick={() => setIsManaging(!isManaging)}
        className={cn(
          "flex items-center gap-0.5 px-1.5 py-1 text-xs rounded-xs border transition-colors shrink-0",
          isManaging
            ? "bg-primary text-primary-foreground border-primary"
            : "text-muted-foreground hover:text-foreground border-transparent hover:border-border",
        )}
        title={isManaging ? t.groups.doneManaging : t.groups.manageGroups}>
        <Settings className="size-3" />
      </button>
    </div>
  );
}
