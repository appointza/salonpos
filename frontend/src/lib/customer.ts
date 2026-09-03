import { useCallback, useEffect, useState } from "react";

export type CustomerSession = { name: string; phone: string; since: string };

const KEY = "salon-customer-session-v1";

export function useCustomerSession() {
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setCustomer(JSON.parse(raw) as CustomerSession);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const signIn = useCallback((name: string, phone: string) => {
    const next: CustomerSession = { name, phone, since: new Date().toISOString() };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setCustomer(next);
    return next;
  }, []);

  const signOut = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
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
