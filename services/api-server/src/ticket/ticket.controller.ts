import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ok } from '../common/api-response';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TicketService } from './ticket.service';
import { StorageService } from '../storage/storage.service';

@Controller('api/ticket')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user')
export class TicketController {
  constructor(
    private readonly tickets: TicketService,
    private readonly storage: StorageService,
  ) {}

  /** Presigned upload for mini-program / direct PUT to MinIO */
  @Post('presign')
  async presign(
    @CurrentUser() user: { userId: number },
    @Body() body: { filename?: string; contentType?: string },
  ) {
    const key = this.storage.ticketKey(
      user.userId,
      body.filename || 'ticket.jpg',
    );
    const signed = await this.storage.presignPut(
      key,
      600,
      body.contentType || 'image/jpeg',
    );
    return ok(signed);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async upload(
    @CurrentUser() user: { userId: number },
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { ticketType?: string; imageUrl?: string },
  ) {
    const imageUrl =
      body.imageUrl || `https://placehold.co/400x600?text=ticket`;
    const ticket = await this.tickets.upload(
      user.userId,
      imageUrl,
      body.ticketType || 'dining',
      file?.buffer,
      file?.originalname || 'ticket.jpg',
    );
    return ok({
      ticketId: ticket.id,
      status: ticket.status,
      imageUrl: ticket.imageUrl,
      storageBackend: ticket.storageBackend,
    });
  }

  @Post('submit')
  async submit(
    @CurrentUser() user: { userId: number },
    @Body() body: { ticketId: number },
  ) {
    const ticket = await this.tickets.submit(
      user.userId,
      Number(body.ticketId),
    );
    return ok(ticket);
  }

  @Get('list')
  list(
    @CurrentUser() user: { userId: number },
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return ok(
      this.tickets.list(
        user.userId,
        status === undefined ? undefined : Number(status),
        Number(page) || 1,
        Number(pageSize) || 20,
      ),
    );
  }

  @Get('detail/:id')
  detail(
    @CurrentUser() user: { userId: number },
    @Param('id') id: string,
  ) {
    return ok(this.tickets.detail(user.userId, Number(id)));
  }

  @Post('cancel')
  cancel(
    @CurrentUser() user: { userId: number },
    @Body() body: { ticketId: number },
  ) {
    return ok(this.tickets.cancel(user.userId, Number(body.ticketId)));
  }
}
