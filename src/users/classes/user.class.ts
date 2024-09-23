import { ApiProperty } from '@nestjs/swagger';
``
export class UserClass {
    @ApiProperty({ type: Number, description: 'User ID' })
    id: number;
  
    @ApiProperty({ type: String, description: 'Username' })
    username: string;
  
    @ApiProperty({ type: String, description: 'Email' })
    email: string;
  
    @ApiProperty({ type: String, description: 'Customer Stripe ID', required: false })
    customer_stripe_id?: string;
  
    @ApiProperty({ type: Boolean, description: 'Verified' })
    verified: boolean;
  
    @ApiProperty({ type: String, description: 'Access Token', required: false })
    accessToken?: string;
  
    @ApiProperty({ type: String, description: 'Refresh Token', required: false })
    refreshToken?: string;
  
    @ApiProperty({ type: Date, description: 'Created At' })
    created_at: Date;
  
    @ApiProperty({ type: Date, description: 'Updated At' })
    updated_at: Date;
  }
  