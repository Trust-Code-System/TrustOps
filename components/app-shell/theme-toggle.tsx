"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Light/dark theme toggle. The dark canvas is the default (matches the landing);
 * light mode is opt-in and scoped to the authenticated app by setting
 * `data-theme="light"` on <html>. Because this control only ever renders inside
 * the app shell, it also owns the theme's lifecycle:
 *   - on mount it applies the saved preference (covers client-side navigation
 *     into the app, where the no-flash inline script doesn't re-run);
 *   - on unmount it clears the attribute so auth/landing always render dark.
 * A matching inline script in the (app) layout sets the attribute before paint
 * on a full reload, so there's no flash.
 */
const STORAGE_KEY = "trustops.theme";

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  if (theme === "light") root.dataset.theme = "light";
  else delete root.dataset.theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">("dark");

  React.useEffect(() => {
    const saved =
      (localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null) ?? "dark";
    setTheme(saved);
    applyTheme(saved);
    // Leaving the app (e.g. sign out → auth) should restore the dark canvas.
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const label =
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="rounded-md p-2 text-text-muted hover:bg-gray-100"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}
