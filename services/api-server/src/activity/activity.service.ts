import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemoryStore } from '../store/memory.store';
import {
  AnnouncementRow,
  BannerRow,
  SystemConfigRow,
} from '../store/types';

@Injectable()
export class ActivityService {
  constructor(private readonly store: MemoryStore) {}

  listBanners(activeOnly = false) {
    let list = [...this.store.banners];
    if (activeOnly) list = list.filter((b) => b.status === 1);
    return list.sort((a, b) => a.sortNo - b.sortNo || b.id - a.id);
  }

  createBanner(body: {
    title: string;
    subtitle?: string | null;
    imageUrl?: string;
    linkUrl?: string | null;
    sortNo?: number;
    status?: number;
  }) {
    if (!body.title?.trim()) throw new BadRequestException('title 必填');
    const row: BannerRow = {
      id: this.store.nextId('banner'),
      title: body.title.trim(),
      subtitle: body.subtitle ?? null,
      imageUrl: body.imageUrl || '',
      linkUrl: body.linkUrl ?? null,
      sortNo: body.sortNo ?? this.store.banners.length + 1,
      status: body.status ?? 1,
      startTime: null,
      endTime: null,
      createdAt: new Date().toISOString(),
    };
    this.store.banners.push(row);
    return row;
  }

  updateBanner(
    id: number,
    body: Partial<{
      title: string;
      subtitle: string | null;
      imageUrl: string;
      linkUrl: string | null;
      sortNo: number;
      status: number;
    }>,
  ) {
    const row = this.store.banners.find((b) => b.id === id);
    if (!row) throw new NotFoundException('Banner 不存在');
    if (body.title !== undefined) row.title = body.title;
    if (body.subtitle !== undefined) row.subtitle = body.subtitle;
    if (body.imageUrl !== undefined) row.imageUrl = body.imageUrl;
    if (body.linkUrl !== undefined) row.linkUrl = body.linkUrl;
    if (body.sortNo !== undefined) row.sortNo = body.sortNo;
    if (body.status !== undefined) row.status = body.status;
    return row;
  }

  listAnnouncements(activeOnly = false) {
    let list = [...this.store.announcements];
    if (activeOnly) list = list.filter((a) => a.status === 1);
    return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  createAnnouncement(body: { title: string; content: string; status?: number }) {
    if (!body.title?.trim() || !body.content?.trim()) {
      throw new BadRequestException('title/content 必填');
    }
    const row: AnnouncementRow = {
      id: this.store.nextId('announcement'),
      title: body.title.trim(),
      content: body.content.trim(),
      status: body.status ?? 1,
      createdAt: new Date().toISOString(),
    };
    this.store.announcements.unshift(row);
    return row;
  }

  updateAnnouncement(
    id: number,
    body: Partial<{ title: string; content: string; status: number }>,
  ) {
    const row = this.store.announcements.find((a) => a.id === id);
    if (!row) throw new NotFoundException('公告不存在');
    if (body.title !== undefined) row.title = body.title;
    if (body.content !== undefined) row.content = body.content;
    if (body.status !== undefined) row.status = body.status;
    return row;
  }

  listConfigs() {
    return [...this.store.systemConfigs];
  }

  getConfigMap() {
    const map: Record<string, string> = {};
    for (const c of this.store.systemConfigs) map[c.configKey] = c.configValue;
    return map;
  }

  upsertConfig(configKey: string, configValue: string, remark?: string | null) {
    if (!configKey?.trim()) throw new BadRequestException('configKey 必填');
    let row = this.store.systemConfigs.find((c) => c.configKey === configKey);
    if (!row) {
      row = {
        configKey,
        configValue: String(configValue ?? ''),
        remark: remark ?? null,
        updatedAt: new Date().toISOString(),
      };
      this.store.systemConfigs.push(row);
    } else {
      row.configValue = String(configValue ?? '');
      if (remark !== undefined) row.remark = remark;
      row.updatedAt = new Date().toISOString();
    }
    return row;
  }

  homeFeed() {
    return {
      banners: this.listBanners(true),
      announcements: this.listAnnouncements(true).slice(0, 5),
      config: this.getConfigMap(),
    };
  }
}
