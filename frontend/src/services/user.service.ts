/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import { authTokenStore } from "@/utils/auth-token.util";
import type { UserLoginReq, UserLoginRes, UserProfileUpdateReq, UserRes } from "@/model/users";

export class UserService extends KriosBaseService<UserRes> {
  constructor() {
    super("User");
  }

  async login(req: UserLoginReq): Promise<UserLoginRes> {
    const res = await this.postAction<UserLoginReq, UserLoginRes>("Login", req, true);
    if (res.access_token && res.refresh_token) {
      authTokenStore.set({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
        userId: res.userId,
        userName: res.name,
      });
    }
    return res;
  }

  async updateProfile(req: UserProfileUpdateReq): Promise<UserLoginRes> {
    return this.postAction<UserProfileUpdateReq, UserLoginRes>("UpdateProfile", req);
  }

  logout() {
    authTokenStore.clear();
  }
}

export const userService = new UserService();
