/** Models for table: partnerships (ids are number / BIGINT) */

export class PartnershipRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  partnerName: string = "";
  status: string = "";
  outboundOffer: string = "";
  inboundOffer: string = "";
  issued: number = 0;
  redeemed: number = 0;
}

export class CreatePartnershipReq {
  orgId: number = 0;
  locationId: number = 0;
  partnerName: string = "";
  status: string = "";
  outboundOffer: string = "";
  inboundOffer: string = "";
  issued: number = 0;
  redeemed: number = 0;
}

export class CreatePartnershipRes extends PartnershipRes {}

export class UpdatePartnershipReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  partnerName: string = "";
  status: string = "";
  outboundOffer: string = "";
  inboundOffer: string = "";
  issued: number = 0;
  redeemed: number = 0;
}

export class UpdatePartnershipRes extends PartnershipRes {}

export class GetPartnershipReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetPartnershipRes extends PartnershipRes {
  errorMessage: string = "";
}

export class ListPartnershipReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListPartnershipRes {
  items: PartnershipRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeletePartnershipReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeletePartnershipRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
