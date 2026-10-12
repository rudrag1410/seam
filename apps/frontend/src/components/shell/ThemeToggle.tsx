"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

enum Theme {
  Light = "light",
  Dark = "dark",
}

function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme === Theme.Dark ? Theme.Dark : "";
  try {
    localStorage.setItem("seam-theme", theme);
  } catch {}
}

export function useTheme() {
  const [theme, set] = useState<Theme>(Theme.Light);
  useEffect(() => set(document.documentElement.dataset.theme === Theme.Dark ? Theme.Dark : Theme.Light), []);
  return {
    theme,
    toggle: () => {
      const next = theme === Theme.Dark ? Theme.Light : Theme.Dark;
      setTheme(next);
      set(next);
    },
  };
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === Theme.Dark ? "Switch to light theme" : "Switch to dark theme"}
      className="grid size-8 place-items-center rounded-full text-ink-muted hover:bg-cream hover:text-ink"
    >
      {theme === Theme.Dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
