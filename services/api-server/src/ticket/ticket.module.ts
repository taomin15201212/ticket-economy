import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PointModule } from '../point/point.module';
import { StorageModule } from '../storage/storage.module';
import { RiskModule } from '../risk/risk.module';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';

@Module({
  imports: [PointModule, AiModule, StorageModule, RiskModule],
  controllers: [TicketController],
  providers: [TicketService],
  exports: [TicketService],
})
export class TicketModule {}
