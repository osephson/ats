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

  // Browse is public; if viewer has token, you can optionally pass it and get lastOpenedAt
  // MVP: keep it public; if you want viewer context, front-end can call with Authorization header,
  // and you add @UseGuards(OptionalAuthGuard) later. For now, keep it simple:
  @Get()
  browse(@Query('tag') tag?: string | string[]) {
    const tagNames = Array.isArray(tag) ? tag : tag ? [tag] : [];
    return this.jobs.browse({ tagNames });
  }
}
