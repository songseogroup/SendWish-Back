import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { PageOptionsDto } from '../common/dtos';
import { PageMetaDto } from '../common/page.meta.dto';
import { PageDto } from '../common/page.dto';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}
  async create(createUserDto: CreateUserDto): Promise<any> {
    const {
      username,
      password,
      email,
      accessToken,
      refreshToken,
      customerStripeAccountId,
      customer_stripe_id
    } = createUserDto;

    const checkEmail = await this.userRepository.findOne({
      where: { email: email },
    });
    let userData = checkEmail;
    console.log(checkEmail);
    console.log(username, email);
    if (username === '' || password === '' || email === '') {
      throw new Error('Empty values are not accepted');
    }
    if (checkEmail && checkEmail.verified) {
      throw new Error('User email already exist');
    } else if (checkEmail && !checkEmail.verified) {
      userData.accessToken = accessToken;

      userData.refreshToken = refreshToken;

      await this.userRepository.update(checkEmail.id, userData);
      console.log('HERER');
      return checkEmail;
    } else {
      console.log('ELSE HERE');
      const salt = await bcrypt.genSalt();

      const hashedPassword = await bcrypt.hash(password, salt);

      const user = new User();

      user.username = username;

      user.password = hashedPassword;

      user.email = email;

      user.verified = false;

      user.accessToken = accessToken;

      user.refreshToken = refreshToken;
      user.customerStripeAccountId=customerStripeAccountId;
      user.customer_stripe_id=customer_stripe_id

      const myUser = await this.userRepository.save(user);

      return myUser;
    }
  }

  async findAll(
    pageOptionsDto: PageOptionsDto,
  ): Promise<PageDto<CreateUserDto>> {
    const skip = (pageOptionsDto.page - 1) * pageOptionsDto.pageSize;
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (pageOptionsDto.search) {
      queryBuilder.where('user.username ILIKE :searchTerm', {
        searchTerm: `%${pageOptionsDto.search}%`,
      });
    }
    queryBuilder
    .leftJoinAndSelect('user.events','event')
      .orderBy('user.id', pageOptionsDto.order)
      .skip(skip)
      .take(pageOptionsDto.pageSize);

    const itemCount = await queryBuilder.getCount();

    const { entities } = await queryBuilder.getRawAndEntities();

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

    return new PageDto(entities, pageMetaDto);
  }

  // Getting user detail
  async findOne(id: number) {
    try {
      let user_detail = await this.userRepository.findOneBy({ id });

      if (!user_detail) {
        throw new Error('User does not exist');
      }
      return user_detail;
    } catch (e) {
      throw e
    }
  }

  findByEmail(email: string) {
    return this.userRepository.findOne({
      where: {
        email: email,
      },
    });
  }
  update(id: number, updateUserDto: UpdateUserDto) {
    return this.userRepository.update(id, updateUserDto);
  }

  async remove(id: number) {
    const objectToRemove = await this.userRepository.findOne({
      where: { id: id },
    });
    if (objectToRemove) {
      await this.userRepository.remove(objectToRemove);
      return 'deleted';
    } else {
      // Handle the case where the object doesn't exist.
      throw new NotFoundException('Object not found');
    }
  }
}
