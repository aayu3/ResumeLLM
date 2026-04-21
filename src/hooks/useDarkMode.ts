import { useState, useEffect } from "react";

const KEY = "darkMode";

function getInitial(): boolean {
  const stored = localStorage.getItem(KEY);
  if (stored !== null) return stored === "true";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useDarkMode() {
  const [dark, setDark] = useState(getInitial);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(KEY, String(dark));
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}
