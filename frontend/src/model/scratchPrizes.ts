/** Models for table: scratchPrizes (ids are number / BIGINT) */

export class ScratchPrizeRes {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  programId: number = 0;
  label: string = "";
  rewardTier: string = "";
  prizeType: string = "";
  prizeValue: number = 0;
  winWeight: number = 0;
  colorHex: string = "";
  active: string = "";
}

export class CreateScratchPrizeReq {
  orgId: number = 0;
  locationId: number = 0;
  programId: number = 0;
  label: string = "";
  rewardTier: string = "";
  prizeType: string = "";
  prizeValue: number = 0;
  winWeight: number = 0;
  colorHex: string = "";
  active: string = "";
}

export class CreateScratchPrizeRes extends ScratchPrizeRes {}

export class UpdateScratchPrizeReq {
  id: number = 0;
  orgId: number = 0;
  locationId: number = 0;
  programId: number = 0;
  label: string = "";
  rewardTier: string = "";
  prizeType: string = "";
  prizeValue: number = 0;
  winWeight: number = 0;
  colorHex: string = "";
  active: string = "";
}

export class UpdateScratchPrizeRes extends ScratchPrizeRes {}

export class GetScratchPrizeReq {
  id: number = 0;
  orgId: number = 0;
}

export class GetScratchPrizeRes extends ScratchPrizeRes {
  errorMessage: string = "";
}

export class ListScratchPrizeReq {
  orgId: number = 0;
  locationId: number = 0;
  search: string = "";
  page: number = 1;
  pageSize: number = 50;
}

export class ListScratchPrizeRes {
  items: ScratchPrizeRes[] = [];
  total: number = 0;
  errorMessage: string = "";
}

export class DeleteScratchPrizeReq {
  id: number = 0;
  orgId: number = 0;
}

export class DeleteScratchPrizeRes {
  id: number = 0;
  success: boolean = false;
  errorMessage: string = "";
}
