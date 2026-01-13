"use client";

import { useEffect, useState } from "react";
import { Select } from "@base-ui/react/select";
import { ChevronDown, Check, Globe } from "lucide-react";
import { cn } from "~/lib/utils";
import { useI18n } from "~/lib/i18n";

interface Timezone {
  id: string;
  labelKey: keyof (typeof import("~/locales/zh.json"))["timezone"];
  zone: string;
}

const TIMEZONES: Timezone[] = [
  { id: "cn", labelKey: "cn", zone: "Asia/Shanghai" },
  { id: "us-east", labelKey: "usEast", zone: "America/New_York" },
  { id: "us-central", labelKey: "usCentral", zone: "America/Chicago" },
  { id: "us-mountain", labelKey: "usMountain", zone: "America/Denver" },
  { id: "us-pacific", labelKey: "usPacific", zone: "America/Los_Angeles" },
];

interface WorldClockProps {
  /** 时间格式：12小时制或24小时制 */
  format?: "12h" | "24h";
  /** 是否显示秒 */
  showSeconds?: boolean;
  /** 是否显示日期 */
  showDate?: boolean;
  /** 是否显示时区选择器 */
  showSelector?: boolean;
  /** 自定义类名 */
  className?: string;
}

const TIMEZONE_STORAGE_KEY = "timezone";

// 语言对应的默认时区
const DEFAULT_TIMEZONE_BY_LANG: Record<string, string> = {
  zh: "cn",
  en: "us-east",
};

export function WorldClock({
  format = "24h",
  showSeconds = false,
  showDate = true,
  showSelector = true,
  className,
}: WorldClockProps) {
  const { t, language } = useI18n();
  const [timezoneId, setTimezoneId] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());

  // 初始化时区：优先使用本地存储，否则根据语言设置默认值
  useEffect(() => {
    const saved = localStorage.getItem(TIMEZONE_STORAGE_KEY);
    if (saved && TIMEZONES.some((tz) => tz.id === saved)) {
      setTimezoneId(saved);
    } else {
      // 根据语言设置默认时区
      const defaultTz = DEFAULT_TIMEZONE_BY_LANG[language] || "cn";
      setTimezoneId(defaultTz);
    }
  }, [language]);

  // 用户选择时存储到本地
  const handleTimezoneChange = (value: string | null) => {
    if (value) {
      setTimezoneId(value);
      localStorage.setItem(TIMEZONE_STORAGE_KEY, value);
    }
  };

  const timezone = TIMEZONES.find((tz) => tz.id === timezoneId) || TIMEZONES[0];
  const getLabel = (tz: Timezone) => t.timezone[tz.labelKey];

  // 定时更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 格式化时间
  const formatTime = () => {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone.zone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: format === "12h",
    };

    if (showSeconds) {
      options.second = "2-digit";
    }

    return new Intl.DateTimeFormat("en-US", options).format(time);
  };

  // 格式化日期
  const formatDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone.zone,
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    };

    return new Intl.DateTimeFormat("zh-CN", options).format(time);
  };

  // 等待初始化完成
  if (!timezoneId) {
    return null;
  }

  return (
    <div className={cn("flex items-center text-xs", className)}>
      {/* 时间显示 */}
      <div className='flex items-center gap-1.5 rounded-xs border border-r-0 px-1.5 py-0.5'>
        <span className='font-mono tabular-nums'>{formatTime()}</span>
        {showDate && (
          <span className='text-muted-foreground'>{formatDate()}</span>
        )}
      </div>

      {/* 时区选择器 */}
      {showSelector && timezoneId && (
        <Select.Root value={timezoneId} onValueChange={handleTimezoneChange}>
          <Select.Trigger className='flex cursor-pointer items-center gap-1 rounded-xs border px-1.5 py-0.5 text-muted-foreground transition-colors border-l-0 outline-none hover:text-foreground'>
            <Globe className='size-3' />
            <Select.Value />
            <Select.Icon>
              <ChevronDown className='size-3' />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner sideOffset={4}>
              <Select.Popup className='rounded-xs border bg-popover text-xs shadow-md'>
                {TIMEZONES.map((tz) => (
                  <Select.Item
                    key={tz.id}
                    value={tz.id}
                    className='flex cursor-pointer items-center gap-2 px-2 py-1 outline-none data-highlighted:bg-muted'>
                    <Select.ItemIndicator className='inline-flex w-3'>
                      <Check className='size-3' />
                    </Select.ItemIndicator>
                    <Select.ItemText>{getLabel(tz)}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      )}
    </div>
  );
}
