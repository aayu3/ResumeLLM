import { useState, useEffect } from "react";
import { encryptString, decryptString } from "../lib/crypto.ts";
import { useLocalStorage } from "./useLocalStorage.ts";

/**
 * Like useLocalStorage but values are AES-GCM encrypted before being written.
 * The device key is stored in localStorage under "__dk" and generated once per browser.
 * This prevents plaintext API keys appearing in localStorage inspection.
 */
export function useEncryptedLocalStorage(storageKey: string) {
  // Raw storage holds ciphertext values keyed by provider type.
  const [encrypted, setEncrypted] = useLocalStorage<Record<string, string>>(storageKey, {});
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  // Decrypt all stored values once on mount.
  useEffect(() => {
    (async () => {
      const result: Record<string, string> = {};
      for (const [k, v] of Object.entries(encrypted)) {
        const d = await decryptString(v);
        if (d !== null) result[k] = d;
      }
      setDecrypted(result);
      setLoaded(true);
    })();
  // encrypted intentionally excluded — we only decrypt once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function set(providerType: string, value: string) {
    const enc = await encryptString(value);
    setEncrypted((prev) => ({ ...prev, [providerType]: enc }));
    setDecrypted((prev) => ({ ...prev, [providerType]: value }));
  }

  function remove(providerType: string) {
    setEncrypted((prev) => {
      const { [providerType]: _, ...rest } = prev;
      return rest;
    });
    setDecrypted((prev) => {
      const { [providerType]: _, ...rest } = prev;
      return rest;
    });
  }

  function has(providerType: string) {
    return providerType in encrypted;
  }

  return { keys: decrypted, loaded, set, remove, has };
}
