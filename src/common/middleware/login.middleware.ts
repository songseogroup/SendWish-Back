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
        return;
      }

      // Get the authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        throw new HttpException('Authorization header is required', HttpStatus.UNAUTHORIZED);
      }

      // Check if the token is in the correct format (Bearer <token>)
      if (!authHeader.startsWith('Bearer ')) {
        throw new HttpException('Invalid token format. Use Bearer <token>', HttpStatus.UNAUTHORIZED);
      }

      // Extract the token
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        
        if (!decoded) {
          throw new HttpException('Invalid token', HttpStatus.FORBIDDEN);
        }

        // Attach the decoded user to the request object
        req['user'] = decoded;
        next();
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          throw new HttpException('Token has expired', HttpStatus.UNAUTHORIZED);
        }
        if (jwtError.name === 'JsonWebTokenError') {
          throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
        }
        throw new HttpException('Authentication failed', HttpStatus.UNAUTHORIZED);
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Authentication error:', error);
      throw new HttpException('Authentication failed', HttpStatus.UNAUTHORIZED);
    }
  }
}
