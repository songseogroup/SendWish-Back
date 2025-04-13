import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { KYCStatus } from '../entities/user.entity';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @ApiProperty({ description: 'Stripe account ID for receiving payments', required: false })
    @IsOptional()
    customerStripeAccountId?: string;

    @ApiProperty({ description: 'KYC verification status', enum: KYCStatus, required: false })
    @IsOptional()
    @IsEnum(KYCStatus)
    kycStatus?: KYCStatus;
}
