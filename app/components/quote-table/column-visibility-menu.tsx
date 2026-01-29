import { Settings2, Check } from "lucide-react";
import { Popover } from "@base-ui/react/popover";
import { cn } from "~/lib/utils";
import type { QuoteTableInstance } from "./types";
import { useMemo, useCallback, memo } from "react";

interface ColumnVisibilityMenuProps {
  table: QuoteTableInstance;
  labels: { columns: string; showAll: string; hideAll: string };
}

/**
 * 列可见性配置菜单
 */
export const ColumnVisibilityMenu = memo(function ColumnVisibilityMenu({
  table,
  labels,
}: ColumnVisibilityMenuProps) {
  const allColumns = useMemo(
    () => table.getAllLeafColumns().filter((col) => col.getCanHide()),
    [table],
  );

  const handleShowAll = useCallback(() => {
    allColumns.forEach((col) => col.toggleVisibility(true));
  }, [allColumns]);

  const handleHideAll = useCallback(() => {
    allColumns.forEach((col) => col.toggleVisibility(false));
  }, [allColumns]);

  return (
    <Popover.Root>
      <Popover.Trigger
        className='text-muted-foreground hover:text-foreground cursor-pointer'
        title={labels.columns}>
        <Settings2 className='size-3.5' />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={4}>
          <Popover.Popup className='bg-background min-w-36 rounded-xs border p-1 shadow-lg'>
            <div className='flex gap-1 border-b px-2 pb-1 text-xs'>
              <button
                onClick={handleShowAll}
                className='text-blue-600 hover:underline'>
                {labels.showAll}
              </button>
              <span className='text-muted-foreground'>/</span>
              <button
                onClick={handleHideAll}
                className='text-blue-600 hover:underline'>
                {labels.hideAll}
              </button>
            </div>
            {allColumns.map((column) => (
              <ColumnLabel
                key={column.id}
                column={column}
              />
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
});

const ColumnLabel = memo(function ColumnLabel({
  column,
}: {
  column: ReturnType<QuoteTableInstance["getAllLeafColumns"]>[number];
}) {
  return (
    <label className='hover:bg-muted flex cursor-pointer items-center gap-2 rounded-xs px-2 py-1 text-xs'>
      <span
        className={cn(
          "flex size-3.5 items-center justify-center rounded-xs border",
          column.getIsVisible()
            ? "border-blue-500 bg-blue-500 text-white"
            : "border-muted-foreground",
        )}>
        {column.getIsVisible() && <Check className='size-2.5' />}
      </span>
      <input
        type='checkbox'
        checked={column.getIsVisible()}
        onChange={column.getToggleVisibilityHandler()}
        className='sr-only'
      />
      <span>{column.columnDef.header as string}</span>
    </label>
  );
});
