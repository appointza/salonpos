import { useData } from "@/lib/store";

/** Read-only access to the in-memory demo data store (API substitute in this UI). */
export function useApi() {
  return useData();
}
