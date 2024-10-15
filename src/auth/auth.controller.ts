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
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { userDto } from './dto/user-login.dto';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { Request } from 'express';
import { ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {}
  /**
   * Handles user sign up by delegating to the AuthService.
   *
   * @param {CreateUserDto} registerUserDto - The user data to be used for sign up.
   * @return {*} The result of the sign up operation.
   */
  @Post('sign-up')
  @HttpCode(201)
  async signUp(@Body() registerUserDto: CreateUserDto) {
    return this.authService.signUp(registerUserDto);
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
    const token = request.headers.authorization;
    return this.authService.verify(token);
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

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req) {
    return this.authService.googleLogin(req);
  }
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
