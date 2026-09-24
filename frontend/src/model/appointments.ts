/** Models for table: appointments (ids are number / BIGINT) */

export class AppointmentRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  customerId: number = 0;
  customer: string = "";
  serviceId: number = 0;
  service: string = "";
  staffId: number = 0;
  staff: string = "";
  outlet: string = "";
  date: string = "";
  time: string = "";
  duration: number = 0;
  status: string = "";
  source: string = "";
  notes: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateAppointmentReq {
  orgId: number = 0;
  locationId: number = 0;
  customerId: number = 0;
  customer: string = "";
  serviceId: number = 0;
  service: string = "";
  staffId: number = 0;
  staff: string = "";
  outlet: string = "";
  date: string = "";
  time: string = "";
  duration: number = 0;
  status: string = "";
  source: string = "";
  notes: string = "";
}

export class CreateAppointmentRes extends AppointmentRes {}

export class UpdateAppointmentReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  customerId: number = 0;
  customer: string = "";
  serviceId: number = 0;
  service: string = "";
  staffId: number = 0;
  staff: string = "";
  outlet: string = "";
  date: string = "";
  time: string = "";
  duration: number = 0;
  status: string = "";
  source: string = "";
  notes: string = "";
}

export class UpdateAppointmentRes extends AppointmentRes {}

export class GetAppointmentReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetAppointmentRes extends AppointmentRes {
  errorMessage: string = "";
}

export class ListAppointmentReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListAppointmentRes {
  items: AppointmentRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteAppointmentReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteAppointmentRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
