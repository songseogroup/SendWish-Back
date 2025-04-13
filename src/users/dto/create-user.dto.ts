// import { ApiProperty } from '@nestjs/swagger';
// import { IsNotEmpty, IsString, isString } from 'class-validator';
// export class CreateUserDto {
//     @ApiProperty()
//     @IsNotEmpty({ message: 'Username is required' })
//     @IsString({ message: 'Username must be a string' })
//     readonly username: string;
//     @ApiProperty()
//     @IsNotEmpty({ message: 'Password is required' })
//     @IsString({ message: 'Password must be a string' })
//     readonly password: string;
//     @ApiProperty()
//     @IsNotEmpty({ message: 'Email is required' })
//     @IsString({ message: 'Email must be a string' })
//     readonly email: string;
//     @ApiProperty()
//     readonly verified: boolean;
//     @ApiProperty()
//     accessToken?: string;
//     @ApiProperty()
//     refreshToken?: string;
//     @ApiProperty()
//     customer_stripe_id?:string;
//     @ApiProperty()
//     customerStripeAccountId?:string;

// }
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEmail, IsBoolean, IsDate, ValidateNested, IsObject, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { KYCStatus } from '../entities/user.entity';

class AddressDto {
  @ApiProperty({ description: 'Street address line 1' })
  @IsNotEmpty()
  @IsString()
  line1: string;

  @ApiProperty({ description: 'Street address line 2', required: false })
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty({ description: 'City' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ description: 'State' })
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiProperty({ description: 'Postal code' })
  @IsNotEmpty()
  @IsString()
  postalCode: string;
}

class VerificationDocumentDto {
  @ApiProperty({ description: 'Front side of ID document', type: 'string', format: 'binary' })
  @IsString()
  @IsNotEmpty()
  front: string;

  @ApiProperty({ description: 'Back side of ID document', type: 'string', format: 'binary' })
  @IsString()
  @IsNotEmpty()
  back: string;

  @ApiProperty({ description: 'Additional verification document', type: 'string', format: 'binary', required: false })
  @IsOptional()
  @IsString()
  additional?: string;
}

class StripeVerificationDetailsDto {
  @ApiProperty({ description: 'List of requirements', type: [String] })
  @IsNotEmpty()
  requirements: string[];

  @ApiProperty({ description: 'Currently due requirements', type: [String] })
  @IsNotEmpty()
  currentlyDue: string[];

  @ApiProperty({ description: 'Eventually due requirements', type: [String] })
  @IsNotEmpty()
  eventuallyDue: string[];

  @ApiProperty({ description: 'Past due requirements', type: [String] })
  @IsNotEmpty()
  pastDue: string[];

  @ApiProperty({ description: 'Reason for disabled status', required: false })
  @IsOptional()
  @IsString()
  disabledReason?: string;
}

export class CreateUserDto {
    @ApiProperty({ description: 'First Name of the user' })
    @IsNotEmpty({ message: 'First Name is required' })
    @IsString({ message: 'First Name must be a string' })
    readonly firstName: string;

    @ApiProperty({ description: 'Last Name of the user' })
    @IsNotEmpty({ message: 'Last Name is required' })
    @IsString({ message: 'Last Name must be a string' })
    readonly lastName: string;

    @ApiProperty({ description: 'Password for the user account' })
    @IsNotEmpty({ message: 'Password is required' })
    @IsString({ message: 'Password must be a string' })
    readonly password: string;

    @ApiProperty({ description: 'Email address of the user' })
    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Email must be a valid email address' })
    readonly email: string;

    @ApiProperty({ description: 'Indicates if the user is verified', default: false })
    @IsOptional()
    @IsBoolean({ message: 'Verified must be a boolean value' })
    readonly verified?: boolean;

    @ApiProperty({ description: 'Access token for the user', required: false })
    @IsOptional()
    @IsString({ message: 'Access token must be a string' })
    accessToken?: string;

    @ApiProperty({ description: 'Refresh token for the user', required: false })
    @IsOptional()
    @IsString({ message: 'Refresh token must be a string' })
    refreshToken?: string;

    @ApiProperty({ description: 'Stripe customer ID associated with the user', required: false })
    @IsOptional()
    @IsString({ message: 'Customer Stripe ID must be a string' })
    customer_stripe_id?: string;

    @ApiProperty({ description: 'Stripe account ID for receiving payments', required: false })
    @IsOptional()
    @IsString({ message: 'Customer Stripe Account ID must be a string' })
    customerStripeAccountId?: string;

    @ApiProperty({ description: 'IBAN for the user\'s bank account', required: false })
    @IsOptional()
    @IsString({ message: 'IBAN must be a string' })
    iban?: string;

    @ApiProperty({ description: 'Type of user (e.g., individual or business)', required: false })
    @IsOptional()
    @IsString({ message: 'User type must be a string' })
    userType?: string;

    @ApiProperty({ description: 'Additional metadata or user information', required: false })
    @IsOptional()
    metadata?: Record<string, any>;

    @ApiProperty({ description: 'Routing Number of users bank account' })  
    @IsNotEmpty({ message: 'Routing Number is required' })
    @IsString({ message: 'Routing Number must be a string' })
    routingNumber: string;
    
    @ApiProperty({ description: 'Phone Number of the user' })
    @IsNotEmpty({ message: 'Phone Number is required' })
    @IsString({ message: 'Phone Number must be a string' })
    phoneNumber: string;

    @ApiProperty({ description: 'Date of birth of the user' })
    @IsNotEmpty({ message: 'Date of birth is required' })
    @Type(() => Date)
    @IsDate()
    dateOfBirth: Date;

    @ApiProperty({ description: 'Address of the user' })
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => AddressDto)
    address: AddressDto;

    @ApiProperty({ description: 'Verification documents' })
    @ValidateNested()
    @Type(() => VerificationDocumentDto)
    @IsNotEmpty({ message: 'Verification documents are required' })
    verificationDocument: VerificationDocumentDto;

    @ApiProperty({ description: 'KYC verification status', enum: KYCStatus, default: KYCStatus.UNVERIFIED })
    @IsOptional()
    @IsEnum(KYCStatus)
    kycStatus?: KYCStatus;

    @ApiProperty({ description: 'Stripe verification details', type: StripeVerificationDetailsDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => StripeVerificationDetailsDto)
    stripeVerificationDetails?: StripeVerificationDetailsDto;
}
