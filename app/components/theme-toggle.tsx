;

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 从 localStorage 读取主题，如果没有则使用系统偏好
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    const initialTheme = savedTheme || systemTheme;
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const applyTheme = (newTheme: "light" | "dark") => {
    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  // 防止 hydration 不匹配
  if (!mounted) {
    return (
      <Button variant='ghost' size='sm' aria-label='toggle dark mode'>
        <Sun className='size-4' />
      </Button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className='flex items-center gap-0.5 px-1.5 py-1 text-xs rounded-xs border transition-colors text-muted-foreground hover:text-foreground shrink-0'
      aria-label='toggle dark mode'>
      {theme === "dark" ? (
        <Sun className='size-3' />
      ) : (
        <Moon className='size-3' />
      )}
    </button>
  );
}
