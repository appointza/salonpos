/** Auto-generated — run: node/scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { StockAdjustReq, StockAdjustRes } from "@/model/inventory";
import type { StockMovementRes } from "@/model/stockMovements";

export class StockMovementService extends KriosBaseService<StockMovementRes> {
  constructor() {
    super("StockMovement");
  }

  async adjust(req: StockAdjustReq): Promise<StockAdjustRes> {
    return this.postAction<StockAdjustReq, StockAdjustRes>("Adjust", req);
  }
}

export const stockMovementService = new StockMovementService();
