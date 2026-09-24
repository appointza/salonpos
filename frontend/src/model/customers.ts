/** Models for table: customers (ids are number / BIGINT) */

export class CustomerRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  phone: string = "";
  email: string = "";
  gender: string = "";
  birthday: string = "";
  anniversary: string = "";
  household: string = "";
  tier: string = "";
  points: number = 0;
  walletBalance: number = 0;
  outlet: string = "";
  lastVisit: string = "";
  notes: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
  membershipId: number = 0;
  stampsCurrent: number = 0;
  totalVisits: number = 0;
  referralCode: string = "";
  marketingConsent: string = "";
}

export class CreateCustomerReq {
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  phone: string = "";
  email: string = "";
  gender: string = "";
  birthday: string = "";
  anniversary: string = "";
  household: string = "";
  tier: string = "";
  points: number = 0;
  walletBalance: number = 0;
  outlet: string = "";
  lastVisit: string = "";
  notes: string = "";
  membershipId: number = 0;
  stampsCurrent: number = 0;
  totalVisits: number = 0;
  referralCode: string = "";
  marketingConsent: string = "";
}

export class CreateCustomerRes extends CustomerRes {}

export class UpdateCustomerReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  phone: string = "";
  email: string = "";
  gender: string = "";
  birthday: string = "";
  anniversary: string = "";
  household: string = "";
  tier: string = "";
  points: number = 0;
  walletBalance: number = 0;
  outlet: string = "";
  lastVisit: string = "";
  notes: string = "";
  membershipId: number = 0;
  stampsCurrent: number = 0;
  totalVisits: number = 0;
  referralCode: string = "";
  marketingConsent: string = "";
}

export class UpdateCustomerRes extends CustomerRes {}

export class GetCustomerReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetCustomerRes extends CustomerRes {
  errorMessage: string = "";
}

export class ListCustomerReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListCustomerRes {
  items: CustomerRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteCustomerReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteCustomerRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}

export class CustomerLoyaltySummaryReq {
  orgId: number = 0;
  customerId: number = 0;
}

export class CustomerLoyaltySummaryRes {
  points: number = 0;
  earned: number = 0;
  redeemed: number = 0;
  transactions: Record<string, unknown>[] = [];
  errorMessage: string = "";
}
