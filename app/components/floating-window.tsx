"use client";

import { useRef, useState, useCallback, useEffect, useLayoutEffect } from "react";
import { X, RefreshCw, Minus } from "lucide-react";
import { cn } from "~/lib/utils";

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface FloatingWindowProps {
  id: string;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  defaultPosition?: Position;
  defaultSize?: Size;
  minWidth?: number;
  minHeight?: number;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useLayoutEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}

export function FloatingWindow({
  id,
  title,
  children,
  onClose,
  onRefresh,
  isLoading = false,
  defaultPosition = { x: 100, y: 100 },
  defaultSize = { width: 400, height: 300 },
  minWidth = 280,
  minHeight = 200,
}: FloatingWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [position, setPosition] = useState<Position>(defaultPosition);
  const [size, setSize] = useState<Size>(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const resizeStart = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>({ x: 0, y: 0, width: 0, height: 0 });

  // 拖拽逻辑
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [position],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(
          0,
          Math.min(
            e.clientX - dragOffset.current.x,
            window.innerWidth - size.width,
          ),
        );
        const newY = Math.max(
          0,
          Math.min(e.clientY - dragOffset.current.y, window.innerHeight - 40),
        );
        setPosition({ x: newX, y: newY });
      }
      if (isResizing) {
        const deltaX = e.clientX - resizeStart.current.x;
        const deltaY = e.clientY - resizeStart.current.y;
        setSize({
          width: Math.max(minWidth, resizeStart.current.width + deltaX),
          height: Math.max(minHeight, resizeStart.current.height + deltaY),
        });
      }
    },
    [isDragging, isResizing, size.width, minWidth, minHeight],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // 调整大小逻辑
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsResizing(true);
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height,
      };
    },
    [size],
  );

  // 点击时提升 z-index
  const bringToFront = useCallback(() => {
    const windows = document.querySelectorAll("[data-floating-window]");
    windows.forEach((w) => {
      (w as HTMLElement).style.zIndex = "50";
    });
    if (windowRef.current) {
      windowRef.current.style.zIndex = "51";
    }
  }, []);

  // 移动端：底部弹出浮窗
  if (isMobile) {
    return (
      <>
        {/* 背景遮罩 */}
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={onClose}
        />
        {/* 底部浮窗 */}
        <div
          ref={windowRef}
          data-floating-window={id}
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-xs border-t bg-background shadow-lg">
          {/* 拖拽指示条 */}
          <div className='flex justify-center py-2'>
            <div className='h-1 w-10 rounded-full bg-muted-foreground/30' />
          </div>
          {/* 标题栏 */}
          <div className='flex h-8 items-center justify-between border-b px-3'>
            <span className='truncate text-sm font-medium'>{title}</span>
            <div className='flex items-center gap-2'>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isLoading}
                  className='rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50'>
                  <RefreshCw
                    className={cn("size-4", isLoading && "animate-spin")}
                  />
                </button>
              )}
              <button
                onClick={onClose}
                className='rounded p-1 text-muted-foreground hover:bg-red-500/20 hover:text-red-500'>
                <X className='size-4' />
              </button>
            </div>
          </div>
          {/* 内容区域 */}
          <div
            className='overflow-auto p-3 text-sm'
            style={{ maxHeight: "calc(80vh - 60px)" }}>
            {children}
          </div>
        </div>
      </>
    );
  }

  // 桌面端：可拖拽浮窗
  return (
    <div
      ref={windowRef}
      data-floating-window={id}
      className={cn(
        "fixed rounded-xs border bg-background shadow-lg",
        isDragging && "cursor-grabbing select-none",
        isResizing && "select-none",
      )}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: isMinimized ? "auto" : size.height,
        zIndex: 50,
      }}
      onMouseDown={bringToFront}>
      {/* 标题栏 */}
      <div
        className='flex h-7 cursor-grab items-center justify-between border-b bg-muted/30 px-2'
        onMouseDown={handleMouseDown}>
        <span className='truncate text-xs font-medium'>{title}</span>
        <div className='flex items-center gap-1' data-no-drag>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className='rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50'>
              <RefreshCw
                className={cn("size-3", isLoading && "animate-spin")}
              />
            </button>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className='rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground'>
            <Minus className='size-3' />
          </button>
          <button
            onClick={onClose}
            className='rounded p-0.5 text-muted-foreground hover:bg-red-500/20 hover:text-red-500'>
            <X className='size-3' />
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      {!isMinimized && (
        <div className='h-[calc(100%-28px)] overflow-auto p-2 text-xs'>
          {children}
        </div>
      )}

      {/* 调整大小手柄 */}
      {!isMinimized && (
        <div
          className='absolute bottom-0 right-0 h-3 w-3 cursor-se-resize'
          onMouseDown={handleResizeStart}>
          <svg
            className='size-3 text-muted-foreground/50'
            viewBox='0 0 12 12'
            fill='currentColor'>
            <path d='M10 10H12V12H10V10ZM6 10H8V12H6V10ZM10 6H12V8H10V6Z' />
          </svg>
        </div>
      )}
    </div>
  );
}
