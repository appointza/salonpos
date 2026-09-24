/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { OrganizationRegistrationReq, OrganizationRegistrationRes, OrganizationRes } from "@/model/organizations";

export class OrganizationService extends KriosBaseService<OrganizationRes> {
  constructor() {
    super("Organization");
  }

  async register(req: OrganizationRegistrationReq): Promise<OrganizationRegistrationRes> {
    return this.postAction<OrganizationRegistrationReq, OrganizationRegistrationRes>("Register", req, true);
  }
}

export const organizationService = new OrganizationService();
