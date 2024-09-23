import { ApiProperty } from '@nestjs/swagger';
import { IsString , IsNotEmpty} from 'class-validator';
export class userDto{
    @ApiProperty()
    @IsString({ message: 'Email must be a string' })
    @IsNotEmpty()
    email:string;
    
    @ApiProperty()
    @IsString({ message: 'Email must be a string' })
    @IsNotEmpty()
    password:string;
}