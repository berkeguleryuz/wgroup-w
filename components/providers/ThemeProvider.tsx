"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = "theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

function getInitialTheme(): Theme {
  // Resolve from localStorage → OS preference, exactly like the head script.
  // Do NOT read the DOM class here: if the provider remounts right after a
  // root-layout re-render (locale switch), React may already have wiped the
  // `.dark` class — reading it would lock the wrong theme into state.
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable — fall through to the OS preference.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const themeRef = useRef(theme);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // The `.dark` class is applied imperatively, so any React re-render of the
  // <html> element (e.g. a locale switch re-rendering the root layout with a
  // new `lang`) re-asserts className and wipes it. Watch the class attribute
  // and re-apply the current theme whenever the DOM drifts from our state —
  // applyTheme converges, so the observer settles after one correction.
  useEffect(() => {
    const root = document.documentElement;
    // Converge the DOM immediately (covers a remount that happened after
    // React wiped the class), then keep watching for future wipes.
    applyTheme(themeRef.current);
    const observer = new MutationObserver(() => {
      const domDark = root.classList.contains("dark");
      if (domDark !== (themeRef.current === "dark")) {
        applyTheme(themeRef.current);
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private mode / SSR) — ignore.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  // When the user has not chosen explicitly, follow the OS preference live.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") return;
      const next: Theme = e.matches ? "dark" : "light";
      setThemeState(next);
      applyTheme(next);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

/**
 * Synchronous, render-blocking script injected into <head>. It resolves the
 * theme (stored preference → OS preference) and sets the `.dark` class on
 * <html> before the first paint, preventing a flash of the wrong theme.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}if(t==="dark"){document.documentElement.classList.add("dark");}}catch(e){}})();`;
