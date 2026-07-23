import { Controller, Get } from '@nestjs/common';
import { ok } from '../common/api-response';
import { ActivityService } from './activity.service';

@Controller('api/activity')
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get('home')
  home() {
    return ok(this.activity.homeFeed());
  }

  @Get('banners')
  banners() {
    return ok(this.activity.listBanners(true));
  }

  @Get('announcements')
  announcements() {
    return ok(this.activity.listAnnouncements(true));
  }
}
