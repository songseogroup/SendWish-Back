import { ApiProperty } from '@nestjs/swagger';
import { UserClass } from 'src/users/classes/user.class';
export class EventClass {
    @ApiProperty({ type: Number, description: 'Event ID' })
    eid: number;
  
    @ApiProperty({ type: Date, description: 'Date' })
    date: Date;
  
    @ApiProperty({ type: String, description: 'Event Name' })
    event_name: string;
  
    @ApiProperty({ type: String, description: 'Event URL' })
    event_url: string;
  
    @ApiProperty({ type: String, description: 'Image' })
    image: string;
  
    @ApiProperty({ type: String, description: 'Event Description' })
    event_description: string;
  
    @ApiProperty({ type: Date, description: 'Created At' })
    created_at: Date;
  
    @ApiProperty({ type: Date, description: 'Updated At' })
    updated_at: Date;
  
    @ApiProperty({ type: () => UserClass, description: 'Owner', required: false })
    owner?: UserClass;
  }
  