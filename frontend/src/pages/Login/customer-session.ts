import { useCallback, useEffect, useState } from "react";
import {
  CUSTOMER_SESSION_EVENT,
  CUSTOMER_SESSION_KEY,
  readCustomerSession,
  writeCustomerSession,
  type StoredCustomerSession,
} from "@/session";

export type CustomerSession = StoredCustomerSession;

export function useCustomerSession() {
  const [customer, setCustomer] = useState<CustomerSession | null>(() => readCustomerSession());
  const [ready] = useState(true);

  useEffect(() => {
    const sync = () => setCustomer(readCustomerSession());
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === CUSTOMER_SESSION_KEY) sync();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener(CUSTOMER_SESSION_EVENT, sync);
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", sync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(CUSTOMER_SESSION_EVENT, sync);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", sync);
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
