/** Models for table: wheelSpins (ids are number / BIGINT) */

export class WheelSpinRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  customerId: number = 0;
  programId: number = 0;
  segmentId: number = 0;
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

export class CreateWheelSpinReq {
  orgId: number = 0;
  locationId: number = 0;
  customerId: number = 0;
  programId: number = 0;
  segmentId: number = 0;
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

export class CreateWheelSpinRes extends WheelSpinRes {}

export class UpdateWheelSpinReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  customerId: number = 0;
  programId: number = 0;
  segmentId: number = 0;
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

export class UpdateWheelSpinRes extends WheelSpinRes {}

export class GetWheelSpinReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetWheelSpinRes extends WheelSpinRes {
  errorMessage: string = "";
}

export class ListWheelSpinReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListWheelSpinRes {
  items: WheelSpinRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteWheelSpinReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteWheelSpinRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
