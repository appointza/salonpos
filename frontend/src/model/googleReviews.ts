/** Models for table: googleReviews (ids are number / BIGINT) */

export class GoogleReviewRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  outlet: string = "";
  author: string = "";
  rating: number = 0;
  relativeTime: string = "";
  date: string = "";
  comment: string = "";
  source: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateGoogleReviewReq {
  orgId: number = 0;
  locationId: number = 0;
  outlet: string = "";
  author: string = "";
  rating: number = 0;
  relativeTime: string = "";
  date: string = "";
  comment: string = "";
  source: string = "";
}

export class CreateGoogleReviewRes extends GoogleReviewRes {}

export class UpdateGoogleReviewReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  outlet: string = "";
  author: string = "";
  rating: number = 0;
  relativeTime: string = "";
  date: string = "";
  comment: string = "";
  source: string = "";
}

export class UpdateGoogleReviewRes extends GoogleReviewRes {}

export class GetGoogleReviewReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetGoogleReviewRes extends GoogleReviewRes {
  errorMessage: string = "";
}

export class ListGoogleReviewReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListGoogleReviewRes {
  items: GoogleReviewRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteGoogleReviewReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteGoogleReviewRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
