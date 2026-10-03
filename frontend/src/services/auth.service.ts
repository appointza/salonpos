import {
  AuthCustomerLoginReq,
  AuthIdentifyReq,
  AuthIdentifyRes,
  AuthSendOtpReq,
  AuthSendOtpRes,
  AuthSetupCustomerPasswordReq,
} from "@/model/auth";
import type { UserLoginReq, UserLoginRes } from "@/model/users";
import { KriosBaseService } from "@/services/krios-base.service";
import { authTokenStore } from "@/utils/auth-token.util";

export class AuthService extends KriosBaseService<never> {
  constructor() {
    super("Auth");
  }

  private storeTokens(res: UserLoginRes) {
    if (res.access_token && res.refresh_token) {
      authTokenStore.set({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
        userId: res.userId,
        userName: res.name,
      });
    }
  }

  async identify(req: AuthIdentifyReq): Promise<AuthIdentifyRes> {
    return this.postAction<AuthIdentifyReq, AuthIdentifyRes>("Identify", req, true);
  }

  async sendOtp(req: AuthSendOtpReq): Promise<AuthSendOtpRes> {
    return this.postAction<AuthSendOtpReq, AuthSendOtpRes>("SendOtp", req, true);
  }

  async setupCustomerPassword(req: AuthSetupCustomerPasswordReq): Promise<UserLoginRes> {
    const res = await this.postAction<AuthSetupCustomerPasswordReq, UserLoginRes>(
      "SetupCustomerPassword",
      req,
      true,
    );
    this.storeTokens(res);
    return res;
  }

  async loginCustomer(req: AuthCustomerLoginReq): Promise<UserLoginRes> {
    const res = await this.postAction<AuthCustomerLoginReq, UserLoginRes>("LoginCustomer", req, true);
    this.storeTokens(res);
    return res;
  }

  async loginOrganization(req: UserLoginReq): Promise<UserLoginRes> {
    const res = await this.postAction<UserLoginReq, UserLoginRes>("LoginOrganization", req, true);
    this.storeTokens(res);
    return res;
  }
}

export const authService = new AuthService();
