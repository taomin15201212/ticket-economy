import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ok } from '../common/api-response';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BlindboxService } from './blindbox.service';

@Controller('api/blindbox')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user')
export class BlindboxController {
  constructor(private readonly blindbox: BlindboxService) {}

  @Get('config')
  config() {
    return ok(this.blindbox.config());
  }

  @Post('open')
  async open(
    @CurrentUser() user: { userId: number },
    @Body() body: { ticketId: number; blindBoxId?: number },
  ) {
    return ok(
      await this.blindbox.open(
        user.userId,
        Number(body.ticketId),
        body.blindBoxId ? Number(body.blindBoxId) : undefined,
      ),
    );
  }

  @Get('history')
  history(
    @CurrentUser() user: { userId: number },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return ok(
      this.blindbox.history(
        user.userId,
        Number(page) || 1,
        Number(pageSize) || 20,
      ),
    );
  }
}
