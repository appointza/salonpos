/** Models for table: loyalty (ids are number / BIGINT) */

export class LoyaltyRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  type: string = "";
  earnRate: string = "";
  redeemValue: string = "";
  tier: string = "";
  minSpend: number = 0;
  expiryMonths: number = 0;
  qrEnabled: string = "";
  status: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
  earnUnitRupees: number = 0;
  pointsPerUnit: number = 0;
  rupeesPerPoint: number = 0;
  rewardDescription: string = "";
  stampsRequired: number = 0;
  spinsAllowed: string = "";
  requiresCheckIn: string = "";
}

export class CreateLoyaltyReq {
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  type: string = "";
  earnRate: string = "";
  redeemValue: string = "";
  tier: string = "";
  minSpend: number = 0;
  expiryMonths: number = 0;
  qrEnabled: string = "";
  status: string = "";
  earnUnitRupees: number = 0;
  pointsPerUnit: number = 0;
  rupeesPerPoint: number = 0;
  rewardDescription: string = "";
  stampsRequired: number = 0;
  spinsAllowed: string = "";
  requiresCheckIn: string = "";
}

export class CreateLoyaltyRes extends LoyaltyRes {}

export class UpdateLoyaltyReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  type: string = "";
  earnRate: string = "";
  redeemValue: string = "";
  tier: string = "";
  minSpend: number = 0;
  expiryMonths: number = 0;
  qrEnabled: string = "";
  status: string = "";
  earnUnitRupees: number = 0;
  pointsPerUnit: number = 0;
  rupeesPerPoint: number = 0;
  rewardDescription: string = "";
  stampsRequired: number = 0;
  spinsAllowed: string = "";
  requiresCheckIn: string = "";
}

export class UpdateLoyaltyRes extends LoyaltyRes {}

export class GetLoyaltyReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetLoyaltyRes extends LoyaltyRes {
  errorMessage: string = "";
}

export class ListLoyaltyReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListLoyaltyRes {
  items: LoyaltyRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteLoyaltyReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteLoyaltyRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
