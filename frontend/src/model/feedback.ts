/** Models for table: feedback (ids are number / BIGINT) */

export class FeedbackRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  customer: string = "";
  invoice: string = "";
  staff: string = "";
  outlet: string = "";
  date: string = "";
  rating: number = 0;
  nps: number = 0;
  channel: string = "";
  status: string = "";
  comment: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateFeedbackReq {
  orgId: number = 0;
  locationId: number = 0;
  customer: string = "";
  invoice: string = "";
  staff: string = "";
  outlet: string = "";
  date: string = "";
  rating: number = 0;
  nps: number = 0;
  channel: string = "";
  status: string = "";
  comment: string = "";
}

export class CreateFeedbackRes extends FeedbackRes {}

export class UpdateFeedbackReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  customer: string = "";
  invoice: string = "";
  staff: string = "";
  outlet: string = "";
  date: string = "";
  rating: number = 0;
  nps: number = 0;
  channel: string = "";
  status: string = "";
  comment: string = "";
}

export class UpdateFeedbackRes extends FeedbackRes {}

export class GetFeedbackReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetFeedbackRes extends FeedbackRes {
  errorMessage: string = "";
}

export class ListFeedbackReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListFeedbackRes {
  items: FeedbackRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteFeedbackReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteFeedbackRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
