import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ok } from '../common/api-response';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CheckinService } from './checkin.service';

@Controller('api/checkin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user')
export class CheckinController {
  constructor(private readonly checkin: CheckinService) {}

  @Get('locations')
  locations() {
    return ok(this.checkin.listLocations());
  }

  @Get('task')
  tasks() {
    return ok(this.checkin.listTasks());
  }

  @Get('history')
  history(
    @CurrentUser() user: { userId: number },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return ok(
      this.checkin.history(
        user.userId,
        Number(page) || 1,
        Number(pageSize) || 20,
      ),
    );
  }

  @Post()
  async create(
    @CurrentUser() user: { userId: number },
    @Body()
    body: {
      longitude: number;
      latitude: number;
      locationId?: number;
      merchantId?: number;
      photoUrl?: string;
    },
  ) {
    return ok(await this.checkin.checkin(user.userId, body));
  }
}
