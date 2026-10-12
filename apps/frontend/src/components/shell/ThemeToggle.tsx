"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function setTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "";
  try {
    localStorage.setItem("seam-theme", theme);
  } catch {}
}

export function useTheme() {
  const [theme, set] = useState<"light" | "dark">("light");
  useEffect(() => set(document.documentElement.dataset.theme === "dark" ? "dark" : "light"), []);
  return {
    theme,
    toggle: () => {
      const next = theme === "dark" ? "light" : "dark";
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
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="grid size-8 place-items-center rounded-full text-ink-muted hover:bg-cream hover:text-ink"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
