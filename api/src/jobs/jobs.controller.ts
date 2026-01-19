import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import type { BulkUploadDto } from './dto';

@Controller('jobs')
export class JobsController {
  constructor(private jobs: JobsService) {}

  // Upload requires login
  @UseGuards(JwtAuthGuard)
  @Post('bulk')
  bulk(@Req() req: any, @Body() body: BulkUploadDto) {
    return this.jobs.bulkUpload(req.user.userId, body);
  }

  // Public browse with pagination + tag filtering
  @Get()
  browse(
    @Query('tag') tag?: string | string[],
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const tagNames = Array.isArray(tag) ? tag : tag ? [tag] : [];

    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize || '25', 10) || 25));

    return this.jobs.browse({
      tagNames,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  }
}
