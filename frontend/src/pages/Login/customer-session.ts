import { useCallback, useEffect, useState } from "react";
import {
  CUSTOMER_SESSION_EVENT,
  CUSTOMER_SESSION_KEY,
  readCustomerSession,
  writeCustomerSession,
  type StoredCustomerSession,
} from "@/session";
import { authTokenStore } from "@/utils/auth-token.util";

export type CustomerSession = StoredCustomerSession;

export function useCustomerSession() {
  const [customer, setCustomer] = useState<CustomerSession | null>(() => readCustomerSession());
  const [ready] = useState(true);

  useEffect(() => {
    const applyStored = (allowClear: boolean) => {
      const next = readCustomerSession();
      setCustomer((prev) => {
        if (next) return next;
        if (!allowClear && prev) {
          try {
            if (window.localStorage.getItem(CUSTOMER_SESSION_KEY)) return prev;
          } catch {
            return prev;
          }
        }
        return null;
      });
    };
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === CUSTOMER_SESSION_KEY) applyStored(true);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") applyStored(false);
    };
    const onSessionEvent = () => applyStored(true);
    window.addEventListener(CUSTOMER_SESSION_EVENT, onSessionEvent);
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(CUSTOMER_SESSION_EVENT, onSessionEvent);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const signIn = useCallback((name: string, phone: string, userId?: number) => {
    const next: CustomerSession = { userId, name, phone, since: new Date().toISOString() };
    writeCustomerSession(next);
    setCustomer(next);
    return next;
  }, []);

  const signOut = useCallback(() => {
    authTokenStore.clear();
    writeCustomerSession(null);
    setCustomer(null);
  }, []);

  return { customer, ready, signIn, signOut };
}

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
