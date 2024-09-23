import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { User } from '../users/entities/user.entity';
import {
  mock_user_correct_credentials_instance,
  mock_incorrect_user_credentials_instance,
} from './Mocks/index';

jest.mock('../users/users.service');
jest.mock('@nestjs-modules/mailer');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, UsersService, MailerService],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('Successfull Login test', async () => {
    jest
      .spyOn(usersService, 'findByEmail')
      .mockResolvedValue(mock_user_correct_credentials_instance);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    jest.spyOn(jwt, 'sign').mockReturnValue('fakeToken');

    const response = await service.login({
      email: 'zainmir1000@gmail.com',
      password: 'zain_1234',
    });

    expect(response).toEqual({
      MESSAGE: 'SUCCESSFULLY LOGGED IN',
      User: {
        id: 1,
        email: 'zainmir1000@gmail.com',
        role: 'user',
        accessToken: 'fakeToken',
        refreshToken: 'fakeToken',
        username: 'zainmir',
        verified: true,
      },
    });
  });

  it('User not verified test', async () => {
    jest
      .spyOn(usersService, 'findByEmail')
      .mockResolvedValue(mock_incorrect_user_credentials_instance);

    const response = await service.login({
      email: 'zainmir10200@gmail.com',
      password: 'zain_1234',
    });

    expect(response).toEqual('USER NOT VERIFIED');
  });

  it('should return "INCORRECT CREDENTL" on incorrect password', async () => {
    // Create an instance of the User entity
    const mockUser = {
      id: 1,
      username: 'zainmir',
      email: 'zainmir1000@gmail.com',
      password: await bcrypt.hash('zain_1234', 10),
      verified: true,
      role: 'user',
    };
    const mockUserInstance = Object.assign(new User(), mockUser);

    jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUserInstance);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    const response = await service.login({
      email: 'zainmir1000@gmail.com',
      password: 'incorrect_password',
    });

    expect(response).toEqual('INCORRECT CREDENTIAL');
  });

  it('should return "INCORRECT CREDENTIAL" when findByEmail throws an error', async () => {
    jest
      .spyOn(usersService, 'findByEmail')
      .mockRejectedValue(new Error('Some error'));

    const response = await service.login({
      email: 'zainmir1000@gmail.com',
      password: 'zain_1234',
    });

    expect(response).toEqual('INCORRECT CREDENTIAL');
  });
});
