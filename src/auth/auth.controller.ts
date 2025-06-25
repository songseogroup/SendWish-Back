import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
  HttpException,
  HttpCode,
  UseGuards,
  UploadedFiles,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { userDto } from './dto/user-login.dto';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { Request, Response } from 'express';
import { ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor, FilesInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Express } from 'express';
import Stripe from 'stripe';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';

// Configure Stripe with better timeout settings
const stripeOptions = {
  apiVersion: '2023-10-16' as const,
  timeout: 60000,
  maxNetworkRetries: 3,
};
const stripeInstance = new Stripe(process.env.STRIPE_KEY, stripeOptions);

// Add interface for our custom JWT payload
interface CustomJwtPayload extends JwtPayload {
  email?: string;
  user_email?: string;
  userId?: number;
}

// Define allowed extensions and max file size as constants
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  // Valid Australian states list
  private readonly validAustralianStates = [
    'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT',
    'New South Wales', 'Victoria', 'Queensland', 'Western Australia', 
    'South Australia', 'Tasmania', 'Australian Capital Territory', 'Northern Territory'
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async handleStripeWebhook(@Req() request: Request, @Res() response: Response) {
    const sig = request.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
      const event = stripeInstance.webhooks.constructEvent(
        request.body,
        sig,
        endpointSecret
      );

      await this.authService.handleStripeWebhook(event);
      response.json({ received: true });
    } catch (err) {
      console.error('Webhook Error:', err.message);
      response.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  /**
   * Handles user sign up with document uploads for KYC verification.
   *
   * @param {CreateUserDto} registerUserDto - The user data to be used for sign up.
   * @param {Express.Multer.File[]} documents - The uploaded verification documents (front, back, and additional).
   * @return {*} The result of the sign up operation.
   */
  @Post('sign-up')
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        front: {
          type: 'string',
          format: 'binary',
          description: 'Front side of ID document (max 5MB)',
        },
        back: {
          type: 'string',
          format: 'binary',
          description: 'Back side of ID document (max 5MB)',
        },
        additional: {
          type: 'string',
          format: 'binary',
          description: 'Additional verification document (optional, max 5MB)',
        },
        firstName: {
          type: 'string',
          description: 'First Name of the user',
        },
        lastName: {
          type: 'string',
          description: 'Last Name of the user',
        },
        email: {
          type: 'string',
          format: 'email',
          description: 'Email address of the user',
        },
        password: {
          type: 'string',
          description: 'Password for the user account',
        },
        phoneNumber: {
          type: 'string',
          description: 'Phone Number of the user',
        },
        dateOfBirth: {
          type: 'string',
          format: 'date',
          description: 'Date of birth of the user',
        },
        address: {
          type: 'object',
          properties: {
            line1: {
              type: 'string',
              description: 'Street address line 1',
            },
            line2: {
              type: 'string',
              description: 'Street address line 2',
            },
            city: {
              type: 'string',
              description: 'City',
            },
            state: {
              type: 'string',
              description: 'State (must be a valid Australian state: NSW, VIC, QLD, WA, SA, TAS, ACT, NT)',
              enum: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT', 
                    'New South Wales', 'Victoria', 'Queensland', 'Western Australia', 
                    'South Australia', 'Tasmania', 'Australian Capital Territory', 'Northern Territory']
            },
            postalCode: {
              type: 'string',
              description: 'Postal code (4 digits for Australia, e.g., 2000)',
              pattern: '^\\d{4}$'
            },
          },
          required: ['line1', 'city', 'state', 'postalCode'],
        },
        iban: {
          type: 'string',
          description: 'IBAN for the user\'s bank account',
        },
        routingNumber: {
          type: 'string',
          description: 'Routing Number of users bank account',
        },
      },
      required: ['front', 'back', 'firstName', 'lastName', 'email', 'password', 'phoneNumber', 'dateOfBirth', 'address', 'iban', 'routingNumber'],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'front', maxCount: 1 },
      { name: 'back', maxCount: 1 },
      { name: 'additional', maxCount: 1 }
    ], {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const timestamp = Date.now();
          cb(null, `${file.fieldname}-${timestamp}-${file.originalname}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const ext = (file.originalname.match(/\.[^.]+$/) || [''])[0].toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          return cb(
            new BadRequestException({
              statusCode: 400,
              message: `Invalid file extension "${ext}" in file "${file.originalname}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
              error: 'Bad Request',
              fileName: file.originalname,
              invalidExtension: ext,
              allowedExtensions: ALLOWED_EXTENSIONS,
            }),
            false
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: MAX_FILE_SIZE // 5MB max file size
      }
    })
  )
  async customSignUp(
    @Body() registerUserDto: any,
    @UploadedFiles() files: { 
      front?: Express.Multer.File[],
      back?: Express.Multer.File[],
      additional?: Express.Multer.File[]
    },
  ) {
    try {
      // Check if user already exists
      const existingUser = await this.userService.findByEmail(registerUserDto.email);
      if (existingUser) {
        throw new BadRequestException('User with this email already exists');
      }

      console.log('Files received:', JSON.stringify(files));
      console.log('Request body:', JSON.stringify(registerUserDto));
      
      // Validate that front and back documents are provided
      if (!files?.front?.[0] || !files?.back?.[0]) {
        throw new BadRequestException('Front and back documents are required for KYC verification');
      }

      // Validate file sizes
      const maxSize = 50 * 1024 * 1024; // 5MB in bytes
      const validateFileSize = (file: Express.Multer.File) => {
        if (file.size > maxSize) {
          throw new BadRequestException(`File ${file.originalname} exceeds the maximum size limit of 5MB`);
        }
      };

      if (files.front?.[0]) validateFileSize(files.front[0]);
      if (files.back?.[0]) validateFileSize(files.back[0]);
      if (files.additional?.[0]) validateFileSize(files.additional[0]);

      // Create a plain object with the proper shape of CreateUserDto
      const userData: Partial<CreateUserDto> = {
        firstName: registerUserDto.firstName,
        lastName: registerUserDto.lastName,
        email: registerUserDto.email,
        password: registerUserDto.password,
        phoneNumber: registerUserDto.phoneNumber,
        iban: registerUserDto.iban,
        routingNumber: registerUserDto.routingNumber,
        // Set the verification document manually
        verificationDocument: {
          front: files.front[0].path,
          back: files.back[0].path,
          additional: files.additional?.[0]?.path
        }
      };
      
      console.log('Verification document set to:', JSON.stringify(userData.verificationDocument));
      
      // Parse the date string to a Date object
      if (registerUserDto.dateOfBirth) {
        userData.dateOfBirth = new Date(registerUserDto.dateOfBirth);
        console.log('Date of birth parsed:', userData.dateOfBirth);
      } else {
        throw new BadRequestException('Date of birth is required');
      }

      // Parse the address fields if they're coming as separate fields
      if (registerUserDto['address[line1]']) {
        // Validate Australian postal code
        const postalCode = registerUserDto['address[postalCode]'];
        const auPostalCodeRegex = /^\d{4}$/;
        if (!auPostalCodeRegex.test(postalCode)) {
          throw new BadRequestException('Australian postal code must be exactly 4 digits (e.g., 2000)');
        }
        
        // Validate Australian state
        const state = registerUserDto['address[state]'];
        if (!this.validAustralianStates.includes(state)) {
          throw new BadRequestException(`Invalid Australian state. Must be one of: ${this.validAustralianStates.join(', ')}`);
        }
        
        userData.address = {
          line1: registerUserDto['address[line1]'],
          line2: registerUserDto['address[line2]'] || null,
          city: registerUserDto['address[city]'],
          state: state,
          postalCode: postalCode
        };
        console.log('Address parsed from form fields:', JSON.stringify(userData.address));
      } else if (registerUserDto.address) {
        // Check if address is a string (JSON format)
        if (typeof registerUserDto.address === 'string') {
          try {
            userData.address = JSON.parse(registerUserDto.address);
            console.log('Address parsed from JSON string:', JSON.stringify(userData.address));
          } catch (err) {
            console.error('Error parsing address as JSON:', err);
            throw new BadRequestException('Address must be a valid JSON object');
          }
        } else {
          userData.address = registerUserDto.address;
          console.log('Address from request object:', JSON.stringify(userData.address));
        }
        
        // Validate Australian postal code
        const auPostalCodeRegex = /^\d{4}$/;
        if (!userData.address || !userData.address.postalCode) {
          throw new BadRequestException('Postal code is required');
        }
        if (!auPostalCodeRegex.test(userData.address.postalCode)) {
          throw new BadRequestException('Australian postal code must be exactly 4 digits (e.g., 2000)');
        }
        
        // Validate Australian state
        if (!userData.address || !userData.address.state) {
          throw new BadRequestException('State is required');
        }
        if (!this.validAustralianStates.includes(userData.address.state)) {
          throw new BadRequestException(`Invalid Australian state '${userData.address.state}'. Must be one of: ${this.validAustralianStates.join(', ')}`);
        }
      } else {
        throw new BadRequestException('Address is required');
      }

      // Check if required fields are present
      const requiredFields = ['firstName', 'lastName', 'email', 'password', 'phoneNumber', 'iban', 'routingNumber'];
      const missingFields = requiredFields.filter(field => !userData[field]);
      
      if (missingFields.length > 0) {
        throw new BadRequestException(`Missing required fields: ${missingFields.join(', ')}`);
      }

      console.log('Final userData before service call:', JSON.stringify(userData));
      return this.authService.customSignUp(userData as CreateUserDto, files);
    } catch (error) {
      console.error('Error in customSignUp controller:', error);
      
      // Extract Stripe errors
      if (error.raw) {
        throw new BadRequestException({
          message: error.message,
          type: error.type,
          code: error.code,
          param: error.param,
          detail: error.raw.message,
          doc_url: error.doc_url
        });
      }
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(error.message || 'Unknown error during signup');
    }
  }

    /**
   * Handles user sign up confirmation by delegating to the AuthService.
   *
   * @param {Request} request - The HTTP request object containing the authorization token.
   * @return {*} The result of the sign up confirmation operation.
   */
  @Get('sign-up/confirm')
  @HttpCode(200)
  async signUpConfirm(@Req() request: Request) {
    try {
      const token = request.headers.authorization;
      if (!token) {
        throw new BadRequestException('Authorization token is required');
      }
      
      // Remove 'Bearer ' prefix if present
      const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
      
      const result = await this.authService.verify(cleanToken);
      return result;
    } catch (error) {
      console.error('Error in signUpConfirm:', error);
      throw new BadRequestException(error.message || 'Verification failed');
    }
  }

    /**
   * Handles user login by delegating to the AuthService.
   *
   * @param {userDto} userData - The user data to be used for login.
   * @return {*} The result of the login operation.
   */
  @Post('login')
  @HttpCode(200)
  @ApiResponse({ status: HttpStatus.OK, description: 'Login successful' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid credentials or missing required fields' })
  // @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication failed' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Internal server error' })
  async create(@Body() userData: userDto) {
    try {
      // Validate required fields
      if (!userData.email || !userData.password) {
        throw new BadRequestException('Email and password are required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        throw new BadRequestException('Invalid email format');
      }

      // Validate password length
      if (userData.password.length < 6) {
        throw new BadRequestException('Password must be at least 6 characters long');
      }

      const userLogin = await this.authService.login(userData);
      return userLogin;

    } catch (error) {
      // Handle different types of errors
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.log("error",error);
      // Check if it's an authentication error
      if (error.message === 'Invalid credentials' || error.message === 'Unauthorized') {
        throw new HttpException(
          {
            statusCode: HttpStatus.UNAUTHORIZED,
            message: 'Incorrect password',
            error: 'Unauthorized'
          },
          HttpStatus.UNAUTHORIZED
        );
      }

      if (error.response) {
        // Handle service layer errors
        throw new HttpException(
          {
            statusCode: error.response.status || HttpStatus.UNAUTHORIZED,
            message: error.response.error || 'Authentication failed',
            error: 'Unauthorized'
          },
          error.response.status || HttpStatus.UNAUTHORIZED
        );
      }

      // Handle unexpected errors
      console.error('Login error:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'An unexpected error occurred during login',
          error: 'Internal Server Error'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('/refresh')
  generateToken(@Req() request: Request) {
    const token = Array.isArray(request.headers['refresh']) 
      ? request.headers['refresh'][0] 
      : request.headers['refresh'];
    return this.authService.generateRefresh(token);
  }

  @Post("update-password")
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'))
  @ApiResponse({ status: HttpStatus.OK, description: 'Password updated'})
  async updatePassword(@Req() request: Request, @Body() updateAuthDto: UpdateAuthDto) {
    try {
      const user = request['user'] as { id: number };
      console.log("user reset password",user);
      if (!user || !user.id) {
        throw new BadRequestException('User not found in request');
      }
      return await this.authService.updatePassword(user.id, updateAuthDto);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to update password');
    }
  }


 /**
   * Handles forgot password by sending a reset password link to the user
   *
   * @param {Request} request - The request object
   * @param {object} updateAuthDto - The update auth dto
   * @return {*} The result of the forgot password operation
   */
  @Post("forgot-password")
  @HttpCode(200)
  @ApiResponse({ status: HttpStatus.OK, description: 'Password reset email sent'})
 
  forgotPassword(@Body() updateAuthDto:{email:string}) {

    return this.authService.resetPassword(updateAuthDto.email);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // This route will be redirected to Google's OAuth page
  }

  // @Get('google/redirect')
  // @UseGuards(AuthGuard('google'))
  // async googleAuthRedirect(@Req() req) {
  //   return this.authService.googleLogin(req);
  // }
  @Get()
  findAll() {
    return this.authService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.authService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
    return this.authService.update(+id, updateAuthDto);
  }

  @Delete('delete-account')
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'))
  async deleteAccount(@Req() request: Request) {
    try {
      const token = request.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new BadRequestException('Authorization token is required');
      }

      const decoded = jwt.verify(token, process.env.SECRET_KEY) as CustomJwtPayload;
      console.log('Decoded JWT:', decoded);
      
      if (!decoded.email) {
        throw new BadRequestException('User email not found in token');
      }
      
      console.log('Deleting account for email:', decoded.email);
      return this.authService.deleteAccountByEmail(decoded.email);
    } catch (error) {
      console.error('Error in deleteAccount:', error);
      throw new BadRequestException(error.message || 'Failed to delete account');
    }
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string) {
    try {
      console.log('Received ID:', id, 'Type:', typeof id);
      const user = await this.userService.findOne(parseInt(id));
      if (!user) {
        throw new BadRequestException('User not found');
      }
      return await this.authService.deleteAccountByEmail(user.email);
    } catch (error) {
      console.error('Error in remove:', error);
      throw new BadRequestException(error.message || 'Failed to delete user');
    }
  }

  @Post('update-profile')
  @HttpCode(200)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        front: {
          type: 'string',
          format: 'binary',
          description: 'Front side of ID document (max 5MB)',
        },
        back: {
          type: 'string',
          format: 'binary',
          description: 'Back side of ID document (max 5MB)',
        },
        additional: {
          type: 'string',
          format: 'binary',
          description: 'Additional verification document (optional, max 5MB)',
        },
        firstName: {
          type: 'string',
          description: 'First Name of the user',
        },
        lastName: {
          type: 'string',
          description: 'Last Name of the user',
        },
        email: {
          type: 'string',
          format: 'email',
          description: 'Email address of the user',
        },
        phoneNumber: {
          type: 'string',
          description: 'Phone Number of the user',
        },
        dateOfBirth: {
          type: 'string',
          format: 'date',
          description: 'Date of birth of the user',
        },
        address: {
          type: 'object',
          properties: {
            line1: { type: 'string' },
            line2: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            postalCode: { type: 'string' }
          }
        },
        iban: {
          type: 'string',
          description: 'Bank account number',
        },
        routingNumber: {
          type: 'string',
          description: 'BSB number',
        }
      }
    }
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'front', maxCount: 1 },
      { name: 'back', maxCount: 1 },
      { name: 'additional', maxCount: 1 }
    ], {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const timestamp = Date.now();
          cb(null, `${file.fieldname}-${timestamp}-${file.originalname}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const ext = (file.originalname.match(/\.[^.]+$/) || [''])[0].toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          return cb(
            new BadRequestException({
              statusCode: 400,
              message: `Invalid file extension "${ext}" in file "${file.originalname}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
              error: 'Bad Request',
              fileName: file.originalname,
              invalidExtension: ext,
              allowedExtensions: ALLOWED_EXTENSIONS,
            }),
            false
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: MAX_FILE_SIZE // 5MB max file size
      }
    })
  )
  async updateProfile(
    @Body() updateUserDto: any,
    @UploadedFiles() files: { 
      front?: Express.Multer.File[],
      back?: Express.Multer.File[],
      additional?: Express.Multer.File[]
    },
    @Req() request: Request
  ) {
    try {
      const token = request.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new BadRequestException('Authorization token is required');
      }

      const decoded = jwt.verify(token, process.env.SECRET_KEY) as CustomJwtPayload;
      const user = await this.userService.findByEmail(decoded.user_email);
      
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Validate file sizes
      const maxSize = 50 * 1024 * 1024; // 5MB in bytes
      const validateFileSize = (file: Express.Multer.File) => {
        if (file.size > maxSize) {
          throw new BadRequestException(`File ${file.originalname} exceeds the maximum size limit of 5MB`);
        }
      };

      if (files.front?.[0]) validateFileSize(files.front[0]);
      if (files.back?.[0]) validateFileSize(files.back[0]);
      if (files.additional?.[0]) validateFileSize(files.additional[0]);

      // Create a plain object with the proper shape of CreateUserDto
      const userData: Partial<CreateUserDto> = {
        firstName: updateUserDto.firstName,
        lastName: updateUserDto.lastName,
        email: user.email, // Keep original email
        phoneNumber: updateUserDto.phoneNumber,
        iban: updateUserDto.iban,
        routingNumber: updateUserDto.routingNumber,
        verificationDocument: {
          front: files.front?.[0]?.path,
          back: files.back?.[0]?.path,
          additional: files.additional?.[0]?.path
        }
      };

      // Parse the date string to a Date object
      if (updateUserDto.dateOfBirth) {
        userData.dateOfBirth = new Date(updateUserDto.dateOfBirth);
      }

      // Parse the address if provided
      if (updateUserDto.address) {
        userData.address = updateUserDto.address;
      }

      return this.authService.updateUserProfile(user.id, userData, files);
    } catch (error) {
      console.error('Error in updateProfile:', error);
      throw new BadRequestException(error.message || 'Failed to update profile');
    }
  }

  /**
   * Test webhook endpoint for development
   * 
   * @param {Request} request - The HTTP request
   * @param {Response} response - The HTTP response
   * @returns {Promise<void>}
   * 
   * @api {post} /auth/test-webhook Test Webhook
   * @apiName TestWebhook
   * @apiGroup Auth
   * @apiDescription Test endpoint for Stripe webhooks in development
   */
  @Post('test-webhook')
  @HttpCode(200)
  async testWebhook(@Req() request: Request, @Res() response: Response) {
    try {
      // For testing, we'll skip signature verification
      const event = request.body;
      
      // Log the event for debugging
      console.log('Test Webhook Event:', JSON.stringify(event, null, 2));
      
      // Process the event
      await this.authService.handleStripeWebhook(event);
      
      response.json({ received: true });
    } catch (err) {
      console.error('Test Webhook Error:', err.message);
      response.status(400).send(`Test Webhook Error: ${err.message}`);
    }
  }

  @Delete('delete-user')
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'))
  async deleteUser(@Req() request: Request) {
    try {
      const token = request.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new BadRequestException('Authorization token is required');
      }

      const decoded = jwt.verify(token, process.env.SECRET_KEY) as CustomJwtPayload;
      if (!decoded.user_email) {
        throw new BadRequestException('User email not found in token');
      }
      
      console.log('Deleting user with email:', decoded.user_email);
      return await this.authService.deleteAccountByEmail(decoded.user_email);
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw new BadRequestException(error.message || 'Failed to delete user');
    }
  }
}
