import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type OcrResult = {
  merchantName: string;
  amount: number;
  orderNo: string;
  consumeTime: string;
  confidence: number;
  rawText?: string;
  provider: string;
  fields?: Record<string, unknown>;
};

export type RiskResult = {
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

export type MultimodalReviewResult = {
  ocr: OcrResult;
  risk: RiskResult;
  summary: string;
  model: string;
  latencyMs: number;
};

/**
 * Pluggable AI gateway (Sprint 4).
 * AI_PROVIDER=mock | http | multimodal
 * - mock: deterministic demo
 * - http: AI_OCR_URL + AI_RISK_URL
 * - multimodal: AI_MULTIMODAL_URL single-shot review (OCR+risk)
 */
@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);

  constructor(private readonly config: ConfigService) {}

  get provider() {
    return this.config.get<string>('AI_PROVIDER', 'mock');
  }

  async ocr(input: {
    ticketId: number;
    imageUrl: string;
    ticketType?: string;
  }): Promise<OcrResult> {
    if (this.provider === 'http' || this.provider === 'multimodal') {
      const url = this.config.get<string>('AI_OCR_URL');
      if (url) {
        try {
          const res = await this.postJson(url, input);
          if (res) {
            const data = res as Partial<OcrResult>;
            return {
              merchantName: data.merchantName || '未知商户',
              amount: Number(data.amount ?? 0),
              orderNo: data.orderNo || `ORD${Date.now()}`,
              consumeTime: data.consumeTime || new Date().toISOString(),
              confidence: Number(data.confidence ?? 80),
              rawText: data.rawText,
              fields: data.fields,
              provider: 'http',
            };
          }
        } catch (e) {
          this.logger.warn(`OCR HTTP failed: ${(e as Error).message}`);
        }
      }
    }
    return this.mockOcr(input.ticketId, input.ticketType);
  }

  async riskScore(input: {
    ticketId: number;
    imageUrl: string;
    ocr: OcrResult;
  }): Promise<RiskResult> {
    const mockMode = this.config.get<string>('AI_MOCK_MODE', 'auto_approve');

    // Demo override always available
    if (mockMode === 'auto_reject') {
      return {
        decision: 'reject',
        riskScore: 90,
        reasons: ['mock: 疑似截图/PS'],
        provider: 'mock',
        signals: { isScreenshot: true, isRealTicket: false },
      };
    }
    if (mockMode === 'auto_manual') {
      return {
        decision: 'manual',
        riskScore: 55,
        reasons: ['mock: 中风险需人工'],
        provider: 'mock',
        signals: { isRealTicket: true },
      };
    }

    if (this.provider === 'http' || this.provider === 'multimodal') {
      const url = this.config.get<string>('AI_RISK_URL');
      if (url) {
        try {
          const res = await this.postJson(url, input);
          if (res) {
            const data = res as Partial<RiskResult>;
            return {
              decision: (data.decision as RiskResult['decision']) || 'manual',
              riskScore: Number(data.riskScore ?? 50),
              reasons: data.reasons || [],
              provider: 'http',
              signals: data.signals,
            };
          }
        } catch (e) {
          this.logger.warn(`Risk HTTP failed: ${(e as Error).message}`);
        }
      }
    }

    if (this.provider === 'mock') {
      return {
        decision: 'approve',
        riskScore: 12,
        reasons: [],
        provider: 'mock',
        signals: { isRealTicket: true, isScreenshot: false, isTampered: false },
      };
    }

    const conf = input.ocr.confidence;
    if (conf >= 85) {
      return {
        decision: 'approve',
        riskScore: 15,
        reasons: [],
        provider: 'heuristic',
        signals: { isRealTicket: true },
      };
    }
    if (conf >= 60) {
      return {
        decision: 'manual',
        riskScore: 50,
        reasons: ['OCR 置信度中等'],
        provider: 'heuristic',
      };
    }
    return {
      decision: 'reject',
      riskScore: 85,
      reasons: ['OCR 置信度过低'],
      provider: 'heuristic',
      signals: { isRealTicket: false },
    };
  }

  /**
   * Single-shot multimodal review (preferred production path).
   * Falls back to ocr() + riskScore() if multimodal endpoint missing.
   */
  async multimodalReview(input: {
    ticketId: number;
    imageUrl: string;
    ticketType?: string;
  }): Promise<MultimodalReviewResult> {
    const started = Date.now();
    const model =
      this.config.get<string>('AI_MULTIMODAL_MODEL') || 'mock-multimodal-v1';

    if (this.provider === 'multimodal') {
      const url = this.config.get<string>('AI_MULTIMODAL_URL');
      if (url) {
        try {
          const res = await this.postJson(url, {
            ...input,
            model,
            tasks: ['ocr', 'authenticity', 'risk'],
          });
          if (res && typeof res === 'object') {
            const data = res as {
              ocr?: Partial<OcrResult>;
              risk?: Partial<RiskResult>;
              summary?: string;
              model?: string;
            };
            const ocr: OcrResult = {
              merchantName: data.ocr?.merchantName || '未知商户',
              amount: Number(data.ocr?.amount ?? 0),
              orderNo: data.ocr?.orderNo || `ORD${Date.now()}`,
              consumeTime:
                data.ocr?.consumeTime || new Date().toISOString(),
              confidence: Number(data.ocr?.confidence ?? 80),
              rawText: data.ocr?.rawText,
              fields: data.ocr?.fields,
              provider: 'multimodal',
            };
            const risk: RiskResult = {
              decision:
                (data.risk?.decision as RiskResult['decision']) || 'manual',
              riskScore: Number(data.risk?.riskScore ?? 50),
              reasons: data.risk?.reasons || [],
              provider: 'multimodal',
              signals: data.risk?.signals,
            };
            return {
              ocr,
              risk,
              summary:
                data.summary ||
                `decision=${risk.decision} score=${risk.riskScore}`,
              model: data.model || model,
              latencyMs: Date.now() - started,
            };
          }
        } catch (e) {
          this.logger.warn(
            `Multimodal HTTP failed: ${(e as Error).message} → pipeline fallback`,
          );
        }
      }
    }

    const ocr = await this.ocr(input);
    const risk = await this.riskScore({
      ticketId: input.ticketId,
      imageUrl: input.imageUrl,
      ocr,
    });
    return {
      ocr,
      risk,
      summary: `${ocr.merchantName} ¥${ocr.amount} → ${risk.decision}(${risk.riskScore})`,
      model,
      latencyMs: Date.now() - started,
    };
  }

  private async postJson(
    url: string,
    body: unknown,
  ): Promise<Record<string, unknown> | null> {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.get('AI_API_KEY')
          ? { Authorization: `Bearer ${this.config.get('AI_API_KEY')}` }
          : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      this.logger.warn(`AI HTTP ${res.status} ${url}`);
      return null;
    }
    return (await res.json()) as Record<string, unknown>;
  }

  private mockOcr(ticketId: number, ticketType?: string): OcrResult {
    const names: Record<string, string> = {
      dining: '千百味红谷滩店',
      scenic: '滕王阁景区',
      metro: '南昌地铁',
      movie: '万达影城红谷滩',
      didi: '滴滴出行',
    };
    return {
      merchantName: names[ticketType || 'dining'] || '本地商户',
      amount: Number((Math.random() * 80 + 20).toFixed(2)),
      orderNo: `ORD${Date.now()}${ticketId}`,
      consumeTime: new Date().toISOString(),
      confidence: 92.5,
      rawText: `MOCK OCR ticket#${ticketId}`,
      provider: 'mock',
      fields: { ticketType: ticketType || 'dining' },
    };
  }
}
