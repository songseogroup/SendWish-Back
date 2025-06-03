import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';

interface JwtPayload {
  id: number;
  email: string;
  role?: string;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const requiredRole = this.reflector.get<string>(
        'roles',
        context.getHandler(),
      );
      
      if (!requiredRole) {
        // No role required, access is granted
        return true;
      }

      const request = context.switchToHttp().getRequest();
      const token = request.headers['authorization'];
     
      if (!token) {
        throw new UnauthorizedException('No authorization token provided');
      }

      try {
        // Remove 'Bearer ' prefix if present
        const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
        const decodedToken = jwt.verify(cleanToken, process.env.SECRET_KEY) as JwtPayload;
  
        // Check if the user has the required role
        const hasRole = decodedToken.role === requiredRole;
  
        if (!hasRole) {
          console.log(`Access denied. User does not have the required role: ${requiredRole}`);
          return false;
        }
  
        // Attach the decoded user to the request for use in controllers
        request['user'] = {
          id: decodedToken.id,
          email: decodedToken.email
        };
  
        return true;
      } catch (error) {
        console.log('Access denied. Invalid token.');
        return false;
      }
    } catch (e) {
      return false;
    }
  }
}