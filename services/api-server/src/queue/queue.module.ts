import { Global, Module } from '@nestjs/common';
import { ReviewQueueService } from './review-queue.service';

@Global()
@Module({
  providers: [ReviewQueueService],
  exports: [ReviewQueueService],
})
export class QueueModule {}
