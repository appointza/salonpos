export class SafetySubmitReq {
  reporterId = 0;
  reporterContact = "";
  reportedUserId = 0;
  reportedContentId = "";
  reason = "";
  description = "";
  evidence = "";
}

export class SafetySubmitRes {
  reportId = 0;
  status = "";
  message = "";
}

export const SAFETY_REPORT_REASONS = [
  { id: "child-safety", label: "Child safety concern" },
  { id: "sexual-exploitation", label: "Sexual exploitation" },
  { id: "inappropriate-content", label: "Inappropriate content" },
  { id: "harassment-grooming", label: "Harassment or grooming" },
  { id: "other", label: "Other" },
] as const;
