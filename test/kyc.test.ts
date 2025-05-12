import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { MailerService } from '@nestjs-modules/mailer';
import Stripe from 'stripe';
import * as fs from 'fs';
import * as path from 'path';

describe('KYC Validation', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let mailerService: MailerService;
  let stripeInstance: Stripe;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findByEmail: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        {
          provide: 'STRIPE_CLIENT',
          useValue: new Stripe(process.env.STRIPE_KEY, {
            apiVersion: '2024-04-10',
          }),
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    mailerService = module.get<MailerService>(MailerService);
    stripeInstance = module.get('STRIPE_CLIENT');
  });

  describe('Document Validation', () => {
    it('should reject signup without required documents', async () => {
      const registerDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        phoneNumber: '+61412345678',
        dateOfBirth: '1990-01-01',
        address: {
          line1: '123 Test St',
          city: 'Sydney',
          state: 'NSW',
          postalCode: '2000',
        },
      };

      await expect(
        authService.customSignUp(registerDto, {})
      ).rejects.toThrow('Document verification failed');
    });

    it('should reject invalid document formats', async () => {
      const invalidFile = {
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 1024,
        path: 'test.txt',
      } as Express.Multer.File;

      await expect(
        authService.customSignUp({} as any, {
          front: [invalidFile],
          back: [invalidFile],
        })
      ).rejects.toThrow('Invalid document format');
    });

    it('should reject oversized documents', async () => {
      const largeFile = {
        originalname: 'large.jpg',
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024, // 6MB
        path: 'large.jpg',
      } as Express.Multer.File;

      await expect(
        authService.customSignUp({} as any, {
          front: [largeFile],
          back: [largeFile],
        })
      ).rejects.toThrow('Document too large');
    });
  });

  describe('Address Validation', () => {
    it('should reject invalid Australian postal code', async () => {
      const registerDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        phoneNumber: '+61412345678',
        dateOfBirth: '1990-01-01',
        address: {
          line1: '123 Test St',
          city: 'Sydney',
          state: 'NSW',
          postalCode: '200', // Invalid (should be 4 digits)
        },
      };

      await expect(
        authService.customSignUp(registerDto, {
          front: [{} as Express.Multer.File],
          back: [{} as Express.Multer.File],
        })
      ).rejects.toThrow('Invalid Australian postal code');
    });

    it('should reject invalid Australian state', async () => {
      const registerDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        phoneNumber: '+61412345678',
        dateOfBirth: '1990-01-01',
        address: {
          line1: '123 Test St',
          city: 'Sydney',
          state: 'XYZ', // Invalid state
          postalCode: '2000',
        },
      };

      await expect(
        authService.customSignUp(registerDto, {
          front: [{} as Express.Multer.File],
          back: [{} as Express.Multer.File],
        })
      ).rejects.toThrow('Invalid Australian state');
    });
  });

  describe('Phone Number Validation', () => {
    it('should reject invalid Australian phone number', async () => {
      const registerDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        phoneNumber: '1234567890', // Invalid format
        dateOfBirth: '1990-01-01',
        address: {
          line1: '123 Test St',
          city: 'Sydney',
          state: 'NSW',
          postalCode: '2000',
        },
      };

      await expect(
        authService.customSignUp(registerDto, {
          front: [{} as Express.Multer.File],
          back: [{} as Express.Multer.File],
        })
      ).rejects.toThrow('Invalid Australian phone number');
    });
  });

  describe('Age Validation', () => {
    it('should reject underage users', async () => {
      const registerDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        phoneNumber: '+61412345678',
        dateOfBirth: '2010-01-01', // Under 18
        address: {
          line1: '123 Test St',
          city: 'Sydney',
          state: 'NSW',
          postalCode: '2000',
        },
      };

      await expect(
        authService.customSignUp(registerDto, {
          front: [{} as Express.Multer.File],
          back: [{} as Express.Multer.File],
        })
      ).rejects.toThrow('Age verification failed');
    });
  });

  describe('Stripe Integration', () => {
    it('should create Stripe account with correct parameters', async () => {
      const registerDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        phoneNumber: '+61412345678',
        dateOfBirth: '1990-01-01',
        address: {
          line1: '123 Test St',
          city: 'Sydney',
          state: 'NSW',
          postalCode: '2000',
        },
      };

      const mockFiles = {
        front: [{
          originalname: 'front.jpg',
          mimetype: 'image/jpeg',
          size: 1024,
          path: 'front.jpg',
        } as Express.Multer.File],
        back: [{
          originalname: 'back.jpg',
          mimetype: 'image/jpeg',
          size: 1024,
          path: 'back.jpg',
        } as Express.Multer.File],
      };

      const mockStripeAccount = {
        id: 'acct_test123',
        object: 'account',
      };

      jest.spyOn(stripeInstance.accounts, 'create').mockResolvedValue(mockStripeAccount);
      jest.spyOn(stripeInstance.files, 'create').mockResolvedValue({ id: 'file_test123' } as any);
      jest.spyOn(stripeInstance.accounts, 'update').mockResolvedValue(mockStripeAccount);

      await authService.customSignUp(registerDto, mockFiles);

      expect(stripeInstance.accounts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'custom',
          country: 'AU',
          email: registerDto.email,
          business_type: 'individual',
        })
      );
    });
  });
}); 