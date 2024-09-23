import { Reflector } from '@nestjs/core';
import { Role } from './role.enum';
import { SetMetadata } from '@nestjs/common';
// export const Roles = Reflector.createDecorator<string[]>();
export const ROLES_KEY = 'role';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);