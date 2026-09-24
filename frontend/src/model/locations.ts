/** Models for table: locations (ids are number / BIGINT) */

export class LocationRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  code: string = "";
  city: string = "";
  address: string = "";
  phone: string = "";
  email: string = "";
  timezone: string = "";
  status: string = "";
  lat: number = 0;
  lng: number = 0;
  placeId: string = "";
  googleRating: number = 0;
  googleReviewCount: number = 0;
  googleSyncedAt: string = "";
  googleMapsUrl: string = "";
  googleSyncSource: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateLocationReq {
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  code: string = "";
  city: string = "";
  address: string = "";
  phone: string = "";
  email: string = "";
  timezone: string = "";
  status: string = "";
  lat: number = 0;
  lng: number = 0;
  placeId: string = "";
  googleRating: number = 0;
  googleReviewCount: number = 0;
  googleSyncedAt: string = "";
  googleMapsUrl: string = "";
  googleSyncSource: string = "";
}

export class CreateLocationRes extends LocationRes {}

export class UpdateLocationReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  code: string = "";
  city: string = "";
  address: string = "";
  phone: string = "";
  email: string = "";
  timezone: string = "";
  status: string = "";
  lat: number = 0;
  lng: number = 0;
  placeId: string = "";
  googleRating: number = 0;
  googleReviewCount: number = 0;
  googleSyncedAt: string = "";
  googleMapsUrl: string = "";
  googleSyncSource: string = "";
}

export class UpdateLocationRes extends LocationRes {}

export class GetLocationReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetLocationRes extends LocationRes {
  errorMessage: string = "";
}

export class ListLocationReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListLocationRes {
  items: LocationRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteLocationReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteLocationRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
