import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_REPOSITORY } from '../store/app.repository';
import type { AppRepository } from '../store/app.repository';
import { TicketStatus } from '../common/ticket-status';
import { PointService } from '../point/point.service';
import { TicketRow } from '../store/types';
import { ReviewQueueService } from '../queue/review-queue.service';
import { MysqlService } from '../mysql/mysql.service';
import { RedisService } from '../redis/redis.service';
import {
  AiGatewayService,
  type OcrResult,
  type RiskResult,
} from '../ai/ai-gateway.service';
import { StorageService } from '../storage/storage.service';
import { MetricsService } from '../metrics/metrics.service';
import { RiskService } from '../risk/risk.service';

@Injectable()
export class TicketService implements OnModuleInit {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    @Inject(APP_REPOSITORY) private readonly repo: AppRepository,
    private readonly config: ConfigService,
    private readonly points: PointService,
    private readonly queue: ReviewQueueService,
    private readonly mysql: MysqlService,
    private readonly redis: RedisService,
    private readonly ai: AiGatewayService,
    private readonly storage: StorageService,
    private readonly metrics: MetricsService,
    private readonly risk: RiskService,
  ) {}

  onModuleInit() {
    // combined pipeline: API process consumes ticket.review
    // split pipeline: external services/workers consume ticket.upload
    if (this.queue.pipeline === 'combined') {
      this.queue.setHandler(async (job) => {
        await this.processReviewJob(job.ticketId);
      });
    }
  }

  findById(ticketId: number) {
    const ticket = this.repo.findTicketById(ticketId);
    if (!ticket) throw new NotFoundException('票据不存在');
    return ticket;
  }

  /** Admin/manual: re-send ticket to OCR workers queue */
  async requeueOcr(ticketId: number) {
    const ticket = this.findById(ticketId);
    ticket.status = TicketStatus.OcrProcessing;
    ticket.updatedAt = new Date().toISOString();
    this.repo.saveTicket(ticket);
    void this.mysql.saveTicket(ticket);
    await this.queue.enqueue({
      ticketId: ticket.id,
      userId: ticket.userId,
      imageUrl: ticket.imageUrl,
      ticketType: ticket.ticketType,
    });
    return {
      ticketId: ticket.id,
      status: ticket.status,
      queueMode: this.queue.mode,
      reviewPipeline: this.queue.pipeline,
      message:
        this.queue.pipeline === 'split'
          ? '已重新投递 ticket.upload 至 workers OCR'
          : '已重新投递审核队列',
    };
  }

  async upload(
    userId: number,
    imageUrl: string,
    ticketType = 'dining',
    rawBuffer?: Buffer,
    originalName = 'ticket.jpg',
  ) {
    this.risk.assertUserAllowed(userId, 'upload');
    let finalUrl = imageUrl;
    let storageBackend: string | undefined;
    if (rawBuffer && rawBuffer.length > 0) {
      const stored = await this.storage.putObject(
        this.storage.ticketKey(userId, originalName),
        rawBuffer,
        'image/jpeg',
      );
      finalUrl = stored.url;
      storageBackend = stored.backend;
    }

    const imageMd5 = rawBuffer
      ? this.repo.md5(rawBuffer)
      : this.repo.md5(finalUrl + Date.now());

    const dup = this.repo.findTicketByMd5(imageMd5);
    if (dup && dup.status !== TicketStatus.Rejected) {
      throw new BadRequestException('疑似重复票据（image_md5）');
    }

    const now = new Date().toISOString();
    const ticket: TicketRow = {
      id: this.repo.nextTicketId(),
      userId,
      ticketType,
      merchantId: null,
      merchantName: null,
      imageUrl: finalUrl,
      imageMd5,
      amount: null,
      orderNo: null,
      consumeTime: null,
      ocrConfidence: null,
      riskScore: null,
      status: TicketStatus.PendingOcr,
      rejectReason: null,
      reviewerId: null,
      reviewedAt: null,
      exchangedAt: null,
      createdAt: now,
      updatedAt: now,
      version: 0,
    };
    this.repo.saveTicket(ticket);
    if (this.mysql.isPureSql()) {
      await this.mysql.upsertTicketSql(ticket);
    } else {
      void this.mysql.saveTicket(ticket);
    }
    return { ...ticket, storageBackend: storageBackend || this.storage.mode };
  }

  async submit(userId: number, ticketId: number) {
    this.risk.assertUserAllowed(userId, 'upload');
    const ticket = this.getOwned(userId, ticketId);
    if (ticket.status !== TicketStatus.PendingOcr) {
      throw new BadRequestException('当前状态不可提交审核');
    }

    const allowed = await this.redis.allow(
      `rl:ticket_submit:${userId}:${Math.floor(Date.now() / 3600000)}`,
      30,
      3600,
    );
    if (!allowed) {
      throw new BadRequestException('提交过于频繁，请稍后再试');
    }

    ticket.status = TicketStatus.OcrProcessing;
    ticket.updatedAt = new Date().toISOString();
    this.repo.saveTicket(ticket);
    if (this.mysql.isPureSql()) {
      await this.mysql.upsertTicketSql(ticket);
    } else {
      void this.mysql.saveTicket(ticket);
    }

    const mode = this.config.get<string>('REVIEW_MODE', 'async');
    this.metrics.ticketsSubmitted.inc();
    if (mode === 'sync') {
      await this.processReviewJob(ticket.id);
      return this.getOwned(userId, ticketId);
    }

    await this.queue.enqueue({
      ticketId: ticket.id,
      userId,
      imageUrl: ticket.imageUrl,
      ticketType: ticket.ticketType,
    });
    return {
      ...ticket,
      queued: true,
      queueMode: this.queue.mode,
      reviewPipeline: this.queue.pipeline,
      message:
        this.queue.pipeline === 'split'
          ? '已进入 OCR 队列（workers）'
          : '已进入审核队列',
    };
  }

  /**
   * Combined in-process review (OCR + AI) used by memory/combined pipeline.
   */
  async processReviewJob(ticketId: number) {
    const ticket = this.repo.findTicketById(ticketId);
    if (!ticket) {
      this.logger.warn(`ticket ${ticketId} missing for review job`);
      return;
    }
    if (
      ticket.status !== TicketStatus.OcrProcessing &&
      ticket.status !== TicketStatus.AiReviewing
    ) {
      return;
    }

    const review = await this.ai.multimodalReview({
      ticketId: ticket.id,
      imageUrl: ticket.imageUrl,
      ticketType: ticket.ticketType,
    });
    this.applyOcrResult(ticket.id, review.ocr, { skipStatusGuard: true });
    this.applyAiDecision(ticket.id, review.risk, review.summary);
    this.logger.log(
      `ticket#${ticket.id} review → status=${this.repo.findTicketById(ticket.id)?.status} model=${review.model} ${review.latencyMs}ms`,
    );
  }

  /**
   * Stage 1 for split pipeline (ocr-worker callback).
   */
  applyOcrResult(
    ticketId: number,
    ocr: OcrResult,
    opts?: { skipStatusGuard?: boolean },
  ) {
    const ticket = this.repo.findTicketById(ticketId);
    if (!ticket) throw new NotFoundException('票据不存在');
    if (
      !opts?.skipStatusGuard &&
      ticket.status !== TicketStatus.OcrProcessing &&
      ticket.status !== TicketStatus.AiReviewing
    ) {
      throw new BadRequestException(
        `票据状态不可写 OCR (status=${ticket.status})`,
      );
    }
    ticket.merchantName = ocr.merchantName;
    ticket.amount = ocr.amount;
    ticket.orderNo = ocr.orderNo;
    ticket.consumeTime = ocr.consumeTime;
    ticket.ocrConfidence = ocr.confidence;
    ticket.status = TicketStatus.AiReviewing;
    ticket.updatedAt = new Date().toISOString();
    this.repo.saveTicket(ticket);
    if (this.mysql.isPureSql()) {
      void this.mysql.upsertTicketSql(ticket);
    } else {
      void this.mysql.saveTicket(ticket);
    }
    this.logger.log(
      `ticket#${ticket.id} OCR applied conf=${ocr.confidence} provider=${ocr.provider}`,
    );
    return ticket;
  }

  /**
   * Stage 2 for split pipeline (ai-worker callback).
   */
  applyAiDecision(ticketId: number, risk: RiskResult, summary?: string) {
    const ticket = this.repo.findTicketById(ticketId);
    if (!ticket) throw new NotFoundException('票据不存在');
    if (
      ticket.status !== TicketStatus.AiReviewing &&
      ticket.status !== TicketStatus.OcrProcessing
    ) {
      throw new BadRequestException(
        `票据状态不可写 AI 决策 (status=${ticket.status})`,
      );
    }
    ticket.riskScore = risk.riskScore;
    if (risk.decision === 'reject') {
      ticket.status = TicketStatus.Rejected;
      ticket.rejectReason = risk.reasons.join('; ') || 'AI 拒绝';
      this.repo.pushMessage(
        ticket.userId,
        '票据审核未通过',
        ticket.rejectReason,
        'ticket',
        ticket.id,
      );
      this.risk.pushEvent({
        userId: ticket.userId,
        eventType: 'ticket_reject',
        level: 'high',
        detail: ticket.rejectReason,
        refId: ticket.id,
      });
    } else if (risk.decision === 'manual') {
      ticket.status = TicketStatus.ManualReview;
      ticket.rejectReason = null;
      this.repo.pushMessage(
        ticket.userId,
        '票据进入人工审核',
        `票据 #${ticket.id} OCR 已完成，等待人工复核（风险分 ${risk.riskScore}）。`,
        'ticket',
        ticket.id,
      );
      this.risk.pushEvent({
        userId: ticket.userId,
        eventType: 'ticket_manual',
        level: 'medium',
        detail: `人工复核 risk=${risk.riskScore} ${summary || ''}`.trim(),
        refId: ticket.id,
      });
    } else {
      ticket.status = TicketStatus.Approved;
      ticket.rejectReason = null;
      this.points.addPoints(
        ticket.userId,
        'upload_ticket',
        ticket.id,
        '票据审核通过',
      );
      this.metrics.ticketsApproved.inc();
      this.repo.pushMessage(
        ticket.userId,
        '票据审核通过',
        summary || `票据 #${ticket.id} 已通过，可开盲盒。`,
        'ticket',
        ticket.id,
      );
    }
    ticket.updatedAt = new Date().toISOString();
    this.repo.saveTicket(ticket);
    if (this.mysql.isPureSql()) {
      void this.mysql.upsertTicketSql(ticket);
    } else {
      void this.mysql.saveTicket(ticket);
    }
    this.logger.log(
      `ticket#${ticket.id} AI decision=${risk.decision} score=${risk.riskScore}`,
    );
    return ticket;
  }

  list(userId: number, status?: number, page = 1, pageSize = 20) {
    let all = this.repo.listTicketsByUser(userId);
    if (status !== undefined && !Number.isNaN(status)) {
      all = all.filter((t) => t.status === status);
    }
    all = all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const start = (page - 1) * pageSize;
    return {
      list: all.slice(start, start + pageSize),
      total: all.length,
      page,
      pageSize,
    };
  }

  detail(userId: number, id: number) {
    return this.getOwned(userId, id);
  }

  cancel(userId: number, ticketId: number) {
    const ticket = this.getOwned(userId, ticketId);
    if (
      [
        TicketStatus.Rejected,
        TicketStatus.Exchanged,
        TicketStatus.Approved,
      ].includes(ticket.status)
    ) {
      throw new BadRequestException('当前状态不可取消');
    }
    ticket.status = TicketStatus.Rejected;
    ticket.rejectReason = '用户取消';
    ticket.updatedAt = new Date().toISOString();
    this.repo.saveTicket(ticket);
    void this.mysql.saveTicket(ticket);
    return ticket;
  }

  adminList(status?: number, page = 1, pageSize = 20) {
    let all = [...this.repo.listTickets()];
    if (status !== undefined && !Number.isNaN(status)) {
      all = all.filter((t) => t.status === status);
    }
    all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const start = (page - 1) * pageSize;
    return {
      list: all.slice(start, start + pageSize),
      total: all.length,
      page,
      pageSize,
    };
  }

  adminReview(
    ticketId: number,
    action: 'approve' | 'reject',
    reason?: string,
    reviewerId = 1,
  ) {
    const ticket = this.repo.findTicketById(ticketId);
    if (!ticket) throw new NotFoundException('票据不存在');
    if (ticket.status !== TicketStatus.ManualReview) {
      throw new BadRequestException('仅人工审核状态可操作');
    }
    if (action === 'approve') {
      ticket.status = TicketStatus.Approved;
      ticket.rejectReason = null;
      this.points.addPoints(
        ticket.userId,
        'upload_ticket',
        ticket.id,
        '人工审核通过',
      );
      this.metrics.ticketsApproved.inc();
      this.repo.pushMessage(
        ticket.userId,
        '人工审核通过',
        `票据 #${ticket.id} 已人工通过，可开盲盒。`,
        'ticket',
        ticket.id,
      );
    } else {
      ticket.status = TicketStatus.Rejected;
      ticket.rejectReason = reason || '人工拒绝';
      this.repo.pushMessage(
        ticket.userId,
        '票据审核未通过',
        reason || '票据未通过审核，请重新上传清晰票根。',
        'ticket',
        ticket.id,
      );
    }
    ticket.reviewerId = reviewerId;
    ticket.reviewedAt = new Date().toISOString();
    ticket.updatedAt = ticket.reviewedAt;
    this.repo.saveTicket(ticket);
    void this.mysql.saveTicket(ticket);
    return ticket;
  }

  private getOwned(userId: number, ticketId: number) {
    const ticket = this.repo.findTicketById(ticketId);
    if (!ticket || ticket.userId !== userId) {
      throw new NotFoundException('票据不存在');
    }
    return ticket;
  }
}
