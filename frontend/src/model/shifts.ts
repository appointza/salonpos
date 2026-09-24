/** Models for table: shifts (ids are number / BIGINT) */

export class ShiftRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  date: string = "";
  startTime: string = "";
  endTime: string = "";
  shiftType: string = "";
  weeklyOff: string = "";
  status: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
  staffId: number = 0;
}

export class CreateShiftReq {
  orgId: number = 0;
  locationId: number = 0;
  date: string = "";
  startTime: string = "";
  endTime: string = "";
  shiftType: string = "";
  weeklyOff: string = "";
  status: string = "";
  staffId: number = 0;
}

export class CreateShiftRes extends ShiftRes {}

export class UpdateShiftReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  date: string = "";
  startTime: string = "";
  endTime: string = "";
  shiftType: string = "";
  weeklyOff: string = "";
  status: string = "";
  staffId: number = 0;
}

export class UpdateShiftRes extends ShiftRes {}

export class GetShiftReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetShiftRes extends ShiftRes {
  errorMessage: string = "";
}

export class ListShiftReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListShiftRes {
  items: ShiftRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteShiftReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteShiftRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
