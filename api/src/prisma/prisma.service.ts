import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is missing');

    const adapter = new PrismaPg({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
    });

    super({ adapter });
  }
}
