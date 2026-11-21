import { SafetySubmitReq, SafetySubmitRes } from "@/model/safety";
import { KriosBaseService } from "@/services/krios-base.service";

export class SafetyService extends KriosBaseService<never> {
  constructor() {
    super("Safety");
  }

  async submit(req: SafetySubmitReq): Promise<SafetySubmitRes> {
    return this.postAction<SafetySubmitReq, SafetySubmitRes>("Submit", req, true);
  }
}

export const safetyService = new SafetyService();
