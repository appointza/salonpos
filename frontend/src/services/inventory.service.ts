/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type {
  InventoryCheckAvailabilityReq,
  InventoryCheckAvailabilityRes,
  InventoryRemainingReq,
  InventoryRemainingRes,
  InventoryRes,
} from "@/model/inventory";

export class InventoryService extends KriosBaseService<InventoryRes> {
  constructor() {
    super("Inventory");
  }

  async remaining(req: InventoryRemainingReq): Promise<InventoryRemainingRes> {
    return this.postAction<InventoryRemainingReq, InventoryRemainingRes>("Remaining", req);
  }

  async checkAvailability(req: InventoryCheckAvailabilityReq): Promise<InventoryCheckAvailabilityRes> {
    return this.postAction<InventoryCheckAvailabilityReq, InventoryCheckAvailabilityRes>("CheckAvailability", req);
  }
}

export const inventoryService = new InventoryService();
