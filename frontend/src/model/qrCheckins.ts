/** Models for table: qrCheckins (ids are number / BIGINT) */

export class QrCheckinRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  customerId: number = 0;
  customer: string = "";
  phone: string = "";
  staffId: number = 0;
  staff: string = "";
  billAmount: number = 0;
  rewardEarned: string = "";
  verification: string = "";
  status: string = "";
  visitAt: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateQrCheckinReq {
  orgId: number = 0;
  locationId: number = 0;
  customerId: number = 0;
  customer: string = "";
  phone: string = "";
  staffId: number = 0;
  staff: string = "";
  billAmount: number = 0;
  rewardEarned: string = "";
  verification: string = "";
  status: string = "";
  visitAt: string = "";
}

export class CreateQrCheckinRes extends QrCheckinRes {}

export class UpdateQrCheckinReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  customerId: number = 0;
  customer: string = "";
  phone: string = "";
  staffId: number = 0;
  staff: string = "";
  billAmount: number = 0;
  rewardEarned: string = "";
  verification: string = "";
  status: string = "";
  visitAt: string = "";
}

export class UpdateQrCheckinRes extends QrCheckinRes {}

export class GetQrCheckinReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetQrCheckinRes extends QrCheckinRes {
  errorMessage: string = "";
}

export class ListQrCheckinReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListQrCheckinRes {
  items: QrCheckinRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteQrCheckinReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteQrCheckinRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
