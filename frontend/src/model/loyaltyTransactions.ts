/** Models for table: loyaltyTransactions (ids are number / BIGINT) */

export class LoyaltyTransactionRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  customerId: number = 0;
  invoiceId: number = 0;
  programId: number = 0;
  type: string = "";
  points: number = 0;
  source: string = "";
  referenceId: number = 0;
  balanceBefore: number = 0;
  balanceAfter: number = 0;
  reason: string = "";
  expiresOn: string = "";
  status: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateLoyaltyTransactionReq {
  orgId: number = 0;
  locationId: number = 0;
  customerId: number = 0;
  invoiceId: number = 0;
  programId: number = 0;
  type: string = "";
  points: number = 0;
  source: string = "";
  referenceId: number = 0;
  balanceBefore: number = 0;
  balanceAfter: number = 0;
  reason: string = "";
  expiresOn: string = "";
  status: string = "";
}

export class CreateLoyaltyTransactionRes extends LoyaltyTransactionRes {}

export class UpdateLoyaltyTransactionReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  customerId: number = 0;
  invoiceId: number = 0;
  programId: number = 0;
  type: string = "";
  points: number = 0;
  source: string = "";
  referenceId: number = 0;
  balanceBefore: number = 0;
  balanceAfter: number = 0;
  reason: string = "";
  expiresOn: string = "";
  status: string = "";
}

export class UpdateLoyaltyTransactionRes extends LoyaltyTransactionRes {}

export class GetLoyaltyTransactionReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetLoyaltyTransactionRes extends LoyaltyTransactionRes {
  errorMessage: string = "";
}

export class ListLoyaltyTransactionReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListLoyaltyTransactionRes {
  items: LoyaltyTransactionRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteLoyaltyTransactionReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteLoyaltyTransactionRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
