// import {
//   Injectable,
//   NestMiddleware,
//   HttpException,
//   HttpStatus,
// } from '@nestjs/common';
// import { Request, Response, NextFunction } from 'express';
// import * as jwt from 'jsonwebtoken';

// @Injectable()
// export class LoggerMiddleware implements NestMiddleware {
//   use(req: Request, res: Response, next: NextFunction) {
//     try {
//       const authToken = req.headers.authorization;
//       console.log(authToken);
//       const verify = jwt.verify(authToken, process.env.SECRET_KEY);
//       if (!verify) {
//         throw new HttpException('Invalid token', HttpStatus.FORBIDDEN);
//       }
//       console.log(verify);
//       req['user'] = verify;
//       next();
//     } catch (e) {
//       console.log('ERROR IN MIDDLEWARE', e);
//       throw new HttpException(e, HttpStatus.FORBIDDEN);
//     }
//   }
// }

import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    try {
      // Exclude Google OAuth routes from JWT verification
      if (req.path === '/auth/google' || req.path === '/auth/google/redirect') {
        next();
      } else {
        // Regular login token verification using HS256
        const authToken = req.headers.authorization // Bearer token
        if (!authToken) {
          throw new HttpException('Token not found', HttpStatus.UNAUTHORIZED);
        }

        // Verify token with HS256 algorithm
        const verify = jwt.verify(authToken, process.env.SECRET_KEY);

        if (!verify) {
          throw new HttpException('Invalid token', HttpStatus.FORBIDDEN);
        }

        // Attach the verified user to the request object
        req['user'] = verify;
        next();
      }
    } catch (e) {
      console.log("ERROR IN MIDDLEWARE", e);
      throw new HttpException('Invalid token', HttpStatus.FORBIDDEN);
    }
  }
}
