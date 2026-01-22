import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OpensController } from './opens.controller';
import { OpensService } from './opens.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [OpensController],
  providers: [OpensService, JwtAuthGuard],
})
export class OpensModule {}
