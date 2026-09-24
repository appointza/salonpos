/** Models for table: qrOffers (ids are number / BIGINT) */

export class QrOfferRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  title: string = "";
  description: string = "";
  offerType: string = "";
  eligibleSegment: string = "";
  validityStart: string = "";
  validityEnd: string = "";
  status: string = "";
  buyQty: number = 0;
  freeQty: number = 0;
  serviceName: string = "";
}

export class CreateQrOfferReq {
  orgId: number = 0;
  locationId: number = 0;
  title: string = "";
  description: string = "";
  offerType: string = "";
  eligibleSegment: string = "";
  validityStart: string = "";
  validityEnd: string = "";
  status: string = "";
  buyQty: number = 0;
  freeQty: number = 0;
  serviceName: string = "";
}

export class CreateQrOfferRes extends QrOfferRes {}

export class UpdateQrOfferReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  title: string = "";
  description: string = "";
  offerType: string = "";
  eligibleSegment: string = "";
  validityStart: string = "";
  validityEnd: string = "";
  status: string = "";
  buyQty: number = 0;
  freeQty: number = 0;
  serviceName: string = "";
}

export class UpdateQrOfferRes extends QrOfferRes {}

export class GetQrOfferReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetQrOfferRes extends QrOfferRes {
  errorMessage: string = "";
}

export class ListQrOfferReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListQrOfferRes {
  items: QrOfferRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteQrOfferReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteQrOfferRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
