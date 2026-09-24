/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { LocationRes } from "@/model/locations";

export class LocationService extends KriosBaseService<LocationRes> {
  constructor() {
    super("Location");
  }
}

export const locationService = new LocationService();
