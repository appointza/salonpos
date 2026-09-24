/** Re-export commonly used service singletons (prefer direct imports from *.service.ts). */
export { ActionReq } from "@/model/actionreq";
export { ActionRes } from "@/model/actionres";
export { KriosBaseService, type KriosSelectReq, type KriosDeleteReq } from "@/services/krios-base.service";

export { customerService } from "@/services/customer.service";
export { organizationService } from "@/services/organization.service";
export { userService } from "@/services/user.service";
export { invoiceService } from "@/services/invoice.service";
export { couponService } from "@/services/coupon.service";

/** @deprecated Use customerService */
export { customerService as CustomerApi } from "@/services/customer.service";
/** @deprecated Use organizationService */
export { organizationService as OrganizationApi } from "@/services/organization.service";
/** @deprecated Use userService */
export { userService as UserApi } from "@/services/user.service";

import { organizationService } from "@/services/organization.service";
import { userService } from "@/services/user.service";

/** @deprecated Use userService.login / organizationService.register / userService.logout */
export const authApi = {
  login: userService.login.bind(userService),
  register: organizationService.register.bind(organizationService),
  logout: userService.logout.bind(userService),
};
