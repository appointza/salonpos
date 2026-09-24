/** Models for table: wheelSegments (ids are number / BIGINT) */

export class WheelSegmentRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  programId: number = 0;
  label: string = "";
  rewardTier: string = "";
  prizeType: string = "";
  prizeValue: number = 0;
  winWeight: number = 0;
  colorHex: string = "";
  active: string = "";
}

export class CreateWheelSegmentReq {
  orgId: number = 0;
  locationId: number = 0;
  programId: number = 0;
  label: string = "";
  rewardTier: string = "";
  prizeType: string = "";
  prizeValue: number = 0;
  winWeight: number = 0;
  colorHex: string = "";
  active: string = "";
}

export class CreateWheelSegmentRes extends WheelSegmentRes {}

export class UpdateWheelSegmentReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  programId: number = 0;
  label: string = "";
  rewardTier: string = "";
  prizeType: string = "";
  prizeValue: number = 0;
  winWeight: number = 0;
  colorHex: string = "";
  active: string = "";
}

export class UpdateWheelSegmentRes extends WheelSegmentRes {}

export class GetWheelSegmentReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetWheelSegmentRes extends WheelSegmentRes {
  errorMessage: string = "";
}

export class ListWheelSegmentReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListWheelSegmentRes {
  items: WheelSegmentRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteWheelSegmentReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteWheelSegmentRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
