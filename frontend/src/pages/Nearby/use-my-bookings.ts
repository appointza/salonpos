import { useCallback, useEffect, useState } from "react";
import type { CustomerSession } from "@/pages/Login/customer-session";
import { loadOrgCatalog, listNearbyStudios } from "@/services/nearby.service";
import type { Row } from "@/store";

const DEFAULT_POS = { lat: 19.076, lng: 72.8777 };

export function useMyBookings(customer: CustomerSession | null) {
  const [bookings, setBookings] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!customer) {
      setBookings([]);
      setLoading(false);
      return;
    }
    const digits = customer.phone.replace(/\D/g, "").slice(-10);
    if (digits.length < 10) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const studios = await listNearbyStudios(DEFAULT_POS);
      const orgIds = [...new Set(studios.map((s) => s.org.orgId))];
      const lists = await Promise.all(
        orgIds.map(async (orgId) => {
          try {
            const cat = await loadOrgCatalog(orgId);
            return cat.appointments;
          } catch {
            return [] as Row[];
          }
        }),
      );

      const mine = lists.flat().filter((a) => {
        const noteDigits = String(a["notes"] ?? "").replace(/\D/g, "");
        return (
          String(a["customer"]) === customer.name ||
          (noteDigits.length >= 10 && noteDigits.includes(digits)) ||
          String(a["notes"] ?? "").includes(customer.phone)
        );
      });
      setBookings(mine);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [customer]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { bookings, loading, reload };
}
