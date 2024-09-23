import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, isString } from 'class-validator';
export class CreateUserDto {
    @ApiProperty()
    @IsNotEmpty({ message: 'Username is required' })
    @IsString({ message: 'Username must be a string' })
    readonly username: string;
    @ApiProperty()
    @IsNotEmpty({ message: 'Password is required' })
    @IsString({ message: 'Password must be a string' })
    readonly password: string;
    @ApiProperty()
    @IsNotEmpty({ message: 'Email is required' })
    @IsString({ message: 'Email must be a string' })
    readonly email: string;
    @ApiProperty()
    readonly verified: boolean;
    @ApiProperty()
    accessToken?: string;
    @ApiProperty()
    refreshToken?: string;
    @ApiProperty()
    customer_stripe_id?:string;
    @ApiProperty()
    customerStripeAccountId?:string;

}
