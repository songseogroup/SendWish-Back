import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException,Inject, OnModuleInit } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { userDto } from './dto/user-login.dto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { MailerService } from '@nestjs-modules/mailer';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { Exception } from 'handlebars';
import { OAuth2Client } from 'google-auth-library';
import * as stripe from 'stripe';
import { KYCStatus } from '../users/entities/user.entity';
import * as fs from 'fs';

// Configure Stripe with better timeout settings
const stripeOptions = {
  apiVersion: '2023-10-16', // Use a specific API version
  timeout: 60000, // 60 second timeout
  maxNetworkRetries: 3, // Automatic retries for network issues
};
let stripeInstance = require('stripe')(process.env.STRIPE_KEY, stripeOptions);

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @Inject('OAuth2Client') private readonly client: OAuth2Client,
    // private client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID), // Add this for Google auth
    private readonly usersService: UsersService,
    private readonly mailerService: MailerService,
  ) {}

  onModuleInit() {
    // Ensure Stripe is properly initialized when the module starts
    if (!process.env.STRIPE_KEY) {
      console.error('STRIPE_KEY environment variable is not set!');
    } else {
      console.log('Stripe initialized with API key:', process.env.STRIPE_KEY.substring(0, 8) + '...');
    }
  }

  create(createAuthDto: CreateAuthDto) {
    return 'This action adds a new auth';
  }


  async verify(token: string) {
    try {
      console.log(process.env.STRIPE_KEY);
      console.log(process.env.STRIPE_TEST_KEY);
      const verify = jwt.verify(token, process.env.SECRET_KEY);
      const email = verify.user_email;
      let userData = await this.usersService.findByEmail(email);
      
      // If user is already verified, return success with tokens
      if(!!userData.verified) {
        // Generate new tokens for the user
        const accessToken = jwt.sign(
          { email: email, id: userData.id },
          process.env.SECRET_KEY,
          { expiresIn: '1d' },
        );
        const refreshToken = jwt.sign(
          { email: email, id: userData.id },
          process.env.SECRET_REFRESH_KEY,
          { expiresIn: '1d' },
        );
        
        // Update user with new tokens
        userData.accessToken = accessToken;
        userData.refreshToken = refreshToken;
        await this.usersService.update(userData.id, userData);
        
        return {
          message: "User already verified",
          userInfo: userData,
          accessToken: accessToken,
          refreshToken: refreshToken,
          status: HttpStatus.OK
        };
      }
      
      if (verify) {
        userData.verified = true;
       
        const update = await this.usersService.update(userData.id, userData);

        if (!update) {
          throw new Error('Error updating data');
        }
        
        // Generate new tokens for the user
        const accessToken = jwt.sign(
          { email: email, id: userData.id },
          process.env.SECRET_KEY,
          { expiresIn: '1d' },
        );
        const refreshToken = jwt.sign(
          { email: email, id: userData.id },
          process.env.SECRET_REFRESH_KEY,
          { expiresIn: '1d' },
        );
        
        // Update user with new tokens
        userData.accessToken = accessToken;
        userData.refreshToken = refreshToken;
        await this.usersService.update(userData.id, userData);
        
        // Send verification email
        try {
          await this.mailerService.sendMail({
            to: userData.email,
            from: process.env.MY_EMAIL,
            subject: 'Complete Your SendWish Verification',
            text: 'Please complete your verification to access your account.',
            html: `
              <p>Thank you for updating your account information!</p>
              <p>Please complete your verification by clicking the link below:</p>
              <p><a href="${process.env.FRONTEND_URL || `https://sendwish.org/signup-verify/${accessToken}/${refreshToken}`}">Click here to verify your account</a></p>
              <p>If you didn't request this, please ignore this email.</p>
              <p>Your access token: ${accessToken}</p>
              <p>Your refresh token: ${refreshToken}</p>
            `,
          });
        } catch (emailError) {
          console.error('Error sending verification email:', emailError);
          // Continue even if email fails
        }
        
        return {
          message: 'User Verified',
          userInfo: userData,
          accessToken: accessToken,
          refreshToken: refreshToken,
          status: HttpStatus.CREATED
        };
      } else {
        throw new Exception('Token expired');
      }
    } catch (e) {
      // If this is a Stripe error, provide detailed information
      if (e.type && e.type.startsWith('Stripe')) {
        console.error('Stripe error:', e);
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
            error: e.message,
            code: e.code || 'stripe_error',
            param: e.param,
            type: e.type,
            details: e.raw,
            doc_url: e.doc_url
          },
          HttpStatus.BAD_REQUEST
        );
      }
      
      // For other errors, provide a standard format
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: e.message || e,
          details: e.response || e
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }
  async customSignUp(registerUserDto: CreateUserDto, files: { 
    front?: Express.Multer.File[],
    back?: Express.Multer.File[],
    additional?: Express.Multer.File[]
  }) {
    let user = null;
    try {
      // Validate required documents
      if (!files?.front?.[0] || !files?.back?.[0]) {
        throw new BadRequestException({
          message: 'Document verification failed',
          details: {
            front: 'Front of ID document is required',
            back: 'Back of ID document is required'
          }
        });
      }

      // Validate document formats
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      const validateFile = (file: Express.Multer.File) => {
        if (!allowedTypes.includes(file.mimetype)) {
          throw new BadRequestException({
            message: 'Invalid document format',
            details: {
              file: file.originalname,
              allowed: ['JPEG', 'PNG', 'PDF'],
              received: file.mimetype
            }
          });
        }
        if (file.size > maxSize) {
          throw new BadRequestException({
            message: 'Document too large',
            details: {
              file: file.originalname,
              maxSize: '5MB',
              received: `${(file.size / 1024 / 1024).toFixed(2)}MB`
            }
          });
        }
      };

      validateFile(files.front[0]);
      validateFile(files.back[0]);
      if (files.additional?.[0]) validateFile(files.additional[0]);

      // Validate Australian address
      const validateAustralianAddress = (address: any) => {
        if (!address) {
          throw new BadRequestException('Address is required');
        }

        // Validate postal code (must be 4 digits)
        const auPostalCodeRegex = /^\d{4}$/;
        if (!auPostalCodeRegex.test(address.postalCode)) {
          throw new BadRequestException({
            message: 'Invalid Australian postal code',
            details: {
              format: 'Must be exactly 4 digits',
              example: '2000'
            }
          });
        }

        // Validate state
        const validStates = [
          'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT',
          'New South Wales', 'Victoria', 'Queensland', 'Western Australia',
          'South Australia', 'Tasmania', 'Australian Capital Territory', 'Northern Territory'
        ];
        if (!validStates.includes(address.state)) {
          throw new BadRequestException({
            message: 'Invalid Australian state',
            details: {
              validStates: validStates
            }
          });
        }
      };

      validateAustralianAddress(registerUserDto.address);

      // Validate phone number (Australian format)
      const auPhoneRegex = /^(\+?61|0)4\d{8}$/;
      if (!auPhoneRegex.test(registerUserDto.phoneNumber)) {
        throw new BadRequestException({
          message: 'Invalid Australian phone number',
          details: {
            format: 'Must be a valid Australian mobile number',
            examples: ['0412345678', '+61412345678']
          }
        });
      }

      // Validate date of birth (must be 18+ years)
      const dob = new Date(registerUserDto.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 18) {
        throw new BadRequestException({
          message: 'Age verification failed',
          details: {
            requirement: 'Must be 18 years or older',
            received: `${age} years`
          }
        });
      }

      // Generate tokens for the user
      const tokenPayload = {
        email: registerUserDto.email,
        id: null // Will be updated after user creation
      };

      const accessToken = jwt.sign(
        tokenPayload,
        process.env.SECRET_KEY,
        { expiresIn: '1d' }
      );

      const refreshToken = jwt.sign(
        tokenPayload,
        process.env.SECRET_REFRESH_KEY,
        { expiresIn: '7d' }
      );

      // Create user in database first
      user = await this.usersService.create({
        ...registerUserDto,
        kycStatus: KYCStatus.PENDING,
        verificationDocument: {
          front: files.front[0].path,
          back: files.back[0].path,
          additional: files.additional?.[0]?.path
        },
        accessToken: accessToken,
        refreshToken: refreshToken,
        verified: true // Set verified to true to allow login
      });

      // Create Stripe account with enhanced verification
      const account = await stripeInstance.accounts.create({
        type: 'custom',
        country: 'AU',
        email: registerUserDto.email,
        business_type: 'individual',
        business_profile: {
          url: 'https://sendwish.org',
          support_url: 'https://sendwish.org',
          support_email: registerUserDto.email,
          mcc: '5947', // Always use 5947 for gift platforms
          product_description: registerUserDto.product_description || 'Gift and event platform'
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        individual: {
          first_name: registerUserDto.firstName,
          last_name: registerUserDto.lastName,
          email: registerUserDto.email,
          phone: registerUserDto.phoneNumber,
          dob: {
            day: dob.getDate(),
            month: dob.getMonth() + 1,
            year: dob.getFullYear(),
          },
          address: {
            line1: registerUserDto.address.line1,
            line2: registerUserDto.address.line2,
            city: registerUserDto.address.city,
            state: registerUserDto.address.state,
            postal_code: registerUserDto.address.postalCode,
            country: 'AU',
          },
          verification: {
            document: {
              front: null, // Will be set after file upload
              back: null  // Will be set after file upload
            }
          }
        },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: registerUserDto.ip || '127.0.0.1',
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'daily'
            }
          }
        }
      });

      // Add external bank account (required for payouts)
      try {
        const bankAccountResponse = await stripeInstance.accounts.createExternalAccount(account.id, {
          external_account: {
            object: 'bank_account',
            country: 'AU',
            currency: 'aud',
            account_holder_name: `${registerUserDto.firstName} ${registerUserDto.lastName}`,
            account_holder_type: 'individual',
            account_number: registerUserDto.iban,
            routing_number: registerUserDto.routingNumber,
          },
        });
        console.log('Stripe bank account attached:', bankAccountResponse);
      } catch (bankError) {
        console.error('Error attaching bank account to Stripe:', bankError);
        throw new BadRequestException('Failed to attach bank account to Stripe: ' + (bankError.message || bankError));
      }

      // Upload documents to Stripe
      const [frontFile, backFile] = await Promise.all([
        fs.promises.readFile(files.front[0].path),
        fs.promises.readFile(files.back[0].path)
      ]);

      const [frontUpload, backUpload] = await Promise.all([
        stripeInstance.files.create({
          purpose: 'identity_document',
          file: {
            data: frontFile,
            name: 'front.jpg',
            type: 'application/octet-stream',
          },
        }),
        stripeInstance.files.create({
          purpose: 'identity_document',
          file: {
            data: backFile,
            name: 'back.jpg',
            type: 'application/octet-stream',
          },
        })
      ]);

      // Update Stripe account with document IDs and trigger final verification
      const finalUpdate = await stripeInstance.accounts.update(account.id, {
        individual: {
          first_name: registerUserDto.firstName,
          last_name: registerUserDto.lastName,
          email: registerUserDto.email,
          phone: registerUserDto.phoneNumber,
          dob: {
            day: dob.getDate(),
            month: dob.getMonth() + 1,
            year: dob.getFullYear(),
          },
          address: {
            line1: registerUserDto.address.line1,
            line2: registerUserDto.address.line2,
            city: registerUserDto.address.city,
            state: registerUserDto.address.state,
            postal_code: registerUserDto.address.postalCode,
            country: 'AU',
          },
          verification: {
            document: {
              front: frontUpload.id,
              back: backUpload.id
            }
          }
        },
        business_profile: {
          url: 'https://sendwish.org',
          support_url: 'https://sendwish.org',
          support_email: registerUserDto.email,
          product_description: registerUserDto.product_description || 'Gift and event platform',
          mcc: '5947'
        },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: registerUserDto.ip || '127.0.0.1',
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'daily'
            }
          }
        },
        metadata: {
          details_submitted: 'true',
          verification_attempt: new Date().toISOString(),
          kyc_status: 'pending_review'
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        }
      });

      // Verify the update was successful
      if (!finalUpdate.details_submitted) {
        console.warn('Stripe account details not fully submitted:', finalUpdate);
        // Retry with additional fields if needed
        await stripeInstance.accounts.update(account.id, {
          individual: {
            verification: {
              additional_document: {
                front: frontUpload.id,
                back: backUpload.id
              }
            }
          },
          metadata: {
            verification_retry: new Date().toISOString()
          }
        });
      }

      // Update user with Stripe account ID
      await this.usersService.update(user.id, {
        customerStripeAccountId: account.id
      });

      // Update tokens with user ID
      const updatedTokenPayload = {
        email: user.email,
        id: user.id
      };

      const updatedAccessToken = jwt.sign(
        updatedTokenPayload,
        process.env.SECRET_KEY,
        { expiresIn: '1d' }
      );

      const updatedRefreshToken = jwt.sign(
        updatedTokenPayload,
        process.env.SECRET_REFRESH_KEY,
        { expiresIn: '7d' }
      );

      // Update user with tokens containing ID
      await this.usersService.update(user.id, {
        accessToken: updatedAccessToken,
        refreshToken: updatedRefreshToken
      });

      // Send welcome email
      try {
        await this.mailerService.sendMail({
          to: user.email,
          subject: 'Welcome to Our Platform',
          html: `
            <h1>Welcome to Our Platform, ${user.firstName}!</h1>
            <p>Thank you for signing up. Your account is being verified.</p>
            <p>Please click the link below to complete your verification:</p>
            <p><a href="${process.env.FRONTEND_URL || 'https://sendwish.org'}/signup-verify/${updatedAccessToken}/${updatedRefreshToken}">Verify Your Account</a></p>
            <p>Next steps:</p>
            <ul>
              <li>Your account is being verified</li>
              <li>You will receive an email once verification is complete</li>
              <li>You can add a bank account in the meantime</li>
            </ul>
            <p>If you didn't request this, please ignore this email.</p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }

      return {
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          kycStatus: user.kycStatus
        },
        accessToken: updatedAccessToken,
        refreshToken: updatedRefreshToken
      };
    } catch (error) {
      console.error('Error in customSignUp:', error);
      
      // Rollback: Delete user if created
      if (user) {
        try {
          await this.usersService.remove(user.id);
          console.log('Successfully rolled back user creation for:', user.email);
        } catch (deleteError) {
          console.error('Failed to rollback user creation for:', user.email, deleteError);
        }
      }
      
      throw new BadRequestException(error.message || 'Failed to create user');
    }
  }
  
  async login(userData: userDto) {
    try {
      const user = await this.usersService.findByEmail(userData.email);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      if (!user.verified) {
        throw new HttpException('User not verified', HttpStatus.UNAUTHORIZED);
      }

      const isPasswordValid = await bcrypt.compare(userData.password, user.password);
      if (!isPasswordValid) {
        throw new HttpException('Incorrect credentials', HttpStatus.UNAUTHORIZED);
      }

      // Generate tokens with consistent payload structure
      const tokenPayload = {
        id: user.id,
        email: user.email
      };

      const accessToken = jwt.sign(
        tokenPayload,
        process.env.SECRET_KEY,
        { expiresIn: '1d' }
      );

      const refreshToken = jwt.sign(
        tokenPayload,
        process.env.SECRET_REFRESH_KEY,
        { expiresIn: '7d' }
      );

      // Update user with new tokens
      user.accessToken = accessToken;
      user.refreshToken = refreshToken;
      await this.usersService.update(user.id, user);

      // Remove sensitive data before sending response
      const { password, ...userWithoutPassword } = user;

      return {
        message: 'Successfully logged in',
        user: userWithoutPassword,
        accessToken,
        refreshToken,
        status: HttpStatus.OK
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Login error:', error);
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          error: 'Authentication failed'
        },
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  async generateRefresh(token: string) {
    try {
      if (!token) {
        throw new HttpException('Refresh token is required', HttpStatus.UNAUTHORIZED);
      }

      const decoded = jwt.verify(token, process.env.SECRET_REFRESH_KEY);
      if (!decoded) {
        throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
      }

      const user = await this.usersService.findByEmail(decoded.email);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const tokenPayload = {
        id: user.id,
        email: user.email
      };

      const newAccessToken = jwt.sign(
        tokenPayload,
        process.env.SECRET_KEY,
        { expiresIn: '1d' }
      );

      user.accessToken = newAccessToken;
      await this.usersService.update(user.id, user);

      return {
        accessToken: newAccessToken,
        message: 'Token refreshed successfully'
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Token refresh error:', error);
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          error: 'Failed to refresh token'
        },
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  async updatePassword(userId: number, updatePasswordDto: UpdateAuthDto) {
    try{
      const { currentPassword, newPassword } = updatePasswordDto;

      const user = await this.usersService.findOne(userId);
  
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        throw new BadRequestException('Current password is incorrect.');
      }
  
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.usersService.update(userId, {password:hashedPassword});
  
      return {
        message: 'Password updated successfully.',
        status: HttpStatus.CREATED
      };
    }catch(e){
      throw new HttpException(
        {
          status: e.status||HttpStatus.BAD_REQUEST,
          error: e.message || e,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
 
    
}

  async resetPassword(email: string) {
    try {
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new NotFoundException('User with this email does not exist.');
      }

      const temporaryPassword = uuidv4();  // Generate a temporary password (could be more complex)
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      await this.usersService.update(user.id, {password:hashedPassword});

      // Send the temporary password to the user's email
      // You can implement an email service to handle the email sending.
      await this.mailerService
      .sendMail({
        to: email, // list of receivers
        from: process.env.MY_EMAIL, // sender address
        subject: 'Password Reset ✔', // Subject line
        text: `You can use this password to sign in and can update your password too`, // plaintext body
        html: `<p> Here is your temporary password ${temporaryPassword}</a>`, // HTML body content
      })
      .then((r) => {
        console.log(r, 'SEND RESPONSE');
      })
      .catch((e) => {
        console.log(e, 'ERRRORR');
      });

      return { message: 'Temporary password has been sent to your email.' };
    } catch (e) {
      console.log("EERROR",e)
      throw new HttpException(
        {
          status: e.status || HttpStatus.BAD_REQUEST,
          error: e.message || e,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

  }

 
  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  async checkKYCStatus(userId: number) {
    try {
      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.customerStripeAccountId) {
        return {
          kycStatus: KYCStatus.UNVERIFIED,
          message: 'No Stripe account found'
        };
      }

      // Get latest verification status from Stripe
      const account = await stripeInstance.accounts.retrieve(user.customerStripeAccountId);
      const requirements = account.requirements;

      // Update verification details
      const verificationDetails = {
        requirements: requirements || [],
        currentlyDue: requirements?.currently_due || [],
        eventuallyDue: requirements?.eventually_due || [],
        pastDue: requirements?.past_due || [],
        disabledReason: requirements?.disabled_reason
      };

      // Determine KYC status based on Stripe's requirements
      let kycStatus = KYCStatus.UNVERIFIED;
      if (requirements?.disabled_reason === null) {
        kycStatus = KYCStatus.VERIFIED;
      } else if (requirements?.currently_due?.length > 0 || requirements?.past_due?.length > 0) {
        kycStatus = KYCStatus.PENDING;
      }

      // Update user's KYC status and verification details
      await this.usersService.update(userId, {
        kycStatus,
        stripeVerificationDetails: verificationDetails
      });

      return {
        kycStatus,
        verificationDetails,
        message: this.getKYCStatusMessage(kycStatus)
      };
    } catch (e) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: e.message || e,
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  private getKYCStatusMessage(status: KYCStatus): string {
    switch (status) {
      case KYCStatus.VERIFIED:
        return 'KYC verification is complete';
      case KYCStatus.PENDING:
        return 'KYC verification is pending. Please complete the required documents';
      case KYCStatus.UNVERIFIED:
        return 'KYC verification is required';
      default:
        return 'Unknown KYC status';
    }
  }

  async handleStripeWebhook(event: any) {
    try {
      switch (event.type) {
        case 'account.updated':
          const account = event.data.object;
          const user = await this.usersService.findByStripeAccountId(account.id);
          
          if (user) {
            const requirements = account.requirements;
            const verificationDetails = {
              requirements: requirements || [],
              currentlyDue: requirements?.currently_due || [],
              eventuallyDue: requirements?.eventually_due || [],
              pastDue: requirements?.past_due || [],
              disabledReason: requirements?.disabled_reason
            };

            // Update KYC status based on requirements
            let kycStatus = KYCStatus.UNVERIFIED;
            if (requirements?.disabled_reason === null) {
              kycStatus = KYCStatus.VERIFIED;
            } else if (requirements?.currently_due?.length > 0 || requirements?.past_due?.length > 0) {
              kycStatus = KYCStatus.PENDING;
            }

            // Update user's KYC status and verification details
            await this.usersService.update(user.id, {
              kycStatus,
              stripeVerificationDetails: verificationDetails
            });

            // Send email notification if KYC is verified
            if (kycStatus === KYCStatus.VERIFIED) {
              try {
                await this.mailerService.sendMail({
                  to: user.email,
                  from: process.env.MY_EMAIL,
                  subject: 'KYC Verification Complete',
                  html: `
                    <p>Your KYC verification has been completed successfully!</p>
                    <p>You can now start using your SendWish account.</p>
                  `
                });
              } catch (emailError) {
                console.error('Error sending KYC completion email:', emailError);
              }
            }
          }
          break;

        case 'account.external_account.created':
        case 'account.external_account.updated':
          // Handle bank account updates
          const bankAccount = event.data.object;
          const bankUser = await this.usersService.findByStripeAccountId(bankAccount.account);
          
          if (bankUser) {
            // Update user's bank account status
            await this.usersService.update(bankUser.id, {
              routingNumber: bankAccount.routing_number,
              iban: bankAccount.account_number
            });
          }
          break;

        case 'account.deleted':
          // Handle account deletion from Stripe
          const deletedAccount = event.data.object;
          const deletedUser = await this.usersService.findByStripeAccountId(deletedAccount.id);
          
          if (deletedUser) {
            // Update user status to indicate account deletion
            deletedUser.customerStripeAccountId = null;
            deletedUser.kycStatus = KYCStatus.UNVERIFIED;
            await this.usersService.update(deletedUser.id, deletedUser);
            
            // Send notification email
            await this.mailerService.sendMail({
              to: deletedUser.email,
              subject: 'Account Deletion Confirmation',
              template: 'account-deleted',
              context: {
                name: `${deletedUser.firstName} ${deletedUser.lastName}`,
                date: new Date().toLocaleDateString()
              }
            });
          }
          break;

        case 'account.external_account.deleted':
          // Handle bank account deletion
          const deletedBankAccount = event.data.object;
          const bankAccountUser = await this.usersService.findByStripeAccountId(deletedBankAccount.account);
          
          if (bankAccountUser) {
            // Update user's bank account information
            bankAccountUser.iban = null;
            bankAccountUser.routingNumber = null;
            await this.usersService.update(bankAccountUser.id, bankAccountUser);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling Stripe webhook:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: number, userData: Partial<CreateUserDto>, files: { 
    front?: Express.Multer.File[],
    back?: Express.Multer.File[],
    additional?: Express.Multer.File[]
  }) {
    try {
      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Update user data
      if (userData.firstName) user.firstName = userData.firstName;
      if (userData.lastName) user.lastName = userData.lastName;
      if (userData.phoneNumber) user.phoneNumber = userData.phoneNumber;
      if (userData.dateOfBirth) user.dateOfBirth = userData.dateOfBirth;
      if (userData.address) user.address = userData.address;
      if (userData.iban) user.iban = userData.iban;
      if (userData.routingNumber) user.routingNumber = userData.routingNumber;

      // Handle document updates if provided
      if (files?.front?.[0] || files?.back?.[0] || files?.additional?.[0]) {
        // Upload new documents to Stripe
        let frontFileUpload, backFileUpload, additionalFileUpload;

        if (files.front?.[0]) {
          const frontFile = await fs.promises.readFile(files.front[0].path);
          frontFileUpload = await stripeInstance.files.create({
            purpose: 'identity_document',
            file: {
              data: frontFile,
              name: 'front.jpg',
              type: 'application/octet-stream',
            },
          });
          user.verificationDocument.front = files.front[0].path;
        }

        if (files.back?.[0]) {
          const backFile = await fs.promises.readFile(files.back[0].path);
          backFileUpload = await stripeInstance.files.create({
            purpose: 'identity_document',
            file: {
              data: backFile,
              name: 'back.jpg',
              type: 'application/octet-stream',
            },
          });
          user.verificationDocument.back = files.back[0].path;
        }

        if (files.additional?.[0]) {
          const additionalFile = await fs.promises.readFile(files.additional[0].path);
          additionalFileUpload = await stripeInstance.files.create({
            purpose: 'identity_document',
            file: {
              data: additionalFile,
              name: 'additional.jpg',
              type: 'application/octet-stream',
            },
          });
          user.verificationDocument.additional = files.additional[0].path;
        }

        // Update Stripe account with new documents
        await stripeInstance.accounts.update(user.customerStripeAccountId, {
          individual: {
            verification: {
              document: {
                ...(frontFileUpload && { front: frontFileUpload.id }),
                ...(backFileUpload && { back: backFileUpload.id }),
                ...(additionalFileUpload && { additional: additionalFileUpload.id })
              }
            }
          }
        });
      }

      // Update bank account if provided
      if (userData.iban && userData.routingNumber) {
        // Validate BSB format for Australian banks (6 digits)
        const bsbRegex = /^\d{6}$/;
        if (!bsbRegex.test(userData.routingNumber)) {
          throw new BadRequestException({
            message: 'Invalid BSB format',
            details: {
              message: 'The BSB must be exactly 6 digits',
              format: 'xxxxxx (where x is a digit)',
              example: '123456'
            }
          });
        }

        // Validate account number (up to 9 digits)
        const accountNumberRegex = /^\d{1,9}$/;
        if (!accountNumberRegex.test(userData.iban)) {
          throw new BadRequestException({
            message: 'Invalid account number format',
            details: {
              message: 'The account number must be between 1 and 9 digits',
              format: 'x to xxxxxxxxx (where x is a digit)',
              example: '123456789'
            }
          });
        }

        // Update bank account in Stripe
        await stripeInstance.accounts.createExternalAccount(
          user.customerStripeAccountId,
          {
            external_account: {
              object: 'bank_account',
              country: 'AU',
              currency: 'aud',
              account_holder_name: `${user.firstName} ${user.lastName}`,
              account_holder_type: 'individual',
              account_number: userData.iban,
              routing_number: userData.routingNumber,
            },
          }
        );
      }

      // Save updated user
      await this.usersService.update(userId, user);

      return {
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          kycStatus: user.kycStatus
        }
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new BadRequestException(error.message || 'Failed to update profile');
    }
  }

  /**
   * Deletes a user account and associated Stripe account by email
   * 
   * @param {string} email - The email of the user to delete
   * @returns {Promise<{message: string}>} Success message
   * 
   * @throws {BadRequestException} If user not found or deletion fails
   */
  async deleteAccountByEmail(email: string) {
    try {
      // Find user by email
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Delete Stripe account if exists
      if (user.customerStripeAccountId) {
        try {
          // First, delete all external accounts (bank accounts)
          const accounts = await stripeInstance.accounts.listExternalAccounts(
            user.customerStripeAccountId,
            { object: 'bank_account' }
          );
          
          for (const account of accounts.data) {
            await stripeInstance.accounts.deleteExternalAccount(
              user.customerStripeAccountId,
              account.id
            );
          }

          // Then delete the Stripe account
          await stripeInstance.accounts.del(user.customerStripeAccountId);
        } catch (stripeError) {
          console.error('Error deleting Stripe account:', stripeError);
          // Continue with deletion even if Stripe fails
        }
      }

      // Delete all events associated with the user
      try {
        await this.usersService.removeUserEvents(user.id);
      } catch (eventError) {
        console.error('Error deleting user events:', eventError);
        throw new BadRequestException('Failed to delete user events');
      }

      // Delete user from database
      await this.usersService.remove(user.id);

      return {
        message: 'Account and associated events deleted successfully',
        status: HttpStatus.OK
      };
    } catch (error) {
      console.error('Error in deleteAccountByEmail:', error);
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: error.message || 'Failed to delete account'
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
