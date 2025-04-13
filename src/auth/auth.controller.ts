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
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { userDto } from './dto/user-login.dto';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { Request } from 'express';
import { ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor, FilesInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Express } from 'express';

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
          description: 'Front side of ID document',
        },
        back: {
          type: 'string',
          format: 'binary',
          description: 'Back side of ID document',
        },
        additional: {
          type: 'string',
          format: 'binary',
          description: 'Additional verification document (optional)',
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
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          cb(null, `${file.fieldname}-${uniqueSuffix}-${file.originalname}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Accept images and PDFs
        if (!file.originalname.match(/\.(jpg|jpeg|png|pdf)$/)) {
          return cb(new Error('Only image and PDF files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max file size
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
      console.log('Files received:', JSON.stringify(files));
      console.log('Request body:', JSON.stringify(registerUserDto));
      
      // Validate that front and back documents are provided
      if (!files?.front?.[0] || !files?.back?.[0]) {
        throw new BadRequestException('Front and back documents are required for KYC verification');
      }

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
  @ApiResponse({ status: HttpStatus.OK, description: 'Loggedin' })
  async create(@Body() userData: userDto) {
    try {
      const userLogin = await this.authService.login(userData);
      return userLogin;

    } catch (e) {
      throw new HttpException(e.response.error, e.response.status)
    }
  }

  @Get('/refresh')
  generateToken(@Req() request: Request) {
    const token = request.headers['refresh'];
    return this.authService.generateRefresh(token);
  }

  @Post("update-password")
  @HttpCode(200)
  @ApiResponse({ status: HttpStatus.OK, description: 'Password updated'})
  updatePassword(@Req() request:Request,@Body() updateAuthDto:UpdateAuthDto) {
    const user = request['user'];
    const {userId,...other}=user;
    return this.authService.updatePassword(userId, updateAuthDto);
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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authService.remove(+id);
  }
}
