import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OpensService {
  constructor(private prisma: PrismaService) {}

  async record(userId: string, jobUrlIds: string[]) {
    const ids = (jobUrlIds || []).filter(Boolean);
    if (ids.length === 0) return { inserted: 0 };

    // Create multiple open events
    const created = await this.prisma.open.createMany({
      data: ids.map((jobUrlId) => ({ userId, jobUrlId })),
    });

    return { inserted: created.count };
  }

  async lastOpened(userId: string, jobUrlIds: string[]) {
    const ids = (jobUrlIds || []).filter(Boolean);
    if (ids.length === 0) return [];

    const grouped = await this.prisma.open.groupBy({
      by: ['jobUrlId'],
      where: { userId, jobUrlId: { in: ids } },
      _max: { openedAt: true },
    });

    return grouped.map((g) => ({
      jobUrlId: g.jobUrlId,
      lastOpenedAt: g._max.openedAt?.toISOString() ?? null,
    }));
  }
}
