import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_POS } from "@/pages/Nearby/nearby-utils";
import { listNearbyStudios, type NearbyStudio } from "@/services/nearby.service";

export function useNearbyStudios() {
  const [pos, setPos] = useState(DEFAULT_POS);
  const [located, setLocated] = useState(false);
  const [locating, setLocating] = useState(false);
  const [studios, setStudios] = useState<NearbyStudio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locateMe = useCallback((silent = false) => {
    if (!navigator.geolocation) {
      if (!silent) toast.error("Location is not available in this browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocated(true);
        setLocating(false);
        if (!silent) toast.success("Using your current location");
      },
      () => {
        setLocating(false);
        if (!silent) toast.error("Couldn't get your location — showing estimated distances");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStudios(await listNearbyStudios(pos));
    } catch (e) {
      setStudios([]);
      setError(e instanceof Error ? e.message : "Could not load salons");
    } finally {
      setLoading(false);
    }
  }, [pos]);

  useEffect(() => {
    locateMe(true);
  }, [locateMe]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { pos, located, locating, studios, loading, error, locateMe, refresh };
}
