/** Models for table: qrOfferRedemptions (ids are number / BIGINT) */

export class QrOfferRedemptionRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  offerId: number = 0;
  customerId: number = 0;
  checkinId: number = 0;
  invoiceId: number = 0;
  status: string = "";
  discountAmount: number = 0;
  issuedAt: string = "";
  redeemedAt: string = "";
  offerTitle: string = "";
  offerType: string = "";
}

export class CreateQrOfferRedemptionReq {
  orgId: number = 0;
  locationId: number = 0;
  offerId: number = 0;
  customerId: number = 0;
  checkinId: number = 0;
  invoiceId: number = 0;
  status: string = "";
  discountAmount: number = 0;
  issuedAt: string = "";
  redeemedAt: string = "";
  offerTitle: string = "";
  offerType: string = "";
}

export class CreateQrOfferRedemptionRes extends QrOfferRedemptionRes {}

export class UpdateQrOfferRedemptionReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  offerId: number = 0;
  customerId: number = 0;
  checkinId: number = 0;
  invoiceId: number = 0;
  status: string = "";
  discountAmount: number = 0;
  issuedAt: string = "";
  redeemedAt: string = "";
  offerTitle: string = "";
  offerType: string = "";
}

export class UpdateQrOfferRedemptionRes extends QrOfferRedemptionRes {}

export class GetQrOfferRedemptionReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetQrOfferRedemptionRes extends QrOfferRedemptionRes {
  errorMessage: string = "";
}

export class ListQrOfferRedemptionReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListQrOfferRedemptionRes {
  items: QrOfferRedemptionRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteQrOfferRedemptionReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteQrOfferRedemptionRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
