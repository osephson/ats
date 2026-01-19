import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JobsModule } from './jobs/jobs.module';
import { TagsModule } from './tags/tags.module';
import { OpensModule } from './opens/opens.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // explicit, avoids surprises
    }),
    PrismaModule,
    AuthModule,
    JobsModule,
    TagsModule,
    OpensModule
  ],
})
export class AppModule {}
