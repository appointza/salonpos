export class AuthIdentifyReq {
  identifier: string = "";
}

export class AuthIdentifyRes {
  accountType: "organization" | "customer" | "unknown" | "" = "";
  hasPassword = false;
  name: string = "";
  email: string = "";
  phone: string = "";
  maskedPhone: string = "";
  orgId: number = 0;
  organizationId: number = 0;
}

export class AuthSendOtpReq {
  identifier: string = "";
  phone: string = "";
  email: string = "";
}

export class AuthSendOtpRes {
  sent = false;
  maskedPhone: string = "";
  maskedEmail: string = "";
  hint: string = "";
  channel: string = "";
}

export class AuthUpdateLanguageReq {
  userId: number = 0;
  language: string = "en";
}

export class AuthUpdateLanguageRes {
  language: string = "";
}

export class AuthSetupCustomerPasswordReq {
  phone: string = "";
  otp: string = "";
  password: string = "";
  name: string = "";
}

export class AuthCustomerLoginReq {
  phone: string = "";
  password: string = "";
}

export class AuthResetOrganizationPasswordReq {
  phone: string = "";
  email: string = "";
  otp: string = "";
  password: string = "";
}
