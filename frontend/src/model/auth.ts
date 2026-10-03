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
  phone: string = "";
}

export class AuthSendOtpRes {
  sent = false;
  maskedPhone: string = "";
  hint: string = "";
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
