import { Module } from '@nestjs/common';
import { RiskModule } from '../risk/risk.module';
import { BlindboxController } from './blindbox.controller';
import { BlindboxService } from './blindbox.service';

@Module({
  imports: [RiskModule],
  controllers: [BlindboxController],
  providers: [BlindboxService],
  exports: [BlindboxService],
})
export class BlindboxModule {}
