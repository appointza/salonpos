import { KriosBaseService } from "@/services/krios-base.service";
import type { AssetRes } from "@/model/assets";

export class AssetService extends KriosBaseService<AssetRes> {
  constructor() {
    super("Asset");
  }

  fileUrl(id: string | number) {
    const n = Number(id);
    if (!Number.isFinite(n) || n <= 0) return "";
    const base = this.baseurl.replace(/\/$/, "");
    return `${base}/api/Asset/File/${n}`;
  }
}

export const assetService = new AssetService();
