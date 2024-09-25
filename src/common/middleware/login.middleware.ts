import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    try {
      const authToken = req.headers.authorization.split(' ')[1];
      console.log(authToken);
      const verify = jwt.verify(authToken, process.env.SECRET_KEY);
      if (!verify) {
        throw new HttpException('Invalid token', HttpStatus.FORBIDDEN);
      }
      console.log(verify);
      req['user'] = verify;
      next();
    } catch (e) {
      console.log('ERROR IN MIDDLEWARE', e);
      throw new HttpException(e, HttpStatus.FORBIDDEN);
    }
  }
}
