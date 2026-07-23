/** Align with docs/05-Redis与MQ设计.md */
export const QUEUES = {
  /** API → ocr-worker */
  TICKET_UPLOAD: 'ticket.upload',
  /** ocr-worker → ai-worker */
  TICKET_OCR_FINISHED: 'ticket.ocr.finished',
  /** scheduler → expire-worker */
  COUPON_EXPIRE_SCAN: 'coupon.expire.scan',
  /** legacy combined review (api-server may still use) */
  TICKET_REVIEW: 'ticket.review',
} as const;

export type TicketUploadJob = {
  ticketId: number;
  userId: number;
  imageUrl: string;
  ticketType?: string;
  attempt?: number;
};

export type OcrResultPayload = {
  merchantName: string;
  amount: number;
  orderNo: string;
  consumeTime: string;
  confidence: number;
  rawText?: string;
  provider: string;
  fields?: Record<string, unknown>;
};

export type TicketOcrFinishedJob = {
  ticketId: number;
  userId: number;
  imageUrl: string;
  ticketType?: string;
  ocr: OcrResultPayload;
  attempt?: number;
};

export type RiskResultPayload = {
  decision: 'approve' | 'manual' | 'reject';
  riskScore: number;
  reasons: string[];
  provider: string;
  signals?: {
    isScreenshot?: boolean;
    isTampered?: boolean;
    isRealTicket?: boolean;
    duplicateHint?: boolean;
  };
};

export type CouponExpireScanJob = {
  trigger: 'cron' | 'manual' | 'bootstrap';
  at: string;
  limit?: number;
};
