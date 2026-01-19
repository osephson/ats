import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OpensService } from './opens.service';
import { RecordOpensDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('opens')
export class OpensController {
  constructor(private opens: OpensService) {}

  @Post()
  record(@Req() req: any, @Body() body: RecordOpensDto) {
    return this.opens.record(req.user.userId, body.jobUrlIds);
  }

  @Post('last')
  last(@Req() req: any, @Body() body: RecordOpensDto) {
    return this.opens.lastOpened(req.user.userId, body.jobUrlIds);
  }
}
