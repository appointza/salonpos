/** Models for table: attendance (ids are number / BIGINT) */

export class AttendanceRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  date: string = "";
  checkIn: string = "";
  checkOut: string = "";
  remarks: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
  staffId: number = 0;
}

export class CreateAttendanceReq {
  orgId: number = 0;
  locationId: number = 0;
  date: string = "";
  checkIn: string = "";
  checkOut: string = "";
  remarks: string = "";
  staffId: number = 0;
}

export class CreateAttendanceRes extends AttendanceRes {}

export class UpdateAttendanceReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  date: string = "";
  checkIn: string = "";
  checkOut: string = "";
  remarks: string = "";
  staffId: number = 0;
}

export class UpdateAttendanceRes extends AttendanceRes {}

export class GetAttendanceReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetAttendanceRes extends AttendanceRes {
  errorMessage: string = "";
}

export class ListAttendanceReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListAttendanceRes {
  items: AttendanceRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteAttendanceReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteAttendanceRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
