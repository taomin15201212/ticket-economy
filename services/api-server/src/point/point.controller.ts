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
import { PointService } from './point.service';

@Controller('api/point')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user')
export class PointController {
  constructor(private readonly points: PointService) {}

  @Get('list')
  list(
    @CurrentUser() user: { userId: number },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return ok(
      this.points.list(user.userId, Number(page) || 1, Number(pageSize) || 20),
    );
  }

  @Get('goods')
  goods() {
    return ok({ list: this.points.listGoods() });
  }

  @Post('exchange')
  exchange(
    @CurrentUser() user: { userId: number },
    @Body() body: { goodsId: number },
  ) {
    return ok(this.points.exchange(user.userId, Number(body.goodsId)));
  }

  @Get('exchanges')
  exchanges(
    @CurrentUser() user: { userId: number },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return ok(
      this.points.listExchanges(
        user.userId,
        Number(page) || 1,
        Number(pageSize) || 20,
      ),
    );
  }

  @Get('rank')
  rank(@Query('limit') limit = '50') {
    return ok(this.points.rank(Number(limit) || 50));
  }
}
