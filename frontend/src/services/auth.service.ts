import {
  AuthCustomerLoginReq,
  AuthIdentifyReq,
  AuthIdentifyRes,
  AuthSendOtpReq,
  AuthSendOtpRes,
  AuthResetOrganizationPasswordReq,
  AuthSetupCustomerPasswordReq,
  AuthUpdateLanguageReq,
  AuthUpdateLanguageRes,
} from "@/model/auth";
import type { UserChangePasswordReq, UserLoginReq, UserLoginRes } from "@/model/users";
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

  async changePassword(req: UserChangePasswordReq): Promise<UserLoginRes> {
    const res = await this.postAction<UserChangePasswordReq, UserLoginRes>("ChangePassword", req, true);
    this.storeTokens(res);
    return res;
  }

  async resetOrganizationPassword(req: AuthResetOrganizationPasswordReq): Promise<UserLoginRes> {
    const res = await this.postAction<AuthResetOrganizationPasswordReq, UserLoginRes>(
      "ResetOrganizationPassword",
      req,
      true,
    );
    this.storeTokens(res);
    return res;
  }

  async updateLanguage(req: AuthUpdateLanguageReq): Promise<AuthUpdateLanguageRes> {
    return this.postAction<AuthUpdateLanguageReq, AuthUpdateLanguageRes>("UpdateLanguage", req, true);
  }
}

export const authService = new AuthService();
