import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private jwt: JwtService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    if (request.url.includes('/jobs/bulk')) {
      const token = request.headers.authorization?.split(' ')[1];
      if (token) {
        try {
          const decoded = this.jwt.verify(token);
          request.user = { userId: decoded.sub, email: decoded.email };
          return true;
        } catch (error) {
          console.log('Error decoding token:', error);
          return false;
        }
      }
      return false;
    }
    return super.canActivate(context);
  }
}