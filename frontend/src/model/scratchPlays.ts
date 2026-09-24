/** Models for table: scratchPlays (ids are number / BIGINT) */

export class ScratchPlayRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  customerId: number = 0;
  programId: number = 0;
  prizeId: number = 0;
  rewardType: string = "";
  rewardValue: number = 0;
  label: string = "";
  source: string = "";
  referenceId: number = 0;
  checkinId: number = 0;
  status: string = "";
  createdAt: string = "";
  loyaltyTransactionId: number = 0;
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateScratchPlayReq {
  orgId: number = 0;
  locationId: number = 0;
  customerId: number = 0;
  programId: number = 0;
  prizeId: number = 0;
  rewardType: string = "";
  rewardValue: number = 0;
  label: string = "";
  source: string = "";
  referenceId: number = 0;
  checkinId: number = 0;
  status: string = "";
  createdAt: string = "";
  loyaltyTransactionId: number = 0;
}

export class CreateScratchPlayRes extends ScratchPlayRes {}

export class UpdateScratchPlayReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  customerId: number = 0;
  programId: number = 0;
  prizeId: number = 0;
  rewardType: string = "";
  rewardValue: number = 0;
  label: string = "";
  source: string = "";
  referenceId: number = 0;
  checkinId: number = 0;
  status: string = "";
  createdAt: string = "";
  loyaltyTransactionId: number = 0;
}

export class UpdateScratchPlayRes extends ScratchPlayRes {}

export class GetScratchPlayReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetScratchPlayRes extends ScratchPlayRes {
  errorMessage: string = "";
}

export class ListScratchPlayReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListScratchPlayRes {
  items: ScratchPlayRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteScratchPlayReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteScratchPlayRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
