import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ok } from '../common/api-response';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AiGatewayService } from './ai-gateway.service';

/** Internal / admin AI probes (align OpenAPI /api/ai/*). */
@Controller('api/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AiController {
  constructor(private readonly ai: AiGatewayService) {}

  @Post('ocr')
  async ocr(
    @Body()
    body: { ticketId: number; imageUrl?: string; ticketType?: string },
  ) {
    return ok(
      await this.ai.ocr({
        ticketId: Number(body.ticketId),
        imageUrl: body.imageUrl || '',
        ticketType: body.ticketType,
      }),
    );
  }

  @Post('review')
  async review(
    @Body()
    body: { ticketId: number; imageUrl?: string; ticketType?: string },
  ) {
    return ok(
      await this.ai.multimodalReview({
        ticketId: Number(body.ticketId),
        imageUrl: body.imageUrl || '',
        ticketType: body.ticketType,
      }),
    );
  }

  @Post('risk-score')
  async risk(
    @Body()
    body: {
      ticketId: number;
      imageUrl?: string;
      ocr: {
        merchantName: string;
        amount: number;
        orderNo: string;
        consumeTime: string;
        confidence: number;
        provider?: string;
      };
    },
  ) {
    return ok(
      await this.ai.riskScore({
        ticketId: Number(body.ticketId),
        imageUrl: body.imageUrl || '',
        ocr: {
          ...body.ocr,
          provider: body.ocr.provider || 'input',
        },
      }),
    );
  }
}
