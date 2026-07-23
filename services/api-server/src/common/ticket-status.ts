/** Align with docs/02-业务状态机.md */
export enum TicketStatus {
  PendingOcr = 0,
  OcrProcessing = 1,
  AiReviewing = 2,
  Approved = 3,
  Rejected = 4,
  ManualReview = 5,
  Exchanged = 6,
}

export enum CouponStatus {
  PendingReceive = 0,
  Received = 1,
  Locked = 2,
  Used = 3,
  Expired = 4,
  Revoked = 5,
}
