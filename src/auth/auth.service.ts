import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException,Inject } from '@nestjs/common';
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


let stripe = require('stripe')(process.env.STRIPE_KEY);
@Injectable()
export class AuthService {
  constructor(
    @Inject('OAuth2Client') private readonly client: OAuth2Client,
    // private client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID), // Add this for Google auth
    private readonly usersService: UsersService,
    private readonly mailerService: MailerService,
  ) {}
  create(createAuthDto: CreateAuthDto) {
    return 'This action adds a new auth';
  }

  async signUp(userData: CreateUserDto) {
    try {
      let user = await this.usersService.findByEmail(userData.email);
      if (user && !!user.verified) {
        throw new Error("User already exists")
      }
      const accessToken = jwt.sign(
        { user_email: userData.email },
        process.env.SECRET_KEY,
        { expiresIn: '1h' },
      );

      const refreshToken = jwt.sign(
        { user_email: userData.email },
        process.env.SECRET_REFRESH_KEY,
        { expiresIn: '17h' },
      );
      if (user && !user.verified) {
        const account_link = await stripe.accountLinks.create({
          account: user.customerStripeAccountId,
          refresh_url: 'https://example.com/reauth',
          return_url: `http://localhost:5173/signup-verify/${accessToken}/${refreshToken}`,
          type: 'account_onboarding',
        });

        await this.mailerService
          .sendMail({
            to: userData.email, // list of receivers
            from: process.env.MY_EMAIL, // sender address
            subject: 'Testing Nest MailerModule ✔', // Subject line
            text: `Signup on stripe`, // plaintext body
            html: `<a href="${account_link.url}">Click here to verify your account</a>`, // HTML body content
          })
          .then((r) => {
            console.log(r, 'SEND RESPONSE');
          })
          .catch((e) => {
            console.log(e, 'ERRRORR');
          });
          return {
            message: 'Check email to verify your signup',
          };
      }


      userData.accessToken = accessToken;

      userData.refreshToken = refreshToken;

      const customer = await stripe.customers.create({
        name: userData.username,
        email: userData.email,
      });
      
      console.log(customer, "HERE IS THE CUSTOMER STRIPE ID");

      userData.customer_stripe_id = customer.id; //this is id is to charge the customer using their debit card

      const account = await stripe.accounts.create({
        type: 'express', // or 'standard' based on your needs
        country: 'AU',
        email: userData.email,
      });

      const add_capability = await stripe.accounts.update(
        account.id, // Use the ID of the created account
        {
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true }, // Request the transfers capability
          },
        }
      );
      console.log("add_capability", add_capability);

      userData.customerStripeAccountId = account.id; // this id will be used to send payments to customer

      await this.usersService.create(userData);

      const account_link = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: 'https://example.com/reauth',
        return_url: `http://localhost:5173/signup-verify/${accessToken}/${refreshToken}`,
        type: 'account_onboarding',
      });

      await this.mailerService
        .sendMail({
          to: userData.email, // list of receivers
          from: process.env.MY_EMAIL, // sender address
          subject: 'Testing Nest MailerModule ✔', // Subject line
          text: `Signup on stripe`, // plaintext body
          html: `<a href="${account_link.url}">Click here to verify your account</a>`, // HTML body content
        })
        .then((r) => {
          console.log(r, 'SEND RESPONSE');
        })
        .catch((e) => {
          console.log(e, 'ERRRORR');
        });
      return {
        message: 'Check email to verify your signup',
      };
    } catch (e) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: e.message || e,
        },
        HttpStatus.BAD_REQUEST,
        {
          cause: e.message || e,
        },
      );
    }
  }

  async verify(token: string) {
    try {
      console.log(process.env.STRIPE_KEY);
      console.log(process.env.STRIPE_TEST_KEY);
      const verify = jwt.verify(token, process.env.SECRET_KEY);
      const email = verify.user_email;
      let userData = await this.usersService.findByEmail(email);
      if(!!userData.verified)
         return {
        message:"user already verified",
        status:HttpStatus.CONFLICT
      }
      if (verify) {
        userData.verified = true;
       
      
        const update = await this.usersService.update(userData.id, userData);

        if (!update) {
          throw new Error('Error updating data');
        }
        return {
          message: 'User Verified',
          userInfo: userData,
          status: HttpStatus.CREATED
        };
      } else {
        throw new Exception('Token expireed');
      }
    } catch (e) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: e.message || e,
        },
        HttpStatus.BAD_REQUEST,
        {
          cause: e.message || e,
        },
      );
    }
  }

  async login(userData: userDto) {
    try {
      let user = await this.usersService.findByEmail(userData.email);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      if (!user.verified) {
        throw new HttpException('User not verified', HttpStatus.NON_AUTHORITATIVE_INFORMATION);
      }

      const validate = await bcrypt.compare(userData.password, user.password);
      console.log("validate", validate);


      if (!validate) {
        throw new HttpException('Incorrect credentials', HttpStatus.UNAUTHORIZED);
      }

      const accessToken = jwt.sign(
        { userEmail: userData.email ,userId:user.id},
        process.env.SECRET_KEY,
        { expiresIn: '1d' },
      );
      const refreshToken = jwt.sign(
        { userEmail: userData.email,userId:user.id },
        process.env.SECRET_REFRESH_KEY,
        { expiresIn: '1d' },
      );
      user.accessToken = accessToken;
      user.refreshToken = refreshToken;

      await this.usersService.update(user.id, user);

      delete user.password;
      return {
        message: 'SUCCESSFULLY LOGGED IN',
        user: user,
        status: HttpStatus.OK
      };


    } catch (e) {
      throw new HttpException(
        {
          status: e.status||HttpStatus.BAD_REQUEST,
          error: e.message || e,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async generateRefresh(token) {
    try {
      const verify = jwt.verify(token, process.env.SECRET_REFRESH_KEY);
      if (!verify) {
        return 'Login again:  Refresh token expired';
      }
      const email = verify.user_email;
      let userData = await this.usersService.findByEmail(email);
      const accessToken = jwt.sign(
        { user_email: userData.email },
        process.env.SECRET_KEY,
        { expiresIn: '1h' },
      );
      userData.accessToken = accessToken;
      await this.usersService.update(userData.id, userData);
      return accessToken;
    } catch (e) {
      return e;
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
        subject: 'Testing Nest MailerModule ✔', // Subject line
        text: `Password reset`, // plaintext body
        html: `<p> Here is your updated temp password ${temporaryPassword}</a>`, // HTML body content
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

  async googleLogin(token: string) {
    try {
      // Verify the Google token using OAuth2Client
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,  // Specify your Google client ID here
      });
       console.log("token")
      const payload = ticket.getPayload();
      const email = payload?.email;
      const name = payload?.name;

      if (!email) {
        throw new Error('Google login failed, no email found.');
      }

      // Check if the user exists in your database
      let user = await this.usersService.findByEmail(email);

      // If user does not exist, create a new one
      if (!user) {
        const userData: CreateUserDto = {
          email,
          username: name || 'Google User',
          password: null, // Password is not required for Google users
          verified: true, // Automatically mark as verified
        };

        user = await this.usersService.create(userData);
      }

      // Generate tokens for the user
      const accessToken = jwt.sign(
        { userEmail: user.email, userId: user.id },
        process.env.SECRET_KEY,
        { expiresIn: '1d' },
      );

      const refreshToken = jwt.sign(
        { userEmail: user.email, userId: user.id },
        process.env.SECRET_REFRESH_KEY,
        { expiresIn: '1d' },
      );

      // Save tokens to the user
      user.accessToken = accessToken;
      user.refreshToken = refreshToken;
      await this.usersService.update(user.id, user);

      return {
        message: 'SUCCESSFULLY LOGGED IN WITH GOOGLE',
        user,
        accessToken,
        refreshToken,
        status: HttpStatus.OK,
      };
    } catch (error) {
      throw new HttpException(
        { status: HttpStatus.UNAUTHORIZED, error: error.message },
        HttpStatus.UNAUTHORIZED,
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

  async remove(id: number) {
    return this.usersService.remove(id);
  }
}
