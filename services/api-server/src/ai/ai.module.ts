import { Global, Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiGatewayService } from './ai-gateway.service';

@Global()
@Module({
  controllers: [AiController],
  providers: [AiGatewayService],
  exports: [AiGatewayService],
})
export class AiModule {}
