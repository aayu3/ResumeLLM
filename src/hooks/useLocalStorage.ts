import { useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  function setValue(value: T | ((prev: T) => T)) {
    const next = value instanceof Function ? value(storedValue) : value;
    setStoredValue(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Quota exceeded or private browsing — silently ignore.
    }
  }

  return [storedValue, setValue] as const;
}
