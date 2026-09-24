/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { RoleRes } from "@/model/roles";

export class RoleService extends KriosBaseService<RoleRes> {
  constructor() {
    super("Role");
  }
}

export const roleService = new RoleService();
