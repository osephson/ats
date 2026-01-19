import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { SignInDto, SignUpDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('signup')
  signup(@Body() body: SignUpDto) {
    return this.auth.signup(body.email, body.password);
  }

  @Post('signin')
  signin(@Body() body: SignInDto) {
    return this.auth.signin(body.email, body.password);
  }
}
