import { ActionReq } from "@/model/actionreq";
import { ActionRes } from "@/model/actionres";
import { AxiosHelperUtils } from "@/utils/axioshelper.util";
import { environment } from "@/utils/environment.util";

export type KriosSelectReq = {
  id?: number;
  orgId?: number;
  locationId?: number;
  search?: string;
  status?: string;
  email?: string;
  role?: string;
};

export type KriosDeleteReq = {
  id: number;
  orgId?: number;
};

/** Shared Krios CRUD client: GET Entity + POST Select|Insert|Update|Save|Delete */
export class KriosBaseService<TEntity extends { id?: number }> {
  protected readonly controller: string;
  protected readonly http: AxiosHelperUtils;
  protected readonly baseurl: string;

  constructor(controller: string) {
    this.controller = controller;
    this.baseurl = environment.baseurl;
    this.http = new AxiosHelperUtils();
  }

  protected apiPath(action: string) {
    return `${this.baseurl}/api/${this.controller}/${action}`;
  }

  protected async postAction<TReq, TRes>(
    action: string,
    req: TReq,
    skipAuthorization = false,
  ): Promise<TRes> {
    const postdata = new ActionReq<TReq>();
    postdata.item = req;
    const resp = await this.http.post<ActionRes<TRes>>(
      this.apiPath(action),
      postdata,
      skipAuthorization,
    );
    return resp.item;
  }

  async entity(skipAuthorization = false): Promise<TEntity> {
    const resp = await this.http.get<ActionRes<TEntity>>(
      this.apiPath("Entity"),
      skipAuthorization,
    );
    return resp.item;
  }

  async select(req: KriosSelectReq = {}): Promise<TEntity[]> {
    return this.postAction<KriosSelectReq, TEntity[]>("Select", req);
  }

  async insert(req: TEntity): Promise<TEntity> {
    return this.postAction<TEntity, TEntity>("Insert", req);
  }

  async update(req: TEntity): Promise<TEntity> {
    return this.postAction<TEntity, TEntity>("Update", req);
  }

  async save(req: TEntity): Promise<TEntity> {
    return this.postAction<TEntity, TEntity>("Save", req);
  }

  async delete(req: KriosDeleteReq): Promise<boolean> {
    return this.postAction<KriosDeleteReq, boolean>("Delete", req);
  }
}
