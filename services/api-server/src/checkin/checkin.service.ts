import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { APP_REPOSITORY } from '../store/app.repository';
import type { AppRepository } from '../store/app.repository';
import { PointService } from '../point/point.service';
import { distanceMeters } from '../common/geo';
import { RedisService } from '../redis/redis.service';
import { MysqlService } from '../mysql/mysql.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class CheckinService {
  constructor(
    @Inject(APP_REPOSITORY) private readonly repo: AppRepository,
    private readonly points: PointService,
    private readonly redis: RedisService,
    private readonly mysql: MysqlService,
    private readonly metrics: MetricsService,
  ) {}

  listLocations() {
    return this.repo.listCheckinLocations().filter((l) => l.status === 1);
  }

  listTasks() {
    return this.repo.listCheckinTasks().filter((t) => t.status === 1);
  }

  history(userId: number, page = 1, pageSize = 20) {
    const all = this.repo
      .listCheckinRecords(userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const start = (page - 1) * pageSize;
    return {
      list: all.slice(start, start + pageSize),
      total: all.length,
      page,
      pageSize,
    };
  }

  async checkin(
    userId: number,
    body: {
      longitude: number;
      latitude: number;
      locationId?: number;
      merchantId?: number;
      photoUrl?: string;
    },
  ) {
    const lng = Number(body.longitude);
    const lat = Number(body.latitude);
    if (Number.isNaN(lng) || Number.isNaN(lat)) {
      throw new BadRequestException('经纬度无效');
    }

    const dayKey = this.redis.todayKey('checkin', userId);
    const count = await this.redis.incrDaily(
      dayKey,
      this.redis.secondsUntilMidnight(),
    );
    if (count > 10) {
      throw new BadRequestException('今日打卡次数过多');
    }

    type Loc = ReturnType<CheckinService['listLocations']>[number];
    let location: Loc | null =
      body.locationId != null
        ? this.listLocations().find((l) => l.id === Number(body.locationId)) ||
          null
        : null;

    let distance: number | null = null;
    let verifyStatus = 1;

    if (location) {
      distance = Math.round(
        distanceMeters(lng, lat, location.longitude, location.latitude),
      );
      if (distance > location.radiusMeter) {
        throw new BadRequestException(
          `不在打卡范围内（距离 ${distance}m，允许 ${location.radiusMeter}m）`,
        );
      }
    } else {
      let bestLoc: Loc | null = null;
      let bestD = Number.POSITIVE_INFINITY;
      for (const loc of this.listLocations()) {
        const d = distanceMeters(lng, lat, loc.longitude, loc.latitude);
        if (d <= loc.radiusMeter && d < bestD) {
          bestLoc = loc;
          bestD = d;
        }
      }
      if (bestLoc) {
        location = bestLoc;
        distance = Math.round(bestD);
      } else {
        verifyStatus = 2;
      }
    }

    const record = {
      id: this.repo.nextCheckinRecordId(),
      userId,
      locationId: location?.id ?? null,
      merchantId: body.merchantId ?? location?.merchantId ?? null,
      longitude: lng,
      latitude: lat,
      distance,
      photoUrl: body.photoUrl ?? null,
      verifyType: 'GPS',
      verifyStatus,
      createdAt: new Date().toISOString(),
    };
    this.repo.saveCheckinRecord(record);
    void this.mysql.saveCheckin(record);

    let pointLog = null;
    if (verifyStatus === 1) {
      pointLog = this.points.addPoints(
        userId,
        'checkin',
        record.id,
        location ? `打卡：${location.name}` : 'GPS 打卡',
      );
    }

    this.metrics.checkins.inc({
      status: verifyStatus === 1 ? 'pass' : 'pending',
    });

    return {
      record,
      location: location
        ? {
            id: location.id,
            name: location.name,
            radiusMeter: location.radiusMeter,
          }
        : null,
      points: pointLog,
      message:
        verifyStatus === 1
          ? '打卡成功'
          : '已记录，待人工抽检（未匹配已知点位）',
    };
  }

  getLocation(id: number) {
    const loc = this.repo.findCheckinLocation(id);
    if (!loc) throw new NotFoundException('打卡点不存在');
    return loc;
  }
}
