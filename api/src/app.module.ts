import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JobsModule } from './jobs/jobs.module';
import { TagsModule } from './tags/tags.module';
import { OpensModule } from './opens/opens.module';

@Module({
  imports: [PrismaModule, AuthModule, JobsModule, TagsModule, OpensModule],
})
export class AppModule {}
