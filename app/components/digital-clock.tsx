"use client";

import { useEffect, useState } from "react";
import { cn } from "~/lib/utils";

interface DigitalClockProps {
  /** 时间格式：12小时制或24小时制 */
  format?: "12h" | "24h";
  /** 是否显示秒 */
  showSeconds?: boolean;
  /** 是否显示日期 */
  showDate?: boolean;
  /** 尺寸 */
  size?: "xs" | "sm" | "md" | "lg";
  /** 自定义类名 */
  className?: string;
}

/**
 * 七段数字映射
 * 每个数字由7个段组成：
 *   a
 *  f b
 *   g
 *  e c
 *   d
 */
const SEGMENTS: Record<string, boolean[]> = {
  //        a      b      c      d      e      f      g
  "0": [true, true, true, true, true, true, false],
  "1": [false, true, true, false, false, false, false],
  "2": [true, true, false, true, true, false, true],
  "3": [true, true, true, true, false, false, true],
  "4": [false, true, true, false, false, true, true],
  "5": [true, false, true, true, false, true, true],
  "6": [true, false, true, true, true, true, true],
  "7": [true, true, true, false, false, false, false],
  "8": [true, true, true, true, true, true, true],
  "9": [true, true, true, true, false, true, true],
};

/** 七段数字显示组件 */
function SevenSegmentDigit({
  digit,
  size,
}: {
  digit: string;
  size: "xs" | "sm" | "md" | "lg";
}) {
  const segments = SEGMENTS[digit] || SEGMENTS["8"];

  const sizeConfig = {
    xs: { width: 12, height: 20, segmentWidth: 2, gap: 0.5 },
    sm: { width: 16, height: 28, segmentWidth: 3, gap: 1 },
    md: { width: 24, height: 42, segmentWidth: 4, gap: 1.5 },
    lg: { width: 36, height: 64, segmentWidth: 6, gap: 2 },
  };

  const { width, height, segmentWidth, gap } = sizeConfig[size];
  const halfHeight = height / 2;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className='shrink-0'>
      {/* 段 a - 顶部水平 */}
      <polygon
        points={`${gap + segmentWidth},${gap} ${width - gap - segmentWidth},${gap} ${width - gap - segmentWidth * 1.5},${gap + segmentWidth} ${gap + segmentWidth * 1.5},${gap + segmentWidth}`}
        className={cn(
          "transition-opacity duration-100",
          segments[0] ? "fill-current opacity-100" : "fill-current opacity-10",
        )}
      />
      {/* 段 b - 右上垂直 */}
      <polygon
        points={`${width - gap},${gap + segmentWidth} ${width - gap},${halfHeight - gap} ${width - gap - segmentWidth},${halfHeight - segmentWidth} ${width - gap - segmentWidth},${gap + segmentWidth * 1.5}`}
        className={cn(
          "transition-opacity duration-100",
          segments[1] ? "fill-current opacity-100" : "fill-current opacity-10",
        )}
      />
      {/* 段 c - 右下垂直 */}
      <polygon
        points={`${width - gap},${halfHeight + gap} ${width - gap},${height - gap - segmentWidth} ${width - gap - segmentWidth},${height - gap - segmentWidth * 1.5} ${width - gap - segmentWidth},${halfHeight + segmentWidth}`}
        className={cn(
          "transition-opacity duration-100",
          segments[2] ? "fill-current opacity-100" : "fill-current opacity-10",
        )}
      />
      {/* 段 d - 底部水平 */}
      <polygon
        points={`${gap + segmentWidth * 1.5},${height - gap - segmentWidth} ${width - gap - segmentWidth * 1.5},${height - gap - segmentWidth} ${width - gap - segmentWidth},${height - gap} ${gap + segmentWidth},${height - gap}`}
        className={cn(
          "transition-opacity duration-100",
          segments[3] ? "fill-current opacity-100" : "fill-current opacity-10",
        )}
      />
      {/* 段 e - 左下垂直 */}
      <polygon
        points={`${gap},${halfHeight + gap} ${gap + segmentWidth},${halfHeight + segmentWidth} ${gap + segmentWidth},${height - gap - segmentWidth * 1.5} ${gap},${height - gap - segmentWidth}`}
        className={cn(
          "transition-opacity duration-100",
          segments[4] ? "fill-current opacity-100" : "fill-current opacity-10",
        )}
      />
      {/* 段 f - 左上垂直 */}
      <polygon
        points={`${gap},${gap + segmentWidth} ${gap + segmentWidth},${gap + segmentWidth * 1.5} ${gap + segmentWidth},${halfHeight - segmentWidth} ${gap},${halfHeight - gap}`}
        className={cn(
          "transition-opacity duration-100",
          segments[5] ? "fill-current opacity-100" : "fill-current opacity-10",
        )}
      />
      {/* 段 g - 中间水平 */}
      <polygon
        points={`${gap + segmentWidth * 1.5},${halfHeight - segmentWidth / 2} ${width - gap - segmentWidth * 1.5},${halfHeight - segmentWidth / 2} ${width - gap - segmentWidth},${halfHeight} ${width - gap - segmentWidth * 1.5},${halfHeight + segmentWidth / 2} ${gap + segmentWidth * 1.5},${halfHeight + segmentWidth / 2} ${gap + segmentWidth},${halfHeight}`}
        className={cn(
          "transition-opacity duration-100",
          segments[6] ? "fill-current opacity-100" : "fill-current opacity-10",
        )}
      />
    </svg>
  );
}

/** 冒号分隔符 */
function Colon({
  size,
  blink,
}: {
  size: "xs" | "sm" | "md" | "lg";
  blink?: boolean;
}) {
  const sizeConfig = {
    xs: { width: 6, height: 10, dotSize: 1 },
    sm: { width: 8, height: 28, dotSize: 3 },
    md: { width: 12, height: 42, dotSize: 4 },
    lg: { width: 16, height: 64, dotSize: 6 },
  };

  const { width, height, dotSize } = sizeConfig[size];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <circle
        cx={width / 2}
        cy={height * 0.3}
        r={dotSize}
        className={cn(
          "fill-current transition-opacity duration-500",
          blink ? "animate-pulse" : "",
        )}
      />
      <circle
        cx={width / 2}
        cy={height * 0.7}
        r={dotSize}
        className={cn(
          "fill-current transition-opacity duration-500",
          blink ? "animate-pulse" : "",
        )}
      />
    </svg>
  );
}

export function DigitalClock({
  format = "24h",
  showSeconds = true,
  showDate = false,
  size = "md",
  className,
}: DigitalClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 格式化时间
  let hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  let period = "";

  if (format === "12h") {
    period = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
  }

  const hoursStr = hours.toString().padStart(2, "0");
  const minutesStr = minutes.toString().padStart(2, "0");
  const secondsStr = seconds.toString().padStart(2, "0");

  // 格式化日期
  const dateStr = showDate
    ? `${time.getFullYear()}-${(time.getMonth() + 1).toString().padStart(2, "0")}-${time.getDate().toString().padStart(2, "0")}`
    : "";

  const periodSizeClass = {
    xs: "text-xs",
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className='flex items-center gap-[0.2em]'>
        {/* 小时 */}
        <SevenSegmentDigit digit={hoursStr[0]} size={size} />
        <SevenSegmentDigit digit={hoursStr[1]} size={size} />

        <Colon size={size} blink />

        {/* 分钟 */}
        <SevenSegmentDigit digit={minutesStr[0]} size={size} />
        <SevenSegmentDigit digit={minutesStr[1]} size={size} />

        {/* 秒 */}
        {showSeconds && (
          <>
            <Colon size={size} blink />
            <SevenSegmentDigit digit={secondsStr[0]} size={size} />
            <SevenSegmentDigit digit={secondsStr[1]} size={size} />
          </>
        )}

        {/* AM/PM */}
        {format === "12h" && (
          <span
            className={cn(
              "ml-1 font-mono font-bold self-end mb-1",
              periodSizeClass[size],
            )}>
            {period}
          </span>
        )}
      </div>

      {/* 日期 */}
      {showDate && (
        <div
          className={cn("font-mono text-muted-foreground", periodSizeClass[size])}>
          {dateStr}
        </div>
      )}
    </div>
  );
}
