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

  // async signUp(userData: CreateUserDto) {
  //   try {
  //     let user = await this.usersService.findByEmail(userData.email);
  //     if (user && !!user.verified) {
  //       throw new Error("User already exists")
  //     }
  //     const accessToken = jwt.sign(
  //       { user_email: userData.email },
  //       process.env.SECRET_KEY,
  //       { expiresIn: '1h' },
  //     );

  //     const refreshToken = jwt.sign(
  //       { user_email: userData.email },
  //       process.env.SECRET_REFRESH_KEY,
  //       { expiresIn: '17h' },
  //     );
  //     if (user && !user.verified) {
  //       const account_link = await stripe.accountLinks.create({
  //         account: user.customerStripeAccountId,
  //         refresh_url: 'https://example.com/reauth',
  //         return_url: `https://sendwish.org/signup-verify/${accessToken}/${refreshToken}`,
  //         type: 'account_onboarding',
  //       });

  //       await this.mailerService
  //         .sendMail({
  //           to: userData.email, // list of receivers
  //           from: process.env.MY_EMAIL, // sender address
  //           subject: 'Stripe Verification Link ✔', // Subject line
  //           text: `Signup on stripe`, // plaintext body
  //           html: `<a href="${account_link.url}">Click here to verify your account</a>`, // HTML body content
  //         })
  //         .then((r) => {
  //           console.log(r, 'SEND RESPONSE');
  //         })
  //         .catch((e) => {
  //           console.log(e, 'ERRRORR');
  //         });
  //         return {
  //           message: 'Check email to verify your signup',
  //         };
  //     }


  //     userData.accessToken = accessToken;

  //     userData.refreshToken = refreshToken;

  //     const customer = await stripe.customers.create({
  //       name: userData.username,
  //       email: userData.email,
  //     });
      
  //     console.log(customer, "HERE IS THE CUSTOMER STRIPE ID");

  //     userData.customer_stripe_id = customer.id; //this is id is to charge the customer using their debit card

  //     const account = await stripe.accounts.create({
  //       type: 'express', // or 'standard' based on your needs
  //       country: 'AU',
  //       email: userData.email,
  //     });

  //     const add_capability = await stripe.accounts.update(
  //       account.id, // Use the ID of the created account
  //       {
  //         capabilities: {
  //           card_payments: { requested: true },
  //           transfers: { requested: true }, // Request the transfers capability
  //         },
  //       }
  //     );
  //     console.log("add_capability", add_capability);

  //     userData.customerStripeAccountId = account.id; // this id will be used to send payments to customer

  //     await this.usersService.create(userData);

  //     const account_link = await stripe.accountLinks.create({
  //       account: account.id,
  //       refresh_url: 'https://example.com/reauth',
  //       return_url: `https://sendwish.org/signup-verify/${accessToken}/${refreshToken}`,
  //       type: 'account_onboarding',
  //     });

  //     await this.mailerService
  //       .sendMail({
  //         to: userData.email, // list of receivers
  //         from: process.env.MY_EMAIL, // sender address
  //         subject: 'Verify Your Email to Get Started ✔', // Subject line
  //         text: `Signup on stripe`, // plaintext body
  //         html: `<p>Thank you for verifying your email! Click the link below to complete your account setup:</p> 
  //         <br></br><a href="${account_link.url}">Click here to verify your account</a><br></br>
  //         <p>If you didn't request this, please ignore this email.</p>
  //         `, // HTML body content
  //       })
  //       .then((r) => {
  //         console.log(r, 'SEND RESPONSE');
  //       })
  //       .catch((e) => {
  //         console.log(e, 'ERRRORR');
  //       });
  //     return {
  //       message: 'Check email to verify your signup',
  //     };
  //   } catch (e) {
  //     throw new HttpException(
  //       {
  //         status: HttpStatus.BAD_REQUEST,
  //         error: e.message || e,
  //       },
  //       HttpStatus.BAD_REQUEST,
  //       {
  //         cause: e.message || e,
  //       },
  //     );
  //   }
  // }

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
          { userEmail: email, userId: userData.id },
          process.env.SECRET_KEY,
          { expiresIn: '1d' },
        );
        const refreshToken = jwt.sign(
          { userEmail: email, userId: userData.id },
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
          { userEmail: email, userId: userData.id },
          process.env.SECRET_KEY,
          { expiresIn: '1d' },
        );
        const refreshToken = jwt.sign(
          { userEmail: email, userId: userData.id },
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
  async customSignUp(userData: CreateUserDto, files: { 
    front?: Express.Multer.File[],
    back?: Express.Multer.File[],
    additional?: Express.Multer.File[]
  }) {
    try {
      console.log('Service received userData:', JSON.stringify(userData));
      console.log('Service received files:', JSON.stringify(files));
      
      // Check if the user already exists
      let user = await this.usersService.findByEmail(userData.email);
      
      // If user exists and is verified, throw error
      if (user && !!user.verified) {
        throw new Error('User already exists');
      }
      
      // If user exists but is not verified, update the user data instead of creating a new one
      if (user && !user.verified) {
        console.log('User exists but is not verified. Updating user data...');
        
        // Update user data with new information
        user.firstName = userData.firstName;
        user.lastName = userData.lastName;
        user.phoneNumber = userData.phoneNumber;
        user.dateOfBirth = userData.dateOfBirth;
        user.address = userData.address;
        user.iban = userData.iban;
        user.routingNumber = userData.routingNumber;
        
        // Generate new tokens
        const accessToken = jwt.sign(
          { user_email: userData.email },
          process.env.SECRET_KEY,
          { expiresIn: '1h' }
        );
        
        const refreshToken = jwt.sign(
          { user_email: userData.email },
          process.env.SECRET_REFRESH_KEY,
          { expiresIn: '17h' }
        );
        
        user.accessToken = accessToken;
        user.refreshToken = refreshToken;
        
        // Update verification documents if provided
        if (files?.front?.[0] && files?.back?.[0]) {
          user.verificationDocument = {
            front: files.front[0].path,
            back: files.back[0].path,
            additional: files.additional?.[0]?.path
          };
        }
        
        // Update user in database
        await this.usersService.update(user.id, user);
        
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
        
        // Return success response
        return {
          message: 'User data updated. Please complete verification.',
          stripeAccountId: user.customerStripeAccountId,
          kycStatus: KYCStatus.PENDING,
          accessToken: accessToken,
          refreshToken: refreshToken
        };
      }

      // Make sure we have the verification document
      if (!userData.verificationDocument || !userData.verificationDocument.front || !userData.verificationDocument.back) {
        console.log('Verification document missing or incomplete:', JSON.stringify(userData.verificationDocument));
        if (!files?.front?.[0] || !files?.back?.[0]) {
          throw new BadRequestException('Front and back documents are required for KYC verification');
        }
        
        // Set the verification document if it's not already set
        userData.verificationDocument = {
          front: files.front[0].path,
          back: files.back[0].path,
          additional: files.additional?.[0]?.path
        };
        console.log('Set verification document from files:', JSON.stringify(userData.verificationDocument));
      }

      // Validate address data before using it
      if (!userData.address || !userData.address.line1 || !userData.address.city || 
          !userData.address.state || !userData.address.postalCode) {
        console.error('Invalid address data:', JSON.stringify(userData.address));
        throw new BadRequestException('Valid address with line1, city, state, and postalCode is required');
      }

      // Validate Australian postal code (must be 4 digits)
      const auPostalCodeRegex = /^\d{4}$/;
      if (!auPostalCodeRegex.test(userData.address.postalCode)) {
        console.error('Invalid Australian postal code:', userData.address.postalCode);
        throw new BadRequestException('Australian postal code must be exactly 4 digits (e.g., 2000)');
      }

      // Validate Australian states
      const validAustralianStates = [
        'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT',
        'New South Wales', 'Victoria', 'Queensland', 'Western Australia', 
        'South Australia', 'Tasmania', 'Australian Capital Territory', 'Northern Territory'
      ];
      
      if (!validAustralianStates.includes(userData.address.state)) {
        console.error('Invalid Australian state:', userData.address.state);
        throw new BadRequestException(`Invalid Australian state. Must be one of: ${validAustralianStates.join(', ')}`);
      }

      // Validate date of birth before using it
      if (!userData.dateOfBirth) {
        console.error('Invalid date of birth:', userData.dateOfBirth);
        throw new BadRequestException('Valid date of birth is required');
      }

      // Try to read the files - if they don't exist, this will throw an error
      try {
        console.log('Attempting to read front file:', userData.verificationDocument.front);
        // Convert file paths to base64 for Stripe
        const frontFile = await fs.promises.readFile(userData.verificationDocument.front);
        console.log('Front file read successfully, size:', frontFile.length, 'bytes');
        
        // Check file size - Stripe has a 10MB limit for all API calls
        if (frontFile.length > 5 * 1024 * 1024) {
          console.warn('Front file is very large, may cause timeout issues:', Math.round(frontFile.length / (1024 * 1024)), 'MB');
        }
        
        console.log('Attempting to read back file:', userData.verificationDocument.back);
        const backFile = await fs.promises.readFile(userData.verificationDocument.back);
        console.log('Back file read successfully, size:', backFile.length, 'bytes');
        
        if (backFile.length > 5 * 1024 * 1024) {
          console.warn('Back file is very large, may cause timeout issues:', Math.round(backFile.length / (1024 * 1024)), 'MB');
        }
        
        let additionalFile;
        if (userData.verificationDocument.additional) {
          console.log('Attempting to read additional file:', userData.verificationDocument.additional);
          additionalFile = await fs.promises.readFile(userData.verificationDocument.additional);
          console.log('Additional file read successfully, size:', additionalFile.length, 'bytes');
          
          if (additionalFile.length > 5 * 1024 * 1024) {
            console.warn('Additional file is very large, may cause timeout issues:', Math.round(additionalFile.length / (1024 * 1024)), 'MB');
          }
        }
        
        // Calculate total size
        const totalSize = frontFile.length + backFile.length + (additionalFile ? additionalFile.length : 0);
        console.log('Total size of all files:', Math.round(totalSize / (1024 * 1024)), 'MB');
        
        if (totalSize > 15 * 1024 * 1024) {
          throw new BadRequestException('Total file size exceeds 15MB. Please upload smaller images.');
      }
  
      // Generate Access and Refresh Tokens
      const accessToken = jwt.sign(
        { user_email: userData.email },
        process.env.SECRET_KEY,
        { expiresIn: '1h' }
      );
  
      const refreshToken = jwt.sign(
        { user_email: userData.email },
        process.env.SECRET_REFRESH_KEY,
        { expiresIn: '17h' }
      );
  
      userData.accessToken = accessToken;
      userData.refreshToken = refreshToken;
  
      // Create a Custom Connected Account with KYC requirements
        let account;
        let retryCount = 0;
        const maxRetries = 3;
        
        // Prepare file upload to Stripe first
        console.log('Preparing to upload verification documents to Stripe');
        let frontFileUpload, backFileUpload, additionalFileUpload;
        
        try {
          // Upload front document to Stripe
          frontFileUpload = await stripeInstance.files.create({
            purpose: 'identity_document',
            file: {
              data: frontFile,
              name: 'front.jpg',
              type: 'application/octet-stream',
            },
          });
          console.log('Front document uploaded to Stripe:', frontFileUpload.id);
          
          // Upload back document to Stripe
          backFileUpload = await stripeInstance.files.create({
            purpose: 'identity_document',
            file: {
              data: backFile,
              name: 'back.jpg',
              type: 'application/octet-stream',
            },
          });
          console.log('Back document uploaded to Stripe:', backFileUpload.id);
          
          // Upload additional document if provided
          if (additionalFile) {
            additionalFileUpload = await stripeInstance.files.create({
              purpose: 'identity_document',
              file: {
                data: additionalFile,
                name: 'additional.jpg',
                type: 'application/octet-stream',
              },
            });
            console.log('Additional document uploaded to Stripe:', additionalFileUpload.id);
          }
        } catch (uploadError) {
          console.error('Error uploading document to Stripe:', uploadError);
          throw new BadRequestException(`Error uploading document to Stripe: ${uploadError.message}`);
        }
        
        while (retryCount < maxRetries) {
          try {
            console.log(`Attempt ${retryCount + 1} of ${maxRetries} to create Stripe account`);
            console.log('Creating Stripe account with data:', {
              email: userData.email,
              business_type: 'individual',
              name: `${userData.firstName} ${userData.lastName}`,
              phone: userData.phoneNumber,
              dob: {
                day: userData.dateOfBirth.getDate(),
                month: userData.dateOfBirth.getMonth() + 1,
                year: userData.dateOfBirth.getFullYear(),
              },
              address: {
                line1: userData.address.line1,
                line2: userData.address.line2 || '',
                city: userData.address.city,
                state: userData.address.state,
                postal_code: userData.address.postalCode,
                country: 'AU'
              },
            });

            // Set a shorter timeout for Stripe API requests
            const stripeOptions = { timeout: 30000 }; // 30 seconds timeout
            
            // Create account with required parameters according to Stripe API
            account = await stripeInstance.accounts.create({
        type: 'custom',
        country: 'AU',
        email: userData.email,
        business_type: 'individual',
        business_profile: {
                mcc: '5815', // Merchant Category Code for similar businesses
                url: 'www.sendwish.org',
          product_description: 'SendWish User',
        },
        individual: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          email: userData.email,
          phone: userData.phoneNumber,
          dob: {
            day: userData.dateOfBirth.getDate(),
            month: userData.dateOfBirth.getMonth() + 1,
            year: userData.dateOfBirth.getFullYear(),
          },
          address: {
            line1: userData.address.line1,
            line2: userData.address.line2 || '',
            city: userData.address.city,
            state: userData.address.state,
            postal_code: userData.address.postalCode,
            country: 'AU'
          },
          verification: {
            document: {
                    front: frontFileUpload.id,
                    back: backFileUpload.id,
                    ...(additionalFileUpload && { additional: additionalFileUpload.id })
            }
          }
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
              tos_acceptance: {
                date: Math.floor(Date.now() / 1000),
                ip: '127.0.0.1', // Placeholder IP address
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'manual'
            }
          }
        }
            }, stripeOptions);
            
            console.log('Stripe Account created successfully:', account.id);
            // If successful, break out of the retry loop
            break;
          } catch (stripeError) {
            retryCount++;
            console.error(`Attempt ${retryCount} failed with error:`, stripeError);
            
            // For better debugging
            if (stripeError.raw) {
              console.error('Stripe raw error:', JSON.stringify({
                type: stripeError.type,
                code: stripeError.code,
                param: stripeError.param,
                message: stripeError.raw.message,
                doc_url: stripeError.doc_url
              }));
            }
            
            // Check if it's a connection error (status code 499)
            if (stripeError.statusCode === 499 && retryCount < maxRetries) {
              console.log(`Retrying in 2 seconds... (${retryCount}/${maxRetries})`);
              // Wait 2 seconds before retrying
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue;
            }
            
            // If we've reached max retries or it's not a connection error, throw it
            if (retryCount >= maxRetries) {
              console.error('Max retries reached. Trying fallback to simpler account creation...');
              
              try {
                // Try creating a simpler account without all the verification documents
                console.log('Attempting simplified account creation');
                account = await stripeInstance.accounts.create({
                  type: 'custom',
                  country: 'AU',
                  email: userData.email,
                  business_type: 'individual',
                  tos_acceptance: {
                    date: Math.floor(Date.now() / 1000),
                    ip: '127.0.0.1', // Placeholder IP address
                  },
                  business_profile: {
                    mcc: '5815', // Merchant Category Code for similar businesses
                    url: 'www.sendwish.org',
                    product_description: 'SendWish User',
                  },
                  individual: {
                    first_name: userData.firstName,
                    last_name: userData.lastName,
                    email: userData.email,
                    phone: userData.phoneNumber,
                    dob: {
                      day: userData.dateOfBirth.getDate(),
                      month: userData.dateOfBirth.getMonth() + 1,
                      year: userData.dateOfBirth.getFullYear(),
                    },
                    address: {
                      line1: userData.address.line1,
                      line2: userData.address.line2 || '',
                      city: userData.address.city,
                      state: userData.address.state,
                      postal_code: userData.address.postalCode,
                      country: 'AU'
                    }
                  },
                  capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                  }
                }, { timeout: 30000 });
                
                console.log('Created simplified Stripe account:', account.id);
                
                // We'll need to update the account with verification later
                console.log('Verification documents will need to be added later');
                break;
              } catch (fallbackError) {
                console.error('Fallback account creation also failed:', fallbackError);
                
                // Extract useful info from Stripe error
                if (fallbackError.raw) {
                  return {
                    status: HttpStatus.BAD_REQUEST,
                    error: fallbackError.raw.message || 'Failed to create Stripe account',
                    details: {
                      type: fallbackError.type,
                      code: fallbackError.code,
                      param: fallbackError.param,
                      doc_url: fallbackError.doc_url
                    }
                  };
                }
                
                return {
                  status: HttpStatus.BAD_REQUEST,
                  error: `Failed to create Stripe account after ${maxRetries} attempts and fallback: ${stripeError.message}`,
                };
              }
            }
            
            // Format Stripe error for better debugging
            if (stripeError.raw) {
              return {
                status: HttpStatus.BAD_REQUEST,
                error: stripeError.raw.message || `Error creating Stripe account: ${stripeError.message}`,
                details: {
                  type: stripeError.type,
                  code: stripeError.code,
                  param: stripeError.param,
                  doc_url: stripeError.doc_url
                }
              };
            }
            
            return {
              status: HttpStatus.BAD_REQUEST,
              error: `Error creating Stripe account: ${stripeError.message}`,
            };
          }
        }
  
      // Get verification requirements from Stripe
      const requirements = await stripeInstance.accounts.retrieve(account.id);
      const verificationDetails = {
        requirements: requirements.requirements || [],
        currentlyDue: requirements.requirements?.currently_due || [],
        eventuallyDue: requirements.requirements?.eventually_due || [],
        pastDue: requirements.requirements?.past_due || [],
        disabledReason: requirements.requirements?.disabled_reason
      };
      console.log("verificationDetails",verificationDetails)
      // Attach Bank Details (IBAN)
      try {
        // Validate routing number format for Australian banks
        const routingNumberRegex = /^\d{6}$/;
        if (!routingNumberRegex.test(userData.routingNumber)) {
          return {
            status: HttpStatus.BAD_REQUEST,
            error: 'Invalid routing number format',
            details: {
              message: 'The routing number must be exactly 6 digits and contain both the bank code and branch code.',
              format: 'xxxxxx (where x is a digit)',
              example: '123456'
            }
          };
        }

      const bankAccount = await stripeInstance.accounts.createExternalAccount(
        account.id,
        {
          external_account: {
            object: 'bank_account',
            country: 'AU',
            currency: 'aud',
            account_holder_name: `${userData.firstName} ${userData.lastName}`,
            account_holder_type: 'individual',
            account_number: userData.iban,
            routing_number: userData.routingNumber,
          },
        }
      );
      console.log('Bank Account:', bankAccount);
      } catch (bankError) {
        console.error('Error creating bank account:', bankError);
        
        // Handle test mode bank account error
        if (bankError.code === 'account_number_invalid' || bankError.raw?.code === 'account_number_invalid') {
          return {
            status: HttpStatus.BAD_REQUEST,
            error: 'Invalid bank account number',
            details: {
              message: bankError.raw?.message || 'You must use a test bank account number in test mode.',
              test_mode_guidance: 'For test mode, use one of these test account numbers:',
              test_account_numbers: [
                '000123456',
                '000111111',
                '000222222'
              ],
              doc_url: bankError.doc_url || 'https://stripe.com/docs/connect/testing#account-numbers'
            }
          };
        }
        
        // Handle specific routing number error
        if (bankError.code === 'routing_number_invalid' || bankError.raw?.code === 'routing_number_invalid') {
          return {
            status: HttpStatus.BAD_REQUEST,
            error: 'Invalid routing number',
            details: {
              message: bankError.raw?.message || 'The routing number provided is not valid for Australian banks.',
              format: 'The number must contain both the bank code and branch code in the format xxxxxx.',
              example: '123456',
              doc_url: bankError.doc_url || 'https://stripe.com/docs/connect/testing#account-numbers',
              test_mode_guidance: 'In test mode, please use a test routing number from Stripe\'s documentation. For Australian banks in test mode, use: 110000'
            }
          };
        }
        
        // Handle unrecognized bank error
        if (bankError.raw?.message?.includes('does not correspond with a recognized bank')) {
          return {
            status: HttpStatus.BAD_REQUEST,
            error: 'Unrecognized bank routing number',
            details: {
              message: 'The routing number does not correspond with a recognized bank.',
              test_mode_guidance: 'In test mode, please use a test routing number from Stripe\'s documentation. For Australian banks in test mode, use: 110000',
              doc_url: 'https://stripe.com/docs/connect/testing#account-numbers'
            }
          };
        }
        
        // Log the error but continue - we'll still create the user account
        if (bankError.raw) {
          console.error('Bank account error details:', {
            type: bankError.type,
            code: bankError.code,
            param: bankError.param,
            message: bankError.raw.message,
            doc_url: bankError.doc_url
          });
        }
        
        // We'll still continue with user creation even if bank account fails
        console.warn('Proceeding without bank account attachment');
      }
  
      userData.customerStripeAccountId = account.id;
      userData.kycStatus = KYCStatus.PENDING;
      userData.stripeVerificationDetails = verificationDetails;
  
      // Save user to your database
      await this.usersService.create(userData);
  
      // Send Success Email
      try {
      await this.mailerService.sendMail({
        to: userData.email,
        from: process.env.MY_EMAIL,
        subject: 'Welcome to SendWish!',
        text: 'Your account has been successfully created! Please complete your KYC verification.',
        html: `
          <p>Thank you for signing up! Your account has been successfully created.</p>
          <p>Please complete your KYC verification by clicking the link below:</p>
          <p><a href="${process.env.FRONTEND_URL || 'https://sendwish.org'}/verify?token=${accessToken}">Click here to verify your account</a></p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Your access token: ${accessToken}</p>
          <p>Your refresh token: ${refreshToken}</p>
        `,
      });
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        
        // Handle email authentication error
        if (emailError.code === 'EAUTH') {
          console.error('Email authentication failed. Please check your email credentials in the .env file.');
          console.error('Error details:', {
            code: emailError.code,
            response: emailError.response,
            command: emailError.command
          });
          
          // Continue with user creation despite email error
          console.warn('Proceeding without sending welcome email. User account was created successfully.');
          
          // Return success response with a note about email failure
          return {
            message: 'User successfully onboarded. Please complete KYC verification.',
            stripeAccountId: account.id,
            kycStatus: KYCStatus.PENDING,
            verificationDetails,
            emailStatus: 'Failed to send welcome email. Please check your email configuration.'
          };
        }
        
        // For other email errors, continue with user creation
        console.warn('Proceeding without sending welcome email');
      }
  
      return {
        message: 'User successfully onboarded. Please complete KYC verification.',
        stripeAccountId: account.id,
        kycStatus: KYCStatus.PENDING,
        verificationDetails
      };
    } catch (e) {
        console.error('Error in customSignUp method:', e);
        
        // Format Stripe errors specifically
        if (e.type && e.type.startsWith('Stripe')) {
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              error: e.raw?.message || e.message || 'Stripe API error',
              details: {
                type: e.type,
                code: e.code,
                param: e.param,
                doc_url: e.doc_url
              }
            },
            HttpStatus.BAD_REQUEST
          );
        }
        
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: e.message || e,
            details: e.raw ? e.raw : undefined,
            code: e.code || 'unknown_error',
            param: e.param || undefined,
            doc_url: e.doc_url || undefined
          },
          HttpStatus.BAD_REQUEST
        );
      }
    } catch (e) {
      console.error('Outer error in customSignUp:', e);
      
      // Format Stripe errors specifically
      if (e.type && e.type.startsWith('Stripe')) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: e.raw?.message || e.message || 'Stripe API error',
            details: {
              type: e.type,
              code: e.code,
              param: e.param,
              doc_url: e.doc_url
            }
          },
          HttpStatus.BAD_REQUEST
        );
      }
      
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: e.message || e,
        },
        HttpStatus.BAD_REQUEST
      );
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
        userId: user.id,
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
        userId: user.id,
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

  // async googleLogin(token: string) {
  //   try {
  //     // Verify the Google token using OAuth2Client
  //     const ticket = await this.client.verifyIdToken({
  //       idToken: token,
  //       audience: process.env.GOOGLE_CLIENT_ID,  // Specify your Google client ID here
  //     });
  //      console.log("token")
  //     const payload = ticket.getPayload();
  //     const email = payload?.email;
  //     const name = payload?.firstname;

  //     if (!email) {
  //       throw new Error('Google login failed, no email found.');
  //     }

  //     // Check if the user exists in your database
  //     let user = await this.usersService.findByEmail(email);

  //     // If user does not exist, create a new one
  //     if (!user) {
  //       const userData: CreateUserDto = {
  //         email,
  //         firstName: name || 'Google User',
  //         lastName: ''|| ,
  //         password: null, // Password is not required for Google users
  //         verified: true, // Automatically mark as verified
  //       };

  //       user = await this.usersService.create(userData);
  //     }

  //     // Generate tokens for the user
  //     const accessToken = jwt.sign(
  //       { userEmail: user.email, userId: user.id },
  //       process.env.SECRET_KEY,
  //       { expiresIn: '1d' },
  //     );

  //     const refreshToken = jwt.sign(
  //       { userEmail: user.email, userId: user.id },
  //       process.env.SECRET_REFRESH_KEY,
  //       { expiresIn: '1d' },
  //     );

  //     // Save tokens to the user
  //     user.accessToken = accessToken;
  //     user.refreshToken = refreshToken;
  //     await this.usersService.update(user.id, user);

  //     return {
  //       message: 'SUCCESSFULLY LOGGED IN WITH GOOGLE',
  //       user,
  //       accessToken,
  //       refreshToken,
  //       status: HttpStatus.OK,
  //     };
  //   } catch (error) {
  //     throw new HttpException(
  //       { status: HttpStatus.UNAUTHORIZED, error: error.message },
  //       HttpStatus.UNAUTHORIZED,
  //     );
  //   }
  // }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  async remove(id: number) {
    return this.usersService.remove(id);
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
}
