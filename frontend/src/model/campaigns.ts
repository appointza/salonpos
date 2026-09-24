/** Models for table: campaigns (ids are number / BIGINT) */

export class CampaignRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  channel: string = "";
  segment: string = "";
  audience: number = 0;
  sent: number = 0;
  opened: number = 0;
  converted: number = 0;
  budget: number = 0;
  schedule: string = "";
  status: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
}

export class CreateCampaignReq {
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  channel: string = "";
  segment: string = "";
  audience: number = 0;
  sent: number = 0;
  opened: number = 0;
  converted: number = 0;
  budget: number = 0;
  schedule: string = "";
  status: string = "";
}

export class CreateCampaignRes extends CampaignRes {}

export class UpdateCampaignReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  channel: string = "";
  segment: string = "";
  audience: number = 0;
  sent: number = 0;
  opened: number = 0;
  converted: number = 0;
  budget: number = 0;
  schedule: string = "";
  status: string = "";
}

export class UpdateCampaignRes extends CampaignRes {}

export class GetCampaignReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetCampaignRes extends CampaignRes {
  errorMessage: string = "";
}

export class ListCampaignReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListCampaignRes {
  items: CampaignRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteCampaignReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteCampaignRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
