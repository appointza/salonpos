import { useCallback, useEffect, useState } from "react";
import { rowToEntity, toRow } from "@/lib/entity-row";
import { ENTITY_SERVICE_MAP } from "@/lib/entity-service-map";
import type { Row } from "@/lib/store";
import type { KriosSelectReq } from "@/services/krios-base.service";
import { useTenant } from "@/lib/tenant";
import { toast } from "sonner";

export function useEntityCrud(collection: string, selectReq?: KriosSelectReq) {
  const { orgId, locationId } = useTenant();
  const service = ENTITY_SERVICE_MAP[collection];
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(Boolean(service));
  const [error, setError] = useState<string | null>(null);

  const buildSelectReq = useCallback((): KriosSelectReq => {
    const base: KriosSelectReq = { orgId: Number(orgId), ...selectReq };
    if (locationId !== "all") base.locationId = Number(locationId);
    return base;
  }, [orgId, locationId, selectReq]);

  const reload = useCallback(async () => {
    if (!service) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await service.select(buildSelectReq());
      setRows(data.map((item) => toRow(item as Record<string, unknown>)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load data";
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [service, buildSelectReq]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (row: Row) => {
      if (!service) return;
      const saved = await service.save(rowToEntity(row));
      const next = toRow(saved as Record<string, unknown>);
      setRows((prev) => [next, ...prev]);
      return next;
    },
    [service],
  );

  const update = useCallback(
    async (id: string | number, row: Row) => {
      if (!service) return;
      const payload = rowToEntity({ ...row, id });
      const saved = await service.save(payload);
      const next = toRow(saved as Record<string, unknown>);
      setRows((prev) => prev.map((r) => (String(r.id) === String(id) ? next : r)));
      return next;
    },
    [service],
  );

  const remove = useCallback(
    async (id: string | number) => {
      if (!service) return;
      await service.delete({ id: Number(id), orgId: Number(orgId) });
      setRows((prev) => prev.filter((r) => String(r.id) !== String(id)));
    },
    [service, orgId],
  );

  const mutate = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Request failed");
        throw e;
      }
    },
    [],
  );

  return {
    rows,
    loading,
    error,
    reload,
    create: (row: Row) => mutate(() => create(row) as Promise<void>),
    update: (id: string | number, row: Row) => mutate(() => update(id, row) as Promise<void>),
    remove: (id: string | number) => mutate(() => remove(id)),
    apiBacked: Boolean(service),
  };
}
