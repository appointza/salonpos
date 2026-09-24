/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { FranchiseRes } from "@/model/franchises";

export class FranchiseService extends KriosBaseService<FranchiseRes> {
  constructor() {
    super("Franchise");
  }
}

export const franchiseService = new FranchiseService();
