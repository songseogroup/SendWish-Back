import { ApiProperty } from '@nestjs/swagger';

export class OwnerClass {
  @ApiProperty({ type: Number, description: 'Owner ID' })
  id: number;

  @ApiProperty({ type: String, description: 'Owner username' })
  username: string;

  @ApiProperty({ type: String, description: 'Owner email' })
  email: string;

  @ApiProperty({ type: String, description: 'Owner customer stripe ID' })
  customer_stripe_id: string;

  @ApiProperty({ type: Boolean, description: 'Owner verified' })
  verified: boolean;

  @ApiProperty({ type: String, description: 'Owner access token' })
  accessToken: string;

  @ApiProperty({ type: String, description: 'Owner refresh token' })
  refreshToken: string;

  @ApiProperty({ type: Date, description: 'Owner created at' })
  created_at: Date;

  @ApiProperty({ type: Date, description: 'Owner updated at' })
  updated_at: Date;
}

export class EventClass {
  @ApiProperty({ type: Number, description: 'Event ID' })
  eid: number;

  @ApiProperty({ type: Date, description: 'Event date' })
  date: Date;

  @ApiProperty({ type: String, description: 'Event name' })
  event_name: string;

  @ApiProperty({ type: String, description: 'Event URL' })
  event_url: string;

  @ApiProperty({ type: String, description: 'Event image' })
  image: string;

  @ApiProperty({ type: String, description: 'Event description' })
  event_description: string;

  @ApiProperty({ type: Number, description: 'Event amount collected' })
  amount_collected: number;

  @ApiProperty({ type: Date, description: 'Event created at' })
  created_at: Date;

  @ApiProperty({ type: Date, description: 'Event updated at' })
  updated_at: Date;

  @ApiProperty({ type: OwnerClass, description: 'Event owner' })
  owner: OwnerClass;
}

export class GiftClass {
  @ApiProperty({ type: String, description: 'Gift country' })
  country: string;

  @ApiProperty({ type: Number, description: 'Gift amount' })
  gift_amount: number;

  @ApiProperty({ type: String, description: 'Gift message' })
  gift_message: string;

  @ApiProperty({ type: Number, description: 'Gift sender' })
  sender: number;

  @ApiProperty({ type: EventClass, description: 'Gift event' })
  event: EventClass;

  @ApiProperty({ type: Number, description: 'Gift ID' })
  pid: number;
}

export class stripeIntentClass {
  @ApiProperty({ type: String, description: 'Stripe intent ID' })
  id: string; 

  @ApiProperty({ type: String, description: 'Stripe intent client secret' })
  client_secret: string;  

  @ApiProperty({ type: String, description: 'Stripe intent customer' })
  customer: string;
}