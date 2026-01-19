import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BulkUploadDto, BulkUploadResponseDto } from './dto';

function parseLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async bulkUpload(userId: string, dto: BulkUploadDto): Promise<BulkUploadResponseDto> {
    const rawLines = dto.urlsText ? dto.urlsText.split(/\r?\n/) : [];
    const cleaned = rawLines.map((s) => s.trim());
    const invalidOrEmpty = cleaned.filter((s) => s.length === 0);

    const urls = cleaned.filter((s) => s.length > 0);

    if (urls.length > 100) {
      // MVP: reject hard
      return {
        created: [],
        duplicatesInPaste: [],
        duplicatesExisting: [],
        invalidOrEmpty: [`Too many URLs: ${urls.length} (max 100)`],
      };
    }

    // duplicates within paste (exact match)
    const seen = new Set<string>();
    const duplicatesInPasteSet = new Set<string>();
    const uniqueInPaste: string[] = [];
    for (const u of urls) {
      if (seen.has(u)) duplicatesInPasteSet.add(u);
      else {
        seen.add(u);
        uniqueInPaste.push(u);
      }
    }
    const duplicatesInPaste = Array.from(duplicatesInPasteSet);

    // duplicates existing in DB (exact match)
    const existing = await this.prisma.jobUrl.findMany({
      where: { url: { in: uniqueInPaste } },
      select: { url: true },
    });
    const existingSet = new Set(existing.map((e) => e.url));
    const duplicatesExisting = uniqueInPaste.filter((u) => existingSet.has(u));

    const toCreate = uniqueInPaste.filter((u) => !existingSet.has(u));

    // Upsert tags (exact strings; no normalization required, but we’ll trim)
    const tagNames = (dto.tags || []).map((t) => t.trim()).filter((t) => t.length > 0);

    // Ensure tags exist
    const tags = await Promise.all(
      tagNames.map((name) =>
        this.prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
          select: { id: true, name: true },
        }),
      ),
    );

    const created: { id: string; url: string; tags: string[] }[] = [];

    // Create jobs one by one (fine for <100)
    for (const url of toCreate) {
      const job = await this.prisma.jobUrl.create({
        data: {
          url,
          createdByUserId: userId,
          tags: {
            create: tags.map((t) => ({
              tagId: t.id,
            })),
          },
        },
        select: { id: true, url: true },
      });

      created.push({ id: job.id, url: job.url, tags: tags.map((t) => t.name) });
    }

    return {
      created,
      duplicatesInPaste,
      duplicatesExisting,
      invalidOrEmpty,
    };
  }

  async browse(params: { tagNames?: string[]; page: number; pageSize: number }) {
    const tagNames = (params.tagNames || []).filter(Boolean);
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // AND semantics: job must have ALL tags
    const where =
      tagNames.length === 0
        ? {}
        : {
            AND: tagNames.map((name) => ({
              tags: { some: { tag: { name } } },
            })),
          };

    const [totalCount, jobs] = await this.prisma.$transaction([
      this.prisma.jobUrl.count({ where }),
      this.prisma.jobUrl.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          url: true,
          createdAt: true,
          createdByUserId: true,
          createdByUser: {
            select: { email: true },
          },
          tags: { select: { tag: { select: { name: true } } } },
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      items: jobs.map((j) => ({
        id: j.id,
        url: j.url,
        createdAt: j.createdAt,
        createdByUserId: j.createdByUserId,
        createdByUserEmail: j.createdByUser?.email ?? null,
        tags: j.tags.map((x) => x.tag.name),
        lastOpenedAt: null, // still fetched via /opens/last in web
      })),
      meta: {
        page,
        pageSize,
        totalCount,
        totalPages,
        tags: tagNames,
      },
    };
  }

}
