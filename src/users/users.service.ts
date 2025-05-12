import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, KYCStatus } from './entities/user.entity';
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
      firstName,
      lastName,
      password,
      email,
      accessToken,
      refreshToken,
      customerStripeAccountId,
      customer_stripe_id,
      routingNumber,
      phoneNumber,
      dateOfBirth,
      address,
      verificationDocument,
      kycStatus,
      stripeVerificationDetails
    } = createUserDto;

    const checkEmail = await this.userRepository.findOne({
      where: { email: email },
    });
    let userData = checkEmail;
    console.log(checkEmail);
    console.log(firstName, email);
    if (firstName === '' || password === '' || email === '' || lastName === '') {
      throw new Error('Empty values are not accepted');
    }
    if (checkEmail && checkEmail.verified) {
      throw new Error('User email already exist');
    } else if (checkEmail && !checkEmail.verified) {
      userData.accessToken = accessToken;
      userData.refreshToken = refreshToken;
      userData.dateOfBirth = dateOfBirth;
      userData.address = address;
      userData.verificationDocument = verificationDocument;
      userData.kycStatus = kycStatus || KYCStatus.UNVERIFIED;
      userData.stripeVerificationDetails = stripeVerificationDetails;

      await this.userRepository.update(checkEmail.id, userData);
      console.log('HERER');
      return checkEmail;
    } else {
      console.log('ELSE HERE');
      const salt = await bcrypt.genSalt();

      const hashedPassword = await bcrypt.hash(password, salt);

      const user = new User();

      user.firstName = firstName;
      user.lastName = lastName;
      user.password = hashedPassword;
      user.email = email;
      user.verified = false;
      user.accessToken = accessToken;
      user.refreshToken = refreshToken;
      user.customerStripeAccountId = customerStripeAccountId;
      user.customer_stripe_id = customer_stripe_id;
      user.routingNumber = routingNumber;
      user.phoneNumber = phoneNumber;
      user.dateOfBirth = dateOfBirth;
      user.address = address;
      user.verificationDocument = verificationDocument;
      user.kycStatus = kycStatus || KYCStatus.UNVERIFIED;
      user.stripeVerificationDetails = stripeVerificationDetails;

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
    const parsedId = Number(id);
  
    if (!Number.isInteger(parsedId)) {
      throw new BadRequestException(`Invalid ID: must be an integer ${id} ${parsedId}`);
    }
  
    console.log('Removing user with ID:', parsedId);
  
    const objectToRemove = await this.userRepository.findOne({
      where: { id: parsedId },
    });
  
    if (objectToRemove) {
      await this.userRepository.remove(objectToRemove);
      return 'deleted';
    } else {
      throw new NotFoundException('Object not found');
    }
  }
  

  async findByStripeAccountId(stripeAccountId: string) {
    return this.userRepository.findOne({
      where: { customerStripeAccountId: stripeAccountId }
    });
  }

  async removeUserEvents(userId: number) {
    try {
      // Find the user with their events
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['events']
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Delete all events associated with the user
      if (user.events && user.events.length > 0) {
        for (const event of user.events) {
          await this.userRepository
            .createQueryBuilder()
            .relation(User, 'events')
            .of(user)
            .remove(event);
        }
      }

      return {
        message: 'User events deleted successfully'
      };
    } catch (error) {
      console.error('Error in removeUserEvents:', error);
      throw new BadRequestException('Failed to delete user events');
    }
  }
}
