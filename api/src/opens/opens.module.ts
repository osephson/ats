import { Module } from '@nestjs/common';
import { OpensController } from './opens.controller';
import { OpensService } from './opens.service';

@Module({
  controllers: [OpensController],
  providers: [OpensService],
})
export class OpensModule {}
