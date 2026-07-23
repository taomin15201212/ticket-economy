import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ok } from '../common/api-response';
import { CouponService } from '../coupon/coupon.service';
import { TicketService } from '../ticket/ticket.service';
import type { OcrResult, RiskResult } from '../ai/ai-gateway.service';
import { WorkerAuthGuard } from './worker-auth.guard';

/**
 * Internal endpoints for services/workers (OCR / AI / expire).
 * Auth: X-Worker-Secret
 */
@Controller('api/internal')
@UseGuards(WorkerAuthGuard)
export class InternalController {
  constructor(
    private readonly tickets: TicketService,
    private readonly coupons: CouponService,
  ) {}

  @Get('tickets/:id')
  getTicket(@Param('id', ParseIntPipe) id: number) {
    const ticket = this.tickets.findById(id);
    return ok(ticket);
  }

  @Post('tickets/:id/ocr')
  applyOcr(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { ocr: OcrResult },
  ) {
    const ticket = this.tickets.applyOcrResult(id, body.ocr);
    return ok(ticket);
  }

  @Post('tickets/:id/ai-decision')
  applyAi(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { risk: RiskResult; summary?: string },
  ) {
    const ticket = this.tickets.applyAiDecision(id, body.risk, body.summary);
    return ok(ticket);
  }

  @Post('coupons/expire')
  expire(@Body() body: { limit?: number }) {
    const result = this.coupons.expireScan(body?.limit ?? 200);
    return ok(result);
  }
}
