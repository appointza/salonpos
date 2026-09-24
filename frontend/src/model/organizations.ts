/** Models for table: organizations (ids are number / BIGINT) */

export class OrganizationRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  slug: string = "";
  domain: string = "";
  website: string = "";
  businessType: string = "";
  brandColor: string = "";
  pointsPerRupee: number = 0;
  rupeesPerPoint: number = 0;
  whatsappPhoneNumberId: string = "";
  whatsappBusinessAccountId: string = "";
  whatsappDisplayNumber: string = "";
  whatsappApiKey: string = "";
  whatsappWebhookToken: string = "";
  whatsappApiVersion: string = "";
  whatsappConnected: string = "";
  status: string = "";
  createdby: string = "";
  createdon: string = "";
  updatedby: string = "";
  updatedon: string = "";
  earnUnitRupees: number = 0;
  pointsPerUnit: number = 0;
  loyaltyMinSpend: number = 0;
  rewardWheelWeights: string = "";
  rewardScratchWeights: string = "";
  rewardCustomerTierWeights: string = "";
  publicBookingShowPrizeWheel: string = "";
  publicBookingShowScratchCard: string = "";
}

export class CreateOrganizationReq {
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  slug: string = "";
  domain: string = "";
  website: string = "";
  businessType: string = "";
  brandColor: string = "";
  pointsPerRupee: number = 0;
  rupeesPerPoint: number = 0;
  whatsappPhoneNumberId: string = "";
  whatsappBusinessAccountId: string = "";
  whatsappDisplayNumber: string = "";
  whatsappApiKey: string = "";
  whatsappWebhookToken: string = "";
  whatsappApiVersion: string = "";
  whatsappConnected: string = "";
  status: string = "";
  earnUnitRupees: number = 0;
  pointsPerUnit: number = 0;
  loyaltyMinSpend: number = 0;
  rewardWheelWeights: string = "";
  rewardScratchWeights: string = "";
  rewardCustomerTierWeights: string = "";
  publicBookingShowPrizeWheel: string = "";
  publicBookingShowScratchCard: string = "";
}

export class CreateOrganizationRes extends OrganizationRes {}

export class UpdateOrganizationReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  name: string = "";
  slug: string = "";
  domain: string = "";
  website: string = "";
  businessType: string = "";
  brandColor: string = "";
  pointsPerRupee: number = 0;
  rupeesPerPoint: number = 0;
  whatsappPhoneNumberId: string = "";
  whatsappBusinessAccountId: string = "";
  whatsappDisplayNumber: string = "";
  whatsappApiKey: string = "";
  whatsappWebhookToken: string = "";
  whatsappApiVersion: string = "";
  whatsappConnected: string = "";
  status: string = "";
  earnUnitRupees: number = 0;
  pointsPerUnit: number = 0;
  loyaltyMinSpend: number = 0;
  rewardWheelWeights: string = "";
  rewardScratchWeights: string = "";
  rewardCustomerTierWeights: string = "";
  publicBookingShowPrizeWheel: string = "";
  publicBookingShowScratchCard: string = "";
}

export class UpdateOrganizationRes extends OrganizationRes {}

export class GetOrganizationReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetOrganizationRes extends OrganizationRes {
  errorMessage: string = "";
}

export class ListOrganizationReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListOrganizationRes {
  items: OrganizationRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteOrganizationReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteOrganizationRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}

export class OrganizationRegistrationReq {
  organizationName: string = "";
  businessType: string = "";
  domain: string = "";
  website: string = "";
  brandColor: string = "";
  adminName: string = "";
  adminEmail: string = "";
  adminPassword: string = "";
  phone: string = "";
  city: string = "";
  address: string = "";
  outletName: string = "";
}

export class OrganizationRegistrationRes {
  organizationId: number = 0;
  adminUserId: number = 0;
  locationId: number = 0;
  slug: string = "";
}
